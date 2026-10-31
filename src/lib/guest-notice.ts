const key = "vocab:guest-notice:v1";
let acknowledged = false;

export function hasAcknowledgedGuestNotice(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return acknowledged || window.localStorage.getItem(key) === "1";
  } catch {
    return acknowledged;
  }
}

export function acknowledgeGuestNotice(): void {
  if (typeof window === "undefined") return;
  acknowledged = true;
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // A blocked preference store must not prevent learning.
  }
}
