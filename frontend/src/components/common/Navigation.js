import React from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Assignment as SessionsIcon,
  Timeline as TimelineIcon,
  Computer as MachinesIcon,
  Settings as HardwareIcon,
} from '@mui/icons-material';

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    {
      label: 'Sessions',
      value: '/sessions',
      icon: <SessionsIcon />,
    },
    {
      label: 'Timeline',
      value: '/',
      icon: <TimelineIcon />,
    },
    {
      label: 'Machines',
      value: '/machines',
      icon: <MachinesIcon />,
    },
    {
      label: 'Hardware',
      value: '/hardware',
      icon: <HardwareIcon />,
    },
  ];

  const handleChange = (event, newValue) => {
    navigate(newValue);
  };

  // Get current tab value based on pathname
  const getCurrentValue = () => {
    const currentItem = navigationItems.find(item => {
      if (item.value === '/') {
        return location.pathname === '/';
      }
      return location.pathname.startsWith(item.value);
    });
    return currentItem ? currentItem.value : '/';
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'transparent' }}>
      <Tabs
        value={getCurrentValue()}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          '& .MuiTab-root': {
            minHeight: 48,
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.95rem',
            '&.Mui-selected': {
              fontWeight: 600,
            },
          },
          '& .MuiTabs-indicator': {
            height: 3,
            borderRadius: '3px 3px 0 0',
          },
        }}
      >
        {navigationItems.map((item) => (
          <Tab
            key={item.value}
            label={item.label}
            value={item.value}
            icon={item.icon}
            iconPosition="start"
            sx={{
              '& .MuiTab-iconWrapper': {
                marginRight: 1,
                marginBottom: 0,
              },
            }}
          />
        ))}
      </Tabs>
    </Box>
  );
};

export default Navigation;
