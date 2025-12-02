Request: Bạn xem lại giúp mình luồng mình đang làm dở về việc đề xuất đề cương(đề tài-topic). Mình muốn là khi học viên đề xuất đề cương, ngoài nội dung đề xuất nhập tay thì mình sẽ đính kèm thêm file đề cương/outline (optional), và gửi đến cho giảng viên hướng dẫn. Giảng viên sẽ xem và phê duyệt, nếu ko đồng ý thì sẽ từ chối, đề xuất (kèm file) sẽ được gửi trả về cho học viên, và chỉ trừ khi đề cương đã được duyệt, còn nếu đề cương ở các trạng thái khác (chờ duyệt, bị từ chốii...) thì học viên vẫn có thể chỉnh sửa đề tài (nội dung, file đính kèm) rồi gửi lại. Mình cũng muốn TopicArchive và ProposeTopic sẽ gộp lại chung làm 1 trang TopicManagement, khi vào trang đó thì sẽ hiện các đề cương/đề tài đã đề xuất(gửi đi) (nếu có) (TopicArchive), và nút "Thêm đề xuất" thì sẽ chỏ đến ProposeTopic. Mình biết cái này rất phức tạp, nhưng bạn cố gắng giúp mình nha, mình cảm ơn bạn rất nhiều.

Response:

I'll help you implement this workflow for topic proposal management. Let me break down the requirements and implement them systematically.

Created 5 todos

