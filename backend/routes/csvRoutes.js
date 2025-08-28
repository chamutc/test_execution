const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csvParser = require('csv-parser');
const DataService = require('../services/dataService');
const CsvProcessor = require('../services/csvProcessor');

const router = express.Router();
const dataService = new DataService();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    cb(null, `${timestamp}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Upload and process CSV file
router.post('/upload', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const csvProcessor = new CsvProcessor(req.socketService);
    const result = await csvProcessor.processFile(req.file.path);

    if (result.success) {
      // Save processed sessions
      dataService.saveSessions(result.sessions);
      
      // Update hardware inventory
      if (result.hardware) {
        const existingHardware = dataService.getHardware();
        const updatedHardware = csvProcessor.mergeHardware(existingHardware, result.hardware);
        dataService.saveHardware(updatedHardware);
      }

      // Emit updates to connected clients
      req.socketService.emitSessionUpdate(result.sessions);
      if (result.hardware) {
        req.socketService.emitHardwareUpdate(dataService.getHardware());
      }

      res.json({
        success: true,
        message: 'CSV processed successfully',
        summary: result.summary,
        sessions: result.sessions
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        details: result.details
      });
    }

    // Clean up uploaded file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting uploaded file:', err);
    });

  } catch (error) {
    console.error('CSV upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting uploaded file:', err);
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to process CSV file',
      details: error.message
    });
  }
});

// Get current sessions
router.get('/sessions', (req, res) => {
  try {
    const sessions = dataService.getSessions();
    res.json({ success: true, sessions });
  } catch (error) {
    console.error('Error getting sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to get sessions' });
  }
});

// Clear all sessions
router.delete('/sessions', (req, res) => {
  try {
    dataService.saveSessions([]);
    req.socketService.emitSessionUpdate([]);
    res.json({ success: true, message: 'All sessions cleared' });
  } catch (error) {
    console.error('Error clearing sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to clear sessions' });
  }
});

// Get CSV processing status
router.get('/status', (req, res) => {
  try {
    const sessions = dataService.getSessions();
    const summary = {
      totalSessions: sessions.length,
      pendingSessions: sessions.filter(s => s.status === 'pending').length,
      completedSessions: sessions.filter(s => s.status === 'completed').length,
      hardwareRequired: sessions.filter(s => s.requiresHardware).length
    };
    
    res.json({ success: true, summary });
  } catch (error) {
    console.error('Error getting CSV status:', error);
    res.status(500).json({ success: false, error: 'Failed to get status' });
  }
});

// Validate CSV format without processing
router.post('/validate', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const csvProcessor = new CsvProcessor();

    // Use detailed validation
    const validation = await csvProcessor.validateFileDetailed(req.file.path);

    // Clean up uploaded file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting uploaded file:', err);
    });

    res.json({
      success: validation.success,
      data: validation
    });

  } catch (error) {
    console.error('CSV validation error:', error);

    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting uploaded file:', err);
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to validate CSV file',
      details: error.message
    });
  }
});

// Download CSV template
router.get('/template/:type', (req, res) => {
  try {
    const { type } = req.params;

    if (type !== 'sessions') {
      return res.status(400).json({
        success: false,
        error: 'Invalid template type'
      });
    }

    // Generate CSV template
    const headers = [
      'Session',
      'Platform',
      'Debugger',
      'Mode',
      'OS',
      'Priority',
      'Num of normal test case',
      'Num of combo test case',
      'Status'
    ];

    const sampleData = [
      [
        'Test Session 1',
        'Platform_A',
        'S32_DBG',
        'NA',
        'Ubuntu 24.04',
        'high',
        '0/5/10',
        '0/0/1',
        'pending'
      ],
      [
        'Test Session 2',
        'Platform_B',
        'Segger',
        'NA',
        'Windows 11',
        'normal',
        '2/3/5',
        '0/1/0',
        'pending'
      ],
      [
        'Test Session 3',
        '',
        '',
        'NA',
        'Ubuntu 24.04',
        'urgent',
        '0/0/15',
        '0/0/2',
        'pending'
      ]
    ];

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="sessions_template.csv"');
    res.send(csvContent);

  } catch (error) {
    console.error('Template download error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate template',
      details: error.message
    });
  }
});

module.exports = router;
