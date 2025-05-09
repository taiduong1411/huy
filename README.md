# Tài liệu API Hệ thống Chấm công AI

## Tổng quan

Đây là RESTful API cho hệ thống chấm công thông minh sử dụng AI nhận diện khuôn mặt. Hệ thống này chỉ yêu cầu xác thực qua khuôn mặt, không cần vị trí địa lý.

## URL Cơ sở

```
http://localhost:3000/api
```

## Xác thực

Tất cả các endpoint được bảo vệ yêu cầu JWT token trong header Authorization:

```
Authorization: Bearer <your_token>
```

## Hướng dẫn cho Frontend

### Luồng làm việc

1. **Đăng ký người dùng**

   - Quản trị viên tạo tài khoản cho nhân viên

2. **Đăng ký khuôn mặt**

   - Nhân viên đăng nhập và đăng ký khuôn mặt
   - Cần đăng ký nhiều góc khuôn mặt khác nhau

3. **Chấm công hàng ngày**
   - Nhân viên sử dụng webcam để chấm công vào/ra
   - Hệ thống xác thực khuôn mặt và ghi nhận thời gian

### Yêu cầu về ảnh khuôn mặt

- Độ phân giải tối thiểu: 640x480 pixels
- Định dạng: Base64 encoded image
- Ánh sáng đầy đủ, không bị mờ
- Khuôn mặt chiếm ít nhất 50% diện tích ảnh

## Các Endpoint API

### Xác thực

#### Đăng ký người dùng

```http
POST /users/register
```

Dữ liệu gửi lên:

```json
{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "Nguyễn Văn A",
  "department": "IT",
  "position": "Developer",
  "employeeId": "EMP001"
}
```

Dữ liệu trả về:

