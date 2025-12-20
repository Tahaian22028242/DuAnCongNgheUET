import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import App from './App';
import AppLayout from './AppLayout';
function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [latestIndex, setLatestIndex] = useState(-1);

  const markNotificationRead = async (notificationId) => {
    try {
      const resp = await fetch('http://localhost:5000/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notificationId })
      });
      if (resp.ok) {
        const body = await resp.json();
        if (Array.isArray(body.notifications)) {
          setNotifications(body.notifications);
        } else {
          // fallback: mark locally
          setNotifications(prev => prev.map(n => n._id === notificationId ? { ...n, read: true } : n));
        }
      }
    } catch (e) {
      console.error('mark single notification failed', e);
    }
  };

  const [hoveredId, setHoveredId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const openDeleteDialog = (id) => {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteTargetId(null);
  };

  const confirmDelete = async () => {
    const id = deleteTargetId;
    if (!id) return closeDeleteDialog();
    try {
      const resp = await fetch('http://localhost:5000/notifications/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notificationId: id })
      });
      if (resp.ok) {
        const body = await resp.json();
        if (Array.isArray(body.notifications)) {
          setNotifications(body.notifications);
        } else {
          setNotifications(prev => prev.filter(n => n._id !== id));
        }
      } else {
        // fallback: remove locally
        setNotifications(prev => prev.filter(n => n._id !== id));
      }
    } catch (e) {
      console.error('delete notification failed', e);
      setNotifications(prev => prev.filter(n => n._id !== id));
    }
    closeDeleteDialog();
  };

  useEffect(() => {
    fetch('http://localhost:5000/student/notifications', { credentials: 'include' })
      .then(res => res.json())
      .then(async data => {
        const list = Array.isArray(data) ? data : [];
        setNotifications(list);
        setLoading(false);

        // if there are unread notifications, mark them as read on the server and update UI
        const hasUnread = list.some(n => !n.read);
        if (hasUnread) {
          try {
            const resp = await fetch('http://localhost:5000/notifications/mark-read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({})
            });
            if (resp.ok) {
              const body = await resp.json();
              setNotifications(Array.isArray(body.notifications) ? body.notifications : list.map(n => ({ ...n, read: true })));
            }
          } catch (e) {
            // ignore mark-read failures
            console.error('mark-read failed', e);
          }
        }
      });
  }, []);

  useEffect(() => {
    if (!notifications || notifications.length === 0) {
      setLatestIndex(-1);
      return;
    }
    // find most recent notification index
    let idx = 0;
    let maxTime = notifications[0]?.createdAt ? new Date(notifications[0].createdAt).getTime() : 0;
    for (let i = 1; i < notifications.length; i++) {
      const t = notifications[i]?.createdAt ? new Date(notifications[i].createdAt).getTime() : 0;
      if (t > maxTime) {
        maxTime = t;
        idx = i;
      }
    }
    setLatestIndex(idx);
  }, [notifications]);

  return (
    // <Box sx={{ p: 3 }}>

    //   <Typography variant="h4" gutterBottom>
    //     Thông báo của bạn
    //   </Typography>
    //   {loading ? (
    //     <CircularProgress />
    //   ) : notifications.length === 0 ? (
    //     <Paper sx={{ p: 3, textAlign: 'center' }}>
    //       <Typography>Không có thông báo nào.</Typography>
    //     </Paper>
    //   ) : (
    //     <List>
    //       {notifications.slice().reverse().map((notify, idx) => (
    //         <ListItem key={idx} sx={{ mb: 2 }}>
    //           <ListItemText
    //             primary={notify.message}
    //             secondary={new Date(notify.createdAt).toLocaleString('vi-VN')}
    //           />
    //           {!notify.read && <Chip label="Mới" color="primary" size="small" />}
    //         </ListItem>
    //       ))}
    //     </List>
    //   )}
    // </Box>
    <AppLayout>
      <div className="dashboard">
        <div className="dashboard-content">
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
                  // note: we reversed the list for display, so compute real index
                  <ListItem
                    key={idx}
                    onMouseEnter={() => setHoveredId(notify._id)}
                    onMouseLeave={() => setHoveredId(null)}
                    sx={{
                      mb: 2,
                      display: 'flex',
                      alignItems: 'stretch',
                      cursor: 'pointer',
                      bgcolor: hoveredId === notify._id ? 'action.selected' : 'transparent',
                      boxShadow: 0,
                      borderRadius: 1,
                      p: 0,
                      pr: 2 // keep space from right edge so delete button isn't flush
                    }}
                    onClick={() => { if (!notify.read) markNotificationRead(notify._id); }}
                  >
                    <ListItemText
                      primary={notify.message}
                      secondary={new Date(notify.createdAt).toLocaleString('vi-VN')}
                      sx={{ flex: 1, minWidth: 0 }}
                      primaryTypographyProps={{ style: { fontWeight: notify.read ? 'normal' : '700' } }}
                    />
                    <Box sx={{ display: 'flex', gap: 1, ml: 2, alignItems: 'center', minWidth: 120, justifyContent: 'flex-end' }}>
                      {/* compute original index: reverse mapping */}
                      <Chip
                        label="Gần đây nhất"
                        color="error"
                        sx={{
                          height: '24px',
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: 1,
                          mt: '4px',
                          visibility: ((notifications.length - 1 - idx) === latestIndex) ? 'visible' : 'hidden'
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); openDeleteDialog(notify._id); }}
                        sx={{
                          mt: '4px',
                          ml: '4px',
                          visibility: hoveredId === notify._id ? 'visible' : 'hidden',
                          borderRadius: '50%',
                          bgcolor: 'transparent',
                          padding: 0,
                          width: 32,
                          height: 32,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxSizing: 'border-box',
                          transition: 'background-color 200ms, color 200ms',
                          mr: 1,
                          '&:hover': {
                            bgcolor: 'error.main',
                            color: 'common.white'
                          }
                        }}
                        aria-label="delete-notification"
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
          <Dialog
            open={deleteDialogOpen}
            onClose={closeDeleteDialog}
            aria-labelledby="delete-notification-title"
          >
            <DialogTitle id="delete-notification-title">Xóa thông báo</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Bạn có chắc chắn muốn xóa thông báo này? Hành động không thể hoàn tác.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={closeDeleteDialog}>Hủy</Button>
              <Button color="error" onClick={confirmDelete}>Xóa</Button>
            </DialogActions>
          </Dialog>
        </div>
      </div>
    </AppLayout>
  );
}

export default Notifications;