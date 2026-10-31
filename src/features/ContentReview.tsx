"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useContentReviewer } from "../lib/use-content-reviewer";

const ReviewTools = dynamic(() => import("./ContentReviewTools"), {
  loading: () => <p role="status">Đang mở nội dung…</p>,
});
export default function ContentReview() {
  const permission = useContentReviewer();
  if (permission.loading)
    return (
      <div className="page">
        <p role="status">Đang xác minh quyền kiểm tra nội dung…</p>
      </div>
    );
  if (!permission.allowed)
    return (
      <div className="page">
        <section className="panel empty-state">
          <h1>Kiểm tra nội dung</h1>
          <p>Khu vực này dành cho tài khoản được cấp quyền kiểm tra nội dung.</p>
          <Link className="button primary" href="/">
            Về trang Hôm nay
          </Link>
        </section>
      </div>
    );
  return <ReviewTools />;
}
