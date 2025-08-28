const { v4: uuidv4 } = require('uuid');

class MachineService {
  constructor(dataService) {
    this.dataService = dataService;
  }

  /**
   * Generate machines based on machine types configuration
   * PRESERVES existing machine IDs to maintain session assignments
   * @param {Array} machineTypes - Array of machine type configurations
   * @param {Array} existingMachines - Optional existing machines to preserve IDs
   * @returns {Array} Generated machines
   */
  _generateMachinesInternal(machineTypes, existingMachines = []) {
    try {
      const machines = [];
      
      // Create lookup maps for existing machines
      const existingByName = new Map();
      const existingByOsAndIndex = new Map();
      
      existingMachines.forEach(machine => {
        existingByName.set(machine.name, machine);
        
        // Extract OS type and index from name (e.g., "Ubuntu 24.04-01" -> "Ubuntu 24.04", 1)
        const nameMatch = machine.name.match(/^(.+)-(\d+)$/);
        if (nameMatch) {
          const osType = nameMatch[1];
          const index = parseInt(nameMatch[2]);
          const key = `${osType}-${index}`;
          existingByOsAndIndex.set(key, machine);
        }
      });

      machineTypes.forEach(machineType => {
        for (let i = 1; i <= machineType.quantity; i++) {
          const machineName = `${machineType.osType}-${i.toString().padStart(2, '0')}`;
          const osIndexKey = `${machineType.osType}-${i}`;
          
          // Check if machine already exists (preserve ID)
          let existingMachine = existingByName.get(machineName) || existingByOsAndIndex.get(osIndexKey);
          
          const machine = {
            id: existingMachine ? existingMachine.id : this.generateStableMachineId(machineType.osType, i),
            name: machineName,
            osType: machineType.osType,
            status: existingMachine ? existingMachine.status || 'available' : 'available',
            currentSession: existingMachine ? existingMachine.currentSession : null,
            capabilities: this.getMachineCapabilities(machineType.osType),
            createdAt: existingMachine ? existingMachine.createdAt : new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          };

          machines.push(machine);
        }
      });

      console.log(`Generated ${machines.length} machines, preserved ${existingMachines.length} existing IDs`);
      return machines;

    } catch (error) {
      console.error('Error generating machines:', error);
      return [];
    }
  }

  /**
   * Generate stable machine ID based on OS type and index
   * This ensures consistent IDs across server restarts
   * @param {string} osType - Operating system type  
   * @param {number} index - Machine index
   * @returns {string} Stable machine ID
   */
  generateStableMachineId(osType, index) {
    // Create predictable but unique ID based on OS type and index
    const normalizedOs = osType.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const paddedIndex = index.toString().padStart(2, '0');
    return `${normalizedOs}-${paddedIndex}`;
  }

  /**
   * IMPORTANT: This method should ONLY be called manually by user
   * NOT automatically on startup to prevent machine ID changes
   */
  generateMachines(machineTypes, existingMachines = []) {
    console.log('⚠️ WARNING: Machine generation called! This should be manual only.');
    console.log('Machine types:', machineTypes.map(t => `${t.osType}: ${t.quantity}`));
    console.log('Existing machines:', existingMachines.length);
    
    // Only allow generation if explicitly requested
    if (!machineTypes || machineTypes.length === 0) {
      console.log('❌ No machine types provided - refusing to generate');
      return existingMachines;
    }
    
    return this._generateMachinesInternal(machineTypes, existingMachines);
  }



  /**
   * Get machine capabilities based on OS type
   * @param {string} osType - Operating system type
   * @returns {Object} Machine capabilities
   */
  getMachineCapabilities(osType) {
    const baseCapabilities = {
      maxConcurrentSessions: 1,
      supportedPlatforms: [],
      supportedDebuggers: []
    };

    // OS-specific capabilities can be defined here
    switch (osType.toLowerCase()) {
      case 'windows 11':
      case 'windows 10':
      case 'windows':
        return {
          ...baseCapabilities,
          supportedPlatforms: ['Platform_A', 'Platform_B', 'Platform_C'],
          supportedDebuggers: ['S32_DBG', 'Segger', 'PNE'],
          features: ['GUI_Testing', 'Performance_Testing', 'Compatibility_Testing']
        };

      case 'ubuntu 24.04':
      case 'ubuntu 22.04':
      case 'ubuntu':
      case 'linux':
        return {
          ...baseCapabilities,
          supportedPlatforms: ['Platform_A', 'Platform_C'],
          supportedDebuggers: ['S32_DBG', 'PNE'],
          features: ['CLI_Testing', 'Performance_Testing', 'Security_Testing']
        };

      default:
        return baseCapabilities;
    }
  }

  /**
   * Find available machines for a specific OS type
   * @param {Array} machines - All machines
   * @param {string} osType - Required OS type
   * @returns {Array} Available machines
   */
  findAvailableMachines(machines, osType) {
    return machines.filter(machine => 
      machine.osType === osType && machine.status === 'available'
    );
  }

