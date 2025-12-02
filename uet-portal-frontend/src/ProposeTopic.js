import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Box, Paper, TextField, Button, Alert,
  Drawer, List, ListItem, ListItemText, Autocomplete,
  Grid, CircularProgress, Chip, IconButton
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
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
import AppLayout from './AppLayout';

function ProposeTopic() {
  const [formData, setFormData] = useState({
    topicTitle: '',
    content: '',
    primarySupervisor: null,
    secondarySupervisor: null,
    attachments: []
  });
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [supervisorsLoading, setSupervisorsLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();

  const MAX_FILE_SIZE_IN_MB = 50;
  const MAX_FILE_SIZE = MAX_FILE_SIZE_IN_MB * 1024 * 1024; // 20MB

  useEffect(() => {
    fetchSupervisors();
  }, []);

  const fetchSupervisors = async () => {
    try {
      const response = await axios.get('http://localhost:5000/supervisors', {
        withCredentials: true,
      });
      setSupervisors(response.data);
      setSupervisorsLoading(false);
    } catch (err) {
      console.error('Error fetching supervisors:', err);
      setMessage({ type: 'error', text: 'Không thể tải danh sách giảng viên.' });
      setSupervisorsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        setMessage({ type: 'warning', text: `File ${file.name} quá lớn (tối đa ${MAX_FILE_SIZE_IN_MB}MB)` });
        return false;
      }
      return true;
    });

    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...validFiles]
    }));
  };

  const handleRemoveFile = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  // Hàm định dạng kích thước file
  const formatFileSize = (bytes) => {
    if (typeof bytes !== 'number' || isNaN(bytes)) return 'Invalid';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const absBytes = Math.abs(bytes);
    let i = Math.floor(Math.log(absBytes) / Math.log(k));
    i = Math.min(i, sizes.length - 1); // clamp
    const value = Math.round((absBytes / Math.pow(k, i)) * 100) / 100;
    const sign = bytes < 0 ? '-' : '';
    return sign + value + ' ' + sizes[i];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.topicTitle.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập tên đề tài.' });
      return;
    }
    if (!formData.content.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập nội dung đề tài.' });
      return;
    }
    if (!formData.primarySupervisor) {
      setMessage({ type: 'error', text: 'Vui lòng chọn giảng viên hướng dẫn chính.' });
      return;
    }

    setLoading(true);
    try {
      // Tạo FormData để gửi file
      const formDataToSend = new FormData();
      formDataToSend.append('topicTitle', formData.topicTitle.trim());
      formDataToSend.append('content', formData.content.trim());
      formDataToSend.append('primarySupervisor', formData.primarySupervisor.username);
      formDataToSend.append('secondarySupervisor', formData.secondarySupervisor?.username || '');

      // Thêm các file đính kèm
      formData.attachments.forEach((file, index) => {
        formDataToSend.append('outlineFiles', file);
      });

      const response = await axios.post(
        'http://localhost:5000/student/propose-topic',
        formDataToSend,
        {
          withCredentials: true,
        }
      );

      setMessage({ type: 'success', text: 'Đề xuất đề tài thành công! Vui lòng chờ giảng viên phê duyệt.' });

      // Reset form
      setFormData({
        topicTitle: '',
        content: '',
        primarySupervisor: null,
        secondarySupervisor: null,
        attachments: []
      });

    } catch (err) {
      // Log verbose error for debugging
      console.error('Error submitting proposal (detailed):', err);
      const serverMessage = err.response?.data?.message;
      const serverErrorDetail = err.response?.data?.error || err.response?.data || null;
      const status = err.response?.status;

      let displayText = 'Có lỗi xảy ra khi gửi đề xuất.';
      if (serverMessage) displayText = `${serverMessage}${status ? ` (HTTP ${status})` : ''}`;
      else if (err.message) displayText = `${err.message}${status ? ` (HTTP ${status})` : ''}`;

      // Optionally append a short detail string for debugging (not too verbose)
      if (serverErrorDetail) {
        try {
          const short = typeof serverErrorDetail === 'string' ? serverErrorDetail : JSON.stringify(serverErrorDetail);
          displayText += ` — ${short.substring(0, 300)}`; // limit length
        } catch (e) {
          // ignore
        }
      }

      setMessage({ type: 'error', text: displayText });
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
    navigate('/');
  };

  return (
    <AppLayout>
      <div className="dashboard">
        <div className="dashboard-content">
          <Box sx={{ p: 3, maxWidth: 800 }}>
            <Typography variant="h4" gutterBottom>
              Đề xuất đề cương
            </Typography>

            {/* Hướng dẫn */}
            <Paper sx={{ p: 3, mt: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom>
                Ghi chú
              </Typography>
              <Typography variant="body2" component="div">
                <ul>
                  <li>Tên đề tài nên ngắn gọn, súc tích và thể hiện rõ nội dung nghiên cứu</li>
                  <li>Nội dung đề tài cần mô tả chi tiết về mục tiêu, phương pháp và kết quả mong đợi</li>
                  <li>Bắt buộc phải có giảng viên hướng dẫn chính</li>
                  <li>Giảng viên hướng dẫn phụ là tùy chọn</li>
                  <li>Bạn có thể đính kèm các tài liệu liên quan (PDF, Word, Text, Zip - tối đa {MAX_FILE_SIZE_IN_MB}MB mỗi file)</li>
                  <li>Sau khi gửi, đề xuất sẽ được chuyển đến giảng viên hướng dẫn để xem xét</li>
                </ul>
              </Typography>
            </Paper>

            {message.text && (
              <Alert
                severity={message.type}
                sx={{ mb: 3 }}
                onClose={() => setMessage({ type: '', text: '' })}
              >
                {message.text}
              </Alert>
            )}

            <Paper sx={{ p: 3 }}>
              <form onSubmit={handleSubmit}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {/* Tên đề tài */}
                  <TextField
                    fullWidth
                    required
                    label="Tên đề tài"
                    variant="outlined"
                    value={formData.topicTitle}
                    onChange={(e) => handleInputChange('topicTitle', e.target.value)}
                    placeholder="Nhập tên đề tài của bạn..."
                    sx={{ minHeight: '56px' }}
                  />

                  {/* Nội dung đề tài */}
                  <TextField
                    fullWidth
                    required
                    multiline
                    rows={8}
                    label="Nội dung đề tài"
                    variant="outlined"
                    value={formData.content}
                    onChange={(e) => handleInputChange('content', e.target.value)}
                    placeholder="Mô tả chi tiết về đề tài, mục tiêu, phương pháp thực hiện..."
                  />

                  {/* Giảng viên hướng dẫn chính */}
                  <Autocomplete
                    fullWidth
                    options={supervisors}
                    getOptionLabel={(option) => option ? `${option.fullName} (${option.username})` : ''}
                    value={formData.primarySupervisor}
                    onChange={(event, newValue) => {
                      handleInputChange('primarySupervisor', newValue);
                    }}
                    loading={supervisorsLoading}
                    popupIcon={formData.primarySupervisor ? null : <ArrowDropDownIcon />}
                    forcePopupIcon={!formData.primarySupervisor}
                    disableClearable={!formData.primarySupervisor}
                    clearIcon={<CloseIcon />}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        required
                        label="Giảng viên hướng dẫn chính"
                        variant="outlined"
                        placeholder="Tìm và chọn giảng viên..."
                        sx={{ minHeight: '56px' }}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {supervisorsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />

                  {/* Giảng viên hướng dẫn phụ */}
                  <Autocomplete
                    fullWidth
                    options={supervisors}
                    getOptionLabel={(option) => option ? `${option.fullName} (${option.username})` : ''}
                    value={formData.secondarySupervisor}
                    onChange={(event, newValue) => {
                      handleInputChange('secondarySupervisor', newValue);
                    }}
                    loading={supervisorsLoading}
                    popupIcon={formData.secondarySupervisor ? null : <ArrowDropDownIcon />}
                    forcePopupIcon={!formData.secondarySupervisor}
                    disableClearable={!formData.secondarySupervisor}
                    clearIcon={<CloseIcon />}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Giảng viên hướng dẫn phụ (tùy chọn)"
                        variant="outlined"
                        placeholder="Tìm và chọn giảng viên..."
                        sx={{ minHeight: '56px' }}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {supervisorsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />

                  {/* File đính kèm */}
                  <Box>
                    <input
                      accept=".pdf,.doc,.docx,.txt,.zip,.rar"
                      style={{ display: 'none' }}
                      id="file-upload"
                      multiple
                      type="file"
                      onChange={handleFileChange}
                    />
                    <label htmlFor="file-upload">
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<AttachFileIcon />}
                        fullWidth
                        sx={{ minHeight: '56px' }}
                      >
                        Đính kèm tài liệu (tùy chọn)
                      </Button>
                    </label>

                    {/* Hiển thị danh sách file đã chọn */}
                    {formData.attachments.length > 0 && (
                      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {formData.attachments.map((file, index) => (
                          <Chip
                            key={index}
                            icon={<AttachFileIcon />}
                            label={`${file.name} (${formatFileSize(file.size)})`}
                            onDelete={() => handleRemoveFile(index)}
                            deleteIcon={<DeleteIcon />}
                            variant="outlined"
                            sx={{
                              justifyContent: 'space-between',
                              '& .MuiChip-label': {
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '600px'
                              }
                            }}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>

                  {/* Submit button */}
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      startIcon={<SendIcon />}
                      disabled={loading}
                    >
                      {loading ? 'Đang gửi...' : 'Gửi đề xuất'}
                    </Button>
                  </Box>
                </Box>
              </form>
            </Paper>

          </Box>
        </div>
      </div>
    </AppLayout>
  );
}

export default ProposeTopic;