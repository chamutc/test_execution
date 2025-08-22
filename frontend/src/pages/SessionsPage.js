import React, { useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
} from '@mui/icons-material';

// Components
import SessionsTableFixed from '../components/sessions/SessionsTableFixed';
import SessionsStats from '../components/sessions/SessionsStats';
import CSVImport from '../components/sessions/CSVImport';
import AddSessionDialog from '../components/sessions/AddSessionDialog';

// Hooks
import { useSessionsQuery } from '../hooks/useSessionsQuery';

const SessionsPage = () => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState(null);
  const [viewSession, setViewSession] = useState(null);
  const { data: sessionsData, isLoading, error } = useSessionsQuery();

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
