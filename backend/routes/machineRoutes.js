const express = require('express');
const DataService = require('../services/dataService');
const MachineService = require('../services/machineService');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const dataService = new DataService();

// Get all machines
router.get('/', (req, res) => {
  try {
    console.log('GET /api/machines called from:', req.get('Origin') || 'unknown origin');
    const machines = dataService.getMachines();
    console.log(`Returning ${machines.length} machines`);
    res.json({ success: true, machines });
  } catch (error) {
    console.error('Error getting machines:', error);
    res.status(500).json({ success: false, error: 'Failed to get machines' });
  }
});

// Test endpoint (must be before /:id route)
router.get('/test-api', (req, res) => {
  console.log('🔥 MACHINES TEST ENDPOINT CALLED! 🔥');
  res.json({ success: true, message: 'Machines API is working!', timestamp: new Date().toISOString() });
});

// Get machine by ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const machines = dataService.getMachines();
    const machine = machines.find(m => m.id === id);

    if (!machine) {
      return res.status(404).json({
        success: false,
        error: 'Machine not found'
      });
    }

    res.json({ success: true, machine });
  } catch (error) {
    console.error('Error getting machine:', error);
    res.status(500).json({ success: false, error: 'Failed to get machine' });
  }
});

// Create new machine
router.post('/', (req, res) => {
  try {
    console.log('Creating machine with data:', req.body);
    const { name, osType, status = 'available', capabilities = {} } = req.body;

    if (!name || !osType) {
      return res.status(400).json({
        success: false,
        error: 'Machine name and OS type are required'
      });
    }

    // Validate status
    const validStatuses = ['available', 'busy', 'maintenance', 'offline'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const machines = dataService.getMachines();

    // Check if machine name already exists
    const existingMachine = machines.find(m => m.name === name);
    if (existingMachine) {
      return res.status(400).json({
        success: false,
        error: `Machine with name "${name}" already exists`
      });
    }

    const newMachine = {
      id: uuidv4(),
      name,
      osType,
      status,
      currentSession: null,
      capabilities: {
        maxConcurrentSessions: capabilities.maxConcurrentSessions || 1,
        supportedPlatforms: capabilities.supportedPlatforms || [],
        supportedDebuggers: capabilities.supportedDebuggers || [],
        features: capabilities.features || []
      },
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    machines.push(newMachine);
    dataService.saveMachines(machines);

    // Emit updates to connected clients
    if (req.socketService) {
      req.socketService.emitMachineUpdate(machines);
    }

    res.json({
      success: true,
      message: 'Machine created successfully',
      machine: newMachine
    });

  } catch (error) {
    console.error('Error creating machine:', error);
    res.status(500).json({ success: false, error: 'Failed to create machine' });
  }
});

// Update machine
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, osType, status, capabilities } = req.body;

    const machines = dataService.getMachines();
    const machineIndex = machines.findIndex(m => m.id === id);

    if (machineIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Machine not found'
      });
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['available', 'busy', 'maintenance', 'offline'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }
    }

    // Check if new name conflicts with existing machines (excluding current)
    if (name) {
      const conflictingMachine = machines.find(m =>
        m.name === name && m.id !== id
      );
      if (conflictingMachine) {
        return res.status(400).json({
          success: false,
          error: `Machine with name "${name}" already exists`
        });
      }
    }

    // Update machine
    const updatedMachine = {
      ...machines[machineIndex],
      ...(name && { name }),
      ...(osType && { osType }),
      ...(status && { status }),
      ...(capabilities && {
        capabilities: {
          ...machines[machineIndex].capabilities,
          ...capabilities
        }
      }),
      lastUpdated: new Date().toISOString()
    };

    machines[machineIndex] = updatedMachine;
    dataService.saveMachines(machines);

    // Emit updates to connected clients
    if (req.socketService) {
      req.socketService.emitMachineUpdate(machines);
    }

    res.json({
      success: true,
      message: 'Machine updated successfully',
      machine: updatedMachine
    });

  } catch (error) {
    console.error('Error updating machine:', error);
    res.status(500).json({ success: false, error: 'Failed to update machine' });
  }
});

