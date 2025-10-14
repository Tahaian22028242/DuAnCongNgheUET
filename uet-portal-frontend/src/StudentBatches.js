import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Typography, Box, Paper, Card, CardContent, CardActionArea,
    CircularProgress, Alert, Drawer, List, ListItem, ListItemText,
    Grid, Chip, Badge
} from '@mui/material';
import axios from 'axios';
import { format } from 'date-fns';
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
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import AppLayout from './AppLayout';

function StudentBatches() {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const navigate = useNavigate();

    useEffect(() => {
        fetchBatches();
    }, []);

    const fetchBatches = async () => {
        try {
            const response = await axios.get('http://localhost:5000/students/batches', {
                withCredentials: true,
            });
            setBatches(response.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching batches:', err);
            if (err.response?.status === 403) {
                setError('Bạn không có quyền truy cập chức năng này.');
            } else {
                setError('Không thể tải danh sách học viên. Vui lòng thử lại sau.');
            }
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        try {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return format(date, 'dd/MM/yyyy');
        } catch (error) {
            return 'N/A';
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
        navigate('/');
    };

    const handleBatchClick = (batch) => {
        // navigate(`/batch/${batch._id}`, { state: { batch } });
        navigate(`/batches/${batch._id}`, { state: { batch } });
    };

    // Tính toán thống kê
    const getUniqueSubjects = (students) => {
        const subjects = students.map(s => s.major).filter(Boolean);
        return [...new Set(subjects)].length;
    };

    const content = () => {
        if (loading) {
            return (
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    minHeight: '400px' 
                }}>
                    <CircularProgress size={60} />
                </Box>
            );
        }

        if (error) {
            return (
                <Box sx={{ p: 3 }}>
                    <Alert severity="error" sx={{ borderRadius: 2 }}>
                        {error}
                    </Alert>
                </Box>
            );
        }

        return (
            <Box sx={{ p: 3 }}>
                <Box sx={{ mb: 4 }}>
                    <Typography 
                        variant="h4" 
                        gutterBottom 
                        sx={{ 
                            fontWeight: 700,
                            color: '#1976d2',
                            mb: 1
                        }}
                    >
                        Danh sách các đợt học viên
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                        Chọn một đợt để xem chi tiết danh sách học viên
                    </Typography>
                </Box>

                {batches.length === 0 ? (
                    <Paper sx={{ 
                        p: 6, 
                        textAlign: 'center',
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
                    }}>
                        <SchoolIcon sx={{ fontSize: 80, color: '#bdbdbd', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            Chưa có đợt học viên nào
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Hiện chưa có đợt học viên nào được tải lên hệ thống.
                        </Typography>
                    </Paper>
                ) : (
                    <>
                        {/* Thống kê tổng quan */}
                        <Paper sx={{ 
                            p: 3, 
                            mb: 4, 
                            borderRadius: 3,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white'
                        }}>
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={4}>
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                            {batches.length}
                                        </Typography>
                                        <Typography variant="subtitle1">
                                            Đợt học viên
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                            {batches.reduce((total, batch) => total + batch.students.length, 0)}
                                        </Typography>
                                        <Typography variant="subtitle1">
                                            Tổng học viên
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography variant="h3" sx={{ fontWeight: 700 }}>
                                            {batches.reduce((subjects, batch) => {
                                                const batchSubjects = [...new Set(batch.students.map(s => s.major).filter(Boolean))];
                                                batchSubjects.forEach(subject => subjects.add(subject));
                                                return subjects;
                                            }, new Set()).size}
                                        </Typography>
                                        <Typography variant="subtitle1">
                                            Ngành học
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Paper>

                        {/* Danh sách đợt */}
                        <Grid container spacing={3}>
                            {batches.map((batch) => (
                                <Grid item xs={12} sm={6} lg={4} key={batch._id}>
                                    <Card 
                                        sx={{ 
                                            height: '100%',
                                            borderRadius: 3,
                                            transition: 'all 0.3s ease-in-out',
                                            '&:hover': {
                                                transform: 'translateY(-8px)',
                                                boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                                            },
                                            border: '1px solid #e0e0e0',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        {/* Header gradient */}
                                        <Box sx={{
                                            height: '6px',
                                            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                                        }} />
                                        
                                        <CardActionArea 
                                            onClick={() => handleBatchClick(batch)}
                                            sx={{ height: 'calc(100% - 6px)' }}
                                        >
                                            <CardContent sx={{ p: 3, height: '100%' }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                                    <Typography 
                                                        variant="h6" 
                                                        sx={{ 
                                                            fontWeight: 700,
                                                            color: '#1976d2',
                                                            lineHeight: 1.2,
                                                            flex: 1
                                                        }}
                                                    >
                                                        {batch.batchName}
                                                    </Typography>
                                                    <Badge 
                                                        badgeContent={batch.students.length} 
                                                        color="primary"
                                                        sx={{ ml: 2 }}
                                                    >
                                                        <PeopleIcon color="action" />
                                                    </Badge>
                                                </Box>

                                                <Box sx={{ mb: 3 }}>
                                                    <Typography 
                                                        variant="body2" 
                                                        color="text.secondary"
                                                        sx={{ mb: 1 }}
                                                    >
                                                        <strong>Quyết định:</strong> {batch.decision}
                                                    </Typography>
                                                    <Typography 
                                                        variant="body2" 
                                                        color="text.secondary"
                                                    >
                                                        <strong>Ngày tải lên:</strong> {formatDate(batch.uploadDate)}
                                                    </Typography>
                                                </Box>

                                                {/* Thống kê nhanh */}
                                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                                                    <Chip
                                                        icon={<PeopleIcon />}
                                                        label={`${batch.students.length} học viên`}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ borderRadius: 2 }}
                                                    />
                                                    <Chip
                                                        icon={<SchoolIcon />}
                                                        label={`${getUniqueSubjects(batch.students)} ngành`}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ borderRadius: 2 }}
                                                    />
                                                </Box>

                                                {/* Hiển thị một số ngành học phổ biến */}
                                                <Box sx={{ mt: 'auto' }}>
                                                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                                        Ngành học phổ biến:
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                        {[...new Set(batch.students.map(s => s.major).filter(Boolean))]
                                                            .slice(0, 2)
                                                            .map((major, index) => (
                                                                <Chip
                                                                    key={index}
                                                                    label={major}
                                                                    size="small"
                                                                    sx={{ 
                                                                        fontSize: '0.7rem',
                                                                        height: '20px',
                                                                        bgcolor: '#f5f5f5',
                                                                        color: '#666'
                                                                    }}
                                                                />
                                                            ))
                                                        }
                                                        {getUniqueSubjects(batch.students) > 2 && (
                                                            <Chip
                                                                label={`+${getUniqueSubjects(batch.students) - 2}`}
                                                                size="small"
                                                                sx={{ 
                                                                    fontSize: '0.7rem',
                                                                    height: '20px',
                                                                    bgcolor: '#e3f2fd',
                                                                    color: '#1976d2'
                                                                }}
                                                            />
                                                        )}
                                                    </Box>
                                                </Box>
                                            </CardContent>
                                        </CardActionArea>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </>
                )}
            </Box>
        );
    };

    return (
        <AppLayout>
        <div className="dashboard">
            <div className="dashboard-content">
                {content()}
            </div>
        </div>
        </AppLayout>
    );
}

export default StudentBatches;