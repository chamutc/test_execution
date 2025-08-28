const express = require('express');
const router = express.Router();
const { format } = require('date-fns');

/**
 * SIMPLE TIMELINE API - Clean rebuild
 * GET /api/timeline/date/:date
 * Returns structured timeline data for frontend
 */
router.get('/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const dataService = req.dataService;
    
    console.log(`🔥 TIMELINE API: Getting data for ${date}`);
    
    // QUICK FIX: Read sessions and machines directly from file instead of DataService
    const fs = require('fs');
    const path = require('path');
    
    // Read sessions
    const sessionsFilePath = path.join(__dirname, '../../data/sessions.json');
    
    let allSessions = [];
    
    if (fs.existsSync(sessionsFilePath)) {
      try {
        const rawContent = fs.readFileSync(sessionsFilePath, 'utf8');
        allSessions = JSON.parse(rawContent);
        console.log(`✅ Timeline API: ${allSessions.length} sessions loaded from file`);
      } catch (parseError) {
        console.error('❌ Timeline API sessions JSON parse error:', parseError);
        allSessions = [];
      }
    } else {
      console.log('❌ Timeline API: sessions.json not found');
    }
    
    // Read machines
    const filePath = path.join(__dirname, '../../data/machines.json');
    
    let allMachines = [];
    
    if (fs.existsSync(filePath)) {
      try {
        const rawContent = fs.readFileSync(filePath, 'utf8');
        allMachines = JSON.parse(rawContent);
        console.log(`✅ Timeline API: ${allMachines.length} machines loaded from file`);
      } catch (parseError) {
        console.error('❌ Timeline API JSON parse error:', parseError);
        allMachines = [];
      }
    } else {
      console.log('❌ Timeline API: machines.json not found');
    }
    
    console.log(`Total sessions: ${allSessions.length}`);
    console.log(`Total machines: ${allMachines.length}`);
    
    // Filter sessions with scheduled slots for this date (include pending, scheduled, and queued sessions)
    const scheduledSessions = allSessions.filter(session => {
      // Include 'scheduled', 'pending', and 'queued' sessions that have scheduledSlots
      if (!['scheduled', 'pending', 'queued'].includes(session.status)) return false;
      if (!session.scheduledSlots || !Array.isArray(session.scheduledSlots)) return false;
      
      return session.scheduledSlots.some(slot => slot.dateKey === date);
    });
    
    console.log(`Scheduled sessions for ${date}: ${scheduledSessions.length}`);
    
    // Transform sessions into timeline format
    const timelineData = [];
    
    // Track machine assignments to avoid conflicts
    const machineAssignments = new Map();
    
    scheduledSessions.forEach(session => {
      const slotsForDate = session.scheduledSlots.filter(slot => slot.dateKey === date);
      
      slotsForDate.forEach(slot => {
        const hour = parseInt(slot.slotKey.split(':')[0]);
        
        // Find available machine for this session (simple round-robin assignment)
        let assignedMachine = null;
        if (session.assignedMachine?.id) {
          // Session already has assigned machine
          assignedMachine = allMachines.find(m => m.id === session.assignedMachine.id);
        }
        
        if (!assignedMachine) {
          // Find first available machine for this time slot
          const availableMachines = allMachines.filter(machine => {
            const machineKey = `${machine.id}-${hour}`;
            return !machineAssignments.has(machineKey) && machine.status === 'available';
          });
          
          if (availableMachines.length > 0) {
            assignedMachine = availableMachines[0];
            // Mark this machine as assigned for this time slot
            const machineKey = `${assignedMachine.id}-${hour}`;
            machineAssignments.set(machineKey, session.id);
          }
        }
        
        timelineData.push({
          id: `${session.id}-${slot.slotKey}`,
          sessionId: session.id,
          sessionName: session.name,
          machineId: assignedMachine?.id || 'unassigned',
          machineName: assignedMachine?.name || 'Unassigned',
          startHour: hour,
          endHour: hour + 1, // Simple 1-hour slots
          status: session.status,
          priority: session.priority,
          estimatedTime: session.estimatedTime,
          platform: session.platform,
          debugger: session.debugger,
          os: session.os || session.requiredOS,
          isAssigned: !!assignedMachine
        });
      });
    });
    
    // Group by sessions to get proper endHour
    const sessionGroups = {};
    timelineData.forEach(item => {
      if (!sessionGroups[item.sessionId]) {
        sessionGroups[item.sessionId] = [];
      }
      sessionGroups[item.sessionId].push(item);
    });
    
    // Rebuild with correct endHour
    const finalTimelineData = [];
    Object.values(sessionGroups).forEach(group => {
      const sortedSlots = group.sort((a, b) => a.startHour - b.startHour);
      const firstSlot = sortedSlots[0];
      const lastSlot = sortedSlots[sortedSlots.length - 1];
      
      sortedSlots.forEach((slot, index) => {
        finalTimelineData.push({
          ...slot,
          endHour: lastSlot.startHour + 1 // End at last slot + 1
        });
      });
    });
    
    console.log(`Final timeline data: ${finalTimelineData.length} entries`);
    
    res.json({
      success: true,
      date: date,
      data: finalTimelineData,
      totalSessions: finalTimelineData.length,
      machines: allMachines.map(machine => ({
        id: machine.id,
        name: machine.name,
        osType: machine.osType,
        status: machine.status || 'available'
      }))
    });
    
  } catch (error) {
    console.error('Timeline API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get available dates with scheduled sessions
 * GET /api/timeline/available-dates
 */
router.get('/available-dates', async (req, res) => {
  try {
    // QUICK FIX: Read sessions directly from file instead of DataService
    const fs = require('fs');
    const path = require('path');
    const sessionsFilePath = path.join(__dirname, '../../data/sessions.json');
    
    let allSessions = [];
    
    if (fs.existsSync(sessionsFilePath)) {
      try {
        const rawContent = fs.readFileSync(sessionsFilePath, 'utf8');
        allSessions = JSON.parse(rawContent);
        console.log(`✅ Available Dates API: ${allSessions.length} sessions loaded from file`);
      } catch (parseError) {
        console.error('❌ Available Dates API sessions JSON parse error:', parseError);
        allSessions = [];
      }
    } else {
      console.log('❌ Available Dates API: sessions.json not found');
    }
    
    const availableDates = new Set();
    
    allSessions.forEach(session => {
      if (['scheduled', 'pending', 'queued'].includes(session.status) && session.scheduledSlots) {
        session.scheduledSlots.forEach(slot => {
          availableDates.add(slot.dateKey);
        });
      }
    });
    
    const sortedDates = Array.from(availableDates).sort();
    
    res.json({
      success: true,
      dates: sortedDates
    });
    
  } catch (error) {
    console.error('Available dates API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
