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
exports.RsvpService = void 0;
var common_1 = require("@nestjs/common");
function phoneLastFour(phone) {
    return phone.replace(/\D/g, '').slice(-4);
}
function buildPhoneVariants(phone) {
    var digits = phone.replace(/\D/g, '');
    var last10 = digits.slice(-10);
    return __spreadArray([], new Set([phone, last10, "1".concat(last10), "+1".concat(last10)]), true).filter(Boolean);
}
var RsvpService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var RsvpService = _classThis = /** @class */ (function () {
        function RsvpService_1(supabaseService, smsNotifications, mailService) {
            this.supabaseService = supabaseService;
            this.smsNotifications = smsNotifications;
            this.mailService = mailService;
        }
        // ── Helpers ─────────────────────────────────────────────────────────────
        /** Verify client phone matches intake form and return the form. */
        RsvpService_1.prototype.verifyClientOwnsForm = function (intakeFormId, clientPhone) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, form, variants, storedVariants, match;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('intake_forms')
                                    .select('id, user_id, contact_name, contact_phone, event_id')
                                    .eq('id', intakeFormId)
                                    .single()];
                        case 1:
                            form = (_b.sent()).data;
                            if (!form)
                                throw new common_1.NotFoundException('Event not found');
                            variants = buildPhoneVariants(clientPhone);
                            storedVariants = buildPhoneVariants((_a = form.contact_phone) !== null && _a !== void 0 ? _a : '');
                            match = variants.some(function (v) { return storedVariants.includes(v); });
                            if (!match)
                                throw new common_1.UnauthorizedException('You are not authorised to manage this event');
                            return [2 /*return*/, form];
                    }
                });
            });
        };
        // ── Client-portal methods (authenticated) ────────────────────────────────
        /** List RSVP-able events for a client (events they have intake forms for). */
        RsvpService_1.prototype.getEventsForClient = function (clientPhone) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, variants, results, forms, eventIds, intakeIds, _a, eventsRes, countRes, guestRows, summary, _i, guestRows_1, row, id;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            variants = buildPhoneVariants(clientPhone);
                            return [4 /*yield*/, Promise.all(variants.map(function (v) { return admin.from('intake_forms').select('id, user_id, contact_name, event_id').eq('contact_phone', v); }))];
                        case 1:
                            results = _c.sent();
                            forms = __spreadArray([], new Map(results.flatMap(function (r) { return r.data || []; }).map(function (f) { return [f.id, f]; })).values(), true);
                            if (!forms.length)
                                return [2 /*return*/, []];
                            eventIds = forms.map(function (f) { return f.event_id; }).filter(Boolean);
                            intakeIds = forms.map(function (f) { return f.id; });
                            return [4 /*yield*/, Promise.all([
                                    eventIds.length
                                        ? admin.from('event').select('id, name, date, intake_form_id').in('id', eventIds)
                                        : { data: [] },
                                    admin.from('rsvp_guests').select('intake_form_id, status, plus_ones').in('intake_form_id', intakeIds),
                                ])];
                        case 2:
                            _a = _c.sent(), eventsRes = _a[0], countRes = _a[1];
                            guestRows = countRes.data || [];
                            summary = {};
                            for (_i = 0, guestRows_1 = guestRows; _i < guestRows_1.length; _i++) {
                                row = guestRows_1[_i];
                                id = row.intake_form_id;
                                if (!summary[id])
                                    summary[id] = { total: 0, attending: 0, declined: 0, pending: 0, headcount: 0 };
                                summary[id].total++;
                                if (row.status === 'attending') {
                                    summary[id].attending++;
                                    summary[id].headcount += 1 + ((_b = row.plus_ones) !== null && _b !== void 0 ? _b : 0);
                                }
                                else if (row.status === 'declined')
                                    summary[id].declined++;
                                else
                                    summary[id].pending++;
                            }
                            return [2 /*return*/, forms.map(function (form) {
                                    var _a, _b, _c;
                                    var event = (eventsRes.data || []).find(function (e) { return e.id === form.event_id; });
                                    return {
                                        intake_form_id: form.id,
                                        contact_name: form.contact_name,
                                        event_id: form.event_id,
                                        event_name: (_a = event === null || event === void 0 ? void 0 : event.name) !== null && _a !== void 0 ? _a : null,
                                        event_date: (_b = event === null || event === void 0 ? void 0 : event.date) !== null && _b !== void 0 ? _b : null,
                                        rsvp_summary: (_c = summary[form.id]) !== null && _c !== void 0 ? _c : { total: 0, attending: 0, declined: 0, pending: 0, headcount: 0 },
                                    };
                                })];
                    }
                });
            });
        };
        /** List all RSVP guests for an event. */
        RsvpService_1.prototype.getGuests = function (intakeFormId, clientPhone) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.verifyClientOwnsForm(intakeFormId, clientPhone)];
                        case 1:
                            _b.sent();
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('rsvp_guests')
                                    .select('id, rsvp_token, guest_name, guest_phone, guest_email, status, plus_ones, meal_preference, table_assignment, responded_at, sms_sent_at, created_at')
                                    .eq('intake_form_id', intakeFormId)
                                    .order('created_at', { ascending: true })];
                        case 2:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data || []];
                    }
                });
            });
        };
        /** Add a single RSVP guest. */
        RsvpService_1.prototype.addGuest = function (intakeFormId, clientPhone, guestData) {
            return __awaiter(this, void 0, void 0, function () {
                var form, admin, _a, data, error;
                var _b, _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0: return [4 /*yield*/, this.verifyClientOwnsForm(intakeFormId, clientPhone)];
                        case 1:
                            form = _f.sent();
                            if (!((_b = guestData.guest_name) === null || _b === void 0 ? void 0 : _b.trim()))
                                throw new common_1.BadRequestException('guest_name is required');
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('rsvp_guests')
                                    .insert({
                                    intake_form_id: intakeFormId,
                                    owner_id: form.user_id,
                                    guest_name: guestData.guest_name.trim(),
                                    guest_phone: ((_c = guestData.guest_phone) === null || _c === void 0 ? void 0 : _c.trim()) || null,
                                    guest_email: ((_d = guestData.guest_email) === null || _d === void 0 ? void 0 : _d.trim()) || null,
                                    table_assignment: ((_e = guestData.table_assignment) === null || _e === void 0 ? void 0 : _e.trim()) || null,
                                })
                                    .select()
                                    .single()];
                        case 2:
                            _a = _f.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        /** Bulk add guests (array of names + optional phone). */
        RsvpService_1.prototype.bulkAddGuests = function (intakeFormId, clientPhone, guests) {
            return __awaiter(this, void 0, void 0, function () {
                var form, admin, rows, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.verifyClientOwnsForm(intakeFormId, clientPhone)];
                        case 1:
                            form = _b.sent();
                            if (!guests.length)
                                return [2 /*return*/, []];
                            admin = this.supabaseService.getAdminClient();
                            rows = guests.map(function (g) {
                                var _a, _b, _c;
                                return ({
                                    intake_form_id: intakeFormId,
                                    owner_id: form.user_id,
                                    guest_name: g.guest_name.trim(),
                                    guest_phone: ((_a = g.guest_phone) === null || _a === void 0 ? void 0 : _a.trim()) || null,
                                    guest_email: ((_b = g.guest_email) === null || _b === void 0 ? void 0 : _b.trim()) || null,
                                    table_assignment: ((_c = g.table_assignment) === null || _c === void 0 ? void 0 : _c.trim()) || null,
                                });
                            }).filter(function (g) { return g.guest_name; });
                            return [4 /*yield*/, admin.from('rsvp_guests').insert(rows).select()];
                        case 2:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data || []];
                    }
                });
            });
        };
        /** Update a guest (table assignment, etc.) */
        RsvpService_1.prototype.updateGuest = function (guestId, intakeFormId, clientPhone, updates) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.verifyClientOwnsForm(intakeFormId, clientPhone)];
                        case 1:
                            _b.sent();
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('rsvp_guests')
                                    .update(__assign(__assign({}, updates), { updated_at: new Date().toISOString() }))
                                    .eq('id', guestId)
                                    .eq('intake_form_id', intakeFormId)
                                    .select()
                                    .single()];
                        case 2:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        /** Delete a guest. */
        RsvpService_1.prototype.deleteGuest = function (guestId, intakeFormId, clientPhone) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.verifyClientOwnsForm(intakeFormId, clientPhone)];
                        case 1:
                            _a.sent();
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('rsvp_guests')
                                    .delete()
                                    .eq('id', guestId)
                                    .eq('intake_form_id', intakeFormId)];
                        case 2:
                            error = (_a.sent()).error;
                            if (error)
                                throw error;
                            return [2 /*return*/];
                    }
                });
            });
        };
        /** Send RSVP invite link to a single guest via SMS (and email if available). */
        RsvpService_1.prototype.sendInvite = function (guestId, intakeFormId, clientPhone) {
            return __awaiter(this, void 0, void 0, function () {
                var form, admin, guest, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.verifyClientOwnsForm(intakeFormId, clientPhone)];
                        case 1:
                            form = _b.sent();
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('rsvp_guests').select('*').eq('id', guestId).eq('intake_form_id', intakeFormId).single()];
                        case 2:
                            guest = (_b.sent()).data;
                            if (!guest)
                                throw new common_1.NotFoundException('Guest not found');
                            return [4 /*yield*/, this.doSendInvite(guest, form)];
                        case 3:
                            _b.sent();
                            return [4 /*yield*/, admin
                                    .from('rsvp_guests')
                                    .update({ sms_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                                    .eq('id', guestId)
                                    .select()
                                    .single()];
                        case 4:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        /** Send RSVP invites to all guests that haven't been sent one yet. */
        RsvpService_1.prototype.sendAllInvites = function (intakeFormId, clientPhone) {
            return __awaiter(this, void 0, void 0, function () {
                var form, admin, guests, sent, skipped, _i, guests_1, guest, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.verifyClientOwnsForm(intakeFormId, clientPhone)];
                        case 1:
                            form = _b.sent();
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('rsvp_guests')
                                    .select('*')
                                    .eq('intake_form_id', intakeFormId)
                                    .is('sms_sent_at', null)];
                        case 2:
                            guests = (_b.sent()).data;
                            if (!(guests === null || guests === void 0 ? void 0 : guests.length))
                                return [2 /*return*/, { sent: 0, skipped: 0 }];
                            sent = 0;
                            skipped = 0;
                            _i = 0, guests_1 = guests;
                            _b.label = 3;
                        case 3:
                            if (!(_i < guests_1.length)) return [3 /*break*/, 9];
                            guest = guests_1[_i];
                            if (!guest.guest_phone && !guest.guest_email) {
                                skipped++;
                                return [3 /*break*/, 8];
                            }
                            _b.label = 4;
                        case 4:
                            _b.trys.push([4, 7, , 8]);
                            return [4 /*yield*/, this.doSendInvite(guest, form)];
                        case 5:
                            _b.sent();
                            return [4 /*yield*/, admin
                                    .from('rsvp_guests')
                                    .update({ sms_sent_at: new Date().toISOString() })
                                    .eq('id', guest.id)];
                        case 6:
                            _b.sent();
                            sent++;
                            return [3 /*break*/, 8];
                        case 7:
                            _a = _b.sent();
                            skipped++;
                            return [3 /*break*/, 8];
                        case 8:
                            _i++;
                            return [3 /*break*/, 3];
                        case 9: return [2 /*return*/, { sent: sent, skipped: skipped }];
                    }
                });
            });
        };
        RsvpService_1.prototype.doSendInvite = function (guest, form) {
            return __awaiter(this, void 0, void 0, function () {
                var frontendUrl, rsvpUrl, admin, eventName, eventDate, ev, message;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                            rsvpUrl = "".concat(frontendUrl, "/rsvp/").concat(guest.rsvp_token);
                            admin = this.supabaseService.getAdminClient();
                            eventName = 'the event';
                            eventDate = '';
                            if (!form.event_id) return [3 /*break*/, 2];
                            return [4 /*yield*/, admin.from('event').select('name, date').eq('id', form.event_id).single()];
                        case 1:
                            ev = (_b.sent()).data;
                            if (ev) {
                                eventName = (_a = ev.name) !== null && _a !== void 0 ? _a : eventName;
                                if (ev.date) {
                                    eventDate = " on ".concat(new Date(ev.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
                                }
                            }
                            _b.label = 2;
                        case 2:
                            message = "Hi ".concat(guest.guest_name, "! You're invited to ").concat(eventName).concat(eventDate, ". Please RSVP here: ").concat(rsvpUrl);
                            if (!guest.guest_phone) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.smsNotifications.trySend(guest.guest_phone, message)];
                        case 3:
                            _b.sent();
                            _b.label = 4;
                        case 4:
                            if (!guest.guest_email) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.mailService.sendContractWithResend({
                                    clientName: guest.guest_name,
                                    clientEmail: guest.guest_email,
                                    ownerName: form.contact_name || 'Your Host',
                                    contractNumber: '',
                                    contractTitle: "RSVP: ".concat(eventName).concat(eventDate),
                                    contractUrl: rsvpUrl,
                                }).catch(function () { })];
                        case 5:
                            _b.sent();
                            _b.label = 6;
                        case 6: return [2 /*return*/];
                    }
                });
            });
        };
        // ── Invitation images (client-portal) ────────────────────────────────────
        /** Get invitation images for an event. */
        RsvpService_1.prototype.getInvitationImages = function (intakeFormId, clientPhone) {
            return __awaiter(this, void 0, void 0, function () {
                var form, admin, eventData, data, data;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.verifyClientOwnsForm(intakeFormId, clientPhone)];
                        case 1:
                            form = _c.sent();
                            admin = this.supabaseService.getAdminClient();
                            eventData = null;
                            if (!form.event_id) return [3 /*break*/, 3];
                            return [4 /*yield*/, admin.from('event').select('management_data').eq('id', form.event_id).single()];
                        case 2:
                            data = (_c.sent()).data;
                            eventData = data;
                            _c.label = 3;
                        case 3:
                            if (!!eventData) return [3 /*break*/, 5];
                            return [4 /*yield*/, admin.from('event').select('management_data').eq('intake_form_id', intakeFormId).maybeSingle()];
                        case 4:
                            data = (_c.sent()).data;
                            eventData = data;
                            _c.label = 5;
                        case 5: return [2 /*return*/, (_b = (_a = eventData === null || eventData === void 0 ? void 0 : eventData.management_data) === null || _a === void 0 ? void 0 : _a.invitationImages) !== null && _b !== void 0 ? _b : []];
                    }
                });
            });
        };
        /** Set invitation images for an event (replaces existing list). */
        RsvpService_1.prototype.setInvitationImages = function (intakeFormId, clientPhone, images) {
            return __awaiter(this, void 0, void 0, function () {
                var form, admin, targetEventId, existingMgmt, data, data;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, this.verifyClientOwnsForm(intakeFormId, clientPhone)];
                        case 1:
                            form = _d.sent();
                            admin = this.supabaseService.getAdminClient();
                            targetEventId = (_a = form.event_id) !== null && _a !== void 0 ? _a : null;
                            existingMgmt = {};
                            if (!targetEventId) return [3 /*break*/, 3];
                            return [4 /*yield*/, admin.from('event').select('id, management_data').eq('id', targetEventId).single()];
                        case 2:
                            data = (_d.sent()).data;
                            existingMgmt = (_b = data === null || data === void 0 ? void 0 : data.management_data) !== null && _b !== void 0 ? _b : {};
                            return [3 /*break*/, 5];
                        case 3: return [4 /*yield*/, admin.from('event').select('id, management_data').eq('intake_form_id', intakeFormId).maybeSingle()];
                        case 4:
                            data = (_d.sent()).data;
                            if (!data)
                                throw new common_1.NotFoundException('No linked event found');
                            targetEventId = data.id;
                            existingMgmt = (_c = data === null || data === void 0 ? void 0 : data.management_data) !== null && _c !== void 0 ? _c : {};
                            _d.label = 5;
                        case 5: return [4 /*yield*/, admin.from('event').update({
                                management_data: __assign(__assign({}, existingMgmt), { invitationImages: images.slice(0, 2) }),
                            }).eq('id', targetEventId)];
                        case 6:
                            _d.sent();
                            return [2 /*return*/, images.slice(0, 2)];
                    }
                });
            });
        };
        // ── Public methods (no auth — token-gated) ────────────────────────────────
        /** Get public invite details (for guest to view before responding). */
        RsvpService_1.prototype.getPublicInvite = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, guest, event, form, ev, ev;
                var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                return __generator(this, function (_k) {
                    switch (_k.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('rsvp_guests')
                                    .select('id, guest_name, status, plus_ones, meal_preference, table_assignment, responded_at, guest_phone, intake_form_id')
                                    .eq('rsvp_token', token)
                                    .single()];
                        case 1:
                            guest = (_k.sent()).data;
                            if (!guest)
                                throw new common_1.NotFoundException('RSVP link not found or expired');
                            event = null;
                            return [4 /*yield*/, admin
                                    .from('intake_forms')
                                    .select('event_id, contact_name, event_type, event_date')
                                    .eq('id', guest.intake_form_id)
                                    .single()];
                        case 2:
                            form = (_k.sent()).data;
                            if (!(form === null || form === void 0 ? void 0 : form.event_id)) return [3 /*break*/, 4];
                            return [4 /*yield*/, admin.from('event').select('name, date, start_time, venue, management_data').eq('id', form.event_id).single()];
                        case 3:
                            ev = (_k.sent()).data;
                            event = ev;
                            _k.label = 4;
                        case 4:
                            if (!(!event && guest.intake_form_id)) return [3 /*break*/, 6];
                            return [4 /*yield*/, admin.from('event').select('name, date, start_time, venue, management_data').eq('intake_form_id', guest.intake_form_id).maybeSingle()];
                        case 5:
                            ev = (_k.sent()).data;
                            event = ev;
                            _k.label = 6;
                        case 6: return [2 /*return*/, {
                                guest_name: guest.guest_name,
                                status: guest.status,
                                plus_ones: guest.plus_ones,
                                meal_preference: guest.meal_preference,
                                table_assignment: guest.table_assignment,
                                responded_at: guest.responded_at,
                                // Only indicate whether phone verification is required (don't expose the phone)
                                requires_phone_verify: !!guest.guest_phone,
                                invitation_images: (_b = (_a = event === null || event === void 0 ? void 0 : event.management_data) === null || _a === void 0 ? void 0 : _a.invitationImages) !== null && _b !== void 0 ? _b : [],
                                event: {
                                    name: (_c = event === null || event === void 0 ? void 0 : event.name) !== null && _c !== void 0 ? _c : null,
                                    date: (_e = (_d = event === null || event === void 0 ? void 0 : event.date) !== null && _d !== void 0 ? _d : form === null || form === void 0 ? void 0 : form.event_date) !== null && _e !== void 0 ? _e : null,
                                    start_time: (_f = event === null || event === void 0 ? void 0 : event.start_time) !== null && _f !== void 0 ? _f : null,
                                    venue: (_g = event === null || event === void 0 ? void 0 : event.venue) !== null && _g !== void 0 ? _g : null,
                                    host_name: (_h = form === null || form === void 0 ? void 0 : form.contact_name) !== null && _h !== void 0 ? _h : 'Your Host',
                                    event_type: (_j = form === null || form === void 0 ? void 0 : form.event_type) !== null && _j !== void 0 ? _j : null,
                                },
                            }];
                    }
                });
            });
        };
        /** Verify phone last 4 + submit RSVP response. */
        RsvpService_1.prototype.respondToInvite = function (token, phoneLastFourInput, response) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, guest, storedLast4, _a, data, error, form, action, _b;
                var _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('rsvp_guests')
                                    .select('*')
                                    .eq('rsvp_token', token)
                                    .single()];
                        case 1:
                            guest = (_e.sent()).data;
                            if (!guest)
                                throw new common_1.NotFoundException('RSVP link not found');
                            // Phone verification if a phone was stored
                            if (guest.guest_phone) {
                                if (!phoneLastFourInput)
                                    throw new common_1.BadRequestException('Please enter the last 4 digits of your phone number to verify your identity.');
                                storedLast4 = phoneLastFour(guest.guest_phone);
                                if (storedLast4 !== phoneLastFourInput.trim().replace(/\D/g, '').slice(-4)) {
                                    throw new common_1.UnauthorizedException('Phone number does not match our records. Please check and try again.');
                                }
                            }
                            if (!['attending', 'declined'].includes(response.status)) {
                                throw new common_1.BadRequestException('status must be attending or declined');
                            }
                            return [4 /*yield*/, admin
                                    .from('rsvp_guests')
                                    .update({
                                    status: response.status,
                                    plus_ones: response.status === 'attending' ? ((_c = response.plus_ones) !== null && _c !== void 0 ? _c : 0) : 0,
                                    meal_preference: response.status === 'attending' ? (response.meal_preference || 'standard') : guest.meal_preference,
                                    sms_opt_in: response.status === 'attending' ? ((_d = response.sms_opt_in) !== null && _d !== void 0 ? _d : false) : false,
                                    responded_at: new Date().toISOString(),
                                    updated_at: new Date().toISOString(),
                                })
                                    .eq('rsvp_token', token)
                                    .select()
                                    .single()];
                        case 2:
                            _a = _e.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            _e.label = 3;
                        case 3:
                            _e.trys.push([3, 7, , 8]);
                            return [4 /*yield*/, admin
                                    .from('intake_forms')
                                    .select('contact_phone, user_id')
                                    .eq('id', guest.intake_form_id)
                                    .single()];
                        case 4:
                            form = (_e.sent()).data;
                            if (!(form === null || form === void 0 ? void 0 : form.contact_phone)) return [3 /*break*/, 6];
                            action = response.status === 'attending' ? '✅ will be attending' : '❌ has declined';
                            return [4 /*yield*/, this.smsNotifications.trySend(form.contact_phone, "RSVP update: ".concat(guest.guest_name, " ").concat(action).concat(response.plus_ones ? " (+".concat(response.plus_ones, ")") : '', "."))];
                        case 5:
                            _e.sent();
                            _e.label = 6;
                        case 6: return [3 /*break*/, 8];
                        case 7:
                            _b = _e.sent();
                            return [3 /*break*/, 8];
                        case 8: return [2 /*return*/, { success: true, status: data.status }];
                    }
                });
            });
        };
        return RsvpService_1;
    }());
    __setFunctionName(_classThis, "RsvpService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        RsvpService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return RsvpService = _classThis;
}();
exports.RsvpService = RsvpService;
