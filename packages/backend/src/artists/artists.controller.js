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
exports.ArtistsController = void 0;
var common_1 = require("@nestjs/common");
var ArtistsController = function () {
    var _classDecorators = [(0, common_1.Controller)('artists')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _getArtistTypes_decorators;
    var _searchArtists_decorators;
    var _getArtistById_decorators;
    var _register_decorators;
    var _getMyProfile_decorators;
    var _updateMyProfile_decorators;
    var _getMyRider_decorators;
    var _upsertMyRider_decorators;
    var _getPublicRider_decorators;
    var ArtistsController = _classThis = /** @class */ (function () {
        function ArtistsController_1(artistsService, supabaseService) {
            this.artistsService = (__runInitializers(this, _instanceExtraInitializers), artistsService);
            this.supabaseService = supabaseService;
            this.logger = new common_1.Logger(ArtistsController.name);
        }
        // ─────────────────────────────────────────────
        // AUTH HELPER
        // ─────────────────────────────────────────────
        ArtistsController_1.prototype.getUserId = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var token, supabase, _a, user, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!authorization)
                                throw new common_1.UnauthorizedException('No authorization header');
                            token = authorization.replace('Bearer ', '');
                            if (token.startsWith('local-')) {
                                return [2 /*return*/, token.replace('local-', '')];
                            }
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
        // ─────────────────────────────────────────────
        // PUBLIC ROUTES
        // ─────────────────────────────────────────────
        /** GET /artists/types */
        ArtistsController_1.prototype.getArtistTypes = function () {
            return this.artistsService.getArtistTypes();
        };
        /**
         * GET /artists/search?artistType=&genre=&location=&availableForBooking=
         * Artist directory for owners/promoters discovering talent
         */
        ArtistsController_1.prototype.searchArtists = function (artistType, genre, location, availableForBooking, travelAvailability) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.artistsService.searchArtists({
                            artistType: artistType || undefined,
                            genre: genre || undefined,
                            location: location || undefined,
                            availableForBooking: availableForBooking !== undefined ? availableForBooking === 'true' : undefined,
                            travelAvailability: travelAvailability || undefined,
                        })];
                });
            });
        };
        /** GET /artists/:id — public artist profile */
        ArtistsController_1.prototype.getArtistById = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.artistsService.getArtistById(id)];
                });
            });
        };
        // ─────────────────────────────────────────────
        // AUTHENTICATED ROUTES (artist portal)
        // ─────────────────────────────────────────────
        /**
         * POST /artists/register
         */
        ArtistsController_1.prototype.register = function (authorization, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.artistsService.createArtistAccount(userId, dto)];
                    }
                });
            });
        };
        /**
         * GET /artists/me/profile
         */
        ArtistsController_1.prototype.getMyProfile = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.artistsService.getArtistProfile(userId)];
                    }
                });
            });
        };
        /**
         * PUT /artists/me/profile
         */
        ArtistsController_1.prototype.updateMyProfile = function (authorization, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.artistsService.updateArtistProfile(userId, dto)];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // RIDER
        // ─────────────────────────────────────────────
        /** GET /artists/me/rider */
        ArtistsController_1.prototype.getMyRider = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.artistsService.getRider(userId)];
                    }
                });
            });
        };
        /** PUT /artists/me/rider */
        ArtistsController_1.prototype.upsertMyRider = function (authorization, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.artistsService.upsertRider(userId, dto)];
                    }
                });
            });
        };
        /** GET /artists/:id/rider — public rider view */
        ArtistsController_1.prototype.getPublicRider = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.artistsService.getPublicRider(id)];
                });
            });
        };
        return ArtistsController_1;
    }());
    __setFunctionName(_classThis, "ArtistsController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getArtistTypes_decorators = [(0, common_1.Get)('types')];
        _searchArtists_decorators = [(0, common_1.Get)('search')];
        _getArtistById_decorators = [(0, common_1.Get)(':id')];
        _register_decorators = [(0, common_1.Post)('register')];
        _getMyProfile_decorators = [(0, common_1.Get)('me/profile')];
        _updateMyProfile_decorators = [(0, common_1.Put)('me/profile')];
        _getMyRider_decorators = [(0, common_1.Get)('me/rider')];
        _upsertMyRider_decorators = [(0, common_1.Put)('me/rider')];
        _getPublicRider_decorators = [(0, common_1.Get)(':id/rider')];
        __esDecorate(_classThis, null, _getArtistTypes_decorators, { kind: "method", name: "getArtistTypes", static: false, private: false, access: { has: function (obj) { return "getArtistTypes" in obj; }, get: function (obj) { return obj.getArtistTypes; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _searchArtists_decorators, { kind: "method", name: "searchArtists", static: false, private: false, access: { has: function (obj) { return "searchArtists" in obj; }, get: function (obj) { return obj.searchArtists; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getArtistById_decorators, { kind: "method", name: "getArtistById", static: false, private: false, access: { has: function (obj) { return "getArtistById" in obj; }, get: function (obj) { return obj.getArtistById; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _register_decorators, { kind: "method", name: "register", static: false, private: false, access: { has: function (obj) { return "register" in obj; }, get: function (obj) { return obj.register; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMyProfile_decorators, { kind: "method", name: "getMyProfile", static: false, private: false, access: { has: function (obj) { return "getMyProfile" in obj; }, get: function (obj) { return obj.getMyProfile; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateMyProfile_decorators, { kind: "method", name: "updateMyProfile", static: false, private: false, access: { has: function (obj) { return "updateMyProfile" in obj; }, get: function (obj) { return obj.updateMyProfile; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMyRider_decorators, { kind: "method", name: "getMyRider", static: false, private: false, access: { has: function (obj) { return "getMyRider" in obj; }, get: function (obj) { return obj.getMyRider; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _upsertMyRider_decorators, { kind: "method", name: "upsertMyRider", static: false, private: false, access: { has: function (obj) { return "upsertMyRider" in obj; }, get: function (obj) { return obj.upsertMyRider; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getPublicRider_decorators, { kind: "method", name: "getPublicRider", static: false, private: false, access: { has: function (obj) { return "getPublicRider" in obj; }, get: function (obj) { return obj.getPublicRider; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ArtistsController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ArtistsController = _classThis;
}();
exports.ArtistsController = ArtistsController;
