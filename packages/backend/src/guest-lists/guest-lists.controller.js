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
exports.GuestListsController = void 0;
var common_1 = require("@nestjs/common");
var GuestListsController = function () {
    var _classDecorators = [(0, common_1.Controller)('guest-lists')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _findAll_decorators;
    var _findByEvent_decorators;
    var _findByShareToken_decorators;
    var _findByAccessCode_decorators;
    var _validateAccess_decorators;
    var _findByArrivalToken_decorators;
    var _findOne_decorators;
    var _create_decorators;
    var _update_decorators;
    var _lock_decorators;
    var _unlock_decorators;
    var _delete_decorators;
    var _getGuests_decorators;
    var _addGuest_decorators;
    var _updateGuest_decorators;
    var _deleteGuest_decorators;
    var _markArrival_decorators;
    var _unmarkArrival_decorators;
    var _smsClientInvite_decorators;
    var _importFromRsvp_decorators;
    var GuestListsController = _classThis = /** @class */ (function () {
        function GuestListsController_1(guestListsService) {
            this.guestListsService = (__runInitializers(this, _instanceExtraInitializers), guestListsService);
        }
        GuestListsController_1.prototype.findAll = function (clientId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (clientId) {
                        return [2 /*return*/, this.guestListsService.findByClient(clientId)];
                    }
                    return [2 /*return*/, this.guestListsService.findAll()];
                });
            });
        };
        GuestListsController_1.prototype.findByEvent = function (eventId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.guestListsService.findByEvent(eventId)];
                });
            });
        };
        GuestListsController_1.prototype.findByShareToken = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.guestListsService.findByShareToken(token)];
                });
            });
        };
        GuestListsController_1.prototype.findByAccessCode = function (code) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.guestListsService.findByAccessCode(code)];
                });
            });
        };
        GuestListsController_1.prototype.validateAccess = function (body) {
            return __awaiter(this, void 0, void 0, function () {
                var valid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.guestListsService.validateAccessCode(body.guestListId, body.accessCode)];
                        case 1:
                            valid = _a.sent();
                            return [2 /*return*/, { valid: valid }];
                    }
                });
            });
        };
        GuestListsController_1.prototype.findByArrivalToken = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.guestListsService.findByArrivalToken(token)];
                });
            });
        };
        GuestListsController_1.prototype.findOne = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.guestListsService.findOne(id)];
                });
            });
        };
        GuestListsController_1.prototype.create = function (guestList) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    console.log('Received guest list data:', JSON.stringify(guestList, null, 2));
                    return [2 /*return*/, this.guestListsService.create(guestList)];
                });
            });
        };
        GuestListsController_1.prototype.update = function (id, guestList) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.guestListsService.update(id, guestList)];
                });
            });
        };
        GuestListsController_1.prototype.lock = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.guestListsService.lock(id)];
                });
            });
        };
        GuestListsController_1.prototype.unlock = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.guestListsService.unlock(id)];
                });
            });
        };
        GuestListsController_1.prototype.delete = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.guestListsService.delete(id)];
                });
            });
        };
        // Guest endpoints
        GuestListsController_1.prototype.getGuests = function (guestListId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.guestListsService.getGuests(guestListId)];
                });
            });
        };
        GuestListsController_1.prototype.addGuest = function (guestListId, guest) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.guestListsService.addGuest(guestListId, guest)];
                });
            });
        };
        GuestListsController_1.prototype.updateGuest = function (guestId, guest) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.guestListsService.updateGuest(guestId, guest)];
                });
            });
        };
        GuestListsController_1.prototype.deleteGuest = function (guestId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.guestListsService.deleteGuest(guestId)];
                });
            });
        };
        GuestListsController_1.prototype.markArrival = function (guestId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.guestListsService.markArrival(guestId)];
                });
            });
        };
        GuestListsController_1.prototype.unmarkArrival = function (guestId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.guestListsService.unmarkArrival(guestId)];
                });
            });
        };
        GuestListsController_1.prototype.smsClientInvite = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.guestListsService.smsClientInvite(id)];
                });
            });
        };
        GuestListsController_1.prototype.importFromRsvp = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.guestListsService.importFromRsvp(id)];
                });
            });
        };
        return GuestListsController_1;
    }());
    __setFunctionName(_classThis, "GuestListsController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _findAll_decorators = [(0, common_1.Get)()];
        _findByEvent_decorators = [(0, common_1.Get)('by-event/:eventId')];
        _findByShareToken_decorators = [(0, common_1.Get)('share/:token')];
        _findByAccessCode_decorators = [(0, common_1.Get)('code/:code')];
        _validateAccess_decorators = [(0, common_1.Post)('validate-access')];
        _findByArrivalToken_decorators = [(0, common_1.Get)('arrival/:token')];
        _findOne_decorators = [(0, common_1.Get)(':id')];
        _create_decorators = [(0, common_1.Post)()];
        _update_decorators = [(0, common_1.Put)(':id')];
        _lock_decorators = [(0, common_1.Post)(':id/lock')];
        _unlock_decorators = [(0, common_1.Post)(':id/unlock')];
        _delete_decorators = [(0, common_1.Delete)(':id')];
        _getGuests_decorators = [(0, common_1.Get)(':id/guests')];
        _addGuest_decorators = [(0, common_1.Post)(':id/guests')];
        _updateGuest_decorators = [(0, common_1.Put)('guests/:guestId')];
        _deleteGuest_decorators = [(0, common_1.Delete)('guests/:guestId')];
        _markArrival_decorators = [(0, common_1.Post)('guests/:guestId/arrive')];
        _unmarkArrival_decorators = [(0, common_1.Post)('guests/:guestId/unarrive')];
        _smsClientInvite_decorators = [(0, common_1.Post)(':id/sms-client')];
        _importFromRsvp_decorators = [(0, common_1.Post)(':id/import-rsvp')];
        __esDecorate(_classThis, null, _findAll_decorators, { kind: "method", name: "findAll", static: false, private: false, access: { has: function (obj) { return "findAll" in obj; }, get: function (obj) { return obj.findAll; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByEvent_decorators, { kind: "method", name: "findByEvent", static: false, private: false, access: { has: function (obj) { return "findByEvent" in obj; }, get: function (obj) { return obj.findByEvent; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByShareToken_decorators, { kind: "method", name: "findByShareToken", static: false, private: false, access: { has: function (obj) { return "findByShareToken" in obj; }, get: function (obj) { return obj.findByShareToken; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByAccessCode_decorators, { kind: "method", name: "findByAccessCode", static: false, private: false, access: { has: function (obj) { return "findByAccessCode" in obj; }, get: function (obj) { return obj.findByAccessCode; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _validateAccess_decorators, { kind: "method", name: "validateAccess", static: false, private: false, access: { has: function (obj) { return "validateAccess" in obj; }, get: function (obj) { return obj.validateAccess; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findByArrivalToken_decorators, { kind: "method", name: "findByArrivalToken", static: false, private: false, access: { has: function (obj) { return "findByArrivalToken" in obj; }, get: function (obj) { return obj.findByArrivalToken; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findOne_decorators, { kind: "method", name: "findOne", static: false, private: false, access: { has: function (obj) { return "findOne" in obj; }, get: function (obj) { return obj.findOne; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _create_decorators, { kind: "method", name: "create", static: false, private: false, access: { has: function (obj) { return "create" in obj; }, get: function (obj) { return obj.create; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _update_decorators, { kind: "method", name: "update", static: false, private: false, access: { has: function (obj) { return "update" in obj; }, get: function (obj) { return obj.update; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _lock_decorators, { kind: "method", name: "lock", static: false, private: false, access: { has: function (obj) { return "lock" in obj; }, get: function (obj) { return obj.lock; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _unlock_decorators, { kind: "method", name: "unlock", static: false, private: false, access: { has: function (obj) { return "unlock" in obj; }, get: function (obj) { return obj.unlock; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _delete_decorators, { kind: "method", name: "delete", static: false, private: false, access: { has: function (obj) { return "delete" in obj; }, get: function (obj) { return obj.delete; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getGuests_decorators, { kind: "method", name: "getGuests", static: false, private: false, access: { has: function (obj) { return "getGuests" in obj; }, get: function (obj) { return obj.getGuests; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _addGuest_decorators, { kind: "method", name: "addGuest", static: false, private: false, access: { has: function (obj) { return "addGuest" in obj; }, get: function (obj) { return obj.addGuest; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateGuest_decorators, { kind: "method", name: "updateGuest", static: false, private: false, access: { has: function (obj) { return "updateGuest" in obj; }, get: function (obj) { return obj.updateGuest; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteGuest_decorators, { kind: "method", name: "deleteGuest", static: false, private: false, access: { has: function (obj) { return "deleteGuest" in obj; }, get: function (obj) { return obj.deleteGuest; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _markArrival_decorators, { kind: "method", name: "markArrival", static: false, private: false, access: { has: function (obj) { return "markArrival" in obj; }, get: function (obj) { return obj.markArrival; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _unmarkArrival_decorators, { kind: "method", name: "unmarkArrival", static: false, private: false, access: { has: function (obj) { return "unmarkArrival" in obj; }, get: function (obj) { return obj.unmarkArrival; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _smsClientInvite_decorators, { kind: "method", name: "smsClientInvite", static: false, private: false, access: { has: function (obj) { return "smsClientInvite" in obj; }, get: function (obj) { return obj.smsClientInvite; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _importFromRsvp_decorators, { kind: "method", name: "importFromRsvp", static: false, private: false, access: { has: function (obj) { return "importFromRsvp" in obj; }, get: function (obj) { return obj.importFromRsvp; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        GuestListsController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return GuestListsController = _classThis;
}();
exports.GuestListsController = GuestListsController;
