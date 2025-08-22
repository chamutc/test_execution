const CsvProcessor = require('../../../backend/services/csvProcessor');
const fs = require('fs');
const path = require('path');

// Mock dependencies
jest.mock('fs');
jest.mock('../../../backend/services/dataService');

describe('CsvProcessor', () => {
  let csvProcessor;
  let mockDataService;

  beforeEach(() => {
    csvProcessor = new CsvProcessor();
    mockDataService = csvProcessor.dataService;

    // Setup default mocks
    mockDataService.createPlatform.mockImplementation((data) => ({
      id: 'platform-' + Date.now(),
      ...data,
      createdAt: new Date().toISOString()
    }));

    mockDataService.createDebugger.mockImplementation((data) => ({
      id: 'debugger-' + Date.now(),
      ...data,
      createdAt: new Date().toISOString()
    }));

    mockDataService.createSessionNew.mockImplementation((data) => ({
      id: 'session-' + Date.now(),
      ...data,
      createdAt: new Date().toISOString()
    }));

    mockDataService.createHardwareCombination.mockImplementation((data) => ({
      id: 'combo-' + Date.now(),
      ...data,
      createdAt: new Date().toISOString()
    }));

    mockDataService.createHardwareInventory.mockImplementation((data) => ({
      id: 'inventory-' + Date.now(),
      ...data,
      createdAt: new Date().toISOString()
    }));

    mockDataService.createHardwareAvailability.mockImplementation((data) => ({
      id: 'availability-' + Date.now(),
      ...data,
      createdAt: new Date().toISOString()
    }));

    mockDataService.getSessionsNew.mockReturnValue([]);
    mockDataService.getPlatform.mockReturnValue(null);
    mockDataService.getDebugger.mockReturnValue(null);
  });

  describe('CSV Validation', () => {
    test('should validate required columns', async () => {
      const mockCsvContent = 'Session,Platform,Debugger,OS,Priority,Num of normal test case,Num of combo test case,Status\n';
      
      // Mock file reading
      fs.createReadStream = jest.fn().mockReturnValue({
        pipe: jest.fn().mockReturnThis(),
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            // Simulate CSV header row
            callback({
              Session: 'Session',
              Platform: 'Platform',
              Debugger: 'Debugger',
              OS: 'OS',
              Priority: 'Priority',
              'Num of normal test case': 'Num of normal test case',
              'Num of combo test case': 'Num of combo test case',
              Status: 'Status'
            });
          } else if (event === 'end') {
            callback();
          }
          return this;
        })
      });

      const result = await csvProcessor.validateFile('test.csv');
      
      expect(result.success).toBe(true);
    });

    test('should reject CSV with missing required columns', async () => {
      // Mock file reading with missing columns
      fs.createReadStream = jest.fn().mockReturnValue({
        pipe: jest.fn().mockReturnThis(),
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            // Simulate CSV header row with missing columns
            callback({
              Session: 'Session',
              Platform: 'Platform'
              // Missing other required columns
            });
          } else if (event === 'end') {
            callback();
          }
          return this;
        })
      });

      const result = await csvProcessor.validateFile('test.csv');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required columns');
    });
  });

  describe('CSV Parsing', () => {
    test('should parse CSV data correctly', async () => {
      const mockCsvData = [
        {
          Session: 'Test Session 1',
          Platform: 'Platform A',
          Debugger: 'Debugger X',
          OS: 'Ubuntu 20.04',
          Priority: 'high',
          'Num of normal test case': '10',
          'Num of combo test case': '2',
          Status: 'pending'
        }
      ];

      // Mock CSV parsing
      fs.createReadStream = jest.fn().mockReturnValue({
        pipe: jest.fn().mockReturnThis(),
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            mockCsvData.forEach(row => callback(row));
          } else if (event === 'end') {
            callback();
          }
          return this;
        })
      });

      const result = await csvProcessor.parseCSV('test.csv');
      
      expect(result).toHaveLength(1);
      expect(result[0].Session).toBe('Test Session 1');
      expect(result[0].Platform).toBe('Platform A');
    });
  });

  describe('Session Data Processing', () => {
    test('should process session data and create hardware', () => {
      const rawData = [
        {
          Session: 'Test Session',
          Platform: 'Platform A',
          Debugger: 'Debugger X',
          OS: 'Ubuntu 20.04',
          Priority: 'high',
          'Num of normal test case': '10',
          'Num of combo test case': '2',
          Status: 'pending'
        }
      ];

      const result = csvProcessor.processSessionData(rawData);

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].name).toBe('Test Session');
      expect(result.sessions[0].platform).toBe('Platform A');
      expect(result.sessions[0].debugger).toBe('Debugger X');
      expect(result.sessions[0].priority).toBe('high');

      expect(result.hardware.platforms).toHaveLength(1);
      expect(result.hardware.debuggers).toHaveLength(1);
      expect(result.osTypes).toHaveLength(1);

      // Verify platform and debugger creation was called
      expect(mockDataService.createPlatform).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Platform A',
          type: 'hardware',
          quantityInStock: 5
        })
      );

      expect(mockDataService.createDebugger).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Debugger X',
          type: 'hardware',
          quantityInStock: 3
        })
      );
    });

    test('should skip completed sessions', () => {
      const rawData = [
        {
          Session: 'Completed Session',
          Platform: 'Platform A',
          Debugger: 'Debugger X',
          OS: 'Ubuntu 20.04',
          Priority: 'normal',
          'Num of normal test case': '5',
          'Num of combo test case': '1',
          Status: 'completed'
        },
        {
          Session: 'Pending Session',
          Platform: 'Platform B',
          Debugger: 'Debugger Y',
          OS: 'Windows 10',
          Priority: 'high',
          'Num of normal test case': '8',
          'Num of combo test case': '0',
          Status: 'pending'
        }
      ];

      const result = csvProcessor.processSessionData(rawData);

      // Should only process the pending session
      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].name).toBe('Pending Session');
    });

    test('should handle sessions without hardware requirements', () => {
      const rawData = [
        {
          Session: 'No Hardware Session',
          Platform: '',
          Debugger: '',
          OS: 'Ubuntu 20.04',
          Priority: 'normal',
          'Num of normal test case': '5',
          'Num of combo test case': '0',
          Status: 'pending'
        }
      ];

      const result = csvProcessor.processSessionData(rawData);

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].requiresHardware).toBe(false);
      expect(result.hardware.platforms).toHaveLength(0);
      expect(result.hardware.debuggers).toHaveLength(0);
    });
  });

  describe('Test Case Parsing', () => {
    test('should parse test case counts correctly', () => {
      const testCases = csvProcessor.parseTestCases('pass:5,fail:3,not_run:2');
      
      expect(testCases.pass).toBe(5);
      expect(testCases.fail).toBe(3);
      expect(testCases.notRun).toBe(2);
      expect(testCases.total).toBe(10);
    });

    test('should handle simple numeric test case counts', () => {
      const testCases = csvProcessor.parseTestCases('10');
      
      expect(testCases.total).toBe(10);
      expect(testCases.pass).toBe(0);
      expect(testCases.fail).toBe(0);
      expect(testCases.notRun).toBe(10); // Assume all are not_run for time calculation
    });

    test('should handle empty test case strings', () => {
      const testCases = csvProcessor.parseTestCases('');
      
      expect(testCases.pass).toBe(0);
      expect(testCases.fail).toBe(0);
      expect(testCases.notRun).toBe(0);
      expect(testCases.total).toBe(0);
    });
  });

  describe('Priority Normalization', () => {
    test('should normalize priority values', () => {
      expect(csvProcessor.normalizePriority('HIGH')).toBe('high');
      expect(csvProcessor.normalizePriority('Normal')).toBe('normal');
      expect(csvProcessor.normalizePriority('URGENT')).toBe('urgent');
      expect(csvProcessor.normalizePriority('invalid')).toBe('normal');
      expect(csvProcessor.normalizePriority('')).toBe('normal');
    });
  });

  describe('Hardware Combination Creation', () => {
    test('should create hardware combinations from imported data', () => {
      const createdPlatforms = new Map([['Platform A', 'platform1']]);
      const createdDebuggers = new Map([['Debugger X', 'debugger1']]);

      // Mock session data
      mockDataService.getSessionsNew.mockReturnValue([
        {
          id: 'session1',
          hardwareRequirements: {
            platformId: 'platform1',
            debuggerId: 'debugger1'
          }
        }
      ]);

      mockDataService.getPlatform.mockReturnValue({ id: 'platform1', name: 'Platform A', quantityInStock: 5 });
      mockDataService.getDebugger.mockReturnValue({ id: 'debugger1', name: 'Debugger X', quantityInStock: 3 });

      csvProcessor.createHardwareCombinationsFromImport(createdPlatforms, createdDebuggers);

      expect(mockDataService.createHardwareCombination).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Platform A + Debugger X',
          platformId: 'platform1',
          debuggerId: 'debugger1',
          enabled: true
        })
      );

      expect(mockDataService.createHardwareInventory).toHaveBeenCalled();
      expect(mockDataService.createHardwareAvailability).toHaveBeenCalledTimes(7); // 7 days
    });
  });

  describe('Summary Generation', () => {
    test('should generate processing summary', () => {
      const sessions = [
        { priority: 'high', requiresHardware: true },
        { priority: 'normal', requiresHardware: false },
        { priority: 'urgent', requiresHardware: true }
      ];

      const hardware = {
        platforms: [{ name: 'Platform A' }, { name: 'Platform B' }],
        debuggers: [{ name: 'Debugger X' }]
      };

      const summary = csvProcessor.generateSummary(sessions, hardware);

      expect(summary.totalSessions).toBe(3);
      expect(summary.sessionsWithHardware).toBe(2);
      expect(summary.sessionsWithoutHardware).toBe(1);
      expect(summary.uniquePlatforms).toBe(2);
      expect(summary.uniqueDebuggers).toBe(1);
      expect(summary.priorityBreakdown.high).toBe(1);
      expect(summary.priorityBreakdown.normal).toBe(1);
      expect(summary.priorityBreakdown.urgent).toBe(1);
    });
  });
});
