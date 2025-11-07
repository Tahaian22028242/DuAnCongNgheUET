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
  role: { type: String, required: true, enum: ['Sinh viên', 'Giảng viên', 'Quản trị viên', 'Chủ nhiệm bộ môn'] },
  managedMajor: { type: String }, // ngành mà CNBM quản lý
  // Thông tin chung cho tất cả user
  userInfo: {
    fullName: String,
    email: String,
    faculty: String,      // <-- Thêm trường này để lưu Khoa/ngành cho giảng viên
    department: String,   // Bộ môn/phòng thí nghiệm
    position: String      // Chức vụ
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

    // CHỈNH SỬA: Trả về thông tin phù hợp theo role
        let responseData = {
            message: 'Đăng nhập thành công',
            user: {
                username: user.username,
                role: user.role,
            }
        };

        // Thêm thông tin cụ thể theo role
        if (user.role === 'Sinh viên') {
            responseData.user.studentInfo = user.studentInfo || null;
        } else if (user.role === 'Chủ nhiệm bộ môn') {
            responseData.user.userInfo = user.userInfo || null;
            responseData.user.managedMajor = user.managedMajor || null;
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

        // CHỈNH SỬA: Cải thiện cách đọc dữ liệu từ Excel
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) { // Bỏ qua header row
                // SỬA LỖI: Lấy giá trị cell một cách an toàn
                const stt = getCellValue(row.getCell(1));
                const fullName = getCellValue(row.getCell(2));
                const email = getCellValue(row.getCell(3));
                const managedMajor = getCellValue(row.getCell(4));

                console.log(`Hàng ${rowNumber}:`, { stt, fullName, email, managedMajor }); // Debug log

                // Kiểm tra đầy đủ thông tin và email hợp lệ
                if (stt && fullName && email && managedMajor && 
                    email.includes('@') && email.includes('.')) {
                    headsData.push({
                        stt: stt.trim(),
                        fullName: fullName.trim(),
                        email: email.trim().toLowerCase(), // Chuyển về lowercase để tránh lỗi
                        managedMajor: managedMajor.trim()
                    });
                } else {
                    console.log(`Bỏ qua hàng ${rowNumber}: thiếu thông tin hoặc email không hợp lệ`);
                    errors.push(`Hàng ${rowNumber}: Thiếu thông tin (STT: ${stt}, Tên: ${fullName}, Email: ${email}, Khoa: ${managedMajor})`);
                }
            }
        });

        console.log('Dữ liệu đã đọc:', headsData); // Debug log

        // Xử lý từng CNBM một cách tuần tự
        for (const headData of headsData) {
            try {
                // Kiểm tra xem email đã tồn tại chưa
                const existingUser = await User.findOne({ username: headData.email });
                
                if (!existingUser) {
                    // Kiểm tra xem ngành này đã có CNBM chưa
                    const existingHead = await User.findOne({
                        role: 'Chủ nhiệm bộ môn',
                        managedMajor: headData.managedMajor
                    });

                    if (!existingHead) {
                        const hashedPassword = await bcrypt.hash('123', 10);
                        
                        const newUser = new User({
                            username: headData.email, // Đảm bảo username là email
                            password: hashedPassword,
                            role: 'Chủ nhiệm bộ môn',
                            userInfo: {
                                fullName: headData.fullName,
                                email: headData.email
                            },
                            managedMajor: headData.managedMajor
                        });

                        await newUser.save();
                        console.log(`Đã tạo tài khoản cho: ${headData.email}`); // Debug log
                        
                        createdHeads.push({
                            email: headData.email,
                            fullName: headData.fullName,
                            managedMajor: headData.managedMajor
                        });
                    } else {
                        errors.push(`Ngành ${headData.managedMajor} đã có CNBM: ${existingHead.userInfo?.fullName || existingHead.username}`);
                    }
                } else {
                    errors.push(`Email đã tồn tại: ${headData.email}`);
                }
            } catch (userError) {
                console.error(`Error creating head for ${headData.email}:`, userError);
                errors.push(`Lỗi tạo tài khoản cho ${headData.email}: ${userError.message}`);
            }
        }

        // Clean up the uploaded file
        fs.unlink(file.path, (err) => {
            if (err) console.error('Lỗi xóa file:', err);
        });

        res.status(201).json({
            message: 'Tải lên danh sách Chủ nhiệm bộ môn hoàn tất',
            success: {
                total: createdHeads.length,
                accounts: createdHeads
            },
            errors: errors.length > 0 ? errors : undefined,
            totalProcessed: headsData.length
        });
    } catch (error) {
        console.error('Upload heads error:', error);
        // Clean up file nếu có lỗi
        if (file && file.path) {
            fs.unlink(file.path, (err) => {
                if (err) console.error('Lỗi xóa file:', err);
            });
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
    } else if (req.user.role === 'Chủ nhiệm bộ môn') {
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


// API lấy danh sách CNBM (cho admin quản lý)
app.get('/admin/heads', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Quản trị viên') {
      return res.status(403).json({ message: 'Chỉ admin mới có quyền truy cập' });
    }

    const heads = await User.find({ role: 'Chủ nhiệm bộ môn' })
      .select('username userInfo.fullName managedMajor createdAt')
      .sort({ createdAt: -1 });

    const headsList = heads.map(head => ({
      id: head._id,
      email: head.username,
      fullName: head.userInfo?.fullName || 'Chưa có tên',
      managedMajor: head.managedMajor,
      createdAt: head.createdAt
    }));

    res.status(200).json({
      message: 'Lấy danh sách CNBM thành công',
      total: headsList.length,
      heads: headsList
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// API xóa CNBM (cho admin)
app.delete('/admin/heads/:id', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Quản trị viên') {
      return res.status(403).json({ message: 'Chỉ admin mới có quyền xóa' });
    }

    const headId = req.params.id;
    const head = await User.findById(headId);

    if (!head || head.role !== 'Chủ nhiệm bộ môn') {
      return res.status(404).json({ message: 'Không tìm thấy Chủ nhiệm bộ môn' });
    }

    await User.findByIdAndDelete(headId);

    res.status(200).json({
      message: `Đã xóa Chủ nhiệm bộ môn ${head.userInfo?.fullName || head.username}`,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// API cập nhật thông tin CNBM
app.put('/admin/heads/:id', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Quản trị viên') {
      return res.status(403).json({ message: 'Chỉ admin mới có quyền cập nhật' });
    }

    const headId = req.params.id;
    const { fullName, managedMajor } = req.body;

    const head = await User.findById(headId);
    if (!head || head.role !== 'Chủ nhiệm bộ môn') {
      return res.status(404).json({ message: 'Không tìm thấy Chủ nhiệm bộ môn' });
    }

    // Cập nhật thông tin
    if (fullName) {
      head.userInfo = head.userInfo || {};
      head.userInfo.fullName = fullName;
    }

    if (managedMajor) {
      // Kiểm tra xem ngành này đã có CNBM chưa
      const existingHead = await User.findOne({
        role: 'Chủ nhiệm bộ môn',
        managedMajor: managedMajor,
        _id: { $ne: headId }
      });

      if (existingHead) {
        return res.status(400).json({
          message: `Ngành "${managedMajor}" đã có Chủ nhiệm bộ môn khác`,
        });
      }

      head.managedMajor = managedMajor;
    }

    await head.save();

    res.status(200).json({
      message: 'Cập nhật thông tin CNBM thành công',
      head: {
        id: head._id,
        email: head.username,
        fullName: head.userInfo?.fullName,
        managedMajor: head.managedMajor
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// API cho sinh viên xem thông tin cá nhân
app.get('/student/profile', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Sinh viên') {
      return res.status(403).json({ message: 'Chỉ sinh viên mới có quyền truy cập' });
    }

    const user = await User.findById(req.user._id);
    if (!user || !user.studentInfo) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin sinh viên' });
    }

    res.status(200).json({
      studentId: user.studentInfo.studentId,
      fullName: user.studentInfo.fullName,
      major: user.studentInfo.major,
      faculty: user.studentInfo.faculty || null,
      // Không trả về ngày sinh vì yêu cầu chỉ cần 3 thông tin
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// API lấy danh sách giảng viên (cho autocomplete)
app.get('/supervisors', authenticateJWT, async (req, res) => {
  try {
    const supervisors = await User.find({ role: 'Giảng viên' }).select('username studentInfo.fullName');

    const supervisorList = supervisors.map(supervisor => ({
      username: supervisor.username,
      fullName: supervisor.studentInfo?.fullName || supervisor.username
    }));

    res.status(200).json(supervisorList);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// API sinh viên đề xuất đề tài
app.post('/student/propose-topic', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Sinh viên') {
      return res.status(403).json({ message: 'Chỉ sinh viên mới có quyền đề xuất đề tài' });
    }

    const { topicTitle, content, primarySupervisor, secondarySupervisor } = req.body;

    if (!topicTitle || !content || !primarySupervisor) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }

    const user = await User.findById(req.user._id);
    const proposal = new TopicProposal({
      studentId: user.studentInfo?.studentId || user.username,
      studentName: user.studentInfo?.fullName || user.username,
      topicTitle,
      content,
      primarySupervisor,
      secondarySupervisor
    });

    await proposal.save();

    res.status(201).json({
      message: 'Đề xuất đề tài thành công',
      proposal: {
        id: proposal._id,
        topicTitle: proposal.topicTitle,
        status: proposal.status
      }
    });
  } catch (error) {
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

// API giảng viên phê duyệt/từ chối đề tài (da cập nhật API giảng viên phê duyệt/từ chối đề tài để hỗ trợ bổ sung giảng viên đồng hướng dẫn)
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

    // Kiểm tra quyền
    if (proposal.primarySupervisor !== req.user.username && proposal.secondarySupervisor !== req.user.username) {
      return res.status(403).json({ message: 'Bạn không có quyền phê duyệt đề xuất này' });
    }

    // Cập nhật thông tin
    proposal.status = status;
    proposal.supervisorComments = comments;
    proposal.reviewedAt = new Date();
    proposal.reviewedBy = req.user._id;

    // Cập nhật thông tin đề tài nếu có chỉnh sửa
    if (topicTitle) proposal.topicTitle = topicTitle;
    if (content) proposal.content = content;
    if (secondarySupervisor !== undefined) proposal.secondarySupervisor = secondarySupervisor;

    // Nếu phê duyệt, tìm CNBM quản lý ngành của sinh viên
    if (status === 'approved') {
      const studentUser = await User.findOne({ 'studentInfo.studentId': proposal.studentId });
      if (studentUser && studentUser.studentInfo && studentUser.studentInfo.major) {
        const head = await User.findOne({ role: 'Chủ nhiệm bộ môn', managedMajor: studentUser.studentInfo.major });
        if (head) {
          proposal.status = 'waiting_head_approval';
          proposal.headId = head._id;
        }
      }
    }

    await proposal.save();

    // Sau khi proposal.status được cập nhật
    const studentUser = await User.findOne({ 'studentInfo.studentId': proposal.studentId });
    if (studentUser) {
      let notifyMsg = '';
      if (status === 'approved') {
        notifyMsg = `Đề tài "${proposal.topicTitle}" của bạn đã được giảng viên phê duyệt.`;
      } else if (status === 'rejected') {
        notifyMsg = `Đề tài "${proposal.topicTitle}" của bạn đã bị từ chối.`;
      }
      studentUser.notifications = studentUser.notifications || [];
      studentUser.notifications.push({
        message: notifyMsg,
        type: 'topic',
        createdAt: new Date(),
        read: false
      });
      await studentUser.save();
    }

    res.status(200).json({
      message: `Đề tài đã được ${status === 'approved' ? 'phê duyệt' : 'từ chối'}`,
      proposal
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// API admin xem tất cả đề tài
app.get('/admin/topic-proposals', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Quản trị viên') {
      return res.status(403).json({ message: 'Chỉ quản trị viên mới có quyền truy cập' });
    }

    const { status } = req.query;
    let filter = {};
    if (status) {
      filter.status = status;
    }

    const proposals = await TopicProposal.find(filter)
      .populate('reviewedBy', 'username')
      .sort({ submittedAt: -1 });

    res.status(200).json(proposals);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Nếu sửa code chỉ được sửa từ dòng này
     

// API kiểm tra xác thực
app.get('/auth/check', authenticateJWT, (req, res) => {
  res.status(200).json({
    authenticated: true,
    user: {
      username: req.user.username,
      role: req.user.role
    }
  });
});

// API đăng xuất
app.post('/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.status(200).json({ message: 'Đăng xuất thành công' });
});

// API CNBM xem các đề tài chờ duyệt
app.get('/head/topic-proposals', authenticateJWT, async (req, res) => {
  if (req.user.role !== 'Chủ nhiệm bộ môn') {
    return res.status(403).json({ message: 'Chỉ CNBM mới có quyền truy cập' });
  }
  const proposals = await TopicProposal.find({ headId: req.user._id, status: 'waiting_head_approval' });
  res.status(200).json(proposals);
});

// API CNBM duyệt hoặc trả lại đề tài
app.put('/head/review-topic/:id', authenticateJWT, async (req, res) => {
  if (req.user.role !== 'Chủ nhiệm bộ môn') {
    return res.status(403).json({ message: 'Chỉ CNBM mới có quyền duyệt' });
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
      studentUser.notifications.push({
        message: `Đề tài "${proposal.topicTitle}" của bạn đã được CNBM phê duyệt.`,
        type: 'topic',
        createdAt: new Date(),
        read: false
      });
      await studentUser.save();
    }
    res.status(200).json({ message: 'Đề tài đã được CNBM phê duyệt', proposal });
  } else {
    // Trả lại: xóa đề tài khỏi DB
    if (studentUser) {
      studentUser.notifications = studentUser.notifications || [];
      studentUser.notifications.push({
        message: `Đề tài "${proposal.topicTitle}" của bạn đã bị CNBM trả lại.`,
        type: 'topic',
        createdAt: new Date(),
        read: false
      });
      await studentUser.save();
    }
    await proposal.deleteOne();
    res.status(200).json({ message: 'Đề tài đã bị trả lại và xóa khỏi hệ thống' });
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
// API lấy danh sách tất cả giảng viên (cho autocomplete khi bổ sung giảng viên đồng hướng dẫn)
app.get('/lecturers', authenticateJWT, async (req, res) => {
  try {
    const lecturers = await User.find({ role: 'Giảng viên' }).select('username userInfo.fullName');
    const lecturerList = lecturers.map(lecturer => ({
      username: lecturer.username,
      fullName: lecturer.userInfo?.fullName || lecturer.username
    }));
    res.status(200).json(lecturerList);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// API CNBM xem thống kê học viên và đề tài thuộc ngành quản lý
app.get('/head/students-statistics', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'Chủ nhiệm bộ môn') {
      return res.status(403).json({ message: 'Chỉ CNBM mới có quyền truy cập' });
    }

    // Lấy thông tin CNBM
    const head = await User.findById(req.user._id);
    if (!head || !head.managedMajor) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin ngành quản lý' });
    }

    // Lấy danh sách học viên thuộc ngành
    const students = await User.find({ 
      role: 'Sinh viên',
      'studentInfo.major': head.managedMajor 
    }).select('studentInfo');

    // Lấy danh sách đề tài của các học viên thuộc ngành
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

// Khởi động server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// API cho Admin nhập danh sách giảng viên
app.post('/admin/upload-lecturers', authenticateJWT, upload.single('excelFile'), async (req, res) => {
  if (req.user.role !== 'Quản trị viên') {
    return res.status(403).json({ message: 'Không có quyền truy cập' });
  }

  const { faculty } = req.body;
  const file = req.file;
  if (!faculty || !file) {
    return res.status(400).json({ message: 'Thiếu thông tin hoặc file' });
  }

  try {
    const workbook = new exceljs.Workbook();
    await workbook.xlsx.readFile(file.path);
    const worksheet = workbook.getWorksheet(1);

    const lecturers = [];
    const createdAccounts = [];
    const errors = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        const stt = row.getCell(1).value?.toString()?.trim();
        const fullName = row.getCell(2).value?.toString()?.trim();
        const email = row.getCell(3).value?.toString()?.trim().toLowerCase();
        const department = row.getCell(4).value?.toString()?.trim() || '';
        const position = row.getCell(5).value?.toString()?.trim() || '';

        // Bỏ qua nếu thiếu email hoặc họ tên
        if (!email || !fullName) {
          errors.push(`Hàng ${rowNumber}: Thiếu email hoặc họ tên`);
          return;
        }

        lecturers.push({ stt, fullName, email, department, position });
      }
    });

    for (const lecturer of lecturers) {
      try {
        const existingUser = await User.findOne({ username: lecturer.email });
        if (!existingUser) {
          const hashedPassword = await bcrypt.hash('123', 10);
          const newUser = new User({
            username: lecturer.email,
            password: hashedPassword,
            role: 'Giảng viên',
            userInfo: {
              fullName: lecturer.fullName,
              email: lecturer.email,
              department: lecturer.department,
              position: lecturer.position,
              faculty: faculty
            }
          });
          await newUser.save();
          createdAccounts.push(lecturer.email);
        }
      } catch (userError) {
        errors.push(`Lỗi tạo tài khoản cho ${lecturer.email}: ${userError.message}`);
      }
    }

    fs.unlink(file.path, (err) => {
      if (err) console.error('Lỗi xóa file:', err);
    });

    res.status(201).json({
      message: `Đã tải lên ${createdAccounts.length} giảng viên cho khoa "${faculty}"`,
      createdAccounts,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    if (file && file.path) {
      fs.unlink(file.path, (err) => {
        if (err) console.error('Lỗi xóa file:', err);
      });
    }
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// API lấy danh sách các khoa/ngành (từ giảng viên và CNBM)
app.get('/faculties', authenticateJWT, async (req, res) => {
  try {
    // Lấy faculty từ giảng viên
    const lecturers = await User.find({ role: 'Giảng viên' }).select('userInfo.faculty');
    // Lấy managedMajor từ CNBM
    const heads = await User.find({ role: 'Chủ nhiệm bộ môn' }).select('managedMajor');
    // Tổng hợp danh sách khoa/ngành
    const faculties = [
      ...lecturers.map(l => l.userInfo?.faculty).filter(Boolean),
      ...heads.map(h => h.managedMajor).filter(Boolean)
    ];
    // Loại bỏ trùng lặp
    const uniqueFaculties = [...new Set(faculties)];
    res.status(200).json(uniqueFaculties);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// API lấy danh sách giảng viên và CNBM theo khoa/ngành
app.get('/faculty/:facultyName/members', authenticateJWT, async (req, res) => {
  try {
    const facultyName = req.params.facultyName;
    // Lấy giảng viên
    const lecturers = await User.find({
      role: 'Giảng viên',
      'userInfo.faculty': facultyName
    }).select('userInfo.fullName userInfo.email userInfo.department userInfo.position');
    // Lấy CNBM theo managedMajor
    const heads = await User.find({
      role: 'Chủ nhiệm bộ môn',
      managedMajor: facultyName
    }).select('userInfo.fullName userInfo.email managedMajor');
    // Gộp kết quả
    // const result = [
    //   ...lecturers.map((l, idx) => ({
    //     stt: idx + 1,
    //     fullName: l.userInfo.fullName,
    //     email: l.userInfo.email,
    //     department: l.userInfo.department,
    //     position: l.userInfo.position || '',
    //     role: 'Giảng viên'
    //   })),
    //   ...heads.map((h, idx) => ({
    //     stt: lecturers.length + idx + 1,
    //     fullName: h.userInfo.fullName,
    //     email: h.userInfo.email,
    //     department: h.managedMajor,
    //     position: 'Chủ nhiệm bộ môn',
    //     role: 'Chủ nhiệm bộ môn'
    //   }))
    // ];

    const result = [
  ...lecturers.map((l, idx) => ({
    stt: idx + 1,
    _id: l._id,  // ✅ Thêm dòng này
    fullName: l.userInfo.fullName,
    email: l.userInfo.email,
    department: l.userInfo.department,
    position: l.userInfo.position || '',
    role: 'Giảng viên'
  })),
  ...heads.map((h, idx) => ({
    stt: lecturers.length + idx + 1,
    _id: h._id,  // ✅ Thêm dòng này
    fullName: h.userInfo.fullName,
    email: h.userInfo.email,
    department: h.managedMajor,
    position: 'Chủ nhiệm bộ môn',
    role: 'Chủ nhiệm bộ môn'
  }))
];
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});
// Calendar 

// Calendar Schema
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  eventType: { 
    type: String, 
    required: true,
    enum: ['academic', 'thesis_defense', 'meeting', 'deadline', 'holiday', 'exam', 'other']
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isAllDay: { type: Boolean, default: false },
  location: { type: String },
  
  // Quyền truy cập
  visibility: {
    type: String,
    enum: ['public', 'major_only', 'role_only', 'private'],
    default: 'public'
  },
  
  // Phạm vi áp dụng
  targetRoles: [{ type: String, enum: ['Sinh viên', 'Giảng viên', 'Quản trị viên', 'Chủ nhiệm bộ môn'] }],
  targetMajors: [String], // Các ngành được xem sự kiện
  
  // Thông tin người tạo
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  
  // Liên kết với đề tài (nếu có)
  relatedTopic: { type: mongoose.Schema.Types.ObjectId, ref: 'TopicProposal' },
  
  // Trạng thái
  status: { type: String, enum: ['active', 'cancelled', 'completed'], default: 'active' },
  
  // Reminder
  reminderMinutes: { type: Number, default: 60 }, // Nhắc nhở trước bao nhiêu phút
  
  // Recurring events
  isRecurring: { type: Boolean, default: false },
  recurringPattern: {
    type: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'] },
    interval: { type: Number, default: 1 }, // Mỗi bao nhiêu đơn vị
    endDate: Date, // Kết thúc lặp lại
    daysOfWeek: [Number], // 0-6 cho Chủ nhật - Thứ 7
    dayOfMonth: Number, // Ngày trong tháng
    month: Number // Tháng trong năm
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
          targetRoles: { $in: [req.user.role] }
        }
      ]
    };

    // Thêm filter theo ngành cho sinh viên và CNBM
    if (req.user.role === 'Sinh viên' && user.studentInfo?.major) {
      accessFilter.$or.push({
        visibility: 'major_only',
        targetMajors: { $in: [user.studentInfo.major] }
      });
    } else if (req.user.role === 'Chủ nhiệm bộ môn' && user.managedMajor) {
      accessFilter.$or.push({
        visibility: 'major_only',
        targetMajors: { $in: [user.managedMajor] }
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

// API lấy thống kê sự kiện (cho admin/CNBM)
app.get('/calendar/statistics', authenticateJWT, async (req, res) => {
  try {
    if (!['Quản trị viên', 'Chủ nhiệm bộ môn'].includes(req.user.role)) {
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
app.put('/admin/lecturer/:lecturerId', authenticateJWT, async (req, res) => {
  if (req.user.role !== 'Quản trị viên') 
    return res.status(403).json({ message: 'Không có quyền truy cập' });
  
  const { lecturerId } = req.params;
  const { fullName, department, position, faculty, email, role, managedMajor } = req.body;
  
  try {
    const user = await User.findById(lecturerId);
    if (!user || !['Giảng viên', 'Chủ nhiệm bộ môn'].includes(user.role)) 
      return res.status(404).json({ message: 'Không tìm thấy giảng viên/CNBM' });

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
    if (role && role !== user.role) {
      // Giảng viên → CNBM
      if (user.role === 'Giảng viên' && role === 'Chủ nhiệm bộ môn') {
        if (!managedMajor) {
          return res.status(400).json({ 
            message: 'Phải chỉ định ngành quản lý khi chuyển sang CNBM' 
          });
        }
        
        // Kiểm tra ngành đã có CNBM chưa
        const existingHead = await User.findOne({
          role: 'Chủ nhiệm bộ môn',
          managedMajor: managedMajor,
          _id: { $ne: lecturerId }
        });
        
        if (existingHead) {
          return res.status(400).json({
            message: `Ngành "${managedMajor}" đã có CNBM khác`
          });
        }
        
        user.role = 'Chủ nhiệm bộ môn';
        user.managedMajor = managedMajor;
      } 
      // CNBM → Giảng viên
      else if (user.role === 'Chủ nhiệm bộ môn' && role === 'Giảng viên') {
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
        
        user.role = 'Giảng viên';
        user.managedMajor = undefined;
        
        // Chuyển faculty từ managedMajor sang userInfo.faculty
        if (!faculty && user.managedMajor) {
          user.userInfo = user.userInfo || {};
          user.userInfo.faculty = user.managedMajor;
        }
      }
      else {
        return res.status(400).json({ 
          message: 'Chỉ hỗ trợ chuyển đổi giữa Giảng viên và CNBM' 
        });
      }
    }

    // 3. Cập nhật các thông tin khác
    user.userInfo = user.userInfo || {};
    if (fullName) user.userInfo.fullName = fullName;
    if (department) user.userInfo.department = department;
    if (position) user.userInfo.position = position;
    if (faculty && user.role === 'Giảng viên') user.userInfo.faculty = faculty;
    
    // Cập nhật managedMajor cho CNBM (nếu không đổi role nhưng đổi ngành)
    if (user.role === 'Chủ nhiệm bộ môn' && managedMajor && managedMajor !== user.managedMajor) {
      const existingHead = await User.findOne({
        role: 'Chủ nhiệm bộ môn',
        managedMajor: managedMajor,
        _id: { $ne: lecturerId }
      });
      
      if (existingHead) {
        return res.status(400).json({
          message: `Ngành "${managedMajor}" đã có CNBM khác`
        });
      }
      user.managedMajor = managedMajor;
    }

    await user.save();
    
    res.json({ 
      message: 'Đã cập nhật thông tin thành công', 
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        userInfo: user.userInfo,
        managedMajor: user.managedMajor
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
app.post('/admin/faculty/:facultyName/add-head', authenticateJWT, async (req, res) => {
  if (req.user.role !== 'Quản trị viên') return res.status(403).json({ message: 'Không có quyền truy cập' });
  const { facultyName } = req.params;
  const { email, fullName } = req.body;
  if (!email || !fullName) return res.status(400).json({ message: 'Thiếu thông tin CNBM' });

  let user = await User.findOne({ username: email });
  if (user) return res.status(400).json({ message: 'Email đã tồn tại' });

  // Kiểm tra ngành đã có CNBM chưa
  const existingHead = await User.findOne({ role: 'Chủ nhiệm bộ môn', managedMajor: facultyName });
  if (existingHead) return res.status(400).json({ message: 'Ngành đã có CNBM' });

  const hashedPassword = await bcrypt.hash('123', 10);
  user = new User({
    username: email,
    password: hashedPassword,
    role: 'Chủ nhiệm bộ môn',
    userInfo: { fullName, email },
    managedMajor: facultyName
  });
  await user.save();
  res.json({ message: 'Đã thêm CNBM', head: user.userInfo });
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
  if (!user || user.role !== 'Chủ nhiệm bộ môn') return res.status(404).json({ message: 'Không tìm thấy CNBM' });
  await User.findByIdAndDelete(headId);
  res.json({ message: 'Đã xóa CNBM khỏi hệ thống' });
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



