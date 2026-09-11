import { timingSafeEqual } from "node:crypto";

export function isValidCronAuthorization(
  authorization: string | null,
  secret = process.env.CRON_SECRET,
) {
  if (!secret || !authorization?.startsWith("Bearer ")) return false;
  const provided = authorization.slice("Bearer ".length);
  const expectedBuffer = Buffer.from(secret);
  const providedBuffer = Buffer.from(provided);
  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}
