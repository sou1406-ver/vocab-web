"use client";
import { useEffect } from "react";

export function ReadingPosition({ slug, version }: { slug: string; version: string }) {
  useEffect(() => {
    const key = `vocab:reading:${slug}:${version}`;
    let position = 0;
    let tracking = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const save = () => {
      if (!tracking) return;
      try {
        sessionStorage.setItem(key, String(position));
      } catch {
        /* Optional reading bookmark. */
      }
    };
    const update = () => {
      if (window.location.pathname !== `/knowledge/${slug}`) return;
      position = window.scrollY;
      clearTimeout(timer);
      timer = setTimeout(save, 150);
    };
    const frame = requestAnimationFrame(() => {
      if (window.location.pathname !== `/knowledge/${slug}`) return;
      try {
        const y = Number(sessionStorage.getItem(key));
        if (Number.isFinite(y) && y > 0) window.scrollTo({ top: y, behavior: "instant" });
      } catch {
        /* Reading remains available with storage disabled. */
      }
      position = window.scrollY;
      tracking = true;
      window.addEventListener("scroll", update, { passive: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      window.removeEventListener("scroll", update);
      save();
    };
  }, [slug, version]);
  return null;
}
