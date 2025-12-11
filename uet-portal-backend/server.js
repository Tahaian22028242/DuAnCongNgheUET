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
import path from 'path';

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
  origin: 'http://localhost:3002',
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
    faculty: String, // khoa
    department: String, // bộ môn/phòng thí ng nghiệm
    position: String // chức vụ
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
  studentFaculty: { type: String }, // Khoa của học viên
  studentMajor: { type: String }, // Ngành của học viên
  topicTitle: { type: String, required: true },
  content: { type: String, required: true },
  primarySupervisor: { type: String, required: true },
  primarySupervisorName: { type: String }, // Tên GVHD chính
  secondarySupervisor: { type: String },
  secondarySupervisorName: { type: String }, // Tên GVHD phụ
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'waiting_head_approval', 'approved_by_head', 'waiting_faculty_leader_approval', 'approved_by_faculty_leader', 'rejected_by_head', 'rejected_by_faculty_leader'],
    default: 'pending'
  },
  supervisorComments: { type: String },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  headId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Lãnh đạo bộ môn
  headComments: { type: String },
  headReviewedAt: { type: Date },
  headCommentSavedAt: { type: Date },
  facultyLeaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Lãnh đạo khoa
  facultyLeaderComments: { type: String },
  facultyLeaderReviewedAt: { type: Date },
  // File đề cương
  outlineFiles: [{
    filename: String,
    originalName: String,
    path: String,
    uploadedBy: String, // 'student' hoặc 'supervisor'
    uploadedAt: { type: Date, default: Date.now },
    description: String
  }],
  outlineStatus: {
    type: String,
    enum: ['not_uploaded', 'pending_review', 'approved', 'rejected'],
    default: 'not_uploaded'
  },
  outlineComments: { type: String }, // Nhận xét của GVHD về file đề cương
  outlineReviewedAt: { type: Date }
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
    res.status(500).json({ message: 'Lỗi server khi đăng ký', error: error.message });
  }
});

