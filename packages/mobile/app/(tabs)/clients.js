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
exports.default = ClientsScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var vector_icons_1 = require("@expo/vector-icons");
var supabase_1 = require("@/lib/supabase");
var theme_1 = require("@/lib/theme");
var statusColors = {
    new: { bg: '#DBEAFE', text: '#1E40AF' },
    contacted: { bg: '#FEF3C7', text: '#92400E' },
    converted: { bg: '#D1FAE5', text: '#065F46' },
    cancelled: { bg: '#FEE2E2', text: '#991B1B' },
};
function ClientsScreen() {
    var _this = this;
    var _a = (0, react_1.useState)([]), clients = _a[0], setClients = _a[1];
    var _b = (0, react_1.useState)([]), filtered = _b[0], setFiltered = _b[1];
    var _c = (0, react_1.useState)(true), loading = _c[0], setLoading = _c[1];
    var _d = (0, react_1.useState)(false), refreshing = _d[0], setRefreshing = _d[1];
    var _e = (0, react_1.useState)(''), search = _e[0], setSearch = _e[1];
    (0, react_1.useEffect)(function () { fetchClients(); }, []);
    (0, react_1.useEffect)(function () {
        if (!search.trim()) {
            setFiltered(clients);
        }
        else {
            var q_1 = search.toLowerCase();
            setFiltered(clients.filter(function (c) {
                var _a, _b;
                return c.contact_name.toLowerCase().includes(q_1) ||
                    ((_a = c.contact_email) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(q_1)) ||
                    ((_b = c.event_type) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(q_1));
            }));
        }
    }, [search, clients]);
    var fetchClients = function () { return __awaiter(_this, void 0, void 0, function () {
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
                            .from('intake_forms')
                            .select('id, contact_name, contact_email, contact_phone, event_type, event_date, guest_count, status, created_at')
                            .eq('user_id', user.id)
                            .order('created_at', { ascending: false })];
                case 2:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    setClients(data || []);
                    return [3 /*break*/, 5];
                case 3:
                    error_1 = _b.sent();
                    console.error('Error fetching clients:', error_1.message);
                    return [3 /*break*/, 5];
                case 4:
                    setLoading(false);
                    setRefreshing(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var onRefresh = function () { setRefreshing(true); fetchClients(); };
    var formatEventType = function (type) {
        if (!type)
            return '';
        return type.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    };
    if (loading) {
        return <react_native_1.View style={styles.centered}><react_native_1.ActivityIndicator size="large" color={theme_1.Colors.primary}/></react_native_1.View>;
    }
    return (<react_native_1.View style={styles.container}>
      <react_native_1.View style={styles.searchContainer}>
        <vector_icons_1.Ionicons name="search-outline" size={18} color={theme_1.Colors.textMuted} style={styles.searchIcon}/>
        <react_native_1.TextInput style={styles.searchInput} placeholder="Search clients..." placeholderTextColor={theme_1.Colors.textMuted} value={search} onChangeText={setSearch} autoCapitalize="none"/>
        {search.length > 0 && (<vector_icons_1.Ionicons name="close-circle" size={18} color={theme_1.Colors.textMuted} onPress={function () { return setSearch(''); }}/>)}
      </react_native_1.View>

      <react_native_1.FlatList contentContainerStyle={styles.content} data={filtered} keyExtractor={function (item) { return item.id; }} refreshControl={<react_native_1.RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme_1.Colors.primary}/>} renderItem={function (_a) {
            var item = _a.item;
            var ss = statusColors[item.status] || { bg: '#F3F4F6', text: '#6B7280' };
            return (<react_native_1.View style={styles.card}>
              <react_native_1.View style={styles.cardTop}>
                <react_native_1.View style={styles.avatar}>
                  <react_native_1.Text style={styles.avatarText}>{item.contact_name.charAt(0).toUpperCase()}</react_native_1.Text>
                </react_native_1.View>
                <react_native_1.View style={styles.cardMain}>
                  <react_native_1.Text style={styles.clientName} numberOfLines={1}>{item.contact_name}</react_native_1.Text>
                  {item.event_type && (<react_native_1.Text style={styles.eventType}>{formatEventType(item.event_type)}</react_native_1.Text>)}
                </react_native_1.View>
                <react_native_1.View style={[styles.badge, { backgroundColor: ss.bg }]}>
                  <react_native_1.Text style={[styles.badgeText, { color: ss.text }]}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </react_native_1.Text>
                </react_native_1.View>
              </react_native_1.View>

              <react_native_1.View style={styles.divider}/>

              <react_native_1.View style={styles.metaRow}>
                {item.event_date && (<react_native_1.View style={styles.metaItem}>
                    <vector_icons_1.Ionicons name="calendar-outline" size={13} color={theme_1.Colors.textMuted}/>
                    <react_native_1.Text style={styles.metaText}>
                      {new Date(item.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </react_native_1.Text>
                  </react_native_1.View>)}
                {item.contact_email && (<react_native_1.View style={styles.metaItem}>
                    <vector_icons_1.Ionicons name="mail-outline" size={13} color={theme_1.Colors.textMuted}/>
                    <react_native_1.Text style={styles.metaText} numberOfLines={1}>{item.contact_email}</react_native_1.Text>
                  </react_native_1.View>)}
                {item.contact_phone && (<react_native_1.View style={styles.metaItem}>
                    <vector_icons_1.Ionicons name="call-outline" size={13} color={theme_1.Colors.textMuted}/>
                    <react_native_1.Text style={styles.metaText}>{item.contact_phone}</react_native_1.Text>
                  </react_native_1.View>)}
                {item.guest_count && (<react_native_1.View style={styles.metaItem}>
                    <vector_icons_1.Ionicons name="people-outline" size={13} color={theme_1.Colors.textMuted}/>
                    <react_native_1.Text style={styles.metaText}>{item.guest_count} guests</react_native_1.Text>
                  </react_native_1.View>)}
              </react_native_1.View>
            </react_native_1.View>);
        }} ListEmptyComponent={<react_native_1.View style={styles.empty}>
            <vector_icons_1.Ionicons name="people-outline" size={48} color={theme_1.Colors.textMuted}/>
            <react_native_1.Text style={styles.emptyTitle}>{search ? 'No results found' : 'No clients yet'}</react_native_1.Text>
            <react_native_1.Text style={styles.emptyText}>Client intake forms appear here</react_native_1.Text>
          </react_native_1.View>}/>
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: theme_1.Colors.background },
    content: { padding: 16, paddingBottom: 32 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme_1.Colors.background },
    searchContainer: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: theme_1.Colors.surface,
        marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderRadius: theme_1.Radius.lg,
        paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: theme_1.Colors.border,
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 15, color: theme_1.Colors.textPrimary },
    card: {
        backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.lg, marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    avatar: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: theme_1.Colors.primaryLight, justifyContent: 'center', alignItems: 'center',
    },
    avatarText: { fontSize: 18, fontWeight: '700', color: theme_1.Colors.primary },
    cardMain: { flex: 1 },
    clientName: { fontSize: 15, fontWeight: '700', color: theme_1.Colors.textPrimary },
    eventType: { fontSize: 12, color: theme_1.Colors.textSecondary, marginTop: 2 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme_1.Radius.full },
    badgeText: { fontSize: 11, fontWeight: '600' },
    divider: { height: 1, backgroundColor: theme_1.Colors.border, marginHorizontal: 16 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 14 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 13, color: theme_1.Colors.textMuted },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyTitle: { fontSize: 17, fontWeight: '600', color: theme_1.Colors.textSecondary },
    emptyText: { fontSize: 14, color: theme_1.Colors.textMuted },
});
