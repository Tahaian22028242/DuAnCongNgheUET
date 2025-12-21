# Hệ thống Quản lý người học, cán bộ giảng viên VNU-UET

Hệ thống quản trị người học, cán bộ giảng viên và các hoạt động liên quan.

## 📋 Mục lục

- [Tính năng](#-tính-năng)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Cài đặt](#-cài-đặt)
- [Sử dụng](#-sử-dụng)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [API Endpoints](#-api-endpoints)
- [Phân quyền người dùng](#-phân-quyền-người-dùng)

## ✨ Tính năng

### Dành cho Sinh viên

- ✅ Đăng ký tài khoản và đăng nhập
- ✅ Đề xuất đề tài nghiên cứu mới
- ✅ Tải lên tệp đính kèm (đề cương, tài liệu)
- ✅ Theo dõi trạng thái đề tài (chờ duyệt, đã duyệt, bị từ chối)
- ✅ Chỉnh sửa và gửi lại đề xuất bị từ chối
- ✅ Xem lịch và thông báo

### Dành cho Giảng viên

- ✅ Xem danh sách đề tài được giao
- ✅ Phê duyệt hoặc từ chối đề xuất đề tài
- ✅ Đưa đề tài vào lưu trữ (archive)
- ✅ Quản lý thông tin cá nhân

### Dành cho Lãnh đạo Bộ môn

- ✅ Xem tất cả đề tài trong bộ môn
- ✅ Theo dõi thống kê đề tài
- ✅ Quản lý lưu trữ đề tài
- ✅ Tải lên danh sách trưởng bộ môn

### Dành cho Lãnh đạo Khoa

- ✅ Xem tất cả đề tài trong khoa
- ✅ Theo dõi thống kê tổng quan
- ✅ Quản lý lưu trữ đề tài cấp khoa
- ✅ Tải lên danh sách giảng viên và trưởng bộ môn
- ✅ Quản lý thông tin khoa và bộ môn

## 🛠 Công nghệ sử dụng

### Backend

- **Node.js** (v18+) - Runtime environment
- **Express.js** (v5) - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** (v8) - ODM cho MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Multer** - File upload handling
- **ExcelJS** - Excel file processing
- **Docker** - Containerization

### Frontend

- **React** (v19) - UI library
- **Material-UI (MUI)** (v7) - Component library
- **React Router** (v7) - Routing
- **Axios** - HTTP client
- **date-fns** - Date formatting
- **FontAwesome** - Icons

## 📦 Yêu cầu hệ thống

- **Node.js**: >= 18.x
- **npm**: >= 9.x
- **MongoDB**: >= 6.x (hoặc MongoDB Atlas)
- **Docker** (tùy chọn): Nếu chạy MongoDB qua Docker

## 🚀 Cài đặt

### 1. Clone repository

```bash
git clone <repository-url>
cd DuAnCongNgheUET
```

### 2. Cài đặt dependencies

```bash
# Cài đặt dependencies gốc (concurrently)
npm install

# Cài đặt dependencies cho backend
cd backend
npm install
cd ..

# Cài đặt dependencies cho frontend
cd frontend
npm install
cd ..
```

### 3. Cấu hình môi trường

Tạo file `.env` trong thư mục `backend/`:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/quanlydetan
# hoặc sử dụng MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/quanlydetan

# JWT Secret
JWT_SECRET=your-secret-key-here

# Server
PORT=5000
NODE_ENV=development

# Frontend URL (cho CORS)
FRONTEND_URL=http://localhost:3002
```

### 4. Khởi động MongoDB

**Sử dụng Docker:**

```bash
cd backend
docker-compose up -d
```

**Hoặc cài đặt MongoDB local:**

- Tải và cài đặt MongoDB Community Server từ [mongodb.com](https://www.mongodb.com/try/download/community)
- Khởi động MongoDB service

## 💻 Sử dụng

### Chạy toàn bộ ứng dụng (Backend + Frontend)

```bash
npm run start-all
```

Ứng dụng sẽ chạy tại:

- **Backend API**: http://localhost:5000
- **Frontend**: http://localhost:3002

### Chạy riêng từng phần

**Backend (development mode với nodemon):**

```bash
cd backend
npm run dev
```

**Frontend:**

```bash
cd frontend
npm start
```

### Build production

**Frontend:**

```bash
cd frontend
npm run build
```

Build files sẽ được tạo trong thư mục `frontend/build/`

## 📁 Cấu trúc dự án

```
DuAnCongNgheUET/
├── backend/
│   ├── server.js              # Entry point, API routes, middleware
│   ├── check-head-user.js     # Script kiểm tra user
│   ├── fix-managed-major.js   # Script sửa dữ liệu
│   ├── docker-compose.yml     # MongoDB Docker config
│   ├── package.json
│   └── uploads/               # Thư mục chứa files upload
│       └── outlines/          # Đề cương đề tài
│
├── frontend/
│   ├── public/                # Static files
│   ├── src/
│   │   ├── App.js            # Main app component
│   │   ├── AppLayout.js      # Layout wrapper
│   │   ├── Login.js          # Đăng nhập
│   │   ├── Register.js       # Đăng ký
│   │   ├── ProtectedRoute.js # Route guard
│   │   │
│   │   # Student components
│   │   ├── ProposeTopic.js   # Đề xuất đề tài
│   │   ├── TopicManagement.js # Quản lý đề tài sinh viên
│   │   ├── StudentBatches.js  # Danh sách đợt
│   │   │
│   │   # Supervisor components
│   │   ├── SupervisorTopics.js # Đề tài giảng viên
│   │   │
│   │   # Head/Leader components
│   │   ├── HeadTopics.js      # Đề tài lãnh đạo bộ môn
│   │   ├── FacultyLeaderTopics.js # Đề tài lãnh đạo khoa
│   │   ├── HeadStatistics.js  # Thống kê
│   │   ├── UploadHeads.js     # Upload trưởng bộ môn
│   │   ├── UploadLecturers.js # Upload giảng viên
│   │   │
│   │   # Shared components
│   │   ├── Calendar.js       # Lịch
│   │   ├── Dashboard.js      # Bảng điều khiển
│   │   ├── Notifications.js  # Thông báo
│   │   ├── Profile.js        # Hồ sơ cá nhân
│   │   ├── Settings.js       # Cài đặt
│   │   ├── TopicArchive.js   # Lưu trữ đề tài
│   │   └── ...
│   │
│   └── package.json
│
├── package.json              # Root package.json (concurrently)
└── README.md                 # File này
```

## 🔌 API Endpoints

### Authentication

- `POST /register` - Đăng ký tài khoản
- `POST /login` - Đăng nhập
- `GET /profile` - Lấy thông tin người dùng
- `POST /logout` - Đăng xuất

### Student

- `POST /student/propose-topic` - Đề xuất đề tài
- `GET /student/proposals` - Lấy danh sách đề xuất
- `PUT /student/resubmit-topic/:id` - Gửi lại đề xuất
- `GET /student/batches` - Lấy danh sách đợt

### Supervisor

- `GET /supervisor/topics` - Lấy đề tài được giao
- `GET /supervisor/archive-proposals` - Lấy đề tài lưu trữ
- `PUT /supervisor/approve/:id` - Phê duyệt đề tài
- `PUT /supervisor/reject/:id` - Từ chối đề tài
- `PUT /supervisor/move-to-archive/:id` - Chuyển vào lưu trữ
- `PUT /supervisor/hide-archive/:id` - Ẩn khỏi lưu trữ

### Head (Lãnh đạo Bộ môn)

- `GET /head/proposals` - Lấy đề tài bộ môn
- `GET /head/archive-proposals` - Lấy lưu trữ bộ môn
- `PUT /head/hide-archive/:id` - Ẩn khỏi lưu trữ
- `GET /head/statistics` - Thống kê

### Faculty Leader (Lãnh đạo Khoa)

- `GET /faculty-leader/proposals` - Lấy đề tài khoa
- `GET /faculty-leader/archive-proposals` - Lấy lưu trữ khoa
- `PUT /faculty-leader/hide-archive/:id` - Ẩn khỏi lưu trữ
- `POST /faculty-leader/upload-lecturers` - Upload giảng viên
- `GET /faculty-leader/lecturers` - Lấy danh sách giảng viên
- `GET /faculty-leader/faculties` - Lấy danh sách khoa

## 👥 Phân quyền người dùng

| Vai trò                 | Mô tả                   | Quyền hạn                                                                                        |
| ------------------------ | ------------------------- | -------------------------------------------------------------------------------------------------- |
| **Student**        | Sinh viên                | Đề xuất đề tài, chỉnh sửa đề xuất, theo dõi trạng thái                               |
| **Supervisor**     | Giảng viên hướng dẫn | Phê duyệt/từ chối đề tài, quản lý đề tài được giao                                  |
| **Head**           | Lãnh đạo bbooj môn    | Xem tất cả đề tài bộ môn, phê duyệt/từ chối đề tài, thống kê, quản lý lưu trữ |
| **Faculty Leader** | Lãnh đạo khoa          | Xem tất cả đề tài khoa, phê duyệt/từ chối đề tài, quản lý cấu trúc                 |

## 🔐 Bảo mật

- **Authentication**: JWT tokens lưu trong HTTP-only cookies
- **Password**: Hash bằng bcryptjs với salt rounds = 10
- **CORS**: Cấu hình cho phép origin từ frontend
- **File Upload**: Validate file type và size
- **Authorization**: Middleware kiểm tra quyền theo role

## 🐛 Debug & Development

### Kiểm tra kết nối MongoDB

```bash
cd backend
node -e "require('mongoose').connect('mongodb://localhost:27017/quanlydetan').then(() => console.log('Connected!')).catch(err => console.error(err))"
```

### Xem logs backend

Backend sử dụng `nodemon` để tự động reload khi có thay đổi. Logs sẽ hiển thị trong terminal.

### React Developer Tools

Sử dụng [React DevTools](https://react.dev/learn/react-developer-tools) extension để debug React components.

## 📝 Scripts hữu ích

### Backend

```bash
# Kiểm tra user trong database
node check-head-user.js

# Sửa dữ liệu managed major
node fix-managed-major.js
```
