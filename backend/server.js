const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const apiRoutes = require('./routes');

// Middleware (Allows JSON data and Cross-Origin requests)
app.use(cors());
app.use(bodyParser.json());

// Import Database


// Basic Test Route
app.use('/api',apiRoutes);

// API Route: Get All Rooms (Test DB connection)
app.get('/',(req,res)=>{
    res.send('Office IoT Backend is Secured');
});

// Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});