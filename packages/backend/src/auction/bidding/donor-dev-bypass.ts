/**
 * Local-testing aid for the donor SMS check: with AUCTION_DEV_OTP_BYPASS=true the code is NOT texted;
 * it is returned in the API response (and logged) so a developer can type it in.
 *
 * Hard safety rules: it can never be on in production, and never on Render (Render sets RENDER=true),
 * even if the variable is set by mistake.
 */
export function donorDevOtpBypassEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.AUCTION_DEV_OTP_BYPASS !== 'true') return false;
  if (env.NODE_ENV === 'production') return false;
  if (env.RENDER) return false;
  return true;
}
