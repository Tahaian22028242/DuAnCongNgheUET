import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Paper, CircularProgress, Alert } from '@mui/material';
import AppLayout from './AppLayout';

function UploadHeads() {
  const [excelFile, setExcelFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};

  const handleFileChange = (e) => setExcelFile(e.target.files[0]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!excelFile) {
      setMessage({ type: 'error', text: 'Vui lòng chọn file Excel' });
      return;
    }
    const formData = new FormData();
    formData.append('excelFile', excelFile);
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/admin/upload-heads', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi khi tải lên file' });
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
    navigate('/');
  };

  return (
    <AppLayout>
      <div className="dashboard">
        <div className="dashboard-content">
          <Box sx={{ p: 3 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Tải lên danh sách Lãnh đạo bộ môn
              </Typography>
              <form onSubmit={handleUpload}>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  style={{ marginBottom: '1rem' }}
                />
                <Button
                  variant="contained"
                  type="submit"
                  disabled={loading}
                  sx={{ mt: 2 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Tải lên'}
                </Button>
              </form>
              {message.text && (
                <Alert severity={message.type} sx={{ mt: 2 }}>
                  {message.text}
                </Alert>
              )}
            </Paper>
          </Box>
        </div>
      </div>
    </AppLayout>
  );
}

export default UploadHeads;