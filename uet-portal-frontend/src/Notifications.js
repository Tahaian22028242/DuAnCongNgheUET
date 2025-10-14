import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Chip, CircularProgress } from '@mui/material';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/student/notifications', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setNotifications(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      
      <Typography variant="h4" gutterBottom>
        Thông báo của bạn
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : notifications.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography>Không có thông báo nào.</Typography>
        </Paper>
      ) : (
        <List>
          {notifications.slice().reverse().map((notify, idx) => (
            <ListItem key={idx} sx={{ mb: 2 }}>
              <ListItemText
                primary={notify.message}
                secondary={new Date(notify.createdAt).toLocaleString('vi-VN')}
              />
              {!notify.read && <Chip label="Mới" color="primary" size="small" />}
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}

export default Notifications;