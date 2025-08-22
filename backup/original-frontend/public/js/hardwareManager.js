// Hardware Manager Class
class HardwareManager {
  constructor(app) {
    this.app = app;
    this.currentEditingItem = null;
    this.init();
  }

  init() {
    this.initializeEventListeners();
    this.initializeModals();
  }

  initializeEventListeners() {
    // Add hardware button
    const addHardwareBtn = document.getElementById('addHardwareBtn');
    if (addHardwareBtn) {
      addHardwareBtn.addEventListener('click', () => {
        this.showAddHardwareModal();
      });
    }

    // Refresh hardware button
    const refreshHardwareBtn = document.getElementById('refreshHardwareBtn');
    if (refreshHardwareBtn) {
      refreshHardwareBtn.addEventListener('click', () => {
        this.refreshHardwareFromCSV();
      });
    }
  }

  initializeModals() {
    // Hardware modal
    const hardwareModal = document.getElementById('hardwareModal');
    const hardwareForm = document.getElementById('hardwareForm');
    const hardwareModalClose = document.getElementById('hardwareModalClose');
    const hardwareCancelBtn = document.getElementById('hardwareCancelBtn');

    if (hardwareModalClose) {
      hardwareModalClose.addEventListener('click', () => {
        this.hideHardwareModal();
      });
    }

    if (hardwareCancelBtn) {
      hardwareCancelBtn.addEventListener('click', () => {
        this.hideHardwareModal();
      });
    }

    if (hardwareForm) {
      hardwareForm.addEventListener('submit', (event) => {
        event.preventDefault();
        this.handleHardwareFormSubmit();
      });
    }

    // Close modal when clicking outside
    if (hardwareModal) {
      hardwareModal.addEventListener('click', (event) => {
        if (event.target === hardwareModal) {
          this.hideHardwareModal();
        }
      });
    }
  }

  showAddHardwareModal() {
    this.currentEditingItem = null;
    this.resetHardwareForm();
    
    const modalTitle = document.getElementById('hardwareModalTitle');
    if (modalTitle) {
      modalTitle.textContent = 'Add Hardware';
    }

    const modal = document.getElementById('hardwareModal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  showEditHardwareModal(itemId, type) {
    const hardware = this.app.data.hardware;
    const items = type === 'debugger' ? hardware.debuggers : hardware.platforms;
    const item = items.find(h => h.id === itemId);

    if (!item) {
      this.app.showNotification('Hardware item not found', 'error');
      return;
    }

    this.currentEditingItem = { ...item, type };
    this.populateHardwareForm(item, type);

    const modalTitle = document.getElementById('hardwareModalTitle');
    if (modalTitle) {
      modalTitle.textContent = 'Edit Hardware';
    }

    const modal = document.getElementById('hardwareModal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  hideHardwareModal() {
    const modal = document.getElementById('hardwareModal');
    if (modal) {
      modal.style.display = 'none';
    }
    this.currentEditingItem = null;
  }

  resetHardwareForm() {
    const form = document.getElementById('hardwareForm');
    if (form) {
      form.reset();
    }

    const typeSelect = document.getElementById('hardwareType');
    if (typeSelect) {
      typeSelect.value = 'debugger';
    }

    const quantityInput = document.getElementById('hardwareQuantity');
    if (quantityInput) {
      quantityInput.value = '1';
    }
  }

  populateHardwareForm(item, type) {
    const typeSelect = document.getElementById('hardwareType');
    const nameInput = document.getElementById('hardwareName');
    const quantityInput = document.getElementById('hardwareQuantity');

    if (typeSelect) typeSelect.value = type;
    if (nameInput) nameInput.value = item.name;
    if (quantityInput) quantityInput.value = item.quantity;
  }

  async handleHardwareFormSubmit() {
    try {
      const formData = this.getHardwareFormData();
      
      if (!this.validateHardwareForm(formData)) {
        return;
      }

      if (this.currentEditingItem) {
        await this.updateHardware(this.currentEditingItem.id, formData);
      } else {
        await this.addHardware(formData);
      }

      this.hideHardwareModal();

    } catch (error) {
      console.error('Error handling hardware form:', error);
      this.app.showNotification('Failed to save hardware', 'error');
    }
  }

  getHardwareFormData() {
    const typeSelect = document.getElementById('hardwareType');
    const nameInput = document.getElementById('hardwareName');
    const quantityInput = document.getElementById('hardwareQuantity');

    return {
      type: typeSelect?.value || 'debugger',
      name: nameInput?.value?.trim() || '',
      quantity: parseInt(quantityInput?.value) || 1
    };
  }

  validateHardwareForm(formData) {
    if (!formData.name) {
      this.app.showNotification('Hardware name is required', 'error');
      return false;
    }

    if (formData.quantity < 1) {
      this.app.showNotification('Quantity must be at least 1', 'error');
      return false;
    }

    // Check for duplicate names (excluding current item when editing)
    const hardware = this.app.data.hardware;
    const items = formData.type === 'debugger' ? hardware.debuggers : hardware.platforms;
    
    const duplicate = items.find(item => 
      item.name.toLowerCase() === formData.name.toLowerCase() &&
      (!this.currentEditingItem || item.id !== this.currentEditingItem.id)
    );

    if (duplicate) {
      this.app.showNotification(`${formData.type} with name "${formData.name}" already exists`, 'error');
      return false;
    }

    return true;
  }

  async addHardware(formData) {
    try {
      const response = await fetch('/api/hardware', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        this.app.showNotification(`${formData.type} added successfully`, 'success');
        // Hardware will be updated via socket
      } else {
        throw new Error(result.error || 'Failed to add hardware');
      }

    } catch (error) {
      console.error('Add hardware error:', error);
      this.app.showNotification(error.message || 'Failed to add hardware', 'error');
    }
  }

  async updateHardware(itemId, formData) {
    try {
      const response = await fetch(`/api/hardware/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        this.app.showNotification(`${formData.type} updated successfully`, 'success');
        // Hardware will be updated via socket
      } else {
        throw new Error(result.error || 'Failed to update hardware');
      }

    } catch (error) {
      console.error('Update hardware error:', error);
      this.app.showNotification(error.message || 'Failed to update hardware', 'error');
    }
  }

  async deleteHardware(itemId, type) {
    try {
      const hardware = this.app.data.hardware;
      const items = type === 'debugger' ? hardware.debuggers : hardware.platforms;
      const item = items.find(h => h.id === itemId);

      if (!item) {
        this.app.showNotification('Hardware item not found', 'error');
        return;
      }

      const confirmMessage = `Are you sure you want to delete ${type} "${item.name}"?`;
      if (!confirm(confirmMessage)) {
        return;
      }

      const response = await fetch(`/api/hardware/${itemId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        this.app.showNotification(`${type} deleted successfully`, 'success');
        // Hardware will be updated via socket
      } else {
        throw new Error(result.error || 'Failed to delete hardware');
      }

    } catch (error) {
      console.error('Delete hardware error:', error);
      this.app.showNotification(error.message || 'Failed to delete hardware', 'error');
    }
  }

  async refreshHardwareFromCSV() {
    try {
      // This would trigger a re-extraction of hardware from the current CSV data
      this.app.showNotification('Refreshing hardware from CSV data...', 'info');
      
      // For now, just reload the hardware data
      const response = await fetch('/api/hardware');
      if (response.ok) {
        const data = await response.json();
        this.app.data.hardware = data.hardware || { debuggers: [], platforms: [] };
        this.app.refreshHardwareDisplay();
        this.app.showNotification('Hardware refreshed successfully', 'success');
      } else {
        throw new Error('Failed to refresh hardware');
      }

    } catch (error) {
      console.error('Refresh hardware error:', error);
      this.app.showNotification('Failed to refresh hardware', 'error');
    }
  }

  async getHardwareUsage() {
    try {
      const response = await fetch('/api/hardware/usage');
      if (response.ok) {
        const data = await response.json();
        return data.usage;
      } else {
        throw new Error('Failed to get hardware usage');
      }
    } catch (error) {
      console.error('Get hardware usage error:', error);
      return null;
    }
  }

  updateHardwareLists() {
    const debuggersList = document.getElementById('debuggersList');
    const platformsList = document.getElementById('platformsList');

    if (debuggersList) {
      debuggersList.innerHTML = this.app.data.hardware.debuggers
        .map(item => this.createHardwareItemHTML(item, 'debugger')).join('');
    }

    if (platformsList) {
      platformsList.innerHTML = this.app.data.hardware.platforms
        .map(item => this.createHardwareItemHTML(item, 'platform')).join('');
    }
  }

  createHardwareItemHTML(item, type) {
    const utilizationRate = item.quantity > 0 
      ? (((item.quantity - item.available) / item.quantity) * 100).toFixed(1)
      : '0.0';

    const statusClass = item.available === 0 ? 'hardware-unavailable' : 
                       item.available < item.quantity ? 'hardware-partial' : 'hardware-available';

    return `
      <div class="hardware-item ${statusClass}">
        <div class="hardware-item-info">
          <div class="hardware-item-name">${item.name}</div>
          <div class="hardware-item-details">
            Total: ${item.quantity} | Available: ${item.available} | Used: ${item.quantity - item.available}
            <br>
            Utilization: ${utilizationRate}% | Source: ${item.source || 'manual'}
          </div>
        </div>
        <div class="hardware-item-actions">
          <button class="btn btn-small btn-secondary" onclick="hardwareManager.showEditHardwareModal('${item.id}', '${type}')">
            Edit
          </button>
          <button class="btn btn-small btn-danger" onclick="hardwareManager.deleteHardware('${item.id}', '${type}')">
            Delete
          </button>
        </div>
      </div>
    `;
  }

  getHardwareStatistics() {
    const hardware = this.app.data.hardware;
    
    const debuggerStats = this.calculateCategoryStats(hardware.debuggers);
    const platformStats = this.calculateCategoryStats(hardware.platforms);

    return {
      debuggers: debuggerStats,
      platforms: platformStats,
      total: {
        items: debuggerStats.items + platformStats.items,
        quantity: debuggerStats.quantity + platformStats.quantity,
        available: debuggerStats.available + platformStats.available,
        used: debuggerStats.used + platformStats.used
      }
    };
  }

  calculateCategoryStats(items) {
    return items.reduce((stats, item) => {
      stats.items++;
      stats.quantity += item.quantity;
      stats.available += item.available;
      stats.used += (item.quantity - item.available);
      return stats;
    }, { items: 0, quantity: 0, available: 0, used: 0 });
  }

  exportHardwareInventory() {
    const hardware = this.app.data.hardware;
    const allItems = [
      ...hardware.debuggers.map(item => ({ ...item, type: 'Debugger' })),
      ...hardware.platforms.map(item => ({ ...item, type: 'Platform' }))
    ];

    if (allItems.length === 0) {
      this.app.showNotification('No hardware to export', 'warning');
      return;
    }

    const headers = ['Type', 'Name', 'Total Quantity', 'Available', 'Used', 'Utilization %', 'Source', 'Created At'];
    const rows = allItems.map(item => [
      item.type,
      item.name,
      item.quantity,
      item.available,
      item.quantity - item.available,
      item.quantity > 0 ? (((item.quantity - item.available) / item.quantity) * 100).toFixed(1) : '0.0',
      item.source || 'manual',
      new Date(item.createdAt).toLocaleDateString()
    ]);

    const csvContent = [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `hardware_inventory_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    this.app.showNotification('Hardware inventory exported successfully', 'success');
  }
}

// Initialize hardware manager when app is ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (window.app) {
      window.hardwareManager = new HardwareManager(window.app);
      
      // Override app's hardware display method
      window.app.updateHardwareLists = () => {
        window.hardwareManager.updateHardwareLists();
      };
    }
  }, 100);
});
