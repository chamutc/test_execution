import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  IconButton,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Today as TodayIcon,
  AutoAwesome as AutoScheduleIcon,
  Analytics as AnalyticsIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { format, addDays, subDays } from 'date-fns';

// Components
import TimelineGrid from '../components/timeline/TimelineGrid';
import AutoScheduleDialog from '../components/timeline/AutoScheduleDialog';

// API Services
import { schedulingAPI } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

const TimelinePage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [autoScheduleOpen, setAutoScheduleOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [clearingSchedule, setClearingSchedule] = useState(false);
  
  const { showSuccess, showError } = useNotification();

  const handlePreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleAutoSchedule = () => {
    setAutoScheduleOpen(true);
  };

  const handleHardwareAnalysis = () => {
    // TODO: Implement hardware analysis
    console.log('Hardware analysis');
  };

  const handleClearSchedule = async () => {
    if (window.confirm('Are you sure you want to clear the schedule for this date?')) {
      try {
        setClearingSchedule(true);
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        
        // Call API to clear schedule for this date
        await schedulingAPI.clearSchedule({ date: dateStr });
        
        showSuccess(`Schedule cleared successfully for ${dateStr}`);
        
        // Refresh timeline to show updated data
        setRefreshTrigger(prev => prev + 1);
      } catch (error) {
        console.error('Failed to clear schedule:', error);
        showError('Failed to clear schedule. Please try again.');
      } finally {
        setClearingSchedule(false);
      }
    }
  };

  const handleRefresh = () => {
    // Force timeline refresh by incrementing trigger
    setRefreshTrigger(prev => prev + 1);
  };

  const handleScheduleComplete = () => {
    // Called when auto-scheduling completes
    setRefreshTrigger(prev => prev + 1);
    setAutoScheduleOpen(false);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          📅 Timeline Scheduler
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Schedule and manage test sessions across machines and time slots
        </Typography>
      </Box>

      {/* Timeline Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          {/* Date Navigation */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, minWidth: 'fit-content' }}>
                Date:
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton onClick={handlePreviousDay} size="small">
                  <PrevIcon />
                </IconButton>
                
                <Typography variant="body1" sx={{ minWidth: 150, textAlign: 'center' }}>
                  {format(selectedDate, 'MMM d, yyyy')}
                </Typography>
                
                <IconButton onClick={handleNextDay} size="small">
                  <NextIcon />
                </IconButton>
                
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleToday}
                  startIcon={<TodayIcon />}
                >
                  Today
                </Button>
              </Box>
            </Box>
          </Grid>

          {/* Schedule Controls */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' }, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<AutoScheduleIcon />}
                onClick={handleAutoSchedule}
                size="small"
              >
                Auto Schedule
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<AnalyticsIcon />}
                onClick={handleHardwareAnalysis}
                size="small"
              >
                Hardware Analysis
              </Button>
              
              <Button
                variant="outlined"
                startIcon={clearingSchedule ? <CircularProgress size={16} /> : <ClearIcon />}
                onClick={handleClearSchedule}
                color="error"
                size="small"
                disabled={clearingSchedule}
              >
                {clearingSchedule ? 'Clearing...' : 'Clear Schedule'}
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                size="small"
              >
                Refresh
              </Button>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Timeline Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            24-Hour Timeline View (1-hour slots) - {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 16, height: 16, backgroundColor: 'success.main', borderRadius: 1 }} />
              <Typography variant="caption">Available</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 16, height: 16, backgroundColor: 'primary.main', borderRadius: 1 }} />
              <Typography variant="caption">Scheduled</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 16, height: 16, backgroundColor: 'warning.main', borderRadius: 1 }} />
              <Typography variant="caption">Running</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 16, height: 16, backgroundColor: 'error.main', borderRadius: 1 }} />
              <Typography variant="caption">Unavailable</Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Timeline Grid */}
      <Paper sx={{ p: 0, overflow: 'hidden' }}>
        <TimelineGrid selectedDate={selectedDate} refreshTrigger={refreshTrigger} />
      </Paper>

      {/* Auto Schedule Dialog */}
      <AutoScheduleDialog
        open={autoScheduleOpen}
        onClose={() => setAutoScheduleOpen(false)}
        onScheduleComplete={handleScheduleComplete}
        selectedDate={selectedDate}
      />
    </Container>
  );
};

export default TimelinePage;
