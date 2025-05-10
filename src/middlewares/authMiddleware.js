// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  let token;

  // Request header එකේ 'Authorization' එකේ 'Bearer <token>' විදිහට token එක එනවද බලනවා
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 'Bearer ' කෑල්ල අයින් කරලා token එක විතරක් ගන්නවා
      token = req.headers.authorization.split(' ')[1];

      // Token එක verify කරනවා (.env එකේ තියෙන JWT_SECRET එකෙන්)
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Verify වුණොත්, token එකේ payload එකේ තියෙන user details ටික (අපි login වෙද්දී දාපු userId, username, role)
      // request object එකට (`req.user`) එකතු කරලා ඊළඟ middleware එකට/controller එකට යවනවා (`next()`)
      // (අපි user ගේ password hash එක token එකට දැම්මේ නැති නිසා ඒක මෙතනට එන්නේ නැහැ)
      req.user = {
        id: decoded.userId,
        username: decoded.username,
        role: decoded.role
      };
      next();

    } catch (error) {
      console.error('Token verification failed:', error);
      res.status(401).json({ message: 'Not authorized, token failed' }); // 401 Unauthorized
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Admin role එක තියෙන අයට විතරක් access දෙන්න middleware එකක් (උදාහරණයක්)
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an Admin' }); // 403 Forbidden
    }
};

// Data Entry role එක තියෙන අයට විතරක් access දෙන්න middleware එකක් (උදාහරණයක්)
const isDataEntry = (req, res, next) => {
    if (req.user && (req.user.role === 'DATA_ENTRY' || req.user.role === 'ADMIN')) { // Admin ටත් data entry කරන්න පුළුවන් නම්
        next();
    } else {
        res.status(403).json({ message: 'Not authorized for data entry' });
    }
};


module.exports = { protect, isAdmin, isDataEntry }; // Middleware ටික export කරනවා