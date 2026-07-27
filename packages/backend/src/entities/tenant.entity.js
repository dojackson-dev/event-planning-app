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
exports.Tenant = void 0;
var typeorm_1 = require("typeorm");
var Tenant = function () {
    var _classDecorators = [(0, typeorm_1.Entity)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _id_decorators;
    var _id_initializers = [];
    var _id_extraInitializers = [];
    var _name_decorators;
    var _name_initializers = [];
    var _name_extraInitializers = [];
    var _subdomain_decorators;
    var _subdomain_initializers = [];
    var _subdomain_extraInitializers = [];
    var _ownerId_decorators;
    var _ownerId_initializers = [];
    var _ownerId_extraInitializers = [];
    var _customDomain_decorators;
    var _customDomain_initializers = [];
    var _customDomain_extraInitializers = [];
    var _subscriptionStatus_decorators;
    var _subscriptionStatus_initializers = [];
    var _subscriptionStatus_extraInitializers = [];
    var _websiteSettings_decorators;
    var _websiteSettings_initializers = [];
    var _websiteSettings_extraInitializers = [];
    var _createdAt_decorators;
    var _createdAt_initializers = [];
    var _createdAt_extraInitializers = [];
    var _updatedAt_decorators;
    var _updatedAt_initializers = [];
    var _updatedAt_extraInitializers = [];
    var Tenant = _classThis = /** @class */ (function () {
        function Tenant_1() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.name = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _name_initializers, void 0)); // Business/Venue name
            this.subdomain = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _subdomain_initializers, void 0)); // Subdomain for hosted website (e.g., 'myvenue' -> myvenue.yourplatform.com)
            this.ownerId = (__runInitializers(this, _subdomain_extraInitializers), __runInitializers(this, _ownerId_initializers, void 0)); // Reference to the owner user
            this.customDomain = (__runInitializers(this, _ownerId_extraInitializers), __runInitializers(this, _customDomain_initializers, void 0)); // Optional custom domain (e.g., www.myvenue.com)
            this.subscriptionStatus = (__runInitializers(this, _customDomain_extraInitializers), __runInitializers(this, _subscriptionStatus_initializers, void 0)); // active, suspended, cancelled, trial
            this.websiteSettings = (__runInitializers(this, _subscriptionStatus_extraInitializers), __runInitializers(this, _websiteSettings_initializers, void 0)); // JSON string of website customization settings
            this.createdAt = (__runInitializers(this, _websiteSettings_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            this.updatedAt = (__runInitializers(this, _createdAt_extraInitializers), __runInitializers(this, _updatedAt_initializers, void 0));
            __runInitializers(this, _updatedAt_extraInitializers);
        }
        return Tenant_1;
    }());
    __setFunctionName(_classThis, "Tenant");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)()];
        _name_decorators = [(0, typeorm_1.Column)()];
        _subdomain_decorators = [(0, typeorm_1.Column)({ unique: true })];
        _ownerId_decorators = [(0, typeorm_1.Column)()];
        _customDomain_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _subscriptionStatus_decorators = [(0, typeorm_1.Column)({ default: 'active' })];
        _websiteSettings_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _createdAt_decorators = [(0, typeorm_1.CreateDateColumn)()];
        _updatedAt_decorators = [(0, typeorm_1.UpdateDateColumn)()];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: function (obj) { return "id" in obj; }, get: function (obj) { return obj.id; }, set: function (obj, value) { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: function (obj) { return "name" in obj; }, get: function (obj) { return obj.name; }, set: function (obj, value) { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
        __esDecorate(null, null, _subdomain_decorators, { kind: "field", name: "subdomain", static: false, private: false, access: { has: function (obj) { return "subdomain" in obj; }, get: function (obj) { return obj.subdomain; }, set: function (obj, value) { obj.subdomain = value; } }, metadata: _metadata }, _subdomain_initializers, _subdomain_extraInitializers);
        __esDecorate(null, null, _ownerId_decorators, { kind: "field", name: "ownerId", static: false, private: false, access: { has: function (obj) { return "ownerId" in obj; }, get: function (obj) { return obj.ownerId; }, set: function (obj, value) { obj.ownerId = value; } }, metadata: _metadata }, _ownerId_initializers, _ownerId_extraInitializers);
        __esDecorate(null, null, _customDomain_decorators, { kind: "field", name: "customDomain", static: false, private: false, access: { has: function (obj) { return "customDomain" in obj; }, get: function (obj) { return obj.customDomain; }, set: function (obj, value) { obj.customDomain = value; } }, metadata: _metadata }, _customDomain_initializers, _customDomain_extraInitializers);
        __esDecorate(null, null, _subscriptionStatus_decorators, { kind: "field", name: "subscriptionStatus", static: false, private: false, access: { has: function (obj) { return "subscriptionStatus" in obj; }, get: function (obj) { return obj.subscriptionStatus; }, set: function (obj, value) { obj.subscriptionStatus = value; } }, metadata: _metadata }, _subscriptionStatus_initializers, _subscriptionStatus_extraInitializers);
        __esDecorate(null, null, _websiteSettings_decorators, { kind: "field", name: "websiteSettings", static: false, private: false, access: { has: function (obj) { return "websiteSettings" in obj; }, get: function (obj) { return obj.websiteSettings; }, set: function (obj, value) { obj.websiteSettings = value; } }, metadata: _metadata }, _websiteSettings_initializers, _websiteSettings_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: function (obj) { return "createdAt" in obj; }, get: function (obj) { return obj.createdAt; }, set: function (obj, value) { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, null, _updatedAt_decorators, { kind: "field", name: "updatedAt", static: false, private: false, access: { has: function (obj) { return "updatedAt" in obj; }, get: function (obj) { return obj.updatedAt; }, set: function (obj, value) { obj.updatedAt = value; } }, metadata: _metadata }, _updatedAt_initializers, _updatedAt_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Tenant = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Tenant = _classThis;
}();
exports.Tenant = Tenant;