// API: Học viên xóa đề xuất đề tài (chỉ khi đề tài chưa được duyệt)
app.delete('/student/delete-topic/:proposalId', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Sinh viên') {
      return res.status(403).json({ message: 'Chỉ học viên mới có quyền xóa đề xuất' });
    }

    const { proposalId } = req.params;
    const proposal = await TopicProposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ message: 'Không tìm thấy đề tài' });
    }

    const student = await User.findById(req.user._id);
    if (!student || !student.studentInfo || student.studentInfo.studentId !== proposal.studentId) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa đề tài này' });
    }

    // Chỉ cho phép xóa khi đề tài chưa được duyệt (các trạng thái có thể chỉnh sửa)
    const editableStatuses = ['pending', 'rejected', 'rejected_by_head', 'rejected_by_faculty_leader'];
    if (!editableStatuses.includes(proposal.status)) {
      return res.status(400).json({ message: 'Không thể xóa đề tài đã được phê duyệt hoặc đang chờ phê duyệt cấp cao hơn' });
    }

    // Xóa các file liên quan trên đĩa
    if (proposal.outlineFiles && proposal.outlineFiles.length > 0) {
      for (const f of proposal.outlineFiles) {
        try {
          if (f.path && fs.existsSync(f.path)) {
            fs.unlinkSync(f.path);
          }
        } catch (e) {
          console.error('Lỗi khi xóa file khi xóa đề tài:', f.path, e.message);
        }
      }
    }

    await TopicProposal.findByIdAndDelete(proposalId);

    res.json({ message: 'Đã xóa đề tài thành công' });
  } catch (error) {
    console.error('Error deleting proposal:', error);
    res.status(500).json({ message: 'Lỗi server khi xóa đề tài', error: error.message });
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
    res.status(500).json({ message: 'Lỗi server khi đăng nhập', error: error.message });
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

// Cấu hình multer riêng cho file đề cương (chỉ chấp nhận .pdf và .docx)
const outlineStorage = multer.diskStorage({
  destination: './uploads/outlines/',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const outlineUpload = multer({ 
  storage: outlineStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed',
      'image/png',
      'image/jpeg'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Định dạng file không được phép. Vui lòng tải lên file PDF, DOCX, TXT, ZIP, RAR, PNG hoặc JPEG.'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Tạo thư mục uploads/outlines nếu chưa tồn tại
const outlinesDir = './uploads/outlines';
if (!fs.existsSync(outlinesDir)) {
  fs.mkdirSync(outlinesDir, { recursive: true });
  console.log('✅ Created uploads/outlines directory');
}

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
    res.status(500).json({ message: 'Lỗi server khi tải lên danh sách học viên', error: error.message });
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
        res.status(500).json({ message: 'Lỗi server khi thêm lãnh đạo bộ môn', error: error.message });
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

    // Kiểm tra quyền truy cập - Cho phép Giảng viên, Lãnh đạo bộ môn, Lãnh đạo khoa
    if (['Quản trị viên', 'Giảng viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'].includes(req.user.role)) {
      allowedToView = true;
      // LĐBM chỉ được xem sinh viên thuộc ngành mình quản lý
      if (req.user.role === 'Lãnh đạo bộ môn') {
        const head = await User.findById(req.user._id);
        majorFilter = head.managedMajor;
      }
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
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách đợt học viên', error: error.message });
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
    res.status(500).json({ message: 'Lỗi server khi lấy thông tin đợt học viên', error: error.message });
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
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách Lãnh đạo bộ môn', error: error.message });
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
    res.status(500).json({ message: 'Lỗi server khi xóa Lãnh đạo bộ môn', error: error.message });
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
    res.status(500).json({ message: 'Lỗi server khi cập nhật thông tin Lãnh đạo bộ môn', error: error.message });
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
    res.status(500).json({ message: 'Lỗi server khi xóa đợt học viên', error: error.message });
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
    res.status(500).json({ message: 'Lỗi server khi xuất file danh sách học viên', error: error.message });
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
  const { studentId, fullName, birthDate, faculty, major } = req.body;
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

    if (faculty) {
      user.studentInfo.faculty = faculty;
      
      // Cập nhật trong batch
      await StudentBatch.updateMany(
        { 'students.studentId': newStudentId || studentId },
        { $set: { 'students.$[elem].faculty': faculty } },
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

    if (faculty) {
      user.studentInfo.faculty = faculty;

      // Cập nhật trong batch (trường faculty trong mảng students)
      await StudentBatch.updateMany(
        { 'students.studentId': newStudentId || studentId },
        { $set: { 'students.$[elem].faculty': faculty } },
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
      message: 'Lỗi server khi cập nhật thông tin học viên', 
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

app.put('/admin/lecturer/:lecturerId', authenticateJWT, async (req, res) => {
  if (req.user.role !== 'Quản trị viên')
    return res.status(403).json({ message: 'Không có quyền truy cập' });

  const { lecturerId } = req.params;
  const { fullName, department, position, faculty, email, role, managedDepartment } = req.body;

  try {
    const user = await User.findById(lecturerId);
    if (!user || !['Giảng viên', 'Lãnh đạo bộ môn', 'Chủ nhiệm bộ môn', 'Lãnh đạo khoa'].includes(user.role))
      return res.status(404).json({ message: 'Không tìm thấy thành viên' });

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
      // Giảng viên → Lãnh đạo khoa
      else if (user.role === 'Giảng viên' && role === 'Lãnh đạo khoa') {
        const facultyToManage = faculty || user.userInfo?.faculty;
        
        if (!facultyToManage) {
          return res.status(400).json({
            message: 'Không xác định được Khoa để quản lý'
          });
        }

        // Kiểm tra Khoa đã có Lãnh đạo khoa chưa
        const existingFacultyLeader = await User.findOne({
          role: 'Lãnh đạo khoa',
          'userInfo.faculty': facultyToManage,
          _id: { $ne: lecturerId }
        });

        if (existingFacultyLeader) {
          return res.status(400).json({
            message: `Khoa "${facultyToManage}" đã có Lãnh đạo khoa: ${existingFacultyLeader.userInfo?.fullName}`
          });
        }

        user.role = 'Lãnh đạo khoa';
        user.userInfo = user.userInfo || {};
        user.userInfo.faculty = facultyToManage;
        // Lãnh đạo khoa không cần managedDepartment
        user.managedDepartment = undefined;
        
        console.log(`✅ Chuyển GV → Lãnh đạo khoa: faculty = ${facultyToManage}`);
      }
      // LĐBM → Lãnh đạo khoa
      else if (user.role === 'Lãnh đạo bộ môn' && role === 'Lãnh đạo khoa') {
        // Kiểm tra có đề tài đang chờ LĐBM duyệt không
        const pendingTopics = await TopicProposal.countDocuments({
          headId: user._id,
          status: 'waiting_head_approval'
        });

        if (pendingTopics > 0) {
          return res.status(400).json({
            message: `Không thể chuyển sang Lãnh đạo khoa vì còn ${pendingTopics} đề tài đang chờ duyệt`
          });
        }

        const facultyToManage = faculty || user.userInfo?.faculty;
        if (!facultyToManage) {
          return res.status(400).json({
            message: 'Không xác định được Khoa để quản lý'
          });
        }

        // Kiểm tra Khoa đã có Lãnh đạo khoa chưa
        const existingFacultyLeader = await User.findOne({
          role: 'Lãnh đạo khoa',
          'userInfo.faculty': facultyToManage,
          _id: { $ne: lecturerId }
        });

        if (existingFacultyLeader) {
          return res.status(400).json({
            message: `Khoa "${facultyToManage}" đã có Lãnh đạo khoa: ${existingFacultyLeader.userInfo?.fullName}`
          });
        }

        user.role = 'Lãnh đạo khoa';
        user.managedDepartment = undefined; // Xóa quản lý bộ môn
        user.userInfo = user.userInfo || {};
        user.userInfo.faculty = facultyToManage;
        
        console.log(`✅ Chuyển LĐBM → Lãnh đạo khoa: faculty = ${facultyToManage}`);
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

        // Lưa lại thông tin bộ môn trước khi xóa managedDepartment
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
      // Lãnh đạo khoa → Giảng viên hoặc LĐBM
      else if (user.role === 'Lãnh đạo khoa' && (role === 'Giảng viên' || role === 'Lãnh đạo bộ môn')) {
        // Kiểm tra có đề tài đang chờ Lãnh đạo khoa duyệt không
        const pendingTopics = await TopicProposal.countDocuments({
          facultyLeaderId: user._id,
          status: 'waiting_faculty_leader_approval'
        });

        if (pendingTopics > 0) {
          return res.status(400).json({
            message: `Không thể chuyển vai trò vì còn ${pendingTopics} đề tài đang chờ duyệt`
          });
        }

        if (role === 'Giảng viên') {
          user.role = 'Giảng viên';
          user.managedDepartment = undefined;
          user.userInfo = user.userInfo || {};
          if (department) user.userInfo.department = department;
          if (faculty) user.userInfo.faculty = faculty;
          
          console.log(`✅ Chuyển Lãnh đạo khoa → GV`);
        } else if (role === 'Lãnh đạo bộ môn') {
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

          user.role = 'Lãnh đạo bộ môn';
          user.managedDepartment = deptToManage;
          user.userInfo = user.userInfo || {};
          user.userInfo.department = deptToManage;
          if (faculty) user.userInfo.faculty = faculty;
          
          console.log(`✅ Chuyển Lãnh đạo khoa → LĐBM: managedDepartment = ${deptToManage}`);
        }
      }
      else {
        return res.status(400).json({
          message: 'Không hỗ trợ chuyển đổi vai trò này'
        });
      }
    }

    // 3. Cập nhật các thông tin khác (khi KHÔNG đổi role)
    user.userInfo = user.userInfo || {};
    if (fullName) user.userInfo.fullName = fullName;
    if (position) user.userInfo.position = position;
    
    // Cập nhật department và faculty tùy theo role
    if (['Giảng viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'].includes(user.role)) {
      if (department) user.userInfo.department = department;
      if (faculty) user.userInfo.faculty = faculty;
    }
    
    if (user.role === 'Lãnh đạo bộ môn' || user.role === 'Chủ nhiệm bộ môn') {
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
    } else if (user.role === 'Lãnh đạo khoa') {
      // Lãnh đạo khoa chỉ quản lý khoa, không có department
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
    res.status(500).json({ message: 'Lỗi server khi cập nhật giảng viên', error: error.message });
  }
});

// Xóa giảng viên (bao gồm cả Lãnh đạo bộ môn, Lãnh đạo khoa)
app.delete('/admin/lecturer/:lecturerId', authenticateJWT, async (req, res) => {
  if (req.user.role !== 'Quản trị viên') return res.status(403).json({ message: 'Không có quyền truy cập' });
  const { lecturerId } = req.params;
  const user = await User.findById(lecturerId);
  if (!user || !['Giảng viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'].includes(user.role)) {
    return res.status(404).json({ message: 'Không tìm thấy giảng viên' });
  }
  await User.findByIdAndDelete(lecturerId);
  res.json({ message: 'Đã xóa giảng viên khỏi hệ thống' });
});

// API thêm LĐBM (FIXED VERSION)

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
    res.status(500).json({ message: 'Lỗi server khi thêm lãnh đạo bộ môn', error: error.message });
  }
});

// Sửa thông tin CNBM
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

// API giảng viên phê duyệt/từ chối đề tài (CẬP NHẬT)
app.put('/supervisor/review-topic/:id', authenticateJWT, async (req, res) => {
  try {
    // Cho phép Giảng viên, Lãnh đạo bộ môn và Lãnh đạo khoa
    if (!['Giảng viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Chỉ giảng viên mới có quyền phê duyệt đề tài' });
    }

    const { status, comments, topicTitle, content } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    const proposal = await TopicProposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ message: 'Không tìm thấy đề xuất' });
    }

    // Chỉ giảng viên hướng dẫn 1 mới được phê duyệt
    const lecturer = await User.findOne({ username: proposal.primarySupervisor });
    if (!lecturer || lecturer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'Chỉ giảng viên hướng dẫn chính mới có quyền phê duyệt đề tài' 
      });
    }

    proposal.status = status;
    proposal.supervisorComments = comments;
    proposal.reviewedAt = new Date();
    proposal.reviewedBy = req.user._id;

    if (topicTitle) proposal.topicTitle = topicTitle;
    if (content) proposal.content = content;

    if (status === 'approved') {
      // LẤY NGÀNH CỦA HỌC VIÊN
      const student = await User.findOne({ 'studentInfo.studentId': proposal.studentId });
      if (!student) {
        return res.status(404).json({ message: 'Không tìm thấy thông tin học viên' });
      }

      const studentMajor = student.studentInfo?.major;
      if (!studentMajor) {
        return res.status(400).json({ 
          message: 'Học viên chưa có thông tin ngành học' 
        });
      }

      // TÌM BỘ MÔN PHỤ TRÁCH NGÀNH NÀY
      const mapping = await DepartmentMajorMapping.findOne({ 
        majors: studentMajor 
      });

      if (!mapping) {
        return res.status(400).json({ 
          message: `Chưa có bộ môn/phòng thí nghiệm nào được cấu hình phụ trách ngành "${studentMajor}". Vui lòng liên hệ quản trị viên.` 
        });
      }

      // TÌM LÃNH ĐẠO BỘ MÔN CỦA BỘ MÔN ĐÓ
      const head = await User.findOne({ 
        role: { $in: ['Lãnh đạo bộ môn', 'Chủ nhiệm bộ môn'] },
        managedDepartment: mapping.department
      });

      if (!head) {
        return res.status(400).json({ 
          message: `Không tìm thấy lãnh đạo bộ môn phụ trách bộ môn "${mapping.department}" (quản lý ngành "${studentMajor}"). Vui lòng liên hệ quản trị viên.` 
        });
      }

      proposal.status = 'waiting_head_approval';
      proposal.headId = head._id;

      // Thông báo cho học viên
      if (student) {
        student.notifications = student.notifications || [];
        student.notifications.push({
          message: `Đề tài "${proposal.topicTitle}" đã được giảng viên hướng dẫn phê duyệt và đang chờ Lãnh đạo bộ môn xem xét.`,
          type: 'topic',
          createdAt: new Date(),
          read: false
        });
        await student.save();
      }

      // Thông báo cho LĐBM
      head.notifications = head.notifications || [];
      head.notifications.push({
        message: `Đề tài "${proposal.topicTitle}" của học viên ${proposal.studentName} (${proposal.studentId}) cần phê duyệt.`,
        type: 'topic',
        createdAt: new Date(),
        read: false
      });
      await head.save();
    } else {
      // Từ chối: thông báo cho học viên
      const student = await User.findOne({ 'studentInfo.studentId': proposal.studentId });
      if (student) {
        student.notifications = student.notifications || [];
        student.notifications.push({
          message: `Đề tài "${proposal.topicTitle}" đã bị từ chối bởi giảng viên hướng dẫn. Lý do: ${comments}`,
          type: 'topic',
          createdAt: new Date(),
          read: false
        });
        await student.save();
      }
    }

    await proposal.save();

    res.status(200).json({ 
      message: status === 'approved' 
        ? 'Đã phê duyệt đề tài và chuyển đến Lãnh đạo bộ môn' 
        : 'Đã từ chối đề tài',
      proposal 
    });

  } catch (error) {
    console.error('Error reviewing topic:', error);
    res.status(500).json({ message: 'Lỗi server khi duyệt đề tài bởi giảng viên hướng dẫn', error: error.message });
  }
});

// API Lãnh đạo bộ môn xem các đề tài chờ duyệt
app.get('/head/topic-proposals', authenticateJWT, async (req, res) => {
  try {
    if (!['Lãnh đạo bộ môn', 'Chủ nhiệm bộ môn'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Chỉ Lãnh đạo bộ môn mới có quyền truy cập' });
    }
    
    const head = await User.findById(req.user._id);
    if (!head || !head.managedDepartment) {
      return res.status(400).json({ message: 'Không tìm thấy thông tin bộ môn quản lý' });
    }
    
    // Tìm ánh xạ bộ môn -> ngành từ DepartmentMajorMapping
    const mapping = await DepartmentMajorMapping.findOne({ department: head.managedDepartment });
    
    let proposals = [];
    if (mapping && mapping.majors && mapping.majors.length > 0) {
      // Lấy đề tài chờ duyệt của các ngành thuộc bộ môn
      proposals = await TopicProposal.find({ 
        studentMajor: { $in: mapping.majors },
        status: 'waiting_head_approval' 
      });
      console.log(`📋 LĐBM "${head.managedDepartment}" có ${proposals.length} đề tài chờ duyệt từ các ngành: ${mapping.majors.join(', ')}`);
    } else {
      console.log(`⚠️ Không tìm thấy ánh xạ cho bộ môn "${head.managedDepartment}"`);
    }
    
    res.status(200).json(proposals);
  } catch (error) {
    console.error('Error fetching head proposals:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách đề tài chờ duyệt của lãnh đạo bộ môn', error: error.message });
  }
});

// API Lãnh đạo bộ môn duyệt hoặc từ chối đề tài
app.put('/head/review-topic/:id', authenticateJWT, async (req, res) => {
  try {
    if (!['Lãnh đạo bộ môn', 'Chủ nhiệm bộ môn'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Chỉ Lãnh đạo bộ môn mới có quyền duyệt' });
    }

    const { status, comments } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    const proposal = await TopicProposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ message: 'Không tìm thấy đề tài' });
    }

    const studentUser = await User.findOne({ 'studentInfo.studentId': proposal.studentId });

    if (status === 'approved') {
      // Tìm Lãnh đạo khoa cùng Khoa với học viên
      const facultyLeader = await User.findOne({
        role: 'Lãnh đạo khoa',
        'userInfo.faculty': proposal.studentFaculty
      });

      if (!facultyLeader) {
        return res.status(400).json({ 
          message: `Không tìm thấy Lãnh đạo khoa của Khoa "${proposal.studentFaculty}". Vui lòng liên hệ quản trị viên.` 
        });
      }

      proposal.status = 'waiting_faculty_leader_approval';
      proposal.headComments = comments;
      proposal.headReviewedAt = new Date();
      proposal.facultyLeaderId = facultyLeader._id;
      await proposal.save();

      // Thông báo cho học viên
      if (studentUser) {
        studentUser.notifications = studentUser.notifications || [];
        studentUser.notifications.push({ 
          message: `Đề tài "${proposal.topicTitle}" đã được Lãnh đạo bộ môn phê duyệt và đang chờ Lãnh đạo khoa xem xét.`, 
          type: 'topic', 
          createdAt: new Date(), 
          read: false 
        });
        await studentUser.save();
      }

      // Thông báo cho Lãnh đạo khoa
      facultyLeader.notifications = facultyLeader.notifications || [];
      facultyLeader.notifications.push({
        message: `Đề tài "${proposal.topicTitle}" của học viên ${proposal.studentName} (${proposal.studentId}) cần phê duyệt.`,
        type: 'topic',
        createdAt: new Date(),
        read: false
      });
      await facultyLeader.save();

      res.status(200).json({ 
        message: 'Đã phê duyệt đề tài và chuyển đến Lãnh đạo khoa', 
        proposal 
      });
    } else {
      // Từ chối
      proposal.status = 'rejected_by_head';
      proposal.headComments = comments;
      proposal.headReviewedAt = new Date();
      await proposal.save();

      if (studentUser) {
        studentUser.notifications = studentUser.notifications || [];
        studentUser.notifications.push({ 
          message: `Đề tài "${proposal.topicTitle}" đã bị Lãnh đạo bộ môn từ chối. Lý do: ${comments}`, 
          type: 'topic', 
          createdAt: new Date(), 
          read: false 
        });
        await studentUser.save();
      }

      res.status(200).json({ 
        message: 'Đã từ chối đề tài', 
        proposal 
      });
    }
  } catch (error) {
    console.error('Error reviewing topic by head:', error);
    res.status(500).json({ message: 'Lỗi server khi duyệt đề tài bởi lãnh đạo bộ môn', error: error.message });
  }
});

