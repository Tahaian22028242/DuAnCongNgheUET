// // import React, { useState, useEffect } from 'react';
// // import { useNavigate } from 'react-router-dom';
// // import {
// //   Typography, Box, Paper, TextField, Button, Alert, 
// //   Drawer, List, ListItem, ListItemText, Autocomplete,
// //   Grid, CircularProgress
// // } from '@mui/material';
// // import SendIcon from '@mui/icons-material/Send';
// // import axios from 'axios';
// // import './Dashboard.css';
// // import logo from './logo.png';

// // function ProposeTopic() {
// //   const [formData, setFormData] = useState({
// //     topicTitle: '',
// //     content: '',
// //     primarySupervisor: null,
// //     secondarySupervisor: null
// //   });
// //   const [supervisors, setSupervisors] = useState([]);
// //   const [loading, setLoading] = useState(false);
// //   const [supervisorsLoading, setSupervisorsLoading] = useState(true);
// //   const [message, setMessage] = useState({ type: '', text: '' });
  
// //   const user = JSON.parse(localStorage.getItem('user') || '{}');
// //   const navigate = useNavigate();

// //   useEffect(() => {
// //     fetchSupervisors();
// //   }, []);

// //   const fetchSupervisors = async () => {
// //     try {
// //       const response = await axios.get('http://localhost:5000/supervisors', {
// //         withCredentials: true,
// //       });
// //       setSupervisors(response.data);
// //       setSupervisorsLoading(false);
// //     } catch (err) {
// //       console.error('Error fetching supervisors:', err);
// //       setMessage({ type: 'error', text: 'Không thể tải danh sách giảng viên.' });
// //       setSupervisorsLoading(false);
// //     }
// //   };

// //   const handleInputChange = (field, value) => {
// //     setFormData(prev => ({
// //       ...prev,
// //       [field]: value
// //     }));
// //   };

// //   const handleSubmit = async (e) => {
// //     e.preventDefault();
    
// //     // Validation
// //     if (!formData.topicTitle.trim()) {
// //       setMessage({ type: 'error', text: 'Vui lòng nhập tên đề tài.' });
// //       return;
// //     }
// //     if (!formData.content.trim()) {
// //       setMessage({ type: 'error', text: 'Vui lòng nhập nội dung đề tài.' });
// //       return;
// //     }
// //     if (!formData.primarySupervisor) {
// //       setMessage({ type: 'error', text: 'Vui lòng chọn giảng viên hướng dẫn chính.' });
// //       return;
// //     }

// //     setLoading(true);
// //     try {
// //       const proposalData = {
// //         topicTitle: formData.topicTitle.trim(),
// //         content: formData.content.trim(),
// //         primarySupervisor: formData.primarySupervisor.username,
// //         secondarySupervisor: formData.secondarySupervisor?.username || ''
// //       };

// //       const response = await axios.post(
// //         'http://localhost:5000/student/propose-topic',
// //         proposalData,
// //         { withCredentials: true }
// //       );

// //       setMessage({ type: 'success', text: 'Đề xuất đề tài thành công! Vui lòng chờ giảng viên phê duyệt.' });
      
// //       // Reset form
// //       setFormData({
// //         topicTitle: '',
// //         content: '',
// //         primarySupervisor: null,
// //         secondarySupervisor: null
// //       });
      
// //     } catch (err) {
// //       console.error('Error submitting proposal:', err);
// //       setMessage({ 
// //         type: 'error', 
// //         text: err.response?.data?.message || 'Có lỗi xảy ra khi gửi đề xuất.' 
// //       });
// //     }
// //     setLoading(false);
// //   };

// //   const handleLogout = () => {
// //     localStorage.removeItem('user');
// //     document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
// //     navigate('/');
// //   };

