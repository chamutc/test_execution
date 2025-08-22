const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');

// Import the actual server components
const csvRoutes = require('../../backend/routes/csvRoutes');
const hardwareRoutes = require('../../backend/routes/hardwareRoutes');
const sessionRoutes = require('../../backend/routes/sessionRoutes');
const DataService = require('../../backend/services/dataService');

describe('CSV Import Integration Flow', () => {
  let app;
  let dataService;

  beforeAll(() => {
    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Initialize data service
    dataService = new DataService();

    // Add middleware to inject dataService
    app.use((req, res, next) => {
      req.dataService = dataService;
      next();
    });

    // Mount routes
    app.use('/api/csv', csvRoutes);
    app.use('/api/hardware', hardwareRoutes);
    app.use('/api/sessions', sessionRoutes);
  });

  beforeEach(() => {
    // Reset data service state before each test
    dataService.db.reset();
  });

  describe('Complete CSV Import Flow', () => {
    test('should import CSV and create all related data structures', async () => {
      // Create test CSV content
      const csvContent = `Session,Platform,Debugger,OS,Priority,Num of normal test case,Num of combo test case,Status
Test Session 1,Platform_A,S32_DBG,Ubuntu 24.04,high,pass:5;fail:3;not_run:2,pass:1;fail:1;not_run:0,pending
Test Session 2,Platform_B,Segger,Windows 11,normal,pass:8;fail:2;not_run:0,pass:0;fail:0;not_run:1,pending
Test Session 3,Platform_A,J-Link,Ubuntu 20.04,urgent,pass:10;fail:0;not_run:5,pass:2;fail:0;not_run:0,pending`;

      // Write test CSV file
      const testFilePath = path.join(__dirname, 'test-import.csv');
      fs.writeFileSync(testFilePath, csvContent);

      try {
        // Step 1: Upload and process CSV
        const uploadResponse = await request(app)
          .post('/api/csv/upload')
          .attach('csvFile', testFilePath)
          .expect(200);

        expect(uploadResponse.body.success).toBe(true);
        expect(uploadResponse.body.summary.totalSessions).toBe(3);

        // Step 2: Verify sessions were created
        const sessionsResponse = await request(app)
          .get('/api/sessions')
          .expect(200);

        expect(sessionsResponse.body.success).toBe(true);
        expect(sessionsResponse.body.sessions).toHaveLength(3);

        const sessions = sessionsResponse.body.sessions;
        expect(sessions.map(s => s.name)).toContain('Test Session 1');
        expect(sessions.map(s => s.name)).toContain('Test Session 2');
        expect(sessions.map(s => s.name)).toContain('Test Session 3');

        // Step 3: Verify platforms were created
        const platformsResponse = await request(app)
          .get('/api/hardware/platforms')
          .expect(200);

        expect(platformsResponse.body.success).toBe(true);
        expect(platformsResponse.body.data).toHaveLength(2); // Platform_A and Platform_B
        
        const platformNames = platformsResponse.body.data.map(p => p.name);
        expect(platformNames).toContain('Platform_A');
        expect(platformNames).toContain('Platform_B');

        // Step 4: Verify debuggers were created
        const debuggersResponse = await request(app)
          .get('/api/hardware/debuggers')
          .expect(200);

        expect(debuggersResponse.body.success).toBe(true);
        expect(debuggersResponse.body.data).toHaveLength(3); // S32_DBG, Segger, J-Link
        
        const debuggerNames = debuggersResponse.body.data.map(d => d.name);
        expect(debuggerNames).toContain('S32_DBG');
        expect(debuggerNames).toContain('Segger');
        expect(debuggerNames).toContain('J-Link');

        // Step 5: Verify hardware combinations were created
        const combinationsResponse = await request(app)
          .get('/api/hardware/combinations')
          .expect(200);

        expect(combinationsResponse.body.success).toBe(true);
        expect(combinationsResponse.body.data).toHaveLength(3); // 3 unique combinations

        // Step 6: Verify inventory was created
        const inventoryResponse = await request(app)
          .get('/api/hardware/inventory')
          .expect(200);

        expect(inventoryResponse.body.success).toBe(true);
        expect(inventoryResponse.body.data).toHaveLength(3); // One inventory per combination

        // Step 7: Verify availability schedules were created
        const availabilityResponse = await request(app)
          .get('/api/hardware/availability')
          .expect(200);

        expect(availabilityResponse.body.success).toBe(true);
        expect(availabilityResponse.body.data).toHaveLength(21); // 3 combinations × 7 days

      } finally {
        // Clean up test file
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    test('should handle CSV with duplicate hardware combinations', async () => {
      const csvContent = `Session,Platform,Debugger,OS,Priority,Num of normal test case,Num of combo test case,Status
Session 1,Platform_A,Debugger_X,Ubuntu 20.04,normal,10,1,pending
Session 2,Platform_A,Debugger_X,Ubuntu 22.04,high,15,2,pending
Session 3,Platform_B,Debugger_Y,Windows 10,normal,8,0,pending`;

      const testFilePath = path.join(__dirname, 'test-duplicates.csv');
      fs.writeFileSync(testFilePath, csvContent);

      try {
        const uploadResponse = await request(app)
          .post('/api/csv/upload')
          .attach('csvFile', testFilePath)
          .expect(200);

        expect(uploadResponse.body.success).toBe(true);

        // Should create 2 unique hardware combinations (not 3)
        const combinationsResponse = await request(app)
          .get('/api/hardware/combinations')
          .expect(200);

        expect(combinationsResponse.body.data).toHaveLength(2);

      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    test('should skip completed sessions during import', async () => {
      const csvContent = `Session,Platform,Debugger,OS,Priority,Num of normal test case,Num of combo test case,Status
Active Session,Platform_A,Debugger_X,Ubuntu 20.04,normal,10,1,pending
Completed Session,Platform_B,Debugger_Y,Windows 10,high,15,2,completed
Another Active,Platform_C,Debugger_Z,macOS,urgent,5,0,pending`;

      const testFilePath = path.join(__dirname, 'test-completed.csv');
      fs.writeFileSync(testFilePath, csvContent);

      try {
        const uploadResponse = await request(app)
          .post('/api/csv/upload')
          .attach('csvFile', testFilePath)
          .expect(200);

        expect(uploadResponse.body.success).toBe(true);
        expect(uploadResponse.body.summary.totalSessions).toBe(2); // Only non-completed

        const sessionsResponse = await request(app)
          .get('/api/sessions')
          .expect(200);

        const sessionNames = sessionsResponse.body.sessions.map(s => s.name);
        expect(sessionNames).toContain('Active Session');
        expect(sessionNames).toContain('Another Active');
        expect(sessionNames).not.toContain('Completed Session');

      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    test('should handle sessions without hardware requirements', async () => {
      const csvContent = `Session,Platform,Debugger,OS,Priority,Num of normal test case,Num of combo test case,Status
Hardware Session,Platform_A,Debugger_X,Ubuntu 20.04,normal,10,1,pending
Software Only,,,,normal,5,0,pending
Mixed Session,Platform_B,,Windows 10,high,8,1,pending`;

      const testFilePath = path.join(__dirname, 'test-no-hardware.csv');
      fs.writeFileSync(testFilePath, csvContent);

      try {
        const uploadResponse = await request(app)
          .post('/api/csv/upload')
          .attach('csvFile', testFilePath)
          .expect(200);

        expect(uploadResponse.body.success).toBe(true);
        expect(uploadResponse.body.summary.totalSessions).toBe(3);

        const sessionsResponse = await request(app)
          .get('/api/sessions')
          .expect(200);

        const sessions = sessionsResponse.body.sessions;
        
        // Find sessions by name
        const hardwareSession = sessions.find(s => s.name === 'Hardware Session');
        const softwareSession = sessions.find(s => s.name === 'Software Only');
        const mixedSession = sessions.find(s => s.name === 'Mixed Session');

        expect(hardwareSession.requiresHardware).toBe(true);
        expect(softwareSession.requiresHardware).toBe(false);
        expect(mixedSession.requiresHardware).toBe(false); // Both platform AND debugger required

      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });
  });

  describe('Error Handling', () => {
    test('should reject invalid CSV format', async () => {
      const invalidCsvContent = `Invalid,Headers
Data,Row`;

      const testFilePath = path.join(__dirname, 'test-invalid.csv');
      fs.writeFileSync(testFilePath, invalidCsvContent);

      try {
        const uploadResponse = await request(app)
          .post('/api/csv/upload')
          .attach('csvFile', testFilePath)
          .expect(400);

        expect(uploadResponse.body.success).toBe(false);
        expect(uploadResponse.body.error).toContain('Missing required columns');

      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    test('should handle file upload errors', async () => {
      const response = await request(app)
        .post('/api/csv/upload')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No file uploaded');
    });

    test('should handle large CSV files gracefully', async () => {
      // Create a large CSV with many rows
      let csvContent = 'Session,Platform,Debugger,OS,Priority,Num of normal test case,Num of combo test case,Status\n';
      
      for (let i = 1; i <= 1000; i++) {
        csvContent += `Session ${i},Platform_${i % 10},Debugger_${i % 5},Ubuntu 20.04,normal,10,1,pending\n`;
      }

      const testFilePath = path.join(__dirname, 'test-large.csv');
      fs.writeFileSync(testFilePath, csvContent);

      try {
        const uploadResponse = await request(app)
          .post('/api/csv/upload')
          .attach('csvFile', testFilePath)
          .expect(200);

        expect(uploadResponse.body.success).toBe(true);
        expect(uploadResponse.body.summary.totalSessions).toBe(1000);

      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    }, 30000); // Increase timeout for large file test
  });
});
