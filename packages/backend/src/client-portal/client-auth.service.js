"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
exports.ClientAuthService = void 0;
var common_1 = require("@nestjs/common");
var crypto_1 = require("crypto");
var ClientAuthService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var ClientAuthService = _classThis = /** @class */ (function () {
        function ClientAuthService_1(supabaseService, twilioService) {
            this.supabaseService = supabaseService;
            this.twilioService = twilioService;
            this.logger = new common_1.Logger(ClientAuthService.name);
            // In-memory OTP store (short-lived, in-memory is fine)
            this.otpStore = new Map();
            // Session secret — self-validating HMAC tokens survive backend restarts
            this.sessionSecret = process.env.CLIENT_SESSION_SECRET ||
                (0, crypto_1.createHash)('sha256').update('dovenue-client-sessions-devkey').digest('hex');
        }
        /**
         * Request an OTP for the given phone number.
         * Matches against: users table, intake_forms, or booking contact_phone.
         */
        ClientAuthService_1.prototype.requestOtp = function (phone, agreedToSms, agreedToTerms, name) {
            return __awaiter(this, void 0, void 0, function () {
                var normalized, phoneVariants, supabase, clientFound, userResults, intakeResults, allIntakeForms, vendorRequestResults, allVendorRequests, otp, isDev;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!agreedToSms || !agreedToTerms) {
                                throw new common_1.BadRequestException('You must agree to SMS communications and our Terms of Service / Privacy Policy.');
                            }
                            normalized = this.normalizePhone(phone);
                            phoneVariants = this.buildPhoneVariants(normalized);
                            try {
                                supabase = this.supabaseService.getAdminClient();
                            }
                            catch (_b) {
                                supabase = this.supabaseService.getClient();
                            }
                            clientFound = false;
                            return [4 /*yield*/, Promise.all(phoneVariants.map(function (p) {
                                    return supabase
                                        .from('users')
                                        .select('id')
                                        .eq('phone_number', p)
                                        .limit(1);
                                }))];
                        case 1:
                            userResults = _a.sent();
                            if (userResults.some(function (r) { var _a; return ((_a = r.data) === null || _a === void 0 ? void 0 : _a.length) > 0; })) {
                                clientFound = true;
                            }
                            if (!!clientFound) return [3 /*break*/, 3];
                            return [4 /*yield*/, Promise.all(phoneVariants.map(function (p) {
                                    return supabase
                                        .from('intake_forms')
                                        .select('id, contact_name, contact_phone')
                                        .eq('contact_phone', p)
                                        .limit(10);
                                }))];
                        case 2:
                            intakeResults = _a.sent();
                            allIntakeForms = intakeResults.flatMap(function (r) { return r.data || []; });
                            if (allIntakeForms.length > 0) {
                                clientFound = name ? this.nameMatches(name, allIntakeForms.map(function (f) { return f.contact_name; })) : true;
                            }
                            _a.label = 3;
                        case 3:
                            if (!!clientFound) return [3 /*break*/, 5];
                            return [4 /*yield*/, Promise.all(phoneVariants.map(function (p) {
                                    return supabase
                                        .from('vendor_booking_requests')
                                        .select('id, client_name, client_phone')
                                        .eq('client_phone', p)
                                        .limit(10);
                                }))];
                        case 4:
                            vendorRequestResults = _a.sent();
                            allVendorRequests = vendorRequestResults.flatMap(function (r) { return r.data || []; });
                            if (allVendorRequests.length > 0) {
                                clientFound = name ? this.nameMatches(name, allVendorRequests.map(function (r) { return r.client_name; })) : true;
                            }
                            _a.label = 5;
                        case 5:
                            if (!clientFound) {
                                this.logger.warn("OTP requested for unrecognized phone: ".concat(normalized));
                                return [2 /*return*/, { message: 'If this number is on file, you will receive a verification code shortly.' }];
                            }
                            otp = this.generateOtp();
                            this.otpStore.set(normalized, {
                                code: otp,
                                phone: normalized,
                                expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
                                agreedToSms: agreedToSms,
                                agreedToTerms: agreedToTerms,
                                name: name,
                            });
                            this.logger.log("OTP generated for ".concat(normalized));
                            isDev = process.env.NODE_ENV !== 'production';
                            if (isDev) {
                                this.logger.warn("[DEV] OTP for ".concat(normalized, ": ").concat(otp));
                                return [2 /*return*/, {
                                        message: 'Verification code sent.',
                                        devOtp: otp,
                                    }];
                            }
                            return [4 /*yield*/, this.twilioService.sendSMS(normalized, "Your DoVenue Suites verification code is: ".concat(otp, ". Valid for 10 minutes."))];
                        case 6:
                            _a.sent();
                            return [2 /*return*/, { message: 'Verification code sent.' }];
                    }
                });
            });
        };
        /**
         * Verify an OTP and return a session token.
         * Handles clients found in users table, intake_forms, or booking.contact_phone.
         */
        ClientAuthService_1.prototype.verifyOtp = function (phone, code, name) {
            return __awaiter(this, void 0, void 0, function () {
                var normalized, record, supabase, phoneVariants, clientId, firstName, lastName, _i, phoneVariants_1, variant, u, enteredName, parts, intakeResults, intakeName, parts, vendorRequestResults, vendorRequestName, parts, sessionData, payload, sig, token, _a, expiresAt, clientInfo;
                var _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            normalized = this.normalizePhone(phone);
                            record = this.otpStore.get(normalized);
                            if (!record) {
                                throw new common_1.UnauthorizedException('No verification code was requested for this number.');
                            }
                            if (new Date() > record.expiresAt) {
                                this.otpStore.delete(normalized);
                                throw new common_1.UnauthorizedException('Verification code has expired. Please request a new one.');
                            }
                            if (record.code !== code.trim()) {
                                throw new common_1.UnauthorizedException('Incorrect verification code.');
                            }
                            // Valid – consume OTP
                            this.otpStore.delete(normalized);
                            try {
                                supabase = this.supabaseService.getAdminClient();
                            }
                            catch (_e) {
                                supabase = this.supabaseService.getClient();
                            }
                            phoneVariants = this.buildPhoneVariants(normalized);
                            clientId = null;
                            firstName = '';
                            lastName = '';
                            _i = 0, phoneVariants_1 = phoneVariants;
                            _d.label = 1;
                        case 1:
                            if (!(_i < phoneVariants_1.length)) return [3 /*break*/, 4];
                            variant = phoneVariants_1[_i];
                            return [4 /*yield*/, supabase
                                    .from('users')
                                    .select('id, first_name, last_name')
                                    .eq('phone_number', variant)
                                    .maybeSingle()];
                        case 2:
                            u = (_d.sent()).data;
                            if (u) {
                                clientId = u.id;
                                firstName = u.first_name || '';
                                lastName = u.last_name || '';
                                return [3 /*break*/, 4];
                            }
                            _d.label = 3;
                        case 3:
                            _i++;
                            return [3 /*break*/, 1];
                        case 4:
                            if (!!clientId) return [3 /*break*/, 10];
                            enteredName = (record.name || name || '').trim();
                            if (!enteredName) return [3 /*break*/, 5];
                            parts = enteredName.split(/\s+/);
                            firstName = parts[0] || '';
                            lastName = parts.slice(1).join(' ') || '';
                            return [3 /*break*/, 9];
                        case 5: return [4 /*yield*/, Promise.all(phoneVariants.map(function (p) {
                                return supabase.from('intake_forms').select('contact_name').eq('contact_phone', p).limit(1);
                            }))];
                        case 6:
                            intakeResults = _d.sent();
                            intakeName = ((_b = intakeResults.flatMap(function (r) { return r.data || []; })[0]) === null || _b === void 0 ? void 0 : _b.contact_name) || '';
                            if (!intakeName) return [3 /*break*/, 7];
                            parts = intakeName.split(/\s+/);
                            firstName = parts[0] || '';
                            lastName = parts.slice(1).join(' ') || '';
                            return [3 /*break*/, 9];
                        case 7: return [4 /*yield*/, Promise.all(phoneVariants.map(function (p) {
                                return supabase.from('vendor_booking_requests').select('client_name').eq('client_phone', p).limit(1);
                            }))];
                        case 8:
                            vendorRequestResults = _d.sent();
                            vendorRequestName = ((_c = vendorRequestResults.flatMap(function (r) { return r.data || []; })[0]) === null || _c === void 0 ? void 0 : _c.client_name) || '';
                            parts = vendorRequestName.split(/\s+/);
                            firstName = parts[0] || '';
                            lastName = parts.slice(1).join(' ') || '';
                            _d.label = 9;
                        case 9:
                            // Generate a stable, UUID-format client ID derived from the phone number
                            clientId = this.generatePhoneClientId(normalized);
                            _d.label = 10;
                        case 10:
                            sessionData = {
                                clientId: clientId,
                                phone: normalized,
                                firstName: firstName,
                                lastName: lastName,
                                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
                            };
                            payload = Buffer.from(JSON.stringify(sessionData)).toString('base64url');
                            sig = (0, crypto_1.createHmac)('sha256', this.sessionSecret).update(payload).digest('base64url');
                            token = "".concat(payload, ".").concat(sig);
                            this.logger.log("Client session created for ".concat(normalized));
                            _a = sessionData, expiresAt = _a.expiresAt, clientInfo = __rest(_a, ["expiresAt"]);
                            return [2 /*return*/, { token: token, client: __assign({}, clientInfo) }];
                    }
                });
            });
        };
        /**
         * Validate a session token and return the client session.
         */
        ClientAuthService_1.prototype.validateSession = function (token) {
            var dotIndex = token.lastIndexOf('.');
            if (dotIndex === -1)
                throw new common_1.UnauthorizedException('Invalid session token.');
            var payload = token.substring(0, dotIndex);
            var sig = token.substring(dotIndex + 1);
            var expectedSig = (0, crypto_1.createHmac)('sha256', this.sessionSecret).update(payload).digest('base64url');
            if (sig !== expectedSig)
                throw new common_1.UnauthorizedException('Invalid session token.');
            var session;
            try {
                session = JSON.parse(Buffer.from(payload, 'base64url').toString());
            }
            catch (_a) {
                throw new common_1.UnauthorizedException('Invalid session token.');
            }
            if (new Date() > new Date(session.expiresAt)) {
                throw new common_1.UnauthorizedException('Session expired. Please log in again.');
            }
            return session;
        };
        /**
         * Logout is handled client-side by clearing localStorage.
         * HMAC tokens cannot be individually revoked without a denylist.
         */
        ClientAuthService_1.prototype.revokeSession = function (_token) {
            // No-op: token expiry is enforced via the embedded expiresAt claim
        };
        // ─────────────────────────────────────────────────────────────────────────────
        ClientAuthService_1.prototype.generateOtp = function () {
            return Math.floor(100000 + Math.random() * 900000).toString();
        };
        ClientAuthService_1.prototype.normalizePhone = function (phone) {
            // Strip all non-digit characters, then ensure E.164 format
            var digits = phone.replace(/\D/g, '');
            if (digits.length === 10)
                return "+1".concat(digits);
            if (digits.length === 11 && digits.startsWith('1'))
                return "+".concat(digits);
            return "+".concat(digits);
        };
        ClientAuthService_1.prototype.buildPhoneVariants = function (phone) {
            var digits = phone.replace(/\D/g, '');
            var last10 = digits.slice(-10);
            return __spreadArray([], new Set([phone, last10, "1".concat(last10), "+1".concat(last10)]), true).filter(Boolean);
        };
        /**
         * Fuzzy name match: returns true if the login-entered name roughly matches
         * any candidate name (first-name match, full-name substring, etc.).
         */
        ClientAuthService_1.prototype.nameMatches = function (input, candidates) {
            var inputLower = input.toLowerCase().trim();
            var inputFirst = inputLower.split(/\s+/)[0];
            return candidates.some(function (candidate) {
                var c = (candidate || '').toLowerCase().trim();
                var cFirst = c.split(/\s+/)[0];
                return (c === inputLower ||
                    c.includes(inputLower) ||
                    inputLower.includes(c) ||
                    cFirst === inputFirst);
            });
        };
        /**
         * Generate a stable, UUID-format ID derived from a phone number.
         * Used for intake-form-only clients who have no auth.users entry.
         * Queries against booking.user_id won't match (intentional); phone-based queries handle lookup.
         */
        ClientAuthService_1.prototype.generatePhoneClientId = function (phone) {
            var hash = (0, crypto_1.createHash)('sha256').update("dovenue:client:".concat(phone)).digest('hex');
            return "".concat(hash.slice(0, 8), "-").concat(hash.slice(8, 12), "-4").concat(hash.slice(13, 16), "-b").concat(hash.slice(17, 20), "-").concat(hash.slice(20, 32));
        };
        return ClientAuthService_1;
    }());
    __setFunctionName(_classThis, "ClientAuthService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ClientAuthService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ClientAuthService = _classThis;
}();
exports.ClientAuthService = ClientAuthService;