// API Lãnh đạo bộ môn lưu nhận xét tạm (draft) mà không thay đổi trạng thái
app.put('/head/save-comment/:id', authenticateJWT, async (req, res) => {
  try {
    if (!['Lãnh đạo bộ môn', 'Chủ nhiệm bộ môn'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Chỉ Lãnh đạo bộ môn mới có quyền' });
    }

    const { comments } = req.body;
    const proposal = await TopicProposal.findById(req.params.id);
    if (!proposal) return res.status(404).json({ message: 'Không tìm thấy đề tài' });

    // Không cho phép lưu nhận xét nếu đề tài đã ở trạng thái cuối (đã phê duyệt/từ chối)
    const finalStatuses = ['approved', 'approved_by_head', 'approved_by_faculty_leader', 'rejected', 'rejected_by_head', 'rejected_by_faculty_leader'];
    if (finalStatuses.includes(proposal.status)) {
      return res.status(400).json({ message: 'Không thể chỉnh sửa nhận xét khi đề tài đã được phê duyệt/từ chối' });
    }

    proposal.headComments = comments || '';
    // Do NOT change status or headReviewedAt here (this is just a draft save)
    // Record the draft-saved timestamp so frontend can show "Đã lưu nháp lúc"
    proposal.headCommentSavedAt = new Date();
    await proposal.save();
    res.status(200).json({ message: 'Đã lưu nhận xét tạm thời', proposal });
  } catch (error) {
    console.error('Error saving head comment:', error);
    res.status(500).json({ message: 'Lỗi server khi lưu nhận xét', error: error.message });
  }
});

// API Lãnh đạo khoa xem các đề tài đang chờ duyệt
app.get('/faculty-leader/topic-proposals', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Lãnh đạo khoa') {
      return res.status(403).json({ message: 'Chỉ Lãnh đạo khoa mới có quyền truy cập' });
    }

    // Lấy các đề tài đang chờ Lãnh đạo khoa duyệt (facultyLeaderId = current user)
    const proposals = await TopicProposal.find({ 
      facultyLeaderId: req.user._id, 
      status: 'waiting_faculty_leader_approval' 
    }).sort({ submittedAt: -1 });

    res.status(200).json(proposals);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách đề tài chờ duyệt của lãnh đạo khoa', error: error.message });
  }
});

// API Lãnh đạo khoa duyệt hoặc từ chối đề tài
app.put('/faculty-leader/review-topic/:id', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Lãnh đạo khoa') {
      return res.status(403).json({ message: 'Chỉ Lãnh đạo khoa mới có quyền duyệt' });
    }

    const { status, comments } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    const proposal = await TopicProposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ message: 'Không tìm thấy đề tài' });
    }

    // Kiểm tra quyền
    if (proposal.facultyLeaderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Bạn không có quyền duyệt đề tài này' });
    }

    const studentUser = await User.findOne({ 'studentInfo.studentId': proposal.studentId });

    if (status === 'approved') {
      proposal.status = 'approved_by_faculty_leader';
      proposal.facultyLeaderComments = comments;
      proposal.facultyLeaderReviewedAt = new Date();
      await proposal.save();

      // Thông báo cho học viên
      if (studentUser) {
        studentUser.notifications = studentUser.notifications || [];
        studentUser.notifications.push({ 
          message: `Đề tài "${proposal.topicTitle}" đã được Lãnh đạo khoa phê duyệt cuối cùng. Chúc mừng!`, 
          type: 'topic', 
          createdAt: new Date(), 
          read: false 
        });
        await studentUser.save();
      }

      res.status(200).json({ 
        message: 'Đã phê duyệt đề tài', 
        proposal 
      });
    } else {
      // Từ chối
      proposal.status = 'rejected_by_faculty_leader';
      proposal.facultyLeaderComments = comments;
      proposal.facultyLeaderReviewedAt = new Date();
      await proposal.save();

      if (studentUser) {
        studentUser.notifications = studentUser.notifications || [];
        studentUser.notifications.push({ 
          message: `Đề tài "${proposal.topicTitle}" đã bị Lãnh đạo khoa từ chối. Lý do: ${comments}`, 
          type: 'topic', 
          createdAt: new Date(), 
          read: false 
        });
        await studentUser.save();
      }

      res.status(200).json({ 
        message: 'Đã từ chối đề tài', 
        proposal 
      });
    }
  } catch (error) {
    console.error('Error reviewing topic by faculty leader:', error);
    res.status(500).json({ message: 'Lỗi server khi duyệt đề tài bởi lãnh đạo khoa', error: error.message });
  }
});

// API Lãnh đạo khoa xem TẤT CẢ đề tài trong khoa (Quản lý đề cương)
app.get('/faculty-leader/all-proposals', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Lãnh đạo khoa') {
      return res.status(403).json({ message: 'Chỉ Lãnh đạo khoa mới có quyền truy cập' });
    }

    const facultyName = req.user.userInfo?.faculty;
    if (!facultyName) {
      return res.status(400).json({ message: 'Không tìm thấy thông tin khoa' });
    }

    // Lấy TẤT CẢ đề tài của học viên trong khoa này
    const proposals = await TopicProposal.find({
      studentFaculty: facultyName
    }).sort({ submittedAt: -1 });

    // Tính thống kê
    const statistics = {
      totalProposals: proposals.length,
      approvedProposals: proposals.filter(p => 
        p.status === 'approved_by_faculty_leader'
      ).length,
      pendingProposals: proposals.filter(p => 
        ['pending', 'approved', 'waiting_head_approval', 'approved_by_head', 'waiting_faculty_leader_approval'].includes(p.status)
      ).length,
      rejectedProposals: proposals.filter(p => 
        ['rejected', 'rejected_by_head', 'rejected_by_faculty_leader'].includes(p.status)
      ).length
    };

    res.status(200).json({ proposals, statistics });
  } catch (error) {
    console.error('Error fetching all proposals for faculty leader:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy tất cả đề tài cho lãnh đạo khoa', error: error.message });
  }
});

