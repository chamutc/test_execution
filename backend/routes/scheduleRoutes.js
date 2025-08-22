const express = require('express');
const DataService = require('../services/dataService');
const SchedulingService = require('../services/schedulingService');

const router = express.Router();
const dataService = new DataService();

// Get current schedule
router.get('/', (req, res) => {
  try {
    const schedule = dataService.getSchedule();
    res.json({ success: true, schedule });
  } catch (error) {
    console.error('Error getting schedule:', error);
    res.status(500).json({ success: false, error: 'Failed to get schedule' });
  }
});

// Auto-schedule all pending sessions
router.post('/auto', async (req, res) => {
  try {
    const { viewType, prioritizeView } = req.body;

    const sessions = dataService.getSessions();
    const hardware = dataService.getHardware();
    const machines = dataService.getMachines();
    const currentSchedule = dataService.getSchedule();

    const schedulingService = new SchedulingService(dataService, req.socketService);
    const result = await schedulingService.autoSchedule(sessions, hardware, machines, currentSchedule, {
      viewType,
      prioritizeView
    });

    if (result.success) {
      // Save updated schedule
      dataService.saveSchedule(result.schedule);
      
      // Save updated sessions with scheduling status
      dataService.saveSessions(result.sessions);
      
      // Save queue if any sessions are waiting
      if (result.queue && result.queue.length > 0) {
        dataService.saveQueue(result.queue);
      }

      // Emit updates to connected clients
      req.socketService.emitScheduleUpdate(result.schedule);
      req.socketService.emitSessionUpdate(result.sessions);
      if (result.queue && result.queue.length > 0) {
        req.socketService.emitQueueUpdate(result.queue);
      }

      res.json({
        success: true,
        message: 'Auto-scheduling completed',
        summary: result.summary,
        schedule: result.schedule,
        queue: result.queue || []
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        details: result.details
      });
    }

  } catch (error) {
    console.error('Error during auto-scheduling:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to auto-schedule sessions',
      details: error.message
    });
  }
});

// Clear entire schedule
router.delete('/', (req, res) => {
  try {
    const emptySchedule = {
      timeSlots: [],
      assignments: []
    };
    
    dataService.saveSchedule(emptySchedule);
    dataService.saveQueue([]);

    // Reset session statuses to pending
    const sessions = dataService.getSessions();
    const updatedSessions = sessions.map(session => ({
      ...session,
      status: session.status === 'completed' ? 'completed' : 'pending',
      scheduledTime: null,
      assignedMachine: null,
      assignedHardware: null
    }));
    
    dataService.saveSessions(updatedSessions);

    // Reset machine statuses
    const machines = dataService.getMachines();
    const updatedMachines = machines.map(machine => ({
      ...machine,
      status: 'available',
      currentSession: null
    }));
    
    dataService.saveMachines(updatedMachines);

    // Reset hardware availability
    const hardware = dataService.getHardware();
    const updatedHardware = {
      debuggers: hardware.debuggers.map(item => ({
        ...item,
        available: item.quantity
      })),
      platforms: hardware.platforms.map(item => ({
        ...item,
        available: item.quantity
      }))
    };
    
    dataService.saveHardware(updatedHardware);

    // Emit updates to connected clients
    req.socketService.emitScheduleUpdate(emptySchedule);
    req.socketService.emitSessionUpdate(updatedSessions);
    req.socketService.emitMachineUpdate(updatedMachines);
    req.socketService.emitHardwareUpdate(updatedHardware);
    req.socketService.emitQueueUpdate([]);

    res.json({ 
      success: true, 
      message: 'Schedule cleared successfully' 
    });

  } catch (error) {
    console.error('Error clearing schedule:', error);
    res.status(500).json({ success: false, error: 'Failed to clear schedule' });
  }
});

// Get scheduling conflicts
router.get('/conflicts', (req, res) => {
  try {
    const sessions = dataService.getSessions();
    const hardware = dataService.getHardware();
    const machines = dataService.getMachines();
    const schedule = dataService.getSchedule();

    const schedulingService = new SchedulingService(dataService);
    const conflicts = schedulingService.detectConflicts(sessions, hardware, machines, schedule);

    res.json({ success: true, conflicts });

  } catch (error) {
    console.error('Error detecting conflicts:', error);
    res.status(500).json({ success: false, error: 'Failed to detect conflicts' });
  }
});

