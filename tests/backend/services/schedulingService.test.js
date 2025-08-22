const SchedulingService = require('../../../backend/services/schedulingService');
const DataService = require('../../../backend/services/dataService');

// Mock the DataService
jest.mock('../../../backend/services/dataService');

describe('SchedulingService', () => {
  let schedulingService;
  let mockDataService;

  beforeEach(() => {
    mockDataService = new DataService();
    schedulingService = new SchedulingService();
    schedulingService.dataService = mockDataService;

    // Setup default mocks
    mockDataService.getHardwareCombinations.mockReturnValue([]);
    mockDataService.getHardwareInventory.mockReturnValue([]);
    mockDataService.getHardwareAvailability.mockReturnValue([]);
    mockDataService.getPlatform.mockReturnValue(null);
    mockDataService.getDebugger.mockReturnValue(null);
  });

  describe('Hardware Availability Checking', () => {
    test('should return true when no hardware assignment required', () => {
      const result = schedulingService.isHardwareAvailable(null, [], []);
      expect(result).toBe(true);
    });

    test('should check hardware quantity availability', () => {
      const hardwareAssignment = {
        platform: { id: 'platform1' },
        debugger: { id: 'debugger1' }
      };

      const timeSlots = [{ id: 'slot1', hour: 10 }];
      const assignments = [];

      // Mock hardware combination
      const mockCombination = {
        id: 'combo1',
        platformId: 'platform1',
        debuggerId: 'debugger1',
        enabled: true
      };

      // Mock inventory
      const mockInventory = {
        id: 'inv1',
        hardwareCombinationId: 'combo1',
        totalQuantity: 5,
        availableQuantity: 3
      };

      // Mock availability schedule
      const mockAvailability = {
        id: 'avail1',
        hardwareCombinationId: 'combo1',
        dayOfWeek: 1,
        startHour: 9,
        endHour: 17,
        enabled: true
      };

      mockDataService.getHardwareCombinations.mockReturnValue([mockCombination]);
      mockDataService.getHardwareInventory.mockReturnValue([mockInventory]);
      mockDataService.getHardwareAvailability.mockReturnValue([mockAvailability]);

      const result = schedulingService.isHardwareAvailable(
        hardwareAssignment,
        timeSlots,
        assignments
      );

      expect(result).toBe(true);
    });

    test('should return false when hardware quantity exceeded', () => {
      const hardwareAssignment = {
        platform: { id: 'platform1' },
        debugger: { id: 'debugger1' }
      };

      const timeSlots = [{ id: 'slot1', hour: 10 }];
      
      // Create assignments that exceed available quantity
      const assignments = [
        { 
          timeSlot: 'slot1', 
          hardwareAssignment: { 
            platform: { id: 'platform1' }, 
            debugger: { id: 'debugger1' } 
          } 
        },
        { 
          timeSlot: 'slot1', 
          hardwareAssignment: { 
            platform: { id: 'platform1' }, 
            debugger: { id: 'debugger1' } 
          } 
        }
      ];

      const mockCombination = {
        id: 'combo1',
        platformId: 'platform1',
        debuggerId: 'debugger1',
        enabled: true
      };

      const mockInventory = {
        id: 'inv1',
        hardwareCombinationId: 'combo1',
        totalQuantity: 5,
        availableQuantity: 2 // Only 2 available, but 2 already assigned
      };

      const mockAvailability = {
        id: 'avail1',
        hardwareCombinationId: 'combo1',
        dayOfWeek: 1,
        startHour: 9,
        endHour: 17,
        enabled: true
      };

      mockDataService.getHardwareCombinations.mockReturnValue([mockCombination]);
      mockDataService.getHardwareInventory.mockReturnValue([mockInventory]);
      mockDataService.getHardwareAvailability.mockReturnValue([mockAvailability]);

      const result = schedulingService.isHardwareAvailable(
        hardwareAssignment,
        timeSlots,
        assignments
      );

      expect(result).toBe(false);
    });
  });

  describe('Hardware Combination Finding', () => {
    test('should find matching hardware combination', () => {
      const hardwareAssignment = {
        platform: { id: 'platform1' },
        debugger: { id: 'debugger1' }
      };

      const mockCombinations = [
        {
          id: 'combo1',
          platformId: 'platform1',
          debuggerId: 'debugger1',
          enabled: true
        },
        {
          id: 'combo2',
          platformId: 'platform2',
          debuggerId: 'debugger2',
          enabled: true
        }
      ];

      mockDataService.getHardwareCombinations.mockReturnValue(mockCombinations);

      const result = schedulingService.findHardwareCombination(hardwareAssignment);

      expect(result).toBeDefined();
      expect(result.id).toBe('combo1');
    });

    test('should return null when no matching combination found', () => {
      const hardwareAssignment = {
        platform: { id: 'platform3' },
        debugger: { id: 'debugger3' }
      };

      const mockCombinations = [
        {
          id: 'combo1',
          platformId: 'platform1',
          debuggerId: 'debugger1',
          enabled: true
        }
      ];

      mockDataService.getHardwareCombinations.mockReturnValue(mockCombinations);

      const result = schedulingService.findHardwareCombination(hardwareAssignment);

      expect(result).toBeUndefined();
    });

    test('should ignore disabled combinations', () => {
      const hardwareAssignment = {
        platform: { id: 'platform1' },
        debugger: { id: 'debugger1' }
      };

      const mockCombinations = [
        {
          id: 'combo1',
          platformId: 'platform1',
          debuggerId: 'debugger1',
          enabled: false // Disabled
        }
      ];

      mockDataService.getHardwareCombinations.mockReturnValue(mockCombinations);

      const result = schedulingService.findHardwareCombination(hardwareAssignment);

      expect(result).toBeUndefined();
    });
  });

  describe('Hardware Combination Comparison', () => {
    test('should identify same hardware combinations', () => {
      const assignment1 = {
        platform: { id: 'platform1' },
        debugger: { id: 'debugger1' }
      };

      const assignment2 = {
        platform: { id: 'platform1' },
        debugger: { id: 'debugger1' }
      };

      const result = schedulingService.isSameHardwareCombination(assignment1, assignment2);

      expect(result).toBe(true);
    });

    test('should identify different hardware combinations', () => {
      const assignment1 = {
        platform: { id: 'platform1' },
        debugger: { id: 'debugger1' }
      };

      const assignment2 = {
        platform: { id: 'platform2' },
        debugger: { id: 'debugger1' }
      };

      const result = schedulingService.isSameHardwareCombination(assignment1, assignment2);

      expect(result).toBe(false);
    });
  });

  describe('Available Hardware Combination Finding', () => {
    test('should find available hardware combination for session', async () => {
      const session = {
        id: 'session1',
        hardwareRequirements: {
          platform: 'Test Platform',
          debugger: 'Test Debugger'
        }
      };

      const schedule = { assignments: [] };

      const mockPlatform = { id: 'platform1', name: 'Test Platform' };
      const mockDebugger = { id: 'debugger1', name: 'Test Debugger' };
      const mockCombination = {
        id: 'combo1',
        platformId: 'platform1',
        debuggerId: 'debugger1',
        enabled: true
      };
      const mockInventory = {
        id: 'inv1',
        hardwareCombinationId: 'combo1',
        availableQuantity: 5
      };
      const mockAvailability = {
        id: 'avail1',
        hardwareCombinationId: 'combo1',
        enabled: true
      };

      mockDataService.getHardwareCombinations.mockReturnValue([mockCombination]);
      mockDataService.getHardwareInventory.mockReturnValue([mockInventory]);
      mockDataService.getHardwareAvailability.mockReturnValue([mockAvailability]);
      mockDataService.getPlatform.mockReturnValue(mockPlatform);
      mockDataService.getDebugger.mockReturnValue(mockDebugger);

      const result = schedulingService.findAvailableHardwareCombination(session, schedule);

      expect(result.success).toBe(true);
      expect(result.hardwareCombination).toBeDefined();
      expect(result.hardwareCombination.id).toBe('combo1');
    });

    test('should return success when no hardware required', async () => {
      const session = {
        id: 'session1',
        hardwareRequirements: null
      };

      const schedule = { assignments: [] };

      const result = schedulingService.findAvailableHardwareCombination(session, schedule);

      expect(result.success).toBe(true);
      expect(result.hardwareCombination).toBeNull();
    });

    test('should return error when no matching combination found', async () => {
      const session = {
        id: 'session1',
        hardwareRequirements: {
          platform: 'Nonexistent Platform',
          debugger: 'Nonexistent Debugger'
        }
      };

      const schedule = { assignments: [] };

      mockDataService.getHardwareCombinations.mockReturnValue([]);
      mockDataService.getHardwareInventory.mockReturnValue([]);
      mockDataService.getHardwareAvailability.mockReturnValue([]);

      const result = schedulingService.findAvailableHardwareCombination(session, schedule);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No hardware combination found');
    });

    test('should return error when no inventory available', async () => {
      const session = {
        id: 'session1',
        hardwareRequirements: {
          platform: 'Test Platform',
          debugger: 'Test Debugger'
        }
      };

      const schedule = { assignments: [] };

      const mockPlatform = { id: 'platform1', name: 'Test Platform' };
      const mockDebugger = { id: 'debugger1', name: 'Test Debugger' };
      const mockCombination = {
        id: 'combo1',
        platformId: 'platform1',
        debuggerId: 'debugger1',
        enabled: true
      };
      // No inventory available
      const mockInventory = {
        id: 'inv1',
        hardwareCombinationId: 'combo1',
        availableQuantity: 0
      };

      mockDataService.getHardwareCombinations.mockReturnValue([mockCombination]);
      mockDataService.getHardwareInventory.mockReturnValue([mockInventory]);
      mockDataService.getHardwareAvailability.mockReturnValue([]);
      mockDataService.getPlatform.mockReturnValue(mockPlatform);
      mockDataService.getDebugger.mockReturnValue(mockDebugger);

      const result = schedulingService.findAvailableHardwareCombination(session, schedule);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No available hardware combinations');
    });
  });
});