// API cập nhật/gửi lại đề xuất đề tài (khi chưa được duyệt)
app.put('/student/resubmit-topic/:proposalId', authenticateJWT, outlineUpload.array('outlineFiles', 10), async (req, res) => {
  try {
    if (req.user.role !== 'Sinh viên') {
      return res.status(403).json({ message: 'Chỉ sinh viên mới có quyền cập nhật đề tài' });
    }

    const { proposalId } = req.params;
    const { topicTitle, content, primarySupervisor, secondarySupervisor } = req.body;

    const proposal = await TopicProposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ message: 'Không tìm thấy đề xuất' });
    }

    // Check ownership
    if (proposal.studentId !== req.user.studentInfo?.studentId && proposal.studentId !== req.user.username) {
      return res.status(403).json({ message: 'Bạn không có quyền cập nhật đề xuất này' });
    }

    // Chỉ cho phép cập nhật khi chưa được duyệt
    const editableStatuses = ['pending', 'rejected', 'rejected_by_head', 'rejected_by_faculty_leader'];
    if (!editableStatuses.includes(proposal.status)) {
      return res.status(400).json({ message: 'Đề tài đã được duyệt, không thể chỉnh sửa' });
    }

    if (!topicTitle || !content || !primarySupervisor) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }

    const student = await User.findById(req.user._id);
    const primary = await User.findOne({ username: primarySupervisor });
    const secondary = secondarySupervisor ? await User.findOne({ username: secondarySupervisor }) : null;

    // Ràng buộc bộ môn và khoa - cho phép Giảng viên, Lãnh đạo bộ môn, Lãnh đạo khoa
    if (!primary || !['Giảng viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'].includes(primary.role)) {
      return res.status(400).json({ message: 'Giảng viên hướng dẫn 1 không hợp lệ' });
    }
    if (secondary) {
      if (!['Giảng viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'].includes(secondary.role)) {
        return res.status(400).json({ message: 'Giảng viên hướng dẫn 2 không hợp lệ' });
      }
      const sameDept = (primary.userInfo?.department || '') === (secondary.userInfo?.department || '');
      const sameFacultyWithStudent = (primary.userInfo?.faculty || '') === (student.studentInfo?.faculty || '') && (secondary.userInfo?.faculty || '') === (student.studentInfo?.faculty || '');
      if (!sameDept || !sameFacultyWithStudent) {
        return res.status(400).json({ message: 'GVHD 1 và 2 phải cùng bộ môn và cùng Khoa với học viên' });
      }
    } else {
      if ((primary.userInfo?.faculty || '') !== (student.studentInfo?.faculty || '')) {
        return res.status(400).json({ message: 'GVHD 1 phải cùng Khoa với học viên' });
      }
    }

    // Update proposal
    proposal.topicTitle = topicTitle;
    proposal.content = content;
    proposal.primarySupervisor = primarySupervisor;
    proposal.primarySupervisorName = primary.userInfo?.fullName;
    proposal.secondarySupervisor = secondarySupervisor || '';
    proposal.secondarySupervisorName = secondary?.userInfo?.fullName || '';
    proposal.status = 'pending'; // Reset về pending
    proposal.supervisorComments = '';
    proposal.submittedAt = new Date();

    // Handle new files
    let addedFiles = [];
    let duplicateFiles = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      proposal.outlineFiles = proposal.outlineFiles || [];
      // Ensure file original names are unique per proposal (case-insensitive)
      const existingNames = new Set(proposal.outlineFiles.map(f => (f.originalName || f.filename || '').toString().trim().toLowerCase()));
      for (const f of req.files) {
        const orig = (f.originalname || f.filename || '').toString().trim();
        const key = orig.toLowerCase();
        if (existingNames.has(key)) {
          try { if (f.path && fs.existsSync(f.path)) fs.unlinkSync(f.path); } catch (e) { console.error('Error removing duplicate uploaded file:', f.path, e.message); }
          duplicateFiles.push(orig);
        } else {
          existingNames.add(key);
          const entry = {
            filename: f.filename,
            originalName: f.originalname,
            path: f.path,
            uploadedBy: 'student',
            uploadedAt: new Date()
          };
          proposal.outlineFiles.push(entry);
          addedFiles.push(entry);
        }
      }
      if (addedFiles.length > 0) proposal.outlineStatus = 'pending_review';
    }

    await proposal.save();

    // Send notifications
    primary.notifications = primary.notifications || [];
    primary.notifications.push({
      message: `Học viên ${proposal.studentName} (${proposal.studentId}) đã gửi lại đề cương "${proposal.topicTitle}" với bạn là GVHD chính.`,
      type: 'topic',
      createdAt: new Date(),
      read: false
    });
    await primary.save();

    if (secondary) {
      secondary.notifications = secondary.notifications || [];
      secondary.notifications.push({
        message: `Học viên ${proposal.studentName} (${proposal.studentId}) đã gửi lại đề cương "${proposal.topicTitle}" với bạn là GVHD phụ.`,
        type: 'topic',
        createdAt: new Date(),
        read: false
      });
      await secondary.save();
    }

    res.status(200).json({
      message: 'Cập nhật và gửi lại đề xuất thành công',
      proposal: { id: proposal._id, topicTitle: proposal.topicTitle, status: proposal.status },
      skippedFiles: duplicateFiles || []
    });
  } catch (error) {
    console.error('🚨 /student/resubmit-topic error:', error);
    res.status(500).json({ message: 'Lỗi server khi cập nhật đề xuất', error: error.message });
  }
});

// API tạo đề xuất đề tài (thêm ràng buộc GV1 & GV2 cùng bộ môn và cùng Khoa với SV nếu có GV2)
app.post('/student/propose-topic', authenticateJWT, outlineUpload.array('outlineFiles', 10), async (req, res) => {
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

    // Ràng buộc bộ môn và khoa - cho phép Giảng viên, Lãnh đạo bộ môn, Lãnh đạo khoa
    if (!primary || !['Giảng viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'].includes(primary.role)) {
      return res.status(400).json({ message: 'Giảng viên hướng dẫn 1 không hợp lệ' });
    }
    if (secondary) {
      if (!['Giảng viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'].includes(secondary.role)) {
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
        console.log('🚨 GVHD1 faculty:', primary.userInfo?.faculty, 'Student faculty:', student.studentInfo?.faculty);
        return res.status(400).json({ message: 'GVHD 1 phải cùng Khoa với học viên' });
      }
    }

    const proposal = new TopicProposal({
      studentId: student.studentInfo?.studentId || student.username,
      studentName: student.studentInfo?.fullName || student.username,
      studentFaculty: student.studentInfo?.faculty,
      studentMajor: student.studentInfo?.major,
      topicTitle,
      content,
      primarySupervisor,
      primarySupervisorName: primary.userInfo?.fullName,
      secondarySupervisor,
      secondarySupervisorName: secondary?.userInfo?.fullName
    });

    await proposal.save();

    // Nếu có files đính kèm (attachments), lưu metadata vào outlineFiles
    let addedFiles = [];
    let duplicateFiles = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      proposal.outlineFiles = proposal.outlineFiles || [];
      // Ensure file original names are unique per proposal (case-insensitive)
      const existingNames = new Set(proposal.outlineFiles.map(f => (f.originalName || f.filename || '').toString().trim().toLowerCase()));
      for (const f of req.files) {
        const orig = (f.originalname || f.filename || '').toString().trim();
        const key = orig.toLowerCase();
        if (existingNames.has(key)) {
          // remove the stored duplicate file to avoid keeping unnecessary copy
          try { if (f.path && fs.existsSync(f.path)) fs.unlinkSync(f.path); } catch (e) { console.error('Error removing duplicate uploaded file:', f.path, e.message); }
          duplicateFiles.push(orig);
        } else {
          existingNames.add(key);
          const entry = {
            filename: f.filename,
            originalName: f.originalname,
            path: f.path,
            uploadedBy: 'student',
            uploadedAt: new Date()
          };
          proposal.outlineFiles.push(entry);
          addedFiles.push(entry);
        }
      }
      if (addedFiles.length > 0) proposal.outlineStatus = 'pending_review';
      await proposal.save();
      console.log(`📎 Saved ${addedFiles.length} attachment(s) for proposal ${proposal._id}`);
      if (duplicateFiles.length > 0) console.log(`⚠️ Skipped ${duplicateFiles.length} duplicate file(s): ${duplicateFiles.join(', ')}`);
    }

    // Gửi thông báo cho cả 2 giảng viên
    primary.notifications = primary.notifications || [];
    primary.notifications.push({
      message: `Học viên ${proposal.studentName} (${proposal.studentId}) đã gửi đề cương "${proposal.topicTitle}" với bạn là GVHD chính.`,
      type: 'topic',
      createdAt: new Date(),
      read: false
    });
    await primary.save();

    if (secondary) {
      secondary.notifications = secondary.notifications || [];
      secondary.notifications.push({
        message: `Học viên ${proposal.studentName} (${proposal.studentId}) đã gửi đề cương "${proposal.topicTitle}" với bạn là GVHD phụ.`,
        type: 'topic',
        createdAt: new Date(),
        read: false
      });
      await secondary.save();
    }

    res.status(201).json({
      message: 'Đề xuất đề tài thành công',
      proposal: { id: proposal._id, topicTitle: proposal.topicTitle, status: proposal.status },
      skippedFiles: duplicateFiles || []
    });
  } catch (error) {
    // Detailed logging for debugging multipart / multer / request issues
    try {
      const details = {
        errorMessage: error && error.message,
        errorName: error && error.name,
        errorCode: error && error.code,
        stack: error && error.stack,
        route: req.originalUrl,
        method: req.method,
        headers: {
          'content-type': req.headers && req.headers['content-type'],
          'content-length': req.headers && req.headers['content-length']
        },
        bodyKeys: req.body ? Object.keys(req.body) : [],
        filesSummary: null,
        user: req.user ? { id: req.user._id, username: req.user.username, role: req.user.role } : null
      };

      if (req.files) {
        try {
          details.filesSummary = Array.isArray(req.files)
            ? req.files.map(f => ({ fieldname: f.fieldname, originalname: f.originalname, mimetype: f.mimetype, size: f.size }))
            : req.files;
        } catch (fErr) {
          details.filesSummary = `Error summarizing files: ${String(fErr)}`;
        }
      }

      console.error('🚨 /student/propose-topic error:', JSON.stringify(details, null, 2));
    } catch (logErr) {
      console.error('Failed to log /student/propose-topic error:', logErr);
    }

    res.status(500).json({ message: 'Lỗi server khi đề xuất đề tài', error: error.message });
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
    res.status(500).json({ message: 'Lỗi server khi tạo sự kiện', error: error.message });
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
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách sự kiện', error: error.message });
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
    res.status(500).json({ message: 'Lỗi server khi cập nhật sự kiện', error: error.message });
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
    res.status(500).json({ message: 'Lỗi server khi xóa sự kiện', error: error.message });
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
    res.status(500).json({ message: 'Lỗi server khi thống kê sự kiện', error: error.message });
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
    res.status(500).json({ message: 'Lỗi server khi tạo sự kiện deadline tự động', error: error.message });
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
    return res.status(500).json({ message: 'Lỗi server khi kiểm tra xác thực', error: error.message });
  }
});

// Danh sách tất cả khoa/bộ môn (distinct theo userInfo.faculty)
app.get('/faculties', authenticateJWT, async (req, res) => {
  try {
    const faculties = await User.distinct('userInfo.faculty', { 'userInfo.faculty': { $ne: null, $ne: '' } });
    res.json(faculties.sort());
  } catch (error) {
    console.error('Error fetching faculties:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách khoa/bộ môn', error: error.message });
  }
});

// API Xóa dữ liệu theo Khoa (Admin) - xóa các StudentBatch liên quan và (tùy chọn) xóa tài khoản người dùng thuộc khoa
app.delete('/admin/faculty/:facultyName', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Quản trị viên') {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }

    const { facultyName } = req.params;
    const deleteAccounts = req.query.deleteAccounts === 'true' || req.query.deleteAccounts === true;

    if (!facultyName) return res.status(400).json({ message: 'Thiếu tên Khoa' });

    // NOTE: Per admin request, this endpoint will NOT delete student batches.
    // It only removes lecturer user accounts when the admin chooses the delete option.
    let usersResult = { deletedCount: 0 };
    if (deleteAccounts) {
      // Delete only lecturer accounts (role === 'Giảng viên') that have userInfo.faculty matching the facultyName
      const usersFilter = {
        role: { $in: ['Giảng viên', 'Chủ nhiệm bộ môn', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'] },
        'userInfo.faculty': facultyName
      };
      usersResult = await User.deleteMany(usersFilter);
    }

    res.status(200).json({
      message: deleteAccounts
        ? `Đã xóa ${usersResult.deletedCount || 0} tài khoản giảng viên thuộc Khoa ${facultyName}.` 
        : `Không có thay đổi cho Khoa ${facultyName}. (StudentBatch không bị xóa)` ,
      usersDeleted: usersResult.deletedCount || 0
    });
  } catch (error) {
    console.error('Error deleting faculty data:', error);
    res.status(500).json({ message: 'Lỗi server khi xóa dữ liệu theo Khoa', error: error.message });
  }
});

// Danh sách thành viên trong một khoa/bộ môn
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

    // Lấy Lãnh đạo khoa theo faculty
    const facultyLeaders = await User.find({
      role: 'Lãnh đạo khoa',
      'userInfo.faculty': facultyName
    });

    console.log(`📋 Faculty ${facultyName}: ${lecturers.length} GV + ${heads.length} LĐBM + ${facultyLeaders.length} LĐKH`);

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
      })),
      ...facultyLeaders.map((u, idx) => ({
        stt: lecturers.length + heads.length + idx + 1,
        _id: u._id,
        email: u.userInfo?.email || u.username,
        fullName: u.userInfo?.fullName,
        department: u.userInfo?.department,
        position: u.userInfo?.position || 'Lãnh đạo khoa',
        role: u.role,
        faculty: u.userInfo?.faculty
      }))
    ];

    res.json(members);
  } catch (error) {
    console.error('Error fetching faculty members:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách thành viên trong khoa/bộ môn', error: error.message });
  }
});

// API lấy danh sách giảng viên (cho autocomplete) - bao gồm cả Lãnh đạo bộ môn và Lãnh đạo khoa
app.get('/supervisors', authenticateJWT, async (req, res) => {
  try {
    // Lấy tất cả Giảng viên, Lãnh đạo bộ môn và Lãnh đạo khoa
    const supervisors = await User.find({ 
      role: { $in: ['Giảng viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'] } 
    }).select('username userInfo.fullName');
    const supervisorList = supervisors.map(supervisor => ({
      username: supervisor.username,
      fullName: supervisor.userInfo?.fullName || supervisor.username
    }));
    res.status(200).json(supervisorList);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách giảng viên cho autocomplete', error: error.message });
  }
});

// API lấy thông tin người dùng chung (any authenticated user)
app.get('/profile', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin người dùng' });
    }

    const studentInfo = user.studentInfo || {};
    const userInfo = user.userInfo || {};

    res.json({
      username: user.username,
      role: user.role,
      userInfo,
      studentInfo,
      studentId: studentInfo.studentId || null,
      fullName: (studentInfo.fullName || userInfo.fullName || user.username),
      faculty: (studentInfo.faculty || userInfo.faculty || ''),
      major: (studentInfo.major || userInfo.major || '')
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy thông tin người dùng' });
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
    res.status(500).json({ message: 'Lỗi server khi tải lên danh sách giảng viên', error: error.message });
  }
});
// API giảng viên xem đề xuất đề tài của sinh viên
app.get('/supervisor/topic-proposals', authenticateJWT, async (req, res) => {
  try {
    // Cho phép Giảng viên, Lãnh đạo bộ môn và Lãnh đạo khoa
    if (!['Giảng viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'].includes(req.user.role)) {
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
    res.status(500).json({ message: 'Lỗi server khi lấy đề xuất đề tài cho giảng viên', error: error.message });
  }
});

// API lấy lưu trữ đề cương cho học viên
app.get('/student/topic-proposals-archive', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Sinh viên') {
      return res.status(403).json({ message: 'Chỉ sinh viên mới có quyền truy cập' });
    }

    // Lấy thông tin sinh viên từ database
    const student = await User.findById(req.user._id);
    if (!student || !student.studentInfo || !student.studentInfo.studentId) {
      return res.status(400).json({ message: 'Không tìm thấy thông tin sinh viên' });
    }

    const proposals = await TopicProposal.find({
      studentId: student.studentInfo.studentId
    }).sort({ submittedAt: -1 });

    console.log(`📚 Student ${student.studentInfo.studentId} has ${proposals.length} proposals in archive`);
    res.status(200).json(proposals);
  } catch (error) {
    console.error('Error fetching student proposals archive:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy lưu trữ đề cương cho sinh viên', error: error.message });
  }
});

// API lấy lưu trữ đề cương cho giảng viên
app.get('/supervisor/topic-proposals-archive', authenticateJWT, async (req, res) => {
  try {
    // Cho phép Giảng viên, Lãnh đạo bộ môn và Lãnh đạo khoa
    if (!['Giảng viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Chỉ giảng viên mới có quyền truy cập' });
    }

    const proposals = await TopicProposal.find({
      $or: [
        { primarySupervisor: req.user.username },
        { secondarySupervisor: req.user.username }
      ]
    }).sort({ submittedAt: -1 });

    console.log(`📚 Supervisor ${req.user.username} has ${proposals.length} proposals in archive`);
    res.status(200).json(proposals);
  } catch (error) {
    console.error('Error fetching supervisor proposals archive:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy lưu trữ đề cương cho giảng viên', error: error.message });
  }
});

// API lấy lưu trữ đề cương cho Lãnh đạo bộ môn
app.get('/head/topic-proposals-archive', authenticateJWT, async (req, res) => {
  try {
    console.log(`🔍 HEAD ARCHIVE - User role: ${req.user.role}, username: ${req.user.username}`);
    
    if (req.user.role !== 'Lãnh đạo bộ môn' && req.user.role !== 'Chủ nhiệm bộ môn') {
      console.log(`❌ ACCESS DENIED - Role không hợp lệ: ${req.user.role}`);
      return res.status(403).json({ message: 'Chỉ lãnh đạo bộ môn mới có quyền truy cập' });
    }

    // Lấy thông tin đầy đủ của LĐBM từ database
    const head = await User.findById(req.user._id);
    console.log(`📋 HEAD INFO - managedDepartment: ${head?.managedDepartment}, userInfo: ${JSON.stringify(head?.userInfo)}`);
    
    if (!head || !head.managedDepartment) {
      console.log(`❌ NO MANAGED DEPARTMENT - head exists: ${!!head}, managedDepartment: ${head?.managedDepartment}`);
      return res.status(400).json({ message: 'Không tìm thấy thông tin bộ môn quản lý' });
    }

    // Tìm ánh xạ bộ môn -> ngành từ DepartmentMajorMapping
    const mapping = await DepartmentMajorMapping.findOne({ department: head.managedDepartment });
    
    let proposals = [];
    if (mapping && mapping.majors && mapping.majors.length > 0) {
      // Lấy đề tài của các ngành thuộc bộ môn này
      console.log(`📚 Bộ môn "${head.managedDepartment}" quản lý các ngành: ${mapping.majors.join(', ')}`);
      
      proposals = await TopicProposal.find({
        studentMajor: { $in: mapping.majors },
        status: { 
          $in: [
            'approved_by_head', 
            'rejected_by_head', 
            'waiting_faculty_leader_approval', 
            'approved_by_faculty_leader', 
            'rejected_by_faculty_leader'
          ] 
        }
      }).sort({ submittedAt: -1 });
    } else {
      console.log(`⚠️ Không tìm thấy ánh xạ cho bộ môn "${head.managedDepartment}"`);
    }

    console.log(`📚 LĐBM ${req.user.username} (bộ môn: ${head.managedDepartment}) có ${proposals.length} đề tài trong lưu trữ`);
    res.status(200).json(proposals);
  } catch (error) {
    console.error('Error fetching head proposals archive:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy lưu trữ đề cương cho Lãnh đạo bộ môn', error: error.message });
  }
});

// API lấy lưu trữ đề cương cho Lãnh đạo khoa
app.get('/faculty-leader/topic-proposals-archive', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Lãnh đạo khoa') {
      return res.status(403).json({ message: 'Chỉ lãnh đạo khoa mới có quyền truy cập' });
    }

    // Lấy thông tin đầy đủ của Lãnh đạo khoa từ database
    const facultyLeader = await User.findById(req.user._id);
    if (!facultyLeader || !facultyLeader.userInfo || !facultyLeader.userInfo.faculty) {
      return res.status(400).json({ message: 'Không tìm thấy thông tin khoa quản lý' });
    }

    // Lấy các đề tài mà Lãnh đạo khoa đã duyệt/từ chối
    const proposals = await TopicProposal.find({
      studentFaculty: facultyLeader.userInfo.faculty,
      status: { 
        $in: ['approved_by_faculty_leader', 'rejected_by_faculty_leader']
      }
    }).sort({ submittedAt: -1 });

    console.log(`📚 Lãnh đạo khoa ${req.user.username} (khoa: ${facultyLeader.userInfo.faculty}) có ${proposals.length} đề tài trong lưu trữ`);
    res.status(200).json(proposals);
  } catch (error) {
    console.error('Error fetching faculty leader proposals archive:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy lưu trữ đề cương cho Lãnh đạo khoa', error: error.message });
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
    res.status(500).json({ message: 'Lỗi server khi đổi mật khẩu', error: error.message });
  }
});

// API LĐBM xem thống kê học viên và đề tài thuộc ngành quản lý
app.get('/head/students-statistics', authenticateJWT, async (req, res) => {
  try {
    console.log(`🔍 HEAD STATISTICS - User role: ${req.user.role}, username: ${req.user.username}`);
    
    if (req.user.role !== 'Lãnh đạo bộ môn' && req.user.role !== 'Chủ nhiệm bộ môn') {
      console.log(`❌ ACCESS DENIED - Role không hợp lệ: ${req.user.role}`);
      return res.status(403).json({ message: 'Chỉ LĐBM mới có quyền truy cập' });
    }

    // Lấy thông tin LĐBM
    const head = await User.findById(req.user._id);
    console.log(`📋 HEAD INFO - managedDepartment: ${head?.managedDepartment}, fullName: ${head?.userInfo?.fullName}`);
    
    if (!head || !head.managedDepartment) {
      console.log(`❌ NO MANAGED DEPARTMENT - head exists: ${!!head}, managedDepartment: ${head?.managedDepartment}`);
      return res.status(404).json({ message: 'Không tìm thấy thông tin bộ môn quản lý' });
    }

    console.log(`📊 LĐBM ${head.userInfo?.fullName} đang xem thống kê bộ môn: ${head.managedDepartment}`);

    // Tìm ánh xạ bộ môn -> ngành
    const mapping = await DepartmentMajorMapping.findOne({ department: head.managedDepartment });
    
    if (!mapping || !mapping.majors || mapping.majors.length === 0) {
      console.log(`⚠️ Không tìm thấy ánh xạ cho bộ môn "${head.managedDepartment}"`);
      return res.status(200).json({
        department: head.managedDepartment,
        majors: [],
        statistics: {
          totalStudents: 0,
          studentsWithTopics: 0,
          totalTopics: 0,
          topicsByStatus: {}
        },
        students: []
      });
    }

    console.log(`📚 Bộ môn "${head.managedDepartment}" quản lý các ngành: ${mapping.majors.join(', ')}`);

    // Lấy danh sách học viên thuộc các NGÀNH mà bộ môn quản lý
    const students = await User.find({ 
      role: 'Sinh viên',
      'studentInfo.major': { $in: mapping.majors }
    }).select('studentInfo');

    console.log(`📚 Tìm thấy ${students.length} học viên thuộc các ngành: ${mapping.majors.join(', ')}`);

    // Lấy danh sách đề tài của các học viên thuộc ngành
    const studentIds = students.map(student => student.studentInfo?.studentId).filter(Boolean);
    const topics = await TopicProposal.find({ 
      studentId: { $in: studentIds } 
    }).sort({ submittedAt: -1 });

    console.log(`📝 Tìm thấy ${topics.length} đề tài từ các học viên này`);

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
      faculty: student.studentInfo?.faculty,
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
        approved_by_head: topics.filter(t => t.status === 'approved_by_head').length,
        waiting_faculty_leader_approval: topics.filter(t => t.status === 'waiting_faculty_leader_approval').length,
        approved_by_faculty_leader: topics.filter(t => t.status === 'approved_by_faculty_leader').length,
        rejected_by_head: topics.filter(t => t.status === 'rejected_by_head').length,
        rejected_by_faculty_leader: topics.filter(t => t.status === 'rejected_by_faculty_leader').length
      }
    };

    console.log(`✅ Thống kê: ${statistics.totalStudents} học viên, ${statistics.totalTopics} đề tài`);

    res.status(200).json({
      department: head.managedDepartment,
      majors: mapping.majors,
      statistics,
      students: result
    });
  } catch (error) {
    console.error('❌ Error in /head/students-statistics:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy thống kê học viên', error: error.message });
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
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách bộ môn/phòng thí nghiệm', error: error.message });
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
    res.status(500).json({ message: 'Lỗi server khi kiểm tra lãnh đạo bộ môn', error: error.message });
  }
});

// Schema ánh xạ Bộ môn/Phòng thí nghiệm -> Ngành
const departmentMajorMappingSchema = new mongoose.Schema({
  department: { type: String, required: true, unique: true }, // Tên bộ môn/phòng thí nghiệm
  faculty: { type: String, required: true }, // Khoa quản lý
  majors: [{ type: String }], // Danh sách các ngành mà bộ môn này phụ trách
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const DepartmentMajorMapping = mongoose.model('DepartmentMajorMapping', departmentMajorMappingSchema);

// API lấy danh sách tất cả ánh xạ
app.get('/admin/department-major-mappings', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Quản trị viên') {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }

    const mappings = await DepartmentMajorMapping.find().sort({ department: 1 });
    res.json(mappings);
  } catch (error) {
    console.error('Error fetching mappings:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách ánh xạ', error: error.message });
  }
});

// API lấy danh sách các bộ môn và ngành hiện có trong hệ thống
app.get('/admin/available-departments-majors', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Quản trị viên') {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }

    // Lấy danh sách bộ môn từ giảng viên và lãnh đạo bộ môn
    const lecturers = await User.find({ 
      role: { $in: ['Giảng viên', 'Lãnh đạo bộ môn', 'Chủ nhiệm bộ môn'] },
      'userInfo.department': { $exists: true, $ne: '' }
    }).select('userInfo.department userInfo.faculty');

    const departments = Array.from(
      new Set(lecturers.map(l => l.userInfo?.department).filter(Boolean))
    ).map(dept => {
      const lecturer = lecturers.find(l => l.userInfo?.department === dept);
      return {
        department: dept,
        faculty: lecturer?.userInfo?.faculty || ''
      };
    });

    // Lấy danh sách ngành từ học viên
    const students = await User.find({ 
      role: 'Sinh viên',
      'studentInfo.major': { $exists: true, $ne: '' }
    }).select('studentInfo.major studentInfo.faculty');

    const majors = Array.from(
      new Set(students.map(s => s.studentInfo?.major).filter(Boolean))
    ).map(major => {
      const student = students.find(s => s.studentInfo?.major === major);
      return {
        major,
        faculty: student?.studentInfo?.faculty || ''
      };
    });

    res.json({ departments, majors });
  } catch (error) {
    console.error('Error fetching available data:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy dữ liệu có sẵn', error: error.message });
  }
});

// API tạo/cập nhật ánh xạ
app.post('/admin/department-major-mapping', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Quản trị viên') {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }

    const { department, faculty, majors } = req.body;

    if (!department || !faculty || !Array.isArray(majors)) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }

    // Kiểm tra xem ánh xạ đã tồn tại chưa
    let mapping = await DepartmentMajorMapping.findOne({ department });

    if (mapping) {
      // Cập nhật
      mapping.faculty = faculty;
      mapping.majors = majors;
      mapping.updatedAt = new Date();
      await mapping.save();
      res.json({ message: 'Đã cập nhật ánh xạ', mapping });
    } else {
      // Tạo mới
      mapping = new DepartmentMajorMapping({
        department,
        faculty,
        majors,
        createdBy: req.user._id
      });
      await mapping.save();
      res.status(201).json({ message: 'Đã tạo ánh xạ mới', mapping });
    }
  } catch (error) {
    console.error('Error creating/updating mapping:', error);
    res.status(500).json({ message: 'Lỗi server khi tạo/cập nhật ánh xạ', error: error.message });
  }
});

// API xóa ánh xạ
app.delete('/admin/department-major-mapping/:id', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Quản trị viên') {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }

    const { id } = req.params;
    await DepartmentMajorMapping.findByIdAndDelete(id);
    res.json({ message: 'Đã xóa ánh xạ' });
  } catch (error) {
    console.error('Error deleting mapping:', error);
    res.status(500).json({ message: 'Lỗi server khi xóa ánh xạ', error: error.message });
  }
});

// ==================== OUTLINE FILE UPLOAD APIs ====================

// API: Học viên upload file đề cương (chỉ khi đề tài đã được GVHD phê duyệt)
app.post('/student/upload-outline/:proposalId', authenticateJWT, outlineUpload.array('outlineFiles', 10), async (req, res) => {
  try {
    if (req.user.role !== 'Sinh viên') {
      return res.status(403).json({ message: 'Chỉ học viên mới có quyền upload đề cương' });
    }

    const { description } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'Vui lòng chọn ít nhất một file' });
    }

    const proposal = await TopicProposal.findById(req.params.proposalId);
    if (!proposal) {
      return res.status(404).json({ message: 'Không tìm thấy đề tài' });
    }

    // Kiểm tra xem học viên có phải là chủ đề tài không
    const student = await User.findById(req.user._id);
    if (proposal.studentId !== student.studentInfo.studentId) {
      return res.status(403).json({ message: 'Bạn không có quyền upload đề cương cho đề tài này' });
    }

    // Chỉ cho phép upload khi đề tài đã được GVHD phê duyệt (không còn pending hoặc rejected)
    if (proposal.status === 'pending') {
      return res.status(400).json({ message: 'Đề tài chưa được giảng viên hướng dẫn phê duyệt' });
    }

    if (proposal.status === 'rejected') {
      return res.status(400).json({ message: 'Đề tài đã bị từ chối, không thể upload đề cương' });
    }

    // Không cho phép upload lại nếu đã được phê duyệt
    if (proposal.outlineStatus === 'approved') {
      return res.status(400).json({ message: 'Đề cương đã được phê duyệt, không thể upload lại' });
    }

    // Thêm file vào danh sách
    const newFiles = files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      uploadedBy: 'student',
      uploadedAt: new Date(),
      description: description || ''
    }));

    proposal.outlineFiles = proposal.outlineFiles || [];
    proposal.outlineFiles.push(...newFiles);
    proposal.outlineStatus = 'pending_review';

    await proposal.save();

    // Thông báo cho cả 2 giảng viên hướng dẫn
    const primarySupervisor = await User.findOne({ username: proposal.primarySupervisor });
    if (primarySupervisor) {
      primarySupervisor.notifications = primarySupervisor.notifications || [];
      primarySupervisor.notifications.push({
        message: `Học viên ${proposal.studentName} (${proposal.studentId}) đã upload file đề cương cho đề tài "${proposal.topicTitle}"`,
        type: 'topic',
        createdAt: new Date(),
        read: false
      });
      await primarySupervisor.save();
    }

    if (proposal.secondarySupervisor) {
      const secondarySupervisor = await User.findOne({ username: proposal.secondarySupervisor });
      if (secondarySupervisor) {
        secondarySupervisor.notifications = secondarySupervisor.notifications || [];
        secondarySupervisor.notifications.push({
          message: `Học viên ${proposal.studentName} (${proposal.studentId}) đã upload file đề cương cho đề tài "${proposal.topicTitle}"`,
          type: 'topic',
          createdAt: new Date(),
          read: false
        });
        await secondarySupervisor.save();
      }
    }

    res.json({ 
      message: 'Upload file đề cương thành công',
      files: newFiles
    });

  } catch (error) {
    console.error('Error uploading outline:', error);
    res.status(500).json({ message: 'Lỗi server khi upload file đề cương', error: error.message });
  }
});

// API: GVHD chính chỉnh sửa file đề cương (upload thêm hoặc xóa file)
app.post('/supervisor/manage-outline/:proposalId', authenticateJWT, outlineUpload.array('outlineFiles', 10), async (req, res) => {
  try {
    // Cho phép Giảng viên, Lãnh đạo bộ môn và Lãnh đạo khoa
    if (!['Giảng viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Chỉ giảng viên mới có quyền chỉnh sửa đề cương' });
    }

    const { description, deleteFiles } = req.body;
    const files = req.files;
    
    const proposal = await TopicProposal.findById(req.params.proposalId);
    if (!proposal) {
      return res.status(404).json({ message: 'Không tìm thấy đề tài' });
    }

    // Chỉ GVHD chính mới được chỉnh sửa
    const lecturer = await User.findOne({ username: proposal.primarySupervisor });
    if (!lecturer || lecturer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Chỉ giảng viên hướng dẫn chính mới có quyền chỉnh sửa đề cương' });
    }

    // Không cho phép chỉnh sửa nếu đã phê duyệt outline
    if (proposal.outlineStatus === 'approved') {
      return res.status(400).json({ message: 'Đề cương đã được phê duyệt, không thể chỉnh sửa' });
    }

    // Xóa file nếu có (và xóa file vật lý trên đĩa)
    const deletedFiles = [];
    if (deleteFiles) {
      const filesToDelete = JSON.parse(deleteFiles);
      for (const filename of filesToDelete) {
        const idx = proposal.outlineFiles.findIndex(f => f.filename === filename);
        if (idx !== -1) {
          const fileEntry = proposal.outlineFiles[idx];
          try { if (fileEntry.path && fs.existsSync(fileEntry.path)) fs.unlinkSync(fileEntry.path); } catch (e) { console.error('Error deleting file from disk:', fileEntry.path, e.message); }
          proposal.outlineFiles.splice(idx, 1);
          deletedFiles.push(filename);
        }
      }
      // If no files remain, set status back to not_uploaded
      if (!proposal.outlineFiles || proposal.outlineFiles.length === 0) {
        proposal.outlineStatus = 'not_uploaded';
      }
    }

    // Thêm file mới (và đảm bảo tên file gốc là duy nhất trong đề tài)
    let addedFiles = [];
    let duplicateFiles = [];
    if (files && files.length > 0) {
      proposal.outlineFiles = proposal.outlineFiles || [];
      const existingNames = new Set(proposal.outlineFiles.map(f => (f.originalName || f.filename || '').toString().trim().toLowerCase()));
      addedFiles = [];
      duplicateFiles = [];
      for (const file of files) {
        const orig = (file.originalname || file.filename || '').toString().trim();
        const key = orig.toLowerCase();
        if (existingNames.has(key)) {
          // remove stored duplicate file
          try { if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch (e) { console.error('Error removing duplicate uploaded file:', file.path, e.message); }
          duplicateFiles.push(orig);
        } else {
          existingNames.add(key);
          const entry = {
            filename: file.filename,
            originalName: file.originalname,
            path: file.path,
            uploadedBy: 'supervisor',
            uploadedAt: new Date(),
            description: description || ''
          };
          proposal.outlineFiles.push(entry);
          addedFiles.push(entry);
        }
      }
      if (addedFiles.length > 0) {
        proposal.outlineStatus = 'pending_review';
      }
      if (duplicateFiles.length > 0) console.log(`⚠️ Skipped ${duplicateFiles.length} duplicate file(s) from supervisor upload: ${duplicateFiles.join(', ')}`);
    }

    await proposal.save();

    res.json({ 
      message: 'Cập nhật file đề cương thành công',
      outlineFiles: proposal.outlineFiles,
      addedFiles,
      skippedFiles: duplicateFiles || [],
      deletedFiles
    });

  } catch (error) {
    console.error('Error managing outline:', error);
    res.status(500).json({ message: 'Lỗi server khi quản lý file đề cương', error: error.message });
  }
});

