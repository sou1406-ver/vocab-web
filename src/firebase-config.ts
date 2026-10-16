import type { FirebaseOptions } from "firebase/app";

/* Cấu hình Firebase cho đăng nhập Google + đồng bộ tiến độ (project vocab-web-a0d13).
   Đây là khoá phía trình duyệt (công khai) — an toàn để commit; dữ liệu được bảo vệ bằng Firestore Rules.
   Đặt thành null để tắt đăng nhập Google (web vẫn chạy với hồ sơ lưu trên máy). */
export const FIREBASE_CONFIG: FirebaseOptions | null = {
  apiKey: "AIzaSyCDFnL4PEC8VSSeG0sKp1ZMfGT_8HYzY5A",
  authDomain: "vocab-web-a0d13.firebaseapp.com",
  projectId: "vocab-web-a0d13",
  storageBucket: "vocab-web-a0d13.firebasestorage.app",
  messagingSenderId: "847011402046",
  appId: "1:847011402046:web:fb37654b8cd7cf3d635c6f",
  measurementId: "G-KJ4M8CZ3S4",
};
