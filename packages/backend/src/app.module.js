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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
var common_1 = require("@nestjs/common");
var config_1 = require("@nestjs/config");
var schedule_1 = require("@nestjs/schedule");
var app_controller_1 = require("./app.controller");
var app_service_1 = require("./app.service");
var supabase_module_1 = require("./supabase/supabase.module");
var auth_module_1 = require("./auth/auth.module");
var service_items_module_1 = require("./service-items/service-items.module");
var intake_forms_module_1 = require("./intake-forms/intake-forms.module");
var events_module_1 = require("./events/events.module");
var bookings_module_1 = require("./bookings/bookings.module");
var invoices_module_1 = require("./invoices/invoices.module");
var security_module_1 = require("./security/security.module");
var users_module_js_1 = require("./users/users.module.js");
var guest_lists_module_1 = require("./guest-lists/guest-lists.module");
var contracts_module_1 = require("./contracts/contracts.module");
var estimates_module_1 = require("./estimates/estimates.module");
var stripe_module_1 = require("./stripe/stripe.module");
var trial_module_1 = require("./trial/trial.module");
var vendors_module_1 = require("./vendors/vendors.module");
var upload_module_1 = require("./upload/upload.module");
var owner_module_1 = require("./owner/owner.module");
var admin_module_1 = require("./admin/admin.module");
var appointments_module_1 = require("./appointments/appointments.module");
var messaging_module_js_1 = require("./messaging/messaging.module.js");
var client_portal_module_1 = require("./client-portal/client-portal.module");
var vendor_invoices_module_1 = require("./vendor-invoices/vendor-invoices.module");
var affiliates_module_1 = require("./affiliates/affiliates.module");
var promoter_module_1 = require("./promoter/promoter.module");
var artists_module_1 = require("./artists/artists.module");
var artist_invoices_module_1 = require("./artist-invoices/artist-invoices.module");
var artist_bookings_module_1 = require("./artist-bookings/artist-bookings.module");
var promoter_invoices_module_1 = require("./promoter-invoices/promoter-invoices.module");
var promoter_bookings_module_1 = require("./promoter-bookings/promoter-bookings.module");
var promoter_events_module_1 = require("./promoter-events/promoter-events.module");
var team_module_1 = require("./team/team.module");
var reminders_module_1 = require("./reminders/reminders.module");
var audit_module_1 = require("./audit/audit.module");
var rsvp_module_1 = require("./rsvp/rsvp.module");
var AppModule = function () {
    var _classDecorators = [(0, common_1.Module)({
            imports: [
                config_1.ConfigModule.forRoot({
                    isGlobal: true,
                }),
                schedule_1.ScheduleModule.forRoot(),
                supabase_module_1.SupabaseModule,
                auth_module_1.AuthModule,
                service_items_module_1.ServiceItemsModule,
                intake_forms_module_1.IntakeFormsModule,
                events_module_1.EventsModule,
                bookings_module_1.BookingsModule,
                invoices_module_1.InvoicesModule,
                guest_lists_module_1.GuestListsModule,
                contracts_module_1.ContractsModule,
                estimates_module_1.EstimatesModule,
                stripe_module_1.StripeModule,
                trial_module_1.TrialModule,
                vendors_module_1.VendorsModule,
                upload_module_1.UploadModule,
                owner_module_1.OwnerModule,
                admin_module_1.AdminModule,
                appointments_module_1.AppointmentsModule,
                security_module_1.SecurityModule,
                users_module_js_1.UsersModule,
                messaging_module_js_1.MessagingModule,
                client_portal_module_1.ClientPortalModule,
                vendor_invoices_module_1.VendorInvoicesModule,
                affiliates_module_1.AffiliatesModule,
                promoter_module_1.PromoterModule,
                artists_module_1.ArtistsModule,
                artist_invoices_module_1.ArtistInvoicesModule,
                artist_bookings_module_1.ArtistBookingsModule,
                promoter_invoices_module_1.PromoterInvoicesModule,
                promoter_bookings_module_1.PromoterBookingsModule,
                promoter_events_module_1.PromoterEventsModule,
                team_module_1.TeamModule,
                reminders_module_1.RemindersModule,
                audit_module_1.AuditModule,
                rsvp_module_1.RsvpModule,
            ],
            controllers: [app_controller_1.AppController],
            providers: [app_service_1.AppService],
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AppModule = _classThis = /** @class */ (function () {
        function AppModule_1() {
        }
        return AppModule_1;
    }());
    __setFunctionName(_classThis, "AppModule");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AppModule = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AppModule = _classThis;
}();
exports.AppModule = AppModule;
