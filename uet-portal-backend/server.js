import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import multer from 'multer';
import exceljs from 'exceljs';
import fs from 'fs';

dotenv.config();

const app = express();
const port = 5000;

// Kết nối với MongoDB
mongoose
  .connect('mongodb://localhost:27017/uet_portal')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // Cập nhật danh sách role: thêm 'Lãnh đạo bộ môn', 'Lãnh đạo khoa' (giữ tạm 'Chủ nhiệm bộ môn' để tương thích dữ liệu cũ)
  role: { type: String, required: true, enum: ['Sinh viên', 'Giảng viên', 'Quản trị viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'] },
  // Lãnh đạo khoa dùng managedMajor (theo yêu cầu), Lãnh đạo bộ môn dùng managedDepartment
  managedMajor: { type: String },
  managedDepartment: { type: String },
  // Thông tin chung cho tất cả user
  userInfo: {
    fullName: String,
    email: String,
    faculty: String,
    department: String,
    position: String
  },
  // Thông tin riêng cho sinh viên
  studentInfo: {
    studentId: String,
    fullName: String,
    birthDate: Date,
    major: String,
    faculty: String, // <-- Thêm trường Khoa (faculty)
  },
  notifications: [
    {
      message: String,
      type: { type: String, default: 'topic' },
      createdAt: { type: Date, default: Date.now },
      read: { type: Boolean, default: false }
    }
  ]
});

const User = mongoose.model('User', userSchema);

// Schema cho danh sách học viên
const studentBatchSchema = new mongoose.Schema({
  batchName: { type: String, required: true },
  decision: { type: String, required: true },
  students: [
    {
      studentId: String,
      fullName: String,
      birthDate: Date,
      faculty: String, // <-- Thêm Khoa
      major: String,
    },
  ],
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadDate: { type: Date, default: Date.now },
});

const StudentBatch = mongoose.model('StudentBatch', studentBatchSchema);

// Schema cho đề tài
const topicProposalSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  topicTitle: { type: String, required: true },
  content: { type: String, required: true },
  primarySupervisor: { type: String, required: true },
  secondarySupervisor: { type: String },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'waiting_head_approval', 'approved_by_head'],
    default: 'pending'
  },
  supervisorComments: { type: String },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  headId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // CNBM quản lý
  headComments: { type: String }
});

const TopicProposal = mongoose.model('TopicProposal', topicProposalSchema);

// Hàm tạo JWT token
async function issueAuthToken(user) {
  const payload = {
    _id: user._id,
    username: user.username,
    role: user.role,
  };
  const secret = process.env.JWT_SECRET || 'your_jwt_secret';
  const options = {
    expiresIn: '1h',
  };
  return jwt.sign(payload, secret, options);
}

// Hàm đặt cookie
function issueAuthTokenCookie(res, token) {
  const cookieOptions = {
    httpOnly: true,
    maxAge: 1000 * 60 * 60,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  };
  res.cookie('auth_token', token, cookieOptions);
}

// Middleware để xác thực JWT
const authenticateJWT = (req, res, next) => {
  const token = req.cookies.auth_token;
  if (!token) {
    return res.status(401).json({ message: 'Không tìm thấy token xác thực' });
  }

  const secret = process.env.JWT_SECRET || 'your_jwt_secret';
  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

// API đăng ký
app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, role });
    await user.save();

    res.status(201).json({ message: 'Đăng ký thành công', user: { username, role } });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});
// API đăng nhập
app.post('/login', async (req, res) => {
  const { username, password} = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Tên đăng nhập không tồn tại' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mật khẩu không đúng' });
    }

    const authToken = await issueAuthToken(user);
    issueAuthTokenCookie(res, authToken);

    // Chuẩn hóa role hiển thị: map 'Chủ nhiệm bộ môn' -> 'Lãnh đạo bộ môn'
    const normalizedRole = user.role === 'Chủ nhiệm bộ môn' ? 'Lãnh đạo bộ môn' : user.role;

    let responseData = {
      message: 'Đăng nhập thành công',
      user: {
        username: user.username,
        role: normalizedRole,
      }
    };

    if (normalizedRole === 'Sinh viên') {
      responseData.user.studentInfo = user.studentInfo || null;
    } else if (normalizedRole === 'Lãnh đạo bộ môn') {
      responseData.user.userInfo = user.userInfo || null;
      responseData.user.managedDepartment = user.managedDepartment || null;
    } else if (normalizedRole === 'Lãnh đạo khoa') {
      responseData.user.userInfo = user.userInfo || null;
      responseData.user.managedMajor = user.managedMajor || null; // theo yêu cầu dùng managedMajor cho lãnh đạo khoa
    } else {
      responseData.user.userInfo = user.userInfo || null;
    }

    res.status(200).json(responseData);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Cấu hình multer để xử lý file upload
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});

const upload = multer({ storage });

