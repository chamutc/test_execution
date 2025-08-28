import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip as MuiChip,
} from '@mui/material';
import { hardwareAPI } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import { useNotification } from '../contexts/NotificationContext';
import { Edit as EditIcon, ContentCopy as CopyIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';

const HardwarePageFixed = () => {
  const [requirements, setRequirements] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [combinations, setCombinations] = useState([]);
  const [platformOptions, setPlatformOptions] = useState([]);
  const [debuggerOptions, setDebuggerOptions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [invDialog, setInvDialog] = useState({ open: false, mode: 'create', item: { type: 'board', name: '', quantity: 0 } });
  const [availDialog, setAvailDialog] = useState({ open: false, combo: null, hours: {} });
  const [comboDialog, setComboDialog] = useState({ 
    open: false, 
    mode: 'create', 
    item: { 
      name: '', 
      platformId: '', 
      debuggerId: '', 
      mode: 'NA', 
      platformsSupported: [], 
      totalAvailableHours: 24,
      enabled: true,
      priority: 'normal',
      description: ''
    } 
  });

  const { socket } = useSocket();
  const { showSuccess, showError } = useNotification();

  const loadAll = async () => {
    try {
      setLoading(true);
      const [reqRes, invRes, comboRes, platRes, debugRes] = await Promise.all([
        hardwareAPI.getRequirements(),
        hardwareAPI.getInventory(),
        hardwareAPI.getCombinations(),
        hardwareAPI.getPlatforms(),
        hardwareAPI.getDebuggers(),
      ]);
      setRequirements(reqRes.data?.data || reqRes.data || []);
      setInventory(invRes.data?.data || invRes.data || []);
      setCombinations(comboRes.data?.data || comboRes.data || []);
      setPlatformOptions((platRes.data?.data || platRes.data || []).map(p => ({ id: p.id, name: p.name })));
      setDebuggerOptions((debugRes.data?.data || debugRes.data || []).map(d => ({ id: d.id, name: d.name })));
    } catch (err) {
      setError('Failed to load hardware data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (!socket) return;
    const reload = () => loadAll();
    socket.on('hardware:updated', reload);
    socket.on('hardware:combinations_updated', reload);
    return () => {
      socket.off('hardware:updated', reload);
      socket.off('hardware:combinations_updated', reload);
    };
  }, [socket]);

  const openInvDialog = (mode, item) => setInvDialog({ open: true, mode, item: item || { type: 'board', name: '', quantity: 0 } });
  const closeInvDialog = () => setInvDialog({ open: false, mode: 'create', item: { type: 'board', name: '', quantity: 0 } });
  const saveInventory = async () => {
    try {
      const { mode, item } = invDialog;
      if (mode === 'create') await hardwareAPI.createInventory(item);
      else await hardwareAPI.updateInventory(item.id, item);
      showSuccess('Inventory saved');
      closeInvDialog();
      loadAll();
    } catch (e) { showError(e.message); }
  };

  const removeInventory = async (id) => {
    try { await hardwareAPI.deleteInventory(id); showSuccess('Inventory deleted'); loadAll(); } catch (e) { showError(e.message); }
  };

  const openAvailDialog = (combo) => setAvailDialog({ open: true, combo, hours: combo.hourlyAvailability || {} });
  const closeAvailDialog = () => setAvailDialog({ open: false, combo: null, hours: {} });
  const toggleHour = (h) => setAvailDialog(prev => ({ ...prev, hours: { ...prev.hours, [h]: !prev.hours[h] } }));
  const saveAvailability = async () => {
    try {
      await hardwareAPI.updateCombinationAvailability(availDialog.combo.id, availDialog.hours);
      showSuccess('Availability updated');
      closeAvailDialog();
      loadAll();
    } catch (e) { showError(e.message); }
  };

  // New combination management functions
  const openComboDialog = (mode, item) => {
    if (mode === 'create') {
      setComboDialog({ 
        open: true, 
        mode, 
        item: { 
          name: '', 
          platformId: '', 
          debuggerId: '', 
          mode: 'NA', 
          platformsSupported: [], 
          totalAvailableHours: 24,
          enabled: true,
          priority: 'normal',
          description: ''
        } 
      });
    } else {
      setComboDialog({ open: true, mode, item: { ...item } });
    }
  };

  const closeComboDialog = () => setComboDialog({ 
    open: false, 
    mode: 'create', 
    item: { 
      name: '', 
      platformId: '', 
      debuggerId: '', 
      mode: 'NA', 
      platformsSupported: [], 
      totalAvailableHours: 24,
      enabled: true,
      priority: 'normal',
      description: ''
    } 
  });

  const saveCombination = async () => {
    try {
      const { mode, item } = comboDialog;
      if (mode === 'create') {
        await hardwareAPI.createCombination(item);
        showSuccess('Combination created');
      } else {
        await hardwareAPI.updateCombination(item.id, item);
        showSuccess('Combination updated');
      }
      closeComboDialog();
      loadAll();
    } catch (e) { showError(e.message); }
  };

  const removeCombination = async (id) => {
    try { 
      await hardwareAPI.deleteCombination(id); 
      showSuccess('Combination deleted'); 
      loadAll(); 
    } catch (e) { showError(e.message); }
  };

  const handlePlatformChange = (event) => {
    const platformId = event.target.value;
    const platform = platformOptions.find(p => p.id === platformId);
    setComboDialog(prev => ({ 
      ...prev, 
      item: { 
        ...prev.item, 
        platformId,
        platformsSupported: platform ? [platform.name] : []
      } 
    }));
  };

  const handleDebuggerChange = (event) => {
    const debuggerId = event.target.value;
    setComboDialog(prev => ({ 
      ...prev, 
      item: { 
        ...prev.item, 
        debuggerId
      } 
    }));
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
          <Typography variant="h6" sx={{ ml: 2 }}>
            Loading hardware...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl">
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          🔧 Hardware Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage requirements, inventory, and combinations
        </Typography>
      </Box>

      {/* Requirements */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Requirements (from Sessions)</Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Debugger</TableCell>
                <TableCell>Board</TableCell>
                <TableCell>Mode</TableCell>
                <TableCell align="right">Sessions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requirements.map((r, idx) => (
                <TableRow key={idx}>
                  <TableCell>{r.debugger || 'N/A'}</TableCell>
                  <TableCell>{r.board || 'N/A'}</TableCell>
                  <TableCell>{r.mode || 'NA'}</TableCell>
                  <TableCell align="right">{r.count || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Inventory */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6">Inventory</Typography>
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => openInvDialog('create')}>
            Add Item
          </Button>
        </Box>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Available</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inventory.map((it) => (
                <TableRow key={it.id}>
                  <TableCell>{it.type}</TableCell>
                  <TableCell>{it.name}</TableCell>
                  <TableCell>{it.quantity}</TableCell>
                  <TableCell>{it.available}</TableCell>
                  <TableCell align="right">
                    <Button size="small" startIcon={<EditIcon />} onClick={() => openInvDialog('edit', it)}>Edit</Button>
                    <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => removeInventory(it.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Combinations */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6">Combinations</Typography>
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => openComboDialog('create')}>
            Add Combination
          </Button>
        </Box>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Board</TableCell>
                <TableCell>Debugger</TableCell>
                <TableCell>Mode</TableCell>
                <TableCell>Platforms Supported</TableCell>
                <TableCell>Total Hours</TableCell>
                <TableCell>Allocated</TableCell>
                <TableCell>Remaining</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {combinations.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.platformName}</TableCell>
                  <TableCell>{c.debuggerName}</TableCell>
                  <TableCell>{c.mode || 'NA'}</TableCell>
                  <TableCell>{(c.platformsSupported || []).join(', ')}</TableCell>
                  <TableCell>{c.totalAvailableHours ?? 24}</TableCell>
                  <TableCell>{c.allocatedTime ?? 0}</TableCell>
                  <TableCell>{c.remainingTime ?? 0}</TableCell>
                  <TableCell align="right">
                    <Button size="small" startIcon={<EditIcon />} onClick={() => openComboDialog('edit', c)}>Edit</Button>
                    <Button size="small" startIcon={<CopyIcon />} onClick={async () => { await hardwareAPI.cloneCombination(c.id); showSuccess('Cloned'); loadAll(); }}>Clone</Button>
                    <Button size="small" startIcon={<EditIcon />} onClick={() => openAvailDialog(c)}>Availability</Button>
                    <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => removeCombination(c.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Inventory Dialog */}
      <Dialog open={invDialog.open} onClose={closeInvDialog}>
        <DialogTitle>{invDialog.mode === 'create' ? 'Add Inventory Item' : 'Edit Inventory Item'}</DialogTitle>
        <DialogContent sx={{ minWidth: 400 }}>
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <Select size="small" value={invDialog.item.type} onChange={(e) => setInvDialog(prev => ({ ...prev, item: { ...prev.item, type: e.target.value } }))}>
              <MenuItem value="board">Board</MenuItem>
              <MenuItem value="debugger">Debugger</MenuItem>
            </Select>
            <TextField size="small" label="Name" value={invDialog.item.name} onChange={(e) => setInvDialog(prev => ({ ...prev, item: { ...prev.item, name: e.target.value } }))} />
            <TextField size="small" type="number" label="Quantity" value={invDialog.item.quantity} onChange={(e) => setInvDialog(prev => ({ ...prev, item: { ...prev.item, quantity: parseInt(e.target.value || '0', 10) } }))} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeInvDialog}>Cancel</Button>
          <Button variant="contained" onClick={saveInventory}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Availability Dialog */}
      <Dialog open={availDialog.open} onClose={closeAvailDialog}>
        <DialogTitle>Edit Availability - {availDialog.combo?.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1, mt: 1 }}>
            {Array.from({ length: 24 }, (_, h) => (
              <FormControlLabel key={h} control={<Checkbox checked={!!availDialog.hours[h]} onChange={() => toggleHour(h)} />} label={`${h}:00`} />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAvailDialog}>Cancel</Button>
          <Button variant="contained" onClick={saveAvailability}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Combination Dialog */}
      <Dialog open={comboDialog.open} onClose={closeComboDialog} maxWidth="md" fullWidth>
        <DialogTitle>{comboDialog.mode === 'create' ? 'Add Hardware Combination' : 'Edit Hardware Combination'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Combination Name"
              value={comboDialog.item.name}
              onChange={(e) => setComboDialog(prev => ({ ...prev, item: { ...prev.item, name: e.target.value } }))}
              fullWidth
              required
            />
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Platform/Board</InputLabel>
                <Select
                  value={comboDialog.item.platformId}
                  onChange={handlePlatformChange}
                  label="Platform/Board"
                  required
                >
                  {platformOptions.map((platform) => (
                    <MenuItem key={platform.id} value={platform.id}>
                      {platform.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth>
                <InputLabel>Debugger</InputLabel>
                <Select
                  value={comboDialog.item.debuggerId}
                  onChange={handleDebuggerChange}
                  label="Debugger"
                  required
                >
                  {debuggerOptions.map((debuggerItem) => (
                    <MenuItem key={debuggerItem.id} value={debuggerItem.id}>
                      {debuggerItem.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Mode"
                value={comboDialog.item.mode}
                onChange={(e) => setComboDialog(prev => ({ ...prev, item: { ...prev.item, mode: e.target.value } }))}
                placeholder="NA"
                fullWidth
              />
              
              <TextField
                label="Total Available Hours"
                type="number"
                value={comboDialog.item.totalAvailableHours}
                onChange={(e) => setComboDialog(prev => ({ ...prev, item: { ...prev.item, totalAvailableHours: parseInt(e.target.value) || 24 } }))}
                inputProps={{ min: 1, max: 168 }}
                fullWidth
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={comboDialog.item.priority}
                  onChange={(e) => setComboDialog(prev => ({ ...prev, item: { ...prev.item, priority: e.target.value } }))}
                  label="Priority"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={comboDialog.item.enabled ? 'enabled' : 'disabled'}
                  onChange={(e) => setComboDialog(prev => ({ ...prev, item: { ...prev.item, enabled: e.target.value === 'enabled' } }))}
                  label="Status"
                >
                  <MenuItem value="enabled">Enabled</MenuItem>
                  <MenuItem value="disabled">Disabled</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <TextField
              label="Description"
              value={comboDialog.item.description}
              onChange={(e) => setComboDialog(prev => ({ ...prev, item: { ...prev.item, description: e.target.value } }))}
              multiline
              rows={3}
              fullWidth
            />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Platforms Supported</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {comboDialog.item.platformsSupported.map((platform, index) => (
                  <MuiChip
                    key={index}
                    label={platform}
                    onDelete={() => setComboDialog(prev => ({
                      ...prev,
                      item: {
                        ...prev.item,
                        platformsSupported: prev.item.platformsSupported.filter((_, i) => i !== index)
                      }
                    }))}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeComboDialog}>Cancel</Button>
          <Button variant="contained" onClick={saveCombination}>Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default HardwarePageFixed;
