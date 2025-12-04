//backend/notificationService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// Simple in-memory storage to track when the last alert was sent for a room
// Format: { roomId: lastSentTimestamp (ms) }
const lastAlerts = {};
const COOLDOWN = parseInt(process.env.ALERT_COOLDOWN_MINUTES) * 60 * 1000; // Convert minutes to milliseconds

// 1. Setup Nodemailer Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // Use 'smtp.office365.com' for Outlook/Exchange
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    }
});

// 2. The Email Sender
async function sendHumidityAlert(roomName, humidity, threshold) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_RECIPIENT,
        subject: `🚨 CRITICAL ALERT: HIGH HUMIDITY in ${roomName}`,
        html: `
            <p>Humidity level exceeded the threshold for **${roomName}**.</p>
            <p>Current Humidity: <b>${humidity}%</b> (Threshold: ${threshold}%)</p>
            <p>Please check the area for potential leaks or equipment malfunction.</p>
            <p><small>Alert sent at: ${new Date().toLocaleString()}</small></p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] Sent alert for ${roomName} successfully.`);
    } catch (error) {
        console.error(`[EMAIL] Failed to send alert for ${roomName}:`, error);
    }
}

// 3. The Main Alert Check Function
function checkAndSendAlert(room) {
    const { id, room_name, humidity, hum_threshold } = room;
    // Check 1: Is the humidity above the threshold?
    if (humidity > hum_threshold) {
        const now = Date.now();
        const lastSent = lastAlerts[id] || 0;

        // Check 2: Has enough time passed since the last alert (Rate Limit)?
        if (now - lastSent > COOLDOWN) {
            
            // Send the email
            sendHumidityAlert(room_name, humidity, hum_threshold);
            

            // Update the last sent time to prevent immediate spam
            lastAlerts[id] = now;
            return true;
        } else {
            console.log(`[ALERT] ${room_name} is HIGH, but alert is in cooldown.`);
        }
    }
    return false;
}

module.exports = {
    checkAndSendAlert,
};
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              