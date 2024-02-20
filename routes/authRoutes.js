// authRoutes.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const generateSecretKey = require('./utils');

// Generate the secret key
const secretKey = generateSecretKey();
module.exports = { secretKey };
//const secretKey = "mySecretKey";



// Now you can use `secretKey` in your routes and middleware



const { createUser, getUserByUsername, updateLastLoginDate } = require('../db'); // Import database interaction functions

// Function to generate authentication token
const generateAuthToken = (user) => {
    console.log("Secret key used for token generation111S:", secretKey);
    // Define payload data for the token (e.g., user ID, username)
    const payload = {
        userId: user.user_id, 
        username: user.username
    };

    // Generate JWT with payload and secret key
    
    const token = jwt.sign(payload, secretKey, { expiresIn: '8h' });
    return { token, secretKey };
};

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
    const authToken = req.headers.authorization;

    if (!authToken) {
        return res.status(401).json({ error: 'Authentication token is missing' });
    }

    try {
        // Verify authentication token (JWT token)
        
        const decodedToken = jwt.verify(authToken, secretKey);
        const userId = decodedToken.userId; // Extract user ID from decoded token

        // Attach user ID to request object for further processing
        req.userId = userId;
        next(); // Call next middleware or route handler
    } catch (error) {
        console.error('Error validating authentication token:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
};

// POST /register - User registration route
router.post('/register', async (req, res) => {
    const { username, email, password, name } = req.body;

    // Validate input
    if (!username || !email || !password || !name) {
        return res.status(400).json({ error: 'Username, email, password, and name are required' });
    }

    try {
        // Check if user already exists
        const existingUser = await getUserByUsername(username);
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Create new user
        const newUser = await createUser(username, email, password, name);

        // Send success response with newly created user object
        res.status(201).json(newUser);
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Other authentication routes (e.g., login, logout, password reset) can be added here
// POST /login - User login route
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    // Log the received data
    //console.log('Received username:', username);
   // console.log('Received password:', password);

    // Validate input
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        // Query database to retrieve user information
        const user = await getUserByUsername(username);

        // Check if user exists and password is correct
        // If successful, generate authentication token
        if (user && await bcrypt.compare(password, user.password) && user.status === 'approved') {
            // Update last login date
            await updateLastLoginDate(user.user_id);
            
            // Generate authentication token
            const authToken = generateAuthToken(user);
            
          
            
            console.log('logged in succ');
            return res.status(200).json({ authToken });
            console.log('logged in succ');
        } else {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = { router, authenticateToken, secretKey };
