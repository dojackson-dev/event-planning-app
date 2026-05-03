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
exports.MessagingService = void 0;
var common_1 = require("@nestjs/common");
var MessagingService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var MessagingService = _classThis = /** @class */ (function () {
        function MessagingService_1(supabaseService, twilioService) {
            this.supabaseService = supabaseService;
            this.twilioService = twilioService;
            this.logger = new common_1.Logger(MessagingService.name);
        }
        /** Normalize DB row: map `message` column -> `content` for frontend compatibility */
        MessagingService_1.prototype.mapRow = function (row) {
            var _a;
            if (!row)
                return row;
            var message = row.message, rest = __rest(row, ["message"]);
            return __assign(__assign({}, rest), { content: (_a = rest.content) !== null && _a !== void 0 ? _a : message });
        };
        MessagingService_1.prototype.findAll = function (supabase, ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error;
                var _this = this;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('messages')
                                .select('*, event:events(id, name, date)')
                                .eq('owner_id', ownerId)
                                .order('created_at', { ascending: false })];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new Error(error.message);
                            return [2 /*return*/, (data || []).map(function (r) { return _this.mapRow(r); })];
                    }
                });
            });
        };
        MessagingService_1.prototype.findByEvent = function (supabase, ownerId, eventId) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error;
                var _this = this;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('messages')
                                .select('*, event:events(id, name, date)')
                                .eq('owner_id', ownerId)
                                .eq('event_id', eventId)
                                .order('created_at', { ascending: false })];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new Error(error.message);
                            return [2 /*return*/, (data || []).map(function (r) { return _this.mapRow(r); })];
                    }
                });
            });
        };
        MessagingService_1.prototype.findOne = function (supabase, ownerId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('messages')
                                .select('*, event:events(id, name, date)')
                                .eq('owner_id', ownerId)
                                .eq('id', id)
                                .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new Error(error.message);
                            return [2 /*return*/, this.mapRow(data)];
                    }
                });
            });
        };
        MessagingService_1.prototype.sendMessage = function (supabase, ownerId, messageData) {
            return __awaiter(this, void 0, void 0, function () {
                var UUID_REGEX, resolvedUserId, recipient, _a, savedMessage, insertError, typeLabel, label, result, updated, err_1, updated;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                            resolvedUserId = !messageData.skipOptInCheck &&
                                messageData.userId &&
                                UUID_REGEX.test(messageData.userId)
                                ? messageData.userId
                                : null;
                            if (!(!messageData.skipOptInCheck && messageData.userId && UUID_REGEX.test(messageData.userId))) return [3 /*break*/, 2];
                            return [4 /*yield*/, supabase
                                    .from('users')
                                    .select('sms_opt_in')
                                    .eq('id', messageData.userId)
                                    .single()];
                        case 1:
                            recipient = (_c.sent()).data;
                            if (recipient && recipient.sms_opt_in === false) {
                                throw new common_1.BadRequestException("Recipient has not opted in to SMS messages. Messages can only be sent to users who have given express consent.");
                            }
                            _c.label = 2;
                        case 2: return [4 /*yield*/, supabase
                                .from('messages')
                                .insert({
                                owner_id: ownerId,
                                recipient_phone: messageData.recipientPhone,
                                recipient_name: messageData.recipientName,
                                recipient_type: messageData.recipientType,
                                user_id: resolvedUserId,
                                // event_id FK references "events" but app uses table "event" (singular) — store null to avoid FK violation
                                event_id: null,
                                message_type: messageData.messageType,
                                // Write both columns: older schema uses "message", newer uses "content"
                                message: messageData.content,
                                content: messageData.content,
                                status: 'pending',
                            })
                                .select()
                                .single()];
                        case 3:
                            _a = _c.sent(), savedMessage = _a.data, insertError = _a.error;
                            if (insertError) {
                                this.logger.error('messages insert failed', insertError.message, insertError);
                                throw new Error("DB insert failed: ".concat(insertError.message));
                            }
                            _c.label = 4;
                        case 4:
                            _c.trys.push([4, 7, , 9]);
                            typeLabel = {
                                reminder: 'Reminder',
                                invoice: 'Invoice',
                                confirmation: 'Confirmation',
                                update: 'Update',
                                support: 'Support',
                                announcement: 'Announcement',
                                custom: 'Custom',
                            };
                            label = (_b = typeLabel[messageData.messageType]) !== null && _b !== void 0 ? _b : 'Notification';
                            return [4 /*yield*/, this.twilioService.sendSMS(messageData.recipientPhone, "DoVenue Suite ".concat(label, " Message\n").concat(messageData.content))];
                        case 5:
                            result = _c.sent();
                            return [4 /*yield*/, supabase
                                    .from('messages')
                                    .update({ status: 'sent', twilio_sid: result.sid, sent_at: new Date().toISOString() })
                                    .eq('id', savedMessage.id)
                                    .select()
                                    .single()];
                        case 6:
                            updated = (_c.sent()).data;
                            return [2 /*return*/, this.mapRow(updated)];
                        case 7:
                            err_1 = _c.sent();
                            return [4 /*yield*/, supabase
                                    .from('messages')
                                    .update({ status: 'failed', error_message: err_1.message })
                                    .eq('id', savedMessage.id)
                                    .select()
                                    .single()];
                        case 8:
                            updated = (_c.sent()).data;
                            return [2 /*return*/, this.mapRow(updated)];
                        case 9: return [2 /*return*/];
                    }
                });
            });
        };
        MessagingService_1.prototype.sendBulkMessages = function (supabase, ownerId, messages) {
            return __awaiter(this, void 0, void 0, function () {
                var results, _i, messages_1, messageData, message, err_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            results = [];
                            _i = 0, messages_1 = messages;
                            _a.label = 1;
                        case 1:
                            if (!(_i < messages_1.length)) return [3 /*break*/, 6];
                            messageData = messages_1[_i];
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, this.sendMessage(supabase, ownerId, messageData)];
                        case 3:
                            message = _a.sent();
                            results.push(message);
                            return [3 /*break*/, 5];
                        case 4:
                            err_2 = _a.sent();
                            console.error("Failed to send to ".concat(messageData.recipientPhone, ":"), err_2);
                            return [3 /*break*/, 5];
                        case 5:
                            _i++;
                            return [3 /*break*/, 1];
                        case 6: return [2 /*return*/, results];
                    }
                });
            });
        };
        MessagingService_1.prototype.updateMessageStatus = function (supabase, ownerId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var message, status_1, updated, err_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('messages')
                                .select('*')
                                .eq('owner_id', ownerId)
                                .eq('id', id)
                                .single()];
                        case 1:
                            message = (_a.sent()).data;
                            if (!message || !message.twilio_sid)
                                return [2 /*return*/, this.mapRow(message)];
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 5, , 6]);
                            return [4 /*yield*/, this.twilioService.getMessageStatus(message.twilio_sid)];
                        case 3:
                            status_1 = _a.sent();
                            return [4 /*yield*/, supabase
                                    .from('messages')
                                    .update({ status: status_1 })
                                    .eq('id', id)
                                    .select()
                                    .single()];
                        case 4:
                            updated = (_a.sent()).data;
                            return [2 /*return*/, this.mapRow(updated)];
                        case 5:
                            err_3 = _a.sent();
                            console.error('Failed to update message status:', err_3);
                            return [2 /*return*/, this.mapRow(message)];
                        case 6: return [2 /*return*/];
                    }
                });
            });
        };
        MessagingService_1.prototype.deleteMessage = function (supabase, ownerId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('messages')
                                .delete()
                                .eq('owner_id', ownerId)
                                .eq('id', id)];
                        case 1:
                            error = (_a.sent()).error;
                            if (error)
                                throw new Error(error.message);
                            return [2 /*return*/];
                    }
                });
            });
        };
        MessagingService_1.prototype.getMessageStats = function (supabase, ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error, msgs;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('messages')
                                .select('status')
                                .eq('owner_id', ownerId)];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new Error(error.message);
                            msgs = data || [];
                            return [2 /*return*/, {
                                    total: msgs.length,
                                    sent: msgs.filter(function (m) { return m.status === 'sent'; }).length,
                                    delivered: msgs.filter(function (m) { return m.status === 'delivered'; }).length,
                                    failed: msgs.filter(function (m) { return m.status === 'failed'; }).length,
                                    pending: msgs.filter(function (m) { return m.status === 'pending'; }).length,
                                }];
                    }
                });
            });
        };
        /**
         * Processes an inbound Twilio webhook message.
         * Handles STOP (opt-out) and START (opt-in) keywords by updating the
         * sms_opt_in flag on the matching user record — using the admin Supabase
         * client so the webhook can run without a user JWT.
         */
        MessagingService_1.prototype.handleInboundMessage = function (adminSupabase, body, from) {
            return __awaiter(this, void 0, void 0, function () {
                var action, optIn, updatePayload, error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            action = this.twilioService.parseInboundMessage(body, from).action;
                            if (!action)
                                return [2 /*return*/];
                            optIn = action === 'start';
                            updatePayload = { sms_opt_in: optIn };
                            if (optIn) {
                                updatePayload.sms_opt_in_at = new Date().toISOString();
                                updatePayload.sms_opt_out_at = null;
                            }
                            else {
                                updatePayload.sms_opt_out_at = new Date().toISOString();
                            }
                            return [4 /*yield*/, adminSupabase
                                    .from('users')
                                    .update(updatePayload)
                                    .eq('phone', from)];
                        case 1:
                            error = (_a.sent()).error;
                            if (error) {
                                this.logger.error("Failed to update opt-in for ".concat(from, ": ").concat(error.message));
                            }
                            else {
                                this.logger.log("SMS opt-".concat(optIn ? 'in' : 'out', " processed for ").concat(from));
                            }
                            return [2 /*return*/];
                    }
                });
            });
        };
        return MessagingService_1;
    }());
    __setFunctionName(_classThis, "MessagingService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        MessagingService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return MessagingService = _classThis;
}();
exports.MessagingService = MessagingService;
