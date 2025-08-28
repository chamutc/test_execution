import React, { useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

// Components
import SessionsTableFixed from '../components/sessions/SessionsTableFixed';
import SessionsStats from '../components/sessions/SessionsStats';
import CSVImport from '../components/sessions/CSVImport';
import AddSessionDialog from '../components/sessions/AddSessionDialog';

// Hooks
import { useSessionsQuery } from '../hooks/useSessionsQuery';

// API Services
import { sessionsAPI } from '../services/api';

// Contexts
import { useNotification } from '../contexts/NotificationContext';

const SessionsPage = () => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState(null);
  const [viewSession, setViewSession] = useState(null);
  const [cleaningSessions, setCleaningSessions] = useState(false);
  const [editingSessions, setEditingSessions] = useState(false);
  const { data: sessionsData, isLoading, error } = useSessionsQuery();
  
  const { showSuccess, showError, showWarning } = useNotification();

  const sessions = sessionsData || [];

  const handleEditSession = (session) => {
    setEditSession(session);
    setAddDialogOpen(true);
  };

  const handleViewSession = (session) => {
    setViewSession(session);
    console.log('View session:', session); // TODO: Implement session details view
  };

  const handleCloseDialog = () => {
    setAddDialogOpen(false);
    setEditSession(null);
  };

  const handleCleanAllSessions = async () => {
    if (window.confirm('Are you sure you want to delete ALL sessions? This action cannot be undone.')) {
      try {
        setCleaningSessions(true);
        
        // Delete all sessions one by one
        const deletePromises = sessions.map(session => 
          sessionsAPI.delete(session.id)
        );
        
        await Promise.all(deletePromises);
        
        showSuccess(`Successfully deleted ${sessions.length} sessions`);
        
        // Refresh sessions data
        window.location.reload();
      } catch (error) {
        console.error('Failed to clean sessions:', error);
        showError('Failed to clean sessions. Please try again.');
      } finally {
        setCleaningSessions(false);
      }
    }
  };

  const handleEditAllSessions = async () => {
    if (window.confirm('Are you sure you want to edit ALL sessions? This will open multiple edit dialogs.')) {
      try {
        setEditingSessions(true);
        
        // Open edit dialog for first session as example
        if (sessions.length > 0) {
          setEditSession(sessions[0]);
          setAddDialogOpen(true);
        }
        
        showWarning('Edit dialog opened for first session. Edit other sessions individually.');
      } catch (error) {
        console.error('Failed to open edit dialogs:', error);
        showError('Failed to open edit dialogs.');
      } finally {
        setEditingSessions(false);
      }
    }
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          📋 Sessions Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage test sessions, import CSV data, and track execution status
        </Typography>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddDialogOpen(true)}
              size="large"
            >
              Add Session
            </Button>
          </Grid>
          
          <Grid item>
            <Button
              variant="outlined"
              startIcon={editingSessions ? <CircularProgress size={16} /> : <EditIcon />}
              onClick={handleEditAllSessions}
              size="large"
              disabled={editingSessions || sessions.length === 0}
              color="primary"
            >
              {editingSessions ? 'Opening...' : 'Edit Sessions'}
            </Button>
          </Grid>
          
          <Grid item>
            <Button
              variant="outlined"
              startIcon={cleaningSessions ? <CircularProgress size={16} /> : <ClearIcon />}
              onClick={handleCleanAllSessions}
              size="large"
              disabled={cleaningSessions || sessions.length === 0}
              color="error"
            >
              {cleaningSessions ? 'Cleaning...' : 'Clean All Sessions'}
            </Button>
          </Grid>

        </Grid>
      </Box>

      <Grid container spacing={3}>
        {/* CSV Import Section */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3, height: 'fit-content' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              CSV Import
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upload CSV files to import multiple sessions at once
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <CSVImport />
          </Paper>
        </Grid>

        {/* Statistics Section */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, height: 'fit-content' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Session Overview
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Current session statistics and status breakdown
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <SessionsStats sessions={sessions} loading={isLoading} />
          </Paper>
        </Grid>

        {/* Sessions Table */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Sessions List
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              View, edit, and manage all test sessions
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <SessionsTableFixed
              sessions={sessions}
              loading={isLoading}
              error={error}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* Add/Edit Session Dialog */}
      <AddSessionDialog
        open={addDialogOpen}
        onClose={handleCloseDialog}
        editSession={editSession}
      />
    </Container>
  );
};

export default SessionsPage;
