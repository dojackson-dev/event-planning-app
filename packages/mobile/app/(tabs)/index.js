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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HomeScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var vector_icons_1 = require("@expo/vector-icons");
var supabase_1 = require("@/lib/supabase");
var theme_1 = require("@/lib/theme");
function HomeScreen() {
    var _this = this;
    var router = (0, expo_router_1.useRouter)();
    var _a = (0, react_1.useState)({
        upcomingEvents: 0,
        confirmedBookings: 0,
        totalClients: 0,
        unpaidInvoices: 0,
        unpaidAmount: 0,
        revenue: 0,
    }), stats = _a[0], setStats = _a[1];
    var _b = (0, react_1.useState)([]), upcomingEvents = _b[0], setUpcomingEvents = _b[1];
    var _c = (0, react_1.useState)(''), userName = _c[0], setUserName = _c[1];
    var _d = (0, react_1.useState)(true), loading = _d[0], setLoading = _d[1];
    var _e = (0, react_1.useState)(false), refreshing = _e[0], setRefreshing = _e[1];
    (0, react_1.useEffect)(function () {
        loadData();
    }, []);
    var loadData = function () { return __awaiter(_this, void 0, void 0, function () {
        var user, today, _a, eventsRes, bookingsRes, clientsRes, invoicesRes, events, bookings, clients, invoices, unpaid, revenue, err_1;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 3, 4, 5]);
                    return [4 /*yield*/, supabase_1.supabase.auth.getUser()];
                case 1:
                    user = (_c.sent()).data.user;
                    if (!user)
                        return [2 /*return*/];
                    setUserName(((_b = user.email) === null || _b === void 0 ? void 0 : _b.split('@')[0]) || 'there');
                    today = new Date().toISOString().split('T')[0];
                    return [4 /*yield*/, Promise.all([
                            supabase_1.supabase.from('event').select('id, name, date, venue').eq('owner_id', user.id).gte('date', today).order('date').limit(5),
                            supabase_1.supabase.from('booking').select('id, client_status, total_amount').eq('user_id', user.id).in('client_status', ['deposit_paid', 'completed']),
                            supabase_1.supabase.from('intake_forms').select('id').eq('user_id', user.id),
                            supabase_1.supabase.from('invoices').select('id, status, amount_due, amount_paid').eq('owner_id', user.id),
                        ])];
                case 2:
                    _a = _c.sent(), eventsRes = _a[0], bookingsRes = _a[1], clientsRes = _a[2], invoicesRes = _a[3];
                    events = eventsRes.data || [];
                    bookings = bookingsRes.data || [];
                    clients = clientsRes.data || [];
                    invoices = invoicesRes.data || [];
                    unpaid = invoices.filter(function (inv) { var _a; return inv.status !== 'paid' && inv.status !== 'cancelled' && Number((_a = inv.amount_due) !== null && _a !== void 0 ? _a : 0) > 0; });
                    revenue = invoices.reduce(function (sum, inv) { var _a; return sum + Number((_a = inv.amount_paid) !== null && _a !== void 0 ? _a : 0); }, 0);
                    setStats({
                        upcomingEvents: events.length,
                        confirmedBookings: bookings.length,
                        totalClients: clients.length,
                        unpaidInvoices: unpaid.length,
                        unpaidAmount: unpaid.reduce(function (sum, inv) { var _a; return sum + Number((_a = inv.amount_due) !== null && _a !== void 0 ? _a : 0); }, 0),
                        revenue: revenue,
                    });
                    setUpcomingEvents(events.slice(0, 3));
                    return [3 /*break*/, 5];
                case 3:
                    err_1 = _c.sent();
                    console.error('Error loading dashboard:', err_1.message);
                    return [3 /*break*/, 5];
                case 4:
                    setLoading(false);
                    setRefreshing(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var onRefresh = function () {
        setRefreshing(true);
        loadData();
    };
    var fmt = function (n) {
        return n >= 1000 ? "$".concat((n / 1000).toFixed(1), "k") : "$".concat(n.toFixed(0));
    };
    if (loading) {
        return (<react_native_1.View style={styles.centered}>
        <react_native_1.ActivityIndicator size="large" color={theme_1.Colors.primary}/>
      </react_native_1.View>);
    }
    return (<react_native_1.ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<react_native_1.RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme_1.Colors.primary}/>}>
      {/* Greeting */}
      <react_native_1.View style={styles.greeting}>
        <react_native_1.Text style={styles.greetingText}>Welcome back, {userName} 👋</react_native_1.Text>
        <react_native_1.Text style={styles.greetingSubtext}>Here's what's happening today</react_native_1.Text>
      </react_native_1.View>

      {/* Stats Grid */}
      <react_native_1.View style={styles.statsGrid}>
        <react_native_1.TouchableOpacity style={[styles.statCard, styles.statBlue]} onPress={function () { return router.push('/(tabs)/events'); }}>
          <vector_icons_1.Ionicons name="calendar-outline" size={22} color={theme_1.Colors.primary}/>
          <react_native_1.Text style={styles.statNumber}>{stats.upcomingEvents}</react_native_1.Text>
          <react_native_1.Text style={styles.statLabel}>Upcoming Events</react_native_1.Text>
        </react_native_1.TouchableOpacity>

        <react_native_1.TouchableOpacity style={[styles.statCard, styles.statGreen]} onPress={function () { return router.push('/(tabs)/bookings'); }}>
          <vector_icons_1.Ionicons name="checkmark-circle-outline" size={22} color={theme_1.Colors.success}/>
          <react_native_1.Text style={[styles.statNumber, { color: theme_1.Colors.success }]}>{stats.confirmedBookings}</react_native_1.Text>
          <react_native_1.Text style={styles.statLabel}>Booked Events</react_native_1.Text>
        </react_native_1.TouchableOpacity>

        <react_native_1.TouchableOpacity style={[styles.statCard, styles.statPurple]} onPress={function () { return router.push('/(tabs)/clients'); }}>
          <vector_icons_1.Ionicons name="people-outline" size={22} color={theme_1.Colors.purple}/>
          <react_native_1.Text style={[styles.statNumber, { color: theme_1.Colors.purple }]}>{stats.totalClients}</react_native_1.Text>
          <react_native_1.Text style={styles.statLabel}>Total Clients</react_native_1.Text>
        </react_native_1.TouchableOpacity>

        <react_native_1.TouchableOpacity style={[styles.statCard, styles.statRed]} onPress={function () { return router.push('/(tabs)/invoices'); }}>
          <vector_icons_1.Ionicons name="receipt-outline" size={22} color={theme_1.Colors.error}/>
          <react_native_1.Text style={[styles.statNumber, { color: theme_1.Colors.error }]}>{stats.unpaidInvoices}</react_native_1.Text>
          <react_native_1.Text style={styles.statLabel}>Unpaid Invoices</react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>

      {/* Revenue Card */}
      <react_native_1.View style={styles.revenueCard}>
        <react_native_1.View style={styles.revenueRow}>
          <react_native_1.View>
            <react_native_1.Text style={styles.revenueLabel}>Total Revenue</react_native_1.Text>
            <react_native_1.Text style={styles.revenueValue}>{fmt(stats.revenue)}</react_native_1.Text>
          </react_native_1.View>
          <react_native_1.View style={styles.revenueBadge}>
            <vector_icons_1.Ionicons name="trending-up" size={18} color={theme_1.Colors.success}/>
          </react_native_1.View>
        </react_native_1.View>
        {stats.unpaidAmount > 0 && (<react_native_1.Text style={styles.revenueNote}>
            {fmt(stats.unpaidAmount)} pending collection
          </react_native_1.Text>)}
      </react_native_1.View>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (<react_native_1.View style={styles.section}>
          <react_native_1.View style={styles.sectionHeader}>
            <react_native_1.Text style={styles.sectionTitle}>Upcoming Events</react_native_1.Text>
            <react_native_1.TouchableOpacity onPress={function () { return router.push('/(tabs)/events'); }}>
              <react_native_1.Text style={styles.sectionLink}>View all</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>
          {upcomingEvents.map(function (event) { return (<react_native_1.TouchableOpacity key={event.id} style={styles.eventRow} onPress={function () { return router.push("/(tabs)/events/".concat(event.id)); }} activeOpacity={0.7}>
              <react_native_1.View style={styles.eventDateBadge}>
                <react_native_1.Text style={styles.eventDateDay}>
                  {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric' })}
                </react_native_1.Text>
                <react_native_1.Text style={styles.eventDateMonth}>
                  {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                </react_native_1.Text>
              </react_native_1.View>
              <react_native_1.View style={styles.eventInfo}>
                <react_native_1.Text style={styles.eventName} numberOfLines={1}>{event.name}</react_native_1.Text>
                {event.venue && (<react_native_1.Text style={styles.eventVenue} numberOfLines={1}>
                    <vector_icons_1.Ionicons name="location-outline" size={12} color={theme_1.Colors.textMuted}/> {event.venue}
                  </react_native_1.Text>)}
              </react_native_1.View>
              <vector_icons_1.Ionicons name="chevron-forward" size={16} color={theme_1.Colors.textMuted}/>
            </react_native_1.TouchableOpacity>); })}
        </react_native_1.View>)}

      {/* My Workspace — all tabs as nav cards */}
      <react_native_1.View style={styles.section}>
        <react_native_1.Text style={styles.sectionTitle}>My Workspace</react_native_1.Text>
        <react_native_1.View style={styles.navGrid}>
          {[
            { icon: 'calendar', color: theme_1.Colors.primary, light: theme_1.Colors.primaryLight, label: 'Events', desc: 'View & manage events', route: '/(tabs)/events' },
            { icon: 'checkmark-circle', color: theme_1.Colors.success, light: theme_1.Colors.successLight, label: 'Booked', desc: 'Confirmed bookings', route: '/(tabs)/bookings' },
            { icon: 'people', color: theme_1.Colors.purple, light: theme_1.Colors.purpleLight, label: 'Clients', desc: 'Intake & client leads', route: '/(tabs)/clients' },
            { icon: 'calendar-outline', color: '#0EA5E9', light: '#E0F2FE', label: 'Calendar', desc: 'Month view', route: '/(tabs)/calendar' },
            { icon: 'document-text-outline', color: '#F59E0B', light: '#FEF3C7', label: 'Estimates', desc: 'Quotes & proposals', route: '/(tabs)/estimates' },
            { icon: 'receipt-outline', color: theme_1.Colors.warning, light: theme_1.Colors.warningLight, label: 'Invoices', desc: 'Invoices & payments', route: '/(tabs)/invoices' },
            { icon: 'chatbubble-ellipses-outline', color: '#10B981', light: '#D1FAE5', label: 'Messages', desc: 'SMS clients', route: '/(tabs)/messages' },
            { icon: 'settings-outline', color: '#6B7280', light: '#F3F4F6', label: 'Settings', desc: 'Profile & billing', route: '/(tabs)/settings' },
            { icon: 'person', color: theme_1.Colors.info, light: theme_1.Colors.infoLight, label: 'Profile', desc: 'Account & settings', route: '/(tabs)/profile' },
        ].map(function (item) { return (<react_native_1.TouchableOpacity key={item.label} style={styles.navCard} onPress={function () { return router.push(item.route); }} activeOpacity={0.75}>
              <react_native_1.View style={[styles.navIcon, { backgroundColor: item.light }]}>
                <vector_icons_1.Ionicons name={item.icon} size={24} color={item.color}/>
              </react_native_1.View>
              <react_native_1.View style={styles.navCardText}>
                <react_native_1.Text style={styles.navCardLabel}>{item.label}</react_native_1.Text>
                <react_native_1.Text style={styles.navCardDesc} numberOfLines={1}>{item.desc}</react_native_1.Text>
              </react_native_1.View>
              <vector_icons_1.Ionicons name="chevron-forward" size={16} color={theme_1.Colors.textMuted}/>
            </react_native_1.TouchableOpacity>); })}
        </react_native_1.View>
      </react_native_1.View>

    </react_native_1.ScrollView>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: theme_1.Colors.background },
    content: { padding: 16, paddingBottom: 32 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme_1.Colors.background },
    greeting: { marginBottom: 20 },
    greetingText: { fontSize: 22, fontWeight: '700', color: theme_1.Colors.textPrimary },
    greetingSubtext: { fontSize: 14, color: theme_1.Colors.textSecondary, marginTop: 2 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
    statCard: __assign({ width: '47%', backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.lg, padding: 16, gap: 6 }, theme_1.Shadow.md),
    statBlue: { borderLeftWidth: 3, borderLeftColor: theme_1.Colors.primary },
    statGreen: { borderLeftWidth: 3, borderLeftColor: theme_1.Colors.success },
    statPurple: { borderLeftWidth: 3, borderLeftColor: theme_1.Colors.purple },
    statRed: { borderLeftWidth: 3, borderLeftColor: theme_1.Colors.error },
    statNumber: { fontSize: 28, fontWeight: '700', color: theme_1.Colors.primary },
    statLabel: { fontSize: 12, color: theme_1.Colors.textSecondary, fontWeight: '500' },
    revenueCard: __assign({ backgroundColor: theme_1.Colors.primary, borderRadius: theme_1.Radius.lg, padding: 20, marginBottom: 20 }, theme_1.Shadow.md),
    revenueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    revenueLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
    revenueValue: { fontSize: 32, fontWeight: '700', color: theme_1.Colors.textWhite, marginTop: 4 },
    revenueBadge: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
    },
    revenueNote: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 8 },
    section: { marginBottom: 20 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: theme_1.Colors.textPrimary },
    sectionLink: { fontSize: 14, color: theme_1.Colors.primary, fontWeight: '600' },
    eventRow: __assign({ flexDirection: 'row', alignItems: 'center', backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.md, padding: 12, marginBottom: 8 }, theme_1.Shadow.sm),
    eventDateBadge: {
        width: 44, height: 44, backgroundColor: theme_1.Colors.primaryLight, borderRadius: theme_1.Radius.sm,
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    eventDateDay: { fontSize: 16, fontWeight: '700', color: theme_1.Colors.primary },
    eventDateMonth: { fontSize: 10, fontWeight: '600', color: theme_1.Colors.primaryText, textTransform: 'uppercase' },
    eventInfo: { flex: 1 },
    eventName: { fontSize: 14, fontWeight: '600', color: theme_1.Colors.textPrimary },
    eventVenue: { fontSize: 12, color: theme_1.Colors.textMuted, marginTop: 2 },
    navGrid: { gap: 8 },
    navCard: __assign({ flexDirection: 'row', alignItems: 'center', backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.lg, padding: 14, gap: 12 }, theme_1.Shadow.sm),
    navIcon: { width: 44, height: 44, borderRadius: theme_1.Radius.md, justifyContent: 'center', alignItems: 'center' },
    navCardText: { flex: 1 },
    navCardLabel: { fontSize: 15, fontWeight: '700', color: theme_1.Colors.textPrimary },
    navCardDesc: { fontSize: 12, color: theme_1.Colors.textMuted, marginTop: 1 },
});
