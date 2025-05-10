// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // jsonwebtoken library එක require කරගන්නවා
const db = require('../config/db');

// User Registration Function (කලින් තිබ්බ විදිහටම)
exports.registerUser = async (req, res) => {
  // ... (registerUser function එකේ කෝඩ් එක මෙතන තියෙන්න ඕන) ...
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ message: 'Username, password, and role are required.' });
  }
  if (role !== 'ADMIN' && role !== 'DATA_ENTRY') {
    return res.status(400).json({ message: 'Invalid role. Role must be ADMIN or DATA_ENTRY.' });
  }

  try {
    const userExists = await db.query('SELECT * FROM users WHERE username = $1', [username]);

    if (userExists.rows.length > 0) {
      return res.status(409).json({ message: 'Username already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUserQuery = `
      INSERT INTO users (username, password_hash, role)
      VALUES ($1, $2, $3)
      RETURNING id, username, role, created_at;
    `;
    const values = [username, hashedPassword, role];
    const result = await db.query(newUserQuery, values);

    const newUser = result.rows[0];

    res.status(201).json({
      message: 'User registered successfully!',
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        createdAt: newUser.created_at,
      },
    });

  } catch (error) {
    console.error('Error during user registration:', error);
    res.status(500).json({ message: 'Server error during registration. Please try again later.' });
  }
};


// --- අලුතින් එකතු කරන User Login Function එක ---
exports.loginUser = async (req, res) => {
  const { username, password } = req.body;

  // Username සහ password තියෙනවද බලනවා
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    // Database එකේ username එකට අදාළ user ව හොයනවා
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    // User හම්බවුණේ නැත්නම් error එකක් යවනවා
    if (!user) {
      // Security එකට "Invalid credentials" කියන එක හොඳයි "User not found" කියනවට වඩා
      return res.status(401).json({ message: 'Invalid credentials.' }); // 401 Unauthorized
    }

    // User හම්බවුණොත්, request එකේ ආපු password එකයි, database එකේ තියෙන hash එකයි compare කරනවා
    const isMatch = await bcrypt.compare(password, user.password_hash);

    // Passwords match වෙන්නේ නැත්නම් error එකක් යවනවා
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' }); // 401 Unauthorized
    }

    // Passwords match වෙනවා නම්, JWT එකක් හදනවා
    const payload = {
      userId: user.id,        // User ගේ ID එක
      username: user.username,// User ගේ username එක
      role: user.role         // User ගේ role එක (ADMIN or DATA_ENTRY)
    };

    // JWT එක sign කරනවා (.env file එකේ තියෙන secret key එකෙන්)
    // Token එක පැය 1කින් expire වෙන විදිහට හදමු (expiresIn: '1h')
    // ඔයාට '1d' (දවසක්), '7d' (දවස් 7ක්) වගේ වෙනස් කරන්න පුළුවන්
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET, // .env file එකේ තියෙන secret key එක
      { expiresIn: '1h' }     // Token එකේ වලංගු කාලය
    );

    // සාර්ථකව login වුණාම, token එක response එකේ යවනවා
    res.status(200).json({
      message: 'Login successful!',
      token: token, // Frontend එකට යවන JWT token එක
      user: { // Frontend එකට user details ටිකත් යවමු (password hash එක නැතුව)
          id: user.id,
          username: user.username,
          role: user.role
      }
    });

  } catch (error) {
    console.error('Error during user login:', error);
    res.status(500).json({ message: 'Server error during login. Please try again later.' });
  }
};