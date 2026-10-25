export function siteOrigin() {
  const configured = process.env.SITE_URL;
  if (!configured) return undefined;
  const url = new URL(configured);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
    throw new Error("SITE_URL phải là địa chỉ web công khai hợp lệ.");
  return url.origin;
}
