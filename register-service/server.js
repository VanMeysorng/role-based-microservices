const express = require('express');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const connectDB = require('./db');
const User = require('./models/User');

dotenv.config();
connectDB();
const app = express();
app.use(express.json());

const registerHandler = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role && ['admin', 'user'].includes(role) ? role : 'user',
      phone
    });
    const savedUser = await newUser.save();
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { id: savedUser._id, name: savedUser.name, email: savedUser.email, role: savedUser.role, phone: savedUser.phone }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

app.post('/register/userregister', registerHandler);
app.post('/userregister', registerHandler);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Registration Service running on port ${PORT}`));
