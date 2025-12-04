const express = require('express');
const router = express.Router();
const db = require('./db'); // MariaDB Connection Pool
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const notificationService = require('./notificationService'); // Email Alert Service

// ⚠️ SECURITY NOTE: Pull the secret key from the environment variables (.env)
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_that_is_long'; 

// ===================================================
// 1. AUTHENTICATION ROUTE (The "User Door")
// ===================================================
router.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Missing username or password' });
    }

    try {
        // 1. Find the user in the database
        const [users] = await db.query(
            'SELECT id, password_hash, role FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];

        // 2. Compare the plain password with the stored hash
        const match = await bcrypt.compare(password, user.password_hash);

        if (!match) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // 3. Password is correct: Create the JWT
        const token = jwt.sign(
            { id: user.id, username: username, role: user.role },
            JWT_SECRET,
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        res.json({ message: 'Login successful', token: token, role: user.role });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ===================================================
// 2. SECURE DATA INGESTION (The "Sensor Door")
// ===================================================
router.post('/data', async (req, res) => {
    const { device_mac, temp, hum } = req.body;
    const apiKey = req.headers['x-api-key'];

    if (!device_mac || !apiKey) {
        return res.status(400).json({ error: 'Missing device_mac or x-api-key' });
    }

    try {
        // A. SECURITY CHECK: Validate Device + API Key
        const [rooms] = await db.query(
            'SELECT id, room_name FROM rooms WHERE device_mac = ? AND api_key = ? AND is_active = 1',
            [device_mac, apiKey]
        );

        if (rooms.length === 0) {
            console.log(`⚠️ Unauthorized attempt from ${device_mac}`);
            return res.status(401).json({ error: 'Unauthorized: Invalid API Key or Device' });
        }

        const roomId = rooms[0].id;
        const roomName = rooms[0].room_name;

        // B. SAVE DATA
        await db.query(
            'INSERT INTO sensor_readings (room_id, temperature, humidity) VALUES (?, ?, ?)',
            [roomId, temp, hum]
        );

        // C. HUMIDITY ALERT CHECK (Email Notification Logic)
        // FIX: Only selecting configuration fields (room_name, hum_threshold)
        const [roomDetails] = await db.query(
            'SELECT id, room_name, hum_threshold FROM rooms WHERE id = ?',
            [roomId]
        );

        if (roomDetails.length > 0) {
            const roomDataWithReading = { 
                ...roomDetails[0], 
                humidity: hum // Pass the live sensor reading
            };
            notificationService.checkAndSendAlert(roomDataWithReading);
        }

        console.log(`✅ Data saved for ${roomName} (${temp}°C)`);
        res.json({ message: 'Data received successfully' });

    } catch (err) {
        console.error('Database Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ---------------------------------------------------
// 3. DASHBOARD DATA (Latest Status)
// ---------------------------------------------------
// NOTE: This route should be protected by JWT middleware in a production app.
router.get('/dashboard', async (req, res) => {
    try {
        const query = `
            SELECT 
                r.id, r.room_name, r.temp_threshold, r.hum_threshold,
                r.device_mac,
                s.temperature, s.humidity, s.recorded_at
            FROM rooms r
            LEFT JOIN sensor_readings s ON r.id = s.room_id 
            AND s.id = (
                SELECT MAX(id) FROM sensor_readings WHERE room_id = r.id
            )
            ORDER BY r.id ASC;
        `;
        const [rows] = await db.query(query);
        res.json(rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ---------------------------------------------------
// 4. HISTORY DATA ROUTE (For Charting)
// ---------------------------------------------------
// NOTE: This route also needs JWT protection!
router.get('/history/:roomId', async (req, res) => {
    const { roomId } = req.params;
    
    try {
        const [history] = await db.query(
            `SELECT 
                temperature, 
                humidity, 
                recorded_at 
             FROM sensor_readings 
             WHERE room_id = ? 
             AND recorded_at >= DATE_SUB(NOW(), INTERVAL 1 DAY) 
             ORDER BY recorded_at ASC`,
            [roomId]
        );

        res.json(history);

    } catch (err) {
        console.error('History Fetch Error:', err);
        res.status(500).json({ error: 'Failed to fetch history data.' });
    }
});

module.exports = router;