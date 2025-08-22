/**
 * Comprehensive Database Schema for Resource Management System
 * Includes all tables for inventory management and resource tracking
 */

class DatabaseSchema {
  constructor() {
    this.initializeSchema();
  }

  initializeSchema() {
    // Core resource tables
    this.machines = new Map();
    this.platforms = new Map();
    this.debuggers = new Map();
    this.sessions = new Map();
    this.executions = new Map();
    
    // Hardware management tables
    this.hardwareCombinations = new Map();
    this.hardwareInventory = new Map();
    this.hardwareAvailability = new Map();
    
    // Supporting tables
    this.timeSlots = new Map();
    this.scheduleHistory = new Map();
    this.resourceAllocations = new Map();
    
    this.initializeDefaultData();
  }

  initializeDefaultData() {
    // Initialize with some default data structure
    this.createDefaultTimeSlots();
  }

  createDefaultTimeSlots() {
    // Create time slots for scheduling
    const days = 7;
    const hoursPerDay = 24;
    
    for (let day = 0; day < days; day++) {
      for (let hour = 0; hour < hoursPerDay; hour++) {
        const slotId = `slot-${day}-${hour}`;
        const type = (hour >= 6 && hour < 18) ? 'day' : 'night';
        
        this.timeSlots.set(slotId, {
          id: slotId,
          day: day,
          hour: hour,
          type: type,
          startTime: this.calculateSlotTime(day, hour),
          endTime: this.calculateSlotTime(day, hour + 1),
          available: true,
          createdAt: new Date().toISOString()
        });
      }
    }
  }

