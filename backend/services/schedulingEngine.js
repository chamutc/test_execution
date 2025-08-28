const TimeCalculator = require('../utils/timeCalculator');

class SchedulingEngine {
  constructor() {
    this.timeCalculator = new TimeCalculator();
    this.priorityOrder = ['urgent', 'high', 'normal'];
    this.timeFlexibilityHours = 2; // ±2 hours flexibility
  }

  /**
   * Main scheduling function - Priority-based with hardware-aware allocation
   * @param {Array} sessions - Sessions to schedule
   * @param {Array} hardware - Available hardware
   * @param {Array} machines - Available machines
   * @param {Date} startDate - Start date for scheduling
   * @param {Object} options - Scheduling options
   * @returns {Object} Scheduling result
   */
  async scheduleOptimal(sessions, hardware, machines, startDate = new Date(), options = {}) {
    try {
      const {
        timeSlotDuration = 1, // 1 hour slots
        workingHours = { start: 6, end: 18 }, // 6AM-6PM
        maxDays = 7
      } = options;

      // Initialize scheduling context
      const context = this.initializeSchedulingContext(
        sessions, hardware, machines, startDate, timeSlotDuration, workingHours, maxDays
      );

      // Sort sessions by priority and duration (shorter first within same priority)
      const sortedSessions = this.sortSessionsByPriority(sessions);

      // Schedule sessions
      const schedulingResult = await this.performScheduling(sortedSessions, context);

      return {
        success: true,
        scheduled: schedulingResult.scheduled,
        queued: schedulingResult.queued,
        conflicts: schedulingResult.conflicts,
        summary: this.generateSchedulingSummary(schedulingResult),
        timeline: context.timeline,
        hardwareUsage: context.hardwareUsage
      };

    } catch (error) {
      console.error('Scheduling error:', error);
      return {
        success: false,
        error: error.message,
        scheduled: [],
        queued: [],
        conflicts: []
      };
    }
  }

  /**
   * Initialize scheduling context with timeline and resource tracking
   */
  initializeSchedulingContext(sessions, hardware, machines, startDate, slotDuration, workingHours, maxDays) {
    const context = {
      timeline: {},
      hardwareUsage: {},
      machineUsage: {},
      startDate,
      slotDuration,
      workingHours,
      maxDays,
      totalSlots: (workingHours.end - workingHours.start) * maxDays
    };

    // Initialize timeline slots
    for (let day = 0; day < maxDays; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + day);
      const dateKey = currentDate.toISOString().split('T')[0];
      
      context.timeline[dateKey] = {};
      
      for (let hour = workingHours.start; hour < workingHours.end; hour++) {
        const slotKey = `${hour}:00`;
        context.timeline[dateKey][slotKey] = {
          sessions: [],
          hardwareUsed: {},
          machinesUsed: {},
          available: true
        };
      }
    }

    // Initialize hardware usage tracking
    context.hardwareNameToId = { platform: {}, debugger: {} };
    hardware.forEach(hw => {
      context.hardwareUsage[hw.id] = {
        name: hw.name,
        type: hw.type,
        totalQuantity: hw.quantityInStock || 1,
        usage: {} // dateKey -> slotKey -> quantity used
      };
      // Build reverse lookup maps by type
      if (hw.type === 'platform') {
        context.hardwareNameToId.platform[hw.name] = hw.id;
      } else if (hw.type === 'debugger') {
        context.hardwareNameToId.debugger[hw.name] = hw.id;
      }
    });

    // Initialize machine usage tracking
    machines.forEach(machine => {
      context.machineUsage[machine.id] = {
        name: machine.name,
        osType: machine.osType,
        available: true,
        usage: {} // dateKey -> slotKey -> boolean
      };
    });

