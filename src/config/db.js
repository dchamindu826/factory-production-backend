// src/config/db.js
const { Pool } = require('pg'); // pg library එකෙන් Pool කියන class එක import කරගන්නවා

// .env file එකේ තියෙන database connection details පාවිච්චි කරනවා
// process.env හරහා .env file එකේ variables access කරන්න නම්,
// app.js එකේ උඩින්ම require('dotenv').config(); දාලා තියෙන්න ඕන.
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"), // Port එක number එකක් වෙන්න ඕන
});

// Database එකට query එකක් යවන්න function එකක් export කරනවා
// මේකෙන් connection pooling handle වෙනවා, ඒ කියන්නේ performance එකට හොඳයි
module.exports = {
  query: (text, params) => pool.query(text, params),
  // Test connection function (optional, for initial setup)
  testConnection: async () => {
    try {
      const client = await pool.connect();
      console.log('Database connected successfully via pg Pool!');
      const res = await client.query('SELECT NOW()');
      console.log('Current time from DB:', res.rows[0].now);
      client.release(); // Release the client back to the pool
      return true;
    } catch (err) {
      console.error('Database connection error:', err.stack);
      return false;
    }
  }
};