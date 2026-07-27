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
exports.default = InvoiceDetailScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var vector_icons_1 = require("@expo/vector-icons");
var supabase_1 = require("@/lib/supabase");
var api_1 = require("@/lib/api");
var theme_1 = require("@/lib/theme");
var statusColors = {
    draft: { bg: '#F3F4F6', text: '#6B7280' },
    sent: { bg: '#DBEAFE', text: '#1E40AF' },
    viewed: { bg: '#EDE9FE', text: '#5B21B6' },
    paid: { bg: '#D1FAE5', text: '#065F46' },
    overdue: { bg: '#FEE2E2', text: '#991B1B' },
    cancelled: { bg: '#F3F4F6', text: '#6B7280' },
    partial: { bg: '#FEF3C7', text: '#92400E' },
};
var fmt = function (n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
};
var formatDate = function (s) {
    if (!s)
        return '—';
    return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};
function InvoiceDetailScreen() {
    var _this = this;
    var _a;
    var id = (0, expo_router_1.useLocalSearchParams)().id;
    var router = (0, expo_router_1.useRouter)();
    var _b = (0, react_1.useState)(null), invoice = _b[0], setInvoice = _b[1];
    var _c = (0, react_1.useState)(true), loading = _c[0], setLoading = _c[1];
    var _d = (0, react_1.useState)(false), actioning = _d[0], setActioning = _d[1];
    (0, react_1.useEffect)(function () { if (id)
        load(); }, [id]);
    var load = function () { return __awaiter(_this, void 0, void 0, function () {
        var user, _a, inv, items, err_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, 4, 5]);
                    return [4 /*yield*/, supabase_1.supabase.auth.getUser()];
                case 1:
                    user = (_b.sent()).data.user;
                    if (!user)
                        return [2 /*return*/];
                    return [4 /*yield*/, Promise.all([
                            supabase_1.supabase
                                .from('invoices')
                                .select('*, intake_form:intake_forms(contact_name, contact_phone)')
                                .eq('id', id)
                                .eq('owner_id', user.id)
                                .single(),
                            supabase_1.supabase
                                .from('invoice_items')
                                .select('id, description, quantity, unit_price, amount')
                                .eq('invoice_id', id)
                                .order('created_at'),
                        ])];
                case 2:
                    _a = _b.sent(), inv = _a[0].data, items = _a[1].data;
                    if (inv)
                        setInvoice(__assign(__assign({}, inv), { items: (items || []) }));
                    return [3 /*break*/, 5];
                case 3:
                    err_1 = _b.sent();
                    console.error(err_1.message);
                    return [3 /*break*/, 5];
                case 4:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var sendInvoice = function () {
        var _a, _b;
        var name = (invoice === null || invoice === void 0 ? void 0 : invoice.client_name) || ((_a = invoice === null || invoice === void 0 ? void 0 : invoice.intake_form) === null || _a === void 0 ? void 0 : _a.contact_name) || 'the client';
        var phone = (invoice === null || invoice === void 0 ? void 0 : invoice.client_phone) || ((_b = invoice === null || invoice === void 0 ? void 0 : invoice.intake_form) === null || _b === void 0 ? void 0 : _b.contact_phone);
        react_native_1.Alert.alert('Send Invoice', "This will mark the invoice as sent".concat(phone ? " and send an SMS to ".concat(name) : " (no phone on file for ".concat(name, ")"), ". Continue?"), [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Send', onPress: function () { return __awaiter(_this, void 0, void 0, function () {
                    var err_2;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                setActioning(true);
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 4, 5, 6]);
                                return [4 /*yield*/, (0, api_1.apiRequest)("/invoices/".concat(id, "/status"), { method: 'PUT', body: { status: 'sent' } })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, load()];
                            case 3:
                                _a.sent();
                                react_native_1.Alert.alert('Sent', 'Invoice marked as sent.');
                                return [3 /*break*/, 6];
                            case 4:
                                err_2 = _a.sent();
                                react_native_1.Alert.alert('Error', err_2.message);
                                return [3 /*break*/, 6];
                            case 5:
                                setActioning(false);
                                return [7 /*endfinally*/];
                            case 6: return [2 /*return*/];
                        }
                    });
                }); },
            },
        ]);
    };
    var markPaid = function () {
        react_native_1.Alert.alert('Mark as Paid', 'Mark this invoice as fully paid?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Mark Paid', onPress: function () { return __awaiter(_this, void 0, void 0, function () {
                    var err_3;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                setActioning(true);
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 4, 5, 6]);
                                return [4 /*yield*/, (0, api_1.apiRequest)("/invoices/".concat(id, "/status"), { method: 'PUT', body: { status: 'paid' } })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, load()];
                            case 3:
                                _a.sent();
                                return [3 /*break*/, 6];
                            case 4:
                                err_3 = _a.sent();
                                react_native_1.Alert.alert('Error', err_3.message);
                                return [3 /*break*/, 6];
                            case 5:
                                setActioning(false);
                                return [7 /*endfinally*/];
                            case 6: return [2 /*return*/];
                        }
                    });
                }); },
            },
        ]);
    };
    var deleteInvoice = function () {
        react_native_1.Alert.alert('Delete Invoice', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: function () { return __awaiter(_this, void 0, void 0, function () {
                    var user, err_4;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                setActioning(true);
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 4, , 5]);
                                return [4 /*yield*/, supabase_1.supabase.auth.getUser()];
                            case 2:
                                user = (_a.sent()).data.user;
                                return [4 /*yield*/, supabase_1.supabase.from('invoices').delete().eq('id', id)];
                            case 3:
                                _a.sent();
                                router.back();
                                return [3 /*break*/, 5];
                            case 4:
                                err_4 = _a.sent();
                                react_native_1.Alert.alert('Error', err_4.message);
                                setActioning(false);
                                return [3 /*break*/, 5];
                            case 5: return [2 /*return*/];
                        }
                    });
                }); },
            },
        ]);
    };
    if (loading) {
        return (<>
        <expo_router_1.Stack.Screen options={{ title: 'Invoice' }}/>
        <react_native_1.View style={styles.centered}><react_native_1.ActivityIndicator size="large" color={theme_1.Colors.primary}/></react_native_1.View>
      </>);
    }
    if (!invoice) {
        return (<>
        <expo_router_1.Stack.Screen options={{ title: 'Invoice' }}/>
        <react_native_1.View style={styles.centered}><react_native_1.Text style={styles.errorText}>Invoice not found</react_native_1.Text></react_native_1.View>
      </>);
    }
    var sm = statusColors[invoice.status] || statusColors.draft;
    var clientName = invoice.client_name || ((_a = invoice.intake_form) === null || _a === void 0 ? void 0 : _a.contact_name);
    var invNum = invoice.invoice_number || "INV-".concat(invoice.id.slice(-6).toUpperCase());
    return (<>
      <expo_router_1.Stack.Screen options={{ title: invNum }}/>
      <react_native_1.ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Header */}
        <react_native_1.View style={styles.headerCard}>
          <react_native_1.View style={styles.headerTop}>
            <react_native_1.View>
              <react_native_1.Text style={styles.invNum}>{invNum}</react_native_1.Text>
              {clientName && <react_native_1.Text style={styles.clientName}>{clientName}</react_native_1.Text>}
            </react_native_1.View>
            <react_native_1.View style={[styles.statusPill, { backgroundColor: sm.bg }]}>
              <react_native_1.Text style={[styles.statusText, { color: sm.text }]}>
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </react_native_1.Text>
            </react_native_1.View>
          </react_native_1.View>
          <react_native_1.Text style={styles.totalAmount}>{fmt(invoice.total_amount)}</react_native_1.Text>
          {invoice.amount_paid > 0 && invoice.status !== 'paid' && (<react_native_1.View style={styles.paidRow}>
              <react_native_1.View style={styles.progressBg}>
                <react_native_1.View style={[styles.progressFill, { width: "".concat(Math.min(100, (invoice.amount_paid / invoice.total_amount) * 100), "%") }]}/>
              </react_native_1.View>
              <react_native_1.Text style={styles.paidText}>{fmt(invoice.amount_paid)} paid · {fmt(invoice.amount_due)} due</react_native_1.Text>
            </react_native_1.View>)}
        </react_native_1.View>

        {/* Actions */}
        <react_native_1.View style={styles.actionRow}>
          {['draft', 'viewed'].includes(invoice.status) && (<react_native_1.TouchableOpacity style={styles.actionBtn} onPress={sendInvoice} disabled={actioning}>
              {actioning ? <react_native_1.ActivityIndicator size="small" color={theme_1.Colors.primary}/> : (<>
                  <vector_icons_1.Ionicons name="send-outline" size={16} color={theme_1.Colors.primary}/>
                  <react_native_1.Text style={styles.actionBtnText}>Send Invoice</react_native_1.Text>
                </>)}
            </react_native_1.TouchableOpacity>)}
          {['sent', 'viewed', 'partial', 'overdue'].includes(invoice.status) && (<react_native_1.TouchableOpacity style={[styles.actionBtn, styles.actionBtnGreen]} onPress={markPaid} disabled={actioning}>
              <vector_icons_1.Ionicons name="checkmark-circle-outline" size={16} color={theme_1.Colors.success}/>
              <react_native_1.Text style={[styles.actionBtnText, { color: theme_1.Colors.success }]}>Mark Paid</react_native_1.Text>
            </react_native_1.TouchableOpacity>)}
          <react_native_1.TouchableOpacity style={[styles.actionBtn, styles.actionBtnRed]} onPress={deleteInvoice} disabled={actioning}>
            <vector_icons_1.Ionicons name="trash-outline" size={16} color={theme_1.Colors.error}/>
            <react_native_1.Text style={[styles.actionBtnText, { color: theme_1.Colors.error }]}>Delete</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>

        {/* Dates */}
        <react_native_1.View style={styles.section}>
          <react_native_1.Text style={styles.sectionLabel}>Dates</react_native_1.Text>
          <react_native_1.View style={styles.card}>
            <InfoRow label="Issue Date" value={formatDate(invoice.issue_date)}/>
            <InfoRow label="Due Date" value={formatDate(invoice.due_date)}/>
          </react_native_1.View>
        </react_native_1.View>

        {/* Line items */}
        {invoice.items && invoice.items.length > 0 && (<react_native_1.View style={styles.section}>
            <react_native_1.Text style={styles.sectionLabel}>Line Items</react_native_1.Text>
            <react_native_1.View style={styles.card}>
              {invoice.items.map(function (item, idx) { return (<react_native_1.View key={item.id} style={[styles.lineRow, idx < invoice.items.length - 1 && styles.lineBorder]}>
                  <react_native_1.View style={{ flex: 1 }}>
                    <react_native_1.Text style={styles.lineDesc}>{item.description}</react_native_1.Text>
                    <react_native_1.Text style={styles.lineMeta}>{item.quantity} × {fmt(item.unit_price)}</react_native_1.Text>
                  </react_native_1.View>
                  <react_native_1.Text style={styles.lineAmt}>{fmt(item.amount)}</react_native_1.Text>
                </react_native_1.View>); })}
            </react_native_1.View>
          </react_native_1.View>)}

        {/* Totals */}
        <react_native_1.View style={styles.section}>
          <react_native_1.Text style={styles.sectionLabel}>Totals</react_native_1.Text>
          <react_native_1.View style={styles.card}>
            <InfoRow label="Subtotal" value={fmt(invoice.subtotal)}/>
            {invoice.discount_amount > 0 && <InfoRow label="Discount" value={"-".concat(fmt(invoice.discount_amount))}/>}
            {invoice.tax_rate > 0 && <InfoRow label={"Tax (".concat(invoice.tax_rate, "%)")} value={fmt(invoice.tax_amount)}/>}
            <react_native_1.View style={[styles.infoRow, styles.totalFinalRow]}>
              <react_native_1.Text style={styles.totalFinalLabel}>Total</react_native_1.Text>
              <react_native_1.Text style={styles.totalFinalValue}>{fmt(invoice.total_amount)}</react_native_1.Text>
            </react_native_1.View>
          </react_native_1.View>
        </react_native_1.View>

        {/* Notes */}
        {invoice.notes && (<react_native_1.View style={styles.section}>
            <react_native_1.Text style={styles.sectionLabel}>Notes</react_native_1.Text>
            <react_native_1.View style={styles.card}><react_native_1.Text style={styles.notesText}>{invoice.notes}</react_native_1.Text></react_native_1.View>
          </react_native_1.View>)}
        {invoice.terms && (<react_native_1.View style={styles.section}>
            <react_native_1.Text style={styles.sectionLabel}>Terms</react_native_1.Text>
            <react_native_1.View style={styles.card}><react_native_1.Text style={styles.notesText}>{invoice.terms}</react_native_1.Text></react_native_1.View>
          </react_native_1.View>)}
      </react_native_1.ScrollView>
    </>);
}
function InfoRow(_a) {
    var label = _a.label, value = _a.value;
    return (<react_native_1.View style={styles.infoRow}>
      <react_native_1.Text style={styles.infoLabel}>{label}</react_native_1.Text>
      <react_native_1.Text style={styles.infoValue}>{value}</react_native_1.Text>
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: theme_1.Colors.background },
    content: { padding: 16, paddingBottom: 40 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { color: theme_1.Colors.textMuted, fontSize: 16 },
    headerCard: __assign(__assign({ backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.lg, padding: 20 }, theme_1.Shadow.md), { marginBottom: 16 }),
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    invNum: { fontSize: 14, fontWeight: '700', color: theme_1.Colors.primary },
    clientName: { fontSize: 18, fontWeight: '700', color: theme_1.Colors.textPrimary, marginTop: 4 },
    statusPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: theme_1.Radius.full },
    statusText: { fontSize: 13, fontWeight: '700' },
    totalAmount: { fontSize: 36, fontWeight: '800', color: theme_1.Colors.textPrimary },
    paidRow: { marginTop: 12 },
    progressBg: { height: 5, backgroundColor: theme_1.Colors.border, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
    progressFill: { height: '100%', backgroundColor: theme_1.Colors.success, borderRadius: 3 },
    paidText: { fontSize: 13, color: theme_1.Colors.textMuted },
    actionRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
    actionBtn: {
        flex: 1, minWidth: 120, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, backgroundColor: theme_1.Colors.primaryLight, borderRadius: theme_1.Radius.md, padding: 12,
    },
    actionBtnGreen: { backgroundColor: theme_1.Colors.successLight },
    actionBtnRed: { backgroundColor: '#FEE2E2' },
    actionBtnText: { fontSize: 14, fontWeight: '600', color: theme_1.Colors.primary },
    section: { marginBottom: 20 },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: theme_1.Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    card: __assign({ backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.lg, padding: 16 }, theme_1.Shadow.sm),
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: react_native_1.StyleSheet.hairlineWidth, borderBottomColor: theme_1.Colors.border },
    infoLabel: { fontSize: 14, color: theme_1.Colors.textSecondary },
    infoValue: { fontSize: 14, fontWeight: '600', color: theme_1.Colors.textPrimary },
    totalFinalRow: { borderBottomWidth: 0, marginTop: 4 },
    totalFinalLabel: { fontSize: 16, fontWeight: '700', color: theme_1.Colors.textPrimary },
    totalFinalValue: { fontSize: 20, fontWeight: '800', color: theme_1.Colors.primary },
    lineRow: { paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    lineBorder: { borderBottomWidth: react_native_1.StyleSheet.hairlineWidth, borderBottomColor: theme_1.Colors.border },
    lineDesc: { fontSize: 14, fontWeight: '600', color: theme_1.Colors.textPrimary },
    lineMeta: { fontSize: 12, color: theme_1.Colors.textMuted, marginTop: 2 },
    lineAmt: { fontSize: 14, fontWeight: '700', color: theme_1.Colors.textPrimary },
    notesText: { fontSize: 14, color: theme_1.Colors.textSecondary, lineHeight: 20 },
});
