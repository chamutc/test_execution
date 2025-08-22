// CSV Handler Class
class CSVHandler {
  constructor(app) {
    this.app = app;
    this.init();
  }

  init() {
    this.initializeFileInput();
    this.initializeDragAndDrop();
  }

  initializeFileInput() {
    const fileInput = document.getElementById('csvFile');
    const uploadZone = document.getElementById('uploadZone');

    // Click to select file
    uploadZone.addEventListener('click', () => {
      fileInput.click();
    });

    // Handle file selection
    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        this.handleFile(file);
      }
    });
  }

  initializeDragAndDrop() {
    const uploadZone = document.getElementById('uploadZone');

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      uploadZone.addEventListener(eventName, this.preventDefaults, false);
      document.body.addEventListener(eventName, this.preventDefaults, false);
    });

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
      uploadZone.addEventListener(eventName, () => {
        uploadZone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      uploadZone.addEventListener(eventName, () => {
        uploadZone.classList.remove('dragover');
      }, false);
    });

    // Handle dropped files
    uploadZone.addEventListener('drop', (event) => {
      const files = event.dataTransfer.files;
      if (files.length > 0) {
        this.handleFile(files[0]);
      }
    }, false);
  }

  preventDefaults(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  async handleFile(file) {
    try {
      // Validate file type
      if (!this.validateFileType(file)) {
        this.app.showNotification('Please select a CSV file', 'error');
        return;
      }

      // Validate file size (10MB limit)
      if (!this.validateFileSize(file)) {
        this.app.showNotification('File size must be less than 10MB', 'error');
        return;
      }

      // Show processing status
      this.showProcessingStatus();

      // Upload and process file
      await this.uploadFile(file);

    } catch (error) {
      console.error('Error handling file:', error);
      this.app.showNotification('Failed to process CSV file', 'error');
      this.hideProcessingStatus();
    }
  }

  validateFileType(file) {
    const validTypes = ['text/csv', 'application/vnd.ms-excel'];
    const validExtensions = ['.csv'];
    
    return validTypes.includes(file.type) || 
           validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  }

  validateFileSize(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    return file.size <= maxSize;
  }

  showProcessingStatus() {
    const processingDiv = document.getElementById('processingStatus');
    const progressFill = document.getElementById('progressFill');
    const processingText = document.getElementById('processingText');

    processingDiv.style.display = 'block';
    progressFill.style.width = '0%';
    processingText.textContent = 'Preparing to upload...';
  }

  hideProcessingStatus() {
    const processingDiv = document.getElementById('processingStatus');
    setTimeout(() => {
      processingDiv.style.display = 'none';
    }, 1000);
  }

  async uploadFile(file) {
    try {
      const formData = new FormData();
      formData.append('csvFile', file);

      const response = await fetch('/api/csv/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        this.app.showNotification('CSV file processed successfully', 'success');
        
        // Update app data
        this.app.data.sessions = result.sessions || [];
        
        // Refresh displays
        this.app.refreshSessionsDisplay();
        
        // Show summary
        this.displayUploadSummary(result.summary);

      } else {
        throw new Error(result.error || 'Upload failed');
      }

    } catch (error) {
      console.error('Upload error:', error);
      this.app.showNotification(error.message || 'Failed to upload CSV file', 'error');
    } finally {
      this.hideProcessingStatus();
    }
  }

  displayUploadSummary(summary) {
    if (!summary) return;

    const summaryDiv = document.getElementById('sessionsSummary');
    const totalSessions = document.getElementById('totalSessions');
    const pendingSessions = document.getElementById('pendingSessions');
    const hardwareRequired = document.getElementById('hardwareRequired');

    summaryDiv.style.display = 'block';
    totalSessions.textContent = summary.totalSessions || 0;
    pendingSessions.textContent = summary.pendingSessions || 0;
    hardwareRequired.textContent = summary.hardwareRequiredSessions || 0;
  }

  async validateCSV(file) {
    try {
      const formData = new FormData();
      formData.append('csvFile', file);

      const response = await fetch('/api/csv/validate', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('Validation error:', error);
      return {
        success: false,
        error: 'Failed to validate CSV file'
      };
    }
  }

  async clearSessions() {
    try {
      const response = await fetch('/api/csv/sessions', {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        this.app.showNotification('All sessions cleared', 'success');
        this.app.data.sessions = [];
        this.app.refreshSessionsDisplay();
      } else {
        throw new Error(result.error || 'Failed to clear sessions');
      }

    } catch (error) {
      console.error('Clear sessions error:', error);
      this.app.showNotification(error.message || 'Failed to clear sessions', 'error');
    }
  }

  downloadSampleCSV() {
    const sampleData = [
      ['Session', 'Platform', 'Debugger', 'OS', 'Priority', 'Num of normal test case', 'Num of combo test case', 'Status'],
      ['API Integration Test', 'Platform_A', 'S32_DBG', 'Ubuntu 24.04', 'high', '0/5/10', '0/1/1', 'pending'],
      ['UI Automation Suite', 'Platform_B', 'Segger', 'Windows 11', 'normal', '0/8/15', '0/0/1', 'pending'],
      ['Performance Benchmark', 'Platform_C', 'PNE', 'Ubuntu 24.04', 'urgent', '0/3/5', '0/2/3', 'pending'],
      ['Security Validation', 'Platform_A', 'S32_DBG', 'Windows 11', 'high', '0/4/8', '0/1/1', 'completed'],
      ['Cross-Platform Test', 'Platform_B', '', 'Ubuntu 24.04', 'normal', '0/6/12', '', 'pending']
    ];

    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_test_sessions.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  formatTestCases(testCases) {
    if (!testCases || typeof testCases !== 'object') {
      return 'N/A';
    }

    const { pass = 0, fail = 0, notRun = 0 } = testCases;
    return `${pass}/${fail}/${notRun}`;
  }

  calculateEstimatedTime(normalTestCases, comboTestCases) {
    const normalToRun = (normalTestCases.fail || 0) + (normalTestCases.notRun || 0);
    const comboToRun = (comboTestCases.fail || 0) + (comboTestCases.notRun || 0);
    
    const normalMinutes = normalToRun * 5; // 5 minutes per normal test case
    const comboMinutes = comboToRun * 120; // 120 minutes per combo test case
    const totalMinutes = normalMinutes + comboMinutes;
    
    return Math.floor((totalMinutes / 60) * 100) / 100; // Precise to 2 decimal places
  }

  exportSessions() {
    if (this.app.data.sessions.length === 0) {
      this.app.showNotification('No sessions to export', 'warning');
      return;
    }

    const headers = [
      'Session Name',
      'Platform',
      'Debugger', 
      'OS',
      'Priority',
      'Normal Test Cases',
      'Combo Test Cases',
      'Estimated Time (hours)',
      'Status',
      'Hardware Required'
    ];

    const rows = this.app.data.sessions.map(session => [
      session.name,
      session.platform || '',
      session.debugger || '',
      session.os || '',
      session.priority,
      this.formatTestCases(session.normalTestCases),
      this.formatTestCases(session.comboTestCases),
      session.estimatedTime.toFixed(2),
      session.status,
      session.requiresHardware ? 'Yes' : 'No'
    ]);

    const csvContent = [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `test_sessions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    this.app.showNotification('Sessions exported successfully', 'success');
  }

  getSessionStatistics() {
    const sessions = this.app.data.sessions;
    
    return {
      total: sessions.length,
      byStatus: {
        pending: sessions.filter(s => s.status === 'pending').length,
        scheduled: sessions.filter(s => s.status === 'scheduled').length,
        completed: sessions.filter(s => s.status === 'completed').length
      },
      byPriority: {
        urgent: sessions.filter(s => s.priority === 'urgent').length,
        high: sessions.filter(s => s.priority === 'high').length,
        normal: sessions.filter(s => s.priority === 'normal').length
      },
      hardwareRequired: sessions.filter(s => s.requiresHardware).length,
      totalEstimatedTime: sessions.reduce((total, session) => total + session.estimatedTime, 0)
    };
  }
}

// Initialize CSV handler when app is ready
document.addEventListener('DOMContentLoaded', () => {
  // Wait for app to be initialized
  setTimeout(() => {
    if (window.app) {
      window.csvHandler = new CSVHandler(window.app);
    }
  }, 100);
});
