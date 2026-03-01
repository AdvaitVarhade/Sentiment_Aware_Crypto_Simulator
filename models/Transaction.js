// --- models/Transaction.js ---
const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['BUY', 'SELL', 'DEPOSIT', 'WITHDRAW'],
        required: true
    },
    symbol: {
        type: String, // e.g., 'BTC', 'USD' (for deposits)
        required: true,
        uppercase: true
    },
    quantity: {
        type: Number,
        required: true
    },
    pricePerUnit: {
        type: Number,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true // quantity * pricePerUnit
    },
    status: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'FAILED'],
        default: 'COMPLETED'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Transaction', TransactionSchema);