// API: GVHD chính phê duyệt/từ chối file đề cương
app.put('/supervisor/review-outline/:proposalId', authenticateJWT, async (req, res) => {
  try {
    // Cho phép Giảng viên, Lãnh đạo bộ môn và Lãnh đạo khoa
    if (!['Giảng viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Chỉ giảng viên mới có quyền phê duyệt đề cương' });
    }

    const { status, comments } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    const proposal = await TopicProposal.findById(req.params.proposalId);
    if (!proposal) {
      return res.status(404).json({ message: 'Không tìm thấy đề tài' });
    }

    // Chỉ GVHD chính mới được phê duyệt
    const lecturer = await User.findOne({ username: proposal.primarySupervisor });
    if (!lecturer || lecturer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Chỉ giảng viên hướng dẫn chính mới có quyền phê duyệt đề cương' });
    }

    proposal.outlineStatus = status;
    proposal.outlineComments = comments;
    proposal.outlineReviewedAt = new Date();

    await proposal.save();

    // Thông báo cho học viên
    const student = await User.findOne({ 'studentInfo.studentId': proposal.studentId });
    if (student) {
      student.notifications = student.notifications || [];
      const message = status === 'approved' 
        ? `File đề cương của đề tài "${proposal.topicTitle}" đã được giảng viên hướng dẫn phê duyệt`
        : `File đề cương của đề tài "${proposal.topicTitle}" bị từ chối. Lý do: ${comments}. Vui lòng tải lại file mới.`;
      
      student.notifications.push({
        message,
        type: 'topic',
        createdAt: new Date(),
        read: false
      });
      await student.save();
    }

    // Nếu phê duyệt, thông báo cho LĐBM và Lãnh đạo khoa (nếu đề tài đã được phê duyệt)
    if (status === 'approved') {
      // Thông báo cho LĐBM
      if (proposal.headId) {
        const head = await User.findById(proposal.headId);
        if (head) {
          head.notifications = head.notifications || [];
          head.notifications.push({
            message: `File đề cương của đề tài "${proposal.topicTitle}" (học viên: ${proposal.studentName}) đã được GVHD phê duyệt và sẵn sàng để xem`,
            type: 'topic',
            createdAt: new Date(),
            read: false
          });
          await head.save();
        }
      }

      // Thông báo cho Lãnh đạo khoa
      if (proposal.facultyLeaderId) {
        const facultyLeader = await User.findById(proposal.facultyLeaderId);
        if (facultyLeader) {
          facultyLeader.notifications = facultyLeader.notifications || [];
          facultyLeader.notifications.push({
            message: `File đề cương của đề tài "${proposal.topicTitle}" (học viên: ${proposal.studentName}) đã được GVHD phê duyệt và sẵn sàng để xem`,
            type: 'topic',
            createdAt: new Date(),
            read: false
          });
          await facultyLeader.save();
        }
      }
    }

    res.json({ 
      message: `Đề cương đã được ${status === 'approved' ? 'phê duyệt' : 'từ chối'}`,
      outlineStatus: proposal.outlineStatus
    });

  } catch (error) {
    console.error('Error reviewing outline:', error);
    res.status(500).json({ message: 'Lỗi server khi phê duyệt đề cương', error: error.message });
  }
});

// API: Download file đề cương
// API: View file đề cương inline (for browser preview)
app.get('/view-outline/:proposalId/:filename', authenticateJWT, async (req, res) => {
  try {
    const { proposalId, filename } = req.params;

    const proposal = await TopicProposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ message: 'Không tìm thấy đề tài' });
    }

    // Quyền truy cập giống với download
    const student = await User.findById(req.user._id);
    const isStudent = req.user.role === 'Sinh viên' && student?.studentInfo?.studentId === proposal.studentId;
    const isPrimarySupervisor = ['Giảng viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'].includes(req.user.role) && req.user.username === proposal.primarySupervisor;
    const isSecondarySupervisor = ['Giảng viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'].includes(req.user.role) && req.user.username === proposal.secondarySupervisor;
    const isHead = req.user.role === 'Lãnh đạo bộ môn' /*&& proposal.outlineStatus === 'approved'*/;
    const isFacultyLeader = req.user.role === 'Lãnh đạo khoa' /*&& proposal.outlineStatus === 'approved'*/;

    if (!isStudent && !isPrimarySupervisor && !isSecondarySupervisor && !isHead && !isFacultyLeader) {
      return res.status(403).json({ message: 'Bạn không có quyền xem file này' });
    }

    const file = proposal.outlineFiles.find(f => f.filename === filename);
    if (!file) {
      return res.status(404).json({ message: 'Không tìm thấy file' });
    }

    const absolutePath = path.resolve(file.path);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: 'File không tồn tại trên máy chủ' });
    }

    // Set inline disposition so browser attempts to preview
    res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
    return res.sendFile(absolutePath);
  } catch (error) {
    console.error('Error viewing outline:', error);
    return res.status(500).json({ message: 'Lỗi server khi xem file', error: error.message });
  }
});

app.get('/download-outline/:proposalId/:filename', authenticateJWT, async (req, res) => {
  try {
    const { proposalId, filename } = req.params;

    const proposal = await TopicProposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ message: 'Không tìm thấy đề tài' });
    }

    // Kiểm tra quyền truy cập
    const student = await User.findById(req.user._id);
    const isStudent = req.user.role === 'Sinh viên' && student.studentInfo.studentId === proposal.studentId;
    // Cho phép Giảng viên, Lãnh đạo bộ môn, Lãnh đạo khoa là GVHD
    const isPrimarySupervisor = ['Giảng viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'].includes(req.user.role) && req.user.username === proposal.primarySupervisor;
    const isSecondarySupervisor = ['Giảng viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'].includes(req.user.role) && req.user.username === proposal.secondarySupervisor;
    
    // LĐBM và Lãnh đạo khoa chỉ được xem khi outline đã được GVHD phê duyệt
    const isHead = req.user.role === 'Lãnh đạo bộ môn' /*&& proposal.outlineStatus === 'approved'*/;
    const isFacultyLeader = req.user.role === 'Lãnh đạo khoa' /*&& proposal.outlineStatus === 'approved'*/;

    if (!isStudent && !isPrimarySupervisor && !isSecondarySupervisor && !isHead && !isFacultyLeader) {
      return res.status(403).json({ message: 'Bạn không có quyền tải file này' });
    }

    const file = proposal.outlineFiles.find(f => f.filename === filename);
    if (!file) {
      return res.status(404).json({ message: 'Không tìm thấy file' });
    }

    res.download(file.path, file.originalName);

  } catch (error) {
    console.error('Error downloading outline:', error);
    res.status(500).json({ message: 'Lỗi server khi tải file', error: error.message });
  }
});

// API: Xóa file đề cương (chỉ người upload hoặc GVHD chính)
app.delete('/delete-outline/:proposalId/:filename', authenticateJWT, async (req, res) => {
  try {
    const { proposalId, filename } = req.params;

    const proposal = await TopicProposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ message: 'Không tìm thấy đề tài' });
    }

    // Kiểm tra quyền xóa
    const student = await User.findById(req.user._id);
    const isStudent = req.user.role === 'Sinh viên' && student.studentInfo.studentId === proposal.studentId;
    // Cho phép Giảng viên, Lãnh đạo bộ môn, Lãnh đạo khoa là GVHD
    const isPrimarySupervisor = ['Giảng viên', 'Lãnh đạo bộ môn', 'Lãnh đạo khoa'].includes(req.user.role) && req.user.username === proposal.primarySupervisor;

    if (!isStudent && !isPrimarySupervisor) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa file này' });
    }

    // Không cho phép xóa nếu đã phê duyệt
    if (proposal.outlineStatus === 'approved' && isPrimarySupervisor) {
      return res.status(400).json({ message: 'Đề cương đã được phê duyệt, không thể xóa file' });
    }

    const fileIndex = proposal.outlineFiles.findIndex(f => f.filename === filename);
    if (fileIndex === -1) {
      return res.status(404).json({ message: 'Không tìm thấy file' });
    }

    // Xóa file khỏi hệ thống
    const file = proposal.outlineFiles[fileIndex];
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    proposal.outlineFiles.splice(fileIndex, 1);
    
    // Nếu không còn file nào, đổi trạng thái về not_uploaded
    if (proposal.outlineFiles.length === 0) {
      proposal.outlineStatus = 'not_uploaded';
    }

    await proposal.save();

    res.json({ message: 'Đã xóa file thành công' });

  } catch (error) {
    console.error('Error deleting outline:', error);
    res.status(500).json({ message: 'Lỗi server khi xóa file', error: error.message });
  }
});

// ==================== END OUTLINE FILE UPLOAD APIs ====================

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});




