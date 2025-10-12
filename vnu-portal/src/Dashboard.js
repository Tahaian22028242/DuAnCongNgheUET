import React from 'react';
import AppLayout from './AppLayout';
import { Typography, Paper, Box } from '@mui/material';
import './Dashboard.css';

function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user')) || {};
  return (
    <AppLayout>
      <div className="dashboard-content">
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Xin chào {user.userInfo?.fullName || user.studentInfo?.fullName || user.username || 'Khách'}
          </Typography>
          <Typography variant="subtitle1">
            Role: {user.role || 'Không xác định'}
          </Typography>
        </Paper>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Chào mừng bạn đến với hệ thống quản lý học viên
          </Typography>
          <Typography variant="body1">
            Thông báo mới nhất:
          </Typography>
        </Box>

        {user.role === 'Quản trị viên' && (
          <Paper sx={{ p: 3, mb: 3, bgcolor: '#f5f8ff' }}>
            <Typography variant="h6" gutterBottom>
              (Note sau xóa:) Chức năng quản trị viên
            </Typography>
            <Typography variant="body1" paragraph>
              - Tải lên danh sách học viên từ file Excel
            </Typography>
            <Typography variant="body1" paragraph>
              - Xem và tìm kiếm danh sách học viên
            </Typography>
            <Typography variant="body2">
              Hệ thống sẽ tự động tạo tài khoản cho các học viên khi tải lên danh sách
            </Typography>
          </Paper>
        )}

        {user.role === 'Giảng viên' && (
          <Paper sx={{ p: 3, mb: 3, bgcolor: '#fff8f5' }}>
            <Typography variant="h6" gutterBottom>
              (Note sau xóa:) Chức năng giảng viên
            </Typography>
            <Typography variant="body1" paragraph>
              - Xem và tìm kiếm danh sách học viên
            </Typography>
            <Typography variant="body2">
              Bạn có thể xem thông tin của tất cả học viên trong hệ thống
            </Typography>
          </Paper>
        )}

        {user.role === 'Sinh viên' && (
          <Paper sx={{ p: 3, bgcolor: '#f5fff8' }}>
            <Typography variant="h6" gutterBottom>
              (Note sau xóa:) Thông tin học viên
            </Typography>
            <Typography variant="body1" paragraph>
              - Xem thông tin cá nhân trong mục "Account"
            </Typography>
            <Typography variant="body2">
              Bạn có thể xem mã học viên, họ tên và ngành học của mình
            </Typography>
          </Paper>
        )}
      </div>
    </AppLayout>
  );
}

export default Dashboard;