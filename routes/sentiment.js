// --- routes/sentiment.js ---
// Real VADER-style sentiment analysis using CryptoCompare News API (free, no API key needed)
const express = require('express');
const router = express.Router();
const axios = require('axios');

// --- VADER-style Lexicon ---
// Each word maps to a compound sentiment score from -3 (very bearish) to +3 (very bullish)
const sentimentLexicon = {
    // Strong Bullish (+2 to +3)
    'surge': 2.8, 'surges': 2.8, 'surging': 2.8,
    'moon': 2.5, 'mooning': 2.5, 'moonshot': 2.5,
    'breakout': 2.6, 'rally': 2.4, 'rallying': 2.4,
    'soar': 2.7, 'soars': 2.7, 'soaring': 2.7,
    'skyrocket': 3.0, 'skyrockets': 3.0,
    'ath': 2.9, 'all-time high': 2.9, 'record high': 2.9,
    'approved': 2.3, 'approval': 2.3, 'approve': 2.3,
    'bullish': 2.5, 'bull run': 2.8, 'bull market': 2.5,
    'institutional': 1.8, 'adoption': 2.2, 'mass adoption': 2.7,
    'etf': 2.0, 'listed': 1.8, 'listing': 1.8,
    'launch': 1.7, 'launches': 1.7, 'launched': 1.7,
    'partnership': 1.9, 'integration': 1.6,
    'upgrade': 1.8, 'upgraded': 1.8, 'milestone': 1.7,
    'gains': 2.0, 'gain': 2.0, 'pumps': 2.3, 'pump': 2.1,
    'recovery': 1.9, 'recovering': 1.8, 'rebounds': 2.1, 'rebound': 2.0,
    'buy': 1.5, 'buying': 1.6, 'accumulate': 1.8, 'accumulation': 1.8,
    'inflows': 2.0, 'invest': 1.5, 'investment': 1.5,
    'profit': 1.8, 'profits': 1.8, 'returns': 1.5,

    // Moderate Bullish (+1 to +2)
    'up': 1.2, 'rise': 1.4, 'rises': 1.4, 'rising': 1.3,
    'high': 1.0, 'higher': 1.2, 'growth': 1.5, 'growing': 1.3,
    'positive': 1.2, 'optimistic': 1.6, 'optimism': 1.5,
    'greedy': 1.0, 'greed': 0.8, 'confidence': 1.4,
    'support': 1.1, 'supported': 1.1, 'strong': 1.3, 'strength': 1.2,
    'green': 1.0, 'bullish signal': 2.0, 'outperform': 1.8,

    // Strong Bearish (-2 to -3)
    'crash': -2.9, 'crashing': -2.9, 'crashed': -2.8,
    'collapse': -2.8, 'collapses': -2.8, 'collapsing': -2.7,
    'plunge': -2.7, 'plunges': -2.7, 'plunging': -2.6,
    'tank': -2.5, 'tanking': -2.5, 'tanks': -2.5,
    'hack': -2.6, 'hacked': -2.7, 'exploit': -2.6, 'exploited': -2.7,
    'scam': -2.8, 'fraud': -2.9, 'fraudulent': -2.9, 'rug pull': -3.0,
    'bankrupt': -3.0, 'bankruptcy': -3.0, 'insolvent': -2.9,
    'ban': -2.4, 'banned': -2.5, 'banning': -2.4, 'crackdown': -2.3,
    'terror': -2.3, 'seized': -2.2, 'seized assets': -2.5,
    'lawsuit': -2.2, 'sec charges': -2.5, 'securities fraud': -2.8,
    'bear': -2.0, 'bearish': -2.3, 'bear market': -2.5, 'bear run': -2.3,
    'sell-off': -2.5, 'selloff': -2.5, 'selling pressure': -2.2,
    'fear': -1.8, 'panic': -2.3, 'panic selling': -2.8,

    // Moderate Bearish (-1 to -2)
    'drop': -1.8, 'drops': -1.8, 'dropping': -1.7,
    'fall': -1.5, 'falls': -1.5, 'falling': -1.4,
    'down': -1.2, 'decline': -1.5, 'declines': -1.5, 'declining': -1.4,
    'low': -1.0, 'lower': -1.2, 'losses': -1.6, 'loss': -1.5,
    'negative': -1.2, 'pessimistic': -1.6, 'uncertainty': -1.3,
    'risk': -1.0, 'risky': -1.3, 'volatile': -1.0, 'volatility': -0.8,
    'warning': -1.5, 'concern': -1.3, 'worried': -1.4, 'worry': -1.3,
    'red': -1.0, 'dumping': -2.0, 'dump': -1.8, 'bearish signal': -2.0,
    'regulation': -1.2, 'regulatory': -1.1, 'regulate': -1.0
};

