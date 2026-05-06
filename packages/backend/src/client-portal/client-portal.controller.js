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
exports.ClientPortalController = void 0;
var common_1 = require("@nestjs/common");
var ClientPortalController = function () {
    var _classDecorators = [(0, common_1.Controller)('client-portal')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _requestOtp_decorators;
    var _verifyOtp_decorators;
    var _logout_decorators;
    var _getOverview_decorators;
    var _getBookings_decorators;
    var _getEvents_decorators;
    var _browseVendors_decorators;
    var _bookVendor_decorators;
    var _getVendors_decorators;
    var _getPendingConfirmations_decorators;
    var _respondToConfirmation_decorators;
    var _getContracts_decorators;
    var _getContractById_decorators;
    var _signContract_decorators;
    var _getEstimates_decorators;
    var _getEstimateById_decorators;
    var _markEstimateViewed_decorators;
    var _respondToEstimate_decorators;
    var _markContractViewed_decorators;
    var _getInvoices_decorators;
    var _createInvoiceCheckout_decorators;
    var _getItems_decorators;
    var _getMessages_decorators;
    var _sendMessage_decorators;
    var _getNotifications_decorators;
    var _markRead_decorators;
    var _getInvite_decorators;
    var _confirmInvite_decorators;
    var _declineInvite_decorators;
    var _leaveVendorReview_decorators;
    var ClientPortalController = _classThis = /** @class */ (function () {
        function ClientPortalController_1(clientAuthService, clientPortalService) {
            this.clientAuthService = (__runInitializers(this, _instanceExtraInitializers), clientAuthService);
            this.clientPortalService = clientPortalService;
            this.logger = new common_1.Logger(ClientPortalController.name);
        }
        // ── Authentication ────────────────────────────────────────────────────────
        ClientPortalController_1.prototype.requestOtp = function (body) {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    if (!(body === null || body === void 0 ? void 0 : body.phone))
                        throw new common_1.BadRequestException('phone is required');
                    return [2 /*return*/, this.clientAuthService.requestOtp(body.phone, !!body.agreedToSms, !!body.agreedToTerms, ((_a = body.name) === null || _a === void 0 ? void 0 : _a.trim()) || undefined)];
                });
            });
        };
        ClientPortalController_1.prototype.verifyOtp = function (body) {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    if (!(body === null || body === void 0 ? void 0 : body.phone) || !(body === null || body === void 0 ? void 0 : body.code)) {
                        throw new common_1.BadRequestException('phone and code are required');
                    }
                    return [2 /*return*/, this.clientAuthService.verifyOtp(body.phone, body.code, ((_a = body.name) === null || _a === void 0 ? void 0 : _a.trim()) || undefined)];
                });
            });
        };
        ClientPortalController_1.prototype.logout = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (!token)
                        throw new common_1.UnauthorizedException();
                    this.clientAuthService.revokeSession(token);
                    return [2 /*return*/, { message: 'Logged out successfully' }];
                });
            });
        };
        // ── Guard helper ──────────────────────────────────────────────────────────
        ClientPortalController_1.prototype.requireSession = function (token) {
            if (!token)
                throw new common_1.UnauthorizedException('Client token required');
            return this.clientAuthService.validateSession(token);
        };
        // ── Dashboard ─────────────────────────────────────────────────────────────
        ClientPortalController_1.prototype.getOverview = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    return [2 /*return*/, this.clientPortalService.getOverview(session.clientId, session.phone)];
                });
            });
        };
        // ── Bookings ──────────────────────────────────────────────────────────────
        ClientPortalController_1.prototype.getBookings = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    return [2 /*return*/, this.clientPortalService.getBookings(session.clientId, session.phone)];
                });
            });
        };
        // ── Events ────────────────────────────────────────────────────────────────
        ClientPortalController_1.prototype.getEvents = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    return [2 /*return*/, this.clientPortalService.getEvents(session.clientId, session.phone)];
                });
            });
        };
        // ── Vendors ───────────────────────────────────────────────────────────────
        ClientPortalController_1.prototype.browseVendors = function (token, category) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    this.requireSession(token);
                    return [2 /*return*/, this.clientPortalService.browseVendors(category || undefined)];
                });
            });
        };
        ClientPortalController_1.prototype.bookVendor = function (token, body) {
            return __awaiter(this, void 0, void 0, function () {
                var session, clientName;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    if (!(body === null || body === void 0 ? void 0 : body.vendorAccountId) || !(body === null || body === void 0 ? void 0 : body.eventName) || !(body === null || body === void 0 ? void 0 : body.eventDate)) {
                        throw new common_1.BadRequestException('vendorAccountId, eventName, and eventDate are required');
                    }
                    clientName = [session.firstName, session.lastName].filter(Boolean).join(' ') || session.phone;
                    return [2 /*return*/, this.clientPortalService.bookVendor(session.clientId, session.phone, clientName, body)];
                });
            });
        };
        ClientPortalController_1.prototype.getVendors = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    return [2 /*return*/, this.clientPortalService.getVendors(session.clientId, session.phone)];
                });
            });
        };
        // ── Booking Confirmations ─────────────────────────────────────────────────
        ClientPortalController_1.prototype.getPendingConfirmations = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    return [2 /*return*/, this.clientPortalService.getPendingConfirmations(session.clientId, session.phone)];
                });
            });
        };
        ClientPortalController_1.prototype.respondToConfirmation = function (token, bookingId, body) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    if (body.action !== 'confirmed' && body.action !== 'rejected') {
                        throw new common_1.BadRequestException('action must be "confirmed" or "rejected"');
                    }
                    return [2 /*return*/, this.clientPortalService.respondToConfirmation(session.phone, bookingId, body.action)];
                });
            });
        };
        // ── Contracts ─────────────────────────────────────────────────────────────
        ClientPortalController_1.prototype.getContracts = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    return [2 /*return*/, this.clientPortalService.getContracts(session.clientId, session.phone)];
                });
            });
        };
        ClientPortalController_1.prototype.getContractById = function (token, id) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    return [2 /*return*/, this.clientPortalService.getContractById(id, session.clientId, session.phone)];
                });
            });
        };
        ClientPortalController_1.prototype.signContract = function (token, id, body) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    if (!(body === null || body === void 0 ? void 0 : body.signatureData) || !(body === null || body === void 0 ? void 0 : body.signerName)) {
                        throw new common_1.BadRequestException('signatureData and signerName are required');
                    }
                    return [2 /*return*/, this.clientPortalService.signClientContract(id, session.clientId, session.phone, body.signatureData, body.signerName)];
                });
            });
        };
        ClientPortalController_1.prototype.getEstimates = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    return [2 /*return*/, this.clientPortalService.getEstimates(session.clientId, session.phone)];
                });
            });
        };
        ClientPortalController_1.prototype.getEstimateById = function (token, id) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    return [2 /*return*/, this.clientPortalService.getEstimateById(id, session.clientId, session.phone)];
                });
            });
        };
        ClientPortalController_1.prototype.markEstimateViewed = function (token, id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    this.requireSession(token);
                    return [2 /*return*/, this.clientPortalService.markViewed('estimates', id)];
                });
            });
        };
        ClientPortalController_1.prototype.respondToEstimate = function (token, id, body) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    if (body.action !== 'approved' && body.action !== 'rejected') {
                        throw new common_1.BadRequestException('action must be "approved" or "rejected"');
                    }
                    return [2 /*return*/, this.clientPortalService.respondToEstimate(id, session.clientId, session.phone, body.action)];
                });
            });
        };
        ClientPortalController_1.prototype.markContractViewed = function (token, id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    this.requireSession(token);
                    return [2 /*return*/, this.clientPortalService.markViewed('contracts', id)];
                });
            });
        };
        // ── Invoices ──────────────────────────────────────────────────────────────
        ClientPortalController_1.prototype.getInvoices = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    return [2 /*return*/, this.clientPortalService.getInvoices(session.clientId, session.phone)];
                });
            });
        };
        ClientPortalController_1.prototype.createInvoiceCheckout = function (token, id) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    return [2 /*return*/, this.clientPortalService.createInvoiceCheckout(id, session.clientId, session.phone, "".concat(session.firstName, " ").concat(session.lastName).trim() || 'Client')];
                });
            });
        };
        // ── Items & Packages ──────────────────────────────────────────────────────
        ClientPortalController_1.prototype.getItems = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    return [2 /*return*/, this.clientPortalService.getItems(session.clientId, session.phone)];
                });
            });
        };
        // ── Messages ──────────────────────────────────────────────────────────────
        ClientPortalController_1.prototype.getMessages = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    return [2 /*return*/, this.clientPortalService.getMessages(session.clientId)];
                });
            });
        };
        ClientPortalController_1.prototype.sendMessage = function (token, body) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    if (!(body === null || body === void 0 ? void 0 : body.recipientId) || !(body === null || body === void 0 ? void 0 : body.content)) {
                        throw new common_1.BadRequestException('recipientId and content are required');
                    }
                    return [2 /*return*/, this.clientPortalService.sendMessage(session.clientId, session.phone, body.recipientId, body.content, body.eventId)];
                });
            });
        };
        // ── Notifications ─────────────────────────────────────────────────────────
        ClientPortalController_1.prototype.getNotifications = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    return [2 /*return*/, this.clientPortalService.getNotifications(session.clientId, session.phone)];
                });
            });
        };
        ClientPortalController_1.prototype.markRead = function (token, id) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    return [2 /*return*/, this.clientPortalService.markNotificationRead(session.clientId, id)];
                });
            });
        };
        // ── Invite-based Confirmation Flow ────────────────────────────────────────
        /**
         * Public endpoint: returns intake form event details for the invite landing page.
         * No session required — the token itself grants access to the display data.
         */
        ClientPortalController_1.prototype.getInvite = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (!token)
                        throw new common_1.BadRequestException('invite token is required');
                    return [2 /*return*/, this.clientPortalService.getIntakeFormByToken(token)];
                });
            });
        };
        /**
         * Confirm the invite — client must be authenticated via SMS OTP.
         * Their session phone must match the intake form's contact_phone.
         */
        ClientPortalController_1.prototype.confirmInvite = function (clientToken, inviteToken) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(clientToken);
                    return [2 /*return*/, this.clientPortalService.confirmInvite(inviteToken, session.phone, session.clientId)];
                });
            });
        };
        /**
         * Decline the invite — client must be authenticated.
         */
        ClientPortalController_1.prototype.declineInvite = function (clientToken, inviteToken) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    session = this.requireSession(clientToken);
                    return [2 /*return*/, this.clientPortalService.declineInvite(inviteToken, session.phone)];
                });
            });
        };
        // ── Vendor Reviews ───────────────────────────────────────────────────────
        ClientPortalController_1.prototype.leaveVendorReview = function (token, body) {
            return __awaiter(this, void 0, void 0, function () {
                var session, reviewerName;
                return __generator(this, function (_a) {
                    session = this.requireSession(token);
                    if (!(body === null || body === void 0 ? void 0 : body.vendorAccountId) || !(body === null || body === void 0 ? void 0 : body.rating)) {
                        throw new common_1.BadRequestException('vendorAccountId and rating are required');
                    }
                    reviewerName = [session.firstName, session.lastName].filter(Boolean).join(' ') || 'Client';
                    return [2 /*return*/, this.clientPortalService.leaveVendorReview(session.clientId, reviewerName, body.vendorAccountId, body.rating, body.reviewText)];
                });
            });
        };
        return ClientPortalController_1;
    }());
    __setFunctionName(_classThis, "ClientPortalController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _requestOtp_decorators = [(0, common_1.Post)('auth/request-otp')];
        _verifyOtp_decorators = [(0, common_1.Post)('auth/verify-otp')];
        _logout_decorators = [(0, common_1.Post)('auth/logout')];
        _getOverview_decorators = [(0, common_1.Get)('overview')];
        _getBookings_decorators = [(0, common_1.Get)('bookings')];
        _getEvents_decorators = [(0, common_1.Get)('events')];
        _browseVendors_decorators = [(0, common_1.Get)('vendors/browse')];
        _bookVendor_decorators = [(0, common_1.Post)('vendors/book')];
        _getVendors_decorators = [(0, common_1.Get)('vendors')];
        _getPendingConfirmations_decorators = [(0, common_1.Get)('confirmations')];
        _respondToConfirmation_decorators = [(0, common_1.Post)('confirmations/:bookingId')];
        _getContracts_decorators = [(0, common_1.Get)('contracts')];
        _getContractById_decorators = [(0, common_1.Get)('contracts/:id')];
        _signContract_decorators = [(0, common_1.Post)('contracts/:id/sign')];
        _getEstimates_decorators = [(0, common_1.Get)('estimates')];
        _getEstimateById_decorators = [(0, common_1.Get)('estimates/:id')];
        _markEstimateViewed_decorators = [(0, common_1.Post)('estimates/:id/viewed')];
        _respondToEstimate_decorators = [(0, common_1.Post)('estimates/:id/respond')];
        _markContractViewed_decorators = [(0, common_1.Post)('contracts/:id/viewed')];
        _getInvoices_decorators = [(0, common_1.Get)('invoices')];
        _createInvoiceCheckout_decorators = [(0, common_1.Post)('invoices/:id/checkout')];
        _getItems_decorators = [(0, common_1.Get)('items')];
        _getMessages_decorators = [(0, common_1.Get)('messages')];
        _sendMessage_decorators = [(0, common_1.Post)('messages')];
        _getNotifications_decorators = [(0, common_1.Get)('notifications')];
        _markRead_decorators = [(0, common_1.Put)('notifications/:id/read')];
        _getInvite_decorators = [(0, common_1.Get)('invite/:token')];
        _confirmInvite_decorators = [(0, common_1.Post)('invite/:token/confirm')];
        _declineInvite_decorators = [(0, common_1.Post)('invite/:token/decline')];
        _leaveVendorReview_decorators = [(0, common_1.Post)('vendors/review')];
        __esDecorate(_classThis, null, _requestOtp_decorators, { kind: "method", name: "requestOtp", static: false, private: false, access: { has: function (obj) { return "requestOtp" in obj; }, get: function (obj) { return obj.requestOtp; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _verifyOtp_decorators, { kind: "method", name: "verifyOtp", static: false, private: false, access: { has: function (obj) { return "verifyOtp" in obj; }, get: function (obj) { return obj.verifyOtp; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _logout_decorators, { kind: "method", name: "logout", static: false, private: false, access: { has: function (obj) { return "logout" in obj; }, get: function (obj) { return obj.logout; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getOverview_decorators, { kind: "method", name: "getOverview", static: false, private: false, access: { has: function (obj) { return "getOverview" in obj; }, get: function (obj) { return obj.getOverview; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getBookings_decorators, { kind: "method", name: "getBookings", static: false, private: false, access: { has: function (obj) { return "getBookings" in obj; }, get: function (obj) { return obj.getBookings; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getEvents_decorators, { kind: "method", name: "getEvents", static: false, private: false, access: { has: function (obj) { return "getEvents" in obj; }, get: function (obj) { return obj.getEvents; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _browseVendors_decorators, { kind: "method", name: "browseVendors", static: false, private: false, access: { has: function (obj) { return "browseVendors" in obj; }, get: function (obj) { return obj.browseVendors; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _bookVendor_decorators, { kind: "method", name: "bookVendor", static: false, private: false, access: { has: function (obj) { return "bookVendor" in obj; }, get: function (obj) { return obj.bookVendor; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getVendors_decorators, { kind: "method", name: "getVendors", static: false, private: false, access: { has: function (obj) { return "getVendors" in obj; }, get: function (obj) { return obj.getVendors; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getPendingConfirmations_decorators, { kind: "method", name: "getPendingConfirmations", static: false, private: false, access: { has: function (obj) { return "getPendingConfirmations" in obj; }, get: function (obj) { return obj.getPendingConfirmations; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _respondToConfirmation_decorators, { kind: "method", name: "respondToConfirmation", static: false, private: false, access: { has: function (obj) { return "respondToConfirmation" in obj; }, get: function (obj) { return obj.respondToConfirmation; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getContracts_decorators, { kind: "method", name: "getContracts", static: false, private: false, access: { has: function (obj) { return "getContracts" in obj; }, get: function (obj) { return obj.getContracts; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getContractById_decorators, { kind: "method", name: "getContractById", static: false, private: false, access: { has: function (obj) { return "getContractById" in obj; }, get: function (obj) { return obj.getContractById; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _signContract_decorators, { kind: "method", name: "signContract", static: false, private: false, access: { has: function (obj) { return "signContract" in obj; }, get: function (obj) { return obj.signContract; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getEstimates_decorators, { kind: "method", name: "getEstimates", static: false, private: false, access: { has: function (obj) { return "getEstimates" in obj; }, get: function (obj) { return obj.getEstimates; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getEstimateById_decorators, { kind: "method", name: "getEstimateById", static: false, private: false, access: { has: function (obj) { return "getEstimateById" in obj; }, get: function (obj) { return obj.getEstimateById; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _markEstimateViewed_decorators, { kind: "method", name: "markEstimateViewed", static: false, private: false, access: { has: function (obj) { return "markEstimateViewed" in obj; }, get: function (obj) { return obj.markEstimateViewed; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _respondToEstimate_decorators, { kind: "method", name: "respondToEstimate", static: false, private: false, access: { has: function (obj) { return "respondToEstimate" in obj; }, get: function (obj) { return obj.respondToEstimate; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _markContractViewed_decorators, { kind: "method", name: "markContractViewed", static: false, private: false, access: { has: function (obj) { return "markContractViewed" in obj; }, get: function (obj) { return obj.markContractViewed; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getInvoices_decorators, { kind: "method", name: "getInvoices", static: false, private: false, access: { has: function (obj) { return "getInvoices" in obj; }, get: function (obj) { return obj.getInvoices; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createInvoiceCheckout_decorators, { kind: "method", name: "createInvoiceCheckout", static: false, private: false, access: { has: function (obj) { return "createInvoiceCheckout" in obj; }, get: function (obj) { return obj.createInvoiceCheckout; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getItems_decorators, { kind: "method", name: "getItems", static: false, private: false, access: { has: function (obj) { return "getItems" in obj; }, get: function (obj) { return obj.getItems; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMessages_decorators, { kind: "method", name: "getMessages", static: false, private: false, access: { has: function (obj) { return "getMessages" in obj; }, get: function (obj) { return obj.getMessages; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _sendMessage_decorators, { kind: "method", name: "sendMessage", static: false, private: false, access: { has: function (obj) { return "sendMessage" in obj; }, get: function (obj) { return obj.sendMessage; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getNotifications_decorators, { kind: "method", name: "getNotifications", static: false, private: false, access: { has: function (obj) { return "getNotifications" in obj; }, get: function (obj) { return obj.getNotifications; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _markRead_decorators, { kind: "method", name: "markRead", static: false, private: false, access: { has: function (obj) { return "markRead" in obj; }, get: function (obj) { return obj.markRead; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getInvite_decorators, { kind: "method", name: "getInvite", static: false, private: false, access: { has: function (obj) { return "getInvite" in obj; }, get: function (obj) { return obj.getInvite; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _confirmInvite_decorators, { kind: "method", name: "confirmInvite", static: false, private: false, access: { has: function (obj) { return "confirmInvite" in obj; }, get: function (obj) { return obj.confirmInvite; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _declineInvite_decorators, { kind: "method", name: "declineInvite", static: false, private: false, access: { has: function (obj) { return "declineInvite" in obj; }, get: function (obj) { return obj.declineInvite; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _leaveVendorReview_decorators, { kind: "method", name: "leaveVendorReview", static: false, private: false, access: { has: function (obj) { return "leaveVendorReview" in obj; }, get: function (obj) { return obj.leaveVendorReview; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ClientPortalController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ClientPortalController = _classThis;
}();
exports.ClientPortalController = ClientPortalController;
