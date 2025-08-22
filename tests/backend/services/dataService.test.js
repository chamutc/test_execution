const DataService = require('../../../backend/services/dataService');

describe('DataService', () => {
  let dataService;

  beforeEach(() => {
    dataService = new DataService();
  });

  describe('Platform Management', () => {
    test('should create a platform', () => {
      const platformData = {
        name: 'Test Platform',
        type: 'hardware',
        quantityInStock: 5,
        specifications: { cpu: 'ARM', memory: '8GB' }
      };

      const platform = dataService.createPlatform(platformData);

      expect(platform).toBeDefined();
      expect(platform.id).toBeDefined();
      expect(platform.name).toBe('Test Platform');
      expect(platform.quantityInStock).toBe(5);
      expect(platform.createdAt).toBeDefined();
    });

    test('should get all platforms', () => {
      const platform1 = dataService.createPlatform({ name: 'Platform 1' });
      const platform2 = dataService.createPlatform({ name: 'Platform 2' });

      const platforms = dataService.getPlatforms();

      expect(platforms).toHaveLength(2);
      expect(platforms.map(p => p.name)).toContain('Platform 1');
      expect(platforms.map(p => p.name)).toContain('Platform 2');
    });

    test('should update a platform', () => {
      const platform = dataService.createPlatform({ name: 'Original Name' });
      
      const updated = dataService.updatePlatform(platform.id, { 
        name: 'Updated Name',
        quantityInStock: 10 
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.quantityInStock).toBe(10);
      expect(updated.updatedAt).toBeDefined();
    });

    test('should delete a platform', () => {
      const platform = dataService.createPlatform({ name: 'To Delete' });
      
      const result = dataService.deletePlatform(platform.id);
      
      expect(result).toBe(true);
      expect(dataService.getPlatform(platform.id)).toBeNull();
    });
  });

  describe('Debugger Management', () => {
    test('should create a debugger', () => {
      const debuggerData = {
        name: 'Test Debugger',
        type: 'hardware',
        quantityInStock: 3,
        supportedPlatforms: ['Platform A', 'Platform B']
      };

      const debuggerItem = dataService.createDebugger(debuggerData);

      expect(debuggerItem).toBeDefined();
      expect(debuggerItem.id).toBeDefined();
      expect(debuggerItem.name).toBe('Test Debugger');
      expect(debuggerItem.supportedPlatforms).toEqual(['Platform A', 'Platform B']);
    });

    test('should get all debuggers', () => {
      dataService.createDebugger({ name: 'Debugger 1' });
      dataService.createDebugger({ name: 'Debugger 2' });

      const debuggers = dataService.getDebuggers();

      expect(debuggers).toHaveLength(2);
    });
  });

  describe('Hardware Combinations', () => {
    test('should create hardware combination', () => {
      const platform = dataService.createPlatform({ name: 'Test Platform' });
      const debuggerItem = dataService.createDebugger({ name: 'Test Debugger' });

      const combination = dataService.createHardwareCombination({
        name: 'Test Combo',
        platformId: platform.id,
        debuggerId: debuggerItem.id,
        enabled: true
      });

      expect(combination).toBeDefined();
      expect(combination.platformId).toBe(platform.id);
      expect(combination.debuggerId).toBe(debuggerItem.id);
      expect(combination.enabled).toBe(true);
    });

    test('should get hardware combinations', () => {
      const platform = dataService.createPlatform({ name: 'Platform' });
      const debuggerItem = dataService.createDebugger({ name: 'Debugger' });
      
      dataService.createHardwareCombination({
        platformId: platform.id,
        debuggerId: debuggerItem.id
      });

      const combinations = dataService.getHardwareCombinations();
      expect(combinations).toHaveLength(1);
    });
  });

  describe('Hardware Inventory', () => {
    test('should create hardware inventory', () => {
      const platform = dataService.createPlatform({ name: 'Platform' });
      const debuggerItem = dataService.createDebugger({ name: 'Debugger' });
      const combination = dataService.createHardwareCombination({
        platformId: platform.id,
        debuggerId: debuggerItem.id
      });

      const inventory = dataService.createHardwareInventory({
        hardwareCombinationId: combination.id,
        totalQuantity: 10,
        availableQuantity: 8
      });

      expect(inventory).toBeDefined();
      expect(inventory.totalQuantity).toBe(10);
      expect(inventory.availableQuantity).toBe(8);
    });

    test('should update inventory quantities', () => {
      const platform = dataService.createPlatform({ name: 'Platform' });
      const debuggerItem = dataService.createDebugger({ name: 'Debugger' });
      const combination = dataService.createHardwareCombination({
        platformId: platform.id,
        debuggerId: debuggerItem.id
      });
      const inventory = dataService.createHardwareInventory({
        hardwareCombinationId: combination.id,
        totalQuantity: 10,
        availableQuantity: 10
      });

      const updated = dataService.updateHardwareInventory(inventory.id, {
        availableQuantity: 5
      });

      expect(updated.availableQuantity).toBe(5);
    });
  });

  describe('Hardware Availability', () => {
    test('should create hardware availability schedule', () => {
      const platform = dataService.createPlatform({ name: 'Platform' });
      const debuggerItem = dataService.createDebugger({ name: 'Debugger' });
      const combination = dataService.createHardwareCombination({
        platformId: platform.id,
        debuggerId: debuggerItem.id
      });

      const availability = dataService.createHardwareAvailability({
        hardwareCombinationId: combination.id,
        dayOfWeek: 1, // Monday
        startHour: 9,
        endHour: 17,
        enabled: true
      });

      expect(availability).toBeDefined();
      expect(availability.dayOfWeek).toBe(1);
      expect(availability.startHour).toBe(9);
      expect(availability.endHour).toBe(17);
    });
  });

  describe('Session Management', () => {
    test('should create a session', () => {
      const sessionData = {
        name: 'Test Session',
        platform: 'Test Platform',
        debugger: 'Test Debugger',
        priority: 'high',
        estimatedTime: 2.5
      };

      const session = dataService.createSession(sessionData);

      expect(session).toBeDefined();
      expect(session.name).toBe('Test Session');
      expect(session.priority).toBe('high');
      expect(session.estimatedTime).toBe(2.5);
    });

    test('should get sessions by status', () => {
      dataService.createSession({ name: 'Session 1', status: 'pending' });
      dataService.createSession({ name: 'Session 2', status: 'scheduled' });
      dataService.createSession({ name: 'Session 3', status: 'pending' });

      const pendingSessions = dataService.getSessionsByStatus('pending');
      
      expect(pendingSessions).toHaveLength(2);
      expect(pendingSessions.every(s => s.status === 'pending')).toBe(true);
    });
  });

  describe('Machine Management', () => {
    test('should create a machine', () => {
      const machineData = {
        name: 'Test Machine',
        type: 'physical',
        os: 'Ubuntu 20.04',
        status: 'available'
      };

      const machine = dataService.createMachine(machineData);

      expect(machine).toBeDefined();
      expect(machine.name).toBe('Test Machine');
      expect(machine.os).toBe('Ubuntu 20.04');
    });

    test('should get available machines', () => {
      dataService.createMachine({ name: 'Machine 1', status: 'available' });
      dataService.createMachine({ name: 'Machine 2', status: 'busy' });
      dataService.createMachine({ name: 'Machine 3', status: 'available' });

      const availableMachines = dataService.getAvailableMachines();
      
      expect(availableMachines).toHaveLength(2);
      expect(availableMachines.every(m => m.status === 'available')).toBe(true);
    });
  });

  describe('Data Integration', () => {
    test('should get comprehensive hardware data', () => {
      const platform = dataService.createPlatform({ name: 'Platform' });
      const debuggerItem = dataService.createDebugger({ name: 'Debugger' });
      const combination = dataService.createHardwareCombination({
        platformId: platform.id,
        debuggerId: debuggerItem.id
      });

      const data = dataService.getComprehensiveHardwareData(combination.id);

      expect(data.combination).toBeDefined();
      expect(data.platform).toBeDefined();
      expect(data.debugger).toBeDefined();
      expect(data.platform.name).toBe('Platform');
      expect(data.debugger.name).toBe('Debugger');
    });
  });
});
