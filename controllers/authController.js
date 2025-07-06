const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../config/sendMail');
const redisClient = require('../config/redisClient');

const handleRegistration = async (req, res) => {
  const { username, email, password } = req.body;

  // Check if there's email & password in the req.body
  if (!username || !email || !password)
    return res.status(400).json({ message: 'All fields are required' });

  try {
    // Check for existing users (both verified and unverified)
    const [existingUser, existingUnverified] = await Promise.all([
      User.findOne({ email }),
      redisClient.get(`unverified:${email}`),
    ]);

    if (existingUser || existingUnverified)
      return res.status(400).json({ message: 'Email already in use' });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create verification token
    const verificationToken = jwt.sign(
      { email, username },
      process.env.ACCESS_TOKEN,
      { expiresIn: '1h' }
    );

    // Store in Redis with 1 hour expiration
    await redisClient.set(
      `unverified:${verificationToken}`,
      {
        username,
        email,
        password: hashedPassword,
        createdAt: new Date(),
      },
      3600 // 1 hour in seconds
    );

    // Also store by email for duplicate checking
    await redisClient.set(
      `unverified:${email}`,
      { verificationToken },
      3600 // 1 hour in seconds
    );

    // Send verification email
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const verificationLink = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;
    const emailSubject = 'Welcome to the Markdown Note-Taking';
    const emailMessage = `
     <h2>Welcome to our NoteIt!</h2>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${verificationLink}">Verify Email</a>
      <p>This link will expire in 1 hour.</p>
      <h3>The NoteIt Team</h3>
    `;

    await sendEmail(email, emailMessage, emailSubject);

    return res.status(201).json({
      message:
        'Registration pending - please check your email to verify your account.',
      user: { username, email },
    });
  } catch (err) {
    console.error | ('Registration error:', err);
    return res.status(500).json({ message: 'Registration failed' });
  }

  // // check for duplicate email in the DB
  // const duplicate = await User.findOne({ email });
  // if (duplicate)
  //   return res
  //     .status(409)
  //     .json({ message: 'User with this email already exist' });
  // try {
  //   // Encrypt the password

  //   // Create and store the new user
  //   const user = await User.create({
  //     username,
  //     email: email,
  //     password: hashedPassword,
  //   });

  //   // Send a welcome greeting to the user with verification email
  //   const verificationToken = jwt.sign(
  //     { userId: user?._id },
  //     process.env.ACCESS_TOKEN,
  //     { expiresIn: '1h' }
  //   );
  //   const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  //   const verificationLink = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;
  //   const subject = 'Welcome to the Markdown Note-Taking';
  //   const message = `
  //     <h1>Hi User,<br><br>
  //     Welcome to NoteIt! We're excited to have you on board.<br><br>
  //     Please verify your email by clicking the link below:<br>
  //     <a href="${verificationLink}">Verify Email</a><br><br>
  //     Or copy and paste this link into your browser:<br>
  //     ${verificationLink}<br><br>
  //     Happy jotting!<br>
  //     The NoteIt Team</h1>
  //   `;

  //   await sendEmail(email, message, subject);

  //   res.status(201).json({
  //     message: `New user ${username} created successfully. Please check your mail for verification link.`,
  //     user: {
  //       username: username,
  //       email: email,
  //     },
  //   });
  // } catch (err) {
  //   console.error(err);
  //   res.status(500).json({ message: 'Failed to register user' });
  // }
};

const cleanupUnverifiedUsers = async () => {
  try {
    console.log('Running cleanup of unverified users');
  } catch (err) {
    console.error('Cleanup:', err);
  }
};

// Run cleanup every hour
setInterval(cleanupUnverifiedUsers, 3600000);

const handleLogin = async (req, res) => {
  const { email, password } = req.body;

  // Check if there's email & password in the req.body
  if (!email || !password) {
    return res.status(400).json({
      message: 'Email and password are required',
    });
  }

  try {
    // Check for existing user - need to include password for comparison
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      // Check if user exists in unverified state
      const unverified = await redisClient.get(`unverified:${email}`);
      if (unverified)
        return res.status(403).json({
          message:
            'Email not verified. Please check your email for the verification link.',
        });
      return res.status(401).json({
        message: 'Invalid credentials',
      });
    }

    // Check if user is verified
    if (!user._isVerified)
      return res.status(403).json({
        message:
          'Account not verified. Please check your email for verification link.',
      });

    // Compare the password with the hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
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
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
};

const handleVerifyEmail = async (req, res) => {
  const token = req.query;
  if (!token)
    return res.status(400).json({ message: 'Verification token is required.' });

  try {
    // Verify JWT first
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN);

    // Get user data from redis
    const userData = await redisClient.get(`unverified:${token}`);
    if (!userData)
      return res
        .status(404)
        .json({ message: 'Invalid or expired verification token' });

    // Verify email matches
    if (decoded.email !== userData.email)
      return res.status(400).json({ message: 'Token email mismatch' });

    // Create the verified user
    const user = await User.create({
      username: userData.username,
      email: userData.email,
      password: userData.password,
      _isVerified: true,
    });

    // Clean yp Redis entries
    await Promise.all([
      redisClient.del(`unverified:${token}`),
      redisClient.del(`unverified:${userData.email}`),
    ]);

    // Optionally log the user in automatically here
    // by generating tokens and returning them

    return res.status(200).json({
      message: 'Email verified successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });

    // const user = await User.findById(decoded.userId);
    // if (!user) return res.status(404).json({ message: 'User not found.' });
    // if (user._isVerified)
    //   return res.status(200).json({ message: 'Email already verified.' });
    // user._isVerified = true;
    // await user.save();
    // return res.status(200).json({ message: 'Email verified successfully!' });
  } catch (err) {
    console.error('Verification error:', err);

    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ message: 'Verification link has expired' });

    return res.status(500).json({ message: 'Email verification failed' });
  }
};

const handleResendVerification = async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: 'Email is required' });
  if (verifiedUser)
    return res.status(400).json({ message: 'Email is already verified' });

  try {
    // Check if user is already verified
    const verifiedUser = await User.findOne({ email });
  } catch (err) {}
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

    user.password = await bcrypt.hash(newPassword, 12);
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
