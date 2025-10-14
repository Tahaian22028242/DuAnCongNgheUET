import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Drawer, List, ListItem, ListItemText, CircularProgress, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Alert,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
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
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

function FacultyMembers() {
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(0);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [searchName, setSearchName] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [allFaculties, setAllFaculties] = useState([]);

  const drawerWidth = 240;
  const buttonWidth = 40;
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};
  
  // DEBUG: Kiểm tra role
  useEffect(() => {
    console.log('Current user role:', user.role);
    console.log('Is admin?', user.role === 'Quản trị viên');
  }, []);

  useEffect(() => {
    fetchMembers();
    fetchAllFaculties();
  }, [facultyName]);

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

      // Sử dụng chung API lecturer cho cả giảng viên và CNBM
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

  const handleLogout = () => {
    localStorage.removeItem('user');
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    navigate('/');
  };

  const uniqueDepartments = Array.from(new Set(members.map(m => m.department).filter(Boolean)));
  const uniquePositions = Array.from(new Set(members.map(m => m.position).filter(Boolean)));
  const uniqueRoles = Array.from(new Set(members.map(m => m.role).filter(Boolean)));

  const filteredMembers = members.filter(m => {
    let ok = true;
    if (searchName && !m.fullName?.toLowerCase().includes(searchName.toLowerCase())) ok = false;
    if (searchEmail && !m.email?.toLowerCase().includes(searchEmail.toLowerCase())) ok = false;
    if (departmentFilter && m.department !== departmentFilter) ok = false;
    if (positionFilter && m.position !== positionFilter) ok = false;
    if (roleFilter && m.role !== roleFilter) ok = false;
    return ok;
  });

  const pagedMembers = filteredMembers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <div className="dashboard">
      <Box
        sx={{
          position: 'fixed',
          left: 0,
          bottom: 24,
          width: drawerWidth,
          pointerEvents: 'none',
          zIndex: 2000,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', pointerEvents: 'auto' }}>
          <IconButton
            onClick={() => setDrawerOpen(!drawerOpen)}
            size="small"
            sx={{
              width: buttonWidth,
              height: 36,
              bgcolor: 'white',
              border: '1px solid #e0e0e0',
              boxShadow: 1,
              transition: 'left 0.2s',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {drawerOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </Box>
      </Box>

      <Drawer
        variant="persistent"
        anchor="left"
        open={drawerOpen}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            transition: 'width 0.2s',
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
          <img
            src={logo}
            alt="Logo"
            style={{ width: '80px', height: '80px', objectFit: 'contain', cursor: 'pointer' }}
            onClick={() => navigate('/dashboard')}
          />
        </Box>
        <List sx={{ flexGrow: 1 }}>
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
              <ListItem button onClick={() => navigate('/faculties-info')}>
                <InfoIcon sx={{ mr: 1 }} />
                <ListItemText primary="Thông tin" />
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
              <ListItem button onClick={() => navigate('/notifications')}>
                <InfoIcon sx={{ mr: 1 }} />
                <ListItemText primary="Thông báo" />
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
            <>
              <ListItem button onClick={() => navigate('/head/topics')}>
                <AssignmentIcon sx={{ mr: 1 }} />
                <ListItemText primary="Đề tài chờ phê duyệt" />
              </ListItem>
              <ListItem button onClick={() => navigate('/head/statistics')}>
                <GroupIcon sx={{ mr: 1 }} />
                <ListItemText primary="Thống kê học viên" />
              </ListItem>
            </>
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
          <Box sx={{ position: 'sticky', top: 0, paddingBottom: 0, backgroundColor: 'white', zIndex: 20, boxShadow: 2, pb: 2, mb: 2 }}>
            <Typography variant="h4" gutterBottom>
              Danh sách giảng viên & CNBM - Ngành: {facultyName}
            </Typography>
            
            {/* DEBUG INFO */}
            <Alert severity="info" sx={{ mb: 2 }}>
              Vai trò hiện tại: <strong>{user.role || 'Không xác định'}</strong>
              {user.role === 'Quản trị viên' ? ' ✓ Có quyền chỉnh sửa' : ' ✗ Không có quyền chỉnh sửa'}
            </Alert>

            {user.role === 'Quản trị viên' && (
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                sx={{ mb: 2 }}
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
          </Box>

          {message.text && <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>{message.text}</Alert>}

          {loading ? <CircularProgress /> : (
            <>
              <Box sx={{ height: 500, overflowY: 'auto', backgroundColor: 'white', borderRadius: 2, boxShadow: 1, mb: 2, pt: 2 }}>
                <Box sx={{ position: 'sticky', mb: 2, display: 'flex', alignItems: 'center', px: 2 }}>
                  <Typography sx={{ mr: 2 }}>Số bản ghi/trang:</Typography>
                  <select
                    value={rowsPerPage}
                    onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
                    style={{ padding: '4px 8px' }}
                  >
                    <option value={10}>10</option>
                    <option value={100}>100</option>
                    <option value={500}>500</option>
                  </select>
                </Box>

                <TableContainer component={Paper} sx={{ maxHeight: 440, boxShadow: 0, minWidth: 900 }}>
                  <Table stickyHeader sx={{ width: 1200 }}>
                    <TableHead>
                      <TableRow sx={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 22 }}>
                        <TableCell></TableCell>
                        <TableCell>
                          <input
                            type="text"
                            placeholder="Tìm kiếm họ và tên"
                            value={searchName}
                            onChange={e => setSearchName(e.target.value)}
                            style={{ width: '100%', padding: '4px 8px' }}
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            type="text"
                            placeholder="Tìm kiếm email"
                            value={searchEmail}
                            onChange={e => setSearchEmail(e.target.value)}
                            style={{ width: '100%', padding: '4px 8px' }}
                          />
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        {user.role === 'Quản trị viên' && <TableCell></TableCell>}
                      </TableRow>
                      <TableRow sx={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 22 }}>
                        <TableCell>STT</TableCell>
                        <TableCell>Họ và tên</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>
                          <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)} style={{ width: '100%' }}>
                            <option value=''>Bộ môn/ Phòng thí nghiệm</option>
                            {uniqueDepartments.map(dep => (
                              <option key={dep} value={dep}>{dep}</option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <select value={positionFilter} onChange={e => setPositionFilter(e.target.value)} style={{ width: '100%' }}>
                            <option value=''>Chức vụ</option>
                            {uniquePositions.map(dep => (
                              <option key={dep} value={dep}>{dep}</option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ width: '100%' }}>
                            <option value=''>Vai trò</option>
                            {uniqueRoles.map(dep => (
                              <option key={dep} value={dep}>{dep}</option>
                            ))}
                          </select>
                        </TableCell>
                        {user.role === 'Quản trị viên' && <TableCell>Hành động</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pagedMembers.map((row, idx) => (
                        <TableRow key={row._id || idx}>
                          <TableCell>{row.stt}</TableCell>
                          <TableCell>{row.fullName}</TableCell>
                          <TableCell>{row.email}</TableCell>
                          <TableCell>{row.department}</TableCell>
                          <TableCell>{row.position}</TableCell>
                          <TableCell>{row.role}</TableCell>
                          {user.role === 'Quản trị viên' && (
                            <TableCell>
                              <IconButton
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
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                color="error"
                                onClick={() => {
                                  setSelectedMember(row);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                      {filteredMembers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={user.role === 'Quản trị viên' ? 7 : 6}>
                            <Typography color="text.secondary">Chưa có dữ liệu.</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Button
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                  sx={{ mr: 2 }}
                >
                  Trang trước
                </Button>
                <Typography>
                  Trang {page + 1} / {Math.ceil(filteredMembers.length / rowsPerPage) || 1}
                </Typography>
                <Button
                  disabled={(page + 1) * rowsPerPage >= filteredMembers.length}
                  onClick={() => setPage(page + 1)}
                  sx={{ ml: 2 }}
                >
                  Trang sau
                </Button>
              </Box>
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

          <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate('/faculties-info')}>
            Quay lại danh sách Khoa/Ngành
          </Button>
        </Box>
      </div>
    </div>
  );
}

export default FacultyMembers;