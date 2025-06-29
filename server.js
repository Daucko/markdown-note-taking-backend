require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const corsOptions = require('./config/corsOptions');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cookieParser = require('cookie-parser');

// const routes = require('./routes/index');

const authRoutes = require('./routes/auth');
const noteRoutes = require('./routes/note');
const folderRoutes = require('./routes/folder');
const tagRoutes = require('./routes/tag');

const app = express();
const PORT = process.env.PORT || 5000;
const connectDB = require('./config/dbConn');

// Security middleware
app.use(helmet());
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowsMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowsMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Search-specific rate limiting (more restrictive)
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // linit each IP to 20 search requests per minures
  message: 'Too many search requests, please try again later.',
});
app.use('/api/search', searchLimiter);

// Compression and parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// middleware for cookies
app.use(cookieParser());

// routes
app.get('/', (req, res) => {
  res
    .status(200)
    .json({ message: '✅ Welcome to the Markdown Note-Taking API' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/tags', tagRoutes);
// app.use('/api/search', searchRoutes);

// Health check endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 404 handler
// app.all('*', (req, res) => {
//   res.status(400).json({ message: 'Route not found' });
// });

// MongoDB connection
connectDB();
mongoose.connection.once('open', () => {
  console.log('Connected to MongoDB');
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
});
