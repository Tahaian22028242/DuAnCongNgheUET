import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Box, Typography, Paper, List, ListItem, ListItemText, CircularProgress, Button,
  Alert, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AppLayout from './AppLayout';

function FacultiesInfo() {
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteFacultyDialogOpen, setDeleteFacultyDialogOpen] = useState(false);
  const [selectedFacultyToDelete, setSelectedFacultyToDelete] = useState(null);
  const [deleteFacultyOption, setDeleteFacultyOption] = useState('recordsOnly');
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('http://localhost:5000/faculties', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load faculties');
        const data = await res.json();
        if (!cancelled) setFaculties(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setFaculties([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleConfirmDeleteFaculty = async () => {
    if (!selectedFacultyToDelete) return;
    try {
      const res = await fetch(
        `http://localhost:5000/admin/faculty/${encodeURIComponent(selectedFacultyToDelete)}?deleteAccounts=${deleteFacultyOption === 'deleteLecturers'}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message || 'Đã xóa dữ liệu khoa.' });
        setDeleteFacultyDialogOpen(false);
        setSelectedFacultyToDelete(null);
        // refresh list
        setLoading(true);
        const refreshed = await fetch('http://localhost:5000/faculties', { credentials: 'include' });
        if (refreshed.ok) {
          const arr = await refreshed.json();
          setFaculties(Array.isArray(arr) ? arr : []);
        }
        setLoading(false);
      } else {
        setMessage({ type: 'error', text: data.message || 'Lỗi khi xóa dữ liệu khoa.' });
      }
    } catch (err) {
      console.error('Error deleting faculty:', err);
      setMessage({ type: 'error', text: 'Lỗi khi xóa dữ liệu khoa.' });
    }
  };

  return (
    <AppLayout>
      <div className="dashboard">
        <div className="dashboard-content">
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
              Chọn khoa để xem danh sách Giảng viên & CNBM
            </Typography>

            {loading ? (
              <CircularProgress />
            ) : (
              <Paper sx={{ p: 2 }}>
                {faculties.length === 0 ? (
                  <Typography color="text.secondary">Chưa có dữ liệu Khoa/Ngành.</Typography>
                ) : (
                  <List>
                    {faculties.map((faculty) => (
                      <ListItem
                        key={faculty}
                        secondaryAction={
                          user.role === 'Quản trị viên' ? (
                            <Button
                              color="error"
                              size="small"
                              onClick={() => {
                                setSelectedFacultyToDelete(faculty);
                                setDeleteFacultyOption('recordsOnly');
                                setDeleteFacultyDialogOpen(true);
                              }}
                              sx={{ mr: 1 }}
                            >
                              Xóa
                            </Button>
                          ) : null
                        }
                      >
                        <ListItemText
                          primary={faculty}
                          onClick={() => navigate(`/faculty/${encodeURIComponent(faculty)}`)}
                          sx={{ cursor: 'pointer' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
                {message.text && (
                  <Box sx={{ mt: 2 }}>
                    <Alert severity={message.type} onClose={() => setMessage({ type: '', text: '' })}>{message.text}</Alert>
                  </Box>
                )}
              </Paper>
            )}
            {user.role === 'Quản trị viên' && (
              <Button onClick={() => navigate('/upload-lecturers')} sx={{ cursor: 'pointer', py: 0.5, width: '100%' }}>
                <UploadFileIcon sx={{ mr: 1, justifyContent: 'center' }} />
                Tải lên danh sách giảng viên mới
              </Button>
            )}
            {/* Delete faculty confirmation dialog */}
            <Dialog open={deleteFacultyDialogOpen} onClose={() => setDeleteFacultyDialogOpen(false)}>
              <DialogTitle>Xóa dữ liệu theo Khoa</DialogTitle>
              <DialogContent>
                <Typography sx={{ mb: 2 }}>
                  Bạn sắp xóa dữ liệu cho Khoa <strong>{selectedFacultyToDelete}</strong>.
                </Typography>
                <Typography sx={{ mb: 1 }}>Chọn phương án:</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                  <Button
                    variant={deleteFacultyOption === 'recordsOnly' ? 'contained' : 'outlined'}
                    onClick={() => setDeleteFacultyOption('recordsOnly')}
                    fullWidth
                  >
                    Chỉ xóa bản ghi liên quan (không xóa tài khoản giảng viên)
                  </Button>
                  <Button
                    variant={deleteFacultyOption === 'deleteLecturers' ? 'contained' : 'outlined'}
                    color="error"
                    onClick={() => setDeleteFacultyOption('deleteLecturers')}
                    fullWidth
                  >
                    Xóa tài khoản giảng viên thuộc Khoa (không xóa admin)
                  </Button>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Lưu ý: Chức năng xóa tài khoản ở đây chỉ xóa tài khoản của giảng viên (role = 'Giảng viên'). Học viên sẽ không bị xóa.
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDeleteFacultyDialogOpen(false)}>Hủy</Button>
                <Button onClick={handleConfirmDeleteFaculty} color="error" variant="contained">Xóa</Button>
              </DialogActions>
            </Dialog>
          </Box>
        </div>
      </div>
    </AppLayout>
  );
}

export default FacultiesInfo;
