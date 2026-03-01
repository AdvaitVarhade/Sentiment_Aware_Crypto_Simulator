// --- routes/auth.js ---
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/auth');

// Import Models
const User = require('../models/User');
const Portfolio = require('../models/Portfolio');

// Generate JWT Helper Function
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @route   POST /api/auth/register
// @desc    Register a new user & initialize portfolio
// @access  Public
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // 1. Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // 2. Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Create the user
        const user = await User.create({
            name,
            email,
            password: hashedPassword
        });

        // 4. Initialize an empty portfolio for this user
        await Portfolio.create({
            user: user._id,
            assets: []
        });

        // 5. Return success response with token
        res.status(201).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            cashBalance: user.cashBalance,
            token: generateToken(user._id)
        });

    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Server Error during registration' });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Find user by email (We must explicitly select +password because we hid it in the Model)
        const user = await User.findOne({ email }).select('+password');
        
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // 2. Check if password matches
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // 3. Return user data and token
        res.status(200).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            cashBalance: user.cashBalance,
            token: generateToken(user._id)
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server Error during login' });
    }
});

// @route   GET /api/auth/me
// @desc    Get current logged in user data & portfolio
// @access  Private (Requires Token)
router.get('/me', protect, async (req, res) => {
    try {
        // req.user is set by the protect middleware
        const user = await User.findById(req.user.id);
        
        // Find the portfolio linked to this user
        const portfolio = await Portfolio.findOne({ user: req.user.id });
        
        res.status(200).json({
            user,
            portfolio
        });
    } catch (error) {
        console.error('Profile Fetch Error:', error);
        res.status(500).json({ message: 'Server Error fetching profile' });
    }
});

module.exports = router;