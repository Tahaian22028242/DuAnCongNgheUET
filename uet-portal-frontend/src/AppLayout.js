import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Drawer, List, ListItem, ListItemText, Box, IconButton } from '@mui/material';
import logo from './logo.png';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import InfoIcon from '@mui/icons-material/Info';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GroupIcon from '@mui/icons-material/Group';
import SchoolIcon from '@mui/icons-material/School';
import SettingsIcon from '@mui/icons-material/Settings';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Tooltip from '@mui/material/Tooltip';
import MapIcon from '@mui/icons-material/Map';

const AppLayout = ({ children }) => {
    const drawerWidth = 280;
    const collapsedWidth = 60;
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const [drawerOpen, setDrawerOpen] = useState(true);

    const isActive = (path) => location.pathname === path;

    const handleLogout = () => {
        localStorage.removeItem('user');
        document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        navigate('/');
    };

    const dashboardContentClass = 'dashboard-content';
    const childrenWithClass = React.Children.map(children, child => {
        if (React.isValidElement(child) && child.props.className === 'dashboard-content') {
            return React.cloneElement(child, { className: dashboardContentClass });
        }
        return child;
    });

    return (
        <div style={{ display: 'flex' }}>
            <Box
                sx={{
                    position: 'fixed',
                    left: 0,
                    bottom: 24,
                    width: drawerOpen ? drawerWidth : collapsedWidth,
                    pointerEvents: 'none',
                    zIndex: 2000,
                    transition: 'width 0.2s',
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'center', pointerEvents: 'auto' }}>
                    <Tooltip title={drawerOpen ? "Thu gọn" : "Mở rộng"} placement="right">
                        <IconButton
                            onClick={() => setDrawerOpen(!drawerOpen)}
                            size="small"
                            sx={{
                                width: drawerOpen ? drawerWidth : collapsedWidth,
                                height: 36,
                                borderRadius: 1,
                                bgcolor: '#2e7d32',
                                color: 'white',
                                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' },
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            {drawerOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>
            <Drawer
                variant="permanent"
                anchor="left"
                sx={{
                    width: drawerOpen ? drawerWidth : collapsedWidth,
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    transition: 'width 0.2s',
                    '& .MuiDrawer-paper': {
                        width: drawerOpen ? drawerWidth : collapsedWidth,
                        boxSizing: 'border-box',
                        overflowX: 'hidden',
                        transition: 'width 0.2s',
                        bgcolor: '#2e7d32',
                        color: 'white',
                    },
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: 120,
                        minHeight: 120,
                        p: 2,
                        boxSizing: 'border-box'
                    }}>
                    {drawerOpen ? (
                        <img
                            src={logo}
                            alt="Logo"
                            style={{ width: '80px', height: '80px', objectFit: 'contain', cursor: 'pointer' }}
                            onClick={() => navigate('/dashboard')}
                        />
                    ) : (
                        <img
                            src={logo}
                            alt="Logo"
                            style={{ width: '36px', height: '36px', objectFit: 'contain', cursor: 'pointer' }}
                            onClick={() => navigate('/dashboard')}
                        />
                    )}
                </Box>
                <List
                    sx={{
                        p: 0,
                        '& .MuiListItem-root': {
                            minHeight: 40,
                            transition: 'min-height 0.2s',
                            color: 'white',
                            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
                        },
                        '& .MuiListItemText-primary': { color: 'white' },
                        '& .MuiSvgIcon-root': { color: 'white' }
                    }}>
                    <ListItem button onClick={() => navigate('/dashboard')} sx={{ cursor: 'pointer', py: 0.5, bgcolor: isActive('/dashboard') ? 'rgba(0, 0, 0, 0.2)' : 'transparent' }}>
                        <DashboardIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                        {drawerOpen && <ListItemText primary="Trang chủ" />}
                    </ListItem>
                    <ListItem button onClick={() => navigate('/profile')} sx={{ cursor: 'pointer', py: 0.5, bgcolor: isActive('/profile') ? 'rgba(0, 0, 0, 0.2)' : 'transparent' }}>
                        <AccountCircleIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                        {drawerOpen && <ListItemText primary="Tài khoản" />}
                    </ListItem>
                    {(user.role === 'Quản trị viên' || user.role === 'Giảng viên' || user.role === 'Lãnh đạo bộ môn' || user.role === 'Chủ nhiệm bộ môn') && (
                        <ListItem button onClick={() => navigate('/batches')} sx={{ cursor: 'pointer', py: 0.5, bgcolor: isActive('/batches') || location.pathname.startsWith('/batches/') ? 'rgba(0, 0, 0, 0.2)' : 'transparent' }}>
                            <GroupIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                            {drawerOpen && <ListItemText primary="Thông tin học viên" />}
                        </ListItem>
                    )}
                    {user.role === 'Quản trị viên' && (
                        <>
                            <ListItem button onClick={() => navigate('/faculties-info')} sx={{ cursor: 'pointer', py: 0.5, bgcolor: isActive('/faculties-info') ? 'rgba(0, 0, 0, 0.2)' : 'transparent' }}>
                                <SchoolIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Quản lý giảng viên" />}
                            </ListItem>
                            <ListItem button onClick={() => navigate('/admin/department-major-mapping')} sx={{ cursor: 'pointer', py: 0.5, bgcolor: isActive('/admin/department-major-mapping') ? 'rgba(0, 0, 0, 0.2)' : 'transparent' }}>
                                <MapIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Ánh xạ Bộ môn - Ngành" />}
                            </ListItem>
                        </>
                    )}
                    {user.role === 'Sinh viên' && (
                        <>
                            <ListItem button onClick={() => navigate('/topic-management')} sx={{ cursor: 'pointer', py: 0.5, bgcolor: isActive('/topic-management') ? 'rgba(0, 0, 0, 0.2)' : 'transparent' }}>
                                <AssignmentIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Quản lý đề tài" />}
                            </ListItem>
                            <ListItem button onClick={() => navigate('/faculties-info')} sx={{ cursor: 'pointer', py: 0.5, bgcolor: isActive('/faculties-info') ? 'rgba(0, 0, 0, 0.2)' : 'transparent' }}>
                                <SchoolIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Thông tin giảng viên" />}
                            </ListItem>
                        </>
                    )}
                    {user.role === 'Giảng viên' && (
                        <>
                            <ListItem button onClick={() => navigate('/topics')} sx={{ cursor: 'pointer', py: 0.5, bgcolor: isActive('/topics') ? 'rgba(0, 0, 0, 0.2)' : 'transparent' }}>
                                <AssignmentIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Quản lý đề tài" />}
                            </ListItem>
                            <ListItem button onClick={() => navigate('/faculties-info')} sx={{ cursor: 'pointer', py: 0.5, bgcolor: isActive('/faculties-info') ? 'rgba(0, 0, 0, 0.2)' : 'transparent' }}>
                                <SchoolIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Thông tin giảng viên" />}
                            </ListItem>
                        </>
                    )}
                    {(user.role === 'Lãnh đạo bộ môn' || user.role === 'Chủ nhiệm bộ môn') && (
                        <>
                            <ListItem button onClick={() => navigate('/topic-management')} sx={{ cursor: 'pointer', py: 0.5, bgcolor: isActive('/topic-management') ? 'rgba(0, 0, 0, 0.2)' : 'transparent' }}>
                                <AssignmentIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Quản lý đề tài" />}
                            </ListItem>
                            <ListItem button onClick={() => navigate('/head/statistics')} sx={{ cursor: 'pointer', py: 0.5, bgcolor: isActive('/head/statistics') ? 'rgba(0, 0, 0, 0.2)' : 'transparent' }}>
                                <GroupIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Thống kê học viên" />}
                            </ListItem>
                            <ListItem button onClick={() => navigate('/faculties-info')} sx={{ cursor: 'pointer', py: 0.5, bgcolor: isActive('/faculties-info') ? 'rgba(0, 0, 0, 0.2)' : 'transparent' }}>
                                <SchoolIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Thông tin giảng viên" />}
                            </ListItem>
                        </>
                    )}
                    {user.role === 'Lãnh đạo khoa' && (
                        <>
                            <ListItem button onClick={() => navigate('/topic-management')} sx={{ cursor: 'pointer', py: 0.5, bgcolor: isActive('/topic-management') ? 'rgba(0, 0, 0, 0.2)' : 'transparent' }}>
                                <AssignmentIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Quản lý đề tài" />}
                            </ListItem>
                            <ListItem button onClick={() => navigate('/faculties-info')} sx={{ cursor: 'pointer', py: 0.5, bgcolor: isActive('/faculties-info') ? 'rgba(0, 0, 0, 0.2)' : 'transparent' }}>
                                <SchoolIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Thông tin giảng viên" />}
                            </ListItem>
                        </>
                    )}
                    <ListItem button onClick={() => navigate('/notifications')} sx={{ cursor: 'pointer', py: 0.5, bgcolor: isActive('/notifications') ? 'rgba(0, 0, 0, 0.2)' : 'transparent' }}>
                        <InfoIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                        {drawerOpen && <ListItemText primary="Thông báo" />}
                    </ListItem>
                    <ListItem button onClick={() => navigate('/calendar')} sx={{ cursor: 'pointer', py: 0.5, bgcolor: isActive('/calendar') ? 'rgba(0, 0, 0, 0.2)' : 'transparent' }}>
                        <CalendarMonthIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                        {drawerOpen && <ListItemText primary="Lịch" />}
                    </ListItem>
                    <ListItem button onClick={() => navigate('/settings')} sx={{ cursor: 'pointer', py: 0.5, bgcolor: isActive('/settings') ? 'rgba(0, 0, 0, 0.2)' : 'transparent' }}>
                        <SettingsIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                        {drawerOpen && <ListItemText primary="Cài đặt" />}
                    </ListItem>
                    <ListItem button onClick={handleLogout} sx={{ cursor: 'pointer', py: 0.5 }}>
                        <ExitToAppIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                        {drawerOpen && <ListItemText primary="Đăng xuất" />}
                    </ListItem>
                </List>
            </Drawer>
            <main style={{ flexGrow: 1, padding: 0 }}>
                {childrenWithClass}
            </main>
        </div>
    );
}

export default AppLayout;
