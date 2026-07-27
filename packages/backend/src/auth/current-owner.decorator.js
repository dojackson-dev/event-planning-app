"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentOwner = void 0;
var common_1 = require("@nestjs/common");
/**
 * Parameter decorator to extract the owner account ID from the request
 * Must be used with JwtAuthGuard which sets request.ownerAccountId
 */
exports.CurrentOwner = (0, common_1.createParamDecorator)(function (data, ctx) {
    var request = ctx.switchToHttp().getRequest();
    return request.ownerAccountId;
});
