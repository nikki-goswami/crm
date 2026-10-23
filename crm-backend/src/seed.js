// Pehla admin banane ke liye: npm run seed
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const email = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();

    if (await User.findOne({ email })) {
      console.log('Admin already hai:', email);
    } else {
      await User.create({
        name: process.env.ADMIN_NAME || 'Admin',
        email,
        password: process.env.ADMIN_PASSWORD || 'Admin@123',
        role: 'admin',
      });
      console.log('Admin ban gaya:', email);
    }
  } catch (err) {
    console.error(err.message);
  } finally {
    await mongoose.disconnect();
  }
})();
