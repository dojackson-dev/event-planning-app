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
exports.ContractsController = void 0;
var common_1 = require("@nestjs/common");
var platform_express_1 = require("@nestjs/platform-express");
var multer_1 = require("multer");
var ContractsController = function () {
    var _classDecorators = [(0, common_1.Controller)('contracts')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _findAll_decorators;
    var _findOne_decorators;
    var _uploadContractFile_decorators;
    var _create_decorators;
    var _update_decorators;
    var _partialUpdate_decorators;
    var _signContract_decorators;
    var _ownerSignContract_decorators;
    var _sendContract_decorators;
    var _markViewed_decorators;
    var _getVendorContracts_decorators;
    var _vendorSignContract_decorators;
    var _vendorSendContract_decorators;
    var _remove_decorators;
    var ContractsController = _classThis = /** @class */ (function () {
        function ContractsController_1(contractsService, supabaseService) {
            this.contractsService = (__runInitializers(this, _instanceExtraInitializers), contractsService);
            this.supabaseService = supabaseService;
        }
        ContractsController_1.prototype.extractToken = function (authorization) {
            if (!authorization) {
                throw new common_1.UnauthorizedException('No authorization header');
            }
            return authorization.replace('Bearer ', '');
        };
        ContractsController_1.prototype.getUserId = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var token, userId, supabaseWithAuth, _a, user, error;
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
        ContractsController_1.prototype.findAll = function (authorization, ownerId, clientId, venueId) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, token, supabase;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            token = this.extractToken(authorization);
                            supabase = this.supabaseService.setAuthContext(token);
                            if (ownerId)
                                return [2 /*return*/, this.contractsService.findByOwner(supabase, ownerId, venueId)];
                            if (clientId)
                                return [2 /*return*/, this.contractsService.findByClient(supabase, clientId)];
                            return [2 /*return*/, this.contractsService.findByOwner(supabase, userId, venueId)];
                    }
                });
            });
        };
        ContractsController_1.prototype.findOne = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var token, supabase;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            _a.sent();
                            token = this.extractToken(authorization);
                            supabase = this.supabaseService.setAuthContext(token);
                            return [2 /*return*/, this.contractsService.findOne(supabase, id)];
                    }
                });
            });
        };
        ContractsController_1.prototype.uploadContractFile = function (file, authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var allowedTypes, admin, ext, storagePath, uploadError, signedData;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            _c.sent();
                            if (!file)
                                throw new common_1.BadRequestException('No file provided');
                            allowedTypes = [
                                'application/pdf',
                                'application/msword',
                                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                            ];
                            if (!allowedTypes.includes(file.mimetype)) {
                                throw new common_1.BadRequestException('File must be a PDF or Word document (.pdf, .doc, .docx)');
                            }
                            if (file.size > 10 * 1024 * 1024) {
                                throw new common_1.BadRequestException('File must be under 10 MB');
                            }
                            admin = this.supabaseService.getAdminClient();
                            // Ensure bucket exists
                            return [4 /*yield*/, admin.storage.createBucket('contracts', { public: false }).catch(function () { })];
                        case 2:
                            // Ensure bucket exists
                            _c.sent();
                            ext = (_a = file.originalname.split('.').pop()) !== null && _a !== void 0 ? _a : 'pdf';
                            storagePath = "uploads/".concat(Date.now(), "-").concat(Math.random().toString(36).slice(2), ".").concat(ext);
                            return [4 /*yield*/, admin.storage
                                    .from('contracts')
                                    .upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: false })];
                        case 3:
                            uploadError = (_c.sent()).error;
                            if (uploadError)
                                throw new common_1.BadRequestException('File upload failed: ' + uploadError.message);
                            return [4 /*yield*/, admin.storage
                                    .from('contracts')
                                    .createSignedUrl(storagePath, 60 * 60 * 24 * 365 * 10)];
                        case 4:
                            signedData = (_c.sent()).data;
                            return [2 /*return*/, {
                                    path: (_b = signedData === null || signedData === void 0 ? void 0 : signedData.signedUrl) !== null && _b !== void 0 ? _b : storagePath,
                                    storagePath: storagePath,
                                    originalname: file.originalname,
                                    size: file.size,
                                    mimetype: file.mimetype,
                                }];
                    }
                });
            });
        };
        ContractsController_1.prototype.create = function (authorization, contractData) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, token, supabase;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            token = this.extractToken(authorization);
                            supabase = this.supabaseService.setAuthContext(token);
                            return [2 /*return*/, this.contractsService.create(supabase, __assign(__assign({}, contractData), { owner_id: userId }))];
                    }
                });
            });
        };
        ContractsController_1.prototype.update = function (authorization, id, contractData) {
            return __awaiter(this, void 0, void 0, function () {
                var token, supabase;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            _a.sent();
                            token = this.extractToken(authorization);
                            supabase = this.supabaseService.setAuthContext(token);
                            return [2 /*return*/, this.contractsService.update(supabase, id, contractData)];
                    }
                });
            });
        };
        ContractsController_1.prototype.partialUpdate = function (authorization, id, contractData) {
            return __awaiter(this, void 0, void 0, function () {
                var token, supabase;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            _a.sent();
                            token = this.extractToken(authorization);
                            supabase = this.supabaseService.setAuthContext(token);
                            return [2 /*return*/, this.contractsService.update(supabase, id, contractData)];
                    }
                });
            });
        };
        ContractsController_1.prototype.signContract = function (authorization, id, signatureData) {
            return __awaiter(this, void 0, void 0, function () {
                var token, supabase;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            _a.sent();
                            token = this.extractToken(authorization);
                            supabase = this.supabaseService.setAuthContext(token);
                            return [2 /*return*/, this.contractsService.signContract(supabase, id, signatureData)];
                    }
                });
            });
        };
        ContractsController_1.prototype.ownerSignContract = function (authorization, id, body) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, token, supabase;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            token = this.extractToken(authorization);
                            supabase = this.supabaseService.setAuthContext(token);
                            if (!(body === null || body === void 0 ? void 0 : body.signatureData) || !(body === null || body === void 0 ? void 0 : body.signerName)) {
                                throw new common_1.BadRequestException('signatureData and signerName are required');
                            }
                            return [2 /*return*/, this.contractsService.ownerSignContract(supabase, id, body.signatureData, body.signerName, userId)];
                    }
                });
            });
        };
        ContractsController_1.prototype.sendContract = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var token, supabase;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            _a.sent();
                            token = this.extractToken(authorization);
                            supabase = this.supabaseService.setAuthContext(token);
                            return [2 /*return*/, this.contractsService.sendContract(supabase, id)];
                    }
                });
            });
        };
        // Public endpoint — no auth required. Marks a contract as viewed by the client (first open only).
        ContractsController_1.prototype.markViewed = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var admin;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('contracts')
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
        // ── Vendor-specific endpoints ─────────────────────────────────────────────
        ContractsController_1.prototype.getVendorContracts = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.contractsService.findByVendorUser(userId)];
                    }
                });
            });
        };
        ContractsController_1.prototype.vendorSignContract = function (authorization, id, body) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            if (!(body === null || body === void 0 ? void 0 : body.signatureData) || !(body === null || body === void 0 ? void 0 : body.signerName)) {
                                throw new common_1.BadRequestException('signatureData and signerName are required');
                            }
                            return [2 /*return*/, this.contractsService.signContractAsVendor(userId, id, body.signatureData, body.signerName)];
                    }
                });
            });
        };
        ContractsController_1.prototype.vendorSendContract = function (authorization, id, body) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            if (!(body === null || body === void 0 ? void 0 : body.sendTo) || !['client', 'owner'].includes(body.sendTo)) {
                                throw new common_1.BadRequestException('sendTo must be "client" or "owner"');
                            }
                            return [2 /*return*/, this.contractsService.sendContractAsVendor(userId, id, body.sendTo)];
                    }
                });
            });
        };
        ContractsController_1.prototype.remove = function (authorization, id) {
            return __awaiter(this, void 0, void 0, function () {
                var token, supabase;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            _a.sent();
                            token = this.extractToken(authorization);
                            supabase = this.supabaseService.setAuthContext(token);
                            return [2 /*return*/, this.contractsService.delete(supabase, id)];
                    }
                });
            });
        };
        return ContractsController_1;
    }());
    __setFunctionName(_classThis, "ContractsController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _findAll_decorators = [(0, common_1.Get)()];
        _findOne_decorators = [(0, common_1.Get)(':id')];
        _uploadContractFile_decorators = [(0, common_1.Post)('upload'), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.memoryStorage)() }))];
        _create_decorators = [(0, common_1.Post)()];
        _update_decorators = [(0, common_1.Put)(':id')];
        _partialUpdate_decorators = [(0, common_1.Patch)(':id')];
        _signContract_decorators = [(0, common_1.Post)(':id/sign')];
        _ownerSignContract_decorators = [(0, common_1.Post)(':id/owner-sign')];
        _sendContract_decorators = [(0, common_1.Post)(':id/send')];
        _markViewed_decorators = [(0, common_1.Post)(':id/viewed')];
        _getVendorContracts_decorators = [(0, common_1.Get)('vendor/mine')];
        _vendorSignContract_decorators = [(0, common_1.Post)(':id/vendor-sign')];
        _vendorSendContract_decorators = [(0, common_1.Post)(':id/vendor-send')];
        _remove_decorators = [(0, common_1.Delete)(':id')];
        __esDecorate(_classThis, null, _findAll_decorators, { kind: "method", name: "findAll", static: false, private: false, access: { has: function (obj) { return "findAll" in obj; }, get: function (obj) { return obj.findAll; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findOne_decorators, { kind: "method", name: "findOne", static: false, private: false, access: { has: function (obj) { return "findOne" in obj; }, get: function (obj) { return obj.findOne; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _uploadContractFile_decorators, { kind: "method", name: "uploadContractFile", static: false, private: false, access: { has: function (obj) { return "uploadContractFile" in obj; }, get: function (obj) { return obj.uploadContractFile; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _create_decorators, { kind: "method", name: "create", static: false, private: false, access: { has: function (obj) { return "create" in obj; }, get: function (obj) { return obj.create; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _update_decorators, { kind: "method", name: "update", static: false, private: false, access: { has: function (obj) { return "update" in obj; }, get: function (obj) { return obj.update; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _partialUpdate_decorators, { kind: "method", name: "partialUpdate", static: false, private: false, access: { has: function (obj) { return "partialUpdate" in obj; }, get: function (obj) { return obj.partialUpdate; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _signContract_decorators, { kind: "method", name: "signContract", static: false, private: false, access: { has: function (obj) { return "signContract" in obj; }, get: function (obj) { return obj.signContract; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _ownerSignContract_decorators, { kind: "method", name: "ownerSignContract", static: false, private: false, access: { has: function (obj) { return "ownerSignContract" in obj; }, get: function (obj) { return obj.ownerSignContract; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _sendContract_decorators, { kind: "method", name: "sendContract", static: false, private: false, access: { has: function (obj) { return "sendContract" in obj; }, get: function (obj) { return obj.sendContract; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _markViewed_decorators, { kind: "method", name: "markViewed", static: false, private: false, access: { has: function (obj) { return "markViewed" in obj; }, get: function (obj) { return obj.markViewed; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getVendorContracts_decorators, { kind: "method", name: "getVendorContracts", static: false, private: false, access: { has: function (obj) { return "getVendorContracts" in obj; }, get: function (obj) { return obj.getVendorContracts; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _vendorSignContract_decorators, { kind: "method", name: "vendorSignContract", static: false, private: false, access: { has: function (obj) { return "vendorSignContract" in obj; }, get: function (obj) { return obj.vendorSignContract; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _vendorSendContract_decorators, { kind: "method", name: "vendorSendContract", static: false, private: false, access: { has: function (obj) { return "vendorSendContract" in obj; }, get: function (obj) { return obj.vendorSendContract; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _remove_decorators, { kind: "method", name: "remove", static: false, private: false, access: { has: function (obj) { return "remove" in obj; }, get: function (obj) { return obj.remove; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ContractsController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ContractsController = _classThis;
}();
exports.ContractsController = ContractsController;
