import { donorDevOtpBypassEnabled } from './donor-dev-bypass';

describe('donorDevOtpBypassEnabled', () => {
  it('is off unless the flag is exactly "true"', () => {
    expect(donorDevOtpBypassEnabled({ NODE_ENV: 'development' })).toBe(false);
    expect(
      donorDevOtpBypassEnabled({
        NODE_ENV: 'development',
        AUCTION_DEV_OTP_BYPASS: '1',
      }),
    ).toBe(false);
  });

  it('turns on for local development when the flag is set', () => {
    expect(
      donorDevOtpBypassEnabled({
        NODE_ENV: 'development',
        AUCTION_DEV_OTP_BYPASS: 'true',
      }),
    ).toBe(true);
    expect(
      donorDevOtpBypassEnabled({ AUCTION_DEV_OTP_BYPASS: 'true' }),
    ).toBe(true);
  });

  it('can never be on in production, even if the flag is set by mistake', () => {
    expect(
      donorDevOtpBypassEnabled({
        NODE_ENV: 'production',
        AUCTION_DEV_OTP_BYPASS: 'true',
      }),
    ).toBe(false);
  });

  it('can never be on on Render, even if NODE_ENV is not production', () => {
    expect(
      donorDevOtpBypassEnabled({
        NODE_ENV: 'development',
        RENDER: 'true',
        AUCTION_DEV_OTP_BYPASS: 'true',
      }),
    ).toBe(false);
  });
});
