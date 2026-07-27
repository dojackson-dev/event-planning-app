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
exports.default = InvoicesScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var vector_icons_1 = require("@expo/vector-icons");
var supabase_1 = require("@/lib/supabase");
var theme_1 = require("@/lib/theme");
var statusColors = {
    draft: { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
    sent: { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
    viewed: { bg: '#EDE9FE', text: '#5B21B6', dot: '#7C3AED' },
    paid: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
    overdue: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
    cancelled: { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' },
    partial: { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
};
var fmt = function (n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);
};
function InvoicesScreen() {
    var _this = this;
    var router = (0, expo_router_1.useRouter)();
    var _a = (0, react_1.useState)([]), invoices = _a[0], setInvoices = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    var _c = (0, react_1.useState)(false), refreshing = _c[0], setRefreshing = _c[1];
    var _d = (0, react_1.useState)('all'), filter = _d[0], setFilter = _d[1];
    (0, react_1.useEffect)(function () { fetchInvoices(); }, []);
    var fetchInvoices = function () { return __awaiter(_this, void 0, void 0, function () {
        var user, _a, data, error, err_1;
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
                            .from('invoices')
                            .select('id, invoice_number, status, total_amount, amount_due, amount_paid, created_at, client_name, intake_form_id, intake_form:intake_forms(contact_name)')
                            .eq('owner_id', user.id)
                            .order('created_at', { ascending: false })];
                case 2:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    setInvoices(data || []);
                    return [3 /*break*/, 5];
                case 3:
                    err_1 = _b.sent();
                    console.error('Error fetching invoices:', err_1.message);
                    return [3 /*break*/, 5];
                case 4:
                    setLoading(false);
                    setRefreshing(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var onRefresh = function () { setRefreshing(true); fetchInvoices(); };
    var filtered = invoices.filter(function (inv) {
        if (filter === 'unpaid')
            return ['sent', 'viewed', 'overdue', 'partial'].includes(inv.status);
        if (filter === 'paid')
            return inv.status === 'paid';
        return true;
    });
    var totalOutstanding = invoices
        .filter(function (i) { return ['sent', 'viewed', 'overdue', 'partial'].includes(i.status); })
        .reduce(function (sum, i) { return sum + (i.amount_due || 0); }, 0);
    var getClientName = function (inv) { var _a; return inv.client_name || ((_a = inv.intake_form) === null || _a === void 0 ? void 0 : _a.contact_name) || 'Unknown Client'; };
    if (loading)
        return <react_native_1.View style={styles.centered}><react_native_1.ActivityIndicator size="large" color={theme_1.Colors.primary}/></react_native_1.View>;
    return (<react_native_1.View style={styles.container}>
      {totalOutstanding > 0 && (<react_native_1.View style={styles.summaryCard}>
          <react_native_1.Text style={styles.summaryLabel}>Outstanding Balance</react_native_1.Text>
          <react_native_1.Text style={styles.summaryAmount}>{fmt(totalOutstanding)}</react_native_1.Text>
        </react_native_1.View>)}

      <react_native_1.View style={styles.filterRow}>
        {['all', 'unpaid', 'paid'].map(function (f) { return (<react_native_1.TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]} onPress={function () { return setFilter(f); }}>
            <react_native_1.Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </react_native_1.Text>
          </react_native_1.TouchableOpacity>); })}
        <react_native_1.View style={{ flex: 1 }}/>
        <react_native_1.TouchableOpacity style={styles.newBtn} onPress={function () { return router.push('/(tabs)/invoices/new'); }}>
          <vector_icons_1.Ionicons name="add" size={18} color="#FFF"/>
          <react_native_1.Text style={styles.newBtnText}>New</react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>

      <react_native_1.FlatList contentContainerStyle={styles.content} data={filtered} keyExtractor={function (item) { return item.id; }} refreshControl={<react_native_1.RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme_1.Colors.primary}/>} renderItem={function (_a) {
            var item = _a.item;
            var ss = statusColors[item.status] || statusColors.draft;
            return (<react_native_1.TouchableOpacity style={styles.card} onPress={function () { return router.push("/(tabs)/invoices/".concat(item.id)); }} activeOpacity={0.75}>
              <react_native_1.View style={styles.cardRow}>
                <react_native_1.View style={styles.cardLeft}>
                  <react_native_1.Text style={styles.invoiceNum}>{item.invoice_number || "INV-".concat(item.id.slice(-6).toUpperCase())}</react_native_1.Text>
                  <react_native_1.Text style={styles.clientName} numberOfLines={1}>{getClientName(item)}</react_native_1.Text>
                  <react_native_1.Text style={styles.dateText}>
                    {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </react_native_1.Text>
                </react_native_1.View>
                <react_native_1.View style={styles.cardRight}>
                  <react_native_1.Text style={styles.amount}>{fmt(item.total_amount)}</react_native_1.Text>
                  <react_native_1.View style={[styles.badge, { backgroundColor: ss.bg }]}>
                    <react_native_1.View style={[styles.dot, { backgroundColor: ss.dot }]}/>
                    <react_native_1.Text style={[styles.badgeText, { color: ss.text }]}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </react_native_1.Text>
                  </react_native_1.View>
                  <vector_icons_1.Ionicons name="chevron-forward" size={14} color={theme_1.Colors.textMuted} style={{ marginTop: 4 }}/>
                </react_native_1.View>
              </react_native_1.View>
              {['partial', 'paid'].includes(item.status) && item.total_amount > 0 && (<react_native_1.View style={styles.progressContainer}>
                  <react_native_1.View style={styles.progressBg}>
                    <react_native_1.View style={[styles.progressFill, { width: "".concat(Math.min(100, ((item.amount_paid || 0) / item.total_amount) * 100), "%") }]}/>
                  </react_native_1.View>
                  <react_native_1.Text style={styles.progressText}>{fmt(item.amount_paid)} of {fmt(item.total_amount)} paid</react_native_1.Text>
                </react_native_1.View>)}
            </react_native_1.TouchableOpacity>);
        }} ListEmptyComponent={<react_native_1.View style={styles.empty}>
            <vector_icons_1.Ionicons name="receipt-outline" size={48} color={theme_1.Colors.textMuted}/>
            <react_native_1.Text style={styles.emptyTitle}>No invoices</react_native_1.Text>
            <react_native_1.Text style={styles.emptyText}>Tap New to create your first invoice</react_native_1.Text>
            <react_native_1.TouchableOpacity style={styles.emptyBtn} onPress={function () { return router.push('/(tabs)/invoices/new'); }}>
              <react_native_1.Text style={styles.emptyBtnText}>Create Invoice</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>}/>
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: theme_1.Colors.background },
    content: { padding: 16, paddingBottom: 32 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    summaryCard: {
        margin: 16, marginBottom: 0, backgroundColor: theme_1.Colors.primary,
        borderRadius: theme_1.Radius.lg, padding: 20, alignItems: 'center',
    },
    summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
    summaryAmount: { fontSize: 32, fontWeight: '800', color: '#FFF', marginTop: 4 },
    filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
    filterBtn: {
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: theme_1.Radius.full,
        backgroundColor: theme_1.Colors.surface, borderWidth: 1, borderColor: theme_1.Colors.border,
    },
    filterBtnActive: { backgroundColor: theme_1.Colors.primary, borderColor: theme_1.Colors.primary },
    filterText: { fontSize: 13, fontWeight: '500', color: theme_1.Colors.textSecondary },
    filterTextActive: { color: '#FFF' },
    newBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: theme_1.Colors.primary, paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: theme_1.Radius.full,
    },
    newBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
    card: {
        backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.lg, marginBottom: 10,
        padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
    },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
    cardLeft: { flex: 1 },
    cardRight: { alignItems: 'flex-end' },
    invoiceNum: { fontSize: 13, fontWeight: '700', color: theme_1.Colors.primary, marginBottom: 2 },
    clientName: { fontSize: 15, fontWeight: '600', color: theme_1.Colors.textPrimary },
    dateText: { fontSize: 12, color: theme_1.Colors.textMuted, marginTop: 3 },
    amount: { fontSize: 18, fontWeight: '700', color: theme_1.Colors.textPrimary, marginBottom: 6 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme_1.Radius.full },
    dot: { width: 6, height: 6, borderRadius: 3 },
    badgeText: { fontSize: 12, fontWeight: '600' },
    progressContainer: { marginTop: 10 },
    progressBg: { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 2 },
    progressText: { fontSize: 11, color: theme_1.Colors.textMuted, marginTop: 4 },
    empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: theme_1.Colors.textPrimary },
    emptyText: { fontSize: 14, color: theme_1.Colors.textMuted },
    emptyBtn: { marginTop: 8, backgroundColor: theme_1.Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: theme_1.Radius.full },
    emptyBtnText: { color: '#FFF', fontWeight: '600' },
});
