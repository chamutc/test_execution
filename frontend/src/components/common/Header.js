import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Chip,
  useTheme,
} from '@mui/material';
import {
  RocketLaunch as RocketIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';
import Navigation from './Navigation';
import { useSocket } from '../../contexts/SocketContext';

const Header = () => {
  const theme = useTheme();
  const { connected, connecting } = useSocket();

  const getConnectionStatus = () => {
    if (connecting) {
      return {
        label: 'Connecting...',
        color: 'warning',
        icon: <CircleIcon sx={{ fontSize: 12, animation: 'pulse 1.5s infinite' }} />,
      };
    } else if (connected) {
      return {
        label: 'Connected',
        color: 'success',
        icon: <CircleIcon sx={{ fontSize: 12 }} />,
      };
    } else {
      return {
        label: 'Offline Mode',
        color: 'error',
        icon: <CircleIcon sx={{ fontSize: 12 }} />,
      };
    }
  };

  const connectionStatus = getConnectionStatus();

  return (
    <AppBar 
      position="static" 
      elevation={1}
      sx={{ 
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Toolbar>
        {/* Logo and Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 4 }}>
          <RocketIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              fontWeight: 600,
              color: theme.palette.text.primary,
            }}
          >
            Resource Scheduler
          </Typography>
        </Box>

        {/* Navigation */}
        <Box sx={{ flexGrow: 1 }}>
          <Navigation />
        </Box>

        {/* Connection Status */}
        <Box sx={{ ml: 2 }}>
          <Chip
            icon={connectionStatus.icon}
            label={connectionStatus.label}
            color={connectionStatus.color}
            variant="outlined"
            size="small"
            sx={{
              '& .MuiChip-icon': {
                ml: 1,
              },
            }}
          />
        </Box>
      </Toolbar>

      {/* CSS for pulse animation */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </AppBar>
  );
};

export default Header;
