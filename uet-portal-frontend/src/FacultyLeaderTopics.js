import React, { useEffect, useState } from 'react';
import AppLayout from './AppLayout';
import { Box, Paper, Typography, CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent } from '@mui/material';

function FacultyLeaderTopics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [proposals, setProposals] = useState([]);
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);

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

  return (
    <AppLayout>
      <div className="dashboard-content">
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Quản lý đề cương (Lãnh đạo khoa)
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {loading ? (
            <CircularProgress />
          ) : proposals.length === 0 ? (
            <Paper sx={{ p: 2, textAlign: 'center' }}>Chưa có đề cương được Lãnh đạo bộ môn phê duyệt.</Paper>
          ) : (
            proposals.map(p => (
              <Paper key={p._id} sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1">{p.topicTitle}</Typography>
                <Typography>Học viên: {p.studentName} ({p.studentId})</Typography>
                <Typography>Ngành: {p.major} | Khoa: {p.faculty}</Typography>
                <Typography>GVHD chính: {p.primarySupervisor} {p.secondarySupervisor ? `| GVHD phụ: ${p.secondarySupervisor}` : ''}</Typography>
                <Typography>CNBM: {p.headName || p.headId}</Typography>
                <Button sx={{ mt: 1 }} variant="contained" onClick={() => { setSelected(p); setOpen(true); }}>Xem chi tiết</Button>
              </Paper>
            ))
          )}

          <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
            {selected && (
              <>
                <DialogTitle>Chi tiết đề cương</DialogTitle>
                <DialogContent>
                  <Typography variant="h6">{selected.topicTitle}</Typography>
                  <Typography sx={{ mt: 1 }}>{selected.content}</Typography>
                </DialogContent>
              </>
            )}
          </Dialog>
        </Box>
      </div>
    </AppLayout>
  );
}

export default FacultyLeaderTopics;
