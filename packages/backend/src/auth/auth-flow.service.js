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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthFlowService = void 0;
var common_1 = require("@nestjs/common");
var crypto_1 = require("crypto");
var AuthFlowService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AuthFlowService = _classThis = /** @class */ (function () {
        function AuthFlowService_1(supabaseService, stripeService, smsService, trialService, twilioService, affiliatesService) {
            this.supabaseService = supabaseService;
            this.stripeService = stripeService;
            this.smsService = smsService;
            this.trialService = trialService;
            this.twilioService = twilioService;
            this.affiliatesService = affiliatesService;
        }
        /**
         * OWNER ONBOARDING FLOW
         * Steps: email signup → verify email → add phone → create venue
         * (Stripe gating skipped for now)
         */
        AuthFlowService_1.prototype.ownerSignup = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, existingUser, _a, authData, authError, userId, userError, referredByAffiliateId, ownerAccountPayload, _b, ownerAccount, accountError, admin, memberError, venueError, _c;
                var _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            supabase = this.supabaseService.getClient();
                            return [4 /*yield*/, supabase
                                    .from('users')
                                    .select('id')
                                    .eq('email', dto.email.toLowerCase())
                                    .single()];
                        case 1:
                            existingUser = (_e.sent()).data;
                            if (existingUser) {
                                throw new common_1.BadRequestException('An account with this email already exists');
                            }
                            return [4 /*yield*/, supabase.auth.signUp({
                                    email: dto.email,
                                    password: dto.password,
                                    options: {
                                        data: {
                                            first_name: dto.firstName,
                                            last_name: dto.lastName,
                                        },
                                    },
                                })];
                        case 2:
                            _a = _e.sent(), authData = _a.data, authError = _a.error;
                            if (authError || !authData.user) {
                                throw new common_1.BadRequestException((authError === null || authError === void 0 ? void 0 : authError.message) || 'Failed to create user');
                            }
                            // Check for Supabase's "fake success" response when email already exists
                            if (!authData.user.identities || authData.user.identities.length === 0) {
                                throw new common_1.BadRequestException('An account with this email already exists');
                            }
                            userId = authData.user.id;
                            return [4 /*yield*/, supabase
                                    .from('users')
                                    .insert({
                                    id: userId,
                                    email: dto.email,
                                    first_name: dto.firstName,
                                    last_name: dto.lastName,
                                    role: 'owner',
                                    roles: ['owner'],
                                    phone_number: dto.phoneNumber,
                                    email_verified: false, // Will be verified via Supabase email
                                    phone_verified: false, // Skip SMS for now
                                    sms_opt_in: dto.smsOptIn === true,
                                    sms_opt_in_at: dto.smsOptIn === true ? new Date().toISOString() : null,
                                    status: 'active',
                                })];
                        case 3:
                            userError = (_e.sent()).error;
                            if (userError)
                                throw new common_1.BadRequestException(userError.message);
                            referredByAffiliateId = null;
                            if (!dto.referralCode) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.affiliatesService.getAffiliateIdByCode(dto.referralCode)];
                        case 4:
                            referredByAffiliateId = _e.sent();
                            _e.label = 5;
                        case 5:
                            _d = {
                                business_name: dto.businessName,
                                primary_owner_id: userId,
                                subscription_status: 'trial'
                            };
                            return [4 /*yield*/, this.generateUniqueSlug(dto.businessName, supabase)];
                        case 6:
                            ownerAccountPayload = (_d.intake_slug = _e.sent(),
                                _d);
                            if (referredByAffiliateId) {
                                ownerAccountPayload.referred_by_affiliate_id = referredByAffiliateId;
                            }
                            return [4 /*yield*/, supabase
                                    .from('owner_accounts')
                                    .insert(ownerAccountPayload)
                                    .select()
                                    .single()];
                        case 7:
                            _b = _e.sent(), ownerAccount = _b.data, accountError = _b.error;
                            if (accountError)
                                throw new common_1.BadRequestException(accountError.message);
                            if (!referredByAffiliateId) return [3 /*break*/, 9];
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin.from('affiliate_referrals').upsert({
                                    affiliate_id: referredByAffiliateId,
                                    owner_account_id: ownerAccount.id,
                                    status: 'pending',
                                }, { onConflict: 'affiliate_id,owner_account_id' })];
                        case 8:
                            _e.sent();
                            _e.label = 9;
                        case 9: 
                        // Create trial period (30 days default, or configurable)
                        return [4 /*yield*/, this.trialService.createTrial(ownerAccount.id)];
                        case 10:
                            // Create trial period (30 days default, or configurable)
                            _e.sent();
                            return [4 /*yield*/, supabase
                                    .from('memberships')
                                    .insert({
                                    user_id: userId,
                                    owner_account_id: ownerAccount.id,
                                    role: 'owner',
                                    is_active: true,
                                })];
                        case 11:
                            memberError = (_e.sent()).error;
                            if (memberError)
                                throw new common_1.BadRequestException(memberError.message);
                            return [4 /*yield*/, supabase
                                    .from('venues')
                                    .insert({
                                    owner_account_id: ownerAccount.id,
                                    name: dto.venueName,
                                    address: dto.venueAddress,
                                    city: dto.venueCity,
                                    state: dto.venueState,
                                    zip_code: dto.venueZipCode,
                                    phone: dto.venuePhone,
                                    email: dto.venueEmail,
                                    capacity: dto.venueCapacity,
                                    description: dto.venueDescription,
                                })];
                        case 12:
                            venueError = (_e.sent()).error;
                            if (venueError)
                                throw new common_1.BadRequestException(venueError.message);
                            if (!(dto.phoneNumber && dto.smsOptIn)) return [3 /*break*/, 16];
                            _e.label = 13;
                        case 13:
                            _e.trys.push([13, 15, , 16]);
                            return [4 /*yield*/, this.twilioService.sendSMS(dto.phoneNumber, 'Welcome to DoVenue Suite! You are now subscribed to SMS notifications for account updates, event confirmations, reminders, and more. To unsubscribe at any time, reply STOP. You\'ll receive a confirmation: "You have successfully been unsubscribed. You will not receive any more messages from this number. Reply START to resubscribe." Msg & data rates may apply.')];
                        case 14:
                            _e.sent();
                            return [3 /*break*/, 16];
                        case 15:
                            _c = _e.sent();
                            return [3 /*break*/, 16];
                        case 16: 
                        // Note: Stripe checkout would happen here in Phase 2
                        // const checkoutUrl = await this.stripeService.createCheckoutSession(ownerAccount.id, 'price_xxx');
                        return [2 /*return*/, {
                                userId: userId,
                                ownerAccountId: ownerAccount.id,
                                message: 'Owner account created. Please verify your email and phone.',
                                session: authData.session,
                                // checkoutUrl, // Would redirect to Stripe in Phase 2
                            }];
                    }
                });
            });
        };
        /**
         * Verify phone with OTP
         */
        AuthFlowService_1.prototype.verifyPhone = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var isValid, supabase, error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.smsService.verifyCode(dto.userId, dto.otp)];
                        case 1:
                            isValid = _a.sent();
                            if (!isValid) {
                                throw new common_1.BadRequestException('Invalid or expired OTP');
                            }
                            supabase = this.supabaseService.getClient();
                            return [4 /*yield*/, supabase
                                    .from('users')
                                    .update({
                                    phone_verified: true,
                                    status: 'active',
                                })
                                    .eq('id', dto.userId)];
                        case 2:
                            error = (_a.sent()).error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, { message: 'Phone verified successfully' }];
                    }
                });
            });
        };
        /** Converts a business name to a URL-safe slug and ensures it's unique in owner_accounts. */
        AuthFlowService_1.prototype.generateUniqueSlug = function (businessName, supabase) {
            return __awaiter(this, void 0, void 0, function () {
                var base, slug, attempt, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            base = businessName
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, '-')
                                .replace(/^-|-$/g, '');
                            slug = base;
                            attempt = 2;
                            _a.label = 1;
                        case 1:
                            if (!true) return [3 /*break*/, 3];
                            return [4 /*yield*/, supabase
                                    .from('owner_accounts')
                                    .select('id')
                                    .eq('intake_slug', slug)
                                    .maybeSingle()];
                        case 2:
                            data = (_a.sent()).data;
                            if (!data)
                                return [2 /*return*/, slug]; // slug is free
                            slug = "".concat(base, "-").concat(attempt++);
                            return [3 /*break*/, 1];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Helper: check whether a user record includes a given role
         * Checks both the legacy single `role` column and the new `roles[]` array.
         */
        AuthFlowService_1.prototype.userHasRole = function (user, role) {
            if (user.role === role)
                return true;
            if (Array.isArray(user.roles) && user.roles.includes(role))
                return true;
            return false;
        };
        /**
         * Helper: get all roles for a user as a clean string array
         */
        AuthFlowService_1.prototype.getUserRoles = function (user) {
            var rolesArray = Array.isArray(user.roles) && user.roles.length > 0
                ? user.roles
                : user.role ? [user.role] : [];
            // Deduplicate
            return __spreadArray([], new Set(rolesArray), true);
        };
        /** Returns the authenticated user's id, email, and roles — used to refresh stale frontend sessions */
        AuthFlowService_1.prototype.getMyRoles = function (accessToken) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, adminClient, _a, authUser, error, dbUser, roles;
                var _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            supabase = this.supabaseService.getClient();
                            adminClient = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase.auth.getUser(accessToken)];
                        case 1:
                            _a = _d.sent(), authUser = _a.data.user, error = _a.error;
                            if (error || !authUser)
                                throw new common_1.UnauthorizedException('Invalid token');
                            return [4 /*yield*/, adminClient
                                    .from('users')
                                    .select('id, email, role, roles')
                                    .eq('id', authUser.id)
                                    .single()];
                        case 2:
                            dbUser = (_d.sent()).data;
                            roles = this.getUserRoles(dbUser !== null && dbUser !== void 0 ? dbUser : { role: (_c = (_b = authUser.user_metadata) === null || _b === void 0 ? void 0 : _b.role) !== null && _c !== void 0 ? _c : 'owner' });
                            return [2 /*return*/, { id: authUser.id, email: authUser.email, roles: roles }];
                    }
                });
            });
        };
        /**
         * OWNER LOGIN FLOW
         * Check email verified, subscription status (skipped for now)
         */
        AuthFlowService_1.prototype.ownerLogin = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, authData, authError, _b, user, userError, subscriptionStatus;
                var _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            supabase = this.supabaseService.getClient();
                            return [4 /*yield*/, supabase.auth.signInWithPassword({
                                    email: dto.email,
                                    password: dto.password,
                                })];
                        case 1:
                            _a = _e.sent(), authData = _a.data, authError = _a.error;
                            if (authError)
                                throw new common_1.UnauthorizedException(authError.message);
                            return [4 /*yield*/, supabase
                                    .from('users')
                                    .select('*, memberships(owner_account_id, owner_accounts(subscription_status))')
                                    .eq('id', authData.user.id)
                                    .single()];
                        case 2:
                            _b = _e.sent(), user = _b.data, userError = _b.error;
                            if (userError || !user)
                                throw new common_1.UnauthorizedException('User not found');
                            if (!this.userHasRole(user, 'owner')) {
                                throw new common_1.UnauthorizedException('Not an owner account');
                            }
                            subscriptionStatus = (_d = (_c = user.memberships[0]) === null || _c === void 0 ? void 0 : _c.owner_accounts) === null || _d === void 0 ? void 0 : _d.subscription_status;
                            // Phase 2: Redirect to billing if not active
                            // if (!['trialing', 'active'].includes(subscriptionStatus)) {
                            //   const billingUrl = await this.stripeService.createBillingPortalSession(
                            //     user.memberships[0].owner_accounts.stripe_customer_id
                            //   );
                            //   return { accessGranted: false, billingUrl };
                            // }
                            return [2 /*return*/, {
                                    session: authData.session,
                                    user: user,
                                    roles: this.getUserRoles(user),
                                    subscriptionStatus: subscriptionStatus,
                                    accessGranted: true,
                                }];
                    }
                });
            });
        };
        /**
         * Get billing portal URL for owner
         */
        AuthFlowService_1.prototype.getBillingPortal = function (ownerUserId) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, membership, ownerAccounts, portalUrl;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            supabase = this.supabaseService.getClient();
                            return [4 /*yield*/, supabase
                                    .from('memberships')
                                    .select('owner_accounts(stripe_customer_id)')
                                    .eq('user_id', ownerUserId)
                                    .single()];
                        case 1:
                            membership = (_a.sent()).data;
                            ownerAccounts = membership === null || membership === void 0 ? void 0 : membership.owner_accounts;
                            if (!(ownerAccounts === null || ownerAccounts === void 0 ? void 0 : ownerAccounts.stripe_customer_id)) {
                                throw new common_1.BadRequestException('No billing account found');
                            }
                            return [4 /*yield*/, this.stripeService.createBillingPortalSession(ownerAccounts.stripe_customer_id)];
                        case 2:
                            portalUrl = _a.sent();
                            return [2 /*return*/, { portalUrl: portalUrl }];
                    }
                });
            });
        };
        /**
         * CLIENT INVITE FLOW
         * Owner creates invite → client accepts → client completes SMS opt-in
         */
        AuthFlowService_1.prototype.createClientInvite = function (dto, ownerUserId) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, membership, inviteToken, expiresAt, _a, invite, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getClient();
                            return [4 /*yield*/, supabase
                                    .from('memberships')
                                    .select('owner_account_id')
                                    .eq('user_id', ownerUserId)
                                    .eq('role', 'owner')
                                    .single()];
                        case 1:
                            membership = (_b.sent()).data;
                            if (!membership)
                                throw new common_1.UnauthorizedException('Not an owner');
                            inviteToken = (0, crypto_1.randomBytes)(32).toString('hex');
                            expiresAt = new Date();
                            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
                            return [4 /*yield*/, supabase
                                    .from('invites')
                                    .insert({
                                    owner_account_id: membership.owner_account_id,
                                    email: dto.email,
                                    phone: dto.phoneNumber,
                                    invite_token: inviteToken,
                                    expires_at: expiresAt.toISOString(),
                                })
                                    .select()
                                    .single()];
                        case 2:
                            _a = _b.sent(), invite = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            // TODO: Send email with invite link containing token
                            return [2 /*return*/, {
                                    inviteId: invite.id,
                                    inviteToken: inviteToken,
                                    inviteLink: "".concat(process.env.FRONTEND_URL || 'https://dovenuesuite.com', "/invite/").concat(inviteToken),
                                    expiresAt: invite.expires_at,
                                }];
                    }
                });
            });
        };
        AuthFlowService_1.prototype.acceptClientInvite = function (dto, ipAddress, userAgent) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, invite, inviteError, userId, existingUser, _b, authData, authError, userError, profileError;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            supabase = this.supabaseService.getClient();
                            return [4 /*yield*/, supabase
                                    .from('invites')
                                    .select('*, owner_accounts(*)')
                                    .eq('invite_token', dto.inviteToken)
                                    .is('accepted_at', null)
                                    .single()];
                        case 1:
                            _a = _c.sent(), invite = _a.data, inviteError = _a.error;
                            if (inviteError || !invite) {
                                throw new common_1.BadRequestException('Invalid or expired invite');
                            }
                            if (new Date(invite.expires_at) < new Date()) {
                                throw new common_1.BadRequestException('Invite has expired');
                            }
                            if (!dto.smsOptIn) {
                                throw new common_1.BadRequestException('SMS opt-in is required for client accounts');
                            }
                            return [4 /*yield*/, supabase
                                    .from('users')
                                    .select('id')
                                    .eq('email', invite.email)
                                    .single()];
                        case 2:
                            existingUser = (_c.sent()).data;
                            if (!existingUser) return [3 /*break*/, 3];
                            userId = existingUser.id;
                            return [3 /*break*/, 6];
                        case 3:
                            // Create new user account
                            if (!dto.password) {
                                throw new common_1.BadRequestException('Password is required for new accounts');
                            }
                            return [4 /*yield*/, supabase.auth.signUp({
                                    email: invite.email,
                                    password: dto.password,
                                })];
                        case 4:
                            _b = _c.sent(), authData = _b.data, authError = _b.error;
                            if (authError || !authData.user) {
                                throw new common_1.BadRequestException((authError === null || authError === void 0 ? void 0 : authError.message) || 'Failed to create user');
                            }
                            userId = authData.user.id;
                            return [4 /*yield*/, supabase
                                    .from('users')
                                    .insert({
                                    id: userId,
                                    email: invite.email,
                                    role: 'client',
                                    phone_number: invite.phone,
                                    email_verified: false,
                                    phone_verified: false,
                                    sms_opt_in: dto.smsOptIn,
                                    sms_opt_in_date: new Date().toISOString(),
                                    sms_opt_in_ip: ipAddress,
                                    sms_opt_in_user_agent: userAgent,
                                    status: 'active',
                                })];
                        case 5:
                            userError = (_c.sent()).error;
                            if (userError)
                                throw new common_1.BadRequestException(userError.message);
                            _c.label = 6;
                        case 6: return [4 /*yield*/, supabase
                                .from('client_profiles')
                                .insert({
                                user_id: userId,
                                owner_account_id: invite.owner_account_id,
                            })];
                        case 7:
                            profileError = (_c.sent()).error;
                            if (profileError)
                                throw new common_1.BadRequestException(profileError.message);
                            // 4. Mark invite as accepted
                            return [4 /*yield*/, supabase
                                    .from('invites')
                                    .update({ accepted_at: new Date().toISOString() })
                                    .eq('id', invite.id)];
                        case 8:
                            // 4. Mark invite as accepted
                            _c.sent();
                            if (!(invite.phone && dto.smsOptIn)) return [3 /*break*/, 10];
                            return [4 /*yield*/, this.smsService.sendVerificationCode(invite.phone, userId)];
                        case 9:
                            _c.sent();
                            _c.label = 10;
                        case 10: return [2 /*return*/, {
                                userId: userId,
                                message: 'Invite accepted. Please verify your email and phone.',
                                ownerBrand: invite.owner_accounts.business_name,
                                needsPhoneVerification: !!invite.phone,
                            }];
                    }
                });
            });
        };
        /**
         * Record SMS consent for client
         */
        AuthFlowService_1.prototype.recordSmsConsent = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            supabase = this.supabaseService.getClient();
                            return [4 /*yield*/, supabase
                                    .from('users')
                                    .update({
                                    sms_opt_in: dto.consentGiven,
                                    sms_opt_in_date: new Date().toISOString(),
                                    sms_opt_in_ip: dto.ipAddress,
                                    sms_opt_in_user_agent: dto.userAgent,
                                    phone_number: dto.phoneNumber,
                                })
                                    .eq('id', dto.userId)];
                        case 1:
                            error = (_a.sent()).error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            if (!dto.consentGiven) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.smsService.sendVerificationCode(dto.phoneNumber, dto.userId)];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3: return [2 /*return*/, { message: 'SMS consent recorded. Verification code sent.' }];
                    }
                });
            });
        };
        /**
         * VENDOR SIGNUP
         * Creates a Supabase auth user + user record with role = 'vendor'
         * The vendor_account is then created separately via POST /vendors/account
         */
        AuthFlowService_1.prototype.vendorSignup = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var adminClient, existing, _a, authData, authError, userId, userError, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            adminClient = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, adminClient
                                    .from('users')
                                    .select('id')
                                    .eq('email', dto.email.toLowerCase())
                                    .single()];
                        case 1:
                            existing = (_c.sent()).data;
                            if (existing) {
                                throw new common_1.BadRequestException('An account with this email already exists');
                            }
                            return [4 /*yield*/, adminClient.auth.signUp({
                                    email: dto.email,
                                    password: dto.password,
                                    options: {
                                        data: {
                                            first_name: dto.firstName,
                                            last_name: dto.lastName,
                                        },
                                    },
                                })];
                        case 2:
                            _a = _c.sent(), authData = _a.data, authError = _a.error;
                            if (authError || !authData.user) {
                                throw new common_1.BadRequestException((authError === null || authError === void 0 ? void 0 : authError.message) || 'Failed to create user');
                            }
                            if (!authData.user.identities || authData.user.identities.length === 0) {
                                throw new common_1.BadRequestException('An account with this email already exists');
                            }
                            userId = authData.user.id;
                            return [4 /*yield*/, adminClient
                                    .from('users')
                                    .insert({
                                    id: userId,
                                    email: dto.email,
                                    first_name: dto.firstName,
                                    last_name: dto.lastName,
                                    role: 'vendor',
                                    roles: ['vendor'],
                                    phone_number: dto.phoneNumber,
                                    email_verified: false,
                                    phone_verified: false,
                                    sms_opt_in: dto.smsOptIn === true,
                                    sms_opt_in_at: dto.smsOptIn === true ? new Date().toISOString() : null,
                                    status: 'active',
                                })];
                        case 3:
                            userError = (_c.sent()).error;
                            if (userError)
                                throw new common_1.BadRequestException(userError.message);
                            if (!(dto.phoneNumber && dto.smsOptIn)) return [3 /*break*/, 7];
                            _c.label = 4;
                        case 4:
                            _c.trys.push([4, 6, , 7]);
                            return [4 /*yield*/, this.twilioService.sendSMS(dto.phoneNumber, 'Welcome to DoVenue Suite! You are now subscribed to SMS notifications for account updates, event confirmations, reminders, and more. To unsubscribe at any time, reply STOP. Msg & data rates may apply.')];
                        case 5:
                            _c.sent();
                            return [3 /*break*/, 7];
                        case 6:
                            _b = _c.sent();
                            return [3 /*break*/, 7];
                        case 7: return [2 /*return*/, {
                                userId: userId,
                                message: 'Vendor account created. Please verify your email and complete your profile.',
                                session: authData.session,
                            }];
                    }
                });
            });
        };
        AuthFlowService_1.prototype.promoterSignup = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var adminClient, existing, _a, authData, authError, userId, userError;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            adminClient = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, adminClient
                                    .from('users')
                                    .select('id')
                                    .eq('email', dto.email.toLowerCase())
                                    .single()];
                        case 1:
                            existing = (_b.sent()).data;
                            if (existing) {
                                throw new common_1.BadRequestException('An account with this email already exists');
                            }
                            return [4 /*yield*/, adminClient.auth.signUp({
                                    email: dto.email,
                                    password: dto.password,
                                    options: {
                                        data: {
                                            first_name: dto.firstName,
                                            last_name: dto.lastName,
                                        },
                                    },
                                })];
                        case 2:
                            _a = _b.sent(), authData = _a.data, authError = _a.error;
                            if (authError || !authData.user) {
                                throw new common_1.BadRequestException((authError === null || authError === void 0 ? void 0 : authError.message) || 'Failed to create user');
                            }
                            if (!authData.user.identities || authData.user.identities.length === 0) {
                                throw new common_1.BadRequestException('An account with this email already exists');
                            }
                            userId = authData.user.id;
                            return [4 /*yield*/, adminClient
                                    .from('users')
                                    .insert({
                                    id: userId,
                                    email: dto.email,
                                    first_name: dto.firstName,
                                    last_name: dto.lastName,
                                    role: 'promoter',
                                    roles: ['promoter'],
                                    phone_number: dto.phoneNumber,
                                    email_verified: false,
                                    phone_verified: false,
                                    sms_opt_in: dto.smsOptIn === true,
                                    sms_opt_in_at: dto.smsOptIn === true ? new Date().toISOString() : null,
                                    status: 'active',
                                })];
                        case 3:
                            userError = (_b.sent()).error;
                            if (userError)
                                throw new common_1.BadRequestException(userError.message);
                            return [2 /*return*/, {
                                    userId: userId,
                                    message: 'Promoter account created. Please verify your email and complete your profile.',
                                    session: authData.session,
                                }];
                    }
                });
            });
        };
        AuthFlowService_1.prototype.artistSignup = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var adminClient, existing, _a, authData, authError, userId, userError;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            adminClient = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, adminClient
                                    .from('users')
                                    .select('id')
                                    .eq('email', dto.email.toLowerCase())
                                    .single()];
                        case 1:
                            existing = (_b.sent()).data;
                            if (existing) {
                                throw new common_1.BadRequestException('An account with this email already exists');
                            }
                            return [4 /*yield*/, adminClient.auth.signUp({
                                    email: dto.email,
                                    password: dto.password,
                                    options: {
                                        data: {
                                            first_name: dto.firstName,
                                            last_name: dto.lastName,
                                        },
                                    },
                                })];
                        case 2:
                            _a = _b.sent(), authData = _a.data, authError = _a.error;
                            if (authError || !authData.user) {
                                throw new common_1.BadRequestException((authError === null || authError === void 0 ? void 0 : authError.message) || 'Failed to create user');
                            }
                            if (!authData.user.identities || authData.user.identities.length === 0) {
                                throw new common_1.BadRequestException('An account with this email already exists');
                            }
                            userId = authData.user.id;
                            return [4 /*yield*/, adminClient
                                    .from('users')
                                    .insert({
                                    id: userId,
                                    email: dto.email,
                                    first_name: dto.firstName,
                                    last_name: dto.lastName,
                                    role: 'artist',
                                    roles: ['artist'],
                                    phone_number: dto.phoneNumber,
                                    email_verified: false,
                                    phone_verified: false,
                                    sms_opt_in: dto.smsOptIn === true,
                                    sms_opt_in_at: dto.smsOptIn === true ? new Date().toISOString() : null,
                                    status: 'active',
                                })];
                        case 3:
                            userError = (_b.sent()).error;
                            if (userError)
                                throw new common_1.BadRequestException(userError.message);
                            return [2 /*return*/, {
                                    userId: userId,
                                    message: 'Artist account created. Please verify your email and complete your profile.',
                                    session: authData.session,
                                }];
                    }
                });
            });
        };
        AuthFlowService_1.prototype.vendorLogin = function (email, password) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, authData, authError, user, adminClient, vendorAccount;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getClient();
                            return [4 /*yield*/, supabase.auth.signInWithPassword({
                                    email: email,
                                    password: password,
                                })];
                        case 1:
                            _a = _b.sent(), authData = _a.data, authError = _a.error;
                            if (authError)
                                throw new common_1.UnauthorizedException(authError.message);
                            return [4 /*yield*/, supabase
                                    .from('users')
                                    .select('*')
                                    .eq('id', authData.user.id)
                                    .single()];
                        case 2:
                            user = (_b.sent()).data;
                            if (!user || !this.userHasRole(user, 'vendor')) {
                                throw new common_1.UnauthorizedException('Not a vendor account');
                            }
                            adminClient = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, adminClient
                                    .from('vendor_accounts')
                                    .select('id, business_name, category, is_active')
                                    .eq('user_id', authData.user.id)
                                    .single()];
                        case 3:
                            vendorAccount = (_b.sent()).data;
                            return [2 /*return*/, {
                                    session: authData.session,
                                    user: user,
                                    roles: this.getUserRoles(user),
                                    vendorAccount: vendorAccount,
                                    hasProfile: !!vendorAccount,
                                }];
                    }
                });
            });
        };
        /**
         * UNIFIED LOGIN
         * Single endpoint for all roles. Returns all roles the user has.
         * Frontend uses the roles array to decide where to navigate.
         */
        AuthFlowService_1.prototype.unifiedLogin = function (email, password) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, adminClient, _a, authData, authError, dbUser, user, roles, subscriptionStatus, ownerAccountId, membership, membership, vendorAccount, va;
                var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
                return __generator(this, function (_r) {
                    switch (_r.label) {
                        case 0:
                            supabase = this.supabaseService.getClient();
                            adminClient = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase.auth.signInWithPassword({
                                    email: email,
                                    password: password,
                                })];
                        case 1:
                            _a = _r.sent(), authData = _a.data, authError = _a.error;
                            if (authError)
                                throw new common_1.UnauthorizedException(authError.message);
                            return [4 /*yield*/, supabase
                                    .from('users')
                                    .select('*')
                                    .eq('id', authData.user.id)
                                    .single()];
                        case 2:
                            dbUser = (_r.sent()).data;
                            user = dbUser !== null && dbUser !== void 0 ? dbUser : {
                                id: authData.user.id,
                                email: authData.user.email,
                                first_name: (_c = (_b = authData.user.user_metadata) === null || _b === void 0 ? void 0 : _b.first_name) !== null && _c !== void 0 ? _c : '',
                                last_name: (_e = (_d = authData.user.user_metadata) === null || _d === void 0 ? void 0 : _d.last_name) !== null && _e !== void 0 ? _e : '',
                                role: (_g = (_f = authData.user.user_metadata) === null || _f === void 0 ? void 0 : _f.role) !== null && _g !== void 0 ? _g : 'owner',
                                roles: (_j = (_h = authData.user.user_metadata) === null || _h === void 0 ? void 0 : _h.roles) !== null && _j !== void 0 ? _j : null,
                                created_at: authData.user.created_at,
                                updated_at: authData.user.updated_at,
                            };
                            roles = this.getUserRoles(user);
                            subscriptionStatus = null;
                            ownerAccountId = null;
                            if (!this.userHasRole(user, 'owner')) return [3 /*break*/, 4];
                            return [4 /*yield*/, supabase
                                    .from('memberships')
                                    .select('owner_account_id, owner_accounts(subscription_status)')
                                    .eq('user_id', user.id)
                                    .limit(1)
                                    .single()];
                        case 3:
                            membership = (_r.sent()).data;
                            subscriptionStatus = (_l = (_k = membership === null || membership === void 0 ? void 0 : membership.owner_accounts) === null || _k === void 0 ? void 0 : _k.subscription_status) !== null && _l !== void 0 ? _l : null;
                            ownerAccountId = (_m = membership === null || membership === void 0 ? void 0 : membership.owner_account_id) !== null && _m !== void 0 ? _m : null;
                            _r.label = 4;
                        case 4:
                            if (!this.userHasRole(user, 'associate')) return [3 /*break*/, 6];
                            return [4 /*yield*/, adminClient
                                    .from('memberships')
                                    .select('owner_account_id, owner_accounts(subscription_status)')
                                    .eq('user_id', user.id)
                                    .eq('role', 'associate')
                                    .eq('is_active', true)
                                    .limit(1)
                                    .maybeSingle()];
                        case 5:
                            membership = (_r.sent()).data;
                            ownerAccountId = (_o = membership === null || membership === void 0 ? void 0 : membership.owner_account_id) !== null && _o !== void 0 ? _o : null;
                            subscriptionStatus = (_q = (_p = membership === null || membership === void 0 ? void 0 : membership.owner_accounts) === null || _p === void 0 ? void 0 : _p.subscription_status) !== null && _q !== void 0 ? _q : null;
                            _r.label = 6;
                        case 6:
                            vendorAccount = null;
                            if (!this.userHasRole(user, 'vendor')) return [3 /*break*/, 8];
                            return [4 /*yield*/, adminClient
                                    .from('vendor_accounts')
                                    .select('id, business_name, category, is_active')
                                    .eq('user_id', user.id)
                                    .single()];
                        case 7:
                            va = (_r.sent()).data;
                            vendorAccount = va;
                            _r.label = 8;
                        case 8: return [2 /*return*/, {
                                session: authData.session,
                                user: user,
                                roles: roles,
                                subscriptionStatus: subscriptionStatus,
                                ownerAccountId: ownerAccountId,
                                vendorAccount: vendorAccount,
                                hasVendorProfile: !!vendorAccount,
                                accessGranted: true,
                            }];
                    }
                });
            });
        };
        /**
         * ADD ROLE TO EXISTING USER
         * Call this when an owner wants to also become a vendor, or vice versa.
         * The caller must pass a valid access_token so we can identify them.
         */
        AuthFlowService_1.prototype.addRoleToUser = function (accessToken, newRole) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, adminClient, _a, authUser, authErr, _b, user, userErr, currentRoles, updatedRoles, updateErr;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            supabase = this.supabaseService.getClient();
                            adminClient = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase.auth.getUser(accessToken)];
                        case 1:
                            _a = _c.sent(), authUser = _a.data.user, authErr = _a.error;
                            if (authErr || !authUser)
                                throw new common_1.UnauthorizedException('Invalid or expired token');
                            return [4 /*yield*/, adminClient
                                    .from('users')
                                    .select('id, role, roles')
                                    .eq('id', authUser.id)
                                    .single()];
                        case 2:
                            _b = _c.sent(), user = _b.data, userErr = _b.error;
                            if (userErr || !user)
                                throw new common_1.UnauthorizedException('User not found');
                            currentRoles = this.getUserRoles(user);
                            if (currentRoles.includes(newRole)) {
                                return [2 /*return*/, { message: 'Role already assigned', roles: currentRoles }];
                            }
                            updatedRoles = __spreadArray(__spreadArray([], currentRoles, true), [newRole], false);
                            return [4 /*yield*/, adminClient
                                    .from('users')
                                    .update({ roles: updatedRoles })
                                    .eq('id', user.id)];
                        case 3:
                            updateErr = (_c.sent()).error;
                            if (updateErr)
                                throw new common_1.BadRequestException(updateErr.message);
                            return [2 /*return*/, {
                                    message: "Role '".concat(newRole, "' added successfully"),
                                    roles: updatedRoles,
                                }];
                    }
                });
            });
        };
        /**
         * ADMIN LOGIN (Email-only, no MFA)
         */
        AuthFlowService_1.prototype.adminLogin = function (email, password) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, authData, authError, user;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getClient();
                            return [4 /*yield*/, supabase.auth.signInWithPassword({
                                    email: email,
                                    password: password,
                                })];
                        case 1:
                            _a = _b.sent(), authData = _a.data, authError = _a.error;
                            if (authError)
                                throw new common_1.UnauthorizedException(authError.message);
                            return [4 /*yield*/, supabase
                                    .from('users')
                                    .select('*')
                                    .eq('id', authData.user.id)
                                    .single()];
                        case 2:
                            user = (_b.sent()).data;
                            if ((user === null || user === void 0 ? void 0 : user.role) !== 'admin') {
                                throw new common_1.UnauthorizedException('Not an admin account');
                            }
                            return [2 /*return*/, {
                                    session: authData.session,
                                    user: user,
                                }];
                    }
                });
            });
        };
        return AuthFlowService_1;
    }());
    __setFunctionName(_classThis, "AuthFlowService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AuthFlowService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AuthFlowService = _classThis;
}();
exports.AuthFlowService = AuthFlowService;
