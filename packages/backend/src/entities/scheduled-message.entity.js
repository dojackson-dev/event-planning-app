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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduledMessage = void 0;
var typeorm_1 = require("typeorm");
var event_entity_1 = require("./event.entity");
var message_template_entity_1 = require("./message-template.entity");
var ScheduledMessage = function () {
    var _classDecorators = [(0, typeorm_1.Entity)('scheduled_messages')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _id_decorators;
    var _id_initializers = [];
    var _id_extraInitializers = [];
    var _eventId_decorators;
    var _eventId_initializers = [];
    var _eventId_extraInitializers = [];
    var _event_decorators;
    var _event_initializers = [];
    var _event_extraInitializers = [];
    var _templateId_decorators;
    var _templateId_initializers = [];
    var _templateId_extraInitializers = [];
    var _template_decorators;
    var _template_initializers = [];
    var _template_extraInitializers = [];
    var _recipientType_decorators;
    var _recipientType_initializers = [];
    var _recipientType_extraInitializers = [];
    var _content_decorators;
    var _content_initializers = [];
    var _content_extraInitializers = [];
    var _scheduledFor_decorators;
    var _scheduledFor_initializers = [];
    var _scheduledFor_extraInitializers = [];
    var _status_decorators;
    var _status_initializers = [];
    var _status_extraInitializers = [];
    var _messageId_decorators;
    var _messageId_initializers = [];
    var _messageId_extraInitializers = [];
    var _sentAt_decorators;
    var _sentAt_initializers = [];
    var _sentAt_extraInitializers = [];
    var _errorMessage_decorators;
    var _errorMessage_initializers = [];
    var _errorMessage_extraInitializers = [];
    var _createdAt_decorators;
    var _createdAt_initializers = [];
    var _createdAt_extraInitializers = [];
    var ScheduledMessage = _classThis = /** @class */ (function () {
        function ScheduledMessage_1() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.eventId = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _eventId_initializers, void 0));
            this.event = (__runInitializers(this, _eventId_extraInitializers), __runInitializers(this, _event_initializers, void 0));
            this.templateId = (__runInitializers(this, _event_extraInitializers), __runInitializers(this, _templateId_initializers, void 0));
            this.template = (__runInitializers(this, _templateId_extraInitializers), __runInitializers(this, _template_initializers, void 0));
            this.recipientType = (__runInitializers(this, _template_extraInitializers), __runInitializers(this, _recipientType_initializers, void 0));
            this.content = (__runInitializers(this, _recipientType_extraInitializers), __runInitializers(this, _content_initializers, void 0));
            this.scheduledFor = (__runInitializers(this, _content_extraInitializers), __runInitializers(this, _scheduledFor_initializers, void 0));
            this.status = (__runInitializers(this, _scheduledFor_extraInitializers), __runInitializers(this, _status_initializers, void 0));
            this.messageId = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _messageId_initializers, void 0)); // Reference to sent message
            this.sentAt = (__runInitializers(this, _messageId_extraInitializers), __runInitializers(this, _sentAt_initializers, void 0));
            this.errorMessage = (__runInitializers(this, _sentAt_extraInitializers), __runInitializers(this, _errorMessage_initializers, void 0));
            this.createdAt = (__runInitializers(this, _errorMessage_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            __runInitializers(this, _createdAt_extraInitializers);
        }
        return ScheduledMessage_1;
    }());
    __setFunctionName(_classThis, "ScheduledMessage");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)()];
        _eventId_decorators = [(0, typeorm_1.Column)({ name: 'event_id' })];
        _event_decorators = [(0, typeorm_1.ManyToOne)(function () { return event_entity_1.Event; }), (0, typeorm_1.JoinColumn)({ name: 'event_id' })];
        _templateId_decorators = [(0, typeorm_1.Column)({ name: 'template_id', nullable: true })];
        _template_decorators = [(0, typeorm_1.ManyToOne)(function () { return message_template_entity_1.MessageTemplate; }, { nullable: true }), (0, typeorm_1.JoinColumn)({ name: 'template_id' })];
        _recipientType_decorators = [(0, typeorm_1.Column)({ name: 'recipient_type' })];
        _content_decorators = [(0, typeorm_1.Column)({ type: 'text' })];
        _scheduledFor_decorators = [(0, typeorm_1.Column)({ name: 'scheduled_for', type: 'timestamp' })];
        _status_decorators = [(0, typeorm_1.Column)({ default: 'pending' })];
        _messageId_decorators = [(0, typeorm_1.Column)({ name: 'message_id', nullable: true })];
        _sentAt_decorators = [(0, typeorm_1.Column)({ nullable: true, name: 'sent_at', type: 'timestamp' })];
        _errorMessage_decorators = [(0, typeorm_1.Column)({ nullable: true, name: 'error_message', type: 'text' })];
        _createdAt_decorators = [(0, typeorm_1.CreateDateColumn)({ name: 'created_at' })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: function (obj) { return "id" in obj; }, get: function (obj) { return obj.id; }, set: function (obj, value) { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _eventId_decorators, { kind: "field", name: "eventId", static: false, private: false, access: { has: function (obj) { return "eventId" in obj; }, get: function (obj) { return obj.eventId; }, set: function (obj, value) { obj.eventId = value; } }, metadata: _metadata }, _eventId_initializers, _eventId_extraInitializers);
        __esDecorate(null, null, _event_decorators, { kind: "field", name: "event", static: false, private: false, access: { has: function (obj) { return "event" in obj; }, get: function (obj) { return obj.event; }, set: function (obj, value) { obj.event = value; } }, metadata: _metadata }, _event_initializers, _event_extraInitializers);
        __esDecorate(null, null, _templateId_decorators, { kind: "field", name: "templateId", static: false, private: false, access: { has: function (obj) { return "templateId" in obj; }, get: function (obj) { return obj.templateId; }, set: function (obj, value) { obj.templateId = value; } }, metadata: _metadata }, _templateId_initializers, _templateId_extraInitializers);
        __esDecorate(null, null, _template_decorators, { kind: "field", name: "template", static: false, private: false, access: { has: function (obj) { return "template" in obj; }, get: function (obj) { return obj.template; }, set: function (obj, value) { obj.template = value; } }, metadata: _metadata }, _template_initializers, _template_extraInitializers);
        __esDecorate(null, null, _recipientType_decorators, { kind: "field", name: "recipientType", static: false, private: false, access: { has: function (obj) { return "recipientType" in obj; }, get: function (obj) { return obj.recipientType; }, set: function (obj, value) { obj.recipientType = value; } }, metadata: _metadata }, _recipientType_initializers, _recipientType_extraInitializers);
        __esDecorate(null, null, _content_decorators, { kind: "field", name: "content", static: false, private: false, access: { has: function (obj) { return "content" in obj; }, get: function (obj) { return obj.content; }, set: function (obj, value) { obj.content = value; } }, metadata: _metadata }, _content_initializers, _content_extraInitializers);
        __esDecorate(null, null, _scheduledFor_decorators, { kind: "field", name: "scheduledFor", static: false, private: false, access: { has: function (obj) { return "scheduledFor" in obj; }, get: function (obj) { return obj.scheduledFor; }, set: function (obj, value) { obj.scheduledFor = value; } }, metadata: _metadata }, _scheduledFor_initializers, _scheduledFor_extraInitializers);
        __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: function (obj) { return "status" in obj; }, get: function (obj) { return obj.status; }, set: function (obj, value) { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
        __esDecorate(null, null, _messageId_decorators, { kind: "field", name: "messageId", static: false, private: false, access: { has: function (obj) { return "messageId" in obj; }, get: function (obj) { return obj.messageId; }, set: function (obj, value) { obj.messageId = value; } }, metadata: _metadata }, _messageId_initializers, _messageId_extraInitializers);
        __esDecorate(null, null, _sentAt_decorators, { kind: "field", name: "sentAt", static: false, private: false, access: { has: function (obj) { return "sentAt" in obj; }, get: function (obj) { return obj.sentAt; }, set: function (obj, value) { obj.sentAt = value; } }, metadata: _metadata }, _sentAt_initializers, _sentAt_extraInitializers);
        __esDecorate(null, null, _errorMessage_decorators, { kind: "field", name: "errorMessage", static: false, private: false, access: { has: function (obj) { return "errorMessage" in obj; }, get: function (obj) { return obj.errorMessage; }, set: function (obj, value) { obj.errorMessage = value; } }, metadata: _metadata }, _errorMessage_initializers, _errorMessage_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: function (obj) { return "createdAt" in obj; }, get: function (obj) { return obj.createdAt; }, set: function (obj, value) { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ScheduledMessage = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ScheduledMessage = _classThis;
}();
exports.ScheduledMessage = ScheduledMessage;
