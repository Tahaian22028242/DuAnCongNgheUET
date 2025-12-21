import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Box, Paper,
  Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Alert, Chip, CircularProgress,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Grid, Autocomplete, IconButton, Tooltip,
  Tabs, Tab, Snackbar
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

// ==================== CONSTANTS ====================
const API_BASE = 'http://localhost:5000';

const PROPOSAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  WAITING_HEAD: 'waiting_head_approval',
  APPROVED_HEAD: 'approved_by_head',
  WAITING_FACULTY: 'waiting_faculty_leader_approval',
  APPROVED_FACULTY: 'approved_by_faculty_leader',
  REJECTED_HEAD: 'rejected_by_head',
  REJECTED_FACULTY: 'rejected_by_faculty_leader'
};

// ==================== UTILITY FUNCTIONS ====================
const getStatusColor = (status) => {
  const colorMap = {
    [PROPOSAL_STATUS.APPROVED]: 'success',
    [PROPOSAL_STATUS.APPROVED_HEAD]: 'success',
    [PROPOSAL_STATUS.APPROVED_FACULTY]: 'success',
    [PROPOSAL_STATUS.REJECTED]: 'error',
    [PROPOSAL_STATUS.REJECTED_HEAD]: 'error',
    [PROPOSAL_STATUS.REJECTED_FACULTY]: 'error',
    [PROPOSAL_STATUS.WAITING_HEAD]: 'info',
    [PROPOSAL_STATUS.WAITING_FACULTY]: 'warning',
    [PROPOSAL_STATUS.PENDING]: 'warning',
  };
  return colorMap[status] || 'default';
};

const getStatusText = (status) => {
  const textMap = {
    [PROPOSAL_STATUS.PENDING]: 'Chờ GVHD xử lý',
    [PROPOSAL_STATUS.APPROVED]: 'GVHD đã phê duyệt',
    [PROPOSAL_STATUS.REJECTED]: 'GVHD từ chối',
    [PROPOSAL_STATUS.WAITING_HEAD]: 'Chờ LĐBM phê duyệt',
    [PROPOSAL_STATUS.APPROVED_HEAD]: 'LĐBM đã phê duyệt',
    [PROPOSAL_STATUS.REJECTED_HEAD]: 'LĐBM từ chối',
    [PROPOSAL_STATUS.WAITING_FACULTY]: 'Chờ Lãnh đạo khoa',
    [PROPOSAL_STATUS.APPROVED_FACULTY]: 'Lãnh đạo khoa đã phê duyệt',
    [PROPOSAL_STATUS.REJECTED_FACULTY]: 'Lãnh đạo khoa từ chối'
  };
  return textMap[status] || 'Chờ xử lý';
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
  } catch {
    return 'N/A';
  }
};