// //   return (
// //     <div className="dashboard">
// //       <Drawer variant="permanent" anchor="left">
// //         <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
// //           <img
// //             src={logo}
// //             alt="Logo"
// //             style={{ width: '80px', height: '80px', objectFit: 'contain', cursor: 'pointer' }}
// //             onClick={() => navigate('/dashboard')}
// //           />
// //         </Box>
// //         <List>
// //           <ListItem button onClick={() => navigate('/dashboard')}>
// //             <ListItemText primary="Dashboard" />
// //           </ListItem>
// //           <ListItem button onClick={() => navigate('/profile')}>
// //             <ListItemText primary="Account" />
// //           </ListItem>
// //           {(user.role === 'Quản trị viên' || user.role === 'Giảng viên' || user.role === 'Chủ nhiệm bộ môn') && (
// //             <ListItem button onClick={() => navigate('/batches')}>
// //               <ListItemText primary="Danh sách học viên" />
// //             </ListItem>
// //           )}
// //           {user.role === 'Quản trị viên' && (
// //             <>
// //               <ListItem button onClick={() => navigate('/upload')}>
// //                 <ListItemText primary="Tải lên danh sách" />
// //               </ListItem>
// //               <ListItem button onClick={() => navigate('/upload-heads')}>
// //                 <ListItemText primary="Tải lên CNBM" />
// //               </ListItem>
// //               <ListItem button onClick={() => navigate('/topic-proposals')}>
// //                 <ListItemText primary="Đề tài chưa được phê duyệt" />
// //               </ListItem>
// //             </>
// //           )}
// //           {user.role === 'Sinh viên' && (
// //             <ListItem button onClick={() => navigate('/propose-topic')}>
// //               <ListItemText primary="Đề xuất đề cương" />
// //             </ListItem>
// //           )}
// //           {user.role === 'Giảng viên' && (
// //             <ListItem button onClick={() => navigate('/topics')}>
// //               <ListItemText primary="Đề xuất từ học viên" />
// //             </ListItem>
// //           )}
// //           {user.role === 'Chủ nhiệm bộ môn' && (
// //             <ListItem button onClick={() => navigate('/head/topics')}>
// //               <ListItemText primary="Đề tài chờ phê duyệt" />
// //             </ListItem>
// //           )}
// //           <ListItem button onClick={() => navigate('/calendar')}>
// //             <ListItemText primary="Calendar" />
// //           </ListItem>
// //           <ListItem button onClick={() => navigate('/settings')}>
// //             <ListItemText primary="Setting" />
// //           </ListItem>
// //           <ListItem button onClick={() => navigate('/help')}>
// //             <ListItemText primary="Help" />
// //           </ListItem>
// //           <ListItem button onClick={() => navigate('/about')}>
// //             <ListItemText primary="Introduction" />
// //           </ListItem>
// //           <ListItem button onClick={() => navigate('/contact')}>
// //             <ListItemText primary="Contact" />
// //           </ListItem>
// //           <ListItem button onClick={handleLogout}>
// //             <ListItemText primary="Logout" />
// //           </ListItem>
// //         </List>
// //       </Drawer>

// //       <div className="dashboard-content">
// //         <Box sx={{ p: 3, maxWidth: 800 }}>
// //           <Typography variant="h4" gutterBottom>
// //             Đề xuất đề cương
// //           </Typography>

// //           {message.text && (
// //             <Alert severity={message.type} sx={{ mb: 3 }}>
// //               {message.text}
// //             </Alert>
// //           )}

// //           <Paper sx={{ p: 3 }}>
// //             <form onSubmit={handleSubmit}>
// //               <Grid container spacing={3}>
// //                 {/* Tên đề tài */}
// //                 <Grid item xs={12}>
// //                   <TextField
// //                     fullWidth
// //                     required
// //                     label="Tên đề tài"
// //                     variant="outlined"
// //                     value={formData.topicTitle}
// //                     onChange={(e) => handleInputChange('topicTitle', e.target.value)}
// //                     placeholder="Nhập tên đề tài của bạn..."
// //                   />
// //                 </Grid>

// //                 {/* Nội dung */}
// //                 <Grid item xs={12}>
// //                   <TextField
// //                     fullWidth
// //                     required
// //                     multiline
// //                     rows={8}
// //                     label="Nội dung đề tài"
// //                     variant="outlined"
// //                     value={formData.content}
// //                     onChange={(e) => handleInputChange('content', e.target.value)}
// //                     placeholder="Mô tả chi tiết về đề tài, mục tiêu, phương pháp thực hiện..."
// //                   />
// //                 </Grid>

