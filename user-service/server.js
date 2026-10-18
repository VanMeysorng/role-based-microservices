const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./db');
const User = require('./models/User');

dotenv.config();
connectDB();
const app = express();
app.use(express.json());

const viewProfileHandler = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(400).json({ success: false, message: 'Missing user identification header' });
    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
app.get('/user/viewprofile', viewProfileHandler);
app.get('/viewprofile', viewProfileHandler);

const updateProfileHandler = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { name, phone } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'Missing user identification header' });
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { name, phone } },
      { new: true, runValidators: true }
    ).select('-password');
    if (!updatedUser) return res.status(404).json({ success: false, message: 'User not found' });
    return res.status(200).json({ success: true, message: 'Profile updated successfully', data: updatedUser });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
app.put('/user/updateprofile', updateProfileHandler);
app.put('/updateprofile', updateProfileHandler);

app.get('/', (req, res) => res.json({ success: true, service: 'User Service', port: Number(process.env.PORT || 5004) }));

const PORT = process.env.PORT || 5004;
app.listen(PORT, '0.0.0.0', () => console.log(`User Service running on port ${PORT}`));
