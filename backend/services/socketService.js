class SocketService {
  constructor(io = null) {
    this.io = io;
  }

  // Set IO instance (for cases where it's initialized later)
  setIO(io) {
    this.io = io;
  }

  // Emit session updates to all connected clients
  emitSessionUpdate(sessions) {
    this.io.emit('sessions:updated', sessions);
  }

  // Emit hardware updates to all connected clients
  emitHardwareUpdate(hardware) {
    this.io.emit('hardware:updated', hardware);
  }

  // Emit machine updates to all connected clients
  emitMachineUpdate(machines) {
    this.io.emit('machines:updated', machines);
  }

  // Emit machine types updates to all connected clients
  emitMachineTypesUpdate(machineTypes) {
    this.io.emit('machineTypes:updated', machineTypes);
  }

  // Emit schedule updates to all connected clients
  emitScheduleUpdate(schedule) {
    this.io.emit('schedule:updated', schedule);
  }

  // Emit scheduling progress
  emitSchedulingProgress(progress) {
    this.io.emit('scheduling:progress', progress);
  }

  // Emit error messages to all connected clients
  emitError(error) {
    this.io.emit('error', error);
  }

  // Emit success messages to all connected clients
  emitSuccess(message) {
    this.io.emit('success', message);
  }

  // Emit CSV processing status updates
  emitCsvProcessingStatus(status) {
    this.io.emit('csv:processing', status);
  }

  // Emit scheduling progress updates
  emitSchedulingProgress(progress) {
    this.io.emit('scheduling:progress', progress);
  }

  // Emit hardware conflict notifications
  emitHardwareConflict(conflict) {
    this.io.emit('hardware:conflict', conflict);
  }

  // Emit queue status updates
  emitQueueUpdate(queue) {
    this.io.emit('queue:updated', queue);
  }
  // Emit hardware combinations updates to all connected clients
  emitCombinationsUpdate(combinations) {
    this.io.emit('hardware:combinations_updated', combinations);
  }

}

module.exports = SocketService;
