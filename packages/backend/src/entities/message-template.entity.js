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
exports.MessageTemplate = void 0;
var typeorm_1 = require("typeorm");
var MessageTemplate = function () {
    var _classDecorators = [(0, typeorm_1.Entity)('message_templates')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _id_decorators;
    var _id_initializers = [];
    var _id_extraInitializers = [];
    var _name_decorators;
    var _name_initializers = [];
    var _name_extraInitializers = [];
    var _messageType_decorators;
    var _messageType_initializers = [];
    var _messageType_extraInitializers = [];
    var _content_decorators;
    var _content_initializers = [];
    var _content_extraInitializers = [];
    var _isActive_decorators;
    var _isActive_initializers = [];
    var _isActive_extraInitializers = [];
    var _sendBeforeDays_decorators;
    var _sendBeforeDays_initializers = [];
    var _sendBeforeDays_extraInitializers = [];
    var _sendTime_decorators;
    var _sendTime_initializers = [];
    var _sendTime_extraInitializers = [];
    var _repeatIntervalDays_decorators;
    var _repeatIntervalDays_initializers = [];
    var _repeatIntervalDays_extraInitializers = [];
    var _recipientType_decorators;
    var _recipientType_initializers = [];
    var _recipientType_extraInitializers = [];
    var _autoSend_decorators;
    var _autoSend_initializers = [];
    var _autoSend_extraInitializers = [];
    var _createdAt_decorators;
    var _createdAt_initializers = [];
    var _createdAt_extraInitializers = [];
    var _updatedAt_decorators;
    var _updatedAt_initializers = [];
    var _updatedAt_extraInitializers = [];
    var MessageTemplate = _classThis = /** @class */ (function () {
        function MessageTemplate_1() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.name = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _name_initializers, void 0));
            this.messageType = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _messageType_initializers, void 0));
            this.content = (__runInitializers(this, _messageType_extraInitializers), __runInitializers(this, _content_initializers, void 0));
            this.isActive = (__runInitializers(this, _content_extraInitializers), __runInitializers(this, _isActive_initializers, void 0));
            this.sendBeforeDays = (__runInitializers(this, _isActive_extraInitializers), __runInitializers(this, _sendBeforeDays_initializers, void 0)); // Days before event
            this.sendTime = (__runInitializers(this, _sendBeforeDays_extraInitializers), __runInitializers(this, _sendTime_initializers, void 0)); // HH:MM format
            this.repeatIntervalDays = (__runInitializers(this, _sendTime_extraInitializers), __runInitializers(this, _repeatIntervalDays_initializers, void 0)); // For recurring reminders
            this.recipientType = (__runInitializers(this, _repeatIntervalDays_extraInitializers), __runInitializers(this, _recipientType_initializers, void 0));
            this.autoSend = (__runInitializers(this, _recipientType_extraInitializers), __runInitializers(this, _autoSend_initializers, void 0)); // Auto-send when conditions are met
            this.createdAt = (__runInitializers(this, _autoSend_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            this.updatedAt = (__runInitializers(this, _createdAt_extraInitializers), __runInitializers(this, _updatedAt_initializers, void 0));
            __runInitializers(this, _updatedAt_extraInitializers);
        }
        return MessageTemplate_1;
    }());
    __setFunctionName(_classThis, "MessageTemplate");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)()];
        _name_decorators = [(0, typeorm_1.Column)()];
        _messageType_decorators = [(0, typeorm_1.Column)({ name: 'message_type' })];
        _content_decorators = [(0, typeorm_1.Column)({ type: 'text' })];
        _isActive_decorators = [(0, typeorm_1.Column)({ name: 'is_active', default: true })];
        _sendBeforeDays_decorators = [(0, typeorm_1.Column)({ name: 'send_before_days', nullable: true })];
        _sendTime_decorators = [(0, typeorm_1.Column)({ name: 'send_time', nullable: true })];
        _repeatIntervalDays_decorators = [(0, typeorm_1.Column)({ name: 'repeat_interval_days', nullable: true })];
        _recipientType_decorators = [(0, typeorm_1.Column)({ name: 'recipient_type' })];
        _autoSend_decorators = [(0, typeorm_1.Column)({ name: 'auto_send', default: false })];
        _createdAt_decorators = [(0, typeorm_1.CreateDateColumn)({ name: 'created_at' })];
        _updatedAt_decorators = [(0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: function (obj) { return "id" in obj; }, get: function (obj) { return obj.id; }, set: function (obj, value) { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: function (obj) { return "name" in obj; }, get: function (obj) { return obj.name; }, set: function (obj, value) { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
        __esDecorate(null, null, _messageType_decorators, { kind: "field", name: "messageType", static: false, private: false, access: { has: function (obj) { return "messageType" in obj; }, get: function (obj) { return obj.messageType; }, set: function (obj, value) { obj.messageType = value; } }, metadata: _metadata }, _messageType_initializers, _messageType_extraInitializers);
        __esDecorate(null, null, _content_decorators, { kind: "field", name: "content", static: false, private: false, access: { has: function (obj) { return "content" in obj; }, get: function (obj) { return obj.content; }, set: function (obj, value) { obj.content = value; } }, metadata: _metadata }, _content_initializers, _content_extraInitializers);
        __esDecorate(null, null, _isActive_decorators, { kind: "field", name: "isActive", static: false, private: false, access: { has: function (obj) { return "isActive" in obj; }, get: function (obj) { return obj.isActive; }, set: function (obj, value) { obj.isActive = value; } }, metadata: _metadata }, _isActive_initializers, _isActive_extraInitializers);
        __esDecorate(null, null, _sendBeforeDays_decorators, { kind: "field", name: "sendBeforeDays", static: false, private: false, access: { has: function (obj) { return "sendBeforeDays" in obj; }, get: function (obj) { return obj.sendBeforeDays; }, set: function (obj, value) { obj.sendBeforeDays = value; } }, metadata: _metadata }, _sendBeforeDays_initializers, _sendBeforeDays_extraInitializers);
        __esDecorate(null, null, _sendTime_decorators, { kind: "field", name: "sendTime", static: false, private: false, access: { has: function (obj) { return "sendTime" in obj; }, get: function (obj) { return obj.sendTime; }, set: function (obj, value) { obj.sendTime = value; } }, metadata: _metadata }, _sendTime_initializers, _sendTime_extraInitializers);
        __esDecorate(null, null, _repeatIntervalDays_decorators, { kind: "field", name: "repeatIntervalDays", static: false, private: false, access: { has: function (obj) { return "repeatIntervalDays" in obj; }, get: function (obj) { return obj.repeatIntervalDays; }, set: function (obj, value) { obj.repeatIntervalDays = value; } }, metadata: _metadata }, _repeatIntervalDays_initializers, _repeatIntervalDays_extraInitializers);
        __esDecorate(null, null, _recipientType_decorators, { kind: "field", name: "recipientType", static: false, private: false, access: { has: function (obj) { return "recipientType" in obj; }, get: function (obj) { return obj.recipientType; }, set: function (obj, value) { obj.recipientType = value; } }, metadata: _metadata }, _recipientType_initializers, _recipientType_extraInitializers);
        __esDecorate(null, null, _autoSend_decorators, { kind: "field", name: "autoSend", static: false, private: false, access: { has: function (obj) { return "autoSend" in obj; }, get: function (obj) { return obj.autoSend; }, set: function (obj, value) { obj.autoSend = value; } }, metadata: _metadata }, _autoSend_initializers, _autoSend_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: function (obj) { return "createdAt" in obj; }, get: function (obj) { return obj.createdAt; }, set: function (obj, value) { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, null, _updatedAt_decorators, { kind: "field", name: "updatedAt", static: false, private: false, access: { has: function (obj) { return "updatedAt" in obj; }, get: function (obj) { return obj.updatedAt; }, set: function (obj, value) { obj.updatedAt = value; } }, metadata: _metadata }, _updatedAt_initializers, _updatedAt_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        MessageTemplate = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return MessageTemplate = _classThis;
}();
exports.MessageTemplate = MessageTemplate;
