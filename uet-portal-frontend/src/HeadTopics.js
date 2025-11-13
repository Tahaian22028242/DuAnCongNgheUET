import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Alert, Drawer, List, ListItem, ListItemText
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

function HeadTopics() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [comments, setComments] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/head/topic-proposals', {
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) {
        setProposals(data);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Không thể tải danh sách đề tài.' });
    }
    setLoading(false);
  };

  const handleReview = async (status) => {
    try {
      const response = await fetch(`http://localhost:5000/head/review-topic/${selectedProposal._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, comments }),
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        fetchProposals();
        setDialogOpen(false);
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi khi xử lý đề xuất' });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
    navigate('/');
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
      </Drawer>
      <div className="dashboard-content">
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Đề tài chờ phê duyệt
          </Typography>
          {message.text && (
            <Alert severity={message.type} sx={{ mb: 2 }}>
              {message.text}
            </Alert>
          )}
          {loading ? (
            <Typography>Đang tải...</Typography>
          ) : proposals.length === 0 ? (
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography>Không có đề tài nào chờ phê duyệt.</Typography>
            </Paper>
          ) : (
            proposals.map((proposal) => (
              <Paper key={proposal._id} sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1">
                  Tên đề tài: {proposal.topicTitle}
                </Typography>
                <Typography>
                  Học viên: {proposal.studentName} ({proposal.studentId})
                </Typography>
                <Typography>
                  GVHD: {proposal.primarySupervisor}
                  {proposal.secondarySupervisor && `, ${proposal.secondarySupervisor}`}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => {
                      setSelectedProposal(proposal);
                      setDialogOpen(true);
                    }}
                    sx={{ mr: 1 }}
                  >
                    Xem chi tiết
                  </Button>
                </Box>
              </Paper>
            ))
          )}

          <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
            {selectedProposal && (
              <>
                <DialogTitle>Chi tiết đề xuất</DialogTitle>
                <DialogContent>
                  <Typography variant="h6">{selectedProposal.topicTitle}</Typography>
                  <Typography variant="body1" sx={{ mt: 2 }}>
                    {selectedProposal.content}
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Nhận xét"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    sx={{ mt: 2 }}
                  />
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => handleReview('returned')} color="error">
                    Trả lại
                  </Button>
                  <Button onClick={() => handleReview('approved_by_head')} color="primary">
                    Phê duyệt
                  </Button>
                </DialogActions>
              </>
            )}
          </Dialog>
        </Box>
      </div>
    </div>
  );
}

export default HeadTopics;