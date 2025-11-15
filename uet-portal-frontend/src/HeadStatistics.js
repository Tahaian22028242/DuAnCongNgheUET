import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Alert, Chip, Card, CardContent,
  Grid, Accordion, AccordionSummary, AccordionDetails, Drawer, List,
  ListItem, ListItemText, Divider
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonIcon from '@mui/icons-material/Person';
import TopicIcon from '@mui/icons-material/Topic';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CancelIcon from '@mui/icons-material/Cancel';
import axios from 'axios';
import { format } from 'date-fns';
import './Dashboard.css';
import logo from './logo.png';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import GroupIcon from '@mui/icons-material/Group';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpIcon from '@mui/icons-material/Help';
import InfoIcon from '@mui/icons-material/Info';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import AppLayout from './AppLayout';


function HeadStatistics() {
  const [statistics, setStatistics] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [major, setMajor] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const response = await axios.get('http://localhost:5000/head/students-statistics', {
        withCredentials: true,
      });

      setStatistics(response.data.statistics);
      setStudents(response.data.students);
      setMajor(response.data.major);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching statistics:', err);
      if (err.response?.status === 403) {
        setError('Bạn không có quyền truy cập chức năng này.');
      } else {
        setError('Không thể tải thống kê. Vui lòng thử lại sau.');
      }
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy HH:mm');
    } catch (error) {
      return 'N/A';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'waiting_head_approval': return 'warning';
      case 'approved_by_head': return 'success';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return 'Đã phê duyệt';
      case 'rejected': return 'Đã từ chối';
      case 'waiting_head_approval': return 'Chờ LĐBM phê duyệt';
      case 'approved_by_head': return 'Đã được LĐBM phê duyệt';
      default: return 'Chờ xử lý';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
      case 'approved_by_head':
        return <CheckCircleIcon fontSize="small" />;
      case 'rejected':
        return <CancelIcon fontSize="small" />;
      case 'waiting_head_approval':
      case 'pending':
        return <HourglassEmptyIcon fontSize="small" />;
      default:
        return <HourglassEmptyIcon fontSize="small" />;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    navigate('/');
  };

  const content = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      );
    }

    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Thống kê học viên ngành {major}
        </Typography>

        {/* Thống kê tổng quan */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PersonIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Tổng học viên</Typography>
                </Box>
                <Typography variant="h4" color="primary">
                  {statistics?.totalStudents || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TopicIcon color="secondary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Học viên có đề tài</Typography>
                </Box>
                <Typography variant="h4" color="secondary">
                  {statistics?.studentsWithTopics || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TopicIcon color="info" sx={{ mr: 1 }} />
                  <Typography variant="h6">Tổng đề tài</Typography>
                </Box>
                <Typography variant="h4" color="info">
                  {statistics?.totalTopics || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <HourglassEmptyIcon color="warning" sx={{ mr: 1 }} />
                  <Typography variant="h6">Chờ phê duyệt</Typography>
                </Box>
                <Typography variant="h4" color="warning">
                  {statistics?.topicsByStatus?.waiting_head_approval || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Thống kê theo trạng thái */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Thống kê đề tài theo trạng thái
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={2}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Chờ xử lý
                </Typography>
                <Typography variant="h6">
                  {statistics?.topicsByStatus?.pending || 0}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={2}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Đã phê duyệt
                </Typography>
                <Typography variant="h6" color="success.main">
                  {statistics?.topicsByStatus?.approved || 0}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={2}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Đã từ chối
                </Typography>
                <Typography variant="h6" color="error.main">
                  {statistics?.topicsByStatus?.rejected || 0}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Chờ LĐBM duyệt
                </Typography>
                <Typography variant="h6" color="warning.main">
                  {statistics?.topicsByStatus?.waiting_head_approval || 0}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Đã được LĐBM duyệt
                </Typography>
                <Typography variant="h6" color="success.main">
                  {statistics?.topicsByStatus?.approved_by_head || 0}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Danh sách học viên và đề tài */}
        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          Danh sách học viên và đề tài
        </Typography>

        {students.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              Hiện chưa có học viên nào trong ngành {major}.
            </Typography>
          </Paper>
        ) : (
          <>
            <Typography variant="subtitle1" sx={{ mb: 2, color: 'text.secondary' }}>
              Tổng cộng: {students.length} học viên
            </Typography>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell><strong>STT</strong></TableCell>
                    <TableCell><strong>Tên đề tài</strong></TableCell>
                    <TableCell><strong>Học viên</strong></TableCell>
                    <TableCell><strong>Mã HV</strong></TableCell>
                    <TableCell><strong>Khoa</strong></TableCell>
                    <TableCell><strong>Ngành</strong></TableCell>
                    <TableCell><strong>GVHD chính</strong></TableCell>
                    <TableCell><strong>GVHD phụ</strong></TableCell>
                    <TableCell><strong>Trạng thái</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.flatMap((student, studentIndex) => 
                    student.topics.map((topic, topicIndex) => (
                      <TableRow key={`${student.studentId}-${topic._id}`} hover>
                        <TableCell>{studentIndex + topicIndex + 1}</TableCell>
                        <TableCell>{topic.topicTitle}</TableCell>
                        <TableCell>{student.fullName}</TableCell>
                        <TableCell>{student.studentId}</TableCell>
                        <TableCell>{student.faculty || topic.studentFaculty || 'N/A'}</TableCell>
                        <TableCell>{student.major}</TableCell>
                        <TableCell>{topic.primarySupervisorName || topic.primarySupervisor}</TableCell>
                        <TableCell>{topic.secondarySupervisorName || topic.secondarySupervisor || 'N/A'}</TableCell>
                        <TableCell>
                          <Chip
                            icon={getStatusIcon(topic.status)}
                            label={getStatusText(topic.status)}
                            color={getStatusColor(topic.status)}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Box>
    );
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
          {(user.role === 'Quản trị viên' || user.role === 'Giảng viên' || user.role === 'Lãnh đạo bộ môn' || user.role === 'Chủ nhiệm bộ môn') && (
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
                <ListItemText primary="Tải lên Lãnh đạo bộ môn" />
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
          {(user.role === 'Lãnh đạo bộ môn' || user.role === 'Chủ nhiệm bộ môn') && (
            <ListItem button onClick={() => navigate('/head/topics')}>
              <AssignmentIcon sx={{ mr: 1 }} />
              <ListItemText primary="Đề tài chờ phê duyệt" />
            </ListItem>
          )}
          {(user.role === 'Lãnh đạo bộ môn' || user.role === 'Chủ nhiệm bộ môn') && (
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
          {content()}
        </div>
      </div>

    </AppLayout>
  );
}

export default HeadStatistics;