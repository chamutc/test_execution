const fs = require('fs');
const path = require('path');
const DatabaseSchema = require('../models/database');

class DataService {
  constructor() {
    this.dataDir = path.join(__dirname, '../../data');
    this.ensureDataDirectory();

    // Initialize new database schema (but don't auto-migrate)
    this.db = new DatabaseSchema();

    // Load existing data ONLY - NO automatic migration
    this.loadExistingData();
    // Load saved database data if it exists
    this.loadSavedDatabaseData();
    // REMOVED: this.migrateExistingData(); // This was causing machine ID regeneration!
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  // Generic method to read JSON data
  readData(filename) {
    try {
      const filePath = path.join(this.dataDir, filename);
      if (!fs.existsSync(filePath)) {
        return null;
      }
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading ${filename}:`, error);
      return null;
    }
  }

  // Generic method to write JSON data
  writeData(filename, data) {
    try {
      const filePath = path.join(this.dataDir, filename);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Error writing ${filename}:`, error);
      return false;
    }
  }

  // Sessions data management
  getSessions() {
    return this.readData('sessions.json') || [];
  }

  getAllSessions() {
    return this.getSessions();
  }

  getSessionById(id) {
    const sessions = this.getSessions();
    return sessions.find(session => session.id === id);
  }

  updateSession(id, sessionData) {
    const sessions = this.getSessions();
    const index = sessions.findIndex(session => session.id === id);
    if (index !== -1) {
      sessions[index] = { ...sessions[index], ...sessionData };
      this.saveSessions(sessions);
      return sessions[index];
    }
    return null;
  }

  saveSessions(sessions) {
    return this.writeData('sessions.json', sessions);
  }

  // Hardware data management
  getHardware() {
    return this.readData('hardware.json') || {
      debuggers: [],
      platforms: []
    };
  }

  getAllHardware() {
    const hardware = this.getHardware();
    // Convert to flat array format expected by scheduling engine
    const allHardware = [];

    // Add platforms
    if (hardware.platforms) {
      hardware.platforms.forEach(platform => {
        allHardware.push({
          id: platform.id,
          name: platform.name,
          type: 'platform',
          quantityInStock: platform.quantityInStock || 1
        });
      });
    }

    // Add debuggers
    if (hardware.debuggers) {
      hardware.debuggers.forEach(debuggerItem => {
        allHardware.push({
          id: debuggerItem.id,
          name: debuggerItem.name,
          type: 'debugger',
          quantityInStock: debuggerItem.quantityInStock || 1
        });
      });
    }

    return allHardware;
  }

  saveHardware(hardware) {
    return this.writeData('hardware.json', hardware);
  }

  // Machine data management
  getMachines() {
    console.log('🔍 getMachines() called - checking file reading...');
    const filePath = path.join(this.dataDir, 'machines.json');
    console.log('File path:', filePath);
    console.log('File exists:', fs.existsSync(filePath));
    
    const result = this.readData('machines.json') || [];
    console.log('Read result:', result);
    console.log('Result type:', typeof result);
    console.log('Result length:', Array.isArray(result) ? result.length : 'not array');
    
    return result;
  }

  getAllMachines() {
    console.log('🔥 getAllMachines() called! 🔥');
    
    // ALWAYS use JSON file for machine persistence 
    // This ensures machine IDs are stable across server restarts
    const machinesFromFile = this.getMachines();
    console.log('Machines from JSON file:', machinesFromFile.length);
    console.log('Machine IDs from file:', machinesFromFile.slice(0, 3).map(m => m.id));
    
    // Also sync with database if available
    if (this.db && this.db.machines) {
      console.log('Syncing with database...');
      machinesFromFile.forEach(machine => {
        this.db.machines.set(machine.id, machine);
      });
    }
    
    return machinesFromFile;
  }

  saveMachines(machines) {
    return this.writeData('machines.json', machines);
  }

  // Schedule data management
  getSchedules() {
    return this.readData('schedules.json') || [];
  }

  saveSchedule(scheduleData) {
    console.log('Saving schedule:', scheduleData.id);
    const schedules = this.getSchedules();
    schedules.push(scheduleData);
    const result = this.writeData('schedules.json', schedules);
    console.log('Schedule saved:', result);
    return result;
  }

  getLatestSchedule() {
    const schedules = this.getSchedules();
    return schedules.length > 0 ? schedules[schedules.length - 1] : null;
  }

  clearSchedules() {
    return this.writeData('schedules.json', []);
  }

  // Machine types data management
  getMachineTypes() {
    return this.readData('machineTypes.json') || [];
  }

  saveMachineTypes(machineTypes) {
    return this.writeData('machineTypes.json', machineTypes);
  }

