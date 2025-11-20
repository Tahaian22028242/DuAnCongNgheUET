import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Typography, Box, Paper, Card, CardContent, CardActionArea,
    CircularProgress, Alert, Grid, Chip, Badge, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, Button
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import axios from 'axios';
import { format } from 'date-fns';
import './Dashboard.css';
import AppLayout from './AppLayout';

function StudentBatches() {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const navigate = useNavigate();

    // States for delete batch functionality
    const [deleteBatchDialogOpen, setDeleteBatchDialogOpen] = useState(false);
    const [selectedBatchToDelete, setSelectedBatchToDelete] = useState(null);
    const [deleteBatchOption, setDeleteBatchOption] = useState('batchOnly');
    const [message, setMessage] = useState({ type: '', text: '' });

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

    // Open delete dialog
    const openDeleteBatchDialog = (batch, e) => {
        e.stopPropagation();
        setSelectedBatchToDelete(batch);
        setDeleteBatchOption('batchOnly');
        setDeleteBatchDialogOpen(true);
    };

    // Confirm delete
    const handleConfirmDeleteBatch = async () => {
        if (!selectedBatchToDelete) return;
        try {
            const res = await fetch(
                `http://localhost:5000/admin/batch/${selectedBatchToDelete._id}?deleteAccounts=${deleteBatchOption === 'deleteAccounts'}`,
                {
                    method: 'DELETE',
                    credentials: 'include'
                }
            );
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: data.message || 'Đã xóa đợt học viên.' });
                setDeleteBatchDialogOpen(false);
                setSelectedBatchToDelete(null);
                fetchBatches();
            } else {
                setMessage({ type: 'error', text: data.message || 'Lỗi khi xóa đợt.' });
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Lỗi khi xóa đợt học viên.' });
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

    const handleBatchClick = (batch) => {
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
                {/* Message Alert */}
                {message.text && (
                    <Alert
                        severity={message.type}
                        sx={{ mb: 3, borderRadius: 2 }}
                        onClose={() => setMessage({ type: '', text: '' })}
                    >
                        {message.text}
                    </Alert>
                )}

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

                                                {/* Delete button for admin - positioned at bottom right */}
                                                {user.role === 'Quản trị viên' && (
                                                    <Box sx={{ position: 'absolute', right: 12, bottom: 12 }}>
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={(e) => openDeleteBatchDialog(batch, e)}
                                                            title="Xóa đợt học viên"
                                                            sx={{
                                                                bgcolor: 'white',
                                                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                                                '&:hover': {
                                                                    bgcolor: '#ffebee',
                                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                                                }
                                                            }}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                )}
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

                    <Button onClick={() => navigate('/upload')} sx={{ cursor: 'pointer', py: 0.5 }}>
                        <UploadFileIcon sx={{ mr: 1, justifyContent: 'center' }} />
                        Tải lên đợt học viên mới
                    </Button>

                    {/* Delete batch confirmation dialog */}
                    <Dialog open={deleteBatchDialogOpen} onClose={() => setDeleteBatchDialogOpen(false)}>
                        <DialogTitle>Xóa toàn bộ đợt học viên</DialogTitle>
                        <DialogContent>
                            <Typography sx={{ mb: 2 }}>
                                Bạn sắp xóa đợt <strong>{selectedBatchToDelete?.batchName}</strong>.
                            </Typography>
                            <Typography sx={{ mb: 1 }}>Chọn phương án:</Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                                <Button
                                    variant={deleteBatchOption === 'batchOnly' ? 'contained' : 'outlined'}
                                    onClick={() => setDeleteBatchOption('batchOnly')}
                                    fullWidth
                                >
                                    Chỉ xóa bản ghi đợt (không xóa tài khoản học viên)
                                </Button>
                                <Button
                                    variant={deleteBatchOption === 'deleteAccounts' ? 'contained' : 'outlined'}
                                    color="error"
                                    onClick={() => setDeleteBatchOption('deleteAccounts')}
                                    fullWidth
                                >
                                    Xóa đợt và xóa tài khoản học viên trong đợt
                                </Button>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                                Lưu ý: Xóa tài khoản học viên sẽ xóa người dùng có username trùng mã học viên (role = "Sinh viên").
                            </Typography>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDeleteBatchDialogOpen(false)}>Hủy</Button>
                            <Button onClick={handleConfirmDeleteBatch} color="error" variant="contained">Xóa</Button>
                        </DialogActions>
                    </Dialog>
                </div>
            </div>
        </AppLayout>
    );
}

export default StudentBatches;