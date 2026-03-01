// --- routes/market.js ---
const express = require('express');
const router = express.Router();
const axios = require('axios');

// In-Memory Caches
let cachedData = null;
let cacheTime = null;
const CACHE_DURATION = 60 * 1000; // 60 seconds

let chartCache = {}; // Cache for individual coin charts

// @route   GET /api/market/prices
router.get('/prices', async (req, res) => {
    try {
        const now = Date.now();
        if (cachedData && cacheTime && (now - cacheTime < CACHE_DURATION)) {
            return res.status(200).json({ source: 'cache', data: cachedData });
        }

        const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
            params: { vs_currency: 'usd', order: 'market_cap_desc', per_page: 20, page: 1, sparkline: false }
        });

        cachedData = response.data;
        cacheTime = now;
        return res.status(200).json({ source: 'api', data: cachedData });
    } catch (error) {
        console.error('Market API Error:', error.message);
        return res.status(500).json({ message: 'Failed to fetch market data' });
    }
});

// @route   GET /api/market/chart/:id
// @desc    Fetch 7-day historical data for charts
router.get('/chart/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const now = Date.now();

        // Check if we have valid cached chart data for this specific coin (5 min cache)
        if (chartCache[id] && (now - chartCache[id].timestamp < 5 * 60 * 1000)) {
            return res.status(200).json({ source: 'cache', prices: chartCache[id].data });
        }

        const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${id}/market_chart`, {
            params: { vs_currency: 'usd', days: 7 }
        });

        // Extract just the prices array [timestamp, price]
        const prices = response.data.prices;
        
        // Update cache
        chartCache[id] = { timestamp: now, data: prices };

        return res.status(200).json({ source: 'api', prices });
    } catch (error) {
        console.error(`Chart API Error for ${req.params.id}:`, error.message);
        return res.status(500).json({ message: 'Failed to fetch chart data' });
    }
});

// @route   GET /api/market/fear-greed
// @desc    Fetch Fear & Greed Index from Alternative.me (free, no key)
let fearGreedCache = null;
let fearGreedCacheTime = null;
const FEAR_GREED_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

router.get('/fear-greed', async (req, res) => {
    try {
        const now = Date.now();
        if (fearGreedCache && fearGreedCacheTime && (now - fearGreedCacheTime < FEAR_GREED_CACHE_DURATION)) {
            return res.status(200).json({ ...fearGreedCache, source: 'cache' });
        }

        const response = await axios.get('https://api.alternative.me/fng/?limit=1', { timeout: 6000 });
        const data = response.data.data[0];

        const result = {
            value: parseInt(data.value),
            classification: data.value_classification,
            timestamp: data.timestamp,
            timeUntilUpdate: data.time_until_update
        };

        fearGreedCache = result;
        fearGreedCacheTime = now;

        return res.status(200).json({ ...result, source: 'live' });
    } catch (error) {
        console.error('[Fear & Greed] Error:', error.message);
        // Fallback value if API is down
        return res.status(200).json({ value: 50, classification: 'Neutral', source: 'fallback' });
    }
});

module.exports = router;
