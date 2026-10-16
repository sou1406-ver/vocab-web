/*
 * CẤU HÌNH ĐĂNG NHẬP GOOGLE (Firebase) — xem hướng dẫn trong README, mục "Đăng nhập Google".
 *
 * 1. Vào https://console.firebase.google.com → Add project → (tắt Google Analytics cũng được)
 * 2. Project settings → General → "Your apps" → biểu tượng </> (Web) → đặt tên → Register app
 * 3. Chép đối tượng firebaseConfig hiện ra và dán thay cho null bên dưới.
 * 4. Authentication → Sign-in method → bật Google.
 *    Authentication → Settings → Authorized domains → thêm sou1406-ver.github.io (localhost có sẵn).
 * 5. Firestore Database → Create database → dán Rules trong README.
 *
 * Để null thì web vẫn chạy bình thường với hồ sơ lưu trên máy (không có đăng nhập Google).
 * (Các khoá này là khoá công khai phía trình duyệt — bảo mật nằm ở Firestore Rules.)
 */
window.FIREBASE_CONFIG = null;

/* Ví dụ:
window.FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "ten-du-an.firebaseapp.com",
  projectId: "ten-du-an",
  storageBucket: "ten-du-an.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};
*/
