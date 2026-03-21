import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Parameter decorator to extract the owner account ID from the request
 * Must be used with JwtAuthGuard which sets request.ownerAccountId
 */
export const CurrentOwner = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    return request.ownerAccountId;
  },
);
