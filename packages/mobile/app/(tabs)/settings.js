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
exports.default = SettingsScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var vector_icons_1 = require("@expo/vector-icons");
var supabase_1 = require("@/lib/supabase");
var api_1 = require("@/lib/api");
var theme_1 = require("@/lib/theme");
function SettingsScreen() {
    var _a = (0, react_1.useState)('profile'), tab = _a[0], setTab = _a[1];
    return (<react_native_1.View style={styles.container}>
      <react_native_1.View style={styles.tabBar}>
        {['profile', 'billing', 'password'].map(function (t) { return (<react_native_1.TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={function () { return setTab(t); }}>
            <react_native_1.Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'profile' ? 'Profile' : t === 'billing' ? 'Billing' : 'Password'}
            </react_native_1.Text>
          </react_native_1.TouchableOpacity>); })}
      </react_native_1.View>
      {tab === 'profile' && <ProfileTab />}
      {tab === 'billing' && <BillingTab />}
      {tab === 'password' && <PasswordTab />}
    </react_native_1.View>);
}
function ProfileTab() {
    var _this = this;
    var _a = (0, react_1.useState)({ first_name: '', last_name: '', email: '', phone: '' }), profile = _a[0], setProfile = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    var _c = (0, react_1.useState)(false), saving = _c[0], setSaving = _c[1];
    (0, expo_router_1.useFocusEffect)((0, react_1.useCallback)(function () {
        var load = function () { return __awaiter(_this, void 0, void 0, function () {
            var user_1, data_1, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        setLoading(true);
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 4, 5, 6]);
                        return [4 /*yield*/, supabase_1.supabase.auth.getUser()];
                    case 2:
                        user_1 = (_b.sent()).data.user;
                        if (!user_1)
                            return [2 /*return*/];
                        setProfile(function (prev) { return (__assign(__assign({}, prev), { email: user_1.email || '' })); });
                        return [4 /*yield*/, supabase_1.supabase
                                .from('owner_profiles')
                                .select('first_name, last_name, phone')
                                .eq('user_id', user_1.id)
                                .maybeSingle()];
                    case 3:
                        data_1 = (_b.sent()).data;
                        if (data_1)
                            setProfile(function (prev) { return (__assign(__assign({}, prev), { first_name: data_1.first_name || '', last_name: data_1.last_name || '', phone: data_1.phone || '' })); });
                        return [3 /*break*/, 6];
                    case 4:
                        _a = _b.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        setLoading(false);
                        return [7 /*endfinally*/];
                    case 6: return [2 /*return*/];
                }
            });
        }); };
        load();
    }, []));
    var handleSave = function () { return __awaiter(_this, void 0, void 0, function () {
        var user, error, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setSaving(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, supabase_1.supabase.auth.getUser()];
                case 2:
                    user = (_a.sent()).data.user;
                    if (!user)
                        throw new Error('Not authenticated');
                    return [4 /*yield*/, supabase_1.supabase
                            .from('owner_profiles')
                            .upsert({ user_id: user.id, first_name: profile.first_name, last_name: profile.last_name, phone: profile.phone }, { onConflict: 'user_id' })];
                case 3:
                    error = (_a.sent()).error;
                    if (error)
                        throw error;
                    react_native_1.Alert.alert('Saved', 'Profile updated.');
                    return [3 /*break*/, 6];
                case 4:
                    err_1 = _a.sent();
                    react_native_1.Alert.alert('Error', err_1.message || 'Failed to save profile');
                    return [3 /*break*/, 6];
                case 5:
                    setSaving(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    if (loading)
        return <react_native_1.View style={styles.center}><react_native_1.ActivityIndicator size="large" color={theme_1.Colors.primary}/></react_native_1.View>;
    return (<react_native_1.ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner}>
      <react_native_1.View style={styles.section}>
        <react_native_1.Text style={styles.label}>First Name</react_native_1.Text>
        <react_native_1.TextInput style={styles.input} value={profile.first_name} onChangeText={function (v) { return setProfile(function (p) { return (__assign(__assign({}, p), { first_name: v })); }); }} placeholder="First name" placeholderTextColor={theme_1.Colors.textMuted}/>
      </react_native_1.View>
      <react_native_1.View style={styles.section}>
        <react_native_1.Text style={styles.label}>Last Name</react_native_1.Text>
        <react_native_1.TextInput style={styles.input} value={profile.last_name} onChangeText={function (v) { return setProfile(function (p) { return (__assign(__assign({}, p), { last_name: v })); }); }} placeholder="Last name" placeholderTextColor={theme_1.Colors.textMuted}/>
      </react_native_1.View>
      <react_native_1.View style={styles.section}>
        <react_native_1.Text style={styles.label}>Email</react_native_1.Text>
        <react_native_1.TextInput style={[styles.input, styles.inputDisabled]} value={profile.email} editable={false} keyboardType="email-address"/>
        <react_native_1.Text style={styles.hint}>Email cannot be changed here</react_native_1.Text>
      </react_native_1.View>
      <react_native_1.View style={styles.section}>
        <react_native_1.Text style={styles.label}>Phone</react_native_1.Text>
        <react_native_1.TextInput style={styles.input} value={profile.phone} onChangeText={function (v) { return setProfile(function (p) { return (__assign(__assign({}, p), { phone: v })); }); }} placeholder="+1 (555) 000-0000" placeholderTextColor={theme_1.Colors.textMuted} keyboardType="phone-pad"/>
      </react_native_1.View>
      <react_native_1.TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
        {saving ? <react_native_1.ActivityIndicator size="small" color="#FFF"/> : <react_native_1.Text style={styles.saveBtnText}>Save Profile</react_native_1.Text>}
      </react_native_1.TouchableOpacity>

      <react_native_1.TouchableOpacity style={styles.signOutBtn} onPress={function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                react_native_1.Alert.alert('Sign Out', 'Are you sure?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign Out', style: 'destructive', onPress: function () { return supabase_1.supabase.auth.signOut(); } },
                ]);
                return [2 /*return*/];
            });
        }); }}>
        <vector_icons_1.Ionicons name="log-out-outline" size={18} color={theme_1.Colors.error}/>
        <react_native_1.Text style={styles.signOutText}>Sign Out</react_native_1.Text>
      </react_native_1.TouchableOpacity>
    </react_native_1.ScrollView>);
}
function BillingTab() {
    var _this = this;
    var _a = (0, react_1.useState)({ deposit_percentage: 25, deposit_due_days: 30, final_payment_days: 7, require_deposit: true }), schedule = _a[0], setSchedule = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    var _c = (0, react_1.useState)(false), saving = _c[0], setSaving = _c[1];
    (0, expo_router_1.useFocusEffect)((0, react_1.useCallback)(function () {
        var load = function () { return __awaiter(_this, void 0, void 0, function () {
            var data, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        setLoading(true);
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, 4, 5]);
                        return [4 /*yield*/, (0, api_1.apiRequest)('/owner/payment-schedule')];
                    case 2:
                        data = _b.sent();
                        if (data)
                            setSchedule(data);
                        return [3 /*break*/, 5];
                    case 3:
                        _a = _b.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        setLoading(false);
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        }); };
        load();
    }, []));
    var handleSave = function () { return __awaiter(_this, void 0, void 0, function () {
        var err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setSaving(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, (0, api_1.apiRequest)('/owner/payment-schedule', { method: 'PUT', body: schedule })];
                case 2:
                    _a.sent();
                    react_native_1.Alert.alert('Saved', 'Payment schedule updated.');
                    return [3 /*break*/, 5];
                case 3:
                    err_2 = _a.sent();
                    react_native_1.Alert.alert('Error', err_2.message || 'Failed to save');
                    return [3 /*break*/, 5];
                case 4:
                    setSaving(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    if (loading)
        return <react_native_1.View style={styles.center}><react_native_1.ActivityIndicator size="large" color={theme_1.Colors.primary}/></react_native_1.View>;
    return (<react_native_1.ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner}>
      <react_native_1.View style={styles.card}>
        <react_native_1.Text style={styles.cardTitle}>Deposit Settings</react_native_1.Text>
        <react_native_1.View style={styles.settingRow}>
          <react_native_1.Text style={styles.settingLabel}>Require Deposit</react_native_1.Text>
          <react_native_1.Switch value={schedule.require_deposit} onValueChange={function (v) { return setSchedule(function (p) { return (__assign(__assign({}, p), { require_deposit: v })); }); }} trackColor={{ false: theme_1.Colors.border, true: theme_1.Colors.primary }} thumbColor="#FFF"/>
        </react_native_1.View>
        {schedule.require_deposit && (<>
            <react_native_1.View style={styles.settingRow}>
              <react_native_1.Text style={styles.settingLabel}>Deposit Percentage</react_native_1.Text>
              <react_native_1.View style={styles.numericInput}>
                <react_native_1.TextInput style={styles.numericText} value={String(schedule.deposit_percentage)} onChangeText={function (v) { return setSchedule(function (p) { return (__assign(__assign({}, p), { deposit_percentage: parseFloat(v) || 0 })); }); }} keyboardType="decimal-pad"/>
                <react_native_1.Text style={styles.numericSuffix}>%</react_native_1.Text>
              </react_native_1.View>
            </react_native_1.View>
            <react_native_1.View style={styles.settingRow}>
              <react_native_1.Text style={styles.settingLabel}>Deposit Due (days after booking)</react_native_1.Text>
              <react_native_1.View style={styles.numericInput}>
                <react_native_1.TextInput style={styles.numericText} value={String(schedule.deposit_due_days)} onChangeText={function (v) { return setSchedule(function (p) { return (__assign(__assign({}, p), { deposit_due_days: parseInt(v) || 0 })); }); }} keyboardType="number-pad"/>
                <react_native_1.Text style={styles.numericSuffix}>days</react_native_1.Text>
              </react_native_1.View>
            </react_native_1.View>
          </>)}
      </react_native_1.View>

      <react_native_1.View style={[styles.card, { marginTop: 16 }]}>
        <react_native_1.Text style={styles.cardTitle}>Final Payment</react_native_1.Text>
        <react_native_1.View style={styles.settingRow}>
          <react_native_1.Text style={styles.settingLabel}>Days before event</react_native_1.Text>
          <react_native_1.View style={styles.numericInput}>
            <react_native_1.TextInput style={styles.numericText} value={String(schedule.final_payment_days)} onChangeText={function (v) { return setSchedule(function (p) { return (__assign(__assign({}, p), { final_payment_days: parseInt(v) || 0 })); }); }} keyboardType="number-pad"/>
            <react_native_1.Text style={styles.numericSuffix}>days</react_native_1.Text>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.View>

      <react_native_1.TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled, { marginTop: 24 }]} onPress={handleSave} disabled={saving}>
        {saving ? <react_native_1.ActivityIndicator size="small" color="#FFF"/> : <react_native_1.Text style={styles.saveBtnText}>Save Payment Schedule</react_native_1.Text>}
      </react_native_1.TouchableOpacity>
    </react_native_1.ScrollView>);
}
function PasswordTab() {
    var _this = this;
    var _a = (0, react_1.useState)(''), current = _a[0], setCurrent = _a[1];
    var _b = (0, react_1.useState)(''), next = _b[0], setNext = _b[1];
    var _c = (0, react_1.useState)(''), confirm = _c[0], setConfirm = _c[1];
    var _d = (0, react_1.useState)(false), saving = _d[0], setSaving = _d[1];
    var handleSave = function () { return __awaiter(_this, void 0, void 0, function () {
        var error, err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (next.length < 8) {
                        react_native_1.Alert.alert('Validation', 'Password must be at least 8 characters.');
                        return [2 /*return*/];
                    }
                    if (next !== confirm) {
                        react_native_1.Alert.alert('Validation', 'Passwords do not match.');
                        return [2 /*return*/];
                    }
                    setSaving(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, supabase_1.supabase.auth.updateUser({ password: next })];
                case 2:
                    error = (_a.sent()).error;
                    if (error)
                        throw error;
                    react_native_1.Alert.alert('Saved', 'Password updated successfully.');
                    setCurrent('');
                    setNext('');
                    setConfirm('');
                    return [3 /*break*/, 5];
                case 3:
                    err_3 = _a.sent();
                    react_native_1.Alert.alert('Error', err_3.message || 'Failed to update password');
                    return [3 /*break*/, 5];
                case 4:
                    setSaving(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    return (<react_native_1.ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner}>
      <react_native_1.View style={styles.section}>
        <react_native_1.Text style={styles.label}>New Password</react_native_1.Text>
        <react_native_1.TextInput style={styles.input} value={next} onChangeText={setNext} secureTextEntry placeholder="At least 8 characters" placeholderTextColor={theme_1.Colors.textMuted}/>
      </react_native_1.View>
      <react_native_1.View style={styles.section}>
        <react_native_1.Text style={styles.label}>Confirm New Password</react_native_1.Text>
        <react_native_1.TextInput style={styles.input} value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Repeat new password" placeholderTextColor={theme_1.Colors.textMuted}/>
      </react_native_1.View>
      <react_native_1.TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
        {saving ? <react_native_1.ActivityIndicator size="small" color="#FFF"/> : <react_native_1.Text style={styles.saveBtnText}>Update Password</react_native_1.Text>}
      </react_native_1.TouchableOpacity>
    </react_native_1.ScrollView>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: theme_1.Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    tabBar: { flexDirection: 'row', backgroundColor: theme_1.Colors.surface, borderBottomWidth: react_native_1.StyleSheet.hairlineWidth, borderBottomColor: theme_1.Colors.border },
    tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
    tabActive: { borderBottomWidth: 2, borderBottomColor: theme_1.Colors.primary },
    tabText: { fontSize: 14, fontWeight: '500', color: theme_1.Colors.textMuted },
    tabTextActive: { color: theme_1.Colors.primary, fontWeight: '700' },
    tabContent: { flex: 1 },
    tabContentInner: { padding: 20, paddingBottom: 40 },
    section: { marginBottom: 16 },
    label: { fontSize: 12, fontWeight: '700', color: theme_1.Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    input: { backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.md, padding: 12, borderWidth: 1, borderColor: theme_1.Colors.border, fontSize: 15, color: theme_1.Colors.textPrimary },
    inputDisabled: { opacity: 0.6 },
    hint: { fontSize: 12, color: theme_1.Colors.textMuted, marginTop: 4 },
    card: __assign({ backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.lg, padding: 16 }, theme_1.Shadow.sm),
    cardTitle: { fontSize: 15, fontWeight: '700', color: theme_1.Colors.textPrimary, marginBottom: 16 },
    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: react_native_1.StyleSheet.hairlineWidth, borderTopColor: theme_1.Colors.border },
    settingLabel: { fontSize: 14, color: theme_1.Colors.textSecondary, flex: 1 },
    numericInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme_1.Colors.background, borderRadius: theme_1.Radius.sm, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: theme_1.Colors.border },
    numericText: { fontSize: 14, fontWeight: '700', color: theme_1.Colors.textPrimary, minWidth: 36, textAlign: 'right' },
    numericSuffix: { fontSize: 13, color: theme_1.Colors.textMuted, marginLeft: 4 },
    saveBtn: { backgroundColor: theme_1.Colors.primary, borderRadius: theme_1.Radius.lg, padding: 16, alignItems: 'center' },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    signOutBtn: { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: theme_1.Radius.lg, borderWidth: 1, borderColor: theme_1.Colors.error + '50', backgroundColor: theme_1.Colors.error + '08' },
    signOutText: { color: theme_1.Colors.error, fontSize: 15, fontWeight: '600' },
});
