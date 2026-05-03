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
exports.default = BookingsScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var vector_icons_1 = require("@expo/vector-icons");
var supabase_1 = require("@/lib/supabase");
var theme_1 = require("@/lib/theme");
function BookingsScreen() {
    var _this = this;
    var _a = (0, react_1.useState)([]), bookings = _a[0], setBookings = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    var _c = (0, react_1.useState)(false), refreshing = _c[0], setRefreshing = _c[1];
    (0, react_1.useEffect)(function () { fetchBookings(); }, []);
    var fetchBookings = function () { return __awaiter(_this, void 0, void 0, function () {
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
                            .select('id, name, date, venue, client_status, payment_status, total_amount, created_at, intake_form:intake_forms!intake_form_id(contact_name, contact_phone)')
                            .eq('owner_id', user.id)
                            .not('intake_form_id', 'is', null)
                            .order('created_at', { ascending: false })];
                case 2:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    setBookings(data || []);
                    return [3 /*break*/, 5];
                case 3:
                    error_1 = _b.sent();
                    console.error('Error fetching bookings:', error_1.message);
                    return [3 /*break*/, 5];
                case 4:
                    setLoading(false);
                    setRefreshing(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var onRefresh = function () { setRefreshing(true); fetchBookings(); };
    var getStatus = function (status) {
        if (status === 'deposit_paid')
            return { label: 'Deposit Paid', bg: '#D1FAE5', text: '#065F46' };
        if (status === 'completed')
            return { label: 'Completed', bg: '#F3F4F6', text: '#6B7280' };
        return { label: status, bg: '#F3F4F6', text: '#6B7280' };
    };
    if (loading) {
        return <react_native_1.View style={styles.centered}><react_native_1.ActivityIndicator size="large" color={theme_1.Colors.primary}/></react_native_1.View>;
    }
    return (<react_native_1.FlatList style={styles.container} contentContainerStyle={styles.content} data={bookings} keyExtractor={function (item) { return item.id; }} refreshControl={<react_native_1.RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme_1.Colors.primary}/>} renderItem={function (_a) {
            var _b, _c, _d;
            var item = _a.item;
            var st = getStatus((_b = item.client_status) !== null && _b !== void 0 ? _b : '');
            var eventDate = item.date
                ? new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : null;
            var contactName = (_c = item.intake_form) === null || _c === void 0 ? void 0 : _c.contact_name;
            var contactPhone = (_d = item.intake_form) === null || _d === void 0 ? void 0 : _d.contact_phone;
            return (<react_native_1.View style={styles.card}>
            <react_native_1.View style={styles.cardTop}>
              <react_native_1.View style={styles.cardLeft}>
                <react_native_1.Text style={styles.clientName} numberOfLines={1}>{contactName || 'Client'}</react_native_1.Text>
                {item.name && <react_native_1.Text style={styles.eventName} numberOfLines={1}>{item.name}</react_native_1.Text>}
              </react_native_1.View>
              <react_native_1.View style={[styles.badge, { backgroundColor: st.bg }]}>
                <react_native_1.Text style={[styles.badgeText, { color: st.text }]}>{st.label}</react_native_1.Text>
              </react_native_1.View>
            </react_native_1.View>
            <react_native_1.View style={styles.divider}/>
            <react_native_1.View style={styles.metaRow}>
              {eventDate && (<react_native_1.View style={styles.metaItem}>
                  <vector_icons_1.Ionicons name="calendar-outline" size={13} color="#9CA3AF"/>
                  <react_native_1.Text style={styles.metaText}>{eventDate}</react_native_1.Text>
                </react_native_1.View>)}
              {item.venue && (<react_native_1.View style={styles.metaItem}>
                  <vector_icons_1.Ionicons name="location-outline" size={13} color="#9CA3AF"/>
                  <react_native_1.Text style={styles.metaText} numberOfLines={1}>{item.venue}</react_native_1.Text>
                </react_native_1.View>)}
              {item.total_amount != null && (<react_native_1.View style={styles.metaItem}>
                  <vector_icons_1.Ionicons name="cash-outline" size={13} color="#9CA3AF"/>
                  <react_native_1.Text style={styles.metaText}>${Number(item.total_amount).toLocaleString()}</react_native_1.Text>
                </react_native_1.View>)}
              {contactPhone && (<react_native_1.View style={styles.metaItem}>
                  <vector_icons_1.Ionicons name="call-outline" size={13} color="#9CA3AF"/>
                  <react_native_1.Text style={styles.metaText}>{contactPhone}</react_native_1.Text>
                </react_native_1.View>)}
            </react_native_1.View>
          </react_native_1.View>);
        }} ListEmptyComponent={<react_native_1.View style={styles.empty}>
          <vector_icons_1.Ionicons name="checkmark-circle-outline" size={48} color="#9CA3AF"/>
          <react_native_1.Text style={styles.emptyTitle}>No booked events yet</react_native_1.Text>
          <react_native_1.Text style={styles.emptyText}>Events with a paid deposit appear here</react_native_1.Text>
        </react_native_1.View>}/>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    content: { padding: 16, paddingBottom: 32 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, gap: 12 },
    cardLeft: { flex: 1 },
    clientName: { fontSize: 16, fontWeight: '700', color: '#111827' },
    eventName: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
    badgeText: { fontSize: 11, fontWeight: '600' },
    divider: { height: 1, backgroundColor: '#E5E7EB', marginHorizontal: 16 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 14 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 13, color: '#9CA3AF' },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyTitle: { fontSize: 17, fontWeight: '600', color: '#6B7280' },
    emptyText: { fontSize: 14, color: '#9CA3AF' },
});
