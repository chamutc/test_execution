const express = require('express');
const SchedulingEngine = require('../services/schedulingEngine');

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Scheduling routes working',
    dataService: req.dataService ? 'Available' : 'Not available',
    socketService: req.socketService ? 'Available' : 'Not available'
  });
});

/**
 * Auto-schedule sessions with intelligent algorithm
 * POST /api/scheduling/auto-schedule
 */
router.post('/auto-schedule', async (req, res) => {
  try {
    const {
      sessionIds = [], // Specific sessions to schedule, empty = all pending
      startDate = new Date().toISOString(),
      options = {}
    } = req.body;

    const dataService = req.dataService;
    const socketService = req.socketService;

    // Get all sessions or specific ones
    let sessionsToSchedule;
    if (sessionIds.length > 0) {
      sessionsToSchedule = sessionIds.map(id => dataService.getSessionById(id)).filter(Boolean);
    } else {
      // Get all pending sessions
      const allSessions = dataService.getAllSessions();
      sessionsToSchedule = allSessions.filter(session =>
        session.status === 'pending' || session.status === 'scheduled'
      );
    }

    if (sessionsToSchedule.length === 0) {
      return res.json({
        success: true,
        message: 'No sessions to schedule',
        result: {
          scheduled: [],
          queued: [],
          conflicts: [],
          summary: { totalSessions: 0, scheduled: 0, queued: 0, conflicts: 0 }
        }
      });
    }

    // Get available hardware, machines, and combinations
    const hardware = dataService.getAllHardware();
    const machines = dataService.getAllMachines();
    const combinations = dataService.getHardwareCombinations();

    // Normalize sessions (ensure requiredOS field is present)
    sessionsToSchedule = sessionsToSchedule.map(s => ({ ...s, requiredOS: s.requiredOS || s.os }));

    // Initialize scheduling engine
    const schedulingEngine = new SchedulingEngine();

    // Perform scheduling (pass combinations via options)
    const schedulingResult = await schedulingEngine.scheduleOptimal(
      sessionsToSchedule,
      hardware,
      machines,
      new Date(startDate),
      {
        timeSlotDuration: options.timeSlotDuration || 1,
        workingHours: options.workingHours || { start: 6, end: 18 },
        maxDays: options.maxDays || 7,
        combinations,
        ...options
      }
    );

    if (!schedulingResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Scheduling failed',
        details: schedulingResult.error
      });
    }

    // Update session statuses and save schedule
    const updatedSessions = [];

    // Update scheduled sessions
    schedulingResult.scheduled.forEach(scheduledSession => {
      const sessionUpdate = {
        ...scheduledSession,
        status: 'scheduled',
        scheduledAt: new Date().toISOString(),
        schedule: {
          slots: scheduledSession.scheduledSlots,
          assignedHardware: scheduledSession.assignedHardware,
          assignedMachine: scheduledSession.assignedMachine,
          scheduledBy: 'auto-scheduler'
        }
      };

      dataService.updateSession(scheduledSession.id, sessionUpdate);
      updatedSessions.push(sessionUpdate);
    });

    // Update queued sessions
    schedulingResult.queued.forEach(queuedSession => {
      const sessionUpdate = {
        ...queuedSession,
        status: 'queued',
        queuedAt: new Date().toISOString(),
        queueInfo: {
          reason: queuedSession.queueReason,
          details: queuedSession.conflictDetails
        }
      };

      dataService.updateSession(queuedSession.id, sessionUpdate);
      updatedSessions.push(sessionUpdate);
    });

    // Save scheduling timeline
    const scheduleData = {
      id: `schedule-${Date.now()}`,
      createdAt: new Date().toISOString(),
      startDate: startDate,
      timeline: schedulingResult.timeline,
      hardwareUsage: schedulingResult.hardwareUsage,
      summary: schedulingResult.summary,
      options: options
    };

    try {
      dataService.saveSchedule(scheduleData);
      console.log('Schedule saved successfully:', scheduleData.id);
    } catch (error) {
      console.error('Error saving schedule:', error);
    }

    // Emit real-time updates
    socketService.emitScheduleUpdate(scheduleData);
    socketService.emitSessionUpdate(updatedSessions);

    res.json({
      success: true,
      message: `Successfully scheduled ${schedulingResult.scheduled.length} sessions`,
      result: schedulingResult,
      scheduleId: scheduleData.id
    });

  } catch (error) {
    console.error('Auto-scheduling error:', error);
    res.status(500).json({
      success: false,
      error: 'Auto-scheduling failed',
      details: error.message
    });
  }
});

