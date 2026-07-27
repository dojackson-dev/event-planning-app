"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
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
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
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
exports.PromoterService = void 0;
var common_1 = require("@nestjs/common");
var PromoterService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var PromoterService = _classThis = /** @class */ (function () {
        function PromoterService_1(supabaseService) {
            this.supabaseService = supabaseService;
            this.logger = new common_1.Logger(PromoterService.name);
        }
        // ─────────────────────────────────────────────
        // PROMOTER ACCOUNT
        // ─────────────────────────────────────────────
        PromoterService_1.prototype.createPromoterAccount = function (userId, dto, ownerAccountId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, existing, _a, data, error;
                var _b, _c, _d, _e, _f, _g;
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('promoter_accounts')
                                    .select('id')
                                    .eq('user_id', userId)
                                    .maybeSingle()];
                        case 1:
                            existing = (_h.sent()).data;
                            if (existing) {
                                throw new common_1.BadRequestException('Promoter account already exists for this user');
                            }
                            return [4 /*yield*/, admin
                                    .from('promoter_accounts')
                                    .insert({
                                    user_id: userId,
                                    owner_account_id: ownerAccountId !== null && ownerAccountId !== void 0 ? ownerAccountId : null,
                                    company_name: (_b = dto.companyName) !== null && _b !== void 0 ? _b : null,
                                    contact_name: dto.contactName,
                                    email: dto.email,
                                    phone: (_c = dto.phone) !== null && _c !== void 0 ? _c : null,
                                    location: (_d = dto.location) !== null && _d !== void 0 ? _d : null,
                                    bio: (_e = dto.bio) !== null && _e !== void 0 ? _e : null,
                                    website: (_f = dto.website) !== null && _f !== void 0 ? _f : null,
                                    instagram: (_g = dto.instagram) !== null && _g !== void 0 ? _g : null,
                                    is_active: true,
                                })
                                    .select()
                                    .single()];
                        case 2:
                            _a = _h.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            this.logger.log("Created promoter account ".concat(data.id, " for user ").concat(userId));
                            // Ensure the user's role is set to 'promoter'
                            return [4 /*yield*/, admin.from('users').update({ role: 'promoter' }).eq('id', userId)];
                        case 3:
                            // Ensure the user's role is set to 'promoter'
                            _h.sent();
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        PromoterService_1.prototype.getPromoterProfile = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('promoter_accounts')
                                    .select('*')
                                    .eq('user_id', userId)
                                    .maybeSingle()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        PromoterService_1.prototype.updatePromoterProfile = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, promoter, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('promoter_accounts')
                                    .select('id')
                                    .eq('user_id', userId)
                                    .maybeSingle()];
                        case 1:
                            promoter = (_b.sent()).data;
                            if (!promoter)
                                throw new common_1.NotFoundException('Promoter account not found');
                            return [4 /*yield*/, admin
                                    .from('promoter_accounts')
                                    .update(__assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign({}, (dto.companyName !== undefined && { company_name: dto.companyName })), (dto.contactName !== undefined && { contact_name: dto.contactName })), (dto.email !== undefined && { email: dto.email })), (dto.phone !== undefined && { phone: dto.phone })), (dto.location !== undefined && { location: dto.location })), (dto.bio !== undefined && { bio: dto.bio })), (dto.website !== undefined && { website: dto.website })), (dto.instagram !== undefined && { instagram: dto.instagram })), (dto.profileImageUrl !== undefined && { profile_image_url: dto.profileImageUrl })), (dto.coverImageUrl !== undefined && { cover_image_url: dto.coverImageUrl })), { updated_at: new Date().toISOString() }))
                                    .eq('id', promoter.id)
                                    .select()
                                    .single()];
                        case 2:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        PromoterService_1.prototype.getDashboardStats = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, promoter, events, totalEvents, publishedEvents, eventIds, tickets, totalTicketsSold, totalRevenue;
                var _a, _b, _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('promoter_accounts')
                                    .select('id')
                                    .eq('user_id', userId)
                                    .maybeSingle()];
                        case 1:
                            promoter = (_f.sent()).data;
                            if (!promoter)
                                return [2 /*return*/, { totalEvents: 0, publishedEvents: 0, totalTicketsSold: 0, totalRevenue: 0 }];
                            return [4 /*yield*/, admin
                                    .from('public_events')
                                    .select('id, status')
                                    .eq('promoter_account_id', promoter.id)];
                        case 2:
                            events = (_f.sent()).data;
                            totalEvents = (_a = events === null || events === void 0 ? void 0 : events.length) !== null && _a !== void 0 ? _a : 0;
                            publishedEvents = (_b = events === null || events === void 0 ? void 0 : events.filter(function (e) { return e.status === 'published'; }).length) !== null && _b !== void 0 ? _b : 0;
                            eventIds = (_c = events === null || events === void 0 ? void 0 : events.map(function (e) { return e.id; })) !== null && _c !== void 0 ? _c : [];
                            if (eventIds.length === 0) {
                                return [2 /*return*/, { totalEvents: totalEvents, publishedEvents: publishedEvents, totalTicketsSold: 0, totalRevenue: 0 }];
                            }
                            return [4 /*yield*/, admin
                                    .from('tickets')
                                    .select('amount_paid, status')
                                    .in('public_event_id', eventIds)
                                    .in('status', ['valid', 'checked_in'])];
                        case 3:
                            tickets = (_f.sent()).data;
                            totalTicketsSold = (_d = tickets === null || tickets === void 0 ? void 0 : tickets.length) !== null && _d !== void 0 ? _d : 0;
                            totalRevenue = (_e = tickets === null || tickets === void 0 ? void 0 : tickets.reduce(function (sum, t) { var _a; return sum + Number((_a = t.amount_paid) !== null && _a !== void 0 ? _a : 0); }, 0)) !== null && _e !== void 0 ? _e : 0;
                            return [2 /*return*/, { totalEvents: totalEvents, publishedEvents: publishedEvents, totalTicketsSold: totalTicketsSold, totalRevenue: totalRevenue }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // OWNER ENABLING PROMOTER MODE
        // ─────────────────────────────────────────────
        PromoterService_1.prototype.enablePromoterMode = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, user, membership, ownerAccountId, existing, dto, promoterAccount;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('users')
                                    .select('email, first_name, last_name')
                                    .eq('id', userId)
                                    .maybeSingle()];
                        case 1:
                            user = (_d.sent()).data;
                            if (!user)
                                throw new common_1.NotFoundException('User not found');
                            return [4 /*yield*/, admin
                                    .from('memberships')
                                    .select('owner_account_id')
                                    .eq('user_id', userId)
                                    .eq('role', 'owner')
                                    .maybeSingle()];
                        case 2:
                            membership = (_d.sent()).data;
                            ownerAccountId = (_a = membership === null || membership === void 0 ? void 0 : membership.owner_account_id) !== null && _a !== void 0 ? _a : null;
                            return [4 /*yield*/, admin
                                    .from('promoter_accounts')
                                    .select('id')
                                    .eq('user_id', userId)
                                    .maybeSingle()];
                        case 3:
                            existing = (_d.sent()).data;
                            if (existing) {
                                return [2 /*return*/, { promoterAccount: existing, alreadyExisted: true }];
                            }
                            dto = {
                                contactName: "".concat((_b = user.first_name) !== null && _b !== void 0 ? _b : '', " ").concat((_c = user.last_name) !== null && _c !== void 0 ? _c : '').trim() || 'Promoter',
                                email: user.email,
                            };
                            return [4 /*yield*/, this.createPromoterAccount(userId, dto, ownerAccountId)];
                        case 4:
                            promoterAccount = _d.sent();
                            return [2 /*return*/, { promoterAccount: promoterAccount, alreadyExisted: false }];
                    }
                });
            });
        };
        return PromoterService_1;
    }());
    __setFunctionName(_classThis, "PromoterService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PromoterService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PromoterService = _classThis;
}();
exports.PromoterService = PromoterService;
