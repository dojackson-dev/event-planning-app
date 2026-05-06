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
exports.TrialController = void 0;
var common_1 = require("@nestjs/common");
var TrialController = function () {
    var _classDecorators = [(0, common_1.Controller)('trial')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _getTrialInfo_decorators;
    var _getDefaultTrialDays_decorators;
    var _setDefaultTrialDays_decorators;
    var TrialController = _classThis = /** @class */ (function () {
        function TrialController_1(trialService, supabaseService) {
            this.trialService = (__runInitializers(this, _instanceExtraInitializers), trialService);
            this.supabaseService = supabaseService;
            this.logger = new common_1.Logger(TrialController.name);
        }
        TrialController_1.prototype.extractToken = function (authorization) {
            if (!authorization) {
                throw new common_1.UnauthorizedException('No authorization header');
            }
            return authorization.replace('Bearer ', '');
        };
        TrialController_1.prototype.getOwnerAccountId = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var token, userId, supabase_1, data_1, supabase, _a, user, error, adminClient, data;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            token = this.extractToken(authorization);
                            if (!token.startsWith('local-')) return [3 /*break*/, 2];
                            userId = token.replace('local-', '');
                            supabase_1 = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase_1
                                    .from('memberships')
                                    .select('owner_account_id')
                                    .eq('user_id', userId)
                                    .eq('role', 'owner')
                                    .single()];
                        case 1:
                            data_1 = (_b.sent()).data;
                            if (!data_1)
                                throw new common_1.UnauthorizedException('Owner account not found');
                            return [2 /*return*/, data_1.owner_account_id];
                        case 2:
                            supabase = this.supabaseService.setAuthContext(token);
                            return [4 /*yield*/, supabase.auth.getUser()];
                        case 3:
                            _a = _b.sent(), user = _a.data.user, error = _a.error;
                            if (error || !user) {
                                throw new common_1.UnauthorizedException('Invalid token');
                            }
                            adminClient = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, adminClient
                                    .from('memberships')
                                    .select('owner_account_id')
                                    .eq('user_id', user.id)
                                    .eq('role', 'owner')
                                    .single()];
                        case 4:
                            data = (_b.sent()).data;
                            if (!data)
                                throw new common_1.UnauthorizedException('Owner account not found');
                            return [2 /*return*/, data.owner_account_id];
                    }
                });
            });
        };
        /**
         * Get trial info for current owner
         * GET /trial/info
         */
        TrialController_1.prototype.getTrialInfo = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var ownerAccountId, trialInfo;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getOwnerAccountId(authorization)];
                        case 1:
                            ownerAccountId = _a.sent();
                            return [4 /*yield*/, this.trialService.getTrialInfo(ownerAccountId)];
                        case 2:
                            trialInfo = _a.sent();
                            return [2 /*return*/, trialInfo];
                    }
                });
            });
        };
        /**
         * Get default trial days
         * GET /trial/settings/default-days
         */
        TrialController_1.prototype.getDefaultTrialDays = function () {
            return __awaiter(this, void 0, void 0, function () {
                var days;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.trialService.getDefaultTrialDays()];
                        case 1:
                            days = _a.sent();
                            return [2 /*return*/, { defaultTrialDays: days }];
                    }
                });
            });
        };
        /**
         * Set default trial days (admin only)
         * POST /trial/settings/default-days
         */
        TrialController_1.prototype.setDefaultTrialDays = function (body) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (body.days < 1 || body.days > 365) {
                                throw new Error('Trial days must be between 1 and 365');
                            }
                            return [4 /*yield*/, this.trialService.setDefaultTrialDays(body.days)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { message: "Trial days set to ".concat(body.days), defaultTrialDays: body.days }];
                    }
                });
            });
        };
        return TrialController_1;
    }());
    __setFunctionName(_classThis, "TrialController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getTrialInfo_decorators = [(0, common_1.Get)('info')];
        _getDefaultTrialDays_decorators = [(0, common_1.Get)('settings/default-days')];
        _setDefaultTrialDays_decorators = [(0, common_1.Post)('settings/default-days')];
        __esDecorate(_classThis, null, _getTrialInfo_decorators, { kind: "method", name: "getTrialInfo", static: false, private: false, access: { has: function (obj) { return "getTrialInfo" in obj; }, get: function (obj) { return obj.getTrialInfo; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getDefaultTrialDays_decorators, { kind: "method", name: "getDefaultTrialDays", static: false, private: false, access: { has: function (obj) { return "getDefaultTrialDays" in obj; }, get: function (obj) { return obj.getDefaultTrialDays; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _setDefaultTrialDays_decorators, { kind: "method", name: "setDefaultTrialDays", static: false, private: false, access: { has: function (obj) { return "setDefaultTrialDays" in obj; }, get: function (obj) { return obj.setDefaultTrialDays; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        TrialController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return TrialController = _classThis;
}();
exports.TrialController = TrialController;
