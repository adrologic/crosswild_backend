require('dotenv').config({ override: false });

// Fail fast if the JWT secret is missing — auth cannot work without it
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Refusing to start.');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const mongoose = require('mongoose');
const connectDB = require('./config/database');

// Initialize express app
const app = express();

// In production the app sits behind Coolify's Traefik proxy. Trust exactly one
// hop so req.ip and express-rate-limit see the real client IP — without this
// every request looks like it came from the proxy, and the per-IP limiter on the
// public submit endpoints would throttle all visitors as if they were one.
app.set('trust proxy', 1);

// Connect to MongoDB
connectDB();

// Middleware
// CORS MUST be first — before helmet, before anything else
const ALLOWED_ORIGINS = [
  'https://thecrosswild.com',
  'https://www.thecrosswild.com',
  'https://the-cross-wild-admin.vercel.app',
  // Extra origins for a new host or domain, comma-separated in CORS_ORIGIN.
  // Additive only — the three above are always allowed.
  ...(process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman)
    if (!origin) return callback(null, true);
    // Allow any localhost port in development only
    if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
    // Allow specific production domains
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
// 'combined' in production so the Coolify logs carry status, size, referrer and
// the real client IP (see trust proxy above); 'dev' stays terse locally.
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/product-types', require('./routes/productTypes'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/blogs', require('./routes/blogs'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/seo', require('./routes/seo'));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/content', require('./routes/pageContent'));

// CMS — site-wide & marketing content
app.use('/api/site-settings', require('./routes/siteSettings'));
app.use('/api/testimonials', require('./routes/testimonials'));
app.use('/api/brands', require('./routes/brands'));
app.use('/api/deals', require('./routes/deals'));
app.use('/api/menus', require('./routes/menus'));
app.use('/api/policy-pages', require('./routes/policyPages'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/service-cards', require('./routes/serviceCards'));
app.use('/api/why-choose-reasons', require('./routes/whyChooseReasons'));
app.use('/api/home-capabilities', require('./routes/homeCapabilities'));
app.use('/api/home-product-highlights', require('./routes/homeProductHighlights'));
app.use('/api/home-why-choose', require('./routes/homeWhyChoose'));
app.use('/api/process-steps', require('./routes/processSteps'));
app.use('/api/category-home-cards', require('./routes/categoryHomeCards'));
app.use('/api/size-charts', require('./routes/sizeCharts'));

// Public submissions
app.use('/api/subscribers', require('./routes/subscribers'));
app.use('/api/contact-submissions', require('./routes/contactSubmissions'));
app.use('/api/quote-submissions', require('./routes/quoteSubmissions'));

// Health check route — Coolify polls this to decide whether a deploy succeeded.
// It always answers 200 as long as the process is up: a transient Mongo blip
// should show in `database` for diagnosis, not kill the container and start a
// restart loop that also takes down the routes that don't need the DB.
const MONGO_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    database: MONGO_STATES[mongoose.connection.readyState] || 'unknown',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'The CrossWild API Server',
    version: '1.0.0',
    endpoints: {
      products: '/api/products',
      productTypes: '/api/product-types',
      blogs: '/api/blogs',
      orders: '/api/orders',
      upload: '/api/upload',
      seo: '/api/seo',
      health: '/api/health',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server
const PORT = process.env.PORT || 5000;
// Bind all interfaces explicitly — inside a container, Traefik reaches the app
// on the container's own IP, not on loopback.
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server is running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 API URL: http://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health\n`);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
  // Force exit after 10 seconds
  setTimeout(() => {
    console.log('Forcing shutdown...');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections — log but keep the server running
process.on('unhandledRejection', (err) => {
  console.error(`❌ Unhandled promise rejection: ${err.message}`);
  console.error(err.stack);
});
