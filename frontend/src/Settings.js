import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, TextField, Button, Alert,
  Checkbox, FormControlLabel
} from '@mui/material';
import { useEffect } from 'react';
import AppLayout from './AppLayout';

function Settings() {
  const [form, setForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    username: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [changePassword, setChangePassword] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};

  // Prefill username from stored user
  useEffect(() => {
    if (user && user.username) {
      setForm(f => ({ ...f, username: user.username }));
    }
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    const trimmedUsername = (form.username || '').trim();
    const usernameChanged = trimmedUsername && trimmedUsername !== (user.username || '');

    // If user only changes username (no password change requested)
    if (!changePassword && usernameChanged) {
      setLoading(true);
      try {
        const res = await fetch('http://localhost:5000/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username: trimmedUsername })
        });
        const data = await res.json();
        if (res.ok) {
          // update localStorage user
          const updatedUser = { ...user, username: trimmedUsername };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setMessage({ type: 'success', text: data.message || 'Đã cập nhật tên đăng nhập.' });
        } else {
          setMessage({ type: 'error', text: data.message || 'Không thể cập nhật tên đăng nhập.' });
        }
      } catch (err) {
        setMessage({ type: 'error', text: 'Lỗi kết nối server.' });
      }
      setLoading(false);
      return;
    }

    // If user requested password change
    if (changePassword) {
      if (!form.newPassword || !form.confirmPassword) {
        setMessage({ type: 'error', text: 'Vui lòng nhập mật khẩu mới và xác nhận.' });
        return;
      }
      if (form.newPassword !== form.confirmPassword) {
        setMessage({ type: 'error', text: 'Mật khẩu mới và xác nhận không khớp.' });
        return;
      }

      setLoading(true);
      try {
        const res = await fetch('http://localhost:5000/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            username: trimmedUsername || undefined,
            newPassword: form.newPassword
          })
        });

        const data = await res.json();
        if (res.ok) {
          setMessage({ type: 'success', text: data.message || 'Đã cập nhật thông tin.' });
          setForm({ oldPassword: '', newPassword: '', confirmPassword: '', username: trimmedUsername || (user.username || '') });
          if (usernameChanged) {
            const updatedUser = { ...user, username: trimmedUsername };
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
        } else {
          setMessage({ type: 'error', text: data.message || 'Lỗi khi cập nhật.' });
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Lỗi kết nối server.' });
      }
      setLoading(false);
      return;
    }

    setMessage({ type: 'info', text: 'Không có thay đổi để lưu.' });
  };

  return (
    <AppLayout>
      <div className="dashboard">
        <Typography variant="h4" sx={{ mt: 3, mb: 3, fontWeight: 700, textAlign: 'center' }}>
          Chỉnh sửa thông tin đăng nhập
        </Typography>
        <div className="dashboard-content">
          <Box sx={{ p: 3, maxWidth: 500 }}>
            <Paper sx={{ p: 3 }}>
              {message.text && (
                <Alert severity={message.type} sx={{ mb: 2 }}>
                  {message.text}
                </Alert>
              )}
              <form onSubmit={handleSubmit}>
                <TextField
                  label="Tên đăng nhập hiện tại"
                  name="oldUsername"
                  value={user.username || ''}
                  fullWidth
                  margin="normal"
                  disabled
                />
                <TextField
                  label="Tên đăng nhập mới"
                  name="username"
                  onChange={handleChange}
                  fullWidth
                  margin="normal"
                  placeholder="Để trống nếu không đổi tên đăng nhập"
                />
                <FormControlLabel
                  control={<Checkbox checked={changePassword} onChange={(e) => {
                    const checked = e.target.checked;
                    setChangePassword(checked);
                    if (!checked) {
                      // clear password fields when disabling
                      setForm(f => ({ ...f, oldPassword: '', newPassword: '', confirmPassword: '' }));
                    }
                  }} />}
                  label="Đổi mật khẩu"
                />
{/* 
                {changePassword && (
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
                )} */}

                <TextField
                  label="Mật khẩu mới"
                  name="newPassword"
                  type="password"
                  value={form.newPassword}
                  onChange={handleChange}
                  fullWidth
                  margin="normal"
                  required={changePassword}
                  disabled={!changePassword}
                />
                <TextField
                  label="Xác nhận mật khẩu mới"
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  fullWidth
                  margin="normal"
                  required={changePassword}
                  disabled={!changePassword}
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  sx={{ mt: 2 }}
                  disabled={loading}
                  fullWidth
                >
                  {loading ? 'Đang xử lý...' : 'Cập nhật'}
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