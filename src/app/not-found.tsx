import Link from "next/link";
export default function NotFound() {
  return (
    <div className="page">
      <h1>Không tìm thấy trang</h1>
      <p>Đường dẫn này chưa có nội dung.</p>
      <Link className="button primary" href="/">
        Về Hôm nay
      </Link>
    </div>
  );
}
