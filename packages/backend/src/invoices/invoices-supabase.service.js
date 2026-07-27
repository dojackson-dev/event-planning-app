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
exports.InvoicesService = void 0;
var common_1 = require("@nestjs/common");
var crypto_1 = require("crypto");
var InvoicesService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var InvoicesService = _classThis = /** @class */ (function () {
        function InvoicesService_1(supabaseService, smsNotifications, mailService) {
            this.supabaseService = supabaseService;
            this.smsNotifications = smsNotifications;
            this.mailService = mailService;
            this.logger = new common_1.Logger(InvoicesService.name);
        }
        /**
         * Look up the client phone number via the invoice's linked booking or intake form.
         * Returns null if neither is linked or no phone is on file.
         */
        InvoicesService_1.prototype.lookupClientPhone = function (supabase, invoice) {
            return __awaiter(this, void 0, void 0, function () {
                var booking, phone, form;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (invoice.client_phone)
                                return [2 /*return*/, invoice.client_phone];
                            if (!invoice.booking_id) return [3 /*break*/, 2];
                            return [4 /*yield*/, supabase
                                    .from('event')
                                    .select('contact_phone')
                                    .eq('id', invoice.booking_id)
                                    .single()];
                        case 1:
                            booking = (_c.sent()).data;
                            phone = (_a = booking === null || booking === void 0 ? void 0 : booking.contact_phone) !== null && _a !== void 0 ? _a : null;
                            if (phone)
                                return [2 /*return*/, phone];
                            _c.label = 2;
                        case 2:
                            if (!invoice.intake_form_id) return [3 /*break*/, 4];
                            return [4 /*yield*/, supabase
                                    .from('intake_forms')
                                    .select('contact_phone')
                                    .eq('id', invoice.intake_form_id)
                                    .single()];
                        case 3:
                            form = (_c.sent()).data;
                            return [2 /*return*/, (_b = form === null || form === void 0 ? void 0 : form.contact_phone) !== null && _b !== void 0 ? _b : null];
                        case 4: return [2 /*return*/, null];
                    }
                });
            });
        };
        InvoicesService_1.prototype.calculateInvoiceTotals = function (items, taxRate, discountAmount) {
            // Only revenue items count toward the client-facing invoice total
            var revenueItems = items.filter(function (i) { return !i.item_type || i.item_type === 'revenue'; });
            var subtotal = revenueItems.reduce(function (sum, item) { return sum + (Number(item.amount) || 0); }, 0);
            var taxAmount = subtotal * (taxRate / 100);
            var totalAmount = subtotal + taxAmount - discountAmount;
            var amountDue = totalAmount;
            return { subtotal: subtotal, taxAmount: taxAmount, totalAmount: totalAmount, amountDue: amountDue };
        };
        InvoicesService_1.prototype.calculateItemAmounts = function (item) {
            var quantity = Number(item.quantity) || 1;
            var unitPrice = Number(item.unit_price) || 0;
            var subtotal = quantity * unitPrice;
            var discountAmount = 0;
            if (item.discount_type === 'percentage') {
                discountAmount = subtotal * (Number(item.discount_value) / 100);
            }
            else if (item.discount_type === 'fixed') {
                discountAmount = Number(item.discount_value) || 0;
            }
            var amount = subtotal - discountAmount;
            return { subtotal: subtotal, discountAmount: discountAmount, amount: amount };
        };
        InvoicesService_1.prototype.findAll = function (supabase, userId) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error, err_1;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, supabase
                                    .from('invoices')
                                    .select("\n          *,\n          event!event_id(id, name, date),\n          intake_form:intake_forms(*),\n          items:invoice_items(*)\n        ")
                                    .eq('owner_id', userId)
                                    .order('created_at', { ascending: false })];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error) {
                                console.error('InvoicesService.findAll error:', error);
                                return [2 /*return*/, []];
                            }
                            return [2 /*return*/, data || []];
                        case 2:
                            err_1 = _b.sent();
                            console.error('InvoicesService.findAll unexpected error:', err_1);
                            return [2 /*return*/, []];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        InvoicesService_1.prototype.findByOwner = function (supabase, userId, ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error, err_2;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, supabase
                                    .from('invoices')
                                    .select("\n          *,\n          event!event_id(id, name, date),\n          intake_form:intake_forms(*),\n          items:invoice_items(*)\n        ")
                                    .eq('owner_id', ownerId)
                                    .order('created_at', { ascending: false })];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error) {
                                console.error('InvoicesService.findByOwner error:', error);
                                return [2 /*return*/, []];
                            }
                            return [2 /*return*/, data || []];
                        case 2:
                            err_2 = _b.sent();
                            console.error('InvoicesService.findByOwner unexpected error:', err_2);
                            return [2 /*return*/, []];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        InvoicesService_1.prototype.findByIntakeForm = function (supabase, userId, intakeFormId) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error, err_3;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, supabase
                                    .from('invoices')
                                    .select("\n          *,\n          event!event_id(id, name, date),\n          intake_form:intake_forms(*),\n          items:invoice_items(*)\n        ")
                                    .eq('intake_form_id', intakeFormId)
                                    .order('created_at', { ascending: false })];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error) {
                                console.error('InvoicesService.findByIntakeForm error:', error);
                                return [2 /*return*/, []];
                            }
                            return [2 /*return*/, data || []];
                        case 2:
                            err_3 = _b.sent();
                            console.error('InvoicesService.findByIntakeForm unexpected error:', err_3);
                            return [2 /*return*/, []];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        InvoicesService_1.prototype.findOne = function (supabase, userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('invoices')
                                .select("\n        *,\nevent!event_id(id, name, date),\n        intake_form:intake_forms(*),\n        items:invoice_items(*)\n      ")
                                .eq('id', id)
                                .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.NotFoundException('Invoice not found');
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        InvoicesService_1.prototype.findInvoiceItems = function (supabase, userId, invoiceId) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('invoice_items')
                                .select('*')
                                .eq('invoice_id', invoiceId)
                                .order('sort_order')];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data || []];
                    }
                });
            });
        };
        /** Check whether the owner (by userId) has an active Stripe Connect account */
        InvoicesService_1.prototype.isStripeConnected = function (ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var adminClient, directOwner, membership, ownerById;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            adminClient = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, adminClient
                                    .from('owner_accounts')
                                    .select('stripe_connect_id, stripe_connect_status')
                                    .eq('primary_owner_id', ownerId)
                                    .maybeSingle()];
                        case 1:
                            directOwner = (_a.sent()).data;
                            if (directOwner) {
                                return [2 /*return*/, !!(directOwner.stripe_connect_id && directOwner.stripe_connect_status === 'active')];
                            }
                            return [4 /*yield*/, adminClient
                                    .from('memberships')
                                    .select('owner_account_id')
                                    .eq('user_id', ownerId)
                                    .eq('role', 'owner')
                                    .maybeSingle()];
                        case 2:
                            membership = (_a.sent()).data;
                            if (!(membership === null || membership === void 0 ? void 0 : membership.owner_account_id)) return [3 /*break*/, 4];
                            return [4 /*yield*/, adminClient
                                    .from('owner_accounts')
                                    .select('stripe_connect_id, stripe_connect_status')
                                    .eq('id', membership.owner_account_id)
                                    .maybeSingle()];
                        case 3:
                            ownerById = (_a.sent()).data;
                            return [2 /*return*/, !!((ownerById === null || ownerById === void 0 ? void 0 : ownerById.stripe_connect_id) && ownerById.stripe_connect_status === 'active')];
                        case 4: return [2 /*return*/, false];
                    }
                });
            });
        };
        InvoicesService_1.prototype.create = function (supabase, userId, invoiceData, items) {
            return __awaiter(this, void 0, void 0, function () {
                var ownerId, adminClient, ownerUser, authData, insertError, maxInvoice, nextNumber, match, invoiceNumber, _a, subtotal, taxAmount, totalAmount, amountDue, insertPayload, clientPhone, eventId, optionalColumns, data, error, _i, optionalColumns_1, col, invoice, createdItems, _b, subtotal_1, taxAmount_1, totalAmount_1, amountDue_1, _c, updatedInvoice, updateError, finalInvoice;
                var _d, _e, _f;
                var _g, _h;
                return __generator(this, function (_j) {
                    switch (_j.label) {
                        case 0:
                            ownerId = invoiceData.owner_id || userId;
                            adminClient = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, adminClient
                                    .from('users')
                                    .select('id')
                                    .eq('id', ownerId)
                                    .maybeSingle()];
                        case 1:
                            ownerUser = (_j.sent()).data;
                            if (!!ownerUser) return [3 /*break*/, 5];
                            return [4 /*yield*/, adminClient.auth.admin.getUserById(ownerId)];
                        case 2:
                            authData = (_j.sent()).data;
                            if (!(authData === null || authData === void 0 ? void 0 : authData.user)) return [3 /*break*/, 4];
                            return [4 /*yield*/, adminClient
                                    .from('users')
                                    .insert({
                                    id: ownerId,
                                    email: authData.user.email,
                                    role: 'owner',
                                    status: 'active',
                                    first_name: ((_g = authData.user.user_metadata) === null || _g === void 0 ? void 0 : _g.first_name) || '',
                                    last_name: ((_h = authData.user.user_metadata) === null || _h === void 0 ? void 0 : _h.last_name) || '',
                                })];
                        case 3:
                            insertError = (_j.sent()).error;
                            if (insertError) {
                                console.error('Failed to create user record:', insertError);
                                throw new common_1.BadRequestException("Cannot create invoice: user record missing. ".concat(insertError.message));
                            }
                            return [3 /*break*/, 5];
                        case 4: throw new common_1.BadRequestException("Cannot create invoice: owner user ID ".concat(ownerId, " not found."));
                        case 5: return [4 /*yield*/, adminClient
                                .from('invoices')
                                .select('invoice_number')
                                .order('created_at', { ascending: false })
                                .limit(1)
                                .maybeSingle()];
                        case 6:
                            maxInvoice = (_j.sent()).data;
                            nextNumber = 1;
                            if (maxInvoice === null || maxInvoice === void 0 ? void 0 : maxInvoice.invoice_number) {
                                match = maxInvoice.invoice_number.match(/INV-\d{4}-(\d+)/);
                                if (match) {
                                    nextNumber = parseInt(match[1], 10) + 1;
                                }
                            }
                            invoiceNumber = "INV-".concat(new Date().getFullYear(), "-").concat(String(nextNumber).padStart(5, '0'));
                            _a = this.calculateInvoiceTotals(items || [], Number(invoiceData.tax_rate) || 0, Number(invoiceData.discount_amount) || 0), subtotal = _a.subtotal, taxAmount = _a.taxAmount, totalAmount = _a.totalAmount, amountDue = _a.amountDue;
                            insertPayload = {
                                invoice_number: invoiceNumber,
                                owner_id: ownerId,
                                created_by: userId,
                                booking_id: invoiceData.booking_id || null,
                                intake_form_id: invoiceData.intake_form_id || null,
                                client_name: invoiceData.client_name || null,
                                subtotal: subtotal,
                                tax_rate: Number(invoiceData.tax_rate) || 0,
                                tax_amount: taxAmount,
                                discount_amount: Number(invoiceData.discount_amount) || 0,
                                total_amount: totalAmount,
                                amount_paid: Number(invoiceData.amount_paid) || 0,
                                amount_due: amountDue,
                                status: invoiceData.status || 'draft',
                                issue_date: invoiceData.issue_date,
                                due_date: invoiceData.due_date,
                                notes: invoiceData.notes || null,
                                terms: invoiceData.terms || null,
                            };
                            clientPhone = invoiceData.client_phone;
                            if (clientPhone)
                                insertPayload.client_phone = clientPhone;
                            eventId = invoiceData.event_id;
                            if (eventId)
                                insertPayload.event_id = eventId;
                            if (invoiceData.deposit_percentage != null)
                                insertPayload.deposit_percentage = Number(invoiceData.deposit_percentage);
                            if (invoiceData.deposit_due_days_before != null)
                                insertPayload.deposit_due_days_before = Number(invoiceData.deposit_due_days_before);
                            if (invoiceData.final_payment_due_days_before != null)
                                insertPayload.final_payment_due_days_before = Number(invoiceData.final_payment_due_days_before);
                            // public_token has a DB default (gen_random_uuid()) — only include if column exists
                            insertPayload.public_token = (0, crypto_1.randomUUID)();
                            optionalColumns = ['client_phone', 'event_id', 'deposit_percentage', 'deposit_due_days_before', 'final_payment_due_days_before', 'public_token'];
                            return [4 /*yield*/, adminClient.from('invoices').insert(insertPayload).select().single()];
                        case 7:
                            (_d = _j.sent(), data = _d.data, error = _d.error);
                            if (!((error === null || error === void 0 ? void 0 : error.code) === 'PGRST204')) return [3 /*break*/, 9];
                            this.logger.warn("Invoice insert PGRST204 (column not found): ".concat(error.message, " \u2014 retrying without optional columns"));
                            for (_i = 0, optionalColumns_1 = optionalColumns; _i < optionalColumns_1.length; _i++) {
                                col = optionalColumns_1[_i];
                                delete insertPayload[col];
                            }
                            return [4 /*yield*/, adminClient.from('invoices').insert(insertPayload).select().single()];
                        case 8:
                            (_e = _j.sent(), data = _e.data, error = _e.error);
                            _j.label = 9;
                        case 9:
                            if (!((error === null || error === void 0 ? void 0 : error.code) === '23503' && insertPayload.event_id)) return [3 /*break*/, 11];
                            this.logger.warn("event_id ".concat(insertPayload.event_id, " failed FK check \u2014 inserting invoice without event_id"));
                            delete insertPayload.event_id;
                            return [4 /*yield*/, adminClient.from('invoices').insert(insertPayload).select().single()];
                        case 10:
                            (_f = _j.sent(), data = _f.data, error = _f.error);
                            _j.label = 11;
                        case 11:
                            if (error) {
                                console.error('Invoice insert failed:', error);
                                this.logger.error('Invoice insert failed', { code: error.code, message: error.message, details: error.details, hint: error.hint });
                                throw new common_1.InternalServerErrorException("Failed to create invoice: ".concat(error.message));
                            }
                            if (!data) {
                                throw new common_1.InternalServerErrorException('Failed to create invoice: no data returned');
                            }
                            invoice = data;
                            if (!(items && items.length > 0)) return [3 /*break*/, 15];
                            return [4 /*yield*/, this.createInvoiceItems(supabase, userId, invoice.id, items)];
                        case 12:
                            createdItems = _j.sent();
                            _b = this.calculateInvoiceTotals(createdItems, Number(invoiceData.tax_rate) || 0, Number(invoiceData.discount_amount) || 0), subtotal_1 = _b.subtotal, taxAmount_1 = _b.taxAmount, totalAmount_1 = _b.totalAmount, amountDue_1 = _b.amountDue;
                            return [4 /*yield*/, supabase
                                    .from('invoices')
                                    .update({
                                    subtotal: subtotal_1,
                                    tax_amount: taxAmount_1,
                                    total_amount: totalAmount_1,
                                    amount_due: amountDue_1,
                                })
                                    .eq('id', invoice.id)
                                    .select("\n          *,\n          event!event_id(id, name, date),\n          intake_form:intake_forms(*),\n          items:invoice_items(*)\n        ")
                                    .single()];
                        case 13:
                            _c = _j.sent(), updatedInvoice = _c.data, updateError = _c.error;
                            if (updateError)
                                throw updateError;
                            finalInvoice = updatedInvoice;
                            return [4 /*yield*/, this.sendInvoiceNotifications(supabase, finalInvoice).catch(function () { })];
                        case 14:
                            _j.sent();
                            return [2 /*return*/, finalInvoice];
                        case 15: return [4 /*yield*/, this.sendInvoiceNotifications(supabase, invoice).catch(function () { })];
                        case 16:
                            _j.sent();
                            return [2 /*return*/, invoice];
                    }
                });
            });
        };
        /**
         * Send SMS + email to the client when an invoice is created.
         * Looks up client contact info from the linked intake form or booking.
         * All errors are swallowed so notifications never break invoice creation.
         */
        InvoicesService_1.prototype.sendInvoiceNotifications = function (supabase, invoice) {
            return __awaiter(this, void 0, void 0, function () {
                var frontendUrl, invoiceUrl, clientName, clientPhone, clientEmail, form, form, booking;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            frontendUrl = process.env.FRONTEND_URL || 'https://dovenuesuite.com';
                            invoiceUrl = "".concat(frontendUrl, "/client-portal/invoices");
                            clientName = invoice.client_name || 'Valued Client';
                            clientPhone = null;
                            clientEmail = null;
                            if (!invoice.intake_form) return [3 /*break*/, 1];
                            form = invoice.intake_form;
                            clientName = form.contact_name || clientName;
                            clientPhone = form.contact_phone || null;
                            clientEmail = form.contact_email || null;
                            return [3 /*break*/, 3];
                        case 1:
                            if (!invoice.intake_form_id) return [3 /*break*/, 3];
                            return [4 /*yield*/, supabase
                                    .from('intake_forms')
                                    .select('contact_name, contact_phone, contact_email')
                                    .eq('id', invoice.intake_form_id)
                                    .single()];
                        case 2:
                            form = (_a.sent()).data;
                            if (form) {
                                clientName = form.contact_name || clientName;
                                clientPhone = form.contact_phone || null;
                                clientEmail = form.contact_email || null;
                            }
                            _a.label = 3;
                        case 3:
                            if (!(!clientPhone && invoice.booking_id)) return [3 /*break*/, 5];
                            return [4 /*yield*/, supabase
                                    .from('event')
                                    .select('contact_name, contact_phone, contact_email')
                                    .eq('id', invoice.booking_id)
                                    .single()];
                        case 4:
                            booking = (_a.sent()).data;
                            if (booking) {
                                clientName = booking.contact_name || clientName;
                                clientPhone = booking.contact_phone || null;
                                clientEmail = booking.contact_email || null;
                            }
                            _a.label = 5;
                        case 5: 
                        // SMS
                        return [4 /*yield*/, this.smsNotifications.invoiceSent(clientPhone, clientName, invoice.invoice_number, invoice.total_amount, invoiceUrl)];
                        case 6:
                            // SMS
                            _a.sent();
                            if (!clientEmail) return [3 /*break*/, 8];
                            return [4 /*yield*/, this.mailService.sendInvoiceCreated({
                                    clientName: clientName,
                                    clientEmail: clientEmail,
                                    invoiceNumber: invoice.invoice_number,
                                    totalAmount: invoice.total_amount,
                                    dueDate: invoice.due_date,
                                    invoiceUrl: invoiceUrl,
                                })];
                        case 7:
                            _a.sent();
                            _a.label = 8;
                        case 8: return [2 /*return*/];
                    }
                });
            });
        };
        InvoicesService_1.prototype.createInvoiceItems = function (supabase, userId, invoiceId, items) {
            return __awaiter(this, void 0, void 0, function () {
                var itemsWithCalculations, _a, data, error;
                var _this = this;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            itemsWithCalculations = items.map(function (item, index) {
                                var _a;
                                var _b = _this.calculateItemAmounts(item), subtotal = _b.subtotal, discountAmount = _b.discountAmount, amount = _b.amount;
                                return {
                                    invoice_id: invoiceId,
                                    service_item_id: item.service_item_id || null,
                                    description: item.description || '',
                                    quantity: item.quantity || 1,
                                    unit_price: item.unit_price || 0,
                                    subtotal: subtotal,
                                    discount_type: item.discount_type || 'none',
                                    discount_value: item.discount_value || 0,
                                    discount_amount: discountAmount,
                                    amount: amount,
                                    sort_order: (_a = item.sort_order) !== null && _a !== void 0 ? _a : index,
                                    item_type: item.item_type || 'revenue',
                                    vendor_booking_id: item.vendor_booking_id || null,
                                };
                            });
                            return [4 /*yield*/, supabase
                                    .from('invoice_items')
                                    .insert(itemsWithCalculations)
                                    .select()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error) {
                                console.error('invoice_items insert failed:', error);
                                throw error;
                            }
                            return [2 /*return*/, data || []];
                    }
                });
            });
        };
        InvoicesService_1.prototype.addItemFromServiceItem = function (supabase_1, userId_1, invoiceId_1, serviceItemId_1) {
            return __awaiter(this, arguments, void 0, function (supabase, userId, invoiceId, serviceItemId, quantity) {
                var _a, serviceItem, serviceError, existingItems, sortOrder, _b, subtotal, discountAmount, amount, _c, data, error;
                var _d, _e;
                if (quantity === void 0) { quantity = 1; }
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('service_items')
                                .select('*')
                                .eq('id', serviceItemId)
                                .single()];
                        case 1:
                            _a = _f.sent(), serviceItem = _a.data, serviceError = _a.error;
                            if (serviceError)
                                throw new common_1.NotFoundException('Service item not found');
                            return [4 /*yield*/, supabase
                                    .from('invoice_items')
                                    .select('sort_order')
                                    .eq('invoice_id', invoiceId)
                                    .order('sort_order', { ascending: false })
                                    .limit(1)];
                        case 2:
                            existingItems = (_f.sent()).data;
                            sortOrder = ((_e = (_d = existingItems === null || existingItems === void 0 ? void 0 : existingItems[0]) === null || _d === void 0 ? void 0 : _d.sort_order) !== null && _e !== void 0 ? _e : -1) + 1;
                            _b = this.calculateItemAmounts({
                                quantity: quantity,
                                unit_price: serviceItem.default_price,
                                discount_type: 'none',
                                discount_value: 0,
                            }), subtotal = _b.subtotal, discountAmount = _b.discountAmount, amount = _b.amount;
                            return [4 /*yield*/, supabase
                                    .from('invoice_items')
                                    .insert({
                                    invoice_id: invoiceId,
                                    service_item_id: serviceItemId,
                                    description: serviceItem.name,
                                    quantity: quantity,
                                    standard_price: serviceItem.default_price,
                                    unit_price: serviceItem.default_price,
                                    subtotal: subtotal,
                                    discount_type: 'none',
                                    discount_value: 0,
                                    discount_amount: discountAmount,
                                    amount: amount,
                                    sort_order: sortOrder,
                                })
                                    .select()
                                    .single()];
                        case 3:
                            _c = _f.sent(), data = _c.data, error = _c.error;
                            if (error)
                                throw error;
                            // Recalculate invoice totals
                            return [4 /*yield*/, this.recalculateInvoice(supabase, userId, invoiceId)];
                        case 4:
                            // Recalculate invoice totals
                            _f.sent();
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        InvoicesService_1.prototype.updateInvoiceItem = function (supabase, userId, itemId, itemData) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, subtotal, discountAmount, amount, _b, data, error;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = this.calculateItemAmounts(__assign(__assign({}, itemData), { quantity: itemData.quantity, unit_price: itemData.unit_price, discount_type: itemData.discount_type, discount_value: itemData.discount_value })), subtotal = _a.subtotal, discountAmount = _a.discountAmount, amount = _a.amount;
                            return [4 /*yield*/, supabase
                                    .from('invoice_items')
                                    .update(__assign(__assign({}, itemData), { subtotal: subtotal, discount_amount: discountAmount, amount: amount }))
                                    .eq('id', itemId)
                                    .select()
                                    .single()];
                        case 1:
                            _b = _c.sent(), data = _b.data, error = _b.error;
                            if (error)
                                throw error;
                            if (!data) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.recalculateInvoice(supabase, userId, data.invoice_id)];
                        case 2:
                            _c.sent();
                            _c.label = 3;
                        case 3: return [2 /*return*/, data];
                    }
                });
            });
        };
        InvoicesService_1.prototype.deleteInvoiceItem = function (supabase, userId, itemId) {
            return __awaiter(this, void 0, void 0, function () {
                var item, error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('invoice_items')
                                .select('invoice_id')
                                .eq('id', itemId)
                                .single()];
                        case 1:
                            item = (_a.sent()).data;
                            return [4 /*yield*/, supabase
                                    .from('invoice_items')
                                    .delete()
                                    .eq('id', itemId)];
                        case 2:
                            error = (_a.sent()).error;
                            if (error)
                                throw error;
                            if (!item) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.recalculateInvoice(supabase, userId, item.invoice_id)];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        InvoicesService_1.prototype.recalculateInvoice = function (supabase, userId, invoiceId) {
            return __awaiter(this, void 0, void 0, function () {
                var invoice, items, _a, subtotal, taxAmount, totalAmount, amountDue, actualAmountDue, _b, data, error;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.findOne(supabase, userId, invoiceId)];
                        case 1:
                            invoice = _c.sent();
                            return [4 /*yield*/, this.findInvoiceItems(supabase, userId, invoiceId)];
                        case 2:
                            items = _c.sent();
                            _a = this.calculateInvoiceTotals(items, invoice.tax_rate, invoice.discount_amount), subtotal = _a.subtotal, taxAmount = _a.taxAmount, totalAmount = _a.totalAmount, amountDue = _a.amountDue;
                            actualAmountDue = totalAmount - invoice.amount_paid;
                            return [4 /*yield*/, supabase
                                    .from('invoices')
                                    .update({
                                    subtotal: subtotal,
                                    tax_amount: taxAmount,
                                    total_amount: totalAmount,
                                    amount_due: actualAmountDue,
                                })
                                    .eq('id', invoiceId)
                                    .select()
                                    .single()];
                        case 3:
                            _b = _c.sent(), data = _b.data, error = _b.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        InvoicesService_1.prototype.update = function (supabase, userId, id, invoiceData) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error, result, phone, clientName, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('invoices')
                                .update(invoiceData)
                                .eq('id', id)
                                .select()
                                .single()];
                        case 1:
                            _a = _c.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            result = data;
                            if (!(invoiceData.tax_rate !== undefined || invoiceData.discount_amount !== undefined)) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.recalculateInvoice(supabase, userId, id)];
                        case 2:
                            result = _c.sent();
                            _c.label = 3;
                        case 3:
                            if (!(result.status === 'sent')) return [3 /*break*/, 8];
                            _c.label = 4;
                        case 4:
                            _c.trys.push([4, 7, , 8]);
                            return [4 /*yield*/, this.lookupClientPhone(supabase, result)];
                        case 5:
                            phone = _c.sent();
                            clientName = result.client_name || 'Valued Client';
                            return [4 /*yield*/, this.smsNotifications.invoiceUpdated(phone, clientName, result.invoice_number)];
                        case 6:
                            _c.sent();
                            return [3 /*break*/, 8];
                        case 7:
                            _b = _c.sent();
                            return [3 /*break*/, 8];
                        case 8: return [2 /*return*/, result];
                    }
                });
            });
        };
        InvoicesService_1.prototype.updateStatus = function (supabase, userId, id, status) {
            return __awaiter(this, void 0, void 0, function () {
                var updateData, updated, phone, clientName, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            updateData = { status: status };
                            if (status === 'sent' && !updateData.issue_date) {
                                updateData.issue_date = new Date().toISOString().split('T')[0];
                            }
                            if (status === 'paid') {
                                updateData.paid_date = new Date().toISOString().split('T')[0];
                            }
                            return [4 /*yield*/, this.update(supabase, userId, id, updateData)];
                        case 1:
                            updated = _b.sent();
                            _b.label = 2;
                        case 2:
                            _b.trys.push([2, 10, , 11]);
                            return [4 /*yield*/, this.lookupClientPhone(supabase, updated)];
                        case 3:
                            phone = _b.sent();
                            clientName = updated.client_name || 'Valued Client';
                            if (!(status === 'sent')) return [3 /*break*/, 5];
                            // Fires on both initial send and resend from the dashboard
                            return [4 /*yield*/, this.smsNotifications.invoiceSent(phone, clientName, updated.invoice_number, updated.total_amount)];
                        case 4:
                            // Fires on both initial send and resend from the dashboard
                            _b.sent();
                            return [3 /*break*/, 9];
                        case 5:
                            if (!(status === 'paid')) return [3 /*break*/, 7];
                            return [4 /*yield*/, this.smsNotifications.invoicePaid(phone, clientName, updated.invoice_number, updated.total_amount)];
                        case 6:
                            _b.sent();
                            return [3 /*break*/, 9];
                        case 7:
                            if (!(status === 'overdue')) return [3 /*break*/, 9];
                            return [4 /*yield*/, this.smsNotifications.invoiceOverdue(phone, clientName, updated.invoice_number, updated.amount_due)];
                        case 8:
                            _b.sent();
                            _b.label = 9;
                        case 9: return [3 /*break*/, 11];
                        case 10:
                            _a = _b.sent();
                            return [3 /*break*/, 11];
                        case 11: return [2 /*return*/, updated];
                    }
                });
            });
        };
        InvoicesService_1.prototype.recordPayment = function (supabase, userId, id, amount) {
            return __awaiter(this, void 0, void 0, function () {
                var invoice, newAmountPaid, updateData, isFullyPaid, updated, phone, clientName, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.findOne(supabase, userId, id)];
                        case 1:
                            invoice = _b.sent();
                            newAmountPaid = Number(invoice.amount_paid) + amount;
                            updateData = { amount_paid: newAmountPaid };
                            isFullyPaid = newAmountPaid >= invoice.total_amount;
                            if (isFullyPaid) {
                                updateData.status = 'paid';
                                updateData.paid_date = new Date().toISOString().split('T')[0];
                            }
                            return [4 /*yield*/, this.update(supabase, userId, id, updateData)];
                        case 2:
                            updated = _b.sent();
                            _b.label = 3;
                        case 3:
                            _b.trys.push([3, 9, , 10]);
                            return [4 /*yield*/, this.lookupClientPhone(supabase, updated)];
                        case 4:
                            phone = _b.sent();
                            clientName = updated.client_name || 'Valued Client';
                            if (!isFullyPaid) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.smsNotifications.invoicePaid(phone, clientName, updated.invoice_number, updated.total_amount)];
                        case 5:
                            _b.sent();
                            return [3 /*break*/, 8];
                        case 6: return [4 /*yield*/, this.smsNotifications.invoicePartialPayment(phone, clientName, updated.invoice_number, amount, Number(updated.amount_due))];
                        case 7:
                            _b.sent();
                            _b.label = 8;
                        case 8: return [3 /*break*/, 10];
                        case 9:
                            _a = _b.sent();
                            return [3 /*break*/, 10];
                        case 10: return [2 /*return*/, updated];
                    }
                });
            });
        };
        InvoicesService_1.prototype.delete = function (supabase, userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('invoices')
                                .delete()
                                .eq('id', id)];
                        case 1:
                            error = (_a.sent()).error;
                            if (error)
                                throw error;
                            return [2 /*return*/];
                    }
                });
            });
        };
        InvoicesService_1.prototype.createQuoteFromIntakeForm = function (supabase, userId, intakeFormId) {
            return __awaiter(this, void 0, void 0, function () {
                var issueDate, dueDate;
                return __generator(this, function (_a) {
                    issueDate = new Date().toISOString().split('T')[0];
                    dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + 30);
                    return [2 /*return*/, this.create(supabase, userId, {
                            intake_form_id: intakeFormId,
                            owner_id: userId,
                            status: 'draft',
                            issue_date: issueDate,
                            due_date: dueDate.toISOString().split('T')[0],
                            tax_rate: 0,
                            discount_amount: 0,
                            amount_paid: 0,
                            terms: 'Payment due within 30 days of acceptance',
                            notes: 'This is a quote for your event. Once accepted, it will be converted to an invoice.',
                        })];
                });
            });
        };
        return InvoicesService_1;
    }());
    __setFunctionName(_classThis, "InvoicesService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        InvoicesService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return InvoicesService = _classThis;
}();
exports.InvoicesService = InvoicesService;