    return context;
  }

  /**
   * Sort sessions by priority (Urgent → High → Normal) then by duration (shorter first)
   */
  sortSessionsByPriority(sessions) {
    return [...sessions].sort((a, b) => {
      // First sort by priority
      const priorityA = this.priorityOrder.indexOf(a.priority.toLowerCase());
      const priorityB = this.priorityOrder.indexOf(b.priority.toLowerCase());
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Then sort by duration (shorter first for better optimization)
      return a.estimatedTime - b.estimatedTime;
    });
  }

  /**
   * Perform the actual scheduling with hardware-aware allocation
   */
  async performScheduling(sortedSessions, context) {
    const result = {
      scheduled: [],
      queued: [],
      conflicts: []
    };

    for (const session of sortedSessions) {
      // Skip completed sessions
      if (session.status === 'completed') {
        continue;
      }

      const schedulingAttempt = await this.scheduleSession(session, context);
      
      if (schedulingAttempt.success) {
        result.scheduled.push({
          ...session,
          scheduledSlots: schedulingAttempt.slots,
          assignedHardware: schedulingAttempt.hardware,
          assignedMachine: schedulingAttempt.machine
        });
        
        // Update context with scheduled session
        this.updateContextWithScheduledSession(context, session, schedulingAttempt);
        
      } else {
        if (schedulingAttempt.reason === 'hardware_conflict') {
          result.queued.push({
            ...session,
            queueReason: 'Waiting for hardware availability',
            conflictDetails: schedulingAttempt.conflictDetails
          });
        } else {
          result.conflicts.push({
            ...session,
            conflictReason: schedulingAttempt.reason,
            details: schedulingAttempt.details
          });
        }
      }
    }

    return result;
  }

  /**
   * Attempt to schedule a single session
   */
  async scheduleSession(session, context) {
    const requiredSlots = this.timeCalculator.hoursToTimeSlots(session.estimatedTime);
    
    // Find available time slots
    const availableSlots = this.findAvailableSlots(session, requiredSlots, context);
    
    if (availableSlots.length === 0) {
      return {
        success: false,
        reason: 'no_available_slots',
        details: 'No available time slots found'
      };
    }

    // Try to allocate hardware and machine for each available slot option
    for (const slotOption of availableSlots) {
      const allocationResult = await this.allocateResources(session, slotOption, context);
      
      if (allocationResult.success) {
        return {
          success: true,
          slots: slotOption,
          hardware: allocationResult.hardware,
          machine: allocationResult.machine
        };
      }
    }

    return {
      success: false,
      reason: 'hardware_conflict',
      details: 'Required hardware not available in any suitable time slot'
    };
  }

  /**
   * Find available time slots for a session with flexibility
   */
  findAvailableSlots(session, requiredSlots, context) {
    const availableOptions = [];
    
    // Iterate through all possible starting points
    Object.keys(context.timeline).forEach(dateKey => {
      const daySlots = context.timeline[dateKey];
      const slotKeys = Object.keys(daySlots).sort();
      
      for (let startIdx = 0; startIdx <= slotKeys.length - requiredSlots; startIdx++) {
        const consecutiveSlots = [];
        let allAvailable = true;
        
        // Check if we can get consecutive slots
        for (let i = 0; i < requiredSlots; i++) {
          const slotKey = slotKeys[startIdx + i];
          if (!slotKey || !daySlots[slotKey].available) {
            allAvailable = false;
            break;
          }
          consecutiveSlots.push({ dateKey, slotKey });
        }
        
        if (allAvailable) {
          availableOptions.push(consecutiveSlots);
        }
      }
    });

    // Sort by preference (earlier slots first, but consider flexibility)
    return availableOptions.sort((a, b) => {
      const aStart = new Date(`${a[0].dateKey}T${a[0].slotKey}`);
      const bStart = new Date(`${b[0].dateKey}T${b[0].slotKey}`);
      return aStart - bStart;
    });
  }

  /**
   * Allocate hardware and machine resources for a session
   */
  async allocateResources(session, slots, context) {
    const result = {
      success: false,
      hardware: {},
      machine: null
    };

    // Check if session requires hardware
    if (session.requiresHardware) {
      const hardwareAllocation = this.allocateHardware(session, slots, context);
      if (!hardwareAllocation.success) {
        return result;
      }
      result.hardware = hardwareAllocation.hardware;
    }

    // Allocate machine based on OS requirement
    if (session.requiredOS) {
      const machineAllocation = this.allocateMachine(session, slots, context);
      if (!machineAllocation.success) {
        return result;
      }
      result.machine = machineAllocation.machine;
    }

    result.success = true;
    return result;
  }

  /**
   * Allocate specific hardware for session slots
   */
  allocateHardware(session, slots, context) {
    const requiredHardware = session.hardwareRequirements || {};
    const allocation = {};

    // Check platform availability
    if (requiredHardware.platform || requiredHardware.platformId) {
      const platformId = requiredHardware.platformId || context.hardwareNameToId.platform[requiredHardware.platform];
      if (!platformId || !context.hardwareUsage[platformId]) {
        return { success: false, reason: 'platform_not_found' };
      }
      const platformAvailable = this.checkHardwareAvailability(
        platformId, slots, context
      );
      if (!platformAvailable.available) {
        return { success: false, reason: 'platform_unavailable' };
      }
      allocation.platform = { id: platformId, name: platformAvailable.hardware?.name };
    }

    // Check debugger availability
    if (requiredHardware.debugger || requiredHardware.debuggerId) {
      const debuggerId = requiredHardware.debuggerId || context.hardwareNameToId.debugger[requiredHardware.debugger];
      if (!debuggerId || !context.hardwareUsage[debuggerId]) {
        return { success: false, reason: 'debugger_not_found' };
      }
      const debuggerAvailable = this.checkHardwareAvailability(
        debuggerId, slots, context
      );
      if (!debuggerAvailable.available) {
        return { success: false, reason: 'debugger_unavailable' };
      }
      allocation.debugger = { id: debuggerId, name: debuggerAvailable.hardware?.name };
    }

    return { success: true, hardware: allocation };
  }

  /**
   * Check if specific hardware is available for given slots
   */
  checkHardwareAvailability(hardwareId, slots, context) {
    if (!hardwareId) {
      return { available: false, reason: 'hardware_not_found' };
    }
    const hardwareUsage = context.hardwareUsage[hardwareId];
    if (!hardwareUsage) {
      return { available: false, reason: 'hardware_not_found' };
    }

    // Check availability for all required slots
    for (const slot of slots) {
      const slotUsage = hardwareUsage.usage[slot.dateKey]?.[slot.slotKey] || 0;
      if (slotUsage >= hardwareUsage.totalQuantity) {
        return { available: false, reason: 'hardware_fully_used' };
      }
    }

    return { available: true, hardware: hardwareUsage };
  }

  /**
   * Allocate machine based on OS requirement
   */
  allocateMachine(session, slots, context) {
    const requiredOS = session.requiredOS;
    
    // Find available machine with matching OS
    for (const [machineId, machine] of Object.entries(context.machineUsage)) {
      if (machine.osType === requiredOS) {
        const machineAvailable = this.checkMachineAvailability(machineId, slots, context);
        if (machineAvailable.available) {
          return { success: true, machine: { id: machineId, ...machine } };
        }
      }
    }

    return { success: false, reason: 'no_machine_available' };
  }

  /**
   * Check if machine is available for given slots
   */
  checkMachineAvailability(machineId, slots, context) {
    const machine = context.machineUsage[machineId];
    const now = new Date();
    
    for (const slot of slots) {
      // Check if slot is in the past
      const slotDate = new Date(slot.dateKey);
      const [hour] = slot.slotKey.split(':').map(Number);
      slotDate.setHours(hour, 0, 0, 0);
      
      if (slotDate.getTime() <= now.getTime()) {
        return { available: false, reason: 'slot_in_past' };
      }

      const isUsed = machine.usage[slot.dateKey]?.[slot.slotKey] || false;
      if (isUsed) {
        return { available: false, reason: 'machine_busy' };
      }
    }

    return { available: true };
  }

  /**
   * Update context after successfully scheduling a session
   */
  updateContextWithScheduledSession(context, session, schedulingResult) {
    const { slots, hardware, machine } = schedulingResult;

    slots.forEach(slot => {
      // Mark timeline slot as used
      context.timeline[slot.dateKey][slot.slotKey].sessions.push(session.id);
      context.timeline[slot.dateKey][slot.slotKey].available = false;

      // Update hardware usage
      Object.keys(hardware).forEach(hwType => {
        const hw = hardware[hwType];
        if (!hw || !hw.id || !context.hardwareUsage[hw.id]) {
          return;
        }
        if (!context.hardwareUsage[hw.id].usage[slot.dateKey]) {
          context.hardwareUsage[hw.id].usage[slot.dateKey] = {};
        }
        context.hardwareUsage[hw.id].usage[slot.dateKey][slot.slotKey] = 
          (context.hardwareUsage[hw.id].usage[slot.dateKey][slot.slotKey] || 0) + 1;
      });

      // Update machine usage
      if (machine && machine.id && context.machineUsage[machine.id]) {
        if (!context.machineUsage[machine.id].usage[slot.dateKey]) {
          context.machineUsage[machine.id].usage[slot.dateKey] = {};
        }
        context.machineUsage[machine.id].usage[slot.dateKey][slot.slotKey] = true;
      }
    });
  }

  /**
   * Generate scheduling summary
   */
  generateSchedulingSummary(result) {
    return {
      totalSessions: result.scheduled.length + result.queued.length + result.conflicts.length,
      scheduled: result.scheduled.length,
      queued: result.queued.length,
      conflicts: result.conflicts.length,
      schedulingRate: result.scheduled.length / (result.scheduled.length + result.queued.length + result.conflicts.length) * 100,
      totalEstimatedTime: result.scheduled.reduce((sum, session) => sum + session.estimatedTime, 0)
    };
  }
}

module.exports = SchedulingEngine;
