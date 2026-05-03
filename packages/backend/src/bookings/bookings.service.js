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
exports.BookingsService = void 0;
var common_1 = require("@nestjs/common");
/**
 * BookingsService — booking table removed.
 * "Bookings" are now just events where payment_status = deposit_paid | paid.
 * All reads/writes go to the `event` table directly.
 */
var BookingsService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var BookingsService = _classThis = /** @class */ (function () {
        function BookingsService_1(supabaseService, smsNotifications) {
            this.supabaseService = supabaseService;
            this.smsNotifications = smsNotifications;
        }
        BookingsService_1.prototype.findAll = function (supabase, venueId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, query, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            console.log('Fetching bookings (from event table)...');
                            admin = this.supabaseService.getAdminClient();
                            query = admin
                                .from('event')
                                .select('*, intake_form:intake_forms!intake_form_id(contact_name, contact_phone, event_name, event_type)')
                                .in('client_status', ['deposit_paid', 'completed'])
                                .order('date', { ascending: false });
                            if (venueId) {
                                query = query.eq('venue_id', venueId);
                            }
                            return [4 /*yield*/, query];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error) {
                                console.error('Error fetching bookings:', error);
                                throw error;
                            }
                            console.log('Bookings fetched:', (data === null || data === void 0 ? void 0 : data.length) || 0);
                            return [2 /*return*/, data || []];
                    }
                });
            });
        };
        BookingsService_1.prototype.findOne = function (supabase, id) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('event')
                                    .select('*, intake_form:intake_forms!intake_form_id(contact_name, contact_phone, contact_email, event_name, event_type)')
                                    .eq('id', id)
                                    .maybeSingle()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error && error.code !== 'PGRST116')
                                throw error;
                            if (!data)
                                throw new common_1.NotFoundException("Event/Booking ".concat(id, " not found"));
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        BookingsService_1.prototype.create = function (supabase, booking) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('event')
                                .insert([booking])
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
        BookingsService_1.prototype.update = function (supabase, id, booking) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error, phone, name_1, eventName, _b;
                var _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('event')
                                    .update(booking)
                                    .eq('id', id)
                                    .select()
                                    .single()];
                        case 1:
                            _a = _e.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            if (!(booking.client_status === 'deposit_paid' || booking.status === 'confirmed')) return [3 /*break*/, 6];
                            _e.label = 2;
                        case 2:
                            _e.trys.push([2, 5, , 6]);
                            phone = (data === null || data === void 0 ? void 0 : data.contact_phone) || ((_c = data === null || data === void 0 ? void 0 : data.intake_form) === null || _c === void 0 ? void 0 : _c.contact_phone);
                            name_1 = (data === null || data === void 0 ? void 0 : data.contact_name) || ((_d = data === null || data === void 0 ? void 0 : data.intake_form) === null || _d === void 0 ? void 0 : _d.contact_name) || 'Valued Client';
                            eventName = (data === null || data === void 0 ? void 0 : data.name) || 'your event';
                            if (!phone) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.smsNotifications.vendorBookingStatusChanged(phone, name_1, eventName, 'confirmed', false)];
                        case 3:
                            _e.sent();
                            _e.label = 4;
                        case 4: return [3 /*break*/, 6];
                        case 5:
                            _b = _e.sent();
                            return [3 /*break*/, 6];
                        case 6: return [2 /*return*/, data];
                    }
                });
            });
        };
        /**
         * Cancel an event (was: cancel booking).
         */
        BookingsService_1.prototype.cancelBooking = function (supabase, id) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, event, fetchErr, cancelErr, phone, form;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('event')
                                    .select('id, contact_phone, contact_name, intake_form_id')
                                    .eq('id', id)
                                    .maybeSingle()];
                        case 1:
                            _a = _b.sent(), event = _a.data, fetchErr = _a.error;
                            if (fetchErr || !event)
                                throw new common_1.NotFoundException('Event not found');
                            return [4 /*yield*/, admin
                                    .from('event')
                                    .update({ status: 'cancelled', client_confirmation_status: 'cancelled', cancelled_at: new Date().toISOString() })
                                    .eq('id', id)];
                        case 2:
                            cancelErr = (_b.sent()).error;
                            if (cancelErr)
                                throw new common_1.BadRequestException(cancelErr.message);
                            phone = event.contact_phone;
                            if (!(!phone && event.intake_form_id)) return [3 /*break*/, 4];
                            return [4 /*yield*/, admin.from('intake_forms').select('contact_phone').eq('id', event.intake_form_id).maybeSingle()];
                        case 3:
                            form = (_b.sent()).data;
                            phone = form === null || form === void 0 ? void 0 : form.contact_phone;
                            _b.label = 4;
                        case 4: return [4 /*yield*/, this.createClientNotification(admin, {
                                clientPhone: phone,
                                eventId: id,
                                type: 'booking',
                                message: "Your event has been cancelled by the event organiser.",
                            })];
                        case 5:
                            _b.sent();
                            return [2 /*return*/, { success: true }];
                    }
                });
            });
        };
        BookingsService_1.prototype.remove = function (supabase, id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.cancelBooking(supabase, id)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Create a notification row in the notifications table for a client.
         * Silently ignores errors so it never breaks the main flow.
         */
        BookingsService_1.prototype.createClientNotification = function (supabase, params) {
            return __awaiter(this, void 0, void 0, function () {
                var digits, variants, userId, _i, variants_1, v, u, err_1;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 6, , 7]);
                            if (!params.clientPhone)
                                return [2 /*return*/];
                            digits = params.clientPhone.replace(/\D/g, '').slice(-10);
                            variants = [params.clientPhone, digits, "1".concat(digits), "+1".concat(digits)];
                            userId = null;
                            _i = 0, variants_1 = variants;
                            _b.label = 1;
                        case 1:
                            if (!(_i < variants_1.length)) return [3 /*break*/, 4];
                            v = variants_1[_i];
                            return [4 /*yield*/, supabase.from('users').select('id').eq('phone_number', v).maybeSingle()];
                        case 2:
                            u = (_b.sent()).data;
                            if (u) {
                                userId = u.id;
                                return [3 /*break*/, 4];
                            }
                            _b.label = 3;
                        case 3:
                            _i++;
                            return [3 /*break*/, 1];
                        case 4:
                            if (!userId)
                                return [2 /*return*/]; // phone-only clients have no users row — skip
                            return [4 /*yield*/, supabase.from('notifications').insert({
                                    user_id: userId,
                                    event_id: (_a = params.eventId) !== null && _a !== void 0 ? _a : null,
                                    type: params.type,
                                    message: params.message,
                                    read: false,
                                    created_at: new Date().toISOString(),
                                })];
                        case 5:
                            _b.sent();
                            return [3 /*break*/, 7];
                        case 6:
                            err_1 = _b.sent();
                            console.warn('[createClientNotification] failed:', err_1 === null || err_1 === void 0 ? void 0 : err_1.message);
                            return [3 /*break*/, 7];
                        case 7: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Resend client confirmation — now targets the event table.
         */
        BookingsService_1.prototype.resendClientConfirmation = function (eventId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, event, fetchErr, phone, form, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('event')
                                    .select('id, client_confirmation_status, contact_phone, intake_form_id')
                                    .eq('id', eventId)
                                    .maybeSingle()];
                        case 1:
                            _a = _b.sent(), event = _a.data, fetchErr = _a.error;
                            if (fetchErr || !event)
                                throw new common_1.NotFoundException('Event not found.');
                            phone = event.contact_phone;
                            if (!(!phone && event.intake_form_id)) return [3 /*break*/, 3];
                            return [4 /*yield*/, admin.from('intake_forms').select('contact_phone').eq('id', event.intake_form_id).maybeSingle()];
                        case 2:
                            form = (_b.sent()).data;
                            phone = form === null || form === void 0 ? void 0 : form.contact_phone;
                            _b.label = 3;
                        case 3:
                            if (!phone)
                                throw new common_1.BadRequestException('This event has no client phone number to notify.');
                            if (event.client_confirmation_status === 'confirmed')
                                throw new common_1.BadRequestException('Client has already confirmed.');
                            return [4 /*yield*/, admin.from('event').update({ client_confirmation_status: 'pending' }).eq('id', eventId)];
                        case 4:
                            error = (_b.sent()).error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, { success: true, message: 'Event notification resent to client.' }];
                    }
                });
            });
        };
        return BookingsService_1;
    }());
    __setFunctionName(_classThis, "BookingsService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        BookingsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return BookingsService = _classThis;
}();
exports.BookingsService = BookingsService;
