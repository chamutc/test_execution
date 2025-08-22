// Timeline Manager Class
class TimelineManager {
  constructor(app) {
    this.app = app;
    this.currentView = 'day';
    this.selectedDate = new Date();
    this.init();
  }

  init() {
    this.initializeEventListeners();
    this.initializeDateNavigation();
    this.currentDate = new Date(); // Initialize current date
    this.multiDaySchedule = null; // Store multi-day schedule data
    this.currentScheduleDay = 1; // Current day in multi-day schedule
    this.totalScheduleDays = 1; // Total days in current schedule
    this.updateDateInput();
  }

  initializeEventListeners() {
    // Auto schedule button - show enhanced modal
    const autoScheduleBtn = document.getElementById('autoScheduleBtn');
    if (autoScheduleBtn) {
      autoScheduleBtn.addEventListener('click', () => {
        this.showEnhancedAutoScheduleModal();
      });
    }

    // Enhanced auto-schedule modal event listeners
    this.initializeEnhancedAutoScheduleModal();

    // Multi-day navigation
    this.initializeMultiDayNavigation();

    // Hardware analysis button
    const hardwareAnalysisBtn = document.getElementById('hardwareAnalysisBtn');
    if (hardwareAnalysisBtn) {
      hardwareAnalysisBtn.addEventListener('click', () => {
        this.showHardwareAnalysis();
      });
    }

    // Clear schedule button
    const clearScheduleBtn = document.getElementById('clearScheduleBtn');
    if (clearScheduleBtn) {
      clearScheduleBtn.addEventListener('click', () => {
        this.clearSchedule();
      });
    }

    // Refresh timeline button
    const refreshTimelineBtn = document.getElementById('refreshTimelineBtn');
    if (refreshTimelineBtn) {
      refreshTimelineBtn.addEventListener('click', () => {
        this.refreshTimelineData();
      });
    }

    // Listen for machine configuration changes
    this.setupMachineChangeListeners();

    // Setup periodic refresh as fallback
    this.setupPeriodicRefresh();
  }

