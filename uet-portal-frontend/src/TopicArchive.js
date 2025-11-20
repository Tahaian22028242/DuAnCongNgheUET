import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Alert, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, IconButton, TextField, List, ListItem,
  ListItemText, ListItemSecondaryAction, Tooltip
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import axios from 'axios';
import { format } from 'date-fns';
import AppLayout from './AppLayout';

function TopicArchive() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileDescription, setFileDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [outlineDialogOpen, setOutlineDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewComments, setReviewComments] = useState('');

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
      } else if (user.role === 'Lãnh đạo bộ môn') {
        endpoint = 'http://localhost:5000/head/topic-proposals-archive';
      } else if (user.role === 'Lãnh đạo khoa') {
        endpoint = 'http://localhost:5000/faculty-leader/topic-proposals-archive';
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

  const handleOpenUploadDialog = (proposal) => {
    setSelectedProposal(proposal);
    setUploadDialogOpen(true);
    setSelectedFiles([]);
    setFileDescription('');
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handleUploadFiles = async () => {
    if (selectedFiles.length === 0) {
      setMessage({ type: 'error', text: 'Vui lòng chọn ít nhất một file' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('outlineFiles', file);
      });
      formData.append('description', fileDescription);

      await axios.post(
        `http://localhost:5000/student/upload-outline/${selectedProposal._id}`,
        formData,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setMessage({ type: 'success', text: 'Upload file đề cương thành công!' });
      setUploadDialogOpen(false);
      fetchProposals(); // Refresh data
    } catch (err) {
      console.error('Error uploading files:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Lỗi khi upload file đề cương'
      });
    }
    setUploading(false);
  };

  const handleViewOutline = (proposal) => {
    setSelectedProposal(proposal);
    setOutlineDialogOpen(true);
  };

  const handleDownloadFile = async (filename, originalName) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/download-outline/${selectedProposal._id}/${filename}`,
        {
          withCredentials: true,
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading file:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Lỗi khi tải file'
      });
    }
  };

  const handleDeleteFile = async (filename) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa file này?')) {
      return;
    }

    try {
      await axios.delete(
        `http://localhost:5000/delete-outline/${selectedProposal._id}/${filename}`,
        { withCredentials: true }
      );

      setMessage({ type: 'success', text: 'Đã xóa file thành công' });
      fetchProposals(); // Refresh data
      
      // Update selected proposal
      const updatedProposal = { 
        ...selectedProposal, 
        outlineFiles: selectedProposal.outlineFiles.filter(f => f.filename !== filename)
      };
      setSelectedProposal(updatedProposal);
    } catch (err) {
      console.error('Error deleting file:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Lỗi khi xóa file'
      });
    }
  };

  const handleOpenReviewDialog = (proposal, action) => {
    setSelectedProposal(proposal);
    setReviewDialogOpen(true);
    setReviewComments('');
  };

  const handleReviewOutline = async (status) => {
    if (!reviewComments.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập nhận xét' });
      return;
    }

    try {
      await axios.put(
        `http://localhost:5000/supervisor/review-outline/${selectedProposal._id}`,
        {
          status,
          comments: reviewComments
        },
        { withCredentials: true }
      );

      setMessage({ 
        type: 'success', 
        text: `Đã ${status === 'approved' ? 'phê duyệt' : 'từ chối'} đề cương` 
      });
      setReviewDialogOpen(false);
      setOutlineDialogOpen(false);
      fetchProposals();
    } catch (err) {
      console.error('Error reviewing outline:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Lỗi khi phê duyệt đề cương'
      });
    }
  };

  const handleSupervisorUploadFiles = async () => {
    if (selectedFiles.length === 0) {
      setMessage({ type: 'error', text: 'Vui lòng chọn ít nhất một file' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('outlineFiles', file);
      });
      formData.append('description', fileDescription);

      await axios.post(
        `http://localhost:5000/supervisor/manage-outline/${selectedProposal._id}`,
        formData,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setMessage({ type: 'success', text: 'Upload file thành công!' });
      setSelectedFiles([]);
      setFileDescription('');
      fetchProposals(); // Refresh data
      
      // Update dialog
      const response = await axios.get(
        user.role === 'Sinh viên' 
          ? 'http://localhost:5000/student/topic-proposals-archive'
          : 'http://localhost:5000/supervisor/topic-proposals-archive',
        { withCredentials: true }
      );
      const updated = response.data.find(p => p._id === selectedProposal._id);
      if (updated) {
        setSelectedProposal(updated);
      }
    } catch (err) {
      console.error('Error uploading files:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Lỗi khi upload file'
      });
    }
    setUploading(false);
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
                  {(user.role === 'Giảng viên' || user.role === 'Lãnh đạo bộ môn' || user.role === 'Chủ nhiệm bộ môn' || user.role === 'Lãnh đạo khoa') && (
                    <>
                      <TableCell><strong>Mã HV</strong></TableCell>
                      <TableCell><strong>Học viên</strong></TableCell>
                    </>
                  )}
                  <TableCell><strong>Tên đề tài</strong></TableCell>
                  <TableCell><strong>GVHD chính</strong></TableCell>
                  <TableCell><strong>GVHD phụ</strong></TableCell>
                  <TableCell><strong>Trạng thái</strong></TableCell>
                  <TableCell><strong>Đề cương</strong></TableCell>
                  <TableCell><strong>Hành động</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {proposals.map((proposal, index) => (
                  <TableRow key={proposal._id} hover>
                    <TableCell>{index + 1}</TableCell>
                    {(user.role === 'Giảng viên' || user.role === 'Lãnh đạo bộ môn' || user.role === 'Chủ nhiệm bộ môn' || user.role === 'Lãnh đạo khoa') && (
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
                      {user.role === 'Sinh viên' && 
                       proposal.status !== 'pending' && 
                       proposal.status !== 'rejected' && 
                       proposal.outlineStatus !== 'approved' && (
                        <Tooltip title="Upload đề cương">
                          <IconButton 
                            color="primary" 
                            onClick={() => handleOpenUploadDialog(proposal)}
                            size="small"
                          >
                            <UploadFileIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {(proposal.outlineFiles && proposal.outlineFiles.length > 0) && (
                        // Học viên, GVHD 1, GVHD 2 luôn xem được
                        // LĐBM và Lãnh đạo khoa chỉ xem được khi outline đã được phê duyệt
                        ((user.role === 'Sinh viên') ||
                         (user.role === 'Giảng viên' && (user.username === proposal.primarySupervisor || user.username === proposal.secondarySupervisor)) ||
                         ((user.role === 'Lãnh đạo bộ môn' || user.role === 'Lãnh đạo khoa') && proposal.outlineStatus === 'approved')
                        ) && (
                          <Tooltip title="Xem file đề cương">
                            <IconButton 
                              color="info" 
                              onClick={() => handleViewOutline(proposal)}
                              size="small"
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                        )
                      )}
                      {proposal.outlineStatus === 'approved' && (
                        <Chip label="Đã phê duyệt" color="success" size="small" sx={{ ml: 1 }} />
                      )}
                      {proposal.outlineStatus === 'pending_review' && (
                        <Chip label="Chờ phê duyệt" color="warning" size="small" sx={{ ml: 1 }} />
                      )}
                      {proposal.outlineStatus === 'rejected' && (
                        <Chip label="Bị từ chối" color="error" size="small" sx={{ ml: 1 }} />
                      )}
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

        {/* Dialog Upload file đề cương (Học viên) */}
        <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Upload file đề cương</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              Chỉ chấp nhận file .pdf hoặc .docx. Kích thước tối đa 10MB/file.
            </Alert>

            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                component="label"
                startIcon={<UploadFileIcon />}
              >
                Chọn file
                <input
                  type="file"
                  hidden
                  multiple
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileSelect}
                />
              </Button>
              {selectedFiles.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Đã chọn {selectedFiles.length} file:
                  </Typography>
                  {selectedFiles.map((file, idx) => (
                    <Typography key={idx} variant="body2">
                      - {file.name}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>

            <TextField
              label="Mô tả (tùy chọn)"
              value={fileDescription}
              onChange={(e) => setFileDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUploadDialogOpen(false)}>Hủy</Button>
            <Button 
              onClick={handleUploadFiles} 
              variant="contained" 
              disabled={uploading || selectedFiles.length === 0}
            >
              {uploading ? 'Đang upload...' : 'Upload'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog Xem và quản lý file đề cương */}
        <Dialog open={outlineDialogOpen} onClose={() => setOutlineDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Quản lý file đề cương
            {selectedProposal && selectedProposal.outlineStatus === 'approved' && (
              <Chip label="Đã phê duyệt" color="success" size="small" sx={{ ml: 2 }} />
            )}
          </DialogTitle>
          <DialogContent>
            {selectedProposal && (
              <>
                <Typography variant="h6" gutterBottom>
                  Đề tài: {selectedProposal.topicTitle}
                </Typography>

                {selectedProposal.outlineComments && (
                  <Alert severity={selectedProposal.outlineStatus === 'approved' ? 'success' : 'error'} sx={{ mb: 2 }}>
                    <strong>Nhận xét GVHD:</strong> {selectedProposal.outlineComments}
                  </Alert>
                )}

                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Danh sách file đã upload:
                </Typography>

                {selectedProposal.outlineFiles && selectedProposal.outlineFiles.length > 0 ? (
                  <List>
                    {selectedProposal.outlineFiles.map((file, idx) => (
                      <ListItem key={idx}>
                        <ListItemText
                          primary={file.originalName}
                          secondary={
                            <>
                              Upload bởi: {file.uploadedBy === 'student' ? 'Học viên' : 'Giảng viên'} | 
                              Ngày: {formatDate(file.uploadedAt)}
                              {file.description && ` | ${file.description}`}
                            </>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Tooltip title="Tải xuống">
                            <IconButton 
                              edge="end" 
                              onClick={() => handleDownloadFile(file.filename, file.originalName)}
                              sx={{ mr: 1 }}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                          {user.role === 'Giảng viên' && 
                           user.username === selectedProposal.primarySupervisor && 
                           selectedProposal.outlineStatus !== 'approved' && (
                            <Tooltip title="Xóa">
                              <IconButton 
                                edge="end" 
                                onClick={() => handleDeleteFile(file.filename)}
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          {user.role === 'Sinh viên' && selectedProposal.outlineStatus !== 'approved' && (
                            <Tooltip title="Xóa">
                              <IconButton 
                                edge="end" 
                                onClick={() => handleDeleteFile(file.filename)}
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography color="text.secondary">Chưa có file nào.</Typography>
                )}

                {/* GVHD chính có thể upload thêm file */}
                {user.role === 'Giảng viên' && 
                 user.username === selectedProposal.primarySupervisor && 
                 selectedProposal.outlineStatus !== 'approved' && (
                  <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Upload thêm file (GVHD):
                    </Typography>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<UploadFileIcon />}
                      size="small"
                      sx={{ mb: 1 }}
                    >
                      Chọn file
                      <input
                        type="file"
                        hidden
                        multiple
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileSelect}
                      />
                    </Button>
                    {selectedFiles.length > 0 && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Đã chọn: {selectedFiles.map(f => f.name).join(', ')}
                        </Typography>
                      </Box>
                    )}
                    <TextField
                      label="Mô tả"
                      value={fileDescription}
                      onChange={(e) => setFileDescription(e.target.value)}
                      fullWidth
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    <Button 
                      onClick={handleSupervisorUploadFiles}
                      variant="contained"
                      size="small"
                      disabled={uploading || selectedFiles.length === 0}
                    >
                      {uploading ? 'Đang upload...' : 'Upload'}
                    </Button>
                  </Box>
                )}

                {/* GVHD chính phê duyệt/từ chối */}
                {user.role === 'Giảng viên' && 
                 user.username === selectedProposal.primarySupervisor && 
                 selectedProposal.outlineStatus === 'pending_review' && (
                  <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => handleOpenReviewDialog(selectedProposal, 'approved')}
                    >
                      Phê duyệt đề cương
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<CancelIcon />}
                      onClick={() => handleOpenReviewDialog(selectedProposal, 'rejected')}
                    >
                      Từ chối
                    </Button>
                  </Box>
                )}
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOutlineDialogOpen(false)}>Đóng</Button>
          </DialogActions>
        </Dialog>

        {/* Dialog Phê duyệt/Từ chối đề cương */}
        <Dialog open={reviewDialogOpen} onClose={() => setReviewDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {reviewDialogOpen ? 'Nhận xét về đề cương' : ''}
          </DialogTitle>
          <DialogContent>
            <TextField
              label="Nhận xét"
              value={reviewComments}
              onChange={(e) => setReviewComments(e.target.value)}
              fullWidth
              multiline
              rows={4}
              required
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReviewDialogOpen(false)}>Hủy</Button>
            <Button 
              onClick={() => handleReviewOutline('approved')} 
              variant="contained" 
              color="success"
            >
              Phê duyệt
            </Button>
            <Button 
              onClick={() => handleReviewOutline('rejected')} 
              variant="contained" 
              color="error"
            >
              Từ chối
            </Button>
          </DialogActions>
        </Dialog>

        {/* Message snackbar */}
        {message.text && (
          <Alert 
            severity={message.type} 
            sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}
            onClose={() => setMessage({ type: '', text: '' })}
          >
            {message.text}
          </Alert>
        )}
      </Box>
    </AppLayout>
  );
}

export default TopicArchive;
