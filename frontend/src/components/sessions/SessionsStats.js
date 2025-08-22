import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
} from '@mui/material';

const SessionsStats = ({ sessions = [], loading = false }) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  const stats = {
    total: sessions.length,
    pending: sessions.filter(s => s.status === 'pending').length,
    running: sessions.filter(s => s.status === 'running').length,
    completed: sessions.filter(s => s.status === 'completed').length,
  };

  const StatCard = ({ title, value, color = 'primary' }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" component="div" sx={{ fontWeight: 600, color: `${color}.main` }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <StatCard title="Total Sessions" value={stats.total} color="primary" />
      </Grid>
      <Grid item xs={6}>
        <StatCard title="Pending" value={stats.pending} color="warning" />
      </Grid>
      <Grid item xs={6}>
        <StatCard title="Running" value={stats.running} color="info" />
      </Grid>
      <Grid item xs={6}>
        <StatCard title="Completed" value={stats.completed} color="success" />
      </Grid>
    </Grid>
  );
};

export default SessionsStats;
