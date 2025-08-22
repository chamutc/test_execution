/**
 * Hardware Requirements and Inventory Management Interface
 * Manages hardware requirements from sessions and available inventory
 */

class ComprehensiveHardwareManager {
  constructor() {
    this.data = {
      sessions: [],           // Sessions data for requirements analysis
      requirements: [],       // Hardware requirements derived from sessions
      inventory: [],          // Available hardware inventory
      platforms: [],          // Available platforms
      debuggers: [],          // Available debuggers
      schedule: {}           // Current schedule for usage tracking
    };

    this.init();
  }

  init() {
    this.initializeEventListeners();
    this.loadData();
  }

  initializeEventListeners() {
    // Sync with sessions button
    document.getElementById('syncWithSessionsBtn')?.addEventListener('click', () => {
      this.syncWithSessions();
    });

    // Add inventory button
    document.getElementById('addInventoryBtn')?.addEventListener('click', () => {
      this.showAddInventoryModal();
    });

    // Auto-create inventory from requirements
    document.getElementById('autoCreateInventoryBtn')?.addEventListener('click', () => {
      this.autoCreateInventoryFromRequirements();
    });

    // Export buttons
    document.getElementById('exportRequirementsBtn')?.addEventListener('click', () => {
      this.exportRequirements();
    });

    document.getElementById('exportInventoryBtn')?.addEventListener('click', () => {
      this.exportInventory();
    });

    // Analysis button
    document.getElementById('inventoryAnalysisBtn')?.addEventListener('click', () => {
      this.showInventoryAnalysis();
    });

    // Modal close buttons
    document.getElementById('closeAddInventoryModal')?.addEventListener('click', () => {
      this.hideModal('addInventoryModal');
    });

    document.getElementById('closeEditInventoryModal')?.addEventListener('click', () => {
      this.hideModal('editInventoryModal');
    });

    // Form submissions
    document.getElementById('addInventoryForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddInventory();
    });

