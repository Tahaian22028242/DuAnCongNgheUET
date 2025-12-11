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
    // Always fetch the unified profile object from backend for any role.
    // Backend returns a unified shape (studentInfo + userInfo + convenient top-level fields).
    fetchStudentProfile();
  }, []);

  const fetchStudentProfile = async () => {
    try {
      const response = await axios.get('http://localhost:5000/profile', {
        withCredentials: true,
      });
      setProfileData(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Không thể tải thông tin sinh viên. Vui lòng thử lại sau.');
      setLoading(false);
    }
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

    // Unified profile view for all roles. Use data returned from backend.
    const role = profileData?.role || user.role;
    const usernameDisplay = profileData?.username || user.username;
    const studentId = profileData?.studentId || profileData?.studentInfo?.studentId || 'N/A';
    const fullName = profileData?.fullName || profileData?.userInfo?.fullName || usernameDisplay;
    const faculty = profileData?.faculty || profileData?.userInfo?.faculty || 'N/A';
    const major = profileData?.major || profileData?.userInfo?.major || profileData?.userInfo?.department || 'N/A';

    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Thông tin tài khoản
        </Typography>
        <Card sx={{ maxWidth: 700, mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              Thông tin người dùng
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Tên đăng nhập:</strong> {usernameDisplay}
              </Typography>
              {user.role === 'Sinh viên' && (
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Mã học viên:</strong> {studentId}
              </Typography>
              )}
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Họ và tên:</strong> {fullName}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Vai trò:</strong> {role}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Khoa:</strong> {faculty}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Ngành / Bộ môn:</strong> {major}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
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