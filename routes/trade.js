// --- routes/trade.js ---
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/auth');

// Import Models
const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const Transaction = require('../models/Transaction');

// Helper function to fetch the exact current price securely on the backend
const getCurrentPrice = async (coinId) => {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
            params: {
                ids: coinId,
                vs_currencies: 'usd'
            }
        });
        if (!response.data[coinId]) throw new Error('Invalid coin ID');
        return response.data[coinId].usd;
    } catch (error) {
        console.error('Price Fetch Error in Trade:', error.message);
        throw new Error('Could not fetch live price for execution');
    }
};

// @route   POST /api/trade/order
// @desc    Execute a Buy or Sell order
// @access  Private
router.post('/order', protect, async (req, res) => {
    try {
        const { symbol, quantity, side } = req.body; // side = 'BUY' or 'SELL'
        const coinId = symbol.toLowerCase(); // CoinGecko uses lowercase ids like 'bitcoin'

        // 1. Fetch the Live Price
        const currentPrice = await getCurrentPrice(coinId);
        const totalOrderValue = currentPrice * quantity;

        // 2. Fetch User & Portfolio
        const user = await User.findById(req.user.id);
        const portfolio = await Portfolio.findOne({ user: req.user.id });

        if (side === 'BUY') {
            // --- BUY LOGIC ---
            if (user.cashBalance < totalOrderValue) {
                return res.status(400).json({ message: 'Insufficient USD balance for this trade.' });
            }

            // Deduct Cash
            user.cashBalance -= totalOrderValue;

            // Check if asset already exists in portfolio
            const assetIndex = portfolio.assets.findIndex(a => a.symbol === coinId.toUpperCase());
            
            if (assetIndex > -1) {
                // Asset exists: Update quantity and calculate new average buy price
                const existingAsset = portfolio.assets[assetIndex];
                const totalCostBasis = (existingAsset.quantity * existingAsset.averageBuyPrice) + totalOrderValue;
                existingAsset.quantity += quantity;
                existingAsset.averageBuyPrice = totalCostBasis / existingAsset.quantity;
            } else {
                // New asset
                portfolio.assets.push({
                    symbol: coinId.toUpperCase(),
                    quantity: quantity,
                    averageBuyPrice: currentPrice
                });
            }

        } else if (side === 'SELL') {
            // --- SELL LOGIC ---
            const assetIndex = portfolio.assets.findIndex(a => a.symbol === coinId.toUpperCase());

            if (assetIndex === -1 || portfolio.assets[assetIndex].quantity < quantity) {
                return res.status(400).json({ message: 'Insufficient crypto balance to sell.' });
            }

            // Add Cash
            user.cashBalance += totalOrderValue;

            // Deduct Crypto
            portfolio.assets[assetIndex].quantity -= quantity;

            // If quantity hits exactly 0, remove the asset from the array to keep the DB clean
            if (portfolio.assets[assetIndex].quantity === 0) {
                portfolio.assets.splice(assetIndex, 1);
            }
        } else {
            return res.status(400).json({ message: 'Invalid order side. Must be BUY or SELL.' });
        }

        // 3. Log the Transaction (Audit Trail)
        const transaction = await Transaction.create({
            user: user._id,
            type: side,
            symbol: coinId,
            quantity: quantity,
            pricePerUnit: currentPrice,
            totalAmount: totalOrderValue,
            status: 'COMPLETED'
        });

        // 4. Save everything to Database
        await user.save();
        await portfolio.save();

        // 5. Return success
        return res.status(200).json({
            message: `Successfully executed ${side} order for ${quantity} ${coinId}.`,
            transaction,
            newCashBalance: user.cashBalance,
            portfolio: portfolio.assets
        });

    } catch (error) {
        console.error('Trade Execution Error:', error);
        res.status(500).json({ message: error.message || 'Server Error during trade execution' });
    }
});

// @route   GET /api/trade/history
// @desc    Get last 20 transactions for the logged-in user
// @access  Private
router.get('/history', protect, async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .limit(20);
        return res.status(200).json({ transactions });
    } catch (error) {
        console.error('[Trade History] Error:', error.message);
        res.status(500).json({ message: 'Failed to fetch transaction history' });
    }
});

module.exports = router;
