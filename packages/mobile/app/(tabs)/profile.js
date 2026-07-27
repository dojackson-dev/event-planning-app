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
exports.default = ProfileScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var vector_icons_1 = require("@expo/vector-icons");
var supabase_1 = require("@/lib/supabase");
var theme_1 = require("@/lib/theme");
function ProfileScreen() {
    var _this = this;
    var _a = (0, react_1.useState)(null), user = _a[0], setUser = _a[1];
    var router = (0, expo_router_1.useRouter)();
    (0, react_1.useEffect)(function () { fetchUser(); }, []);
    var fetchUser = function () { return __awaiter(_this, void 0, void 0, function () {
        var user;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, supabase_1.supabase.auth.getUser()];
                case 1:
                    user = (_a.sent()).data.user;
                    setUser(user);
                    return [2 /*return*/];
            }
        });
    }); };
    var handleLogout = function () { return __awaiter(_this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            react_native_1.Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out', style: 'destructive',
                    onPress: function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, supabase_1.supabase.auth.signOut()];
                                case 1:
                                    _a.sent();
                                    router.replace('/(auth)/login');
                                    return [2 /*return*/];
                            }
                        });
                    }); },
                },
            ]);
            return [2 /*return*/];
        });
    }); };
    var initials = (user === null || user === void 0 ? void 0 : user.email)
        ? user.email.slice(0, 2).toUpperCase()
        : '??';
    var createdAt = (user === null || user === void 0 ? void 0 : user.created_at)
        ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : null;
    return (<react_native_1.ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar + identity */}
      <react_native_1.View style={styles.heroCard}>
        <react_native_1.View style={styles.avatar}>
          <react_native_1.Text style={styles.avatarText}>{initials}</react_native_1.Text>
        </react_native_1.View>
        <react_native_1.Text style={styles.emailText}>{(user === null || user === void 0 ? void 0 : user.email) || '—'}</react_native_1.Text>
        {createdAt && <react_native_1.Text style={styles.memberText}>Member since {createdAt}</react_native_1.Text>}
      </react_native_1.View>

      {/* Account info */}
      <react_native_1.Text style={styles.sectionLabel}>Account</react_native_1.Text>
      <react_native_1.View style={styles.card}>
        <InfoRow icon="mail-outline" label="Email" value={(user === null || user === void 0 ? void 0 : user.email) || '—'}/>
        <react_native_1.View style={styles.rowDivider}/>
        <InfoRow icon="shield-checkmark-outline" label="Role" value={(user === null || user === void 0 ? void 0 : user.role) || 'owner'}/>
        <react_native_1.View style={styles.rowDivider}/>
        <InfoRow icon="key-outline" label="User ID" value={(user === null || user === void 0 ? void 0 : user.id) ? "".concat(user.id.slice(0, 8), "\u2026") : '—'} mono/>
      </react_native_1.View>

      {/* App info */}
      <react_native_1.Text style={styles.sectionLabel}>App</react_native_1.Text>
      <react_native_1.View style={styles.card}>
        <InfoRow icon="information-circle-outline" label="Version" value="1.0.0"/>
        <react_native_1.View style={styles.rowDivider}/>
        <InfoRow icon="server-outline" label="Environment" value="Production"/>
      </react_native_1.View>

      {/* Sign out */}
      <react_native_1.Text style={styles.sectionLabel}>Account Actions</react_native_1.Text>
      <react_native_1.TouchableOpacity style={styles.signOutBtn} onPress={handleLogout} activeOpacity={0.75}>
        <vector_icons_1.Ionicons name="log-out-outline" size={20} color={theme_1.Colors.error}/>
        <react_native_1.Text style={styles.signOutText}>Sign Out</react_native_1.Text>
      </react_native_1.TouchableOpacity>
    </react_native_1.ScrollView>);
}
function InfoRow(_a) {
    var icon = _a.icon, label = _a.label, value = _a.value, mono = _a.mono;
    return (<react_native_1.View style={styles.infoRow}>
      <react_native_1.View style={styles.infoLeft}>
        <vector_icons_1.Ionicons name={icon} size={18} color={theme_1.Colors.textMuted}/>
        <react_native_1.Text style={styles.infoLabel}>{label}</react_native_1.Text>
      </react_native_1.View>
      <react_native_1.Text style={[styles.infoValue, mono && styles.mono]} numberOfLines={1}>{value}</react_native_1.Text>
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: theme_1.Colors.background },
    content: { padding: 16, paddingBottom: 48 },
    heroCard: {
        backgroundColor: theme_1.Colors.primary, borderRadius: theme_1.Radius.xl,
        alignItems: 'center', paddingVertical: 32, marginBottom: 24,
    },
    avatar: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
        marginBottom: 12,
    },
    avatarText: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
    emailText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
    memberText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
    sectionLabel: {
        fontSize: 12, fontWeight: '600', color: theme_1.Colors.textMuted,
        textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4,
    },
    card: __assign(__assign({ backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.lg, marginBottom: 20 }, theme_1.Shadow.sm), { overflow: 'hidden' }),
    rowDivider: { height: 1, backgroundColor: theme_1.Colors.border, marginLeft: 16 },
    infoRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14,
    },
    infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    infoLabel: { fontSize: 14, color: theme_1.Colors.textPrimary, fontWeight: '500' },
    infoValue: { fontSize: 14, color: theme_1.Colors.textSecondary, maxWidth: '55%', textAlign: 'right' },
    mono: { fontFamily: 'monospace', fontSize: 12 },
    signOutBtn: __assign({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.lg, paddingVertical: 16, borderWidth: 1.5, borderColor: theme_1.Colors.error }, theme_1.Shadow.sm),
    signOutText: { fontSize: 15, fontWeight: '600', color: theme_1.Colors.error },
});
