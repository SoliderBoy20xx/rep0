const crypto = require('crypto');

// Generate a random secret key
const generateSecretKey = () => {
    return crypto.randomBytes(32).toString('hex'); // Generates a 256-bit (32-byte) key
};

// Export the function to generate the secret key
module.exports = generateSecretKey;
