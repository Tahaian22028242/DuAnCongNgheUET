import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Box, Paper, TextField, Button, Alert, 
  Drawer, List, ListItem, ListItemText, Autocomplete,
  Grid, CircularProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
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

// management

// function management(){
//     const [userData, setUserData] = useState(null);
//         const [loading, setLoading] = useState(true);
//         const [error, setError] = useState('');
//         const user = JSON.parse(localStorage.getItem('user')) || {};
//         const navigate = useNavigate();
    
// }

// return (

// )