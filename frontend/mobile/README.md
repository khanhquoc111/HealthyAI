# HealthyAI Mobile — React Native (Expo)

Phiên bản mobile của HealthyAI, dùng chung backend FastAPI với web.

## Cấu trúc thư mục

```
HealthyAI-Mobile/
├── App.jsx                        ← Entry point
├── package.json
└── src/
    ├── api/
    │   ├── config.js              ← Axios instance + base URL
    │   ├── authApi.js             ← login, register, logout
    │   └── healthApi.js           ← health-profile, plugins, medicines
    ├── constants/
    │   └── theme.js               ← Colors, fonts, radius
    ├── hooks/
    │   └── useAuth.js             ← AuthContext + useAuth()
    ├── navigation/
    │   └── AppNavigator.jsx       ← Stack (auth) + BottomTab (main)
    └── screens/
        ├── DangNhapScreen.jsx     ← Đăng nhập
        ├── DangKyScreen.jsx       ← Đăng ký
        ├── TrangChuScreen.jsx     ← Dashboard
        ├── HoSoSucKhoeScreen.jsx  ← Hồ sơ sức khỏe
        ├── PhanTichBenhScreen.jsx ← Phân tích nguy cơ (AI + Rule)
        └── TraThuocScreen.jsx     ← Tra cứu thuốc
```

## Cài đặt & chạy

```bash
# 1. Cài dependencies
npm install

# 2. Chạy với Expo
npx expo start

# 3. Mở trên:
#    - Android emulator: nhấn 'a'
#    - iOS simulator:    nhấn 'i'
#    - Thiết bị thật:    quét QR bằng app Expo Go
```

## Cấu hình URL backend

Sửa file `src/api/config.js`:

```js
// Android emulator (AVD)
export const API_BASE_URL = "http://10.0.2.2:8000";

// iOS simulator
export const API_BASE_URL = "http://localhost:8000";

// Thiết bị thật (cùng mạng WiFi)
export const API_BASE_URL = "http://<IP_MÁY_TÍNH>:8000";
// Ví dụ: "http://192.168.1.5:8000"
```

## Đặt vào dự án

Đặt thư mục này vào cùng cấp với `frontend/web/`:

```
HealthyAI/
├── backend/
├── frontend/
│   ├── web/          ← React web (cũ)
│   └── mobile/       ← Thư mục này (đổi tên từ HealthyAI-Mobile)
└── ...
```

## Backend không cần sửa gì

CORS đang set `allow_origins=["*"]` nên mobile gọi được ngay.
Database dùng chung — cùng user, cùng dữ liệu hồ sơ sức khỏe.
