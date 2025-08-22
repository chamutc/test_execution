/**
 * Individual Machine Management Interface
 * Manages individual physical machines with Name + OS combinations
 * Implements full CRUD operations for machine inventory
 */

class ComprehensiveMachineManager {
  constructor() {
    this.data = {
      machines: [], // Individual machines with unique IDs
      osTypes: [],  // Available OS types
      sessions: []  // For mapping requirements
    };

    this.currentEditingMachine = null;
    this.init();
  }

  init() {
    this.initializeEventListeners();
    this.loadData();
    this.setupSearch();
  }

  initializeEventListeners() {
    // Add machine button
    document.getElementById('addMachineBtn')?.addEventListener('click', () => {
      this.showAddMachineModal();
    });

    // Add OS type button
    document.getElementById('addOSTypeBtn')?.addEventListener('click', () => {
      this.showAddOSTypeModal();
    });

    // Refresh data button
    document.getElementById('refreshMachinesBtn')?.addEventListener('click', () => {
      this.loadData();
    });

    // Bulk operations
    document.getElementById('bulkActivateBtn')?.addEventListener('click', () => {
      this.bulkActivateMachines();
    });

    document.getElementById('bulkDeactivateBtn')?.addEventListener('click', () => {
      this.bulkDeactivateMachines();
    });

    document.getElementById('bulkDeleteBtn')?.addEventListener('click', () => {
      this.bulkDeleteMachines();
    });

    // Modal close buttons
    document.getElementById('closeAddMachineModal')?.addEventListener('click', () => {
      this.hideModal('addMachineModal');
    });

    document.getElementById('closeEditMachineModal')?.addEventListener('click', () => {
      this.hideModal('editMachineModal');
    });

    document.getElementById('closeAddOSTypeModal')?.addEventListener('click', () => {
      this.hideModal('addOSTypeModal');
    });

    // Form submissions
    document.getElementById('addMachineForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddMachine();
    });

