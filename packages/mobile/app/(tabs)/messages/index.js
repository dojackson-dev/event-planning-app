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
exports.default = MessagesIndexScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var vector_icons_1 = require("@expo/vector-icons");
var api_1 = require("@/lib/api");
var theme_1 = require("@/lib/theme");
var STATUS_COLORS = {
    sent: '#3B82F6',
    delivered: '#10B981',
    failed: '#EF4444',
    pending: '#F59E0B',
    queued: '#8B5CF6',
};
var TYPE_ICONS = {
    confirmation: 'checkmark-circle-outline',
    reminder: 'alarm-outline',
    invoice: 'receipt-outline',
    update: 'information-circle-outline',
    custom: 'chatbubble-ellipses-outline',
};
var formatDate = function (iso) {
    var d = new Date(iso);
    var now = new Date();
    var diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0)
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (diffDays === 1)
        return 'Yesterday';
    if (diffDays < 7)
        return d.toLocaleDateString('en-US', { weekday: 'short' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
function MessagesIndexScreen() {
    var _this = this;
    var _a, _b, _c, _d;
    var router = (0, expo_router_1.useRouter)();
    var _e = (0, react_1.useState)([]), messages = _e[0], setMessages = _e[1];
    var _f = (0, react_1.useState)(null), stats = _f[0], setStats = _f[1];
    var _g = (0, react_1.useState)(true), loading = _g[0], setLoading = _g[1];
    var _h = (0, react_1.useState)(false), refreshing = _h[0], setRefreshing = _h[1];
    var load = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var _a, msgs, st, err_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, 3, 4]);
                    return [4 /*yield*/, Promise.all([
                            (0, api_1.apiRequest)('/messages').catch(function () { return ({ messages: [] }); }),
                            (0, api_1.apiRequest)('/messages/stats').catch(function () { return null; }),
                        ])];
                case 1:
                    _a = _b.sent(), msgs = _a[0], st = _a[1];
                    setMessages(Array.isArray(msgs) ? msgs : (msgs.messages || []));
                    setStats(st);
                    return [3 /*break*/, 4];
                case 2:
                    err_1 = _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    setLoading(false);
                    setRefreshing(false);
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); }, []);
    (0, expo_router_1.useFocusEffect)((0, react_1.useCallback)(function () { load(); }, [load]));
    var onRefresh = function () { setRefreshing(true); load(); };
    var renderItem = function (_a) {
        var item = _a.item;
        var statusColor = STATUS_COLORS[item.status] || '#6B7280';
        var icon = (TYPE_ICONS[item.message_type] || 'chatbubble-outline');
        return (<react_native_1.View style={styles.messageCard}>
        <react_native_1.View style={styles.iconWrap}>
          <vector_icons_1.Ionicons name={icon} size={20} color={theme_1.Colors.primary}/>
        </react_native_1.View>
        <react_native_1.View style={styles.messageContent}>
          <react_native_1.View style={styles.messageTop}>
            <react_native_1.Text style={styles.messagePhone}>{item.recipient_phone}</react_native_1.Text>
            <react_native_1.Text style={styles.messageTime}>{formatDate(item.created_at)}</react_native_1.Text>
          </react_native_1.View>
          <react_native_1.Text style={styles.messageText} numberOfLines={2}>{item.content}</react_native_1.Text>
          <react_native_1.View style={styles.messageMeta}>
            <react_native_1.View style={[styles.statusDot, { backgroundColor: statusColor }]}/>
            <react_native_1.Text style={[styles.statusLabel, { color: statusColor }]}>{item.status}</react_native_1.Text>
            <react_native_1.Text style={styles.messageType}> · {item.message_type}</react_native_1.Text>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.View>);
    };
    if (loading) {
        return <react_native_1.View style={styles.center}><react_native_1.ActivityIndicator size="large" color={theme_1.Colors.primary}/></react_native_1.View>;
    }
    return (<react_native_1.View style={styles.container}>
      {/* Stats bar */}
      {stats && (<react_native_1.View style={styles.statsRow}>
          <react_native_1.View style={styles.statBox}>
            <react_native_1.Text style={styles.statNum}>{(_a = stats.total) !== null && _a !== void 0 ? _a : 0}</react_native_1.Text>
            <react_native_1.Text style={styles.statLabel}>Total</react_native_1.Text>
          </react_native_1.View>
          <react_native_1.View style={styles.statBox}>
            <react_native_1.Text style={[styles.statNum, { color: '#3B82F6' }]}>{(_b = stats.sent) !== null && _b !== void 0 ? _b : 0}</react_native_1.Text>
            <react_native_1.Text style={styles.statLabel}>Sent</react_native_1.Text>
          </react_native_1.View>
          <react_native_1.View style={styles.statBox}>
            <react_native_1.Text style={[styles.statNum, { color: '#10B981' }]}>{(_c = stats.delivered) !== null && _c !== void 0 ? _c : 0}</react_native_1.Text>
            <react_native_1.Text style={styles.statLabel}>Delivered</react_native_1.Text>
          </react_native_1.View>
          <react_native_1.View style={styles.statBox}>
            <react_native_1.Text style={[styles.statNum, { color: '#EF4444' }]}>{(_d = stats.failed) !== null && _d !== void 0 ? _d : 0}</react_native_1.Text>
            <react_native_1.Text style={styles.statLabel}>Failed</react_native_1.Text>
          </react_native_1.View>
        </react_native_1.View>)}

      <react_native_1.FlatList data={messages} keyExtractor={function (item) { return item.id; }} renderItem={renderItem} contentContainerStyle={styles.list} refreshControl={<react_native_1.RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme_1.Colors.primary}/>} ListEmptyComponent={<react_native_1.View style={styles.empty}>
            <vector_icons_1.Ionicons name="chatbubble-ellipses-outline" size={48} color={theme_1.Colors.textMuted}/>
            <react_native_1.Text style={styles.emptyTitle}>No messages yet</react_native_1.Text>
            <react_native_1.Text style={styles.emptySubtitle}>Send your first message to a client</react_native_1.Text>
          </react_native_1.View>}/>

      <react_native_1.TouchableOpacity style={styles.fab} onPress={function () { return router.push('/(tabs)/messages/send'); }}>
        <vector_icons_1.Ionicons name="send" size={20} color="#FFF"/>
        <react_native_1.Text style={styles.fabText}>Send Message</react_native_1.Text>
      </react_native_1.TouchableOpacity>
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: theme_1.Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    statsRow: { flexDirection: 'row', backgroundColor: theme_1.Colors.surface, padding: 16, borderBottomWidth: react_native_1.StyleSheet.hairlineWidth, borderBottomColor: theme_1.Colors.border },
    statBox: { flex: 1, alignItems: 'center' },
    statNum: { fontSize: 22, fontWeight: '800', color: theme_1.Colors.textPrimary },
    statLabel: { fontSize: 11, color: theme_1.Colors.textMuted, marginTop: 2 },
    list: { padding: 16, paddingBottom: 100 },
    messageCard: __assign({ backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.lg, padding: 14, marginBottom: 10, flexDirection: 'row', gap: 12 }, theme_1.Shadow.sm),
    iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme_1.Colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
    messageContent: { flex: 1 },
    messageTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    messagePhone: { fontSize: 15, fontWeight: '600', color: theme_1.Colors.textPrimary },
    messageTime: { fontSize: 12, color: theme_1.Colors.textMuted },
    messageText: { fontSize: 13, color: theme_1.Colors.textSecondary, lineHeight: 18, marginBottom: 6 },
    messageMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusLabel: { fontSize: 12, fontWeight: '600' },
    messageType: { fontSize: 12, color: theme_1.Colors.textMuted, textTransform: 'capitalize' },
    empty: { flex: 1, alignItems: 'center', paddingTop: 80, gap: 8 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: theme_1.Colors.textPrimary },
    emptySubtitle: { fontSize: 14, color: theme_1.Colors.textMuted, textAlign: 'center' },
    fab: __assign({ position: 'absolute', bottom: 24, right: 20, left: 20, backgroundColor: theme_1.Colors.primary, borderRadius: theme_1.Radius.lg, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, theme_1.Shadow.lg),
    fabText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
