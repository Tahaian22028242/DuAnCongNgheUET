import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Alert, Chip, CircularProgress,
  Drawer, List, ListItem, ListItemText, Accordion, AccordionSummary,
  AccordionDetails, Grid, Autocomplete
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
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

function SupervisorTopics() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [reviewData, setReviewData] = useState({
    status: '',
    comments: '',
    topicTitle: '',
    content: '',
    secondarySupervisor: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [lecturers, setLecturers] = useState([]); // Danh sách giảng viên
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProposals();
    fetchLecturers();
  }, []);

  const fetchProposals = async () => {
    try {
      const response = await axios.get('http://localhost:5000/supervisor/topic-proposals', {
        withCredentials: true,
      });
      setProposals(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching proposals:', err);
      if (err.response?.status === 403) {
        setError('Bạn không có quyền truy cập chức năng này.');
      } else {
        setError('Không thể tải danh sách đề xuất. Vui lòng thử lại sau.');
      }
      setLoading(false);
    }
  };

  const fetchLecturers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/lecturers', {
        withCredentials: true,
      });
      setLecturers(response.data);
    } catch (err) {
      console.error('Error fetching lecturers:', err);
    }
  };

  const handleReview = (proposal, status) => {
    setSelectedProposal(proposal);
    setReviewData({
      status: status,
      comments: '',
      topicTitle: proposal.topicTitle,
      content: proposal.content,
      secondarySupervisor: proposal.secondarySupervisor || ''
    });
    setReviewDialog(true);
  };

  const handleSubmitReview = async () => {
    if (!reviewData.comments.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập nhận xét.' });
      return;
    }
    setSubmitting(true);
    try {
      await axios.put(`http://localhost:5000/supervisor/review-topic/${selectedProposal._id}`, {
        status: reviewData.status,
        comments: reviewData.comments.trim(),
        topicTitle: reviewData.topicTitle.trim(),
        content: reviewData.content.trim(),
        secondarySupervisor: reviewData.secondarySupervisor
      }, {
        withCredentials: true
      });
      setMessage({
        type: 'success',
        text: `Đề tài đã được ${reviewData.status === 'approved' ? 'phê duyệt' : 'từ chối'}`
      });
      setReviewDialog(false);
      fetchProposals(); // Refresh data
    } catch (err) {
      console.error('Error submitting review:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Có lỗi xảy ra khi xử lý đề xuất.'
      });
    }
    setSubmitting(false);
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
      case 'waiting_head_approval': return 'info';
      case 'approved_by_head': return 'success';
      default: return 'warning';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return 'Đã phê duyệt';
      case 'rejected': return 'Đã từ chối';
      case 'waiting_head_approval': return 'Chờ LĐBM phê duyệt';
      case 'approved_by_head': return 'LĐBM đã phê duyệt';
      case 'waiting_faculty_leader_approval': return 'Chờ Lãnh đạo khoa';
      case 'approved_by_faculty_leader': return 'Lãnh đạo khoa đã phê duyệt';
      case 'rejected_by_head': return 'LĐBM từ chối';
      case 'rejected_by_faculty_leader': return 'Lãnh đạo khoa từ chối';
      default: return 'Chờ xử lý';
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
          Đề xuất từ học viên
        </Typography>

        {message.text && (
          <Alert severity={message.type} sx={{ mb: 3 }}>
            {message.text}
          </Alert>
        )}

        {proposals.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              Hiện chưa có đề xuất nào từ học viên.
            </Typography>
          </Paper>
        ) : (
          <>
            <Typography variant="subtitle1" sx={{ mb: 2, color: 'text.secondary' }}>
              Tổng cộng: {proposals.length} đề xuất
            </Typography>

            {proposals.map((proposal) => (
              <Accordion key={proposal._id} sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6">{proposal.topicTitle}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Học viên: {proposal.studentName} ({proposal.studentId})
                      </Typography>
                      {proposal.studentFaculty && (
                        <Typography variant="body2" color="text.secondary">
                          Khoa: {proposal.studentFaculty} | Ngành: {proposal.studentMajor}
                        </Typography>
                      )}
                    </Box>
                    <Chip
                      label={getStatusText(proposal.status)}
                      color={getStatusColor(proposal.status)}
                      size="small"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                      <Typography variant="subtitle2" gutterBottom>
                        <strong>Học viên:</strong> {proposal.studentName} ({proposal.studentId})
                      </Typography>
                      <Typography variant="subtitle2" gutterBottom>
                        <strong>Khoa:</strong> {proposal.studentFaculty || 'N/A'}
                      </Typography>
                      <Typography variant="subtitle2" gutterBottom>
                        <strong>Ngành:</strong> {proposal.studentMajor || 'N/A'}
                      </Typography>
                      <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
                        <strong>Ngày gửi:</strong> {formatDate(proposal.submittedAt)}
                      </Typography>

                      <Typography variant="subtitle1" gutterBottom>
                        <strong>Nội dung đề tài:</strong>
                      </Typography>
                      <Paper sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {proposal.content}
                        </Typography>
                      </Paper>

                      <Typography variant="subtitle2" gutterBottom>
                        <strong>Giảng viên hướng dẫn chính:</strong> {proposal.primarySupervisorName || proposal.primarySupervisor}
                      </Typography>
                      {proposal.secondarySupervisor && (
                        <Typography variant="subtitle2" gutterBottom>
                          <strong>Giảng viên hướng dẫn phụ:</strong> {proposal.secondarySupervisorName || proposal.secondarySupervisor}
                        </Typography>
                      )}

                      {proposal.supervisorComments && (
                        <>
                          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                            <strong>Nhận xét của giảng viên:</strong>
                          </Typography>
                          <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
                            <Typography variant="body2">
                              {proposal.supervisorComments}
                            </Typography>
                          </Paper>
                          {proposal.reviewedAt && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                              Đánh giá lúc: {formatDate(proposal.reviewedAt)}
                            </Typography>
                          )}
                        </>
                      )}
                    </Grid>

                    <Grid item xs={12} md={4}>
                      {/* Kiểm tra xem user có phải là GVHD chính không */}
                      {proposal.primarySupervisor === user.username ? (
                        <>
                          {proposal.status === 'pending' && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <Alert severity="info" sx={{ mb: 1 }}>
                                Bạn là GVHD chính - có quyền phê duyệt/chỉnh sửa
                              </Alert>
                              <Button
                                variant="contained"
                                color="success"
                                startIcon={<CheckIcon />}
                                onClick={() => handleReview(proposal, 'approved')}
                                fullWidth
                              >
                                Phê duyệt
                              </Button>
                              <Button
                                variant="contained"
                                color="error"
                                startIcon={<CloseIcon />}
                                onClick={() => handleReview(proposal, 'rejected')}
                                fullWidth
                              >
                                Từ chối
                              </Button>
                            </Box>
                          )}
                          {proposal.status !== 'pending' && !['rejected', 'rejected_by_head', 'rejected_by_faculty_leader'].includes(proposal.status) && (
                            <Box>
                              <Alert severity="info" sx={{ mb: 1 }}>
                                Bạn là GVHD chính - có quyền chỉnh sửa
                              </Alert>
                              <Button
                                variant="outlined"
                                startIcon={<EditIcon />}
                                onClick={() => handleReview(proposal, proposal.status)}
                                fullWidth
                              >
                                Chỉnh sửa đánh giá
                              </Button>
                            </Box>
                          )}
                        </>
                      ) : (
                        <Alert severity="warning">
                          Bạn là GVHD phụ - chỉ có quyền xem, không thể chỉnh sửa
                        </Alert>
                      )}
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
          </>
        )}

        {/* Review Dialog */}
        <Dialog open={reviewDialog} onClose={() => setReviewDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {reviewData.status === 'approved' ? 'Phê duyệt đề tài' : 'Từ chối đề tài'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Tên đề tài"
                variant="outlined"
                value={reviewData.topicTitle}
                onChange={(e) => setReviewData(prev => ({ ...prev, topicTitle: e.target.value }))}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Nội dung đề tài"
                variant="outlined"
                value={reviewData.content}
                onChange={(e) => setReviewData(prev => ({ ...prev, content: e.target.value }))}
                sx={{ mb: 2 }}
              />
              <Autocomplete
                options={lecturers}
                getOptionLabel={(option) => `${option.fullName} (${option.username})`}
                value={lecturers.find(l => l.username === reviewData.secondarySupervisor) || null}
                onChange={(event, newValue) => {
                  setReviewData(prev => ({ 
                    ...prev, 
                    secondarySupervisor: newValue ? newValue.username : '' 
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Giảng viên đồng hướng dẫn"
                    variant="outlined"
                    placeholder="Chọn giảng viên đồng hướng dẫn (không bắt buộc)"
                  />
                )}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                required
                multiline
                rows={3}
                label="Nhận xét của giảng viên"
                variant="outlined"
                value={reviewData.comments}
                onChange={(e) => setReviewData(prev => ({ ...prev, comments: e.target.value }))}
                placeholder="Nhập nhận xét về đề xuất này..."
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReviewDialog(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleSubmitReview}
              variant="contained"
              disabled={submitting}
              color={reviewData.status === 'approved' ? 'success' : 'error'}
            >
              {submitting ? 'Đang xử lý...' : (reviewData.status === 'approved' ? 'Phê duyệt' : 'Từ chối')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };

  return (
    <AppLayout>
      <div className="dashboard">

        <div className="dashboard-content">
          {content()}
        </div>
      </div>
    </AppLayout>
  );
}

export default SupervisorTopics;