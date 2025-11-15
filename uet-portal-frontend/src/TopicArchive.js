import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Alert, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Button
} from '@mui/material';
import axios from 'axios';
import { format } from 'date-fns';
import AppLayout from './AppLayout';

function TopicArchive() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      let endpoint = '';
      if (user.role === 'Sinh viên') {
        endpoint = 'http://localhost:5000/student/topic-proposals-archive';
      } else if (user.role === 'Giảng viên') {
        endpoint = 'http://localhost:5000/supervisor/topic-proposals-archive';
      } else {
        setError('Bạn không có quyền truy cập chức năng này.');
        setLoading(false);
        return;
      }

      const response = await axios.get(endpoint, {
        withCredentials: true,
      });

      setProposals(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching proposals:', err);
      if (err.response?.status === 403) {
        setError('Bạn không có quyền truy cập chức năng này.');
      } else {
        setError('Không thể tải danh sách đề tài. Vui lòng thử lại sau.');
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
      case 'approved':
      case 'approved_by_head':
      case 'approved_by_faculty_leader':
        return 'success';
      case 'rejected':
      case 'rejected_by_head':
      case 'rejected_by_faculty_leader':
        return 'error';
      case 'waiting_head_approval':
      case 'waiting_faculty_leader_approval':
        return 'warning';
      case 'pending':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Chờ GVHD xử lý';
      case 'approved':
        return 'GVHD đã phê duyệt';
      case 'rejected':
        return 'GVHD từ chối';
      case 'waiting_head_approval':
        return 'Chờ LĐBM phê duyệt';
      case 'approved_by_head':
        return 'LĐBM đã phê duyệt';
      case 'rejected_by_head':
        return 'LĐBM từ chối';
      case 'waiting_faculty_leader_approval':
        return 'Chờ Lãnh đạo khoa';
      case 'approved_by_faculty_leader':
        return 'Lãnh đạo khoa đã phê duyệt';
      case 'rejected_by_faculty_leader':
        return 'Lãnh đạo khoa từ chối';
      default:
        return 'Chờ xử lý';
    }
  };

  const handleViewDetail = (proposal) => {
    setSelectedProposal(proposal);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedProposal(null);
  };

  if (loading) {
    return (
      <AppLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
          <CircularProgress />
        </Box>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Lưu trữ đề cương
        </Typography>

        {proposals.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              {user.role === 'Sinh viên' 
                ? 'Bạn chưa có đề tài nào.' 
                : 'Chưa có đề tài nào được gửi đến bạn.'}
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell><strong>STT</strong></TableCell>
                  {user.role === 'Giảng viên' && (
                    <>
                      <TableCell><strong>Mã HV</strong></TableCell>
                      <TableCell><strong>Học viên</strong></TableCell>
                    </>
                  )}
                  <TableCell><strong>Tên đề tài</strong></TableCell>
                  <TableCell><strong>GVHD chính</strong></TableCell>
                  <TableCell><strong>GVHD phụ</strong></TableCell>
                  <TableCell><strong>Trạng thái</strong></TableCell>
                  <TableCell><strong>Hành động</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {proposals.map((proposal, index) => (
                  <TableRow key={proposal._id} hover>
                    <TableCell>{index + 1}</TableCell>
                    {user.role === 'Giảng viên' && (
                      <>
                        <TableCell>{proposal.studentId}</TableCell>
                        <TableCell>{proposal.studentName}</TableCell>
                      </>
                    )}
                    <TableCell>{proposal.topicTitle}</TableCell>
                    <TableCell>{proposal.primarySupervisorName || proposal.primarySupervisor}</TableCell>
                    <TableCell>{proposal.secondarySupervisorName || proposal.secondarySupervisor || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(proposal.status)}
                        color={getStatusColor(proposal.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleViewDetail(proposal)}
                      >
                        Xem chi tiết
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Dialog hiển thị chi tiết */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>Chi tiết đề tài</DialogTitle>
          <DialogContent>
            {selectedProposal && (
              <Box>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Mã học viên:</strong> {selectedProposal.studentId}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Học viên:</strong> {selectedProposal.studentName}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Khoa:</strong> {selectedProposal.studentFaculty || 'N/A'}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Ngành:</strong> {selectedProposal.studentMajor || 'N/A'}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Tên đề tài:</strong> {selectedProposal.topicTitle}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Nội dung:</strong> {selectedProposal.content}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>GVHD chính:</strong> {selectedProposal.primarySupervisorName || selectedProposal.primarySupervisor}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>GVHD phụ:</strong> {selectedProposal.secondarySupervisorName || selectedProposal.secondarySupervisor || 'N/A'}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Trạng thái:</strong>{' '}
                  <Chip
                    label={getStatusText(selectedProposal.status)}
                    color={getStatusColor(selectedProposal.status)}
                    size="small"
                  />
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Ngày gửi:</strong> {formatDate(selectedProposal.submittedAt)}
                </Typography>

                {selectedProposal.supervisorComments && (
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Nhận xét GVHD:</strong> {selectedProposal.supervisorComments}
                  </Typography>
                )}

                {selectedProposal.headComments && (
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Nhận xét LĐBM:</strong> {selectedProposal.headComments}
                  </Typography>
                )}

                {selectedProposal.facultyLeaderComments && (
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Nhận xét Lãnh đạo khoa:</strong> {selectedProposal.facultyLeaderComments}
                  </Typography>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Đóng</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AppLayout>
  );
}

export default TopicArchive;
