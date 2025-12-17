// import React, { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import {
//   Box, Typography, Paper, List, ListItem, ListItemText, Drawer, CircularProgress
// } from '@mui/material';
// import logo from './logo.png';
// import HelpIcon from '@mui/icons-material/Help';
// import InfoIcon from '@mui/icons-material/Info';
// import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
// import ContactMailIcon from '@mui/icons-material/ContactMail';
// import ExitToAppIcon from '@mui/icons-material/ExitToApp';
// import AssignmentIcon from '@mui/icons-material/Assignment';
// import GroupIcon from '@mui/icons-material/Group';
// import UploadFileIcon from '@mui/icons-material/UploadFile';
// import SettingsIcon from '@mui/icons-material/Settings';
// import DashboardIcon from '@mui/icons-material/Dashboard';
// import AccountCircleIcon from '@mui/icons-material/AccountCircle';

// function FacultiesInfo() {
//   const [faculties, setFaculties] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const navigate = useNavigate();
//   const user = JSON.parse(localStorage.getItem('user')) || {};

//   useEffect(() => {
//     fetch('http://localhost:5000/faculties', { credentials: 'include' })
//       .then(res => res.json())
//       .then(data => {
//         setFaculties(data);
//         setLoading(false);
//       });
//   }, []);

//   const handleLogout = () => {
//     localStorage.removeItem('user');
//     document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
//     navigate('/');
//   };

//   return (
//     <div className="dashboard">
//       <Drawer variant="permanent" anchor="left">
//         <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
//           <img
//             src={logo}
//             alt="Logo"
//             style={{ width: '80px', height: '80px', objectFit: 'contain', cursor: 'pointer' }}
//             onClick={() => navigate('/dashboard')}
//           />
//         </Box>
//         <List>
//           <ListItem button onClick={() => navigate('/dashboard')}>
//             <DashboardIcon sx={{ mr: 1 }} />
//             <ListItemText primary="Dashboard" />
//           </ListItem>
//           <ListItem button onClick={() => navigate('/profile')}>
//             <AccountCircleIcon sx={{ mr: 1 }} />
//             <ListItemText primary="Account" />
//           </ListItem>
//           {(user.role === 'Quản trị viên' || user.role === 'Giảng viên' || user.role === 'Chủ nhiệm bộ môn') && (
//             <ListItem button onClick={() => navigate('/batches')}>
//               <GroupIcon sx={{ mr: 1 }} />
//               <ListItemText primary="Danh sách học viên" />
//             </ListItem>
//           )}
//           {user.role === 'Quản trị viên' && (
//             <>
//               <ListItem button onClick={() => navigate('/upload')}>
//                 <UploadFileIcon sx={{ mr: 1 }} />
//                 <ListItemText primary="Tải lên danh sách" />
//               </ListItem>
//               <ListItem button onClick={() => navigate('/upload-heads')}>
//                 <UploadFileIcon sx={{ mr: 1 }} />
//                 <ListItemText primary="Tải lên CNBM" />
//               </ListItem>
//               <ListItem button onClick={() => navigate('/upload-lecturers')}>
//                 <UploadFileIcon sx={{ mr: 1 }} />
//                 <ListItemText primary="Tải lên danh sách giảng viên" />
//               </ListItem>
//               <ListItem button onClick={() => navigate('/topic-proposals')}>
//                 <AssignmentIcon sx={{ mr: 1 }} />
//                 <ListItemText primary="Đề tài chưa được phê duyệt" />
//               </ListItem>
//             </>
//           )}
//           {user.role === 'Sinh viên' && (
//             <>
//               <ListItem button onClick={() => navigate('/propose-topic')}>
//                 <AssignmentIcon sx={{ mr: 1 }} />
//                 <ListItemText primary="Đề xuất đề cương" />
//               </ListItem>
//               <ListItem button onClick={() => navigate('/faculties-info')}>
//                 <InfoIcon sx={{ mr: 1 }} />
//                 <ListItemText primary="Thông tin" />
//               </ListItem>
//             </>
//           )}
//           {user.role === 'Giảng viên' && (
//             <ListItem button onClick={() => navigate('/topics')}>
//               <AssignmentIcon sx={{ mr: 1 }} />
//               <ListItemText primary="Đề xuất từ học viên" />
//             </ListItem>
//           )}
//           {user.role === 'Chủ nhiệm bộ môn' && (
//             <ListItem button onClick={() => navigate('/head/topics')}>
//               <AssignmentIcon sx={{ mr: 1 }} />
//               <ListItemText primary="Đề tài chờ phê duyệt" />
//             </ListItem>
//           )}
//           {user.role === 'Chủ nhiệm bộ môn' && (
//             <ListItem button onClick={() => navigate('/head/statistics')}>
//               <GroupIcon sx={{ mr: 1 }} />
//               <ListItemText primary="Thống kê học viên" />
//             </ListItem>
//           )}
//           <ListItem button onClick={() => navigate('/calendar')}>
//             <CalendarMonthIcon sx={{ mr: 1 }} />
//             <ListItemText primary="Calendar" />
//           </ListItem>
//           <ListItem button onClick={() => navigate('/settings')}>
//             <SettingsIcon sx={{ mr: 1 }} />
//             <ListItemText primary="Setting" />
//           </ListItem>
//           <ListItem button onClick={() => navigate('/help')}>
//             <HelpIcon sx={{ mr: 1 }} />
//             <ListItemText primary="Help" />
//           </ListItem>
//           <ListItem button onClick={() => navigate('/about')}>
//             <InfoIcon sx={{ mr: 1 }} />
//             <ListItemText primary="Introduction" />
//           </ListItem>
//           <ListItem button onClick={() => navigate('/contact')}>
//             <ContactMailIcon sx={{ mr: 1 }} />
//             <ListItemText primary="Contact" />
//           </ListItem>
//           <ListItem button onClick={handleLogout}>
//             <ExitToAppIcon sx={{ mr: 1 }} />
//             <ListItemText primary="Logout" />
//           </ListItem>
//         </List>
//       </Drawer>
//       <div className="dashboard-content">
//         <Box sx={{ p: 3 }}>
//           <Typography variant="h4" gutterBottom>
//             Chọn Khoa/Ngành để xem danh sách giảng viên & CNBM
//           </Typography>
//           {loading ? (
//             <CircularProgress />
//           ) : (
//             <Paper sx={{ p: 2 }}>
//               <List>
//                 {faculties.map((faculty, idx) => (
//                   <ListItem
//                     button
//                     key={faculty}
//                     onClick={() => navigate(`/faculty/${encodeURIComponent(faculty)}`)}
//                   >
//                     <ListItemText primary={faculty} />
//                   </ListItem>
//                 ))}
//               </List>
//             </Paper>
//           )}
//         </Box>
//       </div>
//     </div>
//   );
// }

// export default FacultiesInfo;

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
  const drawerWidth = 240;
  const buttonWidth = 40;
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

  const handleLogout = () => {
    localStorage.removeItem('user');
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    navigate('/');
  };

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
              Chọn khoa để xem danh sách giảng viên & CNBM
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
