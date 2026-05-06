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
exports.Guest = void 0;
var typeorm_1 = require("typeorm");
var guest_list_entity_1 = require("./guest-list.entity");
var Guest = function () {
    var _classDecorators = [(0, typeorm_1.Entity)('guests')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _id_decorators;
    var _id_initializers = [];
    var _id_extraInitializers = [];
    var _guestListId_decorators;
    var _guestListId_initializers = [];
    var _guestListId_extraInitializers = [];
    var _guestList_decorators;
    var _guestList_initializers = [];
    var _guestList_extraInitializers = [];
    var _name_decorators;
    var _name_initializers = [];
    var _name_extraInitializers = [];
    var _phone_decorators;
    var _phone_initializers = [];
    var _phone_extraInitializers = [];
    var _plusOneCount_decorators;
    var _plusOneCount_initializers = [];
    var _plusOneCount_extraInitializers = [];
    var _hasArrived_decorators;
    var _hasArrived_initializers = [];
    var _hasArrived_extraInitializers = [];
    var _arrivedAt_decorators;
    var _arrivedAt_initializers = [];
    var _arrivedAt_extraInitializers = [];
    var _createdAt_decorators;
    var _createdAt_initializers = [];
    var _createdAt_extraInitializers = [];
    var _updatedAt_decorators;
    var _updatedAt_initializers = [];
    var _updatedAt_extraInitializers = [];
    var Guest = _classThis = /** @class */ (function () {
        function Guest_1() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.guestListId = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _guestListId_initializers, void 0));
            this.guestList = (__runInitializers(this, _guestListId_extraInitializers), __runInitializers(this, _guestList_initializers, void 0));
            this.name = (__runInitializers(this, _guestList_extraInitializers), __runInitializers(this, _name_initializers, void 0));
            this.phone = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _phone_initializers, void 0));
            this.plusOneCount = (__runInitializers(this, _phone_extraInitializers), __runInitializers(this, _plusOneCount_initializers, void 0));
            this.hasArrived = (__runInitializers(this, _plusOneCount_extraInitializers), __runInitializers(this, _hasArrived_initializers, void 0));
            this.arrivedAt = (__runInitializers(this, _hasArrived_extraInitializers), __runInitializers(this, _arrivedAt_initializers, void 0));
            this.createdAt = (__runInitializers(this, _arrivedAt_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            this.updatedAt = (__runInitializers(this, _createdAt_extraInitializers), __runInitializers(this, _updatedAt_initializers, void 0));
            __runInitializers(this, _updatedAt_extraInitializers);
        }
        return Guest_1;
    }());
    __setFunctionName(_classThis, "Guest");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)()];
        _guestListId_decorators = [(0, typeorm_1.Column)({ name: 'guest_list_id' })];
        _guestList_decorators = [(0, typeorm_1.ManyToOne)(function () { return guest_list_entity_1.GuestList; }, function (guestList) { return guestList.guests; }), (0, typeorm_1.JoinColumn)({ name: 'guest_list_id' })];
        _name_decorators = [(0, typeorm_1.Column)()];
        _phone_decorators = [(0, typeorm_1.Column)()];
        _plusOneCount_decorators = [(0, typeorm_1.Column)({ name: 'plus_one_count', default: 0 })];
        _hasArrived_decorators = [(0, typeorm_1.Column)({ name: 'has_arrived', default: false })];
        _arrivedAt_decorators = [(0, typeorm_1.Column)({ name: 'arrived_at', type: 'timestamp', nullable: true })];
        _createdAt_decorators = [(0, typeorm_1.CreateDateColumn)({ name: 'created_at' })];
        _updatedAt_decorators = [(0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: function (obj) { return "id" in obj; }, get: function (obj) { return obj.id; }, set: function (obj, value) { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _guestListId_decorators, { kind: "field", name: "guestListId", static: false, private: false, access: { has: function (obj) { return "guestListId" in obj; }, get: function (obj) { return obj.guestListId; }, set: function (obj, value) { obj.guestListId = value; } }, metadata: _metadata }, _guestListId_initializers, _guestListId_extraInitializers);
        __esDecorate(null, null, _guestList_decorators, { kind: "field", name: "guestList", static: false, private: false, access: { has: function (obj) { return "guestList" in obj; }, get: function (obj) { return obj.guestList; }, set: function (obj, value) { obj.guestList = value; } }, metadata: _metadata }, _guestList_initializers, _guestList_extraInitializers);
        __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: function (obj) { return "name" in obj; }, get: function (obj) { return obj.name; }, set: function (obj, value) { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
        __esDecorate(null, null, _phone_decorators, { kind: "field", name: "phone", static: false, private: false, access: { has: function (obj) { return "phone" in obj; }, get: function (obj) { return obj.phone; }, set: function (obj, value) { obj.phone = value; } }, metadata: _metadata }, _phone_initializers, _phone_extraInitializers);
        __esDecorate(null, null, _plusOneCount_decorators, { kind: "field", name: "plusOneCount", static: false, private: false, access: { has: function (obj) { return "plusOneCount" in obj; }, get: function (obj) { return obj.plusOneCount; }, set: function (obj, value) { obj.plusOneCount = value; } }, metadata: _metadata }, _plusOneCount_initializers, _plusOneCount_extraInitializers);
        __esDecorate(null, null, _hasArrived_decorators, { kind: "field", name: "hasArrived", static: false, private: false, access: { has: function (obj) { return "hasArrived" in obj; }, get: function (obj) { return obj.hasArrived; }, set: function (obj, value) { obj.hasArrived = value; } }, metadata: _metadata }, _hasArrived_initializers, _hasArrived_extraInitializers);
        __esDecorate(null, null, _arrivedAt_decorators, { kind: "field", name: "arrivedAt", static: false, private: false, access: { has: function (obj) { return "arrivedAt" in obj; }, get: function (obj) { return obj.arrivedAt; }, set: function (obj, value) { obj.arrivedAt = value; } }, metadata: _metadata }, _arrivedAt_initializers, _arrivedAt_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: function (obj) { return "createdAt" in obj; }, get: function (obj) { return obj.createdAt; }, set: function (obj, value) { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, null, _updatedAt_decorators, { kind: "field", name: "updatedAt", static: false, private: false, access: { has: function (obj) { return "updatedAt" in obj; }, get: function (obj) { return obj.updatedAt; }, set: function (obj, value) { obj.updatedAt = value; } }, metadata: _metadata }, _updatedAt_initializers, _updatedAt_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Guest = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Guest = _classThis;
}();
exports.Guest = Guest;
