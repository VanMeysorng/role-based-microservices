const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./db');
const User = require('./models/User');

dotenv.config();
connectDB();
const app = express();
app.use(express.json());

// Search user
const searchHandler = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ success: false, message: 'Search query parameter is required' });
    const user = await User.findOne({
      $or: [{ email: { $regex: query,$options: 'i' } }, { name: { $regex: query,$options: 'i' } }]
    }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
app.get('/admin/searchuser', searchHandler);
app.get('/searchuser', searchHandler);

// View all users
const viewAllHandler = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    return res.status(200).json({ success: true, total: users.length, data: users });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
app.get('/admin/viewalluser', viewAllHandler);
app.get('/viewalluser', viewAllHandler);

// Delete user
const deleteHandler = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, message: 'Email query parameter is required' });
    const deletedUser = await User.findOneAndDelete({ email });
    if (!deletedUser) return res.status(404).json({ success: false, message: 'User not found to delete' });
    return res.status(200).json({ success: true, message: `User ${email} deleted successfully` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
app.delete('/admin/deluser', deleteHandler);
app.delete('/deluser', deleteHandler);

const PORT = process.env.PORT || 5003;
app.listen(PORT, () => console.log(`Admin Service running on port ${PORT}`));