// //                 {/* Giảng viên hướng dẫn chính */}
// //                 <Grid item xs={12}>
// //                   <Autocomplete
// //                     options={supervisors}
// //                     getOptionLabel={(option) => `${option.fullName} (${option.username})`}
// //                     value={formData.primarySupervisor}
// //                     onChange={(event, newValue) => {
// //                       handleInputChange('primarySupervisor', newValue);
// //                     }}
// //                     loading={supervisorsLoading}
// //                     renderInput={(params) => (
// //                       <TextField
// //                         {...params}
// //                         required
// //                         label="Giảng viên hướng dẫn chính"
// //                         variant="outlined"
// //                         placeholder="Tìm và chọn giảng viên..."
// //                         InputProps={{
// //                           ...params.InputProps,
// //                           endAdornment: (
// //                             <>
// //                               {supervisorsLoading ? <CircularProgress color="inherit" size={20} /> : null}
// //                               {params.InputProps.endAdornment}
// //                             </>
// //                           ),
// //                         }}
// //                       />
// //                     )}
// //                   />
// //                 </Grid>

// //                 {/* Giảng viên hướng dẫn phụ */}
// //                 <Grid item xs={12}>
// //                   <Autocomplete
// //                     options={supervisors}
// //                     getOptionLabel={(option) => `${option.fullName} (${option.username})`}
// //                     value={formData.secondarySupervisor}
// //                     onChange={(event, newValue) => {
// //                       handleInputChange('secondarySupervisor', newValue);
// //                     }}
// //                     loading={supervisorsLoading}
// //                     renderInput={(params) => (
// //                       <TextField
// //                         {...params}
// //                         label="Giảng viên hướng dẫn phụ (tùy chọn)"
// //                         variant="outlined"
// //                         placeholder="Tìm và chọn giảng viên..."
// //                         InputProps={{
// //                           ...params.InputProps,
// //                           endAdornment: (
// //                             <>
// //                               {supervisorsLoading ? <CircularProgress color="inherit" size={20} /> : null}
// //                               {params.InputProps.endAdornment}
// //                             </>
// //                           ),
// //                         }}
// //                       />
// //                     )}
// //                   />
// //                 </Grid>

// //                 {/* Submit button */}
// //                 <Grid item xs={12}>
// //                   <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
// //                     <Button
// //                       type="submit"
// //                       variant="contained"
// //                       size="large"
// //                       startIcon={<SendIcon />}
// //                       disabled={loading}
// //                     >
// //                       {loading ? 'Đang gửi...' : 'Gửi đề xuất'}
// //                     </Button>
// //                   </Box>
// //                 </Grid>
// //               </Grid>
// //             </form>
// //           </Paper>

// //           {/* Hướng dẫn */}
// //           <Paper sx={{ p: 3, mt: 3, bgcolor: '#f5f5f5' }}>
// //             <Typography variant="h6" gutterBottom>
// //               Hướng dẫn
// //             </Typography>
// //             <Typography variant="body2" component="div">
// //               <ul>
// //                 <li>Tên đề tài nên ngắn gọn, súc tích và thể hiện rõ nội dung nghiên cứu</li>
// //                 <li>Nội dung đề tài cần mô tả chi tiết về mục tiêu, phương pháp và kết quả mong đợi</li>
// //                 <li>Bắt buộc phải có giảng viên hướng dẫn chính</li>
// //                 <li>Giảng viên hướng dẫn phụ là tùy chọn</li>
// //                 <li>Sau khi gửi, đề xuất sẽ được chuyển đến giảng viên hướng dẫn để xem xét</li>
// //               </ul>
// //             </Typography>
// //           </Paper>
// //         </Box>
// //       </div>
// //     </div>
// //   );
// // }

// // export default ProposeTopic;

// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import {
//   Typography, Box, Paper, TextField, Button, Alert, 
//   Drawer, List, ListItem, ListItemText, Autocomplete,
//   Grid, CircularProgress
// } from '@mui/material';
// import SendIcon from '@mui/icons-material/Send';
// import axios from 'axios';
// import './Dashboard.css';
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

// function ProposeTopic() {
//   const [formData, setFormData] = useState({
//     topicTitle: '',
//     content: '',
//     primarySupervisor: null,
//     secondarySupervisor: null
//   });
//   const [supervisors, setSupervisors] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [supervisorsLoading, setSupervisorsLoading] = useState(true);
//   const [message, setMessage] = useState({ type: '', text: '' });
  
//   const user = JSON.parse(localStorage.getItem('user') || '{}');
//   const navigate = useNavigate();

//   useEffect(() => {
//     fetchSupervisors();
//   }, []);

