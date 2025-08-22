// Main Application Class
class JenkinsTestScheduler {
  constructor() {
    console.log('JenkinsTestScheduler constructor called');
    this.socket = null;
    this.currentTab = 'csv-import';
    this.data = {
      sessions: [],
      hardware: { debuggers: [], platforms: [] },
      machines: [],
      machineTypes: [],
      schedule: { timeSlots: [], assignments: [] },
      queue: []
    };

    console.log('Starting initialization...');
    this.init();
  }

  init() {
    try {
      console.log('Starting app initialization...');

      // Clean up any existing modals first
      this.cleanupExistingModals();
      console.log('Modals cleaned up');

      // Initialize basic UI
      this.initializeBasicUI();
      console.log('Basic UI initialized');

      // Initialize navigation with a small delay to ensure DOM is ready
      setTimeout(() => {
        this.initializeNavigation();
        console.log('Navigation initialized');
      }, 50);

      // Initialize event listeners
      this.initializeEventListeners();
      console.log('Event listeners initialized');

      // Initialize drag and drop
      this.initializeDragAndDrop();
      console.log('Drag and drop initialized');

      // Initialize socket (non-blocking)
      setTimeout(() => {
        this.initializeSocket();
      }, 100);

      // Load data (non-blocking)
      setTimeout(() => {
        this.loadInitialData().catch(error => {
          console.warn('Initial data load failed:', error);
        });
      }, 500);

      console.log('App initialization completed');

    } catch (error) {
      console.error('App initialization failed:', error);
      this.showErrorMessage('Application failed to initialize. Please refresh the page.');
    }
  }

  initializeBasicUI() {
    try {
      // Set initial connection status to connecting
      this.updateConnectionStatus('connecting');

      // Show default section
      this.showSection('timelineSection');

      // Initialize button listeners immediately for offline functionality
      setTimeout(() => {
        this.initializeButtonEventListeners();
      }, 100);

      console.log('Basic UI setup completed');
    } catch (error) {
      console.error('Basic UI initialization error:', error);
    }
  }

