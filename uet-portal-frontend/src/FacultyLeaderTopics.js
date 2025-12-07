import React, { useEffect, useState } from 'react';
import AppLayout from './AppLayout';
import { 
  Box, Paper, Typography, CircularProgress, Alert, Button, Dialog, DialogTitle, 
  DialogContent, DialogActions, TextField, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, Tooltip
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import axios from 'axios';

function FacultyLeaderTopics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [proposals, setProposals] = useState([]);
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, []);

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
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Lỗi kết nối server' });
    }
    setSubmitting(false);
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
          <Typography variant="h5" gutterBottom>
            Quản lý đề cương (Lãnh đạo khoa)
          </Typography>
          
          {message.text && (
            <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
              {message.text}
            </Alert>
          )}
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          {loading ? (
            <CircularProgress />
          ) : proposals.length === 0 ? (
            <Paper sx={{ p: 2, textAlign: 'center' }}>Chưa có đề cương chờ phê duyệt.</Paper>
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
                          variant="outlined" 
                          onClick={() => { setSelected(p); setOpen(true); }}
                          sx={{ mr: 1 }}
                        >
                          Xem
                        </Button>
                        <Button 
                          size="small" 
                          variant="contained" 
                          color="primary"
                          onClick={() => { setSelected(p); setReviewDialog(true); setComments(''); }}
                        >
                          Duyệt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Dialog xem chi tiết */}
          <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
            {selected && (
              <>
                <DialogTitle>Chi tiết đề cương</DialogTitle>
                <DialogContent>
                  <Typography variant="h6" gutterBottom>{selected.topicTitle}</Typography>
                  <Typography><strong>Học viên:</strong> {selected.studentName} ({selected.studentId})</Typography>
                  <Typography><strong>Khoa:</strong> {selected.studentFaculty}</Typography>
                  <Typography><strong>Ngành:</strong> {selected.studentMajor}</Typography>
                  <Typography><strong>GVHD chính:</strong> {selected.primarySupervisorName || selected.primarySupervisor}</Typography>
                  {selected.secondarySupervisor && (
                    <Typography><strong>GVHD phụ:</strong> {selected.secondarySupervisorName || selected.secondarySupervisor}</Typography>
                  )}
                  <Typography sx={{ mt: 2 }}><strong>Nội dung:</strong></Typography>
                  <Typography sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{selected.content}</Typography>
                  {selected.headComments && (
                    <>
                      <Typography sx={{ mt: 2 }}><strong>Nhận xét của LĐBM:</strong></Typography>
                      <Typography sx={{ mt: 1 }}>{selected.headComments}</Typography>
                    </>
                  )}
                  
                  {/* Hiển thị file đề cương */}
                  <Typography sx={{ mt: 2 }}><strong>Tài liệu đính kèm:</strong></Typography>
                  {selected.outlineFiles && selected.outlineFiles.length > 0 ? (
                    <List dense sx={{ bgcolor: '#f5f5f5', borderRadius: 1, mt: 1 }}>
                      {selected.outlineFiles.map((file, idx) => (
                        <ListItem key={idx}>
                          <ListItemText
                            primary={file.originalName || file.filename}
                            secondary={`Upload bởi: ${file.uploadedBy === 'student' ? 'Học viên' : 'Giảng viên'}`}
                          />
                          <ListItemSecondaryAction>
                            <Tooltip title="Xem">
                              <IconButton
                                edge="end"
                                onClick={async () => {
                                  try {
                                    const res = await axios.get(
                                      `http://localhost:5000/view-outline/${selected._id}/${file.filename}`,
                                      { responseType: 'blob', withCredentials: true }
                                    );
                                    const url = window.URL.createObjectURL(res.data);
                                    window.open(url, '_blank');
                                  } catch (err) {
                                    alert('Không thể xem file');
                                  }
                                }}
                                sx={{ mr: 1 }}
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Tải xuống">
                              <IconButton
                                edge="end"
                                onClick={async () => {
                                  try {
                                    const res = await axios.get(
                                      `http://localhost:5000/download-outline/${selected._id}/${file.filename}`,
                                      { responseType: 'blob', withCredentials: true }
                                    );
                                    const url = window.URL.createObjectURL(res.data);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = file.originalName || file.filename;
                                    link.click();
                                  } catch (err) {
                                    alert('Không thể tải file');
                                  }
                                }}
                              >
                                <DownloadIcon />
                              </IconButton>
                            </Tooltip>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Chưa có tài liệu đính kèm
                    </Typography>
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
        </Box>
      </div>
    </AppLayout>
  );
}

export default FacultyLeaderTopics;
