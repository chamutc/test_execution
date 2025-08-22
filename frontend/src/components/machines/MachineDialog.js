import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Stack,
} from '@mui/material';

const STATUS_OPTIONS = ['available', 'busy', 'maintenance', 'offline'];

const MachineDialog = ({ open, onClose, initialData = null, onSubmit }) => {
  const isEdit = !!initialData;
  const [name, setName] = useState('');
  const [osType, setOsType] = useState('');
  const [status, setStatus] = useState('available');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setOsType(initialData.osType || initialData.os || '');
      setStatus(initialData.status || 'available');
    } else {
      setName('');
      setOsType('');
      setStatus('available');
    }
  }, [initialData, open]);

  const handleSubmit = () => {
    if (!name.trim() || !osType.trim()) return;
    onSubmit({ name: name.trim(), osType: osType.trim(), status });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? 'Edit Machine' : 'Add Machine'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="OS Type"
            value={osType}
            onChange={(e) => setOsType(e.target.value)}
            fullWidth
            required
            placeholder="e.g., Ubuntu 24.04"
          />
          <TextField
            select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            fullWidth
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>
          {isEdit ? 'Save Changes' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MachineDialog;

