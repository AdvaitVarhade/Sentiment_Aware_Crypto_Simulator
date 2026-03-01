// --- server.js ---
// Entry point for the Sentiment-Aware Crypto Trading Platform Backend

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json()); // Allows us to parse JSON bodies in requests
app.use(cors()); // Allows our future React frontend to communicate with this API

// Database Connection
// Ensure you have a MONGO_URI in your .env file (e.g., MONGO_URI=mongodb+srv://...)
const connectDB = async () => {
    try {
        // Fix: Removed deprecated options useNewUrlParser and useUnifiedTopology
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crypto_platform');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1); // Exit process with failure
    }
};

connectDB();

// Basic Health Check Route
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Sentiment Crypto API is running!' });
});

// Route Imports
app.use('/api/auth', require('./routes/auth'));
app.use('/api/market', require('./routes/market'));
app.use('/api/trade', require('./routes/trade'));
app.use('/api/sentiment', require('./routes/sentiment'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});