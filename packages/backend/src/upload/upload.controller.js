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
exports.UploadController = void 0;
var common_1 = require("@nestjs/common");
var platform_express_1 = require("@nestjs/platform-express");
var multer_1 = require("multer");
// eslint-disable-next-line @typescript-eslint/no-require-imports
var sharp = require('sharp');
var ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
var MAX_VENDOR_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB
var MAX_SERVICE_ITEM_BYTES = 5 * 1024 * 1024; // 5 MB
var MAX_OWNER_LOGO_BYTES = 3 * 1024 * 1024; // 3 MB
var MAX_COVER_BYTES = 5 * 1024 * 1024; // 5 MB
var UploadController = function () {
    var _classDecorators = [(0, common_1.Controller)('upload')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _uploadVendorLogo_decorators;
    var _uploadServiceItem_decorators;
    var _uploadOwnerLogo_decorators;
    var _uploadOwnerCover_decorators;
    var _uploadVendorCover_decorators;
    var _uploadArtistLogo_decorators;
    var _uploadArtistCover_decorators;
    var _uploadPromoterLogo_decorators;
    var _uploadPromoterCover_decorators;
    var _uploadAttachment_decorators;
    var _uploadEventImage_decorators;
    var _uploadRsvpInvitation_decorators;
    var UploadController = _classThis = /** @class */ (function () {
        function UploadController_1(supabaseService, clientAuthService) {
            this.supabaseService = (__runInitializers(this, _instanceExtraInitializers), supabaseService);
            this.clientAuthService = clientAuthService;
        }
        // ─────────────────────────────────────────────
        // HELPERS
        // ─────────────────────────────────────────────
        UploadController_1.prototype.getUserId = function (authorization) {
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
        UploadController_1.prototype.ensureBucket = function (admin, bucket) {
            return __awaiter(this, void 0, void 0, function () {
                var error;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, admin.storage.createBucket(bucket, {
                                public: true,
                                fileSizeLimit: MAX_SERVICE_ITEM_BYTES,
                            })];
                        case 1:
                            error = (_b.sent()).error;
                            // Ignore "already exists" error
                            if (error && !((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('already exists'))) {
                                throw new common_1.BadRequestException('Storage bucket error: ' + error.message);
                            }
                            return [2 /*return*/];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // POST /upload/vendor-logo
        // Vendor profile / business logo
        // Recommended: 400×400 px, max 2 MB, JPEG/PNG/WebP
        // ─────────────────────────────────────────────
        UploadController_1.prototype.uploadVendorLogo = function (file, authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, admin, processed, path, uploadError, publicUrl;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            if (!file)
                                throw new common_1.BadRequestException('No file provided');
                            if (!ALLOWED_TYPES.includes(file.mimetype)) {
                                throw new common_1.BadRequestException('File must be JPEG, PNG, or WebP');
                            }
                            if (file.size > MAX_VENDOR_LOGO_BYTES) {
                                throw new common_1.BadRequestException('Logo must be under 2 MB');
                            }
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.ensureBucket(admin, 'vendor-images')];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, sharp(file.buffer)
                                    .resize(400, 400, { fit: 'cover', position: 'centre' })
                                    .webp({ quality: 85 })
                                    .toBuffer()];
                        case 3:
                            processed = _a.sent();
                            path = "logos/".concat(userId, "-").concat(Date.now(), ".webp");
                            return [4 /*yield*/, admin.storage
                                    .from('vendor-images')
                                    .upload(path, processed, { contentType: 'image/webp', upsert: true })];
                        case 4:
                            uploadError = (_a.sent()).error;
                            if (uploadError)
                                throw new common_1.BadRequestException('Upload failed: ' + uploadError.message);
                            publicUrl = admin.storage
                                .from('vendor-images')
                                .getPublicUrl(path).data.publicUrl;
                            return [2 /*return*/, { url: publicUrl }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // POST /upload/service-item
        // Owner service item / package image
        // Recommended: 800×600 px (4:3), max 5 MB, JPEG/PNG/WebP
        // ─────────────────────────────────────────────
        UploadController_1.prototype.uploadServiceItem = function (file, authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, admin, processed, path, uploadError, publicUrl;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            if (!file)
                                throw new common_1.BadRequestException('No file provided');
                            if (!ALLOWED_TYPES.includes(file.mimetype)) {
                                throw new common_1.BadRequestException('File must be JPEG, PNG, or WebP');
                            }
                            if (file.size > MAX_SERVICE_ITEM_BYTES) {
                                throw new common_1.BadRequestException('Image must be under 5 MB');
                            }
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.ensureBucket(admin, 'service-item-images')];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, sharp(file.buffer)
                                    .resize(800, 600, { fit: 'cover', position: 'centre' })
                                    .webp({ quality: 85 })
                                    .toBuffer()];
                        case 3:
                            processed = _a.sent();
                            path = "items/".concat(userId, "-").concat(Date.now(), ".webp");
                            return [4 /*yield*/, admin.storage
                                    .from('service-item-images')
                                    .upload(path, processed, { contentType: 'image/webp', upsert: true })];
                        case 4:
                            uploadError = (_a.sent()).error;
                            if (uploadError)
                                throw new common_1.BadRequestException('Upload failed: ' + uploadError.message);
                            publicUrl = admin.storage
                                .from('service-item-images')
                                .getPublicUrl(path).data.publicUrl;
                            return [2 /*return*/, { url: publicUrl }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // POST /upload/owner-logo
        // Owner venue/business logo for sidebar branding
        // Recommended: wide/landscape, max 3 MB, JPEG/PNG/WebP
        // ─────────────────────────────────────────────
        UploadController_1.prototype.uploadOwnerLogo = function (file, authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, admin, processed, path, uploadError, publicUrl;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            if (!file)
                                throw new common_1.BadRequestException('No file provided');
                            if (!ALLOWED_TYPES.includes(file.mimetype)) {
                                throw new common_1.BadRequestException('File must be JPEG, PNG, or WebP');
                            }
                            if (file.size > MAX_OWNER_LOGO_BYTES) {
                                throw new common_1.BadRequestException('Logo must be under 3 MB');
                            }
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.ensureBucket(admin, 'owner-images')];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, sharp(file.buffer)
                                    .resize(800, 300, { fit: 'inside', withoutEnlargement: true })
                                    .webp({ quality: 90 })
                                    .toBuffer()];
                        case 3:
                            processed = _a.sent();
                            path = "logos/".concat(userId, "-").concat(Date.now(), ".webp");
                            return [4 /*yield*/, admin.storage
                                    .from('owner-images')
                                    .upload(path, processed, { contentType: 'image/webp', upsert: true })];
                        case 4:
                            uploadError = (_a.sent()).error;
                            if (uploadError)
                                throw new common_1.BadRequestException('Upload failed: ' + uploadError.message);
                            publicUrl = admin.storage
                                .from('owner-images')
                                .getPublicUrl(path).data.publicUrl;
                            return [2 /*return*/, { url: publicUrl }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // POST /upload/owner-cover
        // Owner venue banner / cover image
        // Recommended: 1200×400 px (3:1), max 5 MB
        // ─────────────────────────────────────────────
        UploadController_1.prototype.uploadOwnerCover = function (file, authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, admin, processed, path, uploadError, publicUrl;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            if (!file)
                                throw new common_1.BadRequestException('No file provided');
                            if (!ALLOWED_TYPES.includes(file.mimetype))
                                throw new common_1.BadRequestException('File must be JPEG, PNG, or WebP');
                            if (file.size > MAX_COVER_BYTES)
                                throw new common_1.BadRequestException('Cover image must be under 5 MB');
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.ensureBucket(admin, 'owner-images')];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, sharp(file.buffer)
                                    .resize(1200, 400, { fit: 'cover', position: 'centre' })
                                    .webp({ quality: 85 })
                                    .toBuffer()];
                        case 3:
                            processed = _a.sent();
                            path = "covers/".concat(userId, "-").concat(Date.now(), ".webp");
                            return [4 /*yield*/, admin.storage
                                    .from('owner-images')
                                    .upload(path, processed, { contentType: 'image/webp', upsert: true })];
                        case 4:
                            uploadError = (_a.sent()).error;
                            if (uploadError)
                                throw new common_1.BadRequestException('Upload failed: ' + uploadError.message);
                            publicUrl = admin.storage.from('owner-images').getPublicUrl(path).data.publicUrl;
                            return [2 /*return*/, { url: publicUrl }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // POST /upload/vendor-cover
        // Vendor cover / banner photo
        // Recommended: 1200×400 px (3:1), max 5 MB
        // ─────────────────────────────────────────────
        UploadController_1.prototype.uploadVendorCover = function (file, authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, admin, processed, path, uploadError, publicUrl;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            if (!file)
                                throw new common_1.BadRequestException('No file provided');
                            if (!ALLOWED_TYPES.includes(file.mimetype))
                                throw new common_1.BadRequestException('File must be JPEG, PNG, or WebP');
                            if (file.size > MAX_COVER_BYTES)
                                throw new common_1.BadRequestException('Cover image must be under 5 MB');
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.ensureBucket(admin, 'vendor-images')];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, sharp(file.buffer)
                                    .resize(1200, 400, { fit: 'cover', position: 'centre' })
                                    .webp({ quality: 85 })
                                    .toBuffer()];
                        case 3:
                            processed = _a.sent();
                            path = "covers/".concat(userId, "-").concat(Date.now(), ".webp");
                            return [4 /*yield*/, admin.storage
                                    .from('vendor-images')
                                    .upload(path, processed, { contentType: 'image/webp', upsert: true })];
                        case 4:
                            uploadError = (_a.sent()).error;
                            if (uploadError)
                                throw new common_1.BadRequestException('Upload failed: ' + uploadError.message);
                            publicUrl = admin.storage.from('vendor-images').getPublicUrl(path).data.publicUrl;
                            return [2 /*return*/, { url: publicUrl }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // POST /upload/artist-logo
        // Artist profile / headshot image (400×400)
        // ─────────────────────────────────────────────
        UploadController_1.prototype.uploadArtistLogo = function (file, authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, admin, processed, path, uploadError, publicUrl;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            if (!file)
                                throw new common_1.BadRequestException('No file provided');
                            if (!ALLOWED_TYPES.includes(file.mimetype))
                                throw new common_1.BadRequestException('File must be JPEG, PNG, or WebP');
                            if (file.size > MAX_VENDOR_LOGO_BYTES)
                                throw new common_1.BadRequestException('Image must be under 2 MB');
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.ensureBucket(admin, 'artist-images')];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, sharp(file.buffer)
                                    .resize(400, 400, { fit: 'cover', position: 'centre' })
                                    .webp({ quality: 85 })
                                    .toBuffer()];
                        case 3:
                            processed = _a.sent();
                            path = "logos/".concat(userId, "-").concat(Date.now(), ".webp");
                            return [4 /*yield*/, admin.storage
                                    .from('artist-images')
                                    .upload(path, processed, { contentType: 'image/webp', upsert: true })];
                        case 4:
                            uploadError = (_a.sent()).error;
                            if (uploadError)
                                throw new common_1.BadRequestException('Upload failed: ' + uploadError.message);
                            publicUrl = admin.storage.from('artist-images').getPublicUrl(path).data.publicUrl;
                            return [2 /*return*/, { url: publicUrl }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // POST /upload/artist-cover
        // Artist cover / banner image (1200×400)
        // ─────────────────────────────────────────────
        UploadController_1.prototype.uploadArtistCover = function (file, authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, admin, processed, path, uploadError, publicUrl;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            if (!file)
                                throw new common_1.BadRequestException('No file provided');
                            if (!ALLOWED_TYPES.includes(file.mimetype))
                                throw new common_1.BadRequestException('File must be JPEG, PNG, or WebP');
                            if (file.size > MAX_COVER_BYTES)
                                throw new common_1.BadRequestException('Cover image must be under 5 MB');
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.ensureBucket(admin, 'artist-images')];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, sharp(file.buffer)
                                    .resize(1200, 400, { fit: 'cover', position: 'centre' })
                                    .webp({ quality: 85 })
                                    .toBuffer()];
                        case 3:
                            processed = _a.sent();
                            path = "covers/".concat(userId, "-").concat(Date.now(), ".webp");
                            return [4 /*yield*/, admin.storage
                                    .from('artist-images')
                                    .upload(path, processed, { contentType: 'image/webp', upsert: true })];
                        case 4:
                            uploadError = (_a.sent()).error;
                            if (uploadError)
                                throw new common_1.BadRequestException('Upload failed: ' + uploadError.message);
                            publicUrl = admin.storage.from('artist-images').getPublicUrl(path).data.publicUrl;
                            return [2 /*return*/, { url: publicUrl }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // POST /upload/promoter-logo
        // Promoter profile / logo image (400×400)
        // ─────────────────────────────────────────────
        UploadController_1.prototype.uploadPromoterLogo = function (file, authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, admin, processed, path, uploadError, publicUrl;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            if (!file)
                                throw new common_1.BadRequestException('No file provided');
                            if (!ALLOWED_TYPES.includes(file.mimetype))
                                throw new common_1.BadRequestException('File must be JPEG, PNG, or WebP');
                            if (file.size > MAX_VENDOR_LOGO_BYTES)
                                throw new common_1.BadRequestException('Image must be under 2 MB');
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.ensureBucket(admin, 'promoter-images')];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, sharp(file.buffer)
                                    .resize(400, 400, { fit: 'cover', position: 'centre' })
                                    .webp({ quality: 85 })
                                    .toBuffer()];
                        case 3:
                            processed = _a.sent();
                            path = "logos/".concat(userId, "-").concat(Date.now(), ".webp");
                            return [4 /*yield*/, admin.storage
                                    .from('promoter-images')
                                    .upload(path, processed, { contentType: 'image/webp', upsert: true })];
                        case 4:
                            uploadError = (_a.sent()).error;
                            if (uploadError)
                                throw new common_1.BadRequestException('Upload failed: ' + uploadError.message);
                            publicUrl = admin.storage.from('promoter-images').getPublicUrl(path).data.publicUrl;
                            return [2 /*return*/, { url: publicUrl }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // POST /upload/promoter-cover
        // Promoter cover / banner image (1200×400)
        // ─────────────────────────────────────────────
        UploadController_1.prototype.uploadPromoterCover = function (file, authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, admin, processed, path, uploadError, publicUrl;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            if (!file)
                                throw new common_1.BadRequestException('No file provided');
                            if (!ALLOWED_TYPES.includes(file.mimetype))
                                throw new common_1.BadRequestException('File must be JPEG, PNG, or WebP');
                            if (file.size > MAX_COVER_BYTES)
                                throw new common_1.BadRequestException('Cover image must be under 5 MB');
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.ensureBucket(admin, 'promoter-images')];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, sharp(file.buffer)
                                    .resize(1200, 400, { fit: 'cover', position: 'centre' })
                                    .webp({ quality: 85 })
                                    .toBuffer()];
                        case 3:
                            processed = _a.sent();
                            path = "covers/".concat(userId, "-").concat(Date.now(), ".webp");
                            return [4 /*yield*/, admin.storage
                                    .from('promoter-images')
                                    .upload(path, processed, { contentType: 'image/webp', upsert: true })];
                        case 4:
                            uploadError = (_a.sent()).error;
                            if (uploadError)
                                throw new common_1.BadRequestException('Upload failed: ' + uploadError.message);
                            publicUrl = admin.storage.from('promoter-images').getPublicUrl(path).data.publicUrl;
                            return [2 /*return*/, { url: publicUrl }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // POST /upload/attachment
        // General file attachment for events, contracts, invoices
        // Accepts: PDF, Word, Excel, images — up to 20 MB
        // Returns: { url, fileName, mimeType, sizeBytes }
        // ─────────────────────────────────────────────
        UploadController_1.prototype.uploadAttachment = function (file, authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, MAX_BYTES, ALLOWED_ATTACHMENT_TYPES, admin, safeName, path, uploadError, publicUrl;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            if (!file)
                                throw new common_1.BadRequestException('No file provided');
                            MAX_BYTES = 20 * 1024 * 1024;
                            ALLOWED_ATTACHMENT_TYPES = [
                                'application/pdf',
                                'application/msword',
                                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                'application/vnd.ms-excel',
                                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                                'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
                                'text/plain',
                                'text/csv',
                            ];
                            if (!ALLOWED_ATTACHMENT_TYPES.includes(file.mimetype)) {
                                throw new common_1.BadRequestException('Unsupported file type. Allowed: PDF, Word, Excel, images, CSV, TXT');
                            }
                            if (file.size > MAX_BYTES) {
                                throw new common_1.BadRequestException('File must be under 20 MB');
                            }
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.ensureBucket(admin, 'attachments')];
                        case 2:
                            _a.sent();
                            safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
                            path = "".concat(userId, "/").concat(Date.now(), "-").concat(safeName);
                            return [4 /*yield*/, admin.storage
                                    .from('attachments')
                                    .upload(path, file.buffer, { contentType: file.mimetype, upsert: false })];
                        case 3:
                            uploadError = (_a.sent()).error;
                            if (uploadError)
                                throw new common_1.BadRequestException('Upload failed: ' + uploadError.message);
                            publicUrl = admin.storage.from('attachments').getPublicUrl(path).data.publicUrl;
                            return [2 /*return*/, {
                                    url: publicUrl,
                                    fileName: safeName,
                                    mimeType: file.mimetype,
                                    sizeBytes: file.size,
                                }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // POST /upload/event-image
        // Event flyer / banner image
        // Produces two sizes stored side-by-side:
        //   banner   — 1200 × 630 px (16:9 OG share)
        //   thumb    — 600  × 400 px (4:3 card thumbnail)
        // Max 8 MB, JPEG/PNG/WebP → converted to WebP
        // Returns: { url, thumbUrl }
        // ─────────────────────────────────────────────
        UploadController_1.prototype.uploadEventImage = function (file, authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, admin, stamp, banner, thumb, bannerPath, thumbPath, _a, bannerUpload, thumbUpload, publicUrl, thumbUrl;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _b.sent();
                            if (!file)
                                throw new common_1.BadRequestException('No file provided');
                            if (!ALLOWED_TYPES.includes(file.mimetype))
                                throw new common_1.BadRequestException('File must be JPEG, PNG, or WebP');
                            if (file.size > 8 * 1024 * 1024)
                                throw new common_1.BadRequestException('Image must be under 8 MB');
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.ensureBucket(admin, 'event-images')];
                        case 2:
                            _b.sent();
                            stamp = Date.now();
                            return [4 /*yield*/, sharp(file.buffer)
                                    .resize(1200, 630, { fit: 'cover', position: 'centre' })
                                    .webp({ quality: 85 })
                                    .toBuffer()];
                        case 3:
                            banner = _b.sent();
                            return [4 /*yield*/, sharp(file.buffer)
                                    .resize(600, 400, { fit: 'cover', position: 'centre' })
                                    .webp({ quality: 80 })
                                    .toBuffer()];
                        case 4:
                            thumb = _b.sent();
                            bannerPath = "banners/".concat(userId, "-").concat(stamp, ".webp");
                            thumbPath = "thumbs/".concat(userId, "-").concat(stamp, ".webp");
                            return [4 /*yield*/, Promise.all([
                                    admin.storage.from('event-images').upload(bannerPath, banner, { contentType: 'image/webp', upsert: true }),
                                    admin.storage.from('event-images').upload(thumbPath, thumb, { contentType: 'image/webp', upsert: true }),
                                ])];
                        case 5:
                            _a = _b.sent(), bannerUpload = _a[0], thumbUpload = _a[1];
                            if (bannerUpload.error)
                                throw new common_1.BadRequestException('Banner upload failed: ' + bannerUpload.error.message);
                            if (thumbUpload.error)
                                throw new common_1.BadRequestException('Thumb upload failed: ' + thumbUpload.error.message);
                            publicUrl = admin.storage.from('event-images').getPublicUrl(bannerPath).data.publicUrl;
                            thumbUrl = admin.storage.from('event-images').getPublicUrl(thumbPath).data.publicUrl;
                            return [2 /*return*/, { url: publicUrl, thumbUrl: thumbUrl }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // POST /upload/rsvp-invitation
        // RSVP invitation image (displayed on public RSVP page)
        // Max 2 images per event, max 5 MB each, JPEG/PNG/WebP
        // Recommended: 1200×800 px — landscape works best on mobile
        // Returns: { url }
        // Accepts: Bearer JWT (owner) OR x-client-token (client portal)
        // ─────────────────────────────────────────────
        UploadController_1.prototype.uploadRsvpInvitation = function (file, authorization, clientToken) {
            return __awaiter(this, void 0, void 0, function () {
                var uploaderId, session, admin, processed, path, uploadError, publicUrl;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!clientToken) return [3 /*break*/, 1];
                            session = this.clientAuthService.validateSession(clientToken);
                            uploaderId = session.phone.replace(/\D/g, '');
                            return [3 /*break*/, 3];
                        case 1: return [4 /*yield*/, this.getUserId(authorization)];
                        case 2:
                            uploaderId = _a.sent();
                            _a.label = 3;
                        case 3:
                            if (!file)
                                throw new common_1.BadRequestException('No file provided');
                            if (!ALLOWED_TYPES.includes(file.mimetype)) {
                                throw new common_1.BadRequestException('File must be JPEG, PNG, or WebP');
                            }
                            if (file.size > MAX_SERVICE_ITEM_BYTES) {
                                throw new common_1.BadRequestException('Image must be under 5 MB');
                            }
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.ensureBucket(admin, 'rsvp-invitations')];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, sharp(file.buffer)
                                    .resize(1200, 800, { fit: 'inside', withoutEnlargement: true })
                                    .webp({ quality: 85 })
                                    .toBuffer()];
                        case 5:
                            processed = _a.sent();
                            path = "invitations/".concat(uploaderId, "-").concat(Date.now(), ".webp");
                            return [4 /*yield*/, admin.storage
                                    .from('rsvp-invitations')
                                    .upload(path, processed, { contentType: 'image/webp', upsert: true })];
                        case 6:
                            uploadError = (_a.sent()).error;
                            if (uploadError)
                                throw new common_1.BadRequestException('Upload failed: ' + uploadError.message);
                            publicUrl = admin.storage.from('rsvp-invitations').getPublicUrl(path).data.publicUrl;
                            return [2 /*return*/, { url: publicUrl }];
                    }
                });
            });
        };
        return UploadController_1;
    }());
    __setFunctionName(_classThis, "UploadController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _uploadVendorLogo_decorators = [(0, common_1.Post)('vendor-logo'), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.memoryStorage)() }))];
        _uploadServiceItem_decorators = [(0, common_1.Post)('service-item'), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.memoryStorage)() }))];
        _uploadOwnerLogo_decorators = [(0, common_1.Post)('owner-logo'), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.memoryStorage)() }))];
        _uploadOwnerCover_decorators = [(0, common_1.Post)('owner-cover'), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.memoryStorage)() }))];
        _uploadVendorCover_decorators = [(0, common_1.Post)('vendor-cover'), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.memoryStorage)() }))];
        _uploadArtistLogo_decorators = [(0, common_1.Post)('artist-logo'), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.memoryStorage)() }))];
        _uploadArtistCover_decorators = [(0, common_1.Post)('artist-cover'), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.memoryStorage)() }))];
        _uploadPromoterLogo_decorators = [(0, common_1.Post)('promoter-logo'), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.memoryStorage)() }))];
        _uploadPromoterCover_decorators = [(0, common_1.Post)('promoter-cover'), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.memoryStorage)() }))];
        _uploadAttachment_decorators = [(0, common_1.Post)('attachment'), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.memoryStorage)() }))];
        _uploadEventImage_decorators = [(0, common_1.Post)('event-image'), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.memoryStorage)() }))];
        _uploadRsvpInvitation_decorators = [(0, common_1.Post)('rsvp-invitation'), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.memoryStorage)() }))];
        __esDecorate(_classThis, null, _uploadVendorLogo_decorators, { kind: "method", name: "uploadVendorLogo", static: false, private: false, access: { has: function (obj) { return "uploadVendorLogo" in obj; }, get: function (obj) { return obj.uploadVendorLogo; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _uploadServiceItem_decorators, { kind: "method", name: "uploadServiceItem", static: false, private: false, access: { has: function (obj) { return "uploadServiceItem" in obj; }, get: function (obj) { return obj.uploadServiceItem; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _uploadOwnerLogo_decorators, { kind: "method", name: "uploadOwnerLogo", static: false, private: false, access: { has: function (obj) { return "uploadOwnerLogo" in obj; }, get: function (obj) { return obj.uploadOwnerLogo; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _uploadOwnerCover_decorators, { kind: "method", name: "uploadOwnerCover", static: false, private: false, access: { has: function (obj) { return "uploadOwnerCover" in obj; }, get: function (obj) { return obj.uploadOwnerCover; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _uploadVendorCover_decorators, { kind: "method", name: "uploadVendorCover", static: false, private: false, access: { has: function (obj) { return "uploadVendorCover" in obj; }, get: function (obj) { return obj.uploadVendorCover; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _uploadArtistLogo_decorators, { kind: "method", name: "uploadArtistLogo", static: false, private: false, access: { has: function (obj) { return "uploadArtistLogo" in obj; }, get: function (obj) { return obj.uploadArtistLogo; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _uploadArtistCover_decorators, { kind: "method", name: "uploadArtistCover", static: false, private: false, access: { has: function (obj) { return "uploadArtistCover" in obj; }, get: function (obj) { return obj.uploadArtistCover; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _uploadPromoterLogo_decorators, { kind: "method", name: "uploadPromoterLogo", static: false, private: false, access: { has: function (obj) { return "uploadPromoterLogo" in obj; }, get: function (obj) { return obj.uploadPromoterLogo; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _uploadPromoterCover_decorators, { kind: "method", name: "uploadPromoterCover", static: false, private: false, access: { has: function (obj) { return "uploadPromoterCover" in obj; }, get: function (obj) { return obj.uploadPromoterCover; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _uploadAttachment_decorators, { kind: "method", name: "uploadAttachment", static: false, private: false, access: { has: function (obj) { return "uploadAttachment" in obj; }, get: function (obj) { return obj.uploadAttachment; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _uploadEventImage_decorators, { kind: "method", name: "uploadEventImage", static: false, private: false, access: { has: function (obj) { return "uploadEventImage" in obj; }, get: function (obj) { return obj.uploadEventImage; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _uploadRsvpInvitation_decorators, { kind: "method", name: "uploadRsvpInvitation", static: false, private: false, access: { has: function (obj) { return "uploadRsvpInvitation" in obj; }, get: function (obj) { return obj.uploadRsvpInvitation; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        UploadController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return UploadController = _classThis;
}();
exports.UploadController = UploadController;
