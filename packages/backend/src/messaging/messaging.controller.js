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
exports.MessagingController = void 0;
var common_1 = require("@nestjs/common");
var MessagingController = function () {
    var _classDecorators = [(0, common_1.Controller)('messages')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _findAll_decorators;
    var _getStats_decorators;
    var _findOne_decorators;
    var _sendMessage_decorators;
    var _sendBulkMessages_decorators;
    var _refreshStatus_decorators;
    var _delete_decorators;
    var _handleInbound_decorators;
    var MessagingController = _classThis = /** @class */ (function () {
        function MessagingController_1(messagingService, supabaseService) {
            this.messagingService = (__runInitializers(this, _instanceExtraInitializers), messagingService);
            this.supabaseService = supabaseService;
            this.logger = new common_1.Logger(MessagingController.name);
        }
        MessagingController_1.prototype.getAuth = function (authHeader) {
            return __awaiter(this, void 0, void 0, function () {
                var token, supabase, _a, user, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!authHeader)
                                throw new common_1.UnauthorizedException();
                            token = authHeader.replace('Bearer ', '');
                            supabase = this.supabaseService.setAuthContext(token);
                            return [4 /*yield*/, supabase.auth.getUser()];
                        case 1:
                            _a = _b.sent(), user = _a.data.user, error = _a.error;
                            if (error || !user)
                                throw new common_1.UnauthorizedException();
                            return [2 /*return*/, { supabase: supabase, ownerId: user.id }];
                    }
                });
            });
        };
        MessagingController_1.prototype.findAll = function (authHeader, eventId) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, supabase, ownerId;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getAuth(authHeader)];
                        case 1:
                            _a = _b.sent(), supabase = _a.supabase, ownerId = _a.ownerId;
                            if (eventId) {
                                return [2 /*return*/, this.messagingService.findByEvent(supabase, ownerId, eventId)];
                            }
                            return [2 /*return*/, this.messagingService.findAll(supabase, ownerId)];
                    }
                });
            });
        };
        MessagingController_1.prototype.getStats = function (authHeader) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, supabase, ownerId;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getAuth(authHeader)];
                        case 1:
                            _a = _b.sent(), supabase = _a.supabase, ownerId = _a.ownerId;
                            return [2 /*return*/, this.messagingService.getMessageStats(supabase, ownerId)];
                    }
                });
            });
        };
        MessagingController_1.prototype.findOne = function (id, authHeader) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, supabase, ownerId;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getAuth(authHeader)];
                        case 1:
                            _a = _b.sent(), supabase = _a.supabase, ownerId = _a.ownerId;
                            return [2 /*return*/, this.messagingService.findOne(supabase, ownerId, id)];
                    }
                });
            });
        };
        MessagingController_1.prototype.sendMessage = function (authHeader, messageData) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, supabase, ownerId, err_1;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getAuth(authHeader)];
                        case 1:
                            _a = _b.sent(), supabase = _a.supabase, ownerId = _a.ownerId;
                            _b.label = 2;
                        case 2:
                            _b.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, this.messagingService.sendMessage(supabase, ownerId, messageData)];
                        case 3: return [2 /*return*/, _b.sent()];
                        case 4:
                            err_1 = _b.sent();
                            this.logger.error('sendMessage failed', err_1 === null || err_1 === void 0 ? void 0 : err_1.message, err_1 === null || err_1 === void 0 ? void 0 : err_1.stack);
                            throw new common_1.InternalServerErrorException((err_1 === null || err_1 === void 0 ? void 0 : err_1.message) || 'Failed to send message');
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        MessagingController_1.prototype.sendBulkMessages = function (authHeader, data) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, supabase, ownerId;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getAuth(authHeader)];
                        case 1:
                            _a = _b.sent(), supabase = _a.supabase, ownerId = _a.ownerId;
                            return [2 /*return*/, this.messagingService.sendBulkMessages(supabase, ownerId, data.messages)];
                    }
                });
            });
        };
        MessagingController_1.prototype.refreshStatus = function (id, authHeader) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, supabase, ownerId;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getAuth(authHeader)];
                        case 1:
                            _a = _b.sent(), supabase = _a.supabase, ownerId = _a.ownerId;
                            return [2 /*return*/, this.messagingService.updateMessageStatus(supabase, ownerId, id)];
                    }
                });
            });
        };
        MessagingController_1.prototype.delete = function (id, authHeader) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, supabase, ownerId;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getAuth(authHeader)];
                        case 1:
                            _a = _b.sent(), supabase = _a.supabase, ownerId = _a.ownerId;
                            return [2 /*return*/, this.messagingService.deleteMessage(supabase, ownerId, id)];
                    }
                });
            });
        };
        /**
         * Twilio inbound SMS webhook.
         * Twilio POSTs application/x-www-form-urlencoded; configure this URL in
         * the Twilio Console → Phone Numbers → Active Numbers → Messaging → "A message comes in".
         * Handles STOP (opt-out) and START/UNSTOP (opt-in) keywords per campaign registration.
         * Must return a 200 with an empty TwiML response so Twilio does not retry.
         */
        MessagingController_1.prototype.handleInbound = function (body) {
            return __awaiter(this, void 0, void 0, function () {
                var messageBody, from, adminSupabase;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            messageBody = (_a = body === null || body === void 0 ? void 0 : body.Body) !== null && _a !== void 0 ? _a : '';
                            from = (_b = body === null || body === void 0 ? void 0 : body.From) !== null && _b !== void 0 ? _b : '';
                            if (!from) return [3 /*break*/, 2];
                            adminSupabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.messagingService.handleInboundMessage(adminSupabase, messageBody, from)];
                        case 1:
                            _c.sent();
                            _c.label = 2;
                        case 2: 
                        // Return empty TwiML — no auto-reply (Twilio handles STOP responses natively)
                        return [2 /*return*/, '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'];
                    }
                });
            });
        };
        return MessagingController_1;
    }());
    __setFunctionName(_classThis, "MessagingController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _findAll_decorators = [(0, common_1.Get)()];
        _getStats_decorators = [(0, common_1.Get)('stats')];
        _findOne_decorators = [(0, common_1.Get)(':id')];
        _sendMessage_decorators = [(0, common_1.Post)('send')];
        _sendBulkMessages_decorators = [(0, common_1.Post)('send-bulk')];
        _refreshStatus_decorators = [(0, common_1.Post)(':id/refresh-status')];
        _delete_decorators = [(0, common_1.Delete)(':id')];
        _handleInbound_decorators = [(0, common_1.Post)('webhook/inbound'), (0, common_1.HttpCode)(200)];
        __esDecorate(_classThis, null, _findAll_decorators, { kind: "method", name: "findAll", static: false, private: false, access: { has: function (obj) { return "findAll" in obj; }, get: function (obj) { return obj.findAll; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getStats_decorators, { kind: "method", name: "getStats", static: false, private: false, access: { has: function (obj) { return "getStats" in obj; }, get: function (obj) { return obj.getStats; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findOne_decorators, { kind: "method", name: "findOne", static: false, private: false, access: { has: function (obj) { return "findOne" in obj; }, get: function (obj) { return obj.findOne; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _sendMessage_decorators, { kind: "method", name: "sendMessage", static: false, private: false, access: { has: function (obj) { return "sendMessage" in obj; }, get: function (obj) { return obj.sendMessage; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _sendBulkMessages_decorators, { kind: "method", name: "sendBulkMessages", static: false, private: false, access: { has: function (obj) { return "sendBulkMessages" in obj; }, get: function (obj) { return obj.sendBulkMessages; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _refreshStatus_decorators, { kind: "method", name: "refreshStatus", static: false, private: false, access: { has: function (obj) { return "refreshStatus" in obj; }, get: function (obj) { return obj.refreshStatus; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _delete_decorators, { kind: "method", name: "delete", static: false, private: false, access: { has: function (obj) { return "delete" in obj; }, get: function (obj) { return obj.delete; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _handleInbound_decorators, { kind: "method", name: "handleInbound", static: false, private: false, access: { has: function (obj) { return "handleInbound" in obj; }, get: function (obj) { return obj.handleInbound; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        MessagingController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return MessagingController = _classThis;
}();
exports.MessagingController = MessagingController;
