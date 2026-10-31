export function hasContentReviewRole(claims: unknown): boolean {
  return (
    !!claims &&
    typeof claims === "object" &&
    !Array.isArray(claims) &&
    (claims as Record<string, unknown>).contentReviewer === true
  );
}
