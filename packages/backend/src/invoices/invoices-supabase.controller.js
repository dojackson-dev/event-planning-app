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
exports.InvoicesSupabaseController = void 0;
var common_1 = require("@nestjs/common");
var InvoicesSupabaseController = function () {
    var _classDecorators = [(0, common_1.Controller)('invoices')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _findAll_decorators;
    var _findOne_decorators;
    var _findInvoiceItems_decorators;
    var _create_decorators;
    var _createQuoteFromIntakeForm_decorators;
    var _addItems_decorators;
    var _addItemFromServiceItem_decorators;
    var _update_decorators;
    var _updateStatus_decorators;
    var _updateInvoiceItem_decorators;
    var _recordPayment_decorators;
    var _delete_decorators;
    var _deleteInvoiceItem_decorators;
    var InvoicesSupabaseController = _classThis = /** @class */ (function () {
        function InvoicesSupabaseController_1(invoicesService, supabaseService) {
            this.invoicesService = (__runInitializers(this, _instanceExtraInitializers), invoicesService);
            this.supabaseService = supabaseService;
        }
        InvoicesSupabaseController_1.prototype.extractToken = function (authorization) {
            if (!authorization) {
                throw new common_1.UnauthorizedException('No authorization header');
            }
            return authorization.replace('Bearer ', '');
        };
        InvoicesSupabaseController_1.prototype.getUserId = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var token, userId, supabaseWithAuth, _a, user, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            token = this.extractToken(authorization);
                            // Handle dev tokens (local-<uuid> format)
                            if (token.startsWith('local-')) {
                                userId = token.replace('local-', '');
                                if (userId)
                                    return [2 /*return*/, userId];
                                throw new common_1.UnauthorizedException('Invalid dev token format');
                            }
                            supabaseWithAuth = this.supabaseService.setAuthContext(token);
                            return [4 /*yield*/, supabaseWithAuth.auth.getUser()];
                        case 1:
                            _a = _b.sent(), user = _a.data.user, error = _a.error;
                            if (error || !user) {
                                throw new common_1.UnauthorizedException('Invalid token');
                            }
                            return [2 /*return*/, user.id];
                    }
                });
            });
        };
        InvoicesSupabaseController_1.prototype.findAll = function (authorization, ownerId, intakeFormId) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, supabaseAdmin;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            supabaseAdmin = this.supabaseService.getAdminClient();
                            if (ownerId) {
                                // Always filter by the authenticated userId for security, ignore passed ownerId
                                return [2 /*return*/, this.invoicesService.findByOwner(supabaseAdmin, userId, userId)];
                            }
                            if (intakeFormId) {
                                return [2 /*return*/, this.invoicesService.findByIntakeForm(supabaseAdmin, userId, intakeFormId)];
                            }
                            return [2 /*return*/, this.invoicesService.findAll(supabaseAdmin, userId)];
                    }
                });
            });
        };
        InvoicesSupabaseController_1.prototype.findOne = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, supabaseAdmin;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            supabaseAdmin = this.supabaseService.getAdminClient();
                            return [2 /*return*/, this.invoicesService.findOne(supabaseAdmin, userId, id)];
                    }
                });
            });
        };
        InvoicesSupabaseController_1.prototype.findInvoiceItems = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, supabaseAdmin;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            supabaseAdmin = this.supabaseService.getAdminClient();
                            return [2 /*return*/, this.invoicesService.findInvoiceItems(supabaseAdmin, userId, id)];
                    }
                });
            });
        };
        InvoicesSupabaseController_1.prototype.create = function (authorization, body) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, supabaseAdmin;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            supabaseAdmin = this.supabaseService.getAdminClient();
                            return [2 /*return*/, this.invoicesService.create(supabaseAdmin, userId, body.invoice, body.items)];
                    }
                });
            });
        };
        InvoicesSupabaseController_1.prototype.createQuoteFromIntakeForm = function (authorization, intakeFormId) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, token, supabaseWithAuth;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            token = this.extractToken(authorization);
                            supabaseWithAuth = this.supabaseService.setAuthContext(token);
                            return [2 /*return*/, this.invoicesService.createQuoteFromIntakeForm(supabaseWithAuth, userId, intakeFormId)];
                    }
                });
            });
        };
        InvoicesSupabaseController_1.prototype.addItems = function (authorization, id, items) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, token, supabaseWithAuth;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            token = this.extractToken(authorization);
                            supabaseWithAuth = this.supabaseService.setAuthContext(token);
                            return [2 /*return*/, this.invoicesService.createInvoiceItems(supabaseWithAuth, userId, id, items)];
                    }
                });
            });
        };
        InvoicesSupabaseController_1.prototype.addItemFromServiceItem = function (authorization, id, serviceItemId, quantity) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, token, supabaseWithAuth;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            token = this.extractToken(authorization);
                            supabaseWithAuth = this.supabaseService.setAuthContext(token);
                            return [2 /*return*/, this.invoicesService.addItemFromServiceItem(supabaseWithAuth, userId, id, serviceItemId, quantity || 1)];
                    }
                });
            });
        };
        InvoicesSupabaseController_1.prototype.update = function (authorization, id, invoice) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, token, supabaseWithAuth;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            token = this.extractToken(authorization);
                            supabaseWithAuth = this.supabaseService.setAuthContext(token);
                            return [2 /*return*/, this.invoicesService.update(supabaseWithAuth, userId, id, invoice)];
                    }
                });
            });
        };
        InvoicesSupabaseController_1.prototype.updateStatus = function (authorization, id, status) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, token, supabaseWithAuth;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            token = this.extractToken(authorization);
                            supabaseWithAuth = this.supabaseService.setAuthContext(token);
                            return [2 /*return*/, this.invoicesService.updateStatus(supabaseWithAuth, userId, id, status)];
                    }
                });
            });
        };
        InvoicesSupabaseController_1.prototype.updateInvoiceItem = function (authorization, itemId, item) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, token, supabaseWithAuth;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            token = this.extractToken(authorization);
                            supabaseWithAuth = this.supabaseService.setAuthContext(token);
                            return [2 /*return*/, this.invoicesService.updateInvoiceItem(supabaseWithAuth, userId, itemId, item)];
                    }
                });
            });
        };
        InvoicesSupabaseController_1.prototype.recordPayment = function (authorization, id, amount) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, token, supabaseWithAuth;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            token = this.extractToken(authorization);
                            supabaseWithAuth = this.supabaseService.setAuthContext(token);
                            return [2 /*return*/, this.invoicesService.recordPayment(supabaseWithAuth, userId, id, amount)];
                    }
                });
            });
        };
        InvoicesSupabaseController_1.prototype.delete = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, token, supabaseWithAuth;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            token = this.extractToken(authorization);
                            supabaseWithAuth = this.supabaseService.setAuthContext(token);
                            return [2 /*return*/, this.invoicesService.delete(supabaseWithAuth, userId, id)];
                    }
                });
            });
        };
        InvoicesSupabaseController_1.prototype.deleteInvoiceItem = function (authorization, itemId) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, token, supabaseWithAuth;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            token = this.extractToken(authorization);
                            supabaseWithAuth = this.supabaseService.setAuthContext(token);
                            return [2 /*return*/, this.invoicesService.deleteInvoiceItem(supabaseWithAuth, userId, itemId)];
                    }
                });
            });
        };
        return InvoicesSupabaseController_1;
    }());
    __setFunctionName(_classThis, "InvoicesSupabaseController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _findAll_decorators = [(0, common_1.Get)()];
        _findOne_decorators = [(0, common_1.Get)(':id')];
        _findInvoiceItems_decorators = [(0, common_1.Get)(':id/items')];
        _create_decorators = [(0, common_1.Post)()];
        _createQuoteFromIntakeForm_decorators = [(0, common_1.Post)('quote/intake-form/:intakeFormId')];
        _addItems_decorators = [(0, common_1.Post)(':id/items')];
        _addItemFromServiceItem_decorators = [(0, common_1.Post)(':id/items/service-item/:serviceItemId')];
        _update_decorators = [(0, common_1.Put)(':id')];
        _updateStatus_decorators = [(0, common_1.Put)(':id/status')];
        _updateInvoiceItem_decorators = [(0, common_1.Put)('items/:itemId')];
        _recordPayment_decorators = [(0, common_1.Post)(':id/payment')];
        _delete_decorators = [(0, common_1.Delete)(':id')];
        _deleteInvoiceItem_decorators = [(0, common_1.Delete)('items/:itemId')];
        __esDecorate(_classThis, null, _findAll_decorators, { kind: "method", name: "findAll", static: false, private: false, access: { has: function (obj) { return "findAll" in obj; }, get: function (obj) { return obj.findAll; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findOne_decorators, { kind: "method", name: "findOne", static: false, private: false, access: { has: function (obj) { return "findOne" in obj; }, get: function (obj) { return obj.findOne; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findInvoiceItems_decorators, { kind: "method", name: "findInvoiceItems", static: false, private: false, access: { has: function (obj) { return "findInvoiceItems" in obj; }, get: function (obj) { return obj.findInvoiceItems; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _create_decorators, { kind: "method", name: "create", static: false, private: false, access: { has: function (obj) { return "create" in obj; }, get: function (obj) { return obj.create; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createQuoteFromIntakeForm_decorators, { kind: "method", name: "createQuoteFromIntakeForm", static: false, private: false, access: { has: function (obj) { return "createQuoteFromIntakeForm" in obj; }, get: function (obj) { return obj.createQuoteFromIntakeForm; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _addItems_decorators, { kind: "method", name: "addItems", static: false, private: false, access: { has: function (obj) { return "addItems" in obj; }, get: function (obj) { return obj.addItems; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _addItemFromServiceItem_decorators, { kind: "method", name: "addItemFromServiceItem", static: false, private: false, access: { has: function (obj) { return "addItemFromServiceItem" in obj; }, get: function (obj) { return obj.addItemFromServiceItem; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _update_decorators, { kind: "method", name: "update", static: false, private: false, access: { has: function (obj) { return "update" in obj; }, get: function (obj) { return obj.update; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateStatus_decorators, { kind: "method", name: "updateStatus", static: false, private: false, access: { has: function (obj) { return "updateStatus" in obj; }, get: function (obj) { return obj.updateStatus; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateInvoiceItem_decorators, { kind: "method", name: "updateInvoiceItem", static: false, private: false, access: { has: function (obj) { return "updateInvoiceItem" in obj; }, get: function (obj) { return obj.updateInvoiceItem; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _recordPayment_decorators, { kind: "method", name: "recordPayment", static: false, private: false, access: { has: function (obj) { return "recordPayment" in obj; }, get: function (obj) { return obj.recordPayment; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _delete_decorators, { kind: "method", name: "delete", static: false, private: false, access: { has: function (obj) { return "delete" in obj; }, get: function (obj) { return obj.delete; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteInvoiceItem_decorators, { kind: "method", name: "deleteInvoiceItem", static: false, private: false, access: { has: function (obj) { return "deleteInvoiceItem" in obj; }, get: function (obj) { return obj.deleteInvoiceItem; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        InvoicesSupabaseController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return InvoicesSupabaseController = _classThis;
}();
exports.InvoicesSupabaseController = InvoicesSupabaseController;