  showErrorMessage(message) {
    try {
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = `
        position: fixed; top: 20px; right: 20px;
        background: #f8d7da; color: #721c24;
        padding: 15px 20px; border-radius: 4px;
        border: 1px solid #f5c6cb; z-index: 999999;
        max-width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      errorDiv.innerHTML = `
        <strong>Error:</strong> ${message}
        <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; color: #721c24; cursor: pointer; font-size: 16px; margin-left: 10px;">×</button>
      `;
      document.body.appendChild(errorDiv);

      // Auto-remove after 10 seconds
      setTimeout(() => {
        if (errorDiv.parentElement) {
          errorDiv.remove();
        }
      }, 10000);
    } catch (error) {
      console.error('Could not show error message:', error);
    }
  }

  initializeUI() {
    // This method is kept for compatibility but functionality moved to initializeBasicUI
    console.log('initializeUI called (legacy)');
  }

  cleanupExistingModals() {
    // Remove any existing modal backdrops
    const existingBackdrops = document.querySelectorAll('.modal-backdrop');
    existingBackdrops.forEach(backdrop => {
      backdrop.remove();
    });

    // Hide any visible modals
    const existingModals = document.querySelectorAll('.modal');
    existingModals.forEach(modal => {
      modal.style.display = 'none';
    });

    // Remove any modal-related classes from body
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';

    console.log('Cleaned up existing modals');
  }

  // Global method to close any modal
  closeAllModals() {
    this.cleanupExistingModals();
  }

  initializeSocket() {
    try {
      // Check if Socket.IO is available
      if (typeof io === 'undefined') {
        console.warn('Socket.IO not available, running in offline mode');
        this.updateConnectionStatus(false);
        return;
      }

      // Set connecting status
      this.updateConnectionStatus('connecting');

      this.socket = io();

      this.socket.on('connect', () => {
        this.updateConnectionStatus(true);
        console.log('Connected to server');
      });

      this.socket.on('disconnect', () => {
        this.updateConnectionStatus(false);
        console.log('Disconnected from server');
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.updateConnectionStatus(false);
      });

      // Add connection timeout
      setTimeout(() => {
        if (!this.socket || !this.socket.connected) {
          console.warn('Socket connection timeout, running in offline mode');
          this.updateConnectionStatus(false);

          // Force connected status after another 2 seconds for UI functionality
          setTimeout(() => {
            console.log('Forcing connected status for UI functionality');
            this.updateConnectionStatus(true);
          }, 2000);
        }
      }, 5000);
    } catch (error) {
      console.error('Socket initialization error:', error);
      this.updateConnectionStatus(false);
    }

      // Listen for real-time updates only if socket is available
      if (this.socket) {
        this.socket.on('sessions:updated', (sessions) => {
          this.data.sessions = sessions;
          this.refreshSessionsDisplay();
        });

        this.socket.on('hardware:updated', (hardware) => {
          this.data.hardware = hardware;
          this.refreshHardwareDisplay();
        });

        this.socket.on('machines:updated', (machines) => {
          this.data.machines = machines;
          this.refreshMachinesDisplay();
          this.refreshTimelineDisplay(); // Also refresh timeline when machines change
        });

        this.socket.on('machineTypes:updated', (machineTypes) => {
          console.log('Machine types updated:', machineTypes);
          // Refresh timeline to show new machines
          if (window.timelineManager) {
            window.timelineManager.refreshAllData();
          }
        });

        this.socket.on('schedule:updated', (schedule) => {
          this.data.schedule = schedule;
          this.refreshTimelineDisplay();
        });

        this.socket.on('queue:updated', (queue) => {
          this.data.queue = queue;
          this.refreshQueueDisplay();
        });

        this.socket.on('csv:processing', (status) => {
          this.updateProcessingStatus(status);
        });

        this.socket.on('scheduling:progress', (progress) => {
          this.updateSchedulingProgress(progress);
        });

        this.socket.on('error', (error) => {
          this.showNotification(error, 'error');
        });

        this.socket.on('success', (message) => {
          this.showNotification(message, 'success');
        });
      }
    } catch (error) {
      console.error('Socket setup error:', error);
      this.updateConnectionStatus(false);
    }
  }

  initializeNavigation() {
    // For index.html (Timeline page), only handle timeline navigation
    const timelineTab = document.getElementById('timelineTab');

    if (timelineTab) {
      timelineTab.addEventListener('click', (e) => {
        e.preventDefault();
        this.showSection('timelineSection');
        this.updateActiveNavigation('timelineTab');
      });
    }

    // Always show timeline section for index.html
    this.showSection('timelineSection');
    this.updateActiveNavigation('timelineTab');
  }

  showSection(sectionId) {
    // For index.html, only handle timelineSection
    if (sectionId === 'timelineSection') {
      console.log('Loading Timeline section...');

      // Clear any existing inline styles first
      const allSections = document.querySelectorAll('section');
      allSections.forEach(section => {
        section.style.display = '';
        section.style.visibility = '';
        section.style.opacity = '';
        section.style.height = '';
        section.style.overflow = '';
      });

      // Show timeline section
      const timelineSection = document.getElementById('timelineSection');
      if (timelineSection) {
        timelineSection.classList.remove('hidden-section');
        timelineSection.classList.add('visible-section');
      }

      // Initialize timeline manager if not already done
      if (!this.timelineManager && typeof TimelineManager !== 'undefined') {
        this.timelineManager = new TimelineManager(this);
      }
      if (this.timelineManager) {
        // Set today's date and generate timeline
        this.timelineManager.setCurrentDate(new Date());
        this.timelineManager.generateTimeline();
      }
    } else if (sectionId === 'sessionsSection') {
      // For sessions, redirect to sessions-management.html
      window.location.href = 'sessions-management.html';
    }
  }

  updateActiveNavigation(activeTabId) {
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });

    // Add active class to the selected tab
    const activeTab = document.getElementById(activeTabId);
    if (activeTab) {
      activeTab.classList.add('active');
    }
  }

  async loadSessionsDisplay() {
    try {
      // Load sessions data
      await this.loadInitialData();

      // Update session statistics
      this.updateSessionStatistics();

      // Populate sessions table
      this.populateSessionsTable();

    } catch (error) {
      console.error('Error loading sessions display:', error);
      this.showNotification('Failed to load sessions data', 'error');
    }
  }

  updateSessionStatistics() {
    const sessions = this.data.sessions || [];

    const totalCount = sessions.length;
    const pendingCount = sessions.filter(s => s.status === 'pending').length;
    const scheduledCount = sessions.filter(s => s.status === 'scheduled').length;
    const completedCount = sessions.filter(s => s.status === 'completed').length;

    // Update statistics display
    const totalElement = document.getElementById('totalSessionsCount');
    const pendingElement = document.getElementById('pendingSessionsCount');
    const scheduledElement = document.getElementById('scheduledSessionsCount');
    const completedElement = document.getElementById('completedSessionsCount');

    if (totalElement) totalElement.textContent = totalCount;
    if (pendingElement) pendingElement.textContent = pendingCount;
    if (scheduledElement) scheduledElement.textContent = scheduledCount;
    if (completedElement) completedElement.textContent = completedCount;
  }

  populateSessionsTable() {
    const sessions = this.data.sessions || [];
    const tableBody = document.getElementById('sessionsTableBody');

    if (!tableBody) return;

    if (sessions.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="9" class="empty-state">
            <div class="empty-message">
              <div class="empty-icon">📋</div>
              <div class="empty-text">No sessions found</div>
              <div class="empty-description">Import a CSV file or add sessions manually to get started</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = sessions.map(session => this.renderSessionRow(session)).join('');
  }

  renderSessionRow(session) {
    const statusClass = this.getStatusClass(session.status);
    const hardwareRequired = session.requiresHardware ? '✅ Yes' : '❌ No';

    return `
      <tr class="session-row" data-session-id="${session.id}">
        <td class="session-name">${session.name}</td>
        <td class="session-platform">${session.platform || '-'}</td>
        <td class="session-debugger">${session.debugger || '-'}</td>
        <td class="session-os">${session.os || '-'}</td>
        <td class="session-priority">
          <span class="priority-badge priority-${session.priority}">${session.priority}</span>
        </td>
        <td class="session-time">${session.estimatedTime || 1}h</td>
        <td class="session-status">
          <span class="status-badge ${statusClass}">${session.status}</span>
        </td>
        <td class="session-hardware">${hardwareRequired}</td>
        <td class="session-actions">
          <button class="btn btn-small btn-primary" onclick="window.app.editSession('${session.id}')">
            ✏️ Edit
          </button>
          <button class="btn btn-small btn-danger" onclick="window.app.deleteSession('${session.id}')">
            🗑️ Delete
          </button>
        </td>
      </tr>
    `;
  }

  getStatusClass(status) {
    const statusClasses = {
      'pending': 'status-pending',
      'scheduled': 'status-scheduled',
      'running': 'status-running',
      'completed': 'status-completed',
      'failed': 'status-failed'
    };
    return statusClasses[status] || 'status-unknown';
  }

  initializeDragAndDrop() {
    const dragDropZone = document.getElementById('dragDropZone');
    const csvFileInput = document.getElementById('csvFileInput');
    const browseFilesBtn = document.getElementById('browseFilesBtn');

    if (!dragDropZone || !csvFileInput) return;

    // Browse files button
    if (browseFilesBtn) {
      browseFilesBtn.addEventListener('click', (e) => {
        e.preventDefault();
        csvFileInput.click();
      });
    }

    // File input change
    csvFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.handleFileUpload(file);
      }
    });

    // Drag and drop events
    dragDropZone.addEventListener('click', () => {
      csvFileInput.click();
    });

    dragDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dragDropZone.classList.add('drag-over');
    });

    dragDropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      if (!dragDropZone.contains(e.relatedTarget)) {
        dragDropZone.classList.remove('drag-over');
      }
    });

    dragDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dragDropZone.classList.remove('drag-over');

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          this.handleFileUpload(file);
        } else {
          this.showNotification('Please select a CSV file', 'error');
        }
      }
    });
  }

  async handleFileUpload(file) {
    try {
      // Validate file
      if (!file) {
        throw new Error('No file selected');
      }

      if (!file.name.endsWith('.csv')) {
        throw new Error('Please select a CSV file');
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('File size too large. Please select a file smaller than 10MB');
      }

      // Show progress
      this.showImportProgress();

      // Create form data
      const formData = new FormData();
      formData.append('csvFile', file);

      // Upload file with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch('/api/csv/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('CSV upload service is not available. Please check server configuration.');
        } else if (response.status === 413) {
          throw new Error('File too large. Please select a smaller file.');
        } else if (response.status >= 500) {
          throw new Error('Server error occurred. Please try again later.');
        } else {
          throw new Error(`Upload failed with status: ${response.status}`);
        }
      }

      const result = await response.json();

      if (result.success) {
        this.showImportResults(result);
        await this.loadInitialData(); // Refresh data
      } else {
        throw new Error(result.error || 'Upload processing failed');
      }

    } catch (error) {
      console.error('File upload error:', error);

      let errorMessage = 'File upload failed';
      if (error.name === 'AbortError') {
        errorMessage = 'Upload timed out. Please try again with a smaller file.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      this.showNotification(errorMessage, 'error');
      this.hideImportProgress();
    }
  }

  showImportProgress() {
    const dragDropZone = document.getElementById('dragDropZone');
    const importProgress = document.getElementById('importProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    if (dragDropZone) dragDropZone.style.display = 'none';
    if (importProgress) importProgress.style.display = 'block';

    // Simulate progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }

      if (progressFill) progressFill.style.width = `${progress}%`;
      if (progressText) {
        if (progress < 30) progressText.textContent = 'Uploading file...';
        else if (progress < 70) progressText.textContent = 'Processing CSV data...';
        else if (progress < 95) progressText.textContent = 'Creating sessions...';
        else progressText.textContent = 'Finalizing...';
      }
    }, 200);
  }

  hideImportProgress() {
    const dragDropZone = document.getElementById('dragDropZone');
    const importProgress = document.getElementById('importProgress');

    if (dragDropZone) dragDropZone.style.display = 'block';
    if (importProgress) importProgress.style.display = 'none';
  }

  showImportResults(result) {
    const importProgress = document.getElementById('importProgress');
    const importResults = document.getElementById('importResults');
    const totalSessions = document.getElementById('totalSessions');
    const pendingSessions = document.getElementById('pendingSessions');
    const hardwareRequired = document.getElementById('hardwareRequired');

    if (importProgress) importProgress.style.display = 'none';
    if (importResults) importResults.style.display = 'block';

    // Update statistics
    if (totalSessions) totalSessions.textContent = result.sessions?.length || 0;
    if (pendingSessions) pendingSessions.textContent = result.sessions?.filter(s => s.status === 'pending').length || 0;
    if (hardwareRequired) hardwareRequired.textContent = result.sessions?.filter(s => s.requiresHardware).length || 0;

    // Setup result actions
    const viewImportedDataBtn = document.getElementById('viewImportedDataBtn');
    const importAnotherBtn = document.getElementById('importAnotherBtn');

    if (viewImportedDataBtn) {
      viewImportedDataBtn.addEventListener('click', () => {
        this.showSection('timelineSection');
        this.updateActiveNavigation('timelineTab');
      });
    }

    if (importAnotherBtn) {
      importAnotherBtn.addEventListener('click', () => {
        this.resetImportInterface();
      });
    }

    this.showNotification(`Successfully imported ${result.sessions?.length || 0} sessions`, 'success');
  }

  resetImportInterface() {
    const dragDropZone = document.getElementById('dragDropZone');
    const importProgress = document.getElementById('importProgress');
    const importResults = document.getElementById('importResults');
    const csvFileInput = document.getElementById('csvFileInput');

    if (dragDropZone) dragDropZone.style.display = 'block';
    if (importProgress) importProgress.style.display = 'none';
    if (importResults) importResults.style.display = 'none';
    if (csvFileInput) csvFileInput.value = '';
  }

  loadTabData(tabId) {
    switch (tabId) {
      case 'csv-import':
        this.refreshSessionsDisplay();
        break;
      case 'management':
        this.refreshHardwareDisplay();
        this.refreshMachinesDisplay();
        break;
      case 'timeline':
        this.refreshTimelineDisplay();
        this.refreshQueueDisplay();
        break;
    }
  }

  initializeEventListeners() {
    // Global error handling - less intrusive
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      // Only show notification for critical errors, not API failures
      if (event.error && !event.error.message.includes('fetch')) {
        this.showNotification('An unexpected error occurred', 'error');
      }
    });

    // Handle unhandled promise rejections - less intrusive
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      // Only show notification for critical promise rejections
      if (event.reason && !event.reason.message?.includes('fetch') && !event.reason.message?.includes('404')) {
        this.showNotification('An unexpected error occurred', 'error');
      }
      // Prevent the default browser behavior
      event.preventDefault();
    });

    // Add escape key handler to close modals
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.closeAllModals();
      }
    });

    // Add click handler to close modals when clicking outside
    document.addEventListener('click', (event) => {
      if (event.target.classList.contains('modal-backdrop')) {
        this.closeAllModals();
      }
    });

    // Emergency close button
    const emergencyCloseBtn = document.getElementById('emergencyCloseBtn');
    if (emergencyCloseBtn) {
      emergencyCloseBtn.addEventListener('click', () => {
        this.closeAllModals();
      });
    }

    // Show/hide emergency close button based on modal visibility
    this.setupModalWatcher();

    // Initialize button event listeners
    this.initializeButtonEventListeners();
  }

  initializeButtonEventListeners() {
    console.log('🔧 Initializing button event listeners...');

    // Sessions management buttons
    const addSessionBtn = document.getElementById('addSessionBtn');
    if (addSessionBtn) {
      addSessionBtn.addEventListener('click', () => {
        console.log('Add Session button clicked');
        this.showAddSessionModal();
      });
      console.log('✅ Add Session button listener added');
    } else {
      console.warn('❌ Add Session button not found');
    }

    const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
    if (downloadTemplateBtn) {
      downloadTemplateBtn.addEventListener('click', () => {
        console.log('Download Template button clicked');
        this.downloadCSVTemplate();
      });
      console.log('✅ Download Template button listener added');
    } else {
      console.warn('❌ Download Template button not found');
    }

    const viewImportHistoryBtn = document.getElementById('viewImportHistoryBtn');
    if (viewImportHistoryBtn) {
      viewImportHistoryBtn.addEventListener('click', () => {
        console.log('View Import History button clicked');
        this.showImportHistory();
      });
      console.log('✅ View Import History button listener added');
    } else {
      console.warn('❌ View Import History button not found');
    }

    const exportSessionsBtn = document.getElementById('exportSessionsBtn');
    if (exportSessionsBtn) {
      exportSessionsBtn.addEventListener('click', () => {
        console.log('Export Sessions button clicked');
        this.exportSessions();
      });
      console.log('✅ Export Sessions button listener added');
    } else {
      console.warn('❌ Export Sessions button not found');
    }

    const clearAllSessionsBtn = document.getElementById('clearAllSessionsBtn');
    if (clearAllSessionsBtn) {
      clearAllSessionsBtn.addEventListener('click', () => {
        console.log('Clear All Sessions button clicked');
        this.clearAllSessions();
      });
      console.log('✅ Clear All Sessions button listener added');
    } else {
      console.warn('❌ Clear All Sessions button not found');
    }

    console.log('🎉 Button event listeners initialization completed');
  }

  setupModalWatcher() {
    // Watch for modal changes
    const observer = new MutationObserver((mutations) => {
      const hasVisibleModal = document.querySelector('.modal-backdrop.show') ||
                             document.querySelector('.modal[style*="display: block"]') ||
                             document.querySelector('.modal[style*="display: flex"]');

      const emergencyBtn = document.getElementById('emergencyCloseBtn');
      if (emergencyBtn) {
        if (hasVisibleModal) {
          emergencyBtn.classList.add('show');
        } else {
          emergencyBtn.classList.remove('show');
        }
      }
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }

  async loadInitialData() {
    try {
      // Initialize data structure
      this.data = this.data || {
        sessions: [],
        machines: [],
        machineTypes: [],
        hardware: { debuggers: [], platforms: [] },
        schedule: { timeSlots: [], assignments: [] },
        queue: []
      };

      // Set a timeout for data loading to prevent hanging
      const loadTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Data loading timeout')), 10000);
      });

      // Load sessions with error handling and timeout
      try {
        const sessionsPromise = fetch('/api/csv/sessions', {
          signal: AbortSignal.timeout(5000)
        });
        const sessionsResponse = await Promise.race([sessionsPromise, loadTimeout]);
        if (sessionsResponse.ok) {
          const sessionsData = await sessionsResponse.json();
          this.data.sessions = sessionsData.sessions || [];
        } else if (sessionsResponse.status !== 404) {
          console.warn('Failed to load sessions:', sessionsResponse.status);
        }
      } catch (sessionError) {
        console.warn('Sessions API not available:', sessionError.message);
      }

      // Load hardware with error handling
      try {
        const hardwareResponse = await fetch('/api/hardware');
        if (hardwareResponse.ok) {
          const hardwareData = await hardwareResponse.json();
          this.data.hardware = hardwareData.hardware || { debuggers: [], platforms: [] };
        } else if (hardwareResponse.status !== 404) {
          console.warn('Failed to load hardware:', hardwareResponse.status);
        }
      } catch (hardwareError) {
        console.warn('Hardware API not available:', hardwareError.message);
      }

      // Load machines with error handling
      try {
        const machinesResponse = await fetch('/api/machines');
        if (machinesResponse.ok) {
          const machinesData = await machinesResponse.json();
          this.data.machines = machinesData.machines || [];
        } else if (machinesResponse.status !== 404) {
          console.warn('Failed to load machines:', machinesResponse.status);
        }
      } catch (machineError) {
        console.warn('Machines API not available:', machineError.message);
      }

      // Load machine types with error handling
      try {
        const machineTypesResponse = await fetch('/api/machines/types');
        if (machineTypesResponse.ok) {
          const machineTypesData = await machineTypesResponse.json();
          this.data.machineTypes = machineTypesData.machineTypes || [];
        } else if (machineTypesResponse.status !== 404) {
          console.warn('Failed to load machine types:', machineTypesResponse.status);
        }
      } catch (machineTypesError) {
        console.warn('Machine types API not available:', machineTypesError.message);
      }

      // Load schedule with error handling
      try {
        const scheduleResponse = await fetch('/api/schedule');
        if (scheduleResponse.ok) {
          const scheduleData = await scheduleResponse.json();
          this.data.schedule = scheduleData.schedule || { timeSlots: [], assignments: [] };
        } else if (scheduleResponse.status !== 404) {
          console.warn('Failed to load schedule:', scheduleResponse.status);
        }
      } catch (scheduleError) {
        console.warn('Schedule API not available:', scheduleError.message);
      }

      // Load queue with error handling
      try {
        const queueResponse = await fetch('/api/schedule/queue');
        if (queueResponse.ok) {
          const queueData = await queueResponse.json();
          this.data.queue = queueData.queue || [];
        } else if (queueResponse.status !== 404) {
          console.warn('Failed to load queue:', queueResponse.status);
        }
      } catch (queueError) {
        console.warn('Queue API not available:', queueError.message);
      }

      // Refresh displays
      this.refreshAllDisplays();

    } catch (error) {
      console.error('Error loading initial data:', error);
      // Don't show error notification for initial load failures during development
      console.warn('Initial data load failed, using empty data structures');
    }
  }

  refreshAllDisplays() {
    this.refreshSessionsDisplay();
    this.refreshHardwareDisplay();
    this.refreshMachinesDisplay();
    this.refreshTimelineDisplay();
    this.refreshQueueDisplay();
  }

  refreshSessionsDisplay() {
    if (this.currentTab === 'csv-import') {
      this.updateSessionsSummary();
      this.updateSessionsTable();
    }
  }

  refreshHardwareDisplay() {
    if (this.currentTab === 'management') {
      this.updateHardwareLists();
    }
  }

  refreshMachinesDisplay() {
    if (this.currentTab === 'management') {
      this.updateMachineSummary();
      this.updateMachineTypesList();
      this.updateMachinesList();
    }
  }

  refreshTimelineDisplay() {
    if (this.currentTab === 'timeline') {
      this.updateTimelineGrid();
    }
  }

  refreshQueueDisplay() {
    if (this.currentTab === 'timeline') {
      this.updateQueueSection();
    }
  }

  updateConnectionStatus(status) {
    try {
      const statusIndicator = document.querySelector('.status-indicator');
      const statusText = document.querySelector('.status-text');

      if (statusIndicator && statusText) {
        // Remove all status classes
        statusIndicator.classList.remove('connected', 'connecting', 'disconnected');

        if (status === true || status === 'connected') {
          statusIndicator.classList.add('connected');
          statusText.textContent = 'Connected';
        } else if (status === 'connecting') {
          statusIndicator.classList.add('connecting');
          statusText.textContent = 'Connecting...';
        } else {
          statusIndicator.classList.add('disconnected');
          statusText.textContent = 'Offline Mode';
        }
      }
    } catch (error) {
      console.warn('Could not update connection status:', error);
    }
  }

  updateProcessingStatus(status) {
    const processingDiv = document.getElementById('processingStatus');
    const progressFill = document.getElementById('progressFill');
    const processingText = document.getElementById('processingText');

    if (status.percentage === 0) {
      processingDiv.style.display = 'block';
    }

    progressFill.style.width = `${status.percentage}%`;
    processingText.textContent = status.message;

    if (status.percentage === 100) {
      setTimeout(() => {
        processingDiv.style.display = 'none';
      }, 2000);
    }
  }

  updateSchedulingProgress(progress) {
    // Similar to processing status but for scheduling
    console.log('Scheduling progress:', progress);
    this.showNotification(progress.message, 'info');
  }

  updateSessionsSummary() {
    const summary = document.getElementById('sessionsSummary');
    const totalSessions = document.getElementById('totalSessions');
    const pendingSessions = document.getElementById('pendingSessions');
    const hardwareRequired = document.getElementById('hardwareRequired');

    if (this.data.sessions.length > 0) {
      summary.style.display = 'block';
      totalSessions.textContent = this.data.sessions.length;
      pendingSessions.textContent = this.data.sessions.filter(s => s.status === 'pending').length;
      hardwareRequired.textContent = this.data.sessions.filter(s => s.requiresHardware).length;
    } else {
      summary.style.display = 'none';
    }
  }

  updateSessionsTable() {
    const container = document.getElementById('sessionsTableContainer');
    const tbody = document.getElementById('sessionsTableBody');

    if (this.data.sessions.length > 0) {
      container.style.display = 'block';
      tbody.innerHTML = this.data.sessions.map(session => this.createSessionRow(session)).join('');
    } else {
      container.style.display = 'none';
    }
  }

  createSessionRow(session) {
    const priorityClass = `priority-${session.priority}`;
    const statusClass = `status-${session.status}`;
    const hardwareText = session.requiresHardware ? 'Required' : 'Not Required';
    const hardwareClass = session.requiresHardware ? 'hardware-required' : 'hardware-not-required';

    return `
      <tr>
        <td>${session.name}</td>
        <td>${session.platform || '-'}</td>
        <td>${session.debugger || '-'}</td>
        <td>${session.os || '-'}</td>
        <td><span class="priority-badge ${priorityClass}">${session.priority}</span></td>
        <td>${session.estimatedTime.toFixed(2)}h</td>
        <td><span class="status-badge ${statusClass}">${session.status}</span></td>
        <td><span class="${hardwareClass}">${hardwareText}</span></td>
      </tr>
    `;
  }

  updateHardwareLists() {
    const debuggersList = document.getElementById('debuggersList');
    const platformsList = document.getElementById('platformsList');

    debuggersList.innerHTML = this.data.hardware.debuggers
      .map(item => this.createHardwareItem(item, 'debugger')).join('');
    
    platformsList.innerHTML = this.data.hardware.platforms
      .map(item => this.createHardwareItem(item, 'platform')).join('');
  }

  createHardwareItem(item, type) {
    return `
      <div class="hardware-item">
        <div class="hardware-item-info">
          <div class="hardware-item-name">${item.name}</div>
          <div class="hardware-item-details">
            Qty: ${item.quantity} | Available: ${item.available} | Source: ${item.source || 'manual'}
          </div>
        </div>
        <div class="hardware-item-actions">
          <button class="btn btn-small btn-secondary" onclick="app.editHardware('${item.id}', '${type}')">Edit</button>
          <button class="btn btn-small btn-danger" onclick="app.deleteHardware('${item.id}', '${type}')">Delete</button>
        </div>
      </div>
    `;
  }

  updateMachineSummary() {
    // Implementation for machine summary
    console.log('Updating machine summary');
  }

  updateMachineTypesList() {
    // Implementation for machine types list
    console.log('Updating machine types list');
  }

  updateMachinesList() {
    // Implementation for machines list
    console.log('Updating machines list');
  }

  updateTimelineGrid() {
    // Implementation for timeline grid
    console.log('Updating timeline grid');
  }

  updateQueueSection() {
    const queueSection = document.getElementById('queueSection');
    const queueItems = document.getElementById('queueItems');

    if (this.data.queue.length > 0) {
      queueSection.style.display = 'block';
      queueItems.innerHTML = this.data.queue.map(item => this.createQueueItem(item)).join('');
    } else {
      queueSection.style.display = 'none';
    }
  }

  createQueueItem(item) {
    const session = this.data.sessions.find(s => s.id === item.sessionId);
    return `
      <div class="queue-item">
        <div>
          <strong>${session?.name || 'Unknown Session'}</strong>
          <br>
          <small>${item.reason}</small>
        </div>
        <div>
          <small>${new Date(item.timestamp).toLocaleString()}</small>
        </div>
      </div>
    `;
  }

  showNotification(message, type = 'info') {
    // Log to console
    console.log(`${type.toUpperCase()}: ${message}`);

    // Create or get notification container
    let container = document.getElementById('notificationContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notificationContainer';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
      `;
      document.body.appendChild(container);
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      background: ${type === 'error' ? '#f8d7da' : type === 'success' ? '#d4edda' : '#d1ecf1'};
      color: ${type === 'error' ? '#721c24' : type === 'success' ? '#155724' : '#0c5460'};
      border: 1px solid ${type === 'error' ? '#f5c6cb' : type === 'success' ? '#c3e6cb' : '#bee5eb'};
      border-radius: 4px;
      padding: 12px 16px;
      margin-bottom: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      animation: slideIn 0.3s ease-out;
      cursor: pointer;
    `;

    const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';

    notification.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center;">
          <span style="margin-right: 8px;">${icon}</span>
          <span>${message}</span>
        </div>
        <span style="margin-left: 10px; font-weight: bold; cursor: pointer;">&times;</span>
      </div>
    `;

    // Add click to dismiss
    notification.addEventListener('click', () => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    });

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, 5000);

