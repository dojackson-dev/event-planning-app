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
exports.IntakeFormsService = void 0;
var common_1 = require("@nestjs/common");
function normalizePhone(phone) {
    var digits = phone.replace(/\D/g, '');
    if (digits.length === 10)
        return "+1".concat(digits);
    if (digits.length === 11 && digits.startsWith('1'))
        return "+".concat(digits);
    return "+".concat(digits);
}
var IntakeFormsService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var IntakeFormsService = _classThis = /** @class */ (function () {
        function IntakeFormsService_1(supabaseService, mailService, twilioService, smsNotifications, eventsService) {
            this.supabaseService = supabaseService;
            this.mailService = mailService;
            this.twilioService = twilioService;
            this.smsNotifications = smsNotifications;
            this.eventsService = eventsService;
        }
        IntakeFormsService_1.prototype.autoCreateEvent = function (intakeForm, ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var supabaseAdmin, err_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            supabaseAdmin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabaseAdmin.from('event').insert([{
                                        name: intakeForm.event_name || "".concat(intakeForm.event_type || 'Event', " - ").concat(intakeForm.contact_name || 'Client'),
                                        date: intakeForm.event_date || new Date().toISOString().split('T')[0],
                                        start_time: intakeForm.event_time || null,
                                        end_time: intakeForm.event_end_time || null,
                                        venue: intakeForm.venue_preference || null,
                                        guest_count: intakeForm.guest_count || null,
                                        description: intakeForm.special_requests || null,
                                        status: 'scheduled',
                                        owner_id: ownerId,
                                        client_id: intakeForm.id,
                                    }])];
                        case 1:
                            _a.sent();
                            console.log("[IntakeFormsService] Auto-created event for intake form ".concat(intakeForm.id));
                            return [3 /*break*/, 3];
                        case 2:
                            err_1 = _a.sent();
                            console.warn('[IntakeFormsService] Auto-create event failed:', err_1);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        /** Looks up the primary venue_id for an owner (used when auto-creating events). */
        IntakeFormsService_1.prototype.resolveOwnerVenueId = function (userId, admin) {
            return __awaiter(this, void 0, void 0, function () {
                var membership, ownerAccountId, ownerAcct, venue, _a;
                var _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _d.trys.push([0, 5, , 6]);
                            return [4 /*yield*/, admin
                                    .from('memberships')
                                    .select('owner_account_id')
                                    .eq('user_id', userId)
                                    .limit(1)
                                    .maybeSingle()];
                        case 1:
                            membership = (_d.sent()).data;
                            ownerAccountId = (_b = membership === null || membership === void 0 ? void 0 : membership.owner_account_id) !== null && _b !== void 0 ? _b : null;
                            if (!!ownerAccountId) return [3 /*break*/, 3];
                            return [4 /*yield*/, admin
                                    .from('owner_accounts')
                                    .select('id')
                                    .eq('primary_owner_id', userId)
                                    .maybeSingle()];
                        case 2:
                            ownerAcct = (_d.sent()).data;
                            ownerAccountId = (_c = ownerAcct === null || ownerAcct === void 0 ? void 0 : ownerAcct.id) !== null && _c !== void 0 ? _c : null;
                            _d.label = 3;
                        case 3:
                            if (!ownerAccountId)
                                return [2 /*return*/, null];
                            return [4 /*yield*/, admin
                                    .from('venues')
                                    .select('id')
                                    .eq('owner_account_id', ownerAccountId)
                                    .order('id', { ascending: true })
                                    .limit(1)
                                    .maybeSingle()];
                        case 4:
                            venue = (_d.sent()).data;
                            return [2 /*return*/, (venue === null || venue === void 0 ? void 0 : venue.id) ? String(venue.id) : null];
                        case 5:
                            _a = _d.sent();
                            return [2 /*return*/, null];
                        case 6: return [2 /*return*/];
                    }
                });
            });
        };
        IntakeFormsService_1.prototype.create = function (supabase, userId, createDto) {
            return __awaiter(this, void 0, void 0, function () {
                var accessibility_requirements, preferred_contact, event_name, event_end_time, rest, supabaseAdmin, fullPayload, insertResult, basePayload, data, error, existingEvent, ownerVenueId, eventData, createdEvent, eventErr_1, ownerUser, ownerPhone, ownerSmsErr_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            accessibility_requirements = createDto.accessibility_requirements, preferred_contact = createDto.preferred_contact, event_name = createDto.event_name, event_end_time = createDto.event_end_time, rest = __rest(createDto, ["accessibility_requirements", "preferred_contact", "event_name", "event_end_time"]);
                            // Normalize phone to E.164 on the way in
                            if (rest.contact_phone) {
                                rest.contact_phone = normalizePhone(rest.contact_phone);
                            }
                            supabaseAdmin = this.supabaseService.getAdminClient();
                            fullPayload = __assign(__assign(__assign(__assign({}, rest), { user_id: userId }), (event_name ? { event_name: event_name } : {})), (event_end_time ? { event_end_time: event_end_time } : {}));
                            return [4 /*yield*/, supabaseAdmin
                                    .from('intake_forms')
                                    .insert([fullPayload])
                                    .select()
                                    .single()];
                        case 1:
                            insertResult = _a.sent();
                            if (!(insertResult.error && (insertResult.error.message.includes('column') || insertResult.error.code === '42703'))) return [3 /*break*/, 3];
                            basePayload = __assign(__assign({}, rest), { user_id: userId });
                            return [4 /*yield*/, supabaseAdmin
                                    .from('intake_forms')
                                    .insert([basePayload])
                                    .select()
                                    .single()];
                        case 2:
                            insertResult = _a.sent();
                            _a.label = 3;
                        case 3:
                            data = insertResult.data, error = insertResult.error;
                            if (error)
                                throw new Error("Intake form insert failed: ".concat(error.message, " (code: ").concat(error.code, ")"));
                            _a.label = 4;
                        case 4:
                            _a.trys.push([4, 11, , 12]);
                            return [4 /*yield*/, supabaseAdmin
                                    .from('event')
                                    .select('id')
                                    .eq('intake_form_id', data.id)
                                    .maybeSingle()];
                        case 5:
                            existingEvent = (_a.sent()).data;
                            if (!existingEvent) return [3 /*break*/, 6];
                            data.event_id = existingEvent.id;
                            return [3 /*break*/, 10];
                        case 6: return [4 /*yield*/, this.resolveOwnerVenueId(userId, supabaseAdmin)];
                        case 7:
                            ownerVenueId = _a.sent();
                            eventData = __assign({ name: data.event_name || "".concat(data.event_type ? data.event_type.charAt(0).toUpperCase() + data.event_type.slice(1).replace(/_/g, ' ') : 'Event', " - ").concat(data.contact_name), date: data.event_date, start_time: data.event_time || '00:00', end_time: data.event_end_time || '23:59', description: data.special_requests || '', status: 'scheduled', guest_count: data.guest_count || null, venue: 'TBD', owner_id: userId, intake_form_id: data.id }, (ownerVenueId ? { venue_id: ownerVenueId } : {}));
                            return [4 /*yield*/, supabaseAdmin
                                    .from('event')
                                    .insert([eventData])
                                    .select('id')
                                    .single()];
                        case 8:
                            createdEvent = (_a.sent()).data;
                            if (!createdEvent) return [3 /*break*/, 10];
                            // Store the event_id back on the intake form for easy cross-reference
                            return [4 /*yield*/, supabaseAdmin
                                    .from('intake_forms')
                                    .update({ event_id: createdEvent.id })
                                    .eq('id', data.id)];
                        case 9:
                            // Store the event_id back on the intake form for easy cross-reference
                            _a.sent();
                            data.event_id = createdEvent.id;
                            _a.label = 10;
                        case 10: return [3 /*break*/, 12];
                        case 11:
                            eventErr_1 = _a.sent();
                            // Non-fatal — intake form was saved, event creation failed silently
                            console.warn('[IntakeFormsService] Auto-event creation failed:', eventErr_1);
                            return [3 /*break*/, 12];
                        case 12:
                            _a.trys.push([12, 16, , 17]);
                            return [4 /*yield*/, supabaseAdmin
                                    .from('users')
                                    .select('phone_number')
                                    .eq('id', userId)
                                    .maybeSingle()];
                        case 13:
                            ownerUser = (_a.sent()).data;
                            if (!(ownerUser === null || ownerUser === void 0 ? void 0 : ownerUser.phone_number)) return [3 /*break*/, 15];
                            ownerPhone = normalizePhone(ownerUser.phone_number);
                            return [4 /*yield*/, this.smsNotifications.newIntakeFormSubmission(ownerPhone, data.contact_name || 'Unknown', data.event_type || 'Event', data.event_date || 'TBD')];
                        case 14:
                            _a.sent();
                            _a.label = 15;
                        case 15: return [3 /*break*/, 17];
                        case 16:
                            ownerSmsErr_1 = _a.sent();
                            console.warn('[IntakeFormsService] Owner SMS notification failed:', ownerSmsErr_1);
                            return [3 /*break*/, 17];
                        case 17: return [2 /*return*/, data];
                    }
                });
            });
        };
        IntakeFormsService_1.prototype.findAll = function (supabase, userId) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('intake_forms')
                                .select('*')
                                .eq('user_id', userId)
                                .order('created_at', { ascending: false })];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        IntakeFormsService_1.prototype.findOne = function (supabase, userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('intake_forms')
                                .select('*')
                                .eq('id', id)
                                .eq('user_id', userId)
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
        IntakeFormsService_1.prototype.update = function (supabase, userId, id, updateDto) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            // Normalize phone on update too
                            if (updateDto.contact_phone) {
                                updateDto.contact_phone = normalizePhone(updateDto.contact_phone);
                            }
                            return [4 /*yield*/, supabase
                                    .from('intake_forms')
                                    .update(updateDto)
                                    .eq('id', id)
                                    .eq('user_id', userId)
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
        IntakeFormsService_1.prototype.remove = function (supabase, userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('intake_forms')
                                .delete()
                                .eq('id', id)
                                .eq('user_id', userId)];
                        case 1:
                            error = (_a.sent()).error;
                            if (error)
                                throw error;
                            return [2 /*return*/, { message: 'Intake form deleted successfully' }];
                    }
                });
            });
        };
        /**
         * Resend the invitation email to the client for a given intake form.
         * Resets invite_status to 'sent' regardless of current state.
         */
        IntakeFormsService_1.prototype.resendInvitation = function (supabase, userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var supabaseAdmin, _a, form, error, ownerName, owner, _b, frontendUrl, inviteUrl, clientName, eventLabel, smsErr_1;
                var _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            supabaseAdmin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('intake_forms')
                                    .select('*')
                                    .eq('id', id)
                                    .eq('user_id', userId)
                                    .single()];
                        case 1:
                            _a = _e.sent(), form = _a.data, error = _a.error;
                            if (error || !form)
                                throw new Error('Intake form not found');
                            if (!form.contact_email)
                                throw new Error('This intake form has no client email address');
                            _e.label = 2;
                        case 2:
                            _e.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, supabaseAdmin
                                    .from('users')
                                    .select('first_name, last_name')
                                    .eq('id', userId)
                                    .maybeSingle()];
                        case 3:
                            owner = (_e.sent()).data;
                            if (owner)
                                ownerName = [owner.first_name, owner.last_name].filter(Boolean).join(' ');
                            return [3 /*break*/, 5];
                        case 4:
                            _b = _e.sent();
                            return [3 /*break*/, 5];
                        case 5: return [4 /*yield*/, this.mailService.sendClientInvitation({
                                clientName: form.contact_name || 'Valued Client',
                                clientEmail: form.contact_email,
                                inviteToken: form.invite_token,
                                eventType: form.event_type || 'Event',
                                eventDate: form.event_date,
                                eventTime: (_c = form.event_time) !== null && _c !== void 0 ? _c : null,
                                guestCount: (_d = form.guest_count) !== null && _d !== void 0 ? _d : null,
                                ownerName: ownerName,
                            })];
                        case 6:
                            _e.sent();
                            return [4 /*yield*/, supabaseAdmin
                                    .from('intake_forms')
                                    .update({ invite_sent_at: new Date().toISOString(), invite_status: 'sent' })
                                    .eq('id', id)];
                        case 7:
                            _e.sent();
                            if (!form.contact_phone) return [3 /*break*/, 11];
                            _e.label = 8;
                        case 8:
                            _e.trys.push([8, 10, , 11]);
                            frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                            inviteUrl = "".concat(frontendUrl, "/invite?token=").concat(form.invite_token);
                            clientName = form.contact_name || 'there';
                            eventLabel = form.event_name || form.event_type || 'your event';
                            return [4 /*yield*/, this.twilioService.sendSMS(form.contact_phone, "Hi ".concat(clientName, "! Your event (").concat(eventLabel, ") has been scheduled. Tap the link to access your client portal and review your event details: ").concat(inviteUrl))];
                        case 9:
                            _e.sent();
                            return [3 /*break*/, 11];
                        case 10:
                            smsErr_1 = _e.sent();
                            console.warn('[IntakeFormsService] SMS resend failed:', smsErr_1);
                            return [3 /*break*/, 11];
                        case 11: return [2 /*return*/, { success: true, message: 'Invitation resent successfully' }];
                    }
                });
            });
        };
        IntakeFormsService_1.prototype.convertToBooking = function (supabase, userId, intakeFormId) {
            return __awaiter(this, void 0, void 0, function () {
                var supabaseAdmin, _a, intakeForm, intakeError, event, existingEvent, updatedEvent, ownerVenueId, eventData, _b, createdEvent, eventError, _c, booking, bookingError, ownerName, owner, _d, emailErr_1, frontendUrl, inviteUrl, clientName, eventLabel, smsErr_2, eventDateStr, conflicting, formattedDate, _i, conflicting_1, lead, phone, message, smsErr_3, notifyErr_1;
                var _e, _f, _g;
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0:
                            supabaseAdmin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('intake_forms')
                                    .select('*')
                                    .eq('id', intakeFormId)
                                    .eq('user_id', userId)
                                    .single()];
                        case 1:
                            _a = _h.sent(), intakeForm = _a.data, intakeError = _a.error;
                            if (intakeError)
                                throw intakeError;
                            if (!intakeForm)
                                throw new Error('Intake form not found');
                            return [4 /*yield*/, supabaseAdmin
                                    .from('event')
                                    .select('*')
                                    .eq('intake_form_id', intakeFormId)
                                    .maybeSingle()];
                        case 2:
                            existingEvent = (_h.sent()).data;
                            if (!existingEvent) return [3 /*break*/, 4];
                            return [4 /*yield*/, supabaseAdmin
                                    .from('event')
                                    .update({
                                    status: 'scheduled',
                                    guest_count: intakeForm.guest_count || existingEvent.guest_count,
                                })
                                    .eq('id', existingEvent.id)
                                    .select()
                                    .single()];
                        case 3:
                            updatedEvent = (_h.sent()).data;
                            event = updatedEvent || existingEvent;
                            return [3 /*break*/, 7];
                        case 4: return [4 /*yield*/, this.resolveOwnerVenueId(userId, supabaseAdmin)];
                        case 5:
                            ownerVenueId = _h.sent();
                            eventData = __assign({ name: intakeForm.event_name || "".concat(intakeForm.event_type ? intakeForm.event_type.charAt(0).toUpperCase() + intakeForm.event_type.slice(1).replace(/_/g, ' ') : 'Event', " - ").concat(intakeForm.contact_name), date: intakeForm.event_date, start_time: intakeForm.event_time || '00:00', end_time: intakeForm.event_end_time || '23:59', description: intakeForm.special_requests || '', status: 'scheduled', guest_count: intakeForm.guest_count, venue: 'TBD', owner_id: userId, intake_form_id: intakeFormId }, (ownerVenueId ? { venue_id: ownerVenueId } : {}));
                            return [4 /*yield*/, supabaseAdmin
                                    .from('event')
                                    .insert([eventData])
                                    .select()
                                    .single()];
                        case 6:
                            _b = _h.sent(), createdEvent = _b.data, eventError = _b.error;
                            if (eventError)
                                throw eventError;
                            event = createdEvent;
                            _h.label = 7;
                        case 7:
                            if (!(event.client_status === 'deposit_paid' || event.client_status === 'completed' || Number((_e = event.deposit_amount) !== null && _e !== void 0 ? _e : 0) > 0)) return [3 /*break*/, 9];
                            return [4 /*yield*/, supabase
                                    .from('intake_forms')
                                    .update({ status: 'converted' })
                                    .eq('id', intakeFormId)
                                    .eq('user_id', userId)];
                        case 8:
                            _h.sent();
                            return [2 /*return*/, {
                                    booking: event,
                                    event: event,
                                    message: 'Successfully linked to existing booking',
                                }];
                        case 9: return [4 /*yield*/, supabaseAdmin
                                .from('event')
                                .update({
                                special_requests: [
                                    intakeForm.special_requests,
                                    intakeForm.catering_requirements ? "Catering: ".concat(intakeForm.catering_requirements) : null,
                                    intakeForm.equipment_needs ? "Equipment: ".concat(intakeForm.equipment_needs) : null,
                                    intakeForm.dietary_restrictions ? "Dietary: ".concat(intakeForm.dietary_restrictions) : null,
                                    intakeForm.accessibility_requirements ? "Accessibility: ".concat(intakeForm.accessibility_requirements) : null,
                                ].filter(Boolean).join('\n'),
                                notes: "Converted from intake form. Budget range: ".concat(intakeForm.budget_range || 'Not specified'),
                                client_status: 'pending',
                                client_confirmation_status: intakeForm.contact_phone ? 'pending' : null,
                            })
                                .eq('id', event.id)
                                .select('*')
                                .single()];
                        case 10:
                            _c = _h.sent(), booking = _c.data, bookingError = _c.error;
                            if (bookingError)
                                throw bookingError;
                            // Update intake form status to 'converted'
                            return [4 /*yield*/, supabase
                                    .from('intake_forms')
                                    .update({ status: 'converted' })
                                    .eq('id', intakeFormId)
                                    .eq('user_id', userId)];
                        case 11:
                            // Update intake form status to 'converted'
                            _h.sent();
                            _h.label = 12;
                        case 12:
                            _h.trys.push([12, 14, , 15]);
                            return [4 /*yield*/, supabaseAdmin
                                    .from('users')
                                    .select('first_name, last_name')
                                    .eq('id', userId)
                                    .maybeSingle()];
                        case 13:
                            owner = (_h.sent()).data;
                            if (owner)
                                ownerName = [owner.first_name, owner.last_name].filter(Boolean).join(' ');
                            return [3 /*break*/, 15];
                        case 14:
                            _d = _h.sent();
                            return [3 /*break*/, 15];
                        case 15:
                            if (!(intakeForm.contact_email && intakeForm.invite_token)) return [3 /*break*/, 20];
                            _h.label = 16;
                        case 16:
                            _h.trys.push([16, 19, , 20]);
                            return [4 /*yield*/, this.mailService.sendClientInvitation({
                                    clientName: intakeForm.contact_name || 'Valued Client',
                                    clientEmail: intakeForm.contact_email,
                                    inviteToken: intakeForm.invite_token,
                                    eventType: intakeForm.event_type || 'Event',
                                    eventDate: intakeForm.event_date,
                                    eventTime: (_f = intakeForm.event_time) !== null && _f !== void 0 ? _f : null,
                                    guestCount: (_g = intakeForm.guest_count) !== null && _g !== void 0 ? _g : null,
                                    ownerName: ownerName,
                                })];
                        case 17:
                            _h.sent();
                            return [4 /*yield*/, supabaseAdmin
                                    .from('intake_forms')
                                    .update({ invite_sent_at: new Date().toISOString(), invite_status: 'sent' })
                                    .eq('id', intakeFormId)];
                        case 18:
                            _h.sent();
                            return [3 /*break*/, 20];
                        case 19:
                            emailErr_1 = _h.sent();
                            console.warn('[convertToBooking] Email invitation failed:', emailErr_1);
                            return [3 /*break*/, 20];
                        case 20:
                            if (!(intakeForm.contact_phone && intakeForm.invite_token)) return [3 /*break*/, 24];
                            _h.label = 21;
                        case 21:
                            _h.trys.push([21, 23, , 24]);
                            frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                            inviteUrl = "".concat(frontendUrl, "/invite?token=").concat(intakeForm.invite_token);
                            clientName = intakeForm.contact_name || 'there';
                            eventLabel = intakeForm.event_name || intakeForm.event_type || 'your event';
                            return [4 /*yield*/, this.twilioService.sendSMS(normalizePhone(intakeForm.contact_phone), "Hi ".concat(clientName, "! Your event (").concat(eventLabel, ") has been confirmed. Tap the link to access your client portal: ").concat(inviteUrl))];
                        case 22:
                            _h.sent();
                            return [3 /*break*/, 24];
                        case 23:
                            smsErr_2 = _h.sent();
                            console.warn('[convertToBooking] SMS invite failed:', smsErr_2);
                            return [3 /*break*/, 24];
                        case 24:
                            _h.trys.push([24, 32, , 33]);
                            eventDateStr = intakeForm.event_date.split('T')[0];
                            return [4 /*yield*/, supabaseAdmin
                                    .from('intake_forms')
                                    .select('id, contact_name, contact_phone, event_date')
                                    .eq('user_id', userId)
                                    .neq('id', intakeFormId)
                                    .neq('status', 'converted')
                                    .filter('event_date', 'gte', eventDateStr)
                                    .filter('event_date', 'lt', "".concat(eventDateStr, "T23:59:59"))];
                        case 25:
                            conflicting = (_h.sent()).data;
                            if (!(conflicting && conflicting.length > 0)) return [3 /*break*/, 31];
                            formattedDate = new Date("".concat(eventDateStr, "T12:00:00")).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                            });
                            _i = 0, conflicting_1 = conflicting;
                            _h.label = 26;
                        case 26:
                            if (!(_i < conflicting_1.length)) return [3 /*break*/, 31];
                            lead = conflicting_1[_i];
                            if (!lead.contact_phone)
                                return [3 /*break*/, 30];
                            phone = normalizePhone(lead.contact_phone);
                            message = "Hi ".concat(lead.contact_name, ", we wanted to let you know that ").concat(formattedDate, " ") +
                                "has been reserved by another client and is no longer available. " +
                                "Please contact us so we can help you choose a new date for your event.";
                            _h.label = 27;
                        case 27:
                            _h.trys.push([27, 29, , 30]);
                            return [4 /*yield*/, this.twilioService.sendSMS(phone, message)];
                        case 28:
                            _h.sent();
                            return [3 /*break*/, 30];
                        case 29:
                            smsErr_3 = _h.sent();
                            console.warn("[convertToBooking] SMS failed for lead ".concat(lead.id, ":"), smsErr_3);
                            return [3 /*break*/, 30];
                        case 30:
                            _i++;
                            return [3 /*break*/, 26];
                        case 31: return [3 /*break*/, 33];
                        case 32:
                            notifyErr_1 = _h.sent();
                            // Non-fatal — booking was already confirmed; just log
                            console.warn('[convertToBooking] Conflict notification error:', notifyErr_1);
                            return [3 /*break*/, 33];
                        case 33: return [2 /*return*/, {
                                booking: booking,
                                event: event,
                                message: 'Successfully converted intake form to booking',
                            }];
                    }
                });
            });
        };
        /**
         * Recreate an event from an intake form if it was deleted.
         * Links the newly created event back to the intake form via intake_form_id.
         */
        IntakeFormsService_1.prototype.recreateEvent = function (supabase, userId, intakeFormId) {
            return __awaiter(this, void 0, void 0, function () {
                var supabaseAdmin, _a, intakeForm, intakeError, existingEvent, ownerVenueId, eventData, _b, createdEvent, eventError;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            supabaseAdmin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('intake_forms')
                                    .select('*')
                                    .eq('id', intakeFormId)
                                    .eq('user_id', userId)
                                    .single()];
                        case 1:
                            _a = _c.sent(), intakeForm = _a.data, intakeError = _a.error;
                            if (intakeError)
                                throw intakeError;
                            if (!intakeForm)
                                throw new Error('Intake form not found');
                            return [4 /*yield*/, supabaseAdmin
                                    .from('event')
                                    .select('id')
                                    .eq('intake_form_id', intakeFormId)
                                    .maybeSingle()];
                        case 2:
                            existingEvent = (_c.sent()).data;
                            if (existingEvent) {
                                return [2 /*return*/, {
                                        event: existingEvent,
                                        message: 'Event already exists for this intake form',
                                    }];
                            }
                            return [4 /*yield*/, this.resolveOwnerVenueId(userId, supabaseAdmin)];
                        case 3:
                            ownerVenueId = _c.sent();
                            eventData = __assign({ name: intakeForm.event_name || "".concat(intakeForm.event_type ? intakeForm.event_type.charAt(0).toUpperCase() + intakeForm.event_type.slice(1).replace(/_/g, ' ') : 'Event', " - ").concat(intakeForm.contact_name), date: intakeForm.event_date, start_time: intakeForm.event_time || '00:00', end_time: intakeForm.event_end_time || '23:59', description: intakeForm.special_requests || '', status: 'scheduled', guest_count: intakeForm.guest_count || null, venue: 'TBD', owner_id: userId, intake_form_id: intakeFormId }, (ownerVenueId ? { venue_id: ownerVenueId } : {}));
                            return [4 /*yield*/, supabaseAdmin
                                    .from('event')
                                    .insert([eventData])
                                    .select()
                                    .single()];
                        case 4:
                            _b = _c.sent(), createdEvent = _b.data, eventError = _b.error;
                            if (eventError)
                                throw eventError;
                            // Update the intake form with the new event_id
                            return [4 /*yield*/, supabaseAdmin
                                    .from('intake_forms')
                                    .update({ event_id: createdEvent.id })
                                    .eq('id', intakeFormId)];
                        case 5:
                            // Update the intake form with the new event_id
                            _c.sent();
                            return [2 /*return*/, {
                                    event: createdEvent,
                                    message: 'Event recreated successfully',
                                }];
                    }
                });
            });
        };
        IntakeFormsService_1.prototype.getPublicOwnerInfo = function (ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var supabaseAdmin, _a, owner, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabaseAdmin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabaseAdmin
                                    .from('users')
                                    .select('first_name, last_name, email, phone')
                                    .eq('id', ownerId)
                                    .maybeSingle()];
                        case 1:
                            _a = _b.sent(), owner = _a.data, error = _a.error;
                            if (error || !owner)
                                throw new Error('Owner not found');
                            return [2 /*return*/, {
                                    ownerName: [owner.first_name, owner.last_name].filter(Boolean).join(' ') || 'Event Planner',
                                }];
                    }
                });
            });
        };
        IntakeFormsService_1.prototype.createPublic = function (ownerId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var supabaseAdmin, accessibility_requirements, preferred_contact, safeDto, _a, data, error, owner, ownerPhone, ownerEmail, eventDate, smsErr_4;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            supabaseAdmin = this.supabaseService.getAdminClient();
                            accessibility_requirements = dto.accessibility_requirements, preferred_contact = dto.preferred_contact, safeDto = __rest(dto, ["accessibility_requirements", "preferred_contact"]);
                            if (safeDto.contact_phone) {
                                safeDto.contact_phone = normalizePhone(safeDto.contact_phone);
                            }
                            return [4 /*yield*/, supabaseAdmin
                                    .from('intake_forms')
                                    .insert([__assign(__assign({}, safeDto), { user_id: ownerId })])
                                    .select()
                                    .single()];
                        case 1:
                            _a = _c.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new Error("Public intake form insert failed: ".concat(error.message));
                            // Auto-create an event for this intake form
                            return [4 /*yield*/, this.autoCreateEvent(data, ownerId)];
                        case 2:
                            // Auto-create an event for this intake form
                            _c.sent();
                            _c.label = 3;
                        case 3:
                            _c.trys.push([3, 8, , 9]);
                            return [4 /*yield*/, supabaseAdmin
                                    .from('users')
                                    .select('phone_number, email')
                                    .eq('id', ownerId)
                                    .maybeSingle()];
                        case 4:
                            owner = (_c.sent()).data;
                            ownerPhone = (_b = owner === null || owner === void 0 ? void 0 : owner.phone_number) !== null && _b !== void 0 ? _b : null;
                            ownerEmail = (owner === null || owner === void 0 ? void 0 : owner.email) || null;
                            eventDate = safeDto.event_date
                                ? new Date(safeDto.event_date + 'T12:00:00').toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric', year: 'numeric',
                                })
                                : 'TBD';
                            return [4 /*yield*/, this.smsNotifications.newIntakeFormSubmission(ownerPhone, safeDto.contact_name || 'A client', safeDto.event_type || 'event', eventDate)];
                        case 5:
                            _c.sent();
                            if (!ownerEmail) return [3 /*break*/, 7];
                            return [4 /*yield*/, this.mailService.sendNewLeadNotification({
                                    ownerEmail: ownerEmail,
                                    clientName: safeDto.contact_name || 'A client',
                                    eventType: safeDto.event_type || 'event',
                                    eventDate: eventDate,
                                    clientEmail: safeDto.contact_email || '',
                                    clientPhone: safeDto.contact_phone || null,
                                    budget: safeDto.budget_range || null,
                                    guestCount: safeDto.guest_count || null,
                                })];
                        case 6:
                            _c.sent();
                            return [3 /*break*/, 7];
                        case 7: return [3 /*break*/, 9];
                        case 8:
                            smsErr_4 = _c.sent();
                            console.warn('[IntakeFormsService.createPublic] Owner notification failed:', smsErr_4);
                            return [3 /*break*/, 9];
                        case 9: return [2 /*return*/, data];
                    }
                });
            });
        };
        return IntakeFormsService_1;
    }());
    __setFunctionName(_classThis, "IntakeFormsService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        IntakeFormsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return IntakeFormsService = _classThis;
}();
exports.IntakeFormsService = IntakeFormsService;
