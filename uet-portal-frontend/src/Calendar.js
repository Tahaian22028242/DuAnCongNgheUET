import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Alert,
  Fab,
  Menu,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Event as EventIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  Assignment as AssignmentIcon,
  Today as TodayIcon,
  ChevronLeft,
  ChevronRight,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import AppLayout from './AppLayout';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [view, setView] = useState('month'); // 'month', 'week', 'day', 'list'
  const [openDialog, setOpenDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Form state
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    eventType: 'other',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    isAllDay: false,
    location: '',
    visibility: 'public',
    targetRoles: [],
    targetMajors: [],
    reminderMinutes: 60
  });

  const [filters, setFilters] = useState({
    eventType: '',
    showMyEvents: false
  });

  const eventTypes = [
    { value: 'academic', label: 'Học tập', icon: SchoolIcon, color: '#1976d2' },
    { value: 'thesis_defense', label: 'Bảo vệ đề tài', icon: AssignmentIcon, color: '#d32f2f' },
    { value: 'meeting', label: 'Họp', icon: WorkIcon, color: '#7b1fa2' },
    { value: 'deadline', label: 'Hạn nộp', icon: TodayIcon, color: '#f57c00' },
    { value: 'holiday', label: 'Nghỉ lễ', icon: EventIcon, color: '#388e3c' },
    { value: 'exam', label: 'Kiểm tra', icon: SchoolIcon, color: '#c2185b' },
    { value: 'other', label: 'Khác', icon: EventIcon, color: '#616161' }
  ];

  const roles = ['Sinh viên', 'Giảng viên', 'Quản trị viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'];
  const majors = ['Công nghệ thông tin', 'Khoa học máy tính', 'Kỹ thuật phần mềm', 'An toàn thông tin'];

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
    loadEvents();
  }, [currentDate, view]);

  useEffect(() => {
    applyFilters();
  }, [events, filters]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Only add date filters for month view
      if (view === 'month') {
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        params.append('startDate', startOfMonth.toISOString());
        params.append('endDate', endOfMonth.toISOString());
      }

      const response = await fetch(`http://localhost:5000/calendar/events?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      } else {
        setError('Không thể tải sự kiện');
      }
    } catch (error) {
      console.error('Error loading events:', error);
      setError('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...events];

    if (filters.eventType) {
      filtered = filtered.filter(event => event.eventType === filters.eventType);
    }

    if (filters.showMyEvents) {
      filtered = filtered.filter(event => event.createdBy._id === user._id);
    }

    setFilteredEvents(filtered);
  };

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setEventForm({
      title: '',
      description: '',
      eventType: 'other',
      startDate: selectedDate ? selectedDate.toISOString().split('T')[0] : '',
      endDate: selectedDate ? selectedDate.toISOString().split('T')[0] : '',
      startTime: '09:00',
      endTime: '10:00',
      isAllDay: false,
      location: '',
      visibility: user?.role === 'Sinh viên' ? 'private' : 'public',
      targetRoles: [],
      targetMajors: [],
      reminderMinutes: 60
    });
    setOpenDialog(true);
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    
    setEventForm({
      title: event.title,
      description: event.description || '',
      eventType: event.eventType,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      startTime: event.isAllDay ? '09:00' : startDate.toTimeString().slice(0, 5),
      endTime: event.isAllDay ? '10:00' : endDate.toTimeString().slice(0, 5),
      isAllDay: event.isAllDay,
      location: event.location || '',
      visibility: event.visibility,
      targetRoles: event.targetRoles || [],
      targetMajors: event.targetMajors || [],
      reminderMinutes: event.reminderMinutes || 60
    });
    setOpenDialog(true);
    setAnchorEl(null);
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Bạn có chắc muốn xóa sự kiện này?')) {
      try {
        const response = await fetch(`http://localhost:5000/calendar/events/${eventId}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (response.ok) {
          await loadEvents();
          setAnchorEl(null);
        } else {
          setError('Không thể xóa sự kiện');
        }
      } catch (error) {
        console.error('Error deleting event:', error);
        setError('Lỗi kết nối server');
      }
    }
  };

  const handleSaveEvent = async () => {
    try {
      setLoading(true);
      
      const startDateTime = eventForm.isAllDay 
        ? new Date(eventForm.startDate)
        : new Date(`${eventForm.startDate}T${eventForm.startTime}`);
      
      const endDateTime = eventForm.isAllDay
        ? new Date(eventForm.endDate)
        : new Date(`${eventForm.endDate}T${eventForm.endTime}`);

      const eventData = {
        title: eventForm.title,
        description: eventForm.description,
        eventType: eventForm.eventType,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        isAllDay: eventForm.isAllDay,
        location: eventForm.location,
        visibility: eventForm.visibility,
        targetRoles: eventForm.targetRoles,
        targetMajors: eventForm.targetMajors,
        reminderMinutes: parseInt(eventForm.reminderMinutes)
      };

      const url = editingEvent 
        ? `http://localhost:5000/calendar/events/${editingEvent._id}`
        : 'http://localhost:5000/calendar/events';

      const method = editingEvent ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(eventData)
      });

      if (response.ok) {
        await loadEvents();
        setOpenDialog(false);
        setError('');
      } else {
        const data = await response.json();
        setError(data.message || 'Không thể lưu sự kiện');
      }
    } catch (error) {
      console.error('Error saving event:', error);
      setError('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeInfo = (type) => {
    return eventTypes.find(et => et.value === type) || eventTypes[eventTypes.length - 1];
  };

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else {
      newDate.setDate(newDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };

  const getEventsForDate = (date) => {
    return filteredEvents.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      const checkDate = new Date(date);
      
      return checkDate >= new Date(eventStart.toDateString()) && 
             checkDate <= new Date(eventEnd.toDateString());
    });
  };

  const renderMonthView = () => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startOfCalendar = new Date(startOfMonth);
    startOfCalendar.setDate(startOfCalendar.getDate() - startOfCalendar.getDay());
    
    const days = [];
    const currentDay = new Date(startOfCalendar);
    
    for (let i = 0; i < 42; i++) {
      const dayEvents = getEventsForDate(currentDay);
      const isCurrentMonth = currentDay.getMonth() === currentDate.getMonth();
      const isToday = currentDay.toDateString() === new Date().toDateString();
      
      days.push(
        <Box
          key={currentDay.toDateString()}
          sx={{
            minHeight: 100,
            border: '1px solid #e0e0e0',
            p: 1,
            bgcolor: isCurrentMonth ? 'white' : '#f5f5f5',
            cursor: 'pointer',
            '&:hover': { bgcolor: '#f0f0f0' }
          }}
          onClick={() => {
            setSelectedDate(new Date(currentDay));
            if (user?.role !== 'Sinh viên' || dayEvents.length === 0) {
              handleCreateEvent();
            }
          }}
        >
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: isToday ? 'bold' : 'normal',
              color: isToday ? 'primary.main' : isCurrentMonth ? 'text.primary' : 'text.secondary'
            }}
          >
            {currentDay.getDate()}
          </Typography>
          {dayEvents.slice(0, 3).map(event => {
            const typeInfo = getEventTypeInfo(event.eventType);
            return (
              <Box
                key={event._id}
                sx={{
                  bgcolor: typeInfo.color,
                  color: 'white',
                  p: 0.5,
                  mb: 0.5,
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEvent(event);
                  setAnchorEl(e.currentTarget);
                }}
              >
                {event.title.length > 20 ? event.title.substring(0, 20) + '...' : event.title}
              </Box>
            );
          })}
          {dayEvents.length > 3 && (
            <Typography variant="caption" color="text.secondary">
              +{dayEvents.length - 3} sự kiện khác
            </Typography>
          )}
        </Box>
      );
      currentDay.setDate(currentDay.getDate() + 1);
    }

    return (
      <Grid container sx={{ border: '1px solid #e0e0e0' }}>
        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
          <Grid item xs key={day} sx={{ bgcolor: '#f5f5f5', p: 1, textAlign: 'center', borderRight: '1px solid #e0e0e0' }}>
            <Typography variant="subtitle2" fontWeight="bold">{day}</Typography>
          </Grid>
        ))}
        {days}
      </Grid>
    );
  };

  const renderListView = () => {
    const allEvents = filteredEvents
      .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    return (
      <Box>
        {allEvents.map(event => {
          const typeInfo = getEventTypeInfo(event.eventType);
          const TypeIcon = typeInfo.icon;
          
          return (
            <Card key={event._id} sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box display="flex" alignItems="center" flex={1}>
                    <TypeIcon sx={{ color: typeInfo.color, mr: 2 }} />
                    <Box>
                      <Typography variant="h6">{event.title}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        {new Date(event.startDate).toLocaleString('vi-VN')}
                        {event.endDate && new Date(event.startDate).toDateString() !== new Date(event.endDate).toDateString() && 
                          ` - ${new Date(event.endDate).toLocaleString('vi-VN')}`
                        }
                      </Typography>
                      {event.location && (
                        <Typography variant="body2" color="text.secondary">
                          📍 {event.location}
                        </Typography>
                      )}
                      {event.description && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {event.description}
                        </Typography>
                      )}
                      <Chip 
                        label={typeInfo.label} 
                        size="small" 
                        sx={{ mt: 1, bgcolor: typeInfo.color, color: 'white' }}
                      />
                    </Box>
                  </Box>
                  {(event.createdBy.username === user?.username || user?.role === 'Quản trị viên') && (
                    <IconButton
                      onClick={(e) => {
                        setSelectedEvent(event);
                        setAnchorEl(e.currentTarget);
                      }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  )}
                </Box>
              </CardContent>
            </Card>
          );
        })}
        {allEvents.length === 0 && (
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mt: 4 }}>
            Không có sự kiện nào
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <AppLayout>
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Lịch</Typography>
          <Box display="flex" gap={2} alignItems="center">
            {/* Filters */}
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Loại sự kiện</InputLabel>
              <Select
                value={filters.eventType}
                label="Loại sự kiện"
                onChange={(e) => setFilters({...filters, eventType: e.target.value})}
              >
                <MenuItem value="">Tất cả</MenuItem>
                {eventTypes.map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={filters.showMyEvents}
                  onChange={(e) => setFilters({...filters, showMyEvents: e.target.checked})}
                />
              }
              label="Sự kiện của tôi"
            />

            {/* View Tabs */}
            <Tabs value={view} onChange={(e, newView) => setView(newView)}>
              <Tab label="Tháng" value="month" />
              <Tab label="Danh sách" value="list" />
            </Tabs>
          </Box>
        </Box>

        {/* Navigation */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton onClick={() => navigateDate(-1)}>
              <ChevronLeft />
            </IconButton>
            <Typography variant="h5">
              {view === 'month' && 
                `Tháng ${currentDate.getMonth() + 1} năm ${currentDate.getFullYear()}`
              }
              {view === 'list' && 'Tất cả sự kiện'}
            </Typography>
            <IconButton onClick={() => navigateDate(1)} disabled={view === 'list'}>
              <ChevronRight />
            </IconButton>
            {/* <Button 
              variant="outlined" 
              onClick={() => setCurrentDate(new Date())}
            >
              Hôm nay
            </Button> */}
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Calendar Views */}
        {loading ? (
          <Typography>Đang tải...</Typography>
        ) : (
          <>
            {view === 'month' && renderMonthView()}
            {view === 'list' && renderListView()}
          </>
        )}
      </Paper>

      {/* Floating Action Button */}
      {user?.role !== 'Sinh viên' && (
        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={handleCreateEvent}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Event Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => handleEditEvent(selectedEvent)}>
          <ListItemIcon><EditIcon /></ListItemIcon>
          <ListItemText>Chỉnh sửa</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDeleteEvent(selectedEvent?._id)}>
          <ListItemIcon><DeleteIcon /></ListItemIcon>
          <ListItemText>Xóa</ListItemText>
        </MenuItem>
      </Menu>

      {/* Event Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingEvent ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tiêu đề *"
                value={eventForm.title}
                onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mô tả"
                multiline
                rows={3}
                value={eventForm.description}
                onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Loại sự kiện *</InputLabel>
                <Select
                  value={eventForm.eventType}
                  label="Loại sự kiện *"
                  onChange={(e) => setEventForm({...eventForm, eventType: e.target.value})}
                >
                  {eventTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Địa điểm"
                value={eventForm.location}
                onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={eventForm.isAllDay}
                    onChange={(e) => setEventForm({...eventForm, isAllDay: e.target.checked})}
                  />
                }
                label="Cả ngày"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Ngày bắt đầu *"
                type="date"
                value={eventForm.startDate}
                onChange={(e) => setEventForm({...eventForm, startDate: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Ngày kết thúc *"
                type="date"
                value={eventForm.endDate}
                onChange={(e) => setEventForm({...eventForm, endDate: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {!eventForm.isAllDay && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Giờ bắt đầu"
                    type="time"
                    value={eventForm.startTime}
                    onChange={(e) => setEventForm({...eventForm, startTime: e.target.value})}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Giờ kết thúc"
                    type="time"
                    value={eventForm.endTime}
                    onChange={(e) => setEventForm({...eventForm, endTime: e.target.value})}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </>
            )}

            {user?.role !== 'Sinh viên' && (
              <>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Phạm vi hiển thị</InputLabel>
                    <Select
                      value={eventForm.visibility}
                      label="Phạm vi hiển thị"
                      onChange={(e) => setEventForm({...eventForm, visibility: e.target.value})}
                    >
                      <MenuItem value="public">Công khai</MenuItem>
                      <MenuItem value="major_only">Theo ngành</MenuItem>
                      <MenuItem value="role_only">Theo vai trò</MenuItem>
                      <MenuItem value="private">Riêng tư</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Nhắc nhở trước (phút)"
                    type="number"
                    value={eventForm.reminderMinutes}
                    onChange={(e) => setEventForm({...eventForm, reminderMinutes: e.target.value})}
                  />
                </Grid>

                {eventForm.visibility === 'role_only' && (
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Vai trò được xem</InputLabel>
                      <Select
                        multiple
                        value={eventForm.targetRoles}
                        onChange={(e) => setEventForm({...eventForm, targetRoles: e.target.value})}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => (
                              <Chip key={value} label={value} />
                            ))}
                          </Box>
                        )}
                      >
                        {roles.map(role => (
                          <MenuItem key={role} value={role}>
                            {role}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                {eventForm.visibility === 'major_only' && (
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Ngành được xem</InputLabel>
                      <Select
                        multiple
                        value={eventForm.targetMajors}
                        onChange={(e) => setEventForm({...eventForm, targetMajors: e.target.value})}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => (
                              <Chip key={value} label={value} />
                            ))}
                          </Box>
                        )}
                      >
                        {majors.map(major => (
                          <MenuItem key={major} value={major}>
                            {major}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Hủy</Button>
          <Button 
            onClick={handleSaveEvent} 
            variant="contained"
            disabled={!eventForm.title || !eventForm.startDate || !eventForm.endDate || loading}
          >
            {loading ? 'Đang lưu...' : (editingEvent ? 'Cập nhật' : 'Tạo')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </AppLayout>
  );
};

export default Calendar;