  // Schedule data management
  getSchedule() {
    return this.readData('schedule.json') || {
      timeSlots: [],
      assignments: []
    };
  }

  saveScheduleOld(schedule) {
    return this.writeData('schedule.json', schedule);
  }

  // Configuration data management
  getConfig() {
    return this.readData('config.json') || {
      timeCalculation: {
        normalTestCaseMinutes: 5,
        comboTestCaseMinutes: 120
      },
      scheduling: {
        timeFlexibilityHours: 2,
        priorityOrder: ['urgent', 'high', 'normal']
      }
    };
  }

  saveConfig(config) {
    return this.writeData('config.json', config);
  }

  // Queue data management
  getQueue() {
    return this.readData('queue.json') || [];
  }

  saveQueue(queue) {
    return this.writeData('queue.json', queue);
  }

  // Backup data
  backupData() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(this.dataDir, 'backups', timestamp);
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const files = ['sessions.json', 'hardware.json', 'machines.json', 'machineTypes.json', 'schedule.json', 'config.json', 'queue.json'];
      
      files.forEach(file => {
        const sourcePath = path.join(this.dataDir, file);
        const backupPath = path.join(backupDir, file);
        
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, backupPath);
        }
      });

      return backupDir;
    } catch (error) {
      console.error('Error creating backup:', error);
      return null;
    }
  }

  // Migration method to convert existing data to new schema
  migrateExistingData() {
    try {
      // Migrate machines
      if (this.machines && Array.isArray(this.machines)) {
        this.machines.forEach(machine => {
          this.db.createMachine({
            name: machine.name,
            osType: machine.osType,
            quantity: machine.quantity || 1,
            status: machine.status || 'available',
            specifications: machine.specifications || {}
          });
        });
      }

      // Migrate hardware to platforms and debuggers
      if (this.hardware && Array.isArray(this.hardware)) {
        this.hardware.forEach(hw => {
          if (hw.type === 'platform') {
            this.db.createPlatform({
              name: hw.name,
              type: 'hardware',
              quantityInStock: hw.quantity || 1,
              specifications: hw.specifications || {},
              vendor: hw.vendor || '',
              model: hw.model || ''
            });
          } else if (hw.type === 'debugger') {
            this.db.createDebugger({
              name: hw.name,
              type: 'hardware',
              quantityInStock: hw.quantity || 1,
              specifications: hw.specifications || {},
              vendor: hw.vendor || '',
              model: hw.model || ''
            });
          }
        });
      }

      // Migrate sessions
      if (this.sessions && Array.isArray(this.sessions)) {
        this.sessions.forEach(session => {
          this.db.createSession({
            name: session.name,
            description: session.description || '',
            estimatedTime: session.estimatedTime || 1,
            priority: session.priority || 'normal',
            status: session.status || 'pending',
            requiredOS: session.requiredOS || '',
            hardwareRequirements: session.hardwareRequirements || {},
            executionRequirements: session.executionRequirements || {}
          });
        });
      }

      // Create hardware combinations from existing sessions
      this.createHardwareCombinationsFromSessions();

      console.log('Data migration completed successfully');
    } catch (error) {
      console.error('Error during data migration:', error);
    }
  }

  createHardwareCombinationsFromSessions() {
    const sessions = this.db.getAllSessions();
    const platforms = this.db.getAllPlatforms();
    const debuggers = this.db.getAllDebuggers();
    const existingCombinations = new Set();

    sessions.forEach(session => {
      const hwReq = session.hardwareRequirements;
      if (hwReq && hwReq.platform && hwReq.debugger) {
        const platform = platforms.find(p => p.name === hwReq.platform);
        const debuggerItem = debuggers.find(d => d.name === hwReq.debugger);

        if (platform && debuggerItem) {
          const combinationKey = `${platform.id}-${debuggerItem.id}`;

          if (!existingCombinations.has(combinationKey)) {
            existingCombinations.add(combinationKey);

            // Create hardware combination
            const combination = this.db.createHardwareCombination({
              name: `${platform.name} + ${debuggerItem.name}`,
              platformId: platform.id,
              debuggerId: debuggerItem.id,
              enabled: true,
              priority: 'normal',
              description: `Combination of ${platform.name} platform with ${debuggerItem.name} debugger`
            });

            // Create inventory entry
            this.db.createHardwareInventory({
              hardwareCombinationId: combination.id,
              totalQuantity: Math.min(platform.quantityInStock, debuggerItem.quantityInStock),
              availableQuantity: Math.min(platform.quantityInStock, debuggerItem.quantityInStock),
              allocatedQuantity: 0,
              reservedQuantity: 0,
              status: 'active'
            });

            // Create default availability (24/7)
            for (let day = 0; day < 7; day++) {
              this.db.createHardwareAvailability({
                hardwareCombinationId: combination.id,
                dayOfWeek: day,
                startHour: 0,
                endHour: 24,
                enabled: true,
                maxConcurrentUsage: 1
              });
            }
          }
        }
      }
    });
  }

  // New API methods for database access

  // Machine methods
  getMachines() { return this.db.getAllMachines(); }
  getMachine(id) { return this.db.findMachine(id); }
  createMachine(data) { return this.db.createMachine(data); }
  updateMachine(id, updates) { return this.db.updateMachine(id, updates); }
  deleteMachine(id) { return this.db.deleteMachine(id); }

  // Platform methods
  getPlatforms() { 
    // Bridge old and new data structures
    const dbPlatforms = this.db.getAllPlatforms();
    if (dbPlatforms.length > 0) {
      return dbPlatforms;
    }
    // Fall back to legacy data
    const hardware = this.getHardware();
    return hardware.platforms || [];
  }
  getPlatform(id) { 
    const platform = this.db.findPlatform(id);
    if (platform) return platform;
    // Fall back to legacy data
    const hardware = this.getHardware();
    return hardware.platforms?.find(p => p.id === id);
  }
  createPlatform(data) { return this.db.createPlatform(data); }
  updatePlatform(id, updates) { return this.db.updatePlatform(id, updates); }
  deletePlatform(id) { return this.db.deletePlatform(id); }

  // Debugger methods
  getDebuggers() { 
    // Bridge old and new data structures
    const dbDebuggers = this.db.getAllDebuggers();
    if (dbDebuggers.length > 0) {
      return dbDebuggers;
    }
    // Fall back to legacy data
    const hardware = this.getHardware();
    return hardware.debuggers || [];
  }
  getDebugger(id) { 
    const debuggerItem = this.db.findDebugger(id);
    if (debuggerItem) return debuggerItem;
    // Fall back to legacy data
    const hardware = this.getHardware();
    return hardware.debuggers?.find(d => d.id === id);
  }
  createDebugger(data) { return this.db.createDebugger(data); }
  updateDebugger(id, updates) { return this.db.updateDebugger(id, updates); }
  deleteDebugger(id) { return this.db.deleteDebugger(id); }

  // Session methods (enhanced)
  getSessionsNew() { return this.db.getAllSessions(); }
  getSessionNew(id) { return this.db.findSession(id); }
  createSessionNew(data) { return this.db.createSession(data); }
  updateSessionNew(id, updates) { return this.db.updateSession(id, updates); }
  deleteSessionNew(id) { return this.db.deleteSession(id); }

  // Execution methods
  getExecutions() { return this.db.getAllExecutions(); }
  getExecution(id) { return this.db.findExecution(id); }
  createExecution(data) { return this.db.createExecution(data); }
  updateExecution(id, updates) { return this.db.updateExecution(id, updates); }
  deleteExecution(id) { return this.db.deleteExecution(id); }

  // Hardware combination methods
  getHardwareCombinations() { return this.db.getAllHardwareCombinations(); }
  getHardwareCombination(id) { return this.db.findHardwareCombination(id); }
  createHardwareCombination(data) { 
    const result = this.db.createHardwareCombination(data);
    this.saveNewDatabaseData();
    return result;
  }
  updateHardwareCombination(id, updates) { 
    const result = this.db.updateHardwareCombination(id, updates);
    this.saveNewDatabaseData();
    return result;
  }
  deleteHardwareCombination(id) { 
    const result = this.db.deleteHardwareCombination(id);
    this.saveNewDatabaseData();
    return result;
  }

  // Hardware inventory methods
  getHardwareInventory() { return this.db.getAllHardwareInventory(); }
  getHardwareInventoryItem(id) { return this.db.findHardwareInventory(id); }
  createHardwareInventory(data) { return this.db.createHardwareInventory(data); }
  updateHardwareInventory(id, updates) { return this.db.updateHardwareInventory(id, updates); }
  deleteHardwareInventory(id) { return this.db.deleteHardwareInventory(id); }

  // Hardware availability methods
  getHardwareAvailability() { return this.db.getAllHardwareAvailability(); }
  getHardwareAvailabilityItem(id) { return this.db.findHardwareAvailability(id); }
  createHardwareAvailability(data) { return this.db.createHardwareAvailability(data); }
  updateHardwareAvailability(id, updates) { return this.db.updateHardwareAvailability(id, updates); }
  deleteHardwareAvailability(id) { return this.db.deleteHardwareAvailability(id); }

  // Time slot methods
  getTimeSlots() { return this.db.getAllTimeSlots(); }
  getTimeSlot(id) { return this.db.findTimeSlot(id); }

  // Complex queries and business logic
  getAvailableHardwareCombinations(timeSlot) {
    const combinations = this.db.getAllHardwareCombinations();
    const inventory = this.db.getAllHardwareInventory();
    const availability = this.db.getAllHardwareAvailability();

    return combinations.filter(combination => {
      if (!combination.enabled) return false;

      // Check inventory
      const inventoryItem = inventory.find(inv => inv.hardwareCombinationId === combination.id);
      if (!inventoryItem || inventoryItem.availableQuantity <= 0) return false;

      // Check time availability
      const timeAvailability = availability.filter(avail =>
        avail.hardwareCombinationId === combination.id && avail.enabled
      );

      if (timeSlot) {
        const slotDay = new Date(timeSlot.startTime).getDay();
        const slotHour = new Date(timeSlot.startTime).getHours();

        const isAvailable = timeAvailability.some(avail =>
          avail.dayOfWeek === slotDay &&
          slotHour >= avail.startHour &&
          slotHour < avail.endHour
        );

        if (!isAvailable) return false;
      }

      return true;
    });
  }

  getHardwareCombinationDetails(combinationId) {
    const combination = this.db.findHardwareCombination(combinationId);
    if (!combination) return null;

    const platform = this.db.findPlatform(combination.platformId);
    const debuggerItem = this.db.findDebugger(combination.debuggerId);
    const inventory = this.db.getAllHardwareInventory().find(inv => inv.hardwareCombinationId === combinationId);
    const availability = this.db.getAllHardwareAvailability().filter(avail => avail.hardwareCombinationId === combinationId);

    return {
      combination,
      platform,
      debugger: debuggerItem,
      inventory,
      availability
    };
  }

  // Legacy compatibility methods (keep existing API working)
  loadExistingData() {
    try {
      // Load existing data files
      const machinesFile = path.join(this.dataDir, 'machines.json');
      const hardwareFile = path.join(this.dataDir, 'hardware.json');
      const sessionsFile = path.join(this.dataDir, 'sessions.json');
      const scheduleFile = path.join(this.dataDir, 'schedule.json');

      if (fs.existsSync(machinesFile)) {
        this.machines = JSON.parse(fs.readFileSync(machinesFile, 'utf8'));
      }
      if (fs.existsSync(hardwareFile)) {
        this.hardware = JSON.parse(fs.readFileSync(hardwareFile, 'utf8'));
      }
      if (fs.existsSync(sessionsFile)) {
        this.sessions = JSON.parse(fs.readFileSync(sessionsFile, 'utf8'));
      }
      if (fs.existsSync(scheduleFile)) {
        this.schedule = JSON.parse(fs.readFileSync(scheduleFile, 'utf8'));
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  }

  // Load saved database data
  loadSavedDatabaseData() {
    try {
      const combinationsFile = path.join(this.dataDir, 'hardwareCombinations.json');
      const platformsFile = path.join(this.dataDir, 'platforms.json');
      const debuggersFile = path.join(this.dataDir, 'debuggers.json');

      if (fs.existsSync(combinationsFile)) {
        const combinations = JSON.parse(fs.readFileSync(combinationsFile, 'utf8'));
        combinations.forEach(combo => {
          this.db.hardwareCombinations.set(combo.id, combo);
        });
        console.log(`Loaded ${combinations.length} hardware combinations from file`);
      }

      if (fs.existsSync(platformsFile)) {
        const platforms = JSON.parse(fs.readFileSync(platformsFile, 'utf8'));
        platforms.forEach(platform => {
          this.db.platforms.set(platform.id, platform);
        });
        console.log(`Loaded ${platforms.length} platforms from file`);
      }

      if (fs.existsSync(debuggersFile)) {
        const debuggers = JSON.parse(fs.readFileSync(debuggersFile, 'utf8'));
        debuggers.forEach(debuggerItem => {
          this.db.debuggers.set(debuggerItem.id, debuggerItem);
        });
        console.log(`Loaded ${debuggers.length} debuggers from file`);
      }
    } catch (error) {
      console.error('Error loading saved database data:', error);
    }
  }

  // Export new database data
  exportDatabaseData() {
    return this.db.exportData();
  }

  // Import data to new database
  importDatabaseData(data) {
    this.db.importData(data);
  }

  // Save new database data to files
  saveNewDatabaseData() {
    try {
      const data = this.db.exportData();

      // Save each table to separate files
      Object.keys(data).forEach(tableName => {
        const filePath = path.join(this.dataDir, `${tableName}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data[tableName], null, 2));
      });

      console.log('New database data saved successfully');
    } catch (error) {
      console.error('Error saving new database data:', error);
    }
  }
}

module.exports = DataService;
