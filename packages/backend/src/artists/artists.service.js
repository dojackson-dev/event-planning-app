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
exports.ArtistsService = void 0;
var common_1 = require("@nestjs/common");
var ArtistsService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var ArtistsService = _classThis = /** @class */ (function () {
        function ArtistsService_1(supabaseService) {
            this.supabaseService = supabaseService;
            this.logger = new common_1.Logger(ArtistsService.name);
        }
        // ─────────────────────────────────────────────
        // ARTIST ACCOUNT
        // ─────────────────────────────────────────────
        ArtistsService_1.prototype.createArtistAccount = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, existing, _a, data, error;
                var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
                return __generator(this, function (_z) {
                    switch (_z.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('artist_accounts')
                                    .select('id')
                                    .eq('user_id', userId)
                                    .maybeSingle()];
                        case 1:
                            existing = (_z.sent()).data;
                            if (existing) {
                                throw new common_1.BadRequestException('Artist account already exists for this user');
                            }
                            return [4 /*yield*/, admin
                                    .from('artist_accounts')
                                    .insert({
                                    user_id: userId,
                                    artist_name: dto.artistName,
                                    stage_name: (_b = dto.stageName) !== null && _b !== void 0 ? _b : null,
                                    agent_name: (_c = dto.agentName) !== null && _c !== void 0 ? _c : null,
                                    booking_contact_name: (_d = dto.bookingContactName) !== null && _d !== void 0 ? _d : null,
                                    booking_email: (_e = dto.bookingEmail) !== null && _e !== void 0 ? _e : null,
                                    booking_phone: (_f = dto.bookingPhone) !== null && _f !== void 0 ? _f : null,
                                    agency: (_g = dto.agency) !== null && _g !== void 0 ? _g : null,
                                    location: (_h = dto.location) !== null && _h !== void 0 ? _h : null,
                                    artist_type: dto.artistType,
                                    genres: (_j = dto.genres) !== null && _j !== void 0 ? _j : [],
                                    description: (_k = dto.description) !== null && _k !== void 0 ? _k : null,
                                    performance_fee_min: (_l = dto.performanceFeeMin) !== null && _l !== void 0 ? _l : null,
                                    performance_fee_max: (_m = dto.performanceFeeMax) !== null && _m !== void 0 ? _m : null,
                                    travel_availability: (_o = dto.travelAvailability) !== null && _o !== void 0 ? _o : null,
                                    set_length_minutes: (_p = dto.setLengthMinutes) !== null && _p !== void 0 ? _p : null,
                                    equipment_needs: (_q = dto.equipmentNeeds) !== null && _q !== void 0 ? _q : null,
                                    hospitality_requirements: (_r = dto.hospitalityRequirements) !== null && _r !== void 0 ? _r : null,
                                    profile_image_url: (_s = dto.profileImageUrl) !== null && _s !== void 0 ? _s : null,
                                    cover_image_url: (_t = dto.coverImageUrl) !== null && _t !== void 0 ? _t : null,
                                    website: (_u = dto.website) !== null && _u !== void 0 ? _u : null,
                                    instagram: (_v = dto.instagram) !== null && _v !== void 0 ? _v : null,
                                    youtube: (_w = dto.youtube) !== null && _w !== void 0 ? _w : null,
                                    spotify: (_x = dto.spotify) !== null && _x !== void 0 ? _x : null,
                                    epk_url: (_y = dto.epkUrl) !== null && _y !== void 0 ? _y : null,
                                    available_for_booking: true,
                                    is_active: true,
                                })
                                    .select()
                                    .single()];
                        case 2:
                            _a = _z.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            this.logger.log("Created artist account ".concat(data.id, " for user ").concat(userId));
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        ArtistsService_1.prototype.getArtistProfile = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('artist_accounts')
                                    .select('*')
                                    .eq('user_id', userId)
                                    .maybeSingle()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        ArtistsService_1.prototype.getArtistById = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('artist_accounts')
                                    .select('*')
                                    .eq('id', id)
                                    .eq('is_active', true)
                                    .maybeSingle()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error || !data)
                                throw new common_1.NotFoundException('Artist not found');
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        ArtistsService_1.prototype.updateArtistProfile = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, artist, update, _a, data, error;
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
                            artist = (_b.sent()).data;
                            if (!artist)
                                throw new common_1.NotFoundException('Artist account not found');
                            update = { updated_at: new Date().toISOString() };
                            if (dto.artistName !== undefined)
                                update.artist_name = dto.artistName;
                            if (dto.stageName !== undefined)
                                update.stage_name = dto.stageName;
                            if (dto.agentName !== undefined)
                                update.agent_name = dto.agentName;
                            if (dto.bookingContactName !== undefined)
                                update.booking_contact_name = dto.bookingContactName;
                            if (dto.bookingEmail !== undefined)
                                update.booking_email = dto.bookingEmail;
                            if (dto.bookingPhone !== undefined)
                                update.booking_phone = dto.bookingPhone;
                            if (dto.agency !== undefined)
                                update.agency = dto.agency;
                            if (dto.location !== undefined)
                                update.location = dto.location;
                            if (dto.artistType !== undefined)
                                update.artist_type = dto.artistType;
                            if (dto.genres !== undefined)
                                update.genres = dto.genres;
                            if (dto.description !== undefined)
                                update.description = dto.description;
                            if (dto.performanceFeeMin !== undefined)
                                update.performance_fee_min = dto.performanceFeeMin;
                            if (dto.performanceFeeMax !== undefined)
                                update.performance_fee_max = dto.performanceFeeMax;
                            if (dto.travelAvailability !== undefined)
                                update.travel_availability = dto.travelAvailability;
                            if (dto.setLengthMinutes !== undefined)
                                update.set_length_minutes = dto.setLengthMinutes;
                            if (dto.equipmentNeeds !== undefined)
                                update.equipment_needs = dto.equipmentNeeds;
                            if (dto.hospitalityRequirements !== undefined)
                                update.hospitality_requirements = dto.hospitalityRequirements;
                            if (dto.profileImageUrl !== undefined)
                                update.profile_image_url = dto.profileImageUrl;
                            if (dto.coverImageUrl !== undefined)
                                update.cover_image_url = dto.coverImageUrl;
                            if (dto.website !== undefined)
                                update.website = dto.website;
                            if (dto.instagram !== undefined)
                                update.instagram = dto.instagram;
                            if (dto.youtube !== undefined)
                                update.youtube = dto.youtube;
                            if (dto.spotify !== undefined)
                                update.spotify = dto.spotify;
                            if (dto.epkUrl !== undefined)
                                update.epk_url = dto.epkUrl;
                            if (dto.availableForBooking !== undefined)
                                update.available_for_booking = dto.availableForBooking;
                            return [4 /*yield*/, admin
                                    .from('artist_accounts')
                                    .update(update)
                                    .eq('id', artist.id)
                                    .select()
                                    .single()];
                        case 2:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // ARTIST DIRECTORY (owner/promoter discovery)
        // ─────────────────────────────────────────────
        ArtistsService_1.prototype.searchArtists = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, query, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            query = admin
                                .from('artist_accounts')
                                .select('id, artist_name, stage_name, artist_type, genres, location, profile_image_url, performance_fee_min, performance_fee_max, travel_availability, description, instagram, available_for_booking')
                                .eq('is_active', true);
                            if (dto.artistType) {
                                query = query.eq('artist_type', dto.artistType);
                            }
                            if (dto.location) {
                                query = query.ilike('location', "%".concat(dto.location, "%"));
                            }
                            if (dto.availableForBooking !== undefined) {
                                query = query.eq('available_for_booking', dto.availableForBooking);
                            }
                            if (dto.genre) {
                                query = query.contains('genres', [dto.genre]);
                            }
                            if (dto.travelAvailability) {
                                // 'National' and 'International' should also match when filtering for national/intl
                                if (dto.travelAvailability === 'Local') {
                                    query = query.eq('travel_availability', 'Local only');
                                }
                                else if (dto.travelAvailability === 'Regional') {
                                    query = query.in('travel_availability', ['Regional (within 200 miles)', 'National', 'International']);
                                }
                                else if (dto.travelAvailability === 'National') {
                                    query = query.in('travel_availability', ['National', 'International']);
                                }
                                else if (dto.travelAvailability === 'International') {
                                    query = query.eq('travel_availability', 'International');
                                }
                            }
                            return [4 /*yield*/, query.order('created_at', { ascending: false }).limit(100)];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, data !== null && data !== void 0 ? data : []];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // ARTIST RIDER
        // ─────────────────────────────────────────────
        ArtistsService_1.prototype.getRider = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, artist, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('artist_accounts')
                                    .select('id')
                                    .eq('user_id', userId)
                                    .maybeSingle()];
                        case 1:
                            artist = (_a.sent()).data;
                            if (!artist)
                                throw new common_1.NotFoundException('Artist account not found');
                            return [4 /*yield*/, admin
                                    .from('artist_riders')
                                    .select('*')
                                    .eq('artist_account_id', artist.id)
                                    .maybeSingle()];
                        case 2:
                            data = (_a.sent()).data;
                            return [2 /*return*/, data !== null && data !== void 0 ? data : null];
                    }
                });
            });
        };
        ArtistsService_1.prototype.upsertRider = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, artist, existing, payload, _a, data, error, _b, data, error;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('artist_accounts')
                                    .select('id')
                                    .eq('user_id', userId)
                                    .maybeSingle()];
                        case 1:
                            artist = (_c.sent()).data;
                            if (!artist)
                                throw new common_1.NotFoundException('Artist account not found');
                            return [4 /*yield*/, admin
                                    .from('artist_riders')
                                    .select('id')
                                    .eq('artist_account_id', artist.id)
                                    .maybeSingle()];
                        case 2:
                            existing = (_c.sent()).data;
                            payload = __assign(__assign({}, dto), { artist_account_id: artist.id, updated_at: new Date().toISOString() });
                            if (!existing) return [3 /*break*/, 4];
                            return [4 /*yield*/, admin
                                    .from('artist_riders')
                                    .update(payload)
                                    .eq('id', existing.id)
                                    .select()
                                    .single()];
                        case 3:
                            _a = _c.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, data];
                        case 4: return [4 /*yield*/, admin
                                .from('artist_riders')
                                .insert(payload)
                                .select()
                                .single()];
                        case 5:
                            _b = _c.sent(), data = _b.data, error = _b.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        ArtistsService_1.prototype.getPublicRider = function (artistId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('artist_riders')
                                    .select('*')
                                    .eq('artist_account_id', artistId)
                                    .maybeSingle()];
                        case 1:
                            data = (_a.sent()).data;
                            return [2 /*return*/, data !== null && data !== void 0 ? data : null];
                    }
                });
            });
        };
        ArtistsService_1.prototype.getArtistTypes = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, [
                            { value: 'musician', label: 'Musician / Band', icon: '🎵' },
                            { value: 'dj', label: 'DJ', icon: '🎧' },
                            { value: 'comedian', label: 'Comedian', icon: '🎤' },
                            { value: 'dancer', label: 'Dancer / Dance Group', icon: '💃' },
                            { value: 'magician', label: 'Magician', icon: '🎩' },
                            { value: 'spoken_word', label: 'Spoken Word / Poet', icon: '📖' },
                            { value: 'mc_host', label: 'MC / Host', icon: '🎙️' },
                            { value: 'other', label: 'Other', icon: '⭐' },
                        ]];
                });
            });
        };
        return ArtistsService_1;
    }());
    __setFunctionName(_classThis, "ArtistsService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ArtistsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ArtistsService = _classThis;
}();
exports.ArtistsService = ArtistsService;
