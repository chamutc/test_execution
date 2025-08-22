// Socket Handler for Real-time Communication
class SocketHandler {
  constructor(app) {
    this.app = app;
    this.socket = app.socket;
    this.init();
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.app.updateConnectionStatus(true);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.app.updateConnectionStatus(false);
    });

    // Data update events
    this.socket.on('sessions:updated', (sessions) => {
      console.log('Sessions updated via socket:', sessions.length);
      this.app.data.sessions = sessions;
      this.app.refreshSessionsDisplay();
    });

    this.socket.on('hardware:updated', (hardware) => {
      console.log('Hardware updated via socket');
      this.app.data.hardware = hardware;
      this.app.refreshHardwareDisplay();
    });

    this.socket.on('machines:updated', (machines) => {
      console.log('Machines updated via socket:', machines.length);
      this.app.data.machines = machines;
      this.app.refreshMachinesDisplay();
    });

    this.socket.on('schedule:updated', (schedule) => {
      console.log('Schedule updated via socket');
      this.app.data.schedule = schedule;
      this.app.refreshTimelineDisplay();
    });

    this.socket.on('queue:updated', (queue) => {
      console.log('Queue updated via socket:', queue.length);
      this.app.data.queue = queue;
      this.app.refreshQueueDisplay();
    });

    // Progress events
    this.socket.on('csv:processing', (status) => {
      console.log('CSV processing status:', status);
      this.app.updateProcessingStatus(status);
    });

    this.socket.on('scheduling:progress', (progress) => {
      console.log('Scheduling progress:', progress);
      this.app.updateSchedulingProgress(progress);
    });

    // Notification events
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.app.showNotification(error, 'error');
    });

    this.socket.on('success', (message) => {
      console.log('Socket success:', message);
      this.app.showNotification(message, 'success');
    });

    // Hardware conflict events
    this.socket.on('hardware:conflict', (conflict) => {
      console.warn('Hardware conflict detected:', conflict);
      this.handleHardwareConflict(conflict);
    });
  }

  handleHardwareConflict(conflict) {
    const message = `Hardware conflict detected: ${conflict.hardwareName} is overallocated in time slot ${conflict.timeSlot}`;
    this.app.showNotification(message, 'warning');
  }

  // Emit events to server
  emitSessionUpdate(sessionId, updates) {
    this.socket.emit('session:update', { sessionId, updates });
  }

  emitHardwareUpdate(hardwareId, updates) {
    this.socket.emit('hardware:update', { hardwareId, updates });
  }

  emitScheduleRequest(sessionId, timeSlot, machineId) {
    this.socket.emit('schedule:request', { sessionId, timeSlot, machineId });
  }

  // Request data refresh
  requestDataRefresh() {
    this.socket.emit('data:refresh');
  }

  // Join/leave rooms for specific data updates
  joinRoom(room) {
    this.socket.emit('join:room', room);
  }

  leaveRoom(room) {
    this.socket.emit('leave:room', room);
  }
}

// Initialize socket handler when app is ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (window.app) {
      window.socketHandler = new SocketHandler(window.app);
    }
  }, 100);
});
