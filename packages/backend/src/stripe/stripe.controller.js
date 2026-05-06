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
exports.StripeController = void 0;
var common_1 = require("@nestjs/common");
/**
 * StripeController
 *
 * Public:
 *   POST /stripe/webhook          — Stripe webhook (raw body, signature-verified)
 *
 * Authenticated (Bearer token required, owner only):
 *   POST /stripe/checkout         — Create a Checkout session
 *   POST /stripe/billing-portal   — Create a Billing Portal session
 *   GET  /stripe/subscription     — Get current subscription status
 */
var StripeController = function () {
    var _classDecorators = [(0, common_1.Controller)('stripe')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _handleWebhook_decorators;
    var _createCheckoutSession_decorators;
    var _createBillingPortal_decorators;
    var _getSubscriptionStatus_decorators;
    var _ownerConnectOnboarding_decorators;
    var _vendorConnectOnboarding_decorators;
    var _ownerConnectStatus_decorators;
    var _vendorConnectStatus_decorators;
    var _resetOwnerConnect_decorators;
    var _resetVendorConnect_decorators;
    var _promoterConnectOnboarding_decorators;
    var _promoterConnectStatus_decorators;
    var _resetPromoterConnect_decorators;
    var _artistConnectOnboarding_decorators;
    var _artistConnectStatus_decorators;
    var _resetArtistConnect_decorators;
    var _chargeClient_decorators;
    var _payVendor_decorators;
    var _createPaymentLink_decorators;
    var _getPublicInvoice_decorators;
    var _publicInvoiceCheckout_decorators;
    var _verifyPublicInvoicePayment_decorators;
    var _verifyInvoicePaymentById_decorators;
    var StripeController = _classThis = /** @class */ (function () {
        function StripeController_1(stripeService, supabaseService) {
            this.stripeService = (__runInitializers(this, _instanceExtraInitializers), stripeService);
            this.supabaseService = supabaseService;
            this.logger = new common_1.Logger(StripeController.name);
        }
        // ─── Webhook (public, raw body) ──────────────────────────────────────────
        StripeController_1.prototype.handleWebhook = function (rawBody, signature) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!rawBody) {
                                throw new common_1.BadRequestException('Missing request body');
                            }
                            if (!signature) {
                                throw new common_1.BadRequestException('Missing stripe-signature header');
                            }
                            return [4 /*yield*/, this.stripeService.handleWebhook(rawBody, signature)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { received: true }];
                    }
                });
            });
        };
        // ─── Create Checkout Session (authenticated) ──────────────────────────────
        /**
         * POST /stripe/checkout
         * Body: { ownerAccountId, priceId, email, businessName }
         */
        StripeController_1.prototype.createCheckoutSession = function (body) {
            return __awaiter(this, void 0, void 0, function () {
                var ownerAccountId, priceId, email, businessName, url;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            ownerAccountId = body.ownerAccountId, priceId = body.priceId, email = body.email, businessName = body.businessName;
                            if (!ownerAccountId || !priceId || !email || !businessName) {
                                throw new common_1.BadRequestException('ownerAccountId, priceId, email, and businessName are required');
                            }
                            return [4 /*yield*/, this.stripeService.createCheckoutSession(ownerAccountId, priceId, email, businessName)];
                        case 1:
                            url = _a.sent();
                            return [2 /*return*/, { url: url }];
                    }
                });
            });
        };
        // ─── Billing Portal (authenticated) ──────────────────────────────────────
        /**
         * POST /stripe/billing-portal
         * Body: { ownerAccountId }
         */
        StripeController_1.prototype.createBillingPortal = function (body) {
            return __awaiter(this, void 0, void 0, function () {
                var url;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!body.ownerAccountId) {
                                throw new common_1.BadRequestException('ownerAccountId is required');
                            }
                            return [4 /*yield*/, this.stripeService.createBillingPortalSession(body.ownerAccountId)];
                        case 1:
                            url = _a.sent();
                            return [2 /*return*/, { url: url }];
                    }
                });
            });
        };
        // ─── Subscription Status (authenticated) ─────────────────────────────────
        /**
         * GET /stripe/subscription?ownerAccountId=xxx
         */
        StripeController_1.prototype.getSubscriptionStatus = function (ownerAccountId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (!ownerAccountId) {
                        throw new common_1.BadRequestException('ownerAccountId query param is required');
                    }
                    return [2 /*return*/, this.stripeService.getSubscriptionStatus(ownerAccountId)];
                });
            });
        };
        // ─── Helpers ─────────────────────────────────────────────────────────────
        StripeController_1.prototype.getUserIdFromAuth = function (authorization) {
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
        // ─── Connect Onboarding ───────────────────────────────────────────────────
        /**
         * POST /stripe/connect/owner
         * Starts Connect Express onboarding for an owner.
         * Returns a Stripe-hosted onboarding URL.
         */
        StripeController_1.prototype.ownerConnectOnboarding = function (authorization, body) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, url;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!body.email)
                                throw new common_1.BadRequestException('email is required');
                            return [4 /*yield*/, this.getUserIdFromAuth(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [4 /*yield*/, this.stripeService.createOwnerConnectOnboarding(userId, body.email)];
                        case 2:
                            url = _a.sent();
                            return [2 /*return*/, { url: url }];
                    }
                });
            });
        };
        /**
         * POST /stripe/connect/vendor
         * Starts Connect Express onboarding for a vendor.
         */
        StripeController_1.prototype.vendorConnectOnboarding = function (authorization, body) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, url;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!body.email)
                                throw new common_1.BadRequestException('email is required');
                            return [4 /*yield*/, this.getUserIdFromAuth(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [4 /*yield*/, this.stripeService.createVendorConnectOnboarding(userId, body.email)];
                        case 2:
                            url = _a.sent();
                            return [2 /*return*/, { url: url }];
                    }
                });
            });
        };
        /**
         * GET /stripe/connect/owner/status
         */
        StripeController_1.prototype.ownerConnectStatus = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserIdFromAuth(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.stripeService.getOwnerConnectStatus(userId)];
                    }
                });
            });
        };
        /**
         * GET /stripe/connect/vendor/status
         */
        StripeController_1.prototype.vendorConnectStatus = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserIdFromAuth(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.stripeService.getVendorConnectStatus(userId)];
                    }
                });
            });
        };
        /**
         * DELETE /stripe/connect/owner/reset — Clear stuck Connect account so a fresh one is created
         */
        StripeController_1.prototype.resetOwnerConnect = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserIdFromAuth(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.stripeService.resetOwnerConnect(userId)];
                    }
                });
            });
        };
        /**
         * DELETE /stripe/connect/vendor/reset — Clear stuck Connect account so a fresh one is created
         */
        StripeController_1.prototype.resetVendorConnect = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserIdFromAuth(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.stripeService.resetVendorConnect(userId)];
                    }
                });
            });
        };
        // ─── Promoter Connect ─────────────────────────────────────────────────────
        /**
         * POST /stripe/connect/promoter
         * Starts Connect Express onboarding for a promoter.
         */
        StripeController_1.prototype.promoterConnectOnboarding = function (authorization, body) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, url;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!body.email)
                                throw new common_1.BadRequestException('email is required');
                            return [4 /*yield*/, this.getUserIdFromAuth(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [4 /*yield*/, this.stripeService.createPromoterConnectOnboarding(userId, body.email)];
                        case 2:
                            url = _a.sent();
                            return [2 /*return*/, { url: url }];
                    }
                });
            });
        };
        /**
         * GET /stripe/connect/promoter/status
         */
        StripeController_1.prototype.promoterConnectStatus = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserIdFromAuth(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.stripeService.getPromoterConnectStatus(userId)];
                    }
                });
            });
        };
        /**
         * DELETE /stripe/connect/promoter/reset — Clear stuck Connect account
         */
        StripeController_1.prototype.resetPromoterConnect = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserIdFromAuth(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.stripeService.resetPromoterConnect(userId)];
                    }
                });
            });
        };
        // ─── Artist Connect ───────────────────────────────────────────────────────
        /**
         * POST /stripe/connect/artist
         * Starts Connect Express onboarding for an artist.
         */
        StripeController_1.prototype.artistConnectOnboarding = function (authorization, body) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, url;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!body.email)
                                throw new common_1.BadRequestException('email is required');
                            return [4 /*yield*/, this.getUserIdFromAuth(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [4 /*yield*/, this.stripeService.createArtistConnectOnboarding(userId, body.email)];
                        case 2:
                            url = _a.sent();
                            return [2 /*return*/, { url: url }];
                    }
                });
            });
        };
        /**
         * GET /stripe/connect/artist/status
         */
        StripeController_1.prototype.artistConnectStatus = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserIdFromAuth(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.stripeService.getArtistConnectStatus(userId)];
                    }
                });
            });
        };
        /**
         * DELETE /stripe/connect/artist/reset — Clear stuck Connect account
         */
        StripeController_1.prototype.resetArtistConnect = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserIdFromAuth(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.stripeService.resetArtistConnect(userId)];
                    }
                });
            });
        };
        // ─── Payments ─────────────────────────────────────────────────────────────
        /**
         * POST /stripe/payments/charge-client
         * Creates a PaymentIntent for a client paying an owner.
         * Body: { amountCents, ownerUserId, description }
         * Returns: { clientSecret, paymentIntentId, feeCents }
         */
        StripeController_1.prototype.chargeClient = function (body) {
            return __awaiter(this, void 0, void 0, function () {
                var amountCents, ownerUserId, _a, description, invoiceId;
                return __generator(this, function (_b) {
                    amountCents = body.amountCents, ownerUserId = body.ownerUserId, _a = body.description, description = _a === void 0 ? 'Event booking payment' : _a, invoiceId = body.invoiceId;
                    if (!amountCents || !ownerUserId) {
                        throw new common_1.BadRequestException('amountCents and ownerUserId are required');
                    }
                    return [2 /*return*/, this.stripeService.createClientPaymentIntent(amountCents, ownerUserId, description, invoiceId)];
                });
            });
        };
        /**
         * POST /stripe/payments/pay-vendor
         * Transfers funds from platform to vendor (owner-initiated).
         * Body: { amountCents, vendorAccountId, vendorBookingId, description }
         */
        StripeController_1.prototype.payVendor = function (authorization, body) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, amountCents, vendorAccountId, vendorBookingId, _a, description;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getUserIdFromAuth(authorization)];
                        case 1:
                            userId = _b.sent();
                            amountCents = body.amountCents, vendorAccountId = body.vendorAccountId, vendorBookingId = body.vendorBookingId, _a = body.description, description = _a === void 0 ? 'Vendor payment' : _a;
                            if (!amountCents || !vendorAccountId || !vendorBookingId) {
                                throw new common_1.BadRequestException('amountCents, vendorAccountId, and vendorBookingId are required');
                            }
                            return [2 /*return*/, this.stripeService.payVendor(amountCents, userId, vendorAccountId, vendorBookingId, description)];
                    }
                });
            });
        };
        /**
         * POST /stripe/payment-link
         * Creates a Stripe Checkout session (one-time) for an invoice the owner can send to the client.
         * Body: { invoiceId, amountCents, description }
         * Returns: { url }
         */
        StripeController_1.prototype.createPaymentLink = function (authorization, body) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, invoiceId, _a, amountCents, _b, description, url;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.getUserIdFromAuth(authorization)];
                        case 1:
                            userId = _c.sent();
                            invoiceId = body.invoiceId, _a = body.amountCents, amountCents = _a === void 0 ? 0 : _a, _b = body.description, description = _b === void 0 ? 'Invoice Payment' : _b;
                            if (!invoiceId) {
                                throw new common_1.BadRequestException('invoiceId is required');
                            }
                            return [4 /*yield*/, this.stripeService.createInvoicePaymentLink(invoiceId, amountCents, description, userId)];
                        case 2:
                            url = _c.sent();
                            return [2 /*return*/, { url: url }];
                    }
                });
            });
        };
        /**
         * GET /stripe/invoice-pay/:token
         * Public endpoint — returns safe invoice data for the client payment page.
         */
        StripeController_1.prototype.getPublicInvoice = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.stripeService.getPublicInvoice(token)];
                });
            });
        };
        /**
         * POST /stripe/invoice-pay/:token/checkout
         * Public endpoint — creates a Stripe Checkout session for the chosen amount.
         * Body: { amountCents: number }
         * Returns: { url: string }
         */
        StripeController_1.prototype.publicInvoiceCheckout = function (token, body) {
            return __awaiter(this, void 0, void 0, function () {
                var amountCents, url;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            amountCents = body.amountCents;
                            if (!amountCents || amountCents < 50) {
                                throw new common_1.BadRequestException('amountCents must be at least 50 (i.e. $0.50)');
                            }
                            return [4 /*yield*/, this.stripeService.createPublicInvoiceCheckout(token, amountCents)];
                        case 1:
                            url = _a.sent();
                            return [2 /*return*/, { url: url }];
                    }
                });
            });
        };
        /**
         * POST /stripe/invoice-pay/:token/verify-payment?sid=<stripeSessionId>
         * Public endpoint — webhook fallback. Confirms payment with Stripe and marks invoice paid.
         */
        StripeController_1.prototype.verifyPublicInvoicePayment = function (token, sid) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (!sid)
                        throw new common_1.BadRequestException('sid is required');
                    return [2 /*return*/, this.stripeService.verifyPublicInvoicePayment(token, sid)];
                });
            });
        };
        /**
         * POST /stripe/invoice-verify/:invoiceId?sid=<stripeSessionId>
         * Webhook fallback for the client portal. Verifies payment with Stripe by session ID.
         */
        StripeController_1.prototype.verifyInvoicePaymentById = function (invoiceId, sid) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (!sid)
                        throw new common_1.BadRequestException('sid is required');
                    return [2 /*return*/, this.stripeService.verifyInvoicePaymentById(invoiceId, sid)];
                });
            });
        };
        return StripeController_1;
    }());
    __setFunctionName(_classThis, "StripeController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _handleWebhook_decorators = [(0, common_1.Post)('webhook'), (0, common_1.HttpCode)(common_1.HttpStatus.OK)];
        _createCheckoutSession_decorators = [(0, common_1.Post)('checkout')];
        _createBillingPortal_decorators = [(0, common_1.Post)('billing-portal')];
        _getSubscriptionStatus_decorators = [(0, common_1.Get)('subscription')];
        _ownerConnectOnboarding_decorators = [(0, common_1.Post)('connect/owner')];
        _vendorConnectOnboarding_decorators = [(0, common_1.Post)('connect/vendor')];
        _ownerConnectStatus_decorators = [(0, common_1.Get)('connect/owner/status')];
        _vendorConnectStatus_decorators = [(0, common_1.Get)('connect/vendor/status')];
        _resetOwnerConnect_decorators = [(0, common_1.Delete)('connect/owner/reset')];
        _resetVendorConnect_decorators = [(0, common_1.Delete)('connect/vendor/reset')];
        _promoterConnectOnboarding_decorators = [(0, common_1.Post)('connect/promoter')];
        _promoterConnectStatus_decorators = [(0, common_1.Get)('connect/promoter/status')];
        _resetPromoterConnect_decorators = [(0, common_1.Delete)('connect/promoter/reset')];
        _artistConnectOnboarding_decorators = [(0, common_1.Post)('connect/artist')];
        _artistConnectStatus_decorators = [(0, common_1.Get)('connect/artist/status')];
        _resetArtistConnect_decorators = [(0, common_1.Delete)('connect/artist/reset')];
        _chargeClient_decorators = [(0, common_1.Post)('payments/charge-client')];
        _payVendor_decorators = [(0, common_1.Post)('payments/pay-vendor')];
        _createPaymentLink_decorators = [(0, common_1.Post)('payment-link')];
        _getPublicInvoice_decorators = [(0, common_1.Get)('invoice-pay/:token')];
        _publicInvoiceCheckout_decorators = [(0, common_1.Post)('invoice-pay/:token/checkout')];
        _verifyPublicInvoicePayment_decorators = [(0, common_1.Post)('invoice-pay/:token/verify-payment')];
        _verifyInvoicePaymentById_decorators = [(0, common_1.Post)('invoice-verify/:invoiceId')];
        __esDecorate(_classThis, null, _handleWebhook_decorators, { kind: "method", name: "handleWebhook", static: false, private: false, access: { has: function (obj) { return "handleWebhook" in obj; }, get: function (obj) { return obj.handleWebhook; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createCheckoutSession_decorators, { kind: "method", name: "createCheckoutSession", static: false, private: false, access: { has: function (obj) { return "createCheckoutSession" in obj; }, get: function (obj) { return obj.createCheckoutSession; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createBillingPortal_decorators, { kind: "method", name: "createBillingPortal", static: false, private: false, access: { has: function (obj) { return "createBillingPortal" in obj; }, get: function (obj) { return obj.createBillingPortal; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getSubscriptionStatus_decorators, { kind: "method", name: "getSubscriptionStatus", static: false, private: false, access: { has: function (obj) { return "getSubscriptionStatus" in obj; }, get: function (obj) { return obj.getSubscriptionStatus; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _ownerConnectOnboarding_decorators, { kind: "method", name: "ownerConnectOnboarding", static: false, private: false, access: { has: function (obj) { return "ownerConnectOnboarding" in obj; }, get: function (obj) { return obj.ownerConnectOnboarding; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _vendorConnectOnboarding_decorators, { kind: "method", name: "vendorConnectOnboarding", static: false, private: false, access: { has: function (obj) { return "vendorConnectOnboarding" in obj; }, get: function (obj) { return obj.vendorConnectOnboarding; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _ownerConnectStatus_decorators, { kind: "method", name: "ownerConnectStatus", static: false, private: false, access: { has: function (obj) { return "ownerConnectStatus" in obj; }, get: function (obj) { return obj.ownerConnectStatus; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _vendorConnectStatus_decorators, { kind: "method", name: "vendorConnectStatus", static: false, private: false, access: { has: function (obj) { return "vendorConnectStatus" in obj; }, get: function (obj) { return obj.vendorConnectStatus; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _resetOwnerConnect_decorators, { kind: "method", name: "resetOwnerConnect", static: false, private: false, access: { has: function (obj) { return "resetOwnerConnect" in obj; }, get: function (obj) { return obj.resetOwnerConnect; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _resetVendorConnect_decorators, { kind: "method", name: "resetVendorConnect", static: false, private: false, access: { has: function (obj) { return "resetVendorConnect" in obj; }, get: function (obj) { return obj.resetVendorConnect; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _promoterConnectOnboarding_decorators, { kind: "method", name: "promoterConnectOnboarding", static: false, private: false, access: { has: function (obj) { return "promoterConnectOnboarding" in obj; }, get: function (obj) { return obj.promoterConnectOnboarding; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _promoterConnectStatus_decorators, { kind: "method", name: "promoterConnectStatus", static: false, private: false, access: { has: function (obj) { return "promoterConnectStatus" in obj; }, get: function (obj) { return obj.promoterConnectStatus; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _resetPromoterConnect_decorators, { kind: "method", name: "resetPromoterConnect", static: false, private: false, access: { has: function (obj) { return "resetPromoterConnect" in obj; }, get: function (obj) { return obj.resetPromoterConnect; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _artistConnectOnboarding_decorators, { kind: "method", name: "artistConnectOnboarding", static: false, private: false, access: { has: function (obj) { return "artistConnectOnboarding" in obj; }, get: function (obj) { return obj.artistConnectOnboarding; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _artistConnectStatus_decorators, { kind: "method", name: "artistConnectStatus", static: false, private: false, access: { has: function (obj) { return "artistConnectStatus" in obj; }, get: function (obj) { return obj.artistConnectStatus; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _resetArtistConnect_decorators, { kind: "method", name: "resetArtistConnect", static: false, private: false, access: { has: function (obj) { return "resetArtistConnect" in obj; }, get: function (obj) { return obj.resetArtistConnect; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _chargeClient_decorators, { kind: "method", name: "chargeClient", static: false, private: false, access: { has: function (obj) { return "chargeClient" in obj; }, get: function (obj) { return obj.chargeClient; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _payVendor_decorators, { kind: "method", name: "payVendor", static: false, private: false, access: { has: function (obj) { return "payVendor" in obj; }, get: function (obj) { return obj.payVendor; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createPaymentLink_decorators, { kind: "method", name: "createPaymentLink", static: false, private: false, access: { has: function (obj) { return "createPaymentLink" in obj; }, get: function (obj) { return obj.createPaymentLink; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getPublicInvoice_decorators, { kind: "method", name: "getPublicInvoice", static: false, private: false, access: { has: function (obj) { return "getPublicInvoice" in obj; }, get: function (obj) { return obj.getPublicInvoice; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _publicInvoiceCheckout_decorators, { kind: "method", name: "publicInvoiceCheckout", static: false, private: false, access: { has: function (obj) { return "publicInvoiceCheckout" in obj; }, get: function (obj) { return obj.publicInvoiceCheckout; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _verifyPublicInvoicePayment_decorators, { kind: "method", name: "verifyPublicInvoicePayment", static: false, private: false, access: { has: function (obj) { return "verifyPublicInvoicePayment" in obj; }, get: function (obj) { return obj.verifyPublicInvoicePayment; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _verifyInvoicePaymentById_decorators, { kind: "method", name: "verifyInvoicePaymentById", static: false, private: false, access: { has: function (obj) { return "verifyInvoicePaymentById" in obj; }, get: function (obj) { return obj.verifyInvoicePaymentById; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        StripeController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return StripeController = _classThis;
}();
exports.StripeController = StripeController;
