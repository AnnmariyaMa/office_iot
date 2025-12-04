const axios = require('axios');

// Configuration: Where is the API?
const API_URL = 'http://localhost:5000/api/data';

// The 5 "Virtual" Devices
// These match the keys we inserted into MariaDB
const devices = [
    { name: 'Server Room',        mac: 'DEV_001', key: 'key_server_001', minTemp: 18, maxTemp: 24 },
    { name: 'General Staff Area', mac: 'DEV_002', key: 'key_staff_002',  minTemp: 22, maxTemp: 28 },
    { name: 'Meeting Room A',     mac: 'DEV_003', key: 'key_meet_003',   minTemp: 22, maxTemp: 27 },
    { name: 'Cafeteria',          mac: 'DEV_004', key: 'key_cafe_004',   minTemp: 24, maxTemp: 30 },
    { name: 'Director Office',    mac: 'DEV_005', key: 'key_dir_005',    minTemp: 21, maxTemp: 25 }
];

// Helper: Generate a random number with 2 decimal places
function getRandom(min, max) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

// Main Function: Send Data
async function sendSensorData() {
    console.log('--- 📡 Sending Batch Data ---');

    // Loop through each device and send data
    for (const device of devices) {
        const payload = {
            device_mac: device.mac,
            temp: getRandom(device.minTemp, device.maxTemp), // Random temp in range
            hum: getRandom(40, 70)                           // Random humidity
        };
// 🚨 TEMPORARY TEST LOGIC 🚨
        if (device.name === 'Server Room') {
            // Force humidity high for this room to trigger the alert
            payload.hum = 95; // Must be higher than hum_threshold in DB
            console.log(`[TEST MODE] Forcing ${device.name} Humidity to ${payload.hum}%`);
        }
        try {
            // Send POST request (Simulates the hardware)
            await axios.post(API_URL, payload, {
                headers: { 'x-api-key': device.key }
            });
            console.log(`✅ Sent: ${device.name} | Temp: ${payload.temp}°C`);
        } catch (error) {
            console.error(`❌ Failed: ${device.name}`, error.message);
        }
    }
}

// Run immediately, then repeat every 5 seconds
sendSensorData();
setInterval(sendSensorData, 1000000);

