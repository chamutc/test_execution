import React, { useState, useEffect } from 'react';
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
  Alert
} from '@mui/material';

const SessionsTableSimple = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching sessions from:', 'http://localhost:3000/api/sessions');
        
        const response = await fetch('http://localhost:3000/api/sessions', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Sessions data:', data);
        
        setSessions(data);
      } catch (err) {
        console.error('Error fetching sessions:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'normal': return 'info';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'running': return 'warning';
      case 'failed': return 'error';
      case 'pending': return 'default';
      default: return 'default';
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
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6">Network Error</Typography>
          <Typography variant="body2">
            Failed to load sessions: {error}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Make sure the backend server is running on http://localhost:3000
          </Typography>
        </Alert>
        
        <Typography variant="body2" color="text.secondary">
          Debug info:
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Frontend: http://localhost:3001
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Backend: http://localhost:3000/api/sessions
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Test Sessions ({sessions.length})
      </Typography>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Platform</TableCell>
              <TableCell>OS</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Estimated Time</TableCell>
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

export default SessionsTableSimple;
