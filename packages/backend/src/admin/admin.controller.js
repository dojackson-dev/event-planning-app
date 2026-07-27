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
exports.AdminController = void 0;
var common_1 = require("@nestjs/common");
var ADMIN_EMAIL = 'admin@dovenuesuite.com';
var AdminController = function () {
    var _classDecorators = [(0, common_1.Controller)('admin')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _getDashboard_decorators;
    var _getOwners_decorators;
    var _getOwnerDetail_decorators;
    var _updateOwnerStatus_decorators;
    var _getTrialSettings_decorators;
    var _updateTrialSettings_decorators;
    var _getEvents_decorators;
    var _getBookings_decorators;
    var _getClients_decorators;
    var _getRevenue_decorators;
    var _getAnalytics_decorators;
    var _getActivity_decorators;
    var _getTrials_decorators;
    var _updateOwnerTrial_decorators;
    var AdminController = _classThis = /** @class */ (function () {
        function AdminController_1(adminService, supabaseService) {
            this.adminService = (__runInitializers(this, _instanceExtraInitializers), adminService);
            this.supabaseService = supabaseService;
        }
        AdminController_1.prototype.verifyAdmin = function (req) {
            return __awaiter(this, void 0, void 0, function () {
                var token, _a, user, error;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace('Bearer ', '');
                            if (!token)
                                throw new common_1.UnauthorizedException('No token provided');
                            return [4 /*yield*/, this.supabaseService.getAdminClient().auth.getUser(token)];
                        case 1:
                            _a = _c.sent(), user = _a.data.user, error = _a.error;
                            if (error || !user || user.email !== ADMIN_EMAIL) {
                                throw new common_1.UnauthorizedException('Admin access required');
                            }
                            return [2 /*return*/, user];
                    }
                });
            });
        };
        AdminController_1.prototype.getDashboard = function (req) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.verifyAdmin(req)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, this.adminService.getDashboardStats()];
                    }
                });
            });
        };
        AdminController_1.prototype.getOwners = function (req_1) {
            return __awaiter(this, arguments, void 0, function (req, page, limit, search) {
                if (page === void 0) { page = '1'; }
                if (limit === void 0) { limit = '20'; }
                if (search === void 0) { search = ''; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.verifyAdmin(req)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, this.adminService.getOwners(parseInt(page), parseInt(limit), search)];
                    }
                });
            });
        };
        AdminController_1.prototype.getOwnerDetail = function (req, id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.verifyAdmin(req)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, this.adminService.getOwnerDetail(id)];
                    }
                });
            });
        };
        AdminController_1.prototype.updateOwnerStatus = function (req, id, body) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.verifyAdmin(req)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, this.adminService.updateOwnerStatus(id, body.status)];
                    }
                });
            });
        };
        AdminController_1.prototype.getTrialSettings = function (req) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.verifyAdmin(req)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, this.adminService.getTrialSettings()];
                    }
                });
            });
        };
        AdminController_1.prototype.updateTrialSettings = function (req, body) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.verifyAdmin(req)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, this.adminService.updateTrialSettings(body.trialDays)];
                    }
                });
            });
        };
        AdminController_1.prototype.getEvents = function (req_1) {
            return __awaiter(this, arguments, void 0, function (req, page, limit, search, ownerId) {
                if (page === void 0) { page = '1'; }
                if (limit === void 0) { limit = '20'; }
                if (search === void 0) { search = ''; }
                if (ownerId === void 0) { ownerId = ''; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.verifyAdmin(req)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, this.adminService.getEvents(parseInt(page), parseInt(limit), search, ownerId)];
                    }
                });
            });
        };
        AdminController_1.prototype.getBookings = function (req_1) {
            return __awaiter(this, arguments, void 0, function (req, page, limit, search, ownerId) {
                if (page === void 0) { page = '1'; }
                if (limit === void 0) { limit = '20'; }
                if (search === void 0) { search = ''; }
                if (ownerId === void 0) { ownerId = ''; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.verifyAdmin(req)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, this.adminService.getBookings(parseInt(page), parseInt(limit), search, ownerId)];
                    }
                });
            });
        };
        AdminController_1.prototype.getClients = function (req_1) {
            return __awaiter(this, arguments, void 0, function (req, page, limit, search) {
                if (page === void 0) { page = '1'; }
                if (limit === void 0) { limit = '20'; }
                if (search === void 0) { search = ''; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.verifyAdmin(req)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, this.adminService.getClients(parseInt(page), parseInt(limit), search)];
                    }
                });
            });
        };
        AdminController_1.prototype.getRevenue = function (req) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.verifyAdmin(req)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, this.adminService.getRevenue()];
                    }
                });
            });
        };
        AdminController_1.prototype.getAnalytics = function (req) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.verifyAdmin(req)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, this.adminService.getAnalytics()];
                    }
                });
            });
        };
        AdminController_1.prototype.getActivity = function (req_1) {
            return __awaiter(this, arguments, void 0, function (req, page, limit, search, role) {
                if (page === void 0) { page = '1'; }
                if (limit === void 0) { limit = '100'; }
                if (search === void 0) { search = ''; }
                if (role === void 0) { role = ''; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.verifyAdmin(req)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, this.adminService.getActivity(parseInt(page), parseInt(limit), search, role)];
                    }
                });
            });
        };
        AdminController_1.prototype.getTrials = function (req_1) {
            return __awaiter(this, arguments, void 0, function (req, page, limit, search) {
                if (page === void 0) { page = '1'; }
                if (limit === void 0) { limit = '50'; }
                if (search === void 0) { search = ''; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.verifyAdmin(req)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, this.adminService.getTrials(parseInt(page), parseInt(limit), search)];
                    }
                });
            });
        };
        AdminController_1.prototype.updateOwnerTrial = function (req, id, body) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.verifyAdmin(req)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, this.adminService.updateOwnerTrial(id, body.action, body.days)];
                    }
                });
            });
        };
        return AdminController_1;
    }());
    __setFunctionName(_classThis, "AdminController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getDashboard_decorators = [(0, common_1.Get)('dashboard')];
        _getOwners_decorators = [(0, common_1.Get)('owners')];
        _getOwnerDetail_decorators = [(0, common_1.Get)('owners/:id')];
        _updateOwnerStatus_decorators = [(0, common_1.Patch)('owners/:id/status')];
        _getTrialSettings_decorators = [(0, common_1.Get)('trial-settings')];
        _updateTrialSettings_decorators = [(0, common_1.Post)('trial-settings')];
        _getEvents_decorators = [(0, common_1.Get)('events')];
        _getBookings_decorators = [(0, common_1.Get)('bookings')];
        _getClients_decorators = [(0, common_1.Get)('clients')];
        _getRevenue_decorators = [(0, common_1.Get)('revenue')];
        _getAnalytics_decorators = [(0, common_1.Get)('analytics')];
        _getActivity_decorators = [(0, common_1.Get)('activity')];
        _getTrials_decorators = [(0, common_1.Get)('trials')];
        _updateOwnerTrial_decorators = [(0, common_1.Patch)('owners/:id/trial')];
        __esDecorate(_classThis, null, _getDashboard_decorators, { kind: "method", name: "getDashboard", static: false, private: false, access: { has: function (obj) { return "getDashboard" in obj; }, get: function (obj) { return obj.getDashboard; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getOwners_decorators, { kind: "method", name: "getOwners", static: false, private: false, access: { has: function (obj) { return "getOwners" in obj; }, get: function (obj) { return obj.getOwners; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getOwnerDetail_decorators, { kind: "method", name: "getOwnerDetail", static: false, private: false, access: { has: function (obj) { return "getOwnerDetail" in obj; }, get: function (obj) { return obj.getOwnerDetail; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateOwnerStatus_decorators, { kind: "method", name: "updateOwnerStatus", static: false, private: false, access: { has: function (obj) { return "updateOwnerStatus" in obj; }, get: function (obj) { return obj.updateOwnerStatus; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getTrialSettings_decorators, { kind: "method", name: "getTrialSettings", static: false, private: false, access: { has: function (obj) { return "getTrialSettings" in obj; }, get: function (obj) { return obj.getTrialSettings; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateTrialSettings_decorators, { kind: "method", name: "updateTrialSettings", static: false, private: false, access: { has: function (obj) { return "updateTrialSettings" in obj; }, get: function (obj) { return obj.updateTrialSettings; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getEvents_decorators, { kind: "method", name: "getEvents", static: false, private: false, access: { has: function (obj) { return "getEvents" in obj; }, get: function (obj) { return obj.getEvents; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getBookings_decorators, { kind: "method", name: "getBookings", static: false, private: false, access: { has: function (obj) { return "getBookings" in obj; }, get: function (obj) { return obj.getBookings; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getClients_decorators, { kind: "method", name: "getClients", static: false, private: false, access: { has: function (obj) { return "getClients" in obj; }, get: function (obj) { return obj.getClients; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getRevenue_decorators, { kind: "method", name: "getRevenue", static: false, private: false, access: { has: function (obj) { return "getRevenue" in obj; }, get: function (obj) { return obj.getRevenue; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getAnalytics_decorators, { kind: "method", name: "getAnalytics", static: false, private: false, access: { has: function (obj) { return "getAnalytics" in obj; }, get: function (obj) { return obj.getAnalytics; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getActivity_decorators, { kind: "method", name: "getActivity", static: false, private: false, access: { has: function (obj) { return "getActivity" in obj; }, get: function (obj) { return obj.getActivity; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getTrials_decorators, { kind: "method", name: "getTrials", static: false, private: false, access: { has: function (obj) { return "getTrials" in obj; }, get: function (obj) { return obj.getTrials; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateOwnerTrial_decorators, { kind: "method", name: "updateOwnerTrial", static: false, private: false, access: { has: function (obj) { return "updateOwnerTrial" in obj; }, get: function (obj) { return obj.updateOwnerTrial; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AdminController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AdminController = _classThis;
}();
exports.AdminController = AdminController;
