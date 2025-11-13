import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Drawer, List, ListItem, ListItemText, Box, IconButton } from '@mui/material';
import logo from './logo.png';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HelpIcon from '@mui/icons-material/Help';
import InfoIcon from '@mui/icons-material/Info';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GroupIcon from '@mui/icons-material/Group';
// import UploadFileIcon from '@mui/icons-material/UploadFile';
import SchoolIcon from '@mui/icons-material/School';
import SettingsIcon from '@mui/icons-material/Settings';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Tooltip from '@mui/material/Tooltip';

const AppLayout = ({ children }) => {
    const drawerWidth = 280;
    const collapsedWidth = 60;
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const [drawerOpen, setDrawerOpen] = useState(true);
    // const buttonWidth = drawerWidth / 6;

    const handleLogout = () => {
        localStorage.removeItem('user');
        document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        navigate('/');
    };

    // Truyền prop cho dashboard-content
    const dashboardContentClass = 'dashboard-content';

    // Clone children để thêm className nếu là dashboard-content
    const childrenWithClass = React.Children.map(children, child => {
        if (React.isValidElement(child) && child.props.className === 'dashboard-content') {
            return React.cloneElement(child, {
                className: dashboardContentClass
            });
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
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        pointerEvents: 'auto',
                    }}
                >
                    <Tooltip title={drawerOpen ? "Thu gọn" : "Mở rộng"} placement="right">
                        <IconButton
                            onClick={() => setDrawerOpen(!drawerOpen)}
                            size="small"
                            sx={{
                                // width: (drawerOpen ? drawerWidth : collapsedWidth) / 6,
                                width: drawerOpen ? drawerWidth : collapsedWidth,
                                height: 36,
                                // bgcolor: 'white',
                                // border: '1px solid #e0e0e0',
                                // boxShadow: 1,
                                // transition: 'width 0.2s',
                                borderRadius: 1,
                                bgcolor: '#2e7d32',
                                color: 'white',
                                '&:hover': {
                                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                                },
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
                        height: 120, // Chiều cao cố định cho phần logo
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
                            minHeight: 40, // Chiều cao cố định cho mỗi ListItem
                            transition: 'min-height 0.2s',
                            color: 'white',
                            '&:hover': {
                                bgcolor: 'rgba(255, 255, 255, 0.1)',
                            }
                        },
                        '& .MuiListItemText-primary': {
                            color: 'white',
                        },
                        '& .MuiSvgIcon-root': {
                            color: 'white',
                        }
                    }}>
                    <ListItem button onClick={() => navigate('/dashboard')} sx={{ cursor: 'pointer', py: 0.5 }}>
                        <DashboardIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                        {drawerOpen && <ListItemText primary="Trang chủ" />}
                    </ListItem>
                    <ListItem button onClick={() => navigate('/profile')} sx={{ cursor: 'pointer', py: 0.5 }}>
                        <AccountCircleIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                        {drawerOpen && <ListItemText primary="Tài khoản" />}
                    </ListItem>
                    {(user.role === 'Quản trị viên' || user.role === 'Giảng viên' || user.role === 'Lãnh đạo bộ môn' || user.role === 'Chủ nhiệm bộ môn') && (
                        <ListItem button onClick={() => navigate('/batches')} sx={{ cursor: 'pointer', py: 0.5 }}>
                            <GroupIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                            {drawerOpen && <ListItemText primary="Quản lý học viên" />}
                        </ListItem>
                    )}
                    {user.role === 'Quản trị viên' && (
                        <>
                            <ListItem button onClick={() => navigate('/faculties-info')} sx={{ cursor: 'pointer', py: 0.5 }}>
                                {/* <InfoIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Quản lý giảng viên" />}
                            </ListItem>
                            <ListItem button onClick={() => navigate('/topic-proposals')} sx={{ cursor: 'pointer', py: 0.5 }}>
                                <AssignmentIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Đề tài chưa được phê duyệt" />} */}
                                <SchoolIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Quản lý giảng viên" />}
                            </ListItem>
                        </>
                    )}
                    {user.role === 'Sinh viên' && (
                        <>
                            <ListItem button onClick={() => navigate('/propose-topic')} sx={{ cursor: 'pointer', py: 0.5 }}>
                                <AssignmentIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Đề xuất đề cương" />}
                            </ListItem>
                            <ListItem button onClick={() => navigate('/faculties-info')} sx={{ cursor: 'pointer', py: 0.5 }}>
                                {/* <InfoIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Thông tin giảng viên" />} */}
                                 <SchoolIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Thông tin giảng viên" />}
                            </ListItem>
                            {/* <ListItem button onClick={() => navigate('/notifications')}>
                                <InfoIcon sx={{ mr: 1 }} />
                                <ListItemText primary="Thông báo" /> */}
                                 <ListItem button onClick={() => navigate('/notifications')} sx={{ cursor: 'pointer', py: 0.5 }}>
                                <InfoIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Thông báo" />}
                            </ListItem>
                        </>
                    )}
                    {user.role === 'Giảng viên' && (
                        <>
                            <ListItem button onClick={() => navigate('/topics')} sx={{ cursor: 'pointer', py: 0.5 }}>
                                <AssignmentIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Đề xuất từ học viên" />}
                            </ListItem>
                            <ListItem button onClick={() => navigate('/faculties-info')} sx={{ cursor: 'pointer', py: 0.5 }}>
                                {/* <InfoIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Thông tin giảng viên" />} */}
                                <SchoolIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Thông tin giảng viên" />}
                            </ListItem>
                            <ListItem button onClick={() => navigate('/topic-proposals')} sx={{ cursor: 'pointer', py: 0.5 }}>
                                <AssignmentIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Đề tài chưa được phê duyệt" />}
                            </ListItem>
                        </>
                    )}
                    {(user.role === 'Lãnh đạo bộ môn' || user.role === 'Chủ nhiệm bộ môn') && (
                        <>
                            <ListItem button onClick={() => navigate('/head/topics')} sx={{ cursor: 'pointer', py: 0.5 }}>
                                <AssignmentIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Đề tài chờ phê duyệt" />}
                            </ListItem>
                            <ListItem button onClick={() => navigate('/head/statistics')} sx={{ cursor: 'pointer', py: 0.5 }}>
                                <GroupIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Thống kê học viên" />}
                            </ListItem>
                        </>
                    )}
                    {user.role === 'Lãnh đạo khoa' && (
                        <>
                            <ListItem button onClick={() => navigate('/faculty-leader/topics')} sx={{ cursor: 'pointer', py: 0.5 }}>
                                <AssignmentIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Quản lý đề cương" />}
                            </ListItem>
                        </>
                    )}
                    <ListItem button onClick={() => navigate('/calendar')} sx={{ cursor: 'pointer', py: 0.5 }}>
                        <CalendarMonthIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                        {drawerOpen && <ListItemText primary="Lịch" />}
                    </ListItem>
                    <ListItem button onClick={() => navigate('/settings')} sx={{ cursor: 'pointer', py: 0.5 }}>
                        <SettingsIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                        {/* {drawerOpen && <ListItemText primary="Setting" />}
                    </ListItem>
                    <ListItem button onClick={() => navigate('/help')} sx={{ cursor: 'pointer', py: 0.5 }}>
                        <HelpIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                        {drawerOpen && <ListItemText primary="Help" />}
                    </ListItem>
                    <ListItem button onClick={() => navigate('/about')} sx={{ cursor: 'pointer', py: 0.5 }}>
                        <InfoIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                        {drawerOpen && <ListItemText primary="Introduction" />}
                    </ListItem>
                    <ListItem button onClick={() => navigate('/contact')} sx={{ cursor: 'pointer', py: 0.5 }}>
                        <ContactMailIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                        {drawerOpen && <ListItemText primary="Contact" />} */}
                        {drawerOpen && <ListItemText primary="Cài đặt" />}
                    </ListItem>
                    <ListItem button onClick={handleLogout} sx={{ cursor: 'pointer', py: 0.5 }}>
                        <ExitToAppIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                        {drawerOpen && <ListItemText primary="Logout" />}
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
