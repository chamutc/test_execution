// Machine Manager Class
class MachineManager {
  constructor(app) {
    this.app = app;
    this.currentEditingMachineType = null;
    this.init();
  }

  init() {
    this.initializeEventListeners();
    this.initializeModals();
  }

  initializeEventListeners() {
    // Add machine type button
    const addMachineTypeBtn = document.getElementById('addMachineTypeBtn');
    if (addMachineTypeBtn) {
      addMachineTypeBtn.addEventListener('click', () => {
        this.showAddMachineTypeModal();
      });
    }

    // Regenerate machines button
    const regenerateMachinesBtn = document.getElementById('regenerateMachinesBtn');
    if (regenerateMachinesBtn) {
      regenerateMachinesBtn.addEventListener('click', () => {
        this.regenerateMachines();
      });
    }
  }

  initializeModals() {
    // Machine type modal
    const machineTypeModal = document.getElementById('machineTypeModal');
    const machineTypeForm = document.getElementById('machineTypeForm');
    const machineTypeModalClose = document.getElementById('machineTypeModalClose');
    const machineTypeCancelBtn = document.getElementById('machineTypeCancelBtn');

    if (machineTypeModalClose) {
      machineTypeModalClose.addEventListener('click', () => {
        this.hideMachineTypeModal();
      });
    }

    if (machineTypeCancelBtn) {
      machineTypeCancelBtn.addEventListener('click', () => {
        this.hideMachineTypeModal();
      });
    }

    if (machineTypeForm) {
      machineTypeForm.addEventListener('submit', (event) => {
        event.preventDefault();
        this.handleMachineTypeFormSubmit();
      });
    }

    // Close modal when clicking outside
    if (machineTypeModal) {
      machineTypeModal.addEventListener('click', (event) => {
        if (event.target === machineTypeModal) {
          this.hideMachineTypeModal();
        }
      });
    }
  }

  showAddMachineTypeModal() {
    this.currentEditingMachineType = null;
    this.resetMachineTypeForm();
    
    const modalTitle = document.getElementById('machineTypeModalTitle');
    if (modalTitle) {
      modalTitle.textContent = 'Add Machine Type';
    }

    const modal = document.getElementById('machineTypeModal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  showEditMachineTypeModal(machineTypeId) {
    const machineType = this.app.data.machineTypes.find(mt => mt.id === machineTypeId);
    
    if (!machineType) {
      this.app.showNotification('Machine type not found', 'error');
      return;
    }

    this.currentEditingMachineType = { ...machineType };
    this.populateMachineTypeForm(machineType);

    const modalTitle = document.getElementById('machineTypeModalTitle');
    if (modalTitle) {
      modalTitle.textContent = 'Edit Machine Type';
    }

    const modal = document.getElementById('machineTypeModal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  hideMachineTypeModal() {
    const modal = document.getElementById('machineTypeModal');
    if (modal) {
      modal.style.display = 'none';
    }
    this.currentEditingMachineType = null;
  }

  resetMachineTypeForm() {
    const form = document.getElementById('machineTypeForm');
    if (form) {
      form.reset();
    }

    const quantityInput = document.getElementById('machineTypeQuantity');
    if (quantityInput) {
      quantityInput.value = '1';
    }
  }

  populateMachineTypeForm(machineType) {
    const nameInput = document.getElementById('machineTypeName');
    const quantityInput = document.getElementById('machineTypeQuantity');

    if (nameInput) nameInput.value = machineType.osType;
    if (quantityInput) quantityInput.value = machineType.quantity;
  }

  async handleMachineTypeFormSubmit() {
    try {
      const formData = this.getMachineTypeFormData();
      
      if (!this.validateMachineTypeForm(formData)) {
        return;
      }

      if (this.currentEditingMachineType) {
        await this.updateMachineType(this.currentEditingMachineType.id, formData);
      } else {
        await this.addMachineType(formData);
      }

      this.hideMachineTypeModal();

    } catch (error) {
      console.error('Error handling machine type form:', error);
      this.app.showNotification('Failed to save machine type', 'error');
    }
  }

  getMachineTypeFormData() {
    const nameInput = document.getElementById('machineTypeName');
    const quantityInput = document.getElementById('machineTypeQuantity');

    return {
      osType: nameInput?.value?.trim() || '',
      quantity: parseInt(quantityInput?.value) || 1
    };
  }

  validateMachineTypeForm(formData) {
    if (!formData.osType) {
      this.app.showNotification('OS type is required', 'error');
      return false;
    }

    if (formData.quantity < 1) {
      this.app.showNotification('Quantity must be at least 1', 'error');
      return false;
    }

    // Check for duplicate OS types (excluding current item when editing)
    const duplicate = this.app.data.machineTypes.find(mt => 
      mt.osType.toLowerCase() === formData.osType.toLowerCase() &&
      (!this.currentEditingMachineType || mt.id !== this.currentEditingMachineType.id)
    );

    if (duplicate) {
      this.app.showNotification(`Machine type "${formData.osType}" already exists`, 'error');
      return false;
    }

    return true;
  }

  async addMachineType(formData) {
    try {
      const response = await fetch('/api/machines/types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        this.app.showNotification('Machine type added successfully. Timeline will be updated automatically.', 'success');
        // Data will be updated via socket
      } else {
        throw new Error(result.error || 'Failed to add machine type');
      }

    } catch (error) {
      console.error('Add machine type error:', error);
      this.app.showNotification(error.message || 'Failed to add machine type', 'error');
    }
  }

  async updateMachineType(machineTypeId, formData) {
    try {
      const response = await fetch(`/api/machines/types/${machineTypeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        this.app.showNotification('Machine type updated successfully. Timeline will be updated automatically.', 'success');
        // Data will be updated via socket
      } else {
        throw new Error(result.error || 'Failed to update machine type');
      }

    } catch (error) {
      console.error('Update machine type error:', error);
      this.app.showNotification(error.message || 'Failed to update machine type', 'error');
    }
  }

  async deleteMachineType(machineTypeId) {
    try {
      const machineType = this.app.data.machineTypes.find(mt => mt.id === machineTypeId);
      
      if (!machineType) {
        this.app.showNotification('Machine type not found', 'error');
        return;
      }

      const confirmMessage = `Are you sure you want to delete machine type "${machineType.osType}"? This will also delete all associated machines.`;
      if (!confirm(confirmMessage)) {
        return;
      }

      const response = await fetch(`/api/machines/types/${machineTypeId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        this.app.showNotification('Machine type deleted successfully', 'success');
        // Data will be updated via socket
      } else {
        throw new Error(result.error || 'Failed to delete machine type');
      }

    } catch (error) {
      console.error('Delete machine type error:', error);
      this.app.showNotification(error.message || 'Failed to delete machine type', 'error');
    }
  }

  async regenerateMachines() {
    try {
      const confirmMessage = 'Are you sure you want to regenerate all machines? This will reset machine assignments.';
      if (!confirm(confirmMessage)) {
        return;
      }

      const response = await fetch('/api/machines/regenerate', {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        this.app.showNotification('Machines regenerated successfully', 'success');
        // Data will be updated via socket
      } else {
        throw new Error(result.error || 'Failed to regenerate machines');
      }

    } catch (error) {
      console.error('Regenerate machines error:', error);
      this.app.showNotification(error.message || 'Failed to regenerate machines', 'error');
    }
  }

  updateMachineSummary() {
    const summaryContainer = document.getElementById('machineSummary');
    if (!summaryContainer) return;

    const summary = this.calculateMachineSummary();
    
    summaryContainer.innerHTML = `
      <h3>Machine Summary</h3>
      <div class="machine-summary-stats">
        <div class="summary-stat">
          <span class="stat-label">Total Machines:</span>
          <span class="stat-value">${summary.totalMachines}</span>
        </div>
        <div class="summary-stat">
          <span class="stat-label">Available:</span>
          <span class="stat-value">${summary.availableMachines}</span>
        </div>
        <div class="summary-stat">
          <span class="stat-label">Busy:</span>
          <span class="stat-value">${summary.busyMachines}</span>
        </div>
        <div class="summary-stat">
          <span class="stat-label">Utilization:</span>
          <span class="stat-value">${summary.utilizationRate}%</span>
        </div>
      </div>
      <div class="machine-types-breakdown">
        ${Object.keys(summary.byType).map(osType => `
          <div class="machine-type-summary">
            <strong>${osType}:</strong>
            ${summary.byType[osType].available}/${summary.byType[osType].total} available
            (${summary.byType[osType].utilizationRate}% utilization)
          </div>
        `).join('')}
      </div>
    `;
  }

  updateMachineTypesList() {
    const container = document.getElementById('machineTypesList');
    if (!container) return;

    container.innerHTML = this.app.data.machineTypes
      .map(machineType => this.createMachineTypeItemHTML(machineType)).join('');

    // Add event listeners for machine type changes
    this.addMachineTypeEventListeners();
  }

  addMachineTypeEventListeners() {
    // Listen for any changes in machine type inputs
    const machineTypeInputs = document.querySelectorAll('input[data-machine-type]');
    machineTypeInputs.forEach(input => {
      input.addEventListener('change', () => {
        console.log('Machine type input changed, notifying timeline...');
        // Notify timeline manager about machine configuration change
        if (window.timelineManager) {
          setTimeout(() => {
            window.timelineManager.refreshAllData();
          }, 500);
        }
      });
    });
  }

  updateMachinesList() {
    const container = document.getElementById('machinesList');
    if (!container) return;

    const machines = this.app.data.machines;

    if (!machines || machines.length === 0) {
      container.innerHTML = `
        <div class="no-machines-message">
          <p>No machines available. Add machine types to generate machines automatically.</p>
        </div>
      `;
      return;
    }

    // Group machines by OS type for better organization
    const machinesByType = machines.reduce((groups, machine) => {
      const type = machine.osType;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(machine);
      return groups;
    }, {});

    let html = '';
    Object.keys(machinesByType).forEach(osType => {
      html += `<div class="machine-type-group">
        <h4 class="machine-type-header">${osType}</h4>
        ${machinesByType[osType].map(machine => this.createMachineItemHTML(machine)).join('')}
      </div>`;
    });

    container.innerHTML = html;
  }

  createMachineTypeItemHTML(machineType) {
    const machines = this.app.data.machines.filter(m => m.osType === machineType.osType);
    const availableMachines = machines.filter(m => m.status === 'available').length;
    const busyMachines = machines.filter(m => m.status === 'busy').length;

    return `
      <div class="machine-type-item">
        <div class="machine-type-info">
          <div class="machine-type-name">${machineType.osType}</div>
          <div class="machine-type-details">
            Configured: ${machineType.quantity} |
            Actual: ${machines.length} |
            Available: ${availableMachines} |
            Busy: ${busyMachines}
          </div>
        </div>
        <div class="machine-type-actions">
          <button class="btn btn-small btn-secondary" onclick="machineManager.showEditMachineTypeModal('${machineType.id}')">
            Edit
          </button>
          <button class="btn btn-small btn-danger" onclick="machineManager.deleteMachineType('${machineType.id}')">
            Delete
          </button>
        </div>
      </div>
    `;
  }

  createMachineItemHTML(machine) {
    const statusClass = `machine-status-${machine.status}`;
    const itemClass = machine.status;

    let sessionInfo = '';
    if (machine.currentSession) {
      const session = this.app.data.sessions.find(s => s.id === machine.currentSession);
      sessionInfo = session ? `Running: ${session.name}` : 'Running session';
    }

    return `
      <div class="machine-item ${itemClass}">
        <div class="machine-item-info">
          <div class="machine-item-name">${machine.name}</div>
          <div class="machine-item-details">
            OS: ${machine.osType} |
            Created: ${new Date(machine.createdAt).toLocaleDateString()}
            ${sessionInfo ? `<br>${sessionInfo}` : ''}
          </div>
        </div>
        <div class="machine-item-status">
          <span class="machine-status-badge ${statusClass}">${machine.status}</span>
        </div>
      </div>
    `;
  }

  calculateMachineSummary() {
    const machines = this.app.data.machines;
    const machineTypes = this.app.data.machineTypes;

    const totalMachines = machines.length;
    const availableMachines = machines.filter(m => m.status === 'available').length;
    const busyMachines = machines.filter(m => m.status === 'busy').length;
    const utilizationRate = totalMachines > 0 
      ? ((busyMachines / totalMachines) * 100).toFixed(1)
      : '0.0';

    const byType = {};
    machineTypes.forEach(type => {
      const typeMachines = machines.filter(m => m.osType === type.osType);
      const typeAvailable = typeMachines.filter(m => m.status === 'available').length;
      const typeBusy = typeMachines.filter(m => m.status === 'busy').length;
      
      byType[type.osType] = {
        total: typeMachines.length,
        available: typeAvailable,
        busy: typeBusy,
        utilizationRate: typeMachines.length > 0 
          ? ((typeBusy / typeMachines.length) * 100).toFixed(1)
          : '0.0'
      };
    });

    return {
      totalMachines,
      availableMachines,
      busyMachines,
      utilizationRate,
      byType
    };
  }

  async getMachineUsageReport() {
    try {
      const response = await fetch('/api/machines/summary');
      if (response.ok) {
        const data = await response.json();
        return data.summary;
      } else {
        throw new Error('Failed to get machine usage report');
      }
    } catch (error) {
      console.error('Get machine usage report error:', error);
      return null;
    }
  }
}

// Initialize machine manager when app is ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (window.app) {
      window.machineManager = new MachineManager(window.app);
      
      // Override app's machine display methods
      window.app.updateMachineSummary = () => {
        window.machineManager.updateMachineSummary();
      };

      window.app.updateMachineTypesList = () => {
        window.machineManager.updateMachineTypesList();
      };

      window.app.updateMachinesList = () => {
        window.machineManager.updateMachinesList();
      };
    }
  }, 100);
});
