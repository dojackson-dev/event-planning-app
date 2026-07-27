"use strict";
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
exports.default = EventsListScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var vector_icons_1 = require("@expo/vector-icons");
var supabase_1 = require("@/lib/supabase");
var theme_1 = require("@/lib/theme");
var statusMeta = {
    scheduled: { bg: '#DBEAFE', text: '#1E40AF', stripe: '#3B82F6' },
    confirmed: { bg: '#D1FAE5', text: '#065F46', stripe: '#10B981' },
    completed: { bg: '#F3F4F6', text: '#6B7280', stripe: '#9CA3AF' },
    cancelled: { bg: '#FEE2E2', text: '#991B1B', stripe: '#EF4444' },
    draft: { bg: '#F3F4F6', text: '#6B7280', stripe: '#A78BFA' },
};
var formatTime = function (t) {
    if (!t)
        return '';
    var _a = t.split(':').map(Number), h = _a[0], m = _a[1];
    return "".concat(h % 12 || 12, ":").concat(String(m).padStart(2, '0'), " ").concat(h >= 12 ? 'PM' : 'AM');
};
var formatEventType = function (type) {
    return type ? type.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }) : '';
};
function EventsListScreen() {
    var _this = this;
    var router = (0, expo_router_1.useRouter)();
    var _a = (0, react_1.useState)([]), events = _a[0], setEvents = _a[1];
    var _b = (0, react_1.useState)([]), filtered = _b[0], setFiltered = _b[1];
    var _c = (0, react_1.useState)(true), loading = _c[0], setLoading = _c[1];
    var _d = (0, react_1.useState)(false), refreshing = _d[0], setRefreshing = _d[1];
    var _e = (0, react_1.useState)(''), search = _e[0], setSearch = _e[1];
    var _f = (0, react_1.useState)('upcoming'), filter = _f[0], setFilter = _f[1];
    (0, react_1.useEffect)(function () { fetchEvents(); }, []);
    (0, react_1.useEffect)(function () {
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var result = events;
        if (filter === 'upcoming') {
            result = events.filter(function (e) { return new Date(e.date + 'T00:00:00') >= today; });
        }
        else if (filter === 'past') {
            result = events.filter(function (e) { return new Date(e.date + 'T00:00:00') < today; });
        }
        if (search.trim()) {
            var q_1 = search.toLowerCase();
            result = result.filter(function (e) {
                var _a, _b, _c;
                return e.name.toLowerCase().includes(q_1) ||
                    ((_b = (_a = e.intake_form) === null || _a === void 0 ? void 0 : _a.contact_name) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(q_1)) ||
                    ((_c = e.venue) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes(q_1));
            });
        }
        setFiltered(result);
    }, [events, search, filter]);
    var fetchEvents = function () { return __awaiter(_this, void 0, void 0, function () {
        var user, _a, data, error, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, 4, 5]);
                    return [4 /*yield*/, supabase_1.supabase.auth.getUser()];
                case 1:
                    user = (_b.sent()).data.user;
                    if (!user)
                        return [2 /*return*/];
                    return [4 /*yield*/, supabase_1.supabase
                            .from('event')
                            .select('*, intake_form:intake_forms!intake_form_id(event_type, event_name, contact_name)')
                            .eq('owner_id', user.id)
                            .order('date', { ascending: true })];
                case 2:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    setEvents(data || []);
                    return [3 /*break*/, 5];
                case 3:
                    error_1 = _b.sent();
                    console.error('Error fetching events:', error_1.message);
                    return [3 /*break*/, 5];
                case 4:
                    setLoading(false);
                    setRefreshing(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var onRefresh = function () { setRefreshing(true); fetchEvents(); };
    if (loading) {
        return (<>
        <expo_router_1.Stack.Screen options={{ title: 'Events' }}/>
        <react_native_1.View style={styles.centered}><react_native_1.ActivityIndicator size="large" color={theme_1.Colors.primary}/></react_native_1.View>
      </>);
    }
    return (<>
      <expo_router_1.Stack.Screen options={{ title: 'Events' }}/>
      <react_native_1.View style={styles.container}>
        {/* Search bar */}
        <react_native_1.View style={styles.searchRow}>
          <react_native_1.View style={styles.searchBox}>
            <vector_icons_1.Ionicons name="search-outline" size={16} color={theme_1.Colors.textMuted} style={{ marginRight: 6 }}/>
            <react_native_1.TextInput style={styles.searchInput} placeholder="Search events, clients..." placeholderTextColor={theme_1.Colors.textMuted} value={search} onChangeText={setSearch} autoCapitalize="none"/>
            {search.length > 0 && (<vector_icons_1.Ionicons name="close-circle" size={16} color={theme_1.Colors.textMuted} onPress={function () { return setSearch(''); }}/>)}
          </react_native_1.View>
        </react_native_1.View>

        {/* Filter tabs */}
        <react_native_1.View style={styles.filterRow}>
          {['upcoming', 'all', 'past'].map(function (f) { return (<react_native_1.TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]} onPress={function () { return setFilter(f); }}>
              <react_native_1.Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'all' ? 'All' : f === 'upcoming' ? 'Upcoming' : 'Past'}
              </react_native_1.Text>
            </react_native_1.TouchableOpacity>); })}
        </react_native_1.View>

        <react_native_1.FlatList contentContainerStyle={styles.content} data={filtered} keyExtractor={function (item) { return item.id; }} refreshControl={<react_native_1.RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme_1.Colors.primary}/>} renderItem={function (_a) {
            var _b, _c, _d, _e;
            var item = _a.item;
            var sm = statusMeta[item.status || ''] || statusMeta.draft;
            var clientName = (_b = item.intake_form) === null || _b === void 0 ? void 0 : _b.contact_name;
            var displayName = ((_c = item.intake_form) === null || _c === void 0 ? void 0 : _c.event_name) || formatEventType((_d = item.intake_form) === null || _d === void 0 ? void 0 : _d.event_type) || item.name;
            var eventType = formatEventType((_e = item.intake_form) === null || _e === void 0 ? void 0 : _e.event_type);
            var dateObj = new Date(item.date + 'T00:00:00');
            var isPast = dateObj < new Date();
            return (<react_native_1.TouchableOpacity style={styles.card} onPress={function () { return router.push("/(tabs)/events/".concat(item.id)); }} activeOpacity={0.75}>
                {/* Color stripe */}
                <react_native_1.View style={[styles.stripe, { backgroundColor: isPast ? '#D1D5DB' : sm.stripe }]}/>

                <react_native_1.View style={styles.cardBody}>
                  {/* Top row: left info + status badge */}
                  <react_native_1.View style={styles.cardTop}>
                    <react_native_1.View style={styles.dateBadge}>
                      <react_native_1.Text style={[styles.dateDay, { color: isPast ? '#6B7280' : theme_1.Colors.primary }]}>
                        {dateObj.getDate()}
                      </react_native_1.Text>
                      <react_native_1.Text style={[styles.dateMonth, { color: isPast ? '#9CA3AF' : theme_1.Colors.primaryText }]}>
                        {dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                      </react_native_1.Text>
                    </react_native_1.View>
                    <react_native_1.View style={styles.cardInfo}>
                      {clientName && (<react_native_1.Text style={styles.clientName} numberOfLines={1}>{clientName}</react_native_1.Text>)}
                      <react_native_1.Text style={styles.eventName} numberOfLines={1}>{displayName}</react_native_1.Text>
                      {eventType && (<react_native_1.Text style={styles.eventType} numberOfLines={1}>{eventType}</react_native_1.Text>)}
                    </react_native_1.View>
                    <react_native_1.View style={styles.cardRight}>
                      <react_native_1.View style={[styles.statusBadge, { backgroundColor: isPast ? '#F3F4F6' : sm.bg }]}>
                        <react_native_1.Text style={[styles.statusText, { color: isPast ? '#6B7280' : sm.text }]}>
                          {(item.status || 'scheduled').charAt(0).toUpperCase() + (item.status || 'scheduled').slice(1)}
                        </react_native_1.Text>
                      </react_native_1.View>
                      <vector_icons_1.Ionicons name="chevron-forward" size={16} color={theme_1.Colors.textMuted} style={{ marginTop: 8 }}/>
                    </react_native_1.View>
                  </react_native_1.View>

                  {/* Meta row */}
                  {(item.start_time || item.venue || item.max_guests) && (<react_native_1.View style={styles.metaRow}>
                      {item.start_time && (<react_native_1.View style={styles.metaItem}>
                          <vector_icons_1.Ionicons name="time-outline" size={13} color={theme_1.Colors.textMuted}/>
                          <react_native_1.Text style={styles.metaText}>
                            {formatTime(item.start_time)}{item.end_time ? " \u2013 ".concat(formatTime(item.end_time)) : ''}
                          </react_native_1.Text>
                        </react_native_1.View>)}
                      {item.venue && (<react_native_1.View style={styles.metaItem}>
                          <vector_icons_1.Ionicons name="location-outline" size={13} color={theme_1.Colors.textMuted}/>
                          <react_native_1.Text style={styles.metaText} numberOfLines={1}>{item.venue}</react_native_1.Text>
                        </react_native_1.View>)}
                      {item.max_guests && (<react_native_1.View style={styles.metaItem}>
                          <vector_icons_1.Ionicons name="people-outline" size={13} color={theme_1.Colors.textMuted}/>
                          <react_native_1.Text style={styles.metaText}>{item.max_guests} guests</react_native_1.Text>
                        </react_native_1.View>)}
                    </react_native_1.View>)}
                </react_native_1.View>
              </react_native_1.TouchableOpacity>);
        }} ListEmptyComponent={<react_native_1.View style={styles.empty}>
              <vector_icons_1.Ionicons name="calendar-outline" size={48} color={theme_1.Colors.textMuted}/>
              <react_native_1.Text style={styles.emptyTitle}>{search ? 'No results found' : "No ".concat(filter === 'all' ? '' : filter + ' ', "events")}</react_native_1.Text>
              <react_native_1.Text style={styles.emptyText}>Events you create will appear here</react_native_1.Text>
            </react_native_1.View>}/>
      </react_native_1.View>
    </>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: theme_1.Colors.background },
    content: { padding: 16, paddingBottom: 32 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme_1.Colors.background },
    searchRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
    searchBox: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: theme_1.Colors.surface,
        borderRadius: theme_1.Radius.lg, paddingHorizontal: 12, paddingVertical: 10,
        borderWidth: 1, borderColor: theme_1.Colors.border,
    },
    searchInput: { flex: 1, fontSize: 14, color: theme_1.Colors.textPrimary },
    filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
    filterBtn: {
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: theme_1.Radius.full,
        backgroundColor: theme_1.Colors.surface, borderWidth: 1, borderColor: theme_1.Colors.border,
    },
    filterBtnActive: { backgroundColor: theme_1.Colors.primary, borderColor: theme_1.Colors.primary },
    filterText: { fontSize: 13, fontWeight: '500', color: theme_1.Colors.textSecondary },
    filterTextActive: { color: '#FFFFFF' },
    card: {
        backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.lg, marginBottom: 10,
        overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
    },
    stripe: { height: 4, width: '100%' },
    cardBody: { padding: 14 },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    dateBadge: {
        width: 50, minHeight: 50, backgroundColor: theme_1.Colors.primaryLight, borderRadius: theme_1.Radius.md,
        justifyContent: 'center', alignItems: 'center',
    },
    dateDay: { fontSize: 20, fontWeight: '800' },
    dateMonth: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    cardInfo: { flex: 1 },
    clientName: { fontSize: 12, fontWeight: '600', color: theme_1.Colors.primary, marginBottom: 2 },
    eventName: { fontSize: 15, fontWeight: '700', color: theme_1.Colors.textPrimary },
    eventType: { fontSize: 12, color: theme_1.Colors.textSecondary, marginTop: 2 },
    cardRight: { alignItems: 'flex-end' },
    statusBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: theme_1.Radius.full },
    statusText: { fontSize: 11, fontWeight: '600' },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme_1.Colors.border },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 12, color: theme_1.Colors.textMuted },
    empty: { alignItems: 'center', paddingVertical: 64, gap: 8 },
    emptyTitle: { fontSize: 17, fontWeight: '600', color: theme_1.Colors.textSecondary },
    emptyText: { fontSize: 14, color: theme_1.Colors.textMuted },
});
