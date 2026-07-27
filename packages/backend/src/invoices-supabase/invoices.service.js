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
var InvoicesService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var InvoicesService = _classThis = /** @class */ (function () {
        function InvoicesService_1(supabaseService) {
            this.supabaseService = supabaseService;
        }
        InvoicesService_1.prototype.findAll = function (supabase) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('invoices')
                                .select('*')
                                .order('created_at', { ascending: false })];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data || []];
                    }
                });
            });
        };
        InvoicesService_1.prototype.findByOwner = function (supabase, ownerId, venueId) {
            return __awaiter(this, void 0, void 0, function () {
                var query, venueEvents, eventIds, formIds, intakeIds, conditions, filteredQuery, _a, data_1, error_1, _b, data, error;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            query = supabase
                                .from('invoices')
                                .select('*')
                                .eq('owner_id', ownerId)
                                .order('created_at', { ascending: false });
                            if (!venueId) return [3 /*break*/, 4];
                            return [4 /*yield*/, supabase.from('event').select('id').eq('venue_id', venueId)];
                        case 1:
                            venueEvents = (_c.sent()).data;
                            eventIds = (venueEvents || []).map(function (e) { return e.id; });
                            if (eventIds.length === 0)
                                return [2 /*return*/, []];
                            return [4 /*yield*/, supabase.from('event').select('intake_form_id').in('id', eventIds).not('intake_form_id', 'is', null)];
                        case 2:
                            formIds = (_c.sent()).data;
                            intakeIds = (formIds || []).map(function (r) { return r.intake_form_id; }).filter(Boolean);
                            conditions = [query];
                            filteredQuery = supabase
                                .from('invoices')
                                .select('*')
                                .eq('owner_id', ownerId)
                                .order('created_at', { ascending: false });
                            if (intakeIds.length > 0) {
                                filteredQuery = filteredQuery.in('intake_form_id', intakeIds);
                            }
                            else {
                                filteredQuery = filteredQuery.in('event_id', eventIds);
                            }
                            return [4 /*yield*/, filteredQuery];
                        case 3:
                            _a = _c.sent(), data_1 = _a.data, error_1 = _a.error;
                            if (error_1)
                                throw error_1;
                            return [2 /*return*/, data_1 || []];
                        case 4: return [4 /*yield*/, query];
                        case 5:
                            _b = _c.sent(), data = _b.data, error = _b.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data || []];
                    }
                });
            });
        };
        InvoicesService_1.prototype.findOne = function (supabase, id) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('invoices')
                                .select('*')
                                .eq('id', id)
                                .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error) {
                                if (error.code === 'PGRST116')
                                    return [2 /*return*/, null];
                                throw error;
                            }
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        InvoicesService_1.prototype.create = function (supabase, invoice) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, ownerUser, userError, authUser, insertError, year, count, invoiceNumber, subtotal, taxRate, discountAmount, taxAmount, totalAmount, amountPaid, amountDue, invoiceData, _b, data, error;
                var _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            if (!invoice.owner_id) return [3 /*break*/, 5];
                            return [4 /*yield*/, supabase
                                    .from('users')
                                    .select('id')
                                    .eq('id', invoice.owner_id)
                                    .single()];
                        case 1:
                            _a = _e.sent(), ownerUser = _a.data, userError = _a.error;
                            if (!(userError || !ownerUser)) return [3 /*break*/, 5];
                            return [4 /*yield*/, supabase.auth.admin.getUserById(invoice.owner_id)];
                        case 2:
                            authUser = (_e.sent()).data;
                            if (!(authUser === null || authUser === void 0 ? void 0 : authUser.user)) return [3 /*break*/, 4];
                            return [4 /*yield*/, supabase
                                    .from('users')
                                    .insert({
                                    id: invoice.owner_id,
                                    email: authUser.user.email,
                                    role: 'owner',
                                    status: 'active',
                                    first_name: ((_c = authUser.user.user_metadata) === null || _c === void 0 ? void 0 : _c.first_name) || '',
                                    last_name: ((_d = authUser.user.user_metadata) === null || _d === void 0 ? void 0 : _d.last_name) || '',
                                })];
                        case 3:
                            insertError = (_e.sent()).error;
                            if (insertError) {
                                console.error('Failed to create user record:', insertError);
                                throw new Error("Cannot create invoice: Failed to create user record. ".concat(insertError.message));
                            }
                            return [3 /*break*/, 5];
                        case 4: throw new Error("Cannot create invoice: User with ID ".concat(invoice.owner_id, " not found."));
                        case 5:
                            year = new Date().getFullYear();
                            return [4 /*yield*/, supabase
                                    .from('invoices')
                                    .select('*', { count: 'exact', head: true })];
                        case 6:
                            count = (_e.sent()).count;
                            invoiceNumber = "INV-".concat(year, "-").concat(String((count || 0) + 1).padStart(5, '0'));
                            subtotal = Number(invoice.subtotal) || 0;
                            taxRate = Number(invoice.tax_rate) || 0;
                            discountAmount = Number(invoice.discount_amount) || 0;
                            taxAmount = (subtotal * taxRate) / 100;
                            totalAmount = subtotal + taxAmount - discountAmount;
                            amountPaid = Number(invoice.amount_paid) || 0;
                            amountDue = totalAmount - amountPaid;
                            invoiceData = __assign(__assign({}, invoice), { invoice_number: invoiceNumber, subtotal: subtotal, tax_rate: taxRate, tax_amount: taxAmount, discount_amount: discountAmount, total_amount: totalAmount, amount_paid: amountPaid, amount_due: amountDue, status: invoice.status || 'draft' });
                            return [4 /*yield*/, supabase
                                    .from('invoices')
                                    .insert(invoiceData)
                                    .select()
                                    .single()];
                        case 7:
                            _b = _e.sent(), data = _b.data, error = _b.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        InvoicesService_1.prototype.update = function (supabase, id, invoice) {
            return __awaiter(this, void 0, void 0, function () {
                var existing, subtotal, taxRate, discountAmount, taxAmount, totalAmount, amountPaid, amountDue, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!(invoice.subtotal !== undefined || invoice.tax_rate !== undefined || invoice.discount_amount !== undefined)) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.findOne(supabase, id)];
                        case 1:
                            existing = _b.sent();
                            if (!existing)
                                return [2 /*return*/, null];
                            subtotal = invoice.subtotal !== undefined ? Number(invoice.subtotal) : existing.subtotal;
                            taxRate = invoice.tax_rate !== undefined ? Number(invoice.tax_rate) : existing.tax_rate;
                            discountAmount = invoice.discount_amount !== undefined ? Number(invoice.discount_amount) : existing.discount_amount;
                            taxAmount = (subtotal * taxRate) / 100;
                            totalAmount = subtotal + taxAmount - discountAmount;
                            amountPaid = invoice.amount_paid !== undefined ? Number(invoice.amount_paid) : existing.amount_paid;
                            amountDue = totalAmount - amountPaid;
                            invoice = __assign(__assign({}, invoice), { tax_amount: taxAmount, total_amount: totalAmount, amount_due: amountDue });
                            _b.label = 2;
                        case 2: return [4 /*yield*/, supabase
                                .from('invoices')
                                .update(invoice)
                                .eq('id', id)
                                .select()
                                .single()];
                        case 3:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error) {
                                if (error.code === 'PGRST116')
                                    return [2 /*return*/, null];
                                throw error;
                            }
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        InvoicesService_1.prototype.recordPayment = function (supabase, id, amount) {
            return __awaiter(this, void 0, void 0, function () {
                var invoice, prevAmountPaid, amountPaid, amountDue, status, updated, booking, user, u, prevStatus, depositAmount, msg, msg, err_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.findOne(supabase, id)];
                        case 1:
                            invoice = _a.sent();
                            if (!invoice)
                                return [2 /*return*/, null];
                            prevAmountPaid = Number(invoice.amount_paid || 0);
                            amountPaid = prevAmountPaid + amount;
                            amountDue = invoice.total_amount - amountPaid;
                            status = amountDue <= 0 ? 'paid' : invoice.status;
                            return [4 /*yield*/, this.update(supabase, id, { amount_paid: amountPaid, amount_due: amountDue, status: status })];
                        case 2:
                            updated = _a.sent();
                            _a.label = 3;
                        case 3:
                            _a.trys.push([3, 11, , 12]);
                            return [4 /*yield*/, supabase
                                    .from('bookings')
                                    .select('*')
                                    .eq('id', invoice.booking_id)
                                    .single()];
                        case 4:
                            booking = (_a.sent()).data;
                            user = null;
                            if (!(booking === null || booking === void 0 ? void 0 : booking.user_id)) return [3 /*break*/, 6];
                            return [4 /*yield*/, supabase
                                    .from('users')
                                    .select('*')
                                    .eq('id', booking.user_id)
                                    .single()];
                        case 5:
                            u = (_a.sent()).data;
                            user = u;
                            _a.label = 6;
                        case 6:
                            prevStatus = invoice.status;
                            depositAmount = Number((booking === null || booking === void 0 ? void 0 : booking.deposit) || 0);
                            if (!(depositAmount > 0 && prevAmountPaid < depositAmount && amountPaid >= depositAmount)) return [3 /*break*/, 8];
                            msg = "Deposit of $".concat(depositAmount.toFixed(2), " received for booking (invoice ").concat((updated === null || updated === void 0 ? void 0 : updated.invoice_number) || id, ").");
                            return [4 /*yield*/, supabase.from('messages').insert([{
                                        recipient_phone: (user === null || user === void 0 ? void 0 : user.phone) || null,
                                        recipient_name: user ? "".concat(user.first_name || '', " ").concat(user.last_name || '').trim() : null,
                                        recipient_type: 'client',
                                        user_id: (user === null || user === void 0 ? void 0 : user.id) || null,
                                        event_id: (booking === null || booking === void 0 ? void 0 : booking.event_id) || null,
                                        message_type: 'invoice',
                                        content: msg,
                                        status: 'pending',
                                    }])];
                        case 7:
                            _a.sent();
                            _a.label = 8;
                        case 8:
                            if (!(status === 'paid' && prevStatus !== 'paid')) return [3 /*break*/, 10];
                            msg = "Your invoice ".concat((updated === null || updated === void 0 ? void 0 : updated.invoice_number) || id, " has been paid in full. Thank you!");
                            return [4 /*yield*/, supabase.from('messages').insert([{
                                        recipient_phone: (user === null || user === void 0 ? void 0 : user.phone) || null,
                                        recipient_name: user ? "".concat(user.first_name || '', " ").concat(user.last_name || '').trim() : null,
                                        recipient_type: 'client',
                                        user_id: (user === null || user === void 0 ? void 0 : user.id) || null,
                                        event_id: (booking === null || booking === void 0 ? void 0 : booking.event_id) || null,
                                        message_type: 'invoice',
                                        content: msg,
                                        status: 'pending',
                                    }])];
                        case 9:
                            _a.sent();
                            _a.label = 10;
                        case 10: return [3 /*break*/, 12];
                        case 11:
                            err_1 = _a.sent();
                            console.error('Failed to create supabase message record for payment notification:', (err_1 === null || err_1 === void 0 ? void 0 : err_1.message) || err_1);
                            return [3 /*break*/, 12];
                        case 12: return [2 /*return*/, updated];
                    }
                });
            });
        };
        InvoicesService_1.prototype.delete = function (supabase, id) {
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
        // Invoice Items
        InvoicesService_1.prototype.getItems = function (supabase, invoiceId) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('invoice_items')
                                .select('*')
                                .eq('invoice_id', invoiceId)
                                .order('created_at', { ascending: true })];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data || []];
                    }
                });
            });
        };
        InvoicesService_1.prototype.addItem = function (supabase, item) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('invoice_items')
                                .insert(item)
                                .select()
                                .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        InvoicesService_1.prototype.updateItem = function (supabase, id, item) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('invoice_items')
                                .update(item)
                                .eq('id', id)
                                .select()
                                .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error) {
                                if (error.code === 'PGRST116')
                                    return [2 /*return*/, null];
                                throw error;
                            }
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        InvoicesService_1.prototype.deleteItem = function (supabase, id) {
            return __awaiter(this, void 0, void 0, function () {
                var error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('invoice_items')
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
