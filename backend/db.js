// db.js
require('dotenv').config(); // Load settings from .env file
const mysql = require('mysql2');

// Create a Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10, // Max 10 simultaneous connections
    queueLimit: 0
});

// Check if connection works immediately
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database Connection Failed: ', err.code);
        console.error('   Make sure XAMPP/MariaDB is running and credentials in .env are correct.');
    } else {
        console.log('✅ Connected to MariaDB (office_iot) Successfully!');
        connection.release(); // Release the connection back to the pool
    }
});

// Export the pool to use in other files
module.exports = pool.promise();