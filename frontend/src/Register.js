import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css'; // Có thể tái sử dụng CSS từ Login

function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Sinh viên');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, role }),
      });
      const data = await response.json();
      if (response.ok) {
        alert('Đăng ký thành công');
        navigate('/');
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
        <h1>Đăng ký</h1>
        <p>UET Portal</p>
        <form onSubmit={handleRegister}>
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
          <div className="input-group">
            <label>Vai trò</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="Sinh viên">Sinh viên</option>
              <option value="Giảng viên">Giảng viên</option>
              <option value="Quản trị viên">Quản trị viên</option>
              <option value="Lãnh đạo bộ môn">Lãnh đạo bộ môn</option>
              <option value="Lãnh đạo khoa">Lãnh đạo khoa</option>
            </select>
          </div>
          <button type="submit">ĐĂNG KÝ</button>
        </form>
        <p style={{ marginTop: '10px' }}>
          Đã có tài khoản? <Link to="/">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;