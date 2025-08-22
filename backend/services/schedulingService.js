const HardwareService = require('./hardwareService');
const MachineService = require('./machineService');
const TimeCalculator = require('../utils/timeCalculator');
const { v4: uuidv4 } = require('uuid');

class SchedulingService {
  constructor(dataService, socketService = null) {
    this.dataService = dataService;
    this.socketService = socketService;
    this.hardwareService = new HardwareService(dataService);
    this.machineService = new MachineService(dataService);
    this.timeCalculator = new TimeCalculator();
    
    // Scheduling configuration
    this.config = {
      timeFlexibilityHours: 2,
      priorityOrder: ['urgent', 'high', 'normal'],
      timeSlotDurationHours: 1
    };
  }

  /**
   * Auto-schedule all pending sessions
   * @param {Array} sessions - All sessions
   * @param {Object} hardware - Hardware inventory
   * @param {Array} machines - All machines
   * @param {Object} currentSchedule - Current schedule
   * @returns {Object} Scheduling result
   */
  async autoSchedule(sessions, hardware, machines, currentSchedule, options = {}) {
    try {
      const { viewType = 'day', prioritizeView = false } = options;

      this.emitProgress('Starting auto-scheduling...', 0);

      // Load comprehensive hardware data for new scheduling algorithm
      const hardwareCombinations = this.dataService.getHardwareCombinations();
      const hardwareInventory = this.dataService.getHardwareInventory();
      const hardwareAvailability = this.dataService.getHardwareAvailability();

      console.log(`Loaded ${hardwareCombinations.length} hardware combinations for scheduling`);

      // Filter pending sessions
      const pendingSessions = sessions.filter(session => session.status === 'pending');
      
      if (pendingSessions.length === 0) {
        return {
          success: true,
          message: 'No pending sessions to schedule',
          sessions,
          schedule: currentSchedule,
          queue: []
        };
      }

      this.emitProgress('Sorting sessions by priority...', 20);

      // Sort sessions by priority and duration (shorter first for same priority)
      const sortedSessions = this.sortSessionsByPriority(pendingSessions);

      this.emitProgress('Generating time slots...', 40);

      // Generate available time slots with view prioritization
      const timeSlots = this.generateTimeSlots(viewType, prioritizeView);

      // Initialize scheduling state
      let updatedSchedule = { ...currentSchedule };
      // Always use fresh time slots for scheduling
      updatedSchedule.timeSlots = timeSlots;
      if (!updatedSchedule.assignments) updatedSchedule.assignments = [];

      let updatedSessions = [...sessions];
      let updatedHardware = { ...hardware };
      let updatedMachines = [...machines];
      let queue = [];

      this.emitProgress('Scheduling sessions...', 60);

      // Schedule each session
      for (let i = 0; i < sortedSessions.length; i++) {
        const session = sortedSessions[i];
        const progress = 60 + (i / sortedSessions.length) * 30;
        
        this.emitProgress(`Scheduling ${session.name}...`, progress);

        const result = await this.scheduleSession(
          session,
          updatedSchedule,
          updatedHardware,
          updatedMachines
        );

        if (result.success) {
          // Update session status
          const sessionIndex = updatedSessions.findIndex(s => s.id === session.id);
          if (sessionIndex !== -1) {
            updatedSessions[sessionIndex] = {
              ...updatedSessions[sessionIndex],
              status: 'scheduled',
              scheduledTime: result.assignment.timeSlot,
              assignedMachine: result.assignment.machineId,
              assignedHardware: result.assignment.hardwareAssignment
            };
          }

          // Update schedule
          updatedSchedule.assignments.push(result.assignment);
          
          // Update hardware and machines
          updatedHardware = result.hardware;
          updatedMachines = result.machines;

        } else {
          // Add to queue if scheduling failed
          queue.push({
            sessionId: session.id,
            reason: result.error,
            timestamp: new Date().toISOString()
          });
        }
      }

      this.emitProgress('Optimizing schedule...', 95);

      // Optimize schedule to fill gaps and improve efficiency
      this.optimizeSchedule(updatedSchedule);

      this.emitProgress('Auto-scheduling completed!', 100);

      const summary = this.generateSchedulingSummary(updatedSessions, queue);

      return {
        success: true,
        sessions: updatedSessions,
        schedule: updatedSchedule,
        hardware: updatedHardware,
        machines: updatedMachines,
        queue,
        summary
      };

    } catch (error) {
      console.error('Auto-scheduling error:', error);
      return {
        success: false,
        error: 'Auto-scheduling failed',
        details: error.message
      };
    }
  }

