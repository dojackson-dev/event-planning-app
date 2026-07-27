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
exports.default = EstimateDetailScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var vector_icons_1 = require("@expo/vector-icons");
var supabase_1 = require("@/lib/supabase");
var api_1 = require("@/lib/api");
var theme_1 = require("@/lib/theme");
var fmt = function (n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
};
var STATUS_COLORS = {
    draft: '#6B7280',
    sent: '#3B82F6',
    viewed: '#8B5CF6',
    approved: '#10B981',
    rejected: '#EF4444',
    expired: '#F59E0B',
    converted: '#059669',
};
var formatDate = function (iso) {
    if (!iso)
        return '';
    return new Date(iso + (iso.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};
function EstimateDetailScreen() {
    var _this = this;
    var _a, _b;
    var id = (0, expo_router_1.useLocalSearchParams)().id;
    var router = (0, expo_router_1.useRouter)();
    var _c = (0, react_1.useState)(null), estimate = _c[0], setEstimate = _c[1];
    var _d = (0, react_1.useState)(true), loading = _d[0], setLoading = _d[1];
    var _e = (0, react_1.useState)(null), actionLoading = _e[0], setActionLoading = _e[1];
    var load = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var _a, data, error, err_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    setLoading(true);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('estimates')
                            .select("*, intake_form:intake_forms!intake_form_id(event_name, contact_name), estimate_items(*)")
                            .eq('id', id)
                            .single()];
                case 2:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    setEstimate(data);
                    return [3 /*break*/, 5];
                case 3:
                    err_1 = _b.sent();
                    react_native_1.Alert.alert('Error', err_1.message || 'Failed to load estimate');
                    return [3 /*break*/, 5];
                case 4:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); }, [id]);
    (0, expo_router_1.useFocusEffect)((0, react_1.useCallback)(function () { load(); }, [load]));
    var handleSend = function () { return __awaiter(_this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            react_native_1.Alert.alert('Send Estimate', "Send this estimate via SMS to ".concat((estimate === null || estimate === void 0 ? void 0 : estimate.client_phone) || 'the client', "?"), [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send', onPress: function () { return __awaiter(_this, void 0, void 0, function () {
                        var err_2;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    setActionLoading('send');
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 4, 5, 6]);
                                    return [4 /*yield*/, (0, api_1.apiRequest)("/estimates/".concat(id, "/status"), { method: 'PUT', body: { status: 'sent' } })];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, load()];
                                case 3:
                                    _a.sent();
                                    return [3 /*break*/, 6];
                                case 4:
                                    err_2 = _a.sent();
                                    react_native_1.Alert.alert('Error', err_2.message || 'Failed to send estimate');
                                    return [3 /*break*/, 6];
                                case 5:
                                    setActionLoading(null);
                                    return [7 /*endfinally*/];
                                case 6: return [2 /*return*/];
                            }
                        });
                    }); },
                },
            ]);
            return [2 /*return*/];
        });
    }); };
    var handleConvert = function () { return __awaiter(_this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            react_native_1.Alert.alert('Convert to Invoice', 'This will create a new invoice based on this estimate. Continue?', [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Convert', onPress: function () { return __awaiter(_this, void 0, void 0, function () {
                        var invoice_1, err_3;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    setActionLoading('convert');
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 4, 5, 6]);
                                    return [4 /*yield*/, (0, api_1.apiRequest)("/estimates/".concat(id, "/convert-to-invoice"), { method: 'POST' })];
                                case 2:
                                    invoice_1 = _a.sent();
                                    react_native_1.Alert.alert('Converted!', 'Invoice has been created.', [
                                        { text: 'View Invoice', onPress: function () { return router.replace("/(tabs)/invoices/".concat(invoice_1.id)); } },
                                        { text: 'Stay Here' },
                                    ]);
                                    return [4 /*yield*/, load()];
                                case 3:
                                    _a.sent();
                                    return [3 /*break*/, 6];
                                case 4:
                                    err_3 = _a.sent();
                                    react_native_1.Alert.alert('Error', err_3.message || 'Failed to convert estimate');
                                    return [3 /*break*/, 6];
                                case 5:
                                    setActionLoading(null);
                                    return [7 /*endfinally*/];
                                case 6: return [2 /*return*/];
                            }
                        });
                    }); },
                },
            ]);
            return [2 /*return*/];
        });
    }); };
    var handleDelete = function () { return __awaiter(_this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            react_native_1.Alert.alert('Delete Estimate', 'This cannot be undone. Continue?', [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive', onPress: function () { return __awaiter(_this, void 0, void 0, function () {
                        var error, err_4;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    setActionLoading('delete');
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, supabase_1.supabase.from('estimates').delete().eq('id', id)];
                                case 2:
                                    error = (_a.sent()).error;
                                    if (error)
                                        throw error;
                                    router.back();
                                    return [3 /*break*/, 4];
                                case 3:
                                    err_4 = _a.sent();
                                    react_native_1.Alert.alert('Error', err_4.message || 'Failed to delete');
                                    setActionLoading(null);
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); },
                },
            ]);
            return [2 /*return*/];
        });
    }); };
    if (loading) {
        return <react_native_1.View style={styles.center}><react_native_1.ActivityIndicator size="large" color={theme_1.Colors.primary}/></react_native_1.View>;
    }
    if (!estimate) {
        return <react_native_1.View style={styles.center}><react_native_1.Text style={styles.errorText}>Estimate not found</react_native_1.Text></react_native_1.View>;
    }
    var st = estimate.status;
    var statusColor = STATUS_COLORS[st] || '#6B7280';
    var isExpired = estimate.expiration_date && new Date(estimate.expiration_date + 'T23:59:59') < new Date();
    var displayName = estimate.client_name || ((_a = estimate.intake_form) === null || _a === void 0 ? void 0 : _a.contact_name) || ((_b = estimate.intake_form) === null || _b === void 0 ? void 0 : _b.event_name) || 'Client';
    return (<react_native_1.ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <react_native_1.View style={styles.headerCard}>
        <react_native_1.View style={styles.headerTop}>
          <react_native_1.View>
            <react_native_1.Text style={styles.estimateNumber}>{estimate.estimate_number}</react_native_1.Text>
            <react_native_1.Text style={styles.clientName}>{displayName}</react_native_1.Text>
          </react_native_1.View>
          <react_native_1.View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
            <react_native_1.Text style={[styles.statusText, { color: statusColor }]}>{st.charAt(0).toUpperCase() + st.slice(1)}</react_native_1.Text>
          </react_native_1.View>
        </react_native_1.View>
        <react_native_1.Text style={styles.totalAmount}>{fmt(estimate.total_amount)}</react_native_1.Text>
        <react_native_1.View style={styles.dateLine}>
          <vector_icons_1.Ionicons name="calendar-outline" size={13} color={theme_1.Colors.textMuted}/>
          <react_native_1.Text style={styles.dateText}>Issued {formatDate(estimate.issue_date)}</react_native_1.Text>
          <react_native_1.Text style={[styles.dateText, isExpired && styles.expired]}> · Expires {formatDate(estimate.expiration_date)}{isExpired ? ' (Expired)' : ''}</react_native_1.Text>
        </react_native_1.View>
      </react_native_1.View>

      {/* Actions */}
      <react_native_1.View style={styles.actionRow}>
        {(st === 'draft' || st === 'viewed') && (<react_native_1.TouchableOpacity style={[styles.actionBtn, styles.sendBtn, actionLoading === 'send' && styles.btnLoading]} onPress={handleSend} disabled={!!actionLoading}>
            {actionLoading === 'send' ? <react_native_1.ActivityIndicator size="small" color="#FFF"/> : (<><vector_icons_1.Ionicons name="send-outline" size={16} color="#FFF"/><react_native_1.Text style={styles.actionBtnText}>Send</react_native_1.Text></>)}
          </react_native_1.TouchableOpacity>)}
        {(['sent', 'viewed', 'approved'].includes(st) && st !== 'converted') && (<react_native_1.TouchableOpacity style={[styles.actionBtn, styles.convertBtn, actionLoading === 'convert' && styles.btnLoading]} onPress={handleConvert} disabled={!!actionLoading}>
            {actionLoading === 'convert' ? <react_native_1.ActivityIndicator size="small" color="#FFF"/> : (<><vector_icons_1.Ionicons name="arrow-forward-circle-outline" size={16} color="#FFF"/><react_native_1.Text style={styles.actionBtnText}>Convert</react_native_1.Text></>)}
          </react_native_1.TouchableOpacity>)}
        {st !== 'converted' && (<react_native_1.TouchableOpacity style={[styles.actionBtn, styles.deleteBtn, actionLoading === 'delete' && styles.btnLoading]} onPress={handleDelete} disabled={!!actionLoading}>
            {actionLoading === 'delete' ? <react_native_1.ActivityIndicator size="small" color={theme_1.Colors.error}/> : (<><vector_icons_1.Ionicons name="trash-outline" size={16} color={theme_1.Colors.error}/><react_native_1.Text style={[styles.actionBtnText, { color: theme_1.Colors.error }]}>Delete</react_native_1.Text></>)}
          </react_native_1.TouchableOpacity>)}
      </react_native_1.View>

      {/* Line items */}
      {estimate.estimate_items && estimate.estimate_items.length > 0 && (<react_native_1.View style={styles.section}>
          <react_native_1.Text style={styles.sectionLabel}>Line Items</react_native_1.Text>
          <react_native_1.View style={styles.card}>
            {estimate.estimate_items.map(function (item, i) { return (<react_native_1.View key={item.id} style={[styles.lineItem, i === (estimate.estimate_items.length - 1) && styles.lineItemLast]}>
                <react_native_1.View style={styles.lineItemLeft}>
                  <react_native_1.Text style={styles.lineDesc}>{item.description}</react_native_1.Text>
                  <react_native_1.Text style={styles.lineQty}>{item.quantity} × {fmt(item.unit_price)}</react_native_1.Text>
                </react_native_1.View>
                <react_native_1.Text style={styles.lineAmount}>{fmt(item.amount)}</react_native_1.Text>
              </react_native_1.View>); })}
          </react_native_1.View>
        </react_native_1.View>)}

      {/* Totals */}
      <react_native_1.View style={styles.section}>
        <react_native_1.Text style={styles.sectionLabel}>Totals</react_native_1.Text>
        <react_native_1.View style={styles.card}>
          <react_native_1.View style={styles.totalRow}><react_native_1.Text style={styles.totalLabel}>Subtotal</react_native_1.Text><react_native_1.Text style={styles.totalValue}>{fmt(estimate.subtotal)}</react_native_1.Text></react_native_1.View>
          {estimate.discount_amount > 0 && (<react_native_1.View style={styles.totalRow}><react_native_1.Text style={styles.totalLabel}>Discount</react_native_1.Text><react_native_1.Text style={[styles.totalValue, { color: theme_1.Colors.success }]}>-{fmt(estimate.discount_amount)}</react_native_1.Text></react_native_1.View>)}
          {estimate.tax_amount > 0 && (<react_native_1.View style={styles.totalRow}><react_native_1.Text style={styles.totalLabel}>Tax ({estimate.tax_rate}%)</react_native_1.Text><react_native_1.Text style={styles.totalValue}>{fmt(estimate.tax_amount)}</react_native_1.Text></react_native_1.View>)}
          <react_native_1.View style={[styles.totalRow, { borderBottomWidth: 0, marginTop: 4 }]}>
            <react_native_1.Text style={styles.totalFinalLabel}>Total</react_native_1.Text>
            <react_native_1.Text style={styles.totalFinalValue}>{fmt(estimate.total_amount)}</react_native_1.Text>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.View>

      {estimate.notes && (<react_native_1.View style={styles.section}>
          <react_native_1.Text style={styles.sectionLabel}>Notes</react_native_1.Text>
          <react_native_1.View style={styles.card}><react_native_1.Text style={styles.noteText}>{estimate.notes}</react_native_1.Text></react_native_1.View>
        </react_native_1.View>)}
      {estimate.terms && (<react_native_1.View style={styles.section}>
          <react_native_1.Text style={styles.sectionLabel}>Terms</react_native_1.Text>
          <react_native_1.View style={styles.card}><react_native_1.Text style={styles.noteText}>{estimate.terms}</react_native_1.Text></react_native_1.View>
        </react_native_1.View>)}
    </react_native_1.ScrollView>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: theme_1.Colors.background },
    content: { padding: 16, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { fontSize: 16, color: theme_1.Colors.textMuted },
    headerCard: __assign(__assign({ backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.xl, padding: 20 }, theme_1.Shadow.md), { marginBottom: 12 }),
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    estimateNumber: { fontSize: 12, fontWeight: '700', color: theme_1.Colors.textMuted, letterSpacing: 0.5 },
    clientName: { fontSize: 20, fontWeight: '700', color: theme_1.Colors.textPrimary, marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
    statusText: { fontSize: 12, fontWeight: '700' },
    totalAmount: { fontSize: 36, fontWeight: '800', color: '#7C3AED', marginBottom: 10 },
    dateLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dateText: { fontSize: 13, color: theme_1.Colors.textMuted },
    expired: { color: theme_1.Colors.error, fontWeight: '600' },
    actionRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    actionBtn: { flex: 1, borderRadius: theme_1.Radius.lg, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    actionBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
    sendBtn: { backgroundColor: '#3B82F6' },
    convertBtn: { backgroundColor: '#059669' },
    deleteBtn: { backgroundColor: theme_1.Colors.error + '15', borderWidth: 1, borderColor: theme_1.Colors.error },
    btnLoading: { opacity: 0.6 },
    section: { marginBottom: 16 },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: theme_1.Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    card: __assign({ backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.lg, padding: 16 }, theme_1.Shadow.sm),
    lineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: react_native_1.StyleSheet.hairlineWidth, borderBottomColor: theme_1.Colors.border },
    lineItemLast: { borderBottomWidth: 0 },
    lineItemLeft: { flex: 1, paddingRight: 12 },
    lineDesc: { fontSize: 15, fontWeight: '500', color: theme_1.Colors.textPrimary },
    lineQty: { fontSize: 13, color: theme_1.Colors.textMuted, marginTop: 2 },
    lineAmount: { fontSize: 15, fontWeight: '700', color: theme_1.Colors.textPrimary },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: react_native_1.StyleSheet.hairlineWidth, borderBottomColor: theme_1.Colors.border },
    totalLabel: { fontSize: 14, color: theme_1.Colors.textSecondary },
    totalValue: { fontSize: 14, fontWeight: '600', color: theme_1.Colors.textPrimary },
    totalFinalLabel: { fontSize: 16, fontWeight: '700', color: theme_1.Colors.textPrimary },
    totalFinalValue: { fontSize: 22, fontWeight: '800', color: '#7C3AED' },
    noteText: { fontSize: 14, color: theme_1.Colors.textSecondary, lineHeight: 20 },
});
