const TimeCalculator = require('../../../backend/utils/timeCalculator');

describe('TimeCalculator', () => {
  let timeCalculator;

  beforeEach(() => {
    timeCalculator = new TimeCalculator();
  });

  describe('Time Calculation', () => {
    test('should calculate time for normal test cases only', () => {
      const normalTestCases = { pass: 2, fail: 3, notRun: 5, total: 10 };
      const comboTestCases = { pass: 0, fail: 0, notRun: 0, total: 0 };

      const result = timeCalculator.calculateTime(normalTestCases, comboTestCases);

      // Only fail + not_run cases count: (3 + 5) * 5 minutes = 40 minutes = 0.67 hours
      expect(result).toBeCloseTo(0.67, 2);
    });

    test('should calculate time for combo test cases only', () => {
      const normalTestCases = { pass: 0, fail: 0, notRun: 0, total: 0 };
      const comboTestCases = { pass: 1, fail: 2, notRun: 1, total: 4 };

      const result = timeCalculator.calculateTime(normalTestCases, comboTestCases);

      // Only fail + not_run cases count: (2 + 1) * 120 minutes = 360 minutes = 6 hours
      expect(result).toBe(6);
    });

    test('should calculate time for mixed test cases', () => {
      const normalTestCases = { pass: 5, fail: 3, notRun: 2, total: 10 };
      const comboTestCases = { pass: 2, fail: 1, notRun: 1, total: 4 };

      const result = timeCalculator.calculateTime(normalTestCases, comboTestCases);

      // Normal: (3 + 2) * 5 = 25 minutes
      // Combo: (1 + 1) * 120 = 240 minutes
      // Total: 265 minutes = 4.42 hours
      expect(result).toBeCloseTo(4.42, 2);
    });

    test('should handle zero test cases', () => {
      const normalTestCases = { pass: 0, fail: 0, notRun: 0, total: 0 };
      const comboTestCases = { pass: 0, fail: 0, notRun: 0, total: 0 };

      const result = timeCalculator.calculateTime(normalTestCases, comboTestCases);

      expect(result).toBe(0);
    });

    test('should ignore passed test cases', () => {
      const normalTestCases = { pass: 100, fail: 2, notRun: 3, total: 105 };
      const comboTestCases = { pass: 50, fail: 1, notRun: 0, total: 51 };

      const result = timeCalculator.calculateTime(normalTestCases, comboTestCases);

      // Normal: (2 + 3) * 5 = 25 minutes
      // Combo: (1 + 0) * 120 = 120 minutes
      // Total: 145 minutes = 2.42 hours
      expect(result).toBeCloseTo(2.42, 2);
    });
  });

  describe('Time Slot Conversion', () => {
    test('should convert hours to time slots (1-hour slots)', () => {
      expect(timeCalculator.hoursToTimeSlots(1)).toBe(1);
      expect(timeCalculator.hoursToTimeSlots(2.5)).toBe(3); // Rounded up
      expect(timeCalculator.hoursToTimeSlots(0.5)).toBe(1); // Minimum 1 slot
      expect(timeCalculator.hoursToTimeSlots(4.1)).toBe(5); // Rounded up
    });

    test('should handle zero hours', () => {
      expect(timeCalculator.hoursToTimeSlots(0)).toBe(1); // Minimum 1 slot
    });

    test('should handle negative hours', () => {
      expect(timeCalculator.hoursToTimeSlots(-1)).toBe(1); // Minimum 1 slot
    });
  });

  describe('Time Formatting', () => {
    test('should format hours to human readable string', () => {
      expect(timeCalculator.formatTime(1)).toBe('1.0 hours');
      expect(timeCalculator.formatTime(2.5)).toBe('2.5 hours');
      expect(timeCalculator.formatTime(0.33)).toBe('0.3 hours');
      expect(timeCalculator.formatTime(10.67)).toBe('10.7 hours');
    });

    test('should format hours to hours and minutes', () => {
      expect(timeCalculator.formatTimeDetailed(1)).toBe('1h 0m');
      expect(timeCalculator.formatTimeDetailed(1.5)).toBe('1h 30m');
      expect(timeCalculator.formatTimeDetailed(2.25)).toBe('2h 15m');
      expect(timeCalculator.formatTimeDetailed(0.5)).toBe('0h 30m');
      expect(timeCalculator.formatTimeDetailed(0.1)).toBe('0h 6m');
    });
  });

  describe('Time Constants', () => {
    test('should have correct time constants', () => {
      expect(timeCalculator.NORMAL_TEST_MINUTES).toBe(5);
      expect(timeCalculator.COMBO_TEST_MINUTES).toBe(120);
      expect(timeCalculator.TIME_SLOT_HOURS).toBe(1);
    });
  });

  describe('Batch Time Calculation', () => {
    test('should calculate total time for multiple sessions', () => {
      const sessions = [
        {
          normalTestCases: { pass: 0, fail: 2, notRun: 3, total: 5 },
          comboTestCases: { pass: 0, fail: 1, notRun: 0, total: 1 }
        },
        {
          normalTestCases: { pass: 0, fail: 1, notRun: 4, total: 5 },
          comboTestCases: { pass: 0, fail: 0, notRun: 1, total: 1 }
        }
      ];

      const totalTime = sessions.reduce((total, session) => {
        return total + timeCalculator.calculateTime(session.normalTestCases, session.comboTestCases);
      }, 0);

      // Session 1: (2+3)*5 + (1+0)*120 = 25 + 120 = 145 minutes = 2.42 hours
      // Session 2: (1+4)*5 + (0+1)*120 = 25 + 120 = 145 minutes = 2.42 hours
      // Total: 4.84 hours
      expect(totalTime).toBeCloseTo(4.83, 2);
    });
  });

  describe('Edge Cases', () => {
    test('should handle undefined test case objects', () => {
      const result = timeCalculator.calculateTime(undefined, undefined);
      expect(result).toBe(0);
    });

    test('should handle null test case objects', () => {
      const result = timeCalculator.calculateTime(null, null);
      expect(result).toBe(0);
    });

    test('should handle test case objects with missing properties', () => {
      const normalTestCases = { fail: 2 }; // Missing other properties
      const comboTestCases = { notRun: 1 }; // Missing other properties

      const result = timeCalculator.calculateTime(normalTestCases, comboTestCases);

      // Should handle missing properties gracefully
      // Normal: (2 + 0) * 5 = 10 minutes
      // Combo: (0 + 1) * 120 = 120 minutes
      // Total: 130 minutes = 2.17 hours
      expect(result).toBeCloseTo(2.17, 2);
    });

    test('should handle very large numbers', () => {
      const normalTestCases = { pass: 0, fail: 1000, notRun: 2000, total: 3000 };
      const comboTestCases = { pass: 0, fail: 100, notRun: 200, total: 300 };

      const result = timeCalculator.calculateTime(normalTestCases, comboTestCases);

      // Normal: (1000 + 2000) * 5 = 15000 minutes = 250 hours
      // Combo: (100 + 200) * 120 = 36000 minutes = 600 hours
      // Total: 850 hours
      expect(result).toBe(850);
    });
  });

  describe('Performance Tests', () => {
    test('should calculate time efficiently for large datasets', () => {
      const startTime = Date.now();
      
      // Perform many calculations
      for (let i = 0; i < 10000; i++) {
        timeCalculator.calculateTime(
          { pass: i % 10, fail: i % 5, notRun: i % 3, total: i % 18 },
          { pass: i % 2, fail: i % 4, notRun: i % 6, total: i % 12 }
        );
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });
  });
});