  /**
   * Schedule a single session
   * @param {Object} session - Session to schedule
   * @param {Object} schedule - Current schedule
   * @param {Object} hardware - Hardware inventory
   * @param {Array} machines - All machines
   * @returns {Object} Scheduling result
   */
  async scheduleSession(session, schedule, hardware, machines) {
    try {
      // Find available machine
      const machineResult = this.machineService.findBestMachine(machines, session);
      if (!machineResult.success) {
        return {
          success: false,
          error: machineResult.error
        };
      }

      // Check hardware requirements using new comprehensive system
      const hardwareResult = this.findAvailableHardwareCombination(session, schedule);
      if (!hardwareResult.success) {
        return {
          success: false,
          error: hardwareResult.error
        };
      }

      // Find available time slot
      const timeSlotResult = this.findAvailableTimeSlot(
        session,
        schedule,
        machineResult.machine,
        hardwareResult.assignment
      );

      if (!timeSlotResult.success) {
        return {
          success: false,
          error: timeSlotResult.error
        };
      }

      // Allocate resources
      const allocationResult = this.allocateResources(
        session,
        timeSlotResult.timeSlot,
        machineResult.machine,
        hardwareResult.assignment,
        hardware,
        machines
      );

      if (!allocationResult.success) {
        return {
          success: false,
          error: allocationResult.error
        };
      }

      return {
        success: true,
        assignment: {
          id: uuidv4(),
          sessionId: session.id,
          timeSlot: timeSlotResult.timeSlot,
          machineId: machineResult.machine.id,
          hardwareAssignment: hardwareResult.assignment,
          createdAt: new Date().toISOString()
        },
        hardware: allocationResult.hardware,
        machines: allocationResult.machines
      };

    } catch (error) {
      console.error('Session scheduling error:', error);
      return {
        success: false,
        error: 'Failed to schedule session'
      };
    }
  }

  /**
   * Sort sessions by priority and duration
   * @param {Array} sessions - Sessions to sort
   * @returns {Array} Sorted sessions
   */
  sortSessionsByPriority(sessions) {
    return sessions.sort((a, b) => {
      // First sort by priority
      const priorityA = this.config.priorityOrder.indexOf(a.priority);
      const priorityB = this.config.priorityOrder.indexOf(b.priority);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Then sort by duration (shorter first)
      return a.estimatedTime - b.estimatedTime;
    });
  }

  /**
   * Generate available time slots
   * @param {string} viewType - Current view type (day, night, week)
   * @param {boolean} prioritizeView - Whether to prioritize current view slots
   * @returns {Array} Array of time slots
   */
  generateTimeSlots(viewType = 'day', prioritizeView = false) {
    const slots = [];
    const now = new Date();
    const startDate = new Date(now);
    startDate.setHours(6, 0, 0, 0); // Start at 6 AM today

    // Generate slots for the next 7 days
    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);

      // Day slots: 6 AM to 6 PM (12 slots)
      for (let hour = 6; hour < 18; hour++) {
        const slotTime = new Date(currentDate);
        slotTime.setHours(hour, 0, 0, 0);
        
        slots.push({
          id: `day-${day}-${hour}`,
          startTime: slotTime.toISOString(),
          endTime: new Date(slotTime.getTime() + 60 * 60 * 1000).toISOString(),
          type: 'day',
          available: true
        });
      }

