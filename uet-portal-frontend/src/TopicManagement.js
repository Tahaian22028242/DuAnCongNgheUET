import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Alert, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, IconButton, TextField, List, ListItem,
  ListItemText, ListItemSecondaryAction, Tooltip, Fab, Autocomplete, Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import axios from 'axios';
import { format } from 'date-fns';
import AppLayout from './AppLayout';

function TopicManagement() {
  // State for proposals list
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  // State for proposal form (create/edit)
  const [proposeDialogOpen, setProposeDialogOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState(null);
  const [formData, setFormData] = useState({
    topicTitle: '',
    content: '',
    primarySupervisor: null,
    secondarySupervisor: null,
    attachments: []
  });
  const [supervisors, setSupervisors] = useState([]);
  const [supervisorsLoading, setSupervisorsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // State for view detail dialog
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // State for outline dialog
  const [outlineDialogOpen, setOutlineDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileDescription, setFileDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  // State for supervisor review
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewData, setReviewData] = useState({
    status: '',
    comments: '',
    topicTitle: '',
    content: '',
    secondarySupervisor: ''
  });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // State for outline review
  const [outlineReviewDialogOpen, setOutlineReviewDialogOpen] = useState(false);
  const [outlineReviewComments, setOutlineReviewComments] = useState('');
  const [outlineReviewStatus, setOutlineReviewStatus] = useState('');
  const [outlineReviewSubmitting, setOutlineReviewSubmitting] = useState(false);
  const [lecturers, setLecturers] = useState([]);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  const MAX_FILE_SIZE_IN_MB = 50;
  const MAX_FILE_SIZE = MAX_FILE_SIZE_IN_MB * 1024 * 1024;

  useEffect(() => {
    fetchProposals();
    if (['Giảng viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'].includes(user.role)) {
      fetchLecturers();
    }
  }, []);

  const fetchProposals = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      if (user.role === 'Sinh viên') {
        endpoint = 'http://localhost:5000/student/topic-proposals-archive';
      } else if (['Giảng viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'].includes(user.role)) {
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

  const fetchSupervisors = async () => {
    setSupervisorsLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/supervisors', {
        withCredentials: true,
      });
      setSupervisors(response.data);
      setSupervisorsLoading(false);
    } catch (err) {
      console.error('Error fetching supervisors:', err);
      setMessage({ type: 'error', text: 'Không thể tải danh sách giảng viên.' });
      setSupervisorsLoading(false);
    }
  };

  const fetchLecturers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/supervisors', {
        withCredentials: true,
      });
      setLecturers(response.data);
    } catch (err) {
      console.error('Error fetching lecturers:', err);
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

  const formatFileSize = (bytes) => {
    if (typeof bytes !== 'number' || isNaN(bytes)) return 'Invalid';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const absBytes = Math.abs(bytes);
    let i = Math.floor(Math.log(absBytes) / Math.log(k));
    i = Math.min(i, sizes.length - 1);
    const value = Math.round((absBytes / Math.pow(k, i)) * 100) / 100;
    const sign = bytes < 0 ? '-' : '';
    return sign + value + ' ' + sizes[i];
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

  const canEditProposal = (proposal) => {
    // Chỉ cho phép chỉnh sửa khi đề tài chưa được duyệt
    const editableStatuses = ['pending', 'rejected', 'rejected_by_head', 'rejected_by_faculty_leader'];
    return editableStatuses.includes(proposal.status);
  };

  const handleOpenProposeDialog = (proposal = null) => {
    if (proposal) {
      // Edit mode
      setEditingProposal(proposal);
      const primary = supervisors.find(s => s.username === proposal.primarySupervisor);
      const secondary = proposal.secondarySupervisor
        ? supervisors.find(s => s.username === proposal.secondarySupervisor)
        : null;

      setFormData({
        topicTitle: proposal.topicTitle,
        content: proposal.content,
        primarySupervisor: primary || null,
        secondarySupervisor: secondary || null,
        attachments: []
      });
    } else {
      // Create mode
      setEditingProposal(null);
      setFormData({
        topicTitle: '',
        content: '',
        primarySupervisor: null,
        secondarySupervisor: null,
        attachments: []
      });
    }
    fetchSupervisors();
    setProposeDialogOpen(true);
  };

  const handleCloseProposeDialog = () => {
    setProposeDialogOpen(false);
    setEditingProposal(null);
    setFormData({
      topicTitle: '',
      content: '',
      primarySupervisor: null,
      secondarySupervisor: null,
      attachments: []
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        setMessage({ type: 'warning', text: `File ${file.name} quá lớn (tối đa ${MAX_FILE_SIZE_IN_MB}MB)` });
        return false;
      }
      return true;
    });

    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...validFiles]
    }));
  };

  const handleRemoveFile = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const handleSubmitProposal = async (e) => {
    e.preventDefault();

    if (!formData.topicTitle.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập tên đề tài.' });
      return;
    }
    if (!formData.content.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập nội dung đề tài.' });
      return;
    }
    if (!formData.primarySupervisor) {
      setMessage({ type: 'error', text: 'Vui lòng chọn giảng viên hướng dẫn chính.' });
      return;
    }

    setSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('topicTitle', formData.topicTitle.trim());
      formDataToSend.append('content', formData.content.trim());
      formDataToSend.append('primarySupervisor', formData.primarySupervisor.username);
      formDataToSend.append('secondarySupervisor', formData.secondarySupervisor?.username || '');

      formData.attachments.forEach((file) => {
        formDataToSend.append('outlineFiles', file);
      });

      let response;
      if (editingProposal) {
        // Update existing proposal
        response = await axios.put(
          `http://localhost:5000/student/resubmit-topic/${editingProposal._id}`,
          formDataToSend,
          { withCredentials: true }
        );
        setMessage({ type: 'success', text: 'Cập nhật và gửi lại đề xuất thành công!' });
      } else {
        // Create new proposal
        response = await axios.post(
          'http://localhost:5000/student/propose-topic',
          formDataToSend,
          { withCredentials: true }
        );
        setMessage({ type: 'success', text: 'Đề xuất đề tài thành công! Vui lòng chờ giảng viên phê duyệt.' });
      }

      handleCloseProposeDialog();
      fetchProposals(); // Refresh list
    } catch (err) {
      console.error('Error submitting proposal:', err);
      const serverMessage = err.response?.data?.message;
      const status = err.response?.status;
      let displayText = editingProposal ? 'Có lỗi xảy ra khi cập nhật đề xuất.' : 'Có lỗi xảy ra khi gửi đề xuất.';
      if (serverMessage) displayText = `${serverMessage}${status ? ` (HTTP ${status})` : ''}`;
      else if (err.message) displayText = `${err.message}${status ? ` (HTTP ${status})` : ''}`;
      setMessage({ type: 'error', text: displayText });
    }
    setSubmitting(false);
  };

  const handleViewDetail = (proposal) => {
    setSelectedProposal(proposal);
    setDetailDialogOpen(true);
  };

  const handleViewOutline = (proposal) => {
    setSelectedProposal(proposal);
    setOutlineDialogOpen(true);
  };

  const handleDownloadFile = async (proposalId, filename, originalName) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/download-outline/${proposalId}/${filename}`,
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

  // Open file in new tab by fetching as blob (includes auth cookie)
  const handleViewFile = async (proposalId, filename, originalName) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/download-outline/${proposalId}/${filename}`,
        {
          withCredentials: true,
          responseType: 'blob'
        }
      );

      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Error viewing file:', err);
      console.log(user.role);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Lỗi khi xem file' });
    }
  };

  const handleDeleteFile = async (proposalId, filename) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa file này?')) {
      return;
    }

    try {
      await axios.delete(
        `http://localhost:5000/delete-outline/${proposalId}/${filename}`,
        { withCredentials: true }
      );

      setMessage({ type: 'success', text: 'Đã xóa file thành công' });
      fetchProposals();

      if (selectedProposal) {
        const updatedProposal = {
          ...selectedProposal,
          outlineFiles: selectedProposal.outlineFiles.filter(f => f.filename !== filename)
        };
        setSelectedProposal(updatedProposal);
      }
    } catch (err) {
      console.error('Error deleting file:', err);
      console.log(user.role);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Lỗi khi xóa file'
      });
    }
  };

  const handleDeleteProposal = async (proposalId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đề tài này? Hành động không thể hoàn tác.')) return;
    try {
      await axios.delete(`http://localhost:5000/student/delete-topic/${proposalId}`, { withCredentials: true });
      setMessage({ type: 'success', text: 'Đã xóa đề tài thành công' });
      // Close dialog if open
      handleCloseProposeDialog();
      fetchProposals();
    } catch (err) {
      console.error('Error deleting proposal:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Lỗi khi xóa đề tài' });
    }
  };

  // Supervisor review functions
  const handleOpenReviewDialog = (proposal, status) => {
    setSelectedProposal(proposal);
    setReviewData({
      status: status,
      comments: '',
      topicTitle: proposal.topicTitle,
      content: proposal.content,
      secondarySupervisor: proposal.secondarySupervisor || ''
    });
    setReviewDialogOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!reviewData.comments.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập nhận xét' });
      return;
    }
    setReviewSubmitting(true);
    try {
      await axios.put(
        `http://localhost:5000/supervisor/review-topic/${selectedProposal._id}`,
        {
          status: reviewData.status,
          comments: reviewData.comments,
          topicTitle: reviewData.topicTitle,
          content: reviewData.content,
          secondarySupervisor: reviewData.secondarySupervisor
        },
        { withCredentials: true }
      );
      setMessage({ type: 'success', text: `Đã ${reviewData.status === 'approved' ? 'phê duyệt' : 'từ chối'} đề tài` });
      setReviewDialogOpen(false);
      fetchProposals();
    } catch (err) {
      console.error('Error reviewing proposal:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Lỗi khi xử lý đề tài' });
    }
    setReviewSubmitting(false);
  };

  const handleOpenOutlineReviewDialog = (proposal, status) => {
    setSelectedProposal(proposal);
    setOutlineReviewStatus(status);
    setOutlineReviewComments('');
    setOutlineReviewDialogOpen(true);
  };

  const handleSubmitOutlineReview = async () => {
    if (!outlineReviewComments.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập nhận xét' });
      return;
    }

    setOutlineReviewSubmitting(true);
    try {
      await axios.put(
        `http://localhost:5000/supervisor/review-outline/${selectedProposal._id}`,
        {
          status: outlineReviewStatus,
          comments: outlineReviewComments
        },
        { withCredentials: true }
      );

      setMessage({
        type: 'success',
        text: `Đã ${outlineReviewStatus === 'approved' ? 'phê duyệt' : 'từ chối'} đề cương`
      });
      setOutlineReviewDialogOpen(false);
      setOutlineDialogOpen(false);
      fetchProposals();
    } catch (err) {
      console.error('Error reviewing outline:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Lỗi khi phê duyệt đề cương'
      });
    }
    setOutlineReviewSubmitting(false);
  };

  const handleSupervisorUploadFiles = async (proposalId) => {
    if (selectedFiles.length === 0) {
      setMessage({ type: 'warning', text: 'Vui lòng chọn file để tải lên' });
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
        `http://localhost:5000/supervisor/manage-outline/${proposalId}`,
        formData,
        { withCredentials: true }
      );

      setMessage({ type: 'success', text: 'Tải file thành công' });
      setSelectedFiles([]);
      setFileDescription('');
      fetchProposals();
      if (selectedProposal && selectedProposal._id === proposalId) {
        const updated = await axios.get(`http://localhost:5000/supervisor/topic-proposals-archive`, { withCredentials: true });
        const updatedProposal = updated.data.find(p => p._id === proposalId);
        if (updatedProposal) setSelectedProposal(updatedProposal);
      }
    } catch (err) {
      console.error('Error uploading files:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Lỗi khi tải file' });
    }
    setUploading(false);
  };

  if (user.role !== 'Sinh viên' && !['Giảng viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'].includes(user.role)) {
    return (
      <AppLayout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">Bạn không có quyền truy cập chức năng này.</Alert>
        </Box>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
          <CircularProgress />
        </Box>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">
            {user.role === 'Sinh viên' ? 'Quản lý đề tài của tôi' :
              user.role === 'Giảng viên' || user.role === 'Lãnh đạo bộ môn' || user.role === 'Lãnh đạo khoa' ? 'Danh sách đề tài' :
                'Quản lý đề tài'}
          </Typography>
          {user.role === 'Sinh viên' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpenProposeDialog()}
              size="large"
            >
              Thêm đề xuất mới
            </Button>
          )}
        </Box>

        {message.text && (
          <Alert
            severity={message.type}
            sx={{ mb: 3 }}
            onClose={() => setMessage({ type: '', text: '' })}
          >
            {message.text}
          </Alert>
        )}

        {proposals.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Bạn chưa có đề tài nào
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Nhấn nút "Thêm đề xuất mới" để bắt đầu đề xuất đề tài của bạn
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell><strong>STT</strong></TableCell>
                  <TableCell><strong>Tên đề tài</strong></TableCell>
                  <TableCell><strong>GVHD chính</strong></TableCell>
                  <TableCell><strong>GVHD phụ</strong></TableCell>
                  <TableCell><strong>Trạng thái</strong></TableCell>
                  <TableCell><strong>Ngày gửi</strong></TableCell>
                  <TableCell><strong>Hành động</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {proposals.map((proposal, index) => (
                  <TableRow key={proposal._id} hover>
                    <TableCell>{index + 1}</TableCell>
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
                    <TableCell>{formatDate(proposal.submittedAt)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleViewDetail(proposal)}
                        >
                          Xem chi tiết
                        </Button>
                        {user.role === 'Sinh viên' && canEditProposal(proposal) && (
                          <Button
                            variant="outlined"
                            size="small"
                            color="warning"
                            startIcon={<EditIcon />}
                            onClick={() => handleOpenProposeDialog(proposal)}
                          >
                            Sửa
                          </Button>
                        )}
                        {['Giảng viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'].includes(user.role) && proposal.status === 'pending' && (
                          <>
                            <Button
                              variant="contained"
                              size="small"
                              color="success"
                              onClick={() => handleOpenReviewDialog(proposal, 'approved')}
                            >
                              Duyệt
                            </Button>
                            <Button
                              variant="contained"
                              size="small"
                              color="error"
                              onClick={() => handleOpenReviewDialog(proposal, 'rejected')}
                            >
                              Từ chối
                            </Button>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Dialog Đề xuất đề tài (Tạo mới / Chỉnh sửa) */}
        <Dialog open={proposeDialogOpen} onClose={handleCloseProposeDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingProposal ? 'Chỉnh sửa và gửi lại đề xuất' : 'Đề xuất đề tài mới'}
          </DialogTitle>
          <DialogContent>
            {editingProposal && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Bạn đang chỉnh sửa đề xuất. Sau khi lưu, đề xuất sẽ được gửi lại cho giảng viên để xem xét.
              </Alert>
            )}

            <Paper sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
              <Typography variant="body2" component="div">
                <strong>Lưu ý:</strong>
                <ul style={{ marginTop: 8, marginBottom: 0 }}>
                  <li>Tên đề tài nên ngắn gọn, súc tích</li>
                  <li>Nội dung cần mô tả chi tiết mục tiêu, phương pháp</li>
                  <li>Bắt buộc phải có GVHD chính</li>
                  <li>Có thể đính kèm file đề cương (PDF, Word, Text - tối đa {MAX_FILE_SIZE_IN_MB}MB/file)</li>
                </ul>
              </Typography>
            </Paper>

            <form onSubmit={handleSubmitProposal}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  required
                  label="Tên đề tài"
                  variant="outlined"
                  value={formData.topicTitle}
                  onChange={(e) => handleInputChange('topicTitle', e.target.value)}
                  placeholder="Nhập tên đề tài..."
                />

                <TextField
                  fullWidth
                  required
                  multiline
                  rows={6}
                  label="Nội dung đề tài"
                  variant="outlined"
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  placeholder="Mô tả chi tiết về đề tài..."
                />

                {/* Giảng viên hướng dẫn chính */}
                <Autocomplete
                  fullWidth
                  options={supervisors}
                  getOptionLabel={(option) => option ? `${option.fullName} (${option.username})` : ''}
                  value={formData.primarySupervisor}
                  onChange={(event, newValue) => {
                    handleInputChange('primarySupervisor', newValue);
                  }}
                  loading={supervisorsLoading}
                  popupIcon={formData.primarySupervisor ? null : <ArrowDropDownIcon />}
                  forcePopupIcon={!formData.primarySupervisor}
                  disableClearable={!formData.primarySupervisor}
                  clearIcon={<CloseIcon />}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      required
                      label="Giảng viên hướng dẫn chính"
                      variant="outlined"
                      placeholder="Tìm và chọn giảng viên..."
                      sx={{ minHeight: '56px' }}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {supervisorsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />

                {/* Giảng viên hướng dẫn phụ */}
                <Autocomplete
                  fullWidth
                  options={supervisors}
                  getOptionLabel={(option) => option ? `${option.fullName} (${option.username})` : ''}
                  value={formData.secondarySupervisor}
                  onChange={(event, newValue) => {
                    handleInputChange('secondarySupervisor', newValue);
                  }}
                  loading={supervisorsLoading}
                  popupIcon={formData.secondarySupervisor ? null : <ArrowDropDownIcon />}
                  forcePopupIcon={!formData.secondarySupervisor}
                  disableClearable={!formData.secondarySupervisor}
                  clearIcon={<CloseIcon />}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Giảng viên hướng dẫn phụ (tùy chọn)"
                      variant="outlined"
                      placeholder="Tìm và chọn giảng viên..."
                      sx={{ minHeight: '56px' }}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {supervisorsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />

                <Box>
                  <input
                    accept=".pdf,.doc,.docx,.txt,.zip,.rar"
                    style={{ display: 'none' }}
                    id="file-upload-propose"
                    multiple
                    type="file"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="file-upload-propose">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<AttachFileIcon />}
                      fullWidth
                    >
                      Đính kèm file đề cương (tùy chọn)
                    </Button>
                  </label>

                  {formData.attachments.length > 0 && (
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {formData.attachments.map((file, index) => (
                        <Chip
                          key={index}
                          icon={<AttachFileIcon />}
                          label={`${file.name} (${formatFileSize(file.size)})`}
                          onDelete={() => handleRemoveFile(index)}
                          deleteIcon={<DeleteIcon />}
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>
            </form>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleSubmitProposal}
              variant="contained"
              disabled={submitting}
              startIcon={<SendIcon />}
            >
              {submitting ? 'Đang gửi...' : (editingProposal ? 'Cập nhật và gửi lại' : 'Gửi đề xuất')}
            </Button>
            <Button onClick={handleCloseProposeDialog} variant="outlined">Hủy</Button>
            {editingProposal && canEditProposal(editingProposal) && (
              <Button
                onClick={() => handleDeleteProposal(editingProposal._id)}
                variant="contained"
                color="error"
              >
                Xóa
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Dialog Chi tiết đề tài */}
        <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Chi tiết đề tài</DialogTitle>
          <DialogContent>
            {selectedProposal && (
              <Box>
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

                {selectedProposal && (
                  <>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      <strong>Danh sách tài liệu đính kèm:</strong> 
                      <br />
                      <em style={{ color: 'gray' }}> {selectedProposal.outlineFiles.length} tài liệu</em>
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
                              <Tooltip title="Xem trước">
                                <IconButton
                                  edge="end"
                                  // Cho phép xem trước file (nếu là PDF, hình ảnh, txt, docx, doc)
                                  onClick={() => handleViewFile(selectedProposal._id, file.filename, file.originalName)}
                                  sx={{ mr: 1 }}
                                >
                                  <VisibilityIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Tải xuống">
                                <IconButton
                                  edge="end"
                                  onClick={() => handleDownloadFile(selectedProposal._id, file.filename, file.originalName)}
                                  sx={{ mr: 1 }}
                                >
                                  <DownloadIcon />
                                </IconButton>
                              </Tooltip>
                              {/* Cho phép Giảng viên, Lãnh đạo bộ môn, Lãnh đạo khoa (là GVHD chính) xóa file */}
                              {['Giảng viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'].includes(user.role) &&
                                user.username === selectedProposal.primarySupervisor &&
                                selectedProposal.outlineStatus !== 'approved' && (
                                  <Tooltip title="Xóa">
                                    <IconButton
                                      edge="end"
                                      onClick={() => handleDeleteFile(selectedProposal._id, file.filename)}
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
                                    onClick={() => handleDeleteFile(selectedProposal._id, file.filename)}
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
                            onClick={() => handleSupervisorUploadFiles(selectedProposal._id)}
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
                            onClick={() => handleOpenOutlineReviewDialog(selectedProposal, 'approved')}
                          >
                            Phê duyệt đề cương
                          </Button>
                          <Button
                            variant="contained"
                            color="error"
                            startIcon={<CancelIcon />}
                            onClick={() => handleOpenOutlineReviewDialog(selectedProposal, 'rejected')}
                          >
                            Từ chối
                          </Button>
                        </Box>
                      )}
                  </>
                )}

                {selectedProposal.supervisorComments && (
                  <Alert severity={selectedProposal.status === 'rejected' ? 'error' : 'info'} sx={{ mt: 2 }}>
                    <strong>Nhận xét GVHD:</strong> {selectedProposal.supervisorComments}
                  </Alert>
                )}

                {selectedProposal.headComments && (
                  <Alert severity={selectedProposal.status === 'rejected_by_head' ? 'error' : 'info'} sx={{ mt: 2 }}>
                    <strong>Nhận xét LĐBM:</strong> {selectedProposal.headComments}
                  </Alert>
                )}

                {selectedProposal.facultyLeaderComments && (
                  <Alert severity={selectedProposal.status === 'rejected_by_faculty_leader' ? 'error' : 'info'} sx={{ mt: 2 }}>
                    <strong>Nhận xét Lãnh đạo khoa:</strong> {selectedProposal.facultyLeaderComments}
                  </Alert>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailDialogOpen(false)}>Đóng</Button>
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
                          <Tooltip title="Xem trước">
                            <IconButton
                              edge="end"
                              // Cho phép xem trước file (nếu là PDF, hình ảnh, txt, docx, doc)
                              onClick={() => handleViewFile(selectedProposal._id, file.filename, file.originalName)}
                              sx={{ mr: 1 }}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Tải xuống">
                            <IconButton
                              edge="end"
                              onClick={() => handleDownloadFile(selectedProposal._id, file.filename, file.originalName)}
                              sx={{ mr: 1 }}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                          {/* Cho phép Giảng viên, Lãnh đạo bộ môn, Lãnh đạo khoa (là GVHD chính) xóa file */}
                          {['Giảng viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'].includes(user.role) &&
                            user.username === selectedProposal.primarySupervisor &&
                            selectedProposal.outlineStatus !== 'approved' && (
                              <Tooltip title="Xóa">
                                <IconButton
                                  edge="end"
                                  onClick={() => handleDeleteFile(selectedProposal._id, file.filename)}
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
                                onClick={() => handleDeleteFile(selectedProposal._id, file.filename)}
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
                        onClick={() => handleSupervisorUploadFiles(selectedProposal._id)}
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
                        onClick={() => handleOpenOutlineReviewDialog(selectedProposal, 'approved')}
                      >
                        Phê duyệt đề cương
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        startIcon={<CancelIcon />}
                        onClick={() => handleOpenOutlineReviewDialog(selectedProposal, 'rejected')}
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

        {/* Dialog Review (Phê duyệt/từ chối đề tài) */}
        <Dialog open={reviewDialogOpen} onClose={() => setReviewDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {reviewData.status === 'approved' ? 'Phê duyệt đề tài' : 'Từ chối đề tài'}
          </DialogTitle>
          <DialogContent>
            {selectedProposal && (
              <Box>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <strong>Đề tài:</strong> {selectedProposal.topicTitle}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <strong>Học viên:</strong> {selectedProposal.studentName} ({selectedProposal.studentId})
                </Typography>
                <Typography variant="body1" sx={{ mb: 3 }}>
                  <strong>Nội dung:</strong> {selectedProposal.content}
                </Typography>

                <TextField
                  fullWidth
                  required
                  multiline
                  rows={4}
                  label="Nhận xét"
                  value={reviewData.comments}
                  onChange={(e) => setReviewData({ ...reviewData, comments: e.target.value })}
                  placeholder="Nhập nhận xét của bạn..."
                />

                {user.role === 'Giảng viên' && reviewData.status === 'approved' && (
                  <>
                    <TextField
                      fullWidth
                      label="Tên đề tài (có thể chỉnh sửa)"
                      value={reviewData.topicTitle}
                      onChange={(e) => setReviewData({ ...reviewData, topicTitle: e.target.value })}
                      sx={{ mt: 2 }}
                    />
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Nội dung đề tài (có thể chỉnh sửa)"
                      value={reviewData.content}
                      onChange={(e) => setReviewData({ ...reviewData, content: e.target.value })}
                      sx={{ mt: 2 }}
                    />
                    <Autocomplete
                      fullWidth
                      options={lecturers}
                      getOptionLabel={(option) => option ? `${option.fullName} (${option.username})` : ''}
                      value={lecturers.find(l => l.username === reviewData.secondarySupervisor) || null}
                      onChange={(event, newValue) => {
                        setReviewData({ ...reviewData, secondarySupervisor: newValue?.username || '' });
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="GVHD phụ (tùy chọn)"
                          sx={{ mt: 2 }}
                        />
                      )}
                    />
                  </>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReviewDialogOpen(false)}>Hủy</Button>
            <Button
              onClick={handleSubmitReview}
              variant="contained"
              color={reviewData.status === 'approved' ? 'success' : 'error'}
              disabled={reviewSubmitting}
            >
              {reviewSubmitting ? 'Đang xử lý...' : (reviewData.status === 'approved' ? 'Phê duyệt' : 'Từ chối')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Outline Review Dialog */}
        <Dialog open={outlineReviewDialogOpen} onClose={() => setOutlineReviewDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {outlineReviewStatus === 'approved' ? 'Phê duyệt đề cương' : 'Từ chối đề cương'}
          </DialogTitle>
          <DialogContent>
            {selectedProposal && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <strong>Đề tài:</strong> {selectedProposal.topicTitle}
                </Typography>
                <TextField
                  fullWidth
                  required
                  multiline
                  rows={4}
                  label="Nhận xét về đề cương"
                  value={outlineReviewComments}
                  onChange={(e) => setOutlineReviewComments(e.target.value)}
                  placeholder="Nhập nhận xét của bạn về đề cương..."
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOutlineReviewDialogOpen(false)}>Hủy</Button>
            <Button
              onClick={handleSubmitOutlineReview}
              variant="contained"
              color={outlineReviewStatus === 'approved' ? 'success' : 'error'}
              disabled={outlineReviewSubmitting}
            >
              {outlineReviewSubmitting ? 'Đang xử lý...' : (outlineReviewStatus === 'approved' ? 'Phê duyệt' : 'Từ chối')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>

    </AppLayout>
  );
}

export default TopicManagement;
