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
exports.TeamController = void 0;
var common_1 = require("@nestjs/common");
var TeamController = function () {
    var _classDecorators = [(0, common_1.Controller)('team')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _getMembers_decorators;
    var _getInvitations_decorators;
    var _inviteAssociate_decorators;
    var _getInviteInfo_decorators;
    var _acceptInvite_decorators;
    var _removeMember_decorators;
    var _cancelInvitation_decorators;
    var TeamController = _classThis = /** @class */ (function () {
        function TeamController_1(teamService, supabaseService) {
            this.teamService = (__runInitializers(this, _instanceExtraInitializers), teamService);
            this.supabaseService = supabaseService;
        }
        TeamController_1.prototype.getUserId = function (authorization) {
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
        /** GET /team/members */
        TeamController_1.prototype.getMembers = function (auth) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.teamService.getMembers(userId)];
                    }
                });
            });
        };
        /** GET /team/invitations */
        TeamController_1.prototype.getInvitations = function (auth) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.teamService.getInvitations(userId)];
                    }
                });
            });
        };
        /** POST /team/invite */
        TeamController_1.prototype.inviteAssociate = function (auth, email) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!email)
                                throw new common_1.UnauthorizedException('Email is required');
                            return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.teamService.inviteAssociate(userId, email)];
                    }
                });
            });
        };
        /** GET /team/invite-info/:token — public, no auth required */
        TeamController_1.prototype.getInviteInfo = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.teamService.getInviteInfo(token)];
                });
            });
        };
        /** POST /team/accept */
        TeamController_1.prototype.acceptInvite = function (token, password, firstName, lastName) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (!token)
                        throw new common_1.UnauthorizedException('Token is required');
                    return [2 /*return*/, this.teamService.acceptInvite(token, password, firstName, lastName)];
                });
            });
        };
        /** DELETE /team/members/:memberUserId */
        TeamController_1.prototype.removeMember = function (auth, memberUserId) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.teamService.removeMember(userId, memberUserId)];
                    }
                });
            });
        };
        /** DELETE /team/invitations/:id */
        TeamController_1.prototype.cancelInvitation = function (auth, id) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.teamService.cancelInvitation(userId, id)];
                    }
                });
            });
        };
        return TeamController_1;
    }());
    __setFunctionName(_classThis, "TeamController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getMembers_decorators = [(0, common_1.Get)('members')];
        _getInvitations_decorators = [(0, common_1.Get)('invitations')];
        _inviteAssociate_decorators = [(0, common_1.Post)('invite')];
        _getInviteInfo_decorators = [(0, common_1.Get)('invite-info/:token')];
        _acceptInvite_decorators = [(0, common_1.Post)('accept')];
        _removeMember_decorators = [(0, common_1.Delete)('members/:memberUserId')];
        _cancelInvitation_decorators = [(0, common_1.Delete)('invitations/:id')];
        __esDecorate(_classThis, null, _getMembers_decorators, { kind: "method", name: "getMembers", static: false, private: false, access: { has: function (obj) { return "getMembers" in obj; }, get: function (obj) { return obj.getMembers; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getInvitations_decorators, { kind: "method", name: "getInvitations", static: false, private: false, access: { has: function (obj) { return "getInvitations" in obj; }, get: function (obj) { return obj.getInvitations; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _inviteAssociate_decorators, { kind: "method", name: "inviteAssociate", static: false, private: false, access: { has: function (obj) { return "inviteAssociate" in obj; }, get: function (obj) { return obj.inviteAssociate; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getInviteInfo_decorators, { kind: "method", name: "getInviteInfo", static: false, private: false, access: { has: function (obj) { return "getInviteInfo" in obj; }, get: function (obj) { return obj.getInviteInfo; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _acceptInvite_decorators, { kind: "method", name: "acceptInvite", static: false, private: false, access: { has: function (obj) { return "acceptInvite" in obj; }, get: function (obj) { return obj.acceptInvite; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _removeMember_decorators, { kind: "method", name: "removeMember", static: false, private: false, access: { has: function (obj) { return "removeMember" in obj; }, get: function (obj) { return obj.removeMember; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _cancelInvitation_decorators, { kind: "method", name: "cancelInvitation", static: false, private: false, access: { has: function (obj) { return "cancelInvitation" in obj; }, get: function (obj) { return obj.cancelInvitation; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        TeamController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return TeamController = _classThis;
}();
exports.TeamController = TeamController;
