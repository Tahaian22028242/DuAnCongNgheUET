import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

function Login({ setIsAuthenticated }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Sinh viên');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, role }),
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) {
        // Store complete user data from server
        localStorage.setItem('user', JSON.stringify(data.user));
        setIsAuthenticated(true);
        navigate('/dashboard');
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Lỗi: ' + error.message);
    }
  };

  return (
    <div className="App">
      <div className="login-container">
        <i className="fas fa-lock" style={{ fontSize: '40px', color: '#1e90ff', marginBottom: '20px' }}></i>
        <h1>Đăng nhập</h1>
        <p>UET Portal</p>
        <p>VNU University of Engineering and Technology</p>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Tên đăng nhập *</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Mật khẩu *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit">ĐĂNG NHẬP</button>
        </form>
        <p style={{ marginTop: '10px' }}>
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;

// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';

// function Login({ setIsAuthenticated }) {
//   const [formData, setFormData] = useState({
//     username: '',
//     password: '',
//     role: 'Sinh viên'
//   });
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
  
//   const navigate = useNavigate();

//   const handleInputChange = (e) => {
//     setFormData({
//       ...formData,
//       [e.target.name]: e.target.value
//     });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setError('');

//     try {
//       const response = await axios.post('http://localhost:5000/login', formData, {
//         withCredentials: true
//       });

//       if (response.status === 200) {
//         // Lưu thông tin user vào localStorage
//         localStorage.setItem('user', JSON.stringify(response.data.user));
//         setIsAuthenticated(true);
//         navigate('/dashboard');
//       }
//     } catch (err) {
//       console.error('Login error:', err);
//       setError(err.response?.data?.message || 'Đăng nhập thất bại');
//     }
    
//     setLoading(false);
//   };

//   return (
//     <div className="login-container">
//       <form onSubmit={handleSubmit}>
//         <h2>Đăng nhập</h2>
        
//         {error && <div className="error-message">{error}</div>}
        
//         <div className="form-group">
//           <label>Tên đăng nhập:</label>
//           <input
//             type="text"
//             name="username"
//             value={formData.username}
//             onChange={handleInputChange}
//             required
//           />
//         </div>

//         <div className="form-group">
//           <label>Mật khẩu:</label>
//           <input
//             type="password"
//             name="password"
//             value={formData.password}
//             onChange={handleInputChange}
//             required
//           />
//         </div>

//         <div className="form-group">
//           <label>Vai trò:</label>
//           <select
//             name="role"
//             value={formData.role}
//             onChange={handleInputChange}
//             required
//           >
//             <option value="Sinh viên">Sinh viên</option>
//             <option value="Giảng viên">Giảng viên</option>
//             <option value="Quản trị viên">Quản trị viên</option>
//             <option value="Chủ nhiệm bộ môn">Chủ nhiệm bộ môn</option>
//           </select>
//         </div>

//         <button type="submit" disabled={loading}>
//           {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
//         </button>
//       </form>
//     </div>
//   );
// }

// export default Login;