//   const fetchSupervisors = async () => {
//     try {
//       const response = await axios.get('http://localhost:5000/supervisors', {
//         withCredentials: true,
//       });
//       setSupervisors(response.data);
//       setSupervisorsLoading(false);
//     } catch (err) {
//       console.error('Error fetching supervisors:', err);
//       setMessage({ type: 'error', text: 'Không thể tải danh sách giảng viên.' });
//       setSupervisorsLoading(false);
//     }
//   };

//   const handleInputChange = (field, value) => {
//     setFormData(prev => ({
//       ...prev,
//       [field]: value
//     }));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
    
//     // Validation
//     if (!formData.topicTitle.trim()) {
//       setMessage({ type: 'error', text: 'Vui lòng nhập tên đề tài.' });
//       return;
//     }
//     if (!formData.content.trim()) {
//       setMessage({ type: 'error', text: 'Vui lòng nhập nội dung đề tài.' });
//       return;
//     }
//     if (!formData.primarySupervisor) {
//       setMessage({ type: 'error', text: 'Vui lòng chọn giảng viên hướng dẫn chính.' });
//       return;
//     }

//     setLoading(true);
//     try {
//       const proposalData = {
//         topicTitle: formData.topicTitle.trim(),
//         content: formData.content.trim(),
//         primarySupervisor: formData.primarySupervisor.username,
//         secondarySupervisor: formData.secondarySupervisor?.username || ''
//       };

//       const response = await axios.post(
//         'http://localhost:5000/student/propose-topic',
//         proposalData,
//         { withCredentials: true }
//       );

//       setMessage({ type: 'success', text: 'Đề xuất đề tài thành công! Vui lòng chờ giảng viên phê duyệt.' });
      
//       // Reset form
//       setFormData({
//         topicTitle: '',
//         content: '',
//         primarySupervisor: null,
//         secondarySupervisor: null
//       });
      
//     } catch (err) {
//       console.error('Error submitting proposal:', err);
//       setMessage({ 
//         type: 'error', 
//         text: err.response?.data?.message || 'Có lỗi xảy ra khi gửi đề xuất.' 
//       });
//     }
//     setLoading(false);
//   };

//   const handleLogout = () => {
//     localStorage.removeItem('user');
//     document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
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
//         <Box sx={{ p: 3, maxWidth: 800 }}>
//           <Typography variant="h4" gutterBottom>
//             Đề xuất đề cương
//           </Typography>

//           {message.text && (
//             <Alert severity={message.type} sx={{ mb: 3 }}>
//               {message.text}
//             </Alert>
//           )}

//           <Paper sx={{ p: 3 }}>
//             <form onSubmit={handleSubmit}>
//               <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
//                 {/* Tên đề tài - Hàng 1 */}
//                 <TextField
//                   fullWidth
//                   required
//                   label="Tên đề tài"
//                   variant="outlined"
//                   value={formData.topicTitle}
//                   onChange={(e) => handleInputChange('topicTitle', e.target.value)}
//                   placeholder="Nhập tên đề tài của bạn..."
//                   sx={{ minHeight: '56px' }}
//                 />

//                 {/* Nội dung đề tài - Hàng 2 */}
//                 <TextField
//                   fullWidth
//                   required
//                   multiline
//                   rows={8}
//                   label="Nội dung đề tài"
//                   variant="outlined"
//                   value={formData.content}
//                   onChange={(e) => handleInputChange('content', e.target.value)}
//                   placeholder="Mô tả chi tiết về đề tài, mục tiêu, phương pháp thực hiện..."
//                 />

//                 {/* Giảng viên hướng dẫn chính - Hàng 3 */}
//                 <Autocomplete
//                   fullWidth
//                   options={supervisors}
//                   getOptionLabel={(option) => `${option.fullName} (${option.username})`}
//                   value={formData.primarySupervisor}
//                   onChange={(event, newValue) => {
//                     handleInputChange('primarySupervisor', newValue);
//                   }}
//                   loading={supervisorsLoading}
//                   renderInput={(params) => (
//                     <TextField
//                       {...params}
//                       required
//                       label="Giảng viên hướng dẫn chính"
//                       variant="outlined"
//                       placeholder="Tìm và chọn giảng viên..."
//                       sx={{ minHeight: '56px' }}
//                       InputProps={{
//                         ...params.InputProps,
//                         endAdornment: (
//                           <>
//                             {supervisorsLoading ? <CircularProgress color="inherit" size={20} /> : null}
//                             {params.InputProps.endAdornment}
//                           </>
//                         ),
//                       }}
//                     />
//                   )}
//                 />

