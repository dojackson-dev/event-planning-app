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
exports.AdminService = void 0;
var common_1 = require("@nestjs/common");
var AdminService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AdminService = _classThis = /** @class */ (function () {
        function AdminService_1(supabaseService) {
            this.supabaseService = supabaseService;
        }
        AdminService_1.prototype.getDashboardStats = function () {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, now, startOfMonth, _a, totalOwners, newOwnersThisMonth, totalClients, newClientsThisMonth, totalEvents, totalBookings, recentOwnersData, invoicesData, activeTrials, totalRevenue;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            now = new Date();
                            startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                            return [4 /*yield*/, Promise.all([
                                    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'owner'),
                                    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'owner').gte('created_at', startOfMonth),
                                    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
                                    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'customer').gte('created_at', startOfMonth),
                                    supabase.from('event').select('*', { count: 'exact', head: true }),
                                    supabase.from('event').select('*', { count: 'exact', head: true }).not('intake_form_id', 'is', null),
                                    supabase.from('users').select('id, email, first_name, last_name, created_at').eq('role', 'owner').order('created_at', { ascending: false }).limit(10),
                                    supabase.from('invoices').select('total_amount').eq('status', 'paid'),
                                    supabase.from('owner_accounts').select('*', { count: 'exact', head: true }).eq('subscription_status', 'trialing'),
                                ])];
                        case 1:
                            _a = _b.sent(), totalOwners = _a[0].count, newOwnersThisMonth = _a[1].count, totalClients = _a[2].count, newClientsThisMonth = _a[3].count, totalEvents = _a[4].count, totalBookings = _a[5].count, recentOwnersData = _a[6].data, invoicesData = _a[7].data, activeTrials = _a[8].count;
                            totalRevenue = (invoicesData === null || invoicesData === void 0 ? void 0 : invoicesData.reduce(function (sum, inv) { return sum + (inv.total_amount || 0); }, 0)) || 0;
                            return [2 /*return*/, {
                                    stats: {
                                        totalOwners: totalOwners || 0,
                                        totalClients: totalClients || 0,
                                        totalEvents: totalEvents || 0,
                                        totalBookings: totalBookings || 0,
                                        totalRevenue: totalRevenue,
                                        activeTrials: activeTrials || 0,
                                        newOwnersThisMonth: newOwnersThisMonth || 0,
                                        newClientsThisMonth: newClientsThisMonth || 0,
                                    },
                                    recentOwners: recentOwnersData || [],
                                }];
                    }
                });
            });
        };
        AdminService_1.prototype.getOwners = function () {
            return __awaiter(this, arguments, void 0, function (page, limit, search) {
                var supabase, offset, query, _a, data, count, error, ownerIds, accounts, _b, accountMap, enriched;
                if (page === void 0) { page = 1; }
                if (limit === void 0) { limit = 20; }
                if (search === void 0) { search = ''; }
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            offset = (page - 1) * limit;
                            query = supabase
                                .from('users')
                                .select('id, email, first_name, last_name, phone_number, created_at, status', { count: 'exact' })
                                .eq('role', 'owner')
                                .order('created_at', { ascending: false })
                                .range(offset, offset + limit - 1);
                            if (search) {
                                query = query.or("email.ilike.%".concat(search, "%,first_name.ilike.%").concat(search, "%,last_name.ilike.%").concat(search, "%,business_name.ilike.%").concat(search, "%"));
                            }
                            return [4 /*yield*/, query];
                        case 1:
                            _a = _c.sent(), data = _a.data, count = _a.count, error = _a.error;
                            if (error)
                                throw error;
                            ownerIds = (data || []).map(function (o) { return o.id; });
                            if (!ownerIds.length) return [3 /*break*/, 3];
                            return [4 /*yield*/, supabase.from('owner_accounts').select('primary_owner_id, business_name, subscription_status, trial_ends_at, stripe_customer_id').in('primary_owner_id', ownerIds)];
                        case 2:
                            _b = _c.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            _b = { data: [] };
                            _c.label = 4;
                        case 4:
                            accounts = (_b).data;
                            accountMap = new Map((accounts || []).map(function (a) { return [a.primary_owner_id, a]; }));
                            enriched = (data || []).map(function (owner) {
                                var acct = accountMap.get(owner.id) || null;
                                return __assign(__assign({}, owner), { phone: owner.phone_number, business_name: (acct === null || acct === void 0 ? void 0 : acct.business_name) || null, subscription: acct ? {
                                        subscription_status: acct.subscription_status,
                                        trial_ends_at: acct.trial_ends_at,
                                        stripe_customer_id: acct.stripe_customer_id,
                                    } : null });
                            });
                            return [2 /*return*/, { owners: enriched, total: count || 0, page: page, limit: limit }];
                    }
                });
            });
        };
        AdminService_1.prototype.getEvents = function () {
            return __awaiter(this, arguments, void 0, function (page, limit, search, ownerId) {
                var supabase, offset, query, _a, data, count, error, ownerIds, owners, _b, ownerMap, enriched;
                if (page === void 0) { page = 1; }
                if (limit === void 0) { limit = 20; }
                if (search === void 0) { search = ''; }
                if (ownerId === void 0) { ownerId = ''; }
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            offset = (page - 1) * limit;
                            query = supabase
                                .from('event')
                                .select('id, name, description, date, start_time, end_time, venue, location, guest_count, status, owner_id, budget, created_at', { count: 'exact' })
                                .order('created_at', { ascending: false })
                                .range(offset, offset + limit - 1);
                            if (search) {
                                query = query.ilike('name', "%".concat(search, "%"));
                            }
                            if (ownerId) {
                                query = query.eq('owner_id', ownerId);
                            }
                            return [4 /*yield*/, query];
                        case 1:
                            _a = _c.sent(), data = _a.data, count = _a.count, error = _a.error;
                            if (error)
                                throw error;
                            ownerIds = __spreadArray([], new Set((data || []).map(function (e) { return e.owner_id; }).filter(Boolean)), true);
                            if (!ownerIds.length) return [3 /*break*/, 3];
                            return [4 /*yield*/, supabase.from('users').select('id, email, first_name, last_name').in('id', ownerIds)];
                        case 2:
                            _b = _c.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            _b = { data: [] };
                            _c.label = 4;
                        case 4:
                            owners = (_b).data;
                            ownerMap = new Map((owners || []).map(function (o) { return [o.id, o]; }));
                            enriched = (data || []).map(function (event) { return (__assign(__assign({}, event), { owner: ownerMap.get(event.owner_id) || null })); });
                            return [2 /*return*/, { events: enriched, total: count || 0, page: page, limit: limit }];
                    }
                });
            });
        };
        AdminService_1.prototype.getBookings = function () {
            return __awaiter(this, arguments, void 0, function (page, limit, search, ownerId) {
                var supabase, offset, query, _a, data, count, error, ownerIds, owners, _b, ownerMap, enriched;
                if (page === void 0) { page = 1; }
                if (limit === void 0) { limit = 20; }
                if (search === void 0) { search = ''; }
                if (ownerId === void 0) { ownerId = ''; }
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            offset = (page - 1) * limit;
                            query = supabase
                                .from('event')
                                .select('id, name, date, status, client_confirmation_status, payment_status, total_amount, deposit_amount, owner_id, intake_form_id, created_at, intake_form:intake_forms!intake_form_id(contact_name, contact_email, contact_phone)', { count: 'exact' })
                                .not('intake_form_id', 'is', null)
                                .order('created_at', { ascending: false })
                                .range(offset, offset + limit - 1);
                            if (search) {
                                query = query.ilike('name', "%".concat(search, "%"));
                            }
                            if (ownerId) {
                                query = query.eq('owner_id', ownerId);
                            }
                            return [4 /*yield*/, query];
                        case 1:
                            _a = _c.sent(), data = _a.data, count = _a.count, error = _a.error;
                            if (error)
                                throw error;
                            ownerIds = __spreadArray([], new Set((data || []).map(function (b) { return b.owner_id; }).filter(Boolean)), true);
                            if (!ownerIds.length) return [3 /*break*/, 3];
                            return [4 /*yield*/, supabase.from('users').select('id, email, first_name, last_name').in('id', ownerIds)];
                        case 2:
                            _b = _c.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            _b = { data: [] };
                            _c.label = 4;
                        case 4:
                            owners = (_b).data;
                            ownerMap = new Map((owners || []).map(function (o) { return [o.id, o]; }));
                            enriched = (data || []).map(function (b) { return (__assign(__assign({}, b), { owner: ownerMap.get(b.owner_id) || null })); });
                            return [2 /*return*/, { bookings: enriched, total: count || 0, page: page, limit: limit }];
                    }
                });
            });
        };
        AdminService_1.prototype.getClients = function () {
            return __awaiter(this, arguments, void 0, function (page, limit, search) {
                var supabase, offset, query, _a, data, count, error;
                if (page === void 0) { page = 1; }
                if (limit === void 0) { limit = 20; }
                if (search === void 0) { search = ''; }
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            offset = (page - 1) * limit;
                            query = supabase
                                .from('users')
                                .select('id, email, first_name, last_name, phone_number, created_at, status', { count: 'exact' })
                                .eq('role', 'customer')
                                .order('created_at', { ascending: false })
                                .range(offset, offset + limit - 1);
                            if (search) {
                                query = query.or("email.ilike.%".concat(search, "%,first_name.ilike.%").concat(search, "%,last_name.ilike.%").concat(search, "%"));
                            }
                            return [4 /*yield*/, query];
                        case 1:
                            _a = _b.sent(), data = _a.data, count = _a.count, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, { clients: data || [], total: count || 0, page: page, limit: limit }];
                    }
                });
            });
        };
        AdminService_1.prototype.getRevenue = function () {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, accounts, paidInvoices, activeSubscriptions, cancelledSubscriptions, totalRevenue, now, monthlyData, i, d, revenueByMonth, ownerIds, owners, _b, ownerMap, recentPayments;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, Promise.all([
                                    supabase.from('owner_accounts').select('id, subscription_status, primary_owner_id'),
                                    supabase.from('invoices').select('id, total_amount, status, created_at, owner_id').eq('status', 'paid').order('created_at', { ascending: false }).limit(50),
                                ])];
                        case 1:
                            _a = _c.sent(), accounts = _a[0].data, paidInvoices = _a[1].data;
                            activeSubscriptions = (accounts || []).filter(function (a) { return ['active', 'trialing'].includes(a.subscription_status); }).length;
                            cancelledSubscriptions = (accounts || []).filter(function (a) { return a.subscription_status === 'cancelled'; }).length;
                            totalRevenue = (paidInvoices || []).reduce(function (s, inv) { return s + (inv.total_amount || 0); }, 0);
                            now = new Date();
                            monthlyData = {};
                            for (i = 5; i >= 0; i--) {
                                d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                                monthlyData[d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })] = 0;
                            }
                            (paidInvoices || []).forEach(function (inv) {
                                var key = new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                                if (monthlyData[key] !== undefined)
                                    monthlyData[key] += inv.total_amount || 0;
                            });
                            revenueByMonth = Object.entries(monthlyData).map(function (_a) {
                                var month = _a[0], amount = _a[1];
                                return ({ month: month, amount: amount });
                            });
                            ownerIds = __spreadArray([], new Set((paidInvoices || []).map(function (i) { return i.owner_id; }).filter(Boolean)), true);
                            if (!ownerIds.length) return [3 /*break*/, 3];
                            return [4 /*yield*/, supabase.from('users').select('id, first_name, last_name').in('id', ownerIds)];
                        case 2:
                            _b = _c.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            _b = { data: [] };
                            _c.label = 4;
                        case 4:
                            owners = (_b).data;
                            ownerMap = new Map((owners || []).map(function (o) { return [o.id, o]; }));
                            recentPayments = (paidInvoices || []).slice(0, 10).map(function (inv) {
                                var owner = ownerMap.get(inv.owner_id);
                                return {
                                    id: inv.id,
                                    owner_name: owner ? "".concat(owner.first_name, " ").concat(owner.last_name) : 'Unknown Owner',
                                    amount: inv.total_amount || 0,
                                    status: 'succeeded',
                                    created_at: inv.created_at,
                                };
                            });
                            return [2 /*return*/, {
                                    totalRevenue: totalRevenue,
                                    monthlyRevenue: activeSubscriptions * 29.99,
                                    activeSubscriptions: activeSubscriptions,
                                    cancelledSubscriptions: cancelledSubscriptions,
                                    revenueByMonth: revenueByMonth,
                                    recentPayments: recentPayments,
                                }];
                    }
                });
            });
        };
        AdminService_1.prototype.getAnalytics = function () {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, now, sixMonthsAgo, _a, totalOwners, totalClients, totalEvents, totalBookings, recentOwners, recentClients, recentEvents, buildMonthly, calcGrowth;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            now = new Date();
                            sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();
                            return [4 /*yield*/, Promise.all([
                                    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'owner'),
                                    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
                                    supabase.from('event').select('*', { count: 'exact', head: true }),
                                    supabase.from('event').select('*', { count: 'exact', head: true }).not('intake_form_id', 'is', null),
                                    supabase.from('users').select('id, created_at').eq('role', 'owner').gte('created_at', sixMonthsAgo),
                                    supabase.from('users').select('id, created_at').eq('role', 'customer').gte('created_at', sixMonthsAgo),
                                    supabase.from('event').select('id, created_at').gte('created_at', sixMonthsAgo),
                                ])];
                        case 1:
                            _a = _b.sent(), totalOwners = _a[0].count, totalClients = _a[1].count, totalEvents = _a[2].count, totalBookings = _a[3].count, recentOwners = _a[4].data, recentClients = _a[5].data, recentEvents = _a[6].data;
                            buildMonthly = function (items) {
                                var months = {};
                                for (var i = 5; i >= 0; i--) {
                                    var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                                    months[d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })] = 0;
                                }
                                (items || []).forEach(function (item) {
                                    if (!item.created_at)
                                        return;
                                    var key = new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                                    if (months[key] !== undefined)
                                        months[key]++;
                                });
                                return Object.entries(months).map(function (_a) {
                                    var month = _a[0], count = _a[1];
                                    return ({ month: month, count: count });
                                });
                            };
                            calcGrowth = function (items) {
                                var thisMonth = (items || []).filter(function (item) {
                                    var d = new Date(item.created_at);
                                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                                }).length;
                                var lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                var lastMonth = (items || []).filter(function (item) {
                                    var d = new Date(item.created_at);
                                    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
                                }).length;
                                if (lastMonth === 0)
                                    return thisMonth > 0 ? 100 : 0;
                                return Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
                            };
                            return [2 /*return*/, {
                                    totalOwners: totalOwners || 0,
                                    totalClients: totalClients || 0,
                                    totalEvents: totalEvents || 0,
                                    totalBookings: totalBookings || 0,
                                    monthlyGrowth: {
                                        owners: calcGrowth(recentOwners || []),
                                        clients: calcGrowth(recentClients || []),
                                        events: calcGrowth(recentEvents || []),
                                        bookings: 0,
                                    },
                                    ownersByMonth: buildMonthly(recentOwners || []),
                                    clientsByMonth: buildMonthly(recentClients || []),
                                    eventsByMonth: buildMonthly(recentEvents || []),
                                }];
                    }
                });
            });
        };
        AdminService_1.prototype.getActivity = function () {
            return __awaiter(this, arguments, void 0, function (page, limit, search, roleFilter) {
                var supabase, offset, query, _a, data, count, error;
                if (page === void 0) { page = 1; }
                if (limit === void 0) { limit = 100; }
                if (search === void 0) { search = ''; }
                if (roleFilter === void 0) { roleFilter = ''; }
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            offset = (page - 1) * limit;
                            query = supabase
                                .from('users')
                                .select('id, email, first_name, last_name, role, last_sign_in_at, login_count, created_at', { count: 'exact' })
                                .order('last_sign_in_at', { ascending: false, nullsFirst: false })
                                .range(offset, offset + limit - 1);
                            if (search) {
                                query = query.or("email.ilike.%".concat(search, "%,first_name.ilike.%").concat(search, "%,last_name.ilike.%").concat(search, "%"));
                            }
                            if (roleFilter && roleFilter !== 'all') {
                                query = query.eq('role', roleFilter);
                            }
                            return [4 /*yield*/, query];
                        case 1:
                            _a = _b.sent(), data = _a.data, count = _a.count, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, { activity: data || [], total: count || 0, page: page, limit: limit }];
                    }
                });
            });
        };
        AdminService_1.prototype.getTrials = function () {
            return __awaiter(this, arguments, void 0, function (page, limit, search) {
                var supabase, offset, _a, accounts, count, error, ownerIds, owners, _b, ownerMap, now, enriched, s_1;
                if (page === void 0) { page = 1; }
                if (limit === void 0) { limit = 50; }
                if (search === void 0) { search = ''; }
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            offset = (page - 1) * limit;
                            return [4 /*yield*/, supabase
                                    .from('owner_accounts')
                                    .select('id, primary_owner_id, subscription_status, trial_ends_at, trial_days_used, created_at', { count: 'exact' })
                                    .eq('subscription_status', 'trialing')
                                    .order('trial_ends_at', { ascending: true })
                                    .range(offset, offset + limit - 1)];
                        case 1:
                            _a = _c.sent(), accounts = _a.data, count = _a.count, error = _a.error;
                            if (error)
                                throw error;
                            ownerIds = (accounts || []).map(function (a) { return a.primary_owner_id; }).filter(Boolean);
                            if (!ownerIds.length) return [3 /*break*/, 3];
                            return [4 /*yield*/, supabase.from('users').select('id, email, first_name, last_name').in('id', ownerIds)];
                        case 2:
                            _b = _c.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            _b = { data: [] };
                            _c.label = 4;
                        case 4:
                            owners = (_b).data;
                            ownerMap = new Map((owners || []).map(function (o) { return [o.id, o]; }));
                            now = Date.now();
                            enriched = (accounts || []).map(function (a) { return (__assign(__assign({}, a), { owner: ownerMap.get(a.primary_owner_id) || null, daysRemaining: a.trial_ends_at
                                    ? Math.max(0, Math.ceil((new Date(a.trial_ends_at).getTime() - now) / 86400000))
                                    : null })); });
                            if (search) {
                                s_1 = search.toLowerCase();
                                enriched = enriched.filter(function (a) {
                                    var _a, _b, _c, _d, _e, _f;
                                    return ((_b = (_a = a.owner) === null || _a === void 0 ? void 0 : _a.email) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(s_1)) ||
                                        ((_d = (_c = a.owner) === null || _c === void 0 ? void 0 : _c.first_name) === null || _d === void 0 ? void 0 : _d.toLowerCase().includes(s_1)) ||
                                        ((_f = (_e = a.owner) === null || _e === void 0 ? void 0 : _e.last_name) === null || _f === void 0 ? void 0 : _f.toLowerCase().includes(s_1));
                                });
                            }
                            return [2 /*return*/, { trials: enriched, total: count || 0, page: page, limit: limit }];
                    }
                });
            });
        };
        AdminService_1.prototype.updateOwnerTrial = function (ownerId, action, days) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, data_1, error_1, trialDays, trialEndDate, _b, data_2, error_2, account, currentEnd, _c, data, error;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            if (!(action === 'end')) return [3 /*break*/, 2];
                            return [4 /*yield*/, supabase
                                    .from('owner_accounts')
                                    .update({ subscription_status: 'cancelled', trial_ends_at: null })
                                    .eq('primary_owner_id', ownerId)
                                    .select().maybeSingle()];
                        case 1:
                            _a = _d.sent(), data_1 = _a.data, error_1 = _a.error;
                            if (error_1)
                                throw error_1;
                            return [2 /*return*/, data_1];
                        case 2:
                            trialDays = days || 14;
                            if (!(action === 'grant')) return [3 /*break*/, 4];
                            trialEndDate = new Date();
                            trialEndDate.setDate(trialEndDate.getDate() + trialDays);
                            return [4 /*yield*/, supabase
                                    .from('owner_accounts')
                                    .update({ subscription_status: 'trialing', trial_ends_at: trialEndDate.toISOString() })
                                    .eq('primary_owner_id', ownerId)
                                    .select().maybeSingle()];
                        case 3:
                            _b = _d.sent(), data_2 = _b.data, error_2 = _b.error;
                            if (error_2)
                                throw error_2;
                            return [2 /*return*/, data_2];
                        case 4: return [4 /*yield*/, supabase
                                .from('owner_accounts')
                                .select('trial_ends_at')
                                .eq('primary_owner_id', ownerId)
                                .maybeSingle()];
                        case 5:
                            account = (_d.sent()).data;
                            currentEnd = (account === null || account === void 0 ? void 0 : account.trial_ends_at) ? new Date(account.trial_ends_at) : new Date();
                            currentEnd.setDate(currentEnd.getDate() + trialDays);
                            return [4 /*yield*/, supabase
                                    .from('owner_accounts')
                                    .update({ trial_ends_at: currentEnd.toISOString() })
                                    .eq('primary_owner_id', ownerId)
                                    .select().maybeSingle()];
                        case 6:
                            _c = _d.sent(), data = _c.data, error = _c.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        AdminService_1.prototype.getOwnerDetail = function (ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, user, account, eventCount, invoiceCount, invoices, totalRevenue;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, Promise.all([
                                    supabase.from('users').select('*').eq('id', ownerId).single(),
                                    supabase.from('owner_accounts').select('*').eq('primary_owner_id', ownerId).maybeSingle(),
                                    supabase.from('events').select('*', { count: 'exact', head: true }).eq('owner_id', ownerId),
                                    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('owner_id', ownerId),
                                    supabase.from('invoices').select('total_amount, status').eq('owner_id', ownerId),
                                ])];
                        case 1:
                            _a = _b.sent(), user = _a[0].data, account = _a[1].data, eventCount = _a[2].count, invoiceCount = _a[3].count, invoices = _a[4].data;
                            totalRevenue = (invoices || []).filter(function (i) { return i.status === 'paid'; }).reduce(function (s, i) { return s + (i.total_amount || 0); }, 0);
                            return [2 /*return*/, { user: user, account: account, eventCount: eventCount || 0, invoiceCount: invoiceCount || 0, totalRevenue: totalRevenue }];
                    }
                });
            });
        };
        AdminService_1.prototype.updateOwnerStatus = function (ownerId, status) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase.from('users').update({ status: status }).eq('id', ownerId).select().single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        AdminService_1.prototype.getTrialSettings = function () {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase.from('app_settings').select('value').eq('key', 'FREE_TRIAL_DAYS').single()];
                        case 1:
                            data = (_a.sent()).data;
                            return [2 /*return*/, { trialDays: (data === null || data === void 0 ? void 0 : data.value) ? parseInt(data.value) : 30 }];
                    }
                });
            });
        };
        AdminService_1.prototype.updateTrialSettings = function (trialDays) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('app_settings')
                                    .upsert({ key: 'FREE_TRIAL_DAYS', value: String(trialDays) }, { onConflict: 'key' })
                                    .select()
                                    .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, { trialDays: trialDays }];
                    }
                });
            });
        };
        return AdminService_1;
    }());
    __setFunctionName(_classThis, "AdminService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AdminService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AdminService = _classThis;
}();
exports.AdminService = AdminService;
