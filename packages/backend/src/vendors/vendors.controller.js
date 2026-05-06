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
exports.VendorsController = void 0;
var common_1 = require("@nestjs/common");
var VendorsController = function () {
    var _classDecorators = [(0, common_1.Controller)('vendors')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _getCategories_decorators;
    var _searchVendors_decorators;
    var _getAllVendors_decorators;
    var _reverseGeocode_decorators;
    var _geocodeAutocomplete_decorators;
    var _getVenue_decorators;
    var _getVendor_decorators;
    var _getVendorReviews_decorators;
    var _createVendorAccount_decorators;
    var _getMyVendorAccount_decorators;
    var _updateMyVendorAccount_decorators;
    var _createBooking_decorators;
    var _getMyBookings_decorators;
    var _getOwnerBookings_decorators;
    var _getBookingsByEvent_decorators;
    var _getBookingById_decorators;
    var _updateBooking_decorators;
    var _createReview_decorators;
    var _upsertBookingLink_decorators;
    var _getMyBookingLink_decorators;
    var _getMyBookingRequests_decorators;
    var _updateBookingRequest_decorators;
    var _getPublicBookingLink_decorators;
    var _submitBookingRequest_decorators;
    var VendorsController = _classThis = /** @class */ (function () {
        function VendorsController_1(vendorsService, supabaseService) {
            this.vendorsService = (__runInitializers(this, _instanceExtraInitializers), vendorsService);
            this.supabaseService = supabaseService;
            this.logger = new common_1.Logger(VendorsController.name);
        }
        // ─────────────────────────────────────────────
        // AUTH HELPERS
        // ─────────────────────────────────────────────
        VendorsController_1.prototype.getUserId = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var token, supabase, _a, user, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!authorization)
                                throw new common_1.UnauthorizedException('No authorization header');
                            token = authorization.replace('Bearer ', '');
                            if (token.startsWith('local-')) {
                                return [2 /*return*/, token.replace('local-', '')];
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
        VendorsController_1.prototype.getOwnerAccountId = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, membership, ownerAccount;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('memberships')
                                    .select('owner_account_id')
                                    .eq('user_id', userId)
                                    .eq('role', 'owner')
                                    .single()];
                        case 1:
                            membership = (_a.sent()).data;
                            if (membership === null || membership === void 0 ? void 0 : membership.owner_account_id)
                                return [2 /*return*/, membership.owner_account_id];
                            return [4 /*yield*/, admin
                                    .from('owner_accounts')
                                    .select('id')
                                    .eq('primary_owner_id', userId)
                                    .single()];
                        case 2:
                            ownerAccount = (_a.sent()).data;
                            return [2 /*return*/, (ownerAccount === null || ownerAccount === void 0 ? void 0 : ownerAccount.id) || null];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // PUBLIC ROUTES (no auth required)
        // ─────────────────────────────────────────────
        /** GET /vendors/categories */
        VendorsController_1.prototype.getCategories = function () {
            return this.vendorsService.getCategories();
        };
        /**
         * GET /vendors/search?lat=&lng=&radiusMiles=&category=
         * Search vendors by geo location
         */
        VendorsController_1.prototype.searchVendors = function (lat, lng, radiusMiles, category, zipCode) {
            return __awaiter(this, void 0, void 0, function () {
                var searchLat, searchLng, coords, _a, vendors_1, venues_1, vendors, venues;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            searchLat = lat ? parseFloat(lat) : null;
                            searchLng = lng ? parseFloat(lng) : null;
                            if (!(zipCode && (!searchLat || !searchLng))) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.vendorsService.geocodeZip(zipCode)];
                        case 1:
                            coords = _b.sent();
                            if (coords) {
                                searchLat = coords.lat;
                                searchLng = coords.lng;
                            }
                            _b.label = 2;
                        case 2:
                            if (!(!searchLat || !searchLng)) return [3 /*break*/, 4];
                            return [4 /*yield*/, Promise.all([
                                    this.vendorsService.getAllVendors(category),
                                    this.vendorsService.getAllVenues(),
                                ])];
                        case 3:
                            _a = _b.sent(), vendors_1 = _a[0], venues_1 = _a[1];
                            return [2 /*return*/, { vendors: vendors_1, venues: venues_1 }];
                        case 4: return [4 /*yield*/, this.vendorsService.searchVendors({
                                lat: searchLat,
                                lng: searchLng,
                                radiusMiles: radiusMiles ? parseInt(radiusMiles) : 30,
                                category: category,
                            })];
                        case 5:
                            vendors = _b.sent();
                            return [4 /*yield*/, this.vendorsService.searchVenuesByLocation(searchLat, searchLng, radiusMiles ? parseInt(radiusMiles) : 30)];
                        case 6:
                            venues = _b.sent();
                            return [2 /*return*/, { vendors: vendors, venues: venues }];
                    }
                });
            });
        };
        /** GET /vendors/public - list all active vendors + venues (no location filter) */
        VendorsController_1.prototype.getAllVendors = function (category) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, vendors, venues;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, Promise.all([
                                this.vendorsService.getAllVendors(category),
                                this.vendorsService.getAllVenues(),
                            ])];
                        case 1:
                            _a = _b.sent(), vendors = _a[0], venues = _a[1];
                            return [2 /*return*/, { vendors: vendors, venues: venues }];
                    }
                });
            });
        };
        /** GET /vendors/geocode/reverse?lat=&lng= — Reverse geocode coords to city/state/zip */
        VendorsController_1.prototype.reverseGeocode = function (lat, lng) {
            return __awaiter(this, void 0, void 0, function () {
                var result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!lat || !lng)
                                throw new common_1.BadRequestException('lat and lng are required');
                            return [4 /*yield*/, this.vendorsService.reverseGeocode(parseFloat(lat), parseFloat(lng))];
                        case 1:
                            result = _a.sent();
                            if (!result)
                                throw new common_1.BadRequestException('Could not reverse geocode the provided coordinates');
                            return [2 /*return*/, result];
                    }
                });
            });
        };
        /** GET /vendors/geocode/autocomplete?q= — Address autocomplete suggestions */
        VendorsController_1.prototype.geocodeAutocomplete = function (query) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (!query || query.length < 3)
                        return [2 /*return*/, []];
                    return [2 /*return*/, this.vendorsService.geocodeAutocomplete(query)];
                });
            });
        };
        /** GET /vendors/venue/:id - public venue profile */
        VendorsController_1.prototype.getVenue = function (venueId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.vendorsService.getVenueById(venueId)];
                });
            });
        };
        /** GET /vendors/:id - public vendor profile */
        VendorsController_1.prototype.getVendor = function (vendorId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.vendorsService.getVendorById(vendorId)];
                });
            });
        };
        /** GET /vendors/:id/reviews */
        VendorsController_1.prototype.getVendorReviews = function (vendorId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.vendorsService.getVendorReviews(vendorId)];
                });
            });
        };
        // ─────────────────────────────────────────────
        // AUTHENTICATED VENDOR ROUTES
        // ─────────────────────────────────────────────
        /** POST /vendors/account - create vendor account (registration) */
        VendorsController_1.prototype.createVendorAccount = function (authorization, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.vendorsService.createVendorAccount(userId, dto)];
                    }
                });
            });
        };
        /** GET /vendors/account/me - get own vendor profile */
        VendorsController_1.prototype.getMyVendorAccount = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.vendorsService.getVendorByUserId(userId)];
                    }
                });
            });
        };
        /** PUT /vendors/account/me - update own vendor profile */
        VendorsController_1.prototype.updateMyVendorAccount = function (authorization, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.vendorsService.updateVendorAccount(userId, dto)];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // VENDOR BOOKING ROUTES
        // ─────────────────────────────────────────────
        /**
         * POST /vendors/bookings - owner or client creates a booking
         */
        VendorsController_1.prototype.createBooking = function (authorization, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, ownerAccountId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [4 /*yield*/, this.getOwnerAccountId(userId)];
                        case 2:
                            ownerAccountId = _a.sent();
                            this.logger.log("POST /vendors/bookings \u2014 userId=".concat(userId, ", ownerAccountId=").concat(ownerAccountId, ", vendorAccountId=").concat(dto === null || dto === void 0 ? void 0 : dto.vendorAccountId));
                            this.logger.log("POST /vendors/bookings \u2014 dto: ".concat(JSON.stringify(dto)));
                            return [2 /*return*/, this.vendorsService.createVendorBooking(userId, dto, ownerAccountId || undefined)];
                    }
                });
            });
        };
        /**
         * GET /vendors/bookings/mine - vendor sees their own bookings
         */
        VendorsController_1.prototype.getMyBookings = function (authorization, status) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.vendorsService.getVendorBookings(userId, status)];
                    }
                });
            });
        };
        /**
         * GET /vendors/bookings/owner - owner sees all vendor bookings they made
         */
        VendorsController_1.prototype.getOwnerBookings = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, ownerAccountId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [4 /*yield*/, this.getOwnerAccountId(userId)];
                        case 2:
                            ownerAccountId = _a.sent();
                            if (!ownerAccountId)
                                throw new common_1.UnauthorizedException('Not an owner account');
                            return [2 /*return*/, this.vendorsService.getOwnerVendorBookings(ownerAccountId)];
                    }
                });
            });
        };
        /**
         * GET /vendors/bookings/by-event/:eventId - vendor bookings for a specific event
         */
        VendorsController_1.prototype.getBookingsByEvent = function (authorization, eventId) {
            return __awaiter(this, void 0, void 0, function () {
                var userId, ownerAccountId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [4 /*yield*/, this.getOwnerAccountId(userId)];
                        case 2:
                            ownerAccountId = _a.sent();
                            if (!ownerAccountId)
                                return [2 /*return*/, []];
                            return [2 /*return*/, this.vendorsService.getOwnerVendorBookingsByEvent(eventId, ownerAccountId)];
                    }
                });
            });
        };
        /**
         * GET /vendors/bookings/:id - get single vendor booking by ID
         * NOTE: must be defined after literal routes (mine, owner, by-event)
         */
        VendorsController_1.prototype.getBookingById = function (authorization, bookingId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, this.vendorsService.getVendorBookingById(bookingId)];
                    }
                });
            });
        };
        /**
         * PUT /vendors/bookings/:id - update booking status
         */
        VendorsController_1.prototype.updateBooking = function (authorization, bookingId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.vendorsService.updateVendorBooking(bookingId, userId, dto)];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // REVIEWS
        // ─────────────────────────────────────────────
        /** POST /vendors/reviews */
        VendorsController_1.prototype.createReview = function (authorization, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.vendorsService.createReview(userId, dto)];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // BOOKING LINKS
        // ─────────────────────────────────────────────
        /** POST /vendors/booking-links — Create or update vendor booking link */
        VendorsController_1.prototype.upsertBookingLink = function (authorization, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.vendorsService.upsertBookingLink(userId, dto)];
                    }
                });
            });
        };
        /** GET /vendors/booking-links/mine — Get my booking link */
        VendorsController_1.prototype.getMyBookingLink = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.vendorsService.getMyBookingLink(userId)];
                    }
                });
            });
        };
        /** GET /vendors/booking-requests/mine — Get my booking requests */
        VendorsController_1.prototype.getMyBookingRequests = function (authorization) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.vendorsService.getMyBookingRequests(userId)];
                    }
                });
            });
        };
        /** PUT /vendors/booking-requests/:id — Update booking request status */
        VendorsController_1.prototype.updateBookingRequest = function (authorization, requestId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var userId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getUserId(authorization)];
                        case 1:
                            userId = _a.sent();
                            return [2 /*return*/, this.vendorsService.updateBookingRequest(userId, requestId, dto)];
                    }
                });
            });
        };
        /** GET /vendors/booking-link/:slug — Public: view booking link (no auth) */
        VendorsController_1.prototype.getPublicBookingLink = function (slug) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.vendorsService.getPublicBookingLink(slug)];
                });
            });
        };
        /** POST /vendors/booking-link/:slug/request — Public: submit booking request */
        VendorsController_1.prototype.submitBookingRequest = function (slug, dto) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.vendorsService.submitBookingRequest(slug, dto)];
                });
            });
        };
        return VendorsController_1;
    }());
    __setFunctionName(_classThis, "VendorsController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getCategories_decorators = [(0, common_1.Get)('categories')];
        _searchVendors_decorators = [(0, common_1.Get)('search')];
        _getAllVendors_decorators = [(0, common_1.Get)('public')];
        _reverseGeocode_decorators = [(0, common_1.Get)('geocode/reverse')];
        _geocodeAutocomplete_decorators = [(0, common_1.Get)('geocode/autocomplete')];
        _getVenue_decorators = [(0, common_1.Get)('venue/:id')];
        _getVendor_decorators = [(0, common_1.Get)(':id')];
        _getVendorReviews_decorators = [(0, common_1.Get)(':id/reviews')];
        _createVendorAccount_decorators = [(0, common_1.Post)('account')];
        _getMyVendorAccount_decorators = [(0, common_1.Get)('account/me')];
        _updateMyVendorAccount_decorators = [(0, common_1.Put)('account/me')];
        _createBooking_decorators = [(0, common_1.Post)('bookings')];
        _getMyBookings_decorators = [(0, common_1.Get)('bookings/mine')];
        _getOwnerBookings_decorators = [(0, common_1.Get)('bookings/owner')];
        _getBookingsByEvent_decorators = [(0, common_1.Get)('bookings/by-event/:eventId')];
        _getBookingById_decorators = [(0, common_1.Get)('bookings/:id')];
        _updateBooking_decorators = [(0, common_1.Put)('bookings/:id')];
        _createReview_decorators = [(0, common_1.Post)('reviews')];
        _upsertBookingLink_decorators = [(0, common_1.Post)('booking-links')];
        _getMyBookingLink_decorators = [(0, common_1.Get)('booking-links/mine')];
        _getMyBookingRequests_decorators = [(0, common_1.Get)('booking-requests/mine')];
        _updateBookingRequest_decorators = [(0, common_1.Put)('booking-requests/:id')];
        _getPublicBookingLink_decorators = [(0, common_1.Get)('booking-link/:slug')];
        _submitBookingRequest_decorators = [(0, common_1.Post)('booking-link/:slug/request')];
        __esDecorate(_classThis, null, _getCategories_decorators, { kind: "method", name: "getCategories", static: false, private: false, access: { has: function (obj) { return "getCategories" in obj; }, get: function (obj) { return obj.getCategories; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _searchVendors_decorators, { kind: "method", name: "searchVendors", static: false, private: false, access: { has: function (obj) { return "searchVendors" in obj; }, get: function (obj) { return obj.searchVendors; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getAllVendors_decorators, { kind: "method", name: "getAllVendors", static: false, private: false, access: { has: function (obj) { return "getAllVendors" in obj; }, get: function (obj) { return obj.getAllVendors; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _reverseGeocode_decorators, { kind: "method", name: "reverseGeocode", static: false, private: false, access: { has: function (obj) { return "reverseGeocode" in obj; }, get: function (obj) { return obj.reverseGeocode; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _geocodeAutocomplete_decorators, { kind: "method", name: "geocodeAutocomplete", static: false, private: false, access: { has: function (obj) { return "geocodeAutocomplete" in obj; }, get: function (obj) { return obj.geocodeAutocomplete; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getVenue_decorators, { kind: "method", name: "getVenue", static: false, private: false, access: { has: function (obj) { return "getVenue" in obj; }, get: function (obj) { return obj.getVenue; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getVendor_decorators, { kind: "method", name: "getVendor", static: false, private: false, access: { has: function (obj) { return "getVendor" in obj; }, get: function (obj) { return obj.getVendor; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getVendorReviews_decorators, { kind: "method", name: "getVendorReviews", static: false, private: false, access: { has: function (obj) { return "getVendorReviews" in obj; }, get: function (obj) { return obj.getVendorReviews; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createVendorAccount_decorators, { kind: "method", name: "createVendorAccount", static: false, private: false, access: { has: function (obj) { return "createVendorAccount" in obj; }, get: function (obj) { return obj.createVendorAccount; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMyVendorAccount_decorators, { kind: "method", name: "getMyVendorAccount", static: false, private: false, access: { has: function (obj) { return "getMyVendorAccount" in obj; }, get: function (obj) { return obj.getMyVendorAccount; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateMyVendorAccount_decorators, { kind: "method", name: "updateMyVendorAccount", static: false, private: false, access: { has: function (obj) { return "updateMyVendorAccount" in obj; }, get: function (obj) { return obj.updateMyVendorAccount; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createBooking_decorators, { kind: "method", name: "createBooking", static: false, private: false, access: { has: function (obj) { return "createBooking" in obj; }, get: function (obj) { return obj.createBooking; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMyBookings_decorators, { kind: "method", name: "getMyBookings", static: false, private: false, access: { has: function (obj) { return "getMyBookings" in obj; }, get: function (obj) { return obj.getMyBookings; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getOwnerBookings_decorators, { kind: "method", name: "getOwnerBookings", static: false, private: false, access: { has: function (obj) { return "getOwnerBookings" in obj; }, get: function (obj) { return obj.getOwnerBookings; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getBookingsByEvent_decorators, { kind: "method", name: "getBookingsByEvent", static: false, private: false, access: { has: function (obj) { return "getBookingsByEvent" in obj; }, get: function (obj) { return obj.getBookingsByEvent; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getBookingById_decorators, { kind: "method", name: "getBookingById", static: false, private: false, access: { has: function (obj) { return "getBookingById" in obj; }, get: function (obj) { return obj.getBookingById; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateBooking_decorators, { kind: "method", name: "updateBooking", static: false, private: false, access: { has: function (obj) { return "updateBooking" in obj; }, get: function (obj) { return obj.updateBooking; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createReview_decorators, { kind: "method", name: "createReview", static: false, private: false, access: { has: function (obj) { return "createReview" in obj; }, get: function (obj) { return obj.createReview; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _upsertBookingLink_decorators, { kind: "method", name: "upsertBookingLink", static: false, private: false, access: { has: function (obj) { return "upsertBookingLink" in obj; }, get: function (obj) { return obj.upsertBookingLink; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMyBookingLink_decorators, { kind: "method", name: "getMyBookingLink", static: false, private: false, access: { has: function (obj) { return "getMyBookingLink" in obj; }, get: function (obj) { return obj.getMyBookingLink; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMyBookingRequests_decorators, { kind: "method", name: "getMyBookingRequests", static: false, private: false, access: { has: function (obj) { return "getMyBookingRequests" in obj; }, get: function (obj) { return obj.getMyBookingRequests; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateBookingRequest_decorators, { kind: "method", name: "updateBookingRequest", static: false, private: false, access: { has: function (obj) { return "updateBookingRequest" in obj; }, get: function (obj) { return obj.updateBookingRequest; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getPublicBookingLink_decorators, { kind: "method", name: "getPublicBookingLink", static: false, private: false, access: { has: function (obj) { return "getPublicBookingLink" in obj; }, get: function (obj) { return obj.getPublicBookingLink; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _submitBookingRequest_decorators, { kind: "method", name: "submitBookingRequest", static: false, private: false, access: { has: function (obj) { return "submitBookingRequest" in obj; }, get: function (obj) { return obj.submitBookingRequest; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        VendorsController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return VendorsController = _classThis;
}();
exports.VendorsController = VendorsController;
