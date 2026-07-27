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
exports.TwilioService = void 0;
var common_1 = require("@nestjs/common");
var twilio = require("twilio");
// STOP keywords per CTIA/carrier guidelines
var STOP_KEYWORDS = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
var START_KEYWORDS = ['START', 'UNSTOP', 'YES'];
// Compliance footer required by our campaign registration
var COMPLIANCE_FOOTER = ' Reply STOP to unsubscribe.';
var TwilioService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var TwilioService = _classThis = /** @class */ (function () {
        function TwilioService_1(configService) {
            this.configService = configService;
            this.logger = new common_1.Logger(TwilioService.name);
            var accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
            var authToken = this.configService.get('TWILIO_AUTH_TOKEN');
            if (accountSid && authToken) {
                this.client = twilio.default(accountSid, authToken);
            }
        }
        /**
         * Appends the mandatory "Reply STOP to unsubscribe." footer if not already present.
         * All outbound messages must include this per campaign registration.
         */
        TwilioService_1.prototype.appendComplianceFooter = function (message) {
            var normalized = message.trimEnd();
            if (normalized.toLowerCase().includes('reply stop to unsubscribe')) {
                return normalized;
            }
            return normalized + COMPLIANCE_FOOTER;
        };
        TwilioService_1.prototype.sendSMS = function (to, message) {
            return __awaiter(this, void 0, void 0, function () {
                var from, body, result, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            from = this.configService.get('TWILIO_PHONE_NUMBER');
                            if (!this.client) {
                                throw new Error('Twilio client not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
                            }
                            if (!from) {
                                throw new Error('TWILIO_PHONE_NUMBER not configured');
                            }
                            body = this.appendComplianceFooter(message);
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.client.messages.create({
                                    body: body,
                                    from: from,
                                    to: to,
                                })];
                        case 2:
                            result = _a.sent();
                            return [2 /*return*/, {
                                    sid: result.sid,
                                    status: result.status,
                                }];
                        case 3:
                            error_1 = _a.sent();
                            this.logger.error('Twilio SMS send error', error_1);
                            throw error_1;
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        TwilioService_1.prototype.getMessageStatus = function (sid) {
            return __awaiter(this, void 0, void 0, function () {
                var message, error_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this.client) {
                                throw new Error('Twilio client not configured');
                            }
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.client.messages(sid).fetch()];
                        case 2:
                            message = _a.sent();
                            return [2 /*return*/, message.status];
                        case 3:
                            error_2 = _a.sent();
                            this.logger.error('Twilio status check error', error_2);
                            throw error_2;
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Parses an inbound Twilio webhook body and determines if it is a
         * STOP (opt-out) or START (opt-in) request.
         * Returns: { action: 'stop' | 'start' | null, from: string }
         */
        TwilioService_1.prototype.parseInboundMessage = function (body, from) {
            var keyword = body.trim().toUpperCase();
            if (STOP_KEYWORDS.includes(keyword)) {
                return { action: 'stop', from: from };
            }
            if (START_KEYWORDS.includes(keyword)) {
                return { action: 'start', from: from };
            }
            return { action: null, from: from };
        };
        return TwilioService_1;
    }());
    __setFunctionName(_classThis, "TwilioService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        TwilioService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return TwilioService = _classThis;
}();
exports.TwilioService = TwilioService;
