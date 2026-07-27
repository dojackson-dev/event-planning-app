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
exports.default = SendMessageScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var vector_icons_1 = require("@expo/vector-icons");
var supabase_1 = require("@/lib/supabase");
var api_1 = require("@/lib/api");
var theme_1 = require("@/lib/theme");
var MESSAGE_TYPES = [
    { value: 'confirmation', label: 'Booking Confirmation', icon: 'checkmark-circle-outline', template: 'Your booking has been confirmed! We look forward to serving you.' },
    { value: 'reminder', label: 'Event Reminder', icon: 'alarm-outline', template: 'This is a friendly reminder about your upcoming event. Please let us know if you have any questions.' },
    { value: 'invoice', label: 'Invoice Notice', icon: 'receipt-outline', template: 'Your invoice is ready. Please review and let us know if you have any questions about the charges.' },
    { value: 'update', label: 'Event Update', icon: 'information-circle-outline', template: 'We have an update regarding your event. Please contact us at your earliest convenience.' },
    { value: 'custom', label: 'Custom Message', icon: 'chatbubble-ellipses-outline', template: '' },
];
function SendMessageScreen() {
    var _this = this;
    var router = (0, expo_router_1.useRouter)();
    var _a = (0, react_1.useState)([]), events = _a[0], setEvents = _a[1];
    var _b = (0, react_1.useState)(''), selectedEventId = _b[0], setSelectedEventId = _b[1];
    var _c = (0, react_1.useState)(''), recipientPhone = _c[0], setRecipientPhone = _c[1];
    var _d = (0, react_1.useState)('custom'), selectedType = _d[0], setSelectedType = _d[1];
    var _e = (0, react_1.useState)(''), content = _e[0], setContent = _e[1];
    var _f = (0, react_1.useState)(false), sending = _f[0], setSending = _f[1];
    var _g = (0, react_1.useState)(false), showEventPicker = _g[0], setShowEventPicker = _g[1];
    (0, react_1.useEffect)(function () { loadEvents(); }, []);
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
        var _a;
        setSelectedEventId(ev.id);
        setRecipientPhone(((_a = ev.intake_form) === null || _a === void 0 ? void 0 : _a.contact_phone) || '');
        setShowEventPicker(false);
    };
    var selectType = function (value) {
        var _a;
        setSelectedType(value);
        var template = ((_a = MESSAGE_TYPES.find(function (t) { return t.value === value; })) === null || _a === void 0 ? void 0 : _a.template) || '';
        if (template && content.trim() === '')
            setContent(template);
        else if (template) {
            react_native_1.Alert.alert('Use Template?', 'Replace current message with template?', [
                { text: 'Keep Current', style: 'cancel' },
                { text: 'Use Template', onPress: function () { return setContent(template); } },
            ]);
        }
    };
    var handleSend = function () { return __awaiter(_this, void 0, void 0, function () {
        var user, selectedEvent, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!recipientPhone.trim()) {
                        react_native_1.Alert.alert('Validation', 'Please enter a recipient phone number.');
                        return [2 /*return*/];
                    }
                    if (!content.trim()) {
                        react_native_1.Alert.alert('Validation', 'Please enter a message.');
                        return [2 /*return*/];
                    }
                    setSending(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, supabase_1.supabase.auth.getUser()];
                case 2:
                    user = (_a.sent()).data.user;
                    if (!user)
                        throw new Error('Not authenticated');
                    selectedEvent = events.find(function (e) { return e.id === selectedEventId; });
                    return [4 /*yield*/, (0, api_1.apiRequest)('/messages/send', {
                            method: 'POST',
                            body: {
                                recipientType: 'client',
                                messageType: selectedType,
                                userId: user.id,
                                eventId: selectedEventId || undefined,
                                recipientPhone: recipientPhone.trim(),
                                content: content.trim(),
                            },
                        })];
                case 3:
                    _a.sent();
                    react_native_1.Alert.alert('Message Sent!', "Message delivered to ".concat(recipientPhone), [
                        { text: 'Send Another', onPress: function () { setContent(''); setRecipientPhone(''); setSelectedEventId(''); } },
                        { text: 'Done', onPress: function () { return router.back(); } },
                    ]);
                    return [3 /*break*/, 6];
                case 4:
                    err_1 = _a.sent();
                    react_native_1.Alert.alert('Error', err_1.message || 'Failed to send message');
                    return [3 /*break*/, 6];
                case 5:
                    setSending(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var selectedEventLabel = (function () {
        var _a;
        var ev = events.find(function (e) { return e.id === selectedEventId; });
        if (!ev)
            return '';
        return "".concat(((_a = ev.intake_form) === null || _a === void 0 ? void 0 : _a.event_name) || ev.name, " \u2014 ").concat(new Date(ev.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
    })();
    return (<react_native_1.ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Event selector */}
      <react_native_1.View style={styles.section}>
        <react_native_1.Text style={styles.sectionLabel}>Event (Optional)</react_native_1.Text>
        <react_native_1.TouchableOpacity style={styles.selectBox} onPress={function () { return setShowEventPicker(function (v) { return !v; }); }}>
          <react_native_1.Text style={[styles.selectText, !selectedEventId && styles.placeholder]}>
            {selectedEventId ? selectedEventLabel : 'Select event to auto-fill phone'}
          </react_native_1.Text>
          <vector_icons_1.Ionicons name={showEventPicker ? 'chevron-up' : 'chevron-down'} size={16} color={theme_1.Colors.textMuted}/>
        </react_native_1.TouchableOpacity>
        {showEventPicker && (<react_native_1.View style={styles.dropdown}>
            <react_native_1.TouchableOpacity style={styles.dropdownItem} onPress={function () { setSelectedEventId(''); setRecipientPhone(''); setShowEventPicker(false); }}>
              <react_native_1.Text style={styles.dropdownText}>— None —</react_native_1.Text>
            </react_native_1.TouchableOpacity>
            {events.map(function (ev) {
                var _a, _b;
                return (<react_native_1.TouchableOpacity key={ev.id} style={styles.dropdownItem} onPress={function () { return selectEvent(ev); }}>
                <react_native_1.Text style={styles.dropdownText} numberOfLines={1}>{((_a = ev.intake_form) === null || _a === void 0 ? void 0 : _a.event_name) || ev.name}</react_native_1.Text>
                {((_b = ev.intake_form) === null || _b === void 0 ? void 0 : _b.contact_name) && <react_native_1.Text style={styles.dropdownSub}>{ev.intake_form.contact_name} · {ev.intake_form.contact_phone || 'No phone'}</react_native_1.Text>}
              </react_native_1.TouchableOpacity>);
            })}
          </react_native_1.View>)}
      </react_native_1.View>

      {/* Recipient phone */}
      <react_native_1.View style={styles.section}>
        <react_native_1.Text style={styles.sectionLabel}>Recipient Phone *</react_native_1.Text>
        <react_native_1.TextInput style={styles.input} value={recipientPhone} onChangeText={setRecipientPhone} placeholder="+1 (555) 000-0000" placeholderTextColor={theme_1.Colors.textMuted} keyboardType="phone-pad"/>
      </react_native_1.View>

      {/* Message type */}
      <react_native_1.View style={styles.section}>
        <react_native_1.Text style={styles.sectionLabel}>Message Type</react_native_1.Text>
        <react_native_1.View style={styles.typeGrid}>
          {MESSAGE_TYPES.map(function (type) { return (<react_native_1.TouchableOpacity key={type.value} style={[styles.typeBtn, selectedType === type.value && styles.typeBtnSelected]} onPress={function () { return selectType(type.value); }}>
              <vector_icons_1.Ionicons name={type.icon} size={20} color={selectedType === type.value ? theme_1.Colors.primary : theme_1.Colors.textMuted}/>
              <react_native_1.Text style={[styles.typeBtnText, selectedType === type.value && styles.typeBtnTextSelected]} numberOfLines={2}>
                {type.label}
              </react_native_1.Text>
            </react_native_1.TouchableOpacity>); })}
        </react_native_1.View>
      </react_native_1.View>

      {/* Message content */}
      <react_native_1.View style={styles.section}>
        <react_native_1.Text style={styles.sectionLabel}>Message *</react_native_1.Text>
        <react_native_1.TextInput style={[styles.input, styles.messageInput]} value={content} onChangeText={setContent} placeholder="Type your message here..." placeholderTextColor={theme_1.Colors.textMuted} multiline numberOfLines={5}/>
        <react_native_1.Text style={styles.charCount}>{content.length} characters</react_native_1.Text>
      </react_native_1.View>

      <react_native_1.TouchableOpacity style={[styles.sendBtn, sending && styles.sendBtnDisabled]} onPress={handleSend} disabled={sending}>
        {sending ? <react_native_1.ActivityIndicator color="#FFF" size="small"/> : (<><vector_icons_1.Ionicons name="send" size={18} color="#FFF"/><react_native_1.Text style={styles.sendBtnText}>Send Message</react_native_1.Text></>)}
      </react_native_1.TouchableOpacity>
    </react_native_1.ScrollView>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: theme_1.Colors.background },
    content: { padding: 16, paddingBottom: 40 },
    section: { marginBottom: 20 },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: theme_1.Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    selectBox: { backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.md, padding: 14, borderWidth: 1, borderColor: theme_1.Colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    selectText: { fontSize: 15, color: theme_1.Colors.textPrimary, flex: 1 },
    placeholder: { color: theme_1.Colors.textMuted },
    dropdown: __assign({ backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.md, marginTop: 4, borderWidth: 1, borderColor: theme_1.Colors.border, maxHeight: 220 }, theme_1.Shadow.md),
    dropdownItem: { padding: 12, borderBottomWidth: react_native_1.StyleSheet.hairlineWidth, borderBottomColor: theme_1.Colors.border },
    dropdownText: { fontSize: 14, color: theme_1.Colors.textPrimary },
    dropdownSub: { fontSize: 12, color: theme_1.Colors.textMuted, marginTop: 2 },
    input: { backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.md, padding: 12, borderWidth: 1, borderColor: theme_1.Colors.border, fontSize: 15, color: theme_1.Colors.textPrimary },
    messageInput: { height: 120, textAlignVertical: 'top' },
    charCount: { fontSize: 12, color: theme_1.Colors.textMuted, textAlign: 'right', marginTop: 4 },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    typeBtn: { width: '47%', backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.md, padding: 12, borderWidth: 1, borderColor: theme_1.Colors.border, alignItems: 'center', gap: 6 },
    typeBtnSelected: { borderColor: theme_1.Colors.primary, backgroundColor: theme_1.Colors.primary + '10' },
    typeBtnText: { fontSize: 12, color: theme_1.Colors.textMuted, textAlign: 'center', fontWeight: '500' },
    typeBtnTextSelected: { color: theme_1.Colors.primary, fontWeight: '700' },
    sendBtn: { backgroundColor: theme_1.Colors.primary, borderRadius: theme_1.Radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    sendBtnDisabled: { opacity: 0.6 },
    sendBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
