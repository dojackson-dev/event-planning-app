"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthFlowController = void 0;
var common_1 = require("@nestjs/common");
var AuthFlowController = function () {
    var _classDecorators = [(0, common_1.Controller)('auth/flow')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _ownerSignup_decorators;
    var _ownerLogin_decorators;
    var _verifyPhone_decorators;
    var _getBillingPortal_decorators;
    var _createInvite_decorators;
    var _acceptInvite_decorators;
    var _recordSmsConsent_decorators;
    var _verifyClientPhone_decorators;
    var _vendorSignup_decorators;
    var _promoterSignup_decorators;
    var _artistSignup_decorators;
    var _vendorLogin_decorators;
    var _adminLogin_decorators;
    var _unifiedLogin_decorators;
    var _unifiedMe_decorators;
    var _addRole_decorators;
    var AuthFlowController = _classThis = /** @class */ (function () {
        function AuthFlowController_1(authFlowService) {
            this.authFlowService = (__runInitializers(this, _instanceExtraInitializers), authFlowService);
        }
        /**
         * OWNER ROUTES
         */
        AuthFlowController_1.prototype.ownerSignup = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.authFlowService.ownerSignup(dto)];
                });
            });
        };
        AuthFlowController_1.prototype.ownerLogin = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.authFlowService.ownerLogin(dto)];
                });
            });
        };
        AuthFlowController_1.prototype.verifyPhone = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.authFlowService.verifyPhone(dto)];
                });
            });
        };
        AuthFlowController_1.prototype.getBillingPortal = function (req) {
            return __awaiter(this, void 0, void 0, function () {
                var ownerUserId;
                var _a;
                return __generator(this, function (_b) {
                    ownerUserId = ((_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split('Bearer ')[1]) || '';
                    return [2 /*return*/, this.authFlowService.getBillingPortal(ownerUserId)];
                });
            });
        };
        /**
         * CLIENT INVITE ROUTES
         */
        AuthFlowController_1.prototype.createInvite = function (dto, req) {
            return __awaiter(this, void 0, void 0, function () {
                var ownerUserId;
                var _a;
                return __generator(this, function (_b) {
                    ownerUserId = ((_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split('Bearer ')[1]) || '';
                    return [2 /*return*/, this.authFlowService.createClientInvite(dto, ownerUserId)];
                });
            });
        };
        AuthFlowController_1.prototype.acceptInvite = function (dto, req) {
            return __awaiter(this, void 0, void 0, function () {
                var ipAddress, userAgent;
                return __generator(this, function (_a) {
                    ipAddress = req.ip || req.headers['x-forwarded-for'];
                    userAgent = req.headers['user-agent'];
                    return [2 /*return*/, this.authFlowService.acceptClientInvite(dto, ipAddress, userAgent)];
                });
            });
        };
        AuthFlowController_1.prototype.recordSmsConsent = function (dto, req) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    dto.ipAddress = req.ip || req.headers['x-forwarded-for'];
                    dto.userAgent = req.headers['user-agent'];
                    return [2 /*return*/, this.authFlowService.recordSmsConsent(dto)];
                });
            });
        };
        AuthFlowController_1.prototype.verifyClientPhone = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.authFlowService.verifyPhone(dto)];
                });
            });
        };
        /**
         * VENDOR ROUTES
         */
        AuthFlowController_1.prototype.vendorSignup = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.authFlowService.vendorSignup(dto)];
                });
            });
        };
        AuthFlowController_1.prototype.promoterSignup = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.authFlowService.promoterSignup(dto)];
                });
            });
        };
        AuthFlowController_1.prototype.artistSignup = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.authFlowService.artistSignup(dto)];
                });
            });
        };
        AuthFlowController_1.prototype.vendorLogin = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.authFlowService.vendorLogin(dto.email, dto.password)];
                });
            });
        };
        /**
         * ADMIN ROUTES
         */
        AuthFlowController_1.prototype.adminLogin = function (body) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.authFlowService.adminLogin(body.email, body.password)];
                });
            });
        };
        /**
         * UNIFIED ROUTES — multi-role support
         */
        /**
         * Single login endpoint for all role types.
         * Returns session + user + roles[] so the frontend can route appropriately.
         * - 1 role  → frontend navigates directly to that role's dashboard
         * - 2+ roles → frontend navigates to /choose-role picker page
         */
        AuthFlowController_1.prototype.unifiedLogin = function (body) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.authFlowService.unifiedLogin(body.email, body.password)];
                });
            });
        };
        /** Returns the authenticated user's roles — used by the frontend to refresh stale sessions */
        AuthFlowController_1.prototype.unifiedMe = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var token;
                return __generator(this, function (_a) {
                    token = (authorization === null || authorization === void 0 ? void 0 : authorization.replace('Bearer ', '')) || '';
                    return [2 /*return*/, this.authFlowService.getMyRoles(token)];
                });
            });
        };
        /**
         * Add a new role to the authenticated user.
         * Body: { newRole: 'owner' | 'vendor' }
         * Header: Authorization: Bearer <access_token>
         */
        AuthFlowController_1.prototype.addRole = function (body, authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var token;
                return __generator(this, function (_a) {
                    token = (authorization === null || authorization === void 0 ? void 0 : authorization.replace('Bearer ', '')) || '';
                    return [2 /*return*/, this.authFlowService.addRoleToUser(token, body.newRole)];
                });
            });
        };
        return AuthFlowController_1;
    }());
    __setFunctionName(_classThis, "AuthFlowController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _ownerSignup_decorators = [(0, common_1.Post)('owner/signup')];
        _ownerLogin_decorators = [(0, common_1.Post)('owner/login')];
        _verifyPhone_decorators = [(0, common_1.Post)('owner/verify-phone')];
        _getBillingPortal_decorators = [(0, common_1.Get)('owner/billing-portal')];
        _createInvite_decorators = [(0, common_1.Post)('client/invite')];
        _acceptInvite_decorators = [(0, common_1.Post)('client/accept-invite')];
        _recordSmsConsent_decorators = [(0, common_1.Post)('client/sms-consent')];
        _verifyClientPhone_decorators = [(0, common_1.Post)('client/verify-phone')];
        _vendorSignup_decorators = [(0, common_1.Post)('vendor/signup')];
        _promoterSignup_decorators = [(0, common_1.Post)('promoter/signup')];
        _artistSignup_decorators = [(0, common_1.Post)('artist/signup')];
        _vendorLogin_decorators = [(0, common_1.Post)('vendor/login')];
        _adminLogin_decorators = [(0, common_1.Post)('admin/login')];
        _unifiedLogin_decorators = [(0, common_1.Post)('unified/login')];
        _unifiedMe_decorators = [(0, common_1.Get)('unified/me')];
        _addRole_decorators = [(0, common_1.Post)('add-role')];
        __esDecorate(_classThis, null, _ownerSignup_decorators, { kind: "method", name: "ownerSignup", static: false, private: false, access: { has: function (obj) { return "ownerSignup" in obj; }, get: function (obj) { return obj.ownerSignup; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _ownerLogin_decorators, { kind: "method", name: "ownerLogin", static: false, private: false, access: { has: function (obj) { return "ownerLogin" in obj; }, get: function (obj) { return obj.ownerLogin; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _verifyPhone_decorators, { kind: "method", name: "verifyPhone", static: false, private: false, access: { has: function (obj) { return "verifyPhone" in obj; }, get: function (obj) { return obj.verifyPhone; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getBillingPortal_decorators, { kind: "method", name: "getBillingPortal", static: false, private: false, access: { has: function (obj) { return "getBillingPortal" in obj; }, get: function (obj) { return obj.getBillingPortal; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createInvite_decorators, { kind: "method", name: "createInvite", static: false, private: false, access: { has: function (obj) { return "createInvite" in obj; }, get: function (obj) { return obj.createInvite; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _acceptInvite_decorators, { kind: "method", name: "acceptInvite", static: false, private: false, access: { has: function (obj) { return "acceptInvite" in obj; }, get: function (obj) { return obj.acceptInvite; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _recordSmsConsent_decorators, { kind: "method", name: "recordSmsConsent", static: false, private: false, access: { has: function (obj) { return "recordSmsConsent" in obj; }, get: function (obj) { return obj.recordSmsConsent; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _verifyClientPhone_decorators, { kind: "method", name: "verifyClientPhone", static: false, private: false, access: { has: function (obj) { return "verifyClientPhone" in obj; }, get: function (obj) { return obj.verifyClientPhone; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _vendorSignup_decorators, { kind: "method", name: "vendorSignup", static: false, private: false, access: { has: function (obj) { return "vendorSignup" in obj; }, get: function (obj) { return obj.vendorSignup; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _promoterSignup_decorators, { kind: "method", name: "promoterSignup", static: false, private: false, access: { has: function (obj) { return "promoterSignup" in obj; }, get: function (obj) { return obj.promoterSignup; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _artistSignup_decorators, { kind: "method", name: "artistSignup", static: false, private: false, access: { has: function (obj) { return "artistSignup" in obj; }, get: function (obj) { return obj.artistSignup; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _vendorLogin_decorators, { kind: "method", name: "vendorLogin", static: false, private: false, access: { has: function (obj) { return "vendorLogin" in obj; }, get: function (obj) { return obj.vendorLogin; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _adminLogin_decorators, { kind: "method", name: "adminLogin", static: false, private: false, access: { has: function (obj) { return "adminLogin" in obj; }, get: function (obj) { return obj.adminLogin; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _unifiedLogin_decorators, { kind: "method", name: "unifiedLogin", static: false, private: false, access: { has: function (obj) { return "unifiedLogin" in obj; }, get: function (obj) { return obj.unifiedLogin; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _unifiedMe_decorators, { kind: "method", name: "unifiedMe", static: false, private: false, access: { has: function (obj) { return "unifiedMe" in obj; }, get: function (obj) { return obj.unifiedMe; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _addRole_decorators, { kind: "method", name: "addRole", static: false, private: false, access: { has: function (obj) { return "addRole" in obj; }, get: function (obj) { return obj.addRole; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AuthFlowController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AuthFlowController = _classThis;
}();
exports.AuthFlowController = AuthFlowController;
