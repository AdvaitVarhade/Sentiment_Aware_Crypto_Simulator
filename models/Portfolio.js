// --- models/Portfolio.js ---
const mongoose = require('mongoose');

const PortfolioSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assets: [
        {
            symbol: {
                type: String, // e.g., 'BTC', 'ETH'
                required: true,
                uppercase: true
            },
            quantity: {
                type: Number,
                required: true,
                min: 0
            },
            averageBuyPrice: {
                type: Number,
                required: true,
                min: 0
            }
        }
    ],
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

// Ensure a user only has one active portfolio document
PortfolioSchema.index({ user: 1 }, { unique: true });

module.exports = mongoose.model('Portfolio', PortfolioSchema);