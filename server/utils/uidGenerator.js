const crypto = require('crypto');

/**
 * Generate a cryptographically secure 10-digit UID
 * @returns {string} 10-digit numeric string
 */
function generate10Digit() {
  const min = 1_000_000_000;
  const max = 9_999_999_999;
  
  // Use crypto.randomBytes for secure randomness
  const randomBytes = crypto.randomBytes(6);
  const randomValue = randomBytes.readUIntBE(0, 6);
  const normalizedRandom = randomValue / Math.pow(2, 48);
  const uid = Math.floor(normalizedRandom * (max - min + 1)) + min;
  
  return String(uid);
}

/**
 * Generate a unique UID by checking database uniqueness
 * @param {Object} db - Database connection pool
 * @param {number} maxAttempts - Maximum retry attempts
 * @returns {Promise<string>} Unique 10-digit UID
 */
async function generateUniqueUID(db, maxAttempts = 5) {
  for (let i = 0; i < maxAttempts; i++) {
    const uid = generate10Digit();
    
    try {
      // Check if UID already exists
      const result = await db.query('SELECT uid FROM users WHERE uid = $1', [uid]);
      
      if (result.rows.length === 0) {
        return uid; // UID is unique
      }
      
      // UID exists, try again
      console.log(`UID collision detected: ${uid}, retrying...`);
    } catch (error) {
      console.error('Error checking UID uniqueness:', error);
      throw error;
    }
  }
  
  throw new Error('Could not generate unique UID after maximum attempts');
}

module.exports = {
  generate10Digit,
  generateUniqueUID
};