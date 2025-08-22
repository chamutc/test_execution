const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const SESSIONS_FILE = path.join(__dirname, '../../data/sessions.json');

// Helper function to read sessions
async function readSessions() {
  try {
    const data = await fs.readFile(SESSIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading sessions:', error);
    return [];
  }
}

// Helper function to write sessions
async function writeSessions(sessions) {
  try {
    await fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing sessions:', error);
    return false;
  }
}

// GET /api/sessions - Get all sessions
router.get('/', async (req, res) => {
  try {
    const sessions = await readSessions();
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// GET /api/sessions/:id - Get session by ID
router.get('/:id', async (req, res) => {
  try {
    const sessions = await readSessions();
    const session = sessions.find(s => s.id === req.params.id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// POST /api/sessions - Create new session
router.post('/', async (req, res) => {
  try {
    const sessions = await readSessions();
    const newSession = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: req.body.status || 'pending'
    };
    
    sessions.push(newSession);
    
    if (await writeSessions(sessions)) {
      // Emit socket event
      if (req.socketService) {
        req.socketService.emit('session:created', newSession);
      }
      res.status(201).json(newSession);
    } else {
      res.status(500).json({ error: 'Failed to create session' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// PUT /api/sessions/:id - Update session
router.put('/:id', async (req, res) => {
  try {
    const sessions = await readSessions();
    const sessionIndex = sessions.findIndex(s => s.id === req.params.id);
    
    if (sessionIndex === -1) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const updatedSession = {
      ...sessions[sessionIndex],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    sessions[sessionIndex] = updatedSession;
    
    if (await writeSessions(sessions)) {
      // Emit socket event
      if (req.socketService) {
        req.socketService.emit('session:updated', updatedSession);
      }
      res.json(updatedSession);
    } else {
      res.status(500).json({ error: 'Failed to update session' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// DELETE /api/sessions/:id - Delete session
router.delete('/:id', async (req, res) => {
  try {
    const sessions = await readSessions();
    const sessionIndex = sessions.findIndex(s => s.id === req.params.id);
    
    if (sessionIndex === -1) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const deletedSession = sessions[sessionIndex];
    sessions.splice(sessionIndex, 1);
    
    if (await writeSessions(sessions)) {
      // Emit socket event
      if (req.socketService) {
        req.socketService.emit('session:deleted', { id: req.params.id });
      }
      res.json({ message: 'Session deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete session' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// GET /api/sessions/status/:status - Get sessions by status
router.get('/status/:status', async (req, res) => {
  try {
    const sessions = await readSessions();
    const filteredSessions = sessions.filter(s => s.status === req.params.status);
    res.json(filteredSessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions by status' });
  }
});

// GET /api/sessions/priority/:priority - Get sessions by priority
router.get('/priority/:priority', async (req, res) => {
  try {
    const sessions = await readSessions();
    const filteredSessions = sessions.filter(s => s.priority === req.params.priority);
    res.json(filteredSessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions by priority' });
  }
});

module.exports = router;
