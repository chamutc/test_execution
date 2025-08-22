// Global test setup
const path = require('path');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATA_DIR = path.join(__dirname, 'test-data');

// Global test utilities
global.testUtils = {
  // Helper to create test data directory
  createTestDataDir: () => {
    const fs = require('fs');
    const testDataDir = process.env.DATA_DIR;
    
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
  },

  // Helper to clean test data directory
  cleanTestDataDir: () => {
    const fs = require('fs');
    const testDataDir = process.env.DATA_DIR;
    
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  },

  // Helper to create mock CSV data
  createMockCsvData: (sessions = []) => {
    const defaultSessions = [
      {
        Session: 'Test Session 1',
        Platform: 'Platform_A',
        Debugger: 'S32_DBG',
        OS: 'Ubuntu 20.04',
        Priority: 'high',
        'Num of normal test case': 'pass:5,fail:3,not_run:2',
        'Num of combo test case': 'pass:1,fail:1,not_run:0',
        Status: 'pending'
      },
      {
        Session: 'Test Session 2',
        Platform: 'Platform_B',
        Debugger: 'Segger',
        OS: 'Windows 11',
        Priority: 'normal',
        'Num of normal test case': 'pass:8,fail:2,not_run:0',
        'Num of combo test case': 'pass:0,fail:0,not_run:1',
        Status: 'pending'
      }
    ];

    const sessionsToUse = sessions.length > 0 ? sessions : defaultSessions;
    
    const headers = Object.keys(sessionsToUse[0]);
    const csvRows = [
      headers.join(','),
      ...sessionsToUse.map(session => 
        headers.map(header => `"${session[header] || ''}"`).join(',')
      )
    ];

    return csvRows.join('\n');
  },

  // Helper to create mock hardware data
  createMockHardwareData: () => ({
    platforms: [
      {
        id: 'platform1',
        name: 'Test Platform 1',
        type: 'hardware',
        quantityInStock: 5,
        status: 'active'
      },
      {
        id: 'platform2',
        name: 'Test Platform 2',
        type: 'hardware',
        quantityInStock: 3,
        status: 'active'
      }
    ],
    debuggers: [
      {
        id: 'debugger1',
        name: 'Test Debugger 1',
        type: 'hardware',
        quantityInStock: 4,
        status: 'active'
      },
      {
        id: 'debugger2',
        name: 'Test Debugger 2',
        type: 'hardware',
        quantityInStock: 2,
        status: 'active'
      }
    ]
  }),

  // Helper to create mock session data
  createMockSessionData: () => [
    {
      id: 'session1',
      name: 'Test Session 1',
      platform: 'Test Platform 1',
      debugger: 'Test Debugger 1',
      os: 'Ubuntu 20.04',
      priority: 'high',
      estimatedTime: 2.5,
      status: 'pending',
      requiresHardware: true
    },
    {
      id: 'session2',
      name: 'Test Session 2',
      platform: 'Test Platform 2',
      debugger: 'Test Debugger 2',
      os: 'Windows 11',
      priority: 'normal',
      estimatedTime: 1.5,
      status: 'pending',
      requiresHardware: true
    }
  ],

  // Helper to create mock machine data
  createMockMachineData: () => [
    {
      id: 'machine1',
      name: 'Test Machine 1',
      type: 'physical',
      os: 'Ubuntu 20.04',
      status: 'available',
      capabilities: ['testing', 'debugging']
    },
    {
      id: 'machine2',
      name: 'Test Machine 2',
      type: 'virtual',
      os: 'Windows 11',
      status: 'available',
      capabilities: ['testing']
    }
  ],

  // Helper to wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper to generate unique IDs for tests
  generateTestId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
};

// Setup console logging for tests
const originalConsoleError = console.error;
console.error = (...args) => {
  // Suppress expected error messages in tests
  const message = args[0];
  if (typeof message === 'string') {
    const suppressedMessages = [
      'Warning: ReactDOM.render is deprecated',
      'Warning: componentWillMount has been renamed',
      'Warning: componentWillReceiveProps has been renamed'
    ];
    
    if (suppressedMessages.some(suppressed => message.includes(suppressed))) {
      return;
    }
  }
  
  originalConsoleError.apply(console, args);
};

// Global beforeEach for all tests
beforeEach(() => {
  // Create test data directory
  global.testUtils.createTestDataDir();
});

// Global afterEach for all tests
afterEach(() => {
  // Clean up test data directory
  global.testUtils.cleanTestDataDir();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in tests, just log the error
});

// Increase timeout for integration tests
jest.setTimeout(30000);
