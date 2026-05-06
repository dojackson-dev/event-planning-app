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
exports.OwnerController = void 0;
var common_1 = require("@nestjs/common");
var OwnerController = function () {
    var _classDecorators = [(0, common_1.Controller)('owner')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _getAccountId_decorators;
    var _getProfile_decorators;
    var _updateProfile_decorators;
    var _getVenue_decorators;
    var _updateVenue_decorators;
    var _getPaymentSchedule_decorators;
    var _updatePaymentSchedule_decorators;
    var _getTrialStatus_decorators;
    var _getVenues_decorators;
    var _createVenue_decorators;
    var _updateVenueById_decorators;
    var _deleteVenue_decorators;
    var _getRevenueAnalytics_decorators;
    var _getBlackouts_decorators;
    var _createBlackout_decorators;
    var _deleteBlackout_decorators;
    var OwnerController = _classThis = /** @class */ (function () {
        function OwnerController_1(supabaseService) {
            this.supabaseService = (__runInitializers(this, _instanceExtraInitializers), supabaseService);
        }
        OwnerController_1.prototype.getUserId = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var token, supabase, _a, user, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!authorization)
                                throw new common_1.UnauthorizedException('No authorization header');
                            token = authorization.replace('Bearer ', '');
                            supabase = this.supabaseService.setAuthContext(token);
                            return [4 /*yield*/, supabase.auth.getUser()];
                        case 1:
                            _a = _b.sent(), user = _a.data.user, error = _a.error;
                            if (error || !user)
                                throw new common_1.UnauthorizedException('Invalid token');
                            return [2 /*return*/, user.id];
                    }
                });
            });
        };
        /**
         * Resolves the owner_account id for a given user.
         * Primary: looks up via memberships table (user_id → owner_account_id).
         * Fallback: primary_owner_id column on owner_accounts (auth UUID stored there).
         */
        OwnerController_1.prototype.getOwnerAccountId = function (userId, admin) {
            return __awaiter(this, void 0, void 0, function () {
                var membership, ownerAccount;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, admin
                                .from('memberships')
                                .select('owner_account_id')
                                .eq('user_id', userId)
                                .limit(1)
                                .maybeSingle()];
                        case 1:
                            membership = (_b.sent()).data;
                            if (membership === null || membership === void 0 ? void 0 : membership.owner_account_id)
                                return [2 /*return*/, membership.owner_account_id];
                            return [4 /*yield*/, admin
                                    .from('owner_accounts')
                                    .select('id')
                                    .eq('primary_owner_id', userId)
                                    .maybeSingle()];
                        case 2:
                            ownerAccount = (_b.sent()).data;
                            return [2 /*return*/, (_a = ownerAccount === null || ownerAccount === void 0 ? void 0 : ownerAccount.id) !== null && _a !== void 0 ? _a : null];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // GET /owner/account-id
        // Returns the owner_account_id for the current user (used by billing page)
        // ─────────────────────────────────────────────
        OwnerController_1.prototype.getAccountId = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, admin, ownerAccountId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getOwnerAccountId(userId, admin)];
                        case 2:
                            ownerAccountId = _a.sent();
                            return [2 /*return*/, { ownerAccountId: ownerAccountId }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // GET /owner/profile
        // Returns owner branding: businessName + logoUrl
        // ─────────────────────────────────────────────
        OwnerController_1.prototype.getProfile = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, admin, ownerAccountId, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _b.sent();
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getOwnerAccountId(userId, admin)];
                        case 2:
                            ownerAccountId = _b.sent();
                            console.log("[owner/profile GET] userId=".concat(userId, " ownerAccountId=").concat(ownerAccountId));
                            if (!ownerAccountId)
                                return [2 /*return*/, { businessName: '', logoUrl: null }];
                            return [4 /*yield*/, admin
                                    .from('owner_accounts')
                                    .select('business_name, logo_url, cover_image_url')
                                    .eq('id', ownerAccountId)
                                    .maybeSingle()];
                        case 3:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error) {
                                console.error('[owner/profile] DB error:', error.message);
                            }
                            return [2 /*return*/, {
                                    businessName: (data === null || data === void 0 ? void 0 : data.business_name) || '',
                                    logoUrl: (data === null || data === void 0 ? void 0 : data.logo_url) || null,
                                    coverImageUrl: (data === null || data === void 0 ? void 0 : data.cover_image_url) || null,
                                }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // PUT /owner/profile
        // Updates owner branding (logoUrl)
        // ─────────────────────────────────────────────
        OwnerController_1.prototype.updateProfile = function (authorization, body) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, admin, ownerAccountId, updates, error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getOwnerAccountId(userId, admin)];
                        case 2:
                            ownerAccountId = _a.sent();
                            if (!ownerAccountId)
                                throw new common_1.BadRequestException('Owner account not found');
                            updates = { updated_at: new Date().toISOString() };
                            if (body.logoUrl !== undefined)
                                updates.logo_url = body.logoUrl;
                            if (body.coverImageUrl !== undefined)
                                updates.cover_image_url = body.coverImageUrl;
                            if (body.businessName !== undefined && body.businessName.trim()) {
                                updates.business_name = body.businessName.trim();
                            }
                            return [4 /*yield*/, admin
                                    .from('owner_accounts')
                                    .update(updates)
                                    .eq('id', ownerAccountId)];
                        case 3:
                            error = (_a.sent()).error;
                            if (error) {
                                console.error('[owner/profile] Update error:', error.message);
                                throw new common_1.BadRequestException(error.message);
                            }
                            return [2 /*return*/, { success: true }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // GET /owner/venue
        // Returns the primary venue for this owner
        // ─────────────────────────────────────────────
        OwnerController_1.prototype.getVenue = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, admin, ownerAccountId, ownerAccount, _a, venue, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _b.sent();
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getOwnerAccountId(userId, admin)];
                        case 2:
                            ownerAccountId = _b.sent();
                            if (!ownerAccountId)
                                return [2 /*return*/, { venue: null, businessName: '' }];
                            return [4 /*yield*/, admin
                                    .from('owner_accounts')
                                    .select('business_name')
                                    .eq('id', ownerAccountId)
                                    .maybeSingle()];
                        case 3:
                            ownerAccount = (_b.sent()).data;
                            return [4 /*yield*/, admin
                                    .from('venues')
                                    .select('id, name, address, city, state, zip_code, phone, website, capacity, description')
                                    .eq('owner_account_id', ownerAccountId)
                                    .order('id', { ascending: true })
                                    .limit(1)
                                    .maybeSingle()];
                        case 4:
                            _a = _b.sent(), venue = _a.data, error = _a.error;
                            if (error) {
                                console.error('[owner/venue] DB error:', error.message);
                            }
                            return [2 /*return*/, {
                                    businessName: (ownerAccount === null || ownerAccount === void 0 ? void 0 : ownerAccount.business_name) || '',
                                    venue: venue || null,
                                }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // PUT /owner/venue
        // Updates the primary venue details
        // ─────────────────────────────────────────────
        OwnerController_1.prototype.updateVenue = function (authorization, body) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, admin, ownerAccountId, venue, updateData, error, error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getOwnerAccountId(userId, admin)];
                        case 2:
                            ownerAccountId = _a.sent();
                            if (!ownerAccountId)
                                throw new common_1.BadRequestException('Owner account not found');
                            return [4 /*yield*/, admin
                                    .from('venues')
                                    .select('id')
                                    .eq('owner_account_id', ownerAccountId)
                                    .order('id', { ascending: true })
                                    .limit(1)
                                    .maybeSingle()];
                        case 3:
                            venue = (_a.sent()).data;
                            updateData = {};
                            if (body.name !== undefined)
                                updateData.name = body.name;
                            if (body.address !== undefined)
                                updateData.address = body.address;
                            if (body.city !== undefined)
                                updateData.city = body.city;
                            if (body.state !== undefined)
                                updateData.state = body.state;
                            if (body.zipCode !== undefined)
                                updateData.zip_code = body.zipCode;
                            if (body.phone !== undefined)
                                updateData.phone = body.phone;
                            if (body.website !== undefined)
                                updateData.website = body.website;
                            if (body.capacity !== undefined)
                                updateData.capacity = body.capacity || null;
                            if (body.description !== undefined)
                                updateData.description = body.description;
                            if (!venue) return [3 /*break*/, 5];
                            return [4 /*yield*/, admin
                                    .from('venues')
                                    .update(updateData)
                                    .eq('id', venue.id)];
                        case 4:
                            error = (_a.sent()).error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [3 /*break*/, 7];
                        case 5: return [4 /*yield*/, admin
                                .from('venues')
                                .insert({
                                owner_account_id: ownerAccountId,
                                name: body.name || 'My Venue',
                                address: body.address,
                                city: body.city,
                                state: body.state,
                                zip_code: body.zipCode,
                                phone: body.phone,
                                website: body.website,
                                capacity: body.capacity || null,
                                description: body.description,
                            })];
                        case 6:
                            error = (_a.sent()).error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            _a.label = 7;
                        case 7: return [2 /*return*/, { success: true }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // GET /owner/payment-schedule
        // Returns the owner's default payment schedule settings
        // ─────────────────────────────────────────────
        OwnerController_1.prototype.getPaymentSchedule = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, admin, ownerAccountId, _a, data, error;
                var _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _e.sent();
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getOwnerAccountId(userId, admin)];
                        case 2:
                            ownerAccountId = _e.sent();
                            if (!ownerAccountId)
                                return [2 /*return*/, { depositPercentage: null, depositDueDaysBefore: null, finalPaymentDueDaysBefore: null }];
                            return [4 /*yield*/, admin
                                    .from('owner_accounts')
                                    .select('default_deposit_percentage, default_deposit_due_days_before, default_final_payment_due_days_before')
                                    .eq('id', ownerAccountId)
                                    .maybeSingle()];
                        case 3:
                            _a = _e.sent(), data = _a.data, error = _a.error;
                            if (error)
                                console.error('[owner/payment-schedule] DB error:', error.message);
                            return [2 /*return*/, {
                                    depositPercentage: (_b = data === null || data === void 0 ? void 0 : data.default_deposit_percentage) !== null && _b !== void 0 ? _b : null,
                                    depositDueDaysBefore: (_c = data === null || data === void 0 ? void 0 : data.default_deposit_due_days_before) !== null && _c !== void 0 ? _c : null,
                                    finalPaymentDueDaysBefore: (_d = data === null || data === void 0 ? void 0 : data.default_final_payment_due_days_before) !== null && _d !== void 0 ? _d : null,
                                }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // PUT /owner/payment-schedule
        // Saves the owner's default payment schedule
        // ─────────────────────────────────────────────
        OwnerController_1.prototype.updatePaymentSchedule = function (authorization, body) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, admin, ownerAccountId, error;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _d.sent();
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getOwnerAccountId(userId, admin)];
                        case 2:
                            ownerAccountId = _d.sent();
                            if (!ownerAccountId)
                                throw new common_1.BadRequestException('Owner account not found');
                            return [4 /*yield*/, admin
                                    .from('owner_accounts')
                                    .update({
                                    default_deposit_percentage: (_a = body.depositPercentage) !== null && _a !== void 0 ? _a : null,
                                    default_deposit_due_days_before: (_b = body.depositDueDaysBefore) !== null && _b !== void 0 ? _b : null,
                                    default_final_payment_due_days_before: (_c = body.finalPaymentDueDaysBefore) !== null && _c !== void 0 ? _c : null,
                                    updated_at: new Date().toISOString(),
                                })
                                    .eq('id', ownerAccountId)];
                        case 3:
                            error = (_d.sent()).error;
                            if (error) {
                                console.error('[owner/payment-schedule] Update error:', error.message);
                                throw new common_1.BadRequestException(error.message);
                            }
                            return [2 /*return*/, { success: true }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // GET /owner/trial-status
        // Returns current subscription status and trial info
        // ─────────────────────────────────────────────
        OwnerController_1.prototype.getTrialStatus = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, admin, ownerAccountId, data, isTrial, daysRemaining, msRemaining;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _c.sent();
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getOwnerAccountId(userId, admin)];
                        case 2:
                            ownerAccountId = _c.sent();
                            if (!ownerAccountId)
                                return [2 /*return*/, { isTrial: false, subscriptionStatus: 'unknown', daysRemaining: 0, trialEndsAt: null }];
                            return [4 /*yield*/, admin
                                    .from('owner_accounts')
                                    .select('subscription_status, trial_ends_at, referred_by_affiliate_id')
                                    .eq('id', ownerAccountId)
                                    .maybeSingle()];
                        case 3:
                            data = (_c.sent()).data;
                            isTrial = (data === null || data === void 0 ? void 0 : data.subscription_status) === 'trial' &&
                                !!(data === null || data === void 0 ? void 0 : data.trial_ends_at) &&
                                !!(data === null || data === void 0 ? void 0 : data.referred_by_affiliate_id);
                            daysRemaining = 0;
                            if (isTrial && (data === null || data === void 0 ? void 0 : data.trial_ends_at)) {
                                msRemaining = new Date(data.trial_ends_at).getTime() - Date.now();
                                daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
                            }
                            return [2 /*return*/, {
                                    isTrial: isTrial,
                                    subscriptionStatus: (_a = data === null || data === void 0 ? void 0 : data.subscription_status) !== null && _a !== void 0 ? _a : 'unknown',
                                    daysRemaining: daysRemaining,
                                    trialEndsAt: (_b = data === null || data === void 0 ? void 0 : data.trial_ends_at) !== null && _b !== void 0 ? _b : null,
                                }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // GET /owner/venues
        // Returns ALL venues for this owner
        // ─────────────────────────────────────────────
        OwnerController_1.prototype.getVenues = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, admin, ownerAccountId, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _b.sent();
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getOwnerAccountId(userId, admin)];
                        case 2:
                            ownerAccountId = _b.sent();
                            if (!ownerAccountId)
                                return [2 /*return*/, { venues: [] }];
                            return [4 /*yield*/, admin
                                    .from('venues')
                                    .select('id, name, address, city, state, zip_code, phone, website, capacity, description')
                                    .eq('owner_account_id', ownerAccountId)
                                    .order('id', { ascending: true })];
                        case 3:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, { venues: data || [] }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // POST /owner/venues
        // Creates a new venue for this owner
        // ─────────────────────────────────────────────
        OwnerController_1.prototype.createVenue = function (authorization, body) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, admin, ownerAccountId, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _b.sent();
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getOwnerAccountId(userId, admin)];
                        case 2:
                            ownerAccountId = _b.sent();
                            if (!ownerAccountId)
                                throw new common_1.BadRequestException('Owner account not found');
                            return [4 /*yield*/, admin
                                    .from('venues')
                                    .insert({
                                    owner_account_id: ownerAccountId,
                                    name: body.name,
                                    address: body.address,
                                    city: body.city,
                                    state: body.state,
                                    zip_code: body.zipCode,
                                    phone: body.phone,
                                    website: body.website,
                                    capacity: body.capacity || null,
                                    description: body.description,
                                })
                                    .select('id, name, address, city, state, zip_code, phone, website, capacity, description')
                                    .single()];
                        case 3:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, { venue: data }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // PUT /owner/venues/:id
        // Updates a specific venue owned by this owner
        // ─────────────────────────────────────────────
        OwnerController_1.prototype.updateVenueById = function (authorization, id, body) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, admin, ownerAccountId, existing, updateData, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _b.sent();
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getOwnerAccountId(userId, admin)];
                        case 2:
                            ownerAccountId = _b.sent();
                            if (!ownerAccountId)
                                throw new common_1.BadRequestException('Owner account not found');
                            return [4 /*yield*/, admin
                                    .from('venues')
                                    .select('id')
                                    .eq('id', id)
                                    .eq('owner_account_id', ownerAccountId)
                                    .maybeSingle()];
                        case 3:
                            existing = (_b.sent()).data;
                            if (!existing)
                                throw new common_1.NotFoundException('Venue not found');
                            updateData = {};
                            if (body.name !== undefined)
                                updateData.name = body.name;
                            if (body.address !== undefined)
                                updateData.address = body.address;
                            if (body.city !== undefined)
                                updateData.city = body.city;
                            if (body.state !== undefined)
                                updateData.state = body.state;
                            if (body.zipCode !== undefined)
                                updateData.zip_code = body.zipCode;
                            if (body.phone !== undefined)
                                updateData.phone = body.phone;
                            if (body.website !== undefined)
                                updateData.website = body.website;
                            if (body.capacity !== undefined)
                                updateData.capacity = body.capacity || null;
                            if (body.description !== undefined)
                                updateData.description = body.description;
                            return [4 /*yield*/, admin
                                    .from('venues')
                                    .update(updateData)
                                    .eq('id', id)
                                    .select('id, name, address, city, state, zip_code, phone, website, capacity, description')
                                    .single()];
                        case 4:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, { venue: data }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // DELETE /owner/venues/:id
        // Deletes a specific venue owned by this owner
        // ─────────────────────────────────────────────
        OwnerController_1.prototype.deleteVenue = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, admin, ownerAccountId, existing, error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getOwnerAccountId(userId, admin)];
                        case 2:
                            ownerAccountId = _a.sent();
                            if (!ownerAccountId)
                                throw new common_1.BadRequestException('Owner account not found');
                            return [4 /*yield*/, admin
                                    .from('venues')
                                    .select('id')
                                    .eq('id', id)
                                    .eq('owner_account_id', ownerAccountId)
                                    .maybeSingle()];
                        case 3:
                            existing = (_a.sent()).data;
                            if (!existing)
                                throw new common_1.NotFoundException('Venue not found');
                            return [4 /*yield*/, admin
                                    .from('venues')
                                    .delete()
                                    .eq('id', id)];
                        case 4:
                            error = (_a.sent()).error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, { success: true }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // GET /owner/analytics/revenue?months=6
        // Owner revenue summary: monthly revenue, top event types, paid invoice totals
        // ─────────────────────────────────────────────
        OwnerController_1.prototype.getRevenueAnalytics = function (authorization, monthsParam) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, admin, ownerAccountId, months, since, paidInvoices, totalRevenue, monthlyMap, _i, _a, inv, month, paid, monthly, pendingInvoices, pendingRevenue, events, eventTypeMap, _b, _c, ev, t, topEventTypes, totalEvents;
                var _d, _e, _f, _g, _h, _j;
                return __generator(this, function (_k) {
                    switch (_k.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _k.sent();
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getOwnerAccountId(userId, admin)];
                        case 2:
                            ownerAccountId = _k.sent();
                            if (!ownerAccountId)
                                throw new common_1.BadRequestException('Owner account not found');
                            months = Math.min(parseInt(monthsParam !== null && monthsParam !== void 0 ? monthsParam : '6', 10) || 6, 24);
                            since = new Date();
                            since.setMonth(since.getMonth() - months);
                            return [4 /*yield*/, admin
                                    .from('invoices')
                                    .select('total_amount, paid_amount, created_at, status')
                                    .eq('owner_account_id', ownerAccountId)
                                    .in('status', ['paid', 'partial'])
                                    .gte('created_at', since.toISOString())];
                        case 3:
                            paidInvoices = (_k.sent()).data;
                            totalRevenue = (paidInvoices !== null && paidInvoices !== void 0 ? paidInvoices : []).reduce(function (sum, inv) {
                                var _a, _b;
                                var paid = inv.status === 'paid' ? ((_a = inv.total_amount) !== null && _a !== void 0 ? _a : 0) : ((_b = inv.paid_amount) !== null && _b !== void 0 ? _b : 0);
                                return sum + paid;
                            }, 0);
                            monthlyMap = {};
                            for (_i = 0, _a = paidInvoices !== null && paidInvoices !== void 0 ? paidInvoices : []; _i < _a.length; _i++) {
                                inv = _a[_i];
                                month = inv.created_at.slice(0, 7);
                                paid = inv.status === 'paid' ? ((_d = inv.total_amount) !== null && _d !== void 0 ? _d : 0) : ((_e = inv.paid_amount) !== null && _e !== void 0 ? _e : 0);
                                monthlyMap[month] = ((_f = monthlyMap[month]) !== null && _f !== void 0 ? _f : 0) + paid;
                            }
                            monthly = Object.entries(monthlyMap)
                                .sort(function (_a, _b) {
                                var a = _a[0];
                                var b = _b[0];
                                return a.localeCompare(b);
                            })
                                .map(function (_a) {
                                var month = _a[0], revenue = _a[1];
                                return ({ month: month, revenue: revenue });
                            });
                            return [4 /*yield*/, admin
                                    .from('invoices')
                                    .select('total_amount')
                                    .eq('owner_account_id', ownerAccountId)
                                    .in('status', ['sent', 'draft'])];
                        case 4:
                            pendingInvoices = (_k.sent()).data;
                            pendingRevenue = (pendingInvoices !== null && pendingInvoices !== void 0 ? pendingInvoices : []).reduce(function (sum, inv) { var _a; return sum + ((_a = inv.total_amount) !== null && _a !== void 0 ? _a : 0); }, 0);
                            return [4 /*yield*/, admin
                                    .from('event')
                                    .select('event_type')
                                    .eq('owner_account_id', ownerAccountId)
                                    .gte('created_at', since.toISOString())];
                        case 5:
                            events = (_k.sent()).data;
                            eventTypeMap = {};
                            for (_b = 0, _c = events !== null && events !== void 0 ? events : []; _b < _c.length; _b++) {
                                ev = _c[_b];
                                t = (_g = ev.event_type) !== null && _g !== void 0 ? _g : 'other';
                                eventTypeMap[t] = ((_h = eventTypeMap[t]) !== null && _h !== void 0 ? _h : 0) + 1;
                            }
                            topEventTypes = Object.entries(eventTypeMap)
                                .sort(function (_a, _b) {
                                var a = _a[1];
                                var b = _b[1];
                                return b - a;
                            })
                                .slice(0, 5)
                                .map(function (_a) {
                                var type = _a[0], count = _a[1];
                                return ({ type: type, count: count });
                            });
                            totalEvents = (_j = events === null || events === void 0 ? void 0 : events.length) !== null && _j !== void 0 ? _j : 0;
                            return [2 /*return*/, {
                                    periodMonths: months,
                                    totalRevenue: Math.round(totalRevenue * 100) / 100,
                                    pendingRevenue: Math.round(pendingRevenue * 100) / 100,
                                    totalEvents: totalEvents,
                                    monthly: monthly,
                                    topEventTypes: topEventTypes,
                                }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // GET /owner/venues/:venueId/blackouts
        // Lists all blackout date ranges for a venue
        // ─────────────────────────────────────────────
        OwnerController_1.prototype.getBlackouts = function (authorization, venueId) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, admin, ownerAccountId, venue, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _b.sent();
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getOwnerAccountId(userId, admin)];
                        case 2:
                            ownerAccountId = _b.sent();
                            if (!ownerAccountId)
                                throw new common_1.BadRequestException('Owner account not found');
                            return [4 /*yield*/, admin
                                    .from('venues')
                                    .select('id')
                                    .eq('id', venueId)
                                    .eq('owner_account_id', ownerAccountId)
                                    .maybeSingle()];
                        case 3:
                            venue = (_b.sent()).data;
                            if (!venue)
                                throw new common_1.NotFoundException('Venue not found');
                            return [4 /*yield*/, admin
                                    .from('venue_blackout_dates')
                                    .select('id, start_date, end_date, reason, created_at')
                                    .eq('venue_id', venueId)
                                    .order('start_date', { ascending: true })];
                        case 4:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, data !== null && data !== void 0 ? data : []];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // POST /owner/venues/:venueId/blackouts
        // Creates a blackout date range for a venue
        // ─────────────────────────────────────────────
        OwnerController_1.prototype.createBlackout = function (authorization, venueId, body) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, admin, ownerAccountId, venue, _a, data, error;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!body.startDate || !body.endDate) {
                                throw new common_1.BadRequestException('startDate and endDate are required');
                            }
                            return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _c.sent();
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getOwnerAccountId(userId, admin)];
                        case 2:
                            ownerAccountId = _c.sent();
                            if (!ownerAccountId)
                                throw new common_1.BadRequestException('Owner account not found');
                            return [4 /*yield*/, admin
                                    .from('venues')
                                    .select('id')
                                    .eq('id', venueId)
                                    .eq('owner_account_id', ownerAccountId)
                                    .maybeSingle()];
                        case 3:
                            venue = (_c.sent()).data;
                            if (!venue)
                                throw new common_1.NotFoundException('Venue not found');
                            return [4 /*yield*/, admin
                                    .from('venue_blackout_dates')
                                    .insert({
                                    venue_id: venueId,
                                    start_date: body.startDate,
                                    end_date: body.endDate,
                                    reason: (_b = body.reason) !== null && _b !== void 0 ? _b : null,
                                })
                                    .select('id, start_date, end_date, reason, created_at')
                                    .single()];
                        case 4:
                            _a = _c.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // DELETE /owner/venues/:venueId/blackouts/:id
        // Removes a blackout date range
        // ─────────────────────────────────────────────
        OwnerController_1.prototype.deleteBlackout = function (authorization, venueId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, admin, ownerAccountId, existing, error;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _b.sent();
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getOwnerAccountId(userId, admin)];
                        case 2:
                            ownerAccountId = _b.sent();
                            if (!ownerAccountId)
                                throw new common_1.BadRequestException('Owner account not found');
                            return [4 /*yield*/, admin
                                    .from('venue_blackout_dates')
                                    .select('id, venue_id, venues!inner(owner_account_id)')
                                    .eq('id', id)
                                    .eq('venue_id', venueId)
                                    .maybeSingle()];
                        case 3:
                            existing = (_b.sent()).data;
                            if (!existing || ((_a = existing.venues) === null || _a === void 0 ? void 0 : _a.owner_account_id) !== ownerAccountId) {
                                throw new common_1.NotFoundException('Blackout date not found');
                            }
                            return [4 /*yield*/, admin
                                    .from('venue_blackout_dates')
                                    .delete()
                                    .eq('id', id)];
                        case 4:
                            error = (_b.sent()).error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, { success: true }];
                    }
                });
            });
        };
        return OwnerController_1;
    }());
    __setFunctionName(_classThis, "OwnerController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getAccountId_decorators = [(0, common_1.Get)('account-id')];
        _getProfile_decorators = [(0, common_1.Get)('profile')];
        _updateProfile_decorators = [(0, common_1.Put)('profile')];
        _getVenue_decorators = [(0, common_1.Get)('venue')];
        _updateVenue_decorators = [(0, common_1.Put)('venue')];
        _getPaymentSchedule_decorators = [(0, common_1.Get)('payment-schedule')];
        _updatePaymentSchedule_decorators = [(0, common_1.Put)('payment-schedule')];
        _getTrialStatus_decorators = [(0, common_1.Get)('trial-status')];
        _getVenues_decorators = [(0, common_1.Get)('venues')];
        _createVenue_decorators = [(0, common_1.Post)('venues')];
        _updateVenueById_decorators = [(0, common_1.Put)('venues/:id')];
        _deleteVenue_decorators = [(0, common_1.Delete)('venues/:id')];
        _getRevenueAnalytics_decorators = [(0, common_1.Get)('analytics/revenue')];
        _getBlackouts_decorators = [(0, common_1.Get)('venues/:venueId/blackouts')];
        _createBlackout_decorators = [(0, common_1.Post)('venues/:venueId/blackouts')];
        _deleteBlackout_decorators = [(0, common_1.Delete)('venues/:venueId/blackouts/:id')];
        __esDecorate(_classThis, null, _getAccountId_decorators, { kind: "method", name: "getAccountId", static: false, private: false, access: { has: function (obj) { return "getAccountId" in obj; }, get: function (obj) { return obj.getAccountId; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getProfile_decorators, { kind: "method", name: "getProfile", static: false, private: false, access: { has: function (obj) { return "getProfile" in obj; }, get: function (obj) { return obj.getProfile; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateProfile_decorators, { kind: "method", name: "updateProfile", static: false, private: false, access: { has: function (obj) { return "updateProfile" in obj; }, get: function (obj) { return obj.updateProfile; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getVenue_decorators, { kind: "method", name: "getVenue", static: false, private: false, access: { has: function (obj) { return "getVenue" in obj; }, get: function (obj) { return obj.getVenue; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateVenue_decorators, { kind: "method", name: "updateVenue", static: false, private: false, access: { has: function (obj) { return "updateVenue" in obj; }, get: function (obj) { return obj.updateVenue; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getPaymentSchedule_decorators, { kind: "method", name: "getPaymentSchedule", static: false, private: false, access: { has: function (obj) { return "getPaymentSchedule" in obj; }, get: function (obj) { return obj.getPaymentSchedule; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updatePaymentSchedule_decorators, { kind: "method", name: "updatePaymentSchedule", static: false, private: false, access: { has: function (obj) { return "updatePaymentSchedule" in obj; }, get: function (obj) { return obj.updatePaymentSchedule; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getTrialStatus_decorators, { kind: "method", name: "getTrialStatus", static: false, private: false, access: { has: function (obj) { return "getTrialStatus" in obj; }, get: function (obj) { return obj.getTrialStatus; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getVenues_decorators, { kind: "method", name: "getVenues", static: false, private: false, access: { has: function (obj) { return "getVenues" in obj; }, get: function (obj) { return obj.getVenues; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createVenue_decorators, { kind: "method", name: "createVenue", static: false, private: false, access: { has: function (obj) { return "createVenue" in obj; }, get: function (obj) { return obj.createVenue; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateVenueById_decorators, { kind: "method", name: "updateVenueById", static: false, private: false, access: { has: function (obj) { return "updateVenueById" in obj; }, get: function (obj) { return obj.updateVenueById; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteVenue_decorators, { kind: "method", name: "deleteVenue", static: false, private: false, access: { has: function (obj) { return "deleteVenue" in obj; }, get: function (obj) { return obj.deleteVenue; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getRevenueAnalytics_decorators, { kind: "method", name: "getRevenueAnalytics", static: false, private: false, access: { has: function (obj) { return "getRevenueAnalytics" in obj; }, get: function (obj) { return obj.getRevenueAnalytics; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getBlackouts_decorators, { kind: "method", name: "getBlackouts", static: false, private: false, access: { has: function (obj) { return "getBlackouts" in obj; }, get: function (obj) { return obj.getBlackouts; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createBlackout_decorators, { kind: "method", name: "createBlackout", static: false, private: false, access: { has: function (obj) { return "createBlackout" in obj; }, get: function (obj) { return obj.createBlackout; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteBlackout_decorators, { kind: "method", name: "deleteBlackout", static: false, private: false, access: { has: function (obj) { return "deleteBlackout" in obj; }, get: function (obj) { return obj.deleteBlackout; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        OwnerController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return OwnerController = _classThis;
}();
exports.OwnerController = OwnerController;