Read [](file:///c%3A/Users/GIGABYTE/DuAnCongNgheUET/uet-portal-frontend/src/TopicArchive.js#1-1), lines 1 to 100

Read [](file:///c%3A/Users/GIGABYTE/DuAnCongNgheUET/uet-portal-backend/server.js#1711-1711), lines 1711 to 1839

Searched for regex `propose-topic|topic-proposals-archive` (`**/uet-portal-backend/server.js`), 7 results

Searched for regex `Route.*path.*propose-topic|Route.*path.*topic-archive` (`**/uet-portal-frontend/src/**`), no results

Searched for files matching `**/App.js`, 1 match

Read [](file:///c%3A/Users/GIGABYTE/DuAnCongNgheUET/uet-portal-frontend/src/App.js#1-1), lines 1 to 100

Read [](file:///c%3A/Users/GIGABYTE/DuAnCongNgheUET/uet-portal-frontend/src/App.js#100-100), lines 100 to 249

Starting: *Update backend: allow re-submission when not approved* (2/5)

Now let me implement the backend changes to support re-submission:

Using "Multi-Replace String in Files"

```

```

Starting: *Create new TopicManagement component combining Archive & Propose* (3/5)

Now let me create the new TopicManagement component that combines both TopicArchive and ProposeTopic:

Read [](file:///c%3A/Users/GIGABYTE/DuAnCongNgheUET/uet-portal-frontend/src/TopicArchive.js)

Now let me create the new TopicManagement component that combines both functionalities:

Created [](file:///c%3A/Users/GIGABYTE/DuAnCongNgheUET/uet-portal-frontend/src/TopicManagement.js)

Starting: *Update routes and navigation* (4/5)

Now let me update the App.js routes and check AppLayout for navigation:

Read [](file:///c%3A/Users/GIGABYTE/DuAnCongNgheUET/uet-portal-frontend/src/AppLayout.js#1-1), lines 1 to 200

Using "Multi-Replace String in Files"

```

```

```

```

Completed: *Update routes and navigation* (4/5)

Perfect! Mình đã hoàn thành việc triển khai luồng quản lý đề tài mới cho bạn. Đây là tổng kết những gì đã được thực hiện:

## 🎯 Những thay đổi chính

### 1. **Backend (server.js)**

✅ **Thêm API cập nhật/gửi lại đề xuất** (`PUT /student/resubmit-topic/:proposalId`)

- Cho phép sinh viên chỉnh sửa và gửi lại đề tài khi:
  - Đề tài ở trạng thái: `pending`, `rejected`, `rejected_by_head`, `rejected_by_faculty_leader`
  - **KHÔNG** cho phép sửa khi đã được duyệt (`approved`, `approved_by_head`, `approved_by_faculty_leader`, `waiting_head_approval`, `waiting_faculty_leader_approval`)
- Khi gửi lại, trạng thái reset về `pending` và gửi thông báo cho GVHD
- Hỗ trợ thêm file đề cương mới khi cập nhật

### 2. **Frontend - Component mới: TopicManagement.js**

✅ **Gộp ProposeTopic và TopicArchive thành một trang duy nhất**

**Tính năng chính:**

- **Hiển thị danh sách đề tài** đã đề xuất (giống TopicArchive)
- **Nút "Thêm đề xuất mới"** ở góc trên bên phải
- **Nút "Sửa"** cho mỗi đề tài (chỉ hiện khi đề tài chưa được duyệt)
- **Dialog tạo/chỉnh sửa đề xuất** với:
  - Form nhập tên đề tài, nội dung
  - Chọn GVHD chính, GVHD phụ (autocomplete)
  - Đính kèm file đề cương (tùy chọn)
  - Tự động phát hiện mode tạo mới hay chỉnh sửa
- **Xem chi tiết** đề tài và nhận xét từ GVHD/LĐBM/Lãnh đạo khoa
- **Quản lý file đề cương**: xem, tải, xóa file (khi chưa được duyệt)

**Quy tắc chỉnh sửa:**

```javascript
// Có thể sửa khi:
const editableStatuses = ['pending', 'rejected', 'rejected_by_head', 'rejected_by_faculty_leader'];

// KHÔNG thể sửa khi:
// - approved (đã được GVHD duyệt)
// - approved_by_head (đã được LĐBM duyệt)
// - approved_by_faculty_leader (đã được Lãnh đạo khoa duyệt)
// - waiting_head_approval (đang chờ LĐBM)
// - waiting_faculty_leader_approval (đang chờ Lãnh đạo khoa)
```

### 3. **Cập nhật Routes và Navigation**

**App.js:**

- Thêm route `/topic-management` cho TopicManagement component
- Giữ lại route `/topic-archive` cho các vai trò khác (GVHD, LĐBM, Lãnh đạo khoa)

**AppLayout.js:**

- Sinh viên thấy **"Quản lý đề tài"** thay vì 2 mục riêng biệt
- Các vai trò khác vẫn thấy "Lưu trữ đề cương" như cũ

## 📋 Luồng hoạt động mới

### **Kịch bản 1: Sinh viên tạo đề xuất mới**

1. Vào **"Quản lý đề tài"** → nhấn **"Thêm đề xuất mới"**
2. Điền thông tin + đính kèm file (tùy chọn)
3. Nhấn **"Gửi đề xuất"**
4. Đề tài hiển thị trong danh sách với trạng thái **"Chờ GVHD xử lý"**

### **Kịch bản 2: GVHD từ chối → Sinh viên sửa và gửi lại**

1. GVHD từ chối đề tài với nhận xét
2. Sinh viên vào **"Quản lý đề tài"**, thấy đề tài với:
   - Trạng thái: **"GVHD từ chối"** (màu đỏ)
   - Nút **"Sửa"** có thể nhấn
3. Nhấn **"Sửa"** → dialog hiện lên với:
   - Alert: *"Bạn đang chỉnh sửa đề xuất. Sau khi lưu, đề xuất sẽ được gửi lại..."*
   - Form đã điền sẵn nội dung cũ
4. Chỉnh sửa nội dung, thêm/bớt file
5. Nhấn **"Cập nhật và gửi lại"**
6. Trạng thái reset về **"Chờ GVHD xử lý"**, GVHD nhận thông báo mới

### **Kịch bản 3: Đề tài đã được duyệt**

1. Đề tài có trạng thái: **"GVHD đã phê duyệt"** hoặc cao hơn
2. Nút **"Sửa"** **KHÔNG** hiển thị
3. Sinh viên chỉ có thể **"Xem"** chi tiết
4. Không thể chỉnh sửa nội dung hoặc xóa file đề cương

## 🧪 Hướng dẫn test

### **Bước 1: Restart backend**

```powershell
cd c:\Users\GIGABYTE\DuAnCongNgheUET\uet-portal-backend
npm start
```

### **Bước 2: Restart frontend**

```powershell
cd c:\Users\GIGABYTE\DuAnCongNgheUET\uet-portal-frontend
npm start
```

### **Bước 3: Test flow**

**Test 1 - Tạo đề xuất mới:**

- Login với tài khoản Sinh viên
- Vào "Quản lý đề tài" (sidebar)
- Nhấn "Thêm đề xuất mới"
- Điền form + đính kèm 1 file PDF
- Submit → kiểm tra đề tài xuất hiện trong bảng

**Test 2 - GVHD từ chối:**

- Login với tài khoản GVHD (GVHD chính của đề tài trên)
- Vào "Giảng viên - Đề tài" (hoặc endpoint tương ứng)
- Từ chối đề tài với nhận xét: "Cần bổ sung phương pháp nghiên cứu"

**Test 3 - Sinh viên sửa và gửi lại:**

- Login lại Sinh viên
- Vào "Quản lý đề tài"
- Thấy đề tài với trạng thái **"GVHD từ chối"** (chip màu đỏ)
- Nhấn nút **"Sửa"**
- Chỉnh sửa nội dung (thêm phần phương pháp nghiên cứu)
- Thêm 1 file mới
- Nhấn "Cập nhật và gửi lại"
- Kiểm tra:
  - Trạng thái chuyển về **"Chờ GVHD xử lý"**
  - GVHD nhận thông báo mới

**Test 4 - Không cho sửa khi đã duyệt:**

- Login GVHD → phê duyệt đề tài
- Login Sinh viên → vào "Quản lý đề tài"
- Nút **"Sửa"** không còn hiển thị
- Chỉ có nút **"Xem"**

## 🔑 Điểm khác biệt so với trước

| **Trước**                                                    | **Sau**                                              |
| -------------------------------------------------------------------- | ---------------------------------------------------------- |
| 2 trang riêng: "Đề xuất đề cương" + "Lưu trữ đề cương" | 1 trang duy nhất:**"Quản lý đề tài"**          |
| Không thể sửa đề tài đã gửi                                 | **Có thể sửa** khi đề tài chưa được duyệt |
| Phải tạo đề xuất mới nếu bị từ chối                        | **Sửa trực tiếp** đề xuất cũ và gửi lại    |
| File đính kèm cố định sau khi gửi                             | Có thể**thêm/xóa file** khi chỉnh sửa          |

## ⚠️ Lưu ý khi sử dụng

1. **Khi nào có thể sửa?**

   - Chỉ khi đề tài ở trạng thái: pending, rejected, rejected_by_head, rejected_by_faculty_leader
   - Sau khi được duyệt (bất kỳ cấp nào) → **KHÔNG** thể sửa
2. **File đề cương:**

   - Khi sửa, có thể thêm file mới
   - File cũ vẫn giữ nguyên (trừ khi sinh viên chủ động xóa)
   - Xóa file chỉ được phép khi đề cương chưa được GVHD phê duyệt
3. **Thông báo:**

   - Mỗi lần gửi lại, GVHD sẽ nhận thông báo mới
   - Trạng thái reset về "pending" để GVHD xem xét lại

Bạn test thử và cho mình biết nếu cần điều chỉnh gì nhé! 🚀

Made changes. Claude Sonnet 4.5 • 1x