    container.appendChild(notification);

    // Add CSS animations if not already added
    if (!document.getElementById('notificationStyles')) {
      const style = document.createElement('style');
      style.id = 'notificationStyles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  clearNotifications() {
    const container = document.getElementById('notificationContainer');
    if (container) {
      container.innerHTML = '';
    }
  }

  // Placeholder methods for hardware management
  editHardware(id, type) {
    console.log(`Edit ${type} with ID: ${id}`);
  }

  deleteHardware(id, type) {
    console.log(`Delete ${type} with ID: ${id}`);
  }
}

// Global helper functions for debugging
window.showSessions = function() {
  // Redirect to sessions management page
  window.location.href = 'sessions-management.html';
};

window.showTimeline = function() {
  if (window.app) {
    console.log('🔄 Switching to Timeline...');
    window.app.showSection('timelineSection');
    window.app.updateActiveNavigation('timelineTab');
    console.log('✅ Timeline section should now be visible');
  }
};

window.rebindNavigation = function() {
  if (window.app) {
    console.log('Rebinding navigation...');
    window.app.initializeNavigation();
  }
};

window.testDOM = function() {
  console.log('=== DOM Test ===');
  const sessionsTab = document.getElementById('sessionsTab');
  const timelineTab = document.getElementById('timelineTab');
  const sessionsSection = document.getElementById('sessionsSection');
  const timelineSection = document.getElementById('timelineSection');

  console.log('Sessions tab:', sessionsTab);
  console.log('Timeline tab:', timelineTab);
  console.log('Sessions section:', sessionsSection);
  console.log('Timeline section:', timelineSection);

  if (sessionsTab) {
    console.log('Sessions tab classes:', sessionsTab.className);
    console.log('Sessions tab onclick:', sessionsTab.onclick);
    console.log('Sessions tab computed style:', window.getComputedStyle(sessionsTab));
    console.log('Sessions tab pointer-events:', window.getComputedStyle(sessionsTab).pointerEvents);
    console.log('Sessions tab z-index:', window.getComputedStyle(sessionsTab).zIndex);

    // Test if element is actually clickable
    const rect = sessionsTab.getBoundingClientRect();
    const elementAtPoint = document.elementFromPoint(rect.left + rect.width/2, rect.top + rect.height/2);
    console.log('Element at sessions tab center:', elementAtPoint);
    console.log('Is sessions tab the top element?', elementAtPoint === sessionsTab);
  }

  if (timelineTab) {
    console.log('Timeline tab classes:', timelineTab.className);
    console.log('Timeline tab onclick:', timelineTab.onclick);
  }
};

