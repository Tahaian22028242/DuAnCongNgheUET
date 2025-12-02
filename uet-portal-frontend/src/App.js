import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import Dashboard from './Dashboard';
import ProtectedRoute from './ProtectedRoute';
import StudentBatches from './StudentBatches';
import StudentBatchDetail from './StudentBatchDetail';
import Upload from './Upload';
import Profile from './Profile';
import ProposeTopic from './ProposeTopic';
import SupervisorTopics from './SupervisorTopics';
import UploadHeads from './UploadHeads';
import HeadTopics from './HeadTopics';
import HeadStatistics from './HeadStatistics';
import Settings from './Settings';
import UploadLecturers from './UploadLecturers';
import FacultiesInfo from './FacultiesInfo';
// import FacultyLecturers from './FacultyLecturers';
import FacultyLecturers from './FacultyLecturers';
import Calendar from './Calendar'; // Import the new Calendar component
import Notifications from './Notifications'; // Import the Notifications component
import FacultyLeaderTopics from './FacultyLeaderTopics';
import DepartmentMajorMapping from './DepartmentMajorMapping';
import TopicArchive from './TopicArchive';
import TopicManagement from './TopicManagement';
import FacultyLeaderManagement from './FacultyLeaderManagement';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const response = await fetch('http://localhost:5000/auth/check', {
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                setIsAuthenticated(true);
                localStorage.setItem('user', JSON.stringify(data.user));
            } else {
                setIsAuthenticated(false);
                localStorage.removeItem('user');
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            setIsAuthenticated(false);
            localStorage.removeItem('user');
        }
        setLoading(false);
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <Routes>
            <Route path="/" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
            <Route path="/register" element={<Register />} />
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/profile"
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <Profile />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/batches"
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <StudentBatches />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/batches/:batchId"
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <StudentBatchDetail />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/upload"
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <Upload />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/upload-heads"
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <UploadHeads />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/propose-topic"
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <ProposeTopic />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/student/propose-topic"
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <ProposeTopic />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/topics"
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <SupervisorTopics />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/supervisor/topics"
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <SupervisorTopics />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/head/topics"
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <HeadTopics />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/head/statistics"
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <HeadStatistics />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/faculty-leader/topics"
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <FacultyLeaderTopics />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/faculty-leader/management"
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <FacultyLeaderManagement />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/topic-management"
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <TopicManagement />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/topic-archive"
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <TopicArchive />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/settings"
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <Settings />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/upload-lecturers"
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <UploadLecturers />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/faculties-info"
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <FacultiesInfo />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/faculty/:facultyName"
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <FacultyLecturers />
                    </ProtectedRoute>
                }
            />
            {/*Calendar Route */}
            <Route
                path="/calendar"
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <Calendar />
                    </ProtectedRoute>
                }
            />
            {/*Notifications Route */}
            <Route
                path="/notifications"
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <Notifications />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/department-major-mapping"
                element={
                    <ProtectedRoute isAuthenticated={isAuthenticated}>
                        <DepartmentMajorMapping />
                    </ProtectedRoute>
                }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
