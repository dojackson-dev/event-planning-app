import { HttpException } from '@nestjs/common';

/** Error body shape for the public auction API: `{ statusCode, code, message, ...extra }`. */
export function codedError(
  status: number,
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
): HttpException {
  return new HttpException(
    { statusCode: status, code, message, ...extra },
    status,
  );
}

export function tooManyRequests(
  message = 'Too many requests. Please wait a moment and try again.',
  retryAfterSeconds = 60,
): HttpException {
  return codedError(429, 'rate_limited', message, {
    retry_after_seconds: retryAfterSeconds,
  });
}
