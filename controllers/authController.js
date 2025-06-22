const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../config/sendMail');

const handleRegistration = async (req, res) => {
  const { username, email, password } = req.body;

  // Check if there's email & password in the req.body
  if (!username || !email || !password)
    return res.status(400).json({ message: 'Email and password are required' });

  // check for duplicate email in the DB
  const duplicate = await User.findOne({ email }).exec();
  if (duplicate)
    return res
      .status(409)
      .json({ message: 'User with this email already exist' });
  try {
    // Encrypt the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and store the new user
    const user = await User.create({
      username,
      email: email,
      password: hashedPassword,
    });

    // Send a welcome greeting to the user with verification email
    const verificationToken = jwt.sign(
      { userId: user?._id },
      process.env.ACCESS_TOKEN,
      { expiresIn: '1h' }
    );
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const verificationLink = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;
    const subject = 'Welcome to the Markdown Note-Taking';
    const message = `
      <h1>Hi User,<br><br>
      Welcome to NoteIt! We're excited to have you on board.<br><br>
      Please verify your email by clicking the link below:<br>
      <a href="${verificationLink}">Verify Email</a><br><br>
      Or copy and paste this link into your browser:<br>
      ${verificationLink}<br><br>
      Happy jotting!<br>
      The NoteIt Team</h1>
    `;

    await sendEmail(email, message, subject);

    res.status(201).json({
      message: `New user ${username} created successfully. Please check your mail for verification link.`,
      user: {
        username: username,
        email: email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to register user' });
  }
};

const handleLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if there's email & password in the req.body
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
      });
    }

    // Check for existing user - need to include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials',
      });
    }

    // Compare the password with the hashed password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({
        message: 'Invalid credentials',
      });
    }

    // Create JWTs
    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.ACCESS_TOKEN, // Changed to more conventional name
      { expiresIn: '5m' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id }, // Consistent naming with accessToken
      process.env.REFRESH_TOKEN,
      { expiresIn: '7d' }
    );

    // Store the refresh token in the database
    user.refreshToken = refreshToken;
    await user.save();

    // Send the refreshToken in cookie
    res.cookie('jwt', refreshToken, {
      httpOnly: true,
      sameSite: 'None',
      // secure: true, // Should be true in production
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days to match token expiry
    });

    // Exclude password and refreshToken from the response
    const userWithoutSensitiveData = user.toObject();
    delete userWithoutSensitiveData.password;
    delete userWithoutSensitiveData.refreshToken;
    delete userWithoutSensitiveData.__v;
    delete userWithoutSensitiveData._isVerified;

    res.json({
      accessToken,
      user: userWithoutSensitiveData,
    });
  } catch (err) {
    console.error('Login error:', err); // Log the error for debugging
    res.status(500).json({ message: 'Internal server error' });
  }
};

const handleVerifyEmail = async (req, res) => {
  const token = req.query.token;
  if (!token)
    return res.status(400).json({ message: 'Verification token is required.' });

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user._isVerified)
      return res.status(200).json({ message: 'Email already verified.' });
    user._isVerified = true;
    await user.save();
    return res.status(200).json({ message: 'Email verified successfully!' });
  } catch (err) {
    return res
      .status(500)
      .json({ message: 'Invalid or expired verification token.' });
  }
};

const handleProfileUpdate = async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = ['username', 'email', 'avatar', 'preferences'];
    const actualUpdates = {};

    // Filter allowed updates
    Object.keys(updates).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        actualUpdates[key] = updates[key];
      }
    });

    const user = await User.findByIdAndUpdate(req.user._id, actualUpdates, {
      new: true,
      runValidators: true,
    });

    // Exclude password and refreshToken from the response
    const userWithoutSensitiveData = user.toObject();
    delete userWithoutSensitiveData.password;
    delete userWithoutSensitiveData.refreshToken;
    delete userWithoutSensitiveData.__v;
    delete userWithoutSensitiveData._isVerified;

    res.json({ user: userWithoutSensitiveData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const handlePasswordChange = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch)
      return res.status(400).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  handleRegistration,
  handleLogin,
  handleVerifyEmail,
  handleProfileUpdate,
  handlePasswordChange,
};
