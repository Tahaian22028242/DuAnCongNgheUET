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

const AppLayout = ({ children }) => {
    const drawerWidth = 260;
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
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
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
                <List>
                    <ListItem button onClick={() => navigate('/dashboard')}>
                        <DashboardIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                        {drawerOpen && <ListItemText primary="Dashboard" />}
                    </ListItem>
                    <ListItem button onClick={() => navigate('/profile')}>
                        <AccountCircleIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                        {drawerOpen && <ListItemText primary="Account" />}
                    </ListItem>
                    {(user.role === 'Quản trị viên' || user.role === 'Giảng viên' || user.role === 'Chủ nhiệm bộ môn') && (
                        <ListItem button onClick={() => navigate('/batches')}>
                            <GroupIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                            {drawerOpen && <ListItemText primary="Danh sách học viên" />}
                        </ListItem>
                    )}
                    {user.role === 'Quản trị viên' && (
                        <>
                            <ListItem button onClick={() => navigate('/upload')}>
                                <UploadFileIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Tải lên danh sách" />}
                            </ListItem>
                            <ListItem button onClick={() => navigate('/upload-heads')}>
                                <UploadFileIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Tải lên CNBM" />}
                            </ListItem>
                            <ListItem button onClick={() => navigate('/upload-lecturers')}>
                                <UploadFileIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Tải lên danh sách giảng viên" />}
                            </ListItem>
                            <ListItem button onClick={() => navigate('/topic-proposals')}>
                                <AssignmentIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Đề tài chưa được phê duyệt" />}
                            </ListItem>
                        </>
                    )}
                    {user.role === 'Sinh viên' && (
                        <>
                            <ListItem button onClick={() => navigate('/propose-topic')}>
                                <AssignmentIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Đề xuất đề cương" />}
                            </ListItem>
                            <ListItem button onClick={() => navigate('/faculties-info')}>
                                <InfoIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Thông tin" />}
                            </ListItem>
                        </>
                    )}
                    {user.role === 'Giảng viên' && (
                        <ListItem button onClick={() => navigate('/topics')}>
                            <AssignmentIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                            {drawerOpen && <ListItemText primary="Đề xuất từ học viên" />}
                        </ListItem>
                    )}
                    {user.role === 'Chủ nhiệm bộ môn' && (
                        <>
                            <ListItem button onClick={() => navigate('/head/topics')}>
                                <AssignmentIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Đề tài chờ phê duyệt" />}
                            </ListItem>
                            <ListItem button onClick={() => navigate('/head/statistics')}>
                                <GroupIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                                {drawerOpen && <ListItemText primary="Thống kê học viên" />}
                            </ListItem>
                        </>
                    )}
                    <ListItem button onClick={() => navigate('/calendar')}>
                        <CalendarMonthIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                        {drawerOpen && <ListItemText primary="Calendar" />}
                    </ListItem>
                    <ListItem button onClick={() => navigate('/settings')}>
                        <SettingsIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                        {drawerOpen && <ListItemText primary="Setting" />}
                    </ListItem>
                    <ListItem button onClick={() => navigate('/help')}>
                        <HelpIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                        {drawerOpen && <ListItemText primary="Help" />}
                    </ListItem>
                    <ListItem button onClick={() => navigate('/about')}>
                        <InfoIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                        {drawerOpen && <ListItemText primary="Introduction" />}
                    </ListItem>
                    <ListItem button onClick={() => navigate('/contact')}>
                        <ContactMailIcon sx={{ mr: drawerOpen ? 1 : 0, justifyContent: 'center' }} />
                        {drawerOpen && <ListItemText primary="Contact" />}
                    </ListItem>
                    <ListItem button onClick={handleLogout}>
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
