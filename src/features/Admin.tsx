"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useContentReviewer } from "../lib/use-content-reviewer";

const AdminTools = dynamic(() => import("./AdminTools"), {
  loading: () => <p role="status">Đang mở công cụ admin…</p>,
});
// Gated by the contentReviewer claim, the same role that may edit content.
export default function Admin() {
  const permission = useContentReviewer();
  if (permission.loading)
    return (
      <div className="page">
        <p role="status">Đang xác minh quyền admin…</p>
      </div>
    );
  if (!permission.allowed)
    return (
      <div className="page">
        <section className="panel empty-state">
          <h1>Admin</h1>
          <p>Khu vực này dành cho tài khoản được cấp quyền kiểm tra nội dung.</p>
          <Link className="button primary" href="/">
            Về trang Hôm nay
          </Link>
        </section>
      </div>
    );
  return <AdminTools />;
}