window.checkSections = function() {
  console.log('=== Section Visibility Check ===');
  const sessionsSection = document.getElementById('sessionsSection');
  const timelineSection = document.getElementById('timelineSection');

  if (sessionsSection) {
    console.log('Sessions Section:');
    console.log('  - Display:', window.getComputedStyle(sessionsSection).display);
    console.log('  - Visibility:', window.getComputedStyle(sessionsSection).visibility);
    console.log('  - Opacity:', window.getComputedStyle(sessionsSection).opacity);
    console.log('  - Height:', window.getComputedStyle(sessionsSection).height);
    console.log('  - Inline style:', sessionsSection.style.display);
  }

  if (timelineSection) {
    console.log('Timeline Section:');
    console.log('  - Display:', window.getComputedStyle(timelineSection).display);
    console.log('  - Visibility:', window.getComputedStyle(timelineSection).visibility);
    console.log('  - Opacity:', window.getComputedStyle(timelineSection).opacity);
    console.log('  - Height:', window.getComputedStyle(timelineSection).height);
    console.log('  - Inline style:', timelineSection.style.display);
  }
};

window.listAllSections = function() {
  console.log('=== All Sections in DOM ===');

  // Find all elements with section tag
  const allSections = document.querySelectorAll('section');
  console.log('Total sections found:', allSections.length);

  allSections.forEach((section, index) => {
    console.log(`Section ${index + 1}:`);
    console.log('  - ID:', section.id);
    console.log('  - Classes:', section.className);
    console.log('  - Display:', window.getComputedStyle(section).display);
    console.log('  - Inline style:', section.style.display);
    console.log('  - Content preview:', section.innerHTML.substring(0, 50) + '...');
    console.log('---');
  });

  // Check for duplicate IDs
  const sessionsElements = document.querySelectorAll('#sessionsSection');
  const timelineElements = document.querySelectorAll('#timelineSection');

  console.log('Elements with ID "sessionsSection":', sessionsElements.length);
  console.log('Elements with ID "timelineSection":', timelineElements.length);

  if (sessionsElements.length > 1) {
    console.error('⚠️ DUPLICATE sessionsSection IDs found!');
  }
  if (timelineElements.length > 1) {
    console.error('⚠️ DUPLICATE timelineSection IDs found!');
  }

  // Session management methods
  showAddSessionModal() {
    // Create a simple modal for adding sessions
    const modalHtml = `
      <div class="modal-backdrop show" id="addSessionModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Add New Session</h3>
            <button class="modal-close" onclick="this.closest('.modal-backdrop').remove()">×</button>
          </div>
          <div class="modal-body">
            <form id="addSessionForm">
              <div class="form-group">
                <label for="sessionName">Session Name:</label>
                <input type="text" id="sessionName" name="sessionName" required>
              </div>
              <div class="form-group">
                <label for="sessionPlatform">Platform:</label>
                <input type="text" id="sessionPlatform" name="sessionPlatform">
              </div>
              <div class="form-group">
                <label for="sessionDebugger">Debugger:</label>
                <input type="text" id="sessionDebugger" name="sessionDebugger">
              </div>
              <div class="form-group">
                <label for="sessionOS">Operating System:</label>
                <input type="text" id="sessionOS" name="sessionOS">
              </div>
              <div class="form-group">
                <label for="sessionPriority">Priority:</label>
                <select id="sessionPriority" name="sessionPriority">
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div class="form-group">
                <label for="sessionTime">Estimated Time (hours):</label>
                <input type="number" id="sessionTime" name="sessionTime" min="0.1" step="0.1" value="1">
              </div>
              <div class="form-group">
                <label>
                  <input type="checkbox" id="sessionHardware" name="sessionHardware">
                  Requires Hardware
                </label>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="this.closest('.modal-backdrop').remove()">Cancel</button>
            <button class="btn btn-primary" onclick="window.app.saveNewSession()">Save Session</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  async saveNewSession() {
    const form = document.getElementById('addSessionForm');
    const formData = new FormData(form);

    const sessionData = {
      id: this.generateId(),
      name: formData.get('sessionName'),
      platform: formData.get('sessionPlatform'),
      debugger: formData.get('sessionDebugger'),
      os: formData.get('sessionOS'),
      priority: formData.get('sessionPriority'),
      estimatedTime: parseFloat(formData.get('sessionTime')),
      requiresHardware: formData.has('sessionHardware'),
      status: 'pending',
      createdAt: new Date().toISOString(),
      source: 'manual'
    };

    try {
      // Add to local data
      this.data.sessions = this.data.sessions || [];
      this.data.sessions.push(sessionData);

      // Refresh display
      this.populateSessionsTable();
      this.updateSessionStatistics();

      // Close modal
      document.getElementById('addSessionModal').remove();

      this.showNotification('Session added successfully', 'success');
    } catch (error) {
      console.error('Error saving session:', error);
      this.showNotification('Failed to save session', 'error');
    }
  }

  generateId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  downloadCSVTemplate() {
    const csvContent = `Session,Platform,Debugger,OS,Priority,Num of normal test case,Num of combo test case,Status
Sample Session,Platform_A,S32_DBG,Ubuntu 24.04,normal,10,2,pending
Test Session,Platform_B,Segger,Windows 11,high,15,3,pending`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sessions_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);

    this.showNotification('CSV template downloaded', 'success');
  }

  showImportHistory() {
    this.showNotification('Import history feature coming soon', 'info');
  }

  exportSessions() {
    const sessions = this.data.sessions || [];
    if (sessions.length === 0) {
      this.showNotification('No sessions to export', 'warning');
      return;
    }

    const csvContent = this.convertSessionsToCSV(sessions);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sessions_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    this.showNotification(`Exported ${sessions.length} sessions`, 'success');
  }

  convertSessionsToCSV(sessions) {
    const headers = ['Session', 'Platform', 'Debugger', 'OS', 'Priority', 'Estimated Time', 'Hardware Required', 'Status'];
    const rows = sessions.map(session => [
      session.name,
      session.platform || '',
      session.debugger || '',
      session.os || '',
      session.priority,
      session.estimatedTime || 1,
      session.requiresHardware ? 'Yes' : 'No',
      session.status
    ]);

    return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
  }

  clearAllSessions() {
    if (confirm('Are you sure you want to clear all sessions? This action cannot be undone.')) {
      this.data.sessions = [];
      this.populateSessionsTable();
      this.updateSessionStatistics();
      this.showNotification('All sessions cleared', 'success');
    }
  }

  editSession(sessionId) {
    this.showNotification('Edit session feature coming soon', 'info');
  }

  deleteSession(sessionId) {
    if (confirm('Are you sure you want to delete this session?')) {
      this.data.sessions = this.data.sessions.filter(s => s.id !== sessionId);
      this.populateSessionsTable();
      this.updateSessionStatistics();
      this.showNotification('Session deleted', 'success');
    }
  }
};

window.testButtons = function() {
  console.log('🧪 Testing button functionality...');

  const buttons = [
    'addSessionBtn',
    'downloadTemplateBtn',
    'viewImportHistoryBtn',
    'exportSessionsBtn',
    'clearAllSessionsBtn'
  ];

  buttons.forEach(buttonId => {
    const button = document.getElementById(buttonId);
    if (button) {
      console.log(`✅ Found button: ${buttonId}`);
      console.log(`   - Visible: ${window.getComputedStyle(button).display !== 'none'}`);
      console.log(`   - Has click listener: ${button.onclick !== null || button.addEventListener !== undefined}`);
    } else {
      console.log(`❌ Button not found: ${buttonId}`);
    }
  });

  // Test if we're in sessions section
  const sessionsSection = document.getElementById('sessionsSection');
  if (sessionsSection) {
    const isVisible = window.getComputedStyle(sessionsSection).display !== 'none';
    console.log(`📋 Sessions section visible: ${isVisible}`);
  }

  // Test sessions data
  if (window.app && window.app.data) {
    console.log(`📊 Sessions data count: ${window.app.data.sessions?.length || 0}`);
  }
};

window.forceLoadSessions = async function() {
  console.log('🔄 Force loading sessions data...');
  if (window.app) {
    try {
      await window.app.loadInitialData();
      window.app.loadSessionsDisplay();
      console.log('✅ Sessions data loaded');
    } catch (error) {
      console.error('❌ Failed to load sessions:', error);
    }
  }
};

window.forceSectionSwitch = function(sectionId) {
  console.log('🚀 FORCE switching to:', sectionId);

  // Nuclear option - remove all styles and classes
  const allSections = document.querySelectorAll('section');
  allSections.forEach(section => {
    // Clear all inline styles
    section.style.cssText = '';

    // Remove all visibility classes
    section.classList.remove('hidden-section', 'visible-section');

    // Force hide with multiple methods
    section.style.display = 'none';
    section.style.visibility = 'hidden';
    section.style.opacity = '0';
    section.style.height = '0';
    section.style.overflow = 'hidden';

    console.log('🧹 Cleared section:', section.id);
  });

  // Force show target section
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    // Clear all styles first
    targetSection.style.cssText = '';

    // Force show with multiple methods
    targetSection.style.display = 'block';
    targetSection.style.visibility = 'visible';
    targetSection.style.opacity = '1';
    targetSection.style.height = 'auto';
    targetSection.style.overflow = 'visible';

    console.log('🎯 Force shown section:', sectionId);
  }
};

// Application class is ready for initialization
// Initialization is handled in index.html
