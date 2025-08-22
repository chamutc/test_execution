import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  LinearProgress,
  Button,
} from '@mui/material';
import {
  Computer as ComputerIcon,
  Cloud as CloudIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';

import { machinesAPI } from '../services/api';
import MachineDialog from '../components/machines/MachineDialog';

const MachinesPageFixed = () => {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Mock data for demonstration
  const mockMachines = [
    {
      id: '1',
      name: 'Ubuntu-Test-VM-01',
      type: 'vm',
      os: 'Ubuntu 24.04',
      cpu: '4 cores',
      memory: '8 GB',
      storage: '100 GB',
      status: 'running',
      ipAddress: '192.168.1.101',
      notes: 'Primary testing environment',
      uptime: '5 days, 12 hours',
      cpuUsage: 45,
      memoryUsage: 62
    },
    {
      id: '2',
      name: 'Windows-Dev-VM-02',
      type: 'vm',
      os: 'Windows 11',
      cpu: '8 cores',
      memory: '16 GB',
      storage: '200 GB',
      status: 'running',
      ipAddress: '192.168.1.102',
      notes: 'Development environment',
      uptime: '2 days, 8 hours',
      cpuUsage: 23,
      memoryUsage: 78
    },
    {
      id: '3',
      name: 'Test-Container-01',
      type: 'container',
      os: 'Alpine Linux',
      cpu: '2 cores',
      memory: '4 GB',
      storage: '50 GB',
      status: 'stopped',
      ipAddress: '172.17.0.3',
      notes: 'Lightweight testing container',
      uptime: '0 minutes',
      cpuUsage: 0,
      memoryUsage: 0
    }
  ];

  useEffect(() => {
    const fetchMachines = async () => {
      try {
        setLoading(true);
        console.log('Fetching machines from API...');

        const response = await machinesAPI.getAll();
        console.log('Machines API response:', response);

        // Transform machines data to match the expected format
        const machinesData = response.data?.machines || response.machines || [];
        const transformedMachines = machinesData.map(machine => ({
          id: machine.id,
          name: machine.name,
          type: 'vm', // Default type since backend doesn't have this field
          os: machine.osType || machine.os,
          status: machine.status === 'available' ? 'running' :
                  machine.status === 'maintenance' ? 'stopped' :
                  machine.status,
          ipAddress: '192.168.1.100', // Mock IP since backend doesn't have this
          cpuUsage: Math.floor(Math.random() * 100), // Mock usage
          memoryUsage: Math.floor(Math.random() * 100), // Mock usage
          capabilities: machine.capabilities || {}
        }));

        console.log('Transformed machines:', transformedMachines);
        setMachines(transformedMachines);
      } catch (err) {
        console.error('Failed to fetch machines:', err);
        setError('Failed to load machines data');
        // Fallback to mock data on error
        setMachines(mockMachines);
      } finally {
        setLoading(false);
      }
    };

    fetchMachines();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'success';
      case 'stopped': return 'default';
      case 'error': return 'error';
      case 'starting': return 'warning';
      default: return 'default';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'vm': return <ComputerIcon />;
      case 'container': return <CloudIcon />;
      case 'physical': return <StorageIcon />;
      default: return <ComputerIcon />;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
          <Typography variant="h6" sx={{ ml: 2 }}>
            Loading machines...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl">
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          🖥️ Machine Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage test machines, monitor status, and configure hardware resources
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Machines
              </Typography>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="h4">{machines.length}</Typography>
                <Button variant="contained" size="small" onClick={() => { setEditing(null); setDialogOpen(true); }}>
                  Add Machine
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Running
              </Typography>
              <Typography variant="h4" color="success.main">
                {machines.filter(m => m.status === 'running').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Stopped
              </Typography>
              <Typography variant="h4" color="text.secondary">
                {machines.filter(m => m.status === 'stopped').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Virtual Machines
              </Typography>
              <Typography variant="h4" color="primary.main">
                {machines.filter(m => m.type === 'vm').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Machines Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>OS</TableCell>
              <TableCell>Resources</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>IP Address</TableCell>
              <TableCell>Usage</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {machines.map((machine) => (
              <TableRow key={machine.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {machine.name}
                  </Typography>
                  {machine.notes && (
                    <Typography variant="caption" color="text.secondary">
                      {machine.notes}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    icon={getTypeIcon(machine.type)}
                    label={machine.type.toUpperCase()}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{machine.os}</TableCell>
                <TableCell>
                  <Typography variant="body2">
                    CPU: {machine.cpu}
                  </Typography>
                  <Typography variant="body2">
                    RAM: {machine.memory}
                  </Typography>
                  <Typography variant="body2">
                    Storage: {machine.storage}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={machine.status}
                    color={getStatusColor(machine.status)}
                    size="small"
                  />
                  {machine.uptime && machine.status === 'running' && (
                    <Typography variant="caption" display="block">
                      Uptime: {machine.uptime}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{machine.ipAddress}</TableCell>
                <TableCell>
                  {machine.status === 'running' ? (
                    <Box sx={{ minWidth: 120 }}>
                      <Typography variant="body2">
                        CPU: {machine.cpuUsage}%
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={machine.cpuUsage} 
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="body2">
                        Memory: {machine.memoryUsage}%
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={machine.memoryUsage} 
                      />
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      N/A
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Button size="small" onClick={() => { setEditing(machine); setDialogOpen(true); }}>
                    Edit
                  </Button>
                  <Button size="small" color="error" onClick={async () => {
                    await machinesAPI.delete(machine.id);
                    const res = await machinesAPI.getAll();
                    const machinesData = res.data?.machines || [];
                    const transformed = machinesData.map(m => ({
                      id: m.id,
                      name: m.name,
                      type: 'vm',
                      os: m.osType || m.os,
                      status: m.status === 'available' ? 'running' : (m.status || 'stopped'),
                      ipAddress: '192.168.1.100',
                      cpuUsage: Math.floor(Math.random() * 100),
                      memoryUsage: Math.floor(Math.random() * 100),
                    }));
                    setMachines(transformed);
                  }}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <MachineDialog
        open={dialogOpen}
        initialData={editing}
        onClose={() => setDialogOpen(false)}
        onSubmit={async (data) => {
          if (editing) {
            await machinesAPI.update(editing.id, data);
          } else {
            await machinesAPI.create(data);
          }
          setDialogOpen(false);
          setEditing(null);
          const res = await machinesAPI.getAll();
          const machinesData = res.data?.machines || [];
          const transformed = machinesData.map(m => ({
            id: m.id,
            name: m.name,
            type: 'vm',
            os: m.osType || m.os,
            status: m.status === 'available' ? 'running' : (m.status || 'stopped'),
            ipAddress: '192.168.1.100',
            cpuUsage: Math.floor(Math.random() * 100),
            memoryUsage: Math.floor(Math.random() * 100),
          }));
          setMachines(transformed);
        }}
      />
    </Container>
  );
};

export default MachinesPageFixed;