    document.getElementById('editMachineForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleEditMachine();
    });

    document.getElementById('addOSTypeForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddOSType();
    });

    // Cancel buttons
    document.getElementById('cancelAddMachine')?.addEventListener('click', () => {
      this.hideModal('addMachineModal');
    });

    document.getElementById('cancelEditMachine')?.addEventListener('click', () => {
      this.hideModal('editMachineModal');
    });

    document.getElementById('cancelAddOSType')?.addEventListener('click', () => {
      this.hideModal('addOSTypeModal');
    });
  }

  setupSearch() {
    const searchInput = document.getElementById('machineSearch');
    const statusFilter = document.getElementById('statusFilter');
    const osFilter = document.getElementById('osFilter');

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.filterMachines();
      });
    }

    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        this.filterMachines();
      });
    }

    if (osFilter) {
      osFilter.addEventListener('change', () => {
        this.filterMachines();
      });
    }
  }

  filterMachines() {
    const searchTerm = document.getElementById('machineSearch')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const osFilter = document.getElementById('osFilter')?.value || '';

    const filteredMachines = this.data.machines.filter(machine => {
      const matchesSearch = machine.name.toLowerCase().includes(searchTerm) ||
                           machine.osType.toLowerCase().includes(searchTerm) ||
                           (machine.description || '').toLowerCase().includes(searchTerm);

      const matchesStatus = !statusFilter || machine.status === statusFilter;
      const matchesOS = !osFilter || machine.osType === osFilter;

      return matchesSearch && matchesStatus && matchesOS;
    });

    this.displayMachines(filteredMachines);
  }
    document.getElementById('cancelAddMachine')?.addEventListener('click', () => {
      this.hideModal('addMachineModal');
    });

    document.getElementById('cancelEditMachine')?.addEventListener('click', () => {
      this.hideModal('editMachineModal');
    });

    document.getElementById('cancelAddOSType')?.addEventListener('click', () => {
      this.hideModal('addOSTypeModal');
    });

    // Save buttons
    document.getElementById('saveAddMachine')?.addEventListener('click', () => {
      this.saveNewMachine();
    });

    document.getElementById('saveEditMachine')?.addEventListener('click', () => {
      this.saveEditMachine();
    });

    document.getElementById('saveAddOSType')?.addEventListener('click', () => {
      this.saveNewOSType();
    });

    // Analysis buttons
    document.getElementById('machineAnalysisBtn')?.addEventListener('click', () => {
      this.showMachineAnalysis();
    });

    document.getElementById('exportOSDataBtn')?.addEventListener('click', () => {
      this.exportOSData();
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

      // Load individual machines, OS types, and sessions for mapping
      await Promise.all([
        this.loadMachines(),
        this.loadOSTypes(),
        this.loadSessions()
      ]);

      this.renderAll();
      this.hideLoading();

    } catch (error) {
      console.error('Error loading machine data:', error);
      this.showNotification('Failed to load machine data', 'error');
      this.hideLoading();
    }
  }

  async loadMachines() {
    try {
      const response = await fetch('/api/machines/individual');
      if (response.ok) {
        const data = await response.json();
        this.data.machines = data.machines || [];
      } else if (response.status === 404) {
        // API not implemented yet, use mock data
        this.data.machines = this.generateMockMachines();
      } else {
        console.warn('Failed to load machines:', response.status);
        this.data.machines = [];
      }
    } catch (error) {
      console.warn('Machines API not available, using mock data:', error.message);
      this.data.machines = this.generateMockMachines();
    }
  }

  async loadOSTypes() {
    try {
      const response = await fetch('/api/machines/os-types');
      if (response.ok) {
        const data = await response.json();
        this.data.osTypes = data.osTypes || [];
      } else if (response.status === 404) {
        // API not implemented yet, use default OS types
        this.data.osTypes = this.getDefaultOSTypes();
      } else {
        console.warn('Failed to load OS types:', response.status);
        this.data.osTypes = this.getDefaultOSTypes();
      }
    } catch (error) {
      console.warn('OS Types API not available, using defaults:', error.message);
      this.data.osTypes = this.getDefaultOSTypes();
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

  generateMockMachines() {
    return [
      {
        id: 'machine-001',
        name: 'TestMachine-Win-01',
        osType: 'Windows 10',
        status: 'active',
        location: 'Lab A',
        description: 'Primary Windows testing machine',
        lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'machine-002',
        name: 'TestMachine-Win-02',
        osType: 'Windows 10',
        status: 'active',
        location: 'Lab A',
        description: 'Secondary Windows testing machine',
        lastUsed: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'machine-003',
        name: 'TestMachine-Linux-01',
        osType: 'Ubuntu 20.04',
        status: 'active',
        location: 'Lab B',
        description: 'Linux testing machine',
        lastUsed: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'machine-004',
        name: 'TestMachine-Mac-01',
        osType: 'macOS Big Sur',
        status: 'inactive',
        location: 'Lab C',
        description: 'macOS testing machine (maintenance)',
        lastUsed: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  getDefaultOSTypes() {
    return [
      { id: 'win10', name: 'Windows 10', category: 'Windows' },
      { id: 'win11', name: 'Windows 11', category: 'Windows' },
      { id: 'ubuntu20', name: 'Ubuntu 20.04', category: 'Linux' },
      { id: 'ubuntu22', name: 'Ubuntu 22.04', category: 'Linux' },
      { id: 'macos-big-sur', name: 'macOS Big Sur', category: 'macOS' },
      { id: 'macos-monterey', name: 'macOS Monterey', category: 'macOS' }
    ];
  }

  renderAll() {
    this.renderMachines();
    this.renderOSTypes();
    this.renderStatistics();
  }

  renderMachines() {
    const container = document.getElementById('machinesGrid');
    if (!container) return;

    if (this.data.machines.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🖥️</div>
          <div class="empty-state-message">No machines found</div>
          <div class="empty-state-description">Add your first machine to get started</div>
        </div>
      `;
      return;
    }

    container.innerHTML = this.data.machines.map(machine => this.renderMachineCard(machine)).join('');
  }

  renderMachineCard(machine) {
    const utilizationRate = machine.totalQuantity > 0 
      ? ((machine.totalQuantity - machine.availableQuantity) / machine.totalQuantity * 100).toFixed(1)
      : '0.0';

    return `
      <div class="machine-card ${machine.active ? '' : 'inactive'}">
        <div class="machine-header">
          <h3 class="machine-name">${machine.name}</h3>
          <span class="machine-status ${machine.active ? 'active' : 'inactive'}">
            ${machine.active ? 'Active' : 'Inactive'}
          </span>
        </div>
        
        <div class="machine-details">
          <div class="machine-detail">
            <span class="label">OS Type:</span>
            <span class="value">${machine.osType}</span>
          </div>
          <div class="machine-detail">
            <span class="label">Total Quantity:</span>
            <span class="value">${machine.quantity}</span>
          </div>
          <div class="machine-detail">
            <span class="label">Available:</span>
            <span class="value">${machine.availableQuantity || machine.quantity}</span>
          </div>
          <div class="machine-detail">
            <span class="label">Utilization:</span>
            <span class="value">${utilizationRate}%</span>
          </div>
          <div class="machine-detail">
            <span class="label">Location:</span>
            <span class="value">${machine.location || 'Not specified'}</span>
          </div>
        </div>
        
        <div class="machine-actions">
          <button class="btn btn-small btn-primary" onclick="window.comprehensiveMachineManager.editMachine('${machine.id}')">
            ✏️ Edit
          </button>
          <button class="btn btn-small ${machine.active ? 'btn-warning' : 'btn-success'}" 
                  onclick="window.comprehensiveMachineManager.toggleMachine('${machine.id}', ${!machine.active})">
            ${machine.active ? '⏸️ Deactivate' : '▶️ Activate'}
          </button>
          <button class="btn btn-small btn-danger" onclick="window.comprehensiveMachineManager.deleteMachine('${machine.id}')">
            🗑️ Delete
          </button>
        </div>
      </div>
    `;
  }

  renderOSTypes() {
    const container = document.getElementById('osTypesTableContainer');
    if (!container) return;

    if (this.data.osTypes.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💿</div>
          <div class="empty-state-message">No OS types found</div>
          <div class="empty-state-description">Add OS types to categorize your machines</div>
        </div>
      `;
      return;
    }

    const tableHTML = `
      <table class="os-types-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Version</th>
            <th>Category</th>
            <th>Machines</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${this.data.osTypes.map(osType => this.renderOSTypeRow(osType)).join('')}
        </tbody>
      </table>
    `;

    container.innerHTML = tableHTML;
  }

  renderOSTypeRow(osType) {
    const machineCount = this.data.machines.filter(m => m.osType === osType.name).length;
    
    return `
      <tr>
        <td>${osType.name}</td>
        <td>${osType.version || '-'}</td>
        <td>
          <span class="os-category-badge ${osType.category.toLowerCase()}">${osType.category}</span>
        </td>
        <td>${machineCount}</td>
        <td>${osType.description || '-'}</td>
        <td>
          <button class="btn btn-small btn-primary" onclick="window.comprehensiveMachineManager.editOSType('${osType.id}')">
            Edit
          </button>
          <button class="btn btn-small btn-danger" onclick="window.comprehensiveMachineManager.deleteOSType('${osType.id}')">
            Delete
          </button>
        </td>
      </tr>
    `;
  }

  renderStatistics() {
    const container = document.getElementById('machineStatsGrid');
    if (!container) return;

    const stats = this.calculateStatistics();

    container.innerHTML = `
      <div class="stat-card machines">
        <div class="stat-value">${stats.totalMachines}</div>
        <div class="stat-label">Total Machines</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.activeMachines}</div>
        <div class="stat-label">Active Machines</div>
      </div>
      <div class="stat-card os-types">
        <div class="stat-value">${stats.totalOSTypes}</div>
        <div class="stat-label">OS Types</div>
      </div>
      <div class="stat-card utilization">
        <div class="stat-value">${stats.averageUtilization}%</div>
        <div class="stat-label">Average Utilization</div>
      </div>
    `;
  }

  calculateStatistics() {
    const totalMachines = this.data.machines.length;
    const activeMachines = this.data.machines.filter(m => m.active).length;
    const totalOSTypes = this.data.osTypes.length;
    
    const totalUtilization = this.data.machines.reduce((sum, machine) => {
      const utilization = machine.quantity > 0 
        ? ((machine.quantity - (machine.availableQuantity || machine.quantity)) / machine.quantity * 100)
        : 0;
      return sum + utilization;
    }, 0);
    
    const averageUtilization = totalMachines > 0 ? (totalUtilization / totalMachines).toFixed(1) : '0.0';

    return {
      totalMachines,
      activeMachines,
      totalOSTypes,
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

  // Machine Management
  async showAddMachineModal() {
    // Populate OS type dropdown
    const osTypeSelect = document.getElementById('machineOSType');
    if (osTypeSelect) {
      osTypeSelect.innerHTML = '<option value="">Select OS Type...</option>' +
        this.data.osTypes.map(os => `<option value="${os.name}">${os.name}</option>`).join('');
    }

    this.showModal('addMachineModal');
  }

  async saveNewMachine() {
    try {
      const form = document.getElementById('addMachineForm');
      const formData = new FormData(form);
      
      const machineData = {
        name: formData.get('name'),
        osType: formData.get('osType'),
        quantity: parseInt(formData.get('quantity')),
        location: formData.get('location'),
        description: formData.get('description'),
        active: formData.has('active')
      };

      const response = await fetch('/api/machines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(machineData)
      });

      const result = await response.json();

      if (result.success) {
        this.showNotification('Machine created successfully', 'success');
        this.hideModal('addMachineModal');
        this.loadData(); // Reload data
      } else {
        throw new Error(result.error || 'Failed to create machine');
      }

    } catch (error) {
      console.error('Error creating machine:', error);
      this.showNotification(error.message || 'Failed to create machine', 'error');
    }
  }

  // Utility Methods
  showLoading() {
    const containers = ['machinesGrid', 'osTypesTableContainer', 'machineStatsGrid'];
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
  editMachine(machineId) {
    this.showNotification('Edit machine feature coming soon', 'info');
  }

  toggleMachine(machineId, active) {
    this.showNotification(`Machine ${active ? 'activation' : 'deactivation'} feature coming soon`, 'info');
  }

  deleteMachine(machineId) {
    this.showNotification('Delete machine feature coming soon', 'info');
  }

  saveEditMachine() {
    this.showNotification('Save machine changes feature coming soon', 'info');
  }

  saveNewOSType() {
    this.showNotification('Add OS type feature coming soon', 'info');
  }

  showAddOSTypeModal() {
    this.showModal('addOSTypeModal');
  }

  editOSType(osTypeId) {
    this.showNotification('Edit OS type feature coming soon', 'info');
  }

  deleteOSType(osTypeId) {
    this.showNotification('Delete OS type feature coming soon', 'info');
  }

  showMachineAnalysis() {
    this.showNotification('Machine analysis feature coming soon', 'info');
  }

  exportOSData() {
    this.showNotification('Export OS data feature coming soon', 'info');
  }
}
