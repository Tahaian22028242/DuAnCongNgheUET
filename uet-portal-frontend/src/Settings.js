import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, TextField, Button, Alert} from '@mui/material';
import AppLayout from './AppLayout';

function Settings() {
  const [form, setForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    if (!form.oldPassword || !form.newPassword || !form.confirmPassword) {
      setMessage({ type: 'error', text: 'Vui lòng nhập đầy đủ thông tin.' });
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu mới và xác nhận không khớp.' });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi kết nối server.' });
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
      <Typography variant="h4" sx={{ mt: 3, mb: 3, fontWeight: 700, textAlign: 'center' }}>
        Cài đặt
      </Typography>
      <div className="dashboard-content">
        <Box sx={{ p: 3, maxWidth: 500 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Đổi mật khẩu
            </Typography>
            {message.text && (
              <Alert severity={message.type} sx={{ mb: 2 }}>
                {message.text}
              </Alert>
            )}
            <form onSubmit={handleSubmit}>
              <TextField
                label="Mật khẩu cũ"
                name="oldPassword"
                type="password"
                value={form.oldPassword}
                onChange={handleChange}
                fullWidth
                margin="normal"
                required
              />
              <TextField
                label="Mật khẩu mới"
                name="newPassword"
                type="password"
                value={form.newPassword}
                onChange={handleChange}
                fullWidth
                margin="normal"
                required
              />
              <TextField
                label="Xác nhận mật khẩu mới"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                fullWidth
                margin="normal"
                required
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                sx={{ mt: 2 }}
                disabled={loading}
                fullWidth
              >
                {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
              </Button>
            </form>
          </Paper>
        </Box>
      </div>
    </div>
    </AppLayout>
  );
}

export default Settings;