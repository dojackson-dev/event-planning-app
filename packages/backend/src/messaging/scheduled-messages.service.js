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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduledMessagesService = void 0;
// @ts-nocheck
// NOTE: This file is legacy TypeORM code, not imported by any active module.
// Kept for reference — superseded by the new MessagingService.
var common_1 = require("@nestjs/common");
var typeorm_1 = require("@nestjs/typeorm");
var typeorm_2 = require("typeorm");
var scheduled_message_entity_1 = require("../entities/scheduled-message.entity");
var event_entity_1 = require("../entities/event.entity");
var user_entity_1 = require("../entities/user.entity");
var message_template_entity_1 = require("../entities/message-template.entity");
var schedule_1 = require("@nestjs/schedule");
var ScheduledMessagesService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _processScheduledMessages_decorators;
    var ScheduledMessagesService = _classThis = /** @class */ (function () {
        function ScheduledMessagesService_1(scheduledMessageRepository, eventRepository, userRepository, templateRepository, messagingService) {
            this.scheduledMessageRepository = (__runInitializers(this, _instanceExtraInitializers), scheduledMessageRepository);
            this.eventRepository = eventRepository;
            this.userRepository = userRepository;
            this.templateRepository = templateRepository;
            this.messagingService = messagingService;
        }
        ScheduledMessagesService_1.prototype.findAll = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.scheduledMessageRepository.find({
                            relations: ['event', 'template'],
                            order: { scheduledFor: 'ASC' },
                        })];
                });
            });
        };
        ScheduledMessagesService_1.prototype.findByEvent = function (eventId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.scheduledMessageRepository.find({
                            where: { eventId: eventId },
                            relations: ['template'],
                            order: { scheduledFor: 'ASC' },
                        })];
                });
            });
        };
        ScheduledMessagesService_1.prototype.findPending = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.scheduledMessageRepository.find({
                            where: { status: 'pending' },
                            relations: ['event', 'template'],
                            order: { scheduledFor: 'ASC' },
                        })];
                });
            });
        };
        ScheduledMessagesService_1.prototype.findOne = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.scheduledMessageRepository.findOne({
                            where: { id: id },
                            relations: ['event', 'template'],
                        })];
                });
            });
        };
        ScheduledMessagesService_1.prototype.create = function (scheduledMessageData) {
            return __awaiter(this, void 0, void 0, function () {
                var scheduledMessage;
                return __generator(this, function (_a) {
                    scheduledMessage = this.scheduledMessageRepository.create(scheduledMessageData);
                    return [2 /*return*/, this.scheduledMessageRepository.save(scheduledMessage)];
                });
            });
        };
        ScheduledMessagesService_1.prototype.scheduleFromTemplate = function (eventId, templateId) {
            return __awaiter(this, void 0, void 0, function () {
                var event, template, eventDate, scheduledFor, _a, hours, minutes, content;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.eventRepository.findOne({
                                where: { id: eventId },
                            })];
                        case 1:
                            event = _b.sent();
                            if (!event) {
                                throw new Error('Event not found');
                            }
                            return [4 /*yield*/, this.templateRepository.findOne({
                                    where: { id: templateId },
                                })];
                        case 2:
                            template = _b.sent();
                            if (!template) {
                                throw new Error('Template not found');
                            }
                            eventDate = new Date(event.date);
                            scheduledFor = new Date(eventDate);
                            if (template.sendBeforeDays) {
                                scheduledFor.setDate(scheduledFor.getDate() - template.sendBeforeDays);
                            }
                            if (template.sendTime) {
                                _a = template.sendTime.split(':').map(Number), hours = _a[0], minutes = _a[1];
                                scheduledFor.setHours(hours, minutes, 0, 0);
                            }
                            content = this.replacePlaceholders(template.content, event);
                            return [2 /*return*/, this.create({
                                    eventId: event.id,
                                    templateId: template.id,
                                    recipientType: template.recipientType,
                                    content: content,
                                    scheduledFor: scheduledFor,
                                })];
                    }
                });
            });
        };
        ScheduledMessagesService_1.prototype.scheduleMultipleFromTemplate = function (eventId, templateId) {
            return __awaiter(this, void 0, void 0, function () {
                var template, event, scheduledMessages, eventDate, currentDate, scheduledFor, daysUntilEvent, _a, hours, minutes, content, scheduled;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.templateRepository.findOne({
                                where: { id: templateId },
                            })];
                        case 1:
                            template = _b.sent();
                            if (!(!template || !template.repeatIntervalDays)) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.scheduleFromTemplate(eventId, templateId)];
                        case 2: return [2 /*return*/, [_b.sent()]];
                        case 3: return [4 /*yield*/, this.eventRepository.findOne({
                                where: { id: eventId },
                            })];
                        case 4:
                            event = _b.sent();
                            if (!event) {
                                throw new Error('Event not found');
                            }
                            scheduledMessages = [];
                            eventDate = new Date(event.date);
                            currentDate = new Date();
                            _b.label = 5;
                        case 5:
                            if (!(currentDate < eventDate)) return [3 /*break*/, 8];
                            scheduledFor = new Date(eventDate);
                            daysUntilEvent = Math.floor((eventDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
                            if (!(template.sendBeforeDays && daysUntilEvent >= template.sendBeforeDays)) return [3 /*break*/, 7];
                            scheduledFor.setDate(scheduledFor.getDate() - template.sendBeforeDays);
                            if (template.sendTime) {
                                _a = template.sendTime.split(':').map(Number), hours = _a[0], minutes = _a[1];
                                scheduledFor.setHours(hours, minutes, 0, 0);
                            }
                            if (!(scheduledFor > currentDate)) return [3 /*break*/, 7];
                            content = this.replacePlaceholders(template.content, event);
                            return [4 /*yield*/, this.create({
                                    eventId: event.id,
                                    templateId: template.id,
                                    recipientType: template.recipientType,
                                    content: content,
                                    scheduledFor: scheduledFor,
                                })];
                        case 6:
                            scheduled = _b.sent();
                            scheduledMessages.push(scheduled);
                            _b.label = 7;
                        case 7:
                            currentDate.setDate(currentDate.getDate() + template.repeatIntervalDays);
                            return [3 /*break*/, 5];
                        case 8: return [2 /*return*/, scheduledMessages];
                    }
                });
            });
        };
        ScheduledMessagesService_1.prototype.cancel = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var scheduledMessage;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.findOne(id)];
                        case 1:
                            scheduledMessage = _a.sent();
                            if (!scheduledMessage || scheduledMessage.status !== 'pending') {
                                return [2 /*return*/, null];
                            }
                            scheduledMessage.status = 'cancelled';
                            return [2 /*return*/, this.scheduledMessageRepository.save(scheduledMessage)];
                    }
                });
            });
        };
        ScheduledMessagesService_1.prototype.delete = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.scheduledMessageRepository.delete(id)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        // Cron job to process scheduled messages every minute
        ScheduledMessagesService_1.prototype.processScheduledMessages = function () {
            return __awaiter(this, void 0, void 0, function () {
                var now, dueMessages, _i, dueMessages_1, scheduledMessage, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            now = new Date();
                            return [4 /*yield*/, this.scheduledMessageRepository.find({
                                    where: {
                                        status: 'pending',
                                        scheduledFor: (0, typeorm_2.LessThanOrEqual)(now),
                                    },
                                    relations: ['event', 'event.owner'],
                                })];
                        case 1:
                            dueMessages = _a.sent();
                            _i = 0, dueMessages_1 = dueMessages;
                            _a.label = 2;
                        case 2:
                            if (!(_i < dueMessages_1.length)) return [3 /*break*/, 8];
                            scheduledMessage = dueMessages_1[_i];
                            _a.label = 3;
                        case 3:
                            _a.trys.push([3, 5, , 7]);
                            return [4 /*yield*/, this.sendScheduledMessage(scheduledMessage)];
                        case 4:
                            _a.sent();
                            return [3 /*break*/, 7];
                        case 5:
                            error_1 = _a.sent();
                            console.error("Failed to send scheduled message ".concat(scheduledMessage.id, ":"), error_1);
                            scheduledMessage.status = 'failed';
                            scheduledMessage.errorMessage = error_1.message;
                            return [4 /*yield*/, this.scheduledMessageRepository.save(scheduledMessage)];
                        case 6:
                            _a.sent();
                            return [3 /*break*/, 7];
                        case 7:
                            _i++;
                            return [3 /*break*/, 2];
                        case 8: return [2 /*return*/];
                    }
                });
            });
        };
        ScheduledMessagesService_1.prototype.sendScheduledMessage = function (scheduledMessage) {
            return __awaiter(this, void 0, void 0, function () {
                var event, messages, owner, sentMessages;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            event = scheduledMessage.event;
                            messages = [];
                            if (!(scheduledMessage.recipientType === 'client' || scheduledMessage.recipientType === 'all')) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.userRepository.findOne({
                                    where: { id: parseInt(event.ownerId) },
                                })];
                        case 1:
                            owner = _b.sent();
                            if (owner === null || owner === void 0 ? void 0 : owner.phone) {
                                messages.push({
                                    recipientPhone: owner.phone,
                                    recipientName: "".concat(owner.firstName, " ").concat(owner.lastName),
                                    recipientType: 'client',
                                    userId: owner.id,
                                    eventId: event.id,
                                    messageType: 'reminder',
                                    content: scheduledMessage.content,
                                });
                            }
                            _b.label = 2;
                        case 2:
                            if (!(messages.length > 0)) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.messagingService.sendBulkMessages(messages)];
                        case 3:
                            sentMessages = _b.sent();
                            scheduledMessage.status = 'sent';
                            scheduledMessage.sentAt = new Date();
                            scheduledMessage.messageId = (_a = sentMessages[0]) === null || _a === void 0 ? void 0 : _a.id;
                            return [3 /*break*/, 5];
                        case 4:
                            scheduledMessage.status = 'failed';
                            scheduledMessage.errorMessage = 'No recipients found';
                            _b.label = 5;
                        case 5: return [4 /*yield*/, this.scheduledMessageRepository.save(scheduledMessage)];
                        case 6:
                            _b.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        ScheduledMessagesService_1.prototype.replacePlaceholders = function (content, event) {
            var eventDate = new Date(event.date);
            return content
                .replace(/\{event_name\}/g, event.name)
                .replace(/\{event_date\}/g, eventDate.toLocaleDateString())
                .replace(/\{event_time\}/g, eventDate.toLocaleTimeString())
                .replace(/\{event_location\}/g, event.venue || 'TBD');
        };
        return ScheduledMessagesService_1;
    }());
    __setFunctionName(_classThis, "ScheduledMessagesService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _processScheduledMessages_decorators = [(0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE)];
        __esDecorate(_classThis, null, _processScheduledMessages_decorators, { kind: "method", name: "processScheduledMessages", static: false, private: false, access: { has: function (obj) { return "processScheduledMessages" in obj; }, get: function (obj) { return obj.processScheduledMessages; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ScheduledMessagesService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ScheduledMessagesService = _classThis;
}();
exports.ScheduledMessagesService = ScheduledMessagesService;
