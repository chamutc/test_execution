import React from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';

const SessionsTableFixed = ({ sessions = [], loading = false, error = null }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'running':
        return 'primary';
      case 'scheduled':
        return 'info';
      case 'failed':
        return 'error';
      case 'pending':
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'normal':
        return 'info';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading sessions...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Sessions ({sessions.length})
      </Typography>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Platform</TableCell>
              <TableCell>Debugger</TableCell>
              <TableCell>Mode</TableCell>
              <TableCell>OS</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Estimated Time</TableCell>
              <TableCell>Test Cases</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {session.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  {session.platform || 'N/A'}
                </TableCell>
                <TableCell>
                  {session.debugger || 'N/A'}
                </TableCell>
                <TableCell>
                  {session.mode || 'NA'}
                </TableCell>
                <TableCell>
                  {session.os}
                </TableCell>
                <TableCell>
                  <Chip
                    label={session.priority}
                    color={getPriorityColor(session.priority)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={session.status}
                    color={getStatusColor(session.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {session.estimatedTime}h
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    Normal: {session.normalTestCases?.total || 0}
                  </Typography>
                  <Typography variant="body2">
                    Combo: {session.comboTestCases?.total || 0}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {sessions.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No sessions found
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default SessionsTableFixed;
