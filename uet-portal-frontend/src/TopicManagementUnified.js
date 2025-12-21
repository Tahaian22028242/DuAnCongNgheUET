import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Box, Paper, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Alert, Chip, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Grid, Autocomplete, IconButton, Tooltip, List, ListItem, ListItemText,
  Tabs, Tab, Snackbar
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import AddIcon from '@mui/icons-material/Add';
import axios from 'axios';
import { format } from 'date-fns';
import AppLayout from './AppLayout';
import './Dashboard.css';

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

const OUTLINE_STATUS = {
  NOT_UPLOADED: 'not_uploaded',
  PENDING: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

const USER_ROLES = {
  STUDENT: 'Sinh viên',
  LECTURER: 'Giảng viên',
  HEAD: 'Lãnh đạo bộ môn',
  FACULTY_LEADER: 'Lãnh đạo khoa',
  ADMIN: 'Quản trị viên'
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

// ==================== CUSTOM HOOKS ====================
const useProposals = (user) => {
  const [proposals, setProposals] = useState([]);
  const [archiveProposals, setArchiveProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [error, setError] = useState('');

  const getApiEndpoint = useCallback(() => {
    switch (user.role) {
      case USER_ROLES.STUDENT:
        return '/student/topic-proposals';
      case USER_ROLES.LECTURER:
        return '/supervisor/topic-proposals';
      case USER_ROLES.HEAD:
        return user.isViewingAsHead ? '/head/topic-proposals' : '/supervisor/topic-proposals';
      case USER_ROLES.FACULTY_LEADER:
        return user.isViewingAsFaculty ? '/faculty-leader/topic-proposals' : '/supervisor/topic-proposals';
      default:
        return null;
    }
  }, [user.role, user.isViewingAsHead, user.isViewingAsFaculty]);

  const getArchiveEndpoint = useCallback(() => {
    switch (user.role) {
      case USER_ROLES.STUDENT:
        return '/student/topic-proposals-archive';
      case USER_ROLES.LECTURER:
        return '/supervisor/topic-proposals-archive';
      case USER_ROLES.HEAD:
        return '/head/topic-proposals-archive';
      case USER_ROLES.FACULTY_LEADER:
        return '/faculty-leader/topic-proposals-archive';
      default:
        return null;
    }
  }, [user.role]);

  const fetchProposals = useCallback(async () => {
    const endpoint = getApiEndpoint();
    if (!endpoint) {
      setError('Không xác định được endpoint');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}${endpoint}`, { withCredentials: true });
      setProposals(res.data);
    } catch (err) {
      console.error('Error fetching proposals:', err);
      setError(err.response?.status === 403 
        ? 'Bạn không có quyền truy cập chức năng này.' 
        : 'Không thể tải danh sách đề xuất.');
    } finally {
      setLoading(false);
    }
  }, [getApiEndpoint]);

  const fetchArchive = useCallback(async () => {
    const endpoint = getArchiveEndpoint();
    if (!endpoint) return;

    setArchiveLoading(true);
    try {
      const res = await axios.get(`${API_BASE}${endpoint}`, { withCredentials: true });
      setArchiveProposals(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching archive:', err);
      setArchiveProposals([]);
    } finally {
      setArchiveLoading(false);
    }
  }, [getArchiveEndpoint]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  return {
    proposals,
    archiveProposals,
    loading,
    archiveLoading,
    error,
    fetchProposals,
    fetchArchive,
    setProposals
  };
};

const useLecturers = () => {
  const [lecturers, setLecturers] = useState([]);

  useEffect(() => {
    const fetchLecturers = async () => {
      try {
        const res = await axios.get(`${API_BASE}/lecturers`, { withCredentials: true });
        setLecturers(res.data);
      } catch (err) {
        console.error('Error fetching lecturers:', err);
      }
    };
    fetchLecturers();
  }, []);

  return lecturers;
};

// ==================== MAIN COMPONENT ====================
function TopicManagementUnified() {
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);
  
  // State management
  const [tabValue, setTabValue] = useState(0);
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
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileDescription, setFileDescription] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewName, setPreviewName] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteFilename, setPendingDeleteFilename] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // State for student proposal form
  const [proposeDialogOpen, setProposeDialogOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState(null);
  const [formData, setFormData] = useState({
    topicTitle: '',
    content: '',
    primarySupervisor: null,
    secondarySupervisor: null,
    attachments: []
  });

  // Custom hooks
  const { proposals, archiveProposals, loading, archiveLoading, error, fetchProposals, fetchArchive } = useProposals(user);
  const lecturers = useLecturers();

  // Get page title based on role
  const getPageTitle = () => {
    switch (user.role) {
      case USER_ROLES.STUDENT:
        return 'Quản lý đề tài của tôi';
      case USER_ROLES.LECTURER:
        return 'Quản lý đề tài (Giảng viên)';
      case USER_ROLES.HEAD:
        return 'Quản lý đề tài (Lãnh đạo bộ môn)';
      case USER_ROLES.FACULTY_LEADER:
        return 'Quản lý đề cương (Lãnh đạo khoa)';
      default:
        return 'Quản lý đề tài';
    }
  };

  // Handlers
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    if (newValue === 1 && archiveProposals.length === 0) {
      fetchArchive();
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

      const endpoint = user.role === USER_ROLES.STUDENT 
        ? `/student/upload-outline/${proposalId}`
        : `/supervisor/manage-outline/${proposalId}`;

      await axios.post(`${API_BASE}${endpoint}`, fd, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessage({ type: 'success', text: 'Tải lên tệp thành công!' });
      setSelectedFiles([]);
      setFileDescription('');
      fetchProposals();
      if (tabValue === 1) fetchArchive();
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
      if (tabValue === 1) fetchArchive();
      
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

  // Student-specific handlers
  const handleOpenProposeDialog = (proposal = null) => {
    if (proposal) {
      setEditingProposal(proposal);
      setFormData({
        topicTitle: proposal.topicTitle,
        content: proposal.content,
        primarySupervisor: lecturers.find(l => l.username === proposal.primarySupervisor) || null,
        secondarySupervisor: proposal.secondarySupervisor ? lecturers.find(l => l.username === proposal.secondarySupervisor) : null,
        attachments: []
      });
    } else {
      setEditingProposal(null);
      setFormData({
        topicTitle: '',
        content: '',
        primarySupervisor: null,
        secondarySupervisor: null,
        attachments: []
      });
    }
    setProposeDialogOpen(true);
  };

  const handleSubmitProposal = async (e) => {
    e.preventDefault();
    if (!formData.topicTitle.trim() || !formData.content.trim() || !formData.primarySupervisor) {
      setMessage({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin bắt buộc' });
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('topicTitle', formData.topicTitle.trim());
      fd.append('content', formData.content.trim());
      fd.append('primarySupervisor', formData.primarySupervisor.username);
      if (formData.secondarySupervisor) {
        fd.append('secondarySupervisor', formData.secondarySupervisor.username);
      }
      formData.attachments.forEach(file => {
        fd.append('outlineFiles', file);
      });

      if (editingProposal) {
        await axios.put(`${API_BASE}/student/resubmit-topic/${editingProposal._id}`, fd, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setMessage({ type: 'success', text: 'Đã cập nhật đề tài thành công!' });
      } else {
        await axios.post(`${API_BASE}/student/propose-topic`, fd, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setMessage({ type: 'success', text: 'Đã gửi đề xuất thành công!' });
      }
      setProposeDialogOpen(false);
      fetchProposals();
    } catch (err) {
      console.error('Error submitting proposal:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Có lỗi xảy ra' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProposal = async (proposalId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đề tài này?')) return;
    try {
      await axios.delete(`${API_BASE}/student/delete-topic/${proposalId}`, { withCredentials: true });
      setMessage({ type: 'success', text: 'Đã xóa đề tài' });
      fetchProposals();
    } catch (err) {
      console.error('Error deleting proposal:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Lỗi khi xóa đề tài' });
    }
  };

  // Check permissions
  const isPrimarySupervisor = (proposal) => user.username === proposal?.primarySupervisor;
  const canEditProposal = (proposal) => {
    if (user.role === USER_ROLES.STUDENT) {
      return ![
        PROPOSAL_STATUS.APPROVED,
        PROPOSAL_STATUS.APPROVED_HEAD,
        PROPOSAL_STATUS.APPROVED_FACULTY,
        PROPOSAL_STATUS.WAITING_HEAD,
        PROPOSAL_STATUS.WAITING_FACULTY
      ].includes(proposal?.status);
    }
    return isPrimarySupervisor(proposal) && ![
      PROPOSAL_STATUS.REJECTED,
      PROPOSAL_STATUS.REJECTED_HEAD,
      PROPOSAL_STATUS.REJECTED_FACULTY
    ].includes(proposal?.status);
  };
  const canDeleteFile = (proposal) => {
    if (user.role === USER_ROLES.STUDENT) {
      return proposal?.outlineStatus !== OUTLINE_STATUS.APPROVED;
    }
    return [USER_ROLES.LECTURER, USER_ROLES.HEAD, USER_ROLES.FACULTY_LEADER].includes(user.role) &&
      isPrimarySupervisor(proposal) &&
      (tabValue === 1 || proposal?.outlineStatus !== OUTLINE_STATUS.APPROVED);
  };

  // Render functions
  const renderProposalTable = (proposalsList, isArchive = false) => {
    if (proposalsList.length === 0) {
      return (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {isArchive ? 'Không có đề tài trong lưu trữ.' : 'Hiện chưa có đề xuất nào.'}
          </Typography>
        </Paper>
      );
    }

    const isStudent = user.role === USER_ROLES.STUDENT;

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
                {!isStudent && (
                  <>
                    <TableCell><strong>Học viên</strong></TableCell>
                    <TableCell><strong>Khoa</strong></TableCell>
                    <TableCell><strong>Ngành</strong></TableCell>
                  </>
                )}
                <TableCell><strong>GVHD chính</strong></TableCell>
                <TableCell><strong>GVHD phụ</strong></TableCell>
                <TableCell><strong>Trạng thái</strong></TableCell>
                <TableCell><strong>Hành động</strong></TableCell>
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
                  {!isStudent && (
                    <>
                      <TableCell>
                        {proposal.studentName}
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          {proposal.studentId}
                        </Typography>
                      </TableCell>
                      <TableCell>{proposal.studentFaculty || 'N/A'}</TableCell>
                      <TableCell>{proposal.studentMajor || 'N/A'}</TableCell>
                    </>
                  )}
                  <TableCell>{proposal.primarySupervisorName || proposal.primarySupervisor}</TableCell>
                  <TableCell>{proposal.secondarySupervisorName || proposal.secondarySupervisor || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusText(proposal.status)}
                      color={getStatusColor(proposal.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<VisibilityIcon />}
                        onClick={() => {
                          setSelectedProposal(proposal);
                          setReviewDialog(false);
                        }}
                      >
                        Xem
                      </Button>
                      {isStudent && !isArchive && canEditProposal(proposal) && (
                        <>
                          <Tooltip title="Chỉnh sửa">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenProposeDialog(proposal)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Xóa">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteProposal(proposal._id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
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

  const renderDetailDialog = () => (
    <Dialog
      open={selectedProposal !== null && !reviewDialog && !proposeDialogOpen}
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
                  <em style={{ color: 'gray' }}> {selectedProposal.outlineFiles?.length || 0} tài liệu</em>
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
                  <Typography color="text.secondary"> Không có tài liệu đính kèm</Typography>
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
                ) : user.role === USER_ROLES.STUDENT ? (
                  <Box>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      {canEditProposal(selectedProposal) 
                        ? 'Bạn có thể chỉnh sửa đề tài này'
                        : 'Đề tài đã được phê duyệt/đang chờ xử lý'}
                    </Alert>
                    {selectedProposal.outlineStatus !== OUTLINE_STATUS.APPROVED && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>Tải lên tệp đề cương:</Typography>
                        <input
                          accept=".pdf,.doc,.docx,.txt,.zip,.rar"
                          style={{ display: 'none' }}
                          id={`student-upload-${selectedProposal._id}`}
                          multiple
                          type="file"
                          onChange={handleFileSelect}
                        />
                        <label htmlFor={`student-upload-${selectedProposal._id}`}>
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

  const renderProposeDialog = () => (
    <Dialog open={proposeDialogOpen} onClose={() => setProposeDialogOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>{editingProposal ? 'Chỉnh sửa đề tài' : 'Đề xuất đề tài mới'}</DialogTitle>
      <form onSubmit={handleSubmitProposal}>
        <DialogContent>
          <TextField
            fullWidth
            required
            label="Tên đề tài"
            value={formData.topicTitle}
            onChange={(e) => setFormData(prev => ({ ...prev, topicTitle: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            required
            multiline
            rows={6}
            label="Nội dung đề tài"
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <Autocomplete
            options={lecturers}
            getOptionLabel={(option) => `${option.fullName} (${option.username})`}
            value={formData.primarySupervisor}
            onChange={(event, newValue) => {
              setFormData(prev => ({ ...prev, primarySupervisor: newValue }));
            }}
            renderInput={(params) => (
              <TextField {...params} label="Giảng viên hướng dẫn chính *" required />
            )}
            sx={{ mb: 2 }}
          />
          <Autocomplete
            options={lecturers}
            getOptionLabel={(option) => `${option.fullName} (${option.username})`}
            value={formData.secondarySupervisor}
            onChange={(event, newValue) => {
              setFormData(prev => ({ ...prev, secondarySupervisor: newValue }));
            }}
            renderInput={(params) => (
              <TextField {...params} label="Giảng viên hướng dẫn phụ (không bắt buộc)" />
            )}
            sx={{ mb: 2 }}
          />
          <Box>
            <input
              accept=".pdf,.doc,.docx"
              style={{ display: 'none' }}
              id="attachments-upload"
              multiple
              type="file"
              onChange={(e) => setFormData(prev => ({ ...prev, attachments: Array.from(e.target.files || []) }))}
            />
            <label htmlFor="attachments-upload">
              <Button variant="outlined" component="span" startIcon={<UploadFileIcon />}>
                Đính kèm file
              </Button>
            </label>
            {formData.attachments.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Đã chọn {formData.attachments.length} file
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProposeDialogOpen(false)}>Hủy</Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Đang xử lý...' : (editingProposal ? 'Cập nhật' : 'Gửi đề xuất')}
          </Button>
        </DialogActions>
      </form>
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
    <AppLayout>
      <div className="dashboard">
        <div className="dashboard-content">
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h4">
                {getPageTitle()}
              </Typography>
              {user.role === USER_ROLES.STUDENT && tabValue === 0 && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenProposeDialog()}
                >
                  Đề xuất đề tài mới
                </Button>
              )}
            </Box>

            {message.text && (
              <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage({ type: '', text: '' })}>
                {message.text}
              </Alert>
            )}

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab label={user.role === USER_ROLES.STUDENT ? "Đề tài của tôi" : "Đề tài chờ duyệt"} />
                <Tab label="Lưu trữ" />
              </Tabs>
            </Box>

            {tabValue === 0 && renderProposalTable(proposals)}
            {tabValue === 1 && (
              archiveLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                renderProposalTable(archiveProposals, true)
              )
            )}

            {renderDetailDialog()}
            {renderReviewDialog()}
            {user.role === USER_ROLES.STUDENT && renderProposeDialog()}

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
  );
}

export default TopicManagementUnified;