```json
{
  "message": "User created successfully",
  "user": {
    "id": "60d21b4667d0d8992e610c85",
    "email": "user@example.com",
    "fullName": "Nguyễn Văn A",
    "role": "employee",
    "department": "IT",
    "position": "Developer",
    "employeeId": "EMP001"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Đăng nhập

```http
POST /users/login
```

Dữ liệu gửi lên:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Dữ liệu trả về:

```json
{
  "message": "Login successful",
  "user": {
    "id": "60d21b4667d0d8992e610c85",
    "email": "user@example.com",
    "fullName": "Nguyễn Văn A",
    "role": "employee",
    "department": "IT",
    "position": "Developer",
    "employeeId": "EMP001"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Quản lý khuôn mặt

#### Đăng ký khuôn mặt

```http
POST /face/register
```

Headers:

- Authorization: Bearer <token>

Dữ liệu gửi lên:

```json
{
  "faceImage": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "angle": "front"
}
```

**Lưu ý:**

- `angle` là góc của khuôn mặt (front, left, right, up, down)
- `faceImage` là ảnh khuôn mặt dạng base64

Dữ liệu trả về:

```json
{
  "message": "Face registered successfully",
  "angles": ["front"]
}
```

#### Kiểm tra đăng ký khuôn mặt

```http
GET /attendance/face-registration
```

Headers:

- Authorization: Bearer <token>

Dữ liệu trả về:

```json
{
  "registered": true,
  "message": "User has registered face data",
  "angles": ["front", "left", "right"],
  "lastUpdated": "2024-03-20T10:35:00.000Z"
}
```

### Quản lý chấm công

#### Chấm công vào (với xác thực khuôn mặt)

```http
POST /attendance/check-in
```

Headers:

- Authorization: Bearer <token>

Dữ liệu gửi lên:

```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

Dữ liệu trả về:

```json
{
  "message": "Check-in successful with face verification",
  "attendance": {
    "id": "60d21b4667d0d8992e610c87",
    "date": "2024-03-20T00:00:00.000Z",
    "checkInTime": "2024-03-20T08:30:00.000Z",
    "status": "on_time",
    "faceVerified": true,
    "confidence": 95.7
  }
}
```

Trường hợp xác thực khuôn mặt thất bại:

```json
{
  "message": "Face verification failed. Check-in denied.",
  "verification": {
    "match": false,
    "confidence": 60.5,
    "threshold": 80
  }
}
```

#### Chấm công ra (với xác thực khuôn mặt)

```http
POST /attendance/check-out
```

Headers:

- Authorization: Bearer <token>

Dữ liệu gửi lên:

```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

Dữ liệu trả về:

```json
{
  "message": "Check-out successful with face verification",
  "attendance": {
    "id": "60d21b4667d0d8992e610c87",
    "date": "2024-03-20T00:00:00.000Z",
    "checkInTime": "2024-03-20T08:30:00.000Z",
    "checkOutTime": "2024-03-20T17:30:00.000Z",
    "status": "on_time",
    "totalWorkingHours": 9,
    "faceVerified": true,
    "confidence": 96.2
  }
}
```

#### Lấy thông tin chấm công hôm nay

```http
GET /attendance/today
```

Headers:

- Authorization: Bearer <token>

Dữ liệu trả về:

```json
{
  "id": "60d21b4667d0d8992e610c87",
  "userId": "60d21b4667d0d8992e610c85",
  "date": "2024-03-20T00:00:00.000Z",
  "checkIn": {
    "time": "2024-03-20T08:30:00.000Z",
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "faceVerified": true,
    "confidence": 95.7,
    "status": "on_time"
  },
  "checkOut": {
    "time": "2024-03-20T17:30:00.000Z",
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "faceVerified": true,
    "confidence": 96.2,
    "status": "on_time"
  },
  "totalWorkingHours": 9,
  "status": "present"
}
```

#### Lấy lịch sử chấm công

```http
GET /attendance/history?startDate=2024-03-01&endDate=2024-03-20
```

Headers:

- Authorization: Bearer <token>

Dữ liệu trả về:

```json
[
  {
    "id": "60d21b4667d0d8992e610c87",
    "date": "2024-03-20T00:00:00.000Z",
    "checkIn": {
      "time": "2024-03-20T08:30:00.000Z",
      "faceVerified": true,
      "status": "on_time"
    },
    "checkOut": {
      "time": "2024-03-20T17:30:00.000Z",
      "faceVerified": true,
      "status": "on_time"
    },
    "totalWorkingHours": 9,
    "status": "present"
  },
  {
    "id": "60d21b4667d0d8992e610c88",
    "date": "2024-03-19T00:00:00.000Z",
    "checkIn": {
      "time": "2024-03-19T09:15:00.000Z",
      "faceVerified": true,
      "status": "late"
    },
    "checkOut": {
      "time": "2024-03-19T17:00:00.000Z",
      "faceVerified": true,
      "status": "early_leave"
    },
    "totalWorkingHours": 7.75,
    "status": "present"
  }
]
```

## Hướng dẫn triển khai Frontend

### Tạo trang đăng ký khuôn mặt

1. Tạo giao diện cho phép chụp ảnh từ webcam
2. Hướng dẫn người dùng chụp ảnh từ nhiều góc khác nhau
3. Gửi ảnh lên server theo định dạng base64

```javascript
// Sử dụng webcam để chụp ảnh
async function startWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: 640,
        height: 480,
        facingMode: "user", // camera trước (selfie)
      },
    });

    const videoElement = document.getElementById("webcam");
    videoElement.srcObject = stream;
  } catch (error) {
    console.error("Không thể truy cập webcam:", error);
  }
}

// Chụp ảnh từ webcam và chuyển thành base64
function captureImage() {
  const videoElement = document.getElementById("webcam");
  const canvasElement = document.getElementById("canvas");

  // Thiết lập kích thước canvas bằng với video
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;

  // Vẽ frame hiện tại từ video lên canvas
  const context = canvasElement.getContext("2d");
  context.drawImage(
    videoElement,
    0,
    0,
    canvasElement.width,
    canvasElement.height
  );

  // Chuyển đổi canvas thành base64
  const base64Image = canvasElement.toDataURL("image/jpeg");

  return base64Image;
}

// Đăng ký khuôn mặt
function registerFace(angle) {
  const base64Image = captureImage();

  fetch("http://localhost:3000/api/face/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify({
      faceImage: base64Image,
      angle: angle,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.message === "Face registered successfully") {
        alert("Đăng ký khuôn mặt thành công!");
      }
    })
    .catch((error) => console.error("Error:", error));
}
```

### Tạo trang chấm công

1. Tạo giao diện với webcam và nút Chấm công vào/ra
2. Hiển thị trạng thái chấm công hiện tại (đã chấm công vào hoặc chưa)
3. Hiển thị kết quả xác thực khuôn mặt

```javascript
// Chấm công vào
function checkIn() {
  const base64Image = captureImage();

  fetch("http://localhost:3000/api/attendance/check-in", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify({
      image: base64Image,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.message === "Check-in successful with face verification") {
        alert("Chấm công vào thành công!");
        // Cập nhật giao diện
        updateAttendanceStatus();
      } else if (
        data.message === "Face verification failed. Check-in denied."
      ) {
        alert("Nhận diện khuôn mặt thất bại. Vui lòng thử lại.");
      }
    })
    .catch((error) => console.error("Error:", error));
}

// Chấm công ra
function checkOut() {
  const base64Image = captureImage();

  fetch("http://localhost:3000/api/attendance/check-out", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify({
      image: base64Image,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.message === "Check-out successful with face verification") {
        alert("Chấm công ra thành công!");
        // Cập nhật giao diện
        updateAttendanceStatus();
      } else if (
        data.message === "Face verification failed. Check-out denied."
      ) {
        alert("Nhận diện khuôn mặt thất bại. Vui lòng thử lại.");
      }
    })
    .catch((error) => console.error("Error:", error));
}

// Cập nhật trạng thái chấm công hiện tại
function updateAttendanceStatus() {
  fetch("http://localhost:3000/api/attendance/today", {
    method: "GET",
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token"),
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.message === "No attendance record for today") {
        // Chưa chấm công vào
        document.getElementById("checkInBtn").disabled = false;
        document.getElementById("checkOutBtn").disabled = true;
      } else if (data.checkIn && !data.checkOut) {
        // Đã chấm công vào, chưa chấm công ra
        document.getElementById("checkInBtn").disabled = true;
        document.getElementById("checkOutBtn").disabled = false;
      } else if (data.checkIn && data.checkOut) {
        // Đã chấm công vào và ra
        document.getElementById("checkInBtn").disabled = true;
        document.getElementById("checkOutBtn").disabled = true;
      }
    })
    .catch((error) => console.error("Error:", error));
}
```

## Quy tắc giờ làm việc

- Chấm công vào trước 9:00: Đúng giờ
- Chấm công vào sau 9:00: Đi muộn
- Chấm công ra trước 17:00: Về sớm
- Chấm công ra sau 18:00: Làm thêm giờ
- Chấm công ra từ 17:00 đến 18:00: Đúng giờ
