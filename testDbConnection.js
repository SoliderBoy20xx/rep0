const { pool } = require('./db');

// Attempt to connect to the database
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Error connecting to the database:', err);
    } else {
        console.log('Connected to the database:', res.rows[0].now);
    }

    // Close the database connection
    pool.end();
});