//                 {/* Giảng viên hướng dẫn phụ - Hàng 4 */}
//                 <Autocomplete
//                   fullWidth
//                   options={supervisors}
//                   getOptionLabel={(option) => `${option.fullName} (${option.username})`}
//                   value={formData.secondarySupervisor}
//                   onChange={(event, newValue) => {
//                     handleInputChange('secondarySupervisor', newValue);
//                   }}
//                   loading={supervisorsLoading}
//                   renderInput={(params) => (
//                     <TextField
//                       {...params}
//                       label="Giảng viên hướng dẫn phụ (tùy chọn)"
//                       variant="outlined"
//                       placeholder="Tìm và chọn giảng viên..."
//                       sx={{ minHeight: '56px' }}
//                       InputProps={{
//                         ...params.InputProps,
//                         endAdornment: (
//                           <>
//                             {supervisorsLoading ? <CircularProgress color="inherit" size={20} /> : null}
//                             {params.InputProps.endAdornment}
//                           </>
//                         ),
//                       }}
//                     />
//                   )}
//                 />

//                 {/* Submit button */}
//                 <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
//                   <Button
//                     type="submit"
//                     variant="contained"
//                     size="large"
//                     startIcon={<SendIcon />}
//                     disabled={loading}
//                   >
//                     {loading ? 'Đang gửi...' : 'Gửi đề xuất'}
//                   </Button>
//                 </Box>
//               </Box>
//             </form>
//           </Paper>

//           {/* Hướng dẫn */}
//           <Paper sx={{ p: 3, mt: 3, bgcolor: '#f5f5f5' }}>
//             <Typography variant="h6" gutterBottom>
//               Hướng dẫn
//             </Typography>
//             <Typography variant="body2" component="div">
//               <ul>
//                 <li>Tên đề tài nên ngắn gọn, súc tích và thể hiện rõ nội dung nghiên cứu</li>
//                 <li>Nội dung đề tài cần mô tả chi tiết về mục tiêu, phương pháp và kết quả mong đợi</li>
//                 <li>Bắt buộc phải có giảng viên hướng dẫn chính</li>
//                 <li>Giảng viên hướng dẫn phụ là tùy chọn</li>
//                 <li>Sau khi gửi, đề xuất sẽ được chuyển đến giảng viên hướng dẫn để xem xét</li>
//               </ul>
//             </Typography>
//           </Paper>
//         </Box>
//       </div>
//     </div>
//   );
// }

// export default ProposeTopic;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Box, Paper, TextField, Button, Alert,
  Drawer, List, ListItem, ListItemText, Autocomplete,
  Grid, CircularProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import axios from 'axios';
import './Dashboard.css';
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
import App from './App';
import AppLayout from './AppLayout';