      // Night slots: 6 PM to 8 AM next day (14 slots)
      for (let hour = 18; hour < 32; hour++) { // 32 = 24 + 8 (next day 8 AM)
        const slotTime = new Date(currentDate);
        const actualHour = hour >= 24 ? hour - 24 : hour;
        if (hour >= 24) {
          slotTime.setDate(slotTime.getDate() + 1);
        }
        slotTime.setHours(actualHour, 0, 0, 0);

        slots.push({
          id: `night-${day}-${hour}`,
          startTime: slotTime.toISOString(),
          endTime: new Date(slotTime.getTime() + 60 * 60 * 1000).toISOString(),
          type: 'night',
          available: true
        });
      }
    }

    // Sort slots to prioritize current view if requested
    if (prioritizeView) {
      slots.sort((a, b) => {
        // Prioritize slots matching current view type
        const aMatchesView = this.slotMatchesView(a, viewType);
        const bMatchesView = this.slotMatchesView(b, viewType);

        if (aMatchesView && !bMatchesView) return -1;
        if (!aMatchesView && bMatchesView) return 1;

        // Then sort by time
        return new Date(a.startTime) - new Date(b.startTime);
      });
    }

    console.log(`Generated time slots: ${slots.length}`);
    return slots;
  }

  /**
   * Check if a time slot matches the current view type
   */
  slotMatchesView(slot, viewType) {
    switch (viewType) {
      case 'day':
        return slot.type === 'day';
      case 'night':
        return slot.type === 'night';
      case 'week':
        return true; // Week view includes all slots
      default:
        return true;
    }
  }

  /**
   * Find available time slot for a session
   * @param {Object} session - Session to schedule
   * @param {Object} schedule - Current schedule
   * @param {Object} machine - Assigned machine
   * @param {Object} hardwareAssignment - Hardware assignment
   * @returns {Object} Time slot result
   */
  findAvailableTimeSlot(session, schedule, machine, hardwareAssignment) {
    try {
      const requiredSlots = this.timeCalculator.hoursToTimeSlots(session.estimatedTime);

      // Sort time slots by start time to prioritize earlier slots
      const sortedTimeSlots = schedule.timeSlots
        .filter(slot => slot.available)
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

      // Check each potential starting slot from earliest to latest
      for (let i = 0; i <= sortedTimeSlots.length - requiredSlots; i++) {
        const startSlot = sortedTimeSlots[i];
        const consecutiveSlots = sortedTimeSlots.slice(i, i + requiredSlots);

        // Check if we have enough consecutive slots
        if (consecutiveSlots.length === requiredSlots) {
          // Check if machine is available for all slots
          const machineAvailable = this.isMachineAvailable(
            machine.id,
            consecutiveSlots,
            schedule.assignments
          );

          // Check if hardware is available for all slots
          const hardwareAvailable = this.isHardwareAvailable(
            hardwareAssignment,
            consecutiveSlots,
            schedule.assignments
          );

          if (machineAvailable && hardwareAvailable) {
            return {
              success: true,
              timeSlot: startSlot.id,
              slots: consecutiveSlots
            };
          }
        }
      }

      // If no consecutive slots found, try to find gaps that can be filled
      const gapResult = this.findAvailableGap(session, schedule, machine, hardwareAssignment);
      if (gapResult.success) {
        return gapResult;
      }

      return {
        success: false,
        error: 'No available time slots found'
      };

    } catch (error) {
      console.error('Error finding time slot:', error);
      return {
        success: false,
        error: 'Failed to find time slot'
      };
    }
  }

  /**
   * Find available gaps in the schedule that can fit the session
   */
  findAvailableGap(session, schedule, machine, hardwareAssignment) {
    try {
      const requiredSlots = this.timeCalculator.hoursToTimeSlots(session.estimatedTime);

      // Get all time slots sorted by time
      const allSlots = schedule.timeSlots
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

      // Find gaps between assignments
      for (let i = 0; i < allSlots.length - requiredSlots + 1; i++) {
        const potentialSlots = allSlots.slice(i, i + requiredSlots);

        // Check if all slots in this range are available for this machine and hardware
        const allAvailable = potentialSlots.every(slot => {
          // Check if slot is generally available
          if (!slot.available) return false;

          // Check if machine is available for this slot
          const machineConflict = schedule.assignments.some(assignment =>
            assignment.machineId === machine.id && assignment.timeSlot === slot.id
          );

          // Check if hardware is available for this slot
          let hardwareConflict = false;
          if (hardwareAssignment) {
            hardwareConflict = schedule.assignments.some(assignment => {
              if (!assignment.hardwareAssignment) return false;

              const debuggerConflict = hardwareAssignment.debugger &&
                assignment.hardwareAssignment.debugger &&
                assignment.hardwareAssignment.debugger.id === hardwareAssignment.debugger.id;

              const platformConflict = hardwareAssignment.platform &&
                assignment.hardwareAssignment.platform &&
                assignment.hardwareAssignment.platform.id === hardwareAssignment.platform.id;

              return (debuggerConflict || platformConflict) && assignment.timeSlot === slot.id;
            });
          }

          return !machineConflict && !hardwareConflict;
        });

        if (allAvailable) {
          return {
            success: true,
            timeSlot: potentialSlots[0].id,
            slots: potentialSlots
          };
        }
      }

      return {
        success: false,
        error: 'No suitable gaps found'
      };

    } catch (error) {
      return {
        success: false,
        error: `Gap search error: ${error.message}`
      };
    }
  }

  /**
   * Check if machine is available for given time slots
   * @param {string} machineId - Machine ID
   * @param {Array} timeSlots - Time slots to check
   * @param {Array} assignments - Current assignments
   * @returns {boolean} True if available
   */
  isMachineAvailable(machineId, timeSlots, assignments) {
    return timeSlots.every(slot => {
      return !assignments.some(assignment => 
        assignment.timeSlot === slot.id && assignment.machineId === machineId
      );
    });
  }

  /**
   * Check if hardware is available for given time slots (Enhanced with quantity and availability)
   * @param {Object} hardwareAssignment - Hardware assignment
   * @param {Array} timeSlots - Time slots to check
   * @param {Array} assignments - Current assignments
   * @returns {boolean} True if available
   */
  isHardwareAvailable(hardwareAssignment, timeSlots, assignments) {
    if (!hardwareAssignment) return true;

    // Get hardware combinations, inventory, and availability data
    const hardwareCombinations = this.dataService.getHardwareCombinations();
    const hardwareInventory = this.dataService.getHardwareInventory();
    const hardwareAvailability = this.dataService.getHardwareAvailability();

    return timeSlots.every(slot => {
      // Check if this is within hardware availability schedule
      if (!this.isWithinHardwareSchedule(hardwareAssignment, slot)) {
        return false;
      }

      // Check hardware quantity availability
      if (!this.checkHardwareQuantityAvailability(hardwareAssignment, slot, assignments)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Check if time slot is within hardware availability schedule
   * @param {Object} hardwareAssignment - Hardware assignment
   * @param {Object} timeSlot - Time slot to check
   * @returns {boolean} True if within schedule
   */
  isWithinHardwareSchedule(hardwareAssignment, timeSlot) {
    try {
      const hardwareAvailability = this.dataService.getHardwareAvailability();

      // Find hardware combination for this assignment
      const combination = this.findHardwareCombination(hardwareAssignment);
      if (!combination) return true; // If no combination found, assume available

      // Get availability rules for this combination
      const availabilityRules = hardwareAvailability.filter(avail =>
        avail.hardwareCombinationId === combination.id
      );

      if (availabilityRules.length === 0) return true; // No rules = always available

      // Parse time slot to get day of week and hour
      const slotDate = new Date(timeSlot.date || new Date());
      const dayOfWeek = slotDate.getDay();
      const hour = timeSlot.hour || 0;

      // Check if any availability rule covers this time
      return availabilityRules.some(rule =>
        rule.enabled &&
        rule.dayOfWeek === dayOfWeek &&
        hour >= rule.startHour &&
        hour < rule.endHour
      );
    } catch (error) {
      console.warn('Error checking hardware schedule:', error);
      return true; // Default to available on error
    }
  }

  /**
   * Check hardware quantity availability
   * @param {Object} hardwareAssignment - Hardware assignment
   * @param {Object} timeSlot - Time slot to check
   * @param {Array} assignments - Current assignments
   * @returns {boolean} True if quantity available
   */
  checkHardwareQuantityAvailability(hardwareAssignment, timeSlot, assignments) {
    try {
      const hardwareInventory = this.dataService.getHardwareInventory();

      // Find hardware combination for this assignment
      const combination = this.findHardwareCombination(hardwareAssignment);
      if (!combination) return true; // If no combination found, assume available

      // Get inventory for this combination
      const inventory = hardwareInventory.find(inv =>
        inv.hardwareCombinationId === combination.id
      );

      if (!inventory) return true; // No inventory tracking = assume available

      // Count current usage in this time slot
      const currentUsage = assignments.filter(assignment =>
        assignment.timeSlot === timeSlot.id &&
        assignment.hardwareAssignment &&
        this.isSameHardwareCombination(assignment.hardwareAssignment, hardwareAssignment)
      ).length;

      // Check if we have available quantity
      return currentUsage < inventory.availableQuantity;
    } catch (error) {
      console.warn('Error checking hardware quantity:', error);
      return true; // Default to available on error
    }
  }

  /**
   * Find hardware combination that matches the assignment
   * @param {Object} hardwareAssignment - Hardware assignment
   * @returns {Object|null} Hardware combination
   */
  findHardwareCombination(hardwareAssignment) {
    try {
      const hardwareCombinations = this.dataService.getHardwareCombinations();

      return hardwareCombinations.find(combo => {
        const platformMatch = !hardwareAssignment.platform ||
          combo.platformId === hardwareAssignment.platform.id;
        const debuggerMatch = !hardwareAssignment.debugger ||
          combo.debuggerId === hardwareAssignment.debugger.id;

        return platformMatch && debuggerMatch && combo.enabled;
      });
    } catch (error) {
      console.warn('Error finding hardware combination:', error);
      return null;
    }
  }

  /**
   * Check if two hardware assignments use the same combination
   * @param {Object} assignment1 - First hardware assignment
   * @param {Object} assignment2 - Second hardware assignment
   * @returns {boolean} True if same combination
   */
  isSameHardwareCombination(assignment1, assignment2) {
    const platform1 = assignment1.platform?.id;
    const debugger1 = assignment1.debugger?.id;
    const platform2 = assignment2.platform?.id;
    const debugger2 = assignment2.debugger?.id;

    return platform1 === platform2 && debugger1 === debugger2;
  }

  /**
   * Allocate resources for a session
   * @param {Object} session - Session
   * @param {string} timeSlot - Time slot
   * @param {Object} machine - Machine
   * @param {Object} hardwareAssignment - Hardware assignment
   * @param {Object} hardware - Hardware inventory
   * @param {Array} machines - All machines
   * @returns {Object} Allocation result
   */
  allocateResources(session, timeSlot, machine, hardwareAssignment, hardware, machines) {
    try {
      // Allocate machine
      const machineResult = this.machineService.allocateMachine(machines, machine.id, session.id);
      if (!machineResult.success) {
        return machineResult;
      }

      // Allocate hardware
      const hardwareResult = this.hardwareService.allocateHardware(hardware, hardwareAssignment);
      if (!hardwareResult.success) {
        return hardwareResult;
      }

      return {
        success: true,
        machines: machineResult.machines,
        hardware: hardwareResult.hardware
      };

    } catch (error) {
      console.error('Error allocating resources:', error);
      return {
        success: false,
        error: 'Failed to allocate resources'
      };
    }
  }

  /**
   * Generate scheduling summary
   * @param {Array} sessions - All sessions
   * @param {Array} queue - Queued sessions
   * @returns {Object} Summary
   */
  generateSchedulingSummary(sessions, queue) {
    const scheduled = sessions.filter(s => s.status === 'scheduled');
    const pending = sessions.filter(s => s.status === 'pending');

    return {
      totalSessions: sessions.length,
      scheduledSessions: scheduled.length,
      pendingSessions: pending.length,
      queuedSessions: queue.length,
      schedulingRate: sessions.length > 0 
        ? ((scheduled.length / sessions.length) * 100).toFixed(1)
        : '0.0'
    };
  }

  /**
   * Emit scheduling progress
   * @param {string} message - Progress message
   * @param {number} percentage - Progress percentage
   */
  emitProgress(message, percentage) {
    if (this.socketService) {
      this.socketService.emitSchedulingProgress({
        message,
        percentage
      });
    }
  }

  /**
   * Detect scheduling conflicts
   * @param {Array} sessions - All sessions
   * @param {Object} hardware - Hardware inventory
   * @param {Array} machines - All machines
   * @param {Object} schedule - Current schedule
   * @returns {Array} Array of conflicts
   */
  detectConflicts(sessions, hardware, machines, schedule) {
    try {
      const conflicts = [];

      // Detect hardware conflicts
      const hardwareConflicts = this.hardwareService.detectHardwareConflicts(
        sessions, hardware, schedule
      );
      conflicts.push(...hardwareConflicts);

      // Detect machine conflicts
      const machineConflicts = this.detectMachineConflicts(machines, schedule);
      conflicts.push(...machineConflicts);

      return conflicts;

    } catch (error) {
      console.error('Error detecting conflicts:', error);
      return [];
    }
  }

  /**
   * Detect machine conflicts
   * @param {Array} machines - All machines
   * @param {Object} schedule - Current schedule
   * @returns {Array} Machine conflicts
   */
  detectMachineConflicts(machines, schedule) {
    const conflicts = [];
    const machineUsage = {};

    // Count machine usage per time slot
    schedule.assignments?.forEach(assignment => {
      if (!machineUsage[assignment.timeSlot]) {
        machineUsage[assignment.timeSlot] = {};
      }
      
      machineUsage[assignment.timeSlot][assignment.machineId] = 
        (machineUsage[assignment.timeSlot][assignment.machineId] || 0) + 1;
    });

    // Check for over-allocation
    Object.keys(machineUsage).forEach(timeSlot => {
      Object.keys(machineUsage[timeSlot]).forEach(machineId => {
        const usageCount = machineUsage[timeSlot][machineId];
        if (usageCount > 1) {
          const machine = machines.find(m => m.id === machineId);
          conflicts.push({
            type: 'machine_overallocation',
            timeSlot,
            machineId,
            machineName: machine?.name || 'Unknown',
            allocatedSessions: usageCount,
            maxCapacity: 1
          });
        }
      });
    });

    return conflicts;
  }

  /**
   * Optimize schedule to fill gaps and improve efficiency
   */
  optimizeSchedule(schedule) {
    try {
      // Sort assignments by start time to identify gaps
      const sortedAssignments = schedule.assignments
        .sort((a, b) => {
          const slotA = schedule.timeSlots.find(s => s.id === a.timeSlot);
          const slotB = schedule.timeSlots.find(s => s.id === b.timeSlot);
          return new Date(slotA.startTime) - new Date(slotB.startTime);
        });

      // Group assignments by machine to optimize per machine
      const assignmentsByMachine = {};
      sortedAssignments.forEach(assignment => {
        if (!assignmentsByMachine[assignment.machineId]) {
          assignmentsByMachine[assignment.machineId] = [];
        }
        assignmentsByMachine[assignment.machineId].push(assignment);
      });

      // Optimize each machine's schedule
      Object.keys(assignmentsByMachine).forEach(machineId => {
        this.optimizeMachineSchedule(machineId, assignmentsByMachine[machineId], schedule);
      });

      // Compact schedule to eliminate gaps
      this.compactSchedule(schedule);

      // Update time slot availability after optimization
      this.updateTimeSlotAvailability(schedule);

    } catch (error) {
      console.error('Schedule optimization error:', error);
    }
  }

  /**
   * Optimize schedule for a specific machine
   */
  optimizeMachineSchedule(machineId, assignments, schedule) {
    try {
      // Sort assignments by time
      const sortedAssignments = assignments.sort((a, b) => {
        const slotA = schedule.timeSlots.find(s => s.id === a.timeSlot);
        const slotB = schedule.timeSlots.find(s => s.id === b.timeSlot);
        return new Date(slotA.startTime) - new Date(slotB.startTime);
      });

      // Try to move assignments to fill gaps and start earlier
      for (let i = 0; i < sortedAssignments.length; i++) {
        const assignment = sortedAssignments[i];
        const earlierSlot = this.findEarlierAvailableSlot(assignment, schedule, machineId);

        if (earlierSlot) {
          // Move assignment to earlier slot
          assignment.timeSlot = earlierSlot.id;
          console.log(`Optimized: Moved session ${assignment.sessionId} to earlier slot ${earlierSlot.id}`);
        }
      }

    } catch (error) {
      console.error('Machine schedule optimization error:', error);
    }
  }

  /**
   * Find an earlier available slot for an assignment
   */
  findEarlierAvailableSlot(assignment, schedule, machineId) {
    try {
      const currentSlot = schedule.timeSlots.find(s => s.id === assignment.timeSlot);
      if (!currentSlot) return null;

      // Get all time slots before current slot
      const earlierSlots = schedule.timeSlots
        .filter(slot => new Date(slot.startTime) < new Date(currentSlot.startTime))
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime)); // Latest first

      // Check each earlier slot
      for (const slot of earlierSlots) {
        // Check if machine is available
        const machineConflict = schedule.assignments.some(a =>
          a.machineId === machineId && a.timeSlot === slot.id && a.id !== assignment.id
        );

        // Check if hardware is available
        let hardwareConflict = false;
        if (assignment.hardwareAssignment) {
          hardwareConflict = schedule.assignments.some(a => {
            if (!a.hardwareAssignment || a.id === assignment.id) return false;

            const debuggerConflict = assignment.hardwareAssignment.debugger &&
              a.hardwareAssignment.debugger &&
              a.hardwareAssignment.debugger.id === assignment.hardwareAssignment.debugger.id;

            const platformConflict = assignment.hardwareAssignment.platform &&
              a.hardwareAssignment.platform &&
              a.hardwareAssignment.platform.id === assignment.hardwareAssignment.platform.id;

            return (debuggerConflict || platformConflict) && a.timeSlot === slot.id;
          });
        }

        if (!machineConflict && !hardwareConflict) {
          return slot;
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding earlier slot:', error);
      return null;
    }
  }

  /**
   * Update time slot availability based on current assignments
   */
  updateTimeSlotAvailability(schedule) {
    try {
      // Reset all slots to available
      schedule.timeSlots.forEach(slot => {
        slot.available = true;
      });

      // Mark occupied slots as unavailable
      schedule.assignments.forEach(assignment => {
        const slot = schedule.timeSlots.find(s => s.id === assignment.timeSlot);
        if (slot) {
          slot.available = false;
        }
      });

    } catch (error) {
      console.error('Error updating time slot availability:', error);
    }
  }

  /**
   * Compact schedule to eliminate gaps and start sessions as early as possible
   */
  compactSchedule(schedule) {
    try {
      // Sort all assignments by current start time
      const allAssignments = schedule.assignments.sort((a, b) => {
        const slotA = schedule.timeSlots.find(s => s.id === a.timeSlot);
        const slotB = schedule.timeSlots.find(s => s.id === b.timeSlot);
        return new Date(slotA.startTime) - new Date(slotB.startTime);
      });

      // Try to move each assignment to the earliest possible slot
      allAssignments.forEach(assignment => {
        const earliestSlot = this.findEarliestAvailableSlot(assignment, schedule);
        if (earliestSlot && earliestSlot.id !== assignment.timeSlot) {
          console.log(`Compacting: Moved session ${assignment.sessionId} from ${assignment.timeSlot} to ${earliestSlot.id}`);
          assignment.timeSlot = earliestSlot.id;
        }
      });

    } catch (error) {
      console.error('Schedule compacting error:', error);
    }
  }

  /**
   * Find the earliest available slot for an assignment
   */
  findEarliestAvailableSlot(assignment, schedule) {
    try {
      // Get all time slots sorted by start time
      const sortedSlots = schedule.timeSlots
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

      // Check each slot from earliest to latest
      for (const slot of sortedSlots) {
        // Skip if this is the current slot
        if (slot.id === assignment.timeSlot) continue;

        // Check if machine is available
        const machineConflict = schedule.assignments.some(a =>
          a.machineId === assignment.machineId &&
          a.timeSlot === slot.id &&
          a.id !== assignment.id
        );

        // Check if hardware is available
        let hardwareConflict = false;
        if (assignment.hardwareAssignment) {
          hardwareConflict = schedule.assignments.some(a => {
            if (!a.hardwareAssignment || a.id === assignment.id) return false;

            const debuggerConflict = assignment.hardwareAssignment.debugger &&
              a.hardwareAssignment.debugger &&
              a.hardwareAssignment.debugger.id === assignment.hardwareAssignment.debugger.id;

            const platformConflict = assignment.hardwareAssignment.platform &&
              a.hardwareAssignment.platform &&
              a.hardwareAssignment.platform.id === assignment.hardwareAssignment.platform.id;

            return (debuggerConflict || platformConflict) && a.timeSlot === slot.id;
          });
        }

        if (!machineConflict && !hardwareConflict) {
          return slot;
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding earliest slot:', error);
      return null;
    }
  }

  /**
   * Find available hardware combination for a session using new comprehensive system
   */
  findAvailableHardwareCombination(session, schedule) {
    try {
      const hwReq = session.hardwareRequirements;

      // If session doesn't require hardware, return success
      if (!hwReq || (!hwReq.platform && !hwReq.debugger)) {
        return {
          success: true,
          hardwareCombination: null
        };
      }

      // Get all hardware combinations
      const combinations = this.dataService.getHardwareCombinations();
      const inventory = this.dataService.getHardwareInventory();
      const availability = this.dataService.getHardwareAvailability();

      // Find matching combinations
      const matchingCombinations = combinations.filter(combination => {
        if (!combination.enabled) return false;

        const platform = this.dataService.getPlatform(combination.platformId);
        const debuggerItem = this.dataService.getDebugger(combination.debuggerId);

        // Check if combination matches session requirements
        const platformMatch = !hwReq.platform || (platform && platform.name === hwReq.platform);
        const debuggerMatch = !hwReq.debugger || (debuggerItem && debuggerItem.name === hwReq.debugger);

        return platformMatch && debuggerMatch;
      });

      if (matchingCombinations.length === 0) {
        return {
          success: false,
          error: `No hardware combination found for platform: ${hwReq.platform}, debugger: ${hwReq.debugger}`
        };
      }

      // Check inventory availability for each matching combination
      for (const combination of matchingCombinations) {
        const inventoryItem = inventory.find(inv => inv.hardwareCombinationId === combination.id);

        if (!inventoryItem || inventoryItem.availableQuantity <= 0) {
          continue; // Skip if no inventory available
        }

        // Check if combination is available during scheduling time
        // For now, we'll assume it's available - time-based checking will be added later
        const availabilityItems = availability.filter(avail =>
          avail.hardwareCombinationId === combination.id && avail.enabled
        );

        if (availabilityItems.length === 0) {
          continue; // Skip if no availability schedule
        }

        // Found a suitable combination
        return {
          success: true,
          hardwareCombination: combination,
          inventory: inventoryItem,
          availability: availabilityItems
        };
      }

      return {
        success: false,
        error: 'No available hardware combinations with sufficient inventory'
      };

    } catch (error) {
      console.error('Error finding hardware combination:', error);
      return {
        success: false,
        error: 'Failed to check hardware availability'
      };
    }
  }

  /**
   * Enhanced Auto-Schedule with advanced options
   */
  async enhancedAutoSchedule(sessions, hardware, machines, currentSchedule, options) {
    try {
      this.emitProgress('Starting enhanced auto-scheduling...', 0);

      const { type, startDateTime, expectedHours, optimizationMode, allowOvertime, prioritizeHardware, enableMultiDay } = options;

      console.log(`Enhanced auto-schedule: ${type} mode`);
      console.log(`Start: ${startDateTime}`);
      console.log(`Optimization: ${optimizationMode}`);

      // Filter pending sessions
      const pendingSessions = sessions.filter(s => s.status === 'pending');

      if (pendingSessions.length === 0) {
        return {
          success: false,
          error: 'No pending sessions to schedule'
        };
      }

      // Sort sessions by priority and estimated time
      const sortedSessions = this.sortSessionsForEnhancedScheduling(pendingSessions, optimizationMode);

      let schedule = { ...currentSchedule };
      let scheduledCount = 0;
      let totalEstimatedTime = 0;

      // Calculate time window
      const startTime = new Date(startDateTime);
      let endTime = null;

      if (type === 'limited') {
        endTime = new Date(startTime);
        endTime.setHours(endTime.getHours() + expectedHours);
        console.log(`Time window: ${startTime} to ${endTime}`);
      }

      // Enhanced scheduling logic
      for (let i = 0; i < sortedSessions.length; i++) {
        const session = sortedSessions[i];

        this.emitProgress(`Scheduling session ${i + 1}/${sortedSessions.length}: ${session.name}`,
          (i / sortedSessions.length) * 100);

        // For now, use basic scheduling logic (enhanced logic can be added later)
        const scheduleResult = await this.scheduleSession(session.id, null, null, null, sessions, machines, hardware, schedule);

        if (scheduleResult.success) {
          schedule = scheduleResult.schedule;
          scheduledCount++;
          totalEstimatedTime += session.estimatedTime || 1;
        }
      }

      this.emitProgress('Enhanced auto-scheduling completed', 100);

      // Calculate statistics
      const statistics = {
        totalSessions: pendingSessions.length,
        scheduledSessions: scheduledCount,
        unscheduledSessions: pendingSessions.length - scheduledCount,
        totalEstimatedTime,
        schedulingMode: type,
        optimizationMode
      };

      const message = `Enhanced ${type} scheduling completed: ${scheduledCount}/${pendingSessions.length} sessions scheduled`;

      return {
        success: true,
        schedule,
        sessions: sessions,
        scheduledSessions: scheduledCount,
        message,
        statistics
      };

    } catch (error) {
      console.error('Enhanced auto-schedule error:', error);
      this.emitProgress('Enhanced auto-scheduling failed', 0);

      return {
        success: false,
        error: error.message || 'Enhanced auto-scheduling failed'
      };
    }
  }

  sortSessionsForEnhancedScheduling(sessions, optimizationMode) {
    return sessions.sort((a, b) => {
      switch (optimizationMode) {
        case 'efficiency':
          // Prioritize by hardware requirements and priority
          const aHardwareScore = (a.requiresHardware ? 2 : 0) + this.getPriorityScore(a.priority);
          const bHardwareScore = (b.requiresHardware ? 2 : 0) + this.getPriorityScore(b.priority);
          return bHardwareScore - aHardwareScore;

        case 'speed':
          // Prioritize shorter sessions first
          return (a.estimatedTime || 1) - (b.estimatedTime || 1);

        case 'balanced':
        default:
          // Balance priority and estimated time
          const aScore = this.getPriorityScore(a.priority) * 2 - (a.estimatedTime || 1) * 0.1;
          const bScore = this.getPriorityScore(b.priority) * 2 - (b.estimatedTime || 1) * 0.1;
          return bScore - aScore;
      }
    });
  }
}

module.exports = SchedulingService;
