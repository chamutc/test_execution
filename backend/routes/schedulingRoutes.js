const express = require('express');
const SchedulingEngine = require('../services/schedulingEngine');

// Date formatting utility
const format = (date, formatStr) => {
  if (formatStr === 'yyyy-MM-dd') {
    return date.toISOString().split('T')[0];
  }
  return date.toISOString();
};

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

// Debug route to check machine-session mapping
router.get('/debug/:date', (req, res) => {
  try {
    const { date } = req.params;
    const dataService = req.dataService;
    
    if (!dataService) {
      return res.status(500).json({
        success: false,
        error: 'DataService not available'
      });
    }
    
    // Get machines
    const machines = dataService.getAllMachines();
    const machineIds = machines.map(m => ({ id: m.id, name: m.name, osType: m.osType }));
    
    // Get sessions for today that are scheduled
    const allSessions = dataService.getAllSessions();
    const scheduledSessions = allSessions.filter(s => 
      s.status === 'scheduled' && 
      s.schedule && 
      s.schedule.slots && 
      s.schedule.slots.some(slot => slot.dateKey === date)
    );
    
    const sessionInfo = scheduledSessions.map(s => ({
      sessionId: s.id,
      sessionName: s.name,
      assignedMachineId: s.schedule?.assignedMachine?.id || 'unknown',
      status: s.status,
      slots: s.schedule?.slots || []
    }));
    
    res.json({
      success: true,
      date,
      machineCount: machines.length,
      machineIds: machineIds.slice(0, 3), // First 3 for brevity
      scheduledSessionCount: scheduledSessions.length,
      sessionInfo,
      orphanedCount: sessionInfo.filter(s => !machineIds.find(m => m.id === s.assignedMachineId)).length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Test frontend data mapping
router.get('/test-frontend/:date', (req, res) => {
  try {
    const { date } = req.params;
    const dataService = req.dataService;
    
    // Simulate what frontend timeline does
    const latestSchedule = dataService.getLatestSchedule();
    const machines = dataService.getAllMachines();
    
    if (!latestSchedule || !latestSchedule.timeline) {
      return res.json({
        success: true,
        message: 'No schedule found',
        totalSessions: 0,
        orphanedCount: 0
      });
    }
    
    const scheduleData = latestSchedule.timeline[date];
    
    // Extract sessions like the frontend does
    const sessions = [];
    if (scheduleData) {
      Object.entries(scheduleData).forEach(([timeSlot, slotData]) => {
        if (slotData.sessions && slotData.sessions.length > 0) {
          slotData.sessions.forEach(sessionId => {
            const session = dataService.getSessionById(sessionId);
            if (session) {
              const startH = parseInt(timeSlot.split(':')[0]);
              const machineId = session.schedule?.assignedMachine?.id || 'unknown';
              
              sessions.push({
                id: `${sessionId}-${timeSlot}`,
                sessionId: sessionId,
                sessionName: session.name,
                machineId: machineId,
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
    }
    
    const knownMachineIds = machines.map(m => m.id);
    const orphanedSessions = sessions.filter(s => !knownMachineIds.includes(s.machineId));
    
    // Debug: Check database vs legacy data
    const legacyMachines = dataService.readData ? dataService.readData('machines.json') : [];
    const dbMachines = dataService.db && dataService.db.getAllMachines ? dataService.db.getAllMachines() : [];
    
    res.json({
      success: true,
      date,
      totalSessions: sessions.length,
      sessions: sessions.slice(0, 3), // First 3 for brevity
      machineCount: machines.length,
      knownMachineIds: knownMachineIds.slice(0, 3),
      orphanedCount: orphanedSessions.length,
      orphanedSessions: orphanedSessions.map(s => ({ name: s.sessionName, machineId: s.machineId })),
      debug: {
        legacyMachineCount: legacyMachines.length,
        dbMachineCount: dbMachines.length,
        legacyMachineIds: legacyMachines.slice(0, 3).map(m => m.id),
        dbMachineIds: dbMachines.slice(0, 3).map(m => m.id),
        dataServiceDbExists: !!dataService.db,
        dataServiceDbGetAllMachines: !!(dataService.db && dataService.db.getAllMachines),
        getAllMachinesMethod: typeof dataService.getAllMachines
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
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
    
    // Debug: Log machine IDs being used for scheduling
    console.log('🔥 AUTO-SCHEDULING MACHINES DEBUG 🔥');
    console.log('Machines for scheduling:', machines.map(m => ({ id: m.id, name: m.name, osType: m.osType })));
    console.log('Total machines:', machines.length);

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
    const scheduleEntries = {};

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

      const updated = dataService.updateSession(scheduledSession.id, sessionUpdate);
      console.log('Updated session:', updated ? 'success' : 'failed', scheduledSession.id);
      
      // Ensure the update is persisted
      if (!updated) {
        console.error('Failed to update session:', scheduledSession.id);
      } else {
        console.log('Session status updated to scheduled:', scheduledSession.id, updated.status);
      }
      
      updatedSessions.push(sessionUpdate);

      // Build schedule entries for schedules.json
      if (scheduledSession.scheduledSlots && scheduledSession.scheduledSlots.length > 0) {
        scheduledSession.scheduledSlots.forEach(slot => {
          const dateKey = slot.dateKey;
          const timeKey = slot.slotKey;
          
          if (!scheduleEntries[dateKey]) {
            scheduleEntries[dateKey] = {};
          }
          
          if (!scheduleEntries[dateKey][timeKey]) {
            scheduleEntries[dateKey][timeKey] = {
              sessions: [],
              machines: {},
              hardware: {}
            };
          }
          
          scheduleEntries[dateKey][timeKey].sessions.push(scheduledSession.id);
          
          if (scheduledSession.assignedMachine && scheduledSession.assignedMachine.id) {
            scheduleEntries[dateKey][timeKey].machines[scheduledSession.assignedMachine.id] = true;
          }
        });
      }
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

      const updated = dataService.updateSession(queuedSession.id, sessionUpdate);
      console.log('Updated queued session:', updated ? 'success' : 'failed', queuedSession.id);
      updatedSessions.push(sessionUpdate);
    });

    // Save scheduling timeline
    const scheduleData = {
      id: `schedule-${Date.now()}`,
      createdAt: new Date().toISOString(),
      startDate: startDate,
      timeline: {
        ...schedulingResult.timeline,
        ...scheduleEntries  // Merge timeline entries from sessions
      },
      hardwareUsage: schedulingResult.hardwareUsage,
      summary: schedulingResult.summary,
      options: options
    };

    console.log('🔥 SAVING SCHEDULE DATA TO schedules.json 🔥');
    console.log('Schedule entries to save:', Object.keys(scheduleEntries));
    console.log('Sample schedule entry:', Object.keys(scheduleEntries)[0] ? scheduleEntries[Object.keys(scheduleEntries)[0]] : 'none');

    try {
      dataService.saveSchedule(scheduleData);
      console.log('Schedule saved successfully:', scheduleData.id);
    } catch (error) {
      console.error('Error saving schedule:', error);
    }

    // Emit real-time updates
    try {
      // Ensure schedule data has the expected structure
      const scheduleUpdateData = {
        date: format(new Date(startDate), 'yyyy-MM-dd'),
        scheduleId: scheduleData.id,
        timestamp: new Date().toISOString(),
        sessionsUpdated: updatedSessions.length
      };
      
      socketService.emitScheduleUpdate(scheduleUpdateData);
      socketService.emitSessionUpdate(updatedSessions);
      console.log('Socket updates emitted for', updatedSessions.length, 'sessions');
    } catch (error) {
      console.error('Socket emit error:', error);
    }

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
    const allSessions = dataService.getAllSessions();
    const pendingSessions = allSessions.filter(session =>
      session.status === 'pending' || session.status === 'queued'
    );

    res.json({
      success: true,
      data: {
        totalSessions: allSessions.length,
        pendingSessions: pendingSessions.length,
        scheduledSessions: allSessions.filter(s => s.status === 'scheduled').length
      }
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ success: false, error: 'Failed to get analysis' });
  }
});

/**
 * Queue endpoints
 */
router.get('/queue', (req, res) => {
  console.log('🔥 QUEUE ENDPOINT CALLED! 🔥');
  try {
    const dataService = req.dataService;
    if (!dataService) {
      console.error('DataService not available in queue endpoint');
      return res.status(500).json({ success: false, error: 'DataService not available' });
    }
    
    const allSessions = dataService.getAllSessions();
    console.log('Total sessions:', allSessions.length);
    
    const queue = allSessions
      .filter(s => s.status === 'pending' || s.status === 'queued')
      .sort((a, b) => (b.priority === 'urgent') - (a.priority === 'urgent') || (b.priority === 'high') - (a.priority === 'high'));
    
    console.log('Queue sessions:', queue.length);
    console.log('Queue items:', queue.map(s => ({ name: s.name, status: s.status, priority: s.priority })));
    
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

// Clear all schedules
router.delete('/clear-schedules', (req, res) => {
  try {
    const dataService = req.dataService;
    dataService.clearSchedules();
    res.json({ success: true, message: 'All schedules cleared' });
  } catch (error) {
    console.error('Clear schedules error:', error);
    res.status(500).json({ success: false, error: 'Failed to clear schedules' });
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
    
    // Get machines from machines API to ensure consistency with frontend
    let availableMachines = [];
    try {
      // Get machines from machines API to ensure consistency
      const machinesResponse = await fetch('http://localhost:3000/api/machines');
      if (machinesResponse.ok) {
        const machinesData = await machinesResponse.json();
        availableMachines = machinesData.machines || [];
        console.log('Fetched machines from API:', availableMachines.length);
        console.log('API Machine IDs:', availableMachines.slice(0, 3).map(m => m.id));
      } else {
        console.log('Failed to fetch machines from API, falling back to database');
        availableMachines = dataService.getAllMachines();
      }
    } catch (error) {
      console.log('Error fetching machines from API, falling back to database:', error.message);
      availableMachines = dataService.getAllMachines();
    }

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

    // Create machine mapping for orphaned sessions (by OS type)
    const machinesByOS = {};
    availableMachines.forEach(machine => {
      const osType = machine.osType || machine.os;
      if (!machinesByOS[osType]) {
        machinesByOS[osType] = [];
      }
      machinesByOS[osType].push(machine);
    });
    
    console.log('Available machines for mapping:', availableMachines.map(m => ({ id: m.id, name: m.name, osType: m.osType || m.os })));
    console.log('Machines by OS:', Object.keys(machinesByOS).map(os => ({ os, count: machinesByOS[os].length, firstId: machinesByOS[os][0]?.id })));

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
            if (!existingKeys.has(key)) {
              existingKeys.add(key);
              
              // Get machine ID from session schedule or assigned machine
              let machineId = null;
              if (session.schedule?.assignedMachine?.id) {
                machineId = session.schedule.assignedMachine.id;
              } else if (session.assignedMachine?.id) {
                machineId = session.assignedMachine.id;
              } else if (session.schedule?.machineId) {
                machineId = session.schedule.machineId;
              }
              
              // DYNAMIC force mapping to current machines for display
              if (session.os === 'Ubuntu 24.04') {
                const ubuntuMachine = availableMachines.find(m => m.osType === 'Ubuntu 24.04');
                machineId = ubuntuMachine ? ubuntuMachine.id : availableMachines[0]?.id;
                console.log(`Dynamic mapping session ${session.name} to Ubuntu machine ${machineId}`);
              } else if (session.os === 'Windows 11') {
                const windowsMachine = availableMachines.find(m => m.osType === 'Windows 11');
                machineId = windowsMachine ? windowsMachine.id : availableMachines[0]?.id;
                console.log(`Dynamic mapping session ${session.name} to Windows machine ${machineId}`);
              } else if (session.os === 'Ubuntu 22.04') {
                const ubuntu22Machine = availableMachines.find(m => m.osType === 'Ubuntu 22.04');
                machineId = ubuntu22Machine ? ubuntu22Machine.id : availableMachines[0]?.id;
                console.log(`Dynamic mapping session ${session.name} to Ubuntu 22.04 machine ${machineId}`);
              } else {
                // Fallback to first available machine
                machineId = availableMachines[0]?.id;
                console.log(`Fallback mapping session ${session.name} to first available machine ${machineId}`);
              }
              
              sessions.push({
                id: `${sessionId}-${timeSlot}`,
                sessionId: sessionId,
                sessionName: session.name,
                machineId: machineId || 'unknown',
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
