const fs = require('fs');
const path = require('path');
const pool = require('../database/connection');

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);
    
    console.log('✅ Database migrations completed successfully');
    
    // Test the setup by checking tables
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    console.log('📋 Created tables:', result.rows.map(row => row.table_name).join(', '));
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;