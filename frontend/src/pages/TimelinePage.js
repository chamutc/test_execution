import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  IconButton,
  Divider,
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

const TimelinePage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [autoScheduleOpen, setAutoScheduleOpen] = useState(false);

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

  const handleClearSchedule = () => {
    if (window.confirm('Are you sure you want to clear the schedule for this date?')) {
      // TODO: Implement clear schedule
      console.log('Clear schedule for', format(selectedDate, 'yyyy-MM-dd'));
    }
  };

  const handleRefresh = () => {
    // TODO: Implement refresh
    console.log('Refresh timeline data');
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
                startIcon={<ClearIcon />}
                onClick={handleClearSchedule}
                color="error"
                size="small"
              >
                Clear Schedule
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
        <TimelineGrid selectedDate={selectedDate} />
      </Paper>

      {/* Auto Schedule Dialog */}
      <AutoScheduleDialog
        open={autoScheduleOpen}
        onClose={() => setAutoScheduleOpen(false)}
        selectedDate={selectedDate}
      />
    </Container>
  );
};

export default TimelinePage;
