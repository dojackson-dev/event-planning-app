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
exports.default = CalendarScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var vector_icons_1 = require("@expo/vector-icons");
var supabase_1 = require("@/lib/supabase");
var theme_1 = require("@/lib/theme");
var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
var statusColors = {
    scheduled: theme_1.Colors.primary,
    confirmed: '#10B981',
    completed: '#9CA3AF',
    cancelled: '#EF4444',
    draft: '#9CA3AF',
};
var formatEventType = function (type) {
    return type ? type.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }) : '';
};
var formatTime = function (t) {
    if (!t)
        return '';
    var _a = t.split(':').map(Number), h = _a[0], m = _a[1];
    return "".concat(h % 12 || 12, ":").concat(String(m).padStart(2, '0'), " ").concat(h >= 12 ? 'PM' : 'AM');
};
function CalendarScreen() {
    var _this = this;
    var router = (0, expo_router_1.useRouter)();
    var today = new Date();
    var _a = (0, react_1.useState)(today.getFullYear()), year = _a[0], setYear = _a[1];
    var _b = (0, react_1.useState)(today.getMonth()), month = _b[0], setMonth = _b[1];
    var _c = (0, react_1.useState)([]), events = _c[0], setEvents = _c[1];
    var _d = (0, react_1.useState)(true), loading = _d[0], setLoading = _d[1];
    var _e = (0, react_1.useState)(null), selectedDay = _e[0], setSelectedDay = _e[1];
    var _f = (0, react_1.useState)(false), modalVisible = _f[0], setModalVisible = _f[1];
    (0, react_1.useEffect)(function () { loadEvents(); }, [year, month]);
    var loadEvents = function () { return __awaiter(_this, void 0, void 0, function () {
        var user, start, lastDay, end, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setLoading(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 4, 5]);
                    return [4 /*yield*/, supabase_1.supabase.auth.getUser()];
                case 2:
                    user = (_a.sent()).data.user;
                    if (!user)
                        return [2 /*return*/];
                    start = "".concat(year, "-").concat(String(month + 1).padStart(2, '0'), "-01");
                    lastDay = new Date(year, month + 1, 0).getDate();
                    end = "".concat(year, "-").concat(String(month + 1).padStart(2, '0'), "-").concat(String(lastDay).padStart(2, '0'));
                    return [4 /*yield*/, supabase_1.supabase
                            .from('event')
                            .select('id, name, date, status, venue, start_time, intake_form:intake_forms!intake_form_id(event_name, event_type)')
                            .eq('owner_id', user.id)
                            .gte('date', start)
                            .lte('date', end)
                            .order('date')];
                case 3:
                    data = (_a.sent()).data;
                    setEvents(data || []);
                    return [3 /*break*/, 5];
                case 4:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var prevMonth = function () {
        if (month === 0) {
            setMonth(11);
            setYear(function (y) { return y - 1; });
        }
        else
            setMonth(function (m) { return m - 1; });
        setSelectedDay(null);
    };
    var nextMonth = function () {
        if (month === 11) {
            setMonth(0);
            setYear(function (y) { return y + 1; });
        }
        else
            setMonth(function (m) { return m + 1; });
        setSelectedDay(null);
    };
    // Build calendar grid
    var firstDow = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var cells = __spreadArray(__spreadArray([], Array(firstDow).fill(null), true), Array.from({ length: daysInMonth }, function (_, i) { return i + 1; }), true);
    // pad to complete last row
    while (cells.length % 7 !== 0)
        cells.push(null);
    var eventsForDay = function (day) {
        return events.filter(function (e) {
            var d = new Date(e.date + 'T00:00:00');
            return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
        });
    };
    var selectedEvents = selectedDay ? eventsForDay(selectedDay) : [];
    var displayName = function (e) { var _a, _b; return ((_a = e.intake_form) === null || _a === void 0 ? void 0 : _a.event_name) || formatEventType((_b = e.intake_form) === null || _b === void 0 ? void 0 : _b.event_type) || e.name; };
    return (<react_native_1.View style={styles.container}>
      {/* Month header */}
      <react_native_1.View style={styles.header}>
        <react_native_1.TouchableOpacity onPress={prevMonth} style={styles.chevron}>
          <vector_icons_1.Ionicons name="chevron-back" size={22} color={theme_1.Colors.primary}/>
        </react_native_1.TouchableOpacity>
        <react_native_1.Text style={styles.monthTitle}>{MONTHS[month]} {year}</react_native_1.Text>
        <react_native_1.TouchableOpacity onPress={nextMonth} style={styles.chevron}>
          <vector_icons_1.Ionicons name="chevron-forward" size={22} color={theme_1.Colors.primary}/>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>

      {/* Day-of-week row */}
      <react_native_1.View style={styles.dowRow}>
        {DAYS.map(function (d) { return (<react_native_1.Text key={d} style={styles.dowText}>{d}</react_native_1.Text>); })}
      </react_native_1.View>

      {loading ? (<react_native_1.View style={styles.centered}><react_native_1.ActivityIndicator color={theme_1.Colors.primary} size="large"/></react_native_1.View>) : (<react_native_1.ScrollView contentContainerStyle={styles.gridScroll}>
          {/* Calendar grid */}
          <react_native_1.View style={styles.grid}>
            {cells.map(function (day, idx) {
                var isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                var isSelected = day === selectedDay;
                var dayEvents = day ? eventsForDay(day) : [];
                return (<react_native_1.TouchableOpacity key={idx} style={[
                        styles.cell,
                        isSelected && styles.cellSelected,
                    ]} onPress={function () {
                        if (!day)
                            return;
                        setSelectedDay(day);
                        if (eventsForDay(day).length > 0)
                            setModalVisible(true);
                    }} disabled={!day} activeOpacity={0.7}>
                  {day ? (<>
                      <react_native_1.View style={[styles.dayCircle, isToday && styles.todayCircle, isSelected && styles.selectedCircle]}>
                        <react_native_1.Text style={[styles.dayNum, isToday && styles.todayNum, isSelected && styles.selectedNum]}>
                          {day}
                        </react_native_1.Text>
                      </react_native_1.View>
                      <react_native_1.View style={styles.dotRow}>
                        {dayEvents.slice(0, 3).map(function (e, i) { return (<react_native_1.View key={i} style={[styles.dot, { backgroundColor: statusColors[e.status || ''] || theme_1.Colors.primary }]}/>); })}
                      </react_native_1.View>
                    </>) : null}
                </react_native_1.TouchableOpacity>);
            })}
          </react_native_1.View>

          {/* Month event list */}
          <react_native_1.View style={styles.eventList}>
            <react_native_1.Text style={styles.eventListTitle}>
              {events.length > 0 ? "".concat(events.length, " event").concat(events.length === 1 ? '' : 's', " this month") : 'No events this month'}
            </react_native_1.Text>
            {events.map(function (e) {
                var d = new Date(e.date + 'T00:00:00');
                var color = statusColors[e.status || ''] || theme_1.Colors.primary;
                return (<react_native_1.TouchableOpacity key={e.id} style={styles.eventRow} onPress={function () { return router.push("/(tabs)/events/".concat(e.id)); }} activeOpacity={0.75}>
                  <react_native_1.View style={[styles.eventColorBar, { backgroundColor: color }]}/>
                  <react_native_1.View style={styles.eventDateBox}>
                    <react_native_1.Text style={[styles.eventDay, { color: color }]}>{d.getDate()}</react_native_1.Text>
                    <react_native_1.Text style={styles.eventMon}>{MONTHS[d.getMonth()].slice(0, 3)}</react_native_1.Text>
                  </react_native_1.View>
                  <react_native_1.View style={styles.eventInfo}>
                    <react_native_1.Text style={styles.eventName} numberOfLines={1}>{displayName(e)}</react_native_1.Text>
                    <react_native_1.Text style={styles.eventMeta} numberOfLines={1}>
                      {e.start_time ? formatTime(e.start_time) : ''}
                      {e.venue ? "  \u00B7  ".concat(e.venue) : ''}
                    </react_native_1.Text>
                  </react_native_1.View>
                  <vector_icons_1.Ionicons name="chevron-forward" size={16} color={theme_1.Colors.textMuted}/>
                </react_native_1.TouchableOpacity>);
            })}
          </react_native_1.View>
        </react_native_1.ScrollView>)}

      {/* Day events modal */}
      <react_native_1.Modal visible={modalVisible} transparent animationType="slide" onRequestClose={function () { return setModalVisible(false); }}>
        <react_native_1.TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={function () { return setModalVisible(false); }}/>
        <react_native_1.View style={styles.sheet}>
          <react_native_1.View style={styles.sheetHandle}/>
          <react_native_1.Text style={styles.sheetTitle}>
            {MONTHS[month]} {selectedDay}, {year}
          </react_native_1.Text>
          <react_native_1.FlatList data={selectedEvents} keyExtractor={function (e) { return e.id; }} renderItem={function (_a) {
            var item = _a.item;
            var color = statusColors[item.status || ''] || theme_1.Colors.primary;
            return (<react_native_1.TouchableOpacity style={styles.sheetRow} onPress={function () {
                    setModalVisible(false);
                    router.push("/(tabs)/events/".concat(item.id));
                }}>
                  <react_native_1.View style={[styles.sheetDot, { backgroundColor: color }]}/>
                  <react_native_1.View style={{ flex: 1 }}>
                    <react_native_1.Text style={styles.sheetEventName}>{displayName(item)}</react_native_1.Text>
                    {item.start_time && (<react_native_1.Text style={styles.sheetEventMeta}>{formatTime(item.start_time)}</react_native_1.Text>)}
                  </react_native_1.View>
                  <vector_icons_1.Ionicons name="chevron-forward" size={16} color={theme_1.Colors.textMuted}/>
                </react_native_1.TouchableOpacity>);
        }}/>
        </react_native_1.View>
      </react_native_1.Modal>
    </react_native_1.View>);
}
var CELL_SIZE = 48;
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: theme_1.Colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14, backgroundColor: theme_1.Colors.surface,
        borderBottomWidth: 1, borderBottomColor: theme_1.Colors.border,
    },
    monthTitle: { fontSize: 18, fontWeight: '700', color: theme_1.Colors.textPrimary },
    chevron: { padding: 6 },
    dowRow: {
        flexDirection: 'row', backgroundColor: theme_1.Colors.surface,
        borderBottomWidth: 1, borderBottomColor: theme_1.Colors.border,
        paddingBottom: 8, paddingTop: 4,
    },
    dowText: {
        flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600',
        color: theme_1.Colors.textMuted, textTransform: 'uppercase',
    },
    gridScroll: { paddingBottom: 32 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: theme_1.Colors.surface },
    cell: {
        width: "".concat(100 / 7, "%"), height: CELL_SIZE, alignItems: 'center',
        justifyContent: 'flex-start', paddingTop: 4,
        borderBottomWidth: react_native_1.StyleSheet.hairlineWidth, borderBottomColor: theme_1.Colors.border,
        borderRightWidth: react_native_1.StyleSheet.hairlineWidth, borderRightColor: theme_1.Colors.border,
    },
    cellSelected: { backgroundColor: theme_1.Colors.primaryLight },
    dayCircle: {
        width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center',
    },
    todayCircle: { backgroundColor: theme_1.Colors.primary },
    selectedCircle: { backgroundColor: theme_1.Colors.primaryDark },
    dayNum: { fontSize: 13, fontWeight: '500', color: theme_1.Colors.textPrimary },
    todayNum: { color: '#FFFFFF', fontWeight: '700' },
    selectedNum: { color: '#FFFFFF', fontWeight: '700' },
    dotRow: { flexDirection: 'row', gap: 2, marginTop: 1 },
    dot: { width: 5, height: 5, borderRadius: 3 },
    eventList: { padding: 16 },
    eventListTitle: { fontSize: 13, fontWeight: '600', color: theme_1.Colors.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    eventRow: __assign(__assign({ flexDirection: 'row', alignItems: 'center', backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.md, marginBottom: 8, padding: 12 }, theme_1.Shadow.sm), { overflow: 'hidden' }),
    eventColorBar: { width: 3, height: '100%', borderRadius: 2, marginRight: 10, position: 'absolute', left: 0, top: 0, bottom: 0 },
    eventDateBox: { width: 38, alignItems: 'center', marginLeft: 8, marginRight: 10 },
    eventDay: { fontSize: 18, fontWeight: '700' },
    eventMon: { fontSize: 10, fontWeight: '600', color: theme_1.Colors.textMuted, textTransform: 'uppercase' },
    eventInfo: { flex: 1 },
    eventName: { fontSize: 14, fontWeight: '600', color: theme_1.Colors.textPrimary },
    eventMeta: { fontSize: 12, color: theme_1.Colors.textMuted, marginTop: 2 },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: {
        backgroundColor: theme_1.Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 20, maxHeight: '60%',
    },
    sheetHandle: {
        width: 36, height: 4, backgroundColor: theme_1.Colors.border, borderRadius: 2,
        alignSelf: 'center', marginBottom: 16,
    },
    sheetTitle: { fontSize: 17, fontWeight: '700', color: theme_1.Colors.textPrimary, marginBottom: 16 },
    sheetRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
        borderBottomWidth: react_native_1.StyleSheet.hairlineWidth, borderBottomColor: theme_1.Colors.border,
    },
    sheetDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
    sheetEventName: { fontSize: 15, fontWeight: '600', color: theme_1.Colors.textPrimary },
    sheetEventMeta: { fontSize: 13, color: theme_1.Colors.textMuted, marginTop: 2 },
});