/**
 * Get scheduling analysis and recommendations
 * GET /api/scheduling/analysis
 */
router.get('/analysis', async (req, res) => {
  try {
    const dataService = req.dataService;
    console.log('DataService:', dataService ? 'Available' : 'Not available');

    // Get all pending sessions
/**
 * Queue endpoints
 */
router.get('/queue', (req, res) => {
  try {
    const dataService = req.dataService;
    const allSessions = dataService.getAllSessions();
    const queue = allSessions
      .filter(s => s.status === 'pending' || s.status === 'queued')
      .sort((a, b) => (b.priority === 'urgent') - (a.priority === 'urgent') || (b.priority === 'high') - (a.priority === 'high'));
    res.json({ success: true, data: queue });
  } catch (error) {
    console.error('Queue fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch queue' });
  }
});

router.get('/strategies', (req, res) => {
  res.json({ success: true, data: [
    { id: 'priority-first', name: 'Priority First' },
    { id: 'time-optimized', name: 'Time Optimized' },
    { id: 'balanced', name: 'Balanced' },
  ]});
});

    const allSessions = dataService.getAllSessions();
    const pendingSessions = allSessions.filter(session =>
      session.status === 'pending' || session.status === 'queued'
    );

    // Get hardware and machines
    const hardware = dataService.getAllHardware();
    const machines = dataService.getAllMachines();

    // Analyze hardware requirements
    const hardwareAnalysis = analyzeHardwareRequirements(pendingSessions, hardware);

    // Analyze time requirements
    const timeAnalysis = analyzeTimeRequirements(pendingSessions);

    // Analyze machine requirements
    const machineAnalysis = analyzeMachineRequirements(pendingSessions, machines);

    // Generate recommendations
    const recommendations = generateRecommendations(
      hardwareAnalysis,
      timeAnalysis,
      machineAnalysis
    );

    res.json({
      success: true,
      analysis: {
        hardware: hardwareAnalysis,
        time: timeAnalysis,
        machines: machineAnalysis,
        recommendations: recommendations,
        summary: {
          totalPendingSessions: pendingSessions.length,
          estimatedTotalTime: timeAnalysis.totalTime,
          hardwareBottlenecks: hardwareAnalysis.bottlenecks.length,
          machineBottlenecks: machineAnalysis.bottlenecks.length
        }
      }
    });

  } catch (error) {
    console.error('Scheduling analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Analysis failed',
      details: error.message
    });
  }
});

/**
 * Get schedule by specific date
 * GET /api/scheduling/date/:date
 */
router.get('/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    console.log(`Getting schedule for date: ${date}`);
    const dataService = req.dataService;

    // Get latest schedule
    const latestSchedule = dataService.getLatestSchedule();

    if (!latestSchedule || !latestSchedule.timeline) {
      return res.json({
        success: true,
        data: [],
        message: 'No schedule found for this date'
      });
    }

    // Get sessions for the specific date
    const dateSchedule = latestSchedule.timeline[date];
    if (!dateSchedule) {
      return res.json({
        success: true,
        data: [],
        message: `No schedule found for ${date}`
      });
    }

    // Convert timeline format to session list format expected by frontend
    const sessions = [];
    const existingKeys = new Set();

    Object.entries(dateSchedule).forEach(([timeSlot, slotData]) => {
      if (slotData.sessions && slotData.sessions.length > 0) {
        slotData.sessions.forEach(sessionId => {
          // Get session details
          const session = dataService.getSessionById(sessionId);
          if (session) {
            const startH = parseInt(timeSlot.split(':')[0]);
            const key = `${sessionId}-${startH}`;
            existingKeys.add(key);
            sessions.push({
              id: `${sessionId}-${timeSlot}`,
              sessionId: sessionId,
              sessionName: session.name,
              machineId: session.assignedMachine?.id || session.schedule?.machineId || 'machine_1',
              startHour: startH,
              endHour: startH + Math.max(1, Math.ceil(session.estimatedTime || 1)),
              status: session.status || 'scheduled',
              priority: session.priority,
              estimatedTime: session.estimatedTime,
              platform: session.platform,
              debugger: session.debugger,
              os: session.os
            });
          }
        });
      }
    });

    // Also include sessions scheduled manually (stored on the session object)
    const allSessions = dataService.getAllSessions();
    allSessions
      .filter(s => s.schedule && s.schedule.date === date)
      .forEach(s => {
        const startH = parseInt(s.schedule.startHour);
        const key = `${s.id}-${startH}`;
        if (!existingKeys.has(key)) {
          sessions.push({
            id: `${s.id}-${startH}:00`,
            sessionId: s.id,
            sessionName: s.name,
            machineId: s.schedule.machineId,
            startHour: startH,
            endHour: startH + Math.max(1, Math.ceil(s.estimatedTime || 1)),
            status: s.status || 'scheduled',
            priority: s.priority,
            estimatedTime: s.estimatedTime,
            platform: s.platform,
            debugger: s.debugger,
            os: s.os
          });
        }
      });

    res.json({
      success: true,
      data: sessions,
      date: date,
      totalSessions: sessions.length
    });

  } catch (error) {
    console.error('Get schedule by date error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get schedule',
      details: error.message
    });
  }
});

