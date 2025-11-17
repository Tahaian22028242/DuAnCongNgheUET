import mongoose from 'mongoose';

await mongoose.connect('mongodb://localhost:27017/uet_portal')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

const userSchema = new mongoose.Schema({
  username: String,
  role: String,
  managedMajor: String,
  managedDepartment: String,
  userInfo: {
    fullName: String,
    email: String,
    faculty: String,
    department: String,
    position: String
  }
});

const User = mongoose.model('User', userSchema);

// Ánh xạ Bộ môn -> Ngành
const departmentToMajorMap = {
  'Công nghệ Phần mềm': 'Công nghệ thông tin',
  'Hệ thống Thông tin': 'Công nghệ thông tin',
  'Khoa học máy tính': 'Công nghệ thông tin',
  'Mạng máy tính và Truyền thông': 'Công nghệ thông tin',
  'Trí tuệ nhân tạo': 'Công nghệ thông tin'
};

(async function fixManagedMajor() {
  try {
    console.log('\n🔧 Bắt đầu sửa managedMajor cho LĐBM...\n');
    
    const heads = await User.find({ 
      role: { $in: ['Lãnh đạo bộ môn', 'Chủ nhiệm bộ môn'] },
      managedMajor: { $exists: false }
    });
    
    console.log(`📊 Tìm thấy ${heads.length} user cần sửa:\n`);
    
    for (const head of heads) {
      const department = head.managedDepartment;
      const major = departmentToMajorMap[department] || head.userInfo?.faculty || 'Công nghệ thông tin';
      
      console.log(`👤 ${head.username} (${head.userInfo?.fullName})`);
      console.log(`   Bộ môn: ${department}`);
      console.log(`   ➡️  Sẽ set managedMajor = "${major}"`);
      
      await User.updateOne(
        { _id: head._id },
        { $set: { managedMajor: major } }
      );
      
      console.log(`   ✅ Đã cập nhật!\n`);
    }
    
    console.log(`\n✅ Hoàn tất! Đã sửa ${heads.length} user.`);
    
    // Verify
    console.log('\n🔍 Kiểm tra lại...\n');
    const verifyHeads = await User.find({ 
      role: { $in: ['Lãnh đạo bộ môn', 'Chủ nhiệm bộ môn'] }
    });
    
    verifyHeads.forEach((head, index) => {
      console.log(`${index + 1}. ${head.username}`);
      console.log(`   managedMajor: ✅ ${head.managedMajor}`);
      console.log(`   managedDepartment: ${head.managedDepartment}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
})();
