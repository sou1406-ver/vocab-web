import type { Metadata } from "next";
import ContentReview from "../../features/ContentReview";

export const metadata: Metadata = { title: "Kiểm tra nội dung", robots: { index: false, follow: false } };
export default function Page() {
  return <ContentReview />;
}
