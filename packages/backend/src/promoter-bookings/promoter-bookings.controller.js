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
exports.PromoterBookingsController = void 0;
var common_1 = require("@nestjs/common");
var PromoterBookingsController = function () {
    var _classDecorators = [(0, common_1.Controller)('promoter-bookings')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _createBooking_decorators;
    var _listBookings_decorators;
    var _getBooking_decorators;
    var _updateBooking_decorators;
    var _deleteBooking_decorators;
    var PromoterBookingsController = _classThis = /** @class */ (function () {
        function PromoterBookingsController_1(promoterBookingsService, supabaseService) {
            this.promoterBookingsService = (__runInitializers(this, _instanceExtraInitializers), promoterBookingsService);
            this.supabaseService = supabaseService;
            this.logger = new common_1.Logger(PromoterBookingsController.name);
        }
        PromoterBookingsController_1.prototype.getUserId = function (authorization) {
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
        PromoterBookingsController_1.prototype.createBooking = function (auth, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.promoterBookingsService.createBooking(userId, dto)];
                    }
                });
            });
        };
        PromoterBookingsController_1.prototype.listBookings = function (auth) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.promoterBookingsService.listBookings(userId)];
                    }
                });
            });
        };
        PromoterBookingsController_1.prototype.getBooking = function (auth, id) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.promoterBookingsService.getBooking(userId, id)];
                    }
                });
            });
        };
        PromoterBookingsController_1.prototype.updateBooking = function (auth, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.promoterBookingsService.updateBooking(userId, id, dto)];
                    }
                });
            });
        };
        PromoterBookingsController_1.prototype.deleteBooking = function (auth, id) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.promoterBookingsService.deleteBooking(userId, id)];
                    }
                });
            });
        };
        return PromoterBookingsController_1;
    }());
    __setFunctionName(_classThis, "PromoterBookingsController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _createBooking_decorators = [(0, common_1.Post)()];
        _listBookings_decorators = [(0, common_1.Get)('mine')];
        _getBooking_decorators = [(0, common_1.Get)(':id')];
        _updateBooking_decorators = [(0, common_1.Put)(':id')];
        _deleteBooking_decorators = [(0, common_1.Delete)(':id')];
        __esDecorate(_classThis, null, _createBooking_decorators, { kind: "method", name: "createBooking", static: false, private: false, access: { has: function (obj) { return "createBooking" in obj; }, get: function (obj) { return obj.createBooking; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listBookings_decorators, { kind: "method", name: "listBookings", static: false, private: false, access: { has: function (obj) { return "listBookings" in obj; }, get: function (obj) { return obj.listBookings; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getBooking_decorators, { kind: "method", name: "getBooking", static: false, private: false, access: { has: function (obj) { return "getBooking" in obj; }, get: function (obj) { return obj.getBooking; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateBooking_decorators, { kind: "method", name: "updateBooking", static: false, private: false, access: { has: function (obj) { return "updateBooking" in obj; }, get: function (obj) { return obj.updateBooking; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteBooking_decorators, { kind: "method", name: "deleteBooking", static: false, private: false, access: { has: function (obj) { return "deleteBooking" in obj; }, get: function (obj) { return obj.deleteBooking; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PromoterBookingsController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PromoterBookingsController = _classThis;
}();
exports.PromoterBookingsController = PromoterBookingsController;
