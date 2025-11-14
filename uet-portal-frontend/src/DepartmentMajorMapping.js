import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Alert, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip,
  FormControl, InputLabel, Select, MenuItem, OutlinedInput
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AppLayout from './AppLayout';

function DepartmentMajorMapping() {
  const [mappings, setMappings] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [majors, setMajors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState(null);
  const [formData, setFormData] = useState({
    department: '',
    faculty: '',
    majors: []
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};

  useEffect(() => {
    if (user.role !== 'Quản trị viên') {
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Lấy danh sách ánh xạ hiện có
      const mappingsRes = await fetch('http://localhost:5000/admin/department-major-mappings', {
        credentials: 'include'
      });
      const mappingsData = await mappingsRes.json();
      setMappings(Array.isArray(mappingsData) ? mappingsData : []);

      // Lấy danh sách bộ môn và ngành có sẵn
      const availableRes = await fetch('http://localhost:5000/admin/available-departments-majors', {
        credentials: 'include'
      });
      const availableData = await availableRes.json();
      setDepartments(availableData.departments || []);
      setMajors(availableData.majors || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: 'Không thể tải dữ liệu' });
    }
    setLoading(false);
  };

  const handleOpenDialog = (mapping = null) => {
    if (mapping) {
      setSelectedMapping(mapping);
      setFormData({
        department: mapping.department,
        faculty: mapping.faculty,
        majors: mapping.majors || []
      });
    } else {
      setSelectedMapping(null);
      setFormData({ department: '', faculty: '', majors: [] });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.department || !formData.faculty || formData.majors.length === 0) {
      setMessage({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin' });
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/admin/department-major-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        setDialogOpen(false);
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi khi lưu ánh xạ' });
    }
  };

  const handleDelete = async () => {
    if (!selectedMapping) return;

    try {
      const response = await fetch(
        `http://localhost:5000/admin/department-major-mapping/${selectedMapping._id}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );

      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        setDeleteDialogOpen(false);
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Lỗi khi xóa ánh xạ' });
    }
  };

  return (
    <AppLayout>
      <div className="dashboard">
        <div className="dashboard-content">
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
              Quản lý ánh xạ Bộ môn/Phòng thí nghiệm - Ngành
            </Typography>

            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>Hướng dẫn:</strong> Mỗi bộ môn/phòng thí nghiệm sẽ phụ trách một hoặc nhiều ngành. 
              Khi giảng viên thuộc bộ môn đó phê duyệt đề tài của học viên, đề tài sẽ được chuyển đến 
              Lãnh đạo bộ môn quản lý bộ môn đó để duyệt tiếp.
            </Alert>

            {message.text && (
              <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
                {message.text}
              </Alert>
            )}

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{ mb: 2 }}
            >
              Thêm ánh xạ mới
            </Button>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>STT</strong></TableCell>
                    <TableCell><strong>Bộ môn/Phòng thí nghiệm</strong></TableCell>
                    <TableCell><strong>Khoa</strong></TableCell>
                    <TableCell><strong>Các ngành phụ trách</strong></TableCell>
                    <TableCell align="center"><strong>Hành động</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">Đang tải...</TableCell>
                    </TableRow>
                  ) : mappings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        Chưa có ánh xạ nào. Hãy thêm ánh xạ mới.
                      </TableCell>
                    </TableRow>
                  ) : (
                    mappings.map((mapping, index) => (
                      <TableRow key={mapping._id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{mapping.department}</TableCell>
                        <TableCell>{mapping.faculty}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {mapping.majors.map((major, idx) => (
                              <Chip key={idx} label={major} size="small" color="primary" />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenDialog(mapping)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSelectedMapping(mapping);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Dialog thêm/sửa ánh xạ */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
              <DialogTitle>
                {selectedMapping ? 'Chỉnh sửa ánh xạ' : 'Thêm ánh xạ mới'}
              </DialogTitle>
              <DialogContent>
                <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
                  <InputLabel>Bộ môn/Phòng thí nghiệm *</InputLabel>
                  <Select
                    value={formData.department}
                    label="Bộ môn/Phòng thí nghiệm *"
                    onChange={(e) => {
                      const dept = departments.find(d => d.department === e.target.value);
                      setFormData({ 
                        ...formData, 
                        department: e.target.value,
                        faculty: dept?.faculty || formData.faculty
                      });
                    }}
                  >
                    {departments.map((dept) => (
                      <MenuItem key={dept.department} value={dept.department}>
                        {dept.department} ({dept.faculty})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Khoa"
                  value={formData.faculty}
                  onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                  sx={{ mb: 2 }}
                  disabled
                />

                <FormControl fullWidth>
                  <InputLabel>Các ngành phụ trách *</InputLabel>
                  <Select
                    multiple
                    value={formData.majors}
                    onChange={(e) => setFormData({ ...formData, majors: e.target.value })}
                    input={<OutlinedInput label="Các ngành phụ trách *" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {majors
                      .filter(m => !formData.faculty || m.faculty === formData.faculty)
                      .map((major) => (
                        <MenuItem key={major.major} value={major.major}>
                          {major.major}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>

                <Alert severity="warning" sx={{ mt: 2 }}>
                  Lưu ý: Chỉ chọn các ngành thuộc cùng Khoa với bộ môn/phòng thí nghiệm
                </Alert>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDialogOpen(false)}>Hủy</Button>
                <Button onClick={handleSave} variant="contained">
                  {selectedMapping ? 'Cập nhật' : 'Thêm'}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Dialog xác nhận xóa */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
              <DialogTitle>Xác nhận xóa</DialogTitle>
              <DialogContent>
                <Typography>
                  Bạn có chắc chắn muốn xóa ánh xạ cho bộ môn <strong>{selectedMapping?.department}</strong>?
                </Typography>
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Sau khi xóa, đề tài của các ngành thuộc bộ môn này sẽ không thể được chuyển đến 
                  Lãnh đạo bộ môn để duyệt.
                </Alert>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDeleteDialogOpen(false)}>Hủy</Button>
                <Button onClick={handleDelete} color="error" variant="contained">
                  Xóa
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        </div>
      </div>
    </AppLayout>
  );
}

export default DepartmentMajorMapping;