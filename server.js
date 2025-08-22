const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Import route modules
const csvRoutes = require('./backend/routes/csvRoutes');
const hardwareRoutes = require('./backend/routes/hardwareRoutes');
const machineRoutes = require('./backend/routes/machineRoutes');
const sessionsRoutes = require('./backend/routes/sessionsRoutes');
const scheduleRoutes = require('./backend/routes/scheduleRoutes');
const schedulingRoutes = require('./backend/routes/schedulingRoutes');

// Import services
const SocketService = require('./backend/services/socketService');
const DataService = require('./backend/services/dataService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Ensure data directories exist
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize services
const dataService = new DataService();
const socketService = new SocketService(io);

// Make services available to routes
app.use((req, res, next) => {
  req.dataService = dataService;
  req.socketService = socketService;
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes
app.use('/api/csv', csvRoutes);
app.use('/api/hardware', hardwareRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/scheduling', schedulingRoutes);
app.use('/api/sessions', sessionsRoutes);

// Serve main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

server.listen(PORT, () => {
  console.log(`Jenkins Test Scheduler running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to view the application`);
});

module.exports = { app, server, io };
