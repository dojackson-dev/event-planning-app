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
exports.default = NewEstimateScreen;
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
var uid = function () { return Math.random().toString(36).slice(2); };
function NewEstimateScreen() {
    var _this = this;
    var router = (0, expo_router_1.useRouter)();
    var eventId = (0, expo_router_1.useLocalSearchParams)().eventId;
    var _a = (0, react_1.useState)([]), events = _a[0], setEvents = _a[1];
    var _b = (0, react_1.useState)(''), selectedEventId = _b[0], setSelectedEventId = _b[1];
    var _c = (0, react_1.useState)(''), clientName = _c[0], setClientName = _c[1];
    var _d = (0, react_1.useState)(''), clientPhone = _d[0], setClientPhone = _d[1];
    var _e = (0, react_1.useState)(''), eventLabel = _e[0], setEventLabel = _e[1];
    var _f = (0, react_1.useState)([
        { id: uid(), description: '', quantity: '1', unit_price: '' },
    ]), lineItems = _f[0], setLineItems = _f[1];
    var _g = (0, react_1.useState)(false), includeTax = _g[0], setIncludeTax = _g[1];
    var _h = (0, react_1.useState)('8.5'), taxRate = _h[0], setTaxRate = _h[1];
    var _j = (0, react_1.useState)(''), globalDiscount = _j[0], setGlobalDiscount = _j[1];
    var _k = (0, react_1.useState)(''), notes = _k[0], setNotes = _k[1];
    var _l = (0, react_1.useState)('This estimate is valid until the expiration date above.'), terms = _l[0], setTerms = _l[1];
    var _m = (0, react_1.useState)(new Date().toISOString().slice(0, 10)), issueDate = _m[0], setIssueDate = _m[1];
    var _o = (0, react_1.useState)(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)), expirationDate = _o[0], setExpirationDate = _o[1];
    var _p = (0, react_1.useState)(false), saving = _p[0], setSaving = _p[1];
    var _q = (0, react_1.useState)(false), showEventPicker = _q[0], setShowEventPicker = _q[1];
    (0, react_1.useEffect)(function () { loadEvents(); }, []);
    // Auto-select event if navigated from event detail page
    (0, react_1.useEffect)(function () {
        if (eventId && events.length > 0) {
            var ev = events.find(function (e) { return e.id === eventId; });
            if (ev && !selectedEventId)
                selectEvent(ev);
        }
    }, [eventId, events]);
    var loadEvents = function () { return __awaiter(_this, void 0, void 0, function () {
        var user, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, supabase_1.supabase.auth.getUser()];
                case 1:
                    user = (_a.sent()).data.user;
                    if (!user)
                        return [2 /*return*/];
                    return [4 /*yield*/, supabase_1.supabase
                            .from('event')
                            .select('id, name, date, intake_form_id, intake_form:intake_forms!intake_form_id(contact_name, contact_phone, event_name)')
                            .eq('owner_id', user.id)
                            .order('date', { ascending: false })];
                case 2:
                    data = (_a.sent()).data;
                    setEvents(data || []);
                    return [2 /*return*/];
            }
        });
    }); };
    var selectEvent = function (ev) {
        var _a, _b, _c;
        setSelectedEventId(ev.id);
        setEventLabel("".concat(((_a = ev.intake_form) === null || _a === void 0 ? void 0 : _a.event_name) || ev.name, " \u2014 ").concat(new Date(ev.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })));
        setClientName(((_b = ev.intake_form) === null || _b === void 0 ? void 0 : _b.contact_name) || '');
        setClientPhone(((_c = ev.intake_form) === null || _c === void 0 ? void 0 : _c.contact_phone) || '');
        setShowEventPicker(false);
    };
    var addLineItem = function () { return setLineItems(function (prev) { return __spreadArray(__spreadArray([], prev, true), [{ id: uid(), description: '', quantity: '1', unit_price: '' }], false); }); };
    var removeLineItem = function (id) { return setLineItems(function (prev) { return prev.filter(function (l) { return l.id !== id; }); }); };
    var updateLine = function (id, field, val) {
        return setLineItems(function (prev) { return prev.map(function (l) {
            var _a;
            return l.id === id ? __assign(__assign({}, l), (_a = {}, _a[field] = val, _a)) : l;
        }); });
    };
    var subtotal = lineItems.reduce(function (sum, l) { return sum + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0); }, 0);
    var discount = parseFloat(globalDiscount) || 0;
    var taxAmount = includeTax ? (subtotal - discount) * (parseFloat(taxRate) || 0) / 100 : 0;
    var total = subtotal - discount + taxAmount;
    var handleCreate = function () { return __awaiter(_this, void 0, void 0, function () {
        var validItems, user, selectedEvent, estimate_1, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    validItems = lineItems.filter(function (l) { return l.description.trim() && parseFloat(l.unit_price) > 0; });
                    if (validItems.length === 0) {
                        react_native_1.Alert.alert('Validation', 'Add at least one line item with a description and price.');
                        return [2 /*return*/];
                    }
                    setSaving(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, supabase_1.supabase.auth.getUser()];
                case 2:
                    user = (_a.sent()).data.user;
                    if (!user)
                        throw new Error('Not authenticated');
                    selectedEvent = events.find(function (e) { return e.id === selectedEventId; });
                    return [4 /*yield*/, (0, api_1.apiRequest)('/estimates', {
                            method: 'POST',
                            body: {
                                estimate: {
                                    owner_id: user.id,
                                    intake_form_id: (selectedEvent === null || selectedEvent === void 0 ? void 0 : selectedEvent.intake_form_id) || null,
                                    client_name: clientName || undefined,
                                    client_phone: clientPhone || undefined,
                                    subtotal: subtotal,
                                    tax_rate: includeTax ? parseFloat(taxRate) : 0,
                                    tax_amount: taxAmount,
                                    discount_amount: discount,
                                    total_amount: total,
                                    status: 'draft',
                                    issue_date: issueDate,
                                    expiration_date: expirationDate,
                                    notes: notes || undefined,
                                    terms: terms || undefined,
                                },
                                items: validItems.map(function (item) { return ({
                                    description: item.description,
                                    quantity: parseFloat(item.quantity) || 1,
                                    unit_price: parseFloat(item.unit_price) || 0,
                                    subtotal: (parseFloat(item.quantity) || 1) * (parseFloat(item.unit_price) || 0),
                                    amount: (parseFloat(item.quantity) || 1) * (parseFloat(item.unit_price) || 0),
                                    discount_type: 'none',
                                    discount_value: 0,
                                    discount_amount: 0,
                                }); }),
                            },
                        })];
                case 3:
                    estimate_1 = _a.sent();
                    react_native_1.Alert.alert('Estimate Created', 'Estimate saved as draft.', [
                        { text: 'View', onPress: function () { return router.replace("/(tabs)/estimates/".concat(estimate_1.id)); } },
                    ]);
                    return [3 /*break*/, 6];
                case 4:
                    err_1 = _a.sent();
                    react_native_1.Alert.alert('Error', err_1.message || 'Failed to create estimate');
                    return [3 /*break*/, 6];
                case 5:
                    setSaving(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    return (<react_native_1.ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Event selector */}
      <react_native_1.View style={styles.section}>
        <react_native_1.Text style={styles.sectionLabel}>Event</react_native_1.Text>
        <react_native_1.TouchableOpacity style={styles.selectBox} onPress={function () { return setShowEventPicker(function (v) { return !v; }); }}>
          <react_native_1.Text style={[styles.selectText, !selectedEventId && styles.placeholder]}>
            {selectedEventId ? eventLabel : 'Select event (optional)'}
          </react_native_1.Text>
          <vector_icons_1.Ionicons name={showEventPicker ? 'chevron-up' : 'chevron-down'} size={16} color={theme_1.Colors.textMuted}/>
        </react_native_1.TouchableOpacity>
        {showEventPicker && (<react_native_1.View style={styles.dropdown}>
            <react_native_1.TouchableOpacity style={styles.dropdownItem} onPress={function () { setSelectedEventId(''); setClientName(''); setClientPhone(''); setEventLabel(''); setShowEventPicker(false); }}>
              <react_native_1.Text style={styles.dropdownText}>— None —</react_native_1.Text>
            </react_native_1.TouchableOpacity>
            {events.map(function (ev) {
                var _a, _b;
                return (<react_native_1.TouchableOpacity key={ev.id} style={styles.dropdownItem} onPress={function () { return selectEvent(ev); }}>
                <react_native_1.Text style={styles.dropdownText} numberOfLines={1}>
                  {((_a = ev.intake_form) === null || _a === void 0 ? void 0 : _a.event_name) || ev.name} — {new Date(ev.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </react_native_1.Text>
                {((_b = ev.intake_form) === null || _b === void 0 ? void 0 : _b.contact_name) && <react_native_1.Text style={styles.dropdownSub}>{ev.intake_form.contact_name}</react_native_1.Text>}
              </react_native_1.TouchableOpacity>);
            })}
          </react_native_1.View>)}
      </react_native_1.View>

      {/* Client info */}
      <react_native_1.View style={styles.section}>
        <react_native_1.Text style={styles.sectionLabel}>Client</react_native_1.Text>
        <react_native_1.TextInput style={styles.input} value={clientName} onChangeText={setClientName} placeholder="Client name" placeholderTextColor={theme_1.Colors.textMuted}/>
        <react_native_1.TextInput style={[styles.input, { marginTop: 8 }]} value={clientPhone} onChangeText={setClientPhone} placeholder="Phone (for SMS notification)" placeholderTextColor={theme_1.Colors.textMuted} keyboardType="phone-pad"/>
      </react_native_1.View>

      {/* Line items */}
      <react_native_1.View style={styles.section}>
        <react_native_1.Text style={styles.sectionLabel}>Line Items</react_native_1.Text>
        {lineItems.map(function (item, idx) { return (<react_native_1.View key={item.id} style={styles.lineItem}>
            <react_native_1.View style={styles.lineTop}>
              <react_native_1.Text style={styles.lineNum}>#{idx + 1}</react_native_1.Text>
              {lineItems.length > 1 && (<react_native_1.TouchableOpacity onPress={function () { return removeLineItem(item.id); }}>
                  <vector_icons_1.Ionicons name="trash-outline" size={16} color={theme_1.Colors.error}/>
                </react_native_1.TouchableOpacity>)}
            </react_native_1.View>
            <react_native_1.TextInput style={styles.input} value={item.description} onChangeText={function (v) { return updateLine(item.id, 'description', v); }} placeholder="Description" placeholderTextColor={theme_1.Colors.textMuted}/>
            <react_native_1.View style={styles.lineRow}>
              <react_native_1.View style={styles.lineField}>
                <react_native_1.Text style={styles.fieldLabel}>Qty</react_native_1.Text>
                <react_native_1.TextInput style={styles.smallInput} value={item.quantity} onChangeText={function (v) { return updateLine(item.id, 'quantity', v); }} keyboardType="decimal-pad" placeholder="1" placeholderTextColor={theme_1.Colors.textMuted}/>
              </react_native_1.View>
              <react_native_1.View style={[styles.lineField, { flex: 2 }]}>
                <react_native_1.Text style={styles.fieldLabel}>Unit Price ($)</react_native_1.Text>
                <react_native_1.TextInput style={styles.smallInput} value={item.unit_price} onChangeText={function (v) { return updateLine(item.id, 'unit_price', v); }} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={theme_1.Colors.textMuted}/>
              </react_native_1.View>
              <react_native_1.View style={[styles.lineField, { flex: 2, alignItems: 'flex-end' }]}>
                <react_native_1.Text style={styles.fieldLabel}>Amount</react_native_1.Text>
                <react_native_1.Text style={styles.lineAmount}>{fmt((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0))}</react_native_1.Text>
              </react_native_1.View>
            </react_native_1.View>
          </react_native_1.View>); })}
        <react_native_1.TouchableOpacity style={styles.addBtn} onPress={addLineItem}>
          <vector_icons_1.Ionicons name="add-circle-outline" size={16} color={theme_1.Colors.primary}/>
          <react_native_1.Text style={styles.addBtnText}>Add Line Item</react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>

      {/* Totals */}
      <react_native_1.View style={styles.section}>
        <react_native_1.Text style={styles.sectionLabel}>Totals</react_native_1.Text>
        <react_native_1.View style={styles.card}>
          <react_native_1.View style={styles.totalRow}><react_native_1.Text style={styles.totalLabel}>Subtotal</react_native_1.Text><react_native_1.Text style={styles.totalValue}>{fmt(subtotal)}</react_native_1.Text></react_native_1.View>
          <react_native_1.View style={styles.totalRow}>
            <react_native_1.Text style={styles.totalLabel}>Discount ($)</react_native_1.Text>
            <react_native_1.TextInput style={styles.inlineInput} value={globalDiscount} onChangeText={setGlobalDiscount} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={theme_1.Colors.textMuted}/>
          </react_native_1.View>
          <react_native_1.View style={styles.totalRow}>
            <react_native_1.View style={styles.taxRow}><react_native_1.Text style={styles.totalLabel}>Tax</react_native_1.Text><react_native_1.Switch value={includeTax} onValueChange={setIncludeTax} trackColor={{ false: theme_1.Colors.border, true: theme_1.Colors.primary }} thumbColor="#FFF" style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}/></react_native_1.View>
            {includeTax && <react_native_1.View style={styles.taxInputRow}><react_native_1.TextInput style={[styles.inlineInput, { width: 60 }]} value={taxRate} onChangeText={setTaxRate} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={theme_1.Colors.textMuted}/><react_native_1.Text style={styles.totalLabel}>%  →  {fmt(taxAmount)}</react_native_1.Text></react_native_1.View>}
          </react_native_1.View>
          <react_native_1.View style={[styles.totalRow, styles.totalFinal]}><react_native_1.Text style={styles.totalFinalLabel}>Total</react_native_1.Text><react_native_1.Text style={styles.totalFinalValue}>{fmt(total)}</react_native_1.Text></react_native_1.View>
        </react_native_1.View>
      </react_native_1.View>

      {/* Dates */}
      <react_native_1.View style={styles.section}>
        <react_native_1.Text style={styles.sectionLabel}>Dates</react_native_1.Text>
        <react_native_1.View style={styles.card}>
          <react_native_1.View style={styles.totalRow}><react_native_1.Text style={styles.totalLabel}>Issue Date</react_native_1.Text><react_native_1.TextInput style={styles.inlineInput} value={issueDate} onChangeText={setIssueDate} placeholder="YYYY-MM-DD" placeholderTextColor={theme_1.Colors.textMuted}/></react_native_1.View>
          <react_native_1.View style={styles.totalRow}><react_native_1.Text style={styles.totalLabel}>Expiration Date</react_native_1.Text><react_native_1.TextInput style={styles.inlineInput} value={expirationDate} onChangeText={setExpirationDate} placeholder="YYYY-MM-DD" placeholderTextColor={theme_1.Colors.textMuted}/></react_native_1.View>
        </react_native_1.View>
      </react_native_1.View>

      <react_native_1.View style={styles.section}>
        <react_native_1.Text style={styles.sectionLabel}>Notes</react_native_1.Text>
        <react_native_1.TextInput style={[styles.input, styles.multiline]} value={notes} onChangeText={setNotes} placeholder="Additional notes..." placeholderTextColor={theme_1.Colors.textMuted} multiline numberOfLines={3}/>
      </react_native_1.View>
      <react_native_1.View style={styles.section}>
        <react_native_1.Text style={styles.sectionLabel}>Terms</react_native_1.Text>
        <react_native_1.TextInput style={[styles.input, styles.multiline]} value={terms} onChangeText={setTerms} placeholder="Estimate terms..." placeholderTextColor={theme_1.Colors.textMuted} multiline numberOfLines={3}/>
      </react_native_1.View>

      <react_native_1.TouchableOpacity style={[styles.createBtn, saving && styles.createBtnDisabled]} onPress={handleCreate} disabled={saving}>
        {saving ? <react_native_1.ActivityIndicator color="#FFF" size="small"/> : (<><vector_icons_1.Ionicons name="document-text-outline" size={18} color="#FFF"/><react_native_1.Text style={styles.createBtnText}>Create Estimate</react_native_1.Text></>)}
      </react_native_1.TouchableOpacity>
    </react_native_1.ScrollView>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: theme_1.Colors.background },
    content: { padding: 16, paddingBottom: 40 },
    section: { marginBottom: 20 },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: theme_1.Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    card: __assign({ backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.lg, padding: 16 }, theme_1.Shadow.sm),
    selectBox: { backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.md, padding: 14, borderWidth: 1, borderColor: theme_1.Colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    selectText: { fontSize: 15, color: theme_1.Colors.textPrimary, flex: 1 },
    placeholder: { color: theme_1.Colors.textMuted },
    dropdown: __assign({ backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.md, marginTop: 4, borderWidth: 1, borderColor: theme_1.Colors.border, maxHeight: 220 }, theme_1.Shadow.md),
    dropdownItem: { padding: 12, borderBottomWidth: react_native_1.StyleSheet.hairlineWidth, borderBottomColor: theme_1.Colors.border },
    dropdownText: { fontSize: 14, color: theme_1.Colors.textPrimary },
    dropdownSub: { fontSize: 12, color: theme_1.Colors.textMuted, marginTop: 2 },
    input: { backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.md, padding: 12, borderWidth: 1, borderColor: theme_1.Colors.border, fontSize: 15, color: theme_1.Colors.textPrimary },
    multiline: { height: 80, textAlignVertical: 'top' },
    lineItem: { backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.md, padding: 12, borderWidth: 1, borderColor: theme_1.Colors.border, marginBottom: 8 },
    lineTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    lineNum: { fontSize: 12, fontWeight: '600', color: theme_1.Colors.textMuted },
    lineRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'flex-end' },
    lineField: { flex: 1 },
    fieldLabel: { fontSize: 11, fontWeight: '600', color: theme_1.Colors.textMuted, marginBottom: 4 },
    smallInput: { backgroundColor: theme_1.Colors.background, borderRadius: theme_1.Radius.sm, padding: 8, borderWidth: 1, borderColor: theme_1.Colors.border, fontSize: 14, color: theme_1.Colors.textPrimary },
    lineAmount: { fontSize: 15, fontWeight: '700', color: theme_1.Colors.textPrimary, paddingVertical: 8 },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
    addBtnText: { fontSize: 14, color: theme_1.Colors.primary, fontWeight: '600' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: react_native_1.StyleSheet.hairlineWidth, borderBottomColor: theme_1.Colors.border },
    totalLabel: { fontSize: 14, color: theme_1.Colors.textSecondary },
    totalValue: { fontSize: 14, fontWeight: '600', color: theme_1.Colors.textPrimary },
    taxRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    taxInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    inlineInput: { backgroundColor: theme_1.Colors.background, borderRadius: theme_1.Radius.sm, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: theme_1.Colors.border, fontSize: 14, color: theme_1.Colors.textPrimary, minWidth: 80, textAlign: 'right' },
    totalFinal: { borderBottomWidth: 0, marginTop: 4 },
    totalFinalLabel: { fontSize: 16, fontWeight: '700', color: theme_1.Colors.textPrimary },
    totalFinalValue: { fontSize: 20, fontWeight: '800', color: '#7C3AED' },
    createBtn: { backgroundColor: '#7C3AED', borderRadius: theme_1.Radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
    createBtnDisabled: { opacity: 0.6 },
    createBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
