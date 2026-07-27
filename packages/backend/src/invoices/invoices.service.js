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
// @ts-nocheck
// NOTE: This file is legacy TypeORM code, superseded by invoices-supabase.service.ts
// Kept for reference only — not imported by any active module.
var common_1 = require("@nestjs/common");
var typeorm_1 = require("@nestjs/typeorm");
var invoice_entity_1 = require("../entities/invoice.entity");
var invoice_item_entity_1 = require("../entities/invoice-item.entity");
var booking_entity_1 = require("../entities/booking.entity");
var InvoicesService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var InvoicesService = _classThis = /** @class */ (function () {
        function InvoicesService_1(invoiceRepository, invoiceItemRepository, bookingRepository, messagingService) {
            this.invoiceRepository = invoiceRepository;
            this.invoiceItemRepository = invoiceItemRepository;
            this.bookingRepository = bookingRepository;
            this.messagingService = messagingService;
        }
        // NOTE: MessagingService injected lazily to avoid circular imports in some setups.
        InvoicesService_1.prototype.findAll = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.invoiceRepository.find({
                            relations: ['booking', 'booking.user', 'booking.event', 'items'],
                            order: { createdAt: 'DESC' },
                        })];
                });
            });
        };
        InvoicesService_1.prototype.findByOwner = function (ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.invoiceRepository.find({
                            where: { ownerId: ownerId },
                            relations: ['booking', 'booking.user', 'booking.event', 'items'],
                            order: { createdAt: 'DESC' },
                        })];
                });
            });
        };
        InvoicesService_1.prototype.findOne = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.invoiceRepository.findOne({
                            where: { id: id },
                            relations: ['booking', 'booking.user', 'booking.event', 'items'],
                        })];
                });
            });
        };
        InvoicesService_1.prototype.create = function (invoiceData) {
            return __awaiter(this, void 0, void 0, function () {
                var count, invoiceNumber, subtotal, taxAmount, totalAmount, amountDue, invoice;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.invoiceRepository.count()];
                        case 1:
                            count = _b.sent();
                            invoiceNumber = "INV-".concat(new Date().getFullYear(), "-").concat(String(count + 1).padStart(5, '0'));
                            subtotal = ((_a = invoiceData.items) === null || _a === void 0 ? void 0 : _a.reduce(function (sum, item) { return sum + Number(item.amount); }, 0)) || 0;
                            taxAmount = subtotal * (Number(invoiceData.taxRate) || 0) / 100;
                            totalAmount = subtotal + taxAmount - Number(invoiceData.discountAmount || 0);
                            amountDue = totalAmount - Number(invoiceData.amountPaid || 0);
                            invoice = this.invoiceRepository.create(__assign(__assign({}, invoiceData), { invoiceNumber: invoiceNumber, subtotal: subtotal, taxAmount: taxAmount, totalAmount: totalAmount, amountDue: amountDue, status: invoiceData.status || invoice_entity_1.InvoiceStatus.DRAFT }));
                            return [2 /*return*/, this.invoiceRepository.save(invoice)];
                    }
                });
            });
        };
        InvoicesService_1.prototype.update = function (id, invoiceData) {
            return __awaiter(this, void 0, void 0, function () {
                var invoice, items, subtotal, taxRate, discountAmount, taxAmount, totalAmount, amountPaid, amountDue, totalAmount, prevStatus, updated, userId, msg, err_1;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.findOne(id)];
                        case 1:
                            invoice = _b.sent();
                            if (!invoice) {
                                return [2 /*return*/, null];
                            }
                            // Recalculate totals if items or rates changed
                            if (invoiceData.items || invoiceData.taxRate !== undefined || invoiceData.discountAmount !== undefined) {
                                items = invoiceData.items || invoice.items;
                                subtotal = items.reduce(function (sum, item) { return sum + Number(item.amount); }, 0);
                                taxRate = invoiceData.taxRate !== undefined ? invoiceData.taxRate : invoice.taxRate;
                                discountAmount = invoiceData.discountAmount !== undefined ? invoiceData.discountAmount : invoice.discountAmount;
                                taxAmount = subtotal * Number(taxRate) / 100;
                                totalAmount = subtotal + taxAmount - Number(discountAmount);
                                amountPaid = invoiceData.amountPaid !== undefined ? invoiceData.amountPaid : invoice.amountPaid;
                                amountDue = totalAmount - Number(amountPaid);
                                invoiceData = __assign(__assign({}, invoiceData), { subtotal: subtotal, taxAmount: taxAmount, totalAmount: totalAmount, amountDue: amountDue });
                            }
                            // Update status based on payment
                            if (invoiceData.amountPaid !== undefined) {
                                totalAmount = invoiceData.totalAmount || invoice.totalAmount;
                                if (Number(invoiceData.amountPaid) >= Number(totalAmount)) {
                                    invoiceData.status = invoice_entity_1.InvoiceStatus.PAID;
                                    invoiceData.paidDate = new Date();
                                }
                                else if (Number(invoiceData.amountPaid) > 0) {
                                    invoiceData.status = invoice_entity_1.InvoiceStatus.PARTIAL;
                                }
                            }
                            prevStatus = invoice.status;
                            return [4 /*yield*/, this.invoiceRepository.update(id, invoiceData)];
                        case 2:
                            _b.sent();
                            return [4 /*yield*/, this.findOne(id)];
                        case 3:
                            updated = _b.sent();
                            _b.label = 4;
                        case 4:
                            _b.trys.push([4, 7, , 8]);
                            if (!(invoiceData.status === invoice_entity_1.InvoiceStatus.PAID && prevStatus !== invoice_entity_1.InvoiceStatus.PAID && updated)) return [3 /*break*/, 6];
                            userId = (_a = updated.booking) === null || _a === void 0 ? void 0 : _a.userId;
                            if (!userId) return [3 /*break*/, 6];
                            msg = "Your invoice ".concat(updated.invoiceNumber, " has been paid in full. Thank you!");
                            return [4 /*yield*/, this.messagingService.sendInvoiceUpdate(userId, updated.id, msg)];
                        case 5:
                            _b.sent();
                            _b.label = 6;
                        case 6: return [3 /*break*/, 8];
                        case 7:
                            err_1 = _b.sent();
                            // Log and continue — messaging failures should not break invoice update
                            console.error('Failed to send invoice-paid notification:', (err_1 === null || err_1 === void 0 ? void 0 : err_1.message) || err_1);
                            return [3 /*break*/, 8];
                        case 8: return [2 /*return*/, updated];
                    }
                });
            });
        };
        InvoicesService_1.prototype.delete = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.invoiceRepository.delete(id)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        InvoicesService_1.prototype.recordPayment = function (id, amount) {
            return __awaiter(this, void 0, void 0, function () {
                var invoice, prevAmountPaid, newAmountPaid, updated, depositAmount, userId, msg, err_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.findOne(id)];
                        case 1:
                            invoice = _a.sent();
                            if (!invoice) {
                                return [2 /*return*/, null];
                            }
                            prevAmountPaid = Number(invoice.amountPaid) || 0;
                            newAmountPaid = prevAmountPaid + amount;
                            return [4 /*yield*/, this.update(id, { amountPaid: newAmountPaid })];
                        case 2:
                            updated = _a.sent();
                            _a.label = 3;
                        case 3:
                            _a.trys.push([3, 6, , 7]);
                            if (!(updated && updated.booking)) return [3 /*break*/, 5];
                            depositAmount = Number(updated.booking.deposit || 0);
                            if (!(depositAmount > 0 && prevAmountPaid < depositAmount && newAmountPaid >= depositAmount)) return [3 /*break*/, 5];
                            userId = updated.booking.userId;
                            if (!userId) return [3 /*break*/, 5];
                            msg = "Deposit of $".concat(depositAmount.toFixed(2), " received for booking associated with invoice ").concat(updated.invoiceNumber, ".");
                            return [4 /*yield*/, this.messagingService.sendInvoiceUpdate(userId, updated.id, msg)];
                        case 4:
                            _a.sent();
                            _a.label = 5;
                        case 5: return [3 /*break*/, 7];
                        case 6:
                            err_2 = _a.sent();
                            console.error('Failed to send deposit notification:', (err_2 === null || err_2 === void 0 ? void 0 : err_2.message) || err_2);
                            return [3 /*break*/, 7];
                        case 7: return [2 /*return*/, updated];
                    }
                });
            });
        };
        InvoicesService_1.prototype.generateFromBooking = function (bookingId) {
            return __awaiter(this, void 0, void 0, function () {
                var booking, issueDate, dueDate, invoice, invoiceItem, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.bookingRepository.findOne({
                                where: { id: bookingId },
                            })];
                        case 1:
                            booking = _a.sent();
                            if (!booking) {
                                throw new Error('Booking not found');
                            }
                            issueDate = new Date();
                            dueDate = new Date();
                            dueDate.setDate(dueDate.getDate() + 30); // 30 days payment terms
                            return [4 /*yield*/, this.create({
                                    bookingId: bookingId,
                                    items: [],
                                    taxRate: 0, // Set your default tax rate
                                    discountAmount: 0,
                                    amountPaid: booking.deposit || 0,
                                    issueDate: issueDate,
                                    dueDate: dueDate,
                                    status: invoice_entity_1.InvoiceStatus.DRAFT,
                                    terms: 'Payment due within 30 days',
                                })];
                        case 2:
                            invoice = _a.sent();
                            invoiceItem = this.invoiceItemRepository.create({
                                invoiceId: invoice.id,
                                description: 'Event Booking',
                                quantity: 1,
                                standardPrice: booking.totalPrice,
                                unitPrice: booking.totalPrice,
                                subtotal: booking.totalPrice,
                                discountType: invoice_item_entity_1.DiscountType.NONE,
                                discountValue: 0,
                                discountAmount: 0,
                                amount: booking.totalPrice,
                                sortOrder: 0,
                            });
                            return [4 /*yield*/, this.invoiceItemRepository.save(invoiceItem)];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, this.findOne(invoice.id)];
                        case 4:
                            result = _a.sent();
                            if (!result) {
                                throw new Error('Failed to create invoice');
                            }
                            return [2 /*return*/, result];
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
