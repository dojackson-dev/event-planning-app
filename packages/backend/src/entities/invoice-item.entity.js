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
exports.InvoiceItem = exports.DiscountType = void 0;
var typeorm_1 = require("typeorm");
var invoice_entity_1 = require("./invoice.entity");
var DiscountType;
(function (DiscountType) {
    DiscountType["NONE"] = "none";
    DiscountType["PERCENTAGE"] = "percentage";
    DiscountType["FIXED"] = "fixed";
})(DiscountType || (exports.DiscountType = DiscountType = {}));
var InvoiceItem = function () {
    var _classDecorators = [(0, typeorm_1.Entity)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _id_decorators;
    var _id_initializers = [];
    var _id_extraInitializers = [];
    var _invoiceId_decorators;
    var _invoiceId_initializers = [];
    var _invoiceId_extraInitializers = [];
    var _invoice_decorators;
    var _invoice_initializers = [];
    var _invoice_extraInitializers = [];
    var _description_decorators;
    var _description_initializers = [];
    var _description_extraInitializers = [];
    var _quantity_decorators;
    var _quantity_initializers = [];
    var _quantity_extraInitializers = [];
    var _standardPrice_decorators;
    var _standardPrice_initializers = [];
    var _standardPrice_extraInitializers = [];
    var _unitPrice_decorators;
    var _unitPrice_initializers = [];
    var _unitPrice_extraInitializers = [];
    var _subtotal_decorators;
    var _subtotal_initializers = [];
    var _subtotal_extraInitializers = [];
    var _discountType_decorators;
    var _discountType_initializers = [];
    var _discountType_extraInitializers = [];
    var _discountValue_decorators;
    var _discountValue_initializers = [];
    var _discountValue_extraInitializers = [];
    var _discountAmount_decorators;
    var _discountAmount_initializers = [];
    var _discountAmount_extraInitializers = [];
    var _amount_decorators;
    var _amount_initializers = [];
    var _amount_extraInitializers = [];
    var _sortOrder_decorators;
    var _sortOrder_initializers = [];
    var _sortOrder_extraInitializers = [];
    var InvoiceItem = _classThis = /** @class */ (function () {
        function InvoiceItem_1() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.invoiceId = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _invoiceId_initializers, void 0));
            this.invoice = (__runInitializers(this, _invoiceId_extraInitializers), __runInitializers(this, _invoice_initializers, void 0));
            this.description = (__runInitializers(this, _invoice_extraInitializers), __runInitializers(this, _description_initializers, void 0));
            this.quantity = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _quantity_initializers, void 0));
            this.standardPrice = (__runInitializers(this, _quantity_extraInitializers), __runInitializers(this, _standardPrice_initializers, void 0)); // Original/standard price
            this.unitPrice = (__runInitializers(this, _standardPrice_extraInitializers), __runInitializers(this, _unitPrice_initializers, void 0)); // Actual price being charged (after adjustments)
            this.subtotal = (__runInitializers(this, _unitPrice_extraInitializers), __runInitializers(this, _subtotal_initializers, void 0)); // quantity * unitPrice (before item discount)
            this.discountType = (__runInitializers(this, _subtotal_extraInitializers), __runInitializers(this, _discountType_initializers, void 0));
            this.discountValue = (__runInitializers(this, _discountType_extraInitializers), __runInitializers(this, _discountValue_initializers, void 0)); // Percentage (e.g., 10 for 10%) or fixed amount
            this.discountAmount = (__runInitializers(this, _discountValue_extraInitializers), __runInitializers(this, _discountAmount_initializers, void 0)); // Calculated discount amount
            this.amount = (__runInitializers(this, _discountAmount_extraInitializers), __runInitializers(this, _amount_initializers, void 0)); // Final amount: subtotal - discountAmount
            this.sortOrder = (__runInitializers(this, _amount_extraInitializers), __runInitializers(this, _sortOrder_initializers, void 0));
            __runInitializers(this, _sortOrder_extraInitializers);
        }
        return InvoiceItem_1;
    }());
    __setFunctionName(_classThis, "InvoiceItem");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)()];
        _invoiceId_decorators = [(0, typeorm_1.Column)()];
        _invoice_decorators = [(0, typeorm_1.ManyToOne)(function () { return invoice_entity_1.Invoice; }, function (invoice) { return invoice.items; }), (0, typeorm_1.JoinColumn)({ name: 'invoiceId' })];
        _description_decorators = [(0, typeorm_1.Column)()];
        _quantity_decorators = [(0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 })];
        _standardPrice_decorators = [(0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 })];
        _unitPrice_decorators = [(0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 })];
        _subtotal_decorators = [(0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 })];
        _discountType_decorators = [(0, typeorm_1.Column)({
                type: 'enum',
                enum: DiscountType,
                default: DiscountType.NONE,
            })];
        _discountValue_decorators = [(0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, default: 0 })];
        _discountAmount_decorators = [(0, typeorm_1.Column)('decimal', { precision: 10, scale: 2, default: 0 })];
        _amount_decorators = [(0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 })];
        _sortOrder_decorators = [(0, typeorm_1.Column)({ default: 0 })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: function (obj) { return "id" in obj; }, get: function (obj) { return obj.id; }, set: function (obj, value) { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _invoiceId_decorators, { kind: "field", name: "invoiceId", static: false, private: false, access: { has: function (obj) { return "invoiceId" in obj; }, get: function (obj) { return obj.invoiceId; }, set: function (obj, value) { obj.invoiceId = value; } }, metadata: _metadata }, _invoiceId_initializers, _invoiceId_extraInitializers);
        __esDecorate(null, null, _invoice_decorators, { kind: "field", name: "invoice", static: false, private: false, access: { has: function (obj) { return "invoice" in obj; }, get: function (obj) { return obj.invoice; }, set: function (obj, value) { obj.invoice = value; } }, metadata: _metadata }, _invoice_initializers, _invoice_extraInitializers);
        __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: function (obj) { return "description" in obj; }, get: function (obj) { return obj.description; }, set: function (obj, value) { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
        __esDecorate(null, null, _quantity_decorators, { kind: "field", name: "quantity", static: false, private: false, access: { has: function (obj) { return "quantity" in obj; }, get: function (obj) { return obj.quantity; }, set: function (obj, value) { obj.quantity = value; } }, metadata: _metadata }, _quantity_initializers, _quantity_extraInitializers);
        __esDecorate(null, null, _standardPrice_decorators, { kind: "field", name: "standardPrice", static: false, private: false, access: { has: function (obj) { return "standardPrice" in obj; }, get: function (obj) { return obj.standardPrice; }, set: function (obj, value) { obj.standardPrice = value; } }, metadata: _metadata }, _standardPrice_initializers, _standardPrice_extraInitializers);
        __esDecorate(null, null, _unitPrice_decorators, { kind: "field", name: "unitPrice", static: false, private: false, access: { has: function (obj) { return "unitPrice" in obj; }, get: function (obj) { return obj.unitPrice; }, set: function (obj, value) { obj.unitPrice = value; } }, metadata: _metadata }, _unitPrice_initializers, _unitPrice_extraInitializers);
        __esDecorate(null, null, _subtotal_decorators, { kind: "field", name: "subtotal", static: false, private: false, access: { has: function (obj) { return "subtotal" in obj; }, get: function (obj) { return obj.subtotal; }, set: function (obj, value) { obj.subtotal = value; } }, metadata: _metadata }, _subtotal_initializers, _subtotal_extraInitializers);
        __esDecorate(null, null, _discountType_decorators, { kind: "field", name: "discountType", static: false, private: false, access: { has: function (obj) { return "discountType" in obj; }, get: function (obj) { return obj.discountType; }, set: function (obj, value) { obj.discountType = value; } }, metadata: _metadata }, _discountType_initializers, _discountType_extraInitializers);
        __esDecorate(null, null, _discountValue_decorators, { kind: "field", name: "discountValue", static: false, private: false, access: { has: function (obj) { return "discountValue" in obj; }, get: function (obj) { return obj.discountValue; }, set: function (obj, value) { obj.discountValue = value; } }, metadata: _metadata }, _discountValue_initializers, _discountValue_extraInitializers);
        __esDecorate(null, null, _discountAmount_decorators, { kind: "field", name: "discountAmount", static: false, private: false, access: { has: function (obj) { return "discountAmount" in obj; }, get: function (obj) { return obj.discountAmount; }, set: function (obj, value) { obj.discountAmount = value; } }, metadata: _metadata }, _discountAmount_initializers, _discountAmount_extraInitializers);
        __esDecorate(null, null, _amount_decorators, { kind: "field", name: "amount", static: false, private: false, access: { has: function (obj) { return "amount" in obj; }, get: function (obj) { return obj.amount; }, set: function (obj, value) { obj.amount = value; } }, metadata: _metadata }, _amount_initializers, _amount_extraInitializers);
        __esDecorate(null, null, _sortOrder_decorators, { kind: "field", name: "sortOrder", static: false, private: false, access: { has: function (obj) { return "sortOrder" in obj; }, get: function (obj) { return obj.sortOrder; }, set: function (obj, value) { obj.sortOrder = value; } }, metadata: _metadata }, _sortOrder_initializers, _sortOrder_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        InvoiceItem = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return InvoiceItem = _classThis;
}();
exports.InvoiceItem = InvoiceItem;
