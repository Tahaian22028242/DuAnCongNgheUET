import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert,
  FormControl, InputLabel, Select, MenuItem, Grid, InputAdornment, Toolbar, Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import WorkIcon from '@mui/icons-material/Work';
import InfoIcon from '@mui/icons-material/Info';
import AppLayout from './AppLayout';

function FacultyLecturers() {
  const { facultyName } = useParams();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberForm, setMemberForm] = useState({
    email: '',
    fullName: '',
    department: '',
    position: '',
    role: 'Giảng viên',
    managedMajor: ''
  });
  const [selectedMember, setSelectedMember] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [page, setPage] = useState(0);
  const [searchFilters, setSearchFilters] = useState({
    fullName: '',
    email: '',
    department: '',
    position: '',
    role: ''
  });
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [allFaculties, setAllFaculties] = useState([]);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};

  // Tạo danh sách unique cho dropdowns
  const uniqueDepartments = Array.from(
    new Set(
      members
        .map(m => m.department)
        .filter(Boolean)
    )
  );
  const uniquePositions = Array.from(
    new Set(
      members
        .filter(m => !searchFilters.department || m.department === searchFilters.department)
        .map(m => m.position)
        .filter(Boolean)
    )
  );
  const uniqueRoles = Array.from(new Set(members.map(m => m.role).filter(Boolean)));

  useEffect(() => {
    fetchMembers();
    fetchAllFaculties();
  }, [facultyName]);

  useEffect(() => {
    handleFilterMembers();
    setPage(0); // Reset về trang đầu khi lọc
  }, [members, searchFilters]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/faculty/${encodeURIComponent(facultyName)}/members`, {
        credentials: 'include'
      });
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch (e) {
      setMembers([]);
    }
    setLoading(false);
  };

  const fetchAllFaculties = async () => {
    try {
      const res = await fetch('http://localhost:5000/faculties', { credentials: 'include' });
      const data = await res.json();
      setAllFaculties(Array.isArray(data) ? data : []);
    } catch (e) {
      setAllFaculties([]);
    }
  };

  const handleFilterChange = (field, value) => {
    setSearchFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFilterMembers = () => {
    let result = members;
    if (searchFilters.fullName?.trim()) {
      result = result.filter(m => m.fullName?.toLowerCase().includes(searchFilters.fullName.trim().toLowerCase()));
    }
    if (searchFilters.email?.trim()) {
      result = result.filter(m => m.email?.toLowerCase().includes(searchFilters.email.trim().toLowerCase()));
    }
    if (searchFilters.department?.trim()) {
      result = result.filter(m => m.department === searchFilters.department);
    }
    if (searchFilters.position?.trim()) {
      result = result.filter(m => m.position === searchFilters.position);
    }
    if (searchFilters.role?.trim()) {
      result = result.filter(m => m.role === searchFilters.role);
    }
    setFilteredMembers(result);
  };

  const handleClearFilters = () => {
    setSearchFilters({
      fullName: '',
      email: '',
      department: '',
      position: '',
      role: ''
    });
  };

  const handleAddMember = async () => {
    try {
      let url = '';
      if (memberForm.role === 'Giảng viên') {
        url = `http://localhost:5000/admin/faculty/${encodeURIComponent(facultyName)}/add-lecturer`;
      } else {
        url = `http://localhost:5000/admin/faculty/${encodeURIComponent(facultyName)}/add-head`;
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(memberForm)
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setAddDialogOpen(false);
        fetchMembers();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Lỗi khi thêm thành viên.' });
    }
  };

  const handleEditMember = async () => {
    try {
      const memberId = selectedMember?._id;
      if (!memberId) {
        setMessage({ type: 'error', text: 'Không tìm thấy ID của thành viên' });
        return;
      }

      const url = `http://localhost:5000/admin/lecturer/${memberId}`;

      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(memberForm)
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setEditDialogOpen(false);
        fetchMembers();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Lỗi khi sửa thành viên.' });
    }
  };

  const handleDeleteMember = async () => {
    try {
      const memberId = selectedMember?._id;
      if (!memberId) {
        setMessage({ type: 'error', text: 'Không tìm thấy ID của thành viên' });
        return;
      }

      let url = '';
      if (selectedMember.role === 'Giảng viên') {
        url = `http://localhost:5000/admin/lecturer/${memberId}`;
      } else {
        url = `http://localhost:5000/admin/head/${memberId}`;
      }

      const res = await fetch(url, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setDeleteDialogOpen(false);
        fetchMembers();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Lỗi khi xóa thành viên.' });
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const currentMembers = filteredMembers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <div className="dashboard">
      <AppLayout>
        <div className="dashboard-content">
          <Box sx={{ p: 3 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              sx={{ mb: 2 }}
              onClick={() => navigate('/faculties-info')}
            >
              Quay lại danh sách Khoa/Ngành
            </Button>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* Header Section */}
                <Paper sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: '#f8f9ff' }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2', mb: 1 }}>
                    Danh sách giảng viên & CNBM
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
                    Khoa: {facultyName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Tổng số thành viên: <strong>{members.length}</strong>
                  </Typography>
                  {user.role === 'Quản trị viên' && (
                    <Button
                      startIcon={<AddIcon />}
                      variant="contained"
                      sx={{ mt: 2 }}
                      onClick={() => {
                        setMemberForm({
                          email: '',
                          fullName: '',
                          department: '',
                          position: '',
                          role: 'Giảng viên',
                          managedMajor: ''
                        });
                        setAddDialogOpen(true);
                      }}
                    >
                      Thêm thành viên
                    </Button>
                  )}
                </Paper>

                {/* Search/Filter Section */}
                <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Tìm kiếm giảng viên
                  </Typography>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
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
                              <PersonIcon color="action" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        variant="outlined"
                        label="Email"
                        placeholder="Nhập email..."
                        value={searchFilters.email}
                        onChange={(e) => handleFilterChange('email', e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <EmailIcon color="action" />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        select
                        sx={{ width: 200 }}
                        variant="outlined"
                        label="Bộ môn/Phòng thí nghiệm"
                        value={searchFilters.department}
                        onChange={e => handleFilterChange('department', e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <BusinessIcon color="action" />
                            </InputAdornment>
                          ),
                        }}
                      >
                        <MenuItem value="">Tất cả</MenuItem>
                        {uniqueDepartments.map(dep => (
                          <MenuItem key={dep} value={dep}>{dep}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        select
                        fullWidth
                        variant="outlined"
                        label="Chức vụ"
                        value={searchFilters.position}
                        onChange={e => handleFilterChange('position', e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <WorkIcon color="action" />
                            </InputAdornment>
                          ),
                        }}
                      >
                        <MenuItem value="">Tất cả</MenuItem>
                        {uniquePositions.map(pos => (
                          <MenuItem key={pos} value={pos}>{pos}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        select
                        fullWidth
                        variant="outlined"
                        label="Vai trò"
                        value={searchFilters.role}
                        onChange={e => handleFilterChange('role', e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <InfoIcon color="action" />
                            </InputAdornment>
                          ),
                        }}
                      >
                        <MenuItem value="">Tất cả</MenuItem>
                        {uniqueRoles.map(role => (
                          <MenuItem key={role} value={role}>{role}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  </Grid>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      startIcon={<SearchIcon />}
                      onClick={handleFilterMembers}
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

                {/* Table Section */}
                <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                  <Toolbar sx={{ bgcolor: '#f8f9fa', px: 3 }}>
                    <Typography variant="h6" sx={{ flex: 1, fontWeight: 600 }}>
                      Danh sách thành viên
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {filteredMembers.length} kết quả
                    </Typography>
                  </Toolbar>
                  {filteredMembers.length === 0 ? (
                    <Box sx={{ p: 6, textAlign: 'center' }}>
                      <SearchIcon sx={{ fontSize: 80, color: '#bdbdbd', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        Không tìm thấy thành viên nào
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {Object.values(searchFilters).some(value => value.trim() !== '') ?
                          'Vui lòng điều chỉnh bộ lọc để tìm kiếm.' :
                          'Ngành này chưa có thành viên nào.'
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
                                Họ và tên
                              </TableCell>
                              <TableCell sx={{
                                fontWeight: 'bold',
                                bgcolor: '#f8f9fa',
                                borderBottom: '2px solid #dee2e6',
                                fontSize: '0.95rem'
                              }}>
                                Email
                              </TableCell>
                              <TableCell sx={{
                                fontWeight: 'bold',
                                bgcolor: '#f8f9fa',
                                borderBottom: '2px solid #dee2e6',
                                fontSize: '0.95rem'
                              }}>
                                Bộ môn/Phòng thí nghiệm
                              </TableCell>
                              <TableCell sx={{
                                fontWeight: 'bold',
                                bgcolor: '#f8f9fa',
                                borderBottom: '2px solid #dee2e6',
                                fontSize: '0.95rem'
                              }}>
                                Chức vụ
                              </TableCell>
                              <TableCell sx={{
                                fontWeight: 'bold',
                                bgcolor: '#f8f9fa',
                                borderBottom: '2px solid #dee2e6',
                                fontSize: '0.95rem'
                              }}>
                                Vai trò
                              </TableCell>
                              {user.role === 'Quản trị viên' && (
                                <TableCell sx={{
                                  fontWeight: 'bold',
                                  bgcolor: '#f8f9fa',
                                  borderBottom: '2px solid #dee2e6',
                                  fontSize: '0.95rem'
                                }}>
                                  Hành động
                                </TableCell>
                              )}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {currentMembers.map((row, index) => (
                              <TableRow
                                key={row._id || index}
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
                                  {row.fullName}
                                </TableCell>
                                <TableCell sx={{
                                  borderBottom: '1px solid #e0e0e0',
                                  fontWeight: 500
                                }}>
                                  {row.email}
                                </TableCell>
                                <TableCell sx={{
                                  borderBottom: '1px solid #e0e0e0'
                                }}>
                                  <Chip
                                    label={row.department || 'N/A'}
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
                                  {row.position || 'N/A'}
                                </TableCell>
                                <TableCell sx={{
                                  borderBottom: '1px solid #e0e0e0'
                                }}>
                                  <Chip
                                    label={row.role}
                                    size="small"
                                    sx={{
                                      bgcolor: row.role === 'Chủ nhiệm bộ môn' ? '#fff3e0' : '#e3f2fd',
                                      color: row.role === 'Chủ nhiệm bộ môn' ? '#e65100' : '#1976d2',
                                      fontWeight: 500
                                    }}
                                  />
                                </TableCell>
                                {user.role === 'Quản trị viên' && (
                                  <TableCell sx={{
                                    borderBottom: '1px solid #e0e0e0'
                                  }}>
                                    <EditIcon
                                      sx={{ cursor: 'pointer', mr: 1, color: '#1976d2' }}
                                      onClick={() => {
                                        setSelectedMember(row);
                                        setMemberForm({
                                          email: row.email || '',
                                          fullName: row.fullName || '',
                                          department: row.department || '',
                                          position: row.position || '',
                                          role: row.role || 'Giảng viên',
                                          managedMajor: row.role === 'Chủ nhiệm bộ môn' ? (row.department || facultyName) : ''
                                        });
                                        setEditDialogOpen(true);
                                      }}
                                    />
                                    <DeleteIcon
                                      sx={{ cursor: 'pointer', color: 'error.main' }}
                                      onClick={() => {
                                        setSelectedMember(row);
                                        setDeleteDialogOpen(true);
                                      }}
                                    />
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <Box sx={{ bgcolor: '#fafafa', borderTop: '1px solid #e0e0e0' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', p: 2 }}>
                          <Typography variant="body2" sx={{ mr: 2 }}>
                            Trang {page + 1} / {Math.ceil(filteredMembers.length / rowsPerPage)}
                          </Typography>
                          <TextField
                            select
                            fullWidth
                            label="Số dòng/trang"
                            value={rowsPerPage}
                            onChange={handleChangeRowsPerPage}
                            SelectProps={{ native: true }}
                            size="small"
                            sx={{ minWidth: 80, width: 'auto', mr: 2 }}
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
                            disabled={page >= Math.ceil(filteredMembers.length / rowsPerPage) - 1}
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
                    sx={{ mt: 2 }}
                    onClose={() => setMessage({ type: '', text: '' })}
                  >
                    {message.text}
                  </Alert>
                )}
              </>
            )}

            {/* Dialog thêm thành viên */}
            <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
              <DialogTitle>Thêm thành viên mới</DialogTitle>
              <DialogContent>
                <TextField
                  label="Email"
                  value={memberForm.email}
                  onChange={e => setMemberForm({ ...memberForm, email: e.target.value })}
                  fullWidth
                  sx={{ mb: 2, mt: 1 }}
                  required
                />
                <TextField
                  label="Họ và tên"
                  value={memberForm.fullName}
                  onChange={e => setMemberForm({ ...memberForm, fullName: e.target.value })}
                  fullWidth
                  sx={{ mb: 2 }}
                  required
                />
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Vai trò</InputLabel>
                  <Select
                    value={memberForm.role}
                    label="Vai trò"
                    onChange={e => setMemberForm({ ...memberForm, role: e.target.value })}
                  >
                    <MenuItem value="Giảng viên">Giảng viên</MenuItem>
                    <MenuItem value="Chủ nhiệm bộ môn">Chủ nhiệm bộ môn</MenuItem>
                  </Select>
                </FormControl>

                {memberForm.role === 'Chủ nhiệm bộ môn' && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    CNBM sẽ quản lý ngành: <strong>{facultyName}</strong>
                  </Alert>
                )}

                <TextField
                  label="Bộ môn/Phòng thí nghiệm"
                  value={memberForm.department}
                  onChange={e => setMemberForm({ ...memberForm, department: e.target.value })}
                  fullWidth
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Chức vụ"
                  value={memberForm.position}
                  onChange={e => setMemberForm({ ...memberForm, position: e.target.value })}
                  fullWidth
                  sx={{ mb: 2 }}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setAddDialogOpen(false)}>Hủy</Button>
                <Button onClick={handleAddMember} variant="contained">Thêm</Button>
              </DialogActions>
            </Dialog>

            {/* Dialog sửa thành viên */}
            <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
              <DialogTitle>Sửa thông tin thành viên</DialogTitle>
              <DialogContent>
                <Alert severity="warning" sx={{ mb: 2, mt: 1 }}>
                  <strong>Lưu ý:</strong> Thay đổi email hoặc vai trò sẽ ảnh hưởng đến đăng nhập và phân quyền của tài khoản này.
                </Alert>

                <TextField
                  label="Email (Username đăng nhập)"
                  value={memberForm.email}
                  onChange={e => setMemberForm({ ...memberForm, email: e.target.value })}
                  fullWidth
                  sx={{ mb: 2 }}
                  required
                  helperText="Email dùng để đăng nhập vào hệ thống"
                />
                <TextField
                  label="Họ và tên"
                  value={memberForm.fullName}
                  onChange={e => setMemberForm({ ...memberForm, fullName: e.target.value })}
                  fullWidth
                  sx={{ mb: 2 }}
                  required
                />

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Vai trò</InputLabel>
                  <Select
                    value={memberForm.role}
                    label="Vai trò"
                    onChange={e => setMemberForm({ ...memberForm, role: e.target.value })}
                  >
                    <MenuItem value="Giảng viên">Giảng viên</MenuItem>
                    <MenuItem value="Chủ nhiệm bộ môn">Chủ nhiệm bộ môn</MenuItem>
                  </Select>
                </FormControl>

                {memberForm.role === 'Chủ nhiệm bộ môn' && (
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Ngành quản lý</InputLabel>
                    <Select
                      value={memberForm.managedMajor}
                      label="Ngành quản lý"
                      onChange={e => setMemberForm({ ...memberForm, managedMajor: e.target.value })}
                    >
                      {allFaculties.map(f => (
                        <MenuItem key={f} value={f}>{f}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {selectedMember?.role === 'Chủ nhiệm bộ môn' && memberForm.role === 'Giảng viên' && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Chuyển từ CNBM sang Giảng viên: Hệ thống sẽ kiểm tra xem có đề tài đang chờ duyệt không.
                  </Alert>
                )}

                {selectedMember?.role === 'Giảng viên' && memberForm.role === 'Chủ nhiệm bộ môn' && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Chuyển từ Giảng viên sang CNBM: Phải chọn ngành quản lý.
                  </Alert>
                )}

                <TextField
                  label="Bộ môn/Phòng thí nghiệm"
                  value={memberForm.department}
                  onChange={e => setMemberForm({ ...memberForm, department: e.target.value })}
                  fullWidth
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Chức vụ"
                  value={memberForm.position}
                  onChange={e => setMemberForm({ ...memberForm, position: e.target.value })}
                  fullWidth
                  sx={{ mb: 2 }}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setEditDialogOpen(false)}>Hủy</Button>
                <Button onClick={handleEditMember} variant="contained">Lưu</Button>
              </DialogActions>
            </Dialog>

            {/* Dialog xóa thành viên */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
              <DialogTitle>Xóa thành viên</DialogTitle>
              <DialogContent>
                <Typography>
                  Bạn muốn xóa thành viên <strong>{selectedMember?.fullName}</strong>?
                </Typography>
                {selectedMember?.role === 'Chủ nhiệm bộ môn' && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Xóa CNBM sẽ không xóa các đề tài đã được duyệt trước đó.
                  </Alert>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDeleteDialogOpen(false)}>Hủy</Button>
                <Button onClick={handleDeleteMember} color="error" variant="contained">Xóa</Button>
              </DialogActions>
            </Dialog>
          </Box>
        </div>
      </AppLayout>
    </div>
  );
}

export default FacultyLecturers;