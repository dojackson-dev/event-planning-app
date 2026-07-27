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
exports.RemindersService = void 0;
var common_1 = require("@nestjs/common");
var schedule_1 = require("@nestjs/schedule");
var RemindersService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _sendEventDayReminders_decorators;
    var _sendThreeDayReminders_decorators;
    var _sendOverdueInvoiceReminders_decorators;
    var _sendDepositReminders_decorators;
    var _sendFinalPaymentReminders_decorators;
    var RemindersService = _classThis = /** @class */ (function () {
        function RemindersService_1(supabaseService, mailService) {
            this.supabaseService = (__runInitializers(this, _instanceExtraInitializers), supabaseService);
            this.mailService = mailService;
            this.logger = new common_1.Logger(RemindersService.name);
        }
        // ─── Date helpers ──────────────────────────────────────────────────────────
        RemindersService_1.prototype.today = function () {
            return new Date().toISOString().slice(0, 10);
        };
        RemindersService_1.prototype.addDays = function (dateStr, days) {
            var d = new Date(dateStr + 'T00:00:00Z');
            d.setUTCDate(d.getUTCDate() + days);
            return d.toISOString().slice(0, 10);
        };
        /** Full calendar days between dateA and dateB (positive = A is after B) */
        RemindersService_1.prototype.daysDiff = function (dateA, dateB) {
            var a = new Date(dateA + 'T00:00:00Z').getTime();
            var b = new Date(dateB + 'T00:00:00Z').getTime();
            return Math.round((a - b) / (1000 * 60 * 60 * 24));
        };
        // ─── Helpers to resolve owner account settings ────────────────────────────
        RemindersService_1.prototype.getOwnerDefaults = function (admin, ownerUserIds) {
            return __awaiter(this, void 0, void 0, function () {
                var memberships, userToAccount, _i, _a, m, accountIds, accounts, accountDefaults, _b, _c, acc, result, _d, _e, _f, userId, accountId;
                var _g, _h, _j;
                return __generator(this, function (_k) {
                    switch (_k.label) {
                        case 0:
                            if (!ownerUserIds.length)
                                return [2 /*return*/, {}];
                            return [4 /*yield*/, admin
                                    .from('memberships')
                                    .select('user_id, owner_account_id')
                                    .in('user_id', ownerUserIds)
                                    .eq('role', 'owner')
                                    .eq('is_active', true)];
                        case 1:
                            memberships = (_k.sent()).data;
                            userToAccount = {};
                            for (_i = 0, _a = memberships !== null && memberships !== void 0 ? memberships : []; _i < _a.length; _i++) {
                                m = _a[_i];
                                userToAccount[m.user_id] = m.owner_account_id;
                            }
                            accountIds = __spreadArray([], new Set(Object.values(userToAccount)), true).filter(Boolean);
                            if (!accountIds.length)
                                return [2 /*return*/, {}];
                            return [4 /*yield*/, admin
                                    .from('owner_accounts')
                                    .select('id, default_deposit_due_days_before, default_final_payment_due_days_before')
                                    .in('id', accountIds)];
                        case 2:
                            accounts = (_k.sent()).data;
                            accountDefaults = {};
                            for (_b = 0, _c = accounts !== null && accounts !== void 0 ? accounts : []; _b < _c.length; _b++) {
                                acc = _c[_b];
                                accountDefaults[acc.id] = {
                                    depositDaysBefore: (_g = acc.default_deposit_due_days_before) !== null && _g !== void 0 ? _g : 14,
                                    finalDaysBefore: (_h = acc.default_final_payment_due_days_before) !== null && _h !== void 0 ? _h : 3,
                                };
                            }
                            result = {};
                            for (_d = 0, _e = Object.entries(userToAccount); _d < _e.length; _d++) {
                                _f = _e[_d], userId = _f[0], accountId = _f[1];
                                result[userId] = (_j = accountDefaults[accountId]) !== null && _j !== void 0 ? _j : { depositDaysBefore: 14, finalDaysBefore: 3 };
                            }
                            return [2 /*return*/, result];
                    }
                });
            });
        };
        // ─── 1. Event-day reminders — 8 AM CDT (13:00 UTC) ───────────────────────
        // Emails the client whose event is TODAY with venue info and start time
        RemindersService_1.prototype.sendEventDayReminders = function () {
            return __awaiter(this, void 0, void 0, function () {
                var admin, today, _a, events, error, _i, _b, event_1, venueName, venueAddress, err_1;
                var _c, _d, _e, _f, _g, _h, _j;
                return __generator(this, function (_k) {
                    switch (_k.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            today = this.today();
                            return [4 /*yield*/, admin
                                    .from('event')
                                    .select('id, name, date, start_time, contact_name, contact_email, venues(name, address)')
                                    .gte('date', today + 'T00:00:00Z')
                                    .lte('date', today + 'T23:59:59Z')
                                    .not('contact_email', 'is', null)];
                        case 1:
                            _a = _k.sent(), events = _a.data, error = _a.error;
                            if (error) {
                                this.logger.error('Event-day query failed', error.message);
                                return [2 /*return*/];
                            }
                            this.logger.log("Event-day reminders: ".concat((_c = events === null || events === void 0 ? void 0 : events.length) !== null && _c !== void 0 ? _c : 0, " today"));
                            _i = 0, _b = events !== null && events !== void 0 ? events : [];
                            _k.label = 2;
                        case 2:
                            if (!(_i < _b.length)) return [3 /*break*/, 7];
                            event_1 = _b[_i];
                            _k.label = 3;
                        case 3:
                            _k.trys.push([3, 5, , 6]);
                            venueName = (_e = (_d = event_1.venues) === null || _d === void 0 ? void 0 : _d.name) !== null && _e !== void 0 ? _e : 'the venue';
                            venueAddress = (_g = (_f = event_1.venues) === null || _f === void 0 ? void 0 : _f.address) !== null && _g !== void 0 ? _g : '';
                            return [4 /*yield*/, this.mailService.sendReminderEmail({
                                    toEmail: event_1.contact_email,
                                    toName: (_h = event_1.contact_name) !== null && _h !== void 0 ? _h : 'Guest',
                                    subject: "Your event is TODAY \u2014 ".concat(event_1.name),
                                    body: "This is a reminder that your event \"<strong>".concat(event_1.name, "</strong>\" is scheduled for today.\n\nLocation: ").concat(venueName).concat(venueAddress ? ', ' + venueAddress : '', "\nTime: ").concat((_j = event_1.start_time) !== null && _j !== void 0 ? _j : 'See your booking details', "\n\nWe look forward to hosting you!"),
                                })];
                        case 4:
                            _k.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            err_1 = _k.sent();
                            this.logger.error("Event-day reminder failed (event ".concat(event_1.id, ")"), err_1.message);
                            return [3 /*break*/, 6];
                        case 6:
                            _i++;
                            return [3 /*break*/, 2];
                        case 7: return [2 /*return*/];
                    }
                });
            });
        };
        // ─── 2. 3-day advance reminder — 9 AM CDT (14:00 UTC) ────────────────────
        // Emails clients whose event is exactly 3 days away
        RemindersService_1.prototype.sendThreeDayReminders = function () {
            return __awaiter(this, void 0, void 0, function () {
                var admin, target, _a, events, error, _i, _b, event_2, venueName, eventDate, err_2;
                var _c, _d, _e, _f, _g;
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            target = this.addDays(this.today(), 3);
                            return [4 /*yield*/, admin
                                    .from('event')
                                    .select('id, name, date, start_time, contact_name, contact_email, venues(name, address)')
                                    .gte('date', target + 'T00:00:00Z')
                                    .lte('date', target + 'T23:59:59Z')
                                    .not('contact_email', 'is', null)];
                        case 1:
                            _a = _h.sent(), events = _a.data, error = _a.error;
                            if (error) {
                                this.logger.error('3-day reminder query failed', error.message);
                                return [2 /*return*/];
                            }
                            this.logger.log("3-day reminders: ".concat((_c = events === null || events === void 0 ? void 0 : events.length) !== null && _c !== void 0 ? _c : 0, " events"));
                            _i = 0, _b = events !== null && events !== void 0 ? events : [];
                            _h.label = 2;
                        case 2:
                            if (!(_i < _b.length)) return [3 /*break*/, 7];
                            event_2 = _b[_i];
                            _h.label = 3;
                        case 3:
                            _h.trys.push([3, 5, , 6]);
                            venueName = (_e = (_d = event_2.venues) === null || _d === void 0 ? void 0 : _d.name) !== null && _e !== void 0 ? _e : 'the venue';
                            eventDate = new Date(event_2.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
                            return [4 /*yield*/, this.mailService.sendReminderEmail({
                                    toEmail: event_2.contact_email,
                                    toName: (_f = event_2.contact_name) !== null && _f !== void 0 ? _f : 'Guest',
                                    subject: "Reminder: Your event is in 3 days \u2014 ".concat(event_2.name),
                                    body: "Just a heads up \u2014 your event \"<strong>".concat(event_2.name, "</strong>\" is coming up in 3 days on <strong>").concat(eventDate, "</strong>.\n\nLocation: ").concat(venueName, "\nTime: ").concat((_g = event_2.start_time) !== null && _g !== void 0 ? _g : 'See your booking details', "\n\nIf you have any questions, please don't hesitate to reach out."),
                                })];
                        case 4:
                            _h.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            err_2 = _h.sent();
                            this.logger.error("3-day reminder failed (event ".concat(event_2.id, ")"), err_2.message);
                            return [3 /*break*/, 6];
                        case 6:
                            _i++;
                            return [3 /*break*/, 2];
                        case 7: return [2 /*return*/];
                    }
                });
            });
        };
        // ─── 3. Overdue invoice reminders — 10 AM CDT (15:00 UTC) — WEEKLY ───────
        // Sends once per week (on the due date and every 7 days after) until paid.
        // Targets invoices with status 'sent' or 'partial' whose due_date has passed.
        RemindersService_1.prototype.sendOverdueInvoiceReminders = function () {
            return __awaiter(this, void 0, void 0, function () {
                var admin, today, _a, invoices, error, toNotify, _i, toNotify_1, invoice, dueDate, amountDue, err_3;
                var _this = this;
                var _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            today = this.today();
                            return [4 /*yield*/, admin
                                    .from('invoices')
                                    .select('id, invoice_number, total_amount, amount_due, due_date, client_name, client_email')
                                    .in('status', ['sent', 'partial'])
                                    .lt('due_date', today)
                                    .not('client_email', 'is', null)];
                        case 1:
                            _a = _e.sent(), invoices = _a.data, error = _a.error;
                            if (error) {
                                this.logger.error('Overdue invoice query failed', error.message);
                                return [2 /*return*/];
                            }
                            toNotify = (invoices !== null && invoices !== void 0 ? invoices : []).filter(function (inv) {
                                var daysOverdue = _this.daysDiff(today, inv.due_date.slice(0, 10));
                                return daysOverdue > 0 && daysOverdue % 7 === 0;
                            });
                            this.logger.log("Overdue invoice reminders: ".concat(toNotify.length, " invoice(s) hit weekly mark today"));
                            _i = 0, toNotify_1 = toNotify;
                            _e.label = 2;
                        case 2:
                            if (!(_i < toNotify_1.length)) return [3 /*break*/, 7];
                            invoice = toNotify_1[_i];
                            _e.label = 3;
                        case 3:
                            _e.trys.push([3, 5, , 6]);
                            dueDate = new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                            amountDue = typeof invoice.amount_due === 'number'
                                ? "$".concat(invoice.amount_due.toFixed(2))
                                : "$".concat((_c = (_b = invoice.total_amount) === null || _b === void 0 ? void 0 : _b.toFixed(2)) !== null && _c !== void 0 ? _c : '0.00');
                            return [4 /*yield*/, this.mailService.sendReminderEmail({
                                    toEmail: invoice.client_email,
                                    toName: (_d = invoice.client_name) !== null && _d !== void 0 ? _d : 'Client',
                                    subject: "Payment reminder \u2014 Invoice #".concat(invoice.invoice_number),
                                    body: "This is a friendly reminder that invoice <strong>#".concat(invoice.invoice_number, "</strong> for <strong>").concat(amountDue, "</strong> was due on <strong>").concat(dueDate, "</strong> and remains unpaid.\n\nPlease log in to your client portal to make a payment at your earliest convenience. If you have any questions, please contact us."),
                                })];
                        case 4:
                            _e.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            err_3 = _e.sent();
                            this.logger.error("Overdue invoice reminder failed (invoice ".concat(invoice.id, ")"), err_3.message);
                            return [3 /*break*/, 6];
                        case 6:
                            _i++;
                            return [3 /*break*/, 2];
                        case 7: return [2 /*return*/];
                    }
                });
            });
        };
        // ─── 4. Deposit reminder — 11 AM CDT (16:00 UTC) ─────────────────────────
        // Sends 5 days before the deposit is due, based on the owner's settings
        // (default_deposit_due_days_before on owner_accounts, or per-invoice override).
        // Only fires if the deposit hasn't been paid yet.
        RemindersService_1.prototype.sendDepositReminders = function () {
            return __awaiter(this, void 0, void 0, function () {
                var admin, today, lookahead, _a, events, evErr, eventIds, invoices, invoiceDepositDays, _i, _b, inv, ownerUserIds, ownerDefaults, targetDepositDue, toNotify, _c, toNotify_2, event_3, daysBefore, depositDueDate, eventDate, err_4;
                var _this = this;
                var _d, _e, _f, _g;
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            today = this.today();
                            lookahead = 60;
                            return [4 /*yield*/, admin
                                    .from('event')
                                    .select('id, name, date, contact_name, contact_email, owner_id')
                                    .or('deposit_paid.is.null,deposit_paid.eq.false')
                                    .not('contact_email', 'is', null)
                                    .gte('date', today + 'T00:00:00Z')
                                    .lte('date', this.addDays(today, lookahead) + 'T23:59:59Z')];
                        case 1:
                            _a = _h.sent(), events = _a.data, evErr = _a.error;
                            if (evErr) {
                                this.logger.error('Deposit reminder event query failed', evErr.message);
                                return [2 /*return*/];
                            }
                            if (!(events === null || events === void 0 ? void 0 : events.length))
                                return [2 /*return*/];
                            eventIds = events.map(function (e) { return e.id; });
                            return [4 /*yield*/, admin
                                    .from('invoices')
                                    .select('event_id, deposit_due_days_before')
                                    .in('event_id', eventIds)
                                    .not('deposit_due_days_before', 'is', null)];
                        case 2:
                            invoices = (_h.sent()).data;
                            invoiceDepositDays = {};
                            for (_i = 0, _b = invoices !== null && invoices !== void 0 ? invoices : []; _i < _b.length; _i++) {
                                inv = _b[_i];
                                invoiceDepositDays[inv.event_id] = inv.deposit_due_days_before;
                            }
                            ownerUserIds = __spreadArray([], new Set(events.map(function (e) { return e.owner_id; }).filter(Boolean)), true);
                            return [4 /*yield*/, this.getOwnerDefaults(admin, ownerUserIds)];
                        case 3:
                            ownerDefaults = _h.sent();
                            targetDepositDue = this.addDays(today, 5);
                            toNotify = events.filter(function (event) {
                                var _a, _b, _c;
                                var daysBefore = (_c = (_a = invoiceDepositDays[event.id]) !== null && _a !== void 0 ? _a : (_b = ownerDefaults[event.owner_id]) === null || _b === void 0 ? void 0 : _b.depositDaysBefore) !== null && _c !== void 0 ? _c : 14;
                                var depositDueDate = _this.addDays(event.date.slice(0, 10), -daysBefore);
                                return depositDueDate === targetDepositDue;
                            });
                            this.logger.log("Deposit reminders: ".concat(toNotify.length, " event(s) with deposit due in 5 days"));
                            _c = 0, toNotify_2 = toNotify;
                            _h.label = 4;
                        case 4:
                            if (!(_c < toNotify_2.length)) return [3 /*break*/, 9];
                            event_3 = toNotify_2[_c];
                            _h.label = 5;
                        case 5:
                            _h.trys.push([5, 7, , 8]);
                            daysBefore = (_f = (_d = invoiceDepositDays[event_3.id]) !== null && _d !== void 0 ? _d : (_e = ownerDefaults[event_3.owner_id]) === null || _e === void 0 ? void 0 : _e.depositDaysBefore) !== null && _f !== void 0 ? _f : 14;
                            depositDueDate = new Date(this.addDays(event_3.date.slice(0, 10), -daysBefore) + 'T00:00:00Z')
                                .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
                            eventDate = new Date(event_3.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                            return [4 /*yield*/, this.mailService.sendReminderEmail({
                                    toEmail: event_3.contact_email,
                                    toName: (_g = event_3.contact_name) !== null && _g !== void 0 ? _g : 'Guest',
                                    subject: "Deposit due in 5 days \u2014 ".concat(event_3.name),
                                    body: "This is a reminder that your deposit for \"<strong>".concat(event_3.name, "</strong>\" (scheduled for ").concat(eventDate, ") is due by <strong>").concat(depositDueDate, "</strong>.\n\nPlease submit your deposit to secure your booking. If you have any questions or have already paid, please disregard this message."),
                                })];
                        case 6:
                            _h.sent();
                            return [3 /*break*/, 8];
                        case 7:
                            err_4 = _h.sent();
                            this.logger.error("Deposit reminder failed (event ".concat(event_3.id, ")"), err_4.message);
                            return [3 /*break*/, 8];
                        case 8:
                            _c++;
                            return [3 /*break*/, 4];
                        case 9: return [2 /*return*/];
                    }
                });
            });
        };
        // ─── 5. Final/remaining balance reminders — 12 PM CDT (17:00 UTC) ────────
        // Fires on the day the remaining balance is due, then every 5 days until paid.
        // Due date = event.date - invoice.final_payment_due_days_before
        // For invoices without an event, falls back to invoice.due_date directly.
        RemindersService_1.prototype.sendFinalPaymentReminders = function () {
            return __awaiter(this, void 0, void 0, function () {
                var admin, today, _a, invoices, error, eventIds, eventDateById, events, _i, _b, ev, ownerUserIds, ownerDefaults, toNotify, _c, invoices_1, invoice, finalDueDate, eventDate, daysBefore, daysOverdue, _d, toNotify_3, _e, invoice, daysOverdue, finalDueDate, amountDue, dueDateFormatted, subject, intro, err_5;
                var _f, _g, _h, _j, _k, _l;
                return __generator(this, function (_m) {
                    switch (_m.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            today = this.today();
                            return [4 /*yield*/, admin
                                    .from('invoices')
                                    .select('id, invoice_number, total_amount, amount_due, due_date, client_name, client_email, event_id, final_payment_due_days_before, owner_id')
                                    .in('status', ['sent', 'partial'])
                                    .gt('amount_due', 0)
                                    .not('client_email', 'is', null)];
                        case 1:
                            _a = _m.sent(), invoices = _a.data, error = _a.error;
                            if (error) {
                                this.logger.error('Final payment query failed', error.message);
                                return [2 /*return*/];
                            }
                            if (!(invoices === null || invoices === void 0 ? void 0 : invoices.length))
                                return [2 /*return*/];
                            eventIds = invoices.map(function (i) { return i.event_id; }).filter(Boolean);
                            eventDateById = {};
                            if (!eventIds.length) return [3 /*break*/, 3];
                            return [4 /*yield*/, admin
                                    .from('event')
                                    .select('id, date')
                                    .in('id', eventIds)];
                        case 2:
                            events = (_m.sent()).data;
                            for (_i = 0, _b = events !== null && events !== void 0 ? events : []; _i < _b.length; _i++) {
                                ev = _b[_i];
                                eventDateById[ev.id] = ev.date.slice(0, 10);
                            }
                            _m.label = 3;
                        case 3:
                            ownerUserIds = __spreadArray([], new Set(invoices.map(function (i) { return i.owner_id; }).filter(Boolean)), true);
                            return [4 /*yield*/, this.getOwnerDefaults(admin, ownerUserIds)];
                        case 4:
                            ownerDefaults = _m.sent();
                            toNotify = [];
                            for (_c = 0, invoices_1 = invoices; _c < invoices_1.length; _c++) {
                                invoice = invoices_1[_c];
                                finalDueDate = null;
                                if (invoice.event_id && eventDateById[invoice.event_id]) {
                                    eventDate = eventDateById[invoice.event_id];
                                    daysBefore = (_h = (_f = invoice.final_payment_due_days_before) !== null && _f !== void 0 ? _f : (_g = ownerDefaults[invoice.owner_id]) === null || _g === void 0 ? void 0 : _g.finalDaysBefore) !== null && _h !== void 0 ? _h : 3;
                                    finalDueDate = this.addDays(eventDate, -daysBefore);
                                }
                                else if (invoice.due_date) {
                                    // Standalone invoice — use the invoice due_date directly
                                    finalDueDate = invoice.due_date.slice(0, 10);
                                }
                                if (!finalDueDate)
                                    continue;
                                daysOverdue = this.daysDiff(today, finalDueDate);
                                // Send on due date (day 0) and every 5 days after
                                if (daysOverdue >= 0 && daysOverdue % 5 === 0) {
                                    toNotify.push({ invoice: invoice, daysOverdue: daysOverdue, finalDueDate: finalDueDate });
                                }
                            }
                            this.logger.log("Final payment reminders: ".concat(toNotify.length, " invoice(s) to notify today"));
                            _d = 0, toNotify_3 = toNotify;
                            _m.label = 5;
                        case 5:
                            if (!(_d < toNotify_3.length)) return [3 /*break*/, 10];
                            _e = toNotify_3[_d], invoice = _e.invoice, daysOverdue = _e.daysOverdue, finalDueDate = _e.finalDueDate;
                            _m.label = 6;
                        case 6:
                            _m.trys.push([6, 8, , 9]);
                            amountDue = typeof invoice.amount_due === 'number'
                                ? "$".concat(invoice.amount_due.toFixed(2))
                                : "$".concat((_k = (_j = invoice.total_amount) === null || _j === void 0 ? void 0 : _j.toFixed(2)) !== null && _k !== void 0 ? _k : '0.00');
                            dueDateFormatted = new Date(finalDueDate + 'T00:00:00Z')
                                .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                            subject = daysOverdue === 0
                                ? "Final payment due today \u2014 Invoice #".concat(invoice.invoice_number)
                                : "Final payment ".concat(daysOverdue, " days overdue \u2014 Invoice #").concat(invoice.invoice_number);
                            intro = daysOverdue === 0
                                ? "Your remaining balance of <strong>".concat(amountDue, "</strong> for invoice <strong>#").concat(invoice.invoice_number, "</strong> is due today (<strong>").concat(dueDateFormatted, "</strong>).")
                                : "Your remaining balance of <strong>".concat(amountDue, "</strong> for invoice <strong>#").concat(invoice.invoice_number, "</strong> was due on <strong>").concat(dueDateFormatted, "</strong> and is now <strong>").concat(daysOverdue, " days overdue</strong>.");
                            return [4 /*yield*/, this.mailService.sendReminderEmail({
                                    toEmail: invoice.client_email,
                                    toName: (_l = invoice.client_name) !== null && _l !== void 0 ? _l : 'Client',
                                    subject: subject,
                                    body: "".concat(intro, "\n\nPlease log in to your client portal to complete your payment. If you have already paid or have any questions, please contact us directly."),
                                })];
                        case 7:
                            _m.sent();
                            return [3 /*break*/, 9];
                        case 8:
                            err_5 = _m.sent();
                            this.logger.error("Final payment reminder failed (invoice ".concat(invoice.id, ")"), err_5.message);
                            return [3 /*break*/, 9];
                        case 9:
                            _d++;
                            return [3 /*break*/, 5];
                        case 10: return [2 /*return*/];
                    }
                });
            });
        };
        return RemindersService_1;
    }());
    __setFunctionName(_classThis, "RemindersService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _sendEventDayReminders_decorators = [(0, schedule_1.Cron)('0 13 * * *')];
        _sendThreeDayReminders_decorators = [(0, schedule_1.Cron)('0 14 * * *')];
        _sendOverdueInvoiceReminders_decorators = [(0, schedule_1.Cron)('0 15 * * *')];
        _sendDepositReminders_decorators = [(0, schedule_1.Cron)('0 16 * * *')];
        _sendFinalPaymentReminders_decorators = [(0, schedule_1.Cron)('0 17 * * *')];
        __esDecorate(_classThis, null, _sendEventDayReminders_decorators, { kind: "method", name: "sendEventDayReminders", static: false, private: false, access: { has: function (obj) { return "sendEventDayReminders" in obj; }, get: function (obj) { return obj.sendEventDayReminders; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _sendThreeDayReminders_decorators, { kind: "method", name: "sendThreeDayReminders", static: false, private: false, access: { has: function (obj) { return "sendThreeDayReminders" in obj; }, get: function (obj) { return obj.sendThreeDayReminders; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _sendOverdueInvoiceReminders_decorators, { kind: "method", name: "sendOverdueInvoiceReminders", static: false, private: false, access: { has: function (obj) { return "sendOverdueInvoiceReminders" in obj; }, get: function (obj) { return obj.sendOverdueInvoiceReminders; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _sendDepositReminders_decorators, { kind: "method", name: "sendDepositReminders", static: false, private: false, access: { has: function (obj) { return "sendDepositReminders" in obj; }, get: function (obj) { return obj.sendDepositReminders; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _sendFinalPaymentReminders_decorators, { kind: "method", name: "sendFinalPaymentReminders", static: false, private: false, access: { has: function (obj) { return "sendFinalPaymentReminders" in obj; }, get: function (obj) { return obj.sendFinalPaymentReminders; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        RemindersService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return RemindersService = _classThis;
}();
exports.RemindersService = RemindersService;
