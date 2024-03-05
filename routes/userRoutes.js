const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
//const secretKey = "mySecretKey";


//const generateSecretKey = require('./utils');
const { secretKey } = require('./authRoutes');
console.log("Secret key for token err verf xxx:", secretKey);



// Now you can use `secretKey` in your routes and middleware




// Middleware to authenticate user
const authenticateUser = async (req, res, next) => {
    console.log('Authenticating user...');
    console.log("Secret key for token verf:", secretKey);
    const authToken = req.headers.authorization;

    if (!authToken) {
        console.log('Authentication token is missing');
        return res.status(401).json({ error: 'Authentication token is missing' });
    }

    try {
        // Log or output the secret key used for token verification
        

        // Verify the token
        jwt.verify(authToken, secretKey, async (err, decodedToken) => {
            if (err) {
                // Token verification failed
                console.error('Token verification failed:', err.message);
                return res.status(401).json({ error: 'Authentication failed' });
            } else {
                // Token verification successful
                
                const userId = decodedToken.userId; // Extract user ID from decoded token

                // Check if user exists in the database
                const userQuery = {
                    text: 'SELECT * FROM Users WHERE user_id = $1',
                    values: [userId]
                };
                const { rows } = await pool.query(userQuery);
                const user = rows[0];

                if (!user) {
                    console.log('Invalid authentication token');
                    return res.status(401).json({ error: 'Invalid authentication token' });
                }

                // Attach user information to request object for further processing
                req.user = user;
                console.log('User authenticated successfully');
                next(); // Call next middleware or route handler
            }
        });
    } catch (error) {
        console.error('Error validating authentication token:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
    
};


console.log("Secret key for token generation:", secretKey);
// Middleware to authorize admin users
const authorizeAdmin = async (req, res, next) => {
    console.log('Authorizing admin...');
    // Check if user is authenticated
    if (!req.user) {
        console.log('User not authenticated');
        return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if user has admin role
    if (req.user.role !== 'admin') {
        console.log('User not authorized');
        return res.status(403).json({ error: 'User not authorized' });
    }

    // User is authorized as admin, proceed to next middleware or route handler
    console.log('Admin authorized');
    next();
};

// PUT route to modify user status by admin
router.put('/users/:userId/status', authenticateUser, authorizeAdmin, async (req, res) => {
    const userId = req.params.userId;
    const { status } = req.body;
    console.log(req); // Add this line to inspect the req object
    console.log('Received PUT request at /users/:userId/status');
  
    console.log('User ID:', userId);
    console.log('New Status:', status);

    try {
        console.log(`Updating status of user with ID ${userId} to ${status}`);

        // Update user status in the database
        const query = {
            text: 'UPDATE Users SET status = $1 WHERE user_id = $2',
            values: [status, userId]
        };
        const result = await pool.query(query);

        console.log(`User status updated successfully. Affected rows: ${result.rowCount}`);

        res.json({ message: 'User status updated successfully' });
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



// Example route requiring authentication and admin authorization
router.get('/admin/dashboard', authenticateUser, authorizeAdmin, (req, res) => {
    res.json({ message: 'Welcome to admin dashboard' });
});

// Test route to check authentication
router.get('/test-authentication', authenticateUser, (req, res) => {
    
    res.json({ message: 'Authentication successful', user: req.user });
});

// GET route to retrieve users with unapproved status
router.get('/users/unapproved', authenticateUser, authorizeAdmin, async (req, res) => {
    try {
        console.log('Retrieving users with unapproved status...');
        
        // Query database to retrieve users with unapproved status
        const query = {
            text: 'SELECT * FROM Users WHERE status = $1',
            values: ['not approved']
        };
        const { rows } = await pool.query(query);
        
        console.log('Users with unapproved status:', rows);
        
        res.json({ users: rows });
    } catch (error) {
        console.error('Error retrieving users with unapproved status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE route to delete a user by ID
router.delete('/users/:userId', authenticateUser, authorizeAdmin, async (req, res) => {
    const userId = req.params.userId;

    try {
        console.log(`Deleting user with ID ${userId}...`);

        // Delete user from the database
        const query = {
            text: 'DELETE FROM Users WHERE user_id = $1',
            values: [userId]
        };
        const result = await pool.query(query);

        console.log(`User with ID ${userId} deleted. Affected rows: ${result.rowCount}`);

        res.json({ message: `User with ID ${userId} deleted successfully` });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET route to retrieve contents of the main table
router.get('/main', authenticateUser, async (req, res) => {
    try {
        console.log('Retrieving contents of the main table...');

        // Retrieve contents of the main table from the database
        const query = 'SELECT * FROM main';
        const { rows } = await pool.query(query);

        console.log(`Retrieved ${rows.length} rows from the main table`);

        // Send the retrieved data as JSON in the response
        res.json({ data: rows });
    } catch (error) {
        console.error('Error retrieving data from the main table:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


module.exports = { router, authenticateUser, authorizeAdmin };
