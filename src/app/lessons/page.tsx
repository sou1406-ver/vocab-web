import type { Metadata } from "next";
import Lessons from "../../features/Lessons";
import { LocalReady } from "../LocalReady";
export const metadata: Metadata = { title: "Bộ học", robots: { index: false, follow: false } };
export default function Page() {
  return (
    <LocalReady>
      <Lessons />
    </LocalReady>
  );
}
