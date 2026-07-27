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
exports.ArtistBookingsService = void 0;
var common_1 = require("@nestjs/common");
var ArtistBookingsService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var ArtistBookingsService = _classThis = /** @class */ (function () {
        function ArtistBookingsService_1(supabaseService) {
            this.supabaseService = supabaseService;
            this.logger = new common_1.Logger(ArtistBookingsService.name);
        }
        // ─── Helper ───────────────────────────────────────────────────────────────
        ArtistBookingsService_1.prototype.getArtistAccountId = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('artist_accounts')
                                    .select('id')
                                    .eq('user_id', userId)
                                    .maybeSingle()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error || !data)
                                throw new common_1.ForbiddenException('No artist account found for this user');
                            return [2 /*return*/, data.id];
                    }
                });
            });
        };
        // ─── CRUD ─────────────────────────────────────────────────────────────────
        ArtistBookingsService_1.prototype.createBooking = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, artistAccountId, _a, data, error;
                var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
                return __generator(this, function (_o) {
                    switch (_o.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getArtistAccountId(userId)];
                        case 1:
                            artistAccountId = _o.sent();
                            return [4 /*yield*/, admin
                                    .from('artist_bookings')
                                    .insert({
                                    artist_account_id: artistAccountId,
                                    event_name: dto.event_name,
                                    client_name: dto.client_name,
                                    client_email: dto.client_email,
                                    client_phone: (_b = dto.client_phone) !== null && _b !== void 0 ? _b : null,
                                    event_date: (_c = dto.event_date) !== null && _c !== void 0 ? _c : null,
                                    event_start_time: (_d = dto.event_start_time) !== null && _d !== void 0 ? _d : null,
                                    event_end_time: (_e = dto.event_end_time) !== null && _e !== void 0 ? _e : null,
                                    venue_name: (_f = dto.venue_name) !== null && _f !== void 0 ? _f : null,
                                    venue_address: (_g = dto.venue_address) !== null && _g !== void 0 ? _g : null,
                                    agreed_amount: (_h = dto.agreed_amount) !== null && _h !== void 0 ? _h : null,
                                    deposit_amount: (_j = dto.deposit_amount) !== null && _j !== void 0 ? _j : null,
                                    notes: (_k = dto.notes) !== null && _k !== void 0 ? _k : null,
                                    artist_invoice_id: (_l = dto.artist_invoice_id) !== null && _l !== void 0 ? _l : null,
                                    status: 'inquiry',
                                })
                                    .select('*, artist_invoices(invoice_number, total_amount, status)')
                                    .single()];
                        case 2:
                            _a = _o.sent(), data = _a.data, error = _a.error;
                            if (error || !data)
                                throw new Error((_m = error === null || error === void 0 ? void 0 : error.message) !== null && _m !== void 0 ? _m : 'Failed to create booking');
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        ArtistBookingsService_1.prototype.listBookings = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, artistAccountId, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getArtistAccountId(userId)];
                        case 1:
                            artistAccountId = _b.sent();
                            return [4 /*yield*/, admin
                                    .from('artist_bookings')
                                    .select('*, artist_invoices(invoice_number, total_amount, status)')
                                    .eq('artist_account_id', artistAccountId)
                                    .order('event_date', { ascending: true, nullsFirst: false })];
                        case 2:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new Error(error.message);
                            return [2 /*return*/, data !== null && data !== void 0 ? data : []];
                    }
                });
            });
        };
        ArtistBookingsService_1.prototype.getBooking = function (userId, bookingId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, artistAccountId, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getArtistAccountId(userId)];
                        case 1:
                            artistAccountId = _b.sent();
                            return [4 /*yield*/, admin
                                    .from('artist_bookings')
                                    .select('*, artist_invoices(id, invoice_number, total_amount, amount_due, status, public_token)')
                                    .eq('id', bookingId)
                                    .eq('artist_account_id', artistAccountId)
                                    .single()];
                        case 2:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error || !data)
                                throw new common_1.NotFoundException('Booking not found');
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        ArtistBookingsService_1.prototype.updateBooking = function (userId, bookingId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, artistAccountId, existing, error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getArtistAccountId(userId)];
                        case 1:
                            artistAccountId = _a.sent();
                            return [4 /*yield*/, admin
                                    .from('artist_bookings')
                                    .select('id')
                                    .eq('id', bookingId)
                                    .eq('artist_account_id', artistAccountId)
                                    .single()];
                        case 2:
                            existing = (_a.sent()).data;
                            if (!existing)
                                throw new common_1.NotFoundException('Booking not found');
                            return [4 /*yield*/, admin
                                    .from('artist_bookings')
                                    .update(__assign(__assign({}, dto), { updated_at: new Date().toISOString() }))
                                    .eq('id', bookingId)];
                        case 3:
                            error = (_a.sent()).error;
                            if (error)
                                throw new Error(error.message);
                            return [2 /*return*/, this.getBooking(userId, bookingId)];
                    }
                });
            });
        };
        ArtistBookingsService_1.prototype.deleteBooking = function (userId, bookingId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, artistAccountId, error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getArtistAccountId(userId)];
                        case 1:
                            artistAccountId = _a.sent();
                            return [4 /*yield*/, admin
                                    .from('artist_bookings')
                                    .delete()
                                    .eq('id', bookingId)
                                    .eq('artist_account_id', artistAccountId)];
                        case 2:
                            error = (_a.sent()).error;
                            if (error)
                                throw new Error(error.message);
                            return [2 /*return*/, { success: true }];
                    }
                });
            });
        };
        return ArtistBookingsService_1;
    }());
    __setFunctionName(_classThis, "ArtistBookingsService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ArtistBookingsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ArtistBookingsService = _classThis;
}();
exports.ArtistBookingsService = ArtistBookingsService;
