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
exports.Invoice = exports.InvoiceStatus = void 0;
var typeorm_1 = require("typeorm");
var booking_entity_1 = require("./booking.entity");
var invoice_item_entity_1 = require("./invoice-item.entity");
var InvoiceStatus;
(function (InvoiceStatus) {
    InvoiceStatus["DRAFT"] = "draft";
    InvoiceStatus["SENT"] = "sent";
    InvoiceStatus["PARTIAL"] = "partial";
    InvoiceStatus["PAID"] = "paid";
    InvoiceStatus["OVERDUE"] = "overdue";
    InvoiceStatus["CANCELLED"] = "cancelled";
})(InvoiceStatus || (exports.InvoiceStatus = InvoiceStatus = {}));
var Invoice = function () {
    var _classDecorators = [(0, typeorm_1.Entity)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _id_decorators;
    var _id_initializers = [];
    var _id_extraInitializers = [];
    var _invoiceNumber_decorators;
    var _invoiceNumber_initializers = [];
    var _invoiceNumber_extraInitializers = [];
    var _ownerId_decorators;
    var _ownerId_initializers = [];
    var _ownerId_extraInitializers = [];
    var _bookingId_decorators;
    var _bookingId_initializers = [];
    var _bookingId_extraInitializers = [];
    var _booking_decorators;
    var _booking_initializers = [];
    var _booking_extraInitializers = [];
    var _subtotal_decorators;
    var _subtotal_initializers = [];
    var _subtotal_extraInitializers = [];
    var _taxAmount_decorators;
    var _taxAmount_initializers = [];
    var _taxAmount_extraInitializers = [];
    var _taxRate_decorators;
    var _taxRate_initializers = [];
    var _taxRate_extraInitializers = [];
    var _discountAmount_decorators;
    var _discountAmount_initializers = [];
    var _discountAmount_extraInitializers = [];
    var _totalAmount_decorators;
    var _totalAmount_initializers = [];
    var _totalAmount_extraInitializers = [];
    var _amountPaid_decorators;
    var _amountPaid_initializers = [];
    var _amountPaid_extraInitializers = [];
    var _amountDue_decorators;
    var _amountDue_initializers = [];
    var _amountDue_extraInitializers = [];
    var _status_decorators;
    var _status_initializers = [];
    var _status_extraInitializers = [];
    var _issueDate_decorators;
    var _issueDate_initializers = [];
    var _issueDate_extraInitializers = [];
    var _dueDate_decorators;
    var _dueDate_initializers = [];
    var _dueDate_extraInitializers = [];
    var _paidDate_decorators;
    var _paidDate_initializers = [];
    var _paidDate_extraInitializers = [];
    var _notes_decorators;
    var _notes_initializers = [];
    var _notes_extraInitializers = [];
    var _terms_decorators;
    var _terms_initializers = [];
    var _terms_extraInitializers = [];
    var _items_decorators;
    var _items_initializers = [];
    var _items_extraInitializers = [];
    var _createdAt_decorators;
    var _createdAt_initializers = [];
    var _createdAt_extraInitializers = [];
    var _updatedAt_decorators;
    var _updatedAt_initializers = [];
    var _updatedAt_extraInitializers = [];
    var Invoice = _classThis = /** @class */ (function () {
        function Invoice_1() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.invoiceNumber = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _invoiceNumber_initializers, void 0));
            this.ownerId = (__runInitializers(this, _invoiceNumber_extraInitializers), __runInitializers(this, _ownerId_initializers, void 0)); // The owner who created this invoice
            this.bookingId = (__runInitializers(this, _ownerId_extraInitializers), __runInitializers(this, _bookingId_initializers, void 0));
            this.booking = (__runInitializers(this, _bookingId_extraInitializers), __runInitializers(this, _booking_initializers, void 0));
            this.subtotal = (__runInitializers(this, _booking_extraInitializers), __runInitializers(this, _subtotal_initializers, void 0));
            this.taxAmount = (__runInitializers(this, _subtotal_extraInitializers), __runInitializers(this, _taxAmount_initializers, void 0));
            this.taxRate = (__runInitializers(this, _taxAmount_extraInitializers), __runInitializers(this, _taxRate_initializers, void 0)); // Tax rate as percentage (e.g., 8.5 for 8.5%)
            this.discountAmount = (__runInitializers(this, _taxRate_extraInitializers), __runInitializers(this, _discountAmount_initializers, void 0));
            this.totalAmount = (__runInitializers(this, _discountAmount_extraInitializers), __runInitializers(this, _totalAmount_initializers, void 0));
            this.amountPaid = (__runInitializers(this, _totalAmount_extraInitializers), __runInitializers(this, _amountPaid_initializers, void 0));
            this.amountDue = (__runInitializers(this, _amountPaid_extraInitializers), __runInitializers(this, _amountDue_initializers, void 0));
            this.status = (__runInitializers(this, _amountDue_extraInitializers), __runInitializers(this, _status_initializers, void 0));
            this.issueDate = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _issueDate_initializers, void 0));
            this.dueDate = (__runInitializers(this, _issueDate_extraInitializers), __runInitializers(this, _dueDate_initializers, void 0));
            this.paidDate = (__runInitializers(this, _dueDate_extraInitializers), __runInitializers(this, _paidDate_initializers, void 0));
            this.notes = (__runInitializers(this, _paidDate_extraInitializers), __runInitializers(this, _notes_initializers, void 0));
            this.terms = (__runInitializers(this, _notes_extraInitializers), __runInitializers(this, _terms_initializers, void 0));
            this.items = (__runInitializers(this, _terms_extraInitializers), __runInitializers(this, _items_initializers, void 0));
            this.createdAt = (__runInitializers(this, _items_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            this.updatedAt = (__runInitializers(this, _createdAt_extraInitializers), __runInitializers(this, _updatedAt_initializers, void 0));
            __runInitializers(this, _updatedAt_extraInitializers);
        }
        return Invoice_1;
    }());
    __setFunctionName(_classThis, "Invoice");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)()];
        _invoiceNumber_decorators = [(0, typeorm_1.Column)({ unique: true })];
        _ownerId_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _bookingId_decorators = [(0, typeorm_1.Column)()];
        _booking_decorators = [(0, typeorm_1.ManyToOne)(function () { return booking_entity_1.Booking; }), (0, typeorm_1.JoinColumn)({ name: 'bookingId' })];
        _subtotal_decorators = [(0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 })];
        _taxAmount_decorators = [(0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, default: 0 })];
        _taxRate_decorators = [(0, typeorm_1.Column)('decimal', { precision: 5, scale: 2, default: 0 })];
        _discountAmount_decorators = [(0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, default: 0 })];
        _totalAmount_decorators = [(0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 })];
        _amountPaid_decorators = [(0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, default: 0 })];
        _amountDue_decorators = [(0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 })];
        _status_decorators = [(0, typeorm_1.Column)({
                type: 'enum',
                enum: InvoiceStatus,
                default: InvoiceStatus.DRAFT,
            })];
        _issueDate_decorators = [(0, typeorm_1.Column)({ type: 'date' })];
        _dueDate_decorators = [(0, typeorm_1.Column)({ type: 'date' })];
        _paidDate_decorators = [(0, typeorm_1.Column)({ type: 'date', nullable: true })];
        _notes_decorators = [(0, typeorm_1.Column)({ type: 'text', nullable: true })];
        _terms_decorators = [(0, typeorm_1.Column)({ type: 'text', nullable: true })];
        _items_decorators = [(0, typeorm_1.OneToMany)(function () { return invoice_item_entity_1.InvoiceItem; }, function (invoiceItem) { return invoiceItem.invoice; }, { cascade: true })];
        _createdAt_decorators = [(0, typeorm_1.CreateDateColumn)()];
        _updatedAt_decorators = [(0, typeorm_1.UpdateDateColumn)()];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: function (obj) { return "id" in obj; }, get: function (obj) { return obj.id; }, set: function (obj, value) { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _invoiceNumber_decorators, { kind: "field", name: "invoiceNumber", static: false, private: false, access: { has: function (obj) { return "invoiceNumber" in obj; }, get: function (obj) { return obj.invoiceNumber; }, set: function (obj, value) { obj.invoiceNumber = value; } }, metadata: _metadata }, _invoiceNumber_initializers, _invoiceNumber_extraInitializers);
        __esDecorate(null, null, _ownerId_decorators, { kind: "field", name: "ownerId", static: false, private: false, access: { has: function (obj) { return "ownerId" in obj; }, get: function (obj) { return obj.ownerId; }, set: function (obj, value) { obj.ownerId = value; } }, metadata: _metadata }, _ownerId_initializers, _ownerId_extraInitializers);
        __esDecorate(null, null, _bookingId_decorators, { kind: "field", name: "bookingId", static: false, private: false, access: { has: function (obj) { return "bookingId" in obj; }, get: function (obj) { return obj.bookingId; }, set: function (obj, value) { obj.bookingId = value; } }, metadata: _metadata }, _bookingId_initializers, _bookingId_extraInitializers);
        __esDecorate(null, null, _booking_decorators, { kind: "field", name: "booking", static: false, private: false, access: { has: function (obj) { return "booking" in obj; }, get: function (obj) { return obj.booking; }, set: function (obj, value) { obj.booking = value; } }, metadata: _metadata }, _booking_initializers, _booking_extraInitializers);
        __esDecorate(null, null, _subtotal_decorators, { kind: "field", name: "subtotal", static: false, private: false, access: { has: function (obj) { return "subtotal" in obj; }, get: function (obj) { return obj.subtotal; }, set: function (obj, value) { obj.subtotal = value; } }, metadata: _metadata }, _subtotal_initializers, _subtotal_extraInitializers);
        __esDecorate(null, null, _taxAmount_decorators, { kind: "field", name: "taxAmount", static: false, private: false, access: { has: function (obj) { return "taxAmount" in obj; }, get: function (obj) { return obj.taxAmount; }, set: function (obj, value) { obj.taxAmount = value; } }, metadata: _metadata }, _taxAmount_initializers, _taxAmount_extraInitializers);
        __esDecorate(null, null, _taxRate_decorators, { kind: "field", name: "taxRate", static: false, private: false, access: { has: function (obj) { return "taxRate" in obj; }, get: function (obj) { return obj.taxRate; }, set: function (obj, value) { obj.taxRate = value; } }, metadata: _metadata }, _taxRate_initializers, _taxRate_extraInitializers);
        __esDecorate(null, null, _discountAmount_decorators, { kind: "field", name: "discountAmount", static: false, private: false, access: { has: function (obj) { return "discountAmount" in obj; }, get: function (obj) { return obj.discountAmount; }, set: function (obj, value) { obj.discountAmount = value; } }, metadata: _metadata }, _discountAmount_initializers, _discountAmount_extraInitializers);
        __esDecorate(null, null, _totalAmount_decorators, { kind: "field", name: "totalAmount", static: false, private: false, access: { has: function (obj) { return "totalAmount" in obj; }, get: function (obj) { return obj.totalAmount; }, set: function (obj, value) { obj.totalAmount = value; } }, metadata: _metadata }, _totalAmount_initializers, _totalAmount_extraInitializers);
        __esDecorate(null, null, _amountPaid_decorators, { kind: "field", name: "amountPaid", static: false, private: false, access: { has: function (obj) { return "amountPaid" in obj; }, get: function (obj) { return obj.amountPaid; }, set: function (obj, value) { obj.amountPaid = value; } }, metadata: _metadata }, _amountPaid_initializers, _amountPaid_extraInitializers);
        __esDecorate(null, null, _amountDue_decorators, { kind: "field", name: "amountDue", static: false, private: false, access: { has: function (obj) { return "amountDue" in obj; }, get: function (obj) { return obj.amountDue; }, set: function (obj, value) { obj.amountDue = value; } }, metadata: _metadata }, _amountDue_initializers, _amountDue_extraInitializers);
        __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: function (obj) { return "status" in obj; }, get: function (obj) { return obj.status; }, set: function (obj, value) { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
        __esDecorate(null, null, _issueDate_decorators, { kind: "field", name: "issueDate", static: false, private: false, access: { has: function (obj) { return "issueDate" in obj; }, get: function (obj) { return obj.issueDate; }, set: function (obj, value) { obj.issueDate = value; } }, metadata: _metadata }, _issueDate_initializers, _issueDate_extraInitializers);
        __esDecorate(null, null, _dueDate_decorators, { kind: "field", name: "dueDate", static: false, private: false, access: { has: function (obj) { return "dueDate" in obj; }, get: function (obj) { return obj.dueDate; }, set: function (obj, value) { obj.dueDate = value; } }, metadata: _metadata }, _dueDate_initializers, _dueDate_extraInitializers);
        __esDecorate(null, null, _paidDate_decorators, { kind: "field", name: "paidDate", static: false, private: false, access: { has: function (obj) { return "paidDate" in obj; }, get: function (obj) { return obj.paidDate; }, set: function (obj, value) { obj.paidDate = value; } }, metadata: _metadata }, _paidDate_initializers, _paidDate_extraInitializers);
        __esDecorate(null, null, _notes_decorators, { kind: "field", name: "notes", static: false, private: false, access: { has: function (obj) { return "notes" in obj; }, get: function (obj) { return obj.notes; }, set: function (obj, value) { obj.notes = value; } }, metadata: _metadata }, _notes_initializers, _notes_extraInitializers);
        __esDecorate(null, null, _terms_decorators, { kind: "field", name: "terms", static: false, private: false, access: { has: function (obj) { return "terms" in obj; }, get: function (obj) { return obj.terms; }, set: function (obj, value) { obj.terms = value; } }, metadata: _metadata }, _terms_initializers, _terms_extraInitializers);
        __esDecorate(null, null, _items_decorators, { kind: "field", name: "items", static: false, private: false, access: { has: function (obj) { return "items" in obj; }, get: function (obj) { return obj.items; }, set: function (obj, value) { obj.items = value; } }, metadata: _metadata }, _items_initializers, _items_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: function (obj) { return "createdAt" in obj; }, get: function (obj) { return obj.createdAt; }, set: function (obj, value) { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, null, _updatedAt_decorators, { kind: "field", name: "updatedAt", static: false, private: false, access: { has: function (obj) { return "updatedAt" in obj; }, get: function (obj) { return obj.updatedAt; }, set: function (obj, value) { obj.updatedAt = value; } }, metadata: _metadata }, _updatedAt_initializers, _updatedAt_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Invoice = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Invoice = _classThis;
}();
exports.Invoice = Invoice;
