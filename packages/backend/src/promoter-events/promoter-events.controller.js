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
exports.PromoterEventsController = void 0;
var common_1 = require("@nestjs/common");
var PromoterEventsController = function () {
    var _classDecorators = [(0, common_1.Controller)('promoter-events')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _listPublicEvents_decorators;
    var _getPublicEvent_decorators;
    var _createCheckout_decorators;
    var _create_decorators;
    var _listMine_decorators;
    var _getOne_decorators;
    var _update_decorators;
    var _remove_decorators;
    var _addTier_decorators;
    var _updateTier_decorators;
    var _deleteTier_decorators;
    var _getAttendees_decorators;
    var PromoterEventsController = _classThis = /** @class */ (function () {
        function PromoterEventsController_1(service, supabaseService) {
            this.service = (__runInitializers(this, _instanceExtraInitializers), service);
            this.supabaseService = supabaseService;
        }
        PromoterEventsController_1.prototype.getUserId = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var token, supabase, _a, user, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!authorization)
                                throw new common_1.UnauthorizedException('No authorization header');
                            token = authorization.replace('Bearer ', '');
                            if (token.startsWith('local-'))
                                return [2 /*return*/, token.replace('local-', '')];
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
        // ── PUBLIC routes (no auth) ───────────────────────────────────
        PromoterEventsController_1.prototype.listPublicEvents = function (city, category) {
            return this.service.listPublicEvents(city, category);
        };
        PromoterEventsController_1.prototype.getPublicEvent = function (id) {
            return this.service.getPublicEvent(id);
        };
        PromoterEventsController_1.prototype.createCheckout = function (id, body) {
            return this.service.createTicketCheckout(id, body.tier_id, body.quantity || 1, body.buyer_email, body.buyer_phone);
        };
        // ── PROTECTED routes ──────────────────────────────────────────
        PromoterEventsController_1.prototype.create = function (auth, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.service.createEvent(userId, dto)];
                    }
                });
            });
        };
        PromoterEventsController_1.prototype.listMine = function (auth) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.service.listEvents(userId)];
                    }
                });
            });
        };
        PromoterEventsController_1.prototype.getOne = function (auth, id) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.service.getEvent(userId, id)];
                    }
                });
            });
        };
        PromoterEventsController_1.prototype.update = function (auth, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.service.updateEvent(userId, id, dto)];
                    }
                });
            });
        };
        PromoterEventsController_1.prototype.remove = function (auth, id) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.service.deleteEvent(userId, id)];
                    }
                });
            });
        };
        // ticket tiers
        PromoterEventsController_1.prototype.addTier = function (auth, eventId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.service.addTicketTier(userId, eventId, dto)];
                    }
                });
            });
        };
        PromoterEventsController_1.prototype.updateTier = function (auth, tierId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.service.updateTicketTier(userId, tierId, dto)];
                    }
                });
            });
        };
        PromoterEventsController_1.prototype.deleteTier = function (auth, tierId) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.service.deleteTicketTier(userId, tierId)];
                    }
                });
            });
        };
        // attendees
        PromoterEventsController_1.prototype.getAttendees = function (auth, eventId) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.service.getEventAttendees(userId, eventId)];
                    }
                });
            });
        };
        return PromoterEventsController_1;
    }());
    __setFunctionName(_classThis, "PromoterEventsController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _listPublicEvents_decorators = [(0, common_1.Get)('public')];
        _getPublicEvent_decorators = [(0, common_1.Get)('public/:id')];
        _createCheckout_decorators = [(0, common_1.Post)('public/:id/checkout')];
        _create_decorators = [(0, common_1.Post)()];
        _listMine_decorators = [(0, common_1.Get)('mine')];
        _getOne_decorators = [(0, common_1.Get)(':id')];
        _update_decorators = [(0, common_1.Put)(':id')];
        _remove_decorators = [(0, common_1.Delete)(':id')];
        _addTier_decorators = [(0, common_1.Post)(':id/tiers')];
        _updateTier_decorators = [(0, common_1.Put)('tiers/:tierId')];
        _deleteTier_decorators = [(0, common_1.Delete)('tiers/:tierId')];
        _getAttendees_decorators = [(0, common_1.Get)(':id/attendees')];
        __esDecorate(_classThis, null, _listPublicEvents_decorators, { kind: "method", name: "listPublicEvents", static: false, private: false, access: { has: function (obj) { return "listPublicEvents" in obj; }, get: function (obj) { return obj.listPublicEvents; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getPublicEvent_decorators, { kind: "method", name: "getPublicEvent", static: false, private: false, access: { has: function (obj) { return "getPublicEvent" in obj; }, get: function (obj) { return obj.getPublicEvent; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createCheckout_decorators, { kind: "method", name: "createCheckout", static: false, private: false, access: { has: function (obj) { return "createCheckout" in obj; }, get: function (obj) { return obj.createCheckout; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _create_decorators, { kind: "method", name: "create", static: false, private: false, access: { has: function (obj) { return "create" in obj; }, get: function (obj) { return obj.create; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listMine_decorators, { kind: "method", name: "listMine", static: false, private: false, access: { has: function (obj) { return "listMine" in obj; }, get: function (obj) { return obj.listMine; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getOne_decorators, { kind: "method", name: "getOne", static: false, private: false, access: { has: function (obj) { return "getOne" in obj; }, get: function (obj) { return obj.getOne; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _update_decorators, { kind: "method", name: "update", static: false, private: false, access: { has: function (obj) { return "update" in obj; }, get: function (obj) { return obj.update; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _remove_decorators, { kind: "method", name: "remove", static: false, private: false, access: { has: function (obj) { return "remove" in obj; }, get: function (obj) { return obj.remove; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _addTier_decorators, { kind: "method", name: "addTier", static: false, private: false, access: { has: function (obj) { return "addTier" in obj; }, get: function (obj) { return obj.addTier; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateTier_decorators, { kind: "method", name: "updateTier", static: false, private: false, access: { has: function (obj) { return "updateTier" in obj; }, get: function (obj) { return obj.updateTier; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteTier_decorators, { kind: "method", name: "deleteTier", static: false, private: false, access: { has: function (obj) { return "deleteTier" in obj; }, get: function (obj) { return obj.deleteTier; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getAttendees_decorators, { kind: "method", name: "getAttendees", static: false, private: false, access: { has: function (obj) { return "getAttendees" in obj; }, get: function (obj) { return obj.getAttendees; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PromoterEventsController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PromoterEventsController = _classThis;
}();
exports.PromoterEventsController = PromoterEventsController;
