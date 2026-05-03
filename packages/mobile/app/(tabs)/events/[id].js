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
exports.default = EventDetailScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var vector_icons_1 = require("@expo/vector-icons");
var supabase_1 = require("@/lib/supabase");
var theme_1 = require("@/lib/theme");
var EST_STATUS_META = {
    draft: { bg: '#F3F4F6', text: '#6B7280' },
    sent: { bg: '#DBEAFE', text: '#1E40AF' },
    viewed: { bg: '#EDE9FE', text: '#5B21B6' },
    approved: { bg: '#D1FAE5', text: '#065F46' },
    rejected: { bg: '#FEE2E2', text: '#991B1B' },
    expired: { bg: '#FEF3C7', text: '#92400E' },
    converted: { bg: '#D1FAE5', text: '#065F46' },
};
var statusMeta = {
    scheduled: { bg: '#DBEAFE', text: '#1E40AF' },
    confirmed: { bg: '#D1FAE5', text: '#065F46' },
    completed: { bg: '#F3F4F6', text: '#6B7280' },
    cancelled: { bg: '#FEE2E2', text: '#991B1B' },
    draft: { bg: '#F3F4F6', text: '#6B7280' },
};
var formatTime = function (t) {
    if (!t)
        return '';
    var _a = t.split(':').map(Number), h = _a[0], m = _a[1];
    return "".concat(h % 12 || 12, ":").concat(String(m).padStart(2, '0'), " ").concat(h >= 12 ? 'PM' : 'AM');
};
var formatCurrency = function (n) {
    return n != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n) : '—';
};
var formatEventType = function (type) {
    return type ? type.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }) : '';
};
function EventDetailScreen() {
    var _this = this;
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    var id = (0, expo_router_1.useLocalSearchParams)().id;
    var router = (0, expo_router_1.useRouter)();
    var _k = (0, react_1.useState)(null), event = _k[0], setEvent = _k[1];
    var _l = (0, react_1.useState)([]), invoices = _l[0], setInvoices = _l[1];
    var _m = (0, react_1.useState)([]), estimates = _m[0], setEstimates = _m[1];
    var _o = (0, react_1.useState)(true), loading = _o[0], setLoading = _o[1];
    var _p = (0, react_1.useState)(false), deleting = _p[0], setDeleting = _p[1];
    (0, expo_router_1.useFocusEffect)((0, react_1.useCallback)(function () {
        if (id)
            loadData();
    }, [id]));
    var loadData = function () { return __awaiter(_this, void 0, void 0, function () {
        var user, _a, eventRes, invoiceRes, estimateRes, eventData_1, bookingData_1, allInvoices, matched, allEstimates, matchedEstimates, err_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 4, 5, 6]);
                    return [4 /*yield*/, supabase_1.supabase.auth.getUser()];
                case 1:
                    user = (_b.sent()).data.user;
                    if (!user)
                        return [2 /*return*/];
                    return [4 /*yield*/, Promise.all([
                            supabase_1.supabase
                                .from('event')
                                .select("\n            id, name, date, start_time, end_time, venue, location,\n            status, intake_form_id,\n            intake_form:intake_forms!intake_form_id(\n              id, event_type, event_name, contact_name, contact_email, contact_phone,\n              guest_count, status\n            )\n          ")
                                .eq('id', id)
                                .eq('owner_id', user.id)
                                .single(),
                            supabase_1.supabase
                                .from('invoices')
                                .select('id, status, total_amount, amount_due, amount_paid, intake_form_id, booking_id, event_id')
                                .eq('owner_id', user.id),
                            supabase_1.supabase
                                .from('estimates')
                                .select('id, estimate_number, status, total_amount, expiration_date, intake_form_id')
                                .eq('owner_id', user.id),
                        ])];
                case 2:
                    _a = _b.sent(), eventRes = _a[0], invoiceRes = _a[1], estimateRes = _a[2];
                    if (eventRes.error)
                        throw eventRes.error;
                    eventData_1 = eventRes.data;
                    return [4 /*yield*/, supabase_1.supabase
                            .from('booking')
                            .select('id, client_status, total_amount, deposit_amount')
                            .eq('event_id', id)
                            .maybeSingle()];
                case 3:
                    bookingData_1 = (_b.sent()).data;
                    if (bookingData_1) {
                        eventData_1.booking = bookingData_1;
                    }
                    setEvent(eventData_1);
                    allInvoices = invoiceRes.data || [];
                    matched = allInvoices.filter(function (inv) {
                        return inv.event_id === id ||
                            ((bookingData_1 === null || bookingData_1 === void 0 ? void 0 : bookingData_1.id) && inv.booking_id === bookingData_1.id) ||
                            (eventData_1.intake_form_id && inv.intake_form_id === eventData_1.intake_form_id);
                    });
                    setInvoices(matched);
                    allEstimates = estimateRes.data || [];
                    matchedEstimates = allEstimates.filter(function (est) {
                        return eventData_1.intake_form_id && est.intake_form_id === eventData_1.intake_form_id;
                    });
                    setEstimates(matchedEstimates);
                    return [3 /*break*/, 6];
                case 4:
                    err_1 = _b.sent();
                    console.error('Error loading event:', err_1.message);
                    return [3 /*break*/, 6];
                case 5:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var handleDelete = function () {
        react_native_1.Alert.alert('Delete Event', 'Are you sure you want to delete this event? This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: function () { return __awaiter(_this, void 0, void 0, function () {
                    var error, err_2;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                setDeleting(true);
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 3, , 4]);
                                return [4 /*yield*/, supabase_1.supabase.from('event').delete().eq('id', id)];
                            case 2:
                                error = (_a.sent()).error;
                                if (error)
                                    throw error;
                                router.back();
                                return [3 /*break*/, 4];
                            case 3:
                                err_2 = _a.sent();
                                react_native_1.Alert.alert('Error', err_2.message);
                                setDeleting(false);
                                return [3 /*break*/, 4];
                            case 4: return [2 /*return*/];
                        }
                    });
                }); },
            },
        ]);
    };
    if (loading) {
        return (<>
        <expo_router_1.Stack.Screen options={{ title: 'Event' }}/>
        <react_native_1.View style={styles.centered}><react_native_1.ActivityIndicator size="large" color={theme_1.Colors.primary}/></react_native_1.View>
      </>);
    }
    if (!event) {
        return (<>
        <expo_router_1.Stack.Screen options={{ title: 'Event' }}/>
        <react_native_1.View style={styles.centered}>
          <react_native_1.Text style={styles.errorText}>Event not found</react_native_1.Text>
        </react_native_1.View>
      </>);
    }
    var clientName = (_a = event.intake_form) === null || _a === void 0 ? void 0 : _a.contact_name;
    var eventName = ((_b = event.intake_form) === null || _b === void 0 ? void 0 : _b.event_name) || formatEventType((_c = event.intake_form) === null || _c === void 0 ? void 0 : _c.event_type) || event.name;
    var sm = statusMeta[event.status || ''] || statusMeta.draft;
    var dateObj = new Date(event.date + 'T00:00:00');
    var clientStatus = ((_d = event.booking) === null || _d === void 0 ? void 0 : _d.client_status) || ((_e = event.intake_form) === null || _e === void 0 ? void 0 : _e.status) || '';
    // ---- Progress bar computation ----
    var invoiceSent = invoices.some(function (i) { return ['sent', 'viewed', 'partial', 'paid', 'overdue'].includes(i.status); });
    var depositPaid = ['deposit_paid', 'booked', 'completed'].includes(clientStatus);
    var isComplete = clientStatus === 'completed';
    var hasEstimate = estimates.length > 0;
    var hasApprovedEstimate = estimates.some(function (e) { return ['approved', 'converted'].includes(e.status); });
    var steps = [
        { label: 'Intake', done: !!event.intake_form_id },
        { label: 'Estimate', done: hasEstimate },
        { label: 'Invoice', done: invoiceSent },
        { label: 'Deposit', done: depositPaid },
        { label: 'Complete', done: isComplete },
    ];
    var currentStep = steps.findIndex(function (s) { return !s.done; });
    var nextAction = (function () {
        if (!event.intake_form_id)
            return null;
        if (!hasEstimate)
            return { label: 'Create Estimate →', route: "/(tabs)/estimates/new?eventId=".concat(id) };
        if (!invoiceSent && hasApprovedEstimate)
            return { label: 'Create Invoice →', route: "/(tabs)/invoices/new?eventId=".concat(id) };
        return null;
    })();
    return (<>
      <expo_router_1.Stack.Screen options={{ title: clientName || eventName, headerBackTitle: 'Events' }}/>
      <react_native_1.ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Header card */}
        <react_native_1.View style={styles.headerCard}>
          {clientName && <react_native_1.Text style={styles.headerClient}>{clientName}</react_native_1.Text>}
          <react_native_1.Text style={styles.headerTitle}>{eventName}</react_native_1.Text>
          <react_native_1.View style={styles.headerRow}>
            <react_native_1.View style={[styles.statusPill, { backgroundColor: sm.bg }]}>
              <react_native_1.Text style={[styles.statusPillText, { color: sm.text }]}>
                {(event.status || 'scheduled').charAt(0).toUpperCase() + (event.status || 'scheduled').slice(1)}
              </react_native_1.Text>
            </react_native_1.View>
            {((_f = event.intake_form) === null || _f === void 0 ? void 0 : _f.event_type) && (<react_native_1.Text style={styles.headerType}>{formatEventType(event.intake_form.event_type)}</react_native_1.Text>)}
          </react_native_1.View>
        </react_native_1.View>

        {/* Progress Bar */}
        <react_native_1.View style={styles.section}>
          <react_native_1.Text style={styles.sectionLabel}>Booking Progress</react_native_1.Text>
          <react_native_1.View style={styles.progressCard}>
            <react_native_1.View style={styles.stepsRow}>
              {steps.map(function (step, i) {
            var isLast = i === steps.length - 1;
            var isCurrent = i === currentStep;
            return (<react_1.Fragment key={step.label}>
                    <react_native_1.View style={styles.stepItem}>
                      <react_native_1.View style={[
                    styles.stepDot,
                    step.done ? styles.stepDone : isCurrent ? styles.stepCurrent : styles.stepPending,
                ]}>
                        {step.done
                    ? <vector_icons_1.Ionicons name="checkmark" size={12} color="#FFF"/>
                    : <react_native_1.Text style={styles.stepNum}>{i + 1}</react_native_1.Text>}
                      </react_native_1.View>
                      <react_native_1.Text style={[
                    styles.stepLabel,
                    step.done ? styles.stepLabelDone : isCurrent ? styles.stepLabelCurrent : styles.stepLabelPending,
                ]}>
                        {step.label}
                      </react_native_1.Text>
                    </react_native_1.View>
                    {!isLast && (<react_native_1.View style={[styles.stepLine, step.done ? styles.stepLineDone : styles.stepLinePending]}/>)}
                  </react_1.Fragment>);
        })}
            </react_native_1.View>
            {nextAction && (<react_native_1.TouchableOpacity style={styles.nextActionBtn} onPress={function () { return router.push(nextAction.route); }}>
                <react_native_1.Text style={styles.nextActionText}>{nextAction.label}</react_native_1.Text>
              </react_native_1.TouchableOpacity>)}
            {isComplete && (<react_native_1.View style={styles.completeBadge}>
                <vector_icons_1.Ionicons name="checkmark-circle" size={16} color={theme_1.Colors.success}/>
                <react_native_1.Text style={styles.completeText}>Event Completed!</react_native_1.Text>
              </react_native_1.View>)}
          </react_native_1.View>
        </react_native_1.View>

        {/* Event Details */}
        <react_native_1.View style={styles.section}>
          <react_native_1.Text style={styles.sectionLabel}>Event Details</react_native_1.Text>
          <react_native_1.View style={styles.infoCard}>
            <InfoRow icon="calendar-outline" label="Date" value={dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}/>
            {(event.start_time || event.end_time) && (<InfoRow icon="time-outline" label="Time" value={[formatTime(event.start_time), formatTime(event.end_time)].filter(Boolean).join(' – ')}/>)}
            {event.venue && (<InfoRow icon="business-outline" label="Venue" value={event.venue}/>)}
            {event.location && (<InfoRow icon="location-outline" label="Address" value={event.location}/>)}
            {((_g = event.intake_form) === null || _g === void 0 ? void 0 : _g.guest_count) && (<InfoRow icon="people-outline" label="Guest Count" value={String(event.intake_form.guest_count)}/>)}
          </react_native_1.View>
        </react_native_1.View>

        {/* Client Info */}
        {event.intake_form && (<react_native_1.View style={styles.section}>
            <react_native_1.Text style={styles.sectionLabel}>Client Info</react_native_1.Text>
            <react_native_1.View style={styles.infoCard}>
              {event.intake_form.contact_name && (<InfoRow icon="person-outline" label="Name" value={event.intake_form.contact_name}/>)}
              {event.intake_form.contact_email && (<InfoRow icon="mail-outline" label="Email" value={event.intake_form.contact_email}/>)}
              {event.intake_form.contact_phone && (<InfoRow icon="call-outline" label="Phone" value={event.intake_form.contact_phone}/>)}
              {event.intake_form.guest_count && (<InfoRow icon="people-outline" label="Expected Guests" value={String(event.intake_form.guest_count)}/>)}

            </react_native_1.View>
          </react_native_1.View>)}

        {/* Estimates */}
        <react_native_1.View style={styles.section}>
          <react_native_1.View style={styles.sectionHeaderRow}>
            <react_native_1.Text style={styles.sectionLabel}>Estimates</react_native_1.Text>
            <react_native_1.TouchableOpacity onPress={function () { return router.push("/(tabs)/estimates/new?eventId=".concat(id)); }}>
              <react_native_1.Text style={styles.sectionLink}>+ New</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>
          {estimates.length === 0 ? (<react_native_1.TouchableOpacity style={styles.createEstimateCard} onPress={function () { return router.push("/(tabs)/estimates/new?eventId=".concat(id)); }}>
              <react_native_1.View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
                <vector_icons_1.Ionicons name="document-text-outline" size={20} color="#F59E0B"/>
              </react_native_1.View>
              <react_native_1.Text style={styles.createEstimateText}>Create Estimate</react_native_1.Text>
              <vector_icons_1.Ionicons name="chevron-forward" size={16} color={theme_1.Colors.primary}/>
            </react_native_1.TouchableOpacity>) : (<react_native_1.View style={styles.actionsCard}>
              {estimates.map(function (est, idx) {
                var sm = EST_STATUS_META[est.status] || EST_STATUS_META.draft;
                return (<react_1.Fragment key={est.id}>
                    {idx > 0 && <react_native_1.View style={styles.rowDivider}/>}
                    <react_native_1.TouchableOpacity style={styles.actionRow} onPress={function () { return router.push("/(tabs)/estimates/".concat(est.id)); }}>
                      <react_native_1.View style={styles.actionLeft}>
                        <react_native_1.View style={[styles.actionIcon, { backgroundColor: sm.bg }]}>
                          <vector_icons_1.Ionicons name="document-text-outline" size={20} color={sm.text}/>
                        </react_native_1.View>
                        <react_native_1.View>
                          <react_native_1.Text style={styles.actionLabel}>{est.estimate_number}</react_native_1.Text>
                          <react_native_1.Text style={styles.estimateSubtitle}>
                            {formatCurrency(est.total_amount)} · {est.status.charAt(0).toUpperCase() + est.status.slice(1)}
                          </react_native_1.Text>
                        </react_native_1.View>
                      </react_native_1.View>
                      <vector_icons_1.Ionicons name="chevron-forward" size={16} color={theme_1.Colors.textMuted}/>
                    </react_native_1.TouchableOpacity>
                  </react_1.Fragment>);
            })}
            </react_native_1.View>)}
        </react_native_1.View>

        {/* Financial Summary */}
        {(event.booking || invoices.length > 0) && (<react_native_1.View style={styles.section}>
            <react_native_1.Text style={styles.sectionLabel}>Financials</react_native_1.Text>
            <react_native_1.View style={styles.infoCard}>
              {((_h = event.booking) === null || _h === void 0 ? void 0 : _h.total_amount) != null && (<InfoRow icon="receipt-outline" label="Contract Amount" value={formatCurrency(event.booking.total_amount)}/>)}
              {((_j = event.booking) === null || _j === void 0 ? void 0 : _j.deposit_amount) != null && (<InfoRow icon="card-outline" label="Deposit Amount" value={formatCurrency(event.booking.deposit_amount)}/>)}
              {invoices.map(function (inv, idx) { return (<InfoRow key={inv.id} icon="document-text-outline" label={"Invoice ".concat(invoices.length > 1 ? idx + 1 : '')} value={"".concat(formatCurrency(inv.total_amount), " \u2014 ").concat(inv.status.charAt(0).toUpperCase() + inv.status.slice(1))}/>); })}
            </react_native_1.View>
          </react_native_1.View>)}

        {/* Actions */}
        <react_native_1.View style={styles.section}>
          <react_native_1.Text style={styles.sectionLabel}>Actions</react_native_1.Text>
          <react_native_1.View style={styles.actionsCard}>
            <react_native_1.TouchableOpacity style={styles.actionRow} onPress={function () { return router.push("/(tabs)/estimates/new?eventId=".concat(id)); }}>
              <react_native_1.View style={styles.actionLeft}>
                <react_native_1.View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
                  <vector_icons_1.Ionicons name="document-text-outline" size={20} color="#F59E0B"/>
                </react_native_1.View>
                <react_native_1.Text style={styles.actionLabel}>New Estimate</react_native_1.Text>
              </react_native_1.View>
              <vector_icons_1.Ionicons name="chevron-forward" size={16} color={theme_1.Colors.textMuted}/>
            </react_native_1.TouchableOpacity>
            <react_native_1.View style={styles.rowDivider}/>
            <react_native_1.TouchableOpacity style={styles.actionRow} onPress={function () { return router.push("/(tabs)/invoices/new?eventId=".concat(id)); }}>
              <react_native_1.View style={styles.actionLeft}>
                <react_native_1.View style={[styles.actionIcon, { backgroundColor: theme_1.Colors.infoLight }]}>
                  <vector_icons_1.Ionicons name="receipt-outline" size={20} color={theme_1.Colors.info}/>
                </react_native_1.View>
                <react_native_1.Text style={styles.actionLabel}>New Invoice</react_native_1.Text>
              </react_native_1.View>
              <vector_icons_1.Ionicons name="chevron-forward" size={16} color={theme_1.Colors.textMuted}/>
            </react_native_1.TouchableOpacity>
            <react_native_1.View style={styles.rowDivider}/>
            <react_native_1.TouchableOpacity style={styles.actionRow} onPress={function () { return router.push('/(tabs)/clients'); }}>
              <react_native_1.View style={styles.actionLeft}>
                <react_native_1.View style={[styles.actionIcon, { backgroundColor: theme_1.Colors.purpleLight }]}>
                  <vector_icons_1.Ionicons name="people-outline" size={20} color={theme_1.Colors.purple}/>
                </react_native_1.View>
                <react_native_1.Text style={styles.actionLabel}>View Client Intake</react_native_1.Text>
              </react_native_1.View>
              <vector_icons_1.Ionicons name="chevron-forward" size={16} color={theme_1.Colors.textMuted}/>
            </react_native_1.TouchableOpacity>
            <react_native_1.View style={styles.rowDivider}/>
            <react_native_1.TouchableOpacity style={styles.actionRow} onPress={handleDelete} disabled={deleting}>
              <react_native_1.View style={styles.actionLeft}>
                <react_native_1.View style={[styles.actionIcon, { backgroundColor: theme_1.Colors.errorLight }]}>
                  <vector_icons_1.Ionicons name="trash-outline" size={20} color={theme_1.Colors.error}/>
                </react_native_1.View>
                <react_native_1.Text style={[styles.actionLabel, { color: theme_1.Colors.error }]}>
                  {deleting ? 'Deleting…' : 'Delete Event'}
                </react_native_1.Text>
              </react_native_1.View>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>
        </react_native_1.View>

      </react_native_1.ScrollView>
    </>);
}
function InfoRow(_a) {
    var icon = _a.icon, label = _a.label, value = _a.value;
    return (<react_native_1.View style={styles.infoRow}>
      <react_native_1.View style={styles.infoRowLeft}>
        <vector_icons_1.Ionicons name={icon} size={16} color={theme_1.Colors.textMuted}/>
        <react_native_1.Text style={styles.infoLabel}>{label}</react_native_1.Text>
      </react_native_1.View>
      <react_native_1.Text style={styles.infoValue} numberOfLines={2}>{value}</react_native_1.Text>
    </react_native_1.View>);
}
var styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: theme_1.Colors.background },
    content: { padding: 16, paddingBottom: 48 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme_1.Colors.background },
    errorText: { fontSize: 16, color: theme_1.Colors.textSecondary },
    headerCard: __assign({ backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.xl, padding: 20, marginBottom: 16 }, theme_1.Shadow.md),
    headerClient: { fontSize: 12, fontWeight: '600', color: theme_1.Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: theme_1.Colors.textPrimary, marginBottom: 10 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme_1.Radius.full },
    statusPillText: { fontSize: 12, fontWeight: '600' },
    headerType: { fontSize: 13, color: theme_1.Colors.textSecondary, fontWeight: '500' },
    section: { marginBottom: 16 },
    sectionLabel: {
        fontSize: 11, fontWeight: '700', color: theme_1.Colors.textMuted,
        textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 2,
    },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    sectionLink: { fontSize: 13, color: theme_1.Colors.primary, fontWeight: '600' },
    createEstimateCard: __assign({ backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }, theme_1.Shadow.sm),
    createEstimateText: { flex: 1, fontSize: 15, fontWeight: '600', color: theme_1.Colors.primary },
    estimateSubtitle: { fontSize: 12, color: theme_1.Colors.textMuted, marginTop: 1 },
    // Progress bar
    progressCard: __assign({ backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.lg, padding: 18 }, theme_1.Shadow.sm),
    stepsRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' },
    stepItem: { alignItems: 'center', width: 56 },
    stepDot: {
        width: 30, height: 30, borderRadius: 15,
        justifyContent: 'center', alignItems: 'center', marginBottom: 6,
    },
    stepDone: { backgroundColor: theme_1.Colors.success },
    stepCurrent: { backgroundColor: theme_1.Colors.primary },
    stepPending: { backgroundColor: theme_1.Colors.border },
    stepNum: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
    stepLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center', lineHeight: 13 },
    stepLabelDone: { color: theme_1.Colors.success },
    stepLabelCurrent: { color: theme_1.Colors.primary },
    stepLabelPending: { color: theme_1.Colors.textMuted },
    stepLine: { flex: 1, height: 3, borderRadius: 2, marginTop: 13, marginHorizontal: 2 },
    stepLineDone: { backgroundColor: theme_1.Colors.success },
    stepLinePending: { backgroundColor: theme_1.Colors.border },
    nextActionBtn: {
        marginTop: 16, backgroundColor: theme_1.Colors.primary, borderRadius: theme_1.Radius.lg,
        paddingVertical: 11, alignItems: 'center',
    },
    nextActionText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
    completeBadge: {
        marginTop: 14, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 6,
    },
    completeText: { fontSize: 14, fontWeight: '600', color: theme_1.Colors.success },
    // Info card
    infoCard: __assign({ backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.lg, overflow: 'hidden' }, theme_1.Shadow.sm),
    infoRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: theme_1.Colors.border,
    },
    infoRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoLabel: { fontSize: 13, color: theme_1.Colors.textSecondary, fontWeight: '500' },
    infoValue: { fontSize: 13, fontWeight: '600', color: theme_1.Colors.textPrimary, maxWidth: '55%', textAlign: 'right' },
    // Actions card
    actionsCard: __assign({ backgroundColor: theme_1.Colors.surface, borderRadius: theme_1.Radius.lg, overflow: 'hidden' }, theme_1.Shadow.sm),
    actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
    actionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    actionIcon: { width: 36, height: 36, borderRadius: theme_1.Radius.md, justifyContent: 'center', alignItems: 'center' },
    actionLabel: { fontSize: 15, fontWeight: '600', color: theme_1.Colors.textPrimary },
    rowDivider: { height: 1, backgroundColor: theme_1.Colors.border, marginLeft: 16 },
});
