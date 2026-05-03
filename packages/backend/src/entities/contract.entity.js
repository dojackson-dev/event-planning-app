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
exports.Contract = exports.ContractStatus = void 0;
var typeorm_1 = require("typeorm");
var user_entity_1 = require("./user.entity");
var booking_entity_1 = require("./booking.entity");
var ContractStatus;
(function (ContractStatus) {
    ContractStatus["DRAFT"] = "draft";
    ContractStatus["SENT"] = "sent";
    ContractStatus["SIGNED"] = "signed";
    ContractStatus["CANCELLED"] = "cancelled";
})(ContractStatus || (exports.ContractStatus = ContractStatus = {}));
var Contract = function () {
    var _classDecorators = [(0, typeorm_1.Entity)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _id_decorators;
    var _id_initializers = [];
    var _id_extraInitializers = [];
    var _contractNumber_decorators;
    var _contractNumber_initializers = [];
    var _contractNumber_extraInitializers = [];
    var _ownerId_decorators;
    var _ownerId_initializers = [];
    var _ownerId_extraInitializers = [];
    var _owner_decorators;
    var _owner_initializers = [];
    var _owner_extraInitializers = [];
    var _bookingId_decorators;
    var _bookingId_initializers = [];
    var _bookingId_extraInitializers = [];
    var _booking_decorators;
    var _booking_initializers = [];
    var _booking_extraInitializers = [];
    var _clientId_decorators;
    var _clientId_initializers = [];
    var _clientId_extraInitializers = [];
    var _client_decorators;
    var _client_initializers = [];
    var _client_extraInitializers = [];
    var _title_decorators;
    var _title_initializers = [];
    var _title_extraInitializers = [];
    var _description_decorators;
    var _description_initializers = [];
    var _description_extraInitializers = [];
    var _fileUrl_decorators;
    var _fileUrl_initializers = [];
    var _fileUrl_extraInitializers = [];
    var _fileName_decorators;
    var _fileName_initializers = [];
    var _fileName_extraInitializers = [];
    var _fileSize_decorators;
    var _fileSize_initializers = [];
    var _fileSize_extraInitializers = [];
    var _status_decorators;
    var _status_initializers = [];
    var _status_extraInitializers = [];
    var _sentDate_decorators;
    var _sentDate_initializers = [];
    var _sentDate_extraInitializers = [];
    var _signedDate_decorators;
    var _signedDate_initializers = [];
    var _signedDate_extraInitializers = [];
    var _signatureData_decorators;
    var _signatureData_initializers = [];
    var _signatureData_extraInitializers = [];
    var _signerName_decorators;
    var _signerName_initializers = [];
    var _signerName_extraInitializers = [];
    var _signerIpAddress_decorators;
    var _signerIpAddress_initializers = [];
    var _signerIpAddress_extraInitializers = [];
    var _notes_decorators;
    var _notes_initializers = [];
    var _notes_extraInitializers = [];
    var _createdAt_decorators;
    var _createdAt_initializers = [];
    var _createdAt_extraInitializers = [];
    var _updatedAt_decorators;
    var _updatedAt_initializers = [];
    var _updatedAt_extraInitializers = [];
    var Contract = _classThis = /** @class */ (function () {
        function Contract_1() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.contractNumber = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _contractNumber_initializers, void 0));
            this.ownerId = (__runInitializers(this, _contractNumber_extraInitializers), __runInitializers(this, _ownerId_initializers, void 0)); // Owner who created the contract
            this.owner = (__runInitializers(this, _ownerId_extraInitializers), __runInitializers(this, _owner_initializers, void 0));
            this.bookingId = (__runInitializers(this, _owner_extraInitializers), __runInitializers(this, _bookingId_initializers, void 0));
            this.booking = (__runInitializers(this, _bookingId_extraInitializers), __runInitializers(this, _booking_initializers, void 0));
            this.clientId = (__runInitializers(this, _booking_extraInitializers), __runInitializers(this, _clientId_initializers, void 0)); // Client who needs to sign
            this.client = (__runInitializers(this, _clientId_extraInitializers), __runInitializers(this, _client_initializers, void 0));
            this.title = (__runInitializers(this, _client_extraInitializers), __runInitializers(this, _title_initializers, void 0));
            this.description = (__runInitializers(this, _title_extraInitializers), __runInitializers(this, _description_initializers, void 0));
            this.fileUrl = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _fileUrl_initializers, void 0)); // URL to the uploaded contract file
            this.fileName = (__runInitializers(this, _fileUrl_extraInitializers), __runInitializers(this, _fileName_initializers, void 0));
            this.fileSize = (__runInitializers(this, _fileName_extraInitializers), __runInitializers(this, _fileSize_initializers, void 0)); // in bytes
            this.status = (__runInitializers(this, _fileSize_extraInitializers), __runInitializers(this, _status_initializers, void 0));
            this.sentDate = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _sentDate_initializers, void 0));
            this.signedDate = (__runInitializers(this, _sentDate_extraInitializers), __runInitializers(this, _signedDate_initializers, void 0));
            this.signatureData = (__runInitializers(this, _signedDate_extraInitializers), __runInitializers(this, _signatureData_initializers, void 0)); // Base64 encoded signature image
            this.signerName = (__runInitializers(this, _signatureData_extraInitializers), __runInitializers(this, _signerName_initializers, void 0));
            this.signerIpAddress = (__runInitializers(this, _signerName_extraInitializers), __runInitializers(this, _signerIpAddress_initializers, void 0));
            this.notes = (__runInitializers(this, _signerIpAddress_extraInitializers), __runInitializers(this, _notes_initializers, void 0));
            this.createdAt = (__runInitializers(this, _notes_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            this.updatedAt = (__runInitializers(this, _createdAt_extraInitializers), __runInitializers(this, _updatedAt_initializers, void 0));
            __runInitializers(this, _updatedAt_extraInitializers);
        }
        return Contract_1;
    }());
    __setFunctionName(_classThis, "Contract");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)()];
        _contractNumber_decorators = [(0, typeorm_1.Column)({ unique: true })];
        _ownerId_decorators = [(0, typeorm_1.Column)()];
        _owner_decorators = [(0, typeorm_1.ManyToOne)(function () { return user_entity_1.User; }), (0, typeorm_1.JoinColumn)({ name: 'ownerId' })];
        _bookingId_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _booking_decorators = [(0, typeorm_1.ManyToOne)(function () { return booking_entity_1.Booking; }, { nullable: true }), (0, typeorm_1.JoinColumn)({ name: 'bookingId' })];
        _clientId_decorators = [(0, typeorm_1.Column)()];
        _client_decorators = [(0, typeorm_1.ManyToOne)(function () { return user_entity_1.User; }), (0, typeorm_1.JoinColumn)({ name: 'clientId' })];
        _title_decorators = [(0, typeorm_1.Column)()];
        _description_decorators = [(0, typeorm_1.Column)('text', { nullable: true })];
        _fileUrl_decorators = [(0, typeorm_1.Column)()];
        _fileName_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _fileSize_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _status_decorators = [(0, typeorm_1.Column)({
                type: 'enum',
                enum: ContractStatus,
                default: ContractStatus.DRAFT,
            })];
        _sentDate_decorators = [(0, typeorm_1.Column)({ type: 'timestamp', nullable: true })];
        _signedDate_decorators = [(0, typeorm_1.Column)({ type: 'timestamp', nullable: true })];
        _signatureData_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _signerName_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _signerIpAddress_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _notes_decorators = [(0, typeorm_1.Column)('text', { nullable: true })];
        _createdAt_decorators = [(0, typeorm_1.CreateDateColumn)()];
        _updatedAt_decorators = [(0, typeorm_1.UpdateDateColumn)()];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: function (obj) { return "id" in obj; }, get: function (obj) { return obj.id; }, set: function (obj, value) { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _contractNumber_decorators, { kind: "field", name: "contractNumber", static: false, private: false, access: { has: function (obj) { return "contractNumber" in obj; }, get: function (obj) { return obj.contractNumber; }, set: function (obj, value) { obj.contractNumber = value; } }, metadata: _metadata }, _contractNumber_initializers, _contractNumber_extraInitializers);
        __esDecorate(null, null, _ownerId_decorators, { kind: "field", name: "ownerId", static: false, private: false, access: { has: function (obj) { return "ownerId" in obj; }, get: function (obj) { return obj.ownerId; }, set: function (obj, value) { obj.ownerId = value; } }, metadata: _metadata }, _ownerId_initializers, _ownerId_extraInitializers);
        __esDecorate(null, null, _owner_decorators, { kind: "field", name: "owner", static: false, private: false, access: { has: function (obj) { return "owner" in obj; }, get: function (obj) { return obj.owner; }, set: function (obj, value) { obj.owner = value; } }, metadata: _metadata }, _owner_initializers, _owner_extraInitializers);
        __esDecorate(null, null, _bookingId_decorators, { kind: "field", name: "bookingId", static: false, private: false, access: { has: function (obj) { return "bookingId" in obj; }, get: function (obj) { return obj.bookingId; }, set: function (obj, value) { obj.bookingId = value; } }, metadata: _metadata }, _bookingId_initializers, _bookingId_extraInitializers);
        __esDecorate(null, null, _booking_decorators, { kind: "field", name: "booking", static: false, private: false, access: { has: function (obj) { return "booking" in obj; }, get: function (obj) { return obj.booking; }, set: function (obj, value) { obj.booking = value; } }, metadata: _metadata }, _booking_initializers, _booking_extraInitializers);
        __esDecorate(null, null, _clientId_decorators, { kind: "field", name: "clientId", static: false, private: false, access: { has: function (obj) { return "clientId" in obj; }, get: function (obj) { return obj.clientId; }, set: function (obj, value) { obj.clientId = value; } }, metadata: _metadata }, _clientId_initializers, _clientId_extraInitializers);
        __esDecorate(null, null, _client_decorators, { kind: "field", name: "client", static: false, private: false, access: { has: function (obj) { return "client" in obj; }, get: function (obj) { return obj.client; }, set: function (obj, value) { obj.client = value; } }, metadata: _metadata }, _client_initializers, _client_extraInitializers);
        __esDecorate(null, null, _title_decorators, { kind: "field", name: "title", static: false, private: false, access: { has: function (obj) { return "title" in obj; }, get: function (obj) { return obj.title; }, set: function (obj, value) { obj.title = value; } }, metadata: _metadata }, _title_initializers, _title_extraInitializers);
        __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: function (obj) { return "description" in obj; }, get: function (obj) { return obj.description; }, set: function (obj, value) { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
        __esDecorate(null, null, _fileUrl_decorators, { kind: "field", name: "fileUrl", static: false, private: false, access: { has: function (obj) { return "fileUrl" in obj; }, get: function (obj) { return obj.fileUrl; }, set: function (obj, value) { obj.fileUrl = value; } }, metadata: _metadata }, _fileUrl_initializers, _fileUrl_extraInitializers);
        __esDecorate(null, null, _fileName_decorators, { kind: "field", name: "fileName", static: false, private: false, access: { has: function (obj) { return "fileName" in obj; }, get: function (obj) { return obj.fileName; }, set: function (obj, value) { obj.fileName = value; } }, metadata: _metadata }, _fileName_initializers, _fileName_extraInitializers);
        __esDecorate(null, null, _fileSize_decorators, { kind: "field", name: "fileSize", static: false, private: false, access: { has: function (obj) { return "fileSize" in obj; }, get: function (obj) { return obj.fileSize; }, set: function (obj, value) { obj.fileSize = value; } }, metadata: _metadata }, _fileSize_initializers, _fileSize_extraInitializers);
        __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: function (obj) { return "status" in obj; }, get: function (obj) { return obj.status; }, set: function (obj, value) { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
        __esDecorate(null, null, _sentDate_decorators, { kind: "field", name: "sentDate", static: false, private: false, access: { has: function (obj) { return "sentDate" in obj; }, get: function (obj) { return obj.sentDate; }, set: function (obj, value) { obj.sentDate = value; } }, metadata: _metadata }, _sentDate_initializers, _sentDate_extraInitializers);
        __esDecorate(null, null, _signedDate_decorators, { kind: "field", name: "signedDate", static: false, private: false, access: { has: function (obj) { return "signedDate" in obj; }, get: function (obj) { return obj.signedDate; }, set: function (obj, value) { obj.signedDate = value; } }, metadata: _metadata }, _signedDate_initializers, _signedDate_extraInitializers);
        __esDecorate(null, null, _signatureData_decorators, { kind: "field", name: "signatureData", static: false, private: false, access: { has: function (obj) { return "signatureData" in obj; }, get: function (obj) { return obj.signatureData; }, set: function (obj, value) { obj.signatureData = value; } }, metadata: _metadata }, _signatureData_initializers, _signatureData_extraInitializers);
        __esDecorate(null, null, _signerName_decorators, { kind: "field", name: "signerName", static: false, private: false, access: { has: function (obj) { return "signerName" in obj; }, get: function (obj) { return obj.signerName; }, set: function (obj, value) { obj.signerName = value; } }, metadata: _metadata }, _signerName_initializers, _signerName_extraInitializers);
        __esDecorate(null, null, _signerIpAddress_decorators, { kind: "field", name: "signerIpAddress", static: false, private: false, access: { has: function (obj) { return "signerIpAddress" in obj; }, get: function (obj) { return obj.signerIpAddress; }, set: function (obj, value) { obj.signerIpAddress = value; } }, metadata: _metadata }, _signerIpAddress_initializers, _signerIpAddress_extraInitializers);
        __esDecorate(null, null, _notes_decorators, { kind: "field", name: "notes", static: false, private: false, access: { has: function (obj) { return "notes" in obj; }, get: function (obj) { return obj.notes; }, set: function (obj, value) { obj.notes = value; } }, metadata: _metadata }, _notes_initializers, _notes_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: function (obj) { return "createdAt" in obj; }, get: function (obj) { return obj.createdAt; }, set: function (obj, value) { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, null, _updatedAt_decorators, { kind: "field", name: "updatedAt", static: false, private: false, access: { has: function (obj) { return "updatedAt" in obj; }, get: function (obj) { return obj.updatedAt; }, set: function (obj, value) { obj.updatedAt = value; } }, metadata: _metadata }, _updatedAt_initializers, _updatedAt_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Contract = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Contract = _classThis;
}();
exports.Contract = Contract;
