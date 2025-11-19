const express = require('express');
const router = express.Router();
const db = require('./db'); // Import the database pool we created earlier

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
            // If no match found, REJECT the data
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

module.exports = router;