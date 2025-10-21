import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Paper, Typography, Box, Card, CardContent, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import {
    CircularProgress, Badge
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

    // New states for delete batch
    const [deleteBatchDialogOpen, setDeleteBatchDialogOpen] = useState(false);
    const [selectedBatchToDelete, setSelectedBatchToDelete] = useState(null);
    const [deleteBatchOption, setDeleteBatchOption] = useState('batchOnly'); // 'batchOnly' or 'deleteAccounts'
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
    const openDeleteBatchDialog = (batch) => {
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

    const handleLogout = () => {
        localStorage.removeItem('user');
        document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
        navigate('/');
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
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 2 }}>
                {message.text && (
                    <Alert severity={message.type} sx={{ gridColumn: '1/-1' }}>{message.text}</Alert>
                )}
                {batches.map(batch => (
                    <Card key={batch._id} sx={{ position: 'relative' }}>
                        <CardContent onClick={() => handleBatchClick(batch)} sx={{ cursor: 'pointer' }}>
                            <Typography variant="h6">{batch.batchName}</Typography>
                            <Typography variant="body2" color="text.secondary">Số học viên: {batch.students?.length || 0}</Typography>
                            <Typography variant="body2" color="text.secondary">Quyết định: {batch.decision}</Typography>
                            <Typography variant="caption" color="text.secondary">Tải lên: {formatDate(batch.uploadDate)}</Typography>
                        </CardContent>

                        {/* Delete button for admin */}
                        {user.role === 'Quản trị viên' && (
                            <Box sx={{ position: 'absolute', right: 12, bottom: 12 }}>
                                <IconButton
                                    size="small"
                                    color="error"
                                    onClick={(e) => { e.stopPropagation(); openDeleteBatchDialog(batch); }}
                                    title="Xóa đợt học viên"
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </Box>
                        )}
                    </Card>
                ))}
            </Box>
        );
    };

    return (
        <AppLayout>
        <div className="dashboard">
            <div className="dashboard-content">
                {content()}

                {/* Delete batch confirmation dialog */}
                <Dialog open={deleteBatchDialogOpen} onClose={() => setDeleteBatchDialogOpen(false)}>
                    <DialogTitle>Xóa toàn bộ đợt học viên</DialogTitle>
                    <DialogContent>
                        <Typography sx={{ mb: 2 }}>
                            Bạn sắp xóa đợt <strong>{selectedBatchToDelete?.batchName}</strong>.
                        </Typography>
                        <Typography sx={{ mb: 1 }}>Chọn phương án:</Typography>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                            <Button
                                variant={deleteBatchOption === 'batchOnly' ? 'contained' : 'outlined'}
                                onClick={() => setDeleteBatchOption('batchOnly')}
                            >
                                Chỉ xóa bản ghi đợt (không xóa tài khoản học viên)
                            </Button>
                            <Button
                                variant={deleteBatchOption === 'deleteAccounts' ? 'contained' : 'outlined'}
                                color="error"
                                onClick={() => setDeleteBatchOption('deleteAccounts')}
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