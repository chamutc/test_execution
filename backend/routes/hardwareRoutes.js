const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get all hardware
router.get('/', (req, res) => {
  try {
    const hardware = req.dataService.getHardware();
    res.json({ success: true, hardware });
  } catch (error) {
    console.error('Error getting hardware:', error);
    res.status(500).json({ success: false, error: 'Failed to get hardware' });
  }
});

// Add new hardware item
router.post('/', (req, res) => {
  try {
    const { type, name, quantity, source = 'manual' } = req.body;

    if (!type || !name || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Type, name, and quantity are required'
      });
    }

    if (!['debugger', 'platform'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Type must be either "debugger" or "platform"'
      });
    }

    const hardware = req.dataService.getHardware();
    const targetArray = type === 'debugger' ? hardware.debuggers : hardware.platforms;

    // Check if hardware item already exists
    const existingItem = targetArray.find(item => item.name === name);
    if (existingItem) {
      return res.status(400).json({
        success: false,
        error: `${type} with name "${name}" already exists`
      });
    }

    const newItem = {
      id: uuidv4(),
      name,
      quantity: parseInt(quantity),
      available: parseInt(quantity),
      source,
      createdAt: new Date().toISOString()
    };

    targetArray.push(newItem);
    req.dataService.saveHardware(hardware);

    // Emit update to connected clients
    req.socketService.emitHardwareUpdate(hardware);

    res.json({
      success: true,
      message: `${type} added successfully`,
      hardware: newItem
    });

  } catch (error) {
    console.error('Error adding hardware:', error);
    res.status(500).json({ success: false, error: 'Failed to add hardware' });
  }
});

// Update hardware item
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, quantity } = req.body;

    if (!name || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Name and quantity are required'
      });
    }

    const hardware = req.dataService.getHardware();
    let itemFound = false;
    let itemType = '';

    // Search in debuggers
    const debuggerIndex = hardware.debuggers.findIndex(item => item.id === id);
    if (debuggerIndex !== -1) {
      const item = hardware.debuggers[debuggerIndex];
      const usedQuantity = item.quantity - item.available;

      if (parseInt(quantity) < usedQuantity) {
        return res.status(400).json({
          success: false,
          error: `Cannot reduce quantity below ${usedQuantity} (currently in use)`
        });
      }

      hardware.debuggers[debuggerIndex] = {
        ...item,
        name,
        quantity: parseInt(quantity),
        available: parseInt(quantity) - usedQuantity,
        updatedAt: new Date().toISOString()
      };
      itemFound = true;
      itemType = 'debugger';
    }

    // Search in platforms if not found in debuggers
    if (!itemFound) {
      const platformIndex = hardware.platforms.findIndex(item => item.id === id);
      if (platformIndex !== -1) {
        const item = hardware.platforms[platformIndex];
        const usedQuantity = item.quantity - item.available;

        if (parseInt(quantity) < usedQuantity) {
          return res.status(400).json({
            success: false,
            error: `Cannot reduce quantity below ${usedQuantity} (currently in use)`
          });
        }

        hardware.platforms[platformIndex] = {
          ...item,
          name,
          quantity: parseInt(quantity),
          available: parseInt(quantity) - usedQuantity,
          updatedAt: new Date().toISOString()
        };
        itemFound = true;
        itemType = 'platform';
      }
    }

    if (!itemFound) {
      return res.status(404).json({
        success: false,
        error: 'Hardware item not found'
      });
    }

    req.dataService.saveHardware(hardware);

    // Emit update to connected clients
    req.socketService.emitHardwareUpdate(hardware);

    res.json({
      success: true,
      message: `${itemType} updated successfully`,
      hardware
    });

  } catch (error) {
    console.error('Error updating hardware:', error);
    res.status(500).json({ success: false, error: 'Failed to update hardware' });
  }
});

// Delete hardware item
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const hardware = req.dataService.getHardware();
    let itemFound = false;
    let itemType = '';

    // Check if item is in use
    const debuggerIndex = hardware.debuggers.findIndex(item => item.id === id);
    if (debuggerIndex !== -1) {
      const item = hardware.debuggers[debuggerIndex];
      if (item.available < item.quantity) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete hardware that is currently in use'
        });
      }
      hardware.debuggers.splice(debuggerIndex, 1);
      itemFound = true;
      itemType = 'debugger';
    }

    if (!itemFound) {
      const platformIndex = hardware.platforms.findIndex(item => item.id === id);
      if (platformIndex !== -1) {
        const item = hardware.platforms[platformIndex];
        if (item.available < item.quantity) {
          return res.status(400).json({
            success: false,
            error: 'Cannot delete hardware that is currently in use'
          });
        }
        hardware.platforms.splice(platformIndex, 1);
        itemFound = true;
        itemType = 'platform';
      }
    }

    if (!itemFound) {
      return res.status(404).json({
        success: false,
        error: 'Hardware item not found'
      });
    }

    req.dataService.saveHardware(hardware);

    // Emit update to connected clients
    req.socketService.emitHardwareUpdate(hardware);

    res.json({
      success: true,
      message: `${itemType} deleted successfully`,
      hardware
    });

  } catch (error) {
    console.error('Error deleting hardware:', error);
    res.status(500).json({ success: false, error: 'Failed to delete hardware' });
  }
});

// Get hardware usage statistics
router.get('/usage', (req, res) => {
  try {
    const hardware = req.dataService.getHardware();

    const usage = {
      debuggers: hardware.debuggers.map(item => ({
        id: item.id,
        name: item.name,
        total: item.quantity,
        available: item.available,
        used: item.quantity - item.available,
        utilizationRate: ((item.quantity - item.available) / item.quantity * 100).toFixed(1)
      })),
      platforms: hardware.platforms.map(item => ({
        id: item.id,
        name: item.name,
        total: item.quantity,
        available: item.available,
        used: item.quantity - item.available,
        utilizationRate: ((item.quantity - item.available) / item.quantity * 100).toFixed(1)
      }))
    };

    res.json({ success: true, usage });

  } catch (error) {
    console.error('Error getting hardware usage:', error);
    res.status(500).json({ success: false, error: 'Failed to get hardware usage' });
  }
});

// NEW COMPREHENSIVE HARDWARE MANAGEMENT ROUTES

// Hardware Combinations Routes
router.get('/combinations', (req, res) => {
  try {
    const combinations = req.dataService.getHardwareCombinations();
    const sessions = req.dataService.getSessions();
    const hardware = req.dataService.getHardware();

    const data = combinations.map(c => {
      const platform = (hardware.platforms || []).find(p => p.id === c.platformId) || { name: 'Unknown' };
      const debuggerItem = (hardware.debuggers || []).find(d => d.id === c.debuggerId) || { name: 'Unknown' };
      const supported = (Array.isArray(c.platformsSupported) && c.platformsSupported.length > 0) ? c.platformsSupported : [platform.name];
      const comboMode = c.mode || 'NA';

      // Compute allocated time from scheduled sessions that match this combination
      const allocatedTime = sessions
        .filter(s => s.status === 'scheduled')
        .filter(s => {
          // platform match: session.platform within supported
          if (s.platform && !supported.includes(s.platform)) return false;
          // debugger match: if session has debugger, must match; if not, skip (combination not used)
          if (s.debugger && s.debugger !== debuggerItem.name) return false;
          if (!s.debugger) return false;
          // mode match: if session.mode is 'NA' or missing, match all; else must equal combo mode or combo mode is 'NA'
          const sessionMode = s.mode || 'NA';
          if (sessionMode === 'NA' || comboMode === 'NA') return true;
          return sessionMode === comboMode;
        })
        .reduce((sum, s) => {
          if (s.schedule && typeof s.schedule.startHour !== 'undefined' && typeof s.schedule.endHour !== 'undefined') {
            return sum + Math.max(0, (parseFloat(s.schedule.endHour) - parseFloat(s.schedule.startHour)));
          }
          if (typeof s.estimatedTime === 'number') return sum + Math.max(0, s.estimatedTime);
          return sum;
        }, 0);

      const totalAvailableHours = typeof c.totalAvailableHours === 'number' ? c.totalAvailableHours : 24;
      const remainingTime = Math.max(0, totalAvailableHours - allocatedTime);

      return {
        ...c,
        platformName: platform.name,
        debuggerName: debuggerItem.name,
        platformsSupported: supported,
        allocatedTime,
        remainingTime,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching hardware combinations:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch hardware combinations' });
  }
});

router.post('/combinations', (req, res) => {
  try {
    const { name, platformId, debuggerId, mode, platformsSupported, totalAvailableHours, hourlyAvailability, enabled, priority, description } = req.body;

    if (!name || !platformId || !debuggerId) {
      return res.status(400).json({ success: false, error: 'name, platformId and debuggerId are required' });
    }

    const hardware = req.dataService.getHardware();
    const platform = (hardware.platforms || []).find(p => p.id === platformId);
    const debuggerItem = (hardware.debuggers || []).find(d => d.id === debuggerId);
    if (!platform || !debuggerItem) {
      return res.status(400).json({ success: false, error: 'Invalid platformId or debuggerId' });
    }

    const combination = req.dataService.createHardwareCombination({
      name,
      platformId,
      debuggerId,
      mode,
      platformsSupported,
      totalAvailableHours,
      hourlyAvailability,
      enabled,
      priority,
      description
    });

    try { req.socketService?.emitCombinationsUpdate(req.dataService.getHardwareCombinations()); } catch (e) {}

    res.json({ success: true, data: combination });
  } catch (error) {
    console.error('Error creating hardware combination:', error);
    res.status(500).json({ success: false, error: 'Failed to create hardware combination' });
  }
});

// Clone combination
router.post('/combinations/:id/clone', (req, res) => {
  try {
    const { id } = req.params;
    const combo = req.dataService.getHardwareCombination(id);
    if (!combo) return res.status(404).json({ success: false, error: 'Hardware combination not found' });
    const copy = req.dataService.createHardwareCombination({
      ...combo,
      id: undefined,
      name: `${combo.name} (Copy)`
    });
    try { req.socketService?.emitCombinationsUpdate(req.dataService.getHardwareCombinations()); } catch (e) {}
    res.json({ success: true, data: copy });
  } catch (error) {
    console.error('Error cloning hardware combination:', error);
    res.status(500).json({ success: false, error: 'Failed to clone hardware combination' });
  }
});

// Update hourly availability for a combination
router.put('/combinations/:id/availability', (req, res) => {
  try {
    const { id } = req.params;
    const { hourlyAvailability } = req.body;
    if (!hourlyAvailability || typeof hourlyAvailability !== 'object') {
      return res.status(400).json({ success: false, error: 'hourlyAvailability object is required' });
    }

    const combo = req.dataService.getHardwareCombination(id);
    if (!combo) return res.status(404).json({ success: false, error: 'Hardware combination not found' });

    const updated = req.dataService.updateHardwareCombination(id, { hourlyAvailability });
    try { req.socketService?.emitCombinationsUpdate(req.dataService.getHardwareCombinations()); } catch (e) {}
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating combination availability:', error);
    res.status(500).json({ success: false, error: 'Failed to update combination availability' });
  }
});

router.put('/combinations/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Normalize fields
    if (updates.platformsSupported) {
      updates.platformsSupported = Array.from(new Set(updates.platformsSupported)).filter(Boolean);
    }
    if (typeof updates.totalAvailableHours !== 'undefined') {
      const n = parseInt(updates.totalAvailableHours, 10);
      if (isNaN(n) || n < 0) return res.status(400).json({ success: false, error: 'totalAvailableHours must be non-negative number' });
      updates.totalAvailableHours = n;
    }

    const combination = req.dataService.updateHardwareCombination(id, updates);

    if (!combination) {
      return res.status(404).json({ success: false, error: 'Hardware combination not found' });
    }

    res.json({ success: true, data: combination });
  } catch (error) {
    console.error('Error updating hardware combination:', error);
    res.status(500).json({ success: false, error: 'Failed to update hardware combination' });
  }
});

router.delete('/combinations/:id', (req, res) => {
  try {
    const { id } = req.params;
    const success = req.dataService.deleteHardwareCombination(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Hardware combination not found'
      });
    }

    res.json({
      success: true,
      message: 'Hardware combination deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting hardware combination:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete hardware combination'
    });
  }
});

// Hardware Requirements (unique combinations from sessions)
router.get('/requirements', (req, res) => {
  try {
    const sessions = req.dataService.getSessions();
    const combos = new Map();

    sessions.forEach(s => {
      const board = s.platform || null;
      const dbg = s.debugger || null;
      const mode = s.mode || 'NA';
      if (!board && !dbg && !mode) return;
      const key = `${dbg || ''}|${board || ''}|${mode}`;
      if (!combos.has(key)) {
        combos.set(key, { debugger: dbg, board, mode, count: 0 });
      }
      combos.get(key).count += 1;
    });

    res.json({ success: true, data: Array.from(combos.values()) });
  } catch (error) {
    console.error('Error computing hardware requirements:', error);
    res.status(500).json({ success: false, error: 'Failed to compute requirements' });
  }
});

// Hardware Inventory Routes (component-level: boards/platforms and debuggers)
router.get('/inventory', (req, res) => {
  try {
    const hardware = req.dataService.getHardware();
    const items = [];

    (hardware.platforms || []).forEach(p => {
      items.push({
        id: p.id,
        type: 'board',
        name: p.name,
        quantity: typeof p.quantity === 'number' ? p.quantity : (p.quantityInStock || 0),
        available: typeof p.available === 'number' ? p.available : (p.quantityInStock || 0),
      });
    });

    (hardware.debuggers || []).forEach(d => {
      items.push({
        id: d.id,
        type: 'debugger',
        name: d.name,
        quantity: typeof d.quantity === 'number' ? d.quantity : (d.quantityInStock || 0),
        available: typeof d.available === 'number' ? d.available : (d.quantityInStock || 0),
      });
    });

    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching hardware inventory:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch hardware inventory' });
  }
});

// Create inventory item (component-level)
router.post('/inventory', (req, res) => {
  try {
    const { type, name, quantity } = req.body;
    if (!['board', 'debugger'].includes(type)) {
      return res.status(400).json({ success: false, error: 'type must be "board" or "debugger"' });
    }
    if (!name || typeof quantity === 'undefined') {
      return res.status(400).json({ success: false, error: 'name and quantity are required' });
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 0) {
      return res.status(400).json({ success: false, error: 'quantity must be a non-negative number' });
    }

    const hardware = req.dataService.getHardware();
    const target = type === 'board' ? (hardware.platforms || (hardware.platforms = [])) : (hardware.debuggers || (hardware.debuggers = []));

    // Prevent duplicates by name
    const exists = target.find(it => it.name === name);
    if (exists) {
      return res.status(400).json({ success: false, error: `${type} with name "${name}" already exists` });
    }

    const { v4: uuidv4 } = require('uuid');
    const item = { id: uuidv4(), name, quantity: qty, available: qty, source: 'manual', createdAt: new Date().toISOString() };
    target.push(item);
    req.dataService.saveHardware(hardware);

    // Emit update
    try { req.socketService?.emitHardwareUpdate(req.dataService.getHardware()); } catch (e) {}

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    res.status(500).json({ success: false, error: 'Failed to create inventory item' });
  }
});

// Update inventory item
router.put('/inventory/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const hardware = req.dataService.getHardware();
    const allArrays = [hardware.platforms || [], hardware.debuggers || []];
    let found = null, arr = null, idx = -1;

    for (const a of allArrays) {
      const i = a.findIndex(it => it.id === id);
      if (i !== -1) { found = { ...a[i] }; arr = a; idx = i; break; }
    }
    if (!found) {
      return res.status(404).json({ success: false, error: 'Inventory item not found' });
    }

    // Apply updates with validation
    if (typeof updates.name === 'string') found.name = updates.name;
    if (typeof updates.quantity !== 'undefined') {
      const q = parseInt(updates.quantity, 10);
      if (isNaN(q) || q < 0) return res.status(400).json({ success: false, error: 'quantity must be non-negative' });
      // Clamp available to new quantity
      const currentAvailable = typeof found.available === 'number' ? found.available : 0;
      found.quantity = q;
      found.available = Math.min(currentAvailable, q);
    }
    if (typeof updates.available !== 'undefined') {
      const a = parseInt(updates.available, 10);
      if (isNaN(a) || a < 0) return res.status(400).json({ success: false, error: 'available must be non-negative' });
      if (typeof found.quantity === 'number' && a > found.quantity) return res.status(400).json({ success: false, error: 'available cannot exceed quantity' });
      found.available = a;
    }

    arr[idx] = found;
    req.dataService.saveHardware(hardware);

    res.json({ success: true, data: found });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({ success: false, error: 'Failed to update inventory item' });
  }
});

// Delete inventory item
router.delete('/inventory/:id', (req, res) => {
  try {
    const { id } = req.params;
    const hardware = req.dataService.getHardware();

    const arrays = [hardware.platforms || [], hardware.debuggers || []];
    for (const a of arrays) {
      const i = a.findIndex(it => it.id === id);
      if (i !== -1) {
        const item = a[i];
        if (typeof item.available === 'number' && typeof item.quantity === 'number' && item.available < item.quantity) {
          return res.status(400).json({ success: false, error: 'Cannot delete hardware that is currently in use' });
        }
        a.splice(i, 1);
        req.dataService.saveHardware(hardware);
        return res.json({ success: true, message: 'Inventory item deleted' });
      }
    }
    return res.status(404).json({ success: false, error: 'Inventory item not found' });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({ success: false, error: 'Failed to delete inventory item' });
  }
});

router.put('/inventory/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const inventory = req.dataService.updateHardwareInventory(id, updates);

    if (!inventory) {
      return res.status(404).json({
        success: false,
        error: 'Hardware inventory item not found'
      });
    }

    res.json({
      success: true,
      data: inventory
    });
  } catch (error) {
    console.error('Error updating hardware inventory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update hardware inventory'
    });
  }
});

// Hardware Availability Routes
router.get('/availability', (req, res) => {
  try {
    const availability = req.dataService.getHardwareAvailability();
    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Error fetching hardware availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hardware availability'
    });
  }
});

router.get('/availability/:combinationId', (req, res) => {
  try {
    const { combinationId } = req.params;
    const availability = req.dataService.getHardwareAvailability()
      .filter(avail => avail.hardwareCombinationId === combinationId);

    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Error fetching hardware availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hardware availability'
    });
  }
});

router.post('/availability', (req, res) => {
  try {
    const availabilityData = req.body;
    const availability = req.dataService.createHardwareAvailability(availabilityData);

    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Error creating hardware availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create hardware availability'
    });
  }
});

router.put('/availability/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const availability = req.dataService.updateHardwareAvailability(id, updates);

    if (!availability) {
      return res.status(404).json({
        success: false,
        error: 'Hardware availability item not found'
      });
    }

    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Error updating hardware availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update hardware availability'
    });
  }
});

router.delete('/availability/:id', (req, res) => {
  try {
    const { id } = req.params;
    const success = req.dataService.deleteHardwareAvailability(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Hardware availability item not found'
      });
    }

    res.json({
      success: true,
      message: 'Hardware availability deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting hardware availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete hardware availability'
    });
  }
});

// Platforms Routes
router.get('/platforms', (req, res) => {
  try {
    const platforms = req.dataService.getPlatforms();
    res.json({
      success: true,
      data: platforms
    });
  } catch (error) {
    console.error('Error fetching platforms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch platforms'
    });
  }
});

router.post('/platforms', (req, res) => {
  try {
    const platformData = req.body;
    const platform = req.dataService.createPlatform(platformData);

    res.json({
      success: true,
      data: platform
    });
  } catch (error) {
    console.error('Error creating platform:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create platform'
    });
  }
});

router.put('/platforms/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const platform = req.dataService.updatePlatform(id, updates);

    if (!platform) {
      return res.status(404).json({
        success: false,
        error: 'Platform not found'
      });
    }

    res.json({
      success: true,
      data: platform
    });
  } catch (error) {
    console.error('Error updating platform:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update platform'
    });
  }
});

// Debuggers Routes
router.get('/debuggers', (req, res) => {
  try {
    const debuggers = req.dataService.getDebuggers();
    res.json({
      success: true,
      data: debuggers
    });
  } catch (error) {
    console.error('Error fetching debuggers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch debuggers'
    });
  }
});

router.post('/debuggers', (req, res) => {
  try {
    const debuggerData = req.body;
    const debuggerItem = req.dataService.createDebugger(debuggerData);

    res.json({
      success: true,
      data: debuggerItem
    });
  } catch (error) {
    console.error('Error creating debugger:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create debugger'
    });
  }
});

router.put('/debuggers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const debuggerItem = req.dataService.updateDebugger(id, updates);

    if (!debuggerItem) {
      return res.status(404).json({
        success: false,
        error: 'Debugger not found'
      });
    }

    res.json({
      success: true,
      data: debuggerItem
    });
  } catch (error) {
    console.error('Error updating debugger:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update debugger'
    });
  }
});

// Get available combinations for a specific time slot
router.get('/combinations/available/:timeSlotId', (req, res) => {
  try {
    const { timeSlotId } = req.params;
    const timeSlot = req.dataService.getTimeSlot(timeSlotId);

    if (!timeSlot) {
      return res.status(404).json({
        success: false,
        error: 'Time slot not found'
      });
    }

    const availableCombinations = req.dataService.getAvailableHardwareCombinations(timeSlot);

    res.json({
      success: true,
      data: availableCombinations
    });
  } catch (error) {
    console.error('Error fetching available combinations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available combinations'
    });
  }
});

module.exports = router;
