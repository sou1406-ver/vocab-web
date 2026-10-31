export const REVIEWER_PROJECT = "vocab-web-next";

export function reviewerClaimUpdate(account, expectedEmail) {
  if (
    !expectedEmail ||
    !account?.localId ||
    account.email !== expectedEmail ||
    account.emailVerified !== true ||
    account.disabled ||
    !account.providerUserInfo?.some((provider) => provider.providerId === "google.com")
  )
    throw new Error("Expected the specified verified Google account; no account was changed.");
  const claims = JSON.parse(account.customAttributes || "{}");
  if (
    !claims ||
    typeof claims !== "object" ||
    Array.isArray(claims) ||
    claims.admin === true ||
    claims.role === "admin"
  )
    throw new Error("Unexpected existing privileges; review them explicitly before changing this account.");
  return { localId: account.localId, customAttributes: JSON.stringify({ ...claims, contentReviewer: true }) };
}