// ==================== MAIN COMPONENT ====================
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
  const [lecturers, setLecturers] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileDescription, setFileDescription] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewName, setPreviewName] = useState('');
  const [archiveProposals, setArchiveProposals] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0); // 0 = Đề tài chờ duyệt, 1 = Lưu trữ
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteFilename, setPendingDeleteFilename] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProposals();
    fetchLecturers();
  }, []);

  const fetchArchiveProposals = useCallback(async () => {
    setArchiveLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/supervisor/topic-proposals-archive`, { withCredentials: true });
      const list = Array.isArray(response.data) ? response.data : [];
      setArchiveProposals(list);
    } catch (err) {
      console.error('Error fetching archive proposals:', err);
      setArchiveProposals([]);
    }
    setArchiveLoading(false);
  }, []);

  const fetchProposals = async () => {
    try {
      const response = await axios.get(`${API_BASE}/supervisor/topic-proposals`, {
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
      const response = await axios.get(`${API_BASE}/lecturers`, {
        withCredentials: true,
      });
      setLecturers(response.data);
    } catch (err) {
      console.error('Error fetching lecturers:', err);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    if (newValue === 1 && archiveProposals.length === 0) {
      fetchArchiveProposals();
    }
  };

  const handleReview = useCallback((proposal, status) => {
    setSelectedProposal(proposal);
    setReviewData({
      status,
      comments: '',
      topicTitle: proposal.topicTitle,
      content: proposal.content,
      secondarySupervisor: proposal.secondarySupervisor || ''
    });
    setReviewDialog(true);
  }, []);

  const handleSubmitReview = async () => {
    if (!reviewData.comments.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập nhận xét.' });
      return;
    }
    setSubmitting(true);
    try {
      await axios.put(
        `${API_BASE}/supervisor/review-topic/${selectedProposal._id}`,
        {
          status: reviewData.status,
          comments: reviewData.comments.trim(),
          topicTitle: reviewData.topicTitle.trim(),
          content: reviewData.content.trim(),
          secondarySupervisor: reviewData.secondarySupervisor
        },
        { withCredentials: true }
      );
      setMessage({
        type: 'success',
        text: `Đề tài đã được ${reviewData.status === PROPOSAL_STATUS.APPROVED ? 'phê duyệt' : 'từ chối'}`
      });
      setReviewDialog(false);
      fetchProposals();
    } catch (err) {
      console.error('Error submitting review:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Có lỗi xảy ra khi xử lý đề xuất.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileSelect = (e) => {
    setSelectedFiles(Array.from(e.target.files || []));
  };

  const handleUploadFiles = async (proposalId) => {
    if (selectedFiles.length === 0) {
      setMessage({ type: 'error', text: 'Vui lòng chọn ít nhất một file' });
      return;
    }
    setUploadingFiles(true);
    try {
      const fd = new FormData();
      selectedFiles.forEach(f => fd.append('outlineFiles', f));
      fd.append('description', fileDescription || '');

      await axios.post(`${API_BASE}/supervisor/manage-outline/${proposalId}`, fd, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessage({ type: 'success', text: 'Upload file thành công!' });
      setSelectedFiles([]);
      setFileDescription('');
      fetchProposals();
      if (tabValue === 1) fetchArchiveProposals();
    } catch (err) {
      console.error('Error uploading files:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Lỗi khi upload file' });
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleViewFile = async (proposalId, file) => {
    const name = file.originalName || file.originalname || file.filename;
    if (!name.toLowerCase().endsWith('.pdf')) {
      setMessage({ type: 'info', text: 'Chức năng xem trước chỉ hỗ trợ file PDF.' });
      return;
    }
    try {
      const res = await axios.get(`${API_BASE}/download-outline/${proposalId}/${file.filename}`, {
        withCredentials: true,
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewName(name);
      setPreviewOpen(true);
    } catch (err) {
      console.error('Error viewing file:', err);
      setMessage({ type: 'error', text: 'Lỗi khi xem file' });
    }
  };

  const handleDownloadFile = async (proposalId, filename, originalName) => {
    try {
      const res = await axios.get(`${API_BASE}/download-outline/${proposalId}/${filename}`, {
        withCredentials: true,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName || filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading file:', err);
      setMessage({ type: 'error', text: 'Lỗi khi tải file' });
    }
  };

  const handleDeleteFile = (proposalId, filename) => {
    const p = [...proposals, ...archiveProposals].find(x => x._id === proposalId) || selectedProposal;
    if (!p) return;
    setSelectedProposal(p);
    setPendingDeleteFilename(filename);
    setConfirmOpen(true);
  };

  const performDeleteFile = async () => {
    if (!pendingDeleteFilename || !selectedProposal) {
      setConfirmOpen(false);
      setPendingDeleteFilename(null);
      return;
    }
    setDeleting(true);
    try {
      await axios.delete(`${API_BASE}/delete-outline/${selectedProposal._id}/${pendingDeleteFilename}`, {
        withCredentials: true
      });
      setMessage({ type: 'success', text: 'Đã xóa file.' });
      fetchProposals();
      if (tabValue === 1) fetchArchiveProposals();
      
      setSelectedProposal(prev => {
        if (prev) {
          const newFiles = (prev.outlineFiles || []).filter(f => f.filename !== pendingDeleteFilename);
          return { ...prev, outlineFiles: newFiles };
        }
        return prev;
      });
    } catch (err) {
      console.error('Error deleting file:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Lỗi khi xóa file' });
    } finally {
      setDeleting(false);
      setPendingDeleteFilename(null);
      setConfirmOpen(false);
    }
  };

  const handleClosePreview = () => {
    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    setPreviewOpen(false);
    setPreviewUrl(null);
    setPreviewName('');
  };

  const isPrimarySupervisor = (proposal) => user.username === proposal?.primarySupervisor;
  
  const canEditProposal = (proposal) => {
    return isPrimarySupervisor(proposal) && ![
      PROPOSAL_STATUS.REJECTED,
      PROPOSAL_STATUS.REJECTED_HEAD,
      PROPOSAL_STATUS.REJECTED_FACULTY
    ].includes(proposal?.status);
  };
  
  const canDeleteFile = (proposal) => {
    return isPrimarySupervisor(proposal) && (tabValue === 1 || proposal?.outlineStatus !== 'approved');
  };

  const handleHideFromArchive = async (proposalId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đề tài này khỏi danh sách lưu trữ của bạn? Đề tài vẫn tồn tại trong dữ liệu hệ thống.')) {
      return;
    }
    try {
      await axios.put(
        `${API_BASE}/supervisor/hide-archive/${proposalId}`,
        {},
        { withCredentials: true }
      );
      setMessage({ type: 'success', text: 'Đã ẩn đề tài khỏi danh sách lưu trữ' });
      // Remove from local state
      setArchiveProposals(prev => prev.filter(p => p._id !== proposalId));
    } catch (err) {
      console.error('Error hiding from archive:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Lỗi khi ẩn đề tài' });
    }
  };

  // Render proposal table
  const renderProposalTable = (proposalsList, isArchive = false) => {
    if (proposalsList.length === 0) {
      return (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {isArchive ? 'Không có đề tài trong lưu trữ.' : 'Hiện chưa có đề tài nào đang chờ duyệt.'}
          </Typography>
        </Paper>
      );
    }

    return (
      <>
        <Typography variant="subtitle1" sx={{ mb: 2, color: 'text.secondary' }}>
          Tổng cộng: {proposalsList.length} đề xuất
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
                <TableCell><strong>GVHD chính</strong></TableCell>
                <TableCell><strong>GVHD phụ</strong></TableCell>
                <TableCell><strong>Trạng thái</strong></TableCell>
                <TableCell align="right" sx={{ width: 150 }}><strong>Hành động</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {proposalsList.map((proposal, index) => (
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
                  <TableCell>{proposal.primarySupervisorName || proposal.primarySupervisor}</TableCell>
                  <TableCell>{proposal.secondarySupervisorName || proposal.secondarySupervisor || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusText(proposal.status)}
                      color={getStatusColor(proposal.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setSelectedProposal(proposal);
                          setReviewDialog(false);
                        }}
                      >
                        <VisibilityIcon fontSize='small'/>
                      </Button>
                      {isArchive && (
                        <Tooltip title="Xóa khỏi danh sách lưu trữ">
                          <IconButton
                            size="small"
                            onClick={() => handleHideFromArchive(proposal._id)}
                            sx={{
                              color: 'text.secondary',
                              '&:hover': {
                                bgcolor: 'error.main',
                                color: 'common.white'
                              }
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </>
    );
  };

  // Render detail dialog
  const renderDetailDialog = () => {
    // Simplified view for archive tab
    if (tabValue === 1 && selectedProposal) {
      return (
        <Dialog
          open={selectedProposal !== null && !reviewDialog}
          onClose={() => setSelectedProposal(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Chi tiết đề tài</DialogTitle>
          <DialogContent>
            <Box>
              <Typography variant="body1">
                <strong>Mã học viên:</strong> {selectedProposal.studentId}
              </Typography>
              <Typography variant="body1">
                <strong>Học viên:</strong> {selectedProposal.studentName}
              </Typography>
              <Typography variant="body1">
                <strong>Khoa:</strong> {selectedProposal.studentFaculty || 'N/A'}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Ngành:</strong> {selectedProposal.studentMajor || 'N/A'}
              </Typography>
              <Typography variant="body1">
                <strong>Tên đề tài:</strong> {selectedProposal.topicTitle}
              </Typography>
              <Typography variant="body1">
                <strong>Nội dung:</strong>
              </Typography>
              <Paper sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {selectedProposal.content}
                </Typography>
              </Paper>
              <Typography variant="body1">
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
                <Typography variant="body1">
                  <strong>Nhận xét GVHD:</strong> {selectedProposal.supervisorComments}
                </Typography>
              )}

              {selectedProposal.headComments && (
                <Typography variant="body1">
                  <strong>Nhận xét Lãnh đạo bộ môn:</strong> {selectedProposal.headComments}
                </Typography>
              )}

              {selectedProposal.facultyLeaderComments && (
                <Typography variant="body1">
                  <strong>Nhận xét Lãnh đạo khoa:</strong> {selectedProposal.facultyLeaderComments}
                </Typography>
              )}

              {selectedProposal.outlineFiles && selectedProposal.outlineFiles.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Danh sách tài liệu đính kèm:</strong> ({selectedProposal.outlineFiles.length} file)
                  </Typography>
                  {selectedProposal.outlineFiles.map((file, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" noWrap>
                          {file.originalName || file.filename}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {file.uploadedBy === 'student' ? 'Học viên' : 'Giảng viên'} • {formatDate(file.uploadedAt)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Xem">
                          <IconButton size="small" onClick={() => handleViewFile(selectedProposal._id, file)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Tải xuống">
                          <IconButton size="small" onClick={() => handleDownloadFile(selectedProposal._id, file.filename, file.originalName)}>
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {canDeleteFile(selectedProposal) && (
                          <Tooltip title="Xóa">
                            <IconButton size="small" color="error" onClick={() => handleDeleteFile(selectedProposal._id, file.filename)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedProposal(null)}>Đóng</Button>
          </DialogActions>
        </Dialog>
      );
    }

    // Full featured view for active proposals tab
    return (
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
                  <strong>GVHD chính:</strong> {selectedProposal.primarySupervisorName || selectedProposal.primarySupervisor}
                </Typography>
                {selectedProposal.secondarySupervisor && (
                  <Typography variant="subtitle2" gutterBottom>
                    <strong>GVHD phụ:</strong> {selectedProposal.secondarySupervisorName || selectedProposal.secondarySupervisor}
                  </Typography>
                )}

                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  <strong>Danh sách tài liệu đính kèm:</strong>
                  <br />
                  <em style={{ color: 'gray' }}>{selectedProposal.outlineFiles?.length || 0} tài liệu</em>
                </Typography>
                {selectedProposal.outlineFiles && selectedProposal.outlineFiles.length > 0 ? (
                  <Box sx={{ mt: 1 }}>
                    {selectedProposal.outlineFiles.map((file, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Tooltip title={file.originalName || file.filename}>
                            <Typography variant="body2" noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {file.originalName || file.filename}
                            </Typography>
                          </Tooltip>
                          <Typography variant="caption" color="text.secondary">
                            {file.uploadedBy === 'student' ? 'Học viên' : 'Giảng viên'} • {formatDate(file.uploadedAt)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                          <Tooltip title="Xem">
                            <IconButton size="small" onClick={() => handleViewFile(selectedProposal._id, file)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Tải xuống">
                            <IconButton size="small" onClick={() => handleDownloadFile(selectedProposal._id, file.filename, file.originalName)}>
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {canDeleteFile(selectedProposal) && (
                            <Tooltip title="Xóa">
                              <IconButton size="small" color="error" onClick={() => handleDeleteFile(selectedProposal._id, file.filename)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography color="text.secondary">Không có tài liệu đính kèm</Typography>
                )}

                {selectedProposal.supervisorComments && (
                  <>
                    <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                      <strong>Nhận xét của giảng viên:</strong>
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
                      <Typography variant="body2">{selectedProposal.supervisorComments}</Typography>
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
                {tabValue === 1 ? (
                  <Box>
                    <Alert severity="info" sx={{ mb: 1 }}>
                      Lưu trữ — chỉ cho phép xem, tải về hoặc xóa file
                    </Alert>
                    <Typography variant="subtitle2" gutterBottom>
                      <strong>GVHD chính:</strong> {selectedProposal.primarySupervisorName || selectedProposal.primarySupervisor}
                    </Typography>
                    {selectedProposal.secondarySupervisor && (
                      <Typography variant="subtitle2">
                        <strong>GVHD phụ:</strong> {selectedProposal.secondarySupervisorName || selectedProposal.secondarySupervisor}
                      </Typography>
                    )}
                    {selectedProposal.reviewedAt && (
                      <Typography variant="caption" color="text.secondary">
                        Đã đánh giá lúc: {formatDate(selectedProposal.reviewedAt)}
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <>
                    {isPrimarySupervisor(selectedProposal) ? (
                      <>
                        {selectedProposal.status === PROPOSAL_STATUS.PENDING && (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Alert severity="info" sx={{ mb: 1 }}>Bạn là GVHD chính - có quyền phê duyệt/chỉnh sửa</Alert>
                            <Button
                              variant="contained"
                              color="success"
                              startIcon={<CheckIcon />}
                              onClick={() => handleReview(selectedProposal, PROPOSAL_STATUS.APPROVED)}
                              fullWidth
                            >
                              Phê duyệt
                            </Button>
                            <Button
                              variant="contained"
                              color="error"
                              startIcon={<CloseIcon />}
                              onClick={() => handleReview(selectedProposal, PROPOSAL_STATUS.REJECTED)}
                              fullWidth
                            >
                              Từ chối
                            </Button>
                          </Box>
                        )}
                        {canEditProposal(selectedProposal) && selectedProposal.status !== PROPOSAL_STATUS.PENDING && (
                          <Box>
                            <Alert severity="info" sx={{ mb: 1 }}>Bạn là GVHD chính - có quyền chỉnh sửa</Alert>
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
                      <Alert severity="warning">Bạn là GVHD phụ - chỉ có quyền xem, không thể chỉnh sửa</Alert>
                    )}

                    {canEditProposal(selectedProposal) && (
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
                              <Typography key={i} variant="body2" color="text.secondary">
                                {f.name}
                              </Typography>
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
                            onClick={() => handleUploadFiles(selectedProposal._id)}
                            variant="contained"
                            size="small"
                            disabled={uploadingFiles || selectedFiles.length === 0}
                          >
                            {uploadingFiles ? 'Đang upload...' : 'Upload'}
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedFiles([]);
                              setFileDescription('');
                            }}
                            variant="outlined"
                            size="small"
                          >
                            Hủy
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </>
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
    );
  };

  // Render review dialog
  const renderReviewDialog = () => (
    <Dialog open={reviewDialog} onClose={() => setReviewDialog(false)} maxWidth="md" fullWidth>
      <DialogTitle>
        {reviewData.status === PROPOSAL_STATUS.APPROVED ? 'Phê duyệt đề tài' : 'Từ chối đề tài'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Tên đề tài"
            value={reviewData.topicTitle}
            onChange={(e) => setReviewData(prev => ({ ...prev, topicTitle: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Nội dung đề tài"
            value={reviewData.content}
            onChange={(e) => setReviewData(prev => ({ ...prev, content: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <Autocomplete
            options={lecturers}
            getOptionLabel={(option) => `${option.fullName} (${option.username})`}
            value={lecturers.find(l => l.username === reviewData.secondarySupervisor) || null}
            onChange={(event, newValue) => {
              setReviewData(prev => ({ ...prev, secondarySupervisor: newValue?.username || '' }));
            }}
            renderInput={(params) => (
              <TextField {...params} label="Giảng viên đồng hướng dẫn" placeholder="Chọn giảng viên (không bắt buộc)" />
            )}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            required
            multiline
            rows={3}
            label="Nhận xét của giảng viên"
            value={reviewData.comments}
            onChange={(e) => setReviewData(prev => ({ ...prev, comments: e.target.value }))}
            placeholder="Nhập nhận xét về đề xuất này..."
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setReviewDialog(false)}>Hủy</Button>
        <Button
          onClick={handleSubmitReview}
          variant="contained"
          disabled={submitting}
          color={reviewData.status === PROPOSAL_STATUS.APPROVED ? 'success' : 'error'}
        >
          {submitting ? 'Đang xử lý...' : (reviewData.status === PROPOSAL_STATUS.APPROVED ? 'Phê duyệt' : 'Từ chối')}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Main render
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
    <>
      <AppLayout>
        <div className="dashboard">
          <div className="dashboard-content">
            <Box sx={{ p: 3, width: '1100px', margin: '0 auto'}}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">
                  Quản lý đề tài (Giảng viên)
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant={tabValue === 0 ? "contained" : "outlined"}
                    color="primary"
                    onClick={() => handleTabChange(null, 0)}
                    sx={{ minWidth: 150 }}
                  >
                    Đề tài chờ duyệt
                  </Button>
                  <Button
                    variant={tabValue === 1 ? "contained" : "outlined"}
                    color="success"
                    onClick={() => handleTabChange(null, 1)}
                    sx={{ minWidth: 150 }}
                  >
                    Lưu trữ
                  </Button>
                </Box>
              </Box>

              {message.text && (
                <Snackbar
                  open={Boolean(message.text)}
                  autoHideDuration={6000}
                  onClose={() => setMessage({ type: '', text: '' })}
                  anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <Alert severity={message.type} onClose={() => setMessage({ type: '', text: '' })}>
                    {message.text}
                  </Alert>
                </Snackbar>
              )}

              <Box sx={{ minHeight: '400px' }}>
                {tabValue === 0 && renderProposalTable(proposals.filter(p => p.status === PROPOSAL_STATUS.PENDING))}
                {tabValue === 1 && (
                  archiveLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    renderProposalTable(archiveProposals, true)
                  )
                )}
              </Box>

              {renderDetailDialog()}
              {renderReviewDialog()}

              {/* Confirm delete dialog */}
              <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                <DialogTitle>Xác nhận</DialogTitle>
                <DialogContent>
                  <Typography>Bạn có chắc chắn muốn xóa file này?</Typography>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setConfirmOpen(false)}>Hủy</Button>
                  <Button color="error" onClick={performDeleteFile} disabled={deleting}>
                    {deleting ? 'Đang xóa...' : 'Xác nhận'}
                  </Button>
                </DialogActions>
              </Dialog>

              {/* Preview dialog */}
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
                  <Button component="a" href={previewUrl} download={previewName}>
                    Tải
                  </Button>
                </DialogActions>
              </Dialog>
            </Box>
          </div>
        </div>
      </AppLayout>
    </>
  );
}

export default SupervisorTopics;
