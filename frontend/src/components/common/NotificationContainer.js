import React from 'react';
import {
  Snackbar,
  Alert,
  Box,
  IconButton,
  Slide,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useNotification } from '../../contexts/NotificationContext';

const SlideTransition = (props) => {
  return <Slide {...props} direction="left" />;
};

const NotificationItem = ({ notification, onClose }) => {
  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    onClose(notification.id);
  };

  const getSeverity = (type) => {
    switch (type) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'info';
    }
  };

  return (
    <Snackbar
      open={true}
      autoHideDuration={notification.duration > 0 ? notification.duration : null}
      onClose={handleClose}
      TransitionComponent={SlideTransition}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{
        position: 'relative',
        '& .MuiSnackbar-root': {
          position: 'relative',
        },
      }}
    >
      <Alert
        severity={getSeverity(notification.type)}
        onClose={handleClose}
        variant="filled"
        sx={{
          minWidth: 300,
          maxWidth: 500,
          '& .MuiAlert-message': {
            wordBreak: 'break-word',
          },
        }}
        action={
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={handleClose}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      >
        {notification.message}
      </Alert>
    </Snackbar>
  );
};

const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 80,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        maxHeight: 'calc(100vh - 100px)',
        overflow: 'hidden',
      }}
    >
      {notifications.slice(-5).map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={removeNotification}
        />
      ))}
    </Box>
  );
};

export default NotificationContainer;
