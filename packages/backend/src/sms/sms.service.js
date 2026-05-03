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
exports.SmsService = void 0;
var common_1 = require("@nestjs/common");
/**
 * SMS Service - Placeholder for phone verification
 * TODO: Install twilio and implement
 */
var SmsService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var SmsService = _classThis = /** @class */ (function () {
        function SmsService_1() {
            this.logger = new common_1.Logger(SmsService.name);
            this.isConfigured = false; // Set to true when Twilio credentials added
            // In-memory OTP storage for testing (use Redis in production)
            this.otpStore = new Map();
        }
        /**
         * Send SMS OTP for phone verification
         */
        SmsService_1.prototype.sendVerificationCode = function (phoneNumber, userId) {
            return __awaiter(this, void 0, void 0, function () {
                var otp;
                return __generator(this, function (_a) {
                    otp = this.generateOTP();
                    if (!this.isConfigured) {
                        this.logger.warn("SMS not configured - Mock OTP for ".concat(phoneNumber, ": ").concat(otp));
                        // Store for testing
                        this.otpStore.set(userId, {
                            code: otp,
                            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
                        });
                        return [2 /*return*/];
                    }
                    // TODO: Implement Twilio
                    // const twilio = require('twilio');
                    // const client = twilio(
                    //   process.env.TWILIO_ACCOUNT_SID,
                    //   process.env.TWILIO_AUTH_TOKEN
                    // );
                    // 
                    // await client.messages.create({
                    //   body: `Your verification code is: ${otp}`,
                    //   from: process.env.TWILIO_PHONE_NUMBER,
                    //   to: phoneNumber,
                    // });
                    // Store OTP for verification
                    this.otpStore.set(userId, {
                        code: otp,
                        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                    });
                    return [2 /*return*/];
                });
            });
        };
        /**
         * Verify OTP code
         */
        SmsService_1.prototype.verifyCode = function (userId, code) {
            return __awaiter(this, void 0, void 0, function () {
                var stored;
                return __generator(this, function (_a) {
                    stored = this.otpStore.get(userId);
                    if (!stored) {
                        this.logger.warn("No OTP found for user: ".concat(userId));
                        return [2 /*return*/, false];
                    }
                    if (new Date() > stored.expiresAt) {
                        this.otpStore.delete(userId);
                        this.logger.warn("OTP expired for user: ".concat(userId));
                        return [2 /*return*/, false];
                    }
                    if (stored.code !== code) {
                        this.logger.warn("Invalid OTP for user: ".concat(userId));
                        return [2 /*return*/, false];
                    }
                    // Valid - remove from store
                    this.otpStore.delete(userId);
                    return [2 /*return*/, true];
                });
            });
        };
        /**
         * Send SMS notification (for client communications)
         */
        SmsService_1.prototype.sendNotification = function (phoneNumber, message) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (!this.isConfigured) {
                        this.logger.warn("SMS not configured - Mock notification to ".concat(phoneNumber, ": ").concat(message));
                        return [2 /*return*/];
                    }
                    return [2 /*return*/];
                });
            });
        };
        /**
         * Get current OTP for testing (remove in production)
         */
        SmsService_1.prototype.getTestOTP = function (userId) {
            var stored = this.otpStore.get(userId);
            return (stored === null || stored === void 0 ? void 0 : stored.code) || null;
        };
        SmsService_1.prototype.generateOTP = function () {
            return Math.floor(100000 + Math.random() * 900000).toString();
        };
        return SmsService_1;
    }());
    __setFunctionName(_classThis, "SmsService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SmsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SmsService = _classThis;
}();
exports.SmsService = SmsService;
