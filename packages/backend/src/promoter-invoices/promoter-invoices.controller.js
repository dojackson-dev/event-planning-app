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
exports.PromoterInvoicesController = void 0;
var common_1 = require("@nestjs/common");
var PromoterInvoicesController = function () {
    var _classDecorators = [(0, common_1.Controller)('promoter-invoices')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _getPublicInvoice_decorators;
    var _createPublicCheckout_decorators;
    var _verifyPayment_decorators;
    var _createInvoice_decorators;
    var _listInvoices_decorators;
    var _getInvoice_decorators;
    var _updateInvoice_decorators;
    var _deleteInvoice_decorators;
    var _sendInvoice_decorators;
    var _addItem_decorators;
    var _updateItem_decorators;
    var _deleteItem_decorators;
    var PromoterInvoicesController = _classThis = /** @class */ (function () {
        function PromoterInvoicesController_1(promoterInvoicesService, supabaseService) {
            this.promoterInvoicesService = (__runInitializers(this, _instanceExtraInitializers), promoterInvoicesService);
            this.supabaseService = supabaseService;
            this.logger = new common_1.Logger(PromoterInvoicesController.name);
        }
        PromoterInvoicesController_1.prototype.getUserId = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var token, supabase, _a, user, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!authorization)
                                throw new common_1.UnauthorizedException('No authorization header');
                            token = authorization.replace('Bearer ', '');
                            if (token.startsWith('local-'))
                                return [2 /*return*/, token.replace('local-', '')];
                            supabase = this.supabaseService.setAuthContext(token);
                            return [4 /*yield*/, supabase.auth.getUser()];
                        case 1:
                            _a = _b.sent(), user = _a.data.user, error = _a.error;
                            if (error || !user)
                                throw new common_1.UnauthorizedException('Invalid token');
                            return [2 /*return*/, user.id];
                    }
                });
            });
        };
        // ─── PUBLIC ───────────────────────────────────────────────────────────────
        PromoterInvoicesController_1.prototype.getPublicInvoice = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.promoterInvoicesService.getPublicInvoice(token)];
                });
            });
        };
        PromoterInvoicesController_1.prototype.createPublicCheckout = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.promoterInvoicesService.createCheckoutSession(token)];
                });
            });
        };
        PromoterInvoicesController_1.prototype.verifyPayment = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.promoterInvoicesService.verifyPayment(token)];
                });
            });
        };
        // ─── AUTHENTICATED ────────────────────────────────────────────────────────
        PromoterInvoicesController_1.prototype.createInvoice = function (auth, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.promoterInvoicesService.createInvoice(userId, dto)];
                    }
                });
            });
        };
        PromoterInvoicesController_1.prototype.listInvoices = function (auth) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.promoterInvoicesService.listInvoices(userId)];
                    }
                });
            });
        };
        PromoterInvoicesController_1.prototype.getInvoice = function (auth, id) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.promoterInvoicesService.getInvoice(userId, id)];
                    }
                });
            });
        };
        PromoterInvoicesController_1.prototype.updateInvoice = function (auth, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.promoterInvoicesService.updateInvoice(userId, id, dto)];
                    }
                });
            });
        };
        PromoterInvoicesController_1.prototype.deleteInvoice = function (auth, id) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.promoterInvoicesService.deleteInvoice(userId, id)];
                    }
                });
            });
        };
        PromoterInvoicesController_1.prototype.sendInvoice = function (auth, id) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.promoterInvoicesService.sendInvoice(userId, id)];
                    }
                });
            });
        };
        PromoterInvoicesController_1.prototype.addItem = function (auth, id, item) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.promoterInvoicesService.addItem(userId, id, item)];
                    }
                });
            });
        };
        PromoterInvoicesController_1.prototype.updateItem = function (auth, itemId, item) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.promoterInvoicesService.updateItem(userId, itemId, item)];
                    }
                });
            });
        };
        PromoterInvoicesController_1.prototype.deleteItem = function (auth, itemId) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(auth)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.promoterInvoicesService.deleteItem(userId, itemId)];
                    }
                });
            });
        };
        return PromoterInvoicesController_1;
    }());
    __setFunctionName(_classThis, "PromoterInvoicesController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getPublicInvoice_decorators = [(0, common_1.Get)('public/:token')];
        _createPublicCheckout_decorators = [(0, common_1.Post)('public/:token/checkout')];
        _verifyPayment_decorators = [(0, common_1.Post)('public/:token/verify-payment')];
        _createInvoice_decorators = [(0, common_1.Post)()];
        _listInvoices_decorators = [(0, common_1.Get)('mine')];
        _getInvoice_decorators = [(0, common_1.Get)(':id')];
        _updateInvoice_decorators = [(0, common_1.Put)(':id')];
        _deleteInvoice_decorators = [(0, common_1.Delete)(':id')];
        _sendInvoice_decorators = [(0, common_1.Post)(':id/send')];
        _addItem_decorators = [(0, common_1.Post)(':id/items')];
        _updateItem_decorators = [(0, common_1.Put)('items/:itemId')];
        _deleteItem_decorators = [(0, common_1.Delete)('items/:itemId')];
        __esDecorate(_classThis, null, _getPublicInvoice_decorators, { kind: "method", name: "getPublicInvoice", static: false, private: false, access: { has: function (obj) { return "getPublicInvoice" in obj; }, get: function (obj) { return obj.getPublicInvoice; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createPublicCheckout_decorators, { kind: "method", name: "createPublicCheckout", static: false, private: false, access: { has: function (obj) { return "createPublicCheckout" in obj; }, get: function (obj) { return obj.createPublicCheckout; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _verifyPayment_decorators, { kind: "method", name: "verifyPayment", static: false, private: false, access: { has: function (obj) { return "verifyPayment" in obj; }, get: function (obj) { return obj.verifyPayment; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createInvoice_decorators, { kind: "method", name: "createInvoice", static: false, private: false, access: { has: function (obj) { return "createInvoice" in obj; }, get: function (obj) { return obj.createInvoice; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listInvoices_decorators, { kind: "method", name: "listInvoices", static: false, private: false, access: { has: function (obj) { return "listInvoices" in obj; }, get: function (obj) { return obj.listInvoices; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getInvoice_decorators, { kind: "method", name: "getInvoice", static: false, private: false, access: { has: function (obj) { return "getInvoice" in obj; }, get: function (obj) { return obj.getInvoice; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateInvoice_decorators, { kind: "method", name: "updateInvoice", static: false, private: false, access: { has: function (obj) { return "updateInvoice" in obj; }, get: function (obj) { return obj.updateInvoice; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteInvoice_decorators, { kind: "method", name: "deleteInvoice", static: false, private: false, access: { has: function (obj) { return "deleteInvoice" in obj; }, get: function (obj) { return obj.deleteInvoice; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _sendInvoice_decorators, { kind: "method", name: "sendInvoice", static: false, private: false, access: { has: function (obj) { return "sendInvoice" in obj; }, get: function (obj) { return obj.sendInvoice; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _addItem_decorators, { kind: "method", name: "addItem", static: false, private: false, access: { has: function (obj) { return "addItem" in obj; }, get: function (obj) { return obj.addItem; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateItem_decorators, { kind: "method", name: "updateItem", static: false, private: false, access: { has: function (obj) { return "updateItem" in obj; }, get: function (obj) { return obj.updateItem; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteItem_decorators, { kind: "method", name: "deleteItem", static: false, private: false, access: { has: function (obj) { return "deleteItem" in obj; }, get: function (obj) { return obj.deleteItem; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PromoterInvoicesController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PromoterInvoicesController = _classThis;
}();
exports.PromoterInvoicesController = PromoterInvoicesController;