// API cho Admin nhập danh sách học viên và tự động tạo tài khoản
app.post('/admin/upload-students', authenticateJWT, upload.single('excelFile'), async (req, res) => {
  // Verify admin role
  if (req.user.role !== 'Quản trị viên') {
    return res.status(403).json({ message: 'Không có quyền truy cập' });
  }

  const { batchName, decision } = req.body;
  const file = req.file;

  if (!batchName || !decision || !file) {
    return res.status(400).json({ message: 'Thiếu thông tin hoặc file' });
  }

  try {
    const workbook = new exceljs.Workbook();
    await workbook.xlsx.readFile(file.path);
    const worksheet = workbook.getWorksheet(1);

    const students = [];
    const createdAccounts = [];

    worksheet.eachRow(async (row, rowNumber) => {
      if (rowNumber > 1) { // Bỏ qua header row
        let birthDateRaw = row.getCell(3).value;
        let birthDate;

        if (birthDateRaw instanceof Date) {
          birthDate = birthDateRaw;
        } else if (typeof birthDateRaw === 'string') {
          // Xử lý cả dạng "3/10/2003", "03/10/2003", "08/06/2003"
          const parts = birthDateRaw.split(/[\/\-]/);
          if (parts.length === 3) {
            // Loại bỏ số 0 ở đầu nếu có
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            birthDate = new Date(year, month - 1, day);
          } else {
            birthDate = null;
          }
        } else {
          birthDate = null;
        }

        const studentData = {
          studentId: row.getCell(1).value?.toString(),
          fullName: row.getCell(2).value?.toString(), 
          birthDate: birthDate,
          faculty: row.getCell(4).value?.toString(), // Khoa (column 4)
          major: row.getCell(5).value?.toString(),   // Ngành học (column 5)
        };

        students.push(studentData);

        // Tạo tài khoản cho sinh viên
        try {
          const existingUser = await User.findOne({ username: studentData.studentId });
          if (!existingUser) {
            const hashedPassword = await bcrypt.hash('123', 10);
            const newUser = new User({
              username: studentData.studentId,
              password: hashedPassword,
              role: 'Sinh viên',
              studentInfo: {
                studentId: studentData.studentId,
                fullName: studentData.fullName,
                birthDate: studentData.birthDate,
                major: studentData.major,
                faculty: studentData.faculty // Lưu Khoa vào studentInfo
              }
            });
            await newUser.save();
            createdAccounts.push(studentData.studentId);
          }
        } catch (userError) {
          console.error(`Error creating account for ${studentData.studentId}:`, userError);
        }
      }
    });

    // Wait for all user creation operations
    await new Promise(resolve => setTimeout(resolve, 1000));

    const batch = new StudentBatch({
      batchName,
      decision,
      students,
      uploadedBy: req.user._id,
    });
    await batch.save();

    // Clean up the uploaded file
    fs.unlink(file.path, (err) => {
      if (err) console.error('Lỗi xóa file:', err);
    });

    res.status(201).json({
      message: 'Tải lên danh sách học viên thành công',
      batch,
      createdAccounts: createdAccounts.length,
      accountsCreated: createdAccounts
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});



app.post('/admin/upload-heads', authenticateJWT, upload.single('excelFile'), async (req, res) => {
    if (req.user.role !== 'Quản trị viên') {
        return res.status(403).json({ message: 'Không có quyền truy cập' });
    }

    const file = req.file;
    if (!file) {
        return res.status(400).json({ message: 'Thiếu file' });
    }

    try {
        const workbook = new exceljs.Workbook();
        await workbook.xlsx.readFile(file.path);
        const worksheet = workbook.getWorksheet(1);

        const createdHeads = [];
        const errors = [];
        const headsData = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) { // Bỏ qua header row
                const stt = getCellValue(row.getCell(1));
                const fullName = getCellValue(row.getCell(2));
                const email = getCellValue(row.getCell(3));
                const managedDepartment = getCellValue(row.getCell(4));

                if (stt && fullName && email && managedDepartment && email.includes('@') && email.includes('.')) {
                    headsData.push({
                        stt: stt.trim(),
                        fullName: fullName.trim(),
                        email: email.trim().toLowerCase(),
                        managedDepartment: managedDepartment.trim()
                    });
                } else {
                    errors.push(`Hàng ${rowNumber}: Thiếu thông tin (STT: ${stt}, Tên: ${fullName}, Email: ${email}, Bộ môn: ${managedDepartment})`);
                }
            }
        });

        for (const headData of headsData) {
            try {
                const existingUser = await User.findOne({ username: headData.email });
                if (!existingUser) {
                    // Mỗi bộ môn chỉ có 1 Lãnh đạo bộ môn
                    const existingHead = await User.findOne({
                        role: { $in: ['Lãnh đạo bộ môn'] },
                        managedDepartment: headData.managedDepartment
                    });

                    if (!existingHead) {
                        const hashedPassword = await bcrypt.hash('123', 10);
                        const newUser = new User({
                            username: headData.email,
                            password: hashedPassword,
                            role: 'Lãnh đạo bộ môn',
                            userInfo: {
                                fullName: headData.fullName,
                                email: headData.email
                            },
                            managedDepartment: headData.managedDepartment
                        });
                        await newUser.save();
                        createdHeads.push({ email: headData.email, fullName: headData.fullName, managedDepartment: headData.managedDepartment });
                    } else {
                        errors.push(`Bộ môn ${headData.managedDepartment} đã có Lãnh đạo bộ môn: ${existingHead.userInfo?.fullName || existingHead.username}`);
                    }
                } else {
                    errors.push(`Email đã tồn tại: ${headData.email}`);
                }
            } catch (userError) {
                errors.push(`Lỗi tạo tài khoản cho ${headData.email}: ${userError.message}`);
            }
        }

        fs.unlink(file.path, (err) => { if (err) console.error('Lỗi xóa file:', err); });

        res.status(201).json({
            message: 'Tải lên danh sách Lãnh đạo bộ môn hoàn tất',
            success: { total: createdHeads.length, accounts: createdHeads },
            errors: errors.length > 0 ? errors : undefined,
            totalProcessed: headsData.length
        });
    } catch (error) {
        if (file && file.path) {
            fs.unlink(file.path, (err) => { if (err) console.error('Lỗi xóa file:', err); });
        }
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

function getCellValue(cell) {
    if (!cell || cell.value === null || cell.value === undefined) {
        return '';
    }
    
    // Xử lý các kiểu dữ liệu khác nhau
    if (typeof cell.value === 'object') {
        // Nếu là object, có thể là date hoặc formula
        if (cell.value.result !== undefined) {
            return cell.value.result.toString();
        } else if (cell.value.text !== undefined) {
            return cell.value.text.toString();
        } else {
            return cell.value.toString();
        }
    }
    
    return cell.value.toString();
}

app.get('/students/batches', authenticateJWT, async (req, res) => {
  try {
    let allowedToView = false;
    let majorFilter = null;

    // Kiểm tra quyền truy cập
    if (req.user.role === 'Quản trị viên' || req.user.role === 'Giảng viên') {
      allowedToView = true;
    } else if (req.user.role === 'Lãnh đạo bộ môn') {
      allowedToView = true;
      // CNBM chỉ được xem sinh viên thuộc ngành mình quản lý
      const head = await User.findById(req.user._id);
      majorFilter = head.managedMajor;
    }

    if (!allowedToView) {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }

    const { studentId, fullName, birthDate, major } = req.query;
    let batches = await StudentBatch.find();

    // Lọc theo ngành nếu là CNBM
    if (majorFilter) {
      batches = batches.map(batch => ({
        ...batch.toObject(),
        students: batch.students.filter(student =>
          student.major === majorFilter
        )
      })).filter(batch => batch.students.length > 0);
    }

    // Áp dụng các bộ lọc tìm kiếm
    if (studentId || fullName || birthDate || major) {
      batches = batches.map(batch => ({
        ...batch.toObject(),
        students: batch.students.filter(student => {
          let matches = true;
          if (studentId && !student.studentId?.toLowerCase().includes(studentId.toLowerCase())) {
            matches = false;
          }
          if (fullName && !student.fullName?.toLowerCase().includes(fullName.toLowerCase())) {
            matches = false;
          }
          if (major && !student.major?.toLowerCase().includes(major.toLowerCase())) {
            matches = false;
          }
          if (birthDate) {
            const studentBirthDate = new Date(student.birthDate);
            const searchDate = new Date(birthDate);
            if (studentBirthDate.toDateString() !== searchDate.toDateString()) {
              matches = false;
            }
          }
          return matches;
        })
      })).filter(batch => batch.students.length > 0);
    }

    res.status(200).json(batches);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

app.get('/batch/:id', authenticateJWT, async (req, res) => {
  try {
    const batch = await StudentBatch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ message: 'Không tìm thấy đợt học viên' });
    }
    res.status(200).json({ batch });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});


// API cho Admin quản lý danh sách Lãnh đạo bộ môn
app.get('/admin/heads', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Quản trị viên') {
      return res.status(403).json({ message: 'Chỉ admin mới có quyền truy cập' });
    }

    const heads = await User.find({ role: { $in: ['Lãnh đạo bộ môn'] } })
      .select('username userInfo.fullName managedDepartment managedMajor createdAt')
      .sort({ createdAt: -1 });

    const headsList = heads.map(head => ({
      id: head._id,
      email: head.username,
      fullName: head.userInfo?.fullName || 'Chưa có tên',
      managedDepartment: head.managedDepartment || null,
      managedMajor: head.managedMajor || null,
      createdAt: head.createdAt
    }));

    res.status(200).json({
      message: 'Lấy danh sách Lãnh đạo bộ môn thành công',
      total: headsList.length,
      heads: headsList
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// API xóa Lãnh đạo bộ môn (cho admin)
app.delete('/admin/heads/:id', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Quản trị viên') {
      return res.status(403).json({ message: 'Chỉ admin mới có quyền xóa' });
    }

    const headId = req.params.id;
    const head = await User.findById(headId);

    if (!head || !['Lãnh đạo bộ môn'].includes(head.role)) {
      return res.status(404).json({ message: 'Không tìm thấy Lãnh đạo bộ môn' });
    }

    await User.findByIdAndDelete(headId);

    res.status(200).json({
      message: `Đã xóa Lãnh đạo bộ môn ${head.userInfo?.fullName || head.username}`,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// API cập nhật thông tin Lãnh đạo bộ môn
app.put('/admin/heads/:id', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Quản trị viên') {
      return res.status(403).json({ message: 'Chỉ admin mới có quyền cập nhật' });
    }

    const headId = req.params.id;
    const { fullName, managedDepartment } = req.body;

    const head = await User.findById(headId);
    if (!head || !['Lãnh đạo bộ môn'].includes(head.role)) {
      return res.status(404).json({ message: 'Không tìm thấy Lãnh đạo bộ môn' });
    }

    if (fullName) {
      head.userInfo = head.userInfo || {};
      head.userInfo.fullName = fullName;
    }

    if (managedDepartment) {
      const existingHead = await User.findOne({
        role: { $in: ['Lãnh đạo bộ môn'] },
        managedDepartment: managedDepartment,
        _id: { $ne: headId }
      });

      if (existingHead) {
        return res.status(400).json({ message: `Bộ môn "${managedDepartment}" đã có Lãnh đạo bộ môn khác` });
      }
      head.managedDepartment = managedDepartment;
    }

    await head.save();

    res.status(200).json({
      message: 'Cập nhật thông tin Lãnh đạo bộ môn thành công',
      head: {
        id: head._id,
        email: head.username,
        fullName: head.userInfo?.fullName,
        managedDepartment: head.managedDepartment
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// API xóa toàn bộ đợt học viên (cho admin) - có thể xóa cả tài khoản sinh viên
app.delete('/admin/batch/:batchId', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Quản trị viên') {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }

    const { batchId } = req.params;
    const deleteAccounts = req.query.deleteAccounts === 'true' || req.query.deleteAccounts === true;

    const batch = await StudentBatch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ message: 'Không tìm thấy đợt học viên' });
    }

    let deletedAccountsCount = 0;
    if (deleteAccounts && Array.isArray(batch.students) && batch.students.length > 0) {
      const studentIds = batch.students.map(s => s.studentId).filter(Boolean);
      if (studentIds.length > 0) {
        const deleteResult = await User.deleteMany({ username: { $in: studentIds }, role: 'Sinh viên' });
        deletedAccountsCount = deleteResult.deletedCount || 0;
      }
    }

    await StudentBatch.findByIdAndDelete(batchId);

    res.status(200).json({
      message: deleteAccounts
        ? `Đã xóa đợt và ${deletedAccountsCount} tài khoản học viên liên quan.`
        : 'Đã xóa đợt học viên (không xóa tài khoản).',
      deletedAccounts: deletedAccountsCount
    });
  } catch (error) {
    console.error('Error deleting batch:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// xuất ra file excel danh sách học viên để tải danh sách về
app.get('/batch/:id/export', authenticateJWT, async (req, res) => {
  try {
    const batch = await StudentBatch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ message: 'Không tìm thấy đợt học viên' });
    }

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách học viên');

    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Mã học viên', key: 'studentId', width: 20 },
      { header: 'Họ và tên', key: 'fullName', width: 30 },
      { header: 'Ngày sinh', key: 'birthDate', width: 18 },
      { header: 'Khoa', key: 'faculty', width: 25 }, // Thêm cột Khoa
      { header: 'Ngành học', key: 'major', width: 25 },
    ];

    batch.students.forEach((student, idx) => {
      worksheet.addRow({
        stt: idx + 1,
        studentId: student.studentId,
        fullName: student.fullName,
        birthDate: student.birthDate ? new Date(student.birthDate).toLocaleDateString('vi-VN') : '',
        faculty: student.faculty || '',
        major: student.major
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="danh_sach_hoc_vien.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

app.get('/student/notifications', authenticateJWT, async (req, res) => {
  if (req.user.role !== 'Sinh viên') {
    return res.status(403).json({ message: 'Chỉ sinh viên mới xem được thông báo' });
  }
  const user = await User.findById(req.user._id);
  res.status(200).json(user.notifications || []);
});

app.get('/admin/batch-names', authenticateJWT, async (req, res) => {
  if (req.user.role !== 'Quản trị viên') {
    return res.status(403).json({ message: 'Không có quyền truy cập' });
  }
  const { year } = req.query;
  if (!year) return res.status(400).json({ message: 'Thiếu năm' });
  const regex = new RegExp(`^Đợt \\d+/${year}$`);
  const batches = await StudentBatch.find({ batchName: { $regex: regex } }).select('batchName');
  res.json(batches.map(b => b.batchName));
});



// Thêm học viên vào đợt (và tạo tài khoản nếu chưa có)
app.post('/admin/batch/:batchId/add-student', authenticateJWT, async (req, res) => {
  if (req.user.role !== 'Quản trị viên') return res.status(403).json({ message: 'Không có quyền truy cập' });
  const { batchId } = req.params;
  const { studentId, fullName, birthDate, major } = req.body;
  if (!studentId || !fullName || !major) return res.status(400).json({ message: 'Thiếu thông tin học viên' });

  const batch = await StudentBatch.findById(batchId);
  if (!batch) return res.status(404).json({ message: 'Không tìm thấy đợt học viên' });

  // Thêm vào danh sách đợt
  batch.students.push({ studentId, fullName, birthDate, major });
  await batch.save();

  // Tạo tài khoản nếu chưa có
  let user = await User.findOne({ username: studentId });
  if (!user) {
    const hashedPassword = await bcrypt.hash('123', 10);
    user = new User({
      username: studentId,
      password: hashedPassword,
      role: 'Sinh viên',
      studentInfo: { studentId, fullName, birthDate, major }
    });
    await user.save();
  }
  res.json({ message: 'Đã thêm học viên vào đợt', student: { studentId, fullName, birthDate, major } });
});

// Sửa thông tin học viên (không sửa mật khẩu)
// 1.
// app.put('/admin/student/:studentId', authenticateJWT, async (req, res) => {
//   if (req.user.role !== 'Quản trị viên') return res.status(403).json({ message: 'Không có quyền truy cập' });
//   const { studentId } = req.params;
//   const { fullName, birthDate, major } = req.body;
//   const user = await User.findOne({ username: studentId, role: 'Sinh viên' });
//   if (!user) return res.status(404).json({ message: 'Không tìm thấy học viên' });
//   if (fullName) user.studentInfo.fullName = fullName;
//   if (birthDate) user.studentInfo.birthDate = birthDate;
//   if (major) user.studentInfo.major = major;
//   await user.save();
//   res.json({ message: 'Đã cập nhật thông tin học viên', student: user.studentInfo });
// });
// 2.
app.put('/admin/student/:studentId', authenticateJWT, async (req, res) => {
  if (req.user.role !== 'Quản trị viên') {
    return res.status(403).json({ message: 'Không có quyền truy cập' });
  }

  const { studentId } = req.params; // Mã học viên cũ
  const { newStudentId, fullName, birthDate, major } = req.body;

  try {
    // Tìm user hiện tại
    const user = await User.findOne({ username: studentId, role: 'Sinh viên' });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy học viên' });
    }

    // Kiểm tra nếu muốn đổi mã học viên (username)
    if (newStudentId && newStudentId !== studentId) {
      // Kiểm tra mã học viên mới đã tồn tại chưa
      const existingUser = await User.findOne({ username: newStudentId });
      if (existingUser) {
        return res.status(400).json({ 
          message: 'Mã học viên mới đã tồn tại trong hệ thống' 
        });
      }

      // Cập nhật username
      user.username = newStudentId;
      user.studentInfo.studentId = newStudentId;

      // Cập nhật trong tất cả các batch
      await StudentBatch.updateMany(
        { 'students.studentId': studentId },
        { $set: { 'students.$[elem].studentId': newStudentId } },
        { arrayFilters: [{ 'elem.studentId': studentId }] }
      );

      // Cập nhật trong TopicProposal nếu có
      await TopicProposal.updateMany(
        { studentId: studentId },
        { $set: { studentId: newStudentId } }
      );
    }

    // Cập nhật các thông tin khác
    if (fullName) {
      user.studentInfo.fullName = fullName;
      
      // Cập nhật trong batch
      await StudentBatch.updateMany(
        { 'students.studentId': newStudentId || studentId },
        { $set: { 'students.$[elem].fullName': fullName } },
        { arrayFilters: [{ 'elem.studentId': newStudentId || studentId }] }
      );

      // Cập nhật trong TopicProposal
      await TopicProposal.updateMany(
        { studentId: newStudentId || studentId },
        { $set: { studentName: fullName } }
      );
    }

    if (birthDate) {
      user.studentInfo.birthDate = new Date(birthDate);
      
      // Cập nhật trong batch
      await StudentBatch.updateMany(
        { 'students.studentId': newStudentId || studentId },
        { $set: { 'students.$[elem].birthDate': new Date(birthDate) } },
        { arrayFilters: [{ 'elem.studentId': newStudentId || studentId }] }
      );
    }

    if (major) {
      user.studentInfo.major = major;
      
      // Cập nhật trong batch
      await StudentBatch.updateMany(
        { 'students.studentId': newStudentId || studentId },
        { $set: { 'students.$[elem].major': major } },
        { arrayFilters: [{ 'elem.studentId': newStudentId || studentId }] }
      );
    }

    await user.save();

    res.json({ 
      message: 'Đã cập nhật thông tin học viên thành công', 
      student: {
        studentId: user.studentInfo.studentId,
        fullName: user.studentInfo.fullName,
        birthDate: user.studentInfo.birthDate,
        major: user.studentInfo.major
      }
    });

  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ 
      message: 'Lỗi server', 
      error: error.message 
    });
  }
});


// Xóa học viên khỏi đợt, có thể xóa cả tài khoản
app.delete('/admin/batch/:batchId/student/:studentId', authenticateJWT, async (req, res) => {
  if (req.user.role !== 'Quản trị viên') return res.status(403).json({ message: 'Không có quyền truy cập' });
  const { batchId, studentId } = req.params;
  const { deleteAccount } = req.query;
  const batch = await StudentBatch.findById(batchId);
  if (!batch) return res.status(404).json({ message: 'Không tìm thấy đợt học viên' });

  batch.students = batch.students.filter(s => s.studentId !== studentId);
  await batch.save();

  let msg = 'Đã xóa học viên khỏi danh sách đợt';
  if (deleteAccount === 'true') {
    await User.deleteOne({ username: studentId, role: 'Sinh viên' });
    msg += ' và xóa tài khoản khỏi hệ thống';
  }
  res.json({ message: msg });
});

// Thêm giảng viên
app.post('/admin/faculty/:facultyName/add-lecturer', authenticateJWT, async (req, res) => {
  if (req.user.role !== 'Quản trị viên') return res.status(403).json({ message: 'Không có quyền truy cập' });
  const { facultyName } = req.params;
  const { email, fullName, department, position } = req.body;
  if (!email || !fullName) return res.status(400).json({ message: 'Thiếu thông tin giảng viên' });

  let user = await User.findOne({ username: email });
  if (user) return res.status(400).json({ message: 'Email đã tồn tại' });

  const hashedPassword = await bcrypt.hash('123', 10);
  user = new User({
    username: email,
    password: hashedPassword,
    role: 'Giảng viên',
    userInfo: { fullName, email, faculty: facultyName, department, position }
  });
  await user.save();
  res.json({ message: 'Đã thêm giảng viên', lecturer: user.userInfo });
});

// Sửa thông tin giảng viên
// 1.
// app.put('/admin/lecturer/:lecturerId', authenticateJWT, async (req, res) => {
//   if (req.user.role !== 'Quản trị viên') return res.status(403).json({ message: 'Không có quyền truy cập' });
//   const { lecturerId } = req.params;
//   const { fullName, department, position, faculty } = req.body;
//   const user = await User.findById(lecturerId);
//   if (!user || user.role !== 'Giảng viên') return res.status(404).json({ message: 'Không tìm thấy giảng viên' });
//   if (fullName) user.userInfo.fullName = fullName;
//   if (department) user.userInfo.department = department;
//   if (position) user.userInfo.position = position;
//   if (faculty) user.userInfo.faculty = faculty;
//   await user.save();
//   res.json({ message: 'Đã cập nhật thông tin giảng viên', lecturer: user.userInfo });
// });
// 2.
// app.put('/admin/lecturer/:lecturerId', authenticateJWT, async (req, res) => {
//   if (req.user.role !== 'Quản trị viên') 
//     return res.status(403).json({ message: 'Không có quyền truy cập' });
  
//   const { lecturerId } = req.params;
//   const { fullName, department, position, faculty, email, role, managedMajor } = req.body;
  
//   try {
//     const user = await User.findById(lecturerId);
//     if (!user || !['Giảng viên', 'Lãnh đạo bộ môn'].includes(user.role)) 
//       return res.status(404).json({ message: 'Không tìm thấy giảng viên/CNBM' });

//     // 1. Xử lý thay đổi email (username)
//     if (email && email !== user.username) {
//       const existingUser = await User.findOne({ username: email });
//       if (existingUser) {
//         return res.status(400).json({ message: 'Email đã tồn tại trong hệ thống' });
//       }
//       user.username = email;
//       if (user.userInfo) user.userInfo.email = email;
//     }

//     // 2. Xử lý thay đổi vai trò
//     if (role && role !== user.role) {
//       // Giảng viên → CNBM
//       if (user.role === 'Giảng viên' && role === 'Lãnh đạo bộ môn') {
//         // if (!managedMajor) {
//         //   return res.status(400).json({ 
//         //     message: 'Phải chỉ định ngành quản lý khi chuyển sang CNBM' 
//         //   });
//         // }
        
//         // Kiểm tra ngành đã có CNBM chưa
//         const existingHead = await User.findOne({
//           role: 'Lãnh đạo bộ môn',
//           managedMajor: managedMajor,
//           _id: { $ne: lecturerId }
//         });
        
//         if (existingHead) {
//           return res.status(400).json({
//             message: `Ngành "${managedMajor}" đã có CNBM khác`
//           });
//         }
        
//         user.role = 'Lãnh đạo bộ môn';
//         user.managedMajor = managedMajor;
//       } 
//       // CNBM → Giảng viên
//       else if (user.role === 'Lãnh đạo bộ môn' && role === 'Giảng viên') {
//         // Kiểm tra có đề tài đang chờ duyệt không
//         const pendingTopics = await TopicProposal.countDocuments({
//           headId: user._id,
//           status: 'waiting_head_approval'
//         });
        
//         if (pendingTopics > 0) {
//           return res.status(400).json({
//             message: `Không thể chuyển về Giảng viên vì còn ${pendingTopics} đề tài đang chờ duyệt`
//           });
//         }
        
//         user.role = 'Giảng viên';
//         user.managedMajor = undefined;
        
//         // Chuyển faculty từ managedMajor sang userInfo.faculty
//         if (!faculty && user.managedMajor) {
//           user.userInfo = user.userInfo || {};
//           user.userInfo.faculty = user.managedMajor;
//         }
//       }
//       else {
//         return res.status(400).json({ 
//           message: 'Chỉ hỗ trợ chuyển đổi giữa Giảng viên và CNBM' 
//         });
//       }
//     }

//     // 3. Cập nhật các thông tin khác
//     user.userInfo = user.userInfo || {};
//     if (fullName) user.userInfo.fullName = fullName;
//     if (department) user.userInfo.department = department;
//     if (position) user.userInfo.position = position;
//     if (faculty && user.role === 'Giảng viên') user.userInfo.faculty = faculty;
    
//     // Cập nhật managedMajor cho CNBM (nếu không đổi role nhưng đổi ngành)
//     if (user.role === 'Lãnh đạo bộ môn' && managedMajor && managedMajor !== user.managedMajor) {
//       const existingHead = await User.findOne({
//         role: 'Lãnh đạo bộ môn',
//         managedMajor: managedMajor,
//         _id: { $ne: lecturerId }
//       });
      
//       if (existingHead) {
//         return res.status(400).json({
//           message: `Ngành "${managedMajor}" đã có CNBM khác`
//         });
//       }
//       user.managedMajor = managedMajor;
//     }

//     await user.save();
    
//     res.json({ 
//       message: 'Đã cập nhật thông tin thành công', 
//       user: {
//         id: user._id,
//         username: user.username,
//         role: user.role,
//         userInfo: user.userInfo,
//         managedMajor: user.managedMajor
//       }
//     });
//   } catch (error) {
//     console.error('Error updating lecturer:', error);
//     res.status(500).json({ message: 'Lỗi server', error: error.message });
//   }
// });

// app.put('/admin/lecturer/:lecturerId', authenticateJWT, async (req, res) => {
//   if (req.user.role !== 'Quản trị viên')
//     return res.status(403).json({ message: 'Không có quyền truy cập' });

//   const { lecturerId } = req.params;
//   const { fullName, department, position, faculty, email, role, managedDepartment } = req.body;

//   try {
//     const user = await User.findById(lecturerId);
//     if (!user || !['Giảng viên', 'Lãnh đạo bộ môn'].includes(user.role))
//       return res.status(404).json({ message: 'Không tìm thấy giảng viên/LĐBM' });

//     // 1. Xử lý thay đổi email (username)
//     if (email && email !== user.username) {
//       const existingUser = await User.findOne({ username: email });
//       if (existingUser) {
//         return res.status(400).json({ message: 'Email đã tồn tại trong hệ thống' });
//       }
//       user.username = email;
//       if (user.userInfo) user.userInfo.email = email;
//     }

//     // 2. Xử lý thay đổi vai trò
//     if (role && role !== user.role) {
//       // Giảng viên → LĐBM
//       if (user.role === 'Giảng viên' && role === 'Lãnh đạo bộ môn') {
//         if (!managedDepartment) {
//           return res.status(400).json({
//             message: 'Phải chỉ định bộ môn/phòng thí nghiệm quản lý khi chuyển sang LĐBM'
//           });
//         }

//         // Kiểm tra bộ môn đã có LĐBM chưa
//         const existingHead = await User.findOne({
//           role: 'Lãnh đạo bộ môn',
//           managedDepartment: managedDepartment,
//           _id: { $ne: lecturerId }
//         });

//         if (existingHead) {
//           return res.status(400).json({
//             message: `Bộ môn/Phòng thí nghiệm "${managedDepartment}" đã có LĐBM khác`
//           });
//         }

//         user.role = 'Lãnh đạo bộ môn';
//         user.managedDepartment = managedDepartment;
//         // XÓA managedMajor nếu có
//         user.managedMajor = undefined;
//       }
//       // LĐBM → Giảng viên
//       else if (user.role === 'Lãnh đạo bộ môn' && role === 'Giảng viên') {
//         // Kiểm tra có đề tài đang chờ duyệt không
//         const pendingTopics = await TopicProposal.countDocuments({
//           headId: user._id,
//           status: 'waiting_head_approval'
//         });

//         if (pendingTopics > 0) {
//           return res.status(400).json({
//             message: `Không thể chuyển về Giảng viên vì còn ${pendingTopics} đề tài đang chờ duyệt`
//           });
//         }

//         user.role = 'Giảng viên';
//         user.managedDepartment = undefined;
//         user.managedMajor = undefined;
        
//         // Giữ lại department trong userInfo
//         if (!department && user.managedDepartment) {
//           user.userInfo = user.userInfo || {};
//           user.userInfo.department = user.managedDepartment;
//         }
//       }
//       else {
//         return res.status(400).json({
//           message: 'Chỉ hỗ trợ chuyển đổi giữa Giảng viên và LĐBM'
//         });
//       }
//     }

//     // 3. Cập nhật các thông tin khác
//     user.userInfo = user.userInfo || {};
//     if (fullName) user.userInfo.fullName = fullName;
//     if (department) user.userInfo.department = department;
//     if (position) user.userInfo.position = position;
//     if (faculty && user.role === 'Giảng viên') user.userInfo.faculty = faculty;

//     // Cập nhật managedDepartment cho LĐBM (nếu không đổi role nhưng đổi bộ môn)
//     if (user.role === 'Lãnh đạo bộ môn' && managedDepartment && managedDepartment !== user.managedDepartment) {
//       const existingHead = await User.findOne({
//         role: 'Lãnh đạo bộ môn',
//         managedDepartment: managedDepartment,
//         _id: { $ne: lecturerId }
//       });

//       if (existingHead) {
//         return res.status(400).json({
//           message: `Bộ môn/Phòng thí nghiệm "${managedDepartment}" đã có LĐBM khác`
//         });
//       }

//       user.managedDepartment = managedDepartment;
//     }

//     await user.save();

//     res.json({
//       message: 'Đã cập nhật thông tin thành công',
//       user: {
//         id: user._id,
//         username: user.username,
//         role: user.role,
//         userInfo: user.userInfo,
//         managedDepartment: user.managedDepartment
//       }
//     });
//   } catch (error) {
//     console.error('Error updating lecturer:', error);
//     res.status(500).json({ message: 'Lỗi server', error: error.message });
//   }
// });

app.put('/admin/lecturer/:lecturerId', authenticateJWT, async (req, res) => {
  if (req.user.role !== 'Quản trị viên')
    return res.status(403).json({ message: 'Không có quyền truy cập' });

  const { lecturerId } = req.params;
  const { fullName, department, position, faculty, email, role, managedDepartment } = req.body;

  try {
    const user = await User.findById(lecturerId);
    if (!user || !['Giảng viên', 'Lãnh đạo bộ môn', 'Chủ nhiệm bộ môn'].includes(user.role))
      return res.status(404).json({ message: 'Không tìm thấy giảng viên/LĐBM' });

    // 1. Xử lý thay đổi email (username)
    if (email && email !== user.username) {
      const existingUser = await User.findOne({ username: email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email đã tồn tại trong hệ thống' });
      }
      user.username = email;
      if (user.userInfo) user.userInfo.email = email;
    }

    // 2. Xử lý thay đổi vai trò
    if (role && role !== user.role && user.role !== 'Chủ nhiệm bộ môn') {
      // Giảng viên → LĐBM
      if (user.role === 'Giảng viên' && role === 'Lãnh đạo bộ môn') {
        const deptToManage = managedDepartment || department;
        
        if (!deptToManage) {
          return res.status(400).json({
            message: 'Phải chỉ định bộ môn/phòng thí nghiệm quản lý khi chuyển sang LĐBM'
          });
        }

        // Kiểm tra bộ môn đã có LĐBM chưa
        const existingHead = await User.findOne({
          role: { $in: ['Lãnh đạo bộ môn', 'Chủ nhiệm bộ môn'] },
          managedDepartment: deptToManage,
          _id: { $ne: lecturerId }
        });

        if (existingHead) {
          return res.status(400).json({
            message: `Bộ môn/Phòng thí nghiệm "${deptToManage}" đã có LĐBM khác: ${existingHead.userInfo?.fullName}`
          });
        }

        // Chuyển sang LĐBM
        user.role = 'Lãnh đạo bộ môn';
        user.managedDepartment = deptToManage;
        
        // GIỮ LẠI thông tin userInfo
        user.userInfo = user.userInfo || {};
        user.userInfo.department = deptToManage;
        if (faculty) user.userInfo.faculty = faculty;
        
        console.log(`✅ Chuyển GV → LĐBM: managedDepartment = ${deptToManage}`);
      }
      // LĐBM → Giảng viên
      else if (user.role === 'Lãnh đạo bộ môn' && role === 'Giảng viên') {
        // Kiểm tra có đề tài đang chờ duyệt không
        const pendingTopics = await TopicProposal.countDocuments({
          headId: user._id,
          status: 'waiting_head_approval'
        });

        if (pendingTopics > 0) {
          return res.status(400).json({
            message: `Không thể chuyển về Giảng viên vì còn ${pendingTopics} đề tài đang chờ duyệt`
          });
        }

        // Lưu lại thông tin bộ môn trước khi xóa managedDepartment
        const oldDepartment = user.managedDepartment;

        user.role = 'Giảng viên';
        user.managedDepartment = undefined;
        user.managedMajor = undefined;
        
        // GIỮ LẠI thông tin trong userInfo
        user.userInfo = user.userInfo || {};
        if (!user.userInfo.department && oldDepartment) {
          user.userInfo.department = oldDepartment;
        }
        if (department) user.userInfo.department = department;
        if (faculty) user.userInfo.faculty = faculty;
        
        console.log(`✅ Chuyển LĐBM → GV: Giữ department = ${user.userInfo.department}`);
      }
      else {
        return res.status(400).json({
          message: 'Chỉ hỗ trợ chuyển đổi giữa Giảng viên và LĐBM'
        });
      }
    }

    // 3. Cập nhật các thông tin khác (khi KHÔNG đổi role)
    user.userInfo = user.userInfo || {};
    if (fullName) user.userInfo.fullName = fullName;
    if (position) user.userInfo.position = position;
    
    // Cập nhật department và faculty tùy theo role
    if (user.role === 'Giảng viên') {
      if (department) user.userInfo.department = department;
      if (faculty) user.userInfo.faculty = faculty;
    } else if (user.role === 'Lãnh đạo bộ môn' || user.role === 'Chủ nhiệm bộ môn') {
      // Với LĐBM: đồng bộ department với managedDepartment
      if (managedDepartment && managedDepartment !== user.managedDepartment) {
        // Kiểm tra trùng
        const existingHead = await User.findOne({
          role: { $in: ['Lãnh đạo bộ môn', 'Chủ nhiệm bộ môn'] },
          managedDepartment: managedDepartment,
          _id: { $ne: lecturerId }
        });

        if (existingHead) {
          return res.status(400).json({
            message: `Bộ môn/Phòng thí nghiệm "${managedDepartment}" đã có LĐBM khác`
          });
        }

        user.managedDepartment = managedDepartment;
        user.userInfo.department = managedDepartment;
      }
      if (faculty) user.userInfo.faculty = faculty;
    }

    await user.save();

    res.json({
      message: 'Đã cập nhật thông tin thành công',
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        userInfo: user.userInfo,
        managedDepartment: user.managedDepartment
      }
    });
  } catch (error) {
    console.error('Error updating lecturer:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Xóa giảng viên
app.delete('/admin/lecturer/:lecturerId', authenticateJWT, async (req, res) => {
  if (req.user.role !== 'Quản trị viên') return res.status(403).json({ message: 'Không có quyền truy cập' });
  const { lecturerId } = req.params;
  const user = await User.findById(lecturerId);
  if (!user || user.role !== 'Giảng viên') return res.status(404).json({ message: 'Không tìm thấy giảng viên' });
  await User.findByIdAndDelete(lecturerId);
  res.json({ message: 'Đã xóa giảng viên khỏi hệ thống' });
});

// Thêm CNBM
// app.post('/admin/faculty/:facultyName/add-head', authenticateJWT, async (req, res) => {
//   if (req.user.role !== 'Quản trị viên') return res.status(403).json({ message: 'Không có quyền truy cập' });
//   const { facultyName } = req.params;
//   const { email, fullName } = req.body;
//   if (!email || !fullName) return res.status(400).json({ message: 'Thiếu thông tin Lãnh đạo bộ môn' });

//   let user = await User.findOne({ username: email });
//   if (user) return res.status(400).json({ message: 'Email đã tồn tại' });

//   // Kiểm tra đã có lãnh đạo bộ môn (bao gồm bản ghi legacy Chủ nhiệm bộ môn)
//   const existingHead = await User.findOne({
//     $or: [
//       { role: 'Lãnh đạo bộ môn', managedDepartment: facultyName },
//       // { role: 'Chủ nhiệm bộ môn', managedMajor: facultyName }
//     ]
//   });
//   if (existingHead) return res.status(400).json({ message: 'Khoa/Bộ môn đã có Lãnh đạo bộ môn' });

//   const hashedPassword = await bcrypt.hash('123', 10);
//   user = new User({
//     username: email,
//     password: hashedPassword,
//     role: 'Lãnh đạo bộ môn',
//     userInfo: { fullName, email, faculty: facultyName },
//     managedDepartment: facultyName
//   });
//   await user.save();
//   res.json({ message: 'Đã thêm Lãnh đạo bộ môn', head: user.userInfo });
// });

// API thêm LĐBM (FIXED VERSION)
// app.post('/admin/faculty/:facultyName/add-head', authenticateJWT, async (req, res) => {
//   if (req.user.role !== 'Quản trị viên') 
//     return res.status(403).json({ message: 'Không có quyền truy cập' });

//   const { facultyName } = req.params;
//   const { email, fullName, department } = req.body;

//   if (!email || !fullName || !department) 
//     return res.status(400).json({ message: 'Thiếu thông tin Lãnh đạo bộ môn (cần email, họ tên và bộ môn)' });

//   let user = await User.findOne({ username: email });
//   if (user) return res.status(400).json({ message: 'Email đã tồn tại' });

//   // Kiểm tra đã có lãnh đạo bộ môn cho department này chưa
//   const existingHead = await User.findOne({
//     role: 'Lãnh đạo bộ môn',
//     managedDepartment: department
//   });

//   if (existingHead) 
//     return res.status(400).json({ 
//       message: `Bộ môn/Phòng thí nghiệm "${department}" đã có Lãnh đạo bộ môn` 
//     });

//   const hashedPassword = await bcrypt.hash('123', 10);
//   user = new User({
//     username: email,
//     password: hashedPassword,
//     role: 'Lãnh đạo bộ môn',
//     userInfo: { 
//       fullName, 
//       email, 
//       faculty: facultyName,
//       department: department 
//     },
//     managedDepartment: department  // QUAN TRỌNG: Lưu vào managedDepartment
//   });

//   await user.save();
//   res.json({ message: 'Đã thêm Lãnh đạo bộ môn', head: user.userInfo });
// });

app.post('/admin/faculty/:facultyName/add-head', authenticateJWT, async (req, res) => {
  if (req.user.role !== 'Quản trị viên') 
    return res.status(403).json({ message: 'Không có quyền truy cập' });

  const { facultyName } = req.params;
  const { email, fullName, department } = req.body;

  if (!email || !fullName || !department) 
    return res.status(400).json({ 
      message: 'Thiếu thông tin Lãnh đạo bộ môn (cần email, họ tên và bộ môn/phòng thí nghiệm)' 
    });

  try {
    let user = await User.findOne({ username: email });
    if (user) return res.status(400).json({ message: 'Email đã tồn tại' });

    // Kiểm tra đã có lãnh đạo bộ môn cho department này chưa
    const existingHead = await User.findOne({
      role: { $in: ['Lãnh đạo bộ môn', 'Chủ nhiệm bộ môn'] },
      managedDepartment: department
    });

    if (existingHead) 
      return res.status(400).json({ 
        message: `Bộ môn/Phòng thí nghiệm "${department}" đã có Lãnh đạo bộ môn: ${existingHead.userInfo?.fullName}` 
      });

    const hashedPassword = await bcrypt.hash('123', 10);
    user = new User({
      username: email,
      password: hashedPassword,
      role: 'Lãnh đạo bộ môn',
      userInfo: { 
        fullName, 
        email, 
        faculty: facultyName,
        department: department 
      },
      managedDepartment: department  // QUAN TRỌNG: Lưu vào managedDepartment
    });

    await user.save();
    console.log(`✅ Tạo LĐBM mới: ${fullName}, managedDepartment = ${department}`);
    
    res.json({ 
      message: 'Đã thêm Lãnh đạo bộ môn', 
      head: user.userInfo 
    });
  } catch (error) {
    console.error('Error adding head:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Sửa thông tin CNBM
//1.
// app.put('/admin/head/:headId', authenticateJWT, async (req, res) => {
//   if (req.user.role !== 'Quản trị viên') return res.status(403).json({ message: 'Không có quyền truy cập' });
//   const { headId } = req.params;
//   const { fullName, managedMajor, email } = req.body;
//   const user = await User.findById(headId);
//   if (!user || user.role !== 'Chủ nhiệm bộ môn') return res.status(404).json({ message: 'Không tìm thấy CNBM' });
//   if (fullName) user.userInfo.fullName = fullName;
//   if (email) user.userInfo.email = email;
//   if (managedMajor) user.managedMajor = managedMajor;
//   await user.save();
//   res.json({ message: 'Đã cập nhật thông tin CNBM', head: user.userInfo });
// });
//2.
// Thay thế API sửa CNBM (đã tích hợp vào API trên, nhưng giữ lại để tương thích)
app.put('/admin/head/:headId', authenticateJWT, async (req, res) => {
  // Chuyển hướng sang API lecturer vì giờ xử lý chung
  req.params.lecturerId = req.params.headId;
  return app._router.handle(req, res);
});

// Xóa CNBM
app.delete('/admin/head/:headId', authenticateJWT, async (req, res) => {
  if (req.user.role !== 'Quản trị viên') return res.status(403).json({ message: 'Không có quyền truy cập' });
  const { headId } = req.params;
  const user = await User.findById(headId);
  if (!user || user.role !== 'Lãnh đạo bộ môn') return res.status(404).json({ message: 'Không tìm thấy LĐBM' });
  await User.findByIdAndDelete(headId);
  res.json({ message: 'Đã xóa LĐBM khỏi hệ thống' });
});

// API giảng viên phê duyệt/từ chối đề tài (chỉ GV hướng dẫn 1 có quyền)
app.put('/supervisor/review-topic/:id', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Giảng viên') {
      return res.status(403).json({ message: 'Chỉ giảng viên mới có quyền phê duyệt' });
    }

    const { status, comments, topicTitle, content, secondarySupervisor } = req.body;
    const proposalId = req.params.id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    const proposal = await TopicProposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ message: 'Không tìm thấy đề xuất' });
    }

    // Chỉ GV hướng dẫn 1 có quyền phê duyệt
    if (proposal.primarySupervisor !== req.user.username) {
      return res.status(403).json({ message: 'Chỉ giảng viên hướng dẫn 1 mới có quyền phê duyệt đề xuất này' });
    }

    // Cập nhật thông tin
    proposal.status = status;
    proposal.supervisorComments = comments;
    proposal.reviewedAt = new Date();
    proposal.reviewedBy = req.user._id;

    if (topicTitle) proposal.topicTitle = topicTitle;
    if (content) proposal.content = content;
    if (secondarySupervisor !== undefined) proposal.secondarySupervisor = secondarySupervisor;

    if (status === 'approved') {
      // Tìm Lãnh đạo bộ môn theo bộ môn/phòng thí nghiệm của giảng viên hướng dẫn 1
      const primary = await User.findOne({ username: proposal.primarySupervisor });
      const lecturerDept = primary?.userInfo?.department;
      if (lecturerDept) {
        const head = await User.findOne({
          role: 'Lãnh đạo bộ môn',
          managedDepartment: lecturerDept
        });
        if (head) {
          proposal.status = 'waiting_head_approval';
          proposal.headId = head._id;
        } else {
          return res.status(400).json({ message: 'Không tìm thấy lãnh đạo bộ môn phù hợp với bộ môn/phòng thí nghiệm của giảng viên hướng dẫn 1.' });
        }
      } else {
        return res.status(400).json({ message: 'Giảng viên hướng dẫn 1 chưa có thông tin bộ môn/phòng thí nghiệm.' });
      }
    }

    await proposal.save();

    const studentUser = await User.findOne({ 'studentInfo.studentId': proposal.studentId });
    if (studentUser) {
      let notifyMsg = '';
      if (status === 'approved') {
        notifyMsg = `Đề tài "${proposal.topicTitle}" của bạn đã được giảng viên phê duyệt.`;
      } else if (status === 'rejected') {
        notifyMsg = `Đề tài "${proposal.topicTitle}" của bạn đã bị từ chối.`;
      }
      studentUser.notifications = studentUser.notifications || [];
      studentUser.notifications.push({ message: notifyMsg, type: 'topic', createdAt: new Date(), read: false });
      await studentUser.save();
    }

    res.status(200).json({ message: `Đề tài đã được ${status === 'approved' ? 'phê duyệt' : 'từ chối'}`, proposal });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// API Lãnh đạo bộ môn xem các đề tài chờ duyệt
app.get('/head/topic-proposals', authenticateJWT, async (req, res) => {
  if (!['Lãnh đạo bộ môn', 'Chủ nhiệm bộ môn'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Chỉ Lãnh đạo bộ môn mới có quyền truy cập' });
  }
  const proposals = await TopicProposal.find({ headId: req.user._id, status: 'waiting_head_approval' });
  res.status(200).json(proposals);
});

// API Lãnh đạo bộ môn duyệt hoặc trả lại đề tài
app.put('/head/review-topic/:id', authenticateJWT, async (req, res) => {
  if (!['Lãnh đạo bộ môn', 'Chủ nhiệm bộ môn'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Chỉ Lãnh đạo bộ môn mới có quyền duyệt' });
  }
  const { status, comments } = req.body;
  if (!['approved_by_head', 'returned'].includes(status)) {
    return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
  }
  const proposal = await TopicProposal.findById(req.params.id);
  const studentUser = await User.findOne({ 'studentInfo.studentId': proposal.studentId });
  if (status === 'approved_by_head') {
    proposal.status = 'approved_by_head';
    proposal.headComments = comments;
    await proposal.save();
    if (studentUser) {
      studentUser.notifications = studentUser.notifications || [];
      studentUser.notifications.push({ message: `Đề tài "${proposal.topicTitle}" của bạn đã được Lãnh đạo bộ môn phê duyệt.`, type: 'topic', createdAt: new Date(), read: false });
      await studentUser.save();
    }
    res.status(200).json({ message: 'Đề tài đã được Lãnh đạo bộ môn phê duyệt', proposal });
  } else {
    if (studentUser) {
      studentUser.notifications = studentUser.notifications || [];
      studentUser.notifications.push({ message: `Đề tài "${proposal.topicTitle}" của bạn đã bị Lãnh đạo bộ môn trả lại.`, type: 'topic', createdAt: new Date(), read: false });
      await studentUser.save();
    }
    await proposal.deleteOne();
    res.status(200).json({ message: 'Đề tài đã bị trả lại và xóa khỏi hệ thống' });
  }
});

// API Lãnh đạo khoa xem các đề tài đã được Lãnh đạo bộ môn phê duyệt trong Khoa mình quản lý
app.get('/faculty-leader/topic-proposals', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Lãnh đạo khoa') {
      return res.status(403).json({ message: 'Chỉ Lãnh đạo khoa mới có quyền truy cập' });
    }

    const leader = await User.findById(req.user._id);
    const managedFaculty = leader.managedMajor; // theo yêu cầu: managedMajor đại diện cho Khoa mà lãnh đạo khoa quản lý

    if (!managedFaculty) {
      return res.status(400).json({ message: 'Chưa cấu hình Khoa quản lý cho Lãnh đạo khoa' });
    }

    // Lấy tất cả đề tài approved_by_head và head thuộc Khoa quản lý
    const proposals = await TopicProposal.find({ status: 'approved_by_head' })
      .populate('headId', 'userInfo.fullName userInfo.faculty managedDepartment')
      .sort({ submittedAt: -1 });

    const filtered = proposals.filter(p => p.headId && p.headId.userInfo && p.headId.userInfo.faculty === managedFaculty);

    res.status(200).json(filtered);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// API tạo đề xuất đề tài (thêm ràng buộc GV1 & GV2 cùng bộ môn và cùng Khoa với SV nếu có GV2)
app.post('/student/propose-topic', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Sinh viên') {
      return res.status(403).json({ message: 'Chỉ sinh viên mới có quyền đề xuất đề tài' });
    }

    const { topicTitle, content, primarySupervisor, secondarySupervisor } = req.body;
    if (!topicTitle || !content || !primarySupervisor) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }

    const student = await User.findById(req.user._id);
    const primary = await User.findOne({ username: primarySupervisor });
    const secondary = secondarySupervisor ? await User.findOne({ username: secondarySupervisor }) : null;

    // Ràng buộc bộ môn và khoa
    if (!primary || primary.role !== 'Giảng viên') {
      return res.status(400).json({ message: 'Giảng viên hướng dẫn 1 không hợp lệ' });
    }
    if (secondary) {
      if (secondary.role !== 'Giảng viên') {
        return res.status(400).json({ message: 'Giảng viên hướng dẫn 2 không hợp lệ' });
      }
      const sameDept = (primary.userInfo?.department || '') === (secondary.userInfo?.department || '');
      const sameFacultyWithStudent = (primary.userInfo?.faculty || '') === (student.studentInfo?.faculty || '') && (secondary.userInfo?.faculty || '') === (student.studentInfo?.faculty || '');
      if (!sameDept || !sameFacultyWithStudent) {
        return res.status(400).json({ message: 'GVHD 1 và 2 phải cùng bộ môn và cùng Khoa với học viên' });
      }
    } else {
      // Không có GVHD2: chỉ cần GVHD1 cùng Khoa với học viên
      if ((primary.userInfo?.faculty || '') !== (student.studentInfo?.faculty || '')) {
        return res.status(400).json({ message: 'GVHD 1 phải cùng Khoa với học viên' });
      }
    }

    const proposal = new TopicProposal({
      studentId: student.studentInfo?.studentId || student.username,
      studentName: student.studentInfo?.fullName || student.username,
      topicTitle,
      content,
      primarySupervisor,
      secondarySupervisor
    });

    await proposal.save();

    res.status(201).json({
      message: 'Đề xuất đề tài thành công',
      proposal: { id: proposal._id, topicTitle: proposal.topicTitle, status: proposal.status }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Calendar Schema cập nhật role
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  eventType: { type: String, required: true, enum: ['academic', 'thesis_defense', 'meeting', 'deadline', 'holiday', 'exam', 'other'] },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isAllDay: { type: Boolean, default: false },
  location: { type: String },
  visibility: { type: String, enum: ['public', 'major_only', 'role_only', 'private'], default: 'public' },
  targetRoles: [{ type: String, enum: ['Sinh viên', 'Giảng viên', 'Quản trị viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa', 'Chủ nhiệm bộ môn'] }],
  targetMajors: [String],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  relatedTopic: { type: mongoose.Schema.Types.ObjectId, ref: 'TopicProposal' },
  status: { type: String, enum: ['active', 'cancelled', 'completed'], default: 'active' },
  reminderMinutes: { type: Number, default: 60 },
  isRecurring: { type: Boolean, default: false },
  recurringPattern: {
    type: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'] },
    interval: { type: Number, default: 1 },
    endDate: Date,
    daysOfWeek: [Number],
    dayOfMonth: Number,
    month: Number
  }
});

const Event = mongoose.model('Event', eventSchema);

// API tạo sự kiện
app.post('/calendar/events', authenticateJWT, async (req, res) => {
  try {
    const {
      title, description, eventType, startDate, endDate, isAllDay,
      location, visibility, targetRoles, targetMajors, reminderMinutes,
      isRecurring, recurringPattern
    } = req.body;

    // Validation
    if (!title || !eventType || !startDate || !endDate) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ message: 'Thời gian bắt đầu không thể sau thời gian kết thúc' });
    }

    // Kiểm tra quyền tạo sự kiện
    if (req.user.role === 'Sinh viên' && visibility !== 'private') {
      return res.status(403).json({ message: 'Sinh viên chỉ có thể tạo sự kiện riêng tư' });
    }

    const event = new Event({
      title,
      description,
      eventType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isAllDay,
      location,
      visibility: visibility || 'public',
      targetRoles: targetRoles || [],
      targetMajors: targetMajors || [],
      createdBy: req.user._id,
      reminderMinutes: reminderMinutes || 60,
      isRecurring: isRecurring || false,
      recurringPattern: isRecurring ? recurringPattern : undefined
    });

    await event.save();

    const populatedEvent = await Event.findById(event._id)
      .populate('createdBy', 'username userInfo.fullName')
      .populate('relatedTopic', 'topicTitle studentName');

    res.status(201).json({
      message: 'Tạo sự kiện thành công',
      event: populatedEvent
    });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// API lấy danh sách sự kiện (với filter)
app.get('/calendar/events', authenticateJWT, async (req, res) => {
  try {
    const { startDate, endDate, eventType, major } = req.query;
    const user = await User.findById(req.user._id);

    // Build filter
    let filter = {
      status: 'active'
    };

    // Lọc theo thời gian
    if (startDate || endDate) {
      filter.$or = [];
      if (startDate && endDate) {
        filter.$or.push({
          $and: [
            { startDate: { $lte: new Date(endDate) } },
            { endDate: { $gte: new Date(startDate) } }
          ]
        });
      } else if (startDate) {
        filter.endDate = { $gte: new Date(startDate) };
      } else if (endDate) {
        filter.startDate = { $lte: new Date(endDate) };
      }
    }

    // Lọc theo loại sự kiện
    if (eventType) {
      filter.eventType = eventType;
    }

    // Lọc theo quyền truy cập
    const accessFilter = {
      $or: [
        { visibility: 'public' },
        { createdBy: req.user._id }, // Sự kiện do mình tạo
        { 
          visibility: 'role_only',
          targetRoles: { $in: [req.user.role === 'Chủ nhiệm bộ môn' ? 'Lãnh đạo bộ môn' : req.user.role] }
        }
      ]
    };

    // Thêm filter theo ngành cho sinh viên và CNBM
    if (req.user.role === 'Sinh viên' && user.studentInfo?.major) {
      accessFilter.$or.push({
        visibility: 'major_only',
        targetMajors: { $in: [user.studentInfo.major] }
      });
    } else if (['Lãnh đạo bộ môn', 'Chủ nhiệm bộ môn'].includes(req.user.role) && user.managedDepartment) {
      accessFilter.$or.push({
        visibility: 'major_only',
        targetMajors: { $in: [user.managedDepartment] }
      });
    }

    // Combine filters
    const finalFilter = {
      $and: [filter, accessFilter]
    };

    const events = await Event.find(finalFilter)
      .populate('createdBy', 'username userInfo.fullName studentInfo.fullName')
      .populate('relatedTopic', 'topicTitle studentName')
      .sort({ startDate: 1 });

    res.status(200).json(events);

  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// API cập nhật sự kiện
app.put('/calendar/events/:id', authenticateJWT, async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Không tìm thấy sự kiện' });
    }

    // Kiểm tra quyền chỉnh sửa
    const canEdit = (
      event.createdBy.equals(req.user._id) || 
      req.user.role === 'Quản trị viên'
    );

    if (!canEdit) {
      return res.status(403).json({ message: 'Không có quyền chỉnh sửa sự kiện này' });
    }

    const {
      title, description, eventType, startDate, endDate, isAllDay,
      location, visibility, targetRoles, targetMajors, status,
      reminderMinutes
    } = req.body;

    // Validation
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ message: 'Thời gian bắt đầu không thể sau thời gian kết thúc' });
    }

    // Update fields
    if (title) event.title = title;
    if (description !== undefined) event.description = description;
    if (eventType) event.eventType = eventType;
    if (startDate) event.startDate = new Date(startDate);
    if (endDate) event.endDate = new Date(endDate);
    if (isAllDay !== undefined) event.isAllDay = isAllDay;
    if (location !== undefined) event.location = location;
    if (visibility) event.visibility = visibility;
    if (targetRoles) event.targetRoles = targetRoles;
    if (targetMajors) event.targetMajors = targetMajors;
    if (status) event.status = status;
    if (reminderMinutes !== undefined) event.reminderMinutes = reminderMinutes;
    
    event.updatedAt = new Date();

    await event.save();

    const updatedEvent = await Event.findById(eventId)
      .populate('createdBy', 'username userInfo.fullName')
      .populate('relatedTopic', 'topicTitle studentName');

    res.status(200).json({
      message: 'Cập nhật sự kiện thành công',
      event: updatedEvent
    });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// API xóa sự kiện
app.delete('/calendar/events/:id', authenticateJWT, async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Không tìm thấy sự kiện' });
    }

    // Kiểm tra quyền xóa
    const canDelete = (
      event.createdBy.equals(req.user._id) || 
      req.user.role === 'Quản trị viên'
    );

    if (!canDelete) {
      return res.status(403).json({ message: 'Không có quyền xóa sự kiện này' });
    }

    await Event.findByIdAndDelete(eventId);

    res.status(200).json({ message: 'Xóa sự kiện thành công' });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// API thống kê sự kiện: cho admin và Lãnh đạo bộ môn
app.get('/calendar/statistics', authenticateJWT, async (req, res) => {
  try {
    if (!['Quản trị viên', 'Lãnh đạo bộ môn', 'Chủ nhiệm bộ môn'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    const statistics = await Event.aggregate([
      {
        $match: {
          startDate: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalEvents = await Event.countDocuments({
      startDate: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const upcomingEvents = await Event.countDocuments({
      startDate: { $gte: new Date() },
      status: 'active'
    });

    res.status(200).json({
      totalEventsThisMonth: totalEvents,
      upcomingEvents,
      eventsByType: statistics
    });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// API tự động tạo sự kiện từ deadline đề tài
app.post('/calendar/auto-create-topic-events', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Quản trị viên') {
      return res.status(403).json({ message: 'Chỉ admin mới có quyền tạo sự kiện tự động' });
    }

    const { title, deadlineDate, targetMajors, reminderDays = 7 } = req.body;

    if (!title || !deadlineDate) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }

    const event = new Event({
      title: `Hạn nộp: ${title}`,
      description: `Hạn cuối nộp ${title}`,
      eventType: 'deadline',
      startDate: new Date(deadlineDate),
      endDate: new Date(deadlineDate),
      isAllDay: true,
      visibility: 'major_only',
      targetMajors: targetMajors || [],
      targetRoles: ['Sinh viên'],
      createdBy: req.user._id,
      reminderMinutes: reminderDays * 24 * 60 // Convert days to minutes
    });

    await event.save();

    res.status(201).json({
      message: 'Tạo sự kiện deadline thành công',
      event
    });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Auth check endpoint for frontend to validate session
app.get('/auth/check', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const normalizedRole = user.role === 'Chủ nhiệm bộ môn' ? 'Lãnh đạo bộ môn' : user.role;
    const result = {
      username: user.username,
      role: normalizedRole,
    };

    if (normalizedRole === 'Sinh viên') {
      result.studentInfo = user.studentInfo || null;
    } else if (normalizedRole === 'Lãnh đạo bộ môn') {
      result.userInfo = user.userInfo || null;
      result.managedDepartment = user.managedDepartment || null;
    } else if (normalizedRole === 'Lãnh đạo khoa') {
      result.userInfo = user.userInfo || null;
      result.managedMajor = user.managedMajor || null;
    } else {
      result.userInfo = user.userInfo || null;
    }

    return res.status(200).json({ user: result });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Danh sách tất cả khoa/bộ môn (distinct theo userInfo.faculty)
app.get('/faculties', authenticateJWT, async (req, res) => {
  try {
    const faculties = await User.distinct('userInfo.faculty', { 'userInfo.faculty': { $ne: null, $ne: '' } });
    res.json(faculties.sort());
  } catch (error) {
    console.error('Error fetching faculties:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Danh sách thành viên trong một khoa/bộ môn
// app.get('/faculty/:facultyName/members', authenticateJWT, async (req, res) => {
//   // if (req.user.role !== 'Quản trị viên') return res.status(403).json({ message: 'Không có quyền truy cập' });
//   const { facultyName } = req.params;
//   try {
//     const lecturers = await User.find({ role: 'Giảng viên', 'userInfo.faculty': facultyName });
//     const heads = await User.find({
//       $or: [
//         { role: 'Lãnh đạo bộ môn', managedDepartment: facultyName },
//         { role: 'Chủ nhiệm bộ môn', managedMajor: facultyName }
//       ]
//     });

//     const normalizeHeadRole = (r) => r.role === 'Chủ nhiệm bộ môn' ? 'Lãnh đạo bộ môn' : r.role;

//     const members = [
//       ...lecturers.map(u => ({
//         _id: u._id,
//         email: u.userInfo.email,
//         fullName: u.userInfo.fullName,
//         department: u.userInfo.department,
//         position: u.userInfo.position,
//         role: u.role,
//         faculty: u.userInfo.faculty
//       })),
//       ...heads.map(u => ({
//         _id: u._id,
//         email: u.userInfo.email,
//         fullName: u.userInfo.fullName,
//         department: u.managedDepartment || u.managedMajor || '',
//         position: 'Lãnh đạo bộ môn',
//         role: normalizeHeadRole(u),
//         faculty: u.userInfo.faculty || u.managedDepartment || u.managedMajor
//       }))
//     ];
//     res.json(members);
//   } catch (error) {
//     console.error('Error fetching faculty members:', error);
//     res.status(500).json({ message: 'Lỗi server', error: error.message });
//   }
// });

app.get('/faculty/:facultyName/members', authenticateJWT, async (req, res) => {
  const { facultyName } = req.params;
  
  try {
    // Lấy giảng viên theo faculty
    const lecturers = await User.find({ 
      role: 'Giảng viên', 
      'userInfo.faculty': facultyName 
    });

    // Lấy LĐBM theo faculty (QUAN TRỌNG: tìm qua userInfo.faculty, KHÔNG phải managedDepartment)
    const heads = await User.find({
      role: { $in: ['Lãnh đạo bộ môn', 'Chủ nhiệm bộ môn'] },
      'userInfo.faculty': facultyName
    });

    console.log(`📋 Faculty ${facultyName}: ${lecturers.length} GV + ${heads.length} LĐBM`);

    const normalizeHeadRole = (r) => r.role === 'Chủ nhiệm bộ môn' ? 'Lãnh đạo bộ môn' : r.role;

    const members = [
      ...lecturers.map((u, idx) => ({
        stt: idx + 1,
        _id: u._id,
        email: u.userInfo?.email || u.username,
        fullName: u.userInfo?.fullName,
        department: u.userInfo?.department,
        position: u.userInfo?.position,
        role: u.role,
        faculty: u.userInfo?.faculty
      })),
      ...heads.map((u, idx) => ({
        stt: lecturers.length + idx + 1,
        _id: u._id,
        email: u.userInfo?.email || u.username,
        fullName: u.userInfo?.fullName,
        department: u.managedDepartment || u.userInfo?.department,
        position: u.userInfo?.position || 'Lãnh đạo bộ môn',
        role: normalizeHeadRole(u),
        faculty: u.userInfo?.faculty,
        managedDepartment: u.managedDepartment
      }))
    ];

    res.json(members);
  } catch (error) {
    console.error('Error fetching faculty members:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// API lấy danh sách giảng viên (cho autocomplete)
app.get('/supervisors', authenticateJWT, async (req, res) => {
  try {
    const supervisors = await User.find({ role: 'Giảng viên' }).select('username userInfo.fullName');
    const supervisorList = supervisors.map(supervisor => ({
      username: supervisor.username,
      fullName: supervisor.userInfo?.fullName || supervisor.username
    }));
    res.status(200).json(supervisorList);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// API lấy thông tin cá nhân sinh viên
app.get('/student/profile', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Sinh viên') {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }
    const user = await User.findById(req.user._id);
    if (!user || !user.studentInfo) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin sinh viên' });
    }
    res.json({
      studentId: user.studentInfo.studentId,
      fullName: user.studentInfo.fullName,
      faculty: user.studentInfo.faculty,
      major: user.studentInfo.major
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy thông tin sinh viên' });
  }
});

// API upload danh sách giảng viên từ file Excel
app.post('/admin/upload-lecturers', authenticateJWT, upload.single('excelFile'), async (req, res) => {
  if (req.user.role !== 'Quản trị viên') {
    return res.status(403).json({ message: 'Không có quyền truy cập' });
  }
  const faculty = req.body.faculty;
  const file = req.file;
  if (!faculty || !file) {
    return res.status(400).json({ message: 'Thiếu thông tin khoa hoặc file' });
  }
  try {
    const workbook = new exceljs.Workbook();
    await workbook.xlsx.readFile(file.path);
    const worksheet = workbook.getWorksheet(1);
    const createdLecturers = [];
    const errors = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // Bỏ qua header
        const stt = row.getCell(1).value;
        const fullName = row.getCell(2).value?.toString().trim();
        const email = row.getCell(3).value?.toString().trim().toLowerCase();
        const department = row.getCell(4).value?.toString().trim();
        const position = row.getCell(5).value?.toString().trim();
        if (!email || !fullName || !department) {
          errors.push(`Hàng ${rowNumber}: Thiếu thông tin`);
          return;
        }
        // Kiểm tra tồn tại
        createdLecturers.push({ fullName, email, department, position });
      }
    });
    // Tạo tài khoản giảng viên
    for (const lecturer of createdLecturers) {
      try {
        let user = await User.findOne({ username: lecturer.email });
        if (user) {
          errors.push(`Email đã tồn tại: ${lecturer.email}`);
          continue;
        }
        const hashedPassword = await bcrypt.hash('123', 10);
        user = new User({
          username: lecturer.email,
          password: hashedPassword,
          role: 'Giảng viên',
          userInfo: {
            fullName: lecturer.fullName,
            email: lecturer.email,
            faculty: faculty,
            department: lecturer.department,
            position: lecturer.position
          }
        });
        await user.save();
      } catch (err) {
        errors.push(`Lỗi tạo tài khoản cho ${lecturer.email}: ${err.message}`);
      }
    }
    fs.unlink(file.path, (err) => { if (err) console.error('Lỗi xóa file:', err); });
    res.status(201).json({
      message: 'Tải lên danh sách giảng viên hoàn tất',
      success: { total: createdLecturers.length - errors.length },
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    if (file && file.path) {
      fs.unlink(file.path, (err) => { if (err) console.error('Lỗi xóa file:', err); });
    }
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});
// API giảng viên xem đề xuất đề tài của sinh viên
app.get('/supervisor/topic-proposals', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Giảng viên') {
      return res.status(403).json({ message: 'Chỉ giảng viên mới có quyền truy cập' });
    }

    const proposals = await TopicProposal.find({
      $or: [
        { primarySupervisor: req.user.username },
        { secondarySupervisor: req.user.username }
      ]
    }).sort({ submittedAt: -1 });

    res.status(200).json(proposals);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// API đổi mật khẩu
app.post('/change-password', authenticateJWT, async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Mật khẩu mới và xác nhận không khớp.' });
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu cũ không đúng.' });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.status(200).json({ message: 'Đổi mật khẩu thành công.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// API LĐBM xem thống kê học viên và đề tài thuộc ngành quản lý
app.get('/head/students-statistics', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Lãnh đạo bộ môn') {
      return res.status(403).json({ message: 'Chỉ LĐBM mới có quyền truy cập' });
    }

    // Lấy thông tin LĐBM
    const head = await User.findById(req.user._id);
    if (!head || !head.managedDepartment) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin ngành quản lý' });
    }

    // Lấy danh sách học viên thuộc khoa
    const students = await User.find({ 
      role: 'Sinh viên',
      'studentInfo.department': head.managedDepartment 
    }).select('studentInfo');

    // Lấy danh sách đề tài của các học viên thuộc khoa
    const studentIds = students.map(student => student.studentInfo?.studentId).filter(Boolean);
    const topics = await TopicProposal.find({ 
      studentId: { $in: studentIds } 
    }).sort({ submittedAt: -1 });

    // Tạo map để ghép thông tin
    const topicsByStudent = {};
    topics.forEach(topic => {
      if (!topicsByStudent[topic.studentId]) {
        topicsByStudent[topic.studentId] = [];
      }
      topicsByStudent[topic.studentId].push(topic);
    });

    // Tạo danh sách kết quả
    const result = students.map(student => ({
      studentId: student.studentInfo?.studentId,
      fullName: student.studentInfo?.fullName,
      major: student.studentInfo?.major,
      topics: topicsByStudent[student.studentInfo?.studentId] || []
    }));

    // Thống kê tổng quan
    const statistics = {
      totalStudents: students.length,
      studentsWithTopics: result.filter(s => s.topics.length > 0).length,
      totalTopics: topics.length,
      topicsByStatus: {
        pending: topics.filter(t => t.status === 'pending').length,
        approved: topics.filter(t => t.status === 'approved').length,
        rejected: topics.filter(t => t.status === 'rejected').length,
        waiting_head_approval: topics.filter(t => t.status === 'waiting_head_approval').length,
        approved_by_head: topics.filter(t => t.status === 'approved_by_head').length
      }
    };

    res.status(200).json({
      major: head.managedMajor,
      statistics,
      students: result
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// API mới: Lấy danh sách tất cả bộ môn/phòng thí nghiệm theo khoa
app.get('/departments/by-faculty/:facultyName', authenticateJWT, async (req, res) => {
  try {
    const facultyName = req.params.facultyName;
    // Tìm tất cả user thuộc khoa này, lấy các bộ môn/phòng thí nghiệm duy nhất
    const members = await User.find({ 'userInfo.faculty': facultyName });
    const departments = Array.from(new Set(members.map(m => m.userInfo.department).filter(Boolean)));
    res.status(200).json({ departments });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// API mới: Kiểm tra lãnh đạo bộ môn phù hợp với bộ môn/phòng thí nghiệm
app.get('/check-head-for-department', authenticateJWT, async (req, res) => {
  try {
    const { department } = req.query;
    if (!department) {
      return res.status(400).json({ message: 'Thiếu thông tin bộ môn/phòng thí nghiệm' });
    }
    // Tìm lãnh đạo bộ môn có managedDepartment trùng với department
    const head = await User.findOne({ role: 'Lãnh đạo bộ môn', managedDepartment: department });
    if (head) {
      return res.status(200).json({ found: true, head: {
        id: head._id,
        email: head.username,
        fullName: head.userInfo?.fullName,
        managedDepartment: head.managedDepartment
      }});
    } else {
      return res.status(404).json({ found: false, message: 'Không tìm thấy lãnh đạo bộ môn phù hợp.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});




