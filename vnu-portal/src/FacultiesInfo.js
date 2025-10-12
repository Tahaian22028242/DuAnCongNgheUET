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

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Box, Typography, Paper, List, ListItem, ListItemText, Drawer, CircularProgress
} from '@mui/material';
import logo from './logo.png';
import HelpIcon from '@mui/icons-material/Help';
import InfoIcon from '@mui/icons-material/Info';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GroupIcon from '@mui/icons-material/Group';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SettingsIcon from '@mui/icons-material/Settings';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import IconButton from '@mui/material/IconButton';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AppLayout from './AppLayout';

function FacultiesInfo() {
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
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

  return (
    <AppLayout>
      <div className="dashboard">
        <div className="dashboard-content">
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
              Chọn Khoa/Ngành để xem danh sách giảng viên & CNBM
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
                        button
                        key={faculty}
                        onClick={() => navigate(`/faculty/${encodeURIComponent(faculty)}`)}
                      >
                        <ListItemText primary={faculty} />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            )}
          </Box>
        </div>
      </div>
    </AppLayout>
  );
}

export default FacultiesInfo;
