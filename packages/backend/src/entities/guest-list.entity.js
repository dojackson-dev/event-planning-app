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
exports.GuestList = void 0;
var typeorm_1 = require("typeorm");
var user_entity_1 = require("./user.entity");
var event_entity_1 = require("./event.entity");
var guest_entity_1 = require("./guest.entity");
var GuestList = function () {
    var _classDecorators = [(0, typeorm_1.Entity)('guest_lists')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _id_decorators;
    var _id_initializers = [];
    var _id_extraInitializers = [];
    var _clientId_decorators;
    var _clientId_initializers = [];
    var _clientId_extraInitializers = [];
    var _client_decorators;
    var _client_initializers = [];
    var _client_extraInitializers = [];
    var _eventId_decorators;
    var _eventId_initializers = [];
    var _eventId_extraInitializers = [];
    var _event_decorators;
    var _event_initializers = [];
    var _event_extraInitializers = [];
    var _maxGuestsPerPerson_decorators;
    var _maxGuestsPerPerson_initializers = [];
    var _maxGuestsPerPerson_extraInitializers = [];
    var _accessCode_decorators;
    var _accessCode_initializers = [];
    var _accessCode_extraInitializers = [];
    var _shareToken_decorators;
    var _shareToken_initializers = [];
    var _shareToken_extraInitializers = [];
    var _arrivalToken_decorators;
    var _arrivalToken_initializers = [];
    var _arrivalToken_extraInitializers = [];
    var _isLocked_decorators;
    var _isLocked_initializers = [];
    var _isLocked_extraInitializers = [];
    var _guests_decorators;
    var _guests_initializers = [];
    var _guests_extraInitializers = [];
    var _createdAt_decorators;
    var _createdAt_initializers = [];
    var _createdAt_extraInitializers = [];
    var _updatedAt_decorators;
    var _updatedAt_initializers = [];
    var _updatedAt_extraInitializers = [];
    var GuestList = _classThis = /** @class */ (function () {
        function GuestList_1() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.clientId = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _clientId_initializers, void 0));
            this.client = (__runInitializers(this, _clientId_extraInitializers), __runInitializers(this, _client_initializers, void 0));
            this.eventId = (__runInitializers(this, _client_extraInitializers), __runInitializers(this, _eventId_initializers, void 0));
            this.event = (__runInitializers(this, _eventId_extraInitializers), __runInitializers(this, _event_initializers, void 0));
            this.maxGuestsPerPerson = (__runInitializers(this, _event_extraInitializers), __runInitializers(this, _maxGuestsPerPerson_initializers, void 0));
            this.accessCode = (__runInitializers(this, _maxGuestsPerPerson_extraInitializers), __runInitializers(this, _accessCode_initializers, void 0));
            this.shareToken = (__runInitializers(this, _accessCode_extraInitializers), __runInitializers(this, _shareToken_initializers, void 0));
            this.arrivalToken = (__runInitializers(this, _shareToken_extraInitializers), __runInitializers(this, _arrivalToken_initializers, void 0));
            this.isLocked = (__runInitializers(this, _arrivalToken_extraInitializers), __runInitializers(this, _isLocked_initializers, void 0));
            this.guests = (__runInitializers(this, _isLocked_extraInitializers), __runInitializers(this, _guests_initializers, void 0));
            this.createdAt = (__runInitializers(this, _guests_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            this.updatedAt = (__runInitializers(this, _createdAt_extraInitializers), __runInitializers(this, _updatedAt_initializers, void 0));
            __runInitializers(this, _updatedAt_extraInitializers);
        }
        return GuestList_1;
    }());
    __setFunctionName(_classThis, "GuestList");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)()];
        _clientId_decorators = [(0, typeorm_1.Column)({ name: 'client_id' })];
        _client_decorators = [(0, typeorm_1.ManyToOne)(function () { return user_entity_1.User; }), (0, typeorm_1.JoinColumn)({ name: 'client_id' })];
        _eventId_decorators = [(0, typeorm_1.Column)({ name: 'event_id' })];
        _event_decorators = [(0, typeorm_1.ManyToOne)(function () { return event_entity_1.Event; }), (0, typeorm_1.JoinColumn)({ name: 'event_id' })];
        _maxGuestsPerPerson_decorators = [(0, typeorm_1.Column)({ name: 'max_guests_per_person', default: 0 })];
        _accessCode_decorators = [(0, typeorm_1.Column)({ name: 'access_code', unique: true })];
        _shareToken_decorators = [(0, typeorm_1.Column)({ name: 'share_token', unique: true })];
        _arrivalToken_decorators = [(0, typeorm_1.Column)({ name: 'arrival_token', unique: true })];
        _isLocked_decorators = [(0, typeorm_1.Column)({ name: 'is_locked', default: false })];
        _guests_decorators = [(0, typeorm_1.OneToMany)(function () { return guest_entity_1.Guest; }, function (guest) { return guest.guestList; })];
        _createdAt_decorators = [(0, typeorm_1.CreateDateColumn)({ name: 'created_at' })];
        _updatedAt_decorators = [(0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: function (obj) { return "id" in obj; }, get: function (obj) { return obj.id; }, set: function (obj, value) { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _clientId_decorators, { kind: "field", name: "clientId", static: false, private: false, access: { has: function (obj) { return "clientId" in obj; }, get: function (obj) { return obj.clientId; }, set: function (obj, value) { obj.clientId = value; } }, metadata: _metadata }, _clientId_initializers, _clientId_extraInitializers);
        __esDecorate(null, null, _client_decorators, { kind: "field", name: "client", static: false, private: false, access: { has: function (obj) { return "client" in obj; }, get: function (obj) { return obj.client; }, set: function (obj, value) { obj.client = value; } }, metadata: _metadata }, _client_initializers, _client_extraInitializers);
        __esDecorate(null, null, _eventId_decorators, { kind: "field", name: "eventId", static: false, private: false, access: { has: function (obj) { return "eventId" in obj; }, get: function (obj) { return obj.eventId; }, set: function (obj, value) { obj.eventId = value; } }, metadata: _metadata }, _eventId_initializers, _eventId_extraInitializers);
        __esDecorate(null, null, _event_decorators, { kind: "field", name: "event", static: false, private: false, access: { has: function (obj) { return "event" in obj; }, get: function (obj) { return obj.event; }, set: function (obj, value) { obj.event = value; } }, metadata: _metadata }, _event_initializers, _event_extraInitializers);
        __esDecorate(null, null, _maxGuestsPerPerson_decorators, { kind: "field", name: "maxGuestsPerPerson", static: false, private: false, access: { has: function (obj) { return "maxGuestsPerPerson" in obj; }, get: function (obj) { return obj.maxGuestsPerPerson; }, set: function (obj, value) { obj.maxGuestsPerPerson = value; } }, metadata: _metadata }, _maxGuestsPerPerson_initializers, _maxGuestsPerPerson_extraInitializers);
        __esDecorate(null, null, _accessCode_decorators, { kind: "field", name: "accessCode", static: false, private: false, access: { has: function (obj) { return "accessCode" in obj; }, get: function (obj) { return obj.accessCode; }, set: function (obj, value) { obj.accessCode = value; } }, metadata: _metadata }, _accessCode_initializers, _accessCode_extraInitializers);
        __esDecorate(null, null, _shareToken_decorators, { kind: "field", name: "shareToken", static: false, private: false, access: { has: function (obj) { return "shareToken" in obj; }, get: function (obj) { return obj.shareToken; }, set: function (obj, value) { obj.shareToken = value; } }, metadata: _metadata }, _shareToken_initializers, _shareToken_extraInitializers);
        __esDecorate(null, null, _arrivalToken_decorators, { kind: "field", name: "arrivalToken", static: false, private: false, access: { has: function (obj) { return "arrivalToken" in obj; }, get: function (obj) { return obj.arrivalToken; }, set: function (obj, value) { obj.arrivalToken = value; } }, metadata: _metadata }, _arrivalToken_initializers, _arrivalToken_extraInitializers);
        __esDecorate(null, null, _isLocked_decorators, { kind: "field", name: "isLocked", static: false, private: false, access: { has: function (obj) { return "isLocked" in obj; }, get: function (obj) { return obj.isLocked; }, set: function (obj, value) { obj.isLocked = value; } }, metadata: _metadata }, _isLocked_initializers, _isLocked_extraInitializers);
        __esDecorate(null, null, _guests_decorators, { kind: "field", name: "guests", static: false, private: false, access: { has: function (obj) { return "guests" in obj; }, get: function (obj) { return obj.guests; }, set: function (obj, value) { obj.guests = value; } }, metadata: _metadata }, _guests_initializers, _guests_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: function (obj) { return "createdAt" in obj; }, get: function (obj) { return obj.createdAt; }, set: function (obj, value) { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, null, _updatedAt_decorators, { kind: "field", name: "updatedAt", static: false, private: false, access: { has: function (obj) { return "updatedAt" in obj; }, get: function (obj) { return obj.updatedAt; }, set: function (obj, value) { obj.updatedAt = value; } }, metadata: _metadata }, _updatedAt_initializers, _updatedAt_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        GuestList = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return GuestList = _classThis;
}();
exports.GuestList = GuestList;
