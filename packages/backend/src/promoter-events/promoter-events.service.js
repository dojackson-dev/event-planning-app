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
exports.PromoterEventsService = void 0;
var common_1 = require("@nestjs/common");
var stripe_1 = require("stripe");
var APP_FEE_RATE = 0.03;
var PromoterEventsService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var PromoterEventsService = _classThis = /** @class */ (function () {
        function PromoterEventsService_1(supabaseService, configService, mailService, twilioService) {
            this.supabaseService = supabaseService;
            this.configService = configService;
            this.mailService = mailService;
            this.twilioService = twilioService;
            this.logger = new common_1.Logger(PromoterEventsService.name);
            this.stripe = new stripe_1.default(this.configService.get('STRIPE_SECRET_KEY') || '', {
                apiVersion: '2024-04-10',
            });
            this.frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
        }
        // ── helpers ──────────────────────────────────────────────────
        PromoterEventsService_1.prototype.getPromoterAccount = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('promoter_accounts')
                                    .select('id, stripe_account_id, stripe_connect_status, company_name, contact_name, email')
                                    .eq('user_id', userId)
                                    .maybeSingle()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error || !data)
                                throw new common_1.NotFoundException('Promoter account not found');
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        // ── EVENTS CRUD ───────────────────────────────────────────────
        PromoterEventsService_1.prototype.createEvent = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, promoter, _a, event, error;
                var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
                return __generator(this, function (_o) {
                    switch (_o.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getPromoterAccount(userId)];
                        case 1:
                            promoter = _o.sent();
                            return [4 /*yield*/, admin
                                    .from('public_events')
                                    .insert(__assign(__assign({ promoter_account_id: promoter.id, title: dto.title, description: (_b = dto.description) !== null && _b !== void 0 ? _b : null, event_date: dto.event_date, start_time: (_c = dto.start_time) !== null && _c !== void 0 ? _c : null, end_time: (_d = dto.end_time) !== null && _d !== void 0 ? _d : null, venue_name: (_e = dto.venue_name) !== null && _e !== void 0 ? _e : null, venue_address: (_f = dto.venue_address) !== null && _f !== void 0 ? _f : null, city: (_g = dto.city) !== null && _g !== void 0 ? _g : null, state: (_h = dto.state) !== null && _h !== void 0 ? _h : null, category: (_j = dto.category) !== null && _j !== void 0 ? _j : null }, (dto.venue_type !== undefined && { venue_type: dto.venue_type })), { image_url: (_k = dto.image_url) !== null && _k !== void 0 ? _k : null, age_restriction: (_l = dto.age_restriction) !== null && _l !== void 0 ? _l : null, status: (_m = dto.status) !== null && _m !== void 0 ? _m : 'draft' }))
                                    .select()
                                    .single()];
                        case 2:
                            _a = _o.sent(), event = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            if (!(dto.ticket_tiers && dto.ticket_tiers.length > 0)) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.createTicketTiers(event.id, dto.ticket_tiers)];
                        case 3:
                            _o.sent();
                            _o.label = 4;
                        case 4: return [2 /*return*/, this.getEvent(userId, event.id)];
                    }
                });
            });
        };
        PromoterEventsService_1.prototype.listEvents = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, promoter, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getPromoterAccount(userId)];
                        case 1:
                            promoter = _b.sent();
                            return [4 /*yield*/, admin
                                    .from('public_events')
                                    .select('*, ticket_tiers(id, name, price, quantity, quantity_sold)')
                                    .eq('promoter_account_id', promoter.id)
                                    .order('event_date', { ascending: true })];
                        case 2:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, data || []];
                    }
                });
            });
        };
        PromoterEventsService_1.prototype.getEvent = function (userId, eventId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, promoter, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getPromoterAccount(userId)];
                        case 1:
                            promoter = _b.sent();
                            return [4 /*yield*/, admin
                                    .from('public_events')
                                    .select('*, ticket_tiers(*)')
                                    .eq('id', eventId)
                                    .eq('promoter_account_id', promoter.id)
                                    .maybeSingle()];
                        case 2:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error || !data)
                                throw new common_1.NotFoundException('Event not found');
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        PromoterEventsService_1.prototype.updateEvent = function (userId, eventId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, promoter, existing, updates, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getPromoterAccount(userId)];
                        case 1:
                            promoter = _b.sent();
                            return [4 /*yield*/, admin
                                    .from('public_events')
                                    .select('id')
                                    .eq('id', eventId)
                                    .eq('promoter_account_id', promoter.id)
                                    .maybeSingle()];
                        case 2:
                            existing = (_b.sent()).data;
                            if (!existing)
                                throw new common_1.ForbiddenException('Event not found');
                            updates = { updated_at: new Date().toISOString() };
                            if (dto.title !== undefined)
                                updates.title = dto.title;
                            if (dto.description !== undefined)
                                updates.description = dto.description;
                            if (dto.event_date !== undefined)
                                updates.event_date = dto.event_date;
                            if (dto.start_time !== undefined)
                                updates.start_time = dto.start_time;
                            if (dto.end_time !== undefined)
                                updates.end_time = dto.end_time;
                            if (dto.venue_name !== undefined)
                                updates.venue_name = dto.venue_name;
                            if (dto.venue_address !== undefined)
                                updates.venue_address = dto.venue_address;
                            if (dto.city !== undefined)
                                updates.city = dto.city;
                            if (dto.state !== undefined)
                                updates.state = dto.state;
                            if (dto.category !== undefined)
                                updates.category = dto.category;
                            if (dto.venue_type !== undefined)
                                updates.venue_type = dto.venue_type;
                            if (dto.image_url !== undefined)
                                updates.image_url = dto.image_url;
                            if (dto.age_restriction !== undefined)
                                updates.age_restriction = dto.age_restriction;
                            if (dto.status !== undefined)
                                updates.status = dto.status;
                            return [4 /*yield*/, admin
                                    .from('public_events')
                                    .update(updates)
                                    .eq('id', eventId)
                                    .select()
                                    .single()];
                        case 3:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        PromoterEventsService_1.prototype.deleteEvent = function (userId, eventId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, promoter, error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getPromoterAccount(userId)];
                        case 1:
                            promoter = _a.sent();
                            return [4 /*yield*/, admin
                                    .from('public_events')
                                    .delete()
                                    .eq('id', eventId)
                                    .eq('promoter_account_id', promoter.id)];
                        case 2:
                            error = (_a.sent()).error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, { success: true }];
                    }
                });
            });
        };
        // ── TICKET TIERS ──────────────────────────────────────────────
        PromoterEventsService_1.prototype.createTicketTiers = function (eventId, tiers) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, rows, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            rows = tiers.map(function (t) {
                                var _a;
                                return ({
                                    public_event_id: eventId,
                                    name: t.name,
                                    price: t.price,
                                    quantity: t.quantity,
                                    quantity_sold: 0,
                                    description: (_a = t.description) !== null && _a !== void 0 ? _a : null,
                                });
                            });
                            return [4 /*yield*/, admin.from('ticket_tiers').insert(rows).select()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        PromoterEventsService_1.prototype.addTicketTier = function (userId, eventId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, promoter, event, _a, data, error;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getPromoterAccount(userId)];
                        case 1:
                            promoter = _c.sent();
                            return [4 /*yield*/, admin
                                    .from('public_events')
                                    .select('id')
                                    .eq('id', eventId)
                                    .eq('promoter_account_id', promoter.id)
                                    .maybeSingle()];
                        case 2:
                            event = (_c.sent()).data;
                            if (!event)
                                throw new common_1.ForbiddenException('Event not found');
                            return [4 /*yield*/, admin.from('ticket_tiers').insert({
                                    public_event_id: eventId,
                                    name: dto.name,
                                    price: dto.price,
                                    quantity: dto.quantity,
                                    quantity_sold: 0,
                                    description: (_b = dto.description) !== null && _b !== void 0 ? _b : null,
                                }).select().single()];
                        case 3:
                            _a = _c.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        PromoterEventsService_1.prototype.updateTicketTier = function (userId, tierId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, promoter, tier, event, updates, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getPromoterAccount(userId)];
                        case 1:
                            promoter = _b.sent();
                            return [4 /*yield*/, admin
                                    .from('ticket_tiers')
                                    .select('id, public_event_id')
                                    .eq('id', tierId)
                                    .maybeSingle()];
                        case 2:
                            tier = (_b.sent()).data;
                            if (!tier)
                                throw new common_1.NotFoundException('Ticket tier not found');
                            return [4 /*yield*/, admin
                                    .from('public_events')
                                    .select('id')
                                    .eq('id', tier.public_event_id)
                                    .eq('promoter_account_id', promoter.id)
                                    .maybeSingle()];
                        case 3:
                            event = (_b.sent()).data;
                            if (!event)
                                throw new common_1.ForbiddenException('Access denied');
                            updates = {};
                            if (dto.name !== undefined)
                                updates.name = dto.name;
                            if (dto.price !== undefined)
                                updates.price = dto.price;
                            if (dto.quantity !== undefined)
                                updates.quantity = dto.quantity;
                            if (dto.description !== undefined)
                                updates.description = dto.description;
                            return [4 /*yield*/, admin
                                    .from('ticket_tiers')
                                    .update(updates)
                                    .eq('id', tierId)
                                    .select()
                                    .single()];
                        case 4:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        PromoterEventsService_1.prototype.deleteTicketTier = function (userId, tierId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, promoter, tier, event, error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getPromoterAccount(userId)];
                        case 1:
                            promoter = _a.sent();
                            return [4 /*yield*/, admin
                                    .from('ticket_tiers')
                                    .select('id, public_event_id')
                                    .eq('id', tierId)
                                    .maybeSingle()];
                        case 2:
                            tier = (_a.sent()).data;
                            if (!tier)
                                throw new common_1.NotFoundException('Ticket tier not found');
                            return [4 /*yield*/, admin
                                    .from('public_events')
                                    .select('id')
                                    .eq('id', tier.public_event_id)
                                    .eq('promoter_account_id', promoter.id)
                                    .maybeSingle()];
                        case 3:
                            event = (_a.sent()).data;
                            if (!event)
                                throw new common_1.ForbiddenException('Access denied');
                            return [4 /*yield*/, admin.from('ticket_tiers').delete().eq('id', tierId)];
                        case 4:
                            error = (_a.sent()).error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, { success: true }];
                    }
                });
            });
        };
        // ── PUBLIC ROUTES (no auth) ───────────────────────────────────
        PromoterEventsService_1.prototype.listPublicEvents = function (city, category) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, query, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            query = admin
                                .from('public_events')
                                .select('*, ticket_tiers(id, name, price, quantity, quantity_sold), promoter_accounts(company_name, contact_name, profile_image_url)')
                                .eq('status', 'published')
                                .gte('event_date', new Date().toISOString().split('T')[0])
                                .order('event_date', { ascending: true });
                            if (city)
                                query = query.ilike('city', "%".concat(city, "%"));
                            if (category)
                                query = query.eq('category', category);
                            return [4 /*yield*/, query];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, data || []];
                    }
                });
            });
        };
        PromoterEventsService_1.prototype.getPublicEvent = function (eventId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('public_events')
                                    .select('*, ticket_tiers(id, name, price, quantity, quantity_sold, description), promoter_accounts(company_name, contact_name, profile_image_url, location)')
                                    .eq('id', eventId)
                                    .eq('status', 'published')
                                    .maybeSingle()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error || !data)
                                throw new common_1.NotFoundException('Event not found or not published');
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        // ── STRIPE CHECKOUT for tickets ───────────────────────────────
        PromoterEventsService_1.prototype.createTicketCheckout = function (eventId, tierId, quantity, buyerEmail, buyerPhone) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, event, tier, available, unitPrice, ticketRows, tierRow, promoter, isTestMode, hasActiveConnect, unitAmount, feeAmount, sessionParams, session;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('public_events')
                                    .select('*, promoter_accounts(stripe_account_id, stripe_connect_status, company_name, contact_name)')
                                    .eq('id', eventId)
                                    .eq('status', 'published')
                                    .maybeSingle()];
                        case 1:
                            event = (_b.sent()).data;
                            if (!event)
                                throw new common_1.NotFoundException('Event not found');
                            return [4 /*yield*/, admin
                                    .from('ticket_tiers')
                                    .select('*')
                                    .eq('id', tierId)
                                    .eq('public_event_id', eventId)
                                    .maybeSingle()];
                        case 2:
                            tier = (_b.sent()).data;
                            if (!tier)
                                throw new common_1.NotFoundException('Ticket tier not found');
                            available = tier.quantity - tier.quantity_sold;
                            if (quantity > available)
                                throw new common_1.BadRequestException("Only ".concat(available, " tickets remaining"));
                            unitPrice = Number(tier.price);
                            if (!(unitPrice === 0)) return [3 /*break*/, 8];
                            ticketRows = Array.from({ length: quantity }, function () { return ({
                                public_event_id: eventId,
                                ticket_tier_id: tierId,
                                buyer_email: buyerEmail,
                                buyer_phone: buyerPhone || null,
                                stripe_checkout_session_id: null,
                                amount_paid: 0,
                                status: 'valid',
                            }); });
                            return [4 /*yield*/, admin.from('tickets').insert(ticketRows)];
                        case 3:
                            _b.sent();
                            return [4 /*yield*/, admin
                                    .from('ticket_tiers')
                                    .select('quantity_sold')
                                    .eq('id', tierId)
                                    .single()];
                        case 4:
                            tierRow = (_b.sent()).data;
                            if (!tierRow) return [3 /*break*/, 6];
                            return [4 /*yield*/, admin
                                    .from('ticket_tiers')
                                    .update({ quantity_sold: ((_a = tierRow.quantity_sold) !== null && _a !== void 0 ? _a : 0) + quantity })
                                    .eq('id', tierId)];
                        case 5:
                            _b.sent();
                            _b.label = 6;
                        case 6: 
                        // Send confirmation for free tickets too (no webhook fires)
                        return [4 /*yield*/, this.sendTicketNotifications({
                                eventId: eventId,
                                tierId: tierId,
                                quantity: quantity,
                                amountTotal: 0,
                                buyerEmail: buyerEmail,
                                buyerPhone: buyerPhone,
                            })];
                        case 7:
                            // Send confirmation for free tickets too (no webhook fires)
                            _b.sent();
                            return [2 /*return*/, { url: "".concat(this.frontendUrl, "/events/").concat(eventId, "?paid=true"), sessionId: null }];
                        case 8:
                            promoter = event.promoter_accounts;
                            isTestMode = (this.configService.get('STRIPE_SECRET_KEY') || '').startsWith('sk_test_');
                            hasActiveConnect = (promoter === null || promoter === void 0 ? void 0 : promoter.stripe_account_id) && promoter.stripe_connect_status === 'active';
                            if (!hasActiveConnect && !isTestMode) {
                                throw new common_1.BadRequestException('Payments not enabled for this event');
                            }
                            unitAmount = Math.round(unitPrice * 100);
                            feeAmount = hasActiveConnect ? Math.round(unitAmount * quantity * APP_FEE_RATE) : 0;
                            sessionParams = {
                                payment_method_types: ['card'],
                                mode: 'payment',
                                customer_email: buyerEmail,
                                line_items: [{
                                        price_data: {
                                            currency: 'usd',
                                            product_data: {
                                                name: "".concat(event.title, " \u2014 ").concat(tier.name),
                                                description: event.venue_name ? "".concat(event.event_date, " at ").concat(event.venue_name) : event.event_date,
                                            },
                                            unit_amount: unitAmount,
                                        },
                                        quantity: quantity,
                                    }],
                                success_url: "".concat(this.frontendUrl, "/events/").concat(eventId, "?paid=true&session_id={CHECKOUT_SESSION_ID}"),
                                cancel_url: "".concat(this.frontendUrl, "/events/").concat(eventId, "?canceled=true"),
                                metadata: {
                                    public_event_id: eventId,
                                    ticket_tier_id: tierId,
                                    quantity: String(quantity),
                                    buyer_email: buyerEmail,
                                    buyer_phone: buyerPhone || '',
                                },
                            };
                            // Only attach Connect transfer when promoter has an active account
                            if (hasActiveConnect) {
                                sessionParams.payment_intent_data = {
                                    application_fee_amount: feeAmount,
                                    transfer_data: { destination: promoter.stripe_account_id },
                                };
                            }
                            return [4 /*yield*/, this.stripe.checkout.sessions.create(sessionParams)];
                        case 9:
                            session = _b.sent();
                            return [2 /*return*/, { url: session.url, sessionId: session.id }];
                    }
                });
            });
        };
        // ── WEBHOOK: mark tickets sold ────────────────────────────────
        PromoterEventsService_1.prototype.markTicketsSoldBySession = function (sessionId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, session, _a, _b, public_event_id, ticket_tier_id, quantity, buyer_email, buyer_phone, qty, phone, email, existing, amountTotal, ticketRows, tier;
                var _c, _d, _e, _f, _g, _h;
                return __generator(this, function (_j) {
                    switch (_j.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            _j.label = 1;
                        case 1:
                            _j.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.stripe.checkout.sessions.retrieve(sessionId, {
                                    expand: ['payment_intent'],
                                })];
                        case 2:
                            session = _j.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            _a = _j.sent();
                            return [2 /*return*/];
                        case 4:
                            _b = session.metadata || {}, public_event_id = _b.public_event_id, ticket_tier_id = _b.ticket_tier_id, quantity = _b.quantity, buyer_email = _b.buyer_email, buyer_phone = _b.buyer_phone;
                            if (!public_event_id || !ticket_tier_id)
                                return [2 /*return*/];
                            qty = parseInt(quantity || '1', 10);
                            phone = (buyer_phone || ((_d = (_c = session.customer_details) === null || _c === void 0 ? void 0 : _c.phone) !== null && _d !== void 0 ? _d : '')).trim() || null;
                            email = (_g = (_e = buyer_email !== null && buyer_email !== void 0 ? buyer_email : session.customer_email) !== null && _e !== void 0 ? _e : (_f = session.customer_details) === null || _f === void 0 ? void 0 : _f.email) !== null && _g !== void 0 ? _g : null;
                            return [4 /*yield*/, admin
                                    .from('tickets')
                                    .select('id')
                                    .eq('stripe_checkout_session_id', sessionId)
                                    .limit(1)];
                        case 5:
                            existing = (_j.sent()).data;
                            if (existing && existing.length > 0)
                                return [2 /*return*/];
                            amountTotal = session.amount_total ? session.amount_total / 100 : 0;
                            ticketRows = Array.from({ length: qty }, function () { return ({
                                public_event_id: public_event_id,
                                ticket_tier_id: ticket_tier_id,
                                buyer_email: email,
                                buyer_phone: phone,
                                stripe_checkout_session_id: sessionId,
                                amount_paid: qty > 0 ? amountTotal / qty : 0,
                                status: 'valid',
                            }); });
                            return [4 /*yield*/, admin.from('tickets').insert(ticketRows)];
                        case 6:
                            _j.sent();
                            return [4 /*yield*/, admin
                                    .from('ticket_tiers')
                                    .select('quantity_sold')
                                    .eq('id', ticket_tier_id)
                                    .single()];
                        case 7:
                            tier = (_j.sent()).data;
                            if (!tier) return [3 /*break*/, 9];
                            return [4 /*yield*/, admin
                                    .from('ticket_tiers')
                                    .update({ quantity_sold: ((_h = tier.quantity_sold) !== null && _h !== void 0 ? _h : 0) + qty })
                                    .eq('id', ticket_tier_id)];
                        case 8:
                            _j.sent();
                            _j.label = 9;
                        case 9:
                            this.logger.log("Recorded ".concat(qty, " ticket(s) sold for event ").concat(public_event_id));
                            if (!email) return [3 /*break*/, 11];
                            return [4 /*yield*/, this.sendTicketNotifications({
                                    eventId: public_event_id,
                                    tierId: ticket_tier_id,
                                    quantity: qty,
                                    amountTotal: amountTotal,
                                    buyerEmail: email,
                                    buyerPhone: phone || undefined,
                                })];
                        case 10:
                            _j.sent();
                            _j.label = 11;
                        case 11: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Sends an email (always) and SMS (if phone provided) confirmation
         * after a ticket purchase. Never throws — notification failures must
         * not break the webhook or the free-ticket flow.
         */
        PromoterEventsService_1.prototype.sendTicketNotifications = function (params) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, event_1, tier, promoter, promoterName, eventUrl, dateStr, msg, smsErr_1, err_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 8, , 9]);
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('public_events')
                                    .select('title, event_date, event_time, venue_name, promoter_accounts(company_name, contact_name)')
                                    .eq('id', params.eventId)
                                    .maybeSingle()];
                        case 1:
                            event_1 = (_a.sent()).data;
                            return [4 /*yield*/, admin
                                    .from('ticket_tiers')
                                    .select('name')
                                    .eq('id', params.tierId)
                                    .maybeSingle()];
                        case 2:
                            tier = (_a.sent()).data;
                            if (!event_1 || !tier) {
                                this.logger.warn("sendTicketNotifications: missing event/tier for ".concat(params.eventId, "/").concat(params.tierId));
                                return [2 /*return*/];
                            }
                            promoter = Array.isArray(event_1.promoter_accounts)
                                ? event_1.promoter_accounts[0]
                                : event_1.promoter_accounts;
                            promoterName = (promoter === null || promoter === void 0 ? void 0 : promoter.company_name) || (promoter === null || promoter === void 0 ? void 0 : promoter.contact_name) || null;
                            // Email
                            return [4 /*yield*/, this.mailService.sendTicketConfirmation({
                                    toEmail: params.buyerEmail,
                                    eventTitle: event_1.title,
                                    eventDate: event_1.event_date,
                                    eventTime: event_1.event_time,
                                    venueName: event_1.venue_name,
                                    tierName: tier.name,
                                    quantity: params.quantity,
                                    amountTotal: params.amountTotal,
                                    eventId: params.eventId,
                                    promoterName: promoterName,
                                })];
                        case 3:
                            // Email
                            _a.sent();
                            if (!params.buyerPhone) return [3 /*break*/, 7];
                            _a.label = 4;
                        case 4:
                            _a.trys.push([4, 6, , 7]);
                            eventUrl = "".concat(this.frontendUrl, "/events/").concat(params.eventId);
                            dateStr = event_1.event_date
                                ? new Date(event_1.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                : '';
                            msg = "Your ".concat(params.quantity, " ticket(s) to ").concat(event_1.title).concat(dateStr ? " on ".concat(dateStr) : '', " are confirmed. Check your email for details: ").concat(eventUrl);
                            return [4 /*yield*/, this.twilioService.sendSMS(params.buyerPhone, msg)];
                        case 5:
                            _a.sent();
                            return [3 /*break*/, 7];
                        case 6:
                            smsErr_1 = _a.sent();
                            this.logger.error("Ticket SMS failed for ".concat(params.buyerPhone), smsErr_1);
                            return [3 /*break*/, 7];
                        case 7: return [3 /*break*/, 9];
                        case 8:
                            err_1 = _a.sent();
                            this.logger.error('sendTicketNotifications failed', err_1);
                            return [3 /*break*/, 9];
                        case 9: return [2 /*return*/];
                    }
                });
            });
        };
        // ── ATTENDEE LIST ─────────────────────────────────────────────
        PromoterEventsService_1.prototype.getEventAttendees = function (userId, eventId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, promoter, event, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, this.getPromoterAccount(userId)];
                        case 1:
                            promoter = _b.sent();
                            return [4 /*yield*/, admin
                                    .from('public_events')
                                    .select('id')
                                    .eq('id', eventId)
                                    .eq('promoter_account_id', promoter.id)
                                    .maybeSingle()];
                        case 2:
                            event = (_b.sent()).data;
                            if (!event)
                                throw new common_1.ForbiddenException('Event not found');
                            return [4 /*yield*/, admin
                                    .from('tickets')
                                    .select('*, ticket_tiers(name, price)')
                                    .eq('public_event_id', eventId)
                                    .order('created_at', { ascending: false })];
                        case 3:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, data || []];
                    }
                });
            });
        };
        return PromoterEventsService_1;
    }());
    __setFunctionName(_classThis, "PromoterEventsService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PromoterEventsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PromoterEventsService = _classThis;
}();
exports.PromoterEventsService = PromoterEventsService;