    document.getElementById('editInventoryForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleEditInventory();
    });

    // Cancel buttons
    document.getElementById('cancelAddInventory')?.addEventListener('click', () => {
      this.hideModal('addInventoryModal');
    });

    document.getElementById('cancelEditInventory')?.addEventListener('click', () => {
      this.hideModal('editInventoryModal');
    });
  }

  async loadData() {
    try {
      this.showLoading();

      // Load sessions, inventory, and schedule data
      await Promise.all([
        this.loadSessions(),
        this.loadInventory(),
        this.loadSchedule()
      ]);

      // Analyze requirements from sessions
      this.analyzeRequirements();

      // Render all sections
      this.renderAll();
      this.hideLoading();

    } catch (error) {
      console.error('Error loading hardware data:', error);
      this.showNotification('Failed to load hardware data', 'error');
      this.hideLoading();
    }
  }

  async loadSessions() {
    try {
      const response = await fetch('/api/csv/sessions');
      if (response.ok) {
        const data = await response.json();
        this.data.sessions = data.sessions || [];
      } else {
        this.data.sessions = [];
      }
    } catch (error) {
      console.warn('Sessions API not available:', error.message);
      this.data.sessions = [];
    }
  }

  async loadInventory() {
    try {
      const response = await fetch('/api/hardware/inventory');
      if (response.ok) {
        const data = await response.json();
        this.data.inventory = data.inventory || [];
      } else if (response.status === 404) {
        // API not implemented yet, use empty inventory
        this.data.inventory = [];
      } else {
        console.warn('Failed to load inventory:', response.status);
        this.data.inventory = [];
      }
    } catch (error) {
      console.warn('Inventory API not available:', error.message);
      this.data.inventory = [];
    }
  }

  async loadSchedule() {
    try {
      const response = await fetch('/api/schedule');
      if (response.ok) {
        const data = await response.json();
        this.data.schedule = data.schedule || {};
      } else {
        this.data.schedule = {};
      }
    } catch (error) {
      console.warn('Schedule API not available:', error.message);
      this.data.schedule = {};
    }
  }

  analyzeRequirements() {
    const requirements = {};

    this.data.sessions.forEach(session => {
      if (session.hardwareRequirements) {
        const platform = session.hardwareRequirements.platform || session.platform || 'Unknown Platform';
        const debugger = session.hardwareRequirements.debugger || session.debugger || 'Unknown Debugger';
        const key = `${platform}|${debugger}`;

        if (!requirements[key]) {
          requirements[key] = {
            platform: platform,
            debugger: debugger,
            sessions: [],
            totalHours: 0,
            sessionCount: 0
          };
        }

        requirements[key].sessions.push(session);
        requirements[key].totalHours += session.estimatedTime || 1;
        requirements[key].sessionCount++;
      }
    });

    this.data.requirements = Object.values(requirements);
  }

  async syncWithSessions() {
    try {
      this.showNotification('Syncing with sessions...', 'info');

      // Reload sessions data
      await this.loadSessions();

      // Re-analyze requirements
      this.analyzeRequirements();

      // Update displays
      this.renderRequirements();
      this.updateRequirementsSummary();

      this.showNotification('Successfully synced with sessions data', 'success');

    } catch (error) {
      console.error('Error syncing with sessions:', error);
      this.showNotification('Failed to sync with sessions', 'error');
    }
  }

  async autoCreateInventoryFromRequirements() {
    try {
      const newInventoryItems = [];

      this.data.requirements.forEach(req => {
        // Check if inventory item already exists
        const existingItem = this.data.inventory.find(inv =>
          inv.platform === req.platform && inv.debugger === req.debugger
        );

        if (!existingItem) {
          newInventoryItems.push({
            id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            platform: req.platform,
            debugger: req.debugger,
            availableQuantity: Math.max(1, Math.ceil(req.sessionCount / 2)), // Default quantity
            inUse: 0,
            totalStock: Math.max(1, Math.ceil(req.sessionCount / 2)),
            status: 'available',
            createdAt: new Date().toISOString(),
            autoCreated: true
          });
        }
      });

      if (newInventoryItems.length > 0) {
        // Add new items to inventory
        this.data.inventory.push(...newInventoryItems);

        // Save to backend (if API is available)
        try {
          await fetch('/api/hardware/inventory/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: newInventoryItems })
          });
        } catch (apiError) {
          console.warn('Could not save to backend:', apiError.message);
        }

        this.renderInventory();
        this.showNotification(`Created ${newInventoryItems.length} new inventory items`, 'success');
      } else {
        this.showNotification('All required hardware combinations already exist in inventory', 'info');
      }

    } catch (error) {
      console.error('Error auto-creating inventory:', error);
      this.showNotification('Failed to auto-create inventory items', 'error');
    }
  }
    });

    document.getElementById('cancelEditInventory')?.addEventListener('click', () => {
      this.hideModal('editInventoryModal');
    });

    document.getElementById('cancelEditAvailability')?.addEventListener('click', () => {
      this.hideModal('editAvailabilityModal');
    });

    // Save buttons
    document.getElementById('saveAddCombination')?.addEventListener('click', () => {
      this.saveNewCombination();
    });

    document.getElementById('saveEditInventory')?.addEventListener('click', () => {
      this.saveInventoryChanges();
    });

    document.getElementById('saveEditAvailability')?.addEventListener('click', () => {
      this.saveAvailabilityChanges();
    });

    // Analysis buttons
    document.getElementById('inventoryAnalysisBtn')?.addEventListener('click', () => {
      this.showInventoryAnalysis();
    });

    document.getElementById('exportInventoryBtn')?.addEventListener('click', () => {
      this.exportInventoryData();
    });

    // Bulk operations
    document.getElementById('bulkAvailabilityBtn')?.addEventListener('click', () => {
      this.showBulkAvailabilityEditor();
    });

    document.getElementById('availabilityTemplateBtn')?.addEventListener('click', () => {
      this.showAvailabilityTemplates();
    });

    // Close modals on backdrop click
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-backdrop')) {
        this.hideModal(e.target.id);
      }
    });
  }

  async loadData() {
    try {
      this.showLoading();

      // Load all hardware data
      const [combinationsRes, platformsRes, debuggersRes, inventoryRes, availabilityRes] = await Promise.all([
        fetch('/api/hardware/combinations'),
        fetch('/api/hardware/platforms'),
        fetch('/api/hardware/debuggers'),
        fetch('/api/hardware/inventory'),
        fetch('/api/hardware/availability')
      ]);

      this.data.combinations = (await combinationsRes.json()).data || [];
      this.data.platforms = (await platformsRes.json()).data || [];
      this.data.debuggers = (await debuggersRes.json()).data || [];
      this.data.inventory = (await inventoryRes.json()).data || [];
      this.data.availability = (await availabilityRes.json()).data || [];

      this.renderAll();
      this.hideLoading();

    } catch (error) {
      console.error('Error loading hardware data:', error);
      this.showNotification('Failed to load hardware data', 'error');
      this.hideLoading();
    }
  }

  renderAll() {
    this.renderCombinations();
    this.renderInventory();
    this.renderAvailability();
    this.renderStatistics();
  }

  renderCombinations() {
    const container = document.getElementById('combinationsGrid');
    if (!container) return;

    if (this.data.combinations.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔗</div>
          <div class="empty-state-message">No hardware combinations found</div>
          <div class="empty-state-description">Create your first hardware combination to get started</div>
        </div>
      `;
      return;
    }

    container.innerHTML = this.data.combinations.map(combo => this.renderCombinationCard(combo)).join('');
  }

  renderCombinationCard(combo) {
    const platform = combo.platform || { name: 'Unknown Platform' };
    const debugger = combo.debugger || { name: 'Unknown Debugger' };
    const inventory = combo.inventory || { totalQuantity: 0, availableQuantity: 0 };
    
    const utilizationRate = inventory.totalQuantity > 0 
      ? ((inventory.totalQuantity - inventory.availableQuantity) / inventory.totalQuantity * 100).toFixed(1)
      : '0.0';

    return `
      <div class="combination-card ${combo.combination.enabled ? '' : 'disabled'}">
        <div class="combination-header">
          <h3 class="combination-name">${combo.combination.name}</h3>
          <span class="combination-status ${combo.combination.enabled ? 'enabled' : 'disabled'}">
            ${combo.combination.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        
        <div class="combination-details">
          <div class="combination-detail">
            <span class="label">Platform:</span>
            <span class="value">${platform.name}</span>
          </div>
          <div class="combination-detail">
            <span class="label">Debugger:</span>
            <span class="value">${debugger.name}</span>
          </div>
          <div class="combination-detail">
            <span class="label">Total Quantity:</span>
            <span class="value">${inventory.totalQuantity}</span>
          </div>
          <div class="combination-detail">
            <span class="label">Available:</span>
            <span class="value">${inventory.availableQuantity}</span>
          </div>
          <div class="combination-detail">
            <span class="label">Utilization:</span>
            <span class="value">${utilizationRate}%</span>
          </div>
          <div class="combination-detail">
            <span class="label">Priority:</span>
            <span class="value">${combo.combination.priority}</span>
          </div>
        </div>
        
        <div class="combination-actions">
          <button class="btn btn-small btn-primary" onclick="window.comprehensiveHardwareManager.editCombination('${combo.combination.id}')">
            ✏️ Edit
          </button>
          <button class="btn btn-small btn-info" onclick="window.comprehensiveHardwareManager.editInventory('${inventory.id}')">
            📦 Inventory
          </button>
          <button class="btn btn-small btn-success" onclick="window.comprehensiveHardwareManager.editAvailability('${combo.combination.id}')">
            ⏰ Schedule
          </button>
          <button class="btn btn-small ${combo.combination.enabled ? 'btn-warning' : 'btn-success'}" 
                  onclick="window.comprehensiveHardwareManager.toggleCombination('${combo.combination.id}', ${!combo.combination.enabled})">
            ${combo.combination.enabled ? '⏸️ Disable' : '▶️ Enable'}
          </button>
        </div>
      </div>
    `;
  }

  renderInventory() {
    const container = document.getElementById('inventoryTableContainer');
    if (!container) return;

    if (this.data.combinations.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <div class="empty-state-message">No inventory data found</div>
          <div class="empty-state-description">Hardware combinations will appear here once created</div>
        </div>
      `;
      return;
    }

    const tableHTML = `
      <table class="inventory-table">
        <thead>
          <tr>
            <th>Combination</th>
            <th>Platform</th>
            <th>Debugger</th>
            <th>Total Qty</th>
            <th>Available</th>
            <th>Allocated</th>
            <th>Utilization</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${this.data.combinations.map(combo => this.renderInventoryRow(combo)).join('')}
        </tbody>
      </table>
    `;

    container.innerHTML = tableHTML;
  }

  renderInventoryRow(combo) {
    const platform = combo.platform || { name: 'Unknown' };
    const debugger = combo.debugger || { name: 'Unknown' };
    const inventory = combo.inventory || { 
      totalQuantity: 0, 
      availableQuantity: 0, 
      allocatedQuantity: 0,
      status: 'active'
    };
    
    const utilizationRate = inventory.totalQuantity > 0 
      ? (inventory.allocatedQuantity / inventory.totalQuantity * 100)
      : 0;
    
    const utilizationClass = utilizationRate > 80 ? 'low' : utilizationRate > 50 ? 'medium' : 'high';

    return `
      <tr>
        <td>${combo.combination.name}</td>
        <td>${platform.name}</td>
        <td>${debugger.name}</td>
        <td>${inventory.totalQuantity}</td>
        <td>${inventory.availableQuantity}</td>
        <td>${inventory.allocatedQuantity}</td>
        <td>
          <div class="quantity-indicator">
            <div class="quantity-bar">
              <div class="quantity-fill ${utilizationClass}" style="width: ${utilizationRate}%"></div>
            </div>
            <span>${utilizationRate.toFixed(1)}%</span>
          </div>
        </td>
        <td>
          <span class="status-badge status-${inventory.status}">${inventory.status}</span>
        </td>
        <td>
          <button class="btn btn-small btn-primary" onclick="window.comprehensiveHardwareManager.editInventory('${inventory.id}')">
            Edit
          </button>
        </td>
      </tr>
    `;
  }

  renderAvailability() {
    const container = document.getElementById('availabilityGrid');
    if (!container) return;

    if (this.data.combinations.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⏰</div>
          <div class="empty-state-message">No availability schedules found</div>
          <div class="empty-state-description">Hardware combinations will appear here once created</div>
        </div>
      `;
      return;
    }

    container.innerHTML = this.data.combinations.map(combo => this.renderAvailabilityCard(combo)).join('');
  }

  renderAvailabilityCard(combo) {
    const availability = combo.availability || [];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return `
      <div class="availability-combination">
        <div class="availability-combination-header">
          <span class="availability-combination-name">${combo.combination.name}</span>
          <button class="btn btn-small btn-primary" onclick="window.comprehensiveHardwareManager.editAvailability('${combo.combination.id}')">
            Edit Schedule
          </button>
        </div>
        <div class="availability-schedule">
          ${days.map((day, dayIndex) => this.renderAvailabilityDay(dayIndex, day, availability)).join('')}
        </div>
      </div>
    `;
  }

  renderAvailabilityDay(dayIndex, dayName, availability) {
    const dayAvailability = availability.filter(avail => avail.dayOfWeek === dayIndex);
    
    return `
      <div class="availability-week">
        <div class="availability-day">${dayName}</div>
        <div class="availability-hours">
          ${Array.from({ length: 24 }, (_, hour) => {
            const isAvailable = dayAvailability.some(avail => 
              avail.enabled && hour >= avail.startHour && hour < avail.endHour
            );
            return `<div class="availability-hour ${isAvailable ? 'available' : 'unavailable'}" 
                         title="${hour}:00 - ${hour + 1}:00"></div>`;
          }).join('')}
        </div>
      </div>
    `;
  }

  renderStatistics() {
    const container = document.getElementById('statsGrid');
    if (!container) return;

    const stats = this.calculateStatistics();

    container.innerHTML = `
      <div class="stat-card info">
        <div class="stat-value">${stats.totalCombinations}</div>
        <div class="stat-label">Total Combinations</div>
      </div>
      <div class="stat-card success">
        <div class="stat-value">${stats.enabledCombinations}</div>
        <div class="stat-label">Enabled Combinations</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-value">${stats.totalInventory}</div>
        <div class="stat-label">Total Hardware Units</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.averageUtilization}%</div>
        <div class="stat-label">Average Utilization</div>
      </div>
    `;
  }

  calculateStatistics() {
    const totalCombinations = this.data.combinations.length;
    const enabledCombinations = this.data.combinations.filter(c => c.combination.enabled).length;
    const totalInventory = this.data.combinations.reduce((sum, c) => sum + (c.inventory?.totalQuantity || 0), 0);
    
    const totalUtilization = this.data.combinations.reduce((sum, c) => {
      const inventory = c.inventory || { totalQuantity: 0, allocatedQuantity: 0 };
      return sum + (inventory.totalQuantity > 0 ? (inventory.allocatedQuantity / inventory.totalQuantity * 100) : 0);
    }, 0);
    
    const averageUtilization = totalCombinations > 0 ? (totalUtilization / totalCombinations).toFixed(1) : '0.0';

    return {
      totalCombinations,
      enabledCombinations,
      totalInventory,
      averageUtilization
    };
  }

  // Modal Management
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('show');
      // Show emergency close button
      const emergencyBtn = document.getElementById('emergencyCloseBtn');
      if (emergencyBtn) {
        emergencyBtn.classList.add('show');
      }
    }
  }

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';

      // Hide emergency close button if no modals are visible
      const visibleModals = document.querySelectorAll('.modal-backdrop.show');
      if (visibleModals.length === 0) {
        const emergencyBtn = document.getElementById('emergencyCloseBtn');
        if (emergencyBtn) {
          emergencyBtn.classList.remove('show');
        }
      }
    }
  }

  // Combination Management
  async showAddCombinationModal() {
    // Populate platform and debugger dropdowns
    const platformSelect = document.getElementById('platformSelect');
    const debuggerSelect = document.getElementById('debuggerSelect');

    if (platformSelect) {
      platformSelect.innerHTML = '<option value="">Select Platform...</option>' +
        this.data.platforms.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    }

    if (debuggerSelect) {
      debuggerSelect.innerHTML = '<option value="">Select Debugger...</option>' +
        this.data.debuggers.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    }

    this.showModal('addCombinationModal');
  }

  async saveNewCombination() {
    try {
      const form = document.getElementById('addCombinationForm');
      const formData = new FormData(form);

      const combinationData = {
        name: formData.get('name'),
        platformId: formData.get('platformId'),
        debuggerId: formData.get('debuggerId'),
        priority: formData.get('priority'),
        description: formData.get('description'),
        enabled: formData.has('enabled')
      };

      const response = await fetch('/api/hardware/combinations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(combinationData)
      });

      const result = await response.json();

      if (result.success) {
        this.showNotification('Hardware combination created successfully', 'success');
        this.hideModal('addCombinationModal');
        this.loadData(); // Reload data
      } else {
        throw new Error(result.error || 'Failed to create combination');
      }

    } catch (error) {
      console.error('Error creating combination:', error);
      this.showNotification(error.message || 'Failed to create combination', 'error');
    }
  }

  async toggleCombination(combinationId, enabled) {
    try {
      const response = await fetch(`/api/hardware/combinations/${combinationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled })
      });

      const result = await response.json();

      if (result.success) {
        this.showNotification(`Combination ${enabled ? 'enabled' : 'disabled'} successfully`, 'success');
        this.loadData(); // Reload data
      } else {
        throw new Error(result.error || 'Failed to update combination');
      }

    } catch (error) {
      console.error('Error updating combination:', error);
      this.showNotification(error.message || 'Failed to update combination', 'error');
    }
  }

  // Utility Methods
  showLoading() {
    // Show loading indicators
    const containers = ['combinationsGrid', 'inventoryTableContainer', 'availabilityGrid', 'statsGrid'];
    containers.forEach(containerId => {
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = '<div class="loading">Loading...</div>';
      }
    });
  }

  hideLoading() {
    // Loading will be hidden when content is rendered
  }

  showNotification(message, type = 'info') {
    // Create notification (reuse from timeline manager)
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

    notification.addEventListener('click', () => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    });

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
  }

  // Placeholder methods for future implementation
  editCombination(combinationId) {
    this.showNotification('Edit combination feature coming soon', 'info');
  }

  editInventory(inventoryId) {
    this.showNotification('Edit inventory feature coming soon', 'info');
  }

  editAvailability(combinationId) {
    this.showNotification('Edit availability feature coming soon', 'info');
  }

  showInventoryAnalysis() {
    this.showNotification('Inventory analysis feature coming soon', 'info');
  }

  exportInventoryData() {
    this.showNotification('Export inventory feature coming soon', 'info');
  }

  showBulkAvailabilityEditor() {
    this.showNotification('Bulk availability editor coming soon', 'info');
  }

  showAvailabilityTemplates() {
    this.showNotification('Availability templates feature coming soon', 'info');
  }

  saveInventoryChanges() {
    this.showNotification('Save inventory changes feature coming soon', 'info');
  }

  saveAvailabilityChanges() {
    this.showNotification('Save availability changes feature coming soon', 'info');
  }
}