/**
 * Get current schedule timeline
 * GET /api/scheduling/timeline
 */
router.get('/timeline', async (req, res) => {
  try {
    const {
      startDate = new Date().toISOString().split('T')[0],
      days = 7
    } = req.query;

    const dataService = req.dataService;

    // Get latest schedule
    const latestSchedule = dataService.getLatestSchedule();

    if (!latestSchedule) {
      return res.json({
        success: true,
        timeline: {},
        message: 'No schedule found'
      });
    }

    // Filter timeline for requested date range
    const filteredTimeline = filterTimelineByDateRange(
      latestSchedule.timeline,
      startDate,
      parseInt(days)
    );

    res.json({
      success: true,
      timeline: filteredTimeline,
      hardwareUsage: latestSchedule.hardwareUsage,
      summary: latestSchedule.summary,
      scheduleId: latestSchedule.id,
      createdAt: latestSchedule.createdAt
    });

  } catch (error) {
    console.error('Timeline retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get timeline',
      details: error.message
    });
  }
});

/**
 * Clear current schedule
 * DELETE /api/scheduling/clear
 */
router.delete('/clear', async (req, res) => {
  try {
    const dataService = req.dataService;
    const socketService = req.socketService;

    // Reset all scheduled sessions to pending
    const allSessions = dataService.getAllSessions();
    const scheduledSessions = allSessions.filter(session =>
      session.status === 'scheduled' || session.status === 'queued'
    );

    const updatedSessions = scheduledSessions.map(session => ({
      ...session,
      status: 'pending',
      schedule: null,
      queueInfo: null,
      scheduledAt: null,
      queuedAt: null
    }));

    // Update sessions
    updatedSessions.forEach(session => {
      dataService.updateSession(session.id, session);
    });

    // Clear schedule data
    dataService.clearSchedules();

    // Emit updates
    socketService.emitSessionUpdate(updatedSessions);
    socketService.emitScheduleUpdate(null);

    res.json({
      success: true,
      message: `Cleared schedule for ${updatedSessions.length} sessions`,
      clearedSessions: updatedSessions.length
    });

  } catch (error) {
    console.error('Schedule clearing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear schedule',
      details: error.message
    });
  }
});

// Helper functions
function analyzeHardwareRequirements(sessions, hardware) {
  const requirements = {};
  const bottlenecks = [];

  sessions.forEach(session => {
    if (session.requiresHardware && session.hardwareRequirements) {
      const { platform, debugger: debuggerName } = session.hardwareRequirements;

      if (platform) {
        requirements[platform] = (requirements[platform] || 0) + 1;
      }
      if (debuggerName) {
        requirements[debuggerName] = (requirements[debuggerName] || 0) + 1;
      }
    }
  });

  // Check for bottlenecks
  Object.entries(requirements).forEach(([hwName, required]) => {
    const hw = hardware.find(h => h.name === hwName);
    const available = hw ? hw.quantityInStock : 0;

    if (required > available) {
      bottlenecks.push({
        hardware: hwName,
        required: required,
        available: available,
        shortage: required - available
      });
    }
  });

  return { requirements, bottlenecks };
}

function analyzeTimeRequirements(sessions) {
  const totalTime = sessions.reduce((sum, session) => sum + (session.estimatedTime || 0), 0);
  const byPriority = {
    urgent: sessions.filter(s => s.priority === 'urgent').reduce((sum, s) => sum + s.estimatedTime, 0),
    high: sessions.filter(s => s.priority === 'high').reduce((sum, s) => sum + s.estimatedTime, 0),
    normal: sessions.filter(s => s.priority === 'normal').reduce((sum, s) => sum + s.estimatedTime, 0)
  };

  return { totalTime, byPriority };
}