  calculateSlotTime(day, hour) {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + day);
    baseDate.setHours(hour, 0, 0, 0);
    return baseDate.toISOString();
  }

  // Machine Management
  createMachine(machineData) {
    const machine = {
      id: this.generateId(),
      name: machineData.name,
      osType: machineData.osType,
      quantity: machineData.quantity || 1,
      status: machineData.status || 'available',
      specifications: machineData.specifications || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.machines.set(machine.id, machine);
    return machine;
  }

  // Platform Management
  createPlatform(platformData) {
    const platform = {
      id: this.generateId(),
      name: platformData.name,
      type: platformData.type || 'hardware',
      quantityInStock: platformData.quantityInStock || 0,
      quantityAllocated: 0,
      specifications: platformData.specifications || {},
      vendor: platformData.vendor || '',
      model: platformData.model || '',
      status: platformData.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.platforms.set(platform.id, platform);
    return platform;
  }

  // Debugger Management
  createDebugger(debuggerData) {
    const debuggerItem = {
      id: this.generateId(),
      name: debuggerData.name,
      type: debuggerData.type || 'hardware',
      quantityInStock: debuggerData.quantityInStock || 0,
      quantityAllocated: 0,
      supportedPlatforms: debuggerData.supportedPlatforms || [],
      specifications: debuggerData.specifications || {},
      vendor: debuggerData.vendor || '',
      model: debuggerData.model || '',
      status: debuggerData.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.debuggers.set(debuggerItem.id, debuggerItem);
    return debuggerItem;
  }

  // Session Management
  createSession(sessionData) {
    const session = {
      id: this.generateId(),
      name: sessionData.name,
      description: sessionData.description || '',
      estimatedTime: sessionData.estimatedTime || 1,
      priority: sessionData.priority || 'normal',
      status: sessionData.status || 'pending',
      requiredOS: sessionData.requiredOS || '',
      hardwareRequirements: {
        platform: sessionData.hardwareRequirements?.platform || null,
        debugger: sessionData.hardwareRequirements?.debugger || null,
        combination: sessionData.hardwareRequirements?.combination || null
      },
      executionRequirements: sessionData.executionRequirements || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.sessions.set(session.id, session);
    return session;
  }

  // Execution Management
  createExecution(executionData) {
    const execution = {
      id: this.generateId(),
      sessionId: executionData.sessionId,
      machineId: executionData.machineId,
      timeSlotId: executionData.timeSlotId,
      hardwareCombinationId: executionData.hardwareCombinationId,
      status: executionData.status || 'scheduled',
      startTime: executionData.startTime,
      endTime: executionData.endTime,
      actualStartTime: null,
      actualEndTime: null,
      resourceAllocations: executionData.resourceAllocations || {},
      metadata: executionData.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.executions.set(execution.id, execution);
    return execution;
  }

  // Hardware Combination Management
  createHardwareCombination(combinationData) {
    const defaultHourly = {};
    for (let h = 0; h < 24; h++) defaultHourly[String(h)] = true;

    const combination = {
      id: this.generateId(),
      name: combinationData.name,
      platformId: combinationData.platformId,
      debuggerId: combinationData.debuggerId,
      mode: combinationData.mode || 'NA',
      platformsSupported: Array.isArray(combinationData.platformsSupported) && combinationData.platformsSupported.length > 0
        ? Array.from(new Set(combinationData.platformsSupported))
        : [],
      totalAvailableHours: typeof combinationData.totalAvailableHours === 'number' ? combinationData.totalAvailableHours : 24,
      hourlyAvailability: combinationData.hourlyAvailability || defaultHourly,
      enabled: combinationData.enabled !== false,
      priority: combinationData.priority || 'normal',
      description: combinationData.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.hardwareCombinations.set(combination.id, combination);
    return combination;
  }

  // Hardware Inventory Management
  createHardwareInventory(inventoryData) {
    const inventory = {
      id: this.generateId(),
      hardwareCombinationId: inventoryData.hardwareCombinationId,
      totalQuantity: inventoryData.totalQuantity || 0,
      availableQuantity: inventoryData.availableQuantity || 0,
      allocatedQuantity: inventoryData.allocatedQuantity || 0,
      reservedQuantity: inventoryData.reservedQuantity || 0,
      location: inventoryData.location || '',
      status: inventoryData.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.hardwareInventory.set(inventory.id, inventory);
    return inventory;
  }

  // Hardware Availability Management
  createHardwareAvailability(availabilityData) {
    const availability = {
      id: this.generateId(),
      hardwareCombinationId: availabilityData.hardwareCombinationId,
      dayOfWeek: availabilityData.dayOfWeek, // 0-6 (Sunday-Saturday)
      startHour: availabilityData.startHour || 0,
      endHour: availabilityData.endHour || 24,
      enabled: availabilityData.enabled !== false,
      maxConcurrentUsage: availabilityData.maxConcurrentUsage || 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.hardwareAvailability.set(availability.id, availability);
    return availability;
  }

  // Utility Methods
  generateId() {
    return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
  }

  // Data Access Methods
  getAllMachines() { return Array.from(this.machines.values()); }
  getAllPlatforms() { return Array.from(this.platforms.values()); }
  getAllDebuggers() { return Array.from(this.debuggers.values()); }
  getAllSessions() { return Array.from(this.sessions.values()); }
  getAllExecutions() { return Array.from(this.executions.values()); }
  getAllHardwareCombinations() { return Array.from(this.hardwareCombinations.values()); }
  getAllHardwareInventory() { return Array.from(this.hardwareInventory.values()); }
  getAllHardwareAvailability() { return Array.from(this.hardwareAvailability.values()); }
  getAllTimeSlots() { return Array.from(this.timeSlots.values()); }

  // Find Methods
  findMachine(id) { return this.machines.get(id); }
  findPlatform(id) { return this.platforms.get(id); }
  findDebugger(id) { return this.debuggers.get(id); }
  findSession(id) { return this.sessions.get(id); }
  findExecution(id) { return this.executions.get(id); }
  findHardwareCombination(id) { return this.hardwareCombinations.get(id); }
  findHardwareInventory(id) { return this.hardwareInventory.get(id); }
  findHardwareAvailability(id) { return this.hardwareAvailability.get(id); }
  findTimeSlot(id) { return this.timeSlots.get(id); }

  // Update Methods
  updateMachine(id, updates) {
    const machine = this.machines.get(id);
    if (machine) {
      Object.assign(machine, updates, { updatedAt: new Date().toISOString() });
      return machine;
    }
    return null;
  }

  updatePlatform(id, updates) {
    const platform = this.platforms.get(id);
    if (platform) {
      Object.assign(platform, updates, { updatedAt: new Date().toISOString() });
      return platform;
    }
    return null;
  }

  updateDebugger(id, updates) {
    const debuggerItem = this.debuggers.get(id);
    if (debuggerItem) {
      Object.assign(debuggerItem, updates, { updatedAt: new Date().toISOString() });
      return debuggerItem;
    }
    return null;
  }

  updateSession(id, updates) {
    const session = this.sessions.get(id);
    if (session) {
      Object.assign(session, updates, { updatedAt: new Date().toISOString() });
      return session;
    }
    return null;
  }

  updateExecution(id, updates) {
    const execution = this.executions.get(id);
    if (execution) {
      Object.assign(execution, updates, { updatedAt: new Date().toISOString() });
      return execution;
    }
    return null;
  }

  updateHardwareCombination(id, updates) {
    const combination = this.hardwareCombinations.get(id);
    if (combination) {
      Object.assign(combination, updates, { updatedAt: new Date().toISOString() });
      return combination;
    }
    return null;
  }

  updateHardwareInventory(id, updates) {
    const inventory = this.hardwareInventory.get(id);
    if (inventory) {
      Object.assign(inventory, updates, { updatedAt: new Date().toISOString() });
      return inventory;
    }
    return null;
  }

  updateHardwareAvailability(id, updates) {
    const availability = this.hardwareAvailability.get(id);
    if (availability) {
      Object.assign(availability, updates, { updatedAt: new Date().toISOString() });
      return availability;
    }
    return null;
  }

  // Delete Methods
  deleteMachine(id) { return this.machines.delete(id); }
  deletePlatform(id) { return this.platforms.delete(id); }
  deleteDebugger(id) { return this.debuggers.delete(id); }
  deleteSession(id) { return this.sessions.delete(id); }
  deleteExecution(id) { return this.executions.delete(id); }
  deleteHardwareCombination(id) { return this.hardwareCombinations.delete(id); }
  deleteHardwareInventory(id) { return this.hardwareInventory.delete(id); }
  deleteHardwareAvailability(id) { return this.hardwareAvailability.delete(id); }

  // Clear Methods
  clearAllData() {
    this.machines.clear();
    this.platforms.clear();
    this.debuggers.clear();
    this.sessions.clear();
    this.executions.clear();
    this.hardwareCombinations.clear();
    this.hardwareInventory.clear();
    this.hardwareAvailability.clear();
    this.scheduleHistory.clear();
    this.resourceAllocations.clear();
  }

  // Export/Import Methods
  exportData() {
    return {
      machines: this.getAllMachines(),
      platforms: this.getAllPlatforms(),
      debuggers: this.getAllDebuggers(),
      sessions: this.getAllSessions(),
      executions: this.getAllExecutions(),
      hardwareCombinations: this.getAllHardwareCombinations(),
      hardwareInventory: this.getAllHardwareInventory(),
      hardwareAvailability: this.getAllHardwareAvailability(),
      timeSlots: this.getAllTimeSlots()
    };
  }

  importData(data) {
    if (data.machines) data.machines.forEach(m => this.machines.set(m.id, m));
    if (data.platforms) data.platforms.forEach(p => this.platforms.set(p.id, p));
    if (data.debuggers) data.debuggers.forEach(d => this.debuggers.set(d.id, d));
    if (data.sessions) data.sessions.forEach(s => this.sessions.set(s.id, s));
    if (data.executions) data.executions.forEach(e => this.executions.set(e.id, e));
    if (data.hardwareCombinations) data.hardwareCombinations.forEach(hc => this.hardwareCombinations.set(hc.id, hc));
    if (data.hardwareInventory) data.hardwareInventory.forEach(hi => this.hardwareInventory.set(hi.id, hi));
    if (data.hardwareAvailability) data.hardwareAvailability.forEach(ha => this.hardwareAvailability.set(ha.id, ha));
    if (data.timeSlots) data.timeSlots.forEach(ts => this.timeSlots.set(ts.id, ts));
  }
}

module.exports = DatabaseSchema;
