//connect db

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'db0',
    password: 'pass',
    port: 5432,
});


pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Error connecting to the database:', err);
    } else {
        console.log('Connected to the database:', res.rows[0].now);
    }
});

// Function to retrieve user by username
const getUserByUsername = async (username) => {
    try {
        // SQL query to retrieve user by username
        const query = {
            text: 'SELECT * FROM Users WHERE username = $1',
            values: [username]
        };

        // Execute the query
        const result = await pool.query(query);

        // Return the user if found
        return result.rows[0];
    } catch (error) {
        console.error('Error retrieving user by username:', error);
        throw error;
    }
};

// Function to create a new user
const createUser = async (username, email, password, name) => {
    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10); // 10 is the number of salt rounds

        // Set default values for role and status
        const role = 'user';
        const status = 'not approved';

        // SQL query to insert a new user into the Users table
        const query = {
            text: 'INSERT INTO Users (username, email, password, name, role, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            values: [username, email, hashedPassword, name, role, status]
        };

        // Execute the query
        const result = await pool.query(query);

        // Return the newly created user
        return result.rows[0];
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
};
// Function to update the last_login_date for a user in the database
const updateLastLoginDate = async (userId) => {
    try {
        // Construct the SQL query to update the last_login_date
        const query = {
            text: 'UPDATE Users SET last_login_date = CURRENT_TIMESTAMP WHERE user_id = $1',
            values: [userId]
        };

        // Execute the query
        await pool.query(query);
    } catch (error) {
        console.error('Error updating last login date:', error);
        throw error;
    }
};

module.exports = { pool, getUserByUsername, createUser,  updateLastLoginDate };