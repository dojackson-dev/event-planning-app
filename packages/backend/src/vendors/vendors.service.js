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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorsService = void 0;
var common_1 = require("@nestjs/common");
function normalizePhone(phone) {
    if (!phone)
        return null;
    var digits = phone.replace(/\D/g, '');
    if (phone.match(/^\+1\d{10}$/))
        return phone;
    if (digits.length === 10)
        return "+1".concat(digits);
    if (digits.length === 11 && digits.startsWith('1'))
        return "+".concat(digits);
    return phone;
}
var VendorsService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var VendorsService = _classThis = /** @class */ (function () {
        function VendorsService_1(supabaseService, smsNotifications) {
            this.supabaseService = supabaseService;
            this.smsNotifications = smsNotifications;
            this.logger = new common_1.Logger(VendorsService.name);
        }
        // ─────────────────────────────────────────────
        // VENDOR ACCOUNT
        // ─────────────────────────────────────────────
        VendorsService_1.prototype.createVendorAccount = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, existing, _a, data, error;
                var _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('vendor_accounts')
                                    .select('id')
                                    .eq('user_id', userId)
                                    .single()];
                        case 1:
                            existing = (_e.sent()).data;
                            if (existing) {
                                throw new common_1.BadRequestException('Vendor account already exists for this user');
                            }
                            return [4 /*yield*/, admin
                                    .from('vendor_accounts')
                                    .insert({
                                    user_id: userId,
                                    business_name: dto.businessName,
                                    category: ((_b = dto.categories) === null || _b === void 0 ? void 0 : _b.length) ? dto.categories[0] : ((_c = dto.category) !== null && _c !== void 0 ? _c : null),
                                    categories: (_d = dto.categories) !== null && _d !== void 0 ? _d : (dto.category ? [dto.category] : []),
                                    bio: dto.bio,
                                    website: dto.website,
                                    instagram: dto.instagram,
                                    facebook: dto.facebook,
                                    phone: normalizePhone(dto.phone),
                                    email: dto.email,
                                    address: dto.address,
                                    city: dto.city,
                                    state: dto.state,
                                    zip_code: dto.zipCode,
                                    latitude: dto.latitude,
                                    longitude: dto.longitude,
                                    hourly_rate: dto.hourlyRate,
                                    flat_rate: dto.flatRate,
                                    rate_description: dto.rateDescription,
                                    is_active: true,
                                })
                                    .select()
                                    .single()];
                        case 2:
                            _a = _e.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            // Update user role to vendor
                            return [4 /*yield*/, admin
                                    .from('users')
                                    .update({ role: 'vendor' })
                                    .eq('id', userId)];
                        case 3:
                            // Update user role to vendor
                            _e.sent();
                            this.logger.log("Vendor account created for user ".concat(userId, ": ").concat(dto.businessName));
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        VendorsService_1.prototype.getVendorByUserId = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('vendor_accounts')
                                    .select('*, vendor_reviews(rating)')
                                    .eq('user_id', userId)
                                    .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error || !data)
                                throw new common_1.NotFoundException('Vendor account not found');
                            return [2 /*return*/, this.enrichWithRating(data)];
                    }
                });
            });
        };
        VendorsService_1.prototype.getVendorById = function (vendorId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('vendor_accounts')
                                    .select('*, vendor_reviews(id, rating, review_text, created_at, reviewer_user_id), vendor_gallery(id, image_url, caption, display_order)')
                                    .eq('id', vendorId)
                                    .eq('is_active', true)
                                    .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error || !data)
                                throw new common_1.NotFoundException('Vendor not found');
                            return [2 /*return*/, this.enrichWithRating(data)];
                    }
                });
            });
        };
        VendorsService_1.prototype.updateVendorAccount = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, vendor, updatePayload, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('vendor_accounts')
                                    .select('id')
                                    .eq('user_id', userId)
                                    .single()];
                        case 1:
                            vendor = (_b.sent()).data;
                            if (!vendor)
                                throw new common_1.NotFoundException('Vendor account not found');
                            updatePayload = {};
                            if (dto.businessName !== undefined)
                                updatePayload.business_name = dto.businessName;
                            if (dto.categories !== undefined) {
                                updatePayload.categories = dto.categories;
                                updatePayload.category = dto.categories.length ? dto.categories[0] : null;
                            }
                            else if (dto.category !== undefined) {
                                updatePayload.category = dto.category;
                            }
                            if (dto.bio !== undefined)
                                updatePayload.bio = dto.bio;
                            if (dto.website !== undefined)
                                updatePayload.website = dto.website;
                            if (dto.instagram !== undefined)
                                updatePayload.instagram = dto.instagram;
                            if (dto.facebook !== undefined)
                                updatePayload.facebook = dto.facebook;
                            if (dto.phone !== undefined)
                                updatePayload.phone = normalizePhone(dto.phone);
                            if (dto.email !== undefined)
                                updatePayload.email = dto.email;
                            if (dto.address !== undefined)
                                updatePayload.address = dto.address;
                            if (dto.city !== undefined)
                                updatePayload.city = dto.city;
                            if (dto.state !== undefined)
                                updatePayload.state = dto.state;
                            if (dto.zipCode !== undefined)
                                updatePayload.zip_code = dto.zipCode;
                            if (dto.latitude !== undefined)
                                updatePayload.latitude = dto.latitude;
                            if (dto.longitude !== undefined)
                                updatePayload.longitude = dto.longitude;
                            if (dto.hourlyRate !== undefined)
                                updatePayload.hourly_rate = dto.hourlyRate;
                            if (dto.flatRate !== undefined)
                                updatePayload.flat_rate = dto.flatRate;
                            if (dto.rateDescription !== undefined)
                                updatePayload.rate_description = dto.rateDescription;
                            if (dto.profileImageUrl !== undefined)
                                updatePayload.profile_image_url = dto.profileImageUrl;
                            if (dto.coverImageUrl !== undefined)
                                updatePayload.cover_image_url = dto.coverImageUrl;
                            updatePayload.updated_at = new Date().toISOString();
                            return [4 /*yield*/, admin
                                    .from('vendor_accounts')
                                    .update(updatePayload)
                                    .eq('id', vendor.id)
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
        // VENDOR SEARCH
        // ─────────────────────────────────────────────
        VendorsService_1.prototype.searchVendors = function (searchDto) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, radius, _a, vendors, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            radius = searchDto.radiusMiles || 30;
                            return [4 /*yield*/, admin.rpc('search_vendors_by_location', {
                                    search_lat: searchDto.lat,
                                    search_lng: searchDto.lng,
                                    radius_miles: radius,
                                    filter_category: searchDto.category || null,
                                })];
                        case 1:
                            _a = _b.sent(), vendors = _a.data, error = _a.error;
                            if (error) {
                                this.logger.error('Vendor geo search error:', error);
                                throw new common_1.BadRequestException('Search failed: ' + error.message);
                            }
                            return [2 /*return*/, vendors || []];
                    }
                });
            });
        };
        VendorsService_1.prototype.searchVenuesByLocation = function (lat_1, lng_1) {
            return __awaiter(this, arguments, void 0, function (lat, lng, radiusMiles) {
                var admin, _a, venues, error;
                if (radiusMiles === void 0) { radiusMiles = 30; }
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin.rpc('search_venues_by_location', {
                                    search_lat: lat,
                                    search_lng: lng,
                                    radius_miles: radiusMiles,
                                })];
                        case 1:
                            _a = _b.sent(), venues = _a.data, error = _a.error;
                            if (error) {
                                this.logger.error('Venue geo search error:', error);
                                throw new common_1.BadRequestException('Venue search failed: ' + error.message);
                            }
                            return [2 /*return*/, venues || []];
                    }
                });
            });
        };
        VendorsService_1.prototype.getAllVendors = function (category) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, query, _a, data, error;
                var _this = this;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            query = admin
                                .from('vendor_accounts')
                                .select('id, business_name, category, bio, city, state, zip_code, profile_image_url, hourly_rate, flat_rate, rate_description, phone, email, website, instagram, facebook, is_verified, vendor_reviews(rating)')
                                .or('is_active.is.null,is_active.eq.true')
                                .order('business_name');
                            if (category) {
                                query = query.eq('category', category);
                            }
                            return [4 /*yield*/, query];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, (data || []).map(function (v) { return _this.enrichWithRating(v); })];
                    }
                });
            });
        };
        VendorsService_1.prototype.getAllVenues = function () {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('venues')
                                    .select('id, name, address, city, state, zip_code, capacity, description, profile_image_url, website, phone, latitude, longitude')
                                    .not('name', 'is', null)
                                    .order('name')];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error) {
                                this.logger.error('getAllVenues error:', error.message);
                                return [2 /*return*/, []];
                            }
                            return [2 /*return*/, data || []];
                    }
                });
            });
        };
        VendorsService_1.prototype.getVenueById = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('venues')
                                    .select('id, name, address, city, state, zip_code, capacity, description, profile_image_url, website, phone, latitude, longitude, owner_account_id')
                                    .eq('id', id)
                                    .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error || !data) {
                                throw new common_1.NotFoundException('Venue not found');
                            }
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // VENDOR BOOKINGS
        // ─────────────────────────────────────────────
        VendorsService_1.prototype.createVendorBooking = function (bookedByUserId, dto, ownerAccountId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, vendor, vendorPhone, vendorUser, _a, data, error, dateStr, smsErr_1, invErr_1;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('vendor_accounts')
                                    .select('id, business_name, phone, user_id')
                                    .eq('id', dto.vendorAccountId)
                                    .eq('is_active', true)
                                    .single()];
                        case 1:
                            vendor = (_b.sent()).data;
                            if (!vendor)
                                throw new common_1.NotFoundException('Vendor not found');
                            vendorPhone = vendor.phone || null;
                            if (!(!vendorPhone && vendor.user_id)) return [3 /*break*/, 4];
                            return [4 /*yield*/, admin
                                    .from('users')
                                    .select('phone_number')
                                    .eq('id', vendor.user_id)
                                    .single()];
                        case 2:
                            vendorUser = (_b.sent()).data;
                            if (!(vendorUser === null || vendorUser === void 0 ? void 0 : vendorUser.phone_number)) return [3 /*break*/, 4];
                            vendorPhone = normalizePhone(vendorUser.phone_number);
                            // Backfill vendor_accounts.phone so future lookups don't need the extra query
                            return [4 /*yield*/, admin
                                    .from('vendor_accounts')
                                    .update({ phone: vendorPhone })
                                    .eq('id', vendor.id)];
                        case 3:
                            // Backfill vendor_accounts.phone so future lookups don't need the extra query
                            _b.sent();
                            this.logger.log("Backfilled phone ".concat(vendorPhone, " for vendor ").concat(vendor.business_name));
                            _b.label = 4;
                        case 4: return [4 /*yield*/, admin
                                .from('vendor_bookings')
                                .insert({
                                vendor_account_id: dto.vendorAccountId,
                                owner_account_id: ownerAccountId || null,
                                booked_by_user_id: bookedByUserId,
                                event_id: dto.eventId || null,
                                event_name: dto.eventName,
                                event_date: dto.eventDate,
                                start_time: dto.startTime || null,
                                end_time: dto.endTime || null,
                                venue_name: dto.venueName || null,
                                venue_address: dto.venueAddress || null,
                                notes: dto.notes || null,
                                agreed_amount: dto.agreedAmount || null,
                                deposit_amount: dto.depositAmount || null,
                                client_name: dto.clientName || null,
                                client_email: dto.clientEmail || null,
                                client_phone: normalizePhone(dto.clientPhone) || null,
                                status: 'pending',
                            })
                                .select()
                                .single()];
                        case 5:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error) {
                                this.logger.error("Vendor booking insert failed: ".concat(JSON.stringify({ code: error.code, message: error.message, details: error.details, hint: error.hint })));
                                this.logger.error("Insert payload: vendor=".concat(dto.vendorAccountId, ", owner=").concat(ownerAccountId, ", user=").concat(bookedByUserId, ", event=").concat(dto.eventName, ", date=").concat(dto.eventDate));
                                throw new common_1.BadRequestException(error.message);
                            }
                            this.logger.log("Vendor booking created: vendor ".concat(dto.vendorAccountId, " by user ").concat(bookedByUserId));
                            if (!vendorPhone) return [3 /*break*/, 10];
                            dateStr = new Date(dto.eventDate + 'T00:00:00').toLocaleDateString('en-US', {
                                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                            });
                            _b.label = 6;
                        case 6:
                            _b.trys.push([6, 8, , 9]);
                            return [4 /*yield*/, this.smsNotifications.vendorBookingCreated(vendorPhone, vendor.business_name, dto.eventName, dateStr, dto.agreedAmount ? Number(dto.agreedAmount) : undefined)];
                        case 7:
                            _b.sent();
                            this.logger.log("SMS sent to vendor ".concat(vendor.business_name, " at ").concat(vendorPhone));
                            return [3 /*break*/, 9];
                        case 8:
                            smsErr_1 = _b.sent();
                            // Don't fail the booking if SMS fails
                            this.logger.warn("Failed to send SMS to vendor ".concat(vendor.business_name, ": ").concat(smsErr_1.message));
                            return [3 /*break*/, 9];
                        case 9: return [3 /*break*/, 11];
                        case 10:
                            this.logger.warn("No phone number for vendor ".concat(vendor.business_name, " (").concat(vendor.id, ") \u2014 SMS skipped"));
                            _b.label = 11;
                        case 11:
                            if (!(ownerAccountId && dto.agreedAmount && Number(dto.agreedAmount) > 0)) return [3 /*break*/, 15];
                            _b.label = 12;
                        case 12:
                            _b.trys.push([12, 14, , 15]);
                            return [4 /*yield*/, this.autoCreateOwnerBookingInvoice(data.id, vendor, dto, ownerAccountId, bookedByUserId)];
                        case 13:
                            _b.sent();
                            this.logger.log("Owner booking invoice auto-created for booking ".concat(data.id));
                            return [3 /*break*/, 15];
                        case 14:
                            invErr_1 = _b.sent();
                            this.logger.warn("Failed to auto-create owner booking invoice: ".concat(invErr_1.message));
                            return [3 /*break*/, 15];
                        case 15: return [2 /*return*/, data];
                    }
                });
            });
        };
        /**
         * Auto-creates a vendor_invoice of type 'owner_booking' when an owner books a vendor.
         * The invoice is from the vendor → to the owner. Fee: 1.5% above Stripe (platform takes 1.5%).
         */
        VendorsService_1.prototype.autoCreateOwnerBookingInvoice = function (bookingId, vendor, dto, ownerAccountId, ownerUserId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, user, userErr, ownerName, year, count, seq, invoiceNumber, amount, issueDate, due, dueDate, _b, invoice, invErr;
                var _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin.auth.admin.getUserById(ownerUserId)];
                        case 1:
                            _a = _f.sent(), user = _a.data.user, userErr = _a.error;
                            if (userErr || !(user === null || user === void 0 ? void 0 : user.email))
                                throw new Error('Could not resolve owner email');
                            ownerName = [
                                (_c = user.user_metadata) === null || _c === void 0 ? void 0 : _c.first_name,
                                (_d = user.user_metadata) === null || _d === void 0 ? void 0 : _d.last_name,
                            ].filter(Boolean).join(' ') || user.email;
                            year = new Date().getFullYear();
                            return [4 /*yield*/, admin
                                    .from('vendor_invoices')
                                    .select('*', { count: 'exact', head: true })];
                        case 2:
                            count = (_f.sent()).count;
                            seq = String((count !== null && count !== void 0 ? count : 0) + 1).padStart(5, '0');
                            invoiceNumber = "BINV-".concat(year, "-").concat(seq);
                            amount = Number(dto.agreedAmount);
                            issueDate = new Date().toISOString().split('T')[0];
                            due = new Date();
                            due.setDate(due.getDate() + 14);
                            dueDate = due.toISOString().split('T')[0];
                            return [4 /*yield*/, admin
                                    .from('vendor_invoices')
                                    .insert({
                                    vendor_account_id: vendor.id,
                                    invoice_number: invoiceNumber,
                                    client_name: ownerName,
                                    client_email: user.email,
                                    issue_date: issueDate,
                                    due_date: dueDate,
                                    subtotal: amount,
                                    tax_rate: 0,
                                    tax_amount: 0,
                                    discount_amount: 0,
                                    total_amount: amount,
                                    amount_due: amount,
                                    amount_paid: 0,
                                    status: 'sent',
                                    invoice_type: 'owner_booking',
                                    owner_account_id: ownerAccountId,
                                    vendor_booking_id: bookingId,
                                    notes: "Auto-generated invoice for vendor booking: ".concat(dto.eventName, " on ").concat(dto.eventDate),
                                })
                                    .select()
                                    .single()];
                        case 3:
                            _b = _f.sent(), invoice = _b.data, invErr = _b.error;
                            if (invErr || !invoice)
                                throw new Error((_e = invErr === null || invErr === void 0 ? void 0 : invErr.message) !== null && _e !== void 0 ? _e : 'Failed to insert owner booking invoice');
                            return [4 /*yield*/, admin.from('vendor_invoice_items').insert({
                                    vendor_invoice_id: invoice.id,
                                    description: "Vendor Services \u2014 ".concat(vendor.business_name, " \u00B7 ").concat(dto.eventName, " (").concat(dto.eventDate, ")"),
                                    quantity: 1,
                                    unit_price: amount,
                                    amount: amount,
                                })];
                        case 4:
                            _f.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        VendorsService_1.prototype.getVendorBookings = function (vendorUserId, status) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, vendor, query, _a, data, error, rows;
                var _this = this;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('vendor_accounts')
                                    .select('id')
                                    .eq('user_id', vendorUserId)
                                    .single()];
                        case 1:
                            vendor = (_b.sent()).data;
                            if (!vendor)
                                return [2 /*return*/, []]; // user has no vendor account — return empty instead of 404
                            query = admin
                                .from('vendor_bookings')
                                .select('*, vendor_invoices(id, status, invoice_type, vendor_booking_id)')
                                .eq('vendor_account_id', vendor.id)
                                .order('event_date', { ascending: true });
                            if (status && status !== 'paid') {
                                query = query.eq('status', status);
                            }
                            return [4 /*yield*/, query];
                        case 2:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            rows = (data || []).map(function (b) {
                                var _a;
                                var invoices = (_a = b.vendor_invoices) !== null && _a !== void 0 ? _a : [];
                                var hasPaidInvoice = invoices.some(function (inv) { return inv.invoice_type === 'owner_booking' && inv.status === 'paid' && inv.vendor_booking_id === b.id; });
                                var effectiveStatus = hasPaidInvoice ? 'paid' : b.status;
                                // If effective status changed, backfill the DB row so future queries are correct
                                if (hasPaidInvoice && b.status !== 'paid') {
                                    void (function () { return __awaiter(_this, void 0, void 0, function () {
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0: return [4 /*yield*/, admin.from('vendor_bookings')
                                                        .update({ status: 'paid', updated_at: new Date().toISOString() })
                                                        .eq('id', b.id)];
                                                case 1:
                                                    _a.sent();
                                                    return [2 /*return*/];
                                            }
                                        });
                                    }); })().catch(function () { });
                                }
                                var _inv = b.vendor_invoices, rest = __rest(b, ["vendor_invoices"]);
                                return __assign(__assign({}, rest), { status: effectiveStatus });
                            });
                            // Apply paid filter after derivation
                            if (status === 'paid')
                                return [2 /*return*/, rows.filter(function (r) { return r.status === 'paid'; })];
                            return [2 /*return*/, rows];
                    }
                });
            });
        };
        VendorsService_1.prototype.getOwnerVendorBookings = function (ownerAccountId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error, rows;
                var _this = this;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('vendor_bookings')
                                    .select('*, vendor_accounts(id, business_name, category, profile_image_url, phone, email), vendor_invoices(id, status, invoice_type, vendor_booking_id)')
                                    .eq('owner_account_id', ownerAccountId)
                                    .order('event_date', { ascending: true })];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            rows = (data || []).map(function (b) {
                                var _a;
                                var invoices = (_a = b.vendor_invoices) !== null && _a !== void 0 ? _a : [];
                                var hasPaidInvoice = invoices.some(function (inv) { return inv.invoice_type === 'owner_booking' && inv.status === 'paid' && inv.vendor_booking_id === b.id; });
                                var effectiveStatus = hasPaidInvoice ? 'paid' : b.status;
                                // Backfill DB so future reads are consistent
                                if (hasPaidInvoice && b.status !== 'paid') {
                                    void (function () { return __awaiter(_this, void 0, void 0, function () {
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0: return [4 /*yield*/, admin.from('vendor_bookings')
                                                        .update({ status: 'paid', updated_at: new Date().toISOString() })
                                                        .eq('id', b.id)];
                                                case 1:
                                                    _a.sent();
                                                    return [2 /*return*/];
                                            }
                                        });
                                    }); })().catch(function () { });
                                }
                                var _inv = b.vendor_invoices, rest = __rest(b, ["vendor_invoices"]);
                                return __assign(__assign({}, rest), { status: effectiveStatus });
                            });
                            return [2 /*return*/, rows];
                    }
                });
            });
        };
        VendorsService_1.prototype.getVendorBookingById = function (bookingId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('vendor_bookings')
                                    .select('*, vendor_accounts(id, business_name, category, profile_image_url, hourly_rate, flat_rate, phone, email)')
                                    .eq('id', bookingId)
                                    .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error || !data)
                                throw new common_1.NotFoundException('Vendor booking not found');
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        VendorsService_1.prototype.getOwnerVendorBookingsByEvent = function (eventId, ownerAccountId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('vendor_bookings')
                                    .select('*, vendor_accounts(id, business_name, category, profile_image_url)')
                                    .eq('event_id', eventId)
                                    .eq('owner_account_id', ownerAccountId)
                                    .order('event_date', { ascending: true })];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, data || []];
                    }
                });
            });
        };
        VendorsService_1.prototype.updateVendorBooking = function (bookingId, userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, booking, isVendor, isBooker, updatePayload, _a, data, error, vendor, eventLabel, ownerPhone, ownerName, ownerUser, _b;
                var _c, _d, _e, _f;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('vendor_bookings')
                                    .select('*, vendor_accounts(user_id)')
                                    .eq('id', bookingId)
                                    .single()];
                        case 1:
                            booking = (_g.sent()).data;
                            if (!booking)
                                throw new common_1.NotFoundException('Booking not found');
                            isVendor = ((_c = booking.vendor_accounts) === null || _c === void 0 ? void 0 : _c.user_id) === userId;
                            isBooker = booking.booked_by_user_id === userId;
                            if (!isVendor && !isBooker) {
                                throw new common_1.BadRequestException('Not authorized to update this booking');
                            }
                            updatePayload = { updated_at: new Date().toISOString() };
                            if (dto.status !== undefined)
                                updatePayload.status = dto.status;
                            if (dto.notes !== undefined)
                                updatePayload.notes = dto.notes;
                            if (dto.agreedAmount !== undefined)
                                updatePayload.agreed_amount = dto.agreedAmount;
                            if (dto.depositAmount !== undefined)
                                updatePayload.deposit_amount = dto.depositAmount;
                            return [4 /*yield*/, admin
                                    .from('vendor_bookings')
                                    .update(updatePayload)
                                    .eq('id', bookingId)
                                    .select('*, vendor_accounts(business_name, phone)')
                                    .single()];
                        case 2:
                            _a = _g.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            if (!dto.status) return [3 /*break*/, 11];
                            _g.label = 3;
                        case 3:
                            _g.trys.push([3, 10, , 11]);
                            vendor = data.vendor_accounts;
                            eventLabel = (_d = data.event_name) !== null && _d !== void 0 ? _d : 'your event';
                            if (!isVendor) return [3 /*break*/, 7];
                            ownerPhone = null;
                            ownerName = 'Owner';
                            if (!data.booked_by_user_id) return [3 /*break*/, 5];
                            return [4 /*yield*/, admin
                                    .from('users')
                                    .select('phone_number, first_name, last_name')
                                    .eq('id', data.booked_by_user_id)
                                    .maybeSingle()];
                        case 4:
                            ownerUser = (_g.sent()).data;
                            if (ownerUser === null || ownerUser === void 0 ? void 0 : ownerUser.phone_number) {
                                ownerPhone = ownerUser.phone_number;
                                ownerName = [ownerUser.first_name, ownerUser.last_name].filter(Boolean).join(' ') || 'Owner';
                            }
                            _g.label = 5;
                        case 5: return [4 /*yield*/, this.smsNotifications.vendorBookingStatusChanged(ownerPhone, ownerName, eventLabel, dto.status, false, '/dashboard')];
                        case 6:
                            _g.sent();
                            return [3 /*break*/, 9];
                        case 7: 
                        // Owner changed the status — notify the vendor
                        return [4 /*yield*/, this.smsNotifications.vendorBookingStatusChanged((_e = vendor === null || vendor === void 0 ? void 0 : vendor.phone) !== null && _e !== void 0 ? _e : null, (_f = vendor === null || vendor === void 0 ? void 0 : vendor.business_name) !== null && _f !== void 0 ? _f : 'Vendor', eventLabel, dto.status, true)];
                        case 8:
                            // Owner changed the status — notify the vendor
                            _g.sent();
                            _g.label = 9;
                        case 9: return [3 /*break*/, 11];
                        case 10:
                            _b = _g.sent();
                            return [3 /*break*/, 11];
                        case 11: return [2 /*return*/, data];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // VENDOR REVIEWS
        // ─────────────────────────────────────────────
        VendorsService_1.prototype.createReview = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error, vendorAccount;
                var _this = this;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('vendor_reviews')
                                    .insert({
                                    vendor_account_id: dto.vendorAccountId,
                                    reviewer_user_id: userId,
                                    vendor_booking_id: dto.vendorBookingId || null,
                                    rating: dto.rating,
                                    review_text: dto.reviewText || null,
                                })
                                    .select()
                                    .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [4 /*yield*/, admin
                                    .from('vendor_accounts')
                                    .select('business_name, phone')
                                    .eq('id', dto.vendorAccountId)
                                    .single()];
                        case 2:
                            vendorAccount = (_b.sent()).data;
                            if (vendorAccount === null || vendorAccount === void 0 ? void 0 : vendorAccount.phone) {
                                this.smsNotifications.vendorReviewReceived(normalizePhone(vendorAccount.phone), vendorAccount.business_name || 'Vendor', dto.rating, dto.vendorAccountId).catch(function (err) { return _this.logger.warn("Review SMS failed: ".concat(err === null || err === void 0 ? void 0 : err.message)); });
                            }
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        VendorsService_1.prototype.getVendorReviews = function (vendorId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('vendor_reviews')
                                    .select('*')
                                    .eq('vendor_account_id', vendorId)
                                    .eq('is_public', true)
                                    .order('created_at', { ascending: false })];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, data || []];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // CATEGORIES LISTING
        // ─────────────────────────────────────────────
        VendorsService_1.prototype.getCategories = function () {
            return [
                { value: 'dj', label: 'DJ' },
                { value: 'decorator', label: 'Decorator' },
                { value: 'planner_coordinator', label: 'Planner / Coordinator' },
                { value: 'furniture', label: 'Furniture' },
                { value: 'photographer', label: 'Photographer' },
                { value: 'musicians', label: 'Musicians' },
                { value: 'mc_host', label: 'MC / Host' },
                { value: 'other', label: 'Other' },
            ];
        };
        // ─────────────────────────────────────────────
        // HELPERS
        // ─────────────────────────────────────────────
        VendorsService_1.prototype.enrichWithRating = function (vendor) {
            var reviews = vendor.vendor_reviews || [];
            var ratings = reviews.map(function (r) { return r.rating; }).filter(Boolean);
            var avg = ratings.length
                ? Math.round((ratings.reduce(function (a, b) { return a + b; }, 0) / ratings.length) * 10) / 10
                : null;
            var vendor_reviews = vendor.vendor_reviews, rest = __rest(vendor, ["vendor_reviews"]);
            return __assign(__assign({}, rest), { avgRating: avg, reviewCount: ratings.length });
        };
        // Geocode zip code to lat/lng using public API (no key required)
        VendorsService_1.prototype.geocodeZip = function (zipCode) {
            return __awaiter(this, void 0, void 0, function () {
                var response, data, err_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 3, , 4]);
                            return [4 /*yield*/, fetch("https://nominatim.openstreetmap.org/search?postalcode=".concat(zipCode, "&country=US&format=json&limit=1"), { headers: { 'User-Agent': 'DoVenueSuite/1.0' } })];
                        case 1:
                            response = _a.sent();
                            return [4 /*yield*/, response.json()];
                        case 2:
                            data = _a.sent();
                            if (data && data.length > 0) {
                                return [2 /*return*/, { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }];
                            }
                            return [3 /*break*/, 4];
                        case 3:
                            err_1 = _a.sent();
                            this.logger.warn('Geocoding failed for zip:', zipCode);
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/, null];
                    }
                });
            });
        };
        // Reverse geocode lat/lng to address components
        VendorsService_1.prototype.reverseGeocode = function (lat, lng) {
            return __awaiter(this, void 0, void 0, function () {
                var response, data, addr, err_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 3, , 4]);
                            return [4 /*yield*/, fetch("https://nominatim.openstreetmap.org/reverse?lat=".concat(lat, "&lon=").concat(lng, "&format=json"), { headers: { 'User-Agent': 'DoVenueSuite/1.0' } })];
                        case 1:
                            response = _a.sent();
                            return [4 /*yield*/, response.json()];
                        case 2:
                            data = _a.sent();
                            if (!(data === null || data === void 0 ? void 0 : data.address))
                                return [2 /*return*/, null];
                            addr = data.address;
                            return [2 /*return*/, {
                                    city: addr.city || addr.town || addr.village || addr.county || '',
                                    state: addr.state || '',
                                    zip: addr.postcode || '',
                                    displayName: data.display_name || '',
                                }];
                        case 3:
                            err_2 = _a.sent();
                            this.logger.warn('Reverse geocoding failed for coords:', lat, lng);
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/, null];
                    }
                });
            });
        };
        // Address autocomplete — returns up to 5 US address suggestions
        VendorsService_1.prototype.geocodeAutocomplete = function (query) {
            return __awaiter(this, void 0, void 0, function () {
                var url, response, data, err_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 3, , 4]);
                            url = "https://nominatim.openstreetmap.org/search?q=".concat(encodeURIComponent(query), "&countrycodes=us&format=json&limit=5&addressdetails=1");
                            return [4 /*yield*/, fetch(url, { headers: { 'User-Agent': 'DoVenueSuite/1.0' } })];
                        case 1:
                            response = _a.sent();
                            return [4 /*yield*/, response.json()];
                        case 2:
                            data = _a.sent();
                            if (!Array.isArray(data))
                                return [2 /*return*/, []];
                            return [2 /*return*/, data.map(function (item) {
                                    var addr = item.address || {};
                                    return {
                                        displayName: item.display_name,
                                        city: addr.city || addr.town || addr.village || addr.county || '',
                                        state: addr.state || '',
                                        zip: addr.postcode || '',
                                        lat: parseFloat(item.lat),
                                        lng: parseFloat(item.lon),
                                    };
                                })];
                        case 3:
                            err_3 = _a.sent();
                            this.logger.warn('Address autocomplete failed for query:', query);
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/, []];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────
        // BOOKING LINKS
        // ─────────────────────────────────────────────
        VendorsService_1.prototype.getVendorAccountIdByUserId = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('vendor_accounts')
                                    .select('id')
                                    .eq('user_id', userId)
                                    .maybeSingle()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error || !data)
                                throw new common_1.BadRequestException('No vendor account found for this user');
                            return [2 /*return*/, data.id];
                    }
                });
            });
        };
        /** Create or update the vendor's booking link (one per vendor). */
        VendorsService_1.prototype.upsertBookingLink = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, vendorAccountId, conflict, payload, existing, _a, data, error, _b, data, error;
                var _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getVendorAccountIdByUserId(userId)];
                        case 1:
                            vendorAccountId = _f.sent();
                            // Validate slug — alphanumeric and hyphens only
                            if (!/^[a-z0-9-]{3,60}$/.test(dto.slug)) {
                                throw new common_1.BadRequestException('Slug must be 3-60 characters: lowercase letters, numbers, and hyphens only');
                            }
                            return [4 /*yield*/, admin
                                    .from('vendor_booking_links')
                                    .select('id, vendor_account_id')
                                    .eq('slug', dto.slug)
                                    .maybeSingle()];
                        case 2:
                            conflict = (_f.sent()).data;
                            if (conflict && conflict.vendor_account_id !== vendorAccountId) {
                                throw new common_1.BadRequestException('This booking link slug is already taken');
                            }
                            payload = {
                                vendor_account_id: vendorAccountId,
                                slug: dto.slug,
                                is_active: (_c = dto.isActive) !== null && _c !== void 0 ? _c : true,
                                custom_message: (_d = dto.customMessage) !== null && _d !== void 0 ? _d : null,
                                default_deposit_percentage: (_e = dto.defaultDepositPercentage) !== null && _e !== void 0 ? _e : null,
                                updated_at: new Date().toISOString(),
                            };
                            return [4 /*yield*/, admin
                                    .from('vendor_booking_links')
                                    .select('id')
                                    .eq('vendor_account_id', vendorAccountId)
                                    .maybeSingle()];
                        case 3:
                            existing = (_f.sent()).data;
                            if (!existing) return [3 /*break*/, 5];
                            return [4 /*yield*/, admin
                                    .from('vendor_booking_links')
                                    .update(payload)
                                    .eq('id', existing.id)
                                    .select()
                                    .single()];
                        case 4:
                            _a = _f.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, data];
                        case 5: return [4 /*yield*/, admin
                                .from('vendor_booking_links')
                                .insert(payload)
                                .select()
                                .single()];
                        case 6:
                            _b = _f.sent(), data = _b.data, error = _b.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        /** Get the vendor's own booking link. */
        VendorsService_1.prototype.getMyBookingLink = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, vendorAccountId, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getVendorAccountIdByUserId(userId)];
                        case 1:
                            vendorAccountId = _a.sent();
                            return [4 /*yield*/, admin
                                    .from('vendor_booking_links')
                                    .select('*')
                                    .eq('vendor_account_id', vendorAccountId)
                                    .maybeSingle()];
                        case 2:
                            data = (_a.sent()).data;
                            return [2 /*return*/, data !== null && data !== void 0 ? data : null];
                    }
                });
            });
        };
        /** Public: get booking link info by slug (no auth). */
        VendorsService_1.prototype.getPublicBookingLink = function (slug) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('vendor_booking_links')
                                    .select('*, vendor_accounts(business_name, category, city, state, bio, profile_image_url, hourly_rate, flat_rate, rate_description)')
                                    .eq('slug', slug)
                                    .eq('is_active', true)
                                    .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error || !data)
                                throw new common_1.NotFoundException('Booking link not found or inactive');
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        /** Public: submit a booking request via a booking link. */
        VendorsService_1.prototype.submitBookingRequest = function (slug, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, link, _a, request, error, vendorPhone, formattedDate, err_4;
                var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
                return __generator(this, function (_q) {
                    switch (_q.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('vendor_booking_links')
                                    .select('id, vendor_account_id, vendor_accounts(phone, business_name)')
                                    .eq('slug', slug)
                                    .eq('is_active', true)
                                    .single()];
                        case 1:
                            link = (_q.sent()).data;
                            if (!link)
                                throw new common_1.NotFoundException('Booking link not found or inactive');
                            return [4 /*yield*/, admin
                                    .from('vendor_booking_requests')
                                    .insert({
                                    vendor_account_id: link.vendor_account_id,
                                    booking_link_id: link.id,
                                    client_name: dto.clientName,
                                    client_email: dto.clientEmail,
                                    client_phone: (_b = normalizePhone(dto.clientPhone)) !== null && _b !== void 0 ? _b : null,
                                    event_name: (_c = dto.eventName) !== null && _c !== void 0 ? _c : null,
                                    event_date: (_d = dto.eventDate) !== null && _d !== void 0 ? _d : null,
                                    start_time: (_e = dto.startTime) !== null && _e !== void 0 ? _e : null,
                                    end_time: (_f = dto.endTime) !== null && _f !== void 0 ? _f : null,
                                    venue_name: (_g = dto.venueName) !== null && _g !== void 0 ? _g : null,
                                    venue_address: (_h = dto.venueAddress) !== null && _h !== void 0 ? _h : null,
                                    notes: (_j = dto.notes) !== null && _j !== void 0 ? _j : null,
                                    sms_opt_in: (_k = dto.smsOptIn) !== null && _k !== void 0 ? _k : false,
                                    status: 'pending',
                                })
                                    .select()
                                    .single()];
                        case 2:
                            _a = _q.sent(), request = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            vendorPhone = (_l = link.vendor_accounts) === null || _l === void 0 ? void 0 : _l.phone;
                            if (!vendorPhone) return [3 /*break*/, 6];
                            _q.label = 3;
                        case 3:
                            _q.trys.push([3, 5, , 6]);
                            formattedDate = dto.eventDate
                                ? new Date(dto.eventDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                                : '';
                            return [4 /*yield*/, this.smsNotifications.vendorBookingCreated(vendorPhone, (_o = (_m = link.vendor_accounts) === null || _m === void 0 ? void 0 : _m.business_name) !== null && _o !== void 0 ? _o : 'Vendor', (_p = dto.eventName) !== null && _p !== void 0 ? _p : 'New Event', formattedDate)];
                        case 4:
                            _q.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            err_4 = _q.sent();
                            this.logger.warn('Failed to send SMS for booking request', err_4.message);
                            return [3 /*break*/, 6];
                        case 6: return [2 /*return*/, request];
                    }
                });
            });
        };
        /** Get all booking requests for the authenticated vendor. */
        VendorsService_1.prototype.getMyBookingRequests = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, vendorAccountId, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getVendorAccountIdByUserId(userId)];
                        case 1:
                            vendorAccountId = _b.sent();
                            return [4 /*yield*/, admin
                                    .from('vendor_booking_requests')
                                    .select('*')
                                    .eq('vendor_account_id', vendorAccountId)
                                    .order('created_at', { ascending: false })];
                        case 2:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, data !== null && data !== void 0 ? data : []];
                    }
                });
            });
        };
        /** Update a booking request status (confirm / decline). */
        VendorsService_1.prototype.updateBookingRequest = function (userId, requestId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, vendorAccountId, existing, update, _a, data, error, vendorName, _b;
                var _c, _d, _e, _f;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getVendorAccountIdByUserId(userId)];
                        case 1:
                            vendorAccountId = _g.sent();
                            return [4 /*yield*/, admin
                                    .from('vendor_booking_requests')
                                    .select('id')
                                    .eq('id', requestId)
                                    .eq('vendor_account_id', vendorAccountId)
                                    .single()];
                        case 2:
                            existing = (_g.sent()).data;
                            if (!existing)
                                throw new common_1.NotFoundException('Booking request not found');
                            update = { updated_at: new Date().toISOString() };
                            if (dto.status)
                                update.status = dto.status;
                            if (dto.quotedAmount !== undefined)
                                update.quoted_amount = dto.quotedAmount;
                            if (dto.notes !== undefined)
                                update.notes = dto.notes;
                            return [4 /*yield*/, admin
                                    .from('vendor_booking_requests')
                                    .update(update)
                                    .eq('id', requestId)
                                    .select('*, vendor_accounts(business_name)')
                                    .single()];
                        case 3:
                            _a = _g.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            if (!(dto.status && (data.client_phone || dto.status === 'confirmed' || dto.status === 'declined'))) return [3 /*break*/, 7];
                            _g.label = 4;
                        case 4:
                            _g.trys.push([4, 6, , 7]);
                            vendorName = (_d = (_c = data.vendor_accounts) === null || _c === void 0 ? void 0 : _c.business_name) !== null && _d !== void 0 ? _d : 'Your vendor';
                            return [4 /*yield*/, this.smsNotifications.vendorBookingRequestUpdated((_e = data.client_phone) !== null && _e !== void 0 ? _e : null, (_f = data.client_name) !== null && _f !== void 0 ? _f : 'Client', dto.status, vendorName, dto.quotedAmount != null ? Number(dto.quotedAmount) : undefined)];
                        case 5:
                            _g.sent();
                            return [3 /*break*/, 7];
                        case 6:
                            _b = _g.sent();
                            return [3 /*break*/, 7];
                        case 7: return [2 /*return*/, data];
                    }
                });
            });
        };
        return VendorsService_1;
    }());
    __setFunctionName(_classThis, "VendorsService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        VendorsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return VendorsService = _classThis;
}();
exports.VendorsService = VendorsService;
