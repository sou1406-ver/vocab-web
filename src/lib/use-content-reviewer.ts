"use client";
import { useEffect, useState } from "react";
import { useCloud } from "../state/cloud-provider";

export function useContentReviewer() {
  const cloud = useCloud();
  const uid = cloud.user?.uid;
  const [permission, setPermission] = useState<{ uid: string; allowed: boolean }>();
  useEffect(() => {
    if (!uid) return;
    let active = true;
    let stop: (() => void) | undefined;
    void import("./firebase")
      .then((api) => {
        if (active) stop = api.observeContentReviewer(uid, (allowed) => setPermission({ uid, allowed }));
      })
      .catch(() => {
        if (active) setPermission({ uid, allowed: false });
      });
    return () => {
      active = false;
      stop?.();
    };
  }, [uid]);
  return {
    loading: cloud.loading || (!!uid && permission?.uid !== uid),
    allowed: !!uid && permission?.uid === uid && permission.allowed,
  };
}
