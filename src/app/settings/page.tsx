import type { Metadata } from "next";
import Settings from "../../features/Settings";
import { LocalReady } from "../LocalReady";
export const metadata: Metadata = { title: "Cài đặt và sao lưu", robots: { index: false, follow: false } };
export default function Page() {
  return (
    <LocalReady>
      <Settings />
    </LocalReady>
  );
}
