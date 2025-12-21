import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Alert, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, 
  IconButton, Tooltip, Chip, Grid, CircularProgress, Snackbar
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import AppLayout from './AppLayout';
import axios from 'axios';
import { format } from 'date-fns';

function HeadTopics() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [comments, setComments] = useState('');
  const [proposals, setProposals] = useState([]);
  const [archiveProposals, setArchiveProposals] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0); // 0 = Chờ duyệt, 1 = Lưu trữ
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [reviewData, setReviewData] = useState({
    status: '',
    comments: '',
    topicTitle: '',
    content: '',
    attachmentFiles: []
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [lecturers, setLecturers] = useState([]); // Danh sách giảng viên
  const [headComments, setHeadComments] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileDescription, setFileDescription] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewName, setPreviewName] = useState('');
  const [previewContentType, setPreviewContentType] = useState('');
  const [previewText, setPreviewText] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchArchiveProposals = useCallback(async () => {
    setArchiveLoading(true);
    try {
      const response = await fetch('http://localhost:5000/head/topic-proposals-archive', {
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) {
        setArchiveProposals(data);
      }
    } catch (error) {
      console.error('Could not load archive proposals:', error);
    }
    setArchiveLoading(false);
  }, []);

  useEffect(() => {
    // fetch list of lecturers for secondary supervisor autocomplete (optional)
    const fetchLecturers = async () => {
      try {
        const res = await axios.get('http://localhost:5000/lecturers', { withCredentials: true });
        setLecturers(res.data || []);
      } catch (err) {
        // non-fatal
        console.error('Could not fetch lecturers for HeadTopics:', err);
      }
    };
    fetchLecturers();
  }, []);

  // sync headComments when a proposal is selected
  useEffect(() => {
    if (selectedProposal) {
      // try several possible comment fields coming from backend
      const val = selectedProposal.headComments || selectedProposal.headComment || selectedProposal.reviewComments || selectedProposal.supervisorComments || '';
      setHeadComments(val);
    } else {
      setHeadComments('');
    }
  }, [selectedProposal]);

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

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    if (newValue === 1 && archiveProposals.length === 0) {
      fetchArchiveProposals();
    }
  };

  const handleHideFromArchive = async (proposalId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đề tài này khỏi danh sách lưu trữ của bạn? Đề tài vẫn tồn tại trong dữ liệu hệ thống.')) {
      return;
    }
    try {
      const res = await axios.put(`http://localhost:5000/head/hide-archive/${proposalId}`, {}, { withCredentials: true });
      setMessage({ type: 'success', text: res.data?.message || 'Đã xóa khỏi lưu trữ' });
      await fetchArchiveProposals();
    } catch (err) {
      console.error('Error hiding from archive:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Lỗi khi xóa' });
    }
  };

  // Open a review dialog (approve/reject) - mirror SupervisorTopics flow
  const handleReview = (status) => {
    if (!selectedProposal) return;
    setReviewData({
      status,
      comments: headComments || '',
      topicTitle: selectedProposal.topicTitle || '',
      content: selectedProposal.content || '',
      attachmentFiles: selectedProposal.outlineFiles || [],
    });
    // close detail dialog and open review dialog
    setDialogOpen(false);
    setReviewDialog(true);
  };

  const isFinalStatus = (status) => {
    return ['approved', 'approved_by_head', 'approved_by_faculty_leader', 'rejected', 'rejected_by_head', 'rejected_by_faculty_leader'].includes(status);
  };

  const handleSaveHeadComments = async () => {
    if (!selectedProposal) return;
    try {
      // Save comments via dedicated endpoint that doesn't require a final status
      const res = await axios.put(`http://localhost:5000/head/save-comment/${selectedProposal._id}`, {
        comments: (headComments || '').trim()
      }, { withCredentials: true });
      setMessage({ type: 'success', text: res.data?.message || 'Đã lưu nhận xét.' });
      // refresh both lists to get updated comment
      await fetchProposals();
      await fetchArchiveProposals();
      // refresh selected proposal from server (search in both lists)
      const refreshedPending = await axios.get(`http://localhost:5000/head/topic-proposals`, { withCredentials: true });
      const refreshedArchive = await axios.get(`http://localhost:5000/head/topic-proposals-archive`, { withCredentials: true });
      const combined = [...(refreshedPending.data || []), ...(refreshedArchive.data || [])];
      const found = combined.find(p => p._id === selectedProposal._id);
      if (found) setSelectedProposal(found);
    } catch (err) {
      console.error('Error saving head comments:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Lỗi khi lưu nhận xét' });
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewData.comments || !reviewData.comments.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập nhận xét.' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.put(`http://localhost:5000/head/review-topic/${selectedProposal._id}`, {
        status: reviewData.status,
        comments: reviewData.comments.trim(),
        topicTitle: reviewData.topicTitle.trim(),
        content: reviewData.content.trim()
      }, { withCredentials: true });
      setMessage({ type: 'success', text: res.data?.message || 'Đã cập nhật đánh giá' });
      setReviewDialog(false);
      setSelectedProposal(null);
      fetchProposals();
      fetchArchiveProposals();
    } catch (err) {
      console.error('Error submitting head review:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Lỗi khi gửi đánh giá' });
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

  const handleViewFile = async (proposalId, file) => {
    const name = file.originalName || file.originalname || file.filename;
    try {
      const res = await axios.get(
        `http://localhost:5000/download-outline/${proposalId}/${file.filename}`,
        { responseType: 'blob', withCredentials: true }
      );
      const blob = res.data; // axios returns a Blob when responseType='blob'
      const mime = blob.type || '';
      const url = window.URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewName(name);
      setPreviewContentType('');
      setPreviewText(null);

      if (mime.startsWith('image/')) {
        setPreviewContentType('image');
      } else if (mime === 'application/pdf') {
        setPreviewContentType('pdf');
      } else if (mime.startsWith('text/')) {
        setPreviewContentType('text');
        try {
          const text = await blob.text();
          setPreviewText(text);
        } catch (e) {
          setPreviewText(null);
        }
      } else {
        // unknown/unsupported by browser preview — still provide download
        setPreviewContentType('unknown');
      }
      setPreviewOpen(true);
    } catch (err) {
      console.error('Error fetching file for preview:', err);
      setMessage({ type: 'error', text: 'Không thể xem file' });
    }
  };



  const handleDownloadFile = async (proposalId, filename, originalName) => {
    try {
      const res = await axios.get(
        `http://localhost:5000/download-outline/${proposalId}/${filename}`,
        { responseType: 'blob', withCredentials: true }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName || filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading file:', err);
      setMessage({ type: 'error', text: 'Không thể tải file' });
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

  const renderProposalTable = (proposalsList, isArchive = false) => {
    if (proposalsList.length === 0) {
      return (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {isArchive ? 'Chưa có đề tài nào trong lưu trữ.' : 'Không có đề tài nào chờ phê duyệt.'}
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
                          setDialogOpen(true);
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

  if (loading) {
    return (
      <AppLayout>
        <div className="dashboard">
          <div className="dashboard-content">
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          </div>
        </div>
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
                  Quản lý đề tài (Lãnh đạo bộ môn)
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
              </Box>

              {/* Dialog xem chi tiết đề tài */}
              <Dialog
                open={selectedProposal !== null && !reviewDialog}
                onClose={() => setSelectedProposal(null)}
                maxWidth="lg"
                width='auto'
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
                      {/* Simplified view for archive tab */}
                      {tabValue === 1 ? (
                        <Box sx={{ minWidth: 600, width: "100%" }}>
                          <Typography variant="subtitle2" gutterBottom>
                            <strong>Học viên:</strong> {selectedProposal.studentName} ({selectedProposal.studentId})
                          </Typography>
                          <Typography variant="subtitle2" gutterBottom>
                            <strong>Khoa:</strong> {selectedProposal.studentFaculty || 'N/A'}
                          </Typography>
                          <Typography variant="subtitle2" gutterBottom>
                            <strong>Ngành:</strong> {selectedProposal.studentMajor || 'N/A'}
                          </Typography>
                          <Typography variant="subtitle2" gutterBottom>
                            <strong>GVHD chính:</strong> {selectedProposal.primarySupervisorName || selectedProposal.primarySupervisor}
                          </Typography>
                          {selectedProposal.secondarySupervisor && (
                            <Typography variant="subtitle2" gutterBottom>
                              <strong>GVHD phụ:</strong> {selectedProposal.secondarySupervisorName || selectedProposal.secondarySupervisor}
                            </Typography>
                          )}
                          <Typography variant="subtitle2" gutterBottom>
                            <strong>Ngày gửi:</strong> {formatDate(selectedProposal.submittedAt)}
                          </Typography>

                          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                            <strong>Nội dung đề tài:</strong>
                          </Typography>
                          <Paper sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                              {selectedProposal.content}
                            </Typography>
                          </Paper>

                          {selectedProposal.supervisorComments && selectedProposal.supervisorComments.length > 0 && (
                            <>
                              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                                <strong>Nhận xét của GVHD:</strong>
                              </Typography>
                              <Paper sx={{ p: 2, bgcolor: '#e3f2fd', mb: 1 }}>
                                <Typography variant="body2">{selectedProposal.supervisorComments}</Typography>
                              </Paper>
                              {selectedProposal.reviewedAt && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                                  Đánh giá lúc: {formatDate(selectedProposal.reviewedAt)}
                                </Typography>
                              )}
                            </>
                          )}

                          {selectedProposal.headComments && selectedProposal.headComments.length > 0 && (
                            <>
                              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                                <strong>Nhận xét của Lãnh đạo bộ môn:</strong>
                              </Typography>
                              <Paper sx={{ p: 2, bgcolor: '#fff8e1', mb: 1 }}>
                                <Typography variant="body2">{selectedProposal.headComments}</Typography>
                              </Paper>
                              {selectedProposal.headReviewedAt ? (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                                  Đã đánh giá lúc: {formatDate(selectedProposal.headReviewedAt)}
                                </Typography>
                              ) : selectedProposal.headCommentSavedAt ? (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                                  Đã lưu nháp lúc: {formatDate(selectedProposal.headCommentSavedAt)}
                                </Typography>
                              ) : null}
                            </>
                          )}

                          {selectedProposal.facultyLeaderComments && selectedProposal.facultyLeaderComments.length > 0 && (
                            <>
                              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                                <strong>Nhận xét của Lãnh đạo khoa:</strong>
                              </Typography>
                              <Paper sx={{ p: 2, bgcolor: '#fff3e0', mb: 1 }}>
                                <Typography variant="body2">{selectedProposal.facultyLeaderComments}</Typography>
                              </Paper>
                              {selectedProposal.facultyLeaderReviewedAt ? (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                                  Đã đánh giá lúc: {formatDate(selectedProposal.facultyLeaderReviewedAt)}
                                </Typography>
                              ) : selectedProposal.facultyLeaderCommentSavedAt ? (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                                  Đã lưu nháp lúc: {formatDate(selectedProposal.facultyLeaderCommentSavedAt)}
                                </Typography>
                              ) : null}
                            </>
                          )}

                          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                            <strong>Tài liệu đính kèm:</strong>
                          </Typography>
                          {selectedProposal.outlineFiles && selectedProposal.outlineFiles.length > 0 ? (
                            <Box sx={{ mt: 1 }}>
                              {selectedProposal.outlineFiles.map((file, index) => (
                                <Box
                                  key={index}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    p: 1.5,
                                    mb: 1,
                                    bgcolor: '#f5f5f5',
                                    borderRadius: 1,
                                    border: '1px solid #e0e0e0'
                                  }}
                                >
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Tooltip title={file.originalName || file.originalname || file.filename}>
                                      <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                                        {file.originalName || file.originalname || file.filename}
                                      </Typography>
                                    </Tooltip>
                                    <Typography variant="caption" color="text.secondary">
                                      {file.uploadedBy === 'student' ? 'Học viên' : 'Giảng viên'} • {file.uploadedAt ? formatDate(file.uploadedAt) : 'N/A'}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                                    <Tooltip title="Xem">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleViewFile(selectedProposal._id, file)}
                                        sx={{ bgcolor: 'white', '&:hover': { bgcolor: 'primary.main', color: 'white' } }}
                                      >
                                        <VisibilityIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Tải xuống">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleDownloadFile(selectedProposal._id, file.filename, file.originalName || file.originalname)}
                                        sx={{ bgcolor: 'white', '&:hover': { bgcolor: 'success.main', color: 'white' } }}
                                      >
                                        <DownloadIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </Box>
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              Không có tài liệu đính kèm
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        // Full featured view for active proposals tab
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
                          <Typography variant="subtitle2" gutterBottom>
                            <strong>Ngày gửi:</strong> {formatDate(selectedProposal.submittedAt)}
                          </Typography>

                          <Typography variant="subtitle2" gutterBottom>
                            <strong>Nội dung đề tài:</strong>
                          </Typography>
                          <Paper sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                              {selectedProposal.content}
                            </Typography>
                          </Paper>

                          <Typography variant="subtitle2" gutterBottom>
                            <strong>GVHD chính:</strong> {selectedProposal.primarySupervisorName || selectedProposal.primarySupervisor} ({selectedProposal.primarySupervisor.email || 'N/A'})
                          </Typography>

                          <Typography variant="subtitle2" gutterBottom>
                            <strong>GVHD phụ:</strong> {selectedProposal.secondarySupervisorName || selectedProposal.secondarySupervisor || 'N/A'}
                          </Typography>

                          <Typography variant="subtitle2" gutterBottom>
                            <strong>Danh sách tài liệu đính kèm:</strong>
                            <br />
                            <em style={{ color: 'gray' }}> {(selectedProposal.outlineFiles?.length) || 0} tài liệu</em>
                            {selectedProposal.outlineFiles?.length > 0 ? (
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
                                    </Box>
                                  </Box>
                                ))}
                              </Box>
                            ) : (
                              ' Không có tài liệu đính kèm'
                            )}
                          </Typography>

                          {selectedProposal.supervisorComments?.length > 0 && (
                            <>
                              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                                <strong>Nhận xét của GVHD:</strong>
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
                          {/* Show head's saved comments under GVHD comments */}
                          {selectedProposal.headComments?.length > 0 && (
                            <>
                              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                                <strong>Nhận xét của {user.role}:</strong>
                              </Typography>
                              <Paper sx={{ p: 2, bgcolor: '#fff8e1' }}>
                                <Typography variant="body2">
                                  {selectedProposal.headComments}
                                </Typography>
                              </Paper>
                              {selectedProposal.headReviewedAt ? (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                                  Đã đánh giá lúc: {formatDate(selectedProposal.headReviewedAt)}
                                </Typography>
                              ) : selectedProposal.headCommentSavedAt ? (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                                  Đã lưu nháp lúc: {formatDate(selectedProposal.headCommentSavedAt)}
                                </Typography>
                              ) : (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                                  Không có thời gian đánh giá
                                </Typography>
                              )}
                            </>
                          )}
                        </Grid>

                        <Grid item xs={12} md={4}>
                          {/* Head (Lãnh đạo) controls: nhận xét, lưu nhận xét, phê duyệt/từ chối */}
                          {['Lãnh đạo bộ môn', 'Lãnh đạo khoa'].includes(user.role) ? (
                            <>
                              <Alert severity="info" sx={{ mb: 1 }}>
                                Bạn là {user.role} - có quyền nhận xét và phê duyệt/từ chối đề tài
                              </Alert>
                              <TextField
                                fullWidth
                                multiline
                                rows={4}
                                label="Nhận xét của bạn"
                                value={headComments}
                                onChange={(e) => setHeadComments(e.target.value)}
                                sx={{ mb: 2 }}
                                disabled={isFinalStatus(selectedProposal.status)}
                              />
                              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                <Button
                                  variant="outlined"
                                  onClick={() => { setHeadComments(''); }}
                                  size="small"
                                >
                                  Hủy
                                </Button>
                                <Button
                                  variant="contained"
                                  onClick={handleSaveHeadComments}
                                  disabled={isFinalStatus(selectedProposal.status)}
                                  size="small"
                                >
                                  Lưu nhận xét
                                </Button>
                              </Box>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Button
                                  variant="contained"
                                  color="success"
                                  startIcon={<CheckIcon />}
                                  onClick={() => handleReview('approved')}
                                  fullWidth
                                  disabled={isFinalStatus(selectedProposal.status)}
                                >
                                  Phê duyệt
                                </Button>
                                <Button
                                  variant="contained"
                                  color="error"
                                  startIcon={<CloseIcon />}
                                  onClick={() => handleReview('rejected')}
                                  fullWidth
                                  disabled={isFinalStatus(selectedProposal.status)}
                                >
                                  Từ chối
                                </Button>
                              </Box>
                            </>
                          ) : (
                            // fallback to supervisor-style controls when not a head
                            selectedProposal.primarySupervisor === user.username ? (
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
                                  </Box>
                                )}
                              </>
                            ) : (
                              <Alert severity="warning">
                                Bạn là GVHD phụ - chỉ có quyền xem, không thể chỉnh sửa
                              </Alert>
                            )
                          )}

                          {/* Upload area for primary supervisor - Cho phép Giảng viên, Lãnh đạo bộ môn, Lãnh đạo khoa */}
                          {['Giảng viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'].includes(user.role) && user.username === selectedProposal.primarySupervisor && selectedProposal.outlineStatus !== 'approved' && (
                            <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
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
                      )}
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={() => setSelectedProposal(null)}>Đóng</Button>
                    </DialogActions>
                  </>
                )}
              </Dialog>

              {/* Review Dialog (Head) - reuse Supervisor-style UI */}
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
                    {/* Attachments (read-only) */}
                    {reviewData.attachmentFiles && reviewData.attachmentFiles.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Tệp đính kèm ({reviewData.attachmentFiles.length})
                        </Typography>
                        {reviewData.attachmentFiles.map((file, idx) => (
                          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Tooltip title={file.originalName || file.originalname || file.filename}>
                                <Typography variant="body2" noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {file.originalName || file.originalname || file.filename}
                                </Typography>
                              </Tooltip>
                              <Typography variant="caption" color="text.secondary">
                                {(file.uploadedBy === 'student' ? 'Học viên' : 'Giảng viên')} • {file.uploadedAt ? formatDate(file.uploadedAt) : 'N/A'}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
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
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    )}
                    <TextField
                      fullWidth
                      required
                      multiline
                      rows={3}
                      label="Nhận xét của bạn"
                      variant="outlined"
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
                    color={reviewData.status === 'approved' ? 'success' : 'error'}
                  >
                    {submitting ? 'Đang xử lý...' : (reviewData.status === 'approved' ? 'Phê duyệt' : 'Từ chối')}
                  </Button>
                </DialogActions>
              </Dialog>
            </Box>
          </div>
        </div>
      </AppLayout>

      <Dialog open={previewOpen} onClose={() => {
        // close and cleanup
        setPreviewOpen(false);
        if (previewUrl) { try { window.URL.revokeObjectURL(previewUrl); } catch (e) {} }
        setPreviewUrl(null);
        setPreviewName('');
        setPreviewContentType('');
        setPreviewText(null);
      }} maxWidth="lg" fullWidth>
        <DialogTitle>{previewName}</DialogTitle>
        <DialogContent sx={{ height: '80vh' }}>
          {previewUrl ? (
            previewContentType === 'pdf' ? (
              <iframe title={previewName} src={previewUrl} style={{ width: '100%', height: '100%', border: 'none' }} />
            ) : previewContentType === 'image' ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <img src={previewUrl} alt={previewName} style={{ maxWidth: '100%', maxHeight: '100%' }} />
              </Box>
            ) : previewContentType === 'text' ? (
              <Paper sx={{ p: 2, height: '100%', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                <Typography variant="body2">{previewText || 'Không thể đọc nội dung'}</Typography>
              </Paper>
            ) : (
              <Box sx={{ p: 2 }}>
                <Typography>Không hỗ trợ xem trước loại tệp này. Vui lòng tải xuống để mở.</Typography>
              </Box>
            )
          ) : (
            <Typography>Không có file để xem</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPreviewOpen(false);
            if (previewUrl) { try { window.URL.revokeObjectURL(previewUrl); } catch (e) {} }
            setPreviewUrl(null);
            setPreviewName('');
            setPreviewContentType('');
            setPreviewText(null);
          }}>Đóng</Button>
          <Button
            component="a"
            href={previewUrl || '#'}
            download={previewName}
            disabled={!previewUrl}
          >
            Tải
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default HeadTopics;