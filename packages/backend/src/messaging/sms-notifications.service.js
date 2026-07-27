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
exports.SmsNotificationsService = void 0;
var common_1 = require("@nestjs/common");
/**
 * Central SMS notification hub.
 *
 * Every outbound notification triggered by an owner or vendor action is routed
 * through this service.  All methods accept a nullable `phone` parameter and
 * silently skip sending if it is absent, so callers never need to guard against
 * missing phone numbers.
 *
 * Every message includes a relevant deep-link so the recipient can log in and
 * act immediately.
 */
var SmsNotificationsService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var SmsNotificationsService = _classThis = /** @class */ (function () {
        function SmsNotificationsService_1(twilioService, configService) {
            this.twilioService = twilioService;
            this.configService = configService;
            this.logger = new common_1.Logger(SmsNotificationsService.name);
            this.frontendUrl = this.configService.get('FRONTEND_URL', 'https://dovenuesuite.com');
        }
        // ─── URL helpers ──────────────────────────────────────────────────────────
        SmsNotificationsService_1.prototype.url = function (path) {
            return "".concat(this.frontendUrl).concat(path);
        };
        // ─── Internal helper ──────────────────────────────────────────────────────
        SmsNotificationsService_1.prototype.trySend = function (to, body) {
            return __awaiter(this, void 0, void 0, function () {
                var err_1;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!to)
                                return [2 /*return*/];
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.twilioService.sendSMS(to, body)];
                        case 2:
                            _b.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            err_1 = _b.sent();
                            this.logger.warn("SMS notification failed to ".concat(to, ": ").concat((_a = err_1 === null || err_1 === void 0 ? void 0 : err_1.message) !== null && _a !== void 0 ? _a : err_1));
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        // ─── INVOICES ─────────────────────────────────────────────────────────────
        SmsNotificationsService_1.prototype.invoiceSent = function (phone, clientName, invoiceNumber, amount, payUrl) {
            return __awaiter(this, void 0, void 0, function () {
                var amt, link;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            amt = "$".concat(Number(amount).toFixed(2));
                            link = payUrl !== null && payUrl !== void 0 ? payUrl : this.url('/client-portal');
                            return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Invoice Message\nHi ".concat(clientName, ", invoice ").concat(invoiceNumber, " for ").concat(amt, " has been sent to you. View & pay here: ").concat(link))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        SmsNotificationsService_1.prototype.invoicePaid = function (phone, clientName, invoiceNumber, amount) {
            return __awaiter(this, void 0, void 0, function () {
                var amt;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            amt = "$".concat(Number(amount).toFixed(2));
                            return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Invoice Message\nHi ".concat(clientName, ", your payment of ").concat(amt, " for invoice ").concat(invoiceNumber, " has been received. Thank you! View your records: ").concat(this.url('/client-portal')))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        SmsNotificationsService_1.prototype.invoiceUpdated = function (phone, clientName, invoiceNumber) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Invoice Message\nHi ".concat(clientName, ", invoice ").concat(invoiceNumber, " has been updated. Log in to view the latest details: ").concat(this.url('/client-portal')))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        SmsNotificationsService_1.prototype.invoiceOverdue = function (phone, clientName, invoiceNumber, amount) {
            return __awaiter(this, void 0, void 0, function () {
                var amt;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            amt = "$".concat(Number(amount).toFixed(2));
                            return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Invoice Message\nHi ".concat(clientName, ", invoice ").concat(invoiceNumber, " for ").concat(amt, " is now past due. Please make payment: ").concat(this.url('/client-portal')))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        SmsNotificationsService_1.prototype.invoicePartialPayment = function (phone, clientName, invoiceNumber, paidAmount, remainingAmount) {
            return __awaiter(this, void 0, void 0, function () {
                var paid, remaining;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            paid = "$".concat(Number(paidAmount).toFixed(2));
                            remaining = "$".concat(Number(remainingAmount).toFixed(2));
                            return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Invoice Message\nHi ".concat(clientName, ", a payment of ").concat(paid, " has been recorded on invoice ").concat(invoiceNumber, ". Remaining balance: ").concat(remaining, ". Log in: ").concat(this.url('/client-portal')))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        // ─── ESTIMATES ────────────────────────────────────────────────────────────
        SmsNotificationsService_1.prototype.estimateSent = function (phone, clientName, estimateNumber, amount) {
            return __awaiter(this, void 0, void 0, function () {
                var amt;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            amt = "$".concat(Number(amount).toFixed(2));
                            return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Estimate Message\nHi ".concat(clientName, ", estimate ").concat(estimateNumber, " for ").concat(amt, " is ready for your review. Approve or decline here: ").concat(this.url('/client-portal/estimates')))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        SmsNotificationsService_1.prototype.estimateApproved = function (phone, notifyName, estimateNumber) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Estimate Message\nGreat news! Estimate ".concat(estimateNumber, " has been approved by ").concat(notifyName, ". Log in to view: ").concat(this.url('/dashboard')))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        SmsNotificationsService_1.prototype.estimateRejected = function (phone, clientName, estimateNumber) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Estimate Message\nHi ".concat(clientName, ", estimate ").concat(estimateNumber, " has been declined. Contact us with any questions. View details: ").concat(this.url('/client-portal/estimates')))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        SmsNotificationsService_1.prototype.estimateUpdated = function (phone, clientName, estimateNumber) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Estimate Message\nHi ".concat(clientName, ", estimate ").concat(estimateNumber, " has been updated. Review the changes: ").concat(this.url('/client-portal/estimates')))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        SmsNotificationsService_1.prototype.estimateExpired = function (phone, clientName, estimateNumber) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Estimate Message\nHi ".concat(clientName, ", estimate ").concat(estimateNumber, " has expired. Please contact us to request a new one. View your estimates: ").concat(this.url('/client-portal/estimates')))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        // ─── CONTRACTS ────────────────────────────────────────────────────────────
        SmsNotificationsService_1.prototype.contractSent = function (phone, clientName, contractNumber, contractUrl) {
            return __awaiter(this, void 0, void 0, function () {
                var link;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            link = contractUrl !== null && contractUrl !== void 0 ? contractUrl : this.url('/client-portal/contracts');
                            return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Contract Message\nHi ".concat(clientName, ", contract ").concat(contractNumber, " is ready for your signature. Sign here: ").concat(link))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        SmsNotificationsService_1.prototype.contractSigned = function (phone, clientName, contractNumber) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Contract Message\nContract ".concat(contractNumber, " has been signed by ").concat(clientName, ". Log in to view the signed copy: ").concat(this.url('/dashboard')))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        SmsNotificationsService_1.prototype.contractUpdated = function (phone, clientName, contractNumber) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Contract Message\nHi ".concat(clientName, ", contract ").concat(contractNumber, " has been updated. Log in to review the changes: ").concat(this.url('/client-portal/contracts')))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        SmsNotificationsService_1.prototype.contractSignedConfirmToClient = function (phone, signerName, contractNumber) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Contract Message\nHi ".concat(signerName, ", you have successfully signed contract ").concat(contractNumber, ". View your copy here: ").concat(this.url('/client-portal/contracts')))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        // ─── SECURITY PERSONNEL ──────────────────────────────────────────────────
        SmsNotificationsService_1.prototype.securityAssigned = function (phone, name, eventName, date, location) {
            return __awaiter(this, void 0, void 0, function () {
                var loc;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            loc = location ? " at ".concat(location) : '';
                            return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Security Message\nHi ".concat(name, ", you have been assigned to security for \"").concat(eventName, "\" on ").concat(date).concat(loc, ". Please confirm your availability. Log in: ").concat(this.url('/vendor-portal/login')))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        SmsNotificationsService_1.prototype.securityUpdated = function (phone, name, eventName) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Security Message\nHi ".concat(name, ", your security assignment for \"").concat(eventName, "\" has been updated. Log in to view the details: ").concat(this.url('/vendor-portal/login')))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        SmsNotificationsService_1.prototype.securityArrivalRecorded = function (phone, name, eventName) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Security Message\nArrival confirmed for ".concat(name, " at \"").concat(eventName, "\". View your portal: ").concat(this.url('/vendor-portal')))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        // ─── VENDOR BOOKINGS ──────────────────────────────────────────────────────
        SmsNotificationsService_1.prototype.vendorBookingCreated = function (phone, vendorName, eventName, date, amount) {
            return __awaiter(this, void 0, void 0, function () {
                var amt;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            amt = amount ? " \u2014 Agreed amount: $".concat(Number(amount).toLocaleString()) : '';
                            return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Booking Message\nNew booking request for ".concat(vendorName, "! Event: \"").concat(eventName, "\" on ").concat(date).concat(amt, ". Confirm or decline here: ").concat(this.url('/vendor-portal')))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        SmsNotificationsService_1.prototype.vendorBookingStatusChanged = function (phone_1, recipientName_1, eventName_1, status_1) {
            return __awaiter(this, arguments, void 0, function (phone, recipientName, eventName, status, isVendor, portalPath) {
                var statusMessages, msg, portalLink;
                var _a;
                if (isVendor === void 0) { isVendor = false; }
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            statusMessages = {
                                confirmed: "Your booking for \"".concat(eventName, "\" has been confirmed!"),
                                declined: "Your booking request for \"".concat(eventName, "\" has been declined."),
                                cancelled: "Your booking for \"".concat(eventName, "\" has been cancelled."),
                                completed: "Your booking for \"".concat(eventName, "\" has been marked as completed."),
                                paid: "Payment for your booking at \"".concat(eventName, "\" has been received. Thank you!"),
                            };
                            msg = (_a = statusMessages[status]) !== null && _a !== void 0 ? _a : "Your booking for \"".concat(eventName, "\" has been updated to: ").concat(status, ".");
                            portalLink = portalPath
                                ? this.url(portalPath)
                                : isVendor
                                    ? this.url('/vendor-portal')
                                    : this.url('/client-portal');
                            return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Booking Message\nHi ".concat(recipientName, ", ").concat(msg, " View details: ").concat(portalLink))];
                        case 1:
                            _b.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        SmsNotificationsService_1.prototype.vendorBookingRequestUpdated = function (phone, clientName, status, vendorName, quotedAmount) {
            return __awaiter(this, void 0, void 0, function () {
                var amt;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            amt = quotedAmount != null ? " (Quoted: $".concat(Number(quotedAmount).toFixed(2), ")") : '';
                            if (!(status === 'confirmed')) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Booking Message\nHi ".concat(clientName, ", great news! ").concat(vendorName, " has confirmed your booking request").concat(amt, ". Log in to your portal: ").concat(this.url('/client-portal')))];
                        case 1:
                            _a.sent();
                            return [3 /*break*/, 6];
                        case 2:
                            if (!(status === 'declined')) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Booking Message\nHi ".concat(clientName, ", ").concat(vendorName, " is unable to accommodate your booking request at this time. View details: ").concat(this.url('/client-portal')))];
                        case 3:
                            _a.sent();
                            return [3 /*break*/, 6];
                        case 4: return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Booking Message\nHi ".concat(clientName, ", your booking request with ").concat(vendorName, " has been updated to: ").concat(status).concat(amt, ". Log in: ").concat(this.url('/client-portal')))];
                        case 5:
                            _a.sent();
                            _a.label = 6;
                        case 6: return [2 /*return*/];
                    }
                });
            });
        };
        // ─── VENDOR INVOICES ──────────────────────────────────────────────────────
        SmsNotificationsService_1.prototype.vendorInvoiceSent = function (phone, clientName, vendorName, amount, payUrl) {
            return __awaiter(this, void 0, void 0, function () {
                var amt, link;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            amt = "$".concat(Number(amount).toFixed(2));
                            link = payUrl !== null && payUrl !== void 0 ? payUrl : this.url('/client-portal');
                            return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Vendor Invoice Message\nHi ".concat(clientName, ", you have an invoice for ").concat(amt, " from ").concat(vendorName, ". Pay here: ").concat(link))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        SmsNotificationsService_1.prototype.vendorInvoicePaid = function (phone, vendorName, clientName, amount) {
            return __awaiter(this, void 0, void 0, function () {
                var amt;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            amt = "$".concat(Number(amount).toFixed(2));
                            return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Vendor Invoice Message\nPayment of ".concat(amt, " received from ").concat(clientName, ". Your invoice has been marked as paid. View your invoices: ").concat(this.url('/vendor-portal/invoices'), " \u2014 ").concat(vendorName))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        SmsNotificationsService_1.prototype.vendorInvoiceUpdated = function (phone, clientName, vendorName, invoiceNumber) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Vendor Invoice Message\nHi ".concat(clientName, ", your invoice ").concat(invoiceNumber, " from ").concat(vendorName, " has been updated. Log in to view: ").concat(this.url('/client-portal')))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        // ─── MESSAGES / CHAT ──────────────────────────────────────────────────────
        SmsNotificationsService_1.prototype.newMessageReceived = function (phone_1, recipientName_1, senderName_1, preview_1) {
            return __awaiter(this, arguments, void 0, function (phone, recipientName, senderName, preview, isVendor) {
                var snippet, portalLink;
                if (isVendor === void 0) { isVendor = false; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            snippet = preview
                                ? ": \"".concat(preview.substring(0, 80)).concat(preview.length > 80 ? '...' : '', "\"")
                                : '';
                            portalLink = isVendor
                                ? this.url('/vendor-portal')
                                : this.url('/client-portal/messages');
                            return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Message\nHi ".concat(recipientName, ", you have a new message from ").concat(senderName).concat(snippet, ". Reply here: ").concat(portalLink))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        // ─── PAYMENTS ─────────────────────────────────────────────────────────────
        SmsNotificationsService_1.prototype.paymentReceived = function (phone, clientName, amount, reference) {
            return __awaiter(this, void 0, void 0, function () {
                var amt;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            amt = "$".concat(Number(amount).toFixed(2));
                            return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Payment Message\nHi ".concat(clientName, ", your payment of ").concat(amt, " for ").concat(reference, " has been received. Thank you! View your portal: ").concat(this.url('/client-portal')))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        SmsNotificationsService_1.prototype.paymentReminder = function (phone, clientName, amount, dueDate, reference, payUrl) {
            return __awaiter(this, void 0, void 0, function () {
                var amt, link;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            amt = "$".concat(Number(amount).toFixed(2));
                            link = payUrl !== null && payUrl !== void 0 ? payUrl : this.url('/client-portal');
                            return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Payment Message\nHi ".concat(clientName, ", a friendly reminder that ").concat(amt, " for ").concat(reference, " is due on ").concat(dueDate, ". Pay here: ").concat(link))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        // ─── INTAKE FORMS ─────────────────────────────────────────────────────────
        SmsNotificationsService_1.prototype.newIntakeFormSubmission = function (phone, clientName, eventType, eventDate) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Client Message\nNew intake form submitted by ".concat(clientName, " for a ").concat(eventType, " event on ").concat(eventDate, ". Log in to review: ").concat(this.url('/dashboard/clients')))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        // ─── VENDOR REVIEWS ──────────────────────────────────────────────────────
        SmsNotificationsService_1.prototype.vendorReviewReceived = function (phone, vendorName, rating, vendorAccountId) {
            return __awaiter(this, void 0, void 0, function () {
                var stars;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            stars = '⭐'.repeat(Math.min(5, Math.max(1, rating)));
                            return [4 /*yield*/, this.trySend(phone, "DoVenue Suite Review Message\nHi ".concat(vendorName, ", you just received a new ").concat(stars, " review! See it here: ").concat(this.url("/vendors/".concat(vendorAccountId))))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Generic send — use only when no typed method fits.
         */
        SmsNotificationsService_1.prototype.send = function (phone, body) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.trySend(phone, body)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        return SmsNotificationsService_1;
    }());
    __setFunctionName(_classThis, "SmsNotificationsService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SmsNotificationsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SmsNotificationsService = _classThis;
}();
exports.SmsNotificationsService = SmsNotificationsService;
