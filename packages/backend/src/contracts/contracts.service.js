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
exports.ContractsService = void 0;
var common_1 = require("@nestjs/common");
var ContractsService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var ContractsService = _classThis = /** @class */ (function () {
        function ContractsService_1(smsNotifications, supabaseService, mailService) {
            this.smsNotifications = smsNotifications;
            this.supabaseService = supabaseService;
            this.mailService = mailService;
        }
        ContractsService_1.prototype.findAll = function (supabase) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('contracts')
                                .select('*')
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
        ContractsService_1.prototype.findByOwner = function (supabase, ownerId, venueId) {
            return __awaiter(this, void 0, void 0, function () {
                var query, admin, venueEvents, eventIds, intakeIds, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            query = supabase
                                .from('contracts')
                                .select('*')
                                .eq('owner_id', ownerId)
                                .order('created_at', { ascending: false });
                            if (!venueId) return [3 /*break*/, 2];
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin.from('event').select('id, intake_form_id').eq('venue_id', venueId)];
                        case 1:
                            venueEvents = (_b.sent()).data;
                            if (!venueEvents || venueEvents.length === 0)
                                return [2 /*return*/, []];
                            eventIds = venueEvents.map(function (e) { return e.id; });
                            intakeIds = venueEvents.map(function (e) { return e.intake_form_id; }).filter(Boolean);
                            // Filter by event_id or intake_form_id
                            if (intakeIds.length > 0) {
                                query = query.in('intake_form_id', intakeIds);
                            }
                            else {
                                query = query.in('event_id', eventIds);
                            }
                            _b.label = 2;
                        case 2: return [4 /*yield*/, query];
                        case 3:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data || []];
                    }
                });
            });
        };
        ContractsService_1.prototype.findByClient = function (supabase, clientId) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('contracts')
                                .select('*')
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
        ContractsService_1.prototype.findOne = function (supabase, id) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error, admin, ownerUser;
                var _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('contracts')
                                .select('*')
                                .eq('id', id)
                                .single()];
                        case 1:
                            _a = _e.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            if (!data)
                                return [2 /*return*/, null];
                            admin = this.supabaseService.getAdminClient();
                            if (!data.owner_id) return [3 /*break*/, 3];
                            return [4 /*yield*/, admin
                                    .from('users')
                                    .select('first_name, last_name, email')
                                    .eq('id', data.owner_id)
                                    .single()];
                        case 2:
                            ownerUser = (_e.sent()).data;
                            if (ownerUser) {
                                data.owner_name = "".concat((_b = ownerUser.first_name) !== null && _b !== void 0 ? _b : '', " ").concat((_c = ownerUser.last_name) !== null && _c !== void 0 ? _c : '').trim() || null;
                                data.owner_email = (_d = ownerUser.email) !== null && _d !== void 0 ? _d : null;
                            }
                            _e.label = 3;
                        case 3: return [2 /*return*/, data];
                    }
                });
            });
        };
        ContractsService_1.prototype.create = function (supabase, contractData) {
            return __awaiter(this, void 0, void 0, function () {
                var count, contractNumber, clientName, clientPhone, clientEmail, admin, vendorAccount, form, payload, _a, data, error;
                var _b, _c, _d, _e, _f, _g;
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('contracts')
                                .select('*', { count: 'exact', head: true })];
                        case 1:
                            count = (_h.sent()).count;
                            contractNumber = "CON-".concat(new Date().getFullYear(), "-").concat(String((count || 0) + 1).padStart(5, '0'));
                            clientName = contractData.client_name;
                            clientPhone = contractData.client_phone;
                            clientEmail = contractData.client_email;
                            admin = this.supabaseService.getAdminClient();
                            if (!(contractData.vendor_account_id && (!clientPhone || !clientName))) return [3 /*break*/, 3];
                            return [4 /*yield*/, admin
                                    .from('vendor_accounts')
                                    .select('business_name, phone, email')
                                    .eq('id', contractData.vendor_account_id)
                                    .single()];
                        case 2:
                            vendorAccount = (_h.sent()).data;
                            if (vendorAccount) {
                                clientName = (_b = clientName !== null && clientName !== void 0 ? clientName : vendorAccount.business_name) !== null && _b !== void 0 ? _b : undefined;
                                clientPhone = (_c = clientPhone !== null && clientPhone !== void 0 ? clientPhone : vendorAccount.phone) !== null && _c !== void 0 ? _c : undefined;
                                clientEmail = (_d = clientEmail !== null && clientEmail !== void 0 ? clientEmail : vendorAccount.email) !== null && _d !== void 0 ? _d : undefined;
                            }
                            return [3 /*break*/, 5];
                        case 3:
                            if (!(contractData.intake_form_id && (!clientPhone || !clientName))) return [3 /*break*/, 5];
                            return [4 /*yield*/, admin
                                    .from('intake_forms')
                                    .select('contact_name, contact_phone, contact_email')
                                    .eq('id', contractData.intake_form_id)
                                    .single()];
                        case 4:
                            form = (_h.sent()).data;
                            if (form) {
                                clientName = (_e = clientName !== null && clientName !== void 0 ? clientName : form.contact_name) !== null && _e !== void 0 ? _e : undefined;
                                clientPhone = (_f = clientPhone !== null && clientPhone !== void 0 ? clientPhone : form.contact_phone) !== null && _f !== void 0 ? _f : undefined;
                                clientEmail = (_g = clientEmail !== null && clientEmail !== void 0 ? clientEmail : form.contact_email) !== null && _g !== void 0 ? _g : undefined;
                            }
                            _h.label = 5;
                        case 5:
                            payload = __assign(__assign({}, contractData), { contract_number: contractNumber, status: contractData.status || 'draft' });
                            if (clientName)
                                payload.client_name = clientName;
                            if (clientPhone)
                                payload.client_phone = clientPhone;
                            if (clientEmail)
                                payload.client_email = clientEmail;
                            return [4 /*yield*/, supabase
                                    .from('contracts')
                                    .insert([payload])
                                    .select()
                                    .single()];
                        case 6:
                            _a = _h.sent(), data = _a.data, error = _a.error;
                            if (error) {
                                console.error('[ContractsService] insert error:', error.message, error.details, error.hint);
                                throw error;
                            }
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        ContractsService_1.prototype.update = function (supabase, id, contractData) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('contracts')
                                .update(contractData)
                                .eq('id', id)
                                .select()
                                .single()];
                        case 1:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data];
                    }
                });
            });
        };
        ContractsService_1.prototype.signContract = function (supabase, id, signatureData) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error, contractNumber, signerName, ownerUser, ownerPhone, clientPhone, _b;
                var _c, _d, _e, _f;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('contracts')
                                .update({
                                signature_data: signatureData.signatureData,
                                signer_name: signatureData.signerName,
                                signer_ip_address: signatureData.ipAddress,
                                signed_date: new Date().toISOString(),
                                status: 'signed',
                            })
                                .eq('id', id)
                                .select()
                                .single()];
                        case 1:
                            _a = _g.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            _g.label = 2;
                        case 2:
                            _g.trys.push([2, 7, , 8]);
                            contractNumber = (_c = data.contract_number) !== null && _c !== void 0 ? _c : id;
                            signerName = signatureData.signerName || data.signer_name || 'Client';
                            if (!data.owner_id) return [3 /*break*/, 5];
                            return [4 /*yield*/, supabase
                                    .from('users')
                                    .select('phone_number')
                                    .eq('id', data.owner_id)
                                    .single()];
                        case 3:
                            ownerUser = (_g.sent()).data;
                            ownerPhone = (_d = ownerUser === null || ownerUser === void 0 ? void 0 : ownerUser.phone_number) !== null && _d !== void 0 ? _d : null;
                            return [4 /*yield*/, this.smsNotifications.contractSigned(ownerPhone, signerName, contractNumber)];
                        case 4:
                            _g.sent();
                            _g.label = 5;
                        case 5:
                            clientPhone = (_f = (_e = data.client_phone) !== null && _e !== void 0 ? _e : data.contact_phone) !== null && _f !== void 0 ? _f : null;
                            return [4 /*yield*/, this.smsNotifications.contractSignedConfirmToClient(clientPhone, signerName, contractNumber)];
                        case 6:
                            _g.sent();
                            return [3 /*break*/, 8];
                        case 7:
                            _b = _g.sent();
                            return [3 /*break*/, 8];
                        case 8: return [2 /*return*/, data];
                    }
                });
            });
        };
        ContractsService_1.prototype.sendContract = function (supabase, id) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error, frontendUrl, isVendorContract, contractUrl, clientPhone, clientName, contractNumber, _b, clientEmail, clientName, contractNumber, frontendUrl_1, isVendorContract_1, contractUrl_1, ownerName, admin, ownerUser, _c;
                var _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
                return __generator(this, function (_t) {
                    switch (_t.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('contracts')
                                .update({
                                sent_date: new Date().toISOString(),
                                status: 'sent',
                            })
                                .eq('id', id)
                                .select()
                                .single()];
                        case 1:
                            _a = _t.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                            isVendorContract = data.contract_type === 'vendor_template';
                            contractUrl = isVendorContract
                                ? "".concat(frontendUrl, "/vendors/dashboard/contracts/").concat(id)
                                : "".concat(frontendUrl, "/client-portal/contracts/").concat(id);
                            _t.label = 2;
                        case 2:
                            _t.trys.push([2, 4, , 5]);
                            clientPhone = (_e = (_d = data.client_phone) !== null && _d !== void 0 ? _d : data.contact_phone) !== null && _e !== void 0 ? _e : null;
                            clientName = (_g = (_f = data.client_name) !== null && _f !== void 0 ? _f : data.contact_name) !== null && _g !== void 0 ? _g : 'Valued Client';
                            contractNumber = (_h = data.contract_number) !== null && _h !== void 0 ? _h : id;
                            return [4 /*yield*/, this.smsNotifications.contractSent(clientPhone, clientName, contractNumber, contractUrl)];
                        case 3:
                            _t.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            _b = _t.sent();
                            return [3 /*break*/, 5];
                        case 5:
                            _t.trys.push([5, 10, , 11]);
                            clientEmail = (_k = (_j = data.client_email) !== null && _j !== void 0 ? _j : data.contact_email) !== null && _k !== void 0 ? _k : null;
                            clientName = (_m = (_l = data.client_name) !== null && _l !== void 0 ? _l : data.contact_name) !== null && _m !== void 0 ? _m : 'Valued Client';
                            contractNumber = (_o = data.contract_number) !== null && _o !== void 0 ? _o : id;
                            frontendUrl_1 = process.env.FRONTEND_URL || 'http://localhost:3000';
                            isVendorContract_1 = data.contract_type === 'vendor_template';
                            contractUrl_1 = isVendorContract_1
                                ? "".concat(frontendUrl_1, "/vendors/dashboard/contracts/").concat(id)
                                : "".concat(frontendUrl_1, "/client-portal/contracts/").concat(id);
                            ownerName = 'Your Event Coordinator';
                            if (!data.owner_id) return [3 /*break*/, 7];
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('users')
                                    .select('first_name, last_name')
                                    .eq('id', data.owner_id)
                                    .maybeSingle()];
                        case 6:
                            ownerUser = (_t.sent()).data;
                            if (ownerUser) {
                                ownerName =
                                    "".concat((_p = ownerUser.first_name) !== null && _p !== void 0 ? _p : '', " ").concat((_q = ownerUser.last_name) !== null && _q !== void 0 ? _q : '').trim() || ownerName;
                            }
                            _t.label = 7;
                        case 7:
                            if (!clientEmail) return [3 /*break*/, 9];
                            return [4 /*yield*/, this.mailService.sendContractWithResend({
                                    clientName: clientName,
                                    clientEmail: clientEmail,
                                    ownerName: ownerName,
                                    contractNumber: contractNumber,
                                    contractTitle: (_r = data.title) !== null && _r !== void 0 ? _r : 'Contract',
                                    contractDescription: (_s = data.description) !== null && _s !== void 0 ? _s : undefined,
                                    contractUrl: contractUrl_1,
                                })];
                        case 8:
                            _t.sent();
                            _t.label = 9;
                        case 9: return [3 /*break*/, 11];
                        case 10:
                            _c = _t.sent();
                            return [3 /*break*/, 11];
                        case 11: return [2 /*return*/, data];
                    }
                });
            });
        };
        /** Owner counter-signs a contract after the client has signed. */
        ContractsService_1.prototype.ownerSignContract = function (supabase, id, ownerSignatureData, ownerSignerName, ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, data, error, clientPhone, clientName, contractNumber, frontendUrl, contractUrl, _b;
                var _c, _d, _e, _f, _g;
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('contracts')
                                .update({
                                owner_signature_data: ownerSignatureData,
                                owner_signer_name: ownerSignerName,
                                owner_signed_date: new Date().toISOString(),
                            })
                                .eq('id', id)
                                .eq('owner_id', ownerId)
                                .select()
                                .single()];
                        case 1:
                            _a = _h.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            _h.label = 2;
                        case 2:
                            _h.trys.push([2, 4, , 5]);
                            clientPhone = (_d = (_c = data.client_phone) !== null && _c !== void 0 ? _c : data.contact_phone) !== null && _d !== void 0 ? _d : null;
                            clientName = (_f = (_e = data.client_name) !== null && _e !== void 0 ? _e : data.contact_name) !== null && _f !== void 0 ? _f : 'Valued Client';
                            contractNumber = (_g = data.contract_number) !== null && _g !== void 0 ? _g : id;
                            frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                            contractUrl = "".concat(frontendUrl, "/client-portal/contracts/").concat(id);
                            return [4 /*yield*/, this.smsNotifications.trySend(clientPhone, "DoVenue Suite: Hi ".concat(clientName, ", your contract ").concat(contractNumber, " has been counter-signed by your venue coordinator. View your fully executed contract: ").concat(contractUrl))];
                        case 3:
                            _h.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            _b = _h.sent();
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/, data];
                    }
                });
            });
        };
        /** Fetch all contracts for a vendor (identified by their user_id). Uses admin client to bypass RLS. */
        ContractsService_1.prototype.findByVendorUser = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, vendorAccount, _a, data, error;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('vendor_accounts')
                                    .select('id')
                                    .eq('user_id', userId)
                                    .single()];
                        case 1:
                            vendorAccount = (_b.sent()).data;
                            if (!vendorAccount)
                                return [2 /*return*/, []];
                            return [4 /*yield*/, admin
                                    .from('contracts')
                                    .select('*')
                                    .eq('vendor_account_id', vendorAccount.id)
                                    .order('created_at', { ascending: false })];
                        case 2:
                            _a = _b.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data || []];
                    }
                });
            });
        };
        /** Vendor signs a contract (verifies vendor ownership before updating). */
        ContractsService_1.prototype.signContractAsVendor = function (userId, contractId, signatureData, signerName) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, vendorAccount, contract, _a, data, error, ownerUser, _b;
                var _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('vendor_accounts')
                                    .select('id')
                                    .eq('user_id', userId)
                                    .single()];
                        case 1:
                            vendorAccount = (_e.sent()).data;
                            if (!vendorAccount)
                                throw new Error('Vendor account not found');
                            return [4 /*yield*/, admin
                                    .from('contracts')
                                    .select('id, vendor_account_id, contract_number, owner_id')
                                    .eq('id', contractId)
                                    .single()];
                        case 2:
                            contract = (_e.sent()).data;
                            if (!contract || contract.vendor_account_id !== vendorAccount.id) {
                                throw new Error('Contract not found or not accessible');
                            }
                            return [4 /*yield*/, admin
                                    .from('contracts')
                                    .update({
                                    signature_data: signatureData,
                                    signer_name: signerName,
                                    signed_date: new Date().toISOString(),
                                    status: 'signed',
                                })
                                    .eq('id', contractId)
                                    .select()
                                    .single()];
                        case 3:
                            _a = _e.sent(), data = _a.data, error = _a.error;
                            if (error)
                                throw error;
                            _e.label = 4;
                        case 4:
                            _e.trys.push([4, 7, , 8]);
                            return [4 /*yield*/, admin
                                    .from('users')
                                    .select('phone_number')
                                    .eq('id', data.owner_id)
                                    .single()];
                        case 5:
                            ownerUser = (_e.sent()).data;
                            return [4 /*yield*/, this.smsNotifications.contractSigned((_c = ownerUser === null || ownerUser === void 0 ? void 0 : ownerUser.phone_number) !== null && _c !== void 0 ? _c : null, signerName, (_d = data.contract_number) !== null && _d !== void 0 ? _d : contractId)];
                        case 6:
                            _e.sent();
                            return [3 /*break*/, 8];
                        case 7:
                            _b = _e.sent();
                            return [3 /*break*/, 8];
                        case 8: return [2 /*return*/, data];
                    }
                });
            });
        };
        /** Vendor sends a contract to the client or back to the owner for review. */
        ContractsService_1.prototype.sendContractAsVendor = function (userId, contractId, sendTo) {
            return __awaiter(this, void 0, void 0, function () {
                var admin, vendorAccount, contract, frontendUrl, contractNumber, clientEmail, clientName, form, contractUrl, clientPhone, _a, ownerUser, ownerName, contractUrl, updates, _b, data, error;
                var _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
                return __generator(this, function (_t) {
                    switch (_t.label) {
                        case 0:
                            admin = this.supabaseService.getAdminClient();
                            return [4 /*yield*/, admin
                                    .from('vendor_accounts')
                                    .select('id, business_name')
                                    .eq('user_id', userId)
                                    .single()];
                        case 1:
                            vendorAccount = (_t.sent()).data;
                            if (!vendorAccount)
                                throw new Error('Vendor account not found');
                            return [4 /*yield*/, admin
                                    .from('contracts')
                                    .select('*')
                                    .eq('id', contractId)
                                    .single()];
                        case 2:
                            contract = (_t.sent()).data;
                            if (!contract || contract.vendor_account_id !== vendorAccount.id) {
                                throw new Error('Contract not found or not accessible');
                            }
                            frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                            contractNumber = (_c = contract.contract_number) !== null && _c !== void 0 ? _c : contractId;
                            if (!(sendTo === 'client')) return [3 /*break*/, 10];
                            clientEmail = (_e = (_d = contract.client_email) !== null && _d !== void 0 ? _d : contract.contact_email) !== null && _e !== void 0 ? _e : null;
                            clientName = (_g = (_f = contract.client_name) !== null && _f !== void 0 ? _f : contract.contact_name) !== null && _g !== void 0 ? _g : 'Valued Client';
                            if (!(!clientEmail && contract.intake_form_id)) return [3 /*break*/, 4];
                            return [4 /*yield*/, admin
                                    .from('intake_forms')
                                    .select('contact_name, contact_email, contact_phone')
                                    .eq('id', contract.intake_form_id)
                                    .single()];
                        case 3:
                            form = (_t.sent()).data;
                            if (form) {
                                clientEmail = (_h = form.contact_email) !== null && _h !== void 0 ? _h : null;
                                clientName = (_j = form.contact_name) !== null && _j !== void 0 ? _j : clientName;
                            }
                            _t.label = 4;
                        case 4:
                            if (!clientEmail) return [3 /*break*/, 6];
                            contractUrl = "".concat(frontendUrl, "/client-portal/contracts/").concat(contractId);
                            return [4 /*yield*/, this.mailService.sendContractWithResend({
                                    clientName: clientName,
                                    clientEmail: clientEmail,
                                    ownerName: vendorAccount.business_name,
                                    contractNumber: contractNumber,
                                    contractTitle: (_k = contract.title) !== null && _k !== void 0 ? _k : 'Contract',
                                    contractDescription: (_l = contract.description) !== null && _l !== void 0 ? _l : undefined,
                                    contractUrl: contractUrl,
                                }).catch(function () { })];
                        case 5:
                            _t.sent();
                            _t.label = 6;
                        case 6:
                            _t.trys.push([6, 8, , 9]);
                            clientPhone = (_o = (_m = contract.client_phone) !== null && _m !== void 0 ? _m : contract.contact_phone) !== null && _o !== void 0 ? _o : null;
                            return [4 /*yield*/, this.smsNotifications.contractSent(clientPhone, clientName, contractNumber)];
                        case 7:
                            _t.sent();
                            return [3 /*break*/, 9];
                        case 8:
                            _a = _t.sent();
                            return [3 /*break*/, 9];
                        case 9: return [3 /*break*/, 13];
                        case 10: return [4 /*yield*/, admin
                                .from('users')
                                .select('email, first_name, last_name')
                                .eq('id', contract.owner_id)
                                .single()];
                        case 11:
                            ownerUser = (_t.sent()).data;
                            if (!(ownerUser === null || ownerUser === void 0 ? void 0 : ownerUser.email)) return [3 /*break*/, 13];
                            ownerName = "".concat((_p = ownerUser.first_name) !== null && _p !== void 0 ? _p : '', " ").concat((_q = ownerUser.last_name) !== null && _q !== void 0 ? _q : '').trim() || 'Owner';
                            contractUrl = "".concat(frontendUrl, "/dashboard/contracts/").concat(contractId);
                            return [4 /*yield*/, this.mailService.sendContractWithResend({
                                    clientName: ownerName,
                                    clientEmail: ownerUser.email,
                                    ownerName: vendorAccount.business_name,
                                    contractNumber: contractNumber,
                                    contractTitle: (_r = contract.title) !== null && _r !== void 0 ? _r : 'Contract',
                                    contractDescription: (_s = contract.description) !== null && _s !== void 0 ? _s : undefined,
                                    contractUrl: contractUrl,
                                }).catch(function () { })];
                        case 12:
                            _t.sent();
                            _t.label = 13;
                        case 13:
                            updates = {};
                            if (contract.status === 'draft') {
                                updates.status = 'sent';
                                updates.sent_date = new Date().toISOString();
                            }
                            if (!(Object.keys(updates).length > 0)) return [3 /*break*/, 15];
                            return [4 /*yield*/, admin
                                    .from('contracts')
                                    .update(updates)
                                    .eq('id', contractId)
                                    .select()
                                    .single()];
                        case 14:
                            _b = _t.sent(), data = _b.data, error = _b.error;
                            if (error)
                                throw error;
                            return [2 /*return*/, data];
                        case 15: return [2 /*return*/, contract];
                    }
                });
            });
        };
        ContractsService_1.prototype.delete = function (supabase, id) {
            return __awaiter(this, void 0, void 0, function () {
                var error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, supabase
                                .from('contracts')
                                .delete()
                                .eq('id', id)];
                        case 1:
                            error = (_a.sent()).error;
                            if (error)
                                throw error;
                            return [2 /*return*/];
                    }
                });
            });
        };
        return ContractsService_1;
    }());
    __setFunctionName(_classThis, "ContractsService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ContractsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ContractsService = _classThis;
}();
exports.ContractsService = ContractsService;
