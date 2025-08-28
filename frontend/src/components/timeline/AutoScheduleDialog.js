import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
  Alert,
  TextField,
  Slider,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Switch,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Speed as SpeedIcon,
  Balance as BalanceIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

import { schedulingAPI, sessionsAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useQueryClient } from '@tanstack/react-query';

const AutoScheduleDialog = ({ open, onClose, onScheduleComplete, selectedDate }) => {
  const [scheduleType, setScheduleType] = useState('full');
  const [optimizationMode, setOptimizationMode] = useState('priority');
  const [timeRange, setTimeRange] = useState([8, 18]); // 8 AM to 6 PM
  const [maxConcurrent, setMaxConcurrent] = useState(4);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [includeWeekends, setIncludeWeekends] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [pendingSessions, setPendingSessions] = useState([]);

  const { showSuccess, showError, showWarning } = useNotification();
  const queryClient = useQueryClient();

  // Load pending sessions
  useEffect(() => {
    const loadPendingSessions = async () => {
      if (open) {
        try {
          const response = await sessionsAPI.getByStatus('pending');
          setPendingSessions(response.data || []);
        } catch (error) {
          console.error('Failed to load pending sessions:', error);
          setPendingSessions([]);
        }
      }
    };

    loadPendingSessions();
  }, [open]);

  const handleSchedule = async () => {
    if (pendingSessions.length === 0) {
      showWarning('No pending sessions to schedule');
      return;
    }

    setScheduling(true);
    setProgress(0);
    setResults(null);

    try {
      const scheduleParams = {
        date: format(selectedDate, 'yyyy-MM-dd'),
        type: scheduleType,
        optimization: optimizationMode,
        timeRange: scheduleType === 'limited' ? timeRange : [0, 23],
        maxConcurrent,
        priorityFilter: priorityFilter === 'all' ? null : priorityFilter,
        includeWeekends,
        sessionIds: pendingSessions.map(s => s.id),
      };

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await schedulingAPI.autoSchedule(scheduleParams);

      clearInterval(progressInterval);
      setProgress(100);

      const scheduleResults = response.data;
      setResults(scheduleResults);

      // Refresh schedule data
      queryClient.invalidateQueries({ queryKey: ['schedule'] });

      if (scheduleResults.success) {
        showSuccess(`Successfully scheduled ${scheduleResults.result?.scheduled?.length || 0} sessions`);
      } else {
        showWarning(`Scheduling completed with some issues`);
      }

      // Trigger timeline refresh after a short delay
      setTimeout(() => {
        if (onScheduleComplete) {
          onScheduleComplete();
        }
      }, 1000);

    } catch (error) {
      showError(`Auto-scheduling failed: ${error.message}`);
    } finally {
      setScheduling(false);
    }
  };

  const handleClose = () => {
    if (!scheduling) {
      setResults(null);
      setProgress(0);
      onClose();
    }
  };

  const getOptimizationIcon = (mode) => {
    switch (mode) {
      case 'priority':
        return <ScheduleIcon />;
      case 'time':
        return <SpeedIcon />;
      case 'balanced':
        return <BalanceIcon />;
      default:
        return <ScheduleIcon />;
    }
  };

  const formatTimeRange = (range) => {
    const [start, end] = range;
    return `${start.toString().padStart(2, '0')}:00 - ${end.toString().padStart(2, '0')}:00`;
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
          🚀 Auto Schedule Sessions
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Automatically schedule {pendingSessions.length} pending sessions for {format(selectedDate, 'MMMM d, yyyy')}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {scheduling ? (
          // Scheduling Progress
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              Scheduling in Progress...
            </Typography>
            <LinearProgress variant="determinate" value={progress} sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              {progress}% complete
            </Typography>
          </Box>
        ) : results ? (
          // Results Display
          <Box>
            <Typography variant="h6" gutterBottom>
              Scheduling Results
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Chip
                icon={<SuccessIcon />}
                label={`${results.scheduled} Scheduled`}
                color="success"
              />
              {results.conflicts > 0 && (
                <Chip
                  icon={<WarningIcon />}
                  label={`${results.conflicts} Conflicts`}
                  color="warning"
                />
              )}
              {results.failed > 0 && (
                <Chip
                  icon={<ErrorIcon />}
                  label={`${results.failed} Failed`}
                  color="error"
                />
              )}
            </Box>

            {results.details && (
              <List dense>
                {results.details.map((detail, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {detail.status === 'success' ? (
                        <SuccessIcon color="success" />
                      ) : detail.status === 'warning' ? (
                        <WarningIcon color="warning" />
                      ) : (
                        <ErrorIcon color="error" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={detail.sessionName}
                      secondary={detail.message}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        ) : (
          // Configuration Form
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Pending Sessions Summary */}
            <Box>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                Sessions to Schedule ({pendingSessions.length})
              </Typography>
              {pendingSessions.length === 0 ? (
                <Alert severity="info">
                  No pending sessions found. All sessions are already scheduled or completed.
                </Alert>
              ) : (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {pendingSessions.slice(0, 5).map((session) => (
                    <Chip
                      key={session.id}
                      label={session.name}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                  {pendingSessions.length > 5 && (
                    <Chip
                      label={`+${pendingSessions.length - 5} more`}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  )}
                </Box>
              )}
            </Box>

            <Divider />

            {/* Schedule Type */}
            <FormControl component="fieldset">
              <FormLabel component="legend" sx={{ fontWeight: 600 }}>
                Schedule Type
              </FormLabel>
              <RadioGroup
                value={scheduleType}
                onChange={(e) => setScheduleType(e.target.value)}
              >
                <FormControlLabel
                  value="full"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body2">Full Day Schedule</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Use all 24 hours for scheduling
                      </Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="limited"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body2">Time-Limited Schedule</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Schedule within business hours only
                      </Typography>
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>

            {/* Time Range (if limited) */}
            {scheduleType === 'limited' && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Time Range: {formatTimeRange(timeRange)}
                </Typography>
                <Slider
                  value={timeRange}
                  onChange={(_, newValue) => setTimeRange(newValue)}
                  valueLabelDisplay="auto"
                  min={0}
                  max={23}
                  marks={[
                    { value: 0, label: '00:00' },
                    { value: 8, label: '08:00' },
                    { value: 12, label: '12:00' },
                    { value: 18, label: '18:00' },
                    { value: 23, label: '23:00' },
                  ]}
                />
              </Box>
            )}

            {/* Optimization Mode */}
            <FormControl component="fieldset">
              <FormLabel component="legend" sx={{ fontWeight: 600 }}>
                Optimization Strategy
              </FormLabel>
              <RadioGroup
                value={optimizationMode}
                onChange={(e) => setOptimizationMode(e.target.value)}
              >
                <FormControlLabel
                  value="priority"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getOptimizationIcon('priority')}
                      <Box>
                        <Typography variant="body2">Priority First</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Schedule high-priority sessions first
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="time"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getOptimizationIcon('time')}
                      <Box>
                        <Typography variant="body2">Time Efficient</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Minimize total execution time
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="balanced"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getOptimizationIcon('balanced')}
                      <Box>
                        <Typography variant="body2">Balanced</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Balance priority and efficiency
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>

            {/* Advanced Options */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Advanced Options
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Max Concurrent Sessions: {maxConcurrent}
                  </Typography>
                  <Slider
                    value={maxConcurrent}
                    onChange={(_, value) => setMaxConcurrent(value)}
                    min={1}
                    max={10}
                    marks
                    valueLabelDisplay="auto"
                  />
                </Box>

                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <TextField
                    select
                    label="Priority Filter"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    SelectProps={{ native: true }}
                  >
                    <option value="all">All Priorities</option>
                    <option value="urgent">Urgent Only</option>
                    <option value="high">High and Above</option>
                    <option value="normal">Normal and Above</option>
                  </TextField>
                </FormControl>

                <FormControlLabel
                  control={
                    <Switch
                      checked={includeWeekends}
                      onChange={(e) => setIncludeWeekends(e.target.checked)}
                    />
                  }
                  label="Include Weekend Scheduling"
                />
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={scheduling}>
          {results ? 'Close' : 'Cancel'}
        </Button>
        {!results && (
          <Button
            variant="contained"
            onClick={handleSchedule}
            disabled={scheduling || pendingSessions.length === 0}
          >
            {scheduling ? 'Scheduling...' : 'Start Auto-Schedule'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AutoScheduleDialog;
