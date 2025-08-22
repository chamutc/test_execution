import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  FormControlLabel,
  Switch,
  Chip,
  Alert,
  Autocomplete,
  InputAdornment,
} from '@mui/material';
import {
  Schedule as TimeIcon,
  Computer as PlatformIcon,
  Build as DebuggerIcon,
} from '@mui/icons-material';

import { useCreateSessionMutation, useUpdateSessionMutation } from '../../hooks/useSessionsQuery';
import { hardwareAPI } from '../../services/api';

const AddSessionDialog = ({ open, onClose, editSession = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    platform: '',
    debugger: '',
    os: '',
    priority: 'normal',
    description: '',
    estimatedTime: '',
    requiresHardware: false,
    hardwareRequirements: [],
    tags: [],
  });

  const [errors, setErrors] = useState({});
  const [platforms, setPlatforms] = useState([]);
  const [debuggers, setDebuggers] = useState([]);
  const [availableOS] = useState([
    'Ubuntu 20.04', 'Ubuntu 22.04', 'Windows 10', 'Windows 11', 'CentOS 7', 'RHEL 8'
  ]);
  const [availableTags] = useState([
    'regression', 'smoke', 'integration', 'performance', 'security', 'ui', 'api'
  ]);

  const createSessionMutation = useCreateSessionMutation();
  const updateSessionMutation = useUpdateSessionMutation();

  const isEditing = Boolean(editSession);

  // Load hardware data
  useEffect(() => {
    const loadHardwareData = async () => {
      try {
        const [platformsRes, debuggersRes] = await Promise.all([
          hardwareAPI.getPlatforms(),
          hardwareAPI.getDebuggers(),
        ]);
        setPlatforms(platformsRes.data || []);
        setDebuggers(debuggersRes.data || []);
      } catch (error) {
        console.error('Failed to load hardware data:', error);
      }
    };

    if (open) {
      loadHardwareData();
    }
  }, [open]);

  // Populate form when editing
  useEffect(() => {
    if (editSession) {
      setFormData({
        name: editSession.name || '',
        platform: editSession.platform || '',
        debugger: editSession.debugger || '',
        os: editSession.os || '',
        priority: editSession.priority || 'normal',
        description: editSession.description || '',
        estimatedTime: editSession.estimatedTime || '',
        requiresHardware: editSession.requiresHardware || false,
        hardwareRequirements: editSession.hardwareRequirements || [],
        tags: editSession.tags || [],
      });
    } else {
      // Reset form for new session
      setFormData({
        name: '',
        platform: '',
        debugger: '',
        os: '',
        priority: 'normal',
        description: '',
        estimatedTime: '',
        requiresHardware: false,
        hardwareRequirements: [],
        tags: [],
      });
    }
    setErrors({});
  }, [editSession, open]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Session name is required';
    }

    if (!formData.platform.trim()) {
      newErrors.platform = 'Platform is required';
    }

    if (!formData.debugger.trim()) {
      newErrors.debugger = 'Debugger is required';
    }

    if (!formData.os.trim()) {
      newErrors.os = 'Operating system is required';
    }

    if (formData.estimatedTime && isNaN(parseFloat(formData.estimatedTime))) {
      newErrors.estimatedTime = 'Estimated time must be a number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleTagsChange = (_, newValue) => {
    setFormData(prev => ({
      ...prev,
      tags: newValue,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const sessionData = {
        ...formData,
        estimatedTime: formData.estimatedTime ? parseFloat(formData.estimatedTime) : null,
        status: editSession?.status || 'pending',
        createdAt: editSession?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (isEditing) {
        await updateSessionMutation.mutateAsync({
          id: editSession.id,
          data: sessionData,
        });
      } else {
        await createSessionMutation.mutateAsync(sessionData);
      }

      onClose();
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  };

  const isLoading = createSessionMutation.isLoading || updateSessionMutation.isLoading;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        component: 'form',
        onSubmit: handleSubmit,
      }}
    >
      <DialogTitle>
        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
          {isEditing ? 'Edit Session' : 'Add New Session'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isEditing ? 'Update session configuration' : 'Create a new test session with configuration details'}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Session Name */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Session Name"
              value={formData.name}
              onChange={handleInputChange('name')}
              error={!!errors.name}
              helperText={errors.name}
              required
              placeholder="Enter session name"
            />
          </Grid>

          {/* Platform and Debugger */}
          <Grid item xs={12} sm={6}>
            <Autocomplete
              freeSolo
              options={platforms.map(p => p.name || p)}
              value={formData.platform}
              onChange={(_, newValue) => {
                setFormData(prev => ({ ...prev, platform: newValue || '' }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Platform"
                  required
                  error={!!errors.platform}
                  helperText={errors.platform}
                  placeholder="e.g., Platform_A"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <PlatformIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Autocomplete
              freeSolo
              options={debuggers.map(d => d.name || d)}
              value={formData.debugger}
              onChange={(_, newValue) => {
                setFormData(prev => ({ ...prev, debugger: newValue || '' }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Debugger"
                  required
                  error={!!errors.debugger}
                  helperText={errors.debugger}
                  placeholder="e.g., S32_DBG"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <DebuggerIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />
          </Grid>

          {/* OS and Priority */}
          <Grid item xs={12} sm={6}>
            <Autocomplete
              freeSolo
              options={availableOS}
              value={formData.os}
              onChange={(_, newValue) => {
                setFormData(prev => ({ ...prev, os: newValue || '' }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Operating System"
                  required
                  error={!!errors.os}
                  helperText={errors.os}
                  placeholder="e.g., Ubuntu 20.04"
                />
              )}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Priority</InputLabel>
              <Select
                value={formData.priority}
                onChange={handleInputChange('priority')}
                label="Priority"
              >
                <MenuItem value="urgent">🔴 Urgent</MenuItem>
                <MenuItem value="high">🟡 High</MenuItem>
                <MenuItem value="normal">🟢 Normal</MenuItem>
                <MenuItem value="low">⚪ Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Estimated Time */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Estimated Time (hours)"
              type="number"
              value={formData.estimatedTime}
              onChange={handleInputChange('estimatedTime')}
              error={!!errors.estimatedTime}
              helperText={errors.estimatedTime || 'Optional: estimated execution time'}
              placeholder="e.g., 2.5"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <TimeIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Hardware Requirements */}
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.requiresHardware}
                  onChange={handleInputChange('requiresHardware')}
                />
              }
              label="Requires Hardware"
            />
          </Grid>

          {/* Tags */}
          <Grid item xs={12}>
            <Autocomplete
              multiple
              freeSolo
              options={availableTags}
              value={formData.tags}
              onChange={handleTagsChange}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant="outlined"
                    label={option}
                    {...getTagProps({ index })}
                    key={index}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tags"
                  placeholder="Add tags (e.g., regression, smoke)"
                  helperText="Press Enter to add custom tags"
                />
              )}
            />
          </Grid>

          {/* Description */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={handleInputChange('description')}
              placeholder="Optional description for this session"
            />
          </Grid>
        </Grid>

        {/* Show validation errors */}
        {Object.keys(errors).length > 0 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Please fix the errors above before submitting.
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isLoading || !formData.name || !formData.platform}
        >
          {isLoading
            ? (isEditing ? 'Updating...' : 'Creating...')
            : (isEditing ? 'Update Session' : 'Create Session')
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddSessionDialog;
