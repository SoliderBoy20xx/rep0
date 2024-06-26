const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
//const secretKey = "mySecretKey";


//const generateSecretKey = require('./utils');
const { secretKey } = require('./authRoutes');
//console.log("Secret key for token err verf xxx:", secretKey);



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
    const { lockerBarcode, sampleBarcode, quantity, timestamp } = req.body;

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
            text: 'INSERT INTO StorageTransactions (locker_id, locker_barcode, sample_id, sample_barcode, quantity_in_this_sequence, quantity_in_this_locker, total_quantity, sequence_number, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9 )',
            values: [lockerId, lockerBarcode, sampleId, sampleBarcode, quantity, quantityInThisLocker, totalQuantity, sequenceNumber, timestamp],
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

/////////////////////////// danger 2 ///////////////////// TEMPOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO

// Route to handle product removal

/////////////////////////// danger 2 ///////////////////// TEMPOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO

/////////////////////////// danger 2 ///////////////////// TEMPOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO
// Retrieve Possible Sequences Route
router.get('/possible-sequences/:lockerBarcode/:productBarcode/:quantity', authenticateUser, async (req, res) => {
    const { lockerBarcode, productBarcode, quantity } = req.params;
  
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
        values: [productBarcode],
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
  
      // If the requested quantity exceeds the quantity in this locker, return an error response
      if (parseInt(quantity) > quantityInThisLocker) {
        return res.status(400).json({ error: 'Requested quantity exceeds the quantity in this locker' });
      }
  
      // Query to retrieve possible sequences for the given locker and product from the database
      const result = await pool.query('SELECT sequence_number, quantity_in_this_sequence FROM StorageTransactions WHERE locker_barcode = $1 AND sample_barcode = $2', [lockerBarcode, productBarcode]);
      const sequences = result.rows;
      res.json({ sequences });
    } catch (error) {
      console.error('Error retrieving possible sequences:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

 
// Recursive function to unstock product based on selected sequences, quantity to remove, and locker barcode
async function unstockProduct(selectedSequences, remainingQuantityToRemove, lockerBarcode) {
    try {
        console.log(`ddpaaaa: remainingQuantityToRemove=${remainingQuantityToRemove}`);
        if (remainingQuantityToRemove <= 0 || selectedSequences.length === 0) {
            return { success: true, message: 'Product unstocked successfully' };
            
        } else{
  
      const sequenceNumber = selectedSequences[0]; // Get the first sequence number to process

      console.log(`H1: sequenceNumber =${sequenceNumber}`);
  
      // Query to retrieve current quantity in the sequence for the specific locker
      const sequenceQuery = {
        text: `SELECT sequence_number, quantity_in_this_sequence
               FROM StorageTransactions
               WHERE sequence_number = $1 AND locker_barcode = $2`,
        values: [sequenceNumber, lockerBarcode],
      };
  
      const sequenceResult2 = await pool.query(sequenceQuery);
      const sequenceResult = await pool.query(sequenceQuery);
console.log('Sequence Result éé :', sequenceResult.rows); // Log the entire result set

const sequence = sequenceResult.rows[0];
console.log('Sequence éé:', JSON.stringify(sequence, null, 2)); // Log the specific se

      console.log('Sequence HHH:', JSON.stringify(sequence, null, 2));

      if (!sequence) {
        return { success: false, message: `Sequence ${sequenceNumber} not found in locker ${lockerBarcode}` };
      }
  
      const currentQuantity = sequence.quantity_in_this_sequence;

      if (currentQuantity === undefined || currentQuantity === null) {
        // Handle unexpected null or undefined values for quantity
        console.error(`Error: Current quantity for sequence ${sequenceNumber} in locker ${lockerBarcode} is undefined or null`);
        return { success: false, message: 'Unexpected data inconsistency' };
      }


      console.log(`currentQuantity is equal to  =${currentQuantity}`);
      // Calculate quantity to deduct from the current sequence
      const quantityToDeduct = Math.min(currentQuantity, remainingQuantityToRemove);
      // Log relevant values for debugging
         console.log(`Loop: sequenceNumber=${sequenceNumber}, currentQuantity=${currentQuantity}, quantityToDeduct=${quantityToDeduct}`);
         console.log(`Loop: remainingQuantityToRemove=${remainingQuantityToRemove}`);



         console.log(`H1 AGAIN : sequenceNumber =${sequenceNumber}`);

         const HP1 = currentQuantity - quantityToDeduct ;
         console.log(`LOCKER =${lockerBarcode}`);
         
         console.log(`HP1 =${HP1}`);

         
    


      // Update the quantity in the sequence for the specific locker
      const updateQuery = {
        text: `UPDATE StorageTransactions
               SET quantity_in_this_sequence = $1
               WHERE sequence_number = $2 AND locker_barcode = $3`,
        values: [HP1, sequenceNumber, lockerBarcode],
      };
  
      await pool.query(updateQuery);

       // !!!!!!!!!!!!!!!!!!! neew new Check if the updated quantity is zero and delete the record if necessary
       if (HP1 === 0) {
        const deleteQuery = {
            text: `DELETE FROM StorageTransactions
                   WHERE sequence_number = $1 AND locker_barcode = $2 `,
            values: [sequenceNumber, lockerBarcode],
        };

        await pool.query(deleteQuery);
    }
  
      // Calculate remaining quantity to remove after deducting from current sequence
      const updatedRemainingQuantity = remainingQuantityToRemove - quantityToDeduct  ;
      console.log(`ddp: updatedRemainingQuantity=${updatedRemainingQuantity}`);

       // Recursively call the function with the rest of the selected sequences and updated remaining quantity
       const nextSequences = selectedSequences.slice(1);
       console.log('Next selectedSequences:', nextSequences);
      

       return await unstockProduct(nextSequences, updatedRemainingQuantity, lockerBarcode);
    }
      // Recursively call the same function with the rest of the selected sequences and updated remaining quantity
      
    } catch (error) {
      console.error('Error unstocking product:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  
  // Route to unstock product based on selected sequences, quantity to remove, and locker barcode
  router.post('/unstock', async (req, res) => {
    try {
      const selectedSequences = req.body.selectedSequences; // Array of selected sequence numbers
      const quantityToRemove = req.body.quantityToRemove; // Total quantity to remove
      const lockerBarcode = req.body.lockerBarcode; // Scanned locker barcode
      const productBarcode = req.body.productBarcode;

      // Call the recursive function to unstock the product
      const result = await unstockProduct(selectedSequences, quantityToRemove, lockerBarcode);
  
      if (result.success) {
         // Update quantity_in_this_locker for all products with the same barcode in this locker
         const updateQuantityInThisLockerQuery = {
            text: `
                UPDATE StorageTransactions 
                SET quantity_in_this_locker = (
                    SELECT GREATEST(
                        COALESCE(MAX(quantity_in_this_locker), 0) - $1, 
                        0
                    ) 
                    FROM StorageTransactions AS st
                    WHERE st.sample_barcode = $2 
                        AND st.locker_id = (
                            SELECT locker_id 
                            FROM Lockers 
                            WHERE locker_barcode = $3
                        )
                ) 
                WHERE sample_barcode = $2 
                    AND locker_id = (
                        SELECT locker_id 
                        FROM Lockers 
                        WHERE locker_barcode = $3
                    )
            `,
            values: [quantityToRemove, productBarcode, lockerBarcode],
        };
        await pool.query(updateQuantityInThisLockerQuery);

        // Update total_quantity for all products with the same barcode across all lockers
        const updateTotalQuantityQuery = {
            text: `
                UPDATE StorageTransactions 
                SET total_quantity = (
                    SELECT GREATEST(
                        COALESCE(MAX(total_quantity), 0) - $1, 
                        0
                    ) 
                    FROM StorageTransactions 
                    WHERE sample_barcode = $2
                )
                WHERE sample_barcode = $2
            `,
            values: [quantityToRemove, productBarcode],
        };
        
        await pool.query(updateTotalQuantityQuery);


        res.json({ message: result.message });
      } else {
        res.status(404).json({ error: result.message });
      }
    } catch (error) {
      console.error('Error unstocking product:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  
  // additional routers , after beta 
  router.get('/productdetails/:barcode', authenticateUser, async (req, res) => {
    
    
    const {barcode} = req.params;
    console.log('barcode', barcode);
    try {
        const transactionsQuery = {
            text: `
                SELECT 
                    transaction_id, 
                    sample_id, 
                    sample_barcode, 
                    locker_id, 
                    locker_barcode, 
                    quantity_in_this_locker, 
                    sequence_number, 
                    quantity_in_this_sequence, 
                    total_quantity 
                FROM 
                    StorageTransactions 
                WHERE 
                    sample_barcode = $1
            `,
            values: [barcode],
        };

        console.log('Query:', transactionsQuery); // Log the query for debugging

        const transactionsResult = await pool.query(transactionsQuery);
  
      // Return the transactions in a table-like format
      const transactions = transactionsResult.rows;
      console.log('Transactions:', transactions); // Log transaction
      console.log('Transactions:', transactions[1]); // Log transaction
      
      if (transactions.length > 0) {
        res.json({ transactions });
    } else {
        console.log('No transactions found for barcode:', barcode);
        res.status(404).json({ error: 'No transactions found' });
    }
} catch (error) {
    console.error('Error retrieving product details:', error);
    res.status(500).json({ error: 'Internal server error' });
}
});

//fetching tables 

// Route to fetch all records from StorageTransactions table
router.get('/storagetransactions', authenticateUser, async  (req, res) => {
    try {
      const query = `
        SELECT *
        FROM StorageTransactions;
      `;
      const { rows } = await pool.query(query);
      res.status(200).json(rows);
    } catch (error) {
      console.error('Error fetching StorageTransactions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Route to fetch all records from Lockers table
  router.get('/lockers', authenticateUser, async (req, res) => {
    try {
      const query = `
        SELECT *
        FROM Lockers;
      `;
      const { rows } = await pool.query(query);
      res.status(200).json(rows);
    } catch (error) {
      console.error('Error fetching Lockers:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Route to fetch all records from Samples table
  router.get('/samples', authenticateUser, async (req, res) => {
    try {
      const query = `
        SELECT *
        FROM Samples;
      `;
      const { rows } = await pool.query(query);
      res.status(200).json(rows);
    } catch (error) {
      console.error('Error fetching Samples:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

// routes for version 2 //App modification , delavage --------------> sales

router.get('/clients/:clientBarcode', authenticateUser, async (req, res) => {
    const clientBarcode = req.params.clientBarcode;
  
    try {
      const query = `
        SELECT client_id
        FROM clients
        WHERE client_barcode = $1;
      `;
      const { rows } = await pool.query(query, [clientBarcode]);
  
      if (rows.length > 0) {
        res.status(200).json({ clientId: rows[0].client_id });
      } else {
        res.status(404).json({ error: 'Client not found' });
      }
    } catch (error) {
      console.error('Error verifying client:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

//_______so far so good 

// Route to create a new receipt and associated receipt items
router.post('/receipts', authenticateUser, async (req, res) => {
    const { clientId, products } = req.body;
    const timestamp = new Date().toISOString();
    const status = 'pending';

    try {
        // Log the received clientId and products list
        console.log("Received clientId:", clientId);
        console.log("Received products list:", JSON.stringify(products, null, 2));

        // Start a transaction
        console.log("Starting transaction...");
        await pool.query('BEGIN');
        console.log("Transaction started.");

        // Insert a new receipt
        const insertReceiptQuery = {
            text: 'INSERT INTO receipts (client_id, status, created_at) VALUES ($1, $2, $3) RETURNING receipt_id',
            values: [clientId, status, timestamp],
        };
        console.log("Inserting new receipt...");
        const receiptResult = await pool.query(insertReceiptQuery);
        const receiptId = receiptResult.rows[0].receipt_id;
        console.log("New receipt inserted. Receipt ID:", receiptId);

        // Process each product to insert receipt items
        for (const product of products) {
            const { productBarcode, quantity } = product;

            // Log each product's productBarcode and quantity
            console.log("Processing product:", { productBarcode, quantity });

            // Validate productBarcode and quantity
            if (!productBarcode || !quantity) {
                throw new Error(`Invalid product data: ${JSON.stringify(product)}`);
            }

            // Get the sample_id based on the sample_barcode
            console.log("Getting sample ID for productBarcode:", productBarcode);
            const getSampleIdQuery = {
                text: 'SELECT sample_id FROM samples WHERE sample_barcode = $1',
                values: [productBarcode],
            };
            const sampleResult = await pool.query(getSampleIdQuery);

            if (sampleResult.rows.length === 0) {
                throw new Error(`No sample found for sample_barcode: ${productBarcode}`);
            }

            const sample_id = sampleResult.rows[0].sample_id;
            console.log("Sample ID found:", sample_id);

            // Insert receipt item
            console.log("Inserting receipt item for productBarcode:", productBarcode);
            const insertReceiptItemsQuery = {
                text: 'INSERT INTO receipt_items (receipt_id, sample_id, quantity) VALUES ($1, $2, $3)',
                values: [receiptId, sample_id, quantity],
            };
            await pool.query(insertReceiptItemsQuery);
            console.log("Receipt item inserted for productBarcode:", productBarcode);
        }

        // Commit the transaction
        console.log("Committing transaction...");
        await pool.query('COMMIT');
        console.log("Transaction committed.");

        // Respond with success message
        res.status(201).json({ message: 'Receipt created successfully', receiptId });
    } catch (error) {
        // Rollback the transaction in case of error
        console.error("Error creating receipt:", error);
        console.log("Rolling back transaction...");
        await pool.query('ROLLBACK');
        console.log("Transaction rolled back.");

        // Respond with error message
        res.status(500).json({ error: 'Internal server error' });
    }
});

//_________ fetching receipts
// Fetch all receipts
router.get('/receipts', authenticateUser, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM receipts');
      res.json({ receipts: result.rows });
    } catch (error) {
      console.error('Error fetching receipts:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Fetch all receipts
router.get('/receipts/all', authenticateUser, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM receipts');
      res.json({ receipts: result.rows });
    } catch (error) {
      console.error('Error fetching receipts:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Fetch receipts by status
  router.get('/receipts/status/:status', authenticateUser, async (req, res) => {
    const { status } = req.params;
    try {
      const result = await pool.query('SELECT * FROM receipts WHERE status = $1', [status]);
      res.json({ receipts: result.rows });
    } catch (error) {
      console.error(`Error fetching ${status} receipts:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Fetch receipt details and items
  router.get('/receipts/:receiptId/items', authenticateUser, async (req, res) => {
    const { receiptId } = req.params;
    try {
      const receiptResult = await pool.query('SELECT * FROM receipts WHERE receipt_id = $1', [receiptId]);
      const itemsResult = await pool.query('SELECT * FROM receipt_items WHERE receipt_id = $1', [receiptId]);
  
      if (receiptResult.rows.length === 0) {
        return res.status(404).json({ error: 'Receipt not found' });
      }
      const { receipt_status } = receiptResult.rows[0];

      res.json({
      receipt: receiptResult.rows[0],
      status: receipt_status,
      items: itemsResult.rows
      });
    } catch (error) {
      console.error('Error fetching receipt details:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });


// final step

router.put('/receipts/:receiptId/validate', authenticateUser, async (req, res) => {
    const { receiptId } = req.params;
  
    try {
      // Update receipt status to validated
      await pool.query('UPDATE receipts SET status = $1 WHERE receipt_id = $2', ['validated', receiptId]);
  
      res.status(200).json({ message: 'Receipt validated successfully' });
    } catch (error) {
      console.error('Error validating receipt:', error);
      res.status(500).json({ error: 'Failed to validate receipt' });
    }
  });

  router.post('/unstockReceiptItems', async (req, res) => {
    const receiptItems = req.body.receiptItems;
  
    try {
      for (const item of receiptItems) {
        const { sample_id, quantity } = item;
  
        // Query to retrieve current quantity in the locker for the specific product
        const sequenceQuery = {
          text: `SELECT quantity_in_this_locker
                 FROM StorageTransactions
                 WHERE sample_id = $1`,
          values: [sample_id],
        };
  
        const sequenceResult = await pool.query(sequenceQuery);
  
        if (sequenceResult.rows.length === 0) {
          return res.status(404).json({ error: `Product with sample_id ${sample_id} not found in storage` });
        }
  
        const currentQuantityInLocker = sequenceResult.rows[0].quantity_in_this_locker;
  
        if (currentQuantityInLocker < quantity) {
          return res.status(400).json({ error: `Insufficient quantity in storage for product with sample_id ${sample_id}` });
        }
  
        // Calculate quantity to deduct from the current sequence
        const quantityToDeduct = Math.min(quantity, currentQuantityInLocker);
  
        // Update quantity in locker
        const updateQuery = {
          text: `UPDATE StorageTransactions 
                 SET quantity_in_this_locker = quantity_in_this_locker - $1,
                 total_quantity = total_quantity - $1
                 WHERE sample_id = $2`,
          values: [quantityToDeduct, sample_id],
        };
  
        await pool.query(updateQuery);
      }
  
      res.status(200).json({ message: 'Products unstocked successfully' });
    } catch (error) {
      console.error('Error unstocking products:', error);
      res.status(500).json({ error: 'Failed to unstock products' });
    }
  });
  //_____________
  router.post('/stockReceiptItems', authenticateUser, async (req, res) => {
    const receiptItems = req.body.receiptItems;
  
    try {
      for (const item of receiptItems) {
        const { sample_id, quantity } = item;
  
        // Query to add quantity back to the storage transactions
        const updateQuery = {
          text: `UPDATE StorageTransactions 
                 SET quantity_in_this_locker = quantity_in_this_locker + $1,
                 total_quantity = total_quantity + $1
                 WHERE sample_id = $2`,
          values: [quantity, sample_id],
        };
  
        await pool.query(updateQuery);
      }
  
      res.status(200).json({ message: 'Products stocked back successfully' });
    } catch (error) {
      console.error('Error stocking products:', error);
      res.status(500).json({ error: 'Failed to stock products' });
    }
  });

  router.put('/receipts/:receiptId/cancel', authenticateUser, async (req, res) => {
    const { receiptId } = req.params;
  
    try {
      // Update receipt status to canceled
      await pool.query('UPDATE receipts SET status = $1 WHERE receipt_id = $2', ['returned', receiptId]);
  
      res.status(200).json({ message: 'Receipt canceled successfully' });
    } catch (error) {
      console.error('Error canceling receipt:', error);
      res.status(500).json({ error: 'Failed to cancel receipt' });
    }
  });

module.exports = { router, authenticateUser, authorizeAdmin }; 