function ProposeTopic() {
  const [formData, setFormData] = useState({
    topicTitle: '',
    content: '',
    primarySupervisor: null,
    secondarySupervisor: null
  });
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [supervisorsLoading, setSupervisorsLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();

  useEffect(() => {
    fetchSupervisors();
  }, []);

  const fetchSupervisors = async () => {
    try {
      const response = await axios.get('http://localhost:5000/supervisors', {
        withCredentials: true,
      });
      setSupervisors(response.data);
      setSupervisorsLoading(false);
    } catch (err) {
      console.error('Error fetching supervisors:', err);
      setMessage({ type: 'error', text: 'Không thể tải danh sách giảng viên.' });
      setSupervisorsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.topicTitle.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập tên đề tài.' });
      return;
    }
    if (!formData.content.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập nội dung đề tài.' });
      return;
    }
    if (!formData.primarySupervisor) {
      setMessage({ type: 'error', text: 'Vui lòng chọn giảng viên hướng dẫn chính.' });
      return;
    }

    setLoading(true);
    try {
      const proposalData = {
        topicTitle: formData.topicTitle.trim(),
        content: formData.content.trim(),
        primarySupervisor: formData.primarySupervisor.username,
        secondarySupervisor: formData.secondarySupervisor?.username || ''
      };

      const response = await axios.post(
        'http://localhost:5000/student/propose-topic',
        proposalData,
        { withCredentials: true }
      );

      setMessage({ type: 'success', text: 'Đề xuất đề tài thành công! Vui lòng chờ giảng viên phê duyệt.' });

      // Reset form
      setFormData({
        topicTitle: '',
        content: '',
        primarySupervisor: null,
        secondarySupervisor: null
      });

    } catch (err) {
      console.error('Error submitting proposal:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Có lỗi xảy ra khi gửi đề xuất.'
      });
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
    navigate('/');
  };

  return (
    <AppLayout>
      <div className="dashboard">
        {/* <Drawer variant="permanent" anchor="left">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
          <img
            src={logo}
            alt="Logo"
            style={{ width: '80px', height: '80px', objectFit: 'contain', cursor: 'pointer' }}
            onClick={() => navigate('/dashboard')}
          />
        </Box>
        <List>
          <ListItem button onClick={() => navigate('/dashboard')}>
            <DashboardIcon sx={{ mr: 1 }} />
            <ListItemText primary="Dashboard" />
          </ListItem>
          <ListItem button onClick={() => navigate('/profile')}>
            <AccountCircleIcon sx={{ mr: 1 }} />
            <ListItemText primary="Account" />
          </ListItem>
          {(user.role === 'Quản trị viên' || user.role === 'Giảng viên' || user.role === 'Chủ nhiệm bộ môn') && (
            <ListItem button onClick={() => navigate('/batches')}>
              <GroupIcon sx={{ mr: 1 }} />
              <ListItemText primary="Danh sách học viên" />
            </ListItem>
          )}
          {user.role === 'Quản trị viên' && (
            <>
              <ListItem button onClick={() => navigate('/upload')}>
                <UploadFileIcon sx={{ mr: 1 }} />
                <ListItemText primary="Tải lên danh sách" />
              </ListItem>
              <ListItem button onClick={() => navigate('/upload-heads')}>
                <UploadFileIcon sx={{ mr: 1 }} />
                <ListItemText primary="Tải lên CNBM" />
              </ListItem>
              <ListItem button onClick={() => navigate('/upload-lecturers')}>
                <UploadFileIcon sx={{ mr: 1 }} />
                <ListItemText primary="Tải lên danh sách giảng viên" />
              </ListItem>
              <ListItem button onClick={() => navigate('/topic-proposals')}>
                <AssignmentIcon sx={{ mr: 1 }} />
                <ListItemText primary="Đề tài chưa được phê duyệt" />
              </ListItem>
            </>
          )}
          {user.role === 'Sinh viên' && (
            <>
              <ListItem button onClick={() => navigate('/propose-topic')}>
                <AssignmentIcon sx={{ mr: 1 }} />
                <ListItemText primary="Đề xuất đề cương" />
              </ListItem>
              <ListItem button onClick={() => navigate('/faculties-info')}>
                <InfoIcon sx={{ mr: 1 }} />
                <ListItemText primary="Thông tin" />
              </ListItem>
            </>
          )}
          {user.role === 'Giảng viên' && (
            <ListItem button onClick={() => navigate('/topics')}>
              <AssignmentIcon sx={{ mr: 1 }} />
              <ListItemText primary="Đề xuất từ học viên" />
            </ListItem>
          )}
          {user.role === 'Chủ nhiệm bộ môn' && (
            <ListItem button onClick={() => navigate('/head/topics')}>
              <AssignmentIcon sx={{ mr: 1 }} />
              <ListItemText primary="Đề tài chờ phê duyệt" />
            </ListItem>
          )}
          {user.role === 'Chủ nhiệm bộ môn' && (
            <ListItem button onClick={() => navigate('/head/statistics')}>
              <GroupIcon sx={{ mr: 1 }} />
              <ListItemText primary="Thống kê học viên" />
            </ListItem>
          )}
          <ListItem button onClick={() => navigate('/calendar')}>
            <CalendarMonthIcon sx={{ mr: 1 }} />
            <ListItemText primary="Calendar" />
          </ListItem>
          <ListItem button onClick={() => navigate('/settings')}>
            <SettingsIcon sx={{ mr: 1 }} />
            <ListItemText primary="Setting" />
          </ListItem>
          <ListItem button onClick={() => navigate('/help')}>
            <HelpIcon sx={{ mr: 1 }} />
            <ListItemText primary="Help" />
          </ListItem>
          <ListItem button onClick={() => navigate('/about')}>
            <InfoIcon sx={{ mr: 1 }} />
            <ListItemText primary="Introduction" />
          </ListItem>
          <ListItem button onClick={() => navigate('/contact')}>
            <ContactMailIcon sx={{ mr: 1 }} />
            <ListItemText primary="Contact" />
          </ListItem>
          <ListItem button onClick={handleLogout}>
            <ExitToAppIcon sx={{ mr: 1 }} />
            <ListItemText primary="Logout" />
          </ListItem>
        </List>
      </Drawer> */}
        <div className="dashboard-content">
          <Box sx={{ p: 3, maxWidth: 800 }}>
            <Typography variant="h4" gutterBottom>
              Đề xuất đề cương
            </Typography>

            {message.text && (
              <Alert severity={message.type} sx={{ mb: 3 }}>
                {message.text}
              </Alert>
            )}

            <Paper sx={{ p: 3 }}>
              <form onSubmit={handleSubmit}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {/* Tên đề tài - Hàng 1 */}
                  <TextField
                    fullWidth
                    required
                    label="Tên đề tài"
                    variant="outlined"
                    value={formData.topicTitle}
                    onChange={(e) => handleInputChange('topicTitle', e.target.value)}
                    placeholder="Nhập tên đề tài của bạn..."
                    sx={{ minHeight: '56px' }}
                  />

                  {/* Nội dung đề tài - Hàng 2 */}
                  <TextField
                    fullWidth
                    required
                    multiline
                    rows={8}
                    label="Nội dung đề tài"
                    variant="outlined"
                    value={formData.content}
                    onChange={(e) => handleInputChange('content', e.target.value)}
                    placeholder="Mô tả chi tiết về đề tài, mục tiêu, phương pháp thực hiện..."
                  />

                  {/* Giảng viên hướng dẫn chính - Hàng 3 */}
                  <Autocomplete
                    fullWidth
                    options={supervisors}
                    getOptionLabel={(option) => `${option.fullName} (${option.username})`}
                    value={formData.primarySupervisor}
                    onChange={(event, newValue) => {
                      handleInputChange('primarySupervisor', newValue);
                    }}
                    loading={supervisorsLoading}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        required
                        label="Giảng viên hướng dẫn chính"
                        variant="outlined"
                        placeholder="Tìm và chọn giảng viên..."
                        sx={{ minHeight: '56px' }}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {supervisorsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />

                  {/* Giảng viên hướng dẫn phụ - Hàng 4 */}
                  <Autocomplete
                    fullWidth
                    options={supervisors}
                    getOptionLabel={(option) => `${option.fullName} (${option.username})`}
                    value={formData.secondarySupervisor}
                    onChange={(event, newValue) => {
                      handleInputChange('secondarySupervisor', newValue);
                    }}
                    loading={supervisorsLoading}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Giảng viên hướng dẫn phụ (tùy chọn)"
                        variant="outlined"
                        placeholder="Tìm và chọn giảng viên..."
                        sx={{ minHeight: '56px' }}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {supervisorsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />

                  {/* Submit button */}
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      startIcon={<SendIcon />}
                      disabled={loading}
                    >
                      {loading ? 'Đang gửi...' : 'Gửi đề xuất'}
                    </Button>
                  </Box>
                </Box>
              </form>
            </Paper>

            {/* Hướng dẫn */}
            <Paper sx={{ p: 3, mt: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom>
                Hướng dẫn
              </Typography>
              <Typography variant="body2" component="div">
                <ul>
                  <li>Tên đề tài nên ngắn gọn, súc tích và thể hiện rõ nội dung nghiên cứu</li>
                  <li>Nội dung đề tài cần mô tả chi tiết về mục tiêu, phương pháp và kết quả mong đợi</li>
                  <li>Bắt buộc phải có giảng viên hướng dẫn chính</li>
                  <li>Giảng viên hướng dẫn phụ là tùy chọn</li>
                  <li>Sau khi gửi, đề xuất sẽ được chuyển đến giảng viên hướng dẫn để xem xét</li>
                </ul>
              </Typography>
            </Paper>
          </Box>
        </div>
      </div>
    </AppLayout>
  );
}

export default ProposeTopic;