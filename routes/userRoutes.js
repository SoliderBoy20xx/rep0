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
// GET route to retrieve users all
router.get('/users/all', authenticateUser, authorizeAdmin, async (req, res) => {
    try {
        console.log('Retrieving users...');
        
        // Query database to retrieve all users with role 'user'
        const query = {
            text: 'SELECT * FROM Users WHERE role = $1',
            values: ['user'],
        };
        const { rows } = await pool.query(query);
        
        console.log('Users:', rows);
        
        // Send the list of users as a JSON response
        res.json({ users: rows });
    } catch (error) {
        console.error('Error retrieving users:', error);
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

// danger zone /////////////////////////////////////////////////////////////////

// Define the route to check if a product exists by barcode
router.get('/products/:barcode', async (req, res) => {
    // Extract the barcode from the request parameters
    const { barcode } = req.params;

    try {
        // Query the samples table to check if a product with the provided barcode exists
        const query = {
            text: 'SELECT * FROM samples WHERE sample_barcode = $1',
            values: [barcode],
        };
        const { rows } = await pool.query(query);

        // If a product with the provided barcode exists, return a success response
        if (rows.length > 0) {
            res.status(200).json({ exists: true, product: rows[0] });
        } else {
            // If no product with the provided barcode exists, return a not found response
            res.status(404).json({ exists: false });
        }
    } catch (error) {
        // If an error occurs during the database query, return a server error response
        console.error('Error checking product existence:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

        // Define the route to add a product to the samples table
router.post('/products', async (req, res) => {
    // Extract the sample barcode from the request body
    const { sampleBarcode } = req.body;

    try {
        // Insert the sample barcode into the samples table
        const query = {
            text: 'INSERT INTO samples (sample_barcode) VALUES ($1) RETURNING *',
            values: [sampleBarcode],
        };
        const { rows } = await pool.query(query);

        // Return a success response with the inserted product information
        res.status(201).json({ success: true, product: rows[0] });
    } catch (error) {
        // If an error occurs during the database insertion, return a server error response
        console.error('Error adding product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

    // Define a route to check if a locker exists by its barcode
router.get('/lockers/:barcode', async (req, res) => {
    // Extract the locker barcode from the request parameters
    const { barcode } = req.params;

    try {
        // Check if the locker exists in the lockers table
        const query = {
            text: 'SELECT * FROM lockers WHERE locker_barcode = $1',
            values: [barcode],
        };
        const { rows } = await pool.query(query);

        // If a locker with the given barcode exists, return it in the response
        if (rows.length > 0) {
            res.status(200).json({ exists: true, locker: rows[0] });
        } else {
            res.status(404).json({ exists: false, message: 'Locker not found' });
        }
    } catch (error) {
        // If an error occurs during the database query, return a server error response
        console.error('Error checking locker:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Define a route to add a new locker to the lockers table
router.post('/lockers', async (req, res) => {
    // Extract the locker barcode from the request body
    const { lockerBarcode } = req.body;

    try {
        // Insert the locker barcode into the lockers table
        const query = {
            text: 'INSERT INTO lockers (locker_barcode) VALUES ($1) RETURNING *',
            values: [lockerBarcode],
        };
        const { rows } = await pool.query(query);

        // Return a success response with the inserted locker information
        res.status(201).json({ success: true, locker: rows[0] });
    } catch (error) {
        // If an error occurs during the database insertion, return a server error response
        console.error('Error adding locker:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}); 
////
/////

// Route to store the product in the StorageTransactions table
router.post('/storeProduct', authenticateUser, async (req, res) => {
    const { lockerBarcode, sampleBarcode, quantity } = req.body;

    try {
        // Check if the locker exists
        const lockerQuery = {
            text: 'SELECT locker_id FROM Lockers WHERE locker_barcode = $1',
            values: [lockerBarcode],
        };
        const lockerResult = await pool.query(lockerQuery);
        if (lockerResult.rowCount === 0) {
            return res.status(404).json({ error: 'Locker not found' });
        }
        const lockerId = lockerResult.rows[0].locker_id;

        // Get the sample_id based on the sampleBarcode
        const sampleIdQuery = {
            text: 'SELECT sample_id FROM Samples WHERE sample_barcode = $1',
            values: [sampleBarcode],
        };
        const sampleIdResult = await pool.query(sampleIdQuery);
        if (sampleIdResult.rowCount === 0) {
            return res.status(404).json({ error: 'Sample not found' });
        }
        const sampleId = sampleIdResult.rows[0].sample_id;



        // Calculate the quantity of the sample in this locker
        const quantityInThisLockerQuery = {
            text: 'SELECT COALESCE(SUM(quantity_in_this_locker), 0) + $1 AS quantity_in_this_locker FROM StorageTransactions WHERE sample_id = $2 AND locker_id = $3',
            values: [quantity, sampleId, lockerId],
        };
        const quantityInThisLockerResult = await pool.query(quantityInThisLockerQuery);
        const quantityInThisLocker = quantityInThisLockerResult.rows[0].quantity_in_this_locker;
        
        // Calculate the total quantity of the sample across all lockers, including the quantity of the new product
        const totalQuantityQuery = {
            text: 'SELECT COALESCE(SUM(quantity_in_this_locker), 0) + $1 AS total_quantity FROM StorageTransactions WHERE sample_id = $2',
            values: [quantity, sampleId],
        };
        const totalQuantityResult = await pool.query(totalQuantityQuery);
        const totalQuantity = totalQuantityResult.rows[0].total_quantity;

        // Calculate the sequence number for the new transaction
       const sequenceNumberQuery = {
            text: 'SELECT COALESCE(MAX(sequence_number), 0) + 1 AS sequence_number FROM StorageTransactions WHERE locker_id = $1',
            values: [lockerId],
};
        const sequenceNumberResult = await pool.query(sequenceNumberQuery);
        const sequenceNumber = sequenceNumberResult.rows[0].sequence_number;

        // Insert the new transaction
        const insertQuery = {
            text: 'INSERT INTO StorageTransactions (locker_id, locker_barcode, sample_id, sample_barcode, quantity_in_this_sequence, quantity_in_this_locker, total_quantity, sequence_number) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            values: [lockerId, lockerBarcode, sampleId, sampleBarcode, quantity, quantityInThisLocker, totalQuantity, sequenceNumber],
        };        
        await pool.query(insertQuery);

        // Update quantity_in_this_locker for all products with the same barcode in this locker
        const updateQuantityInThisLockerQuery = {
            text: 'UPDATE StorageTransactions SET quantity_in_this_locker = (SELECT COALESCE(MAX(quantity_in_this_locker), 0) FROM StorageTransactions WHERE sample_barcode = $1 AND locker_id = $2) WHERE sample_barcode = $1 AND locker_id = $2',
            values: [sampleBarcode, lockerId],
        };
        await pool.query(updateQuantityInThisLockerQuery);

        // Update total_quantity for all products with the same barcode across all lockers
        const updateTotalQuantityQuery = {
            text: 'UPDATE StorageTransactions SET total_quantity = (SELECT COALESCE(SUM(max_quantity), 0) FROM (SELECT MAX(quantity_in_this_locker) AS max_quantity FROM StorageTransactions WHERE sample_barcode = $1 GROUP BY locker_id) AS max_quantities) WHERE sample_barcode = $1',
            values: [sampleBarcode],
        };
        await pool.query(updateTotalQuantityQuery);

        res.status(200).json({ message: 'Product stored successfully' });
    } catch (error) {
        console.error('Error storing product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/////////////////////////// danger 2 /////////////////////

// Route to handle product removal
router.post('/removeProduct', authenticateUser, async (req, res) => {
    const { lockerBarcode, sampleBarcode, quantity } = req.body;

    try {
        // Check if the locker exists
        const lockerQuery = {
            text: 'SELECT locker_id FROM Lockers WHERE locker_barcode = $1',
            values: [lockerBarcode],
        };
        const lockerResult = await pool.query(lockerQuery);
        if (lockerResult.rowCount === 0) {
            return res.status(404).json({ error: 'Locker not found' });
        }
        const lockerId = lockerResult.rows[0].locker_id;

        // Check if the sample exists
        const sampleQuery = {
            text: 'SELECT sample_id FROM Samples WHERE sample_barcode = $1',
            values: [sampleBarcode],
        };
        const sampleResult = await pool.query(sampleQuery);
        if (sampleResult.rowCount === 0) {
            return res.status(404).json({ error: 'Sample not found' });
        }
        const sampleId = sampleResult.rows[0].sample_id;

        // Check if the quantity exceeds the quantity in this locker
        const quantityInThisLockerQuery = {
            text: 'SELECT COALESCE(MAX(quantity_in_this_locker), 0) AS quantity_in_this_locker FROM StorageTransactions WHERE sample_id = $1 AND locker_id = $2',
            values: [sampleId, lockerId],
        };
        const quantityInThisLockerResult = await pool.query(quantityInThisLockerQuery);
        const quantityInThisLocker = quantityInThisLockerResult.rows[0].quantity_in_this_locker;

        if (quantity > quantityInThisLocker) {
            // Quantity exceeds the available quantity in this locker
            // Get the available quantity in other lockers
            const otherLockersQuery = {
                text: 'SELECT DISTINCT ON (locker_id) locker_barcode, quantity_in_this_locker FROM StorageTransactions WHERE sample_id = $1 AND locker_id != $2',
                values: [sampleId, lockerId],
            };
            const otherLockersResult = await pool.query(otherLockersQuery);
            const otherLockers = otherLockersResult.rows;

            return res.status(400).json({
                error: 'Exceeded quantity in this locker',
                availableQuantityInOtherLockers: otherLockers
            });
        }

        // Update quantity_in_this_locker for every product with the same barcode in this locker
        const updateQuantityQuery = {
            text: 'UPDATE StorageTransactions SET quantity_in_this_locker = GREATEST(0, COALESCE((SELECT MAX(quantity_in_this_locker) FROM StorageTransactions WHERE sample_id = $1 AND locker_id = $2) - $3, 0)) WHERE sample_id = $1 AND locker_id = $2',
            values: [sampleId, lockerId, quantity],
        };
        await pool.query(updateQuantityQuery);

        res.status(200).json({ message: 'Product removed successfully' });
    } catch (error) {
        console.error('Error removing product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


module.exports = { router, authenticateUser, authorizeAdmin }; 
