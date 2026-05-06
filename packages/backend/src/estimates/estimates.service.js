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
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EstimatesService = void 0;
var common_1 = require("@nestjs/common");
var EstimatesService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var EstimatesService = _classThis = /** @class */ (function () {
        function EstimatesService_1(smsNotifications) {
            this.smsNotifications = smsNotifications;
        }
        /**
         * Look up the client phone + email from an estimate's linked booking or intake form.
         * Also persists them back onto the estimate row for future lookup.
         */
        EstimatesService_1.prototype.lookupAndPersistClientContact = function (supabase, estimate) {
            return __awaiter(this, void 0, void 0, function () {
                var phone, email, form;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            // Already stored directly — use it
                            if (estimate.client_phone) {
                                return [2 /*return*/, { phone: estimate.client_phone, email: (_a = estimate.client_email) !== null && _a !== void 0 ? _a : null }];
                            }
                            phone = null;
                            email = null;
                            if (!(!phone && estimate.intake_form_id)) return [3 /*break*/, 2];
                            return [4 /*yield*/, supabase
                                    .from('intake_forms')
                                    .select('contact_phone, contact_email')
                                    .eq('id', estimate.intake_form_id)
                                    .single()];
                        case 1:
                            form = (_d.sent()).data;
                            phone = (_b = form === null || form === void 0 ? void 0 : form.contact_phone) !== null && _b !== void 0 ? _b : null;
                            email = (_c = form === null || form === void 0 ? void 0 : form.contact_email) !== null && _c !== void 0 ? _c : null;
                            _d.label = 2;
                        case 2:
                            if (!(phone && estimate.id)) return [3 /*break*/, 4];
                            return [4 /*yield*/, supabase
                                    .from('estimates')
                                    .update({ client_phone: phone, client_email: email })
                                    .eq('id', estimate.id)
                                    .then(function () { })];
                        case 3:
                            _d.sent(); // fire-and-forget
                            _d.label = 4;
                        case 4: return [2 /*return*/, { phone: phone, email: email }];
                    }
                });
            });
        };
        EstimatesService_1.prototype.lookupOwnerPhone = function (supabase, ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var data, _a;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _c.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, supabase
                                    .from('users')
                                    .select('phone')
                                    .eq('id', ownerId)
                                    .single()];
                        case 1:
                            data = (_c.sent()).data;
                            return [2 /*return*/, (_b = data === null || data === void 0 ? void 0 : data.phone) !== null && _b !== void 0 ? _b : null];
                        case 2:
                            _a = _c.sent();
                            return [2 /*return*/, null];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        EstimatesService_1.prototype.calculateTotals = function (items, taxRate, discountAmount) {
            var subtotal = items.reduce(function (sum, item) { return sum + (Number(item.amount) || 0); }, 0);
            var taxAmount = subtotal * (taxRate / 100);
            var totalAmount = subtotal + taxAmount - discountAmount;
            return { subtotal: subtotal, taxAmount: taxAmount, totalAmount: totalAmount };
        };
        EstimatesService_1.prototype.calculateItemAmounts = function (item) {
            var quantity = Number(item.quantity) || 1;
            var unitPrice = Number(item.unit_price) || 0;
            var subtotal = quantity * unitPrice;
            var discountAmount = 0;
            if (item.discount_type === 'percentage') {
                discountAmount = subtotal * (Number(item.discount_value) / 100);
            }
            else if (item.discount_type === 'fixed') {
                discountAmount = Number(item.discount_value) || 0;
            }
            var amount = subtotal - discountAmount;
            return { subtotal: subtotal, discountAmount: discountAmount, amount: amount };
        };
        // ─── Finders ────────────────────────────────────────────────────────────────
        EstimatesService_1.prototype.findAll = function (supabase, userId) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _c.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, supabase
                                    .from('estimates')
                                    .select('*, intake_form:intake_forms(*), items:estimate_items(*)')
                                    .order('created_at', { ascending: false })];
                        case 1:
                            _a = _c.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data || []];
                        case 2:
                            _b = _c.sent();
                            return [2 /*return*/, []];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        EstimatesService_1.prototype.findByOwner = function (supabase, ownerId, venueId) {
            return __awaiter(this, void 0, void 0, function () {
                var query, venueEvents, intakeIds, eventIds, _a, data, error, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _c.trys.push([0, 4, , 5]);
                            query = supabase
                                .from('estimates')
                                .select('*, intake_form:intake_forms(*), items:estimate_items(*)')
                                .eq('owner_id', ownerId)
                                .order('created_at', { ascending: false });
                            if (!venueId) return [3 /*break*/, 2];
                            return [4 /*yield*/, supabase.from('event').select('id, intake_form_id').eq('venue_id', venueId)];
                        case 1:
                            venueEvents = (_c.sent()).data;
                            if (!venueEvents || venueEvents.length === 0)
                                return [2 /*return*/, []];
                            intakeIds = venueEvents.map(function (e) { return e.intake_form_id; }).filter(Boolean);
                            eventIds = venueEvents.map(function (e) { return e.id; });
                            if (intakeIds.length > 0) {
                                query = query.in('intake_form_id', intakeIds);
                            }
                            else {
                                query = query.in('event_id', eventIds);
                            }
                            _c.label = 2;
                        case 2: return [4 /*yield*/, query];
                        case 3:
                            _a = _c.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data || []];
                        case 4:
                            _b = _c.sent();
                            return [2 /*return*/, []];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        EstimatesService_1.prototype.findByIntakeForm = function (supabase, intakeFormId) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _c.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, supabase
                                    .from('estimates')
                                    .select('*, items:estimate_items(*)')
                                    .eq('intake_form_id', intakeFormId)
                                    .order('created_at', { ascending: false })];
                        case 1:
                            _a = _c.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data || []];
                        case 2:
                            _b = _c.sent();
                            return [2 /*return*/, []];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        EstimatesService_1.prototype.findOne = function (supabase, id) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('estimates')
                                .select('*, intake_form:intake_forms(*), items:estimate_items(*)')
                                .eq('id', id)
                                .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw new common_1.NotFoundException('Estimate not found');
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        // ─── Create ──────────────────────────────────────────────────────────────────
        EstimatesService_1.prototype.create = function (supabase, userId, estimateData, items) {
            return __awaiter(this, void 0, void 0, function () {
                var ownerId, latest, nextNumber, match, estimateNumber, _a, subtotal, taxAmount, totalAmount, clientPhone, clientEmail, fm, _b, data, error, estimate, createdItems, totals, _c, updated, upErr;
                var _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            ownerId = estimateData.owner_id || userId;
                            return [4 /*yield*/, supabase
                                    .from('estimates')
                                    .select('estimate_number')
                                    .order('created_at', { ascending: false })
                                    .limit(1)
                                    .single()];
                        case 1:
                            latest = (_f.sent()).data;
                            nextNumber = 1;
                            if (latest === null || latest === void 0 ? void 0 : latest.estimate_number) {
                                match = latest.estimate_number.match(/EST-\d{4}-(\d+)/);
                                if (match)
                                    nextNumber = parseInt(match[1], 10) + 1;
                            }
                            estimateNumber = "EST-".concat(new Date().getFullYear(), "-").concat(String(nextNumber).padStart(5, '0'));
                            _a = this.calculateTotals(items || [], Number(estimateData.tax_rate) || 0, Number(estimateData.discount_amount) || 0), subtotal = _a.subtotal, taxAmount = _a.taxAmount, totalAmount = _a.totalAmount;
                            clientPhone = estimateData.client_phone || null;
                            clientEmail = estimateData.client_email || null;
                            if (!(!clientPhone && estimateData.intake_form_id)) return [3 /*break*/, 3];
                            return [4 /*yield*/, supabase.from('intake_forms').select('contact_phone, contact_email').eq('id', estimateData.intake_form_id).single()];
                        case 2:
                            fm = (_f.sent()).data;
                            clientPhone = (_d = fm === null || fm === void 0 ? void 0 : fm.contact_phone) !== null && _d !== void 0 ? _d : null;
                            clientEmail = (_e = fm === null || fm === void 0 ? void 0 : fm.contact_email) !== null && _e !== void 0 ? _e : null;
                            _f.label = 3;
                        case 3: return [4 /*yield*/, supabase
                                .from('estimates')
                                .insert({
                                estimate_number: estimateNumber,
                                owner_id: ownerId,
                                created_by: userId,
                                intake_form_id: estimateData.intake_form_id || null,
                                client_phone: clientPhone,
                                client_email: clientEmail,
                                subtotal: subtotal,
                                tax_rate: Number(estimateData.tax_rate) || 0,
                                tax_amount: taxAmount,
                                discount_amount: Number(estimateData.discount_amount) || 0,
                                total_amount: totalAmount,
                                status: estimateData.status || 'draft',
                                issue_date: estimateData.issue_date,
                                expiration_date: estimateData.expiration_date,
                                notes: estimateData.notes || null,
                                terms: estimateData.terms || null,
                            })
                                .select()
                                .single()];
                        case 4:
                            _b = _f.sent(), data = _b.data, error = _b.error;
                            if (error)
                                throw error;
                            estimate = data;
                            if (!(items && items.length > 0)) return [3 /*break*/, 7];
                            return [4 /*yield*/, this.createItems(supabase, estimate.id, items)];
                        case 5:
                            createdItems = _f.sent();
                            totals = this.calculateTotals(createdItems, Number(estimateData.tax_rate) || 0, Number(estimateData.discount_amount) || 0);
                            return [4 /*yield*/, supabase
                                    .from('estimates')
                                    .update({ subtotal: totals.subtotal, tax_amount: totals.taxAmount, total_amount: totals.totalAmount })
                                    .eq('id', estimate.id)
                                    .select('*, intake_form:intake_forms(*), items:estimate_items(*)')
                                    .single()];
                        case 6:
                            _c = _f.sent(), updated = _c.data, upErr = _c.error;
                            if (upErr)
                                throw upErr;
                            return [2 /*return*/, updated];
                        case 7: return [2 /*return*/, estimate];
                    }
                });
            });
        };
        EstimatesService_1.prototype.createItems = function (supabase, estimateId, items) {
            return __awaiter(this, void 0, void 0, function () {
                var rows, _a, data, error;
                var _this = this;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            rows = items.map(function (item, index) {
                                var _a;
                                var _b = _this.calculateItemAmounts(item), subtotal = _b.subtotal, discountAmount = _b.discountAmount, amount = _b.amount;
                                return {
                                    estimate_id: estimateId,
                                    service_item_id: item.service_item_id || null,
                                    description: item.description || '',
                                    quantity: item.quantity || 1,
                                    standard_price: item.standard_price || item.unit_price || 0,
                                    unit_price: item.unit_price || 0,
                                    subtotal: subtotal,
                                    discount_type: item.discount_type || 'none',
                                    discount_value: item.discount_value || 0,
                                    discount_amount: discountAmount,
                                    amount: amount,
                                    sort_order: (_a = item.sort_order) !== null && _a !== void 0 ? _a : index,
                                };
                            });
                            return [4 /*yield*/, supabase.from('estimate_items').insert(rows).select()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data || []];
                    }
                });
            });
        };
        // ─── Update ──────────────────────────────────────────────────────────────────
        EstimatesService_1.prototype.update = function (supabase, id, estimateData) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('estimates')
                                .update(estimateData)
                                .eq('id', id)
                                .select()
                                .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            if (estimateData.tax_rate !== undefined || estimateData.discount_amount !== undefined) {
                                return [2 /*return*/, this.recalculate(supabase, id)];
                            }
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        EstimatesService_1.prototype.updateStatus = function (supabase, id, status) {
            return __awaiter(this, void 0, void 0, function () {
                var updateData, today, updated, phone, clientName, ownerPhone, _a;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            updateData = { status: status };
                            today = new Date().toISOString().split('T')[0];
                            if (status === 'approved')
                                updateData.approved_date = today;
                            if (status === 'rejected')
                                updateData.rejected_date = today;
                            return [4 /*yield*/, this.update(supabase, id, updateData)];
                        case 1:
                            updated = _c.sent();
                            _c.label = 2;
                        case 2:
                            _c.trys.push([2, 13, , 14]);
                            return [4 /*yield*/, this.lookupAndPersistClientContact(supabase, updated)];
                        case 3:
                            phone = (_c.sent()).phone;
                            clientName = ((_b = updated.intake_form) === null || _b === void 0 ? void 0 : _b.contact_name) || 'Valued Client';
                            if (!(status === 'sent')) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.smsNotifications.estimateSent(phone, clientName, updated.estimate_number, updated.total_amount)];
                        case 4:
                            _c.sent();
                            return [3 /*break*/, 12];
                        case 5:
                            if (!(status === 'rejected')) return [3 /*break*/, 7];
                            return [4 /*yield*/, this.smsNotifications.estimateRejected(phone, clientName, updated.estimate_number)];
                        case 6:
                            _c.sent();
                            return [3 /*break*/, 12];
                        case 7:
                            if (!(status === 'expired')) return [3 /*break*/, 9];
                            return [4 /*yield*/, this.smsNotifications.estimateExpired(phone, clientName, updated.estimate_number)];
                        case 8:
                            _c.sent();
                            return [3 /*break*/, 12];
                        case 9:
                            if (!(status === 'approved')) return [3 /*break*/, 12];
                            return [4 /*yield*/, this.lookupOwnerPhone(supabase, updated.owner_id)];
                        case 10:
                            ownerPhone = _c.sent();
                            return [4 /*yield*/, this.smsNotifications.estimateApproved(ownerPhone, clientName, updated.estimate_number)];
                        case 11:
                            _c.sent();
                            _c.label = 12;
                        case 12: return [3 /*break*/, 14];
                        case 13:
                            _a = _c.sent();
                            return [3 /*break*/, 14];
                        case 14: return [2 /*return*/, updated];
                    }
                });
            });
        };
        EstimatesService_1.prototype.updateItem = function (supabase, itemId, itemData) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, subtotal, discountAmount, amount, _b, data, error;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = this.calculateItemAmounts(__assign({}, itemData)), subtotal = _a.subtotal, discountAmount = _a.discountAmount, amount = _a.amount;
                            return [4 /*yield*/, supabase
                                    .from('estimate_items')
                                    .update(__assign(__assign({}, itemData), { subtotal: subtotal, discount_amount: discountAmount, amount: amount }))
                                    .eq('id', itemId)
                                    .select()
                                    .single()];
                        case 1:
                            _b = _c.sent(), data = _b.data, error = _b.error;
                            if (error)
                                throw error;
                            if (!data) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.recalculate(supabase, data.estimate_id)];
                        case 2:
                            _c.sent();
                            _c.label = 3;
                        case 3: return [2 /*return*/, data];
                    }
                });
            });
        };
        EstimatesService_1.prototype.deleteItem = function (supabase, itemId) {
            return __awaiter(this, void 0, void 0, function () {
                var item, error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, supabase.from('estimate_items').select('estimate_id').eq('id', itemId).single()];
                        case 1:
                            item = (_a.sent()).data;
                            return [4 /*yield*/, supabase.from('estimate_items').delete().eq('id', itemId)];
                        case 2:
                            error = (_a.sent()).error;
                            if (error)
                                throw error;
                            if (!item) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.recalculate(supabase, item.estimate_id)];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        EstimatesService_1.prototype.recalculate = function (supabase, estimateId) {
            return __awaiter(this, void 0, void 0, function () {
                var estimate, _a, subtotal, taxAmount, totalAmount, _b, data, error;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.findOne(supabase, estimateId)];
                        case 1:
                            estimate = _c.sent();
                            _a = this.calculateTotals(estimate.items || [], estimate.tax_rate, estimate.discount_amount), subtotal = _a.subtotal, taxAmount = _a.taxAmount, totalAmount = _a.totalAmount;
                            return [4 /*yield*/, supabase
                                    .from('estimates')
                                    .update({ subtotal: subtotal, tax_amount: taxAmount, total_amount: totalAmount })
                                    .eq('id', estimateId)
                                    .select()
                                    .single()];
                        case 2:
                            _b = _c.sent(), data = _b.data, error = _b.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        // ─── Delete ──────────────────────────────────────────────────────────────────
        EstimatesService_1.prototype.delete = function (supabase, id) {
            return __awaiter(this, void 0, void 0, function () {
                var error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, supabase.from('estimates').delete().eq('id', id)];
                        case 1:
                            error = (_a.sent()).error;
                            if (error)
                                throw error;
                            return [2 /*return*/];
                    }
                });
            });
        };
        // ─── Convert to Invoice ──────────────────────────────────────────────────────
        EstimatesService_1.prototype.convertToInvoice = function (supabase, userId, estimateId) {
            return __awaiter(this, void 0, void 0, function () {
                var estimate, items, latestInvoice, nextNum, m, invoiceNumber, dueDate, _a, invoice, invErr, invoiceItems, itemErr;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.findOne(supabase, estimateId)];
                        case 1:
                            estimate = _b.sent();
                            items = estimate.items || [];
                            return [4 /*yield*/, supabase
                                    .from('invoices')
                                    .select('invoice_number')
                                    .order('created_at', { ascending: false })
                                    .limit(1)
                                    .single()];
                        case 2:
                            latestInvoice = (_b.sent()).data;
                            nextNum = 1;
                            if (latestInvoice === null || latestInvoice === void 0 ? void 0 : latestInvoice.invoice_number) {
                                m = latestInvoice.invoice_number.match(/INV-\d{4}-(\d+)/);
                                if (m)
                                    nextNum = parseInt(m[1], 10) + 1;
                            }
                            invoiceNumber = "INV-".concat(new Date().getFullYear(), "-").concat(String(nextNum).padStart(5, '0'));
                            dueDate = new Date();
                            dueDate.setDate(dueDate.getDate() + 30);
                            return [4 /*yield*/, supabase
                                    .from('invoices')
                                    .insert({
                                    invoice_number: invoiceNumber,
                                    owner_id: estimate.owner_id,
                                    created_by: userId,
                                    intake_form_id: estimate.intake_form_id || null,
                                    subtotal: estimate.subtotal,
                                    tax_rate: estimate.tax_rate,
                                    tax_amount: estimate.tax_amount,
                                    discount_amount: estimate.discount_amount,
                                    total_amount: estimate.total_amount,
                                    amount_paid: 0,
                                    amount_due: estimate.total_amount,
                                    status: 'draft',
                                    issue_date: new Date().toISOString().split('T')[0],
                                    due_date: dueDate.toISOString().split('T')[0],
                                    notes: estimate.notes || null,
                                    terms: estimate.terms || null,
                                })
                                    .select()
                                    .single()];
                        case 3:
                            _a = _b.sent(), invoice = _a.data, invErr = _a.error;
                            if (invErr)
                                throw invErr;
                            if (!(items.length > 0)) return [3 /*break*/, 5];
                            invoiceItems = items.map(function (item) { return ({
                                invoice_id: invoice.id,
                                service_item_id: item.service_item_id || null,
                                description: item.description,
                                quantity: item.quantity,
                                standard_price: item.standard_price,
                                unit_price: item.unit_price,
                                subtotal: item.subtotal,
                                discount_type: item.discount_type,
                                discount_value: item.discount_value,
                                discount_amount: item.discount_amount,
                                amount: item.amount,
                                sort_order: item.sort_order,
                            }); });
                            return [4 /*yield*/, supabase.from('invoice_items').insert(invoiceItems)];
                        case 4:
                            itemErr = (_b.sent()).error;
                            if (itemErr)
                                throw itemErr;
                            _b.label = 5;
                        case 5: 
                        // Update estimate → converted
                        return [4 /*yield*/, supabase.from('estimates').update({
                                status: 'converted',
                                converted_invoice_id: invoice.id,
                                converted_at: new Date().toISOString(),
                            }).eq('id', estimateId)];
                        case 6:
                            // Update estimate → converted
                            _b.sent();
                            return [2 /*return*/, invoice];
                    }
                });
            });
        };
        return EstimatesService_1;
    }());
    __setFunctionName(_classThis, "EstimatesService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        EstimatesService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return EstimatesService = _classThis;
}();
exports.EstimatesService = EstimatesService;
