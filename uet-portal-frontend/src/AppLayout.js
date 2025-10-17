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
import UploadFileIcon from '@mui/icons-material/UploadFile';
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
    const buttonWidth = drawerWidth / 6;

    const handleLogout = () => {
        localStorage.removeItem('user');
        document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        navigate('/');
    };

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
                                width: (drawerOpen ? drawerWidth : collapsedWidth) / 6,
                                height: 36,
                                bgcolor: 'white',
                                border: '1px solid #e0e0e0',
                                boxShadow: 1,
                                transition: 'width 0.2s',
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
                        }
                    }}>
                    <ListItem button onClick={() => navigate('/dashboard')} sx={{ cursor: 'pointer', py: 0.5 }}>
                        <DashboardIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                        {drawerOpen && <ListItemText primary="Dashboard" />}
                    </ListItem>
                    <ListItem button onClick={() => navigate('/profile')} sx={{ cursor: 'pointer', py: 0.5 }}>
                        <AccountCircleIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                        {drawerOpen && <ListItemText primary="Account" />}
                    </ListItem>
                    {(user.role === 'Quản trị viên' || user.role === 'Giảng viên' || user.role === 'Chủ nhiệm bộ môn') && (
                        <ListItem button onClick={() => navigate('/batches')} sx={{ cursor: 'pointer', py: 0.5 }}>
                            <GroupIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                            {drawerOpen && <ListItemText primary="Danh sách học viên" />}
                        </ListItem>
                    )}
                    {user.role === 'Quản trị viên' && (
                        <>
                            <ListItem button onClick={() => navigate('/upload')} sx={{ cursor: 'pointer', py: 0.5 }}>
                                <UploadFileIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Tải lên danh sách" />}
                            </ListItem>
                            <ListItem button onClick={() => navigate('/upload-heads')} sx={{ cursor: 'pointer', py: 0.5 }}>
                                <UploadFileIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Tải lên CNBM" />}
                            </ListItem>
                            <ListItem button onClick={() => navigate('/upload-lecturers')} sx={{ cursor: 'pointer', py: 0.5 }}>
                                <UploadFileIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Tải lên danh sách giảng viên" />}
                            </ListItem>
                            <ListItem button onClick={() => navigate('/topic-proposals')} sx={{ cursor: 'pointer', py: 0.5 }}>
                                <AssignmentIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Đề tài chưa được phê duyệt" />}
                            </ListItem>
                            <ListItem button onClick={() => navigate('/faculties-info')} sx={{ cursor: 'pointer', py: 0.5 }}>
                                <InfoIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Thông tin" />}
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
                                <InfoIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Thông tin" />}
                            </ListItem>
                            <ListItem button onClick={() => navigate('/notifications')}>
                                <InfoIcon sx={{ mr: 1 }} />
                                <ListItemText primary="Thông báo" />
                            </ListItem>
                        </>
                    )}
                    {user.role === 'Giảng viên' && (
                        <ListItem button onClick={() => navigate('/topics')} sx={{ cursor: 'pointer', py: 0.5 }}>
                            <AssignmentIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                            {drawerOpen && <ListItemText primary="Đề xuất từ học viên" />}
                        </ListItem>
                    )}
                    {user.role === 'Chủ nhiệm bộ môn' && (
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
                    <ListItem button onClick={() => navigate('/calendar')} sx={{ cursor: 'pointer', py: 0.5 }}>
                        <CalendarMonthIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                        {drawerOpen && <ListItemText primary="Calendar" />}
                    </ListItem>
                    <ListItem button onClick={() => navigate('/settings')} sx={{ cursor: 'pointer', py: 0.5 }}>
                        <SettingsIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                        {drawerOpen && <ListItemText primary="Setting" />}
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
                        {drawerOpen && <ListItemText primary="Contact" />}
                    </ListItem>
                    <ListItem button onClick={handleLogout} sx={{ cursor: 'pointer', py: 0.5 }}>
                        <ExitToAppIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                        {drawerOpen && <ListItemText primary="Logout" />}
                    </ListItem>
                </List>
            </Drawer>
            <main style={{ flexGrow: 1, padding: 24, marginLeft: drawerOpen ? drawerWidth : collapsedWidth, transition: 'margin-left 0.2s' }}>
                {children}
            </main>
        </div>
    );
}

export default AppLayout;
