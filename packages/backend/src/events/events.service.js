"use strict";
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
exports.EventsService = void 0;
var common_1 = require("@nestjs/common");
var EventsService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var EventsService = _classThis = /** @class */ (function () {
        function EventsService_1(supabaseService) {
            this.supabaseService = supabaseService;
        }
        EventsService_1.prototype.camelToSnakeCase = function (obj) {
            if (!obj || typeof obj !== 'object')
                return obj;
            // Field mapping for special cases where frontend field doesn't match database column
            var fieldMapping = {
                maxGuests: 'guest_count',
                startTime: 'start_time',
                endTime: 'end_time',
                specialRequirements: 'special_requirements',
                clientId: 'client_id',
                ownerId: 'owner_id',
                venueId: 'venue_id',
            };
            var result = {};
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    // Use field mapping if available, otherwise convert camelCase to snake_case
                    var snakeKey = fieldMapping[key] || key.replace(/[A-Z]/g, function (letter) { return "_".concat(letter.toLowerCase()); });
                    result[snakeKey] = obj[key];
                }
            }
            return result;
        };
        EventsService_1.prototype.snakeToCamelCase = function (obj) {
            if (!obj || typeof obj !== 'object')
                return obj;
            // Reverse field mapping
            var reverseFieldMapping = {
                guest_count: 'maxGuests',
                start_time: 'startTime',
                end_time: 'endTime',
                special_requirements: 'specialRequirements',
                client_id: 'clientId',
                owner_id: 'ownerId',
                venue_id: 'venueId',
            };
            var result = {};
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    // Use reverse field mapping if available, otherwise convert snake_case to camelCase
                    var camelKey = reverseFieldMapping[key] || key.replace(/_([a-z])/g, function (match, letter) { return letter.toUpperCase(); });
                    // Preserve date as string, don't convert to Date object
                    result[camelKey] = obj[key];
                }
            }
            return result;
        };
        EventsService_1.prototype.formatEventType = function (type) {
            var labels = {
                wedding: 'Wedding',
                birthday: 'Birthday',
                birthday_party: 'Birthday Party',
                party: 'Party',
                graduation_party: 'Graduation Party',
                baby_shower: 'Baby Shower',
                retirement: 'Retirement',
                holiday_party: 'Holiday Party',
                engagement_party: 'Engagement Party',
                prom_formal: 'Prom / Formal',
                family_reunion: 'Family Reunion',
                quinceanera: 'Quincea\u00f1era',
                sweet_16: 'Sweet 16',
                corporate: 'Corporate Event',
                conference: 'Conference',
                workshop: 'Workshop',
                anniversary: 'Anniversary',
                concert_show: 'Concert / Show',
                memorial_service: 'Memorial Service',
                other: 'Other',
            };
            return labels[type] || type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
        };
        EventsService_1.prototype.findAll = function (supabase, userId, venueId) {
            return __awaiter(this, void 0, void 0, function () {
                var adminClient, query, _a, data, error, basicQuery, _b, basicData, basicError, fallbackData;
                var _this = this;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            adminClient = this.supabaseService.getAdminClient();
                            query = adminClient
                                .from('event')
                                .select('*, intake_form:intake_forms!intake_form_id(contact_name, event_name, event_type, status)')
                                .eq('owner_id', userId)
                                .order('date', { ascending: true });
                            // When filtering by venue, also include events with no venue_id assigned yet
                            // so newly-created events from intake forms are always visible.
                            if (venueId)
                                query = query.or("venue_id.eq.".concat(venueId, ",venue_id.is.null"));
                            return [4 /*yield*/, query];
                        case 1:
                            _a = _c.sent(), data = _a.data, error = _a.error;
                            if (!error) return [3 /*break*/, 5];
                            basicQuery = supabase
                                .from('event')
                                .select('*')
                                .eq('owner_id', userId)
                                .order('date', { ascending: true });
                            if (venueId)
                                basicQuery = basicQuery.or("venue_id.eq.".concat(venueId, ",venue_id.is.null"));
                            return [4 /*yield*/, basicQuery];
                        case 2:
                            _b = _c.sent(), basicData = _b.data, basicError = _b.error;
                            if (!basicError) return [3 /*break*/, 4];
                            return [4 /*yield*/, supabase
                                    .from('event')
                                    .select('*')
                                    .eq('owner_id', userId)
                                    .order('date', { ascending: true })];
                        case 3:
                            fallbackData = (_c.sent()).data;
                            return [2 /*return*/, (fallbackData || []).map(function (event) { return _this.snakeToCamelCase(event); })];
                        case 4: return [2 /*return*/, (basicData || []).map(function (event) { return _this.snakeToCamelCase(event); })];
                        case 5: return [2 /*return*/, (data || []).map(function (event) {
                                var converted = _this.snakeToCamelCase(event);
                                // Flatten intake form fields onto the event
                                if (event.intake_form) {
                                    converted.clientName = event.intake_form.contact_name || null;
                                    converted.intakeEventName = event.intake_form.event_name || null;
                                    converted.intakeFormStatus = event.intake_form.status || null;
                                    // If no explicit event_name, derive a readable title from event_type
                                    if (!converted.intakeEventName && event.intake_form.event_type) {
                                        converted.intakeEventName = _this.formatEventType(event.intake_form.event_type);
                                    }
                                }
                                delete converted.intakeForm;
                                return converted;
                            })];
                    }
                });
            });
        };
        EventsService_1.prototype.findOne = function (supabase, id, userId) {
            return __awaiter(this, void 0, void 0, function () {
                var adminClient, _a, data, error, _b, basicData, basicError, converted;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            adminClient = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, adminClient
                                    .from('event')
                                    .select('*, intake_form:intake_forms!intake_form_id(contact_name, event_name, event_type, status)')
                                    .eq('id', id)
                                    .eq('owner_id', userId)
                                    .single()];
                        case 1:
                            _a = _c.sent(), data = _a.data, error = _a.error;
                            if (!error) return [3 /*break*/, 3];
                            return [4 /*yield*/, supabase
                                    .from('event')
                                    .select('*')
                                    .eq('id', id)
                                    .eq('owner_id', userId)
                                    .single()];
                        case 2:
                            _b = _c.sent(), basicData = _b.data, basicError = _b.error;
                            if (basicError)
                                throw basicError;
                            return [2 /*return*/, basicData ? this.snakeToCamelCase(basicData) : null];
                        case 3:
                            if (!data)
                                return [2 /*return*/, null];
                            converted = this.snakeToCamelCase(data);
                            if (data.intake_form) {
                                converted.clientName = data.intake_form.contact_name || null;
                                converted.intakeEventName = data.intake_form.event_name || null;
                                converted.intakeFormStatus = data.intake_form.status || null;
                                if (!converted.intakeEventName && data.intake_form.event_type) {
                                    converted.intakeEventName = this.formatEventType(data.intake_form.event_type);
                                }
                            }
                            delete converted.intakeForm;
                            return [2 /*return*/, converted];
                    }
                });
            });
        };
        EventsService_1.prototype.create = function (supabase, event) {
            return __awaiter(this, void 0, void 0, function () {
                var convertedEvent, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            convertedEvent = this.camelToSnakeCase(event);
                            console.log('Creating event with converted data:', JSON.stringify(convertedEvent, null, 2));
                            return [4 /*yield*/, supabase
                                    .from('event')
                                    .insert([convertedEvent])
                                    .select()
                                    .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error) {
                                console.error('Supabase create error:', error);
                                throw error;
                            }
                            return [2 /*return*/, this.snakeToCamelCase(data)];
                    }
                });
            });
        };
        EventsService_1.prototype.update = function (supabase, id, event, userId) {
            return __awaiter(this, void 0, void 0, function () {
                var convertedEvent, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            convertedEvent = this.camelToSnakeCase(event);
                            return [4 /*yield*/, supabase
                                    .from('event')
                                    .update(convertedEvent)
                                    .eq('id', id)
                                    .eq('owner_id', userId)
                                    .select()
                                    .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data ? this.snakeToCamelCase(data) : null];
                    }
                });
            });
        };
        EventsService_1.prototype.remove = function (supabase, id, userId) {
            return __awaiter(this, void 0, void 0, function () {
                var error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('event')
                                .delete()
                                .eq('id', id)
                                .eq('owner_id', userId)];
                        case 1:
                            error = (_a.sent()).error;
                            if (error)
                                throw error;
                            return [2 /*return*/];
                    }
                });
            });
        };
        EventsService_1.prototype.getManagementData = function (userId, eventId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('event')
                                    .select('management_data')
                                    .eq('id', eventId)
                                    .eq('owner_id', userId)
                                    .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error) {
                                // Column may not exist yet — return empty object gracefully
                                return [2 /*return*/, {}];
                            }
                            return [2 /*return*/, (data === null || data === void 0 ? void 0 : data.management_data) || {}];
                    }
                });
            });
        };
        EventsService_1.prototype.saveManagementData = function (userId, eventId, payload) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('event')
                                    .update({ management_data: payload })
                                    .eq('id', eventId)
                                    .eq('owner_id', userId)
                                    .select('management_data')
                                    .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, (data === null || data === void 0 ? void 0 : data.management_data) || {}];
                    }
                });
            });
        };
        return EventsService_1;
    }());
    __setFunctionName(_classThis, "EventsService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        EventsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return EventsService = _classThis;
}();
exports.EventsService = EventsService;
