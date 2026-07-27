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
exports.IntakeFormsController = void 0;
var common_1 = require("@nestjs/common");
var IntakeFormsController = function () {
    var _classDecorators = [(0, common_1.Controller)('intake-forms')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _getPublicFormInfo_decorators;
    var _create_decorators;
    var _findAll_decorators;
    var _findOne_decorators;
    var _update_decorators;
    var _remove_decorators;
    var _convertToBooking_decorators;
    var _recreateEvent_decorators;
    var _resendInvitation_decorators;
    var IntakeFormsController = _classThis = /** @class */ (function () {
        function IntakeFormsController_1(intakeFormsService, supabaseService) {
            this.intakeFormsService = (__runInitializers(this, _instanceExtraInitializers), intakeFormsService);
            this.supabaseService = supabaseService;
        }
        IntakeFormsController_1.prototype.extractToken = function (authorization) {
            if (!authorization) {
                throw new common_1.UnauthorizedException('No authorization header');
            }
            return authorization.replace('Bearer ', '');
        };
        IntakeFormsController_1.prototype.getUserId = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var token, userId, supabaseWithAuth, _a, user, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            token = this.extractToken(authorization);
                            // Handle dev tokens (local-<uuid> format)
                            if (token.startsWith('local-')) {
                                userId = token.replace('local-', '');
                                if (userId)
                                    return [2 /*return*/, userId];
                                throw new common_1.UnauthorizedException('Invalid dev token format');
                            }
                            supabaseWithAuth = this.supabaseService.setAuthContext(token);
                            return [4 /*yield*/, supabaseWithAuth.auth.getUser()];
                        case 1:
                            _a = _b.sent(), user = _a.data.user, error = _a.error;
                            if (error || !user) {
                                throw new common_1.UnauthorizedException('Invalid token');
                            }
                            return [2 /*return*/, user.id];
                    }
                });
            });
        };
        /** Resolves an identifier that is either a UUID (primary_owner_id) or an intake_slug.
         *  Returns the primary_owner_id (UUID) in both cases. */
        IntakeFormsController_1.prototype.resolveOwnerIdentifier = function (identifier) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, isUuid, _a, data_1, error_1, _b, data, error;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
                            if (!isUuid) return [3 /*break*/, 2];
                            return [4 /*yield*/, admin
                                    .from('owner_accounts')
                                    .select('primary_owner_id')
                                    .eq('primary_owner_id', identifier)
                                    .single()];
                        case 1:
                            _a = _c.sent(), data_1 = _a.data, error_1 = _a.error;
                            if (error_1 || !data_1)
                                throw new common_1.NotFoundException('Owner not found');
                            return [2 /*return*/, data_1.primary_owner_id];
                        case 2: return [4 /*yield*/, admin
                                .from('owner_accounts')
                                .select('primary_owner_id')
                                .eq('intake_slug', identifier)
                                .single()];
                        case 3:
                            _b = _c.sent(), data = _b.data, error = _b.error;
                            if (error || !data)
                                throw new common_1.NotFoundException('Owner not found');
                            return [2 /*return*/, data.primary_owner_id];
                    }
                });
            });
        };
        /** Public: returns the owner's business name so the form page can display a branded header.
         *  Accepts either a UUID or an intake_slug as :ownerId. */
        IntakeFormsController_1.prototype.getPublicFormInfo = function (ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, resolvedId, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.resolveOwnerIdentifier(ownerId)];
                        case 1:
                            resolvedId = _b.sent();
                            return [4 /*yield*/, admin
                                    .from('owner_accounts')
                                    .select('business_name, logo_url, intake_slug')
                                    .eq('primary_owner_id', resolvedId)
                                    .single()];
                        case 2:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error || !data)
                                throw new common_1.NotFoundException('Owner not found');
                            return [2 /*return*/, { businessName: data.business_name, logoUrl: data.logo_url, intakeSlug: data.intake_slug }];
                    }
                });
            });
        };
        IntakeFormsController_1.prototype.create = function (authorization, createDto) {
            return __awaiter(this, void 0, void 0, function () {
                var token, userId, supabaseWithAuth, result, error_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 3, , 4]);
                            console.log('Received intake form data:', JSON.stringify(createDto, null, 2));
                            token = this.extractToken(authorization);
                            return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            supabaseWithAuth = this.supabaseService.setAuthContext(token);
                            return [4 /*yield*/, this.intakeFormsService.create(supabaseWithAuth, userId, createDto)];
                        case 2:
                            result = _a.sent();
                            console.log('Successfully created intake form:', result);
                            return [2 /*return*/, result];
                        case 3:
                            error_2 = _a.sent();
                            console.error('Error creating intake form:', (error_2 === null || error_2 === void 0 ? void 0 : error_2.message) || error_2);
                            throw error_2;
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        IntakeFormsController_1.prototype.findAll = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var token, userId, supabaseWithAuth;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            token = this.extractToken(authorization);
                            return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            supabaseWithAuth = this.supabaseService.setAuthContext(token);
                            return [2 /*return*/, this.intakeFormsService.findAll(supabaseWithAuth, userId)];
                    }
                });
            });
        };
        // ── Authenticated routes ───────────────────────────────────────────────────
        IntakeFormsController_1.prototype.findOne = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var token, userId, supabaseWithAuth;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            token = this.extractToken(authorization);
                            return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            supabaseWithAuth = this.supabaseService.setAuthContext(token);
                            return [2 /*return*/, this.intakeFormsService.findOne(supabaseWithAuth, userId, id)];
                    }
                });
            });
        };
        IntakeFormsController_1.prototype.update = function (authorization, id, updateDto) {
            return __awaiter(this, void 0, void 0, function () {
                var token, userId, supabaseWithAuth;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            token = this.extractToken(authorization);
                            return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            supabaseWithAuth = this.supabaseService.setAuthContext(token);
                            return [2 /*return*/, this.intakeFormsService.update(supabaseWithAuth, userId, id, updateDto)];
                    }
                });
            });
        };
        IntakeFormsController_1.prototype.remove = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var token, userId, supabaseWithAuth;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            token = this.extractToken(authorization);
                            return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            supabaseWithAuth = this.supabaseService.setAuthContext(token);
                            return [2 /*return*/, this.intakeFormsService.remove(supabaseWithAuth, userId, id)];
                    }
                });
            });
        };
        IntakeFormsController_1.prototype.convertToBooking = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var token, userId, supabaseWithAuth, result, error_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 3, , 4]);
                            console.log('Converting intake form to booking:', id);
                            token = this.extractToken(authorization);
                            return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            console.log('User ID:', userId);
                            supabaseWithAuth = this.supabaseService.setAuthContext(token);
                            return [4 /*yield*/, this.intakeFormsService.convertToBooking(supabaseWithAuth, userId, id)];
                        case 2:
                            result = _a.sent();
                            console.log('Successfully converted to booking:', result);
                            return [2 /*return*/, result];
                        case 3:
                            error_3 = _a.sent();
                            console.error('Error converting to booking:', error_3);
                            throw error_3;
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        IntakeFormsController_1.prototype.recreateEvent = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var token, userId, supabaseWithAuth, result, error_4;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 3, , 4]);
                            console.log('Recreating event for intake form:', id);
                            token = this.extractToken(authorization);
                            return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            supabaseWithAuth = this.supabaseService.setAuthContext(token);
                            return [4 /*yield*/, this.intakeFormsService.recreateEvent(supabaseWithAuth, userId, id)];
                        case 2:
                            result = _a.sent();
                            console.log('Successfully recreated event:', result);
                            return [2 /*return*/, result];
                        case 3:
                            error_4 = _a.sent();
                            console.error('Error recreating event:', error_4);
                            throw error_4;
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        IntakeFormsController_1.prototype.resendInvitation = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var token, userId, supabaseWithAuth;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            token = this.extractToken(authorization);
                            return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            supabaseWithAuth = this.supabaseService.setAuthContext(token);
                            return [2 /*return*/, this.intakeFormsService.resendInvitation(supabaseWithAuth, userId, id)];
                    }
                });
            });
        };
        return IntakeFormsController_1;
    }());
    __setFunctionName(_classThis, "IntakeFormsController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getPublicFormInfo_decorators = [(0, common_1.Get)('public-form/:ownerId')];
        _create_decorators = [(0, common_1.Post)()];
        _findAll_decorators = [(0, common_1.Get)()];
        _findOne_decorators = [(0, common_1.Get)(':id')];
        _update_decorators = [(0, common_1.Put)(':id')];
        _remove_decorators = [(0, common_1.Delete)(':id')];
        _convertToBooking_decorators = [(0, common_1.Post)(':id/convert-to-booking')];
        _recreateEvent_decorators = [(0, common_1.Post)(':id/recreate-event')];
        _resendInvitation_decorators = [(0, common_1.Post)(':id/resend-invitation')];
        __esDecorate(_classThis, null, _getPublicFormInfo_decorators, { kind: "method", name: "getPublicFormInfo", static: false, private: false, access: { has: function (obj) { return "getPublicFormInfo" in obj; }, get: function (obj) { return obj.getPublicFormInfo; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _create_decorators, { kind: "method", name: "create", static: false, private: false, access: { has: function (obj) { return "create" in obj; }, get: function (obj) { return obj.create; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findAll_decorators, { kind: "method", name: "findAll", static: false, private: false, access: { has: function (obj) { return "findAll" in obj; }, get: function (obj) { return obj.findAll; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findOne_decorators, { kind: "method", name: "findOne", static: false, private: false, access: { has: function (obj) { return "findOne" in obj; }, get: function (obj) { return obj.findOne; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _update_decorators, { kind: "method", name: "update", static: false, private: false, access: { has: function (obj) { return "update" in obj; }, get: function (obj) { return obj.update; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _remove_decorators, { kind: "method", name: "remove", static: false, private: false, access: { has: function (obj) { return "remove" in obj; }, get: function (obj) { return obj.remove; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _convertToBooking_decorators, { kind: "method", name: "convertToBooking", static: false, private: false, access: { has: function (obj) { return "convertToBooking" in obj; }, get: function (obj) { return obj.convertToBooking; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _recreateEvent_decorators, { kind: "method", name: "recreateEvent", static: false, private: false, access: { has: function (obj) { return "recreateEvent" in obj; }, get: function (obj) { return obj.recreateEvent; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _resendInvitation_decorators, { kind: "method", name: "resendInvitation", static: false, private: false, access: { has: function (obj) { return "resendInvitation" in obj; }, get: function (obj) { return obj.resendInvitation; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        IntakeFormsController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return IntakeFormsController = _classThis;
}();
exports.IntakeFormsController = IntakeFormsController;