  initializeDateNavigation() {
    // Date navigation
    const prevDayBtn = document.getElementById('prevDayBtn');
    const nextDayBtn = document.getElementById('nextDayBtn');
    const todayBtn = document.getElementById('todayBtn');
    const currentDateInput = document.getElementById('currentDate');

    if (prevDayBtn) {
      prevDayBtn.addEventListener('click', () => {
        this.navigateDay(-1);
      });
    }

    if (nextDayBtn) {
      nextDayBtn.addEventListener('click', () => {
        this.navigateDay(1);
      });
    }

    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        this.goToToday();
      });
    }

    if (currentDateInput) {
      currentDateInput.addEventListener('change', (e) => {
        this.currentDate = new Date(e.target.value);
        this.generateTimeline();
      });
    }
  }

  navigateDay(direction) {
    const newDate = new Date(this.currentDate);
    newDate.setDate(newDate.getDate() + direction);
    this.currentDate = newDate;
    this.updateDateInput();
    this.generateTimeline();
  }

  goToToday() {
    this.currentDate = new Date();
    this.updateDateInput();
    this.generateTimeline();
  }

  setCurrentDate(date) {
    this.currentDate = new Date(date);
    this.updateDateInput();
  }

  updateDateInput() {
    const currentDateInput = document.getElementById('currentDate');
    if (currentDateInput) {
      const dateStr = this.currentDate.toISOString().split('T')[0];
      currentDateInput.value = dateStr;
    }
  }

  generateTimeline() {
    const timelineGrid = document.getElementById('timelineGrid');
    if (!timelineGrid) return;

    // Clear existing content
    timelineGrid.innerHTML = '';

    // Set grid class for unified 24-hour view
    timelineGrid.className = 'timeline-grid unified-view';

    // Generate unified 24-hour view
    this.generateUnifiedDayView(timelineGrid);

    // Add legend
    this.addTimelineLegend();

    // Add statistics
    this.addTimelineStatistics();
  }

  generateUnifiedDayView(container) {
    // Unified 24-hour view: 00:00 to 23:00 (24 slots)
    const timeSlots = [];
    for (let hour = 0; hour < 24; hour++) {
      timeSlots.push({
        id: `unified-${this.formatDate(this.currentDate)}-${hour}`,
        hour: hour,
        date: this.currentDate,
        label: `${hour.toString().padStart(2, '0')}:00`
      });
    }

    this.generateTimelineGrid(container, timeSlots, 'unified');
  }

  formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  // Enhanced Auto-Schedule Modal Management
  initializeEnhancedAutoScheduleModal() {
    // Modal controls
    const modal = document.getElementById('autoScheduleModal');
    const closeBtn = document.getElementById('closeAutoScheduleModal');
    const cancelBtn = document.getElementById('cancelAutoSchedule');
    const startBtn = document.getElementById('startAutoSchedule');

    // Option cards
    const fullOption = document.getElementById('fullScheduleOption');
    const limitedOption = document.getElementById('timeLimitedOption');
    const fullRadio = document.getElementById('fullScheduleRadio');
    const limitedRadio = document.getElementById('limitedScheduleRadio');
    const executionHoursGroup = document.getElementById('executionHoursGroup');

    // Close modal
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideEnhancedAutoScheduleModal();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.hideEnhancedAutoScheduleModal();
      });
    }

    // Option selection
    if (fullOption) {
      fullOption.addEventListener('click', () => {
        fullRadio.checked = true;
        this.updateScheduleOptionUI();
      });
    }

    if (limitedOption) {
      limitedOption.addEventListener('click', () => {
        limitedRadio.checked = true;
        this.updateScheduleOptionUI();
      });
    }

    if (fullRadio) {
      fullRadio.addEventListener('change', () => {
        this.updateScheduleOptionUI();
      });
    }

    if (limitedRadio) {
      limitedRadio.addEventListener('change', () => {
        this.updateScheduleOptionUI();
      });
    }

    // Start scheduling
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.startEnhancedAutoSchedule();
      });
    }

    // Close modal on backdrop click
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideEnhancedAutoScheduleModal();
        }
      });
    }
  }

  showEnhancedAutoScheduleModal() {
    const modal = document.getElementById('autoScheduleModal');
    const startDateInput = document.getElementById('scheduleStartDate');

    // Set default start date to today
    if (startDateInput) {
      startDateInput.value = new Date().toISOString().split('T')[0];
    }

    this.updateScheduleOptionUI();

    if (modal) {
      modal.style.display = 'flex';
    }
  }

  hideEnhancedAutoScheduleModal() {
    const modal = document.getElementById('autoScheduleModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  updateScheduleOptionUI() {
    const fullRadio = document.getElementById('fullScheduleRadio');
    const limitedRadio = document.getElementById('limitedScheduleRadio');
    const fullOption = document.getElementById('fullScheduleOption');
    const limitedOption = document.getElementById('timeLimitedOption');
    const executionHoursGroup = document.getElementById('executionHoursGroup');

    // Update option card styles
    if (fullRadio && fullRadio.checked) {
      fullOption?.classList.add('selected');
      limitedOption?.classList.remove('selected');
      if (executionHoursGroup) {
        executionHoursGroup.style.display = 'none';
      }
    } else if (limitedRadio && limitedRadio.checked) {
      limitedOption?.classList.add('selected');
      fullOption?.classList.remove('selected');
      if (executionHoursGroup) {
        executionHoursGroup.style.display = 'block';
      }
    }
  }

  async startEnhancedAutoSchedule() {
    try {
      // Get form data
      const scheduleType = document.querySelector('input[name="scheduleType"]:checked')?.value;
      const startDate = document.getElementById('scheduleStartDate')?.value;
      const startTime = document.getElementById('scheduleStartTime')?.value;
      const expectedHours = document.getElementById('expectedExecutionHours')?.value;
      const optimizationMode = document.getElementById('optimizationMode')?.value;
      const allowOvertime = document.getElementById('allowOvertime')?.checked;
      const prioritizeHardware = document.getElementById('prioritizeHardware')?.checked;
      const enableMultiDay = document.getElementById('enableMultiDay')?.checked;

      // Validate inputs
      if (!startDate || !startTime) {
        this.app.showNotification('Please select start date and time', 'error');
        return;
      }

      if (scheduleType === 'limited' && (!expectedHours || expectedHours < 1)) {
        this.app.showNotification('Please enter valid expected execution hours', 'error');
        return;
      }

      // Create schedule options
      const scheduleOptions = {
        type: scheduleType,
        startDateTime: new Date(`${startDate}T${startTime}`),
        expectedHours: scheduleType === 'limited' ? parseInt(expectedHours) : null,
        optimizationMode,
        allowOvertime,
        prioritizeHardware,
        enableMultiDay: scheduleType === 'full' ? enableMultiDay : false
      };

      this.hideEnhancedAutoScheduleModal();

      // Show progress notification
      this.app.showNotification('Starting enhanced auto-scheduling...', 'info');

      // Call enhanced auto-schedule
      await this.executeEnhancedAutoSchedule(scheduleOptions);

    } catch (error) {
      console.error('Error starting enhanced auto-schedule:', error);
      this.app.showNotification('Failed to start auto-scheduling', 'error');
    }
  }

  async executeEnhancedAutoSchedule(options) {
    try {
      // Get current data
      const sessions = this.app.data.sessions.filter(s => s.status === 'pending');
      const machines = this.app.data.machines;
      const hardware = this.app.data.hardware;
      const currentSchedule = this.app.data.schedule;

      if (sessions.length === 0) {
        this.app.showNotification('No pending sessions to schedule', 'warning');
        return;
      }

      // Call enhanced scheduling service
      const response = await fetch('/api/schedule/enhanced-auto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessions,
          machines,
          hardware,
          currentSchedule,
          options
        })
      });

      const result = await response.json();

      if (result.success) {
        // Update schedule data
        this.app.data.schedule = result.schedule;

        // Handle multi-day or extended timeline display
        if (options.type === 'limited' && options.expectedHours > 24) {
          // Show extended timeline for multi-day limited schedules
          this.showExtendedTimeline(options);
        } else if (result.statistics && result.statistics.totalDays > 1) {
          // Handle multi-day schedule result
          this.handleEnhancedScheduleResult(result, options);
        } else {
          // Regular single-day timeline update
          this.hideMultiDayNavigation();
          this.generateTimeline();
        }

        // Show success notification
        const scheduledCount = result.scheduledSessions || sessions.length;
        this.app.showNotification(
          `Successfully scheduled ${scheduledCount} sessions using ${options.type} scheduling`,
          'success'
        );

        // Update session statuses
        await this.app.loadData();

      } else {
        throw new Error(result.error || 'Enhanced auto-scheduling failed');
      }

    } catch (error) {
      console.error('Error executing enhanced auto-schedule:', error);
      this.app.showNotification(error.message || 'Enhanced auto-scheduling failed', 'error');
    }
  }

  showExtendedTimeline(options) {
    // For time-limited schedules that span multiple days
    const timelineInfo = document.getElementById('timelineInfo');
    if (timelineInfo) {
      const endDateTime = new Date(options.startDateTime);
      endDateTime.setHours(endDateTime.getHours() + options.expectedHours);

      const daySpan = Math.ceil(options.expectedHours / 24);
      timelineInfo.textContent = `Extended Timeline: ${daySpan} days (${options.expectedHours} hours)`;
    }

    // Enable horizontal scrolling for extended view
    const timelineContainer = document.querySelector('.timeline-container');
    if (timelineContainer) {
      timelineContainer.style.overflowX = 'auto';
    }

    // Generate extended timeline
    this.generateExtendedTimeline(options);
  }

  // Multi-Day Navigation
  initializeMultiDayNavigation() {
    const prevScheduleDayBtn = document.getElementById('prevScheduleDayBtn');
    const nextScheduleDayBtn = document.getElementById('nextScheduleDayBtn');

    if (prevScheduleDayBtn) {
      prevScheduleDayBtn.addEventListener('click', () => {
        this.navigateScheduleDay(-1);
      });
    }

    if (nextScheduleDayBtn) {
      nextScheduleDayBtn.addEventListener('click', () => {
        this.navigateScheduleDay(1);
      });
    }
  }

  navigateScheduleDay(direction) {
    const newDay = this.currentScheduleDay + direction;

    if (newDay >= 1 && newDay <= this.totalScheduleDays) {
      this.currentScheduleDay = newDay;
      this.updateScheduleDayDisplay();
      this.displayScheduleDay(this.currentScheduleDay);
    }
  }

  updateScheduleDayDisplay() {
    const currentScheduleDaySpan = document.getElementById('currentScheduleDay');
    if (currentScheduleDaySpan) {
      currentScheduleDaySpan.textContent = `Day ${this.currentScheduleDay} of ${this.totalScheduleDays}`;
    }

    // Update navigation button states
    const prevBtn = document.getElementById('prevScheduleDayBtn');
    const nextBtn = document.getElementById('nextScheduleDayBtn');

    if (prevBtn) {
      prevBtn.disabled = this.currentScheduleDay <= 1;
    }

    if (nextBtn) {
      nextBtn.disabled = this.currentScheduleDay >= this.totalScheduleDays;
    }
  }

  showMultiDayNavigation(totalDays) {
    this.totalScheduleDays = totalDays;
    this.currentScheduleDay = 1;

    const multiDayNav = document.getElementById('multiDayNavigation');
    if (multiDayNav) {
      multiDayNav.style.display = totalDays > 1 ? 'flex' : 'none';
    }

    this.updateScheduleDayDisplay();
  }

  hideMultiDayNavigation() {
    const multiDayNav = document.getElementById('multiDayNavigation');
    if (multiDayNav) {
      multiDayNav.style.display = 'none';
    }

    this.totalScheduleDays = 1;
    this.currentScheduleDay = 1;
    this.multiDaySchedule = null;
  }

  displayScheduleDay(dayNumber) {
    if (!this.multiDaySchedule || !this.multiDaySchedule[dayNumber]) {
      console.warn(`No schedule data for day ${dayNumber}`);
      return;
    }

    // Update current date to the selected day
    const scheduleStartDate = new Date(this.multiDaySchedule.startDate);
    const targetDate = new Date(scheduleStartDate);
    targetDate.setDate(targetDate.getDate() + (dayNumber - 1));

    this.currentDate = targetDate;
    this.updateDateInput();

    // Generate timeline for the selected day
    this.generateTimeline();

    // Update timeline info
    const timelineInfo = document.getElementById('timelineInfo');
    if (timelineInfo) {
      const dayLabel = targetDate.toLocaleDateString();
      timelineInfo.firstChild.textContent = `24-Hour Timeline View - ${dayLabel}`;
    }
  }

  // Enhanced schedule result handling
  handleEnhancedScheduleResult(result, options) {
    if (result.statistics && result.statistics.totalDays > 1) {
      // Multi-day schedule detected
      this.multiDaySchedule = {
        startDate: options.startDateTime,
        totalDays: result.statistics.totalDays,
        scheduleData: result.schedule,
        ...result.schedule
      };

      this.showMultiDayNavigation(result.statistics.totalDays);

      // Display first day
      this.displayScheduleDay(1);

      // Update timeline info for multi-day
      const timelineInfo = document.getElementById('timelineInfo');
      if (timelineInfo) {
        timelineInfo.firstChild.textContent = `Multi-Day Schedule: ${result.statistics.totalDays} days`;
      }
    } else {
      // Single day schedule
      this.hideMultiDayNavigation();
      this.generateTimeline();
    }
  }

  generateExtendedTimeline(options) {
    // Generate timeline that spans multiple days for time-limited scheduling
    const timelineGrid = document.getElementById('timelineGrid');
    if (!timelineGrid) return;

    timelineGrid.innerHTML = '';
    timelineGrid.className = 'timeline-grid extended-view';

    const totalHours = options.expectedHours;
    const timeSlots = [];
    const startDate = new Date(options.startDateTime);

    for (let hour = 0; hour < totalHours; hour++) {
      const slotDateTime = new Date(startDate);
      slotDateTime.setHours(slotDateTime.getHours() + hour);

      const dayLabel = hour === 0 || slotDateTime.getHours() === 0
        ? slotDateTime.toLocaleDateString()
        : '';

      timeSlots.push({
        id: `extended-${slotDateTime.toISOString()}`,
        hour: slotDateTime.getHours(),
        date: slotDateTime,
        label: `${slotDateTime.getHours().toString().padStart(2, '0')}:00`,
        dayLabel: dayLabel
      });
    }

    this.generateTimelineGrid(timelineGrid, timeSlots, 'extended');
  }

  generateDayView(container) {
    // Day view: 6 AM to 6 PM (12 slots)
    // Generate time slots that match the backend format
    const timeSlots = [];
    for (let hour = 6; hour < 18; hour++) {
      timeSlots.push({
        id: `day-0-${hour}`,
        hour: hour,
        label: `${hour.toString().padStart(2, '0')}:00`
      });
    }

    this.generateTimelineGrid(container, timeSlots, 'day');
  }

  generateNightView(container) {
    // Night view: 6 PM to 8 AM next day (14 slots)
    const timeSlots = [];
    for (let hour = 18; hour < 32; hour++) { // 32 = 24 + 8
      const actualHour = hour >= 24 ? hour - 24 : hour;
      timeSlots.push({
        id: `night-0-${hour}`,
        hour: actualHour,
        label: `${actualHour.toString().padStart(2, '0')}:00`
      });
    }

    this.generateTimelineGrid(container, timeSlots, 'night');
  }

  generateWeekView(container) {
    // Week view: 7 days × 24 hours (168 slots)
    const timeSlots = [];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        // Determine if this is day or night slot
        const type = (hour >= 6 && hour < 18) ? 'day' : 'night';
        const slotHour = (hour >= 18) ? hour : (hour < 6) ? hour + 24 : hour;

        timeSlots.push({
          id: `${type}-${day}-${slotHour}`,
          day: day,
          hour: hour,
          type: type,
          label: `${days[day]} ${hour.toString().padStart(2, '0')}:00`
        });
      }
    }

    this.generateTimelineGrid(container, timeSlots, 'week');
  }

  /**
   * Add sessions that span from other views into current view
   */
  addSpanningSessions(container) {
    if (!this.app.data.schedule || !this.app.data.schedule.assignments) return;

    const assignments = this.app.data.schedule.assignments;
    const timeSlots = this.app.data.schedule.timeSlots || [];

    assignments.forEach(assignment => {
      const timeSlot = timeSlots.find(slot => slot.id === assignment.timeSlot);
      if (!timeSlot) return;

      // Check if this assignment spans into current view
      const spanInfo = this.getSpanInfo(timeSlot, assignment);
      if (spanInfo.shouldShow) {
        this.addSpanningSessionToGrid(container, assignment, spanInfo);
      }
    });
  }

  /**
   * Determine if and how a session spans into current view
   */
  getSpanInfo(timeSlot, assignment) {
    const slotType = timeSlot.type;
    const currentView = this.currentView;

    // Logic for spanning sessions
    switch (currentView) {
      case 'night':
        // Show day sessions that might extend into night
        if (slotType === 'day') {
          return {
            shouldShow: true,
            spanType: 'from-day',
            cssClass: 'spanning-from-day'
          };
        }
        break;

      case 'week':
        // Week view shows all sessions
        return {
          shouldShow: true,
          spanType: 'all',
          cssClass: 'week-session'
        };

      case 'day':
        // Show night sessions that might extend into day
        if (slotType === 'night') {
          return {
            shouldShow: true,
            spanType: 'from-night',
            cssClass: 'spanning-from-night'
          };
        }
        break;
    }

    return { shouldShow: false };
  }

  /**
   * Add a spanning session to the grid
   */
  addSpanningSessionToGrid(container, assignment, spanInfo) {
    // Find the session details
    const session = this.app.data.sessions?.find(s => s.id === assignment.sessionId);
    if (!session) return;

    // Find the machine
    const machine = this.app.data.machines?.find(m => m.id === assignment.machineId);
    if (!machine) return;

    // Create spanning session element
    const spanElement = document.createElement('div');
    spanElement.className = `timeline-session spanning-session ${spanInfo.cssClass}`;
    spanElement.innerHTML = `
      <div class="session-info">
        <div class="session-name">${session.name}</div>
        <div class="session-details">
          <span class="machine">${machine.name}</span>
          <span class="span-indicator">(${spanInfo.spanType})</span>
        </div>
      </div>
    `;

    // Add to appropriate position in grid
    // This is a simplified implementation - you might want to position it more precisely
    container.appendChild(spanElement);
  }

  generateTimelineGrid(container, timeSlots, viewType) {
    // Add corner header
    const cornerHeader = document.createElement('div');
    cornerHeader.className = 'timeline-header corner';
    cornerHeader.textContent = 'Resources';
    container.appendChild(cornerHeader);

    // Add time headers
    timeSlots.forEach(slot => {
      const timeHeader = document.createElement('div');
      timeHeader.className = 'timeline-header time-header';
      timeHeader.textContent = slot.label || `${slot.hour.toString().padStart(2, '0')}:00`;
      container.appendChild(timeHeader);
    });

    // Add resource rows (hardware management moved to separate interface)
    this.addMachineRows(container, timeSlots, viewType);
  }

  generateWeekTimelineGrid(container, slots) {
    // Add corner header
    const cornerHeader = document.createElement('div');
    cornerHeader.className = 'timeline-header corner';
    cornerHeader.textContent = 'Resources';
    container.appendChild(cornerHeader);

    // Add day/time headers
    slots.forEach(slot => {
      const timeHeader = document.createElement('div');
      timeHeader.className = 'timeline-header time-header';
      timeHeader.textContent = slot.label;
      timeHeader.style.writingMode = 'vertical-rl';
      timeHeader.style.textOrientation = 'mixed';
      container.appendChild(timeHeader);
    });

    // Add resource rows (hardware management moved to separate interface)
    this.addMachineRows(container, slots, 'week');
  }

  addMachineRows(container, timeSlots, viewType) {
    const machines = this.app.data.machines;

    if (!machines || machines.length === 0) {
      // Add a message row if no machines
      const noMachinesLabel = document.createElement('div');
      noMachinesLabel.className = 'resource-label machine';
      noMachinesLabel.textContent = 'No machines configured';
      noMachinesLabel.style.fontStyle = 'italic';
      noMachinesLabel.style.color = '#999';
      container.appendChild(noMachinesLabel);

      // Add empty cells
      timeSlots.forEach(() => {
        const cell = document.createElement('div');
        cell.className = 'timeline-cell empty';
        cell.textContent = '-';
        container.appendChild(cell);
      });
      return;
    }

    // Deduplicate machines by ID to prevent duplicates
    const uniqueMachines = this.deduplicateMachines(machines);
    const machinesByType = this.groupMachinesByType(uniqueMachines);

    Object.keys(machinesByType).sort().forEach(osType => {
      const typeMachines = machinesByType[osType];

      typeMachines.forEach(machine => {
        // Add machine label
        const machineLabel = document.createElement('div');
        machineLabel.className = 'resource-label machine';
        machineLabel.innerHTML = `
          <div class="machine-name">${machine.name}</div>
          <div class="machine-details">${machine.osType} | ${machine.status}</div>
        `;
        container.appendChild(machineLabel);

        // Add time slot cells for this machine
        this.addMachineTimeSlots(container, machine, timeSlots);
      });
    });
  }

  deduplicateMachines(machines) {
    const seen = new Set();
    return machines.filter(machine => {
      const key = `${machine.id || machine.name}-${machine.osType}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Hardware rows removed - hardware management moved to separate interface
  addHardwareRows_DISABLED(container, timeSlots, viewType) {
    const hardware = this.app.data.hardware;

    if (!hardware || (!hardware.debuggers?.length && !hardware.platforms?.length)) {
      // Add a message row if no hardware
      const noHardwareLabel = document.createElement('div');
      noHardwareLabel.className = 'resource-label hardware';
      noHardwareLabel.textContent = 'No hardware configured';
      noHardwareLabel.style.fontStyle = 'italic';
      noHardwareLabel.style.color = '#999';
      container.appendChild(noHardwareLabel);

      // Add empty cells
      timeSlots.forEach(() => {
        const cell = document.createElement('div');
        cell.className = 'timeline-cell empty';
        cell.textContent = '-';
        container.appendChild(cell);
      });
      return;
    }

    // Add debugger rows
    if (hardware.debuggers && hardware.debuggers.length > 0) {
      hardware.debuggers.forEach(debuggerItem => {
        const debuggerLabel = document.createElement('div');
        debuggerLabel.className = 'resource-label hardware';
        debuggerLabel.innerHTML = `
          <div class="hardware-name">🔧 ${debuggerItem.name}</div>
          <div class="hardware-details">Debugger: ${debuggerItem.available}/${debuggerItem.quantity} available</div>
        `;
        container.appendChild(debuggerLabel);

        timeSlots.forEach(timeSlot => {
          const cell = document.createElement('div');
          cell.className = 'timeline-cell';

          const usage = this.getHardwareUsage(debuggerItem.id, timeSlot, 'debugger');
          if (usage.used >= debuggerItem.quantity) {
            cell.classList.add('occupied');
          } else if (usage.used > 0) {
            cell.classList.add('partial');
          } else {
            cell.classList.add('available');
          }

          cell.textContent = `${usage.used}/${debuggerItem.quantity}`;
          container.appendChild(cell);
        });
      });
    }

    // Add platform rows
    if (hardware.platforms && hardware.platforms.length > 0) {
      hardware.platforms.forEach(platformItem => {
        const platformLabel = document.createElement('div');
        platformLabel.className = 'resource-label hardware';
        platformLabel.innerHTML = `
          <div class="hardware-name">🖥️ ${platformItem.name}</div>
          <div class="hardware-details">Platform: ${platformItem.available}/${platformItem.quantity} available</div>
        `;
        container.appendChild(platformLabel);

        timeSlots.forEach(timeSlot => {
          const cell = document.createElement('div');
          cell.className = 'timeline-cell';

          const usage = this.getHardwareUsage(platformItem.id, timeSlot, 'platform');
          if (usage.used >= platformItem.quantity) {
            cell.classList.add('occupied');
          } else if (usage.used > 0) {
            cell.classList.add('partial');
          } else {
            cell.classList.add('available');
          }

          cell.textContent = `${usage.used}/${platformItem.quantity}`;
          container.appendChild(cell);
        });
      });
    }
  }

  groupMachinesByType(machines) {
    return machines.reduce((groups, machine) => {
      const type = machine.osType;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(machine);
      return groups;
    }, {});
  }

  findAssignment(machineId, timeSlot) {
    const assignments = this.app.data.schedule.assignments || [];
    const timeSlotId = typeof timeSlot === 'object' ? timeSlot.label || timeSlot.id : timeSlot;

    return assignments.find(assignment =>
      assignment.machineId === machineId &&
      assignment.timeSlot === timeSlotId
    );
  }

  isTimeSlotMatch(assignmentSlot, timeSlot) {
    const timeSlotId = typeof timeSlot === 'object' ? timeSlot.label || timeSlot.id : timeSlot;
    return assignmentSlot === timeSlotId;
  }

  calculateRequiredSlots(session) {
    // Calculate how many time slots this session needs
    return Math.ceil(session.estimatedTime); // Round up to nearest hour
  }

  isPartOfSession(machineId, timeSlotId, processedAssignments) {
    // Check if this time slot is part of a session that spans multiple slots
    const assignments = this.app.data.schedule.assignments || [];

    // Find any assignment for this machine that might span to this slot
    for (const assignment of assignments) {
      if (assignment.machineId === machineId && processedAssignments.has(assignment.id)) {
        const session = this.app.data.sessions.find(s => s.id === assignment.sessionId);
        if (session) {
          const requiredSlots = this.calculateRequiredSlots(session);
          const startSlotIndex = this.getTimeSlotIndex(assignment.timeSlot);
          const currentSlotIndex = this.getTimeSlotIndex(timeSlotId);

          if (currentSlotIndex > startSlotIndex && currentSlotIndex < startSlotIndex + requiredSlots) {
            return true;
          }
        }
      }
    }
    return false;
  }

  getTimeSlotIndex(timeSlotId) {
    // Extract the index from time slot ID (e.g., "day-0-6" -> 6)
    const parts = timeSlotId.split('-');
    return parseInt(parts[parts.length - 1]) || 0;
  }

  createSessionSpan(assignment, session, requiredSlots, startIndex, totalSlots) {
    const sessionCard = document.createElement('div');
    sessionCard.className = `session-card priority-${session.priority} session-span`;
    sessionCard.title = `${session.name} - ${session.estimatedTime.toFixed(1)}h - ${session.priority} priority`;

    // Calculate the width to span multiple cells
    const maxSlots = Math.min(requiredSlots, totalSlots - startIndex);
    const spanWidth = `calc(${maxSlots * 100}% + ${(maxSlots - 1) * 1}px)`; // Account for grid gaps

    sessionCard.style.width = spanWidth;
    sessionCard.style.position = 'relative';
    sessionCard.style.zIndex = '10';

    const name = document.createElement('div');
    name.className = 'session-card-name';
    name.textContent = session.name.length > 20 ? session.name.substring(0, 20) + '...' : session.name;
    sessionCard.appendChild(name);

    const details = document.createElement('div');
    details.className = 'session-card-details';
    details.textContent = `${session.estimatedTime.toFixed(1)}h | ${session.priority} | ${maxSlots} slots`;
    sessionCard.appendChild(details);

    // Add hardware info if available
    if (assignment.hardwareAssignment) {
      const hardware = document.createElement('div');
      hardware.className = 'session-card-hardware';
      hardware.style.fontSize = '0.6rem';
      hardware.style.opacity = '0.8';

      const parts = [];
      if (assignment.hardwareAssignment.debugger) {
        parts.push(`D: ${assignment.hardwareAssignment.debugger.name}`);
      }
      if (assignment.hardwareAssignment.platform) {
        parts.push(`P: ${assignment.hardwareAssignment.platform.name}`);
      }
      hardware.textContent = parts.join(' | ');
      sessionCard.appendChild(hardware);
    }

    // Add click handler for session details
    sessionCard.addEventListener('click', (event) => {
      event.stopPropagation();
      this.showSessionDetails(session, assignment);
    });

    return sessionCard;
  }

  getHardwareUsage(hardwareId, timeSlot, hardwareType) {
    const assignments = this.app.data.schedule.assignments || [];
    let used = 0;

    assignments.forEach(assignment => {
      if (this.isTimeSlotMatch(assignment.timeSlot, timeSlot) && assignment.hardwareAssignment) {
        const hardware = assignment.hardwareAssignment[hardwareType];
        if (hardware && hardware.id === hardwareId) {
          used++;
        }
      }
    });

    return { used };
  }

  createSessionCard(assignment) {
    const session = this.app.data.sessions.find(s => s.id === assignment.sessionId);
    if (!session) {
      console.warn('Session not found for assignment:', assignment.sessionId);
      return null;
    }

    const card = document.createElement('div');
    card.className = `session-card priority-${session.priority}`;
    card.title = `${session.name} - ${session.estimatedTime.toFixed(1)}h - ${session.priority} priority`;

    const name = document.createElement('div');
    name.className = 'session-card-name';
    name.textContent = session.name.length > 15 ? session.name.substring(0, 15) + '...' : session.name;
    card.appendChild(name);

    const details = document.createElement('div');
    details.className = 'session-card-details';
    details.textContent = `${session.estimatedTime.toFixed(1)}h | ${session.priority}`;
    card.appendChild(details);

    // Add hardware info if available
    if (assignment.hardwareAssignment) {
      const hardware = document.createElement('div');
      hardware.className = 'session-card-hardware';
      hardware.style.fontSize = '0.6rem';
      hardware.style.opacity = '0.8';

      const parts = [];
      if (assignment.hardwareAssignment.debugger) {
        parts.push(`D: ${assignment.hardwareAssignment.debugger.name}`);
      }
      if (assignment.hardwareAssignment.platform) {
        parts.push(`P: ${assignment.hardwareAssignment.platform.name}`);
      }
      hardware.textContent = parts.join(' | ');
      card.appendChild(hardware);
    }

    // Add click handler for session details
    card.addEventListener('click', (event) => {
      event.stopPropagation();
      this.showSessionDetails(session, assignment);
    });

    return card;
  }

  handleCellClick(resourceId, timeSlot, resourceType) {
    console.log(`Clicked ${resourceType} ${resourceId} at ${timeSlot}`);
    // Implement manual scheduling logic here
  }

  showSessionDetails(session, assignment = null) {
    const details = [
      `Session: ${session.name}`,
      `Priority: ${session.priority}`,
      `Estimated Time: ${session.estimatedTime.toFixed(2)} hours`,
      `OS: ${session.os || 'Not specified'}`,
      `Platform: ${session.platform || 'Not specified'}`,
      `Debugger: ${session.debugger || 'Not specified'}`,
      `Status: ${session.status}`
    ];

    if (assignment) {
      details.push(`Scheduled Time: ${assignment.timeSlot}`);
      if (assignment.hardwareAssignment) {
        if (assignment.hardwareAssignment.debugger) {
          details.push(`Assigned Debugger: ${assignment.hardwareAssignment.debugger.name}`);
        }
        if (assignment.hardwareAssignment.platform) {
          details.push(`Assigned Platform: ${assignment.hardwareAssignment.platform.name}`);
        }
      }
    }

    alert(details.join('\n'));
  }

  addTimelineLegend() {
    const timelineContainer = document.getElementById('timelineContainer');
    if (!timelineContainer) return;

    // Remove existing legend
    const existingLegend = timelineContainer.querySelector('.timeline-legend');
    if (existingLegend) {
      existingLegend.remove();
    }

    const legend = document.createElement('div');
    legend.className = 'timeline-legend';
    
    const legendItems = [
      { color: 'available', label: 'Available' },
      { color: 'occupied', label: 'Occupied' },
      { color: 'conflict', label: 'Conflict' },
      { color: 'urgent', label: 'Urgent Priority' },
      { color: 'high', label: 'High Priority' },
      { color: 'normal', label: 'Normal Priority' }
    ];

    legendItems.forEach(item => {
      const legendItem = document.createElement('div');
      legendItem.className = 'legend-item';
      
      const colorBox = document.createElement('div');
      colorBox.className = `legend-color ${item.color}`;
      
      const label = document.createElement('span');
      label.textContent = item.label;
      
      legendItem.appendChild(colorBox);
      legendItem.appendChild(label);
      legend.appendChild(legendItem);
    });

    timelineContainer.insertBefore(legend, timelineContainer.firstChild);
  }

  addTimelineStatistics() {
    const timelineContainer = document.getElementById('timelineContainer');
    if (!timelineContainer) return;

    // Remove existing stats
    const existingStats = timelineContainer.querySelector('.timeline-stats');
    if (existingStats) {
      existingStats.remove();
    }

    const stats = this.calculateTimelineStatistics();
    const statsContainer = document.createElement('div');
    statsContainer.className = 'timeline-stats';

    const statItems = [
      { label: 'Total Sessions', value: stats.totalSessions },
      { label: 'Scheduled', value: stats.scheduledSessions },
      { label: 'Utilization', value: `${stats.utilizationRate}%` },
      { label: 'Conflicts', value: stats.conflicts }
    ];

    statItems.forEach(item => {
      const statDiv = document.createElement('div');
      statDiv.className = 'timeline-stat';
      
      const value = document.createElement('div');
      value.className = 'timeline-stat-value';
      value.textContent = item.value;
      
      const label = document.createElement('div');
      label.className = 'timeline-stat-label';
      label.textContent = item.label;
      
      statDiv.appendChild(value);
      statDiv.appendChild(label);
      statsContainer.appendChild(statDiv);
    });

    timelineContainer.insertBefore(statsContainer, timelineContainer.firstChild);
  }

  calculateTimelineStatistics() {
    const sessions = this.app.data.sessions;
    const schedule = this.app.data.schedule;
    
    return {
      totalSessions: sessions.length,
      scheduledSessions: sessions.filter(s => s.status === 'scheduled').length,
      utilizationRate: schedule.timeSlots && schedule.timeSlots.length > 0 
        ? ((schedule.assignments?.length || 0) / schedule.timeSlots.length * 100).toFixed(1)
        : '0.0',
      conflicts: 0 // TODO: Calculate actual conflicts
    };
  }

  async autoSchedule() {
    const autoScheduleBtn = document.getElementById('autoScheduleBtn');
    const originalText = autoScheduleBtn?.textContent;

    try {
      // Show loading state
      if (autoScheduleBtn) {
        autoScheduleBtn.disabled = true;
        autoScheduleBtn.textContent = '⏳ Scheduling...';
      }

      this.app.showNotification('Starting auto-scheduling...', 'info');

      const response = await fetch('/api/schedule/auto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          viewType: this.currentView,
          prioritizeView: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Auto-schedule result:', result);

      if (result.success) {
        // Update local data immediately
        this.app.data.schedule = result.schedule;
        if (result.queue) {
          this.app.data.queue = result.queue;
        }

        // Refresh timeline display
        this.updateTimelineGrid();

        // Show success notification with summary
        const summary = result.summary;
        let message = `Auto-scheduling completed! ${summary.scheduledSessions}/${summary.totalSessions} sessions scheduled (${summary.schedulingRate}% success rate)`;

        // Add queue information if there are waiting sessions
        if (result.queue && result.queue.length > 0) {
          message += `. ${result.queue.length} sessions in queue waiting for resources.`;
        }

        this.app.showNotification(message, 'success');

        // Data will also be updated via socket for other clients
      } else {
        throw new Error(result.error || 'Auto-scheduling failed');
      }

    } catch (error) {
      console.error('Auto-schedule error:', error);
      this.app.showNotification(error.message || 'Failed to auto-schedule', 'error');
    } finally {
      // Restore button state
      if (autoScheduleBtn) {
        autoScheduleBtn.disabled = false;
        autoScheduleBtn.textContent = originalText || 'Auto Schedule';
      }
    }
  }

  async clearSchedule() {
    try {
      const confirmMessage = 'Are you sure you want to clear the entire schedule? This action cannot be undone.';
      if (!confirm(confirmMessage)) {
        return;
      }

      const response = await fetch('/api/schedule', {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        this.app.showNotification('Schedule cleared successfully', 'success');
        // Data will be updated via socket
      } else {
        throw new Error(result.error || 'Failed to clear schedule');
      }

    } catch (error) {
      console.error('Clear schedule error:', error);
      this.app.showNotification(error.message || 'Failed to clear schedule', 'error');
    }
  }

  async refreshTimelineData() {
    // Use the comprehensive refresh method
    await this.refreshAllData();
  }

  addMachineTimeSlots(container, machine, timeSlots) {
    // Create a map of all assignments for this machine
    const assignments = this.app.data.schedule.assignments || [];
    const machineAssignments = assignments.filter(a => a.machineId === machine.id);

    // Create a map of time slot index to assignment
    const assignmentMap = new Map();
    machineAssignments.forEach(assignment => {
      const slotIndex = this.getTimeSlotIndexFromId(assignment.timeSlot, timeSlots);
      if (slotIndex >= 0) {
        assignmentMap.set(slotIndex, assignment);
      }
    });

    // Track which slots are already processed as part of spanning sessions
    const processedSlots = new Set();

    timeSlots.forEach((timeSlot, index) => {
      const cell = document.createElement('div');
      cell.className = 'timeline-cell';
      cell.setAttribute('data-machine-id', machine.id);

      const timeSlotId = typeof timeSlot === 'object' ? timeSlot.id : timeSlot;
      cell.setAttribute('data-time-slot', timeSlotId);

      if (processedSlots.has(index)) {
        // This slot is part of a spanning session
        cell.classList.add('occupied', 'session-continuation');
      } else if (assignmentMap.has(index)) {
        // This is the start of a session
        const assignment = assignmentMap.get(index);
        const session = this.app.data.sessions.find(s => s.id === assignment.sessionId);

        if (session) {
          const requiredSlots = this.calculateRequiredSlots(session);
          const availableSlots = Math.min(requiredSlots, timeSlots.length - index);

          // Mark subsequent slots as processed
          for (let i = 1; i < availableSlots; i++) {
            processedSlots.add(index + i);
          }

          // Don't use grid spanning - use absolute positioning instead
          cell.classList.add('occupied', 'session-start');

          // Create session card that spans visually across multiple cells
          const sessionCard = this.createSpanningSessionCard(assignment, session, availableSlots, index);
          cell.appendChild(sessionCard);

          // Adjust width after DOM insertion
          setTimeout(() => {
            this.adjustSessionCardWidth(sessionCard, cell, availableSlots, index);
          }, 0);
        }
      } else if (machine.status === 'available') {
        cell.classList.add('available');
        cell.textContent = 'Available';
      } else {
        cell.classList.add('unavailable');
        cell.textContent = machine.status;
      }

      // Add click handler for manual scheduling
      cell.addEventListener('click', () => {
        this.handleCellClick(machine.id, timeSlot, 'machine');
      });

      container.appendChild(cell);
    });
  }

  getTimeSlotIndexFromId(timeSlotId, timeSlots) {
    return timeSlots.findIndex(slot => {
      const slotId = typeof slot === 'object' ? slot.id : slot;
      return slotId === timeSlotId;
    });
  }

  createSpanningSessionCard(assignment, session, spanSlots, startIndex = 0) {
    const sessionCard = document.createElement('div');
    sessionCard.className = `session-card priority-${session.priority} session-spanning`;
    sessionCard.title = `${session.name}
Duration: ${session.estimatedTime.toFixed(1)} hours
Priority: ${session.priority}
Time Slots: ${spanSlots} slots
OS: ${session.os || 'Not specified'}
Platform: ${session.platform || 'Not specified'}
Debugger: ${session.debugger || 'Not specified'}`;

    // Style the session card with absolute positioning
    sessionCard.style.position = 'absolute';
    sessionCard.style.top = '2px';
    sessionCard.style.left = '2px';
    sessionCard.style.height = 'calc(100% - 4px)';
    sessionCard.style.zIndex = '10';
    sessionCard.style.margin = '0';
    sessionCard.style.padding = '6px';
    sessionCard.style.boxSizing = 'border-box';
    sessionCard.style.borderRadius = '4px';
    sessionCard.style.overflow = 'hidden';
    sessionCard.style.pointerEvents = 'auto';

    // Initial width - will be calculated dynamically
    sessionCard.style.width = '100%';
    sessionCard.style.minWidth = '100px';

    const name = document.createElement('div');
    name.className = 'session-card-name';
    name.textContent = session.name.length > 25 ? session.name.substring(0, 25) + '...' : session.name;
    sessionCard.appendChild(name);

    const details = document.createElement('div');
    details.className = 'session-card-details';
    details.innerHTML = `
      <div>⏱️ ${session.estimatedTime.toFixed(1)}h | 🔥 ${session.priority}</div>
      <div>📊 ${spanSlots} time slots</div>
    `;
    sessionCard.appendChild(details);

    // Add hardware info if available
    if (assignment.hardwareAssignment) {
      const hardware = document.createElement('div');
      hardware.className = 'session-card-hardware';

      const parts = [];
      if (assignment.hardwareAssignment.debugger) {
        parts.push(`🔧 ${assignment.hardwareAssignment.debugger.name}`);
      }
      if (assignment.hardwareAssignment.platform) {
        parts.push(`🖥️ ${assignment.hardwareAssignment.platform.name}`);
      }
      hardware.textContent = parts.join(' | ');
      sessionCard.appendChild(hardware);
    }

    // Add duration indicator bar
    const durationBar = document.createElement('div');
    durationBar.className = 'session-duration-bar';
    durationBar.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: rgba(255,255,255,0.3);
      border-radius: 0 0 4px 4px;
    `;

    const durationFill = document.createElement('div');
    durationFill.style.cssText = `
      height: 100%;
      width: ${Math.min(100, (session.estimatedTime / spanSlots) * 100)}%;
      background: rgba(255,255,255,0.8);
      border-radius: 0 0 4px 4px;
      transition: width 0.3s ease;
    `;

    durationBar.appendChild(durationFill);
    sessionCard.appendChild(durationBar);

    // Add resize handle for extending session duration
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'session-resize-handle';
    resizeHandle.style.cssText = `
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 8px;
      background: rgba(255,255,255,0.5);
      cursor: ew-resize;
      opacity: 0;
      transition: opacity 0.2s ease;
      border-radius: 0 4px 4px 0;
    `;
    resizeHandle.title = 'Drag to extend session duration';
    sessionCard.appendChild(resizeHandle);

    // Show resize handle on hover
    sessionCard.addEventListener('mouseenter', () => {
      resizeHandle.style.opacity = '1';
    });

    sessionCard.addEventListener('mouseleave', () => {
      resizeHandle.style.opacity = '0';
    });

    // Add resize functionality
    this.addResizeHandlers(resizeHandle, sessionCard, assignment, session, spanSlots);

    // Add click handler for session details
    sessionCard.addEventListener('click', (event) => {
      if (event.target === resizeHandle) return; // Don't show details when clicking resize handle
      event.stopPropagation();
      this.showSessionDetails(session, assignment);
    });

    return sessionCard;
  }

  createFullWidthSessionCard(assignment, session, spanSlots) {
    const sessionCard = document.createElement('div');
    sessionCard.className = `session-card priority-${session.priority} session-full-width`;
    sessionCard.title = `${session.name}
Duration: ${session.estimatedTime.toFixed(1)} hours
Priority: ${session.priority}
Time Slots: ${spanSlots} slots
OS: ${session.os || 'Not specified'}
Platform: ${session.platform || 'Not specified'}
Debugger: ${session.debugger || 'Not specified'}`;

    // Style to fill the entire spanned cell
    sessionCard.style.width = '100%';
    sessionCard.style.height = '100%';
    sessionCard.style.margin = '0';
    sessionCard.style.padding = '6px';
    sessionCard.style.boxSizing = 'border-box';
    sessionCard.style.borderRadius = '4px';
    sessionCard.style.position = 'relative';
    sessionCard.style.overflow = 'hidden';

    const name = document.createElement('div');
    name.className = 'session-card-name';
    name.textContent = session.name.length > 30 ? session.name.substring(0, 30) + '...' : session.name;
    sessionCard.appendChild(name);

    const details = document.createElement('div');
    details.className = 'session-card-details';
    details.innerHTML = `
      <div>⏱️ ${session.estimatedTime.toFixed(1)}h | 🔥 ${session.priority}</div>
      <div>📊 ${spanSlots} time slots</div>
    `;
    sessionCard.appendChild(details);

    // Add hardware info if available
    if (assignment.hardwareAssignment) {
      const hardware = document.createElement('div');
      hardware.className = 'session-card-hardware';

      const parts = [];
      if (assignment.hardwareAssignment.debugger) {
        parts.push(`🔧 ${assignment.hardwareAssignment.debugger.name}`);
      }
      if (assignment.hardwareAssignment.platform) {
        parts.push(`🖥️ ${assignment.hardwareAssignment.platform.name}`);
      }
      hardware.textContent = parts.join(' | ');
      sessionCard.appendChild(hardware);
    }

    // Add duration indicator bar
    const durationBar = document.createElement('div');
    durationBar.className = 'session-duration-bar';
    durationBar.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: rgba(255,255,255,0.3);
      border-radius: 0 0 4px 4px;
    `;

    const durationFill = document.createElement('div');
    durationFill.style.cssText = `
      height: 100%;
      width: ${Math.min(100, (session.estimatedTime / spanSlots) * 100)}%;
      background: rgba(255,255,255,0.8);
      border-radius: 0 0 4px 4px;
      transition: width 0.3s ease;
    `;

    durationBar.appendChild(durationFill);
    sessionCard.appendChild(durationBar);

    // Add click handler for session details
    sessionCard.addEventListener('click', (event) => {
      event.stopPropagation();
      this.showSessionDetails(session, assignment);
    });

    return sessionCard;
  }

  adjustSessionCardWidth(sessionCard, startCell, spanSlots, startIndex) {
    try {
      // Wait for layout to complete
      requestAnimationFrame(() => {
        // Get the grid container and all cells in the same row
        const gridContainer = startCell.parentElement;
        const allCells = Array.from(gridContainer.children).filter(cell =>
          cell.classList.contains('timeline-cell')
        );

        // Find the start cell index among timeline cells only
        const cellIndex = allCells.indexOf(startCell);
        if (cellIndex === -1) return;

        // Calculate total width by measuring consecutive cells
        let totalWidth = 0;
        const startRect = startCell.getBoundingClientRect();

        // Get the last cell we want to span to
        const endIndex = Math.min(cellIndex + spanSlots - 1, allCells.length - 1);
        const endCell = allCells[endIndex];
        const endRect = endCell.getBoundingClientRect();

        // Calculate the total width from start to end
        totalWidth = endRect.right - startRect.left;

        if (totalWidth > 0) {
          // Adjust for padding and borders
          const adjustedWidth = totalWidth - 4; // Account for cell padding
          sessionCard.style.width = `${adjustedWidth}px`;
          sessionCard.style.minWidth = `${adjustedWidth}px`;
        }
      });
    } catch (error) {
      console.warn('Failed to adjust session card width:', error);
      // Fallback calculation
      sessionCard.style.width = `calc(${spanSlots * 100}% + ${(spanSlots - 1) * 1}px)`;
    }
  }

  addResizeHandlers(resizeHandle, sessionCard, assignment, session, currentSpanSlots) {
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = sessionCard.offsetWidth;

      // Add visual feedback
      sessionCard.classList.add('resizing');

      // Prevent text selection during resize
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ew-resize';

      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startX;
      const newWidth = startWidth + deltaX;

      // Calculate how many slots this new width represents
      const cellWidth = startWidth / currentSpanSlots; // Approximate cell width
      const newSpanSlots = Math.max(1, Math.round(newWidth / cellWidth));

      // Update the session card width
      sessionCard.style.width = `${newWidth}px`;

      // Update the duration display
      const detailsElement = sessionCard.querySelector('.session-card-details');
      if (detailsElement) {
        detailsElement.innerHTML = `
          <div>⏱️ ${session.estimatedTime.toFixed(1)}h → ${newSpanSlots}h | 🔥 ${session.priority}</div>
          <div>📊 ${newSpanSlots} time slots (extended)</div>
        `;
      }

      e.preventDefault();
    });

    document.addEventListener('mouseup', (e) => {
      if (!isResizing) return;

      isResizing = false;

      // Remove visual feedback
      sessionCard.classList.remove('resizing');

      document.body.style.userSelect = '';
      document.body.style.cursor = '';

      // Calculate final span slots
      const finalWidth = sessionCard.offsetWidth;
      const cellWidth = startWidth / currentSpanSlots;
      const finalSpanSlots = Math.max(1, Math.round(finalWidth / cellWidth));

      // Update session duration if changed
      if (finalSpanSlots !== currentSpanSlots) {
        this.updateSessionDuration(assignment, session, finalSpanSlots);
      }

      e.preventDefault();
    });
  }

  updateSessionDuration(assignment, session, newSpanSlots) {
    // Update the session's estimated time
    const oldTime = session.estimatedTime;
    session.estimatedTime = newSpanSlots;

    // Show notification
    this.app.showNotification(
      `Session "${session.name}" duration extended from ${oldTime.toFixed(1)}h to ${newSpanSlots}h`,
      'info'
    );

    // TODO: Send update to backend to persist the change
    console.log(`Updated session ${session.id} duration: ${oldTime}h → ${newSpanSlots}h`);
  }

  setupMachineChangeListeners() {
    // Listen for machine type quantity changes
    const machineInputs = document.querySelectorAll('input[data-machine-type]');
    machineInputs.forEach(input => {
      input.addEventListener('change', () => {
        console.log('Machine configuration changed, refreshing timeline...');
        // Delay refresh to allow backend to process the change
        setTimeout(() => {
          this.refreshAllData();
        }, 500);
      });
    });

    // Listen for machine type form submissions
    const machineForm = document.getElementById('machineTypesForm');
    if (machineForm) {
      machineForm.addEventListener('submit', () => {
        console.log('Machine types form submitted, refreshing timeline...');
        setTimeout(() => {
          this.refreshAllData();
        }, 1000);
      });
    }

    // Listen for socket updates about machine changes
    if (this.app.socket) {
      this.app.socket.on('machines:updated', (data) => {
        console.log('Timeline: Received machine update via socket:', data.length, 'machines');
        this.app.data.machines = data;
        this.updateTimelineGrid();
        this.app.showNotification('Timeline updated with new machine configuration', 'info');
      });

      this.app.socket.on('machineTypes:updated', (data) => {
        console.log('Timeline: Received machine types update via socket:', data.length, 'types');
        setTimeout(() => {
          this.refreshAllData();
        }, 500);
      });
    }
  }

  async refreshAllData() {
    try {
      console.log('Refreshing all timeline data...');

      // Reload all data from server
      await Promise.all([
        this.refreshMachineData(),
        this.refreshScheduleData(),
        this.refreshSessionData()
      ]);

      // Update timeline display
      this.updateTimelineGrid();

      this.app.showNotification('Timeline data refreshed successfully', 'success');
    } catch (error) {
      console.error('Failed to refresh timeline data:', error);
      this.app.showNotification('Failed to refresh timeline data', 'error');
    }
  }

  async refreshMachineData() {
    try {
      const response = await fetch('/api/machines');
      if (response.ok) {
        const data = await response.json();
        this.app.data.machines = data.machines || [];
        console.log('Refreshed machine data:', this.app.data.machines.length, 'machines');
      }
    } catch (error) {
      console.error('Failed to refresh machine data:', error);
    }
  }

  async refreshScheduleData() {
    try {
      const response = await fetch('/api/schedule');
      if (response.ok) {
        const data = await response.json();
        this.app.data.schedule = data.schedule || { timeSlots: [], assignments: [] };
        console.log('Refreshed schedule data:', this.app.data.schedule.assignments?.length || 0, 'assignments');
      }
    } catch (error) {
      console.error('Failed to refresh schedule data:', error);
    }
  }

  async refreshSessionData() {
    try {
      const response = await fetch('/api/sessions');
      if (response.ok) {
        const data = await response.json();
        this.app.data.sessions = data.sessions || [];
        console.log('Refreshed session data:', this.app.data.sessions.length, 'sessions');
      }
    } catch (error) {
      console.error('Failed to refresh session data:', error);
    }
  }

  setupPeriodicRefresh() {
    // Check for machine count changes every 30 seconds as fallback
    this.lastMachineCount = this.app.data.machines?.length || 0;

    setInterval(() => {
      const currentMachineCount = this.app.data.machines?.length || 0;
      if (currentMachineCount !== this.lastMachineCount) {
        console.log(`Machine count changed: ${this.lastMachineCount} → ${currentMachineCount}`);
        this.lastMachineCount = currentMachineCount;
        this.updateTimelineGrid();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Show hardware analysis popup
   */
  async showHardwareAnalysis() {
    try {
      // Refresh data before analysis
      await this.app.loadInitialData();

      // Create modal backdrop
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop show'; // Add 'show' class to display

    // Create modal content
    const modal = document.createElement('div');
    modal.className = 'modal'; // Use standard modal class

    // Create modal header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      border-bottom: 1px solid #eee;
      padding-bottom: 15px;
    `;

    const title = document.createElement('h2');
    title.textContent = '📊 Hardware Requirements Analysis';
    title.style.margin = '0';

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #999;
    `;
    closeBtn.addEventListener('click', () => {
      this.app.closeAllModals();
    });

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Create filter controls
    const filterContainer = document.createElement('div');
    filterContainer.style.cssText = `
      margin-bottom: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 5px;
    `;

    const filterLabel = document.createElement('label');
    filterLabel.textContent = 'Show: ';
    filterLabel.style.fontWeight = 'bold';

    const filterSelect = document.createElement('select');
    filterSelect.style.cssText = `
      margin-left: 10px;
      padding: 5px 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
    `;

    const scheduledOption = document.createElement('option');
    scheduledOption.value = 'scheduled';
    scheduledOption.textContent = 'Hardware for Scheduled Sessions Only';

    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All Hardware Requirements';

    filterSelect.appendChild(scheduledOption);
    filterSelect.appendChild(allOption);

    filterContainer.appendChild(filterLabel);
    filterContainer.appendChild(filterSelect);

    // Add export button
    const exportBtn = document.createElement('button');
    exportBtn.textContent = '📥 Export CSV';
    exportBtn.style.cssText = `
      margin-left: 15px;
      padding: 5px 10px;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;
    exportBtn.addEventListener('click', () => {
      this.exportHardwareAnalysis(filterSelect.value);
    });

    filterContainer.appendChild(exportBtn);

    // Create table container
    const tableContainer = document.createElement('div');
    tableContainer.id = 'hardwareAnalysisTable';

    // Generate initial table
    this.generateHardwareAnalysisTable(tableContainer, 'scheduled');

    // Add filter change listener
    filterSelect.addEventListener('change', (e) => {
      this.sortState = null; // Reset sort state when filter changes
      this.generateHardwareAnalysisTable(tableContainer, e.target.value);
    });

    // Assemble modal
    modal.appendChild(header);
    modal.appendChild(filterContainer);
    modal.appendChild(tableContainer);
    backdrop.appendChild(modal);

    // Add to page
    document.body.appendChild(backdrop);

    // Close on backdrop click
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        this.app.closeAllModals();
      }
    });

    } catch (error) {
      console.error('Error showing hardware analysis:', error);
      this.app.showNotification('Failed to load hardware analysis data', 'error');
    }
  }

  /**
   * Generate hardware analysis table
   */
  generateHardwareAnalysisTable(container, filterType, sortState = null) {
    container.innerHTML = '';

    let analysis = this.analyzeHardwareRequirements(filterType);

    // Apply sorting if specified
    if (sortState && sortState.key) {
      analysis.sort((a, b) => {
        let aVal = a[sortState.key];
        let bVal = b[sortState.key];

        // Handle string comparison
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }

        let comparison = 0;
        if (aVal > bVal) comparison = 1;
        if (aVal < bVal) comparison = -1;

        return sortState.direction === 'desc' ? -comparison : comparison;
      });
    }

    if (analysis.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No hardware requirements found.</p>';
      return;
    }

    // Create table
    const table = document.createElement('table');
    table.style.cssText = `
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    `;

    // Create header with sorting
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.background = '#f8f9fa';

    const headers = [
      { text: 'Platform', key: 'platform', align: 'left' },
      { text: 'Debugger', key: 'debugger', align: 'left' },
      { text: 'Session Count', key: 'sessionCount', align: 'center' },
      { text: 'Total Time (hours)', key: 'totalTime', align: 'center' },
      { text: 'Sessions', key: 'sessions', align: 'left' }
    ];

    headers.forEach(header => {
      const th = document.createElement('th');
      th.style.cssText = `
        padding: 12px;
        border: 1px solid #ddd;
        text-align: ${header.align};
        cursor: pointer;
        user-select: none;
        position: relative;
      `;
      th.innerHTML = `${header.text} <span style="color: #999;">⇅</span>`;

      if (header.key !== 'sessions') { // Don't make sessions column sortable
        th.addEventListener('click', () => {
          this.sortHardwareAnalysis(container, filterType, header.key);
        });

        // Show current sort indicator
        if (this.sortState && this.sortState.key === header.key) {
          const arrow = this.sortState.direction === 'asc' ? '↑' : '↓';
          th.innerHTML = `${header.text} <span style="color: #007bff;">${arrow}</span>`;
        }
      } else {
        th.style.cursor = 'default';
        th.innerHTML = header.text;
      }

      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);

    // Create body
    const tbody = document.createElement('tbody');
    analysis.forEach((item, index) => {
      const row = document.createElement('tr');
      row.style.backgroundColor = index % 2 === 0 ? '#fff' : '#f9f9f9';

      const sessionNames = item.sessions.map(s => s.name).join(', ');
      const truncatedNames = sessionNames.length > 50 ? sessionNames.substring(0, 50) + '...' : sessionNames;

      row.innerHTML = `
        <td style="padding: 12px; border: 1px solid #ddd;">${item.platform || 'No Platform'}</td>
        <td style="padding: 12px; border: 1px solid #ddd;">${item.debugger || 'No Debugger'}</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">${item.sessionCount}</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">${item.totalTime.toFixed(1)}</td>
        <td style="padding: 12px; border: 1px solid #ddd;" title="${sessionNames}">${truncatedNames}</td>
      `;
      tbody.appendChild(row);
    });

    table.appendChild(thead);
    table.appendChild(tbody);

    // Add summary
    const summary = document.createElement('div');
    summary.style.cssText = `
      margin-top: 20px;
      padding: 15px;
      background: #e9ecef;
      border-radius: 5px;
      border-left: 4px solid #007bff;
    `;

    const totalSessions = analysis.reduce((sum, item) => sum + item.sessionCount, 0);
    const totalTime = analysis.reduce((sum, item) => sum + item.totalTime, 0);
    const uniqueCombinations = analysis.length;

    const averageTimePerSession = totalSessions > 0 ? (totalTime / totalSessions).toFixed(1) : '0.0';
    const averageSessionsPerCombination = uniqueCombinations > 0 ? (totalSessions / uniqueCombinations).toFixed(1) : '0.0';

    summary.innerHTML = `
      <h4 style="margin: 0 0 10px 0;">📊 Summary</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
        <div>
          <p style="margin: 5px 0;"><strong>Total Sessions:</strong> ${totalSessions}</p>
          <p style="margin: 5px 0;"><strong>Total Time Required:</strong> ${totalTime.toFixed(1)} hours</p>
        </div>
        <div>
          <p style="margin: 5px 0;"><strong>Unique Combinations:</strong> ${uniqueCombinations}</p>
          <p style="margin: 5px 0;"><strong>Avg Time/Session:</strong> ${averageTimePerSession} hours</p>
        </div>
        <div>
          <p style="margin: 5px 0;"><strong>Avg Sessions/Combo:</strong> ${averageSessionsPerCombination}</p>
          <p style="margin: 5px 0;"><strong>Filter:</strong> ${filterType === 'scheduled' ? 'Scheduled Only' : 'All Sessions'}</p>
        </div>
      </div>
    `;

    container.appendChild(table);
    container.appendChild(summary);
  }

  /**
   * Analyze hardware requirements
   */
  analyzeHardwareRequirements(filterType) {
    const sessions = this.app.data.sessions || [];
    const schedule = this.app.data.schedule || {};
    const assignments = schedule.assignments || [];

    let targetSessions = sessions;

    if (filterType === 'scheduled') {
      // Only include sessions that are scheduled
      const scheduledSessionIds = assignments.map(a => a.sessionId);
      targetSessions = sessions.filter(s => scheduledSessionIds.includes(s.id));
    }

    // Group sessions by hardware combination
    const hardwareGroups = {};

    targetSessions.forEach(session => {
      // Get hardware requirements
      const platformName = session.hardwareRequirements?.platform || 'No Platform';
      const debuggerName = session.hardwareRequirements?.debugger || 'No Debugger';

      const key = `${platformName}|${debuggerName}`;

      if (!hardwareGroups[key]) {
        hardwareGroups[key] = {
          platform: platformName,
          debugger: debuggerName,
          sessions: [],
          sessionCount: 0,
          totalTime: 0
        };
      }

      hardwareGroups[key].sessions.push(session);
      hardwareGroups[key].sessionCount++;
      hardwareGroups[key].totalTime += session.estimatedTime || 0;
    });

    // Convert to array and sort by total time descending
    return Object.values(hardwareGroups)
      .sort((a, b) => b.totalTime - a.totalTime);
  }

  /**
   * Export hardware analysis to CSV
   */
  exportHardwareAnalysis(filterType) {
    const analysis = this.analyzeHardwareRequirements(filterType);

    if (analysis.length === 0) {
      this.app.showNotification('No data to export', 'error');
      return;
    }

    // Create CSV content
    const headers = ['Platform', 'Debugger', 'Session Count', 'Total Time (hours)', 'Sessions'];
    const csvContent = [
      headers.join(','),
      ...analysis.map(item => [
        `"${item.platform || 'No Platform'}"`,
        `"${item.debugger || 'No Debugger'}"`,
        item.sessionCount,
        item.totalTime.toFixed(1),
        `"${item.sessions.map(s => s.name).join(', ')}"`
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `hardware-analysis-${filterType}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.app.showNotification('Hardware analysis exported successfully', 'success');
  }

  /**
   * Sort hardware analysis table
   */
  sortHardwareAnalysis(container, filterType, sortKey) {
    if (!this.sortState) {
      this.sortState = { key: null, direction: 'asc' };
    }

    // Toggle direction if same key, otherwise set to ascending
    if (this.sortState.key === sortKey) {
      this.sortState.direction = this.sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortState.key = sortKey;
      this.sortState.direction = 'asc';
    }

    // Re-generate table with sorting
    this.generateHardwareAnalysisTable(container, filterType, this.sortState);
  }
}

// Initialize timeline manager when app is ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (window.app) {
      window.timelineManager = new TimelineManager(window.app);
      
      // Override app's timeline display method
      window.app.updateTimelineGrid = () => {
        window.timelineManager.updateTimelineGrid();
      };
    }
  }, 100);
});