function analyzeMachineRequirements(sessions, machines) {
  const requirements = {};
  const bottlenecks = [];

  sessions.forEach(session => {
    if (session.requiredOS) {
      requirements[session.requiredOS] = (requirements[session.requiredOS] || 0) + 1;
    }
  });

  // Check machine availability by OS
  Object.entries(requirements).forEach(([os, required]) => {
    const availableMachines = machines.filter(m => m.os === os).length;

    if (required > availableMachines) {
      bottlenecks.push({
        os: os,
        required: required,
        available: availableMachines,
        shortage: required - availableMachines
      });
    }
  });

  return { requirements, bottlenecks };
}

function generateRecommendations(hardwareAnalysis, timeAnalysis, machineAnalysis) {
  const recommendations = [];

  // Hardware recommendations
  hardwareAnalysis.bottlenecks.forEach(bottleneck => {
    recommendations.push({
      type: 'hardware',
      priority: 'high',
      message: `Need ${bottleneck.shortage} more ${bottleneck.hardware} units`,
      action: 'increase_hardware_quantity'
    });
  });

  // Machine recommendations
  machineAnalysis.bottlenecks.forEach(bottleneck => {
    recommendations.push({
      type: 'machine',
      priority: 'high',
      message: `Need ${bottleneck.shortage} more machines with ${bottleneck.os}`,
      action: 'add_machines'
    });
  });

  // Time optimization recommendations
  if (timeAnalysis.totalTime > 40) { // More than 40 hours
    recommendations.push({
      type: 'optimization',
      priority: 'medium',
      message: 'Consider parallel execution to reduce total time',
      action: 'optimize_scheduling'
    });
  }

  return recommendations;
}

function filterTimelineByDateRange(timeline, startDate, days) {
  const filtered = {};
  const start = new Date(startDate);

  for (let i = 0; i < days; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(currentDate.getDate() + i);
    const dateKey = currentDate.toISOString().split('T')[0];

    if (timeline[dateKey]) {
      filtered[dateKey] = timeline[dateKey];
    }
  }

  return filtered;
}

/**
 * Check for scheduling conflicts
 * GET /api/scheduling/conflicts
 */
router.get('/conflicts', async (req, res) => {
  try {
    const { sessionId, machineId, startHour, date } = req.query;

    // Simple conflict check - in real implementation, this would check against actual schedule
    const conflicts = [];

    // Mock conflict detection
    if (startHour && parseInt(startHour) === 10) {
      conflicts.push({
        type: 'time_conflict',
        message: 'Another session is scheduled at this time',
        conflictingSession: 'Mock Session'
      });
    }

    res.json({
      success: true,
      hasConflicts: conflicts.length > 0,
      conflicts: conflicts
    });

  } catch (error) {
    console.error('Conflict check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check conflicts',
      details: error.message
    });
  }
});

/**
 * Manual schedule a session
 * POST /api/scheduling/manual
 */
router.post('/manual', async (req, res) => {
  try {
    const { sessionId, machineId, startHour, date } = req.body;
    const dataService = req.dataService;

    // Get session
    const session = dataService.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Update session with manual schedule
    const updatedSession = {
      ...session,
      status: 'scheduled',
      scheduledAt: new Date().toISOString(),
      schedule: {
        machineId: machineId,
        startHour: startHour,
        date: date,
        scheduledBy: 'manual'
      }
    };

    dataService.updateSession(sessionId, updatedSession);

    // Emit schedule update so clients refresh the timeline for this date
    try {
      const socketService = req.socketService;
      if (socketService) {
        socketService.emitScheduleUpdate({ date });
      }
    } catch (e) {
      console.warn('Socket emit failed (manual schedule):', e?.message);
    }

    res.json({
      success: true,
      message: 'Session scheduled manually',
      session: updatedSession
    });

  } catch (error) {
    console.error('Manual scheduling error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to schedule session',
      details: error.message
    });
  }
});

/**
 * Update schedule
 * PUT /api/scheduling/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const dataService = req.dataService;

    // Find and update session
    const session = dataService.getSessionById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const updatedSession = { ...session, ...updates };
    dataService.updateSession(id, updatedSession);

    res.json({
      success: true,
      message: 'Schedule updated',
      session: updatedSession
    });

  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update schedule',
      details: error.message
    });
  }
});

/**
 * Delete schedule
 * DELETE /api/scheduling/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dataService = req.dataService;

    // Find session and remove schedule
    const session = dataService.getSessionById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const updatedSession = {
      ...session,
      status: 'pending',
      schedule: null,
      scheduledAt: null
    };

    dataService.updateSession(id, updatedSession);

    res.json({
      success: true,
      message: 'Schedule removed',
      session: updatedSession
    });

  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete schedule',
      details: error.message
    });
  }
});

module.exports = router;
