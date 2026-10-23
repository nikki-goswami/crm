const jwt = require('jsonwebtoken');
const User = require('../models/User');

const sign = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone });

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Email ya password galat hai' });
    }
    if (!user.isActive) return res.status(403).json({ message: 'Aapka account block hai' });
    res.json({ token: sign(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
};

exports.me = (req, res) => res.json({ user: publicUser(req.user) });
