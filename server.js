const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { router: authRoutes } = require('./routes/authRoutes'); // Use the `router` object from the import
const { router: userRoutes } = require('./routes/userRoutes'); // Use the `router` object from the import


const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';  // Listen on all available network interfaces
// Middleware to parse JSON request bodies
app.use(express.json());

// Logging middleware to track incoming requests
app.use((req, res, next) => {
    console.log(`Received ${req.method} request at ${req.url}`);
    next(); // Call next middleware or route handler
});



// Use the authRoutes middleware
app.use('/auth', authRoutes);

// Use the userRoutes middleware
app.use('/users', userRoutes);

// Define a default route
app.get('/', (req, res) => {
    res.send('Hello, world!');
});

// Start the server
app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
});

