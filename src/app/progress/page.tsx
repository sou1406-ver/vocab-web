import type { Metadata } from "next";
import Progress from "../../features/Progress";
import { LocalReady } from "../LocalReady";
export const metadata: Metadata = { title: "Tiến độ", robots: { index: false, follow: false } };
export default function Page() {
  return (
    <LocalReady>
      <Progress />
    </LocalReady>
  );
}
