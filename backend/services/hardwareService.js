const { v4: uuidv4 } = require('uuid');

class HardwareService {
  constructor(dataService) {
    this.dataService = dataService;
  }

  /**
   * Check if a session requires hardware
   * Hardware is required ONLY when BOTH debugger AND platform are present
   * @param {Object} session - Session object
   * @returns {boolean} True if hardware is required
   */
  requiresHardware(session) {
    return !!(session.debugger && session.platform);
  }

  /**
   * Find available hardware for a session
   * @param {Object} hardware - Hardware inventory
   * @param {Object} session - Session requiring hardware
   * @returns {Object} Available hardware assignment
   */
  findAvailableHardware(hardware, session) {
    try {
      if (!this.requiresHardware(session)) {
        return {
          success: true,
          assignment: null,
          message: 'No hardware required for this session'
        };
      }

      // Find available debugger
      const availableDebugger = hardware.debuggers.find(debuggerItem =>
        debuggerItem.name === session.debugger && debuggerItem.available > 0
      );

      if (!availableDebugger) {
        return {
          success: false,
          error: `No available debugger: ${session.debugger}`,
          required: { debugger: session.debugger, platform: session.platform }
        };
      }

      // Find available platform
      const availablePlatform = hardware.platforms.find(platformItem =>
        platformItem.name === session.platform && platformItem.available > 0
      );

      if (!availablePlatform) {
        return {
          success: false,
          error: `No available platform: ${session.platform}`,
          required: { debugger: session.debugger, platform: session.platform }
        };
      }

      return {
        success: true,
        assignment: {
          debugger: {
            id: availableDebugger.id,
            name: availableDebugger.name
          },
          platform: {
            id: availablePlatform.id,
            name: availablePlatform.name
          }
        }
      };

    } catch (error) {
      console.error('Error finding available hardware:', error);
      return {
        success: false,
        error: 'Failed to find available hardware'
      };
    }
  }

  /**
   * Allocate hardware for a session
   * @param {Object} hardware - Hardware inventory
   * @param {Object} assignment - Hardware assignment
   * @returns {Object} Updated hardware inventory
   */
  allocateHardware(hardware, assignment) {
    try {
      if (!assignment) {
        return {
          success: true,
          hardware,
          message: 'No hardware allocation needed'
        };
      }

      const updatedHardware = {
        debuggers: [...hardware.debuggers],
        platforms: [...hardware.platforms]
      };

      // Allocate debugger
      if (assignment.debugger) {
        const debuggerIndex = updatedHardware.debuggers.findIndex(
          item => item.id === assignment.debugger.id
        );
        
        if (debuggerIndex !== -1) {
          if (updatedHardware.debuggers[debuggerIndex].available > 0) {
            updatedHardware.debuggers[debuggerIndex].available--;
          } else {
            return {
              success: false,
              error: `Debugger ${assignment.debugger.name} is no longer available`
            };
          }
        }
      }

      // Allocate platform
      if (assignment.platform) {
        const platformIndex = updatedHardware.platforms.findIndex(
          item => item.id === assignment.platform.id
        );
        
        if (platformIndex !== -1) {
          if (updatedHardware.platforms[platformIndex].available > 0) {
            updatedHardware.platforms[platformIndex].available--;
          } else {
            return {
              success: false,
              error: `Platform ${assignment.platform.name} is no longer available`
            };
          }
        }
      }

      return {
        success: true,
        hardware: updatedHardware
      };

    } catch (error) {
      console.error('Error allocating hardware:', error);
      return {
        success: false,
        error: 'Failed to allocate hardware'
      };
    }
  }

  /**
   * Release hardware from a session
   * @param {Object} hardware - Hardware inventory
   * @param {Object} assignment - Hardware assignment to release
   * @returns {Object} Updated hardware inventory
   */
  releaseHardware(hardware, assignment) {
    try {
      if (!assignment) {
        return {
          success: true,
          hardware,
          message: 'No hardware to release'
        };
      }

      const updatedHardware = {
        debuggers: [...hardware.debuggers],
        platforms: [...hardware.platforms]
      };

      // Release debugger
      if (assignment.debugger) {
        const debuggerIndex = updatedHardware.debuggers.findIndex(
          item => item.id === assignment.debugger.id
        );
        
        if (debuggerIndex !== -1) {
          const debuggerItem = updatedHardware.debuggers[debuggerIndex];
          if (debuggerItem.available < debuggerItem.quantity) {
            updatedHardware.debuggers[debuggerIndex].available++;
          }
        }
      }

      // Release platform
      if (assignment.platform) {
        const platformIndex = updatedHardware.platforms.findIndex(
          item => item.id === assignment.platform.id
        );
        
        if (platformIndex !== -1) {
          const platform = updatedHardware.platforms[platformIndex];
          if (platform.available < platform.quantity) {
            updatedHardware.platforms[platformIndex].available++;
          }
        }
      }

      return {
        success: true,
        hardware: updatedHardware
      };

    } catch (error) {
      console.error('Error releasing hardware:', error);
      return {
        success: false,
        error: 'Failed to release hardware'
      };
    }
  }

  /**
   * Get hardware usage statistics
   * @param {Object} hardware - Hardware inventory
   * @returns {Object} Usage statistics
   */
  getHardwareUsage(hardware) {
    try {
      const usage = {
        debuggers: hardware.debuggers.map(item => ({
          id: item.id,
          name: item.name,
          total: item.quantity,
          available: item.available,
          used: item.quantity - item.available,
          utilizationRate: item.quantity > 0 
            ? ((item.quantity - item.available) / item.quantity * 100).toFixed(1)
            : '0.0',
          source: item.source || 'manual'
        })),
        platforms: hardware.platforms.map(item => ({
          id: item.id,
          name: item.name,
          total: item.quantity,
          available: item.available,
          used: item.quantity - item.available,
          utilizationRate: item.quantity > 0 
            ? ((item.quantity - item.available) / item.quantity * 100).toFixed(1)
            : '0.0',
          source: item.source || 'manual'
        }))
      };

      return usage;

    } catch (error) {
      console.error('Error getting hardware usage:', error);
      return {
        debuggers: [],
        platforms: []
      };
    }
  }

  /**
   * Detect hardware conflicts for scheduling
   * @param {Array} sessions - Sessions to check
   * @param {Object} hardware - Hardware inventory
   * @param {Object} schedule - Current schedule
   * @returns {Array} Array of conflicts
   */
  detectHardwareConflicts(sessions, hardware, schedule) {
    try {
      const conflicts = [];
      const timeSlotUsage = {};

      // Analyze current schedule for hardware usage per time slot
      schedule.assignments?.forEach(assignment => {
        if (!timeSlotUsage[assignment.timeSlot]) {
          timeSlotUsage[assignment.timeSlot] = {
            debuggers: {},
            platforms: {}
          };
        }

        if (assignment.hardwareAssignment) {
          const { debugger: debuggerAssignment, platform } = assignment.hardwareAssignment;
          
          if (debuggerAssignment) {
            timeSlotUsage[assignment.timeSlot].debuggers[debuggerAssignment.name] =
              (timeSlotUsage[assignment.timeSlot].debuggers[debuggerAssignment.name] || 0) + 1;
          }
          
          if (platform) {
            timeSlotUsage[assignment.timeSlot].platforms[platform.name] = 
              (timeSlotUsage[assignment.timeSlot].platforms[platform.name] || 0) + 1;
          }
        }
      });

      // Check for potential conflicts
      Object.keys(timeSlotUsage).forEach(timeSlot => {
        const slotUsage = timeSlotUsage[timeSlot];

        // Check debugger conflicts
        Object.keys(slotUsage.debuggers).forEach(debuggerName => {
          const usedCount = slotUsage.debuggers[debuggerName];
          const debuggerItem = hardware.debuggers.find(d => d.name === debuggerName);
          
          if (debuggerItem && usedCount > debuggerItem.quantity) {
            conflicts.push({
              type: 'hardware_overallocation',
              timeSlot,
              hardwareType: 'debugger',
              hardwareName: debuggerName,
              required: usedCount,
              available: debuggerItem.quantity,
              excess: usedCount - debuggerItem.quantity
            });
          }
        });

        // Check platform conflicts
        Object.keys(slotUsage.platforms).forEach(platformName => {
          const usedCount = slotUsage.platforms[platformName];
          const platformItem = hardware.platforms.find(p => p.name === platformName);
          
          if (platformItem && usedCount > platformItem.quantity) {
            conflicts.push({
              type: 'hardware_overallocation',
              timeSlot,
              hardwareType: 'platform',
              hardwareName: platformName,
              required: usedCount,
              available: platformItem.quantity,
              excess: usedCount - platformItem.quantity
            });
          }
        });
      });

      return conflicts;

    } catch (error) {
      console.error('Error detecting hardware conflicts:', error);
      return [];
    }
  }

  /**
   * Suggest hardware optimization
   * @param {Array} sessions - All sessions
   * @param {Object} hardware - Current hardware inventory
   * @returns {Object} Optimization suggestions
   */
  suggestHardwareOptimization(sessions, hardware) {
    try {
      const requirements = {};
      
      // Analyze hardware requirements from sessions
      sessions.forEach(session => {
        if (this.requiresHardware(session)) {
          if (session.debugger) {
            requirements[session.debugger] = (requirements[session.debugger] || 0) + 1;
          }
          if (session.platform) {
            requirements[session.platform] = (requirements[session.platform] || 0) + 1;
          }
        }
      });

      const suggestions = {
        debuggers: [],
        platforms: []
      };

      // Check debugger requirements vs availability
      Object.keys(requirements).forEach(name => {
        const debuggerItem = hardware.debuggers.find(d => d.name === name);
        if (debuggerItem) {
          const requiredCount = requirements[name];
          if (requiredCount > debuggerItem.quantity) {
            suggestions.debuggers.push({
              name,
              currentQuantity: debuggerItem.quantity,
              suggestedQuantity: requiredCount,
              reason: `${requiredCount - debuggerItem.quantity} additional units needed for concurrent sessions`
            });
          }
        } else {
          suggestions.debuggers.push({
            name,
            currentQuantity: 0,
            suggestedQuantity: requirements[name],
            reason: 'Hardware not found in inventory'
          });
        }
      });

      // Similar analysis for platforms would go here
      // (simplified for brevity)

      return suggestions;

    } catch (error) {
      console.error('Error suggesting hardware optimization:', error);
      return {
        debuggers: [],
        platforms: []
      };
    }
  }

  /**
   * Validate hardware assignment
   * @param {Object} assignment - Hardware assignment to validate
   * @param {Object} hardware - Hardware inventory
   * @returns {Object} Validation result
   */
  validateHardwareAssignment(assignment, hardware) {
    try {
      if (!assignment) {
        return { success: true, message: 'No hardware assignment to validate' };
      }

      const errors = [];

      // Validate debugger
      if (assignment.debugger) {
        const debuggerItem = hardware.debuggers.find(d => d.id === assignment.debugger.id);
        if (!debuggerItem) {
          errors.push(`Debugger not found: ${assignment.debugger.name}`);
        } else if (debuggerItem.available <= 0) {
          errors.push(`Debugger not available: ${assignment.debugger.name}`);
        }
      }

      // Validate platform
      if (assignment.platform) {
        const platform = hardware.platforms.find(p => p.id === assignment.platform.id);
        if (!platform) {
          errors.push(`Platform not found: ${assignment.platform.name}`);
        } else if (platform.available <= 0) {
          errors.push(`Platform not available: ${assignment.platform.name}`);
        }
      }

      return {
        success: errors.length === 0,
        errors
      };

    } catch (error) {
      return {
        success: false,
        errors: ['Validation failed: ' + error.message]
      };
    }
  }
}

module.exports = HardwareService;