// Get queue status
router.get('/queue', (req, res) => {
  try {
    const queue = dataService.getQueue();
    res.json({ success: true, queue });
  } catch (error) {
    console.error('Error getting queue:', error);
    res.status(500).json({ success: false, error: 'Failed to get queue' });
  }
});

// Manual session scheduling
router.post('/manual', (req, res) => {
  try {
    const { sessionId, timeSlot, machineId, hardwareAssignment } = req.body;

    if (!sessionId || !timeSlot || !machineId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Session ID, time slot, and machine ID are required' 
      });
    }

    const sessions = dataService.getSessions();
    const machines = dataService.getMachines();
    const hardware = dataService.getHardware();
    const schedule = dataService.getSchedule();

    const schedulingService = new SchedulingService(dataService, req.socketService);
    const result = schedulingService.scheduleSession(
      sessionId, timeSlot, machineId, hardwareAssignment, 
      sessions, machines, hardware, schedule
    );

    if (result.success) {
      // Save updated data
      dataService.saveSessions(result.sessions);
      dataService.saveMachines(result.machines);
      dataService.saveHardware(result.hardware);
      dataService.saveSchedule(result.schedule);

      // Emit updates to connected clients
      req.socketService.emitSessionUpdate(result.sessions);
      req.socketService.emitMachineUpdate(result.machines);
      req.socketService.emitHardwareUpdate(result.hardware);
      req.socketService.emitScheduleUpdate(result.schedule);

      res.json({
        success: true,
        message: 'Session scheduled successfully',
        schedule: result.schedule
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Error during manual scheduling:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to schedule session manually',
      details: error.message
    });
  }
});

// Get scheduling statistics
router.get('/stats', (req, res) => {
  try {
    const sessions = dataService.getSessions();
    const schedule = dataService.getSchedule();
    const queue = dataService.getQueue();

    const stats = {
      totalSessions: sessions.length,
      scheduledSessions: sessions.filter(s => s.status === 'scheduled').length,
      pendingSessions: sessions.filter(s => s.status === 'pending').length,
      queuedSessions: queue.length,
      totalTimeSlots: schedule.timeSlots.length,
      occupiedTimeSlots: schedule.assignments.length,
      utilizationRate: schedule.timeSlots.length > 0 
        ? ((schedule.assignments.length / schedule.timeSlots.length) * 100).toFixed(1)
        : '0.0'
    };

    res.json({ success: true, stats });

  } catch (error) {
    console.error('Error getting scheduling stats:', error);
    res.status(500).json({ success: false, error: 'Failed to get scheduling stats' });
  }
});

// Enhanced Auto-Schedule Endpoint
router.post('/enhanced-auto', async (req, res) => {
  try {
    const { sessions, machines, hardware, currentSchedule, options } = req.body;

    console.log(`Starting enhanced auto-schedule: ${options.type} mode`);
    console.log(`Sessions to schedule: ${sessions.length}`);
    console.log(`Start time: ${options.startDateTime}`);

    if (options.type === 'limited') {
      console.log(`Expected hours: ${options.expectedHours}`);
    }

    // Use enhanced scheduling service
    const schedulingService = new SchedulingService(req.dataService, req.socketService);
    const result = await schedulingService.enhancedAutoSchedule(
      sessions,
      hardware,
      machines,
      currentSchedule,
      options
    );

    if (result.success) {
      // Save the updated schedule
      req.dataService.saveSchedule(result.schedule);

      // Save updated sessions
      if (result.sessions) {
        req.dataService.saveSessions(result.sessions);
      }

      res.json({
        success: true,
        schedule: result.schedule,
        scheduledSessions: result.scheduledSessions,
        message: result.message,
        statistics: result.statistics
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Enhanced auto-schedule error:', error);
    res.status(500).json({
      success: false,
      error: 'Enhanced auto-scheduling failed'
    });
  }
});

module.exports = router;
