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
exports.EstimatesController = void 0;
var common_1 = require("@nestjs/common");
var EstimatesController = function () {
    var _classDecorators = [(0, common_1.Controller)('estimates')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _findAll_decorators;
    var _findOne_decorators;
    var _create_decorators;
    var _update_decorators;
    var _updateStatus_decorators;
    var _addItems_decorators;
    var _updateItem_decorators;
    var _deleteItem_decorators;
    var _convertToInvoice_decorators;
    var _markViewed_decorators;
    var _delete_decorators;
    var EstimatesController = _classThis = /** @class */ (function () {
        function EstimatesController_1(estimatesService, supabaseService) {
            this.estimatesService = (__runInitializers(this, _instanceExtraInitializers), estimatesService);
            this.supabaseService = supabaseService;
        }
        EstimatesController_1.prototype.extractToken = function (authorization) {
            if (!authorization)
                throw new common_1.UnauthorizedException('No authorization header');
            return authorization.replace('Bearer ', '');
        };
        EstimatesController_1.prototype.getUserId = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var token, userId, supabase, _a, user, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            token = this.extractToken(authorization);
                            if (token.startsWith('local-')) {
                                userId = token.replace('local-', '');
                                if (userId)
                                    return [2 /*return*/, userId];
                                throw new common_1.UnauthorizedException('Invalid dev token format');
                            }
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
        EstimatesController_1.prototype.findAll = function (authorization, ownerId, intakeFormId, venueId) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, supabaseAdmin;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            supabaseAdmin = this.supabaseService.getAdminClient();
                            if (intakeFormId)
                                return [2 /*return*/, this.estimatesService.findByIntakeForm(supabaseAdmin, intakeFormId)];
                            if (ownerId)
                                return [2 /*return*/, this.estimatesService.findByOwner(supabaseAdmin, ownerId, venueId)];
                            return [2 /*return*/, this.estimatesService.findByOwner(supabaseAdmin, userId, venueId)];
                    }
                });
            });
        };
        EstimatesController_1.prototype.findOne = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var supabaseAdmin;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            _a.sent();
                            supabaseAdmin = this.supabaseService.getAdminClient();
                            return [2 /*return*/, this.estimatesService.findOne(supabaseAdmin, id)];
                    }
                });
            });
        };
        EstimatesController_1.prototype.create = function (authorization, body) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, supabaseAdmin;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            supabaseAdmin = this.supabaseService.getAdminClient();
                            return [2 /*return*/, this.estimatesService.create(supabaseAdmin, userId, body.estimate, body.items)];
                    }
                });
            });
        };
        EstimatesController_1.prototype.update = function (authorization, id, estimateData) {
            return __awaiter(this, void 0, void 0, function () {
                var supabaseAdmin;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            _a.sent();
                            supabaseAdmin = this.supabaseService.getAdminClient();
                            return [2 /*return*/, this.estimatesService.update(supabaseAdmin, id, estimateData)];
                    }
                });
            });
        };
        EstimatesController_1.prototype.updateStatus = function (authorization, id, status) {
            return __awaiter(this, void 0, void 0, function () {
                var supabaseAdmin;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            _a.sent();
                            supabaseAdmin = this.supabaseService.getAdminClient();
                            return [2 /*return*/, this.estimatesService.updateStatus(supabaseAdmin, id, status)];
                    }
                });
            });
        };
        EstimatesController_1.prototype.addItems = function (authorization, id, items) {
            return __awaiter(this, void 0, void 0, function () {
                var supabaseAdmin;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            _a.sent();
                            supabaseAdmin = this.supabaseService.getAdminClient();
                            return [2 /*return*/, this.estimatesService.createItems(supabaseAdmin, id, items)];
                    }
                });
            });
        };
        EstimatesController_1.prototype.updateItem = function (authorization, itemId, itemData) {
            return __awaiter(this, void 0, void 0, function () {
                var supabaseAdmin;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            _a.sent();
                            supabaseAdmin = this.supabaseService.getAdminClient();
                            return [2 /*return*/, this.estimatesService.updateItem(supabaseAdmin, itemId, itemData)];
                    }
                });
            });
        };
        EstimatesController_1.prototype.deleteItem = function (authorization, itemId) {
            return __awaiter(this, void 0, void 0, function () {
                var supabaseAdmin;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            _a.sent();
                            supabaseAdmin = this.supabaseService.getAdminClient();
                            return [2 /*return*/, this.estimatesService.deleteItem(supabaseAdmin, itemId)];
                    }
                });
            });
        };
        EstimatesController_1.prototype.convertToInvoice = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, supabaseAdmin;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            supabaseAdmin = this.supabaseService.getAdminClient();
                            return [2 /*return*/, this.estimatesService.convertToInvoice(supabaseAdmin, userId, id)];
                    }
                });
            });
        };
        // Public endpoint — no auth required. Marks an estimate as viewed by the client (first open only).
        EstimatesController_1.prototype.markViewed = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var admin;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('estimates')
                                    .update({ viewed_at: new Date().toISOString() })
                                    .eq('id', id)
                                    .is('viewed_at', null)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        EstimatesController_1.prototype.delete = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var supabaseAdmin;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            _a.sent();
                            supabaseAdmin = this.supabaseService.getAdminClient();
                            return [2 /*return*/, this.estimatesService.delete(supabaseAdmin, id)];
                    }
                });
            });
        };
        return EstimatesController_1;
    }());
    __setFunctionName(_classThis, "EstimatesController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _findAll_decorators = [(0, common_1.Get)()];
        _findOne_decorators = [(0, common_1.Get)(':id')];
        _create_decorators = [(0, common_1.Post)()];
        _update_decorators = [(0, common_1.Put)(':id')];
        _updateStatus_decorators = [(0, common_1.Put)(':id/status')];
        _addItems_decorators = [(0, common_1.Post)(':id/items')];
        _updateItem_decorators = [(0, common_1.Put)('items/:itemId')];
        _deleteItem_decorators = [(0, common_1.Delete)('items/:itemId')];
        _convertToInvoice_decorators = [(0, common_1.Post)(':id/convert-to-invoice')];
        _markViewed_decorators = [(0, common_1.Post)(':id/viewed')];
        _delete_decorators = [(0, common_1.Delete)(':id')];
        __esDecorate(_classThis, null, _findAll_decorators, { kind: "method", name: "findAll", static: false, private: false, access: { has: function (obj) { return "findAll" in obj; }, get: function (obj) { return obj.findAll; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findOne_decorators, { kind: "method", name: "findOne", static: false, private: false, access: { has: function (obj) { return "findOne" in obj; }, get: function (obj) { return obj.findOne; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _create_decorators, { kind: "method", name: "create", static: false, private: false, access: { has: function (obj) { return "create" in obj; }, get: function (obj) { return obj.create; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _update_decorators, { kind: "method", name: "update", static: false, private: false, access: { has: function (obj) { return "update" in obj; }, get: function (obj) { return obj.update; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateStatus_decorators, { kind: "method", name: "updateStatus", static: false, private: false, access: { has: function (obj) { return "updateStatus" in obj; }, get: function (obj) { return obj.updateStatus; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _addItems_decorators, { kind: "method", name: "addItems", static: false, private: false, access: { has: function (obj) { return "addItems" in obj; }, get: function (obj) { return obj.addItems; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateItem_decorators, { kind: "method", name: "updateItem", static: false, private: false, access: { has: function (obj) { return "updateItem" in obj; }, get: function (obj) { return obj.updateItem; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteItem_decorators, { kind: "method", name: "deleteItem", static: false, private: false, access: { has: function (obj) { return "deleteItem" in obj; }, get: function (obj) { return obj.deleteItem; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _convertToInvoice_decorators, { kind: "method", name: "convertToInvoice", static: false, private: false, access: { has: function (obj) { return "convertToInvoice" in obj; }, get: function (obj) { return obj.convertToInvoice; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _markViewed_decorators, { kind: "method", name: "markViewed", static: false, private: false, access: { has: function (obj) { return "markViewed" in obj; }, get: function (obj) { return obj.markViewed; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _delete_decorators, { kind: "method", name: "delete", static: false, private: false, access: { has: function (obj) { return "delete" in obj; }, get: function (obj) { return obj.delete; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        EstimatesController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return EstimatesController = _classThis;
}();
exports.EstimatesController = EstimatesController;
