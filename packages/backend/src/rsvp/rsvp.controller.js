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
exports.RsvpController = void 0;
var common_1 = require("@nestjs/common");
var RsvpController = function () {
    var _classDecorators = [(0, common_1.Controller)('rsvp')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _getEvents_decorators;
    var _getGuests_decorators;
    var _addGuest_decorators;
    var _bulkAddGuests_decorators;
    var _updateGuest_decorators;
    var _deleteGuest_decorators;
    var _sendInvite_decorators;
    var _sendAllInvites_decorators;
    var _getImages_decorators;
    var _setImages_decorators;
    var _getPublicInvite_decorators;
    var _respond_decorators;
    var RsvpController = _classThis = /** @class */ (function () {
        function RsvpController_1(rsvpService, clientAuthService) {
            this.rsvpService = (__runInitializers(this, _instanceExtraInitializers), rsvpService);
            this.clientAuthService = clientAuthService;
        }
        RsvpController_1.prototype.requireSession = function (token) {
            if (!token)
                throw new common_1.UnauthorizedException('Client token required');
            return this.clientAuthService.validateSession(token);
        };
        // ── Authenticated (client portal) ─────────────────────────────────────────
        /** List RSVP-able events for the logged-in client. */
        RsvpController_1.prototype.getEvents = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    return [2 /*return*/, this.rsvpService.getEventsForClient(session.phone)];
                });
            });
        };
        /** List all guests for a given intake form / event. */
        RsvpController_1.prototype.getGuests = function (token, intakeFormId) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    return [2 /*return*/, this.rsvpService.getGuests(intakeFormId, session.phone)];
                });
            });
        };
        /** Add a single guest. */
        RsvpController_1.prototype.addGuest = function (token, intakeFormId, body) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    if (!(body === null || body === void 0 ? void 0 : body.guest_name))
                        throw new common_1.BadRequestException('guest_name is required');
                    session = this.requireSession(token);
                    return [2 /*return*/, this.rsvpService.addGuest(intakeFormId, session.phone, body)];
                });
            });
        };
        /** Bulk add guests. */
        RsvpController_1.prototype.bulkAddGuests = function (token, intakeFormId, body) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    if (!Array.isArray(body === null || body === void 0 ? void 0 : body.guests))
                        throw new common_1.BadRequestException('guests array is required');
                    return [2 /*return*/, this.rsvpService.bulkAddGuests(intakeFormId, session.phone, body.guests)];
                });
            });
        };
        /** Update a guest (table assignment, phone, etc.). */
        RsvpController_1.prototype.updateGuest = function (token, intakeFormId, guestId, body) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    return [2 /*return*/, this.rsvpService.updateGuest(guestId, intakeFormId, session.phone, body)];
                });
            });
        };
        /** Delete a guest. */
        RsvpController_1.prototype.deleteGuest = function (token, intakeFormId, guestId) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            session = this.requireSession(token);
                            return [4 /*yield*/, this.rsvpService.deleteGuest(guestId, intakeFormId, session.phone)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { success: true }];
                    }
                });
            });
        };
        /** Send RSVP invite to a single guest. */
        RsvpController_1.prototype.sendInvite = function (token, intakeFormId, guestId) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    return [2 /*return*/, this.rsvpService.sendInvite(guestId, intakeFormId, session.phone)];
                });
            });
        };
        /** Send RSVP invites to all guests not yet sent. */
        RsvpController_1.prototype.sendAllInvites = function (token, intakeFormId) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    return [2 /*return*/, this.rsvpService.sendAllInvites(intakeFormId, session.phone)];
                });
            });
        };
        // ── Public (token-gated, no auth required) ────────────────────────────────
        /** Get invitation images for an event. */
        RsvpController_1.prototype.getImages = function (token, intakeFormId) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    return [2 /*return*/, this.rsvpService.getInvitationImages(intakeFormId, session.phone)];
                });
            });
        };
        /** Set invitation images for an event (max 2). */
        RsvpController_1.prototype.setImages = function (token, intakeFormId, body) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    if (!Array.isArray(body === null || body === void 0 ? void 0 : body.images))
                        throw new common_1.BadRequestException('images array is required');
                    session = this.requireSession(token);
                    return [2 /*return*/, this.rsvpService.setInvitationImages(intakeFormId, session.phone, body.images)];
                });
            });
        };
        /** Get public invite info (guest name, event, table). */
        RsvpController_1.prototype.getPublicInvite = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.rsvpService.getPublicInvite(token)];
                });
            });
        };
        /** Submit RSVP response (with optional phone verification). */
        RsvpController_1.prototype.respond = function (token, body) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (!(body === null || body === void 0 ? void 0 : body.status))
                        throw new common_1.BadRequestException('status is required');
                    return [2 /*return*/, this.rsvpService.respondToInvite(token, body.phone_last_four, {
                            status: body.status,
                            plus_ones: body.plus_ones,
                            meal_preference: body.meal_preference,
                            sms_opt_in: body.sms_opt_in,
                        })];
                });
            });
        };
        return RsvpController_1;
    }());
    __setFunctionName(_classThis, "RsvpController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getEvents_decorators = [(0, common_1.Get)('events')];
        _getGuests_decorators = [(0, common_1.Get)('guests/:intakeFormId')];
        _addGuest_decorators = [(0, common_1.Post)('guests/:intakeFormId')];
        _bulkAddGuests_decorators = [(0, common_1.Post)('guests/:intakeFormId/bulk')];
        _updateGuest_decorators = [(0, common_1.Put)('guests/:intakeFormId/:guestId')];
        _deleteGuest_decorators = [(0, common_1.Delete)('guests/:intakeFormId/:guestId')];
        _sendInvite_decorators = [(0, common_1.Post)('guests/:intakeFormId/:guestId/send')];
        _sendAllInvites_decorators = [(0, common_1.Post)('send-all/:intakeFormId')];
        _getImages_decorators = [(0, common_1.Get)('images/:intakeFormId')];
        _setImages_decorators = [(0, common_1.Put)('images/:intakeFormId')];
        _getPublicInvite_decorators = [(0, common_1.Get)(':token')];
        _respond_decorators = [(0, common_1.Post)(':token/respond')];
        __esDecorate(_classThis, null, _getEvents_decorators, { kind: "method", name: "getEvents", static: false, private: false, access: { has: function (obj) { return "getEvents" in obj; }, get: function (obj) { return obj.getEvents; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getGuests_decorators, { kind: "method", name: "getGuests", static: false, private: false, access: { has: function (obj) { return "getGuests" in obj; }, get: function (obj) { return obj.getGuests; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _addGuest_decorators, { kind: "method", name: "addGuest", static: false, private: false, access: { has: function (obj) { return "addGuest" in obj; }, get: function (obj) { return obj.addGuest; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _bulkAddGuests_decorators, { kind: "method", name: "bulkAddGuests", static: false, private: false, access: { has: function (obj) { return "bulkAddGuests" in obj; }, get: function (obj) { return obj.bulkAddGuests; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateGuest_decorators, { kind: "method", name: "updateGuest", static: false, private: false, access: { has: function (obj) { return "updateGuest" in obj; }, get: function (obj) { return obj.updateGuest; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteGuest_decorators, { kind: "method", name: "deleteGuest", static: false, private: false, access: { has: function (obj) { return "deleteGuest" in obj; }, get: function (obj) { return obj.deleteGuest; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _sendInvite_decorators, { kind: "method", name: "sendInvite", static: false, private: false, access: { has: function (obj) { return "sendInvite" in obj; }, get: function (obj) { return obj.sendInvite; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _sendAllInvites_decorators, { kind: "method", name: "sendAllInvites", static: false, private: false, access: { has: function (obj) { return "sendAllInvites" in obj; }, get: function (obj) { return obj.sendAllInvites; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getImages_decorators, { kind: "method", name: "getImages", static: false, private: false, access: { has: function (obj) { return "getImages" in obj; }, get: function (obj) { return obj.getImages; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _setImages_decorators, { kind: "method", name: "setImages", static: false, private: false, access: { has: function (obj) { return "setImages" in obj; }, get: function (obj) { return obj.setImages; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getPublicInvite_decorators, { kind: "method", name: "getPublicInvite", static: false, private: false, access: { has: function (obj) { return "getPublicInvite" in obj; }, get: function (obj) { return obj.getPublicInvite; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _respond_decorators, { kind: "method", name: "respond", static: false, private: false, access: { has: function (obj) { return "respond" in obj; }, get: function (obj) { return obj.respond; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        RsvpController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return RsvpController = _classThis;
}();
exports.RsvpController = RsvpController;
