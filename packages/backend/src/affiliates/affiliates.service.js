"use strict";
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
exports.AffiliatesService = void 0;
var common_1 = require("@nestjs/common");
var crypto_1 = require("crypto");
/** Commission rates */
var CONVERSION_RATE = 0.50; // 50% of first subscription payment
var RECURRING_RATE = 0.03; // 3% of each subsequent payment
var MAX_COMMISSION_YEARS = 3;
var AffiliatesService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AffiliatesService = _classThis = /** @class */ (function () {
        function AffiliatesService_1(supabaseService) {
            this.supabaseService = supabaseService;
        }
        // ─── Registration ────────────────────────────────────────────────────────
        AffiliatesService_1.prototype.register = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, existing, _a, authData, authError, userId, userError, referralCode, _b, affiliate, affError, anonClient, _c, sessionData, sessionError;
                var _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('users')
                                    .select('id')
                                    .eq('email', dto.email.toLowerCase())
                                    .maybeSingle()];
                        case 1:
                            existing = (_f.sent()).data;
                            if (existing) {
                                throw new common_1.BadRequestException('An account with this email already exists');
                            }
                            return [4 /*yield*/, admin.auth.admin.createUser({
                                    email: dto.email,
                                    password: dto.password,
                                    email_confirm: true,
                                    user_metadata: {
                                        first_name: dto.firstName,
                                        last_name: dto.lastName,
                                        role: 'affiliate',
                                    },
                                })];
                        case 2:
                            _a = _f.sent(), authData = _a.data, authError = _a.error;
                            if (authError || !authData.user) {
                                throw new common_1.BadRequestException((authError === null || authError === void 0 ? void 0 : authError.message) || 'Failed to create user');
                            }
                            userId = authData.user.id;
                            return [4 /*yield*/, admin.from('users').insert({
                                    id: userId,
                                    email: dto.email.toLowerCase(),
                                    first_name: dto.firstName,
                                    last_name: dto.lastName,
                                    role: 'affiliate',
                                    roles: ['affiliate'],
                                    phone_number: (_d = dto.phone) !== null && _d !== void 0 ? _d : null,
                                    status: 'active',
                                })];
                        case 3:
                            userError = (_f.sent()).error;
                            if (!userError) return [3 /*break*/, 5];
                            return [4 /*yield*/, admin.auth.admin.deleteUser(userId)];
                        case 4:
                            _f.sent();
                            throw new common_1.BadRequestException(userError.message);
                        case 5: return [4 /*yield*/, this.generateReferralCode(dto.firstName, admin)];
                        case 6:
                            referralCode = _f.sent();
                            return [4 /*yield*/, admin
                                    .from('affiliates')
                                    .insert({
                                    user_id: userId,
                                    first_name: dto.firstName,
                                    last_name: dto.lastName,
                                    email: dto.email.toLowerCase(),
                                    phone: (_e = dto.phone) !== null && _e !== void 0 ? _e : null,
                                    referral_code: referralCode,
                                    status: 'active',
                                })
                                    .select()
                                    .single()];
                        case 7:
                            _b = _f.sent(), affiliate = _b.data, affError = _b.error;
                            if (!affError) return [3 /*break*/, 9];
                            return [4 /*yield*/, admin.auth.admin.deleteUser(userId)];
                        case 8:
                            _f.sent();
                            throw new common_1.BadRequestException(affError.message);
                        case 9:
                            anonClient = this.supabaseService.getClient();
                            return [4 /*yield*/, anonClient.auth.signInWithPassword({
                                    email: dto.email,
                                    password: dto.password,
                                })];
                        case 10:
                            _c = _f.sent(), sessionData = _c.data, sessionError = _c.error;
                            if (sessionError) {
                                // Registration succeeded but auto-login failed — not critical
                                return [2 /*return*/, { affiliate: affiliate, session: null }];
                            }
                            return [2 /*return*/, {
                                    affiliate: affiliate,
                                    session: sessionData.session,
                                }];
                    }
                });
            });
        };
        AffiliatesService_1.prototype.login = function (email, password) {
            return __awaiter(this, void 0, void 0, function () {
                var anonClient, _a, data, error, admin, userData, affiliate;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            anonClient = this.supabaseService.getClient();
                            return [4 /*yield*/, anonClient.auth.signInWithPassword({ email: email, password: password })];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error || !data.session) {
                                throw new common_1.UnauthorizedException('Invalid email or password');
                            }
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('users')
                                    .select('role')
                                    .eq('id', data.user.id)
                                    .single()];
                        case 2:
                            userData = (_b.sent()).data;
                            if (!userData || userData.role !== 'affiliate') {
                                throw new common_1.UnauthorizedException('This account is not a sales affiliate');
                            }
                            return [4 /*yield*/, admin
                                    .from('affiliates')
                                    .select('*')
                                    .eq('user_id', data.user.id)
                                    .single()];
                        case 3:
                            affiliate = (_b.sent()).data;
                            return [2 /*return*/, {
                                    access_token: data.session.access_token,
                                    refresh_token: data.session.refresh_token,
                                    affiliate: affiliate,
                                }];
                    }
                });
            });
        };
        // ─── Profile ─────────────────────────────────────────────────────────────
        AffiliatesService_1.prototype.getMe = function (affiliateId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('affiliates')
                                    .select('*')
                                    .eq('id', affiliateId)
                                    .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error || !data)
                                throw new common_1.NotFoundException('Affiliate not found');
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        AffiliatesService_1.prototype.updateMe = function (affiliateId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, update, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            update = {};
                            if (dto.firstName !== undefined)
                                update.first_name = dto.firstName;
                            if (dto.lastName !== undefined)
                                update.last_name = dto.lastName;
                            if (dto.phone !== undefined)
                                update.phone = dto.phone;
                            return [4 /*yield*/, admin
                                    .from('affiliates')
                                    .update(update)
                                    .eq('id', affiliateId)
                                    .select()
                                    .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        // ─── Dashboard ───────────────────────────────────────────────────────────
        AffiliatesService_1.prototype.getDashboard = function (affiliateId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, affiliate, totalReferred, totalConverted, commissionTotals, totalEarned, pendingEarnings;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('affiliates')
                                    .select('referral_code, first_name, last_name, email')
                                    .eq('id', affiliateId)
                                    .single()];
                        case 1:
                            affiliate = (_a.sent()).data;
                            return [4 /*yield*/, admin
                                    .from('affiliate_referrals')
                                    .select('id', { count: 'exact', head: true })
                                    .eq('affiliate_id', affiliateId)];
                        case 2:
                            totalReferred = (_a.sent()).count;
                            return [4 /*yield*/, admin
                                    .from('affiliate_referrals')
                                    .select('id', { count: 'exact', head: true })
                                    .eq('affiliate_id', affiliateId)
                                    .eq('status', 'converted')];
                        case 3:
                            totalConverted = (_a.sent()).count;
                            return [4 /*yield*/, admin
                                    .from('affiliate_commissions')
                                    .select('commission_amount, status')
                                    .eq('affiliate_id', affiliateId)];
                        case 4:
                            commissionTotals = (_a.sent()).data;
                            totalEarned = (commissionTotals !== null && commissionTotals !== void 0 ? commissionTotals : []).reduce(function (sum, c) { return sum + Number(c.commission_amount); }, 0);
                            pendingEarnings = (commissionTotals !== null && commissionTotals !== void 0 ? commissionTotals : [])
                                .filter(function (c) { return c.status === 'pending'; })
                                .reduce(function (sum, c) { return sum + Number(c.commission_amount); }, 0);
                            return [2 /*return*/, {
                                    affiliate: affiliate,
                                    stats: {
                                        totalReferred: totalReferred !== null && totalReferred !== void 0 ? totalReferred : 0,
                                        totalConverted: totalConverted !== null && totalConverted !== void 0 ? totalConverted : 0,
                                        totalEarned: Number(totalEarned.toFixed(2)),
                                        pendingEarnings: Number(pendingEarnings.toFixed(2)),
                                    },
                                }];
                    }
                });
            });
        };
        // ─── Referrals ───────────────────────────────────────────────────────────
        AffiliatesService_1.prototype.getReferrals = function (affiliateId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('affiliate_referrals')
                                    .select("\n        id,\n        status,\n        converted_at,\n        commission_expires_at,\n        created_at,\n        owner_accounts!inner(\n          id,\n          business_name,\n          subscription_status\n        )\n      ")
                                    .eq('affiliate_id', affiliateId)
                                    .order('created_at', { ascending: false })];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, data !== null && data !== void 0 ? data : []];
                    }
                });
            });
        };
        // ─── Commissions ─────────────────────────────────────────────────────────
        AffiliatesService_1.prototype.getCommissions = function (affiliateId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('affiliate_commissions')
                                    .select("\n        id,\n        commission_type,\n        commission_rate,\n        subscription_amount,\n        commission_amount,\n        status,\n        period_start,\n        period_end,\n        created_at,\n        owner_accounts!inner(business_name)\n      ")
                                    .eq('affiliate_id', affiliateId)
                                    .order('created_at', { ascending: false })];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, data !== null && data !== void 0 ? data : []];
                    }
                });
            });
        };
        // ─── Commission Processing (called from StripeService) ────────────────────
        /**
         * Process a conversion commission when an owner first subscribes.
         * Creates/updates the referral record to 'converted' and issues a 50% commission.
         */
        AffiliatesService_1.prototype.processConversionCommission = function (ownerAccountId, stripeSubscriptionId, amountDollars) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, owner, affiliateId, now, expiresAt, _a, referral, refError, existing, commissionAmount;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('owner_accounts')
                                    .select('referred_by_affiliate_id')
                                    .eq('id', ownerAccountId)
                                    .single()];
                        case 1:
                            owner = (_b.sent()).data;
                            if (!(owner === null || owner === void 0 ? void 0 : owner.referred_by_affiliate_id))
                                return [2 /*return*/];
                            affiliateId = owner.referred_by_affiliate_id;
                            now = new Date();
                            expiresAt = new Date(now);
                            expiresAt.setFullYear(expiresAt.getFullYear() + MAX_COMMISSION_YEARS);
                            return [4 /*yield*/, admin
                                    .from('affiliate_referrals')
                                    .upsert({
                                    affiliate_id: affiliateId,
                                    owner_account_id: ownerAccountId,
                                    status: 'converted',
                                    converted_at: now.toISOString(),
                                    commission_expires_at: expiresAt.toISOString(),
                                }, { onConflict: 'affiliate_id,owner_account_id' })
                                    .select()
                                    .single()];
                        case 2:
                            _a = _b.sent(), referral = _a.data, refError = _a.error;
                            if (refError) {
                                console.error('[AffiliatesService] Failed to upsert referral:', refError.message);
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, admin
                                    .from('affiliate_commissions')
                                    .select('id')
                                    .eq('referral_id', referral.id)
                                    .eq('commission_type', 'conversion')
                                    .maybeSingle()];
                        case 3:
                            existing = (_b.sent()).data;
                            if (existing)
                                return [2 /*return*/]; // Already recorded
                            commissionAmount = Number((amountDollars * CONVERSION_RATE).toFixed(2));
                            return [4 /*yield*/, admin.from('affiliate_commissions').insert({
                                    affiliate_id: affiliateId,
                                    referral_id: referral.id,
                                    owner_account_id: ownerAccountId,
                                    stripe_subscription_id: stripeSubscriptionId,
                                    subscription_amount: amountDollars,
                                    commission_rate: CONVERSION_RATE,
                                    commission_amount: commissionAmount,
                                    commission_type: 'conversion',
                                    status: 'pending',
                                })];
                        case 4:
                            _b.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Process a recurring commission on each subsequent subscription payment.
         * Only applies if referral is within the 3-year window.
         */
        AffiliatesService_1.prototype.processRecurringCommission = function (ownerAccountId, stripeInvoiceId, stripeSubscriptionId, amountDollars, periodStart, periodEnd) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, referral, existing, commissionAmount;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('affiliate_referrals')
                                    .select('id, affiliate_id, status, commission_expires_at')
                                    .eq('owner_account_id', ownerAccountId)
                                    .eq('status', 'converted')
                                    .maybeSingle()];
                        case 1:
                            referral = (_a.sent()).data;
                            if (!referral)
                                return [2 /*return*/];
                            // Check commission window is still active
                            if (referral.commission_expires_at &&
                                new Date() > new Date(referral.commission_expires_at)) {
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, admin
                                    .from('affiliate_commissions')
                                    .select('id')
                                    .eq('stripe_invoice_id', stripeInvoiceId)
                                    .maybeSingle()];
                        case 2:
                            existing = (_a.sent()).data;
                            if (existing)
                                return [2 /*return*/];
                            commissionAmount = Number((amountDollars * RECURRING_RATE).toFixed(2));
                            return [4 /*yield*/, admin.from('affiliate_commissions').insert({
                                    affiliate_id: referral.affiliate_id,
                                    referral_id: referral.id,
                                    owner_account_id: ownerAccountId,
                                    stripe_invoice_id: stripeInvoiceId,
                                    stripe_subscription_id: stripeSubscriptionId,
                                    subscription_amount: amountDollars,
                                    commission_rate: RECURRING_RATE,
                                    commission_amount: commissionAmount,
                                    commission_type: 'recurring',
                                    period_start: periodStart.toISOString(),
                                    period_end: periodEnd.toISOString(),
                                    status: 'pending',
                                })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        // ─── Referral Code Lookup ─────────────────────────────────────────────────
        /** Validate a referral code and return the affiliate ID (used during owner signup). */
        AffiliatesService_1.prototype.getAffiliateIdByCode = function (code) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, data;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('affiliates')
                                    .select('id')
                                    .eq('referral_code', code.toUpperCase())
                                    .eq('status', 'active')
                                    .maybeSingle()];
                        case 1:
                            data = (_b.sent()).data;
                            return [2 /*return*/, (_a = data === null || data === void 0 ? void 0 : data.id) !== null && _a !== void 0 ? _a : null];
                    }
                });
            });
        };
        // ─── Helpers ─────────────────────────────────────────────────────────────
        AffiliatesService_1.prototype.generateReferralCode = function (firstName, admin) {
            return __awaiter(this, void 0, void 0, function () {
                var base, code, attempts, suffix, existing;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            base = firstName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
                            attempts = 0;
                            _a.label = 1;
                        case 1:
                            suffix = (0, crypto_1.randomBytes)(3).toString('hex').toUpperCase();
                            code = "".concat(base, "-").concat(suffix);
                            return [4 /*yield*/, admin
                                    .from('affiliates')
                                    .select('id')
                                    .eq('referral_code', code)
                                    .maybeSingle()];
                        case 2:
                            existing = (_a.sent()).data;
                            if (!existing)
                                return [3 /*break*/, 4];
                            attempts++;
                            _a.label = 3;
                        case 3:
                            if (attempts < 10) return [3 /*break*/, 1];
                            _a.label = 4;
                        case 4: return [2 /*return*/, code];
                    }
                });
            });
        };
        return AffiliatesService_1;
    }());
    __setFunctionName(_classThis, "AffiliatesService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AffiliatesService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AffiliatesService = _classThis;
}();
exports.AffiliatesService = AffiliatesService;
