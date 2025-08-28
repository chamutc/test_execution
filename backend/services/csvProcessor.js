const fs = require('fs');
const csvParser = require('csv-parser');
const { v4: uuidv4 } = require('uuid');
const TimeCalculator = require('../utils/timeCalculator');
const DataService = require('./dataService');

class CsvProcessor {
  constructor(socketService = null) {
    this.socketService = socketService;
    this.timeCalculator = new TimeCalculator();
    this.dataService = new DataService();
    this.requiredColumns = [
      'Session',
      'Platform',
      'Debugger',
      'OS',
      'Priority',
      'Num of normal test case',
      'Num of combo test case',
      'Status'
    ]; // Note: Mode is optional; default NA when missing
  }

  async processFile(filePath) {
    try {
      this.emitProgress('Starting CSV processing...', 0);

      // First, validate the file structure
      const validation = await this.validateFile(filePath);
      if (!validation.success) {
        return validation;
      }

      this.emitProgress('Parsing CSV data...', 20);

      // Parse the CSV file
      const rawData = await this.parseCSV(filePath);
      
      this.emitProgress('Processing sessions...', 40);

      // Process sessions and extract hardware/OS information
      const result = this.processSessionData(rawData);

      this.emitProgress('Finalizing...', 90);

      const summary = this.generateSummary(result.sessions, result.hardware);

      this.emitProgress('CSV processing completed!', 100);

      return {
        success: true,
        sessions: result.sessions,
        hardware: result.hardware,
        osTypes: result.osTypes,
        summary
      };

    } catch (error) {
      console.error('CSV processing error:', error);
      return {
        success: false,
        error: 'Failed to process CSV file',
        details: error.message
      };
    }
  }

  async validateFile(filePath) {
    try {
      return new Promise((resolve) => {
        const headers = [];
        let isFirstRow = true;
        let rowCount = 0;

        fs.createReadStream(filePath)
          .pipe(csvParser())
          .on('headers', (headerList) => {
            headers.push(...headerList);
          })
          .on('data', (data) => {
            if (isFirstRow) {
              isFirstRow = false;
              // Check if all required columns are present
              const missingColumns = this.requiredColumns.filter(col => 
                !headers.includes(col)
              );

              if (missingColumns.length > 0) {
                resolve({
                  success: false,
                  error: 'Missing required columns',
                  details: `Missing columns: ${missingColumns.join(', ')}`
                });
                return;
              }
            }
            rowCount++;
          })
          .on('end', () => {
            if (rowCount === 0) {
              resolve({
                success: false,
                error: 'CSV file is empty or contains no data rows'
              });
            } else {
              resolve({
                success: true,
                message: 'CSV file validation passed',
                rowCount,
                headers
              });
            }
          })
          .on('error', (error) => {
            resolve({
              success: false,
              error: 'Failed to read CSV file',
              details: error.message
            });
          });
      });
    } catch (error) {
      return {
        success: false,
        error: 'File validation failed',
        details: error.message
      };
    }
  }

