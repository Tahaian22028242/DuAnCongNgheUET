import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Alert, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow
} from '@mui/material';
import AppLayout from './AppLayout';

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

  const getStatusText = (status) => {
    switch(status) {
      case 'pending': return 'Đang chờ GVHD';
      case 'waiting_head_approval': return 'Đang chờ LĐBM';
      case 'waiting_faculty_leader_approval': return 'Đang chờ Lãnh đạo khoa';
      default: return status;
    }
  };

  return (
    <AppLayout>
      <div className="dashboard-content">
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Đề tài chờ phê duyệt (Lãnh đạo bộ môn)
          </Typography>
          
          {message.text && (
            <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
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
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell><strong>STT</strong></TableCell>
                    <TableCell><strong>Tên đề tài</strong></TableCell>
                    <TableCell><strong>Học viên</strong></TableCell>
                    <TableCell><strong>Mã HV</strong></TableCell>
                    <TableCell><strong>Khoa</strong></TableCell>
                    <TableCell><strong>Ngành</strong></TableCell>
                    <TableCell><strong>GVHD chính</strong></TableCell>
                    <TableCell><strong>GVHD phụ</strong></TableCell>
                    <TableCell><strong>Trạng thái</strong></TableCell>
                    <TableCell><strong>Hành động</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {proposals.map((p, idx) => (
                    <TableRow key={p._id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{p.topicTitle}</TableCell>
                      <TableCell>{p.studentName}</TableCell>
                      <TableCell>{p.studentId}</TableCell>
                      <TableCell>{p.studentFaculty}</TableCell>
                      <TableCell>{p.studentMajor}</TableCell>
                      <TableCell>{p.primarySupervisorName || p.primarySupervisor}</TableCell>
                      <TableCell>{p.secondarySupervisorName || p.secondarySupervisor || '-'}</TableCell>
                      <TableCell>{getStatusText(p.status)}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={() => {
                            setSelectedProposal(p);
                            setComments('');
                            setDialogOpen(true);
                          }}
                        >
                          Xem & Duyệt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
            {selectedProposal && (
              <>
                <DialogTitle>Chi tiết đề cương</DialogTitle>
                <DialogContent>
                  <Typography variant="h6" gutterBottom>{selectedProposal.topicTitle}</Typography>
                  <Typography><strong>Học viên:</strong> {selectedProposal.studentName} ({selectedProposal.studentId})</Typography>
                  <Typography><strong>Khoa:</strong> {selectedProposal.studentFaculty}</Typography>
                  <Typography><strong>Ngành:</strong> {selectedProposal.studentMajor}</Typography>
                  <Typography><strong>GVHD chính:</strong> {selectedProposal.primarySupervisorName || selectedProposal.primarySupervisor}</Typography>
                  {selectedProposal.secondarySupervisor && (
                    <Typography><strong>GVHD phụ:</strong> {selectedProposal.secondarySupervisorName || selectedProposal.secondarySupervisor}</Typography>
                  )}
                  <Typography sx={{ mt: 2 }}><strong>Nội dung:</strong></Typography>
                  <Typography variant="body1" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                    {selectedProposal.content}
                  </Typography>
                  {selectedProposal.supervisorComments && (
                    <>
                      <Typography sx={{ mt: 2 }}><strong>Nhận xét của GVHD:</strong></Typography>
                      <Typography sx={{ mt: 1 }}>{selectedProposal.supervisorComments}</Typography>
                    </>
                  )}
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Nhận xét của bạn *"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    sx={{ mt: 2 }}
                    required
                  />
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setDialogOpen(false)}>Hủy</Button>
                  <Button onClick={() => handleReview('rejected')} color="error" variant="outlined">
                    Từ chối
                  </Button>
                  <Button onClick={() => handleReview('approved')} color="primary" variant="contained">
                    Phê duyệt
                  </Button>
                </DialogActions>
              </>
            )}
          </Dialog>
        </Box>
      </div>
    </AppLayout>
  );
}

export default HeadTopics;