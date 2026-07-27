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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtistInvoicesService = void 0;
var common_1 = require("@nestjs/common");
var stripe_1 = require("stripe");
var nodemailer = require("nodemailer");
var APP_FEE_RATE = 0.03; // 3% platform fee — artist-to-client invoices
var ArtistInvoicesService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var ArtistInvoicesService = _classThis = /** @class */ (function () {
        function ArtistInvoicesService_1(supabaseService, configService, smsNotifications) {
            this.supabaseService = supabaseService;
            this.configService = configService;
            this.smsNotifications = smsNotifications;
            this.logger = new common_1.Logger(ArtistInvoicesService.name);
            var secretKey = this.configService.get('STRIPE_SECRET_KEY');
            if (!secretKey)
                throw new Error('STRIPE_SECRET_KEY is not set');
            this.stripe = new stripe_1.default(secretKey);
            this.frontendUrl = this.configService.get('FRONTEND_URL', 'https://dovenuesuite.com');
        }
        // ─── Invoice number generation ────────────────────────────────────────────
        ArtistInvoicesService_1.prototype.generateInvoiceNumber = function () {
            return __awaiter(this, void 0, void 0, function () {
                var admin, year, count, seq;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            year = new Date().getFullYear();
                            return [4 /*yield*/, admin
                                    .from('artist_invoices')
                                    .select('*', { count: 'exact', head: true })];
                        case 1:
                            count = (_a.sent()).count;
                            seq = String((count !== null && count !== void 0 ? count : 0) + 1).padStart(5, '0');
                            return [2 /*return*/, "AINV-".concat(year, "-").concat(seq)];
                    }
                });
            });
        };
        ArtistInvoicesService_1.prototype.calculateTotals = function (items, taxRate, discountAmount) {
            var subtotal = items.reduce(function (sum, i) { return sum + i.quantity * i.unit_price; }, 0);
            var taxAmount = subtotal * (taxRate / 100);
            var totalAmount = Math.max(0, subtotal + taxAmount - discountAmount);
            return { subtotal: subtotal, taxAmount: taxAmount, totalAmount: totalAmount, amountDue: totalAmount };
        };
        // ─── Artist account helper ────────────────────────────────────────────────
        ArtistInvoicesService_1.prototype.getArtistAccountId = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('artist_accounts')
                                    .select('id')
                                    .eq('user_id', userId)
                                    .maybeSingle()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error || !data)
                                throw new common_1.ForbiddenException('No artist account found for this user');
                            return [2 /*return*/, data.id];
                    }
                });
            });
        };
        // ─── CRUD ─────────────────────────────────────────────────────────────────
        ArtistInvoicesService_1.prototype.createInvoice = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, artistAccountId, invoiceNumber, taxRate, discountAmount, _a, subtotal, taxAmount, totalAmount, amountDue, _b, invoice, invErr, lineItems, itemsErr;
                var _c, _d, _e, _f, _g, _h;
                return __generator(this, function (_j) {
                    switch (_j.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getArtistAccountId(userId)];
                        case 1:
                            artistAccountId = _j.sent();
                            return [4 /*yield*/, this.generateInvoiceNumber()];
                        case 2:
                            invoiceNumber = _j.sent();
                            taxRate = (_c = dto.tax_rate) !== null && _c !== void 0 ? _c : 0;
                            discountAmount = (_d = dto.discount_amount) !== null && _d !== void 0 ? _d : 0;
                            _a = this.calculateTotals(dto.items, taxRate, discountAmount), subtotal = _a.subtotal, taxAmount = _a.taxAmount, totalAmount = _a.totalAmount, amountDue = _a.amountDue;
                            return [4 /*yield*/, admin
                                    .from('artist_invoices')
                                    .insert({
                                    artist_account_id: artistAccountId,
                                    invoice_number: invoiceNumber,
                                    client_name: dto.client_name,
                                    client_email: dto.client_email,
                                    client_phone: (_e = dto.client_phone) !== null && _e !== void 0 ? _e : null,
                                    issue_date: dto.issue_date,
                                    due_date: dto.due_date,
                                    tax_rate: taxRate,
                                    tax_amount: taxAmount,
                                    discount_amount: discountAmount,
                                    subtotal: subtotal,
                                    total_amount: totalAmount,
                                    amount_due: amountDue,
                                    amount_paid: 0,
                                    notes: (_f = dto.notes) !== null && _f !== void 0 ? _f : null,
                                    terms: (_g = dto.terms) !== null && _g !== void 0 ? _g : null,
                                    status: 'draft',
                                })
                                    .select()
                                    .single()];
                        case 3:
                            _b = _j.sent(), invoice = _b.data, invErr = _b.error;
                            if (invErr || !invoice)
                                throw new Error((_h = invErr === null || invErr === void 0 ? void 0 : invErr.message) !== null && _h !== void 0 ? _h : 'Failed to create invoice');
                            if (!(dto.items.length > 0)) return [3 /*break*/, 5];
                            lineItems = dto.items.map(function (item) { return ({
                                artist_invoice_id: invoice.id,
                                description: item.description,
                                quantity: item.quantity,
                                unit_price: item.unit_price,
                                amount: item.quantity * item.unit_price,
                            }); });
                            return [4 /*yield*/, admin.from('artist_invoice_items').insert(lineItems)];
                        case 4:
                            itemsErr = (_j.sent()).error;
                            if (itemsErr)
                                this.logger.error('Failed to insert invoice items', itemsErr);
                            _j.label = 5;
                        case 5: return [2 /*return*/, this.getInvoice(userId, invoice.id)];
                    }
                });
            });
        };
        ArtistInvoicesService_1.prototype.listInvoices = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, artistAccountId, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getArtistAccountId(userId)];
                        case 1:
                            artistAccountId = _b.sent();
                            return [4 /*yield*/, admin
                                    .from('artist_invoices')
                                    .select('*, artist_invoice_items(*)')
                                    .eq('artist_account_id', artistAccountId)
                                    .order('created_at', { ascending: false })];
                        case 2:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new Error(error.message);
                            return [2 /*return*/, data !== null && data !== void 0 ? data : []];
                    }
                });
            });
        };
        ArtistInvoicesService_1.prototype.getInvoice = function (userId, invoiceId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, artistAccountId, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getArtistAccountId(userId)];
                        case 1:
                            artistAccountId = _b.sent();
                            return [4 /*yield*/, admin
                                    .from('artist_invoices')
                                    .select('*, artist_invoice_items(*), artist_accounts(artist_name, stage_name, email, phone, city, state)')
                                    .eq('id', invoiceId)
                                    .eq('artist_account_id', artistAccountId)
                                    .single()];
                        case 2:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error || !data)
                                throw new common_1.NotFoundException('Invoice not found');
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        ArtistInvoicesService_1.prototype.updateInvoice = function (userId, invoiceId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, artistAccountId, existing, error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getArtistAccountId(userId)];
                        case 1:
                            artistAccountId = _a.sent();
                            return [4 /*yield*/, admin
                                    .from('artist_invoices')
                                    .select('*')
                                    .eq('id', invoiceId)
                                    .eq('artist_account_id', artistAccountId)
                                    .single()];
                        case 2:
                            existing = (_a.sent()).data;
                            if (!existing)
                                throw new common_1.NotFoundException('Invoice not found');
                            return [4 /*yield*/, admin
                                    .from('artist_invoices')
                                    .update(__assign(__assign({}, dto), { updated_at: new Date().toISOString() }))
                                    .eq('id', invoiceId)];
                        case 3:
                            error = (_a.sent()).error;
                            if (error)
                                throw new Error(error.message);
                            return [2 /*return*/, this.getInvoice(userId, invoiceId)];
                    }
                });
            });
        };
        ArtistInvoicesService_1.prototype.deleteInvoice = function (userId, invoiceId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, artistAccountId, error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getArtistAccountId(userId)];
                        case 1:
                            artistAccountId = _a.sent();
                            return [4 /*yield*/, admin
                                    .from('artist_invoices')
                                    .delete()
                                    .eq('id', invoiceId)
                                    .eq('artist_account_id', artistAccountId)];
                        case 2:
                            error = (_a.sent()).error;
                            if (error)
                                throw new Error(error.message);
                            return [2 /*return*/, { success: true }];
                    }
                });
            });
        };
        // ─── Line items ───────────────────────────────────────────────────────────
        ArtistInvoicesService_1.prototype.addItem = function (userId, invoiceId, item) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, artistAccountId, invoice, error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getArtistAccountId(userId)];
                        case 1:
                            artistAccountId = _a.sent();
                            return [4 /*yield*/, admin
                                    .from('artist_invoices')
                                    .select('id, tax_rate, discount_amount')
                                    .eq('id', invoiceId)
                                    .eq('artist_account_id', artistAccountId)
                                    .single()];
                        case 2:
                            invoice = (_a.sent()).data;
                            if (!invoice)
                                throw new common_1.NotFoundException('Invoice not found');
                            return [4 /*yield*/, admin.from('artist_invoice_items').insert({
                                    artist_invoice_id: invoiceId,
                                    description: item.description,
                                    quantity: item.quantity,
                                    unit_price: item.unit_price,
                                    amount: item.quantity * item.unit_price,
                                })];
                        case 3:
                            error = (_a.sent()).error;
                            if (error)
                                throw new Error(error.message);
                            return [4 /*yield*/, this.recalcAndSaveInvoiceTotals(invoiceId, invoice.tax_rate, invoice.discount_amount)];
                        case 4:
                            _a.sent();
                            return [2 /*return*/, this.getInvoice(userId, invoiceId)];
                    }
                });
            });
        };
        ArtistInvoicesService_1.prototype.updateItem = function (userId, itemId, item) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, artistAccountId, existing, parentInvoice, qty, price, error;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getArtistAccountId(userId)];
                        case 1:
                            artistAccountId = _c.sent();
                            return [4 /*yield*/, admin
                                    .from('artist_invoice_items')
                                    .select('*, artist_invoices!inner(artist_account_id, tax_rate, discount_amount)')
                                    .eq('id', itemId)
                                    .single()];
                        case 2:
                            existing = (_c.sent()).data;
                            parentInvoice = existing ? existing.artist_invoices : null;
                            if (!existing || (parentInvoice === null || parentInvoice === void 0 ? void 0 : parentInvoice.artist_account_id) !== artistAccountId) {
                                throw new common_1.NotFoundException('Item not found');
                            }
                            qty = (_a = item.quantity) !== null && _a !== void 0 ? _a : existing.quantity;
                            price = (_b = item.unit_price) !== null && _b !== void 0 ? _b : existing.unit_price;
                            return [4 /*yield*/, admin
                                    .from('artist_invoice_items')
                                    .update(__assign(__assign({}, item), { amount: qty * price }))
                                    .eq('id', itemId)];
                        case 3:
                            error = (_c.sent()).error;
                            if (error)
                                throw new Error(error.message);
                            return [4 /*yield*/, this.recalcAndSaveInvoiceTotals(existing.artist_invoice_id, parentInvoice.tax_rate, parentInvoice.discount_amount)];
                        case 4:
                            _c.sent();
                            return [2 /*return*/, this.getInvoice(userId, existing.artist_invoice_id)];
                    }
                });
            });
        };
        ArtistInvoicesService_1.prototype.deleteItem = function (userId, itemId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, artistAccountId, existing, parentInvoice;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getArtistAccountId(userId)];
                        case 1:
                            artistAccountId = _a.sent();
                            return [4 /*yield*/, admin
                                    .from('artist_invoice_items')
                                    .select('artist_invoice_id, artist_invoices!inner(artist_account_id, tax_rate, discount_amount)')
                                    .eq('id', itemId)
                                    .single()];
                        case 2:
                            existing = (_a.sent()).data;
                            parentInvoice = existing ? existing.artist_invoices : null;
                            if (!existing || (parentInvoice === null || parentInvoice === void 0 ? void 0 : parentInvoice.artist_account_id) !== artistAccountId) {
                                throw new common_1.NotFoundException('Item not found');
                            }
                            return [4 /*yield*/, admin.from('artist_invoice_items').delete().eq('id', itemId)];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, this.recalcAndSaveInvoiceTotals(existing.artist_invoice_id, parentInvoice.tax_rate, parentInvoice.discount_amount)];
                        case 4:
                            _a.sent();
                            return [2 /*return*/, { success: true }];
                    }
                });
            });
        };
        ArtistInvoicesService_1.prototype.recalcAndSaveInvoiceTotals = function (invoiceId, taxRate, discountAmount) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, items, _a, subtotal, taxAmount, totalAmount, amountDue;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('artist_invoice_items')
                                    .select('quantity, unit_price')
                                    .eq('artist_invoice_id', invoiceId)];
                        case 1:
                            items = (_b.sent()).data;
                            _a = this.calculateTotals((items !== null && items !== void 0 ? items : []), Number(taxRate), Number(discountAmount)), subtotal = _a.subtotal, taxAmount = _a.taxAmount, totalAmount = _a.totalAmount, amountDue = _a.amountDue;
                            return [4 /*yield*/, admin
                                    .from('artist_invoices')
                                    .update({
                                    subtotal: subtotal,
                                    tax_amount: taxAmount,
                                    total_amount: totalAmount,
                                    amount_due: amountDue,
                                    updated_at: new Date().toISOString(),
                                })
                                    .eq('id', invoiceId)];
                        case 2:
                            _b.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        // ─── Send invoice email ───────────────────────────────────────────────────
        ArtistInvoicesService_1.prototype.sendInvoice = function (userId, invoiceId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, artistAccountId, artistAccount, invoice, payUrl, artistName, emailSent, clientPhone, smsErr_1;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getArtistAccountId(userId)];
                        case 1:
                            artistAccountId = _c.sent();
                            return [4 /*yield*/, admin
                                    .from('artist_accounts')
                                    .select('stripe_account_id, stripe_connect_status, artist_name, stage_name')
                                    .eq('id', artistAccountId)
                                    .single()];
                        case 2:
                            artistAccount = (_c.sent()).data;
                            if (!(artistAccount === null || artistAccount === void 0 ? void 0 : artistAccount.stripe_account_id) || artistAccount.stripe_connect_status !== 'active') {
                                throw new common_1.BadRequestException('You must connect a Stripe account before sending invoices. Go to your dashboard to set up payouts.');
                            }
                            return [4 /*yield*/, this.getInvoice(userId, invoiceId)];
                        case 3:
                            invoice = _c.sent();
                            payUrl = "".concat(this.frontendUrl, "/artist-pay/").concat(invoice.public_token);
                            artistName = ((_a = invoice.artist_accounts) === null || _a === void 0 ? void 0 : _a.stage_name) ||
                                ((_b = invoice.artist_accounts) === null || _b === void 0 ? void 0 : _b.artist_name) ||
                                'Your Artist';
                            return [4 /*yield*/, this.sendInvoiceEmail({
                                    to: invoice.client_email,
                                    clientName: invoice.client_name,
                                    artistName: artistName,
                                    invoiceNumber: invoice.invoice_number,
                                    totalAmount: invoice.total_amount,
                                    dueDate: invoice.due_date,
                                    payUrl: payUrl,
                                })];
                        case 4:
                            emailSent = _c.sent();
                            if (!emailSent) return [3 /*break*/, 6];
                            return [4 /*yield*/, admin
                                    .from('artist_invoices')
                                    .update({ status: 'sent', updated_at: new Date().toISOString() })
                                    .eq('id', invoiceId)];
                        case 5:
                            _c.sent();
                            _c.label = 6;
                        case 6:
                            clientPhone = invoice.client_phone;
                            _c.label = 7;
                        case 7:
                            _c.trys.push([7, 10, , 11]);
                            if (!clientPhone) return [3 /*break*/, 9];
                            return [4 /*yield*/, this.smsNotifications.vendorInvoiceSent(clientPhone, invoice.client_name, artistName, invoice.total_amount, payUrl)];
                        case 8:
                            _c.sent();
                            _c.label = 9;
                        case 9: return [3 /*break*/, 11];
                        case 10:
                            smsErr_1 = _c.sent();
                            this.logger.warn("Failed to send invoice SMS: ".concat(smsErr_1 === null || smsErr_1 === void 0 ? void 0 : smsErr_1.message));
                            return [3 /*break*/, 11];
                        case 11: return [2 /*return*/, { success: emailSent }];
                    }
                });
            });
        };
        ArtistInvoicesService_1.prototype.sendInvoiceEmail = function (params) {
            return __awaiter(this, void 0, void 0, function () {
                var smtpHost, smtpUser, smtpPass, transporter, amount, fromAddress, html, err_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            smtpHost = this.configService.get('SMTP_HOST');
                            smtpUser = this.configService.get('SMTP_USER');
                            smtpPass = this.configService.get('SMTP_PASS');
                            if (!smtpHost || !smtpUser || !smtpPass) {
                                this.logger.warn('SMTP not configured — invoice email not sent.');
                                this.logger.log("[DEV] Invoice email to ".concat(params.to, ": ").concat(params.payUrl));
                                return [2 /*return*/, true];
                            }
                            transporter = nodemailer.createTransport({
                                host: smtpHost,
                                port: Number(this.configService.get('SMTP_PORT', '587')),
                                secure: false,
                                auth: { user: smtpUser, pass: smtpPass },
                            });
                            amount = "$".concat(Number(params.totalAmount).toFixed(2));
                            fromAddress = this.configService.get('SMTP_FROM', smtpUser);
                            html = "\n      <div style=\"font-family:Arial,sans-serif;max-width:600px;margin:auto;\">\n        <h2 style=\"color:#4f46e5;\">Invoice from ".concat(params.artistName, "</h2>\n        <p>Hi ").concat(params.clientName, ",</p>\n        <p>You have received an invoice <strong>").concat(params.invoiceNumber, "</strong> for <strong>").concat(amount, "</strong>, due on <strong>").concat(params.dueDate, "</strong>.</p>\n        <p style=\"margin:24px 0;\">\n          <a href=\"").concat(params.payUrl, "\"\n             style=\"background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:16px;\">\n            View &amp; Pay Invoice\n          </a>\n        </p>\n        <p style=\"color:#666;font-size:13px;\">Powered by DoVenue Suite</p>\n      </div>");
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, transporter.sendMail({
                                    from: "\"".concat(params.artistName, "\" <").concat(fromAddress, ">"),
                                    to: params.to,
                                    subject: "Invoice ".concat(params.invoiceNumber, " from ").concat(params.artistName, " \u2014 ").concat(amount, " due"),
                                    html: html,
                                })];
                        case 2:
                            _a.sent();
                            this.logger.log("Artist invoice email sent to ".concat(params.to));
                            return [2 /*return*/, true];
                        case 3:
                            err_1 = _a.sent();
                            this.logger.error('Failed to send artist invoice email', err_1.message);
                            return [2 /*return*/, false];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        // ─── Public invoice (no auth) ──────────────────────────────────────────────
        ArtistInvoicesService_1.prototype.getPublicInvoice = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error, _tok, _sess, _pi, safe;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('artist_invoices')
                                    .select('*, artist_invoice_items(*), artist_accounts(artist_name, stage_name, email, phone, city, state, profile_image_url)')
                                    .eq('public_token', token)
                                    .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error || !data)
                                throw new common_1.NotFoundException('Invoice not found');
                            if (!(data.status === 'sent')) return [3 /*break*/, 3];
                            return [4 /*yield*/, admin
                                    .from('artist_invoices')
                                    .update({ status: 'viewed', updated_at: new Date().toISOString() })
                                    .eq('id', data.id)];
                        case 2:
                            _b.sent();
                            data.status = 'viewed';
                            _b.label = 3;
                        case 3:
                            _tok = data.public_token, _sess = data.stripe_checkout_session_id, _pi = data.stripe_payment_intent_id, safe = __rest(data, ["public_token", "stripe_checkout_session_id", "stripe_payment_intent_id"]);
                            return [2 /*return*/, safe];
                    }
                });
            });
        };
        // ─── Stripe Checkout for public invoice payment ────────────────────────────
        ArtistInvoicesService_1.prototype.createCheckoutSession = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, invoice, error, amountCents, artist, hasConnect, artistName, feeCents, session;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('artist_invoices')
                                    .select('*, artist_accounts(stripe_account_id, stripe_connect_status, artist_name, stage_name)')
                                    .eq('public_token', token)
                                    .single()];
                        case 1:
                            _a = _b.sent(), invoice = _a.data, error = _a.error;
                            if (error || !invoice)
                                throw new common_1.NotFoundException('Invoice not found');
                            if (invoice.status === 'paid')
                                throw new common_1.ForbiddenException('Invoice is already paid');
                            if (invoice.status === 'cancelled')
                                throw new common_1.ForbiddenException('Invoice has been cancelled');
                            amountCents = Math.round(Number(invoice.amount_due) * 100);
                            if (amountCents <= 0)
                                throw new common_1.ForbiddenException('Invoice amount must be greater than zero');
                            artist = invoice.artist_accounts;
                            hasConnect = (artist === null || artist === void 0 ? void 0 : artist.stripe_account_id) && (artist === null || artist === void 0 ? void 0 : artist.stripe_connect_status) === 'active';
                            if (!hasConnect) {
                                throw new common_1.BadRequestException('This artist has not connected a Stripe account. Payment cannot be processed until they complete Stripe onboarding.');
                            }
                            artistName = (artist === null || artist === void 0 ? void 0 : artist.stage_name) || (artist === null || artist === void 0 ? void 0 : artist.artist_name) || 'Artist';
                            feeCents = Math.round(amountCents * APP_FEE_RATE);
                            return [4 /*yield*/, this.stripe.checkout.sessions.create({
                                    mode: 'payment',
                                    payment_method_types: ['card'],
                                    customer_email: invoice.client_email,
                                    line_items: [
                                        {
                                            price_data: {
                                                currency: 'usd',
                                                unit_amount: amountCents,
                                                product_data: {
                                                    name: "Invoice ".concat(invoice.invoice_number),
                                                    description: "Payment to ".concat(artistName),
                                                },
                                            },
                                            quantity: 1,
                                        },
                                    ],
                                    success_url: "".concat(this.frontendUrl, "/artist-pay/").concat(token, "?paid=true"),
                                    cancel_url: "".concat(this.frontendUrl, "/artist-pay/").concat(token, "?canceled=true"),
                                    metadata: { artist_invoice_id: invoice.id, artist_invoice_token: token },
                                    client_reference_id: invoice.id,
                                    payment_intent_data: {
                                        application_fee_amount: feeCents,
                                        transfer_data: { destination: artist.stripe_account_id },
                                    },
                                })];
                        case 2:
                            session = _b.sent();
                            return [4 /*yield*/, admin
                                    .from('artist_invoices')
                                    .update({ stripe_checkout_session_id: session.id, updated_at: new Date().toISOString() })
                                    .eq('id', invoice.id)];
                        case 3:
                            _b.sent();
                            this.logger.log("Artist invoice checkout: ".concat(session.id, " for invoice ").concat(invoice.id));
                            return [2 /*return*/, { url: session.url, feeCents: feeCents }];
                    }
                });
            });
        };
        // ─── Called from webhook when payment succeeds ─────────────────────────────
        ArtistInvoicesService_1.prototype.markInvoicePaidBySession = function (sessionId, paymentIntentId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, invoice, artistAccount, artistPhone, artistName, _a;
                var _b, _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('artist_invoices')
                                    .select('id, total_amount, client_name, client_phone, artist_account_id, artist_accounts(artist_name, stage_name, phone)')
                                    .eq('stripe_checkout_session_id', sessionId)
                                    .maybeSingle()];
                        case 1:
                            invoice = (_f.sent()).data;
                            if (!invoice) {
                                this.logger.warn("No artist invoice found for Stripe session ".concat(sessionId));
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, admin
                                    .from('artist_invoices')
                                    .update({
                                    status: 'paid',
                                    amount_paid: invoice.total_amount,
                                    amount_due: 0,
                                    paid_at: new Date().toISOString(),
                                    stripe_payment_intent_id: paymentIntentId,
                                    updated_at: new Date().toISOString(),
                                })
                                    .eq('id', invoice.id)];
                        case 2:
                            _f.sent();
                            // Update linked booking status if exists
                            return [4 /*yield*/, admin
                                    .from('artist_bookings')
                                    .update({ status: 'deposit_paid', updated_at: new Date().toISOString() })
                                    .eq('artist_invoice_id', invoice.id)];
                        case 3:
                            // Update linked booking status if exists
                            _f.sent();
                            this.logger.log("Artist invoice ".concat(invoice.id, " marked paid via session ").concat(sessionId));
                            _f.label = 4;
                        case 4:
                            _f.trys.push([4, 7, , 8]);
                            artistAccount = invoice.artist_accounts;
                            artistPhone = (_b = artistAccount === null || artistAccount === void 0 ? void 0 : artistAccount.phone) !== null && _b !== void 0 ? _b : null;
                            artistName = (artistAccount === null || artistAccount === void 0 ? void 0 : artistAccount.stage_name) || (artistAccount === null || artistAccount === void 0 ? void 0 : artistAccount.artist_name) || 'Artist';
                            return [4 /*yield*/, this.smsNotifications.vendorInvoicePaid(artistPhone, artistName, (_c = invoice.client_name) !== null && _c !== void 0 ? _c : 'Client', invoice.total_amount)];
                        case 5:
                            _f.sent();
                            return [4 /*yield*/, this.smsNotifications.paymentReceived((_d = invoice.client_phone) !== null && _d !== void 0 ? _d : null, (_e = invoice.client_name) !== null && _e !== void 0 ? _e : 'Valued Client', invoice.total_amount, "your invoice from ".concat(artistName))];
                        case 6:
                            _f.sent();
                            return [3 /*break*/, 8];
                        case 7:
                            _a = _f.sent();
                            return [3 /*break*/, 8];
                        case 8: return [2 /*return*/];
                    }
                });
            });
        };
        // ─── Verify payment via Stripe (webhook fallback) ─────────────────────────
        ArtistInvoicesService_1.prototype.verifyPayment = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, invoice, session, paymentIntentId, artistAccount, artistPhone, artistName, _a;
                var _b, _c, _d, _e, _f, _g;
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('artist_invoices')
                                    .select('id, status, total_amount, stripe_checkout_session_id, client_name, client_phone, artist_accounts(artist_name, stage_name, phone)')
                                    .eq('public_token', token)
                                    .maybeSingle()];
                        case 1:
                            invoice = (_h.sent()).data;
                            if (!invoice)
                                throw new common_1.NotFoundException('Invoice not found');
                            if (invoice.status === 'paid')
                                return [2 /*return*/, { status: 'paid', paid: true }];
                            if (!invoice.stripe_checkout_session_id)
                                return [2 /*return*/, { status: invoice.status, paid: false }];
                            return [4 /*yield*/, this.stripe.checkout.sessions.retrieve(invoice.stripe_checkout_session_id)];
                        case 2:
                            session = _h.sent();
                            if (session.payment_status !== 'paid')
                                return [2 /*return*/, { status: invoice.status, paid: false }];
                            paymentIntentId = typeof session.payment_intent === 'string'
                                ? session.payment_intent
                                : (_c = (_b = session.payment_intent) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : null;
                            return [4 /*yield*/, admin
                                    .from('artist_invoices')
                                    .update({
                                    status: 'paid',
                                    amount_paid: invoice.total_amount,
                                    amount_due: 0,
                                    paid_at: new Date().toISOString(),
                                    stripe_payment_intent_id: paymentIntentId,
                                    updated_at: new Date().toISOString(),
                                })
                                    .eq('id', invoice.id)];
                        case 3:
                            _h.sent();
                            return [4 /*yield*/, admin
                                    .from('artist_bookings')
                                    .update({ status: 'deposit_paid', updated_at: new Date().toISOString() })
                                    .eq('artist_invoice_id', invoice.id)];
                        case 4:
                            _h.sent();
                            this.logger.log("Artist invoice ".concat(invoice.id, " verified and marked paid (webhook fallback)"));
                            _h.label = 5;
                        case 5:
                            _h.trys.push([5, 8, , 9]);
                            artistAccount = invoice.artist_accounts;
                            artistPhone = (_d = artistAccount === null || artistAccount === void 0 ? void 0 : artistAccount.phone) !== null && _d !== void 0 ? _d : null;
                            artistName = (artistAccount === null || artistAccount === void 0 ? void 0 : artistAccount.stage_name) || (artistAccount === null || artistAccount === void 0 ? void 0 : artistAccount.artist_name) || 'Artist';
                            return [4 /*yield*/, this.smsNotifications.vendorInvoicePaid(artistPhone, artistName, (_e = invoice.client_name) !== null && _e !== void 0 ? _e : 'Client', invoice.total_amount)];
                        case 6:
                            _h.sent();
                            return [4 /*yield*/, this.smsNotifications.paymentReceived((_f = invoice.client_phone) !== null && _f !== void 0 ? _f : null, (_g = invoice.client_name) !== null && _g !== void 0 ? _g : 'Valued Client', invoice.total_amount, "your invoice from ".concat(artistName))];
                        case 7:
                            _h.sent();
                            return [3 /*break*/, 9];
                        case 8:
                            _a = _h.sent();
                            return [3 /*break*/, 9];
                        case 9: return [2 /*return*/, { status: 'paid', paid: true }];
                    }
                });
            });
        };
        return ArtistInvoicesService_1;
    }());
    __setFunctionName(_classThis, "ArtistInvoicesService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ArtistInvoicesService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ArtistInvoicesService = _classThis;
}();
exports.ArtistInvoicesService = ArtistInvoicesService;