  async parseCSV(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (data) => {
          results.push(data);
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  processSessionData(rawData) {
    const sessions = [];
    const hardwareSet = {
      debuggers: new Set(),
      platforms: new Set()
    };
    const osTypesSet = new Set();

    // Track created platforms and debuggers for auto-creation
    const createdPlatforms = new Map();
    const createdDebuggers = new Map();

    rawData.forEach((row, index) => {
      try {
        // Skip completed sessions as per requirements
        if (row.Status && row.Status.toLowerCase() === 'completed') {
          return;
        }

        // Extract and clean data
        const sessionName = row.Session?.trim() || `Session_${index + 1}`;
        const platform = row.Platform?.trim() || '';
        const debuggerName = row.Debugger?.trim() || '';
        const mode = row.Mode?.toString().trim() || 'NA';
        const os = row.OS?.trim() || '';
        const priority = this.normalizePriority(row.Priority?.trim() || 'normal');
        
        // Parse test case counts
        const normalTestCases = this.parseTestCases(row['Num of normal test case']);
        const comboTestCases = this.parseTestCases(row['Num of combo test case']);

        // Calculate estimated time
        const estimatedTime = this.timeCalculator.calculateTime(normalTestCases, comboTestCases);

        // Determine if hardware is required (both debugger AND platform must be present)
        const requiresHardware = !!(debuggerName && platform);

        // Auto-create platforms and debuggers in new database
        let platformId = null;
        let debuggerId = null;

        if (platform && !createdPlatforms.has(platform)) {
          const platformData = this.dataService.createPlatform({
            name: platform,
            type: 'hardware',
            quantityInStock: 5, // Default quantity
            specifications: { source: 'csv_import' },
            vendor: 'Unknown',
            model: platform,
            status: 'active'
          });
          createdPlatforms.set(platform, platformData.id);
          platformId = platformData.id;
        } else if (platform) {
          platformId = createdPlatforms.get(platform);
        }

        if (debuggerName && !createdDebuggers.has(debuggerName)) {
          const debuggerData = this.dataService.createDebugger({
            name: debuggerName,
            type: 'hardware',
            quantityInStock: 3, // Default quantity
            specifications: { source: 'csv_import' },
            vendor: 'Unknown',
            model: debuggerName,
            status: 'active'
          });
          createdDebuggers.set(debuggerName, debuggerData.id);
          debuggerId = debuggerData.id;
        } else if (debuggerName) {
          debuggerId = createdDebuggers.get(debuggerName);
        }

        // Collect hardware information
        if (debuggerName) {
          hardwareSet.debuggers.add(debuggerName);
        }
        if (platform) {
          hardwareSet.platforms.add(platform);
        }

        // Collect OS types
        if (os) {
          osTypesSet.add(os);
        }

        // Create session in new database structure
        const sessionData = this.dataService.createSessionNew({
          name: sessionName,
          description: `Imported from CSV - ${normalTestCases} normal + ${comboTestCases} combo test cases`,
          estimatedTime,
          priority,
          status: 'pending',
          requiredOS: os || '',
          hardwareRequirements: {
            platform: platform || null,
            debugger: debuggerName || null,
            mode: mode || 'NA',
            platformId: platformId,
            debuggerId: debuggerId
          },
          executionRequirements: {
            normalTestCases,
            comboTestCases,
            requiresHardware,
            source: 'csv_import'
          }
        });

        // Also keep legacy format for compatibility
        const legacySession = {
          id: sessionData.id,
          name: sessionName,
          platform: platform || null,
          debugger: debuggerName || null,
          os: os || null,
          priority,
          normalTestCases,
          comboTestCases,
          estimatedTime,
          requiresHardware,
          mode: mode || 'NA',
          status: 'pending',
          createdAt: new Date().toISOString(),
          source: 'csv'
        };

        sessions.push(legacySession);

      } catch (error) {
        console.error(`Error processing row ${index + 1}:`, error);
        // Continue processing other rows
      }
    });

    // Auto-create hardware combinations for imported sessions
    this.createHardwareCombinationsFromImport(createdPlatforms, createdDebuggers);

    // Convert sets to arrays with additional metadata
    const hardware = {
      debuggers: Array.from(hardwareSet.debuggers).map(name => ({
        id: uuidv4(),
        name,
        quantity: 1, // Default quantity, can be updated later
        available: 1,
        source: 'csv',
        createdAt: new Date().toISOString()
      })),
      platforms: Array.from(hardwareSet.platforms).map(name => ({
        id: uuidv4(),
        name,
        quantity: 1, // Default quantity, can be updated later
        available: 1,
        source: 'csv',
        createdAt: new Date().toISOString()
      }))
    };

    const osTypes = Array.from(osTypesSet).map(osType => ({
      id: uuidv4(),
      osType,
      quantity: 1, // Default quantity, can be updated later
      createdAt: new Date().toISOString()
    }));

    return { sessions, hardware, osTypes };
  }

  createHardwareCombinationsFromImport(createdPlatforms, createdDebuggers) {
    try {
      // Get all sessions to find unique platform+debugger combinations
      const sessions = this.dataService.getSessionsNew();
      const existingCombinations = new Set();

      sessions.forEach(session => {
        const hwReq = session.hardwareRequirements;
        if (hwReq && hwReq.platformId && hwReq.debuggerId) {
          const combinationKey = `${hwReq.platformId}-${hwReq.debuggerId}`;

          if (!existingCombinations.has(combinationKey)) {
            existingCombinations.add(combinationKey);

            const platform = this.dataService.getPlatform(hwReq.platformId);
            const debuggerItem = this.dataService.getDebugger(hwReq.debuggerId);

            if (platform && debuggerItem) {
              // Create hardware combination
              const combination = this.dataService.createHardwareCombination({
                name: `${platform.name} + ${debuggerItem.name}`,
                platformId: platform.id,
                debuggerId: debuggerItem.id,
                enabled: true,
                priority: 'normal',
                description: `Auto-created from CSV import: ${platform.name} platform with ${debuggerItem.name} debugger`
              });

              // Create inventory entry
              const minQuantity = Math.min(platform.quantityInStock, debuggerItem.quantityInStock);
              this.dataService.createHardwareInventory({
                hardwareCombinationId: combination.id,
                totalQuantity: minQuantity,
                availableQuantity: minQuantity,
                allocatedQuantity: 0,
                reservedQuantity: 0,
                location: 'Lab',
                status: 'active'
              });

              // Create default availability (24/7)
              for (let day = 0; day < 7; day++) {
                this.dataService.createHardwareAvailability({
                  hardwareCombinationId: combination.id,
                  dayOfWeek: day,
                  startHour: 0,
                  endHour: 24,
                  enabled: true,
                  maxConcurrentUsage: 1
                });
              }

              console.log(`Created hardware combination: ${combination.name}`);
            }
          }
        }
      });

      console.log(`Auto-created ${existingCombinations.size} hardware combinations from CSV import`);
    } catch (error) {
      console.error('Error creating hardware combinations from import:', error);
    }
  }

  parseTestCases(testCaseString) {
    if (!testCaseString || testCaseString.trim() === '') {
      return { pass: 0, fail: 0, notRun: 0, total: 0 };
    }

    try {
      const cleanString = testCaseString.toString().trim();

      // Handle different formats
      if (cleanString.includes('/')) {
        // Expected format: "pass/fail/not_run" (e.g., "0/5/10")
        const parts = cleanString.split('/');

        if (parts.length === 3) {
          const pass = this.parseNumber(parts[0]);
          const fail = this.parseNumber(parts[1]);
          const notRun = this.parseNumber(parts[2]);
          const total = pass + fail + notRun;

          return { pass, fail, notRun, total };
        } else if (parts.length === 2) {
          // Handle "fail/not_run" format (assume pass = 0)
          const fail = this.parseNumber(parts[0]);
          const notRun = this.parseNumber(parts[1]);
          const total = fail + notRun;

          return { pass: 0, fail, notRun, total };
        }
      } else {
        // Handle single number (assume all are not_run)
        const notRun = this.parseNumber(cleanString);
        return { pass: 0, fail: 0, notRun, total: notRun };
      }

      console.warn(`Invalid test case format: ${testCaseString}`);
      return { pass: 0, fail: 0, notRun: 0, total: 0 };

    } catch (error) {
      console.error(`Error parsing test cases "${testCaseString}":`, error);
      return { pass: 0, fail: 0, notRun: 0, total: 0 };
    }
  }

  parseNumber(value) {
    if (!value || value.toString().trim() === '') {
      return 0;
    }

    const num = parseInt(value.toString().trim());
    return isNaN(num) ? 0 : Math.max(0, num);
  }

  // Enhanced validation with detailed error reporting
  async validateFileDetailed(filePath) {
    try {
      const data = await this.parseCSV(filePath);
      const errors = [];
      const warnings = [];

      if (data.length === 0) {
        errors.push('CSV file is empty');
        return { success: false, errors, warnings, validRows: 0, totalRows: 0 };
      }

      // Check required columns
      const firstRow = data[0];
      const missingColumns = this.requiredColumns.filter(col => !(col in firstRow));

      if (missingColumns.length > 0) {
        errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
      }

      // Validate each row with detailed checks
      let validRowCount = 0;
      const sessionNames = new Set();

      data.forEach((row, index) => {
        const rowNumber = index + 2; // +2 because index starts at 0 and we skip header
        let rowValid = true;

        // Check session name
        const sessionName = row.Session?.trim();
        if (!sessionName) {
          errors.push(`Row ${rowNumber}: Session name is required`);
          rowValid = false;
        } else {
          // Check for duplicate session names
          if (sessionNames.has(sessionName)) {
            warnings.push(`Row ${rowNumber}: Duplicate session name "${sessionName}"`);
          }
          sessionNames.add(sessionName);
        }

        // Check OS
        if (!row.OS || row.OS.trim() === '') {
          warnings.push(`Row ${rowNumber}: OS is missing - session may not be schedulable`);
        }

        // Check priority
        const priority = row.Priority?.trim().toLowerCase();
        if (priority && !['urgent', 'high', 'normal', 'low'].includes(priority)) {
          warnings.push(`Row ${rowNumber}: Invalid priority "${row.Priority}", will use "normal"`);
        }

        // Check status and skip completed
        const status = row.Status?.trim().toLowerCase();
        if (status === 'completed') {
          warnings.push(`Row ${rowNumber}: Session marked as completed, will be skipped during import`);
        }

        // Validate test case formats with detailed feedback
        const normalTestCaseStr = row['Num of normal test case'];
        const comboTestCaseStr = row['Num of combo test case'];

        if (normalTestCaseStr) {
          const normalTestCases = this.parseTestCases(normalTestCaseStr);
          if (normalTestCases.total === 0 && normalTestCaseStr.trim() !== '0' && normalTestCaseStr.trim() !== '') {
            warnings.push(`Row ${rowNumber}: Invalid normal test case format "${normalTestCaseStr}" (expected: pass/fail/not_run), will use 0`);
          }
        }

        if (comboTestCaseStr) {
          const comboTestCases = this.parseTestCases(comboTestCaseStr);
          if (comboTestCases.total === 0 && comboTestCaseStr.trim() !== '0' && comboTestCaseStr.trim() !== '') {
            warnings.push(`Row ${rowNumber}: Invalid combo test case format "${comboTestCaseStr}" (expected: pass/fail/not_run), will use 0`);
          }
        }

        // Check hardware requirements consistency
        const platform = row.Platform?.trim();
        const debuggerName = row.Debugger?.trim();

        if ((platform && !debuggerName) || (!platform && debuggerName)) {
          warnings.push(`Row ${rowNumber}: Incomplete hardware requirements - both Platform and Debugger needed for hardware allocation`);
        }

        // Check for sessions with no test cases
        const normalEmpty = !normalTestCaseStr || normalTestCaseStr.trim() === '';
        const comboEmpty = !comboTestCaseStr || comboTestCaseStr.trim() === '';

        if (normalEmpty && comboEmpty) {
          warnings.push(`Row ${rowNumber}: No test cases specified - session will have 0 estimated time`);
        }

        if (rowValid) {
          validRowCount++;
        }
      });

      return {
        success: errors.length === 0,
        errors,
        warnings,
        validRows: validRowCount,
        totalRows: data.length,
        preview: this.generatePreview(data),
        summary: {
          uniqueSessions: sessionNames.size,
          duplicateNames: data.length - sessionNames.size,
          completedSessions: data.filter(row => row.Status?.trim().toLowerCase() === 'completed').length,
          hardwareRequiredSessions: data.filter(row => row.Platform?.trim() && row.Debugger?.trim()).length
        }
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Failed to parse CSV: ${error.message}`],
        warnings: [],
        validRows: 0,
        totalRows: 0
      };
    }
  }

  generatePreview(data) {
    if (data.length === 0) return null;

    const headers = Object.keys(data[0]);
    const rows = data.slice(0, 5).map(row => headers.map(header => row[header] || ''));

    return {
      headers,
      rows,
      totalRows: data.length,
      showingRows: Math.min(5, data.length)
    };
  }

  normalizePriority(priority) {
    const normalizedPriority = priority.toLowerCase();
    const validPriorities = ['urgent', 'high', 'normal'];
    
    return validPriorities.includes(normalizedPriority) ? normalizedPriority : 'normal';
  }

  mergeHardware(existingHardware, newHardware) {
    // Handle case where existingHardware is empty array or null/undefined
    const existingDebuggers = Array.isArray(existingHardware?.debuggers) ? existingHardware.debuggers : [];
    const existingPlatforms = Array.isArray(existingHardware?.platforms) ? existingHardware.platforms : [];
    
    const merged = {
      debuggers: [...existingDebuggers],
      platforms: [...existingPlatforms]
    };

    // Merge debuggers (only if newHardware.debuggers exists and is array)
    if (Array.isArray(newHardware?.debuggers)) {
      newHardware.debuggers.forEach(newItem => {
        const existingItem = merged.debuggers.find(item => item.name === newItem.name);
        if (!existingItem) {
          merged.debuggers.push(newItem);
        }
      });
    }

    // Merge platforms (only if newHardware.platforms exists and is array)
    if (Array.isArray(newHardware?.platforms)) {
      newHardware.platforms.forEach(newItem => {
        const existingItem = merged.platforms.find(item => item.name === newItem.name);
        if (!existingItem) {
          merged.platforms.push(newItem);
        }
      });
    }

    return merged;
  }

  generateSummary(sessions, hardware) {
    return {
      totalSessions: sessions.length,
      pendingSessions: sessions.filter(s => s.status === 'pending').length,
      hardwareRequiredSessions: sessions.filter(s => s.requiresHardware).length,
      uniqueDebuggers: Array.isArray(hardware?.debuggers) ? hardware.debuggers.length : 0,
      uniquePlatforms: Array.isArray(hardware?.platforms) ? hardware.platforms.length : 0,
      priorityBreakdown: {
        urgent: sessions.filter(s => s.priority === 'urgent').length,
        high: sessions.filter(s => s.priority === 'high').length,
        normal: sessions.filter(s => s.priority === 'normal').length
      },
      totalEstimatedTime: sessions.reduce((total, session) => total + session.estimatedTime, 0)
    };
  }

  emitProgress(message, percentage) {
    if (this.socketService) {
      this.socketService.emitCsvProcessingStatus({
        message,
        percentage
      });
    }
  }
}

module.exports = CsvProcessor;
