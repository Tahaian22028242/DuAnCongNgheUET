import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Box, Paper, 
  Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Alert, Chip, CircularProgress,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Grid, Autocomplete, IconButton, Tooltip,
  List, ListItem, ListItemText, ListItemSecondaryAction
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import { format } from 'date-fns';
import './Dashboard.css';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
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
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileDescription, setFileDescription] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewName, setPreviewName] = useState('');
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

  const handleDownloadFile = async (proposalId, filename, originalName) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/download-outline/${proposalId}/${filename}`,
        { withCredentials: true, responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName || filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading file:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Lỗi khi tải file' });
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const handleSupervisorUploadFiles = async (proposalId) => {
    if (selectedFiles.length === 0) {
      setMessage({ type: 'error', text: 'Vui lòng chọn ít nhất một file' });
      return;
    }
    setUploadingFiles(true);
    try {
      const fd = new FormData();
      selectedFiles.forEach(f => fd.append('outlineFiles', f));
      fd.append('description', fileDescription || '');

      await axios.post(`http://localhost:5000/supervisor/manage-outline/${proposalId}`, fd, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessage({ type: 'success', text: 'Upload file thành công!' });
      setSelectedFiles([]);
      setFileDescription('');
      fetchProposals();
    } catch (err) {
      console.error('Error uploading files (supervisor):', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Lỗi khi upload file' });
    }
    setUploadingFiles(false);
  };

  const handleViewFile = async (proposalId, file) => {
    // Preview PDFs inline; otherwise trigger download
    const name = file.originalName || file.originalname || file.filename;
    const lower = (name || '').toLowerCase();
    if (lower.endsWith('.pdf')) {
      try {
        const response = await axios.get(
          `http://localhost:5000/download-outline/${proposalId}/${file.filename}`,
          { withCredentials: true, responseType: 'blob' }
        );
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        setPreviewUrl(url);
        setPreviewName(name);
        setPreviewOpen(true);
      } catch (err) {
        console.error('Error fetching file for preview:', err);
        setMessage({ type: 'error', text: err.response?.data?.message || 'Lỗi khi xem file' });
      }
    } else {
      setMessage({ type: 'info', text: 'Chức năng xem trước chỉ hỗ trợ file PDF. Vui lòng tải file về để xem.' });
    }
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewName('');
  };

  const handleDeleteFile = async (proposalId, filename) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa file này?')) return;
    try {
      await axios.delete(`http://localhost:5000/delete-outline/${proposalId}/${filename}`, { withCredentials: true });
      setMessage({ type: 'success', text: 'Đã xóa file thành công' });
      fetchProposals();
    } catch (err) {
      console.error('Error deleting file:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Lỗi khi xóa file' });
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

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell><strong>STT</strong></TableCell>
                    <TableCell><strong>Tên đề tài</strong></TableCell>
                    <TableCell><strong>Học viên</strong></TableCell>
                    <TableCell><strong>Khoa</strong></TableCell>
                    <TableCell><strong>Ngành</strong></TableCell>
                    <TableCell><strong>GVHD phụ</strong></TableCell>
                    <TableCell><strong>Trạng thái</strong></TableCell>
                    <TableCell><strong>Hành động</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {proposals.map((proposal, index) => (
                    <TableRow key={proposal._id} hover>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {proposal.topicTitle}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {proposal.studentName}
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          {proposal.studentId}
                        </Typography>
                      </TableCell>
                      <TableCell>{proposal.studentFaculty || 'N/A'}</TableCell>
                      <TableCell>{proposal.studentMajor || 'N/A'}</TableCell>
                      <TableCell>
                        {proposal.secondarySupervisorName || proposal.secondarySupervisor || '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusText(proposal.status)}
                          color={getStatusColor(proposal.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<VisibilityIcon />}
                          onClick={() => {
                            setSelectedProposal(proposal);
                            setReviewDialog(false);
                          }}
                        >
                          Xem chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {/* Dialog xem chi tiết đề tài */}
        <Dialog 
          open={selectedProposal !== null && !reviewDialog} 
          onClose={() => setSelectedProposal(null)} 
          maxWidth="lg" 
          fullWidth
        >
          {selectedProposal && (
            <>
              <DialogTitle>
                Chi tiết đề tài: {selectedProposal.topicTitle}
                <Chip
                  label={getStatusText(selectedProposal.status)}
                  color={getStatusColor(selectedProposal.status)}
                  size="small"
                  sx={{ ml: 2 }}
                />
              </DialogTitle>
              <DialogContent dividers>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                      <Typography variant="subtitle2" gutterBottom>
                        <strong>Học viên:</strong> {selectedProposal.studentName} ({selectedProposal.studentId})
                      </Typography>
                      <Typography variant="subtitle2" gutterBottom>
                        <strong>Khoa:</strong> {selectedProposal.studentFaculty || 'N/A'}
                      </Typography>
                      <Typography variant="subtitle2" gutterBottom>
                        <strong>Ngành:</strong> {selectedProposal.studentMajor || 'N/A'}
                      </Typography>
                      <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
                        <strong>Ngày gửi:</strong> {formatDate(selectedProposal.submittedAt)}
                      </Typography>

                      <Typography variant="subtitle1" gutterBottom>
                        <strong>Nội dung đề tài:</strong>
                      </Typography>
                      <Paper sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {selectedProposal.content}
                        </Typography>
                      </Paper>

                      <Typography variant="subtitle2" gutterBottom>
                        <strong>Giảng viên hướng dẫn chính:</strong> {selectedProposal.primarySupervisorName || selectedProposal.primarySupervisor}
                      </Typography>
                      {selectedProposal.secondarySupervisor && (
                        <Typography variant="subtitle2" gutterBottom>
                          <strong>Giảng viên hướng dẫn phụ:</strong> {selectedProposal.secondarySupervisorName || selectedProposal.secondarySupervisor}
                        </Typography>
                      )}
                      
                      <Typography variant="subtitle2" gutterBottom>
                        <strong>Tài liệu đính kèm:</strong>
                        {selectedProposal.outlineFiles && selectedProposal.outlineFiles.length > 0 ? (
                          <Box sx={{ mt: 1 }}>
                            {selectedProposal.outlineFiles.map((file, index) => (
                              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, width: '100%' }}>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Tooltip title={file.originalName || file.originalname || file.filename}>
                                    <Typography variant="body2" noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {file.originalName || file.originalname || file.filename}
                                    </Typography>
                                  </Tooltip>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    {(file.uploadedBy === 'student' ? 'Học viên' : 'Giảng viên')} • {file.uploadedAt ? formatDate(file.uploadedAt) : 'N/A'}
                                  </Typography>
                                </Box>

                                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0 }}>
                                  <Tooltip title="Xem">
                                    <IconButton size="small" onClick={() => handleViewFile(selectedProposal._id, file)} sx={{ p: 0.4, width: 32, height: 32 }}>
                                      <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>

                                  <Tooltip title="Tải xuống">
                                    <IconButton size="small" onClick={() => handleDownloadFile(selectedProposal._id, file.filename, file.originalName || file.originalname)} sx={{ p: 0.4, width: 32, height: 32 }}>
                                      <DownloadIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>

                                  {/* Cho phép Giảng viên, Lãnh đạo bộ môn, Lãnh đạo khoa xóa file */}
                                  {['Giảng viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'].includes(user.role) && user.username === selectedProposal.primarySupervisor && selectedProposal.outlineStatus !== 'approved' && (
                                    <Tooltip title="Xóa">
                                      <IconButton size="small" color="error" onClick={() => handleDeleteFile(selectedProposal._id, file.filename)} sx={{ p: 0.4, width: 32, height: 32 }}>
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        ) : (
                          ' Không có tài liệu đính kèm'
                        )}
                      </Typography>

                      {selectedProposal.supervisorComments && (
                        <>
                          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                            <strong>Nhận xét của giảng viên:</strong>
                          </Typography>
                          <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
                            <Typography variant="body2">
                              {selectedProposal.supervisorComments}
                            </Typography>
                          </Paper>
                          {selectedProposal.reviewedAt && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                              Đánh giá lúc: {formatDate(selectedProposal.reviewedAt)}
                            </Typography>
                          )}
                        </>
                      )}
                    </Grid>

                    <Grid item xs={12} md={4}>
                      {/* Kiểm tra xem user có phải là GVHD chính không */}
                      {selectedProposal.primarySupervisor === user.username ? (
                        <>
                          {selectedProposal.status === 'pending' && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <Alert severity="info" sx={{ mb: 1 }}>
                                Bạn là GVHD chính - có quyền phê duyệt/chỉnh sửa
                              </Alert>
                              <Button
                                variant="contained"
                                color="success"
                                startIcon={<CheckIcon />}
                                onClick={() => handleReview(selectedProposal, 'approved')}
                                fullWidth
                              >
                                Phê duyệt
                              </Button>
                              <Button
                                variant="contained"
                                color="error"
                                startIcon={<CloseIcon />}
                                onClick={() => handleReview(selectedProposal, 'rejected')}
                                fullWidth
                              >
                                Từ chối
                              </Button>
                            </Box>
                          )}
                          {selectedProposal.status !== 'pending' && !['rejected', 'rejected_by_head', 'rejected_by_faculty_leader'].includes(selectedProposal.status) && (
                            <Box>
                              <Alert severity="info" sx={{ mb: 1 }}>
                                Bạn là GVHD chính - có quyền chỉnh sửa
                              </Alert>
                              <Button
                                variant="outlined"
                                startIcon={<EditIcon />}
                                onClick={() => handleReview(selectedProposal, selectedProposal.status)}
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

                      {/* Upload area for primary supervisor - Cho phép Giảng viên, Lãnh đạo bộ môn, Lãnh đạo khoa */}
                      {['Giảng viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'].includes(user.role) && user.username === selectedProposal.primarySupervisor && selectedProposal.outlineStatus !== 'approved' && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                          <Typography variant="subtitle2" sx={{ mb: 1 }}>Upload thêm file (GVHD):</Typography>
                          <input
                            accept=".pdf,.doc,.docx,.txt,.zip,.rar"
                            style={{ display: 'none' }}
                            id={`supervisor-upload-${selectedProposal._id}`}
                            multiple
                            type="file"
                            onChange={handleFileSelect}
                          />
                          <label htmlFor={`supervisor-upload-${selectedProposal._id}`}>
                            <Button variant="outlined" component="span" startIcon={<UploadFileIcon />} size="small" sx={{ mb: 1 }}>
                              Chọn file
                            </Button>
                          </label>
                          {selectedFiles.length > 0 && (
                            <Box sx={{ mb: 1 }}>
                              {selectedFiles.map((f, i) => (
                                <Typography key={i} variant="body2" color="text.secondary">{f.name} ({f.size})</Typography>
                              ))}
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
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              onClick={() => handleSupervisorUploadFiles(selectedProposal._id)}
                              variant="contained"
                              size="small"
                              disabled={uploadingFiles || selectedFiles.length === 0}
                            >
                              {uploadingFiles ? 'Đang upload...' : 'Upload'}
                            </Button>
                            <Button
                              onClick={() => { setSelectedFiles([]); setFileDescription(''); }}
                              variant="outlined"
                              size="small"
                            >
                              Hủy
                            </Button>
                          </Box>
                        </Box>
                      )}
                    </Grid>
                  </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setSelectedProposal(null)}>Đóng</Button>
              </DialogActions>
            </>
          )}
        </Dialog>

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

  // Preview dialog for PDFs
  return (
    <>
      <AppLayout>
        <div className="dashboard">
          <div className="dashboard-content">
            {content()}
          </div>
        </div>
      </AppLayout>

      <Dialog open={previewOpen} onClose={handleClosePreview} maxWidth="lg" fullWidth>
        <DialogTitle>{previewName}</DialogTitle>
        <DialogContent sx={{ height: '80vh' }}>
          {previewUrl ? (
            <iframe title={previewName} src={previewUrl} style={{ width: '100%', height: '100%', border: 'none' }} />
          ) : (
            <Typography>Không có file để xem</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview}>Đóng</Button>
          <Button
            component="a"
            href={previewUrl}
            download={previewName}
          >
            Tải
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default SupervisorTopics;