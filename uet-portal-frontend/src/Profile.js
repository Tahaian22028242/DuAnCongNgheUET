import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Box, Paper, CircularProgress, Alert,
  Drawer, List, ListItem, ListItemText, Card, CardContent
} from '@mui/material';
import axios from 'axios';
import './Dashboard.css';
import logo from './logo.png';
import HelpIcon from '@mui/icons-material/Help';
import InfoIcon from '@mui/icons-material/Info';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GroupIcon from '@mui/icons-material/Group';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SettingsIcon from '@mui/icons-material/Settings';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AppLayout from './AppLayout';


function Profile() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const navigate = useNavigate();

  useEffect(() => {
    if (user.role === 'Sinh viên') {
      fetchStudentProfile();
    } else {
      // Nếu không phải sinh viên, hiển thị thông tin cơ bản
      setProfileData({
        username: user.username,
        role: user.role
      });
      setLoading(false);
    }
  }, []);

  const fetchStudentProfile = async () => {
    try {
      const response = await axios.get('http://localhost:5000/student/profile', {
        withCredentials: true,
      });
      setProfileData(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Không thể tải thông tin cá nhân. Vui lòng thử lại sau.');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    navigate('/');
  };

  const renderProfileContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      );
    }

    if (user.role === 'Sinh viên') {
      return (
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            Thông tin cá nhân
          </Typography>
          <Card sx={{ maxWidth: 600, mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                Thông tin sinh viên
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Mã học viên:</strong> {profileData?.studentId || 'N/A'}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Họ và tên:</strong> {profileData?.fullName || 'N/A'}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Khoa:</strong> {profileData?.faculty || 'N/A'}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Ngành học:</strong> {profileData?.major || 'N/A'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      );
    } else {
      return (
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            Thông tin tài khoản
          </Typography>
          <Card sx={{ maxWidth: 600, mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                Thông tin người dùng
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Tên đăng nhập:</strong> {user.username}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Vai trò:</strong> {user.role}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Khoa:</strong> {profileData.userInfo?.faculty || 'N/A'}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Ngành:</strong> {profileData.userInfo?.department || 'N/A'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      );
    }
  };

  return (
    <AppLayout>
      <div className="dashboard">
        <div className="dashboard-content">
          {renderProfileContent()}
        </div>
      </div>
    </AppLayout>
  );
}

export default Profile;