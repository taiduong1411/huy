# API Documentation

Base URL: `http://localhost:3000/api`
Auth Header: `Authorization: Bearer <token>`

### POST /api/users/register

```json
// Input
{
  "email": "user@email.com",
  "password": "password123",
  "name": "User Name",
  "phone": "1234567890"
}

// Output
{
  "userId": "123",
  "name": "User Name",
  "email": "user@email.com",
  "token": "jwt_token"
}
```

### POST /api/users/login

```json
// Input
{
  "email": "user@email.com",
  "password": "password123"
}

// Output
{
  "userId": "123",
  "name": "User Name",
  "token": "jwt_token"
}
```

### POST /api/admin/Attendances

```json
// Input
{
  "userId": "abc",
  "status": true
}

// Output
{
  "userId": "123",
  "timestamp": "2024-03-21T08:30:00Z",
  "status": "on_time",
}
```

### GET /api/attendance/:userId

```json
// Output
[
  {
    "date": "2024-03-21",
    "checkIn": "08:30:00",
    "status": "on_time"
  }
]
```

### GET /api/admin/attendance/stats

```json
// Output
{
  "totalUsers": 50,
  "presentToday": 45,
  "lateToday": 5,
  "absentToday": 5
}
```

### Error Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```
