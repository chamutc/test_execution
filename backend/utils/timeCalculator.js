class TimeCalculator {
  constructor() {
    // Time constants in minutes
    this.NORMAL_TEST_CASE_MINUTES = 5;
    this.COMBO_TEST_CASE_MINUTES = 120; // 2 hours
  }

  /**
   * Calculate estimated time for a session based on test cases
   * Only counts failed + not_run cases as per requirements
   * @param {Object} normalTestCases - Object with pass, fail, notRun counts
   * @param {Object} comboTestCases - Object with pass, fail, notRun counts
   * @returns {number} Estimated time in hours (precise to 2 decimal places)
   */
  calculateTime(normalTestCases, comboTestCases) {
    try {
      // Only count fail + not_run cases
      const normalCasesToRun = (normalTestCases.fail || 0) + (normalTestCases.notRun || 0);
      const comboCasesToRun = (comboTestCases.fail || 0) + (comboTestCases.notRun || 0);

      // Calculate total minutes
      const normalMinutes = normalCasesToRun * this.NORMAL_TEST_CASE_MINUTES;
      const comboMinutes = comboCasesToRun * this.COMBO_TEST_CASE_MINUTES;
      const totalMinutes = normalMinutes + comboMinutes;

      // Convert to hours with precise decimal (no rounding up)
      const hours = totalMinutes / 60;
      
      // Return precise hours to 2 decimal places
      return Math.floor(hours * 100) / 100;

    } catch (error) {
      console.error('Error calculating time:', error);
      return 0;
    }
  }

  /**
   * Calculate time for multiple sessions
   * @param {Array} sessions - Array of session objects
   * @returns {Object} Summary of time calculations
   */
  calculateBatchTime(sessions) {
    try {
      let totalTime = 0;
      const breakdown = {
        urgent: 0,
        high: 0,
        normal: 0
      };

      sessions.forEach(session => {
        const sessionTime = this.calculateTime(session.normalTestCases, session.comboTestCases);
        totalTime += sessionTime;
        
        if (breakdown.hasOwnProperty(session.priority)) {
          breakdown[session.priority] += sessionTime;
        }
      });

      return {
        totalTime: Math.floor(totalTime * 100) / 100,
        breakdown,
        averageTime: sessions.length > 0 ? Math.floor((totalTime / sessions.length) * 100) / 100 : 0
      };

    } catch (error) {
      console.error('Error calculating batch time:', error);
      return {
        totalTime: 0,
        breakdown: { urgent: 0, high: 0, normal: 0 },
        averageTime: 0
      };
    }
  }

  /**
   * Format time for display
   * @param {number} hours - Time in hours
   * @returns {string} Formatted time string
   */
  formatTime(hours) {
    try {
      if (hours === 0) return '0 min';
      
      const totalMinutes = Math.floor(hours * 60);
      const displayHours = Math.floor(totalMinutes / 60);
      const displayMinutes = totalMinutes % 60;

      if (displayHours === 0) {
        return `${displayMinutes} min`;
      } else if (displayMinutes === 0) {
        return `${displayHours}h`;
      } else {
        return `${displayHours}h ${displayMinutes}m`;
      }

    } catch (error) {
      console.error('Error formatting time:', error);
      return '0 min';
    }
  }

  /**
   * Convert hours to time slots (assuming 1-hour slots)
   * @param {number} hours - Time in hours
   * @returns {number} Number of time slots needed (rounded up)
   */
  hoursToTimeSlots(hours) {
    return Math.ceil(hours);
  }

  /**
   * Validate test case data
   * @param {Object} testCases - Test case object
   * @returns {boolean} True if valid
   */
  validateTestCases(testCases) {
    try {
      return (
        typeof testCases === 'object' &&
        typeof testCases.pass === 'number' &&
        typeof testCases.fail === 'number' &&
        typeof testCases.notRun === 'number' &&
        testCases.pass >= 0 &&
        testCases.fail >= 0 &&
        testCases.notRun >= 0
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Get time calculation configuration
   * @returns {Object} Configuration object
   */
  getConfig() {
    return {
      normalTestCaseMinutes: this.NORMAL_TEST_CASE_MINUTES,
      comboTestCaseMinutes: this.COMBO_TEST_CASE_MINUTES,
      description: {
        normalTestCase: `${this.NORMAL_TEST_CASE_MINUTES} minutes per normal test case`,
        comboTestCase: `${this.COMBO_TEST_CASE_MINUTES} minutes (${this.COMBO_TEST_CASE_MINUTES / 60}h) per combo test case`,
        countingRule: 'Only failed + not_run test cases are counted for time estimation'
      }
    };
  }

  /**
   * Update time calculation configuration
   * @param {Object} config - New configuration
   */
  updateConfig(config) {
    if (config.normalTestCaseMinutes && config.normalTestCaseMinutes > 0) {
      this.NORMAL_TEST_CASE_MINUTES = config.normalTestCaseMinutes;
    }
    
    if (config.comboTestCaseMinutes && config.comboTestCaseMinutes > 0) {
      this.COMBO_TEST_CASE_MINUTES = config.comboTestCaseMinutes;
    }
  }

  /**
   * Calculate time breakdown for analysis
   * @param {Object} normalTestCases - Normal test cases
   * @param {Object} comboTestCases - Combo test cases
   * @returns {Object} Detailed breakdown
   */
  getTimeBreakdown(normalTestCases, comboTestCases) {
    try {
      const normalCasesToRun = (normalTestCases.fail || 0) + (normalTestCases.notRun || 0);
      const comboCasesToRun = (comboTestCases.fail || 0) + (comboTestCases.notRun || 0);

      const normalMinutes = normalCasesToRun * this.NORMAL_TEST_CASE_MINUTES;
      const comboMinutes = comboCasesToRun * this.COMBO_TEST_CASE_MINUTES;
      const totalMinutes = normalMinutes + comboMinutes;

      return {
        normalTestCases: {
          count: normalCasesToRun,
          minutes: normalMinutes,
          hours: Math.floor((normalMinutes / 60) * 100) / 100
        },
        comboTestCases: {
          count: comboCasesToRun,
          minutes: comboMinutes,
          hours: Math.floor((comboMinutes / 60) * 100) / 100
        },
        total: {
          minutes: totalMinutes,
          hours: Math.floor((totalMinutes / 60) * 100) / 100,
          timeSlots: this.hoursToTimeSlots(totalMinutes / 60)
        }
      };

    } catch (error) {
      console.error('Error getting time breakdown:', error);
      return {
        normalTestCases: { count: 0, minutes: 0, hours: 0 },
        comboTestCases: { count: 0, minutes: 0, hours: 0 },
        total: { minutes: 0, hours: 0, timeSlots: 0 }
      };
    }
  }
}

module.exports = TimeCalculator;
