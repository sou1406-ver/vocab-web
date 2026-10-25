"use client";

import type { ReactNode } from "react";
import { useApp } from "../state/provider";
import { Button } from "@/components/ui/button";

export function LocalReady({ children }: { children: ReactNode }) {
  const { ready, error, init } = useApp();
  if (ready) return children;
  return (
    <div className="page-loading" role="status">
      {error ? (
        <>
          <p role="alert">{error}</p>
          <Button onClick={() => void init()}>Thử lại</Button>
        </>
      ) : (
        "Đang mở góc học của bạn…"
      )}
    </div>
  );
}
