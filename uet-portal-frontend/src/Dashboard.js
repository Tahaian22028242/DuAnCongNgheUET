import React, { useEffect, useState } from 'react';
import AppLayout from './AppLayout';
import { Typography, Paper, Box } from '@mui/material';
import './Dashboard.css';

function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const [latestNotification, setLatestNotification] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // fetch notifications (student endpoint returns an array)
    fetch('http://localhost:5000/student/notifications', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const items = Array.isArray(data) ? data : [];
        const count = items.filter(n => !n.read).length;
        setUnreadCount(count);
        if (items.length === 0) {
          setLatestNotification(null);
          return;
        }
        // pick the most recent by createdAt
        const latest = items.reduce((acc, cur) => {
          const accTime = acc?.createdAt ? new Date(acc.createdAt).getTime() : 0;
          const curTime = cur?.createdAt ? new Date(cur.createdAt).getTime() : 0;
          return curTime > accTime ? cur : acc;
        }, items[0]);
        setLatestNotification(latest);
      }).catch(() => { });
  }, []);
  return (
    <AppLayout>
      <div className="dashboard-content">
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Xin chào {user.userInfo?.fullName || user.studentInfo?.fullName || user.fullName || user.username || 'Khách'}
          </Typography>
          <Typography variant="subtitle1">
            Vai trò: <strong>{user.role || 'Không xác định'}</strong>
          </Typography>
        </Paper>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Chào mừng bạn đến với Hệ thống quản lý học viên UET Portal!
          </Typography>
          {unreadCount === 0 ? (
            <Typography variant="body1" color="primary" sx={{ mt: 1 , mb: 1 }}>
              <strong>Bạn không có thông báo nào chưa xem, nhưng hãy kiểm tra thường xuyên nhé!</strong>
            </Typography>
          ) : (
            <Typography variant="body1" color="primary" sx={{ mt: 1 , mb: 1 }}>
              Bạn có {unreadCount} thông báo mới. Hãy kiểm tra ngay!
            </Typography>
          )}
          <Typography variant="body1">
            <strong>Thông báo mới nhất:</strong>
          </Typography>
          {latestNotification ? (
            <Paper sx={{ p: 2, mt: 1 }}>
              <Typography variant="subtitle1">{latestNotification.message}</Typography>
              <Typography variant="caption" color="text.secondary">{new Date(latestNotification.createdAt).toLocaleString('vi-VN')}</Typography>
            </Paper>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Chưa có thông báo.</Typography>
          )}
        </Box>

        {/* {user.role === 'Quản trị viên' && (
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
        )} */}
      </div>
    </AppLayout>
  );
}

export default Dashboard;