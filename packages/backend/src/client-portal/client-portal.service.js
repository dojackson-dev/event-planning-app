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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientPortalService = void 0;
var common_1 = require("@nestjs/common");
/** Returns all likely phone formats for a given phone string so we can query any format stored in the DB. */
function buildPhoneVariants(phone) {
    var digits = phone.replace(/\D/g, '');
    var last10 = digits.slice(-10);
    var variants = new Set([
        phone, // raw as-is (e.g. +15555555555)
        last10, // 10-digit (5555555555)
        "1".concat(last10), // 11-digit no plus (15555555555)
        "+1".concat(last10),
    ]);
    return __spreadArray([], variants, true).filter(Boolean);
}
var ClientPortalService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var ClientPortalService = _classThis = /** @class */ (function () {
        function ClientPortalService_1(supabaseService, stripeService, smsNotifications) {
            this.supabaseService = supabaseService;
            this.stripeService = stripeService;
            this.smsNotifications = smsNotifications;
            this.logger = new common_1.Logger(ClientPortalService.name);
        }
        /** Helper: returns intake form IDs linked to any of the client's phone variants */
        ClientPortalService_1.prototype.getIntakeFormIds = function (supabase, phoneVariants) {
            return __awaiter(this, void 0, void 0, function () {
                var results;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, Promise.all(phoneVariants.map(function (p) {
                                return supabase.from('intake_forms').select('id').eq('contact_phone', p);
                            }))];
                        case 1:
                            results = _a.sent();
                            return [2 /*return*/, __spreadArray([], new Set(results.flatMap(function (r) { return (r.data || []).map(function (i) { return i.id; }); })), true)];
                    }
                });
            });
        };
        /** Helper: returns event IDs linked to a client's phone variants via intake_forms */
        ClientPortalService_1.prototype.getEventIds = function (supabase, phoneVariants, clientId) {
            return __awaiter(this, void 0, void 0, function () {
                var intakeFormIds, events;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getIntakeFormIds(supabase, phoneVariants)];
                        case 1:
                            intakeFormIds = _a.sent();
                            if (!intakeFormIds.length)
                                return [2 /*return*/, []];
                            return [4 /*yield*/, supabase.from('event').select('id').in('intake_form_id', intakeFormIds)];
                        case 2:
                            events = (_a.sent()).data;
                            return [2 /*return*/, (events || []).map(function (e) { return e.id; })];
                    }
                });
            });
        };
        /** Overview stats for the client dashboard */
        ClientPortalService_1.prototype.getOverview = function (clientId, clientPhone) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, phoneVariants, intakeFormIds, eventSelect, eventIdSet, intakeFormIdSet, invFallback, _i, invFallback_1, r, _a, _b, inv, eventQueries, eventResults, seenEvIds, events, contractQueries, estimateQueries, _c, contractResults, estimateResults, contractSeen, contracts, estimateSeen, estimates, invoiceSelect, invoiceQueries, invoiceResults, invoiceSeen, invoices;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            phoneVariants = buildPhoneVariants(clientPhone);
                            return [4 /*yield*/, this.getIntakeFormIds(supabase, phoneVariants)];
                        case 1:
                            intakeFormIds = _d.sent();
                            eventSelect = 'id, status, total_amount, deposit_amount, payment_status, created_at, name, date, start_time, end_time, venue';
                            eventIdSet = new Set();
                            intakeFormIdSet = new Set(intakeFormIds);
                            return [4 /*yield*/, Promise.all(phoneVariants.map(function (p) { return supabase.from('invoices').select('event_id, intake_form_id').eq('client_phone', p); }))];
                        case 2:
                            invFallback = _d.sent();
                            for (_i = 0, invFallback_1 = invFallback; _i < invFallback_1.length; _i++) {
                                r = invFallback_1[_i];
                                for (_a = 0, _b = (r.data || []); _a < _b.length; _a++) {
                                    inv = _b[_a];
                                    if (inv.event_id)
                                        eventIdSet.add(inv.event_id);
                                    if (inv.intake_form_id)
                                        intakeFormIdSet.add(inv.intake_form_id);
                                }
                            }
                            eventQueries = [];
                            if (intakeFormIdSet.size)
                                eventQueries.push(supabase.from('event').select(eventSelect).in('intake_form_id', __spreadArray([], intakeFormIdSet, true)).order('created_at', { ascending: false }));
                            if (eventIdSet.size)
                                eventQueries.push(supabase.from('event').select(eventSelect).in('id', __spreadArray([], eventIdSet, true)).order('created_at', { ascending: false }));
                            return [4 /*yield*/, Promise.all(eventQueries)];
                        case 3:
                            eventResults = _d.sent();
                            seenEvIds = new Set();
                            events = eventResults
                                .flatMap(function (r) { return r.data || []; })
                                .filter(function (e) { if (seenEvIds.has(e.id))
                                return false; seenEvIds.add(e.id); return true; });
                            contractQueries = [
                                supabase.from('contracts').select('id, status, created_at').eq('client_id', clientId),
                            ];
                            if (intakeFormIdSet.size) {
                                contractQueries.push(supabase.from('contracts').select('id, status, created_at').in('intake_form_id', __spreadArray([], intakeFormIdSet, true)));
                            }
                            estimateQueries = __spreadArray([], phoneVariants.map(function (p) {
                                return supabase.from('estimates').select('id, status, total_amount, created_at').eq('client_phone', p).neq('status', 'draft');
                            }), true);
                            if (intakeFormIdSet.size) {
                                estimateQueries.push(supabase.from('estimates').select('id, status, total_amount, created_at').in('intake_form_id', __spreadArray([], intakeFormIdSet, true)).neq('status', 'draft'));
                            }
                            return [4 /*yield*/, Promise.all([
                                    Promise.all(contractQueries),
                                    Promise.all(estimateQueries),
                                ])];
                        case 4:
                            _c = _d.sent(), contractResults = _c[0], estimateResults = _c[1];
                            contractSeen = new Set();
                            contracts = contractResults
                                .flatMap(function (r) { return r.data || []; })
                                .filter(function (c) { if (contractSeen.has(c.id))
                                return false; contractSeen.add(c.id); return true; });
                            estimateSeen = new Set();
                            estimates = estimateResults
                                .flatMap(function (r) { return r.data || []; })
                                .filter(function (e) { if (estimateSeen.has(e.id))
                                return false; estimateSeen.add(e.id); return true; });
                            invoiceSelect = 'id, invoice_number, status, total_amount, amount_due, amount_paid, due_date, issue_date, created_at, client_name';
                            invoiceQueries = __spreadArray([], phoneVariants.map(function (p) {
                                return supabase.from('invoices').select(invoiceSelect).eq('client_phone', p).neq('status', 'draft').order('created_at', { ascending: false });
                            }), true);
                            if (intakeFormIdSet.size) {
                                invoiceQueries.push(supabase.from('invoices').select(invoiceSelect).in('intake_form_id', __spreadArray([], intakeFormIdSet, true)).neq('status', 'draft').order('created_at', { ascending: false }));
                            }
                            return [4 /*yield*/, Promise.all(invoiceQueries)];
                        case 5:
                            invoiceResults = _d.sent();
                            invoiceSeen = new Set();
                            invoices = invoiceResults
                                .flatMap(function (r) { return r.data || []; })
                                .filter(function (i) { if (invoiceSeen.has(i.id))
                                return false; invoiceSeen.add(i.id); return true; });
                            return [2 /*return*/, { bookings: events, contracts: contracts, estimates: estimates, invoices: invoices }];
                    }
                });
            });
        };
        /** All events/bookings for the client (queried via intake_forms phone match) */
        ClientPortalService_1.prototype.getBookings = function (clientId, clientPhone) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, phoneVariants, intakeFormIds, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            phoneVariants = buildPhoneVariants(clientPhone);
                            return [4 /*yield*/, this.getIntakeFormIds(supabase, phoneVariants)];
                        case 1:
                            intakeFormIds = _b.sent();
                            if (!intakeFormIds.length)
                                return [2 /*return*/, []];
                            return [4 /*yield*/, supabase
                                    .from('event')
                                    .select('*, intake_form:intake_forms!intake_form_id(contact_name, contact_phone, contact_email)')
                                    .in('intake_form_id', intakeFormIds)
                                    .order('created_at', { ascending: false })];
                        case 2:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error) {
                                this.logger.error('getBookings error', error);
                                return [2 /*return*/, []];
                            }
                            return [2 /*return*/, data || []];
                    }
                });
            });
        };
        /** All events for this client (via intake_forms phone match, and via invoices client_phone) */
        ClientPortalService_1.prototype.getEvents = function (clientId, clientPhone) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, phoneVariants, intakeFormIds, eventIdSet, intakeFormIdSet, formsWithEvent, _i, _a, f, invoiceResults, _b, invoiceResults_1, r, _c, _d, inv, queries, results, seen, events, ownerIds, ownersById, owners, _e, _f, o;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            phoneVariants = buildPhoneVariants(clientPhone);
                            this.logger.log("[getEvents] phone=".concat(clientPhone, " variants=").concat(JSON.stringify(phoneVariants)));
                            return [4 /*yield*/, this.getIntakeFormIds(supabase, phoneVariants)];
                        case 1:
                            intakeFormIds = _g.sent();
                            this.logger.log("[getEvents] intakeFormIds count=".concat(intakeFormIds.length, " ids=").concat(JSON.stringify(intakeFormIds)));
                            eventIdSet = new Set();
                            intakeFormIdSet = new Set(intakeFormIds);
                            if (!intakeFormIds.length) return [3 /*break*/, 3];
                            return [4 /*yield*/, supabase
                                    .from('intake_forms')
                                    .select('event_id')
                                    .in('id', intakeFormIds)
                                    .not('event_id', 'is', null)];
                        case 2:
                            formsWithEvent = (_g.sent()).data;
                            for (_i = 0, _a = (formsWithEvent || []); _i < _a.length; _i++) {
                                f = _a[_i];
                                if (f.event_id)
                                    eventIdSet.add(f.event_id);
                            }
                            this.logger.log("[getEvents] eventIdSet after intake_forms.event_id=".concat(JSON.stringify(__spreadArray([], eventIdSet, true))));
                            _g.label = 3;
                        case 3: return [4 /*yield*/, Promise.all(phoneVariants.map(function (p) {
                                return supabase.from('invoices').select('event_id, intake_form_id').eq('client_phone', p);
                            }))];
                        case 4:
                            invoiceResults = _g.sent();
                            for (_b = 0, invoiceResults_1 = invoiceResults; _b < invoiceResults_1.length; _b++) {
                                r = invoiceResults_1[_b];
                                for (_c = 0, _d = (r.data || []); _c < _d.length; _c++) {
                                    inv = _d[_c];
                                    if (inv.event_id)
                                        eventIdSet.add(inv.event_id);
                                    if (inv.intake_form_id)
                                        intakeFormIdSet.add(inv.intake_form_id);
                                }
                            }
                            if (!intakeFormIdSet.size && !eventIdSet.size)
                                return [2 /*return*/, []];
                            this.logger.log("[getEvents] querying events: intakeFormIdSet=".concat(__spreadArray([], intakeFormIdSet, true).length, " eventIdSet=").concat(__spreadArray([], eventIdSet, true).length));
                            queries = [];
                            if (intakeFormIdSet.size) {
                                queries.push(supabase.from('event').select('*').in('intake_form_id', __spreadArray([], intakeFormIdSet, true)));
                            }
                            if (eventIdSet.size) {
                                queries.push(supabase.from('event').select('*').in('id', __spreadArray([], eventIdSet, true)));
                            }
                            return [4 /*yield*/, Promise.all(queries)];
                        case 5:
                            results = _g.sent();
                            seen = new Set();
                            events = results
                                .flatMap(function (r) { return r.data || []; })
                                .filter(function (e) { if (seen.has(e.id))
                                return false; seen.add(e.id); return true; })
                                .sort(function (a, b) { var _a, _b; return ((_a = a.date) !== null && _a !== void 0 ? _a : '').localeCompare((_b = b.date) !== null && _b !== void 0 ? _b : ''); });
                            this.logger.log("[getEvents] found ".concat(events.length, " events"));
                            if (!events.length)
                                return [2 /*return*/, []];
                            ownerIds = __spreadArray([], new Set(events.map(function (e) { return e.owner_id; }).filter(Boolean)), true);
                            ownersById = {};
                            if (!ownerIds.length) return [3 /*break*/, 7];
                            return [4 /*yield*/, supabase
                                    .from('users').select('id, first_name, last_name, phone_number, email').in('id', ownerIds)];
                        case 6:
                            owners = (_g.sent()).data;
                            for (_e = 0, _f = owners || []; _e < _f.length; _e++) {
                                o = _f[_e];
                                ownersById[o.id] = o;
                            }
                            _g.label = 7;
                        case 7: return [2 /*return*/, events.map(function (e) { return (__assign(__assign({}, e), { owner: ownersById[e.owner_id] || null })); })];
                    }
                });
            });
        };
        /** Vendors booked for this client's events, plus any vendors the client booked directly */
        ClientPortalService_1.prototype.getVendors = function (clientId, clientPhone) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, phoneVariants, eventIds, vendorSelect, _a, eventVendorsRes, directVendorsRes, phoneVendorsRes, combined, seen;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            phoneVariants = buildPhoneVariants(clientPhone);
                            return [4 /*yield*/, this.getEventIds(supabase, phoneVariants, clientId)];
                        case 1:
                            eventIds = _b.sent();
                            vendorSelect = "\n      *,\n      vendor:vendor_accounts(\n        id, business_name, category, city, state, phone, email, website, instagram,\n        bio, hourly_rate, flat_rate, rate_description, is_verified, profile_image_url\n      )\n    ";
                            return [4 /*yield*/, Promise.all([
                                    eventIds.length
                                        ? supabase
                                            .from('vendor_bookings')
                                            .select(vendorSelect)
                                            .in('event_id', eventIds)
                                            .in('status', ['confirmed', 'pending', 'completed'])
                                            .order('created_at', { ascending: false })
                                        : { data: [], error: null },
                                    supabase
                                        .from('vendor_bookings')
                                        .select(vendorSelect)
                                        .eq('client_user_id', clientId)
                                        .order('created_at', { ascending: false }),
                                    clientPhone
                                        ? supabase
                                            .from('vendor_bookings')
                                            .select(vendorSelect)
                                            .eq('client_phone', clientPhone)
                                            .order('created_at', { ascending: false })
                                        : { data: [], error: null },
                                ])];
                        case 2:
                            _a = _b.sent(), eventVendorsRes = _a[0], directVendorsRes = _a[1], phoneVendorsRes = _a[2];
                            if (eventVendorsRes.error) {
                                this.logger.error('getVendors (event) error', eventVendorsRes.error);
                            }
                            if (directVendorsRes.error) {
                                this.logger.error('getVendors (direct) error', directVendorsRes.error);
                            }
                            combined = __spreadArray(__spreadArray(__spreadArray([], (eventVendorsRes.data || []), true), (directVendorsRes.data || []), true), (phoneVendorsRes.data || []), true);
                            seen = new Set();
                            return [2 /*return*/, combined.filter(function (b) {
                                    if (seen.has(b.id))
                                        return false;
                                    seen.add(b.id);
                                    return true;
                                })];
                    }
                });
            });
        };
        /** Leave a review for a vendor from the client portal */
        ClientPortalService_1.prototype.leaveVendorReview = function (clientId, reviewerName, vendorAccountId, rating, reviewText) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, vendor, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('vendor_accounts')
                                    .select('id')
                                    .eq('id', vendorAccountId)
                                    .single()];
                        case 1:
                            vendor = (_b.sent()).data;
                            if (!vendor)
                                throw new common_1.NotFoundException('Vendor not found');
                            return [4 /*yield*/, supabase
                                    .from('vendor_reviews')
                                    .insert({
                                    vendor_account_id: vendorAccountId,
                                    reviewer_user_id: clientId,
                                    reviewer_name: reviewerName,
                                    rating: rating,
                                    review_text: reviewText || null,
                                    is_public: true,
                                })
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
        /** Book a vendor directly from the client portal */
        ClientPortalService_1.prototype.bookVendor = function (clientId, clientPhone, clientName, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, vendor, _a, data, error;
                var _b, _c, _d, _e, _f;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('vendor_accounts')
                                    .select('id, business_name')
                                    .eq('id', dto.vendorAccountId)
                                    .eq('is_active', true)
                                    .single()];
                        case 1:
                            vendor = (_g.sent()).data;
                            if (!vendor)
                                throw new common_1.NotFoundException('Vendor not found');
                            return [4 /*yield*/, supabase
                                    .from('vendor_bookings')
                                    .insert({
                                    vendor_account_id: dto.vendorAccountId,
                                    client_user_id: clientId,
                                    client_name: clientName,
                                    client_phone: clientPhone,
                                    booked_by_user_id: clientId,
                                    event_name: dto.eventName,
                                    event_date: dto.eventDate,
                                    start_time: (_b = dto.startTime) !== null && _b !== void 0 ? _b : null,
                                    end_time: (_c = dto.endTime) !== null && _c !== void 0 ? _c : null,
                                    venue_name: (_d = dto.venueName) !== null && _d !== void 0 ? _d : null,
                                    venue_address: (_e = dto.venueAddress) !== null && _e !== void 0 ? _e : null,
                                    notes: (_f = dto.notes) !== null && _f !== void 0 ? _f : null,
                                    status: 'pending',
                                })
                                    .select()
                                    .single()];
                        case 2:
                            _a = _g.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            this.logger.log("Client ".concat(clientId, " booked vendor ").concat(dto.vendorAccountId));
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        /** Browse all active vendors (public directory, accessible within client portal) */
        ClientPortalService_1.prototype.browseVendors = function (category) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, query, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            query = supabase
                                .from('vendor_accounts')
                                .select('id, business_name, category, city, state, bio, profile_image_url, hourly_rate, flat_rate, rate_description, is_verified, phone, email, website, instagram')
                                .eq('is_active', true)
                                .order('business_name', { ascending: true });
                            if (category) {
                                query = query.eq('category', category);
                            }
                            return [4 /*yield*/, query];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error) {
                                this.logger.error('browseVendors error', error);
                                return [2 /*return*/, []];
                            }
                            return [2 /*return*/, data || []];
                    }
                });
            });
        };
        /** Contracts for this client (by client_id, client_phone, or intake_form linked to their phone) */
        ClientPortalService_1.prototype.getContracts = function (clientId, clientPhone) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, phoneVariants, intakeFormIds, contractSelect, queries, results, seen;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            phoneVariants = buildPhoneVariants(clientPhone);
                            return [4 /*yield*/, this.getIntakeFormIds(supabase, phoneVariants)];
                        case 1:
                            intakeFormIds = _a.sent();
                            contractSelect = "*";
                            queries = __spreadArray([
                                supabase.from('contracts').select(contractSelect).eq('client_id', clientId).order('created_at', { ascending: false })
                            ], phoneVariants.map(function (p) {
                                return supabase.from('contracts').select(contractSelect).eq('client_phone', p).order('created_at', { ascending: false });
                            }), true);
                            if (intakeFormIds.length) {
                                queries.push(supabase.from('contracts').select(contractSelect).in('intake_form_id', intakeFormIds).order('created_at', { ascending: false }));
                            }
                            return [4 /*yield*/, Promise.all(queries)];
                        case 2:
                            results = _a.sent();
                            seen = new Set();
                            return [2 /*return*/, results
                                    .flatMap(function (r) {
                                    if (r.error)
                                        _this.logger.error('getContracts error', r.error);
                                    return r.data || [];
                                })
                                    .filter(function (c) {
                                    if (seen.has(c.id))
                                        return false;
                                    seen.add(c.id);
                                    return true;
                                })
                                    .sort(function (a, b) { return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); })];
                    }
                });
            });
        };
        /** Fetch a single contract verifying it belongs to this client */
        ClientPortalService_1.prototype.getContractById = function (contractId, clientId, clientPhone) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, data, error, phoneVariants, intakeFormIds, isOwner;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('contracts')
                                    .select('*')
                                    .eq('id', contractId)
                                    .single()];
                        case 1:
                            _a = _c.sent(), data = _a.data, error = _a.error;
                            if (error || !data)
                                throw new common_1.NotFoundException('Contract not found');
                            phoneVariants = buildPhoneVariants(clientPhone);
                            return [4 /*yield*/, this.getIntakeFormIds(supabase, phoneVariants)];
                        case 2:
                            intakeFormIds = _c.sent();
                            isOwner = data.client_id === clientId ||
                                phoneVariants.includes((_b = data.client_phone) !== null && _b !== void 0 ? _b : '') ||
                                (data.intake_form_id && intakeFormIds.includes(data.intake_form_id));
                            if (!isOwner)
                                throw new common_1.NotFoundException('Contract not found');
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        /** Client signs a contract */
        ClientPortalService_1.prototype.signClientContract = function (contractId, clientId, clientPhone, signatureData, signerName, ipAddress) {
            return __awaiter(this, void 0, void 0, function () {
                var contract, supabase, _a, data, error, contractNumber, ownerUser, _b;
                var _c, _d, _e, _f;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0: return [4 /*yield*/, this.getContractById(contractId, clientId, clientPhone)];
                        case 1:
                            contract = _g.sent();
                            if (contract.status !== 'sent') {
                                throw new common_1.BadRequestException('Contract must be in "sent" status to sign');
                            }
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('contracts')
                                    .update({
                                    signature_data: signatureData,
                                    signer_name: signerName.trim(),
                                    signer_ip_address: ipAddress !== null && ipAddress !== void 0 ? ipAddress : null,
                                    signed_date: new Date().toISOString(),
                                    status: 'signed',
                                })
                                    .eq('id', contractId)
                                    .select()
                                    .single()];
                        case 2:
                            _a = _g.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            _g.label = 3;
                        case 3:
                            _g.trys.push([3, 8, , 9]);
                            contractNumber = (_c = data.contract_number) !== null && _c !== void 0 ? _c : contractId;
                            if (!data.owner_id) return [3 /*break*/, 6];
                            return [4 /*yield*/, supabase
                                    .from('users').select('phone_number').eq('id', data.owner_id).single()];
                        case 4:
                            ownerUser = (_g.sent()).data;
                            return [4 /*yield*/, this.smsNotifications.contractSigned((_d = ownerUser === null || ownerUser === void 0 ? void 0 : ownerUser.phone_number) !== null && _d !== void 0 ? _d : null, signerName, contractNumber)];
                        case 5:
                            _g.sent();
                            _g.label = 6;
                        case 6: return [4 /*yield*/, this.smsNotifications.contractSignedConfirmToClient((_f = (_e = data.client_phone) !== null && _e !== void 0 ? _e : data.contact_phone) !== null && _f !== void 0 ? _f : null, signerName, contractNumber)];
                        case 7:
                            _g.sent();
                            return [3 /*break*/, 9];
                        case 8:
                            _b = _g.sent();
                            return [3 /*break*/, 9];
                        case 9: return [2 /*return*/, data];
                    }
                });
            });
        };
        /** Estimates for this client (by client_phone or intake_form_id) */
        ClientPortalService_1.prototype.getEstimates = function (clientId, clientPhone) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, phoneVariants, intakeFormIds, estimateSelect, queries, results, seen;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            phoneVariants = buildPhoneVariants(clientPhone);
                            return [4 /*yield*/, this.getIntakeFormIds(supabase, phoneVariants)];
                        case 1:
                            intakeFormIds = _a.sent();
                            estimateSelect = "*, items:estimate_items(*), intake_form:intake_forms(contact_name)";
                            queries = __spreadArray([], phoneVariants.map(function (p) {
                                return supabase.from('estimates').select(estimateSelect).eq('client_phone', p).neq('status', 'draft').order('created_at', { ascending: false });
                            }), true);
                            if (intakeFormIds.length) {
                                queries.push(supabase.from('estimates').select(estimateSelect).in('intake_form_id', intakeFormIds).neq('status', 'draft').order('created_at', { ascending: false }));
                            }
                            return [4 /*yield*/, Promise.all(queries)];
                        case 2:
                            results = _a.sent();
                            seen = new Set();
                            return [2 /*return*/, results
                                    .flatMap(function (r) {
                                    if (r.error)
                                        _this.logger.error('getEstimates error', r.error);
                                    return r.data || [];
                                })
                                    .filter(function (e) {
                                    if (seen.has(e.id))
                                        return false;
                                    seen.add(e.id);
                                    return true;
                                })
                                    .sort(function (a, b) { return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); })];
                    }
                });
            });
        };
        /** Single estimate — verifies the client has access */
        ClientPortalService_1.prototype.getEstimateById = function (estimateId, clientId, clientPhone) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, data, error, phoneVariants, intakeFormIds, hasAccess;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('estimates')
                                    .select('*, items:estimate_items(*)')
                                    .eq('id', estimateId)
                                    .single()];
                        case 1:
                            _a = _c.sent(), data = _a.data, error = _a.error;
                            if (error || !data)
                                throw new common_1.NotFoundException('Estimate not found');
                            phoneVariants = buildPhoneVariants(clientPhone);
                            return [4 /*yield*/, this.getIntakeFormIds(supabase, phoneVariants)];
                        case 2:
                            intakeFormIds = _c.sent();
                            hasAccess = phoneVariants.includes((_b = data.client_phone) !== null && _b !== void 0 ? _b : '') ||
                                (data.intake_form_id && intakeFormIds.includes(data.intake_form_id));
                            if (!hasAccess)
                                throw new common_1.NotFoundException('Estimate not found');
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        /** Mark a contract or estimate as viewed (first open only — does not overwrite existing viewed_at) */
        ClientPortalService_1.prototype.markViewed = function (table, id) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from(table)
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
        /** Client approves or rejects an estimate */
        ClientPortalService_1.prototype.respondToEstimate = function (id, clientId, clientPhone, action) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, phoneVariants, intakeFormIds, _a, data, error, hasAccess, updateError;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            phoneVariants = buildPhoneVariants(clientPhone);
                            return [4 /*yield*/, this.getIntakeFormIds(supabase, phoneVariants)];
                        case 1:
                            intakeFormIds = _c.sent();
                            return [4 /*yield*/, supabase.from('estimates').select('id, client_phone, intake_form_id').eq('id', id).single()];
                        case 2:
                            _a = _c.sent(), data = _a.data, error = _a.error;
                            if (error || !data)
                                throw new common_1.NotFoundException('Estimate not found');
                            hasAccess = phoneVariants.includes((_b = data.client_phone) !== null && _b !== void 0 ? _b : '') ||
                                (data.intake_form_id && intakeFormIds.includes(data.intake_form_id));
                            if (!hasAccess)
                                throw new common_1.NotFoundException('Estimate not found');
                            return [4 /*yield*/, supabase
                                    .from('estimates')
                                    .update({ status: action, responded_at: new Date().toISOString() })
                                    .eq('id', id)];
                        case 3:
                            updateError = (_c.sent()).error;
                            if (updateError)
                                throw new Error(updateError.message);
                            return [2 /*return*/, { success: true, status: action }];
                    }
                });
            });
        };
        /** Invoices for this client (by client_phone or intake_form_id) */
        ClientPortalService_1.prototype.getInvoices = function (clientId, clientPhone) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, phoneVariants, intakeFormIds, invoiceSelect, queries, results, seen, invoices, ownerIds, fromNameById, ownerAccounts, _i, _a, oa;
                var _this = this;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            phoneVariants = buildPhoneVariants(clientPhone);
                            return [4 /*yield*/, this.getIntakeFormIds(supabase, phoneVariants)];
                        case 1:
                            intakeFormIds = _b.sent();
                            invoiceSelect = "\n      id, invoice_number, status, total_amount, amount_due, amount_paid,\n      due_date, issue_date, paid_date, created_at, client_name, notes, owner_id,\n      items:invoice_items(id, description, quantity, unit_price, amount, item_type)\n    ";
                            queries = __spreadArray([], phoneVariants.map(function (p) {
                                return supabase.from('invoices').select(invoiceSelect).eq('client_phone', p).neq('status', 'draft').order('created_at', { ascending: false });
                            }), true);
                            if (intakeFormIds.length) {
                                queries.push(supabase.from('invoices').select(invoiceSelect).in('intake_form_id', intakeFormIds).neq('status', 'draft').order('created_at', { ascending: false }));
                            }
                            return [4 /*yield*/, Promise.all(queries)];
                        case 2:
                            results = _b.sent();
                            seen = new Set();
                            invoices = results
                                .flatMap(function (r) {
                                if (r.error)
                                    _this.logger.error('getInvoices error', r.error);
                                return r.data || [];
                            })
                                .filter(function (i) {
                                if (seen.has(i.id))
                                    return false;
                                seen.add(i.id);
                                return true;
                            })
                                .sort(function (a, b) { return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); });
                            ownerIds = __spreadArray([], new Set(invoices.map(function (i) { return i.owner_id; }).filter(Boolean)), true);
                            fromNameById = {};
                            if (!ownerIds.length) return [3 /*break*/, 4];
                            return [4 /*yield*/, supabase
                                    .from('owner_accounts')
                                    .select('primary_owner_id, business_name')
                                    .in('primary_owner_id', ownerIds)];
                        case 3:
                            ownerAccounts = (_b.sent()).data;
                            for (_i = 0, _a = ownerAccounts || []; _i < _a.length; _i++) {
                                oa = _a[_i];
                                if (oa.primary_owner_id && oa.business_name) {
                                    fromNameById[oa.primary_owner_id] = oa.business_name;
                                }
                            }
                            _b.label = 4;
                        case 4: return [2 /*return*/, invoices.map(function (i) {
                                var _a;
                                return (__assign(__assign({}, i), { from_name: i.owner_id ? ((_a = fromNameById[i.owner_id]) !== null && _a !== void 0 ? _a : null) : null }));
                            })];
                    }
                });
            });
        };
        /** Create a Stripe Checkout session for the client to pay an invoice */
        ClientPortalService_1.prototype.createInvoiceCheckout = function (invoiceId, clientId, clientPhone, clientName) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, phoneVariants, invoiceSelect, queries, invoice, _i, _a, q, intakeFormIds, data, url;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            phoneVariants = buildPhoneVariants(clientPhone);
                            invoiceSelect = 'id, client_phone, amount_due, status, booking_id, intake_form_id';
                            queries = phoneVariants.map(function (p) {
                                return supabase.from('invoices').select(invoiceSelect).eq('id', invoiceId).eq('client_phone', p).maybeSingle();
                            });
                            invoice = null;
                            _i = 0;
                            return [4 /*yield*/, Promise.all(queries)];
                        case 1:
                            _a = _b.sent();
                            _b.label = 2;
                        case 2:
                            if (!(_i < _a.length)) return [3 /*break*/, 4];
                            q = _a[_i];
                            if (q.data) {
                                invoice = q.data;
                                return [3 /*break*/, 4];
                            }
                            _b.label = 3;
                        case 3:
                            _i++;
                            return [3 /*break*/, 2];
                        case 4:
                            if (!!invoice) return [3 /*break*/, 7];
                            return [4 /*yield*/, this.getIntakeFormIds(supabase, phoneVariants)];
                        case 5:
                            intakeFormIds = _b.sent();
                            if (!intakeFormIds.length) return [3 /*break*/, 7];
                            return [4 /*yield*/, supabase.from('invoices').select(invoiceSelect).eq('id', invoiceId).in('intake_form_id', intakeFormIds).maybeSingle()];
                        case 6:
                            data = (_b.sent()).data;
                            invoice = data !== null && data !== void 0 ? data : null;
                            _b.label = 7;
                        case 7:
                            if (!invoice)
                                throw new common_1.NotFoundException('Invoice not found');
                            if (invoice.status === 'paid')
                                throw new common_1.BadRequestException('Invoice is already paid');
                            if (Number(invoice.amount_due) <= 0)
                                throw new common_1.BadRequestException('Invoice has no outstanding balance');
                            return [4 /*yield*/, this.stripeService.createInvoiceCheckoutSession(invoiceId, clientName)];
                        case 8:
                            url = _b.sent();
                            return [2 /*return*/, { url: url }];
                    }
                });
            });
        };
        /** Messages between this client and their owner/vendors */
        ClientPortalService_1.prototype.getMessages = function (clientId_unused) {
            return __awaiter(this, void 0, void 0, function () {
                var clientId, supabase, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            clientId = clientId_unused;
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('messages')
                                    .select('*')
                                    .or("recipient_id.eq.".concat(clientId, ",sender_id.eq.").concat(clientId))
                                    .order('created_at', { ascending: false })
                                    .limit(100)];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error) {
                                this.logger.error('getMessages error', error);
                                return [2 /*return*/, []];
                            }
                            return [2 /*return*/, data || []];
                    }
                });
            });
        };
        /** Send a message from the client to the owner or a vendor */
        ClientPortalService_1.prototype.sendMessage = function (clientId, clientPhone, recipientId, content, eventId) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, phoneVariants, intakeFormIds, ownerIds, eventIds, evData, vendorBookings, vendorUserIds, allowedRecipients, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            phoneVariants = buildPhoneVariants(clientPhone);
                            return [4 /*yield*/, this.getIntakeFormIds(supabase, phoneVariants)];
                        case 1:
                            intakeFormIds = _b.sent();
                            ownerIds = [];
                            eventIds = [];
                            if (!intakeFormIds.length) return [3 /*break*/, 3];
                            return [4 /*yield*/, supabase.from('event').select('id, owner_id').in('intake_form_id', intakeFormIds)];
                        case 2:
                            evData = (_b.sent()).data;
                            ownerIds = (evData || []).map(function (e) { return e.owner_id; }).filter(Boolean);
                            eventIds = (evData || []).map(function (e) { return e.id; }).filter(Boolean);
                            _b.label = 3;
                        case 3: return [4 /*yield*/, supabase
                                .from('vendor_bookings').select('vendor_user_id')
                                .in('event_id', eventIds).eq('status', 'confirmed')];
                        case 4:
                            vendorBookings = (_b.sent()).data;
                            vendorUserIds = (vendorBookings || []).map(function (v) { return v.vendor_user_id; }).filter(Boolean);
                            allowedRecipients = __spreadArray([], new Set(__spreadArray(__spreadArray([], ownerIds, true), vendorUserIds, true)), true);
                            if (!allowedRecipients.includes(recipientId)) {
                                throw new Error('You can only message the owner or vendors you are booked with.');
                            }
                            return [4 /*yield*/, supabase
                                    .from('messages')
                                    .insert([{
                                        sender_id: clientId,
                                        recipient_id: recipientId,
                                        content: content,
                                        event_id: eventId || null,
                                        message_type: 'client_message',
                                        status: 'sent',
                                        created_at: new Date().toISOString(),
                                    }])
                                    .select()
                                    .single()];
                        case 5:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error) {
                                this.logger.error('sendMessage error', error);
                                throw new Error('Failed to send message.');
                            }
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        /** Notifications for this client — combines stored DB rows with dynamically generated alerts */
        ClientPortalService_1.prototype.getNotifications = function (clientId, clientPhone) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, stored, error, storedNotifs, dynamic, phoneVariants, now, sevenDays, intakeFormIds, eventIds, bookingIds, upcomingEvents, _i, _b, ev, daysUntil, dayLabel, invoiceSelect_1, invoiceQueries, invoiceResults, invoiceSeen_1, unpaidInvoices, _c, unpaidInvoices_1, inv, dueDate, isOverdue, daysUntilDue, isDueSoon, estimateQueries, estimateResults, estimateSeen_1, newEstimates, _d, newEstimates_1, est, contractQueries, contractResults, contractSeen_1, newContracts, _e, newContracts_1, con, dynErr_1, storedIds, merged;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('notifications')
                                    .select('*')
                                    .eq('user_id', clientId)
                                    .order('created_at', { ascending: false })
                                    .limit(50)];
                        case 1:
                            _a = _f.sent(), stored = _a.data, error = _a.error;
                            if (error) {
                                this.logger.error('getNotifications error', error);
                            }
                            storedNotifs = stored || [];
                            dynamic = [];
                            if (!clientPhone) return [3 /*break*/, 11];
                            _f.label = 2;
                        case 2:
                            _f.trys.push([2, 10, , 11]);
                            phoneVariants = buildPhoneVariants(clientPhone);
                            now = new Date();
                            sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                            return [4 /*yield*/, this.getIntakeFormIds(supabase, phoneVariants)];
                        case 3:
                            intakeFormIds = _f.sent();
                            return [4 /*yield*/, this.getEventIds(supabase, phoneVariants, clientId)];
                        case 4:
                            eventIds = _f.sent();
                            bookingIds = [];
                            if (!eventIds.length) return [3 /*break*/, 6];
                            return [4 /*yield*/, supabase
                                    .from('event')
                                    .select('id, name, date, start_time')
                                    .in('id', eventIds)
                                    .gte('date', now.toISOString().split('T')[0])
                                    .lte('date', sevenDays.toISOString().split('T')[0])
                                    .order('date', { ascending: true })];
                        case 5:
                            upcomingEvents = (_f.sent()).data;
                            for (_i = 0, _b = upcomingEvents || []; _i < _b.length; _i++) {
                                ev = _b[_i];
                                daysUntil = Math.ceil((new Date(ev.date + 'T12:00:00').getTime() - now.getTime()) / 86400000);
                                dayLabel = daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : "in ".concat(daysUntil, " days");
                                dynamic.push({
                                    id: "dynamic-event-".concat(ev.id),
                                    user_id: clientId,
                                    type: 'booking',
                                    title: daysUntil === 0 ? "Your event is TODAY!" : "Upcoming event ".concat(dayLabel),
                                    message: "".concat(ev.name, " is scheduled for ").concat(new Date(ev.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })).concat(ev.start_time ? " at ".concat(ev.start_time) : '', "."),
                                    read: false,
                                    created_at: new Date().toISOString(),
                                    is_dynamic: true,
                                });
                            }
                            _f.label = 6;
                        case 6:
                            invoiceSelect_1 = 'id, invoice_number, status, amount_due, due_date';
                            invoiceQueries = __spreadArray([], phoneVariants.map(function (p) {
                                return supabase.from('invoices').select(invoiceSelect_1).eq('client_phone', p).not('status', 'in', '("draft","paid","cancelled")');
                            }), true);
                            if (intakeFormIds.length) {
                                invoiceQueries.push(supabase.from('invoices').select(invoiceSelect_1).in('intake_form_id', intakeFormIds).not('status', 'in', '("draft","paid","cancelled")'));
                            }
                            return [4 /*yield*/, Promise.all(invoiceQueries)];
                        case 7:
                            invoiceResults = _f.sent();
                            invoiceSeen_1 = new Set();
                            unpaidInvoices = invoiceResults
                                .flatMap(function (r) { return r.data || []; })
                                .filter(function (i) { if (invoiceSeen_1.has(i.id))
                                return false; invoiceSeen_1.add(i.id); return true; });
                            for (_c = 0, unpaidInvoices_1 = unpaidInvoices; _c < unpaidInvoices_1.length; _c++) {
                                inv = unpaidInvoices_1[_c];
                                if (!inv.due_date)
                                    continue;
                                dueDate = new Date(inv.due_date + 'T23:59:59');
                                isOverdue = dueDate < now;
                                daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);
                                isDueSoon = !isOverdue && daysUntilDue <= 7;
                                if (isOverdue) {
                                    dynamic.push({
                                        id: "dynamic-invoice-overdue-".concat(inv.id),
                                        user_id: clientId,
                                        type: 'alert',
                                        title: "Invoice #".concat(inv.invoice_number, " is OVERDUE"),
                                        message: "Your invoice of $".concat(Number(inv.amount_due).toFixed(2), " was due on ").concat(new Date(inv.due_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), ". Please pay as soon as possible."),
                                        read: false,
                                        created_at: new Date().toISOString(),
                                        is_dynamic: true,
                                    });
                                }
                                else if (isDueSoon) {
                                    dynamic.push({
                                        id: "dynamic-invoice-due-".concat(inv.id),
                                        user_id: clientId,
                                        type: 'alert',
                                        title: "Invoice #".concat(inv.invoice_number, " due ").concat(daysUntilDue === 0 ? 'today' : daysUntilDue === 1 ? 'tomorrow' : "in ".concat(daysUntilDue, " days")),
                                        message: "Payment of $".concat(Number(inv.amount_due).toFixed(2), " is due on ").concat(new Date(inv.due_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), "."),
                                        read: false,
                                        created_at: new Date().toISOString(),
                                        is_dynamic: true,
                                    });
                                }
                            }
                            estimateQueries = __spreadArray([], phoneVariants.map(function (p) {
                                return supabase.from('estimates').select('id, status, total_amount, created_at, viewed_at').eq('client_phone', p).eq('status', 'sent').is('viewed_at', null);
                            }), true);
                            if (intakeFormIds.length) {
                                estimateQueries.push(supabase.from('estimates').select('id, status, total_amount, created_at, viewed_at').in('intake_form_id', intakeFormIds).eq('status', 'sent').is('viewed_at', null));
                            }
                            return [4 /*yield*/, Promise.all(estimateQueries)];
                        case 8:
                            estimateResults = _f.sent();
                            estimateSeen_1 = new Set();
                            newEstimates = estimateResults
                                .flatMap(function (r) { return r.data || []; })
                                .filter(function (e) { if (estimateSeen_1.has(e.id))
                                return false; estimateSeen_1.add(e.id); return true; });
                            for (_d = 0, newEstimates_1 = newEstimates; _d < newEstimates_1.length; _d++) {
                                est = newEstimates_1[_d];
                                dynamic.push({
                                    id: "dynamic-estimate-".concat(est.id),
                                    user_id: clientId,
                                    type: 'estimate',
                                    title: 'New estimate received',
                                    message: "You have a new estimate for $".concat(Number(est.total_amount).toFixed(2), " waiting for your review."),
                                    read: false,
                                    created_at: est.created_at,
                                    is_dynamic: true,
                                    link_url: "/client-portal/estimates/".concat(est.id),
                                });
                            }
                            contractQueries = __spreadArray([
                                supabase.from('contracts').select('id, contract_number, status, created_at, viewed_at').eq('client_id', clientId).eq('status', 'sent').is('viewed_at', null)
                            ], phoneVariants.map(function (p) {
                                return supabase.from('contracts').select('id, contract_number, status, created_at, viewed_at').eq('client_phone', p).eq('status', 'sent').is('viewed_at', null);
                            }), true);
                            if (intakeFormIds.length) {
                                contractQueries.push(supabase.from('contracts').select('id, contract_number, status, created_at, viewed_at').in('intake_form_id', intakeFormIds).eq('status', 'sent').is('viewed_at', null));
                            }
                            return [4 /*yield*/, Promise.all(contractQueries)];
                        case 9:
                            contractResults = _f.sent();
                            contractSeen_1 = new Set();
                            newContracts = contractResults
                                .flatMap(function (r) { return r.data || []; })
                                .filter(function (c) { if (contractSeen_1.has(c.id))
                                return false; contractSeen_1.add(c.id); return true; });
                            for (_e = 0, newContracts_1 = newContracts; _e < newContracts_1.length; _e++) {
                                con = newContracts_1[_e];
                                dynamic.push({
                                    id: "dynamic-contract-".concat(con.id),
                                    user_id: clientId,
                                    type: 'contract',
                                    title: 'Contract ready to sign',
                                    message: "A contract".concat(con.contract_number ? " #".concat(con.contract_number) : '', " has been sent to you and is ready for your e-signature."),
                                    read: false,
                                    created_at: con.created_at,
                                    is_dynamic: true,
                                    link_url: "/client-portal/contracts/".concat(con.id),
                                });
                            }
                            return [3 /*break*/, 11];
                        case 10:
                            dynErr_1 = _f.sent();
                            this.logger.warn('[getNotifications] dynamic generation failed:', dynErr_1 === null || dynErr_1 === void 0 ? void 0 : dynErr_1.message);
                            return [3 /*break*/, 11];
                        case 11:
                            storedIds = new Set(storedNotifs.map(function (n) { return n.id; }));
                            merged = __spreadArray(__spreadArray([], storedNotifs, true), dynamic.filter(function (d) { return !storedIds.has(d.id); }), true);
                            return [2 /*return*/, merged.sort(function (a, b) { return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); })];
                    }
                });
            });
        };
        /** Mark a notification as read */
        ClientPortalService_1.prototype.markNotificationRead = function (clientId, notificationId) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('notifications')
                                    .update({ read: true, read_at: new Date().toISOString() })
                                    .eq('id', notificationId)
                                    .eq('user_id', clientId)];
                        case 1:
                            error = (_a.sent()).error;
                            if (error) {
                                this.logger.error('markNotificationRead error', error);
                            }
                            return [2 /*return*/, { success: !error }];
                    }
                });
            });
        };
        /** Events pending client confirmation */
        ClientPortalService_1.prototype.getPendingConfirmations = function (clientId, clientPhone) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, phoneVariants, intakeFormIds, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            phoneVariants = buildPhoneVariants(clientPhone);
                            return [4 /*yield*/, this.getIntakeFormIds(supabase, phoneVariants)];
                        case 1:
                            intakeFormIds = _b.sent();
                            if (!intakeFormIds.length)
                                return [2 /*return*/, []];
                            return [4 /*yield*/, supabase
                                    .from('event')
                                    .select('id, status, client_confirmation_status, name, date, start_time, venue, intake_form:intake_forms!intake_form_id(contact_name, contact_phone)')
                                    .in('intake_form_id', intakeFormIds)
                                    .in('client_confirmation_status', ['pending', null])
                                    .order('created_at', { ascending: false })];
                        case 2:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error) {
                                this.logger.error('getPendingConfirmations error', error);
                                return [2 /*return*/, []];
                            }
                            return [2 /*return*/, data || []];
                    }
                });
            });
        };
        /** Client confirms or rejects an event */
        ClientPortalService_1.prototype.respondToConfirmation = function (clientPhone, eventId, action) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, phoneVariants, intakeFormIds, _a, event, fetchErr, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            phoneVariants = buildPhoneVariants(clientPhone);
                            return [4 /*yield*/, this.getIntakeFormIds(supabase, phoneVariants)];
                        case 1:
                            intakeFormIds = _b.sent();
                            return [4 /*yield*/, supabase
                                    .from('event')
                                    .select('id, intake_form_id, client_confirmation_status')
                                    .eq('id', eventId)
                                    .maybeSingle()];
                        case 2:
                            _a = _b.sent(), event = _a.data, fetchErr = _a.error;
                            if (fetchErr || !event)
                                throw new common_1.NotFoundException('Event not found or already responded to.');
                            if (!intakeFormIds.includes(event.intake_form_id))
                                throw new common_1.NotFoundException('Event not found or already responded to.');
                            return [4 /*yield*/, supabase
                                    .from('event')
                                    .update({ client_confirmation_status: action })
                                    .eq('id', eventId)];
                        case 3:
                            error = (_b.sent()).error;
                            if (error)
                                throw new common_1.BadRequestException(error.message);
                            return [2 /*return*/, { success: true, action: action }];
                    }
                });
            });
        };
        // ── Invite-based confirmation flow ────────────────────────────────────────
        /**
         * Public: look up intake form details by invite token for the landing page.
         * Returns only the event/contact fields needed to display the invite card.
         */
        ClientPortalService_1.prototype.getIntakeFormByToken = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, data, error, contact_phone, contact_email, publicFields;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('intake_forms')
                                    .select('id, contact_name, contact_email, contact_phone, event_type, event_date, event_time, guest_count, venue_preference, special_requests, invite_status, invite_token')
                                    .eq('invite_token', token)
                                    .maybeSingle()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error || !data)
                                throw new common_1.NotFoundException('Invitation not found or has expired.');
                            contact_phone = data.contact_phone, contact_email = data.contact_email, publicFields = __rest(data, ["contact_phone", "contact_email"]);
                            return [2 /*return*/, __assign(__assign({}, publicFields), { 
                                    // Mask the phone so the client knows what to enter (last 4 digits only)
                                    phoneHint: contact_phone ? "***-***-".concat(contact_phone.replace(/\D/g, '').slice(-4)) : null })];
                    }
                });
            });
        };
        /**
         * Confirm an invite: verifies the logged-in client's phone matches the intake form,
         * then creates the event + booking with client_confirmation_status = 'confirmed'.
         * This is the ONLY way a client can confirm their event.
         */
        ClientPortalService_1.prototype.confirmInvite = function (token, clientPhone, clientId) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, form, formErr, clientVariants, formVariants, phoneMatches, event, existingEvent, _b, updatedEvent, upErr, eventData, _c, newEvent, eventErr, notifErr_1;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('intake_forms')
                                    .select('*')
                                    .eq('invite_token', token)
                                    .maybeSingle()];
                        case 1:
                            _a = _d.sent(), form = _a.data, formErr = _a.error;
                            if (formErr || !form)
                                throw new common_1.NotFoundException('Invitation not found.');
                            if (form.invite_status === 'confirmed') {
                                throw new common_1.BadRequestException('This event has already been confirmed.');
                            }
                            clientVariants = buildPhoneVariants(clientPhone);
                            formVariants = form.contact_phone ? buildPhoneVariants(form.contact_phone) : [];
                            phoneMatches = clientVariants.some(function (v) { return formVariants.includes(v); });
                            if (!phoneMatches) {
                                throw new common_1.BadRequestException('The phone number on your account does not match the one on this invitation.');
                            }
                            event = null;
                            return [4 /*yield*/, supabase.from('event').select('*').eq('intake_form_id', form.id).maybeSingle()];
                        case 2:
                            existingEvent = (_d.sent()).data;
                            if (!existingEvent) return [3 /*break*/, 4];
                            return [4 /*yield*/, supabase
                                    .from('event')
                                    .update({ client_confirmation_status: 'confirmed' })
                                    .eq('id', existingEvent.id)
                                    .select().single()];
                        case 3:
                            _b = _d.sent(), updatedEvent = _b.data, upErr = _b.error;
                            if (upErr)
                                throw new common_1.BadRequestException("Failed to update event: ".concat(upErr.message));
                            event = updatedEvent;
                            return [3 /*break*/, 6];
                        case 4:
                            eventData = {
                                name: "".concat(form.event_type || 'Event', " - ").concat(form.contact_name),
                                date: form.event_date,
                                start_time: form.event_time || '00:00',
                                end_time: '23:59',
                                description: form.special_requests || '',
                                status: 'scheduled',
                                guest_count: form.guest_count,
                                venue: form.venue_preference || 'TBD',
                                owner_id: form.user_id,
                                intake_form_id: form.id,
                                client_confirmation_status: 'confirmed',
                            };
                            return [4 /*yield*/, supabase.from('event').insert([eventData]).select().single()];
                        case 5:
                            _c = _d.sent(), newEvent = _c.data, eventErr = _c.error;
                            if (eventErr)
                                throw new common_1.BadRequestException("Failed to create event: ".concat(eventErr.message));
                            event = newEvent;
                            _d.label = 6;
                        case 6: 
                        // 4. Mark intake form as confirmed
                        return [4 /*yield*/, supabase.from('intake_forms').update({ invite_status: 'confirmed', status: 'confirmed' }).eq('id', form.id)];
                        case 7:
                            // 4. Mark intake form as confirmed
                            _d.sent();
                            _d.label = 8;
                        case 8:
                            _d.trys.push([8, 10, , 11]);
                            return [4 /*yield*/, supabase.from('notifications').insert({
                                    user_id: clientId,
                                    event_id: event.id,
                                    type: 'booking',
                                    message: "Your event \"".concat(event.name, "\" has been confirmed! Check the Events tab for details."),
                                    read: false,
                                    created_at: new Date().toISOString(),
                                })];
                        case 9:
                            _d.sent();
                            return [3 /*break*/, 11];
                        case 10:
                            notifErr_1 = _d.sent();
                            this.logger.warn('[confirmInvite] notification insert failed:', notifErr_1);
                            return [3 /*break*/, 11];
                        case 11:
                            this.logger.log("Client ".concat(clientPhone, " confirmed invite ").concat(token, " \u2192 event ").concat(event.id));
                            return [2 /*return*/, { success: true, event: event }];
                    }
                });
            });
        };
        /**
         * Decline an invite via the invite link (before confirming).
         */
        ClientPortalService_1.prototype.declineInvite = function (token, clientPhone) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, form, error, clientVariants, formVariants;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('intake_forms')
                                    .select('id, contact_phone, invite_status')
                                    .eq('invite_token', token)
                                    .maybeSingle()];
                        case 1:
                            _a = _b.sent(), form = _a.data, error = _a.error;
                            if (error || !form)
                                throw new common_1.NotFoundException('Invitation not found.');
                            if (form.invite_status === 'confirmed') {
                                throw new common_1.BadRequestException('This event has already been confirmed and cannot be declined.');
                            }
                            clientVariants = buildPhoneVariants(clientPhone);
                            formVariants = form.contact_phone ? buildPhoneVariants(form.contact_phone) : [];
                            if (!clientVariants.some(function (v) { return formVariants.includes(v); })) {
                                throw new common_1.BadRequestException('Phone number does not match this invitation.');
                            }
                            return [4 /*yield*/, supabase
                                    .from('intake_forms')
                                    .update({ invite_status: 'declined' })
                                    .eq('id', form.id)];
                        case 2:
                            _b.sent();
                            return [2 /*return*/, { success: true, message: 'Invitation declined.' }];
                    }
                });
            });
        };
        /** Items & packages the owner offers */
        ClientPortalService_1.prototype.getItems = function (clientId, clientPhone) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, phoneVariants, intakeFormIds, ownerId, evData, _a, data, error;
                var _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            phoneVariants = buildPhoneVariants(clientPhone);
                            return [4 /*yield*/, this.getIntakeFormIds(supabase, phoneVariants)];
                        case 1:
                            intakeFormIds = _d.sent();
                            ownerId = null;
                            if (!intakeFormIds.length) return [3 /*break*/, 3];
                            return [4 /*yield*/, supabase.from('event').select('owner_id').in('intake_form_id', intakeFormIds).limit(1)];
                        case 2:
                            evData = (_d.sent()).data;
                            ownerId = (_c = (_b = evData === null || evData === void 0 ? void 0 : evData[0]) === null || _b === void 0 ? void 0 : _b.owner_id) !== null && _c !== void 0 ? _c : null;
                            _d.label = 3;
                        case 3:
                            if (!ownerId)
                                return [2 /*return*/, []];
                            return [4 /*yield*/, supabase
                                    .from('service_items')
                                    .select('*')
                                    .eq('owner_id', ownerId)
                                    .eq('is_active', true)
                                    .order('sort_order', { ascending: true })];
                        case 4:
                            _a = _d.sent(), data = _a.data, error = _a.error;
                            if (error) {
                                this.logger.error('getItems error', error);
                                return [2 /*return*/, []];
                            }
                            return [2 /*return*/, data || []];
                    }
                });
            });
        };
        return ClientPortalService_1;
    }());
    __setFunctionName(_classThis, "ClientPortalService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ClientPortalService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ClientPortalService = _classThis;
}();
exports.ClientPortalService = ClientPortalService;
