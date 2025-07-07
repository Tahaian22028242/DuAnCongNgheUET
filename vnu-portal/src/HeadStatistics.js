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
      case 'waiting_head_approval': return 'Chờ CNBM phê duyệt';
      case 'approved_by_head': return 'Đã được CNBM phê duyệt';
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
                  Chờ CNBM duyệt
                </Typography>
                <Typography variant="h6" color="warning.main">
                  {statistics?.topicsByStatus?.waiting_head_approval || 0}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Đã được CNBM duyệt
                </Typography>
                <Typography variant="h6" color="success.main">
                  {statistics?.topicsByStatus?.approved_by_head || 0}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Danh sách học viên và đề tài */}
        <Typography variant="h6" gutterBottom>
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
            
            {students.map((student, index) => (
              <Accordion key={student.studentId} sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6">
                        {student.fullName} ({student.studentId})
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Ngành: {student.major}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={`${student.topics.length} đề tài`}
                        color={student.topics.length > 0 ? 'primary' : 'default'}
                        size="small"
                      />
                    </Box>
                  </Box>
                </AccordionSummary>
                
                <AccordionDetails>
                  {student.topics.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Học viên chưa có đề tài nào.
                    </Typography>
                  ) : (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Danh sách đề tài:
                      </Typography>
                      {student.topics.map((topic, topicIndex) => (
                        <Paper key={topic._id} sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                              {topic.topicTitle}
                            </Typography>
                            <Chip
                              icon={getStatusIcon(topic.status)}
                              label={getStatusText(topic.status)}
                              color={getStatusColor(topic.status)}
                              size="small"
                            />
                          </Box>
                          
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Nội dung:</strong> {topic.content}
                          </Typography>
                          
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>GVHD chính:</strong> {topic.primarySupervisor}
                          </Typography>
                          
                          {topic.secondarySupervisor && (
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>GVHD phụ:</strong> {topic.secondarySupervisor}
                            </Typography>
                          )}
                          
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Ngày gửi:</strong> {formatDate(topic.submittedAt)}
                          </Typography>
                          
                          {topic.supervisorComments && (
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>Nhận xét GVHD:</strong> {topic.supervisorComments}
                            </Typography>
                          )}
                          
                          {topic.headComments && (
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>Nhận xét CNBM:</strong> {topic.headComments}
                            </Typography>
                          )}
                        </Paper>
                      ))}
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </>
        )}
      </Box>
    );
  };

  return (
    <div className="dashboard">
      <Drawer variant="permanent" anchor="left">
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
            <ListItemText primary="Dashboard" />
          </ListItem>
          <ListItem button onClick={() => navigate('/profile')}>
            <ListItemText primary="Account" />
          </ListItem>
          {(user.role === 'Quản trị viên' || user.role === 'Giảng viên' || user.role === 'Chủ nhiệm bộ môn') && (
            <ListItem button onClick={() => navigate('/batches')}>
              <ListItemText primary="Danh sách học viên" />
            </ListItem>
          )}
          {user.role === 'Quản trị viên' && (
            <>
              <ListItem button onClick={() => navigate('/upload')}>
                <ListItemText primary="Tải lên danh sách" />
              </ListItem>
              <ListItem button onClick={() => navigate('/upload-heads')}>
                <ListItemText primary="Tải lên CNBM" />
              </ListItem>
            </>
          )}
          {user.role === 'Sinh viên' && (
            <ListItem button onClick={() => navigate('/propose-topic')}>
              <ListItemText primary="Đề xuất đề cương" />
            </ListItem>
          )}
          {user.role === 'Giảng viên' && (
            <ListItem button onClick={() => navigate('/topics')}>
              <ListItemText primary="Đề xuất từ học viên" />
            </ListItem>
          )}
          {user.role === 'Chủ nhiệm bộ môn' && (
            <>
              <ListItem button onClick={() => navigate('/head/topics')}>
                <ListItemText primary="Đề tài chờ phê duyệt" />
              </ListItem>
              <ListItem button onClick={() => navigate('/head/statistics')}>
                <ListItemText primary="Thống kê học viên" />
              </ListItem>
            </>
          )}
          <ListItem button onClick={() => navigate('/calendar')}>
            <ListItemText primary="Calendar" />
          </ListItem>
          <ListItem button onClick={() => navigate('/settings')}>
            <ListItemText primary="Setting" />
          </ListItem>
          <ListItem button onClick={() => navigate('/help')}>
            <ListItemText primary="Help" />
          </ListItem>
          <ListItem button onClick={() => navigate('/about')}>
            <ListItemText primary="Introduction" />
          </ListItem>
          <ListItem button onClick={() => navigate('/contact')}>
            <ListItemText primary="Contact" />
          </ListItem>
          <ListItem button onClick={handleLogout}>
            <ListItemText primary="Logout" />
          </ListItem>
        </List>
      </Drawer>
      <div className="dashboard-content">
        {content()}
      </div>
    </div>
  );
}

export default HeadStatistics;