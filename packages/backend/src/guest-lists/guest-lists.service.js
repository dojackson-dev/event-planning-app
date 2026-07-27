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
exports.GuestListsService = void 0;
var common_1 = require("@nestjs/common");
var crypto = require("crypto");
var GuestListsService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var GuestListsService = _classThis = /** @class */ (function () {
        function GuestListsService_1(supabaseService, smsNotifications) {
            this.supabaseService = supabaseService;
            this.smsNotifications = smsNotifications;
        }
        GuestListsService_1.prototype.generateToken = function () {
            return crypto.randomBytes(32).toString('hex');
        };
        GuestListsService_1.prototype.generateAccessCode = function () {
            // Generate a 6-character alphanumeric code
            var characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar characters
            var code = '';
            for (var i = 0; i < 6; i++) {
                code += characters.charAt(Math.floor(Math.random() * characters.length));
            }
            return code;
        };
        GuestListsService_1.prototype.findAll = function () {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, guestLists, error, guestListIds, _b, allGuests, guestsError, eventIds, _c, events, eventsError;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('guest_lists')
                                    .select('*')
                                    .order('created_at', { ascending: false })];
                        case 1:
                            _a = _d.sent(), guestLists = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            if (!guestLists || guestLists.length === 0)
                                return [2 /*return*/, []];
                            guestListIds = guestLists.map(function (gl) { return gl.id; });
                            return [4 /*yield*/, supabase
                                    .from('guests')
                                    .select('*')
                                    .in('guest_list_id', guestListIds)];
                        case 2:
                            _b = _d.sent(), allGuests = _b.data, guestsError = _b.error;
                            eventIds = __spreadArray([], new Set(guestLists.map(function (gl) { return gl.event_id; }).filter(Boolean)), true);
                            return [4 /*yield*/, supabase
                                    .from('event')
                                    .select('*')
                                    .in('id', eventIds)];
                        case 3:
                            _c = _d.sent(), events = _c.data, eventsError = _c.error;
                            // Map guests and events to guest lists
                            return [2 /*return*/, guestLists.map(function (gl) { return (__assign(__assign({}, gl), { guests: (allGuests === null || allGuests === void 0 ? void 0 : allGuests.filter(function (g) { return g.guest_list_id === gl.id; })) || [], event: (events === null || events === void 0 ? void 0 : events.find(function (e) { return e.id === gl.event_id; })) || null })); })];
                    }
                });
            });
        };
        GuestListsService_1.prototype.findByClient = function (clientId) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('guest_lists')
                                    .select("\n        *,\n        *\n      ")
                                    .eq('client_id', clientId)
                                    .order('created_at', { ascending: false })];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data || []];
                    }
                });
            });
        };
        GuestListsService_1.prototype.findByEvent = function (eventId) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('guest_lists')
                                    .select("\n        *,\n        *\n      ")
                                    .eq('event_id', eventId)
                                    .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error && error.code !== 'PGRST116')
                                throw error;
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        GuestListsService_1.prototype.findOne = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, guestListData, guestListError, _b, eventData, eventError, _c, guestsData, guestsError;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('guest_lists')
                                    .select('*')
                                    .eq('id', id)
                                    .single()];
                        case 1:
                            _a = _d.sent(), guestListData = _a.data, guestListError = _a.error;
                            if (guestListError && guestListError.code !== 'PGRST116')
                                throw guestListError;
                            if (!guestListData)
                                return [2 /*return*/, null];
                            return [4 /*yield*/, supabase
                                    .from('event')
                                    .select('*')
                                    .eq('id', guestListData.event_id)
                                    .single()];
                        case 2:
                            _b = _d.sent(), eventData = _b.data, eventError = _b.error;
                            return [4 /*yield*/, supabase
                                    .from('guests')
                                    .select('*')
                                    .eq('guest_list_id', id)
                                    .order('created_at', { ascending: true })];
                        case 3:
                            _c = _d.sent(), guestsData = _c.data, guestsError = _c.error;
                            return [2 /*return*/, __assign(__assign({}, guestListData), { event: eventData, guests: guestsData || [] })];
                    }
                });
            });
        };
        GuestListsService_1.prototype.findByShareToken = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('guest_lists')
                                    .select("\n        *,\n        *\n      ")
                                    .eq('share_token', token)
                                    .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error && error.code !== 'PGRST116')
                                throw error;
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        GuestListsService_1.prototype.findByAccessCode = function (code) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, guestListData, error, eventData, guestsData;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('guest_lists')
                                    .select('*')
                                    .eq('access_code', code.toUpperCase())
                                    .single()];
                        case 1:
                            _a = _b.sent(), guestListData = _a.data, error = _a.error;
                            if (error && error.code !== 'PGRST116')
                                throw error;
                            if (!guestListData)
                                return [2 /*return*/, null];
                            return [4 /*yield*/, supabase
                                    .from('event')
                                    .select('*')
                                    .eq('id', guestListData.event_id)
                                    .single()];
                        case 2:
                            eventData = (_b.sent()).data;
                            return [4 /*yield*/, supabase
                                    .from('guests')
                                    .select('*')
                                    .eq('guest_list_id', guestListData.id)
                                    .order('created_at', { ascending: true })];
                        case 3:
                            guestsData = (_b.sent()).data;
                            return [2 /*return*/, __assign(__assign({}, guestListData), { event: eventData, guests: guestsData || [] })];
                    }
                });
            });
        };
        GuestListsService_1.prototype.validateAccessCode = function (guestListId, accessCode) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('guest_lists')
                                    .select('access_code')
                                    .eq('id', guestListId)
                                    .eq('access_code', accessCode.toUpperCase())
                                    .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            return [2 /*return*/, !error && data !== null];
                    }
                });
            });
        };
        GuestListsService_1.prototype.findByArrivalToken = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('guest_lists')
                                    .select("\n        *,\n        *\n      ")
                                    .eq('arrival_token', token)
                                    .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error && error.code !== 'PGRST116')
                                throw error;
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        GuestListsService_1.prototype.create = function (guestListData) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, existing, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('guest_lists')
                                    .select('id')
                                    .eq('event_id', guestListData.eventId)
                                    .maybeSingle()];
                        case 1:
                            existing = (_b.sent()).data;
                            if (existing) {
                                throw Object.assign(new Error('A guest list already exists for this event.'), { status: 409 });
                            }
                            return [4 /*yield*/, supabase
                                    .from('guest_lists')
                                    .insert({
                                    client_id: null,
                                    intake_form_id: guestListData.clientId || guestListData.intakeFormId || null,
                                    event_id: guestListData.eventId,
                                    max_guests_per_person: guestListData.maxGuestsPerPerson || 0,
                                    access_code: this.generateAccessCode(),
                                    share_token: this.generateToken(),
                                    arrival_token: this.generateToken(),
                                    is_locked: false,
                                })
                                    .select("\n        *,\n        *\n      ")
                                    .single()];
                        case 2:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        GuestListsService_1.prototype.update = function (id, guestListData) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, updateData, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            updateData = {};
                            if (guestListData.maxGuestsPerPerson !== undefined)
                                updateData.max_guests_per_person = guestListData.maxGuestsPerPerson;
                            if (guestListData.isLocked !== undefined)
                                updateData.is_locked = guestListData.isLocked;
                            return [4 /*yield*/, supabase
                                    .from('guest_lists')
                                    .update(updateData)
                                    .eq('id', id)
                                    .select("\n        *,\n        *\n      ")
                                    .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error && error.code !== 'PGRST116')
                                throw error;
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        GuestListsService_1.prototype.lock = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.update(id, { isLocked: true })];
                });
            });
        };
        GuestListsService_1.prototype.unlock = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.update(id, { isLocked: false })];
                });
            });
        };
        GuestListsService_1.prototype.delete = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            // Delete guests first
                            return [4 /*yield*/, supabase.from('guests').delete().eq('guest_list_id', id)];
                        case 1:
                            // Delete guests first
                            _a.sent();
                            return [4 /*yield*/, supabase.from('guest_lists').delete().eq('id', id)];
                        case 2:
                            error = (_a.sent()).error;
                            if (error)
                                throw error;
                            return [2 /*return*/];
                    }
                });
            });
        };
        // Guest management
        GuestListsService_1.prototype.getGuests = function (guestListId) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('guests')
                                    .select('*')
                                    .eq('guest_list_id', guestListId)
                                    .order('created_at', { ascending: true })];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data || []];
                    }
                });
            });
        };
        GuestListsService_1.prototype.addGuest = function (guestListId, guestData) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('guests')
                                    .insert({
                                    guest_list_id: guestListId,
                                    name: guestData.name,
                                    phone: guestData.phone || null,
                                    plus_one_count: guestData.plusOnes || 0,
                                    has_arrived: false,
                                })
                                    .select()
                                    .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error) {
                                console.error('[GuestListsService] addGuest error:', error.message, error.details, error.hint);
                                throw error;
                            }
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        GuestListsService_1.prototype.updateGuest = function (guestId, guestData) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, updateData, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            updateData = {};
                            if (guestData.name !== undefined)
                                updateData.name = guestData.name;
                            if (guestData.phone !== undefined)
                                updateData.phone = guestData.phone;
                            if (guestData.plusOnes !== undefined)
                                updateData.plus_one_count = guestData.plusOnes;
                            if (guestData.hasArrived !== undefined)
                                updateData.has_arrived = guestData.hasArrived;
                            if (guestData.arrivedAt !== undefined)
                                updateData.arrived_at = guestData.arrivedAt;
                            return [4 /*yield*/, supabase
                                    .from('guests')
                                    .update(updateData)
                                    .eq('id', guestId)
                                    .select()
                                    .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error && error.code !== 'PGRST116')
                                throw error;
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        GuestListsService_1.prototype.deleteGuest = function (guestId) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase.from('guests').delete().eq('id', guestId)];
                        case 1:
                            error = (_a.sent()).error;
                            if (error)
                                throw error;
                            return [2 /*return*/];
                    }
                });
            });
        };
        GuestListsService_1.prototype.markArrival = function (guestId) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('guests')
                                    .update({
                                    has_arrived: true,
                                    arrived_at: new Date().toISOString(),
                                })
                                    .eq('id', guestId)
                                    .select()
                                    .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error && error.code !== 'PGRST116')
                                throw error;
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        GuestListsService_1.prototype.unmarkArrival = function (guestId) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('guests')
                                    .update({
                                    has_arrived: false,
                                    arrived_at: null,
                                })
                                    .eq('id', guestId)
                                    .select()
                                    .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error && error.code !== 'PGRST116')
                                throw error;
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        GuestListsService_1.prototype.smsClientInvite = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, guestList, error, frontendUrl, shareUrl, message, phone, event_1, form, lookupId, form, userRow, smsErr_1;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('guest_lists')
                                    .select('*')
                                    .eq('id', id)
                                    .single()];
                        case 1:
                            _a = _b.sent(), guestList = _a.data, error = _a.error;
                            if (error || !guestList)
                                throw new Error('Guest list not found');
                            frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                            shareUrl = "".concat(frontendUrl, "/guest-list/share/").concat(guestList.share_token);
                            message = "You've been invited to view and edit the guest list!\n\n" +
                                "Link: ".concat(shareUrl, "\nAccess Code: ").concat(guestList.access_code, "\n\n") +
                                "Open the link and enter the code to get started.";
                            phone = null;
                            if (!guestList.event_id) return [3 /*break*/, 4];
                            return [4 /*yield*/, supabase
                                    .from('event')
                                    .select('client_id')
                                    .eq('id', guestList.event_id)
                                    .maybeSingle()];
                        case 2:
                            event_1 = (_b.sent()).data;
                            if (!(event_1 === null || event_1 === void 0 ? void 0 : event_1.client_id)) return [3 /*break*/, 4];
                            return [4 /*yield*/, supabase
                                    .from('intake_forms')
                                    .select('contact_phone, contact_name')
                                    .eq('id', event_1.client_id)
                                    .maybeSingle()];
                        case 3:
                            form = (_b.sent()).data;
                            if (form === null || form === void 0 ? void 0 : form.contact_phone)
                                phone = form.contact_phone;
                            _b.label = 4;
                        case 4:
                            if (!(!phone && (guestList.intake_form_id || guestList.client_id))) return [3 /*break*/, 7];
                            lookupId = guestList.intake_form_id || guestList.client_id;
                            return [4 /*yield*/, supabase
                                    .from('intake_forms')
                                    .select('contact_phone')
                                    .eq('id', lookupId)
                                    .maybeSingle()];
                        case 5:
                            form = (_b.sent()).data;
                            if (form === null || form === void 0 ? void 0 : form.contact_phone)
                                phone = form.contact_phone;
                            if (!(!phone && guestList.client_id)) return [3 /*break*/, 7];
                            return [4 /*yield*/, supabase
                                    .from('users')
                                    .select('phone_number')
                                    .eq('id', guestList.client_id)
                                    .maybeSingle()];
                        case 6:
                            userRow = (_b.sent()).data;
                            if (userRow === null || userRow === void 0 ? void 0 : userRow.phone_number)
                                phone = userRow.phone_number;
                            _b.label = 7;
                        case 7:
                            if (!phone) {
                                return [2 /*return*/, { sent: false, error: 'No phone number found for this client.' }];
                            }
                            _b.label = 8;
                        case 8:
                            _b.trys.push([8, 10, , 11]);
                            return [4 /*yield*/, this.smsNotifications.send(phone, message)];
                        case 9:
                            _b.sent();
                            return [2 /*return*/, { sent: true, to: phone }];
                        case 10:
                            smsErr_1 = _b.sent();
                            return [2 /*return*/, { sent: false, error: (smsErr_1 === null || smsErr_1 === void 0 ? void 0 : smsErr_1.message) || 'SMS failed' }];
                        case 11: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Import attending RSVP guests into a guest list.
         * Looks up rsvp_guests via: guest_list → event_id → intake_forms → rsvp_guests(status=attending)
         * Skips guests already on the list (matched by name, case-insensitive).
         */
        GuestListsService_1.prototype.importFromRsvp = function (guestListId) {
            return __awaiter(this, void 0, void 0, function () {
                var supabase, _a, guestList, glErr, forms, intakeFormIds, _b, rsvpGuests, rsvpErr, existing, existingNames, toInsert, insertErr;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            supabase = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, supabase
                                    .from('guest_lists')
                                    .select('id, event_id')
                                    .eq('id', guestListId)
                                    .single()];
                        case 1:
                            _a = _c.sent(), guestList = _a.data, glErr = _a.error;
                            if (glErr || !guestList)
                                throw new Error('Guest list not found');
                            return [4 /*yield*/, supabase
                                    .from('intake_forms')
                                    .select('id')
                                    .eq('event_id', guestList.event_id)];
                        case 2:
                            forms = (_c.sent()).data;
                            if (!(forms === null || forms === void 0 ? void 0 : forms.length))
                                return [2 /*return*/, { imported: 0, skipped: 0 }];
                            intakeFormIds = forms.map(function (f) { return f.id; });
                            return [4 /*yield*/, supabase
                                    .from('rsvp_guests')
                                    .select('guest_name, guest_phone, plus_ones')
                                    .in('intake_form_id', intakeFormIds)
                                    .eq('status', 'attending')];
                        case 3:
                            _b = _c.sent(), rsvpGuests = _b.data, rsvpErr = _b.error;
                            if (rsvpErr)
                                throw rsvpErr;
                            if (!(rsvpGuests === null || rsvpGuests === void 0 ? void 0 : rsvpGuests.length))
                                return [2 /*return*/, { imported: 0, skipped: 0 }];
                            return [4 /*yield*/, supabase
                                    .from('guests')
                                    .select('name')
                                    .eq('guest_list_id', guestListId)];
                        case 4:
                            existing = (_c.sent()).data;
                            existingNames = new Set((existing || []).map(function (g) { return g.name.toLowerCase().trim(); }));
                            toInsert = rsvpGuests
                                .filter(function (g) { return !existingNames.has((g.guest_name || '').toLowerCase().trim()); })
                                .map(function (g) {
                                var _a;
                                return ({
                                    guest_list_id: guestListId,
                                    name: g.guest_name,
                                    phone: g.guest_phone || null,
                                    plus_one_count: (_a = g.plus_ones) !== null && _a !== void 0 ? _a : 0,
                                    has_arrived: false,
                                });
                            });
                            if (!toInsert.length)
                                return [2 /*return*/, { imported: 0, skipped: rsvpGuests.length }];
                            return [4 /*yield*/, supabase.from('guests').insert(toInsert)];
                        case 5:
                            insertErr = (_c.sent()).error;
                            if (insertErr)
                                throw insertErr;
                            return [2 /*return*/, { imported: toInsert.length, skipped: rsvpGuests.length - toInsert.length }];
                    }
                });
            });
        };
        return GuestListsService_1;
    }());
    __setFunctionName(_classThis, "GuestListsService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        GuestListsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return GuestListsService = _classThis;
}();
exports.GuestListsService = GuestListsService;
