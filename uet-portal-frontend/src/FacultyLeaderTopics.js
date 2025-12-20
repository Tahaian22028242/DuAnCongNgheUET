import React, { useEffect, useState } from 'react';
import AppLayout from './AppLayout';
import { 
  Box, Paper, Typography, CircularProgress, Alert, Button, Dialog, DialogTitle, 
  DialogContent, DialogActions, TextField, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, Tooltip, Chip, Grid
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

function FacultyLeaderTopics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [proposals, setProposals] = useState([]);
  const [archiveProposals, setArchiveProposals] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewName, setPreviewName] = useState('');
  const [facultyComments, setFacultyComments] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteFilename, setPendingDeleteFilename] = useState(null);

  useEffect(() => {
    load();
    fetchArchiveProposals();
  }, []);

  // sync facultyComments when a proposal is selected
  useEffect(() => {
    if (selected) {
      setFacultyComments(selected.facultyLeaderComments || selected.facultyComments || '');
    } else {
      setFacultyComments('');
    }
  }, [selected]);

  const fetchArchiveProposals = async () => {
    setArchiveLoading(true);
    try {
      const res = await fetch('http://localhost:5000/faculty-leader/topic-proposals-archive', { credentials: 'include' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Không thể tải danh sách lưu trữ');
      }
      const data = await res.json();
      setArchiveProposals(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Could not load faculty leader archive:', e);
    }
    setArchiveLoading(false);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/faculty-leader/topic-proposals', { credentials: 'include' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Không thể tải danh sách đề cương');
      }
      const data = await res.json();
      setProposals(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleReview = async (status) => {
    if (!comments.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập nhận xét' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`http://localhost:5000/faculty-leader/review-topic/${selected._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, comments })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setReviewDialog(false);
        setSelected(null);
        setComments('');
        load();
        await fetchArchiveProposals();
        // switch to archive view so the approved/rejected proposal remains visible
        setShowArchive(true);
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Lỗi kết nối server' });
    }
    setSubmitting(false);
  };

  const handleDeleteFile = async (filename) => {
    if (!selected) return;
    setPendingDeleteFilename(filename);
    setConfirmOpen(true);
  };

  const performDeleteFile = async () => {
    const filename = pendingDeleteFilename;
    setConfirmOpen(false);
    setPendingDeleteFilename(null);
    if (!selected || !filename) return;
    try {
      await axios.delete(`http://localhost:5000/delete-outline/${selected._id}/${filename}`, { withCredentials: true });
      setMessage({ type: 'success', text: 'Đã xóa file.' });
      // refresh archive and selected proposal
      await fetchArchiveProposals();
      const refreshed = archiveProposals.filter(p => p._id === selected._id);
      if (refreshed && refreshed.length > 0) {
        const updated = refreshed[0];
        updated.outlineFiles = (updated.outlineFiles || []).filter(f => f.filename !== filename);
        setSelected(updated);
      } else {
        // try reload selected from pending list
        await load();
      }
    } catch (err) {
      console.error('Error deleting file:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Lỗi khi xóa file' });
    }
  };

  const handleSaveFacultyComments = async () => {
    if (!selected) return;
    try {
      const res = await fetch(`http://localhost:5000/faculty-leader/save-comment/${selected._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comments: facultyComments })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message || 'Đã lưu nhận xét tạm' });
        // update selected locally if returned
        if (data.proposal) {
          setSelected(data.proposal);
        } else {
          // refresh lists
          await load();
          await fetchArchiveProposals();
        }
      } else {
        setMessage({ type: 'error', text: data.message || 'Không thể lưu nhận xét' });
      }
    } catch (err) {
      console.error('Save faculty comment error', err);
      setMessage({ type: 'error', text: 'Lỗi kết nối server' });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const d = new Date(dateString);
      return d.toLocaleString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dateString;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
      case 'approved_by_faculty_leader':
        return 'success';
      case 'rejected':
      case 'rejected_by_head':
      case 'rejected_by_faculty_leader':
        return 'error';
      case 'waiting_head_approval':
      case 'waiting_faculty_leader_approval':
        return 'warning';
      default:
        return 'default';
    }
  };

  const handleViewFile = async (proposalId, file) => {
    try {
      const res = await axios.get(
        `http://localhost:5000/view-outline/${proposalId}/${file.filename}`,
        { responseType: 'blob', withCredentials: true }
      );
      const url = window.URL.createObjectURL(res.data);
      setPreviewUrl(url);
      setPreviewName(file.originalName || file.originalname || file.filename);
      setPreviewOpen(true);
    } catch (err) {
      setMessage({ type: 'error', text: 'Không thể xem file' });
    }
  };

  const handleClosePreview = () => {
    if (previewUrl) {
      try { window.URL.revokeObjectURL(previewUrl); } catch (e) {}
    }
    setPreviewUrl(null);
    setPreviewName('');
    setPreviewOpen(false);
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'pending': return 'Đang chờ GVHD';
      case 'waiting_head_approval': return 'Đang chờ LĐBM';
      case 'waiting_faculty_leader_approval': return 'Đang chờ Lãnh đạo khoa';
      case 'approved_by_faculty_leader': return 'Đã phê duyệt';
      case 'rejected_by_head': return 'LĐBM từ chối';
      case 'rejected_by_faculty_leader': return 'Lãnh đạo khoa từ chối';
      default: return status;
    }
  };

  return (
    <AppLayout>
      <div className="dashboard-content">
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h5">{showArchive ? 'Lưu trữ đề cương (Lãnh đạo khoa)' : 'Quản lý đề cương (Lãnh đạo khoa)'}</Typography>
            <Box>
              <Button variant={showArchive ? 'outlined' : 'contained'} size="small" onClick={() => setShowArchive(false)} sx={{ mr: 1 }}>Chờ phê duyệt</Button>
              <Button variant={showArchive ? 'contained' : 'outlined'} size="small" onClick={() => setShowArchive(true)}>Lưu trữ</Button>
            </Box>
          </Box>
          
          {message.text && (
            <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
              {message.text}
            </Alert>
          )}
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          { (showArchive ? archiveLoading : loading) ? (
            <CircularProgress />
          ) : (showArchive ? archiveProposals.length === 0 : proposals.length === 0) ? (
            <Paper sx={{ p: 2, textAlign: 'center' }}>Chưa có đề cương.</Paper>
          ) : (
            <>
              <Typography variant="subtitle1" sx={{ mb: 2, color: 'text.secondary' }}>
                Tổng cộng: {(showArchive ? archiveProposals.length : proposals.length)} đề xuất
              </Typography>
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
                  {(showArchive ? archiveProposals : proposals).map((p, idx) => (
                    <TableRow key={p._id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{p.topicTitle}</TableCell>
                      <TableCell>{p.studentName}</TableCell>
                      <TableCell>{p.studentId}</TableCell>
                      <TableCell>{p.studentFaculty}</TableCell>
                      <TableCell>{p.studentMajor}</TableCell>
                      <TableCell>{p.primarySupervisorName || p.primarySupervisor}</TableCell>
                      <TableCell>{p.secondarySupervisorName || p.secondarySupervisor || '-'}</TableCell>
                      <TableCell>
                        <Chip label={getStatusText(p.status)} color={getStatusColor(p.status)} size="small" />
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="small" 
                          variant="outlined" 
                          onClick={() => { setSelected(p); setOpen(true); }}
                          sx={{ mr: 1 }}
                        >
                          Xem
                        </Button>
                        {!showArchive && (
                          <Button 
                            size="small" 
                            variant="contained" 
                            color="primary"
                            onClick={() => { setSelected(p); setReviewDialog(true); setComments(''); }}
                          >
                            Duyệt
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            </>
          )}

          {/* Dialog xem chi tiết */}
          <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
            {selected && (
              <>
                <DialogTitle>Chi tiết đề tài</DialogTitle>
                <DialogContent dividers>
                  {/* If viewing archive, show a full-width vertical layout (one item per line) */}
                  {showArchive ? (
                    <>
                      <Typography variant="h6" gutterBottom><strong>Tên đề tài:</strong> {selected.topicTitle}</Typography>
                      <Typography><strong>Mã học viên:</strong> {selected.studentId}</Typography>
                      <Typography><strong>Họ và tên học viên:</strong> {selected.studentName}</Typography>
                      <Typography><strong>Khoa:</strong> {selected.studentFaculty}</Typography>
                      <Typography><strong>Ngành:</strong> {selected.studentMajor}</Typography>
                      <Typography><strong>Ngày gửi:</strong> {formatDate(selected.submittedAt)}</Typography>

                      <Typography sx={{ mt: 1 }}><strong>Nội dung:</strong></Typography>
                      <Paper sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                        <Typography sx={{ whiteSpace: 'pre-wrap' }}>{selected.content}</Typography>
                      </Paper>

                      {selected.supervisorComments && (
                        <>
                          <Typography sx={{ mt: 1 }}><strong>Nhận xét của GVHD:</strong></Typography>
                          <Paper sx={{ p: 1, bgcolor: '#e3f2fd', mb: 1 }}>
                            <Typography variant="body2">{selected.supervisorComments}</Typography>
                          </Paper>
                          {selected.reviewedAt && (
                            <Typography variant="caption" color="text.secondary">Đánh giá lúc: {formatDate(selected.reviewedAt)}</Typography>
                          )}
                        </>
                      )}

                      <Typography sx={{ mt: 2 }}><strong>Nhận xét của Lãnh đạo khoa:</strong></Typography>
                      <Paper sx={{ p: 1, bgcolor: '#fff8e1', mb: 1 }}>
                        <Typography variant="body2">{selected.facultyLeaderComments || selected.facultyComments || 'Không có'}</Typography>
                      </Paper>
                      {selected.facultyLeaderReviewedAt ? (
                        <Typography variant="caption" color="text.secondary">Đã đánh giá lúc: {formatDate(selected.facultyLeaderReviewedAt)}</Typography>
                      ) : selected.facultyLeaderCommentSavedAt || selected.facultyCommentSavedAt ? (
                        <Typography variant="caption" color="text.secondary">Đã lưu nháp lúc: {formatDate(selected.facultyLeaderCommentSavedAt || selected.facultyCommentSavedAt)}</Typography>
                      ) : null}

                      {selected.headComments && (
                        <>
                          <Typography sx={{ mt: 2 }}><strong>Nhận xét của LĐBM:</strong></Typography>
                          <Paper sx={{ p: 1, bgcolor: '#fff8e1', mb: 1 }}>
                            <Typography variant="body2">{selected.headComments}</Typography>
                          </Paper>
                          {selected.headReviewedAt ? (
                            <Typography variant="caption" color="text.secondary">Đã đánh giá lúc: {formatDate(selected.headReviewedAt)}</Typography>
                          ) : selected.headCommentSavedAt ? (
                            <Typography variant="caption" color="text.secondary">Đã lưu nháp lúc: {formatDate(selected.headCommentSavedAt)}</Typography>
                          ) : null}
                        </>
                      )}

                      <Typography sx={{ mt: 2 }}><strong>Tài liệu đính kèm:</strong></Typography>
                      {selected.outlineFiles && selected.outlineFiles.length > 0 ? (
                        <Box sx={{ mt: 1 }}>
                          {selected.outlineFiles.map((file, idx) => (
                            <Box key={idx} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, bgcolor: '#f5f5f5', borderRadius: 1, mb: 1 }}>
                              <Typography sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pr: 2, flex: 1 }}>{file.originalName || file.filename}</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Tooltip title="Xem">
                                  <IconButton size="small" onClick={() => handleViewFile(selected._id, file)}>
                                    <VisibilityIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Tải xuống">
                                  <IconButton size="small" onClick={async () => {
                                    try {
                                      const res = await axios.get(`http://localhost:5000/download-outline/${selected._id}/${file.filename}`, { responseType: 'blob', withCredentials: true });
                                      const url = window.URL.createObjectURL(res.data);
                                      const link = document.createElement('a');
                                      link.href = url;
                                      link.download = file.originalName || file.filename;
                                      link.click();
                                    } catch (err) {
                                      setMessage({ type: 'error', text: 'Không thể tải file' });
                                    }
                                  }}>
                                    <DownloadIcon />
                                  </IconButton>
                                </Tooltip>
                                {showArchive && (
                                  <Tooltip title="Xóa">
                                    <IconButton size="small" onClick={() => handleDeleteFile(file.filename)} color="error">
                                      <DeleteIcon />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Chưa có tài liệu đính kèm</Typography>
                      )}
                    </>
                  ) : (
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={8}>
                        <Typography variant="h6" gutterBottom>{selected.topicTitle}</Typography>
                        <Typography><strong>Học viên:</strong> {selected.studentName} ({selected.studentId})</Typography>
                        <Typography><strong>Khoa:</strong> {selected.studentFaculty}</Typography>
                        <Typography><strong>Ngành:</strong> {selected.studentMajor}</Typography>
                        <Typography variant="subtitle2" sx={{ mt: 1 }}><strong>Ngày gửi:</strong> {formatDate(selected.submittedAt)}</Typography>

                        <Typography sx={{ mt: 2 }}><strong>Nội dung:</strong></Typography>
                        <Paper sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                          <Typography sx={{ whiteSpace: 'pre-wrap' }}>{selected.content}</Typography>
                        </Paper>

                        {selected.supervisorComments && selected.supervisorComments.length > 0 && (
                          <>
                            <Typography sx={{ mt: 2 }}><strong>Nhận xét của GVHD:</strong></Typography>
                            <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
                              <Typography>{selected.supervisorComments}</Typography>
                            </Paper>
                            {selected.reviewedAt && (
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Đánh giá lúc: {formatDate(selected.reviewedAt)}</Typography>
                            )}
                          </>
                        )}

                        {selected.headComments && (
                          <>
                            <Typography sx={{ mt: 2 }}><strong>Nhận xét của LĐBM:</strong></Typography>
                            <Paper sx={{ p: 2, bgcolor: '#fff8e1' }}>
                              <Typography>{selected.headComments}</Typography>
                            </Paper>
                            {selected.headReviewedAt ? (
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Đã đánh giá lúc: {formatDate(selected.headReviewedAt)}</Typography>
                            ) : selected.headCommentSavedAt ? (
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Đã lưu nháp lúc: {formatDate(selected.headCommentSavedAt)}</Typography>
                            ) : null}
                          </>
                        )}

                        <Typography sx={{ mt: 2 }}><strong>Tài liệu đính kèm:</strong></Typography>
                        {selected.outlineFiles && selected.outlineFiles.length > 0 ? (
                          <List dense sx={{ bgcolor: '#f5f5f5', borderRadius: 1, mt: 1 }}>
                            {selected.outlineFiles.map((file, idx) => (
                              <ListItem key={idx}>
                                <ListItemText primary={file.originalName || file.filename} secondary={`Upload bởi: ${file.uploadedBy === 'student' ? 'Học viên' : 'Giảng viên'}`} />
                                <ListItemSecondaryAction>
                                  <Tooltip title="Xem">
                                    <IconButton edge="end" onClick={() => handleViewFile(selected._id, file)} sx={{ mr: 1 }}>
                                      <VisibilityIcon />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Tải xuống">
                                    <IconButton edge="end" onClick={async () => {
                                      try {
                                        const res = await axios.get(`http://localhost:5000/download-outline/${selected._id}/${file.filename}`, { responseType: 'blob', withCredentials: true });
                                        const url = window.URL.createObjectURL(res.data);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.download = file.originalName || file.filename;
                                        link.click();
                                      } catch (err) {
                                        setMessage({ type: 'error', text: 'Không thể tải file' });
                                      }
                                    }}>
                                      <DownloadIcon />
                                    </IconButton>
                                  </Tooltip>
                                  {showArchive && (
                                    <Tooltip title="Xóa">
                                      <IconButton edge="end" onClick={() => handleDeleteFile(file.filename)} color="error" sx={{ ml: 1 }}>
                                        <DeleteIcon />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </ListItemSecondaryAction>
                              </ListItem>
                            ))}
                          </List>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Chưa có tài liệu đính kèm</Typography>
                        )}
                      </Grid>

                      <Grid item xs={12} md={4}>
                        { !showArchive ? (
                          <>
                            <Alert severity="info" sx={{ mb: 1 }}>Bạn là Lãnh đạo khoa - có quyền nhận xét và phê duyệt/từ chối đề tài</Alert>
                            <Typography variant="subtitle2"><strong>GVHD chính:</strong> {selected.primarySupervisorName || selected.primarySupervisor}</Typography>
                            {selected.secondarySupervisor && (
                              <Typography variant="subtitle2"><strong>GVHD phụ:</strong> {selected.secondarySupervisorName || selected.secondarySupervisor}</Typography>
                            )}

                            <TextField fullWidth multiline rows={4} label="Nhận xét của bạn" value={facultyComments} onChange={(e) => setFacultyComments(e.target.value)} sx={{ my: 2 }} disabled={['approved','approved_by_faculty_leader','rejected','rejected_by_head','rejected_by_faculty_leader'].includes(selected.status)} />

                            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                              <Button variant="outlined" onClick={() => setFacultyComments('')} size="small">Hủy</Button>
                              <Button variant="contained" onClick={handleSaveFacultyComments} size="small" disabled={['approved','approved_by_faculty_leader','rejected','rejected_by_head','rejected_by_faculty_leader'].includes(selected.status)}>Lưu nhận xét</Button>
                            </Box>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <Button variant="contained" color="success" onClick={() => { setComments(facultyComments || ''); setReviewDialog(true); setOpen(false); }} fullWidth disabled={['approved','approved_by_faculty_leader','rejected','rejected_by_head','rejected_by_faculty_leader'].includes(selected.status)}>Phê duyệt</Button>
                              <Button variant="contained" color="error" onClick={() => { setComments(facultyComments || ''); setReviewDialog(true); setOpen(false); }} fullWidth disabled={['approved','approved_by_faculty_leader','rejected','rejected_by_head','rejected_by_faculty_leader'].includes(selected.status)}>Từ chối</Button>
                            </Box>

                            <Box sx={{ mt: 2 }}>
                              {selected.facultyLeaderReviewedAt ? (
                                <Typography variant="caption" color="text.secondary">Đã đánh giá lúc: {formatDate(selected.facultyLeaderReviewedAt)}</Typography>
                              ) : selected.facultyLeaderCommentSavedAt || selected.facultyCommentSavedAt ? (
                                <Typography variant="caption" color="text.secondary">Đã lưu nháp lúc: {formatDate(selected.facultyLeaderCommentSavedAt || selected.facultyCommentSavedAt)}</Typography>
                              ) : null}
                            </Box>
                          </>
                        ) : (
                          <>
                            <Alert severity="info" sx={{ mb: 1 }}>Lưu trữ — chỉ cho phép xem/tải/xóa file</Alert>
                            <Typography variant="subtitle2" gutterBottom><strong>Nhận xét của Lãnh đạo khoa:</strong></Typography>
                            <Paper sx={{ p: 1, bgcolor: '#fff8e1', mb: 1 }}>
                              <Typography variant="body2">{selected.facultyLeaderComments || selected.facultyComments || 'Không có'}</Typography>
                            </Paper>
                            {selected.facultyLeaderReviewedAt ? (
                              <Typography variant="caption" color="text.secondary">Đã đánh giá lúc: {formatDate(selected.facultyLeaderReviewedAt)}</Typography>
                            ) : selected.facultyLeaderCommentSavedAt || selected.facultyCommentSavedAt ? (
                              <Typography variant="caption" color="text.secondary">Đã lưu nháp lúc: {formatDate(selected.facultyLeaderCommentSavedAt || selected.facultyCommentSavedAt)}</Typography>
                            ) : null}

                            {selected.headComments && (
                              <>
                                <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom><strong>Nhận xét của LĐBM:</strong></Typography>
                                <Paper sx={{ p: 1, bgcolor: '#fff8e1', mb: 1 }}>
                                  <Typography variant="body2">{selected.headComments}</Typography>
                                </Paper>
                                {selected.headReviewedAt ? (
                                  <Typography variant="caption" color="text.secondary">Đã đánh giá lúc: {formatDate(selected.headReviewedAt)}</Typography>
                                ) : selected.headCommentSavedAt ? (
                                  <Typography variant="caption" color="text.secondary">Đã lưu nháp lúc: {formatDate(selected.headCommentSavedAt)}</Typography>
                                ) : null}
                              </>
                            )}
                          </>
                        )}
                      </Grid>
                    </Grid>
                  )}
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setOpen(false)}>Đóng</Button>
                </DialogActions>
              </>
            )}
          </Dialog>

          {/* Dialog phê duyệt/từ chối */}
          <Dialog open={reviewDialog} onClose={() => !submitting && setReviewDialog(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Phê duyệt đề cương</DialogTitle>
            <DialogContent>
              <TextField
                label="Nhận xét *"
                multiline
                rows={4}
                fullWidth
                value={comments}
                onChange={e => setComments(e.target.value)}
                sx={{ mt: 2 }}
                required
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setReviewDialog(false)} disabled={submitting}>Hủy</Button>
              <Button 
                onClick={() => handleReview('rejected')} 
                color="error" 
                variant="outlined"
                disabled={submitting}
              >
                Từ chối
              </Button>
              <Button 
                onClick={() => handleReview('approved')} 
                color="primary" 
                variant="contained"
                disabled={submitting}
              >
                Phê duyệt
              </Button>
            </DialogActions>
          </Dialog>
          {/* Confirm delete dialog (replace window.confirm) */}
          <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
            <DialogTitle>Xác nhận</DialogTitle>
            <DialogContent>
              <Typography>Bạn có chắc chắn muốn xóa file này khỏi lưu trữ?</Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmOpen(false)}>Hủy</Button>
              <Button color="error" onClick={performDeleteFile}>Xác nhận</Button>
            </DialogActions>
          </Dialog>
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
              <Button component="a" href={previewUrl} download={previewName}>Tải</Button>
            </DialogActions>
          </Dialog>
        </Box>
      </div>
    </AppLayout>
  );
}

export default FacultyLeaderTopics;
