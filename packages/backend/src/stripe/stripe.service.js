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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeService = void 0;
var common_1 = require("@nestjs/common");
var stripe_1 = require("stripe");
var StripeService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var StripeService = _classThis = /** @class */ (function () {
        function StripeService_1(configService, supabaseService, vendorInvoicesService, artistInvoicesService, promoterInvoicesService, promoterEventsService, affiliatesService, smsNotifications) {
            this.configService = configService;
            this.supabaseService = supabaseService;
            this.vendorInvoicesService = vendorInvoicesService;
            this.artistInvoicesService = artistInvoicesService;
            this.promoterInvoicesService = promoterInvoicesService;
            this.promoterEventsService = promoterEventsService;
            this.affiliatesService = affiliatesService;
            this.smsNotifications = smsNotifications;
            this.logger = new common_1.Logger(StripeService.name);
            // ─── Stripe Connect ────────────────────────────────────────────────────────
            this.APP_FEE_RATE = 0.05; // 5% DoVenueSuite fee
            var secretKey = this.configService.get('STRIPE_SECRET_KEY');
            if (!secretKey) {
                throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
            }
            this.stripe = new stripe_1.default(secretKey);
            this.webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET', '');
            this.frontendUrl = this.configService.get('FRONTEND_URL', 'https://dovenuesuite.com');
        }
        Object.defineProperty(StripeService_1.prototype, "connectBusinessUrl", {
            /** Returns a public-facing URL Stripe will accept for business_profile.url (never localhost). */
            get: function () {
                return this.frontendUrl.startsWith('http://localhost') ? 'https://dovenuesuite.com' : this.frontendUrl;
            },
            enumerable: false,
            configurable: true
        });
        // ─── Customer ─────────────────────────────────────────────────────────────
        /**
         * Create a Stripe customer for an owner and persist stripe_customer_id.
         * Returns the existing customer ID if already created.
         */
        StripeService_1.prototype.createOrRetrieveCustomer = function (ownerAccountId, email, businessName) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, owner, customer;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('owner_accounts')
                                    .select('stripe_customer_id')
                                    .eq('id', ownerAccountId)
                                    .single()];
                        case 1:
                            owner = (_a.sent()).data;
                            if (owner === null || owner === void 0 ? void 0 : owner.stripe_customer_id) {
                                return [2 /*return*/, owner.stripe_customer_id];
                            }
                            return [4 /*yield*/, this.stripe.customers.create({
                                    email: email,
                                    name: businessName,
                                    metadata: { owner_account_id: ownerAccountId },
                                })];
                        case 2:
                            customer = _a.sent();
                            return [4 /*yield*/, admin
                                    .from('owner_accounts')
                                    .update({ stripe_customer_id: customer.id })
                                    .eq('id', ownerAccountId)];
                        case 3:
                            _a.sent();
                            this.logger.log("Created Stripe customer ".concat(customer.id, " for owner ").concat(ownerAccountId));
                            return [2 /*return*/, customer.id];
                    }
                });
            });
        };
        // ─── Checkout ─────────────────────────────────────────────────────────────
        /**
         * Create a Stripe Checkout session for a subscription plan.
         * @param ownerAccountId  UUID of the owner_accounts row
         * @param priceId         Stripe Price ID (e.g. price_xxx)
         * @param email           Owner email address
         * @param businessName    Business name for Stripe customer
         * @returns Checkout session URL
         */
        StripeService_1.prototype.createCheckoutSession = function (ownerAccountId, priceId, email, businessName) {
            return __awaiter(this, void 0, void 0, function () {
                var customerId, session;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.createOrRetrieveCustomer(ownerAccountId, email, businessName)];
                        case 1:
                            customerId = _a.sent();
                            return [4 /*yield*/, this.stripe.checkout.sessions.create({
                                    customer: customerId,
                                    payment_method_types: ['card'],
                                    line_items: [{ price: priceId, quantity: 1 }],
                                    mode: 'subscription',
                                    success_url: "".concat(this.frontendUrl, "/dashboard?session_id={CHECKOUT_SESSION_ID}&subscribed=true"),
                                    cancel_url: "".concat(this.frontendUrl, "/billing?canceled=true"),
                                    client_reference_id: ownerAccountId,
                                    subscription_data: {
                                        metadata: { owner_account_id: ownerAccountId },
                                    },
                                })];
                        case 2:
                            session = _a.sent();
                            this.logger.log("Created checkout session ".concat(session.id, " for owner ").concat(ownerAccountId));
                            return [2 /*return*/, session.url];
                    }
                });
            });
        };
        // ─── Billing Portal ────────────────────────────────────────────────────────
        /**
         * Create a Stripe Customer Portal session for managing subscriptions.
         */
        StripeService_1.prototype.createBillingPortalSession = function (ownerAccountId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, owner, session;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('owner_accounts')
                                    .select('stripe_customer_id')
                                    .eq('id', ownerAccountId)
                                    .single()];
                        case 1:
                            owner = (_a.sent()).data;
                            if (!(owner === null || owner === void 0 ? void 0 : owner.stripe_customer_id)) {
                                throw new Error('No Stripe customer found for this owner. Complete a checkout first.');
                            }
                            return [4 /*yield*/, this.stripe.billingPortal.sessions.create({
                                    customer: owner.stripe_customer_id,
                                    return_url: "".concat(this.frontendUrl, "/billing"),
                                })];
                        case 2:
                            session = _a.sent();
                            return [2 /*return*/, session.url];
                    }
                });
            });
        };
        // ─── Client Invoice Payment ────────────────────────────────────────────────
        /**
         * Create a Stripe Checkout session for a client paying a specific invoice.
         * Funds route to the owner's Connect account (if connected), or directly to platform.
         * On checkout.session.completed the webhook calls markInvoicePaid automatically.
         */
        StripeService_1.prototype.createInvoiceCheckoutSession = function (invoiceId, clientName) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, invoice, amountCents, transferData, owner, ownerById, feeCents, feeCents, session;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('invoices')
                                    .select('id, invoice_number, total_amount, amount_due, amount_paid, owner_id, client_name')
                                    .eq('id', invoiceId)
                                    .maybeSingle()];
                        case 1:
                            invoice = (_a.sent()).data;
                            if (!invoice)
                                throw new Error('Invoice not found');
                            if (invoice.amount_due <= 0)
                                throw new Error('Invoice is already fully paid');
                            amountCents = Math.round(Number(invoice.amount_due) * 100);
                            if (amountCents < 50)
                                throw new Error('Amount too small to process');
                            if (!invoice.owner_id) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.getOwnerAccountByUserId(invoice.owner_id, admin)];
                        case 2:
                            owner = _a.sent();
                            if (!!owner) return [3 /*break*/, 4];
                            return [4 /*yield*/, admin
                                    .from('owner_accounts')
                                    .select('stripe_connect_id, stripe_connect_status')
                                    .eq('id', invoice.owner_id)
                                    .maybeSingle()];
                        case 3:
                            ownerById = (_a.sent()).data;
                            if ((ownerById === null || ownerById === void 0 ? void 0 : ownerById.stripe_connect_id) && ownerById.stripe_connect_status === 'active') {
                                feeCents = Math.round(amountCents * this.APP_FEE_RATE);
                                transferData = {
                                    application_fee_amount: feeCents,
                                    transfer_data: { destination: ownerById.stripe_connect_id },
                                };
                            }
                            return [3 /*break*/, 5];
                        case 4:
                            if (owner.stripe_connect_id && owner.stripe_connect_status === 'active') {
                                feeCents = Math.round(amountCents * this.APP_FEE_RATE);
                                transferData = {
                                    application_fee_amount: feeCents,
                                    transfer_data: { destination: owner.stripe_connect_id },
                                };
                            }
                            _a.label = 5;
                        case 5: return [4 /*yield*/, this.stripe.checkout.sessions.create(__assign({ payment_method_types: ['card'], line_items: [
                                    {
                                        price_data: {
                                            currency: 'usd',
                                            unit_amount: amountCents,
                                            product_data: {
                                                name: "Invoice #".concat(invoice.invoice_number),
                                                description: "Payment from ".concat(clientName || invoice.client_name || 'Client'),
                                            },
                                        },
                                        quantity: 1,
                                    },
                                ], mode: 'payment', success_url: "".concat(this.frontendUrl, "/client-portal/invoices?paid=true&invoice=").concat(invoice.invoice_number, "&iid=").concat(invoiceId, "&sid={CHECKOUT_SESSION_ID}"), cancel_url: "".concat(this.frontendUrl, "/client-portal/invoices?canceled=true"), metadata: { invoice_id: invoiceId } }, (transferData ? { payment_intent_data: transferData } : {})))];
                        case 6:
                            session = _a.sent();
                            this.logger.log("Created invoice checkout session ".concat(session.id, " for invoice ").concat(invoiceId));
                            return [2 /*return*/, session.url];
                    }
                });
            });
        };
        /**
         * Verify Stripe webhook signature and process the event.
         * @param rawBody   Raw Buffer from the request (required for signature check)
         * @param signature Value of the stripe-signature header
         */
        StripeService_1.prototype.handleWebhook = function (rawBody, signature) {
            return __awaiter(this, void 0, void 0, function () {
                var event, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (this.webhookSecret) {
                                try {
                                    event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
                                }
                                catch (err) {
                                    this.logger.error('Webhook signature verification failed', err.message);
                                    throw new Error("Webhook error: ".concat(err.message));
                                }
                            }
                            else {
                                this.logger.warn('STRIPE_WEBHOOK_SECRET not set — skipping signature verification (dev mode)');
                                event = JSON.parse(rawBody.toString());
                            }
                            this.logger.log("Stripe webhook: ".concat(event.type));
                            _a = event.type;
                            switch (_a) {
                                case 'checkout.session.completed': return [3 /*break*/, 1];
                                case 'payment_intent.succeeded': return [3 /*break*/, 3];
                                case 'customer.subscription.created': return [3 /*break*/, 5];
                                case 'customer.subscription.updated': return [3 /*break*/, 5];
                                case 'customer.subscription.deleted': return [3 /*break*/, 7];
                                case 'invoice.payment_succeeded': return [3 /*break*/, 9];
                                case 'invoice.payment_failed': return [3 /*break*/, 11];
                                case 'account.updated': return [3 /*break*/, 13];
                            }
                            return [3 /*break*/, 15];
                        case 1: return [4 /*yield*/, this.handleCheckoutComplete(event.data.object)];
                        case 2:
                            _b.sent();
                            return [3 /*break*/, 16];
                        case 3: return [4 /*yield*/, this.handlePaymentIntentSucceeded(event.data.object)];
                        case 4:
                            _b.sent();
                            return [3 /*break*/, 16];
                        case 5: return [4 /*yield*/, this.handleSubscriptionUpdate(event.data.object)];
                        case 6:
                            _b.sent();
                            return [3 /*break*/, 16];
                        case 7: return [4 /*yield*/, this.handleSubscriptionCanceled(event.data.object)];
                        case 8:
                            _b.sent();
                            return [3 /*break*/, 16];
                        case 9: return [4 /*yield*/, this.handleInvoicePaymentSucceeded(event.data.object)];
                        case 10:
                            _b.sent();
                            return [3 /*break*/, 16];
                        case 11: return [4 /*yield*/, this.handlePaymentFailed(event.data.object)];
                        case 12:
                            _b.sent();
                            return [3 /*break*/, 16];
                        case 13: return [4 /*yield*/, this.handleConnectAccountUpdated(event.data.object)];
                        case 14:
                            _b.sent();
                            return [3 /*break*/, 16];
                        case 15:
                            this.logger.debug("Unhandled event type: ".concat(event.type));
                            _b.label = 16;
                        case 16: return [2 /*return*/];
                    }
                });
            });
        };
        // ─── Subscription Status ───────────────────────────────────────────────────
        /**
         * Retrieve the current subscription state for an owner from the database.
         */
        StripeService_1.prototype.getSubscriptionStatus = function (ownerAccountId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, owner, error, planName, price, product, _b;
                var _c, _d, _e, _f, _g;
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('owner_accounts')
                                    .select('subscription_status, plan_id, stripe_customer_id, stripe_subscription_id')
                                    .eq('id', ownerAccountId)
                                    .single()];
                        case 1:
                            _a = _h.sent(), owner = _a.data, error = _a.error;
                            if (error || !owner) {
                                return [2 /*return*/, { status: 'none', planId: null, planName: null, stripeCustomerId: null, stripeSubscriptionId: null }];
                            }
                            planName = null;
                            if (!owner.plan_id) return [3 /*break*/, 5];
                            _h.label = 2;
                        case 2:
                            _h.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, this.stripe.prices.retrieve(owner.plan_id, { expand: ['product'] })];
                        case 3:
                            price = _h.sent();
                            product = price.product;
                            planName = (_c = product === null || product === void 0 ? void 0 : product.name) !== null && _c !== void 0 ? _c : null;
                            return [3 /*break*/, 5];
                        case 4:
                            _b = _h.sent();
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/, {
                                status: (_d = owner.subscription_status) !== null && _d !== void 0 ? _d : 'inactive',
                                planId: (_e = owner.plan_id) !== null && _e !== void 0 ? _e : null,
                                planName: planName,
                                stripeCustomerId: (_f = owner.stripe_customer_id) !== null && _f !== void 0 ? _f : null,
                                stripeSubscriptionId: (_g = owner.stripe_subscription_id) !== null && _g !== void 0 ? _g : null,
                            }];
                    }
                });
            });
        };
        // ─── Private Webhook Handlers ──────────────────────────────────────────────
        StripeService_1.prototype.handleCheckoutComplete = function (session) {
            return __awaiter(this, void 0, void 0, function () {
                var invoiceId, paymentIntentId, paymentIntentId, paymentIntentId, ownerAccountId, subscriptionId, amountDollars, err_1;
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
                return __generator(this, function (_r) {
                    switch (_r.label) {
                        case 0:
                            invoiceId = (_a = session.metadata) === null || _a === void 0 ? void 0 : _a.invoice_id;
                            if (!invoiceId) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.markInvoicePaid(invoiceId, (_b = session.amount_total) !== null && _b !== void 0 ? _b : 0)];
                        case 1:
                            _r.sent();
                            this.logger.log("Invoice ".concat(invoiceId, " marked paid via checkout session ").concat(session.id));
                            return [2 /*return*/];
                        case 2:
                            if (!((_c = session.metadata) === null || _c === void 0 ? void 0 : _c.vendor_invoice_id)) return [3 /*break*/, 4];
                            paymentIntentId = typeof session.payment_intent === 'string'
                                ? session.payment_intent
                                : (_e = (_d = session.payment_intent) === null || _d === void 0 ? void 0 : _d.id) !== null && _e !== void 0 ? _e : null;
                            return [4 /*yield*/, this.vendorInvoicesService.markInvoicePaidBySession(session.id, paymentIntentId)];
                        case 3:
                            _r.sent();
                            this.logger.log("Vendor invoice checkout complete \u2014 session ".concat(session.id));
                            return [2 /*return*/];
                        case 4:
                            if (!((_f = session.metadata) === null || _f === void 0 ? void 0 : _f.artist_invoice_id)) return [3 /*break*/, 6];
                            paymentIntentId = typeof session.payment_intent === 'string'
                                ? session.payment_intent
                                : (_h = (_g = session.payment_intent) === null || _g === void 0 ? void 0 : _g.id) !== null && _h !== void 0 ? _h : null;
                            return [4 /*yield*/, this.artistInvoicesService.markInvoicePaidBySession(session.id, paymentIntentId)];
                        case 5:
                            _r.sent();
                            this.logger.log("Artist invoice checkout complete \u2014 session ".concat(session.id));
                            return [2 /*return*/];
                        case 6:
                            if (!((_j = session.metadata) === null || _j === void 0 ? void 0 : _j.public_event_id)) return [3 /*break*/, 8];
                            return [4 /*yield*/, this.promoterEventsService.markTicketsSoldBySession(session.id)];
                        case 7:
                            _r.sent();
                            this.logger.log("Ticket purchase complete \u2014 session ".concat(session.id));
                            return [2 /*return*/];
                        case 8:
                            if (!((_k = session.metadata) === null || _k === void 0 ? void 0 : _k.promoter_invoice_id)) return [3 /*break*/, 10];
                            paymentIntentId = typeof session.payment_intent === 'string'
                                ? session.payment_intent
                                : (_m = (_l = session.payment_intent) === null || _l === void 0 ? void 0 : _l.id) !== null && _m !== void 0 ? _m : null;
                            return [4 /*yield*/, this.promoterInvoicesService.markInvoicePaidBySession(session.id, paymentIntentId)];
                        case 9:
                            _r.sent();
                            this.logger.log("Promoter invoice checkout complete \u2014 session ".concat(session.id));
                            return [2 /*return*/];
                        case 10:
                            ownerAccountId = session.client_reference_id;
                            if (!ownerAccountId)
                                return [2 /*return*/];
                            subscriptionId = typeof session.subscription === 'string'
                                ? session.subscription
                                : (_p = (_o = session.subscription) === null || _o === void 0 ? void 0 : _o.id) !== null && _p !== void 0 ? _p : null;
                            return [4 /*yield*/, this.syncSubscriptionToDb(ownerAccountId, subscriptionId, 'active')];
                        case 11:
                            _r.sent();
                            this.logger.log("Checkout complete \u2014 owner ".concat(ownerAccountId, " is now active"));
                            if (!subscriptionId) return [3 /*break*/, 15];
                            amountDollars = ((_q = session.amount_total) !== null && _q !== void 0 ? _q : 0) / 100;
                            _r.label = 12;
                        case 12:
                            _r.trys.push([12, 14, , 15]);
                            return [4 /*yield*/, this.affiliatesService.processConversionCommission(ownerAccountId, subscriptionId, amountDollars)];
                        case 13:
                            _r.sent();
                            return [3 /*break*/, 15];
                        case 14:
                            err_1 = _r.sent();
                            this.logger.error('Failed to process affiliate conversion commission', err_1.message);
                            return [3 /*break*/, 15];
                        case 15: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Handle payment_intent.succeeded — marks the matching invoice as paid.
         * Fired for direct PaymentIntents (charge-client flow).
         */
        StripeService_1.prototype.handlePaymentIntentSucceeded = function (paymentIntent) {
            return __awaiter(this, void 0, void 0, function () {
                var invoiceId;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            invoiceId = (_a = paymentIntent.metadata) === null || _a === void 0 ? void 0 : _a.invoice_id;
                            if (!invoiceId)
                                return [2 /*return*/];
                            return [4 /*yield*/, this.markInvoicePaid(invoiceId, paymentIntent.amount)];
                        case 1:
                            _b.sent();
                            this.logger.log("Invoice ".concat(invoiceId, " marked paid via PaymentIntent ").concat(paymentIntent.id));
                            return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Record a (possibly partial) payment against an invoice.
         * - Adds amountCents to amount_paid, recalculates amount_due.
         * - If fully paid: status = 'paid'. If partial: status = 'partial'.
         */
        StripeService_1.prototype.markInvoicePaid = function (invoiceId, amountCents) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, amountDollars, invoice, total, previouslyPaid, newAmountPaid, newAmountDue, isFullyPaid, error, clientPhone, clientName, invoiceNumber, form, paidAmount, smsErr_1, ownerPhone, membership, user, ownerAccount, user, ownerSmsErr_1;
                var _a, _b, _c, _d, _e, _f;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            amountDollars = amountCents / 100;
                            return [4 /*yield*/, admin
                                    .from('invoices')
                                    .select('total_amount, amount_paid, client_phone, client_name, invoice_number, owner_id, booking_id, intake_form_id')
                                    .eq('id', invoiceId)
                                    .maybeSingle()];
                        case 1:
                            invoice = (_g.sent()).data;
                            total = Number((_a = invoice === null || invoice === void 0 ? void 0 : invoice.total_amount) !== null && _a !== void 0 ? _a : amountDollars);
                            previouslyPaid = Number((_b = invoice === null || invoice === void 0 ? void 0 : invoice.amount_paid) !== null && _b !== void 0 ? _b : 0);
                            newAmountPaid = Math.min(previouslyPaid + amountDollars, total);
                            newAmountDue = Math.max(0, total - newAmountPaid);
                            isFullyPaid = newAmountDue <= 0.005;
                            return [4 /*yield*/, admin
                                    .from('invoices')
                                    .update(__assign(__assign({ status: isFullyPaid ? 'paid' : 'partial', amount_paid: isFullyPaid ? total : newAmountPaid, amount_due: isFullyPaid ? 0 : newAmountDue }, (isFullyPaid ? { paid_date: new Date().toISOString() } : {})), { updated_at: new Date().toISOString() }))
                                    .eq('id', invoiceId)];
                        case 2:
                            error = (_g.sent()).error;
                            if (error) {
                                this.logger.error("Failed to record payment for invoice ".concat(invoiceId, ": ").concat(error.message));
                                return [2 /*return*/];
                            }
                            if (!invoice)
                                return [2 /*return*/];
                            clientPhone = (_c = invoice.client_phone) !== null && _c !== void 0 ? _c : null;
                            clientName = invoice.client_name || 'Valued Client';
                            invoiceNumber = invoice.invoice_number || invoiceId;
                            if (!(!clientPhone && invoice.intake_form_id)) return [3 /*break*/, 4];
                            return [4 /*yield*/, admin.from('intake_forms').select('contact_phone').eq('id', invoice.intake_form_id).maybeSingle()];
                        case 3:
                            form = (_g.sent()).data;
                            clientPhone = (_d = form === null || form === void 0 ? void 0 : form.contact_phone) !== null && _d !== void 0 ? _d : null;
                            _g.label = 4;
                        case 4:
                            paidAmount = isFullyPaid ? total : amountDollars;
                            _g.label = 5;
                        case 5:
                            _g.trys.push([5, 7, , 8]);
                            return [4 /*yield*/, this.smsNotifications.invoicePaid(clientPhone, clientName, invoiceNumber, paidAmount)];
                        case 6:
                            _g.sent();
                            return [3 /*break*/, 8];
                        case 7:
                            smsErr_1 = _g.sent();
                            this.logger.warn("Failed to send client payment SMS for invoice ".concat(invoiceId), smsErr_1.message);
                            return [3 /*break*/, 8];
                        case 8:
                            if (!invoice.owner_id) return [3 /*break*/, 20];
                            _g.label = 9;
                        case 9:
                            _g.trys.push([9, 19, , 20]);
                            ownerPhone = null;
                            return [4 /*yield*/, admin
                                    .from('memberships')
                                    .select('user_id')
                                    .eq('owner_account_id', invoice.owner_id)
                                    .eq('role', 'owner')
                                    .limit(1)
                                    .maybeSingle()];
                        case 10:
                            membership = (_g.sent()).data;
                            if (!(membership === null || membership === void 0 ? void 0 : membership.user_id)) return [3 /*break*/, 12];
                            return [4 /*yield*/, admin.from('users').select('phone_number').eq('id', membership.user_id).maybeSingle()];
                        case 11:
                            user = (_g.sent()).data;
                            ownerPhone = (_e = user === null || user === void 0 ? void 0 : user.phone_number) !== null && _e !== void 0 ? _e : null;
                            _g.label = 12;
                        case 12:
                            if (!!ownerPhone) return [3 /*break*/, 15];
                            return [4 /*yield*/, admin
                                    .from('owner_accounts')
                                    .select('primary_owner_id')
                                    .eq('id', invoice.owner_id)
                                    .maybeSingle()];
                        case 13:
                            ownerAccount = (_g.sent()).data;
                            if (!(ownerAccount === null || ownerAccount === void 0 ? void 0 : ownerAccount.primary_owner_id)) return [3 /*break*/, 15];
                            return [4 /*yield*/, admin.from('users').select('phone_number').eq('id', ownerAccount.primary_owner_id).maybeSingle()];
                        case 14:
                            user = (_g.sent()).data;
                            ownerPhone = (_f = user === null || user === void 0 ? void 0 : user.phone_number) !== null && _f !== void 0 ? _f : null;
                            _g.label = 15;
                        case 15:
                            if (!ownerPhone) return [3 /*break*/, 17];
                            return [4 /*yield*/, this.smsNotifications.trySend(ownerPhone, "DoVenue Suite: Invoice #".concat(invoiceNumber, " has been paid \u2014 $").concat(paidAmount.toFixed(2), " received from ").concat(clientName, "."))];
                        case 16:
                            _g.sent();
                            return [3 /*break*/, 18];
                        case 17:
                            this.logger.warn("No phone found for owner ".concat(invoice.owner_id, ", skipping owner SMS for invoice ").concat(invoiceId));
                            _g.label = 18;
                        case 18: return [3 /*break*/, 20];
                        case 19:
                            ownerSmsErr_1 = _g.sent();
                            this.logger.warn("Failed to send owner payment SMS for invoice ".concat(invoiceId), ownerSmsErr_1.message);
                            return [3 /*break*/, 20];
                        case 20: return [2 /*return*/];
                    }
                });
            });
        };
        StripeService_1.prototype.handleSubscriptionUpdate = function (subscription) {
            return __awaiter(this, void 0, void 0, function () {
                var ownerAccountId, priceId, customerId;
                var _a, _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            ownerAccountId = (_a = subscription.metadata) === null || _a === void 0 ? void 0 : _a.owner_account_id;
                            priceId = (_d = (_c = (_b = subscription.items.data[0]) === null || _b === void 0 ? void 0 : _b.price) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : null;
                            if (!ownerAccountId) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.syncSubscriptionToDb(ownerAccountId, subscription.id, subscription.status, priceId)];
                        case 1:
                            _e.sent();
                            return [3 /*break*/, 4];
                        case 2:
                            customerId = typeof subscription.customer === 'string'
                                ? subscription.customer
                                : subscription.customer.id;
                            return [4 /*yield*/, this.syncByCustomerId(customerId, subscription.id, subscription.status, priceId)];
                        case 3:
                            _e.sent();
                            _e.label = 4;
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        StripeService_1.prototype.handleSubscriptionCanceled = function (subscription) {
            return __awaiter(this, void 0, void 0, function () {
                var ownerAccountId, customerId;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            ownerAccountId = (_a = subscription.metadata) === null || _a === void 0 ? void 0 : _a.owner_account_id;
                            if (!ownerAccountId) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.syncSubscriptionToDb(ownerAccountId, subscription.id, 'canceled')];
                        case 1:
                            _b.sent();
                            return [3 /*break*/, 4];
                        case 2:
                            customerId = typeof subscription.customer === 'string'
                                ? subscription.customer
                                : subscription.customer.id;
                            return [4 /*yield*/, this.syncByCustomerId(customerId, subscription.id, 'canceled', null)];
                        case 3:
                            _b.sent();
                            _b.label = 4;
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        StripeService_1.prototype.handlePaymentFailed = function (invoice) {
            return __awaiter(this, void 0, void 0, function () {
                var customerId;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            customerId = typeof invoice.customer === 'string'
                                ? invoice.customer
                                : (_a = invoice.customer) === null || _a === void 0 ? void 0 : _a.id;
                            if (!customerId)
                                return [2 /*return*/];
                            return [4 /*yield*/, this.syncByCustomerId(customerId, null, 'past_due', null)];
                        case 1:
                            _b.sent();
                            this.logger.warn("Payment failed for Stripe customer ".concat(customerId));
                            return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Handle invoice.payment_succeeded — record recurring affiliate commissions (3%).
         * Skips the very first invoice because that is covered by the conversion commission (50%).
         */
        StripeService_1.prototype.handleInvoicePaymentSucceeded = function (invoice) {
            return __awaiter(this, void 0, void 0, function () {
                var inv, rawSubscription, subscriptionId, customerId, admin, ownerAccount, amountDollars, rawPeriodStart, rawPeriodEnd, periodStart, periodEnd, err_2;
                var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                return __generator(this, function (_k) {
                    switch (_k.label) {
                        case 0:
                            inv = invoice;
                            rawSubscription = (_a = inv.subscription) !== null && _a !== void 0 ? _a : (_c = (_b = inv.parent) === null || _b === void 0 ? void 0 : _b.subscription_details) === null || _c === void 0 ? void 0 : _c.subscription;
                            subscriptionId = typeof rawSubscription === 'string'
                                ? rawSubscription
                                : (_d = rawSubscription === null || rawSubscription === void 0 ? void 0 : rawSubscription.id) !== null && _d !== void 0 ? _d : null;
                            if (!subscriptionId || !invoice.id)
                                return [2 /*return*/];
                            customerId = typeof invoice.customer === 'string'
                                ? invoice.customer
                                : (_e = invoice.customer) === null || _e === void 0 ? void 0 : _e.id;
                            if (!customerId)
                                return [2 /*return*/];
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('owner_accounts')
                                    .select('id')
                                    .eq('stripe_customer_id', customerId)
                                    .maybeSingle()];
                        case 1:
                            ownerAccount = (_k.sent()).data;
                            if (!ownerAccount)
                                return [2 /*return*/];
                            amountDollars = ((_f = invoice.amount_paid) !== null && _f !== void 0 ? _f : 0) / 100;
                            rawPeriodStart = (_h = (_g = inv.period_start) !== null && _g !== void 0 ? _g : inv.effective_at) !== null && _h !== void 0 ? _h : null;
                            rawPeriodEnd = (_j = inv.period_end) !== null && _j !== void 0 ? _j : null;
                            periodStart = rawPeriodStart ? new Date(rawPeriodStart * 1000) : new Date();
                            periodEnd = rawPeriodEnd ? new Date(rawPeriodEnd * 1000) : new Date();
                            _k.label = 2;
                        case 2:
                            _k.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, this.affiliatesService.processRecurringCommission(ownerAccount.id, invoice.id, subscriptionId, amountDollars, periodStart, periodEnd)];
                        case 3:
                            _k.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            err_2 = _k.sent();
                            this.logger.error('Failed to process recurring affiliate commission', err_2.message);
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        // ─── DB Sync Helpers ───────────────────────────────────────────────────────
        StripeService_1.prototype.syncSubscriptionToDb = function (ownerAccountId, subscriptionId, status, planId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, update, error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            update = { subscription_status: status };
                            if (subscriptionId)
                                update.stripe_subscription_id = subscriptionId;
                            if (planId !== undefined)
                                update.plan_id = planId;
                            return [4 /*yield*/, admin
                                    .from('owner_accounts')
                                    .update(update)
                                    .eq('id', ownerAccountId)];
                        case 1:
                            error = (_a.sent()).error;
                            if (error) {
                                this.logger.error("Failed to sync subscription for owner ".concat(ownerAccountId), error);
                            }
                            return [2 /*return*/];
                    }
                });
            });
        };
        StripeService_1.prototype.syncByCustomerId = function (stripeCustomerId, subscriptionId, status, planId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, update, error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            update = { subscription_status: status };
                            if (subscriptionId)
                                update.stripe_subscription_id = subscriptionId;
                            if (planId)
                                update.plan_id = planId;
                            return [4 /*yield*/, admin
                                    .from('owner_accounts')
                                    .update(update)
                                    .eq('stripe_customer_id', stripeCustomerId)];
                        case 1:
                            error = (_a.sent()).error;
                            if (error) {
                                this.logger.error("Failed to sync subscription for Stripe customer ".concat(stripeCustomerId), error);
                            }
                            return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Resolves the owner_accounts row for a given auth user ID.
         * Primary path: memberships table (user_id → owner_account_id).
         * Fallback: direct user_id column on owner_accounts.
         */
        StripeService_1.prototype.getOwnerAccountByUserId = function (userId, admin) {
            return __awaiter(this, void 0, void 0, function () {
                var membership, owner_1, owner;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, admin
                                .from('memberships')
                                .select('owner_account_id')
                                .eq('user_id', userId)
                                .limit(1)
                                .maybeSingle()];
                        case 1:
                            membership = (_a.sent()).data;
                            if (!(membership === null || membership === void 0 ? void 0 : membership.owner_account_id)) return [3 /*break*/, 3];
                            return [4 /*yield*/, admin
                                    .from('owner_accounts')
                                    .select('*')
                                    .eq('id', membership.owner_account_id)
                                    .maybeSingle()];
                        case 2:
                            owner_1 = (_a.sent()).data;
                            return [2 /*return*/, owner_1 !== null && owner_1 !== void 0 ? owner_1 : null];
                        case 3: return [4 /*yield*/, admin
                                .from('owner_accounts')
                                .select('*')
                                .eq('primary_owner_id', userId)
                                .maybeSingle()];
                        case 4:
                            owner = (_a.sent()).data;
                            return [2 /*return*/, owner !== null && owner !== void 0 ? owner : null];
                    }
                });
            });
        };
        /**
         * Create (or retrieve) a Stripe Connect Express account for an owner,
         * then return a one-time onboarding URL.
         */
        StripeService_1.prototype.createOwnerConnectOnboarding = function (userId, email) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, owner, connectId, account, accountLink;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getOwnerAccountByUserId(userId, admin)];
                        case 1:
                            owner = _a.sent();
                            if (!owner)
                                throw new Error('Owner account not found');
                            connectId = owner.stripe_connect_id;
                            if (!!connectId) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.stripe.accounts.create({
                                    type: 'express',
                                    email: email,
                                    capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
                                    business_profile: { url: this.connectBusinessUrl },
                                    metadata: { owner_account_id: String(owner.id) },
                                })];
                        case 2:
                            account = _a.sent();
                            connectId = account.id;
                            return [4 /*yield*/, admin
                                    .from('owner_accounts')
                                    .update({ stripe_connect_id: connectId, stripe_connect_status: 'pending' })
                                    .eq('id', owner.id)];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4: return [4 /*yield*/, this.stripe.accountLinks.create({
                                account: connectId,
                                refresh_url: "".concat(this.frontendUrl, "/dashboard/settings?connect=refresh&role=owner"),
                                return_url: "".concat(this.frontendUrl, "/dashboard/settings?connect=success&role=owner"),
                                type: 'account_onboarding',
                            })];
                        case 5:
                            accountLink = _a.sent();
                            return [2 /*return*/, accountLink.url];
                    }
                });
            });
        };
        /**
         * Create (or retrieve) a Stripe Connect Express account for a vendor,
         * then return a one-time onboarding URL.
         */
        StripeService_1.prototype.createVendorConnectOnboarding = function (userId, email) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, vendor, connectId, account, accountLink;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('vendor_accounts')
                                    .select('id, stripe_account_id, stripe_connect_status')
                                    .eq('user_id', userId)
                                    .maybeSingle()];
                        case 1:
                            vendor = (_a.sent()).data;
                            if (!vendor)
                                throw new Error('Vendor account not found');
                            connectId = vendor.stripe_account_id;
                            if (!!connectId) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.stripe.accounts.create({
                                    type: 'express',
                                    email: email,
                                    capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
                                    business_profile: { url: this.connectBusinessUrl },
                                    metadata: { vendor_account_id: vendor.id },
                                })];
                        case 2:
                            account = _a.sent();
                            connectId = account.id;
                            return [4 /*yield*/, admin
                                    .from('vendor_accounts')
                                    .update({ stripe_account_id: connectId, stripe_connect_status: 'pending' })
                                    .eq('id', vendor.id)];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4: return [4 /*yield*/, this.stripe.accountLinks.create({
                                account: connectId,
                                refresh_url: "".concat(this.frontendUrl, "/vendors/dashboard?connect=refresh"),
                                return_url: "".concat(this.frontendUrl, "/vendors/dashboard?connect=success"),
                                type: 'account_onboarding',
                            })];
                        case 5:
                            accountLink = _a.sent();
                            return [2 /*return*/, accountLink.url];
                    }
                });
            });
        };
        /**
         * Get the Connect account status for an owner.
         * If status is pending, does a live Stripe check so we don't need webhooks in dev.
         */
        StripeService_1.prototype.getOwnerConnectStatus = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, owner, status, connectId, account, isActive, err_3;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getOwnerAccountByUserId(userId, admin)];
                        case 1:
                            owner = _c.sent();
                            status = (_a = owner === null || owner === void 0 ? void 0 : owner.stripe_connect_status) !== null && _a !== void 0 ? _a : 'not_connected';
                            connectId = (_b = owner === null || owner === void 0 ? void 0 : owner.stripe_connect_id) !== null && _b !== void 0 ? _b : null;
                            if (!(status === 'pending' && connectId)) return [3 /*break*/, 7];
                            _c.label = 2;
                        case 2:
                            _c.trys.push([2, 6, , 7]);
                            return [4 /*yield*/, this.stripe.accounts.retrieve(connectId)];
                        case 3:
                            account = _c.sent();
                            isActive = account.details_submitted && account.charges_enabled && account.payouts_enabled;
                            if (!isActive) return [3 /*break*/, 5];
                            status = 'active';
                            return [4 /*yield*/, admin.from('owner_accounts').update({ stripe_connect_status: 'active' }).eq('id', owner.id)];
                        case 4:
                            _c.sent();
                            this.logger.log("Owner Connect ".concat(connectId, " auto-upgraded to active via live check"));
                            _c.label = 5;
                        case 5: return [3 /*break*/, 7];
                        case 6:
                            err_3 = _c.sent();
                            this.logger.warn("Live Stripe check failed for owner ".concat(connectId, ": ").concat(err_3.message));
                            return [3 /*break*/, 7];
                        case 7: return [2 /*return*/, { status: status, connectId: connectId }];
                    }
                });
            });
        };
        /**
         * Get the Connect account status for a vendor.
         * If status is pending, does a live Stripe check so we don't need webhooks in dev.
         */
        StripeService_1.prototype.getVendorConnectStatus = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, data, status, connectId, account, isActive, err_4;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('vendor_accounts')
                                    .select('id, stripe_account_id, stripe_connect_status')
                                    .eq('user_id', userId)
                                    .maybeSingle()];
                        case 1:
                            data = (_c.sent()).data;
                            status = (_a = data === null || data === void 0 ? void 0 : data.stripe_connect_status) !== null && _a !== void 0 ? _a : 'not_connected';
                            connectId = (_b = data === null || data === void 0 ? void 0 : data.stripe_account_id) !== null && _b !== void 0 ? _b : null;
                            if (!(status === 'pending' && connectId)) return [3 /*break*/, 7];
                            _c.label = 2;
                        case 2:
                            _c.trys.push([2, 6, , 7]);
                            return [4 /*yield*/, this.stripe.accounts.retrieve(connectId)];
                        case 3:
                            account = _c.sent();
                            isActive = account.details_submitted && account.charges_enabled && account.payouts_enabled;
                            if (!isActive) return [3 /*break*/, 5];
                            status = 'active';
                            return [4 /*yield*/, admin.from('vendor_accounts').update({ stripe_connect_status: 'active' }).eq('id', data.id)];
                        case 4:
                            _c.sent();
                            this.logger.log("Vendor Connect ".concat(connectId, " auto-upgraded to active via live check"));
                            _c.label = 5;
                        case 5: return [3 /*break*/, 7];
                        case 6:
                            err_4 = _c.sent();
                            this.logger.warn("Live Stripe check failed for vendor ".concat(connectId, ": ").concat(err_4.message));
                            return [3 /*break*/, 7];
                        case 7: return [2 /*return*/, { status: status, connectId: connectId }];
                    }
                });
            });
        };
        /**
         * Reset owner Stripe Connect — clears stored ID so a fresh account is created on next attempt.
         */
        StripeService_1.prototype.resetOwnerConnect = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, owner;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getOwnerAccountByUserId(userId, admin)];
                        case 1:
                            owner = _a.sent();
                            if (!owner)
                                throw new Error('Owner account not found');
                            return [4 /*yield*/, admin
                                    .from('owner_accounts')
                                    .update({ stripe_connect_id: null, stripe_connect_status: 'not_connected' })
                                    .eq('id', owner.id)];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { success: true }];
                    }
                });
            });
        };
        /**
         * Reset vendor Stripe Connect — clears stored ID so a fresh account is created on next attempt.
         */
        StripeService_1.prototype.resetVendorConnect = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, vendor;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('vendor_accounts')
                                    .select('id')
                                    .eq('user_id', userId)
                                    .maybeSingle()];
                        case 1:
                            vendor = (_a.sent()).data;
                            if (!vendor)
                                throw new Error('Vendor account not found');
                            return [4 /*yield*/, admin
                                    .from('vendor_accounts')
                                    .update({ stripe_account_id: null, stripe_connect_status: 'not_connected' })
                                    .eq('id', vendor.id)];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { success: true }];
                    }
                });
            });
        };
        // ─── Promoter Stripe Connect ───────────────────────────────────────────────
        /**
         * Create (or retrieve) a Stripe Connect Express account for a promoter,
         * then return a one-time onboarding URL.
         */
        StripeService_1.prototype.createPromoterConnectOnboarding = function (userId, email) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, promoter, connectId, account, accountLink;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('promoter_accounts')
                                    .select('id, stripe_account_id, stripe_connect_status')
                                    .eq('user_id', userId)
                                    .maybeSingle()];
                        case 1:
                            promoter = (_a.sent()).data;
                            if (!promoter)
                                throw new Error('Promoter account not found');
                            connectId = promoter.stripe_account_id;
                            if (!!connectId) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.stripe.accounts.create({
                                    type: 'express',
                                    email: email,
                                    capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
                                    business_profile: { url: this.connectBusinessUrl },
                                    metadata: { promoter_account_id: promoter.id },
                                })];
                        case 2:
                            account = _a.sent();
                            connectId = account.id;
                            return [4 /*yield*/, admin
                                    .from('promoter_accounts')
                                    .update({ stripe_account_id: connectId, stripe_connect_status: 'pending' })
                                    .eq('id', promoter.id)];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4: return [4 /*yield*/, this.stripe.accountLinks.create({
                                account: connectId,
                                refresh_url: "".concat(this.frontendUrl, "/dashboard/promoter?connect=refresh"),
                                return_url: "".concat(this.frontendUrl, "/dashboard/promoter?connect=success"),
                                type: 'account_onboarding',
                            })];
                        case 5:
                            accountLink = _a.sent();
                            return [2 /*return*/, accountLink.url];
                    }
                });
            });
        };
        /**
         * Get the Connect account status for a promoter.
         * If status is pending, does a live Stripe check.
         */
        StripeService_1.prototype.getPromoterConnectStatus = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, data, status, connectId, account, isActive, err_5;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('promoter_accounts')
                                    .select('id, stripe_account_id, stripe_connect_status')
                                    .eq('user_id', userId)
                                    .maybeSingle()];
                        case 1:
                            data = (_c.sent()).data;
                            status = (_a = data === null || data === void 0 ? void 0 : data.stripe_connect_status) !== null && _a !== void 0 ? _a : 'not_connected';
                            connectId = (_b = data === null || data === void 0 ? void 0 : data.stripe_account_id) !== null && _b !== void 0 ? _b : null;
                            if (!(status === 'pending' && connectId)) return [3 /*break*/, 7];
                            _c.label = 2;
                        case 2:
                            _c.trys.push([2, 6, , 7]);
                            return [4 /*yield*/, this.stripe.accounts.retrieve(connectId)];
                        case 3:
                            account = _c.sent();
                            isActive = account.details_submitted && account.charges_enabled && account.payouts_enabled;
                            if (!isActive) return [3 /*break*/, 5];
                            status = 'active';
                            return [4 /*yield*/, admin.from('promoter_accounts').update({ stripe_connect_status: 'active' }).eq('id', data.id)];
                        case 4:
                            _c.sent();
                            this.logger.log("Promoter Connect ".concat(connectId, " auto-upgraded to active via live check"));
                            _c.label = 5;
                        case 5: return [3 /*break*/, 7];
                        case 6:
                            err_5 = _c.sent();
                            this.logger.warn("Live Stripe check failed for promoter ".concat(connectId, ": ").concat(err_5.message));
                            return [3 /*break*/, 7];
                        case 7: return [2 /*return*/, { status: status, connectId: connectId }];
                    }
                });
            });
        };
        /**
         * Reset promoter Stripe Connect — clears stored ID so a fresh account is created on next attempt.
         */
        StripeService_1.prototype.resetPromoterConnect = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, promoter;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('promoter_accounts')
                                    .select('id')
                                    .eq('user_id', userId)
                                    .maybeSingle()];
                        case 1:
                            promoter = (_a.sent()).data;
                            if (!promoter)
                                throw new Error('Promoter account not found');
                            return [4 /*yield*/, admin
                                    .from('promoter_accounts')
                                    .update({ stripe_account_id: null, stripe_connect_status: 'not_connected' })
                                    .eq('id', promoter.id)];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { success: true }];
                    }
                });
            });
        };
        // ─── Artist Stripe Connect ─────────────────────────────────────────────────
        /**
         * Create (or retrieve) a Stripe Connect Express account for an artist,
         * then return a one-time onboarding URL.
         */
        StripeService_1.prototype.createArtistConnectOnboarding = function (userId, email) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, artist, connectId, account, accountLink;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('artist_accounts')
                                    .select('id, stripe_account_id, stripe_connect_status')
                                    .eq('user_id', userId)
                                    .maybeSingle()];
                        case 1:
                            artist = (_a.sent()).data;
                            if (!artist)
                                throw new Error('Artist account not found');
                            connectId = artist.stripe_account_id;
                            if (!!connectId) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.stripe.accounts.create({
                                    type: 'express',
                                    email: email,
                                    capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
                                    business_profile: { url: this.connectBusinessUrl },
                                    metadata: { artist_account_id: artist.id },
                                })];
                        case 2:
                            account = _a.sent();
                            connectId = account.id;
                            return [4 /*yield*/, admin
                                    .from('artist_accounts')
                                    .update({ stripe_account_id: connectId, stripe_connect_status: 'pending' })
                                    .eq('id', artist.id)];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4: return [4 /*yield*/, this.stripe.accountLinks.create({
                                account: connectId,
                                refresh_url: "".concat(this.frontendUrl, "/artist/dashboard?connect=refresh"),
                                return_url: "".concat(this.frontendUrl, "/artist/dashboard?connect=success"),
                                type: 'account_onboarding',
                            })];
                        case 5:
                            accountLink = _a.sent();
                            return [2 /*return*/, accountLink.url];
                    }
                });
            });
        };
        /**
         * Get the Connect account status for an artist.
         * If status is pending, does a live Stripe check so we don't need webhooks in dev.
         */
        StripeService_1.prototype.getArtistConnectStatus = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, data, status, connectId, account, isActive, err_6;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('artist_accounts')
                                    .select('id, stripe_account_id, stripe_connect_status')
                                    .eq('user_id', userId)
                                    .maybeSingle()];
                        case 1:
                            data = (_c.sent()).data;
                            status = (_a = data === null || data === void 0 ? void 0 : data.stripe_connect_status) !== null && _a !== void 0 ? _a : 'not_connected';
                            connectId = (_b = data === null || data === void 0 ? void 0 : data.stripe_account_id) !== null && _b !== void 0 ? _b : null;
                            if (!(status === 'pending' && connectId)) return [3 /*break*/, 7];
                            _c.label = 2;
                        case 2:
                            _c.trys.push([2, 6, , 7]);
                            return [4 /*yield*/, this.stripe.accounts.retrieve(connectId)];
                        case 3:
                            account = _c.sent();
                            isActive = account.details_submitted && account.charges_enabled && account.payouts_enabled;
                            if (!isActive) return [3 /*break*/, 5];
                            status = 'active';
                            return [4 /*yield*/, admin.from('artist_accounts').update({ stripe_connect_status: 'active' }).eq('id', data.id)];
                        case 4:
                            _c.sent();
                            this.logger.log("Artist Connect ".concat(connectId, " auto-upgraded to active via live check"));
                            _c.label = 5;
                        case 5: return [3 /*break*/, 7];
                        case 6:
                            err_6 = _c.sent();
                            this.logger.warn("Live Stripe check failed for artist ".concat(connectId, ": ").concat(err_6.message));
                            return [3 /*break*/, 7];
                        case 7: return [2 /*return*/, { status: status, connectId: connectId }];
                    }
                });
            });
        };
        /**
         * Reset artist Stripe Connect — clears stored ID so a fresh account is created on next attempt.
         */
        StripeService_1.prototype.resetArtistConnect = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, artist;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('artist_accounts')
                                    .select('id')
                                    .eq('user_id', userId)
                                    .maybeSingle()];
                        case 1:
                            artist = (_a.sent()).data;
                            if (!artist)
                                throw new Error('Artist account not found');
                            return [4 /*yield*/, admin
                                    .from('artist_accounts')
                                    .update({ stripe_account_id: null, stripe_connect_status: 'not_connected' })
                                    .eq('id', artist.id)];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { success: true }];
                    }
                });
            });
        };
        /**
         * Charge a client and route funds to an owner's Connect account.
         * DoVenueSuite takes 5% as application_fee_amount.
         *
         * Flow: Client card → Stripe → DoVenueSuite takes 5% → owner receives the rest
         * Returns a PaymentIntent client_secret for the frontend to complete payment.
         */
        StripeService_1.prototype.createClientPaymentIntent = function (amountCents, ownerUserId, description, invoiceId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, owner, feeCents, paymentIntent;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getOwnerAccountByUserId(ownerUserId, admin)];
                        case 1:
                            owner = _a.sent();
                            if (!(owner === null || owner === void 0 ? void 0 : owner.stripe_connect_id) || owner.stripe_connect_status !== 'active') {
                                throw new Error('Owner has not completed Stripe Connect onboarding');
                            }
                            feeCents = Math.round(amountCents * this.APP_FEE_RATE);
                            return [4 /*yield*/, this.stripe.paymentIntents.create({
                                    amount: amountCents,
                                    currency: 'usd',
                                    application_fee_amount: feeCents,
                                    transfer_data: { destination: owner.stripe_connect_id },
                                    description: description,
                                    metadata: __assign({ owner_account_id: String(owner.id) }, (invoiceId ? { invoice_id: invoiceId } : {})),
                                })];
                        case 2:
                            paymentIntent = _a.sent();
                            // Record in stripe_payments ledger
                            return [4 /*yield*/, admin.from('stripe_payments').insert({
                                    type: 'client_to_owner',
                                    amount_cents: amountCents,
                                    fee_cents: feeCents,
                                    net_cents: amountCents - feeCents,
                                    stripe_payment_intent_id: paymentIntent.id,
                                    owner_account_id: owner.id,
                                    description: description,
                                    status: 'pending',
                                })];
                        case 3:
                            // Record in stripe_payments ledger
                            _a.sent();
                            return [2 /*return*/, {
                                    clientSecret: paymentIntent.client_secret,
                                    paymentIntentId: paymentIntent.id,
                                    feeCents: feeCents,
                                }];
                    }
                });
            });
        };
        /**
         * Transfer funds from owner to vendor for a completed booking.
         * DoVenueSuite takes 5% as fee (paid by vendor — deducted from transfer).
         *
         * Flow: Owner's balance → transfer to vendor → DoVenueSuite keeps 5%
         */
        StripeService_1.prototype.payVendor = function (amountCents, ownerUserId, vendorAccountId, vendorBookingId, description) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, owner, vendor, feeCents, netCents, transfer;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getOwnerAccountByUserId(ownerUserId, admin)];
                        case 1:
                            owner = _b.sent();
                            return [4 /*yield*/, admin
                                    .from('vendor_accounts')
                                    .select('stripe_account_id, stripe_connect_status')
                                    .eq('id', vendorAccountId)
                                    .maybeSingle()];
                        case 2:
                            vendor = (_b.sent()).data;
                            if (!(vendor === null || vendor === void 0 ? void 0 : vendor.stripe_account_id) || vendor.stripe_connect_status !== 'active') {
                                throw new Error('Vendor has not completed Stripe Connect onboarding');
                            }
                            feeCents = Math.round(amountCents * this.APP_FEE_RATE);
                            netCents = amountCents - feeCents;
                            return [4 /*yield*/, this.stripe.transfers.create({
                                    amount: netCents,
                                    currency: 'usd',
                                    destination: vendor.stripe_account_id,
                                    description: description,
                                    metadata: {
                                        owner_account_id: owner ? String(owner.id) : '',
                                        vendor_account_id: vendorAccountId,
                                        vendor_booking_id: vendorBookingId,
                                    },
                                })];
                        case 3:
                            transfer = _b.sent();
                            return [4 /*yield*/, admin.from('stripe_payments').insert({
                                    amount_cents: amountCents,
                                    fee_cents: feeCents,
                                    net_cents: netCents,
                                    stripe_transfer_id: transfer.id,
                                    owner_account_id: (_a = owner === null || owner === void 0 ? void 0 : owner.id) !== null && _a !== void 0 ? _a : null,
                                    vendor_account_id: vendorAccountId,
                                    vendor_booking_id: vendorBookingId,
                                    description: description,
                                    status: 'succeeded',
                                })];
                        case 4:
                            _b.sent();
                            this.logger.log("Vendor payout ".concat(transfer.id, ": $").concat((netCents / 100).toFixed(2), " to ").concat(vendor.stripe_account_id));
                            return [2 /*return*/, { transferId: transfer.id, feeCents: feeCents, netCents: netCents }];
                    }
                });
            });
        };
        /**
         * Generate a client-facing payment page URL for an invoice.
         * Returns our own frontend URL (/pay/invoice/:token) so the client can
         * choose how much to pay (deposit, full balance, or custom amount).
         */
        StripeService_1.prototype.createInvoicePaymentLink = function (invoiceId, _amountCents, _description, ownerUserId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, inv;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('invoices')
                                    .select('public_token')
                                    .eq('id', invoiceId)
                                    .maybeSingle()];
                        case 1:
                            inv = (_a.sent()).data;
                            if (!(inv === null || inv === void 0 ? void 0 : inv.public_token)) {
                                throw new Error('Invoice not found or missing public token');
                            }
                            return [2 /*return*/, "".concat(this.frontendUrl, "/pay/invoice/").concat(inv.public_token)];
                    }
                });
            });
        };
        /**
         * Webhook fallback for the public invoice pay page.
         * Called after Stripe redirects back with ?paid=true — verifies payment
         * status directly with Stripe and marks the invoice paid if confirmed.
         */
        StripeService_1.prototype.verifyPublicInvoicePayment = function (token, sessionId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, invoice, session;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('invoices')
                                    .select('id, status, total_amount, amount_paid')
                                    .eq('public_token', token)
                                    .maybeSingle()];
                        case 1:
                            invoice = (_c.sent()).data;
                            if (!invoice)
                                throw new Error('Invoice not found');
                            if (invoice.status === 'paid')
                                return [2 /*return*/, { status: 'paid', paid: true }];
                            return [4 /*yield*/, this.stripe.checkout.sessions.retrieve(sessionId)];
                        case 2:
                            session = _c.sent();
                            if (!session || session.payment_status !== 'paid')
                                return [2 /*return*/, { status: invoice.status, paid: false }];
                            // Confirm the session actually belongs to this invoice
                            if (((_a = session.metadata) === null || _a === void 0 ? void 0 : _a.invoice_id) !== invoice.id)
                                return [2 /*return*/, { status: invoice.status, paid: false }];
                            return [4 /*yield*/, this.markInvoicePaid(invoice.id, (_b = session.amount_total) !== null && _b !== void 0 ? _b : 0)];
                        case 3:
                            _c.sent();
                            this.logger.log("Invoice ".concat(invoice.id, " verified and marked paid via session ").concat(session.id, " (webhook fallback)"));
                            return [2 /*return*/, { status: 'paid', paid: true }];
                    }
                });
            });
        };
        /**
         * Webhook fallback for the authenticated client portal.
         * Called after Stripe redirects back with ?paid=true&iid=<invoiceId>.
         * Queries Stripe directly by client_reference_id and marks the invoice paid if confirmed.
         */
        StripeService_1.prototype.verifyInvoicePaymentById = function (invoiceId, sessionId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, invoice, session;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('invoices')
                                    .select('id, status')
                                    .eq('id', invoiceId)
                                    .maybeSingle()];
                        case 1:
                            invoice = (_c.sent()).data;
                            if (!invoice)
                                throw new Error('Invoice not found');
                            if (invoice.status === 'paid')
                                return [2 /*return*/, { status: 'paid', paid: true }];
                            return [4 /*yield*/, this.stripe.checkout.sessions.retrieve(sessionId)];
                        case 2:
                            session = _c.sent();
                            if (!session || session.payment_status !== 'paid')
                                return [2 /*return*/, { status: invoice.status, paid: false }];
                            // Confirm the session actually belongs to this invoice
                            if (((_a = session.metadata) === null || _a === void 0 ? void 0 : _a.invoice_id) !== invoiceId)
                                return [2 /*return*/, { status: invoice.status, paid: false }];
                            return [4 /*yield*/, this.markInvoicePaid(invoiceId, (_b = session.amount_total) !== null && _b !== void 0 ? _b : 0)];
                        case 3:
                            _c.sent();
                            this.logger.log("Client portal invoice ".concat(invoiceId, " verified and marked paid via session ").concat(session.id, " (webhook fallback)"));
                            return [2 /*return*/, { status: 'paid', paid: true }];
                    }
                });
            });
        };
        /**
         * Public: fetch a safe subset of invoice data for the client payment page.
         */
        StripeService_1.prototype.getPublicInvoice = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('invoices')
                                    .select("\n        id, invoice_number, client_name, client_email,\n        total_amount, amount_paid, amount_due, status,\n        issue_date, due_date, notes, terms,\n        deposit_percentage, deposit_due_days_before, final_payment_due_days_before,\n        event:event!event_id(id, name, date),\n        items:invoice_items(id, description, quantity, unit_price, amount, item_type)\n      ")
                                    .eq('public_token', token)
                                    .maybeSingle()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error || !data)
                                throw new Error('Invoice not found');
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        /**
         * Public: create a Stripe Checkout session for a specific payment amount.
         * Used by the client-facing /pay/invoice/[token] page.
         */
        StripeService_1.prototype.createPublicInvoiceCheckout = function (token, amountCents) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, inv, error, maxCents, safeCents, owner, data, hasConnect, description, sessionParams, feeCents, session;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('invoices')
                                    .select('id, invoice_number, amount_due, total_amount, owner_id')
                                    .eq('public_token', token)
                                    .maybeSingle()];
                        case 1:
                            _a = _b.sent(), inv = _a.data, error = _a.error;
                            if (error || !inv)
                                throw new Error('Invoice not found');
                            maxCents = Math.round(Number(inv.amount_due) * 100);
                            safeCents = Math.min(amountCents, maxCents);
                            if (safeCents < 50)
                                throw new Error('Minimum payment is $0.50');
                            owner = null;
                            if (!inv.owner_id) return [3 /*break*/, 3];
                            return [4 /*yield*/, admin.from('owner_accounts').select('stripe_connect_id, stripe_connect_status').eq('id', inv.owner_id).maybeSingle()];
                        case 2:
                            data = (_b.sent()).data;
                            owner = data;
                            _b.label = 3;
                        case 3:
                            hasConnect = (owner === null || owner === void 0 ? void 0 : owner.stripe_connect_id) && (owner === null || owner === void 0 ? void 0 : owner.stripe_connect_status) === 'active';
                            description = "Invoice ".concat(inv.invoice_number, " \u2014 $").concat((safeCents / 100).toFixed(2));
                            sessionParams = {
                                mode: 'payment',
                                payment_method_types: ['card'],
                                line_items: [{
                                        price_data: {
                                            currency: 'usd',
                                            unit_amount: safeCents,
                                            product_data: { name: description },
                                        },
                                        quantity: 1,
                                    }],
                                success_url: "".concat(this.frontendUrl, "/pay/invoice/").concat(token, "?paid=true&sid={CHECKOUT_SESSION_ID}"),
                                cancel_url: "".concat(this.frontendUrl, "/pay/invoice/").concat(token, "?canceled=true"),
                                metadata: { invoice_id: inv.id },
                            };
                            if (hasConnect) {
                                feeCents = Math.round(safeCents * this.APP_FEE_RATE);
                                sessionParams.payment_intent_data = {
                                    application_fee_amount: feeCents,
                                    transfer_data: { destination: owner.stripe_connect_id },
                                };
                            }
                            return [4 /*yield*/, this.stripe.checkout.sessions.create(sessionParams)];
                        case 4:
                            session = _b.sent();
                            this.logger.log("Created public checkout for invoice ".concat(inv.id, " (").concat(safeCents, " cents): ").concat(session.url));
                            return [2 /*return*/, session.url];
                    }
                });
            });
        };
        /**
         * Handle account.updated webhook — mark Connect account active when onboarding complete.
         */
        StripeService_1.prototype.handleConnectAccountUpdated = function (account) {
            return __awaiter(this, void 0, void 0, function () {
                var isActive, newStatus, admin;
                var _a, _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            isActive = account.details_submitted &&
                                account.charges_enabled &&
                                account.payouts_enabled;
                            newStatus = isActive ? 'active' : 'pending';
                            admin = this.supabaseService.getAdminClient();
                            if (!((_a = account.metadata) === null || _a === void 0 ? void 0 : _a.owner_account_id)) return [3 /*break*/, 2];
                            return [4 /*yield*/, admin
                                    .from('owner_accounts')
                                    .update({ stripe_connect_status: newStatus })
                                    .eq('id', account.metadata.owner_account_id)];
                        case 1:
                            _e.sent();
                            this.logger.log("Owner Connect ".concat(account.id, " \u2192 ").concat(newStatus));
                            return [2 /*return*/];
                        case 2:
                            if (!((_b = account.metadata) === null || _b === void 0 ? void 0 : _b.vendor_account_id)) return [3 /*break*/, 4];
                            return [4 /*yield*/, admin
                                    .from('vendor_accounts')
                                    .update({ stripe_connect_status: newStatus })
                                    .eq('id', account.metadata.vendor_account_id)];
                        case 3:
                            _e.sent();
                            this.logger.log("Vendor Connect ".concat(account.id, " \u2192 ").concat(newStatus));
                            return [2 /*return*/];
                        case 4:
                            if (!((_c = account.metadata) === null || _c === void 0 ? void 0 : _c.promoter_account_id)) return [3 /*break*/, 6];
                            return [4 /*yield*/, admin
                                    .from('promoter_accounts')
                                    .update({ stripe_connect_status: newStatus })
                                    .eq('id', account.metadata.promoter_account_id)];
                        case 5:
                            _e.sent();
                            this.logger.log("Promoter Connect ".concat(account.id, " \u2192 ").concat(newStatus));
                            return [2 /*return*/];
                        case 6:
                            if (!((_d = account.metadata) === null || _d === void 0 ? void 0 : _d.artist_account_id)) return [3 /*break*/, 8];
                            return [4 /*yield*/, admin
                                    .from('artist_accounts')
                                    .update({ stripe_connect_status: newStatus })
                                    .eq('id', account.metadata.artist_account_id)];
                        case 7:
                            _e.sent();
                            this.logger.log("Artist Connect ".concat(account.id, " \u2192 ").concat(newStatus));
                            return [2 /*return*/];
                        case 8: 
                        // Fallback: match by stripe_account_id / stripe_connect_id
                        return [4 /*yield*/, admin
                                .from('owner_accounts')
                                .update({ stripe_connect_status: newStatus })
                                .eq('stripe_connect_id', account.id)];
                        case 9:
                            // Fallback: match by stripe_account_id / stripe_connect_id
                            _e.sent();
                            return [4 /*yield*/, admin
                                    .from('vendor_accounts')
                                    .update({ stripe_connect_status: newStatus })
                                    .eq('stripe_account_id', account.id)];
                        case 10:
                            _e.sent();
                            return [4 /*yield*/, admin
                                    .from('promoter_accounts')
                                    .update({ stripe_connect_status: newStatus })
                                    .eq('stripe_account_id', account.id)];
                        case 11:
                            _e.sent();
                            return [4 /*yield*/, admin
                                    .from('artist_accounts')
                                    .update({ stripe_connect_status: newStatus })
                                    .eq('stripe_account_id', account.id)];
                        case 12:
                            _e.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        return StripeService_1;
    }());
    __setFunctionName(_classThis, "StripeService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        StripeService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return StripeService = _classThis;
}();
exports.StripeService = StripeService;
