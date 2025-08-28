import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Chip,
  IconButton,

  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import { format, addHours, isSameDay } from 'date-fns';

import { timelineAPI, schedulingAPI, machinesAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useSocket } from '../../contexts/SocketContext';

const TimelineGrid = ({ selectedDate, refreshTrigger }) => {
  console.log('TimelineGrid component mounting...', { selectedDate });

  const [schedule, setSchedule] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedSession, setDraggedSession] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [conflictDialog, setConflictDialog] = useState({ open: false, conflicts: [] });
  const [clearDialog, setClearDialog] = useState(false);
  const [queue, setQueue] = useState([]);
  const [autoScheduling, setAutoScheduling] = useState(false);

  const { showSuccess, showError } = useNotification();

  // Ensure schedule and machines are always arrays
  const safeSchedule = Array.isArray(schedule) ? schedule : [];
  const safeMachines = Array.isArray(machines) ? machines : [];
  const { socket } = useSocket();

  // Generate time slots (24 hours)
  const timeSlots = useMemo(() => Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return {
      hour: i,
      label: `${hour}:00`,
      time: addHours(selectedDate, i),
    };
  }), [selectedDate]);

  // Scroll container ref
  const containerRef = useRef(null);

  // Auto-scroll to current hour on mount
  useEffect(() => {
    const now = new Date();
    if (!isSameDay(now, selectedDate)) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`hour-col-${now.getHours()}`);
      if (el && containerRef.current) {
        const rect = el.getBoundingClientRect();
        containerRef.current.scrollLeft += rect.left - 200;
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [selectedDate]);

  const goToNow = useCallback(() => {
    const now = new Date();
    if (!isSameDay(now, selectedDate)) return;
    const el = document.getElementById(`hour-col-${now.getHours()}`);
    if (el && containerRef.current) {
      const rect = el.getBoundingClientRect();
      containerRef.current.scrollLeft += rect.left - 200;
    }
  }, [selectedDate]);

  const loadQueue = useCallback(async () => {
    try {
      const res = await schedulingAPI.getQueue();
      setQueue(res.data?.data || res.data || []);
    } catch (e) {
      console.warn('Failed to load queue:', e.message);
    }
  }, []);

  const clearSchedule = async () => {
    try {
      await schedulingAPI.clearSchedule();
      showSuccess('Schedule cleared');
      setClearDialog(false);
      loadScheduleData();
      loadQueue();
    } catch (e) {
      showError(`Failed to clear schedule: ${e.message}`);
    }
  };

  const runAutoSchedule = async () => {
    try {
      setAutoScheduling(true);
      const res = await schedulingAPI.autoSchedule({ strategy: 'priority-first' });
      showSuccess(`Scheduled ${res.data?.result?.scheduled?.length || 0} sessions`);
      loadScheduleData();
      loadQueue();
    } catch (e) {
      showError(`Auto-schedule failed: ${e.message}`);
    } finally {
      setAutoScheduling(false);
    }
  };

  // Test machines API immediately
  useEffect(() => {
    console.log('Testing machines API...');

    // Test with a simple fetch first
    fetch('http://localhost:3000/api/machines/test-api')
      .then(res => res.json())
      .then(data => {
        console.log('🔥 Direct fetch test success:', data);

        // Now test the actual machines API
        return machinesAPI.getAll();
      })
      .then(res => {
        console.log('Machines API test success:', res);
      })
      .catch(err => {
        console.error('Machines API test error:', err);
      });
  }, []);

  // Load schedule data
  const loadScheduleData = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      console.log('Loading schedule for date:', dateStr);

      console.log('Making API calls...');

      // Make API calls separately to isolate issues
      let scheduleRes, machinesRes;

      try {
        console.log('🚀 NEW TIMELINE API: Calling for date:', dateStr);
        console.log('API endpoint: /timeline/date/' + dateStr);
        scheduleRes = await timelineAPI.getTimelineByDate(dateStr);
        console.log('✅ Timeline API success:', scheduleRes);
        console.log('Timeline data received:', scheduleRes.data);
        console.log('Timeline data type:', typeof scheduleRes.data);
        console.log('Timeline data length:', Array.isArray(scheduleRes.data.data) ? scheduleRes.data.data.length : 'not array');
      } catch (err) {
        console.error('❌ Timeline API error:', err);
        console.error('Error details:', err.response || err.message);
        console.error('Error status:', err.response?.status);
        console.error('Error data:', err.response?.data);
        scheduleRes = { data: { data: [], machines: [] } };
      }

      try {
        console.log('Calling machines API...');
        machinesRes = await machinesAPI.getAll();
        console.log('Machines API success:', machinesRes);
      } catch (err) {
        console.error('Machines API error:', err);
        machinesRes = { machines: [] };
      }

      console.log('API calls completed');

      console.log('📊 NEW TIMELINE RESPONSE:', scheduleRes);
      
      // New timeline API returns both data and machines in one response
      const timelineData = scheduleRes.data?.data || [];
      const machinesFromTimeline = scheduleRes.data?.machines || [];
      
      console.log('✅ Timeline data extracted:', timelineData.length, 'sessions');
      console.log('✅ Machines from timeline:', machinesFromTimeline.length, 'machines');
      
      // Set schedule data directly from timeline API
      setSchedule(timelineData);
      console.log('🎯 SCHEDULE STATE UPDATED:', timelineData.length, 'sessions loaded');

      // Use machines from timeline API (already includes correct machine IDs)
      const transformedMachines = machinesFromTimeline.map(machine => ({
        ...machine,
        os: machine.osType || machine.os // Map osType to os for frontend compatibility
      }));

      console.log('Transformed machines:', transformedMachines.map(m => ({ id: m.id, name: m.name })));
      console.log('Machine IDs in schedule:', timelineData.map(s => s.machineId));
      console.log('Available machine IDs:', transformedMachines.map(m => m.id));
      
      // Check for orphaned sessions (should be none with new API)
      const orphanedSessions = timelineData.filter(s => 
        !transformedMachines.find(m => m.id === s.machineId)
      );
      console.log('🔍 Orphaned sessions count:', orphanedSessions.length);
      if (orphanedSessions.length > 0) {
        console.log('⚠️ Orphaned sessions:', orphanedSessions.map(s => ({ 
          name: s.sessionName, 
          machineId: s.machineId 
        })));
      } else {
        console.log('✅ No orphaned sessions - all machine IDs match!');
      }

      setMachines(transformedMachines);
    } catch (error) {
      console.error('Schedule loading error:', error);
      showError(`Failed to load schedule: ${error.message}`);
      // Use fallback data on error
      setMachines([
        { id: 'machine_1', name: 'Fallback Machine 1', os: 'Ubuntu 20.04', status: 'available' },
        { id: 'machine_2', name: 'Fallback Machine 2', os: 'Ubuntu 22.04', status: 'available' },
        { id: 'machine_3', name: 'Fallback Machine 3', os: 'Windows 10', status: 'maintenance' },
      ]);
      setSchedule([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, showError]);

  useEffect(() => {
    loadScheduleData();
    loadQueue();
  }, [loadScheduleData, loadQueue, refreshTrigger]);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleScheduleUpdate = (data) => {
      console.log('Received schedule update:', data);
      if (data && data.date && isSameDay(new Date(data.date), selectedDate)) {
        loadScheduleData();
      } else if (data) {
        // Refresh anyway if we have data but no date
        loadScheduleData();
      }
    };

    const handleSessionStatusUpdate = (data) => {
      console.log('Received session status update:', data);
      if (data && data.sessionId) {
        setSchedule(prev => prev.map(item =>
          item.sessionId === data.sessionId
            ? { ...item, status: data.status }
            : item
        ));
      }
    };

    socket.on('schedule:updated', handleScheduleUpdate);
    socket.on('session:status_changed', handleSessionStatusUpdate);

    return () => {
      socket.off('schedule:updated', handleScheduleUpdate);
      socket.off('session:status_changed', handleSessionStatusUpdate);
    };
  }, [socket, selectedDate, loadScheduleData]);

  // Get scheduled session for a specific machine and time slot
  const getScheduledSession = (machineId, hour) => {
    const session = safeSchedule.find(item =>
      item.machineId === machineId &&
      item.startHour <= hour &&
      item.endHour > hour
    );
    
    // Debug: Log session matching attempts
    if (hour === 10 && safeSchedule.length > 0) {
      console.log(`🔍 Checking machine ${machineId} at hour ${hour}:`);
      console.log('Available sessions:', safeSchedule.map(s => ({ name: s.sessionName, machineId: s.machineId, startHour: s.startHour })));
      console.log('Found session:', session ? session.sessionName : 'None');
    }
    
    return session;
  };

  // Get scheduled sessions for unknown machines (machine ID changed)  
  const getOrphanedSessions = (hour) => {
    const knownMachineIds = safeMachines.map(m => m.id);
    return safeSchedule.filter(item =>
      !knownMachineIds.includes(item.machineId) &&
      item.startHour <= hour &&
      item.endHour > hour
    );
  };

  // Check time status for a slot
  const getTimeStatus = (hour) => {
    const now = new Date();
    const slotTime = new Date(selectedDate);
    slotTime.setHours(hour, 0, 0, 0);

    if (slotTime.getTime() < now.getTime()) return 'past';
    if (now.getHours() === hour && isSameDay(now, selectedDate)) return 'current';
    return 'future';
  };

  // Check if a slot is available
  const isSlotAvailable = (machineId, hour) => {
    const machine = machines.find(m => m.id === machineId);
    if (!machine || machine.status !== 'available') return false;

    // Prevent scheduling in past slots or current slot
    const timeStatus = getTimeStatus(hour);
    if (timeStatus === 'past' || timeStatus === 'current') return false;

    return !getScheduledSession(machineId, hour);
  };

  // Drag and drop handlers
  const handleDragStart = (e, session) => {
    setDraggedSession(session);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, machineId, hour) => {
    e.preventDefault();
    if (isSlotAvailable(machineId, hour)) {
      e.dataTransfer.dropEffect = 'move';
      setDragOverSlot({ machineId, hour });
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = async (e, machineId, hour) => {
    e.preventDefault();
    setDragOverSlot(null);

    if (!draggedSession || !isSlotAvailable(machineId, hour)) {
      return;
    }

    try {
      // Check for conflicts
      const conflictCheck = await schedulingAPI.checkConflicts({
        sessionId: draggedSession.sessionId,
        machineId,
        startHour: hour,
        date: format(selectedDate, 'yyyy-MM-dd'),
      });

      if (conflictCheck.data.conflicts.length > 0) {
        setConflictDialog({
          open: true,
          conflicts: conflictCheck.data.conflicts,
        });
        return;
      }

      // Schedule the session
      await schedulingAPI.manualSchedule({
        sessionId: draggedSession.sessionId,
        machineId,
        startHour: hour,
        date: format(selectedDate, 'yyyy-MM-dd'),
      });

      showSuccess('Session scheduled successfully');
      loadScheduleData();

    } catch (error) {
      showError(`Failed to schedule session: ${error.message}`);
    } finally {
      setDraggedSession(null);
    }
  };

  // Session management
  const handleSessionAction = async (action, session) => {
    try {
      switch (action) {
        case 'start':
          await schedulingAPI.updateSchedule(session.id, { status: 'running' });
          showSuccess('Session started');
          break;
        case 'stop':
          await schedulingAPI.updateSchedule(session.id, { status: 'completed' });
          showSuccess('Session stopped');
          break;
        case 'delete':
          await schedulingAPI.deleteSchedule(session.id);
          showSuccess('Session removed from schedule');
          break;
        default:
          break;
      }
      loadScheduleData();
    } catch (error) {
      showError(`Failed to ${action} session: ${error.message}`);
    }
    setAnchorEl(null);
    setSelectedSession(null);
  };

  const handleMenuOpen = (event, session) => {
    setAnchorEl(event.currentTarget);
    setSelectedSession(session);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSession(null);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'running':
        return 'success';
      case 'scheduled':
        return 'primary';
      case 'completed':
        return 'info';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  // Get machine status color
  const getMachineStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return 'success';
      case 'busy':
        return 'warning';
      case 'maintenance':
        return 'error';
      case 'offline':
        return 'default';
      default:
        return 'default';
    }
  };

  // Render session cell
  const renderSessionCell = (session) => {
    if (!session) return null;

    const durationHours = (session.endHour - session.startHour);
    const durationLabel = `${Math.floor(durationHours)}h${(durationHours % 1) ? ` ${Math.round((durationHours % 1) * 60)}m` : ''}`;
    const width = `${durationHours * 100}%`;

    return (
      <Box
        draggable
        title={`${format(addHours(selectedDate, session.startHour), 'HH:mm')} - ${format(addHours(selectedDate, session.endHour), 'HH:mm')} • ${durationLabel}`}
        onDragStart={(e) => handleDragStart(e, session)}
        sx={{
          position: 'absolute',
          top: 2,
          left: 2,
          right: 2,
          bottom: 2,
          backgroundColor: getStatusColor(session.status) + '.light',
          border: 1,
          borderColor: getStatusColor(session.status) + '.main',
          borderRadius: 1,
          p: 0.5,
          cursor: 'grab',
          width: width,
          minWidth: 80,
          '&:hover': {
            backgroundColor: getStatusColor(session.status) + '.main',
            color: 'white',
          },
          '&:active': {
            cursor: 'grabbing',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }} noWrap>
              {session.sessionName}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }} noWrap>
              {session.platform}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <DragIcon sx={{ fontSize: 12, opacity: 0.6 }} />
            <IconButton
              size="small"
              onClick={(e) => handleMenuOpen(e, session)}
              sx={{ p: 0.25 }}
            >
              <MoreIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Box>
        </Box>
        <Chip
          label={session.status}
          size="small"
          color={getStatusColor(session.status)}
          sx={{ mt: 0.5, height: 16, fontSize: '0.6rem' }}
        />
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', overflow: 'auto' }} ref={containerRef}>
      {/* Queue Panel */}
      <Box sx={{ mb: 2, p: 2, backgroundColor: 'background.paper', borderRadius: 1 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Queue ({queue.length} pending)</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', maxHeight: 120, overflow: 'auto' }}>
          {queue.slice(0, 10).map(s => (
            <Chip key={s.id} label={`${s.name} (${s.priority})`} size="small" color={s.priority === 'urgent' ? 'error' : s.priority === 'high' ? 'warning' : 'default'} />
          ))}
          {queue.length > 10 && <Chip label={`+${queue.length - 10} more`} size="small" variant="outlined" />}
        </Box>
      </Box>

      {/* Timeline Header */}
      <Box sx={{ mb: 2, p: 2, backgroundColor: 'background.paper', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Timeline for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Drag and drop sessions to schedule them. Click on scheduled sessions for more options.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={goToNow}>Go to Now</Button>
          <Button variant="outlined" color="warning" onClick={() => setClearDialog(true)}>Clear Schedule</Button>
          <Button variant="contained" disabled={autoScheduling} onClick={runAutoSchedule}>
            {autoScheduling ? 'Scheduling...' : 'Auto Schedule'}
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 300px)' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {/* Machine column header */}
              <TableCell
                sx={{
                  minWidth: 200,
                  maxWidth: 200,
                  backgroundColor: 'background.paper',
                  borderRight: 1,
                  borderColor: 'divider',
                  position: 'sticky',
                  left: 0,
                  zIndex: 3,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Machines ({machines.length})
                </Typography>
              </TableCell>

              {/* Time slot headers */}
              {timeSlots.map((slot) => (
                <TableCell
                  key={slot.hour}
                  id={`hour-col-${slot.hour}`}
                  align="center"
                  sx={{
                    minWidth: 120,
                    backgroundColor: getTimeStatus(slot.hour) === 'current' ? 'info.light' : 'background.paper',
                    borderRight: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 500 }}>
                    {slot.label}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {safeMachines.map((machine) => (
              <TableRow key={machine.id} hover>
                {/* Machine info cell */}
                <TableCell
                  sx={{
                    minWidth: 200,
                    maxWidth: 200,
                    backgroundColor: 'background.paper',
                    borderRight: 1,
                    borderColor: 'divider',
                    position: 'sticky',
                    left: 0,
                    zIndex: 2,
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {machine.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {machine.os}
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={machine.status}
                        size="small"
                        color={getMachineStatusColor(machine.status)}
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                </TableCell>

                {/* Time slot cells */}
                {timeSlots.map((slot) => {
                  const scheduledSession = getScheduledSession(machine.id, slot.hour);
                  const isAvailable = isSlotAvailable(machine.id, slot.hour);
                  const isDragOver = dragOverSlot?.machineId === machine.id && dragOverSlot?.hour === slot.hour;

                  return (
                    <TableCell
                      key={`${machine.id}-${slot.hour}`}
                      sx={{
                        minWidth: 120,
                        height: 80,
                        borderRight: 1,
                        borderColor: 'divider',
                        p: 0,
                        position: 'relative',
                        backgroundColor: isDragOver
                          ? 'primary.light'
                          : getTimeStatus(slot.hour) === 'past'
                            ? 'action.selected'
                            : getTimeStatus(slot.hour) === 'current'
                              ? 'info.light'
                              : !isAvailable
                                ? 'action.disabledBackground'
                                : 'background.paper',
                        cursor: isAvailable ? 'pointer' : 'not-allowed',
                      }}
                      onDragOver={(e) => handleDragOver(e, machine.id, slot.hour)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, machine.id, slot.hour)}
                    >
                      {scheduledSession && renderSessionCell(scheduledSession)}

                      {/* Slot indicator */}
                      {!scheduledSession && isAvailable && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            opacity: 0.3,
                            fontSize: '0.7rem',
                            color: 'text.secondary',
                          }}
                        >
                          {isDragOver ? 'Drop here' : 'Available'}
                        </Box>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}

            {/* Orphaned sessions row - sessions with unknown machine IDs */}
            {(() => {
              const hasOrphanedSessions = safeSchedule.some(session => !safeMachines.find(m => m.id === session.machineId));
              console.log('🚨 ORPHANED SESSIONS CHECK:', hasOrphanedSessions, 'Total sessions:', safeSchedule.length, 'Total machines:', safeMachines.length);
              if (hasOrphanedSessions) {
                console.log('Orphaned sessions will render in warning row');
              }
              return hasOrphanedSessions;
            })() && (
              <TableRow sx={{ backgroundColor: 'warning.light' }}>
                <TableCell
                  sx={{
                    minWidth: 200,
                    maxWidth: 200,
                    backgroundColor: 'warning.light',
                    borderRight: 1,
                    borderColor: 'divider',
                    position: 'sticky',
                    left: 0,
                    zIndex: 2,
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'warning.dark' }}>
                      ⚠️ Unassigned Sessions
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Machine references may have changed
                    </Typography>
                  </Box>
                </TableCell>

                {/* Time slot cells */}
                {timeSlots.map((slot) => {
                  const orphanedSessions = getOrphanedSessions(slot.hour);

                  return (
                    <TableCell
                      key={`orphaned-${slot.hour}`}
                      sx={{
                        minWidth: 120,
                        height: 80,
                        borderRight: 1,
                        borderColor: 'divider',
                        p: 0,
                        position: 'relative',
                        backgroundColor: 'warning.light',
                      }}
                    >
                      {orphanedSessions.map((session, index) => (
                        <Box
                          key={`${session.sessionId}-${slot.hour}`}
                          sx={{
                            position: 'absolute',
                            top: 2 + (index * 20),
                            left: 2,
                            right: 2,
                            height: 18,
                            backgroundColor: 'warning.main',
                            border: 1,
                            borderColor: 'warning.dark',
                            borderRadius: 1,
                            p: 0.25,
                            fontSize: '0.6rem',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {session.sessionName}
                        </Box>
                      ))}
                    </TableCell>
                  );
                })}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Session Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedSession?.status === 'scheduled' && (
          <MenuItem onClick={() => handleSessionAction('start', selectedSession)}>
            <ListItemIcon>
              <PlayIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Start Session</ListItemText>
          </MenuItem>
        )}
        {selectedSession?.status === 'running' && (
          <MenuItem onClick={() => handleSessionAction('stop', selectedSession)}>
            <ListItemIcon>
              <StopIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Stop Session</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => handleSessionAction('edit', selectedSession)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Schedule</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleSessionAction('delete', selectedSession)} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Remove from Schedule</ListItemText>
        </MenuItem>
      </Menu>

      {/* Conflict Resolution Dialog */}
      <Dialog
        open={conflictDialog.open}
        onClose={() => setConflictDialog({ open: false, conflicts: [] })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Scheduling Conflicts Detected</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            The following conflicts were detected:
          </Typography>
          {conflictDialog.conflicts.map((conflict, index) => (
            <Box key={index} sx={{ mt: 1, p: 1, backgroundColor: 'warning.light', borderRadius: 1 }}>
              <Typography variant="body2">
                {conflict.message}
              </Typography>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConflictDialog({ open: false, conflicts: [] })}>
            Cancel
          </Button>
          <Button variant="contained" color="warning">
            Force Schedule
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clear Schedule Confirmation */}
      <Dialog open={clearDialog} onClose={() => setClearDialog(false)}>
        <DialogTitle>Clear Schedule</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to clear all scheduled sessions? This will reset them to pending status.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDialog(false)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={clearSchedule}>Clear Schedule</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TimelineGrid;
