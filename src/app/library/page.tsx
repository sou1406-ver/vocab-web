import type { Metadata } from "next";
import { Suspense } from "react";
import Library from "../../features/Library";
import { LocalReady } from "../LocalReady";
export const metadata: Metadata = { title: "Thư viện", robots: { index: false, follow: false } };
export default function Page() {
  return (
    <LocalReady>
      <Suspense
        fallback={
          <div className="page-loading" role="status">
            Đang mở thư viện…
          </div>
        }
      >
        <Library />
      </Suspense>
    </LocalReady>
  );
}
