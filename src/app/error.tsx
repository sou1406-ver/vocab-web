"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="page">
      <h1>Chưa mở được trang này</h1>
      <p>Thử mở lại để tiếp tục từ dữ liệu đã lưu trên máy.</p>
      <Button onClick={reset}>Thử lại</Button>
    </div>
  );
}
