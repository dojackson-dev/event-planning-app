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
exports.TeamService = void 0;
var common_1 = require("@nestjs/common");
var crypto_1 = require("crypto");
var TeamService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var TeamService = _classThis = /** @class */ (function () {
        function TeamService_1(supabaseService, mailService) {
            this.supabaseService = supabaseService;
            this.mailService = mailService;
        }
        /** Resolve owner_account_id for the given auth user */
        TeamService_1.prototype.getOwnerAccountId = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('memberships')
                                    .select('owner_account_id')
                                    .eq('user_id', userId)
                                    .eq('role', 'owner')
                                    .eq('is_active', true)
                                    .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error || !data)
                                throw new common_1.ForbiddenException('Owner account not found');
                            return [2 /*return*/, data.owner_account_id];
                    }
                });
            });
        };
        /** GET /team/members — list all associates for this owner */
        TeamService_1.prototype.getMembers = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var ownerAccountId, admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getOwnerAccountId(userId)];
                        case 1:
                            ownerAccountId = _b.sent();
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('memberships')
                                    .select('id, role, is_active, created_at, user:users(id, email, first_name, last_name)')
                                    .eq('owner_account_id', ownerAccountId)
                                    .eq('role', 'associate')
                                    .order('created_at', { ascending: false })];
                        case 2:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data || []];
                    }
                });
            });
        };
        /** GET /team/invitations — list pending invitations */
        TeamService_1.prototype.getInvitations = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var ownerAccountId, admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getOwnerAccountId(userId)];
                        case 1:
                            ownerAccountId = _b.sent();
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('team_invitations')
                                    .select('id, email, role, status, created_at, expires_at')
                                    .eq('owner_account_id', ownerAccountId)
                                    .eq('status', 'pending')
                                    .order('created_at', { ascending: false })];
                        case 2:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data || []];
                    }
                });
            });
        };
        /** POST /team/invite — owner invites an associate by email */
        TeamService_1.prototype.inviteAssociate = function (userId, email) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, ownerAccountId, existingUser, existingMember, existingInvite, owner, ownerAccount, token, expiresAt, inviteError, frontendUrl, inviteUrl, ownerName, businessName;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getOwnerAccountId(userId)];
                        case 1:
                            ownerAccountId = _a.sent();
                            return [4 /*yield*/, admin
                                    .from('users')
                                    .select('id')
                                    .eq('email', email.toLowerCase())
                                    .maybeSingle()];
                        case 2:
                            existingUser = (_a.sent()).data;
                            if (!existingUser) return [3 /*break*/, 4];
                            return [4 /*yield*/, admin
                                    .from('memberships')
                                    .select('id')
                                    .eq('user_id', existingUser.id)
                                    .eq('owner_account_id', ownerAccountId)
                                    .maybeSingle()];
                        case 3:
                            existingMember = (_a.sent()).data;
                            if (existingMember) {
                                throw new common_1.BadRequestException('This person is already a member of your team');
                            }
                            _a.label = 4;
                        case 4: return [4 /*yield*/, admin
                                .from('team_invitations')
                                .select('id')
                                .eq('owner_account_id', ownerAccountId)
                                .eq('email', email.toLowerCase())
                                .eq('status', 'pending')
                                .maybeSingle()];
                        case 5:
                            existingInvite = (_a.sent()).data;
                            if (existingInvite) {
                                throw new common_1.BadRequestException('An invitation has already been sent to this email');
                            }
                            return [4 /*yield*/, admin
                                    .from('users')
                                    .select('first_name, last_name, email')
                                    .eq('id', userId)
                                    .single()];
                        case 6:
                            owner = (_a.sent()).data;
                            return [4 /*yield*/, admin
                                    .from('owner_accounts')
                                    .select('business_name')
                                    .eq('id', ownerAccountId)
                                    .single()];
                        case 7:
                            ownerAccount = (_a.sent()).data;
                            token = (0, crypto_1.randomBytes)(32).toString('hex');
                            expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
                            return [4 /*yield*/, admin
                                    .from('team_invitations')
                                    .insert({
                                    owner_account_id: ownerAccountId,
                                    invited_by_user_id: userId,
                                    email: email.toLowerCase(),
                                    role: 'associate',
                                    token: token,
                                    status: 'pending',
                                    expires_at: expiresAt,
                                })];
                        case 8:
                            inviteError = (_a.sent()).error;
                            if (inviteError)
                                throw new common_1.BadRequestException(inviteError.message);
                            frontendUrl = process.env.FRONTEND_URL || 'https://dovenuesuite.com';
                            inviteUrl = "".concat(frontendUrl, "/team/accept?token=").concat(token);
                            ownerName = [owner === null || owner === void 0 ? void 0 : owner.first_name, owner === null || owner === void 0 ? void 0 : owner.last_name].filter(Boolean).join(' ') || 'Your venue owner';
                            businessName = (ownerAccount === null || ownerAccount === void 0 ? void 0 : ownerAccount.business_name) || 'DoVenueSuite';
                            return [4 /*yield*/, this.mailService.sendTeamInvitation({
                                    toEmail: email,
                                    inviteUrl: inviteUrl,
                                    ownerName: ownerName,
                                    businessName: businessName,
                                })];
                        case 9:
                            _a.sent();
                            return [2 /*return*/, { success: true, message: "Invitation sent to ".concat(email) }];
                    }
                });
            });
        };
        /** POST /team/accept — accept invite and create/link account */
        TeamService_1.prototype.acceptInvite = function (token, password, firstName, lastName) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, invite, invErr, supabase, existingUser, userId, _b, authData, authErr, session, signInData, userRow;
                var _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('team_invitations')
                                    .select('*, owner_account:owner_accounts(id, business_name)')
                                    .eq('token', token)
                                    .eq('status', 'pending')
                                    .maybeSingle()];
                        case 1:
                            _a = _e.sent(), invite = _a.data, invErr = _a.error;
                            if (invErr || !invite)
                                throw new common_1.BadRequestException('Invalid or expired invitation link');
                            if (!(new Date(invite.expires_at) < new Date())) return [3 /*break*/, 3];
                            return [4 /*yield*/, admin.from('team_invitations').update({ status: 'expired' }).eq('id', invite.id)];
                        case 2:
                            _e.sent();
                            throw new common_1.BadRequestException('This invitation has expired. Please ask the owner to resend it.');
                        case 3:
                            supabase = this.supabaseService.getClient();
                            return [4 /*yield*/, admin
                                    .from('users')
                                    .select('id')
                                    .eq('email', invite.email)
                                    .maybeSingle()];
                        case 4:
                            existingUser = (_e.sent()).data;
                            if (!existingUser) return [3 /*break*/, 5];
                            // User exists — just add the membership
                            userId = existingUser.id;
                            return [3 /*break*/, 8];
                        case 5: return [4 /*yield*/, supabase.auth.signUp({
                                email: invite.email,
                                password: password,
                                options: { data: { first_name: firstName, last_name: lastName } },
                            })];
                        case 6:
                            _b = _e.sent(), authData = _b.data, authErr = _b.error;
                            if (authErr || !authData.user) {
                                throw new common_1.BadRequestException((authErr === null || authErr === void 0 ? void 0 : authErr.message) || 'Failed to create account');
                            }
                            userId = authData.user.id;
                            // Create users row
                            return [4 /*yield*/, admin.from('users').insert({
                                    id: userId,
                                    email: invite.email,
                                    first_name: firstName,
                                    last_name: lastName,
                                    role: 'associate',
                                    roles: ['associate'],
                                    email_verified: true,
                                    phone_verified: false,
                                    sms_opt_in: false,
                                })];
                        case 7:
                            // Create users row
                            _e.sent();
                            _e.label = 8;
                        case 8: 
                        // Create membership
                        return [4 /*yield*/, admin.from('memberships').insert({
                                user_id: userId,
                                owner_account_id: invite.owner_account_id,
                                role: 'associate',
                                is_active: true,
                            })];
                        case 9:
                            // Create membership
                            _e.sent();
                            // Mark invite accepted
                            return [4 /*yield*/, admin
                                    .from('team_invitations')
                                    .update({ status: 'accepted' })
                                    .eq('id', invite.id)];
                        case 10:
                            // Mark invite accepted
                            _e.sent();
                            session = null;
                            if (!!existingUser) return [3 /*break*/, 12];
                            return [4 /*yield*/, supabase.auth.signInWithPassword({
                                    email: invite.email,
                                    password: password,
                                })];
                        case 11:
                            signInData = (_e.sent()).data;
                            session = (_c = signInData === null || signInData === void 0 ? void 0 : signInData.session) !== null && _c !== void 0 ? _c : null;
                            _e.label = 12;
                        case 12: return [4 /*yield*/, admin
                                .from('users')
                                .select('id, email, first_name, last_name, role, roles')
                                .eq('id', userId)
                                .single()];
                        case 13:
                            userRow = (_e.sent()).data;
                            return [2 /*return*/, {
                                    success: true,
                                    message: "You have joined ".concat(((_d = invite.owner_account) === null || _d === void 0 ? void 0 : _d.business_name) || 'the team', "!"),
                                    session: session,
                                    user: userRow,
                                    roles: ['associate'],
                                    ownerAccountId: invite.owner_account_id,
                                }];
                    }
                });
            });
        };
        /** GET /team/invite-info/:token — preview invite without accepting */
        TeamService_1.prototype.getInviteInfo = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, invite, error, inviter;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('team_invitations')
                                    .select('email, status, expires_at, invited_by_user_id, owner_account:owner_accounts(business_name)')
                                    .eq('token', token)
                                    .maybeSingle()];
                        case 1:
                            _a = _c.sent(), invite = _a.data, error = _a.error;
                            if (error || !invite)
                                throw new common_1.NotFoundException('Invitation not found');
                            if (invite.status !== 'pending')
                                throw new common_1.BadRequestException('This invitation has already been used or expired');
                            if (new Date(invite.expires_at) < new Date())
                                throw new common_1.BadRequestException('This invitation has expired');
                            return [4 /*yield*/, admin
                                    .from('users')
                                    .select('first_name, last_name')
                                    .eq('id', invite.invited_by_user_id)
                                    .single()];
                        case 2:
                            inviter = (_c.sent()).data;
                            return [2 /*return*/, {
                                    email: invite.email,
                                    businessName: (_b = invite.owner_account) === null || _b === void 0 ? void 0 : _b.business_name,
                                    ownerName: [inviter === null || inviter === void 0 ? void 0 : inviter.first_name, inviter === null || inviter === void 0 ? void 0 : inviter.last_name].filter(Boolean).join(' ') || 'Your venue owner',
                                    role: 'associate',
                                }];
                    }
                });
            });
        };
        /** DELETE /team/members/:memberUserId — owner removes an associate */
        TeamService_1.prototype.removeMember = function (ownerUserId, memberUserId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, ownerAccountId, error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getOwnerAccountId(ownerUserId)];
                        case 1:
                            ownerAccountId = _a.sent();
                            return [4 /*yield*/, admin
                                    .from('memberships')
                                    .update({ is_active: false })
                                    .eq('user_id', memberUserId)
                                    .eq('owner_account_id', ownerAccountId)
                                    .eq('role', 'associate')];
                        case 2:
                            error = (_a.sent()).error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, { success: true }];
                    }
                });
            });
        };
        /** DELETE /team/invitations/:id — cancel a pending invite */
        TeamService_1.prototype.cancelInvitation = function (ownerUserId, invitationId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, ownerAccountId, error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getOwnerAccountId(ownerUserId)];
                        case 1:
                            ownerAccountId = _a.sent();
                            return [4 /*yield*/, admin
                                    .from('team_invitations')
                                    .update({ status: 'expired' })
                                    .eq('id', invitationId)
                                    .eq('owner_account_id', ownerAccountId)];
                        case 2:
                            error = (_a.sent()).error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, { success: true }];
                    }
                });
            });
        };
        return TeamService_1;
    }());
    __setFunctionName(_classThis, "TeamService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        TeamService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return TeamService = _classThis;
}();
exports.TeamService = TeamService;
