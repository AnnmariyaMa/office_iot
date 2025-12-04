const express = require('express');
const router = express.Router();
const db = require('./db'); // Import the database pool we created earlier
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt');
const JWT_SECRET = 'your_super_secret_jwt_key_that_is_long';
const notificationService = require('./notificationService');
// ===================================================
// 1. SECURE DATA INGESTION (The "Sensor Door")
// ===================================================
router.post('/data', async (req, res) => {
    // We expect data like: { "device_mac": "DEV_001", "temp": 24.5, "hum": 60 }
    // We expect header: "x-api-key": "key_server_001"

    const { device_mac, temp, hum } = req.body;
    const apiKey = req.headers['x-api-key']; // Read the secret key from headers

    if (!device_mac || !apiKey) {
        return res.status(400).json({ error: 'Missing device_mac or x-api-key' });
    }

    try {
        // A. SECURITY CHECK: Does this device exist AND does the key match?
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

        // B. SAVE DATA: If we are here, the key is valid.
        await db.query(
            'INSERT INTO sensor_readings (room_id, temperature, humidity) VALUES (?, ?, ?)',
            [roomId, temp, hum]
        );

        // C. HUMIDITY ALERT CHECK (New Logic)
        // FIX: Removed 'humidity' from the SELECT statement as it's not in the 'rooms' table.
        // We only fetch the room name and the required threshold.
        const [roomDetails] = await db.query(
            'SELECT id, room_name, hum_threshold FROM rooms WHERE id = ?',
            [roomId]
        );

        if (roomDetails.length > 0) {
            // Pass the room configuration AND the LIVE humidity reading from the sensor body (hum)
            const roomDataWithReading = {
                ...roomDetails[0],
                humidity: hum // Use the live reading from the sensor body (the correct value)
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



// ===================================================
// 2. DASHBOARD DATA (The "Frontend View")
// ===================================================
router.get('/dashboard', async (req, res) => {
    try {
        // This SQL is a bit advanced. It fetches ALL rooms, 
        // and joins them with ONLY the very last reading for that room.
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

router.post('/auth/register',async (req,res) =>{

    const{username, password} = req.body;
    if(!username || !password) {
        return  res.status(400).json ({message: 'Missing username or password'})
    }
});
// ===================================================
// 3. AUTHENTICATION ROUTE (The "User Door")
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
        // if this want to be like that then whats the point of all these things you know what i mean

        const user = users[0];

        // 2. Compare the plain password with the stored hash
        const match = await bcrypt.compare(password, user.password_hash);

        if (!match) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // 3. Password is correct: Create the JWT (The session key)
        const token = jwt.sign(
            { id: user.id, username: username, role: user.role },
            JWT_SECRET,
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        // 4. Send the token back to the client
        res.json({ message: 'Login successful', token: token, role: user.role });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
module.exports = router