// Intensifiers multiply the next word's score
const intensifiers = {
    'very': 1.5, 'extremely': 1.8, 'massively': 1.7, 'significantly': 1.4,
    'sharply': 1.4, 'heavily': 1.4, 'major': 1.4, 'massive': 1.6,
    'huge': 1.5, 'enormous': 1.6, 'dramatic': 1.4, 'drastically': 1.5,
    'slightly': 0.5, 'minor': 0.5, 'somewhat': 0.7, 'little': 0.5
};

// Negations flip the sentiment of the next word
const negations = ['not', 'no', 'never', "n't", 'cannot', "can't", 'without', 'neither', 'nor'];

// VADER-style compound scoring
function calculateVaderScore(text) {
    const tokens = text.toLowerCase().replace(/[^a-z\s'-]/g, ' ').split(/\s+/);
    let scores = [];
    
    for (let i = 0; i < tokens.length; i++) {
        const word = tokens[i];
        
        if (sentimentLexicon[word] !== undefined) {
            let score = sentimentLexicon[word];
            
            // Check for negation in previous 3 words
            const prevWords = tokens.slice(Math.max(0, i - 3), i);
            const isNegated = prevWords.some(w => negations.includes(w));
            if (isNegated) score *= -0.74;
            
            // Check for intensifier in previous word
            if (i > 0 && intensifiers[tokens[i - 1]] !== undefined) {
                score *= intensifiers[tokens[i - 1]];
            }
            
            scores.push(score);
        }
    }
    
    if (scores.length === 0) return 0;
    
    // Normalize using VADER formula
    const sumS = scores.reduce((a, b) => a + b, 0);
    const squareSumPlus = scores.reduce((a, b) => a + b * b, 0);
    const compound = sumS / Math.sqrt(squareSumPlus + 15);
    return Math.max(-1, Math.min(1, compound)); // Clamp to [-1, +1]
}

// Convert compound score [-1, +1] to hype score [0, 100]
function compoundToHypeScore(compound) {
    return Math.round((compound + 1) * 50);
}

function getSentimentLabel(hypeScore) {
    if (hypeScore >= 75) return 'Extreme Greed (Very Bullish)';
    if (hypeScore >= 60) return 'Greed (Bullish)';
    if (hypeScore >= 55) return 'Slightly Bullish';
    if (hypeScore >= 45) return 'Neutral';
    if (hypeScore >= 40) return 'Slightly Bearish';
    if (hypeScore >= 25) return 'Fear (Bearish)';
    return 'Extreme Fear (Very Bearish)';
}

// Cache to avoid hammering the news API
let sentimentCache = null;
let sentimentCacheTime = null;
const SENTIMENT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// @route   GET /api/sentiment/hype
// @desc    Real VADER sentiment using CryptoCompare News API (free, no key needed)
// @access  Public
router.get('/hype', async (req, res) => {
    try {
        const now = Date.now();
        if (sentimentCache && sentimentCacheTime && (now - sentimentCacheTime < SENTIMENT_CACHE_DURATION)) {
            return res.status(200).json({ ...sentimentCache, source: 'cache' });
        }

        let articles = [];
        let dataSource = 'mock';

        try {
            // CryptoCompare News API — completely free, no key required
            const response = await axios.get('https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=popular', {
                timeout: 8000
            });
            if (response.data && response.data.Data && response.data.Data.length > 0) {
                articles = response.data.Data.slice(0, 30); // Analyze top 30 articles
                dataSource = 'cryptocompare';
            } else {
                throw new Error('No data from CryptoCompare');
            }
        } catch (apiErr) {
            console.log('[Sentiment] CryptoCompare unavailable, using mock news:', apiErr.message);
            articles = [
                { title: "Bitcoin surges to new all-time high amid mass adoption by institutions" },
                { title: "Major crypto exchange gets hacked, users fear losing funds" },
                { title: "Ethereum bull run continues as institutional buyers accumulate" },
                { title: "New regulatory crackdown in Europe causes market uncertainty" },
                { title: "New institutional money and ETF inflows push crypto prices sharply up" },
                { title: "Investors panic sell assets causing a dramatic market drop" },
                { title: "New blockchain ETF approved, market prepares for massive rally" },
                { title: "SEC lawsuit against major crypto firm sparks bearish sentiment" },
                { title: "Bitcoin mining difficulty hits all-time high, price rebounds" },
                { title: "DeFi protocol collapses due to exploit, $50M lost in rug pull" }
            ];
        }

        // Run VADER analysis on all articles
        let allScores = [];
        let topHeadlines = [];

        articles.forEach(article => {
            const text = [article.title, article.body || ''].join(' ');
            const score = calculateVaderScore(text);
            allScores.push(score);
            if (topHeadlines.length < 5) {
                topHeadlines.push({
                    title: article.title,
                    score: parseFloat(score.toFixed(3)),
                    sentiment: score >= 0.05 ? 'bullish' : score <= -0.05 ? 'bearish' : 'neutral'
                });
            }
        });

        // Aggregate: weighted average (recent articles get more weight)
        let weightedSum = 0;
        let totalWeight = 0;
        allScores.forEach((score, index) => {
            const weight = 1 / (index + 1); // Decay weight by position
            weightedSum += score * weight;
            totalWeight += weight;
        });
        const aggregateCompound = totalWeight > 0 ? weightedSum / totalWeight : 0;

        const hypeScore = compoundToHypeScore(aggregateCompound);
        const marketSentiment = getSentimentLabel(hypeScore);

        const result = {
            hypeScore,
            marketSentiment,
            vaderScore: parseFloat(aggregateCompound.toFixed(4)),
            analyzedArticles: articles.length,
            dataSource,
            headlines: topHeadlines
        };

        sentimentCache = result;
        sentimentCacheTime = Date.now();

        return res.status(200).json({ ...result, source: 'live' });

    } catch (error) {
        console.error('[Sentiment] Fatal error:', error.message);
        res.status(500).json({ message: 'Error calculating market sentiment' });
    }
});

// --- Per-coin sentiment cache (symbol -> {score, label, timestamp}) ---
const coinSentimentCache = {};
const COIN_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// @route   GET /api/sentiment/coin/:symbol
// @desc    VADER sentiment for a specific coin using CryptoCompare category filter
// @access  Public
router.get('/coin/:symbol', async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    const now = Date.now();

    // Return cached result if fresh
    if (coinSentimentCache[symbol] && (now - coinSentimentCache[symbol].timestamp < COIN_CACHE_DURATION)) {
        return res.status(200).json({ ...coinSentimentCache[symbol], source: 'cache' });
    }

    try {
        // CryptoCompare supports filtering news by coin category (e.g. 'BTC', 'ETH', 'SOL')
        const response = await axios.get(
            `https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=${symbol}&sortOrder=popular`,
            { timeout: 7000 }
        );

        let articles = [];
        if (response.data && response.data.Data && response.data.Data.length > 0) {
            articles = response.data.Data.slice(0, 15);
        } else {
            // Fallback: use general news if no coin-specific articles
            const fallback = await axios.get('https://min-api.cryptocompare.com/data/v2/news/?lang=EN', { timeout: 5000 });
            articles = (fallback.data?.Data || []).slice(0, 10);
        }

        const scores = articles.map(a => calculateVaderScore([a.title, a.body || ''].join(' ')));
        let wSum = 0, wTotal = 0;
        scores.forEach((s, i) => { const w = 1/(i+1); wSum += s*w; wTotal += w; });
        const compound = wTotal > 0 ? wSum / wTotal : 0;
        const hypeScore = compoundToHypeScore(compound);
        const label = getSentimentLabel(hypeScore);
        const signal = hypeScore >= 60 ? 'BUY' : hypeScore <= 40 ? 'SELL' : 'NEUTRAL';

        const result = { symbol, hypeScore, label, signal, vaderScore: parseFloat(compound.toFixed(3)), timestamp: now };
        coinSentimentCache[symbol] = result;
        return res.status(200).json({ ...result, source: 'live' });

    } catch (err) {
        console.error(`[CoinSentiment] Error for ${symbol}:`, err.message);
        // Return a neutral fallback so the UI doesn't break
        return res.status(200).json({ symbol, hypeScore: 50, label: 'Neutral', signal: 'NEUTRAL', vaderScore: 0, source: 'fallback' });
    }
});

// Cache for sentiment history
let historyCache = null;
let historyCacheTime = null;
const HISTORY_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// @route   GET /api/sentiment/history
// @desc    Historical VADER sentiment scores (past 30 days) overlaid on price chart
// @access  Public
router.get('/history', async (req, res) => {
    try {
        const now = Date.now();
        if (historyCache && historyCacheTime && (now - historyCacheTime < HISTORY_CACHE_DURATION)) {
            return res.status(200).json({ history: historyCache, source: 'cache' });
        }

        const DAYS = 30;             // Total days to look back
        const NUM_POINTS = 10;       // How many data points to generate
        const STEP = Math.floor(DAYS / NUM_POINTS); // Days between each sample
        const NOW_SECONDS = Math.floor(now / 1000);
        const DAY_SECONDS = 86400;

        const historyPoints = [];

        // Fetch news batches at evenly spaced timestamps going back in time
        for (let i = NUM_POINTS; i >= 0; i--) {
            const targetTimestamp = NOW_SECONDS - (i * STEP * DAY_SECONDS);
            const dateLabel = new Date(targetTimestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            try {
                const response = await axios.get(
                    `https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=popular&lTs=${targetTimestamp}`,
                    { timeout: 6000 }
                );

                if (response.data && response.data.Data && response.data.Data.length > 0) {
                    const articles = response.data.Data.slice(0, 20); // Top 20 articles at this timestamp

                    // Score each article with VADER
                    const scores = articles.map(a => calculateVaderScore([a.title, a.body || ''].join(' ')));

                    // Weighted aggregate (recency bias)
                    let wSum = 0, wTotal = 0;
                    scores.forEach((s, idx) => {
                        const w = 1 / (idx + 1);
                        wSum += s * w;
                        wTotal += w;
                    });
                    const compound = wTotal > 0 ? wSum / wTotal : 0;
                    const hypeScore = compoundToHypeScore(compound);

                    historyPoints.push({
                        date: dateLabel,
                        timestamp: targetTimestamp * 1000,
                        score: hypeScore,
                        vaderScore: parseFloat(compound.toFixed(4)),
                        label: getSentimentLabel(hypeScore)
                    });
                }
            } catch (pointErr) {
                // Skip this point if the API fails — don't break the whole series
                console.log(`[SentimentHistory] Skipping ${dateLabel}: ${pointErr.message}`);
            }

            // Small delay between requests to be polite to the free API
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        if (historyPoints.length === 0) {
            return res.status(200).json({ history: [], source: 'unavailable' });
        }

        historyCache = historyPoints;
        historyCacheTime = Date.now();

        return res.status(200).json({ history: historyPoints, source: 'live' });

    } catch (error) {
        console.error('[SentimentHistory] Fatal error:', error.message);
        res.status(500).json({ message: 'Error fetching sentiment history' });
    }
});

module.exports = router;
