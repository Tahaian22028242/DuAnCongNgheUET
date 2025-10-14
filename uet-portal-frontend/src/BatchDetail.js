import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, CircularProgress, Alert, Drawer, List, ListItem, ListItemText,
    Button, Toolbar, Chip, TextField, InputAdornment, Grid, IconButton, Dialog, DialogTitle, DialogContent,
    DialogActions
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import logo from './logo.png';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import GroupIcon from '@mui/icons-material/Group';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AssignmentIcon from '@mui/icons-material/Assignment';
import InfoIcon from '@mui/icons-material/Info';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpIcon from '@mui/icons-material/Help';
import DownloadIcon from '@mui/icons-material/Download'; // Thêm import
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

function BatchDetail() {
    const { batchId } = useParams();
    const [batchInfo, setBatchInfo] = useState(null);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [studentForm, setStudentForm] = useState({ studentId: '', fullName: '', birthDate: '', major: '' });
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteOption, setDeleteOption] = useState('batchOnly');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [searchFilters, setSearchFilters] = useState({
        studentId: '',
        fullName: '',
        birthDate: '',
        major: ''
    });
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const [originalStudentId, setOriginalStudentId] = useState('');

    useEffect(() => {
        fetchBatchDetail();
        // Scroll lên đầu khi vào trang
        window.scrollTo(0, 0);
    }, [batchId]);

    useEffect(() => {
        handleFilterStudents();
        setPage(0); // Reset về trang đầu khi lọc
    }, [students, searchFilters]);

    const fetchBatchDetail = async () => {
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:5000/batch/${batchId}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Không thể tải thông tin đợt học viên');
            const data = await res.json();
            setBatchInfo(data.batch);
            setStudents(data.batch.students || []);
            setLoading(false);
        } catch (err) {
            setError('Không thể tải thông tin đợt học viên.');
            setLoading(false);
        }
    };

    const handleFilterChange = (field, value) => {
        setSearchFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleFilterStudents = () => {
        let result = students;
        if (searchFilters.studentId.trim()) {
            result = result.filter(s => s.studentId?.toLowerCase().includes(searchFilters.studentId.trim().toLowerCase()));
        }
        if (searchFilters.fullName.trim()) {
            result = result.filter(s => s.fullName?.toLowerCase().includes(searchFilters.fullName.trim().toLowerCase()));
        }
        if (searchFilters.birthDate.trim()) {
            result = result.filter(s => {
                const date = new Date(s.birthDate);
                const filterDate = new Date(searchFilters.birthDate);
                return date.toDateString() === filterDate.toDateString();
            });
        }
        if (searchFilters.major.trim()) {
            result = result.filter(s => s.major?.toLowerCase().includes(searchFilters.major.trim().toLowerCase()));
        }
        setFilteredStudents(result);
    };

    const handleClearFilters = () => {
        setSearchFilters({
            studentId: '',
            fullName: '',
            birthDate: '',
            major: ''
        });
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
        window.scrollTo(0, 0);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
        window.scrollTo(0, 0);
    };

    const formatDate = (dateString) => {
        try {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleDateString('vi-VN');
        } catch (error) {
            return 'N/A';
        }
    };

    const currentStudents = filteredStudents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const handleLogout = () => {
        localStorage.removeItem('user');
        document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        navigate('/');
    };

    // Thêm học viên
    const handleAddStudent = async () => {
        try {
            const res = await fetch(`http://localhost:5000/admin/batch/${batchId}/add-student`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(studentForm)
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: data.message });
                setAddDialogOpen(false);
                fetchBatchDetail();
            } else {
                setMessage({ type: 'error', text: data.message });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Lỗi khi thêm học viên.' });
        }
    };

    // Sửa học viên
    const handleEditStudent = async () => {
        try {
            // Chuẩn bị body request
            const requestBody = {
                fullName: studentForm.fullName,
                birthDate: studentForm.birthDate,
                major: studentForm.major
            };

            // Nếu mã học viên thay đổi, thêm newStudentId
            if (studentForm.studentId !== originalStudentId) {
                requestBody.newStudentId = studentForm.studentId;
            }

            const res = await fetch(`http://localhost:5000/admin/student/${originalStudentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(requestBody)
            });

            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: data.message });
                setEditDialogOpen(false);
                fetchBatchDetail();
            } else {
                setMessage({ type: 'error', text: data.message });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Lỗi khi sửa học viên.' });
        }
    };

    // Xóa học viên
    const handleDeleteStudent = async () => {
        try {
            const res = await fetch(
                `http://localhost:5000/admin/batch/${batchId}/student/${selectedStudent.studentId}?deleteAccount=${deleteOption === 'deleteAll'}`,
                { method: 'DELETE', credentials: 'include' }
            );
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: data.message });
                setDeleteDialogOpen(false);
                fetchBatchDetail();
            } else {
                setMessage({ type: 'error', text: data.message });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Lỗi khi xóa học viên.' });
        }
    };

    return (
        <div className="dashboard">
            <Drawer variant="permanent" anchor="left">
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
                    <img
                        src={logo}
                        alt="Logo"
                        style={{ width: '80px', height: '80px', objectFit: 'contain', cursor: 'pointer' }}
                        onClick={() => navigate('/dashboard')}
                    />
                </Box>
                <List>
                    <ListItem button onClick={() => navigate('/dashboard')}>
                        <DashboardIcon sx={{ mr: 1 }} />
                        <ListItemText primary="Dashboard" />
                    </ListItem>
                    <ListItem button onClick={() => navigate('/profile')}>
                        <AccountCircleIcon sx={{ mr: 1 }} />
                        <ListItemText primary="Account" />
                    </ListItem>
                    {(user.role === 'Quản trị viên' || user.role === 'Giảng viên' || user.role === 'Chủ nhiệm bộ môn') && (
                        <ListItem button onClick={() => navigate('/batches')}>
                            <GroupIcon sx={{ mr: 1 }} />
                            <ListItemText primary="Danh sách học viên" />
                        </ListItem>
                    )}
                    {user.role === 'Quản trị viên' && (
                        <>
                            <ListItem button onClick={() => navigate('/upload')}>
                                <UploadFileIcon sx={{ mr: 1 }} />
                                <ListItemText primary="Tải lên danh sách" />
                            </ListItem>
                            <ListItem button onClick={() => navigate('/upload-heads')}>
                                <UploadFileIcon sx={{ mr: 1 }} />
                                <ListItemText primary="Tải lên CNBM" />
                            </ListItem>
                            <ListItem button onClick={() => navigate('/upload-lecturers')}>
                                <UploadFileIcon sx={{ mr: 1 }} />
                                <ListItemText primary="Tải lên danh sách giảng viên" />
                            </ListItem>
                            <ListItem button onClick={() => navigate('/topic-proposals')}>
                                <AssignmentIcon sx={{ mr: 1 }} />
                                <ListItemText primary="Đề tài chưa được phê duyệt" />
                            </ListItem>
                        </>
                    )}
                    {user.role === 'Sinh viên' && (
                        <>
                            <ListItem button onClick={() => navigate('/propose-topic')}>
                                <AssignmentIcon sx={{ mr: 1 }} />
                                <ListItemText primary="Đề xuất đề cương" />
                            </ListItem>
                            <ListItem button onClick={() => navigate('/faculties-info')}>
                                <InfoIcon sx={{ mr: 1 }} />
                                <ListItemText primary="Thông tin" />
                            </ListItem>
                        </>
                    )}
                    {user.role === 'Giảng viên' && (
                        <ListItem button onClick={() => navigate('/topics')}>
                            <AssignmentIcon sx={{ mr: 1 }} />
                            <ListItemText primary="Đề xuất từ học viên" />
                        </ListItem>
                    )}
                    {user.role === 'Chủ nhiệm bộ môn' && (
                        <ListItem button onClick={() => navigate('/head/topics')}>
                            <AssignmentIcon sx={{ mr: 1 }} />
                            <ListItemText primary="Đề tài chờ phê duyệt" />
                        </ListItem>
                    )}
                    {user.role === 'Chủ nhiệm bộ môn' && (
                        <ListItem button onClick={() => navigate('/head/statistics')}>
                            <GroupIcon sx={{ mr: 1 }} />
                            <ListItemText primary="Thống kê học viên" />
                        </ListItem>
                    )}
                    <ListItem button onClick={() => navigate('/calendar')}>
                        <CalendarMonthIcon sx={{ mr: 1 }} />
                        <ListItemText primary="Calendar" />
                    </ListItem>
                    <ListItem button onClick={() => navigate('/settings')}>
                        <SettingsIcon sx={{ mr: 1 }} />
                        <ListItemText primary="Setting" />
                    </ListItem>
                    <ListItem button onClick={() => navigate('/help')}>
                        <HelpIcon sx={{ mr: 1 }} />
                        <ListItemText primary="Help" />
                    </ListItem>
                    <ListItem button onClick={() => navigate('/about')}>
                        <InfoIcon sx={{ mr: 1 }} />
                        <ListItemText primary="Introduction" />
                    </ListItem>
                    <ListItem button onClick={() => navigate('/contact')}>
                        <ContactMailIcon sx={{ mr: 1 }} />
                        <ListItemText primary="Contact" />
                    </ListItem>
                    <ListItem button onClick={handleLogout}>
                        <ExitToAppIcon sx={{ mr: 1 }} />
                        <ListItemText primary="Logout" />
                    </ListItem>
                </List>
            </Drawer>
            <div className="dashboard-content">
                <Box sx={{ p: 3 }}>
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBackIcon />}
                        sx={{ mb: 2 }}
                        onClick={() => navigate('/batches')}
                    >
                        Quay lại danh sách đợt học viên
                    </Button>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
                            <CircularProgress />
                        </Box>
                    ) : error ? (
                        <Box sx={{ p: 3 }}>
                            <Alert severity="error">{error}</Alert>
                        </Box>
                    ) : (
                        <>
                            <Paper sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: '#f8f9ff' }}>
                                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2', mb: 1 }}>
                                    {batchInfo?.batchName || 'Chi tiết đợt học viên'}
                                </Typography>
                                <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
                                    Quyết định: {batchInfo?.decision}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    Ngày tải lên: {formatDate(batchInfo?.uploadDate)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    Tổng số học viên: <strong>{students.length}</strong>
                                </Typography>
                            </Paper>

                            <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
                                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                                    Tìm kiếm học viên trong đợt này
                                </Typography>
                                <Grid container spacing={2} sx={{ mb: 2 }}>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <TextField
                                            fullWidth
                                            variant="outlined"
                                            label="Mã học viên"
                                            placeholder="Nhập mã học viên..."
                                            value={searchFilters.studentId}
                                            onChange={(e) => handleFilterChange('studentId', e.target.value)}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <GroupIcon color="action" />
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <TextField
                                            fullWidth
                                            variant="outlined"
                                            label="Họ và tên"
                                            placeholder="Nhập họ và tên..."
                                            value={searchFilters.fullName}
                                            onChange={(e) => handleFilterChange('fullName', e.target.value)}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <AccountCircleIcon color="action" />
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <TextField
                                            fullWidth
                                            variant="outlined"
                                            label="Ngày sinh"
                                            type="date"
                                            InputLabelProps={{ shrink: true }}
                                            value={searchFilters.birthDate}
                                            onChange={(e) => handleFilterChange('birthDate', e.target.value)}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <TextField
                                            fullWidth
                                            variant="outlined"
                                            label="Ngành học"
                                            placeholder="Nhập ngành học..."
                                            value={searchFilters.major}
                                            onChange={(e) => handleFilterChange('major', e.target.value)}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <InfoIcon color="action" />
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />
                                    </Grid>
                                </Grid>
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <Button
                                        variant="contained"
                                        startIcon={<SearchIcon />}
                                        onClick={handleFilterStudents}
                                        sx={{ borderRadius: 2 }}
                                    >
                                        Tìm kiếm
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<ClearIcon />}
                                        onClick={handleClearFilters}
                                        sx={{ borderRadius: 2 }}
                                    >
                                        Xóa bộ lọc
                                    </Button>
                                </Box>
                            </Paper>

                            <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                                <Toolbar sx={{ bgcolor: '#f8f9fa', px: 3 }}>
                                    <Typography variant="h6" sx={{ flex: 1, fontWeight: 600 }}>
                                        Danh sách học viên
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {filteredStudents.length} kết quả
                                    </Typography>
                                </Toolbar>
                                {filteredStudents.length === 0 ? (
                                    <Box sx={{ p: 6, textAlign: 'center' }}>
                                        <SearchIcon sx={{ fontSize: 80, color: '#bdbdbd', mb: 2 }} />
                                        <Typography variant="h6" color="text.secondary" gutterBottom>
                                            Không tìm thấy học viên nào
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {Object.values(searchFilters).some(value => value.trim() !== '') ?
                                                'Vui lòng điều chỉnh bộ lọc để tìm kiếm.' :
                                                'Đợt này chưa có học viên nào.'
                                            }
                                        </Typography>
                                    </Box>
                                ) : (
                                    <>
                                        <TableContainer sx={{
                                            maxHeight: '70vh',
                                            minHeight: 300,
                                            borderRadius: 3,
                                            boxShadow: 'none',
                                            bgcolor: '#fff'
                                        }}>
                                            <Table stickyHeader>
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell sx={{
                                                            fontWeight: 'bold',
                                                            bgcolor: '#f8f9fa',
                                                            borderBottom: '2px solid #dee2e6',
                                                            fontSize: '0.95rem'
                                                        }}>
                                                            STT
                                                        </TableCell>
                                                        <TableCell sx={{
                                                            fontWeight: 'bold',
                                                            bgcolor: '#f8f9fa',
                                                            borderBottom: '2px solid #dee2e6',
                                                            fontSize: '0.95rem'
                                                        }}>
                                                            Mã học viên
                                                        </TableCell>
                                                        <TableCell sx={{
                                                            fontWeight: 'bold',
                                                            bgcolor: '#f8f9fa',
                                                            borderBottom: '2px solid #dee2e6',
                                                            fontSize: '0.95rem'
                                                        }}>
                                                            Họ và tên
                                                        </TableCell>
                                                        <TableCell sx={{
                                                            fontWeight: 'bold',
                                                            bgcolor: '#f8f9fa',
                                                            borderBottom: '2px solid #dee2e6',
                                                            fontSize: '0.95rem'
                                                        }}>
                                                            Ngày sinh
                                                        </TableCell>
                                                        <TableCell sx={{
                                                            fontWeight: 'bold',
                                                            bgcolor: '#f8f9fa',
                                                            borderBottom: '2px solid #dee2e6',
                                                            fontSize: '0.95rem'
                                                        }}>
                                                            Ngành học
                                                        </TableCell>
                                                        <TableCell sx={{
                                                            fontWeight: 'bold',
                                                            bgcolor: '#f8f9fa',
                                                            borderBottom: '2px solid #dee2e6',
                                                            fontSize: '0.95rem'
                                                        }}>
                                                            Hành động
                                                        </TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {currentStudents.map((student, index) => (
                                                        <TableRow
                                                            key={`${student.studentId}-${index}`}
                                                            sx={{
                                                                '&:nth-of-type(even)': {
                                                                    backgroundColor: '#fafafa',
                                                                },
                                                                '&:hover': {
                                                                    backgroundColor: '#e3f2fd',
                                                                    cursor: 'pointer'
                                                                },
                                                                transition: 'background-color 0.2s ease'
                                                            }}
                                                        >
                                                            <TableCell sx={{
                                                                borderBottom: '1px solid #e0e0e0',
                                                                fontWeight: 500,
                                                                color: '#666',
                                                                width: '60px'
                                                            }}>
                                                                {page * rowsPerPage + index + 1}
                                                            </TableCell>
                                                            <TableCell sx={{
                                                                borderBottom: '1px solid #e0e0e0',
                                                                fontWeight: 600,
                                                                color: '#1976d2'
                                                            }}>
                                                                {student.studentId}
                                                            </TableCell>
                                                            <TableCell sx={{
                                                                borderBottom: '1px solid #e0e0e0',
                                                                fontWeight: 500
                                                            }}>
                                                                {student.fullName}
                                                            </TableCell>
                                                            <TableCell sx={{
                                                                borderBottom: '1px solid #e0e0e0',
                                                                color: '#666'
                                                            }}>
                                                                {formatDate(student.birthDate)}
                                                            </TableCell>
                                                            <TableCell sx={{
                                                                borderBottom: '1px solid #e0e0e0'
                                                            }}>
                                                                <Chip
                                                                    label={student.major}
                                                                    size="small"
                                                                    sx={{
                                                                        bgcolor: '#e8f5e8',
                                                                        color: '#2e7d32',
                                                                        fontWeight: 500
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{
                                                                borderBottom: '1px solid #e0e0e0'
                                                            }}>
                                                                {user.role === 'Quản trị viên' && (
                                                                    <>
                                                                        <IconButton onClick={() => {
                                                                            setOriginalStudentId(student.studentId); // Lưu mã gốc
                                                                            setStudentForm({
                                                                                studentId: student.studentId,
                                                                                fullName: student.fullName,
                                                                                birthDate: student.birthDate ? new Date(student.birthDate).toISOString().split('T')[0] : '',
                                                                                major: student.major
                                                                            });
                                                                            setEditDialogOpen(true);
                                                                        }}>
                                                                            <EditIcon />
                                                                        </IconButton>
                                                                        <IconButton color="error" onClick={() => { setSelectedStudent(student); setDeleteDialogOpen(true); }}><DeleteIcon /></IconButton>
                                                                    </>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                        <Box sx={{ bgcolor: '#fafafa', borderTop: '1px solid #e0e0e0' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', p: 2 }}>
                                                <Typography variant="body2" sx={{ mr: 2 }}>
                                                    Trang {page + 1} / {Math.ceil(filteredStudents.length / rowsPerPage)}
                                                </Typography>
                                                <TextField
                                                    select
                                                    label="Số dòng/trang"
                                                    value={rowsPerPage}
                                                    onChange={handleChangeRowsPerPage}
                                                    SelectProps={{ native: true }}
                                                    size="small"
                                                    sx={{ width: 120, mr: 2 }}
                                                >
                                                    {[10, 25, 50, 100, 200, 500].map((option) => (
                                                        <option key={option} value={option}>
                                                            {option}
                                                        </option>
                                                    ))}
                                                </TextField>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    disabled={page === 0}
                                                    onClick={() => handleChangePage(null, page - 1)}
                                                    sx={{ mr: 1 }}
                                                >
                                                    Trước
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    disabled={page >= Math.ceil(filteredStudents.length / rowsPerPage) - 1}
                                                    onClick={() => handleChangePage(null, page + 1)}
                                                >
                                                    Sau
                                                </Button>
                                            </Box>
                                        </Box>
                                    </>
                                )}
                            </Paper>
                            {message.text && (
                                <Alert
                                    severity={message.type}
                                    sx={{ mb: 2 }}
                                    onClose={() => setMessage({ type: '', text: '' })}
                                >
                                    {message.text}
                                </Alert>
                            )}
                            {user.role === 'Quản trị viên' && (
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    sx={{ mb: 2 }}
                                    onClick={() => { setStudentForm({ studentId: '', fullName: '', birthDate: '', major: '' }); setAddDialogOpen(true); }}
                                >
                                    Thêm học viên
                                </Button>
                            )}
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<DownloadIcon />}
                                sx={{ mb: 2, ml: 2 }}
                                onClick={() => window.open(`http://localhost:5000/batch/${batchId}/export`, '_blank')}
                            >
                                Xuất Excel danh sách học viên
                            </Button>
                        </>
                    )}

                    {/* Dialog thêm học viên */}
                    <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
                        <DialogTitle>Thêm học viên mới</DialogTitle>
                        <DialogContent>
                            <TextField label="Mã học viên" value={studentForm.studentId} onChange={e => setStudentForm({ ...studentForm, studentId: e.target.value })} fullWidth sx={{ mb: 2 }} />
                            <TextField label="Họ và tên" value={studentForm.fullName} onChange={e => setStudentForm({ ...studentForm, fullName: e.target.value })} fullWidth sx={{ mb: 2 }} />
                            <TextField label="Ngày sinh" type="date" value={studentForm.birthDate} onChange={e => setStudentForm({ ...studentForm, birthDate: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} sx={{ mb: 2 }} />
                            <TextField label="Ngành học" value={studentForm.major} onChange={e => setStudentForm({ ...studentForm, major: e.target.value })} fullWidth sx={{ mb: 2 }} />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setAddDialogOpen(false)}>Hủy</Button>
                            <Button onClick={handleAddStudent} variant="contained">Thêm</Button>
                        </DialogActions>
                    </Dialog>

                    {/* Dialog sửa học viên */}
                    <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
                        <DialogTitle>Sửa thông tin học viên</DialogTitle>
                        <DialogContent>
                            <Box sx={{ pt: 2 }}>
                                <TextField
                                    label="Mã học viên"
                                    value={studentForm.studentId}
                                    onChange={e => setStudentForm({ ...studentForm, studentId: e.target.value })}
                                    fullWidth
                                    sx={{ mb: 2 }}
                                    helperText="Lưu ý: Thay đổi mã học viên sẽ cập nhật username đăng nhập"
                                />
                                <TextField
                                    label="Họ và tên"
                                    value={studentForm.fullName}
                                    onChange={e => setStudentForm({ ...studentForm, fullName: e.target.value })}
                                    fullWidth
                                    sx={{ mb: 2 }}
                                />
                                <TextField
                                    label="Ngày sinh"
                                    type="date"
                                    value={studentForm.birthDate}
                                    onChange={e => setStudentForm({ ...studentForm, birthDate: e.target.value })}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    sx={{ mb: 2 }}
                                />
                                <TextField
                                    label="Ngành học"
                                    value={studentForm.major}
                                    onChange={e => setStudentForm({ ...studentForm, major: e.target.value })}
                                    fullWidth
                                    sx={{ mb: 2 }}
                                />
                            </Box>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setEditDialogOpen(false)}>Hủy</Button>
                            <Button onClick={handleEditStudent} variant="contained">Lưu</Button>
                        </DialogActions>
                    </Dialog>

                    {/* Dialog xóa học viên */}
                    <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                        <DialogTitle>Xóa học viên</DialogTitle>
                        <DialogContent>
                            <Typography>Bạn muốn xóa học viên <strong>{selectedStudent?.fullName}</strong>?</Typography>
                            <Box sx={{ mt: 2 }}>
                                <Button variant={deleteOption === 'batchOnly' ? 'contained' : 'outlined'} onClick={() => setDeleteOption('batchOnly')} sx={{ mr: 2 }}>
                                    Chỉ xóa khỏi danh sách đợt
                                </Button>
                                <Button variant={deleteOption === 'deleteAll' ? 'contained' : 'outlined'} onClick={() => setDeleteOption('deleteAll')}>
                                    Xóa khỏi danh sách đợt và xóa tài khoản khỏi hệ thống
                                </Button>
                            </Box>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDeleteDialogOpen(false)}>Hủy</Button>
                            <Button onClick={handleDeleteStudent} color="error" variant="contained">Xóa</Button>
                        </DialogActions>
                    </Dialog>
                </Box>
            </div>
        </div>
    );
}

export default BatchDetail;