// --- middleware/auth.js ---
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    // Check if the authorization header exists and starts with 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header (Format: "Bearer <token>")
            token = req.headers.authorization.split(' ')[1];

            // Verify the token using our secret key
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Fetch the user from the database and attach it to the request object (excluding password)
            req.user = await User.findById(decoded.id).select('-password');

            // Move to the next middleware or route controller
            return next(); // 'return' stops execution here on success
        } catch (error) {
            console.error('Token verification failed:', error.message);
            return res.status(401).json({ message: 'Not authorized, token failed' }); // 'return' stops execution here on failure
        }
    }

    // Only reached if no Authorization header was present at all
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token provided' });
    }
};

module.exports = { protect };