// Delete machine
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const machines = dataService.getMachines();
    const machineIndex = machines.findIndex(m => m.id === id);

    if (machineIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Machine not found'
      });
    }

    const machine = machines[machineIndex];

    // Check if machine is currently busy
    if (machine.status === 'busy' && machine.currentSession) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete machine "${machine.name}" - it is currently running session "${machine.currentSession}"`
      });
    }

    machines.splice(machineIndex, 1);
    dataService.saveMachines(machines);

    // Emit updates to connected clients
    if (req.socketService) {
      req.socketService.emitMachineUpdate(machines);
    }

    res.json({
      success: true,
      message: 'Machine deleted successfully',
      machine: machine
    });

  } catch (error) {
    console.error('Error deleting machine:', error);
    res.status(500).json({ success: false, error: 'Failed to delete machine' });
  }
});

// Update machine status
router.patch('/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status, currentSession = null } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const validStatuses = ['available', 'busy', 'maintenance', 'offline'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const machines = dataService.getMachines();
    const machineIndex = machines.findIndex(m => m.id === id);

    if (machineIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Machine not found'
      });
    }

    machines[machineIndex] = {
      ...machines[machineIndex],
      status,
      currentSession,
      lastUpdated: new Date().toISOString()
    };

    dataService.saveMachines(machines);

    // Emit updates to connected clients
    if (req.socketService) {
      req.socketService.emitMachineUpdate(machines);
    }

    res.json({
      success: true,
      message: 'Machine status updated successfully',
      machine: machines[machineIndex]
    });

  } catch (error) {
    console.error('Error updating machine status:', error);
    res.status(500).json({ success: false, error: 'Failed to update machine status' });
  }
});

// Get machine types
router.get('/types', (req, res) => {
  try {
    const machineTypes = dataService.getMachineTypes();
    res.json({ success: true, machineTypes });
  } catch (error) {
    console.error('Error getting machine types:', error);
    res.status(500).json({ success: false, error: 'Failed to get machine types' });
  }
});

// Add new machine type
router.post('/types', (req, res) => {
  try {
    const { osType, quantity } = req.body;

    if (!osType || !quantity) {
      return res.status(400).json({ 
        success: false, 
        error: 'OS type and quantity are required' 
      });
    }

    const machineTypes = dataService.getMachineTypes();
    
    // Check if machine type already exists
    const existingType = machineTypes.find(type => type.osType === osType);
    if (existingType) {
      return res.status(400).json({ 
        success: false, 
        error: `Machine type "${osType}" already exists` 
      });
    }

    const newMachineType = {
      id: uuidv4(),
      osType,
      quantity: parseInt(quantity),
      createdAt: new Date().toISOString()
    };

    machineTypes.push(newMachineType);
    dataService.saveMachineTypes(machineTypes);

    // Regenerate machines based on new types
    const machineService = new MachineService(dataService);
    const machines = machineService.generateMachines(machineTypes);
    dataService.saveMachines(machines);

    // Emit updates to connected clients
    req.socketService.emitMachineUpdate(machines);
    req.socketService.emitMachineTypesUpdate(machineTypes);

    res.json({
      success: true,
      message: 'Machine type added successfully',
      machineType: newMachineType,
      machines
    });

  } catch (error) {
    console.error('Error adding machine type:', error);
    res.status(500).json({ success: false, error: 'Failed to add machine type' });
  }
});

// Update machine type
router.put('/types/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { osType, quantity } = req.body;

    if (!osType || !quantity) {
      return res.status(400).json({ 
        success: false, 
        error: 'OS type and quantity are required' 
      });
    }

    const machineTypes = dataService.getMachineTypes();
    const typeIndex = machineTypes.findIndex(type => type.id === id);

    if (typeIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        error: 'Machine type not found' 
      });
    }

    // Check if new OS type conflicts with existing ones (excluding current)
    const conflictingType = machineTypes.find(type => 
      type.osType === osType && type.id !== id
    );
    if (conflictingType) {
      return res.status(400).json({ 
        success: false, 
        error: `Machine type "${osType}" already exists` 
      });
    }

    machineTypes[typeIndex] = {
      ...machineTypes[typeIndex],
      osType,
      quantity: parseInt(quantity),
      updatedAt: new Date().toISOString()
    };

    dataService.saveMachineTypes(machineTypes);

    // Regenerate machines based on updated types
    const machineService = new MachineService(dataService);
    const machines = machineService.generateMachines(machineTypes);
    dataService.saveMachines(machines);

    // Emit updates to connected clients
    req.socketService.emitMachineUpdate(machines);
    req.socketService.emitMachineTypesUpdate(machineTypes);

    res.json({
      success: true,
      message: 'Machine type updated successfully',
      machineTypes,
      machines
    });

  } catch (error) {
    console.error('Error updating machine type:', error);
    res.status(500).json({ success: false, error: 'Failed to update machine type' });
  }
});

// Delete machine type
router.delete('/types/:id', (req, res) => {
  try {
    const { id } = req.params;
    const machineTypes = dataService.getMachineTypes();
    const typeIndex = machineTypes.findIndex(type => type.id === id);

    if (typeIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        error: 'Machine type not found' 
      });
    }

    // Check if any machines of this type are currently in use
    const machines = dataService.getMachines();
    const schedule = dataService.getSchedule();
    const typeOsType = machineTypes[typeIndex].osType;
    
    const machinesInUse = machines.filter(machine => 
      machine.osType === typeOsType && machine.status === 'busy'
    );

    if (machinesInUse.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Cannot delete machine type "${typeOsType}" - ${machinesInUse.length} machines are currently in use` 
      });
    }

    machineTypes.splice(typeIndex, 1);
    dataService.saveMachineTypes(machineTypes);

    // Regenerate machines based on remaining types
    const machineService = new MachineService(dataService);
    const updatedMachines = machineService.generateMachines(machineTypes);
    dataService.saveMachines(updatedMachines);

    // Emit updates to connected clients
    req.socketService.emitMachineUpdate(updatedMachines);

    res.json({ 
      success: true, 
      message: 'Machine type deleted successfully',
      machineTypes,
      machines: updatedMachines
    });

  } catch (error) {
    console.error('Error deleting machine type:', error);
    res.status(500).json({ success: false, error: 'Failed to delete machine type' });
  }
});

// Regenerate all machines based on current machine types
router.post('/regenerate', (req, res) => {
  try {
    const machineTypes = dataService.getMachineTypes();
    const machineService = new MachineService(dataService);
    const machines = machineService.generateMachines(machineTypes);
    
    dataService.saveMachines(machines);

    // Emit updates to connected clients
    req.socketService.emitMachineUpdate(machines);

    res.json({ 
      success: true, 
      message: 'Machines regenerated successfully',
      machines
    });

  } catch (error) {
    console.error('Error regenerating machines:', error);
    res.status(500).json({ success: false, error: 'Failed to regenerate machines' });
  }
});

// Get machine summary statistics
router.get('/summary', (req, res) => {
  try {
    const machines = dataService.getMachines();
    const machineTypes = dataService.getMachineTypes();

    const summary = machineTypes.map(type => {
      const typeMachines = machines.filter(machine => machine.osType === type.osType);
      const availableMachines = typeMachines.filter(machine => machine.status === 'available');
      const busyMachines = typeMachines.filter(machine => machine.status === 'busy');

      return {
        osType: type.osType,
        total: typeMachines.length,
        available: availableMachines.length,
        busy: busyMachines.length,
        utilizationRate: typeMachines.length > 0 
          ? ((busyMachines.length / typeMachines.length) * 100).toFixed(1)
          : '0.0'
      };
    });

    res.json({ success: true, summary });

  } catch (error) {
    console.error('Error getting machine summary:', error);
    res.status(500).json({ success: false, error: 'Failed to get machine summary' });
  }
});

module.exports = router;
