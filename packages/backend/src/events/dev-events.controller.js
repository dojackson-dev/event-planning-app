"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.DevEventsController = void 0;
var common_1 = require("@nestjs/common");
var fs_1 = require("fs");
var path_1 = require("path");
var DATA_PATH = (0, path_1.join)(__dirname, '..', '..', 'data', 'local-events.json');
function readEvents() {
    return __awaiter(this, void 0, void 0, function () {
        var raw, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fs_1.promises.readFile(DATA_PATH, 'utf8')];
                case 1:
                    raw = _a.sent();
                    return [2 /*return*/, JSON.parse(raw || '[]')];
                case 2:
                    err_1 = _a.sent();
                    if (err_1.code === 'ENOENT')
                        return [2 /*return*/, []];
                    throw err_1;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function writeEvents(events) {
    return __awaiter(this, void 0, void 0, function () {
        var dir, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    dir = (0, path_1.join)(__dirname, '..', '..', 'data');
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fs_1.promises.mkdir(dir, { recursive: true })];
                case 2:
                    _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    _a = _b.sent();
                    return [3 /*break*/, 4];
                case 4: return [4 /*yield*/, fs_1.promises.writeFile(DATA_PATH, JSON.stringify(events, null, 2), 'utf8')];
                case 5:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
var DevEventsController = function () {
    var _classDecorators = [(0, common_1.Controller)('events')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _create_decorators;
    var _findAll_decorators;
    var _findOne_decorators;
    var _update_decorators;
    var _remove_decorators;
    var DevEventsController = _classThis = /** @class */ (function () {
        function DevEventsController_1() {
            __runInitializers(this, _instanceExtraInitializers);
        }
        DevEventsController_1.prototype.extractToken = function (authorization) {
            if (!authorization) {
                throw new common_1.UnauthorizedException('No authorization header');
            }
            return authorization.replace('Bearer ', '');
        };
        DevEventsController_1.prototype.getUserId = function (authorization) {
            var token = this.extractToken(authorization);
            // Handle dev tokens (local-<uuid> format)
            if (token.startsWith('local-')) {
                var userId = token.replace('local-', '');
                if (userId)
                    return userId;
                throw new common_1.UnauthorizedException('Invalid dev token format');
            }
            throw new common_1.UnauthorizedException('Only dev tokens supported in dev mode');
        };
        DevEventsController_1.prototype.create = function (authorization, body) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, events, conflicting, conflicts, id, event;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            userId = this.getUserId(authorization);
                            if (!(body === null || body === void 0 ? void 0 : body.name) || !(body === null || body === void 0 ? void 0 : body.date) || !(body === null || body === void 0 ? void 0 : body.startTime) || !(body === null || body === void 0 ? void 0 : body.endTime) || !(body === null || body === void 0 ? void 0 : body.venue)) {
                                throw new common_1.BadRequestException('name, date, startTime, endTime, and venue are required');
                            }
                            return [4 /*yield*/, readEvents()];
                        case 1:
                            events = _a.sent();
                            conflicting = events.filter(function (e) {
                                if (e.date !== body.date || e.venue !== body.venue) {
                                    return false;
                                }
                                // Check if time ranges overlap
                                var toMinutes = function (time) {
                                    var parts = time.split(':').map(function (p) { return parseInt(p, 10); });
                                    return (parts[0] || 0) * 60 + (parts[1] || 0);
                                };
                                var newStart = toMinutes(body.startTime);
                                var newEnd = toMinutes(body.endTime);
                                var existingStart = toMinutes(e.startTime);
                                var existingEnd = toMinutes(e.endTime);
                                // Times overlap if: max(start1, start2) < min(end1, end2)
                                return Math.max(newStart, existingStart) < Math.min(newEnd, existingEnd);
                            });
                            if (conflicting.length > 0) {
                                conflicts = conflicting.map(function (c) { return "".concat(c.name, " (").concat(c.startTime, "-").concat(c.endTime, ")"); }).join(', ');
                                throw new common_1.BadRequestException("Cannot create event at this time. Conflicts with: ".concat(conflicts));
                            }
                            id = parseInt(Math.random().toString().substring(2, 7));
                            event = __assign(__assign({ id: id }, body), { ownerId: userId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
                            events.push(event);
                            return [4 /*yield*/, writeEvents(events)];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, event];
                    }
                });
            });
        };
        DevEventsController_1.prototype.findAll = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var events;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.getUserId(authorization);
                            return [4 /*yield*/, readEvents()];
                        case 1:
                            events = _a.sent();
                            return [2 /*return*/, events];
                    }
                });
            });
        };
        DevEventsController_1.prototype.findOne = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var events;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.getUserId(authorization);
                            return [4 /*yield*/, readEvents()];
                        case 1:
                            events = _a.sent();
                            return [2 /*return*/, events.find(function (e) { return e.id === parseInt(id); }) || null];
                    }
                });
            });
        };
        DevEventsController_1.prototype.update = function (authorization, id, body) {
            return __awaiter(this, void 0, void 0, function () {
                var events, index, updated;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.getUserId(authorization);
                            return [4 /*yield*/, readEvents()];
                        case 1:
                            events = _a.sent();
                            index = events.findIndex(function (e) { return e.id === parseInt(id); });
                            if (index === -1)
                                return [2 /*return*/, null];
                            updated = __assign(__assign(__assign({}, events[index]), body), { updatedAt: new Date().toISOString() });
                            events[index] = updated;
                            return [4 /*yield*/, writeEvents(events)];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, updated];
                    }
                });
            });
        };
        DevEventsController_1.prototype.remove = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var events, filtered;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.getUserId(authorization);
                            return [4 /*yield*/, readEvents()];
                        case 1:
                            events = _a.sent();
                            filtered = events.filter(function (e) { return e.id !== parseInt(id); });
                            return [4 /*yield*/, writeEvents(filtered)];
                        case 2:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        return DevEventsController_1;
    }());
    __setFunctionName(_classThis, "DevEventsController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _create_decorators = [(0, common_1.Post)()];
        _findAll_decorators = [(0, common_1.Get)()];
        _findOne_decorators = [(0, common_1.Get)(':id')];
        _update_decorators = [(0, common_1.Patch)(':id')];
        _remove_decorators = [(0, common_1.Delete)(':id')];
        __esDecorate(_classThis, null, _create_decorators, { kind: "method", name: "create", static: false, private: false, access: { has: function (obj) { return "create" in obj; }, get: function (obj) { return obj.create; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findAll_decorators, { kind: "method", name: "findAll", static: false, private: false, access: { has: function (obj) { return "findAll" in obj; }, get: function (obj) { return obj.findAll; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findOne_decorators, { kind: "method", name: "findOne", static: false, private: false, access: { has: function (obj) { return "findOne" in obj; }, get: function (obj) { return obj.findOne; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _update_decorators, { kind: "method", name: "update", static: false, private: false, access: { has: function (obj) { return "update" in obj; }, get: function (obj) { return obj.update; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _remove_decorators, { kind: "method", name: "remove", static: false, private: false, access: { has: function (obj) { return "remove" in obj; }, get: function (obj) { return obj.remove; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        DevEventsController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return DevEventsController = _classThis;
}();
exports.DevEventsController = DevEventsController;
