import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Box, Typography, Paper, List, ListItem, ListItemText, CircularProgress, Button
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AppLayout from './AppLayout';

function FacultiesInfo() {
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerWidth = 240;
  const buttonWidth = 40;
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('http://localhost:5000/faculties', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load faculties');
        const data = await res.json();
        if (!cancelled) setFaculties(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setFaculties([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    navigate('/');
  };

  return (
    <AppLayout>
      <div className="dashboard">
        <div className="dashboard-content">
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
              Chọn Khoa/Ngành để xem danh sách giảng viên & CNBM
            </Typography>

            {loading ? (
              <CircularProgress />
            ) : (
              <Paper sx={{ p: 2 }}>
                {faculties.length === 0 ? (
                  <Typography color="text.secondary">Chưa có dữ liệu Khoa/Ngành.</Typography>
                ) : (
                  <List>
                    {faculties.map((faculty) => (
                      <ListItem
                        button
                        key={faculty}
                        onClick={() => navigate(`/faculty/${encodeURIComponent(faculty)}`)}
                      >
                        <ListItemText primary={faculty} />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            )}
            <Button onClick={() => navigate('/upload-lecturers')} sx={{ cursor: 'pointer', py: 0.5 }}>
              <UploadFileIcon sx={{ mr: 1, justifyContent: 'center' }} />
              Tải lên danh sách giảng viên mới
            </Button>
          </Box>
        </div>
      </div>
    </AppLayout>
  );
}

export default FacultiesInfo;