  /**
   * Allocate a machine for a session
   * @param {Array} machines - All machines
   * @param {string} machineId - Machine ID to allocate
   * @param {string} sessionId - Session ID
   * @returns {Object} Result of allocation
   */
  allocateMachine(machines, machineId, sessionId) {
    try {
      const machineIndex = machines.findIndex(machine => machine.id === machineId);
      
      if (machineIndex === -1) {
        return {
          success: false,
          error: 'Machine not found'
        };
      }

      const machine = machines[machineIndex];

      if (machine.status !== 'available') {
        return {
          success: false,
          error: `Machine ${machine.name} is not available (status: ${machine.status})`
        };
      }

      // Update machine status
      machines[machineIndex] = {
        ...machine,
        status: 'busy',
        currentSession: sessionId,
        lastUpdated: new Date().toISOString()
      };

      return {
        success: true,
        machine: machines[machineIndex],
        machines
      };

    } catch (error) {
      console.error('Error allocating machine:', error);
      return {
        success: false,
        error: 'Failed to allocate machine'
      };
    }
  }

  /**
   * Release a machine from a session
   * @param {Array} machines - All machines
   * @param {string} machineId - Machine ID to release
   * @returns {Object} Result of release
   */
  releaseMachine(machines, machineId) {
    try {
      const machineIndex = machines.findIndex(machine => machine.id === machineId);
      
      if (machineIndex === -1) {
        return {
          success: false,
          error: 'Machine not found'
        };
      }

      // Update machine status
      machines[machineIndex] = {
        ...machines[machineIndex],
        status: 'available',
        currentSession: null,
        lastUpdated: new Date().toISOString()
      };

      return {
        success: true,
        machine: machines[machineIndex],
        machines
      };

    } catch (error) {
      console.error('Error releasing machine:', error);
      return {
        success: false,
        error: 'Failed to release machine'
      };
    }
  }

  /**
   * Get machine utilization statistics
   * @param {Array} machines - All machines
   * @returns {Object} Utilization statistics
   */
  getMachineUtilization(machines) {
    try {
      const stats = {};

      machines.forEach(machine => {
        if (!stats[machine.osType]) {
          stats[machine.osType] = {
            total: 0,
            available: 0,
            busy: 0,
            maintenance: 0
          };
        }

        stats[machine.osType].total++;
        stats[machine.osType][machine.status]++;
      });

      // Calculate utilization rates
      Object.keys(stats).forEach(osType => {
        const osStats = stats[osType];
        osStats.utilizationRate = osStats.total > 0 
          ? ((osStats.busy / osStats.total) * 100).toFixed(1)
          : '0.0';
      });

      return stats;

    } catch (error) {
      console.error('Error calculating machine utilization:', error);
      return {};
    }
  }

  /**
   * Find best machine for a session
   * @param {Array} machines - All machines
   * @param {Object} session - Session requirements
   * @returns {Object} Best machine match
   */
  findBestMachine(machines, session) {
    try {
      // Filter machines by OS type and availability
      const availableMachines = machines.filter(machine => 
        machine.osType === session.os && machine.status === 'available'
      );

      if (availableMachines.length === 0) {
        return {
          success: false,
          error: `No available machines found for OS type: ${session.os}`
        };
      }

      // For now, return the first available machine
      // In the future, this could include more sophisticated matching logic
      // based on machine capabilities, load balancing, etc.
      const bestMachine = availableMachines[0];

      return {
        success: true,
        machine: bestMachine
      };

    } catch (error) {
      console.error('Error finding best machine:', error);
      return {
        success: false,
        error: 'Failed to find suitable machine'
      };
    }
  }

  /**
   * Validate machine configuration
   * @param {Object} machineType - Machine type configuration
   * @returns {Object} Validation result
   */
  validateMachineType(machineType) {
    try {
      const errors = [];

      if (!machineType.osType || typeof machineType.osType !== 'string') {
        errors.push('OS type is required and must be a string');
      }

      if (!machineType.quantity || typeof machineType.quantity !== 'number' || machineType.quantity < 1) {
        errors.push('Quantity is required and must be a positive number');
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

  /**
   * Get machine summary for display
   * @param {Array} machines - All machines
   * @param {Array} machineTypes - Machine type configurations
   * @returns {Object} Summary information
   */
  getMachineSummary(machines, machineTypes) {
    try {
      const utilization = this.getMachineUtilization(machines);
      
      const summary = {
        totalMachines: machines.length,
        totalTypes: machineTypes.length,
        byType: {},
        overall: {
          available: 0,
          busy: 0,
          maintenance: 0
        }
      };

      // Calculate overall stats
      machines.forEach(machine => {
        summary.overall[machine.status]++;
      });

      // Calculate by type
      machineTypes.forEach(type => {
        const typeMachines = machines.filter(m => m.osType === type.osType);
        summary.byType[type.osType] = {
          configured: type.quantity,
          actual: typeMachines.length,
          available: typeMachines.filter(m => m.status === 'available').length,
          busy: typeMachines.filter(m => m.status === 'busy').length,
          maintenance: typeMachines.filter(m => m.status === 'maintenance').length,
          utilizationRate: utilization[type.osType]?.utilizationRate || '0.0'
        };
      });

      return summary;

    } catch (error) {
      console.error('Error getting machine summary:', error);
      return {
        totalMachines: 0,
        totalTypes: 0,
        byType: {},
        overall: { available: 0, busy: 0, maintenance: 0 }
      };
    }
  }
}

module.exports = MachineService;
