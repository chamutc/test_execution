import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
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
} from '@mui/material';
import { hardwareAPI } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import { useNotification } from '../contexts/NotificationContext';
import { Edit as EditIcon, ContentCopy as CopyIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import {
  Computer as ComputerIcon,
  Memory as MemoryIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

const HardwarePageFixed = () => {
  const [requirements, setRequirements] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [combinations, setCombinations] = useState([]);
  const [platformOptions, setPlatformOptions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [invDialog, setInvDialog] = useState({ open: false, mode: 'create', item: { type: 'board', name: '', quantity: 0 } });
  const [availDialog, setAvailDialog] = useState({ open: false, combo: null, hours: {} });

  const { socket } = useSocket();
  const { showSuccess, showError } = useNotification();



  const loadAll = async () => {
    try {
      setLoading(true);
      const [reqRes, invRes, comboRes, platRes] = await Promise.all([
        hardwareAPI.getRequirements(),
        hardwareAPI.getInventory(),
        hardwareAPI.getCombinations(),
        hardwareAPI.getPlatforms(),
      ]);
      setRequirements(reqRes.data?.data || reqRes.data || []);
      setInventory(invRes.data?.data || invRes.data || []);
      setCombinations(comboRes.data?.data || comboRes.data || []);
      setPlatformOptions((platRes.data?.data || platRes.data || []).map(p => p.name));
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
        <Typography variant="h6" sx={{ mb: 1 }}>Combinations</Typography>
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
                    <Button size="small" startIcon={<CopyIcon />} onClick={async () => { await hardwareAPI.cloneCombination(c.id); showSuccess('Cloned'); loadAll(); }}>Clone</Button>
                    <Button size="small" startIcon={<EditIcon />} onClick={() => openAvailDialog(c)}>Availability</Button>
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
    </Container>
  );
};

export default HardwarePageFixed;
