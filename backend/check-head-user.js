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

(async function checkHeadUsers() {
  try {
    console.log('\n🔍 Tìm tất cả user có role "Lãnh đạo bộ môn"...\n');
    
    const heads = await User.find({ 
      role: { $in: ['Lãnh đạo bộ môn', 'Chủ nhiệm bộ môn'] }
    });
    
    console.log(`📊 Tìm thấy ${heads.length} user:\n`);
    
    heads.forEach((head, index) => {
      console.log(`${index + 1}. Username: ${head.username}`);
      console.log(`   Role: ${head.role}`);
      console.log(`   Full Name: ${head.userInfo?.fullName || 'N/A'}`);
      console.log(`   ⚠️  managedMajor: ${head.managedMajor || '❌ KHÔNG CÓ'}`);
      console.log(`   managedDepartment: ${head.managedDepartment || 'N/A'}`);
      console.log(`   Faculty: ${head.userInfo?.faculty || 'N/A'}`);
      console.log(`   Department: ${head.userInfo?.department || 'N/A'}`);
      console.log('---');
    });
    
    const headsWithoutMajor = heads.filter(h => !h.managedMajor);
    if (headsWithoutMajor.length > 0) {
      console.log(`\n❌ CÓ ${headsWithoutMajor.length} user LĐBM KHÔNG CÓ managedMajor!`);
      console.log('📝 Danh sách:');
      headsWithoutMajor.forEach(h => {
        console.log(`   - ${h.username} (${h.userInfo?.fullName})`);
      });
    } else {
      console.log('\n✅ Tất cả LĐBM đều có managedMajor');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
})();
