"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationType = exports.EstimateStatus = exports.DiscountType = exports.ServiceItemCategory = exports.InvoiceStatus = exports.ItemType = exports.InsuranceStatus = exports.ContractStatus = exports.PaymentStatus = exports.EventType = exports.ClientStatus = exports.BookingStatus = exports.EventStatus = exports.UserRole = void 0;
// Enums
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["ARTIST"] = "artist";
    UserRole["ASSOCIATE"] = "associate";
    UserRole["CUSTOMER"] = "customer";
    UserRole["OWNER"] = "owner";
    UserRole["PLANNER"] = "planner";
    UserRole["PROMOTER"] = "promoter";
    UserRole["VENDOR"] = "vendor";
})(UserRole || (exports.UserRole = UserRole = {}));
var EventStatus;
(function (EventStatus) {
    EventStatus["DRAFT"] = "draft";
    EventStatus["SCHEDULED"] = "scheduled";
    EventStatus["COMPLETED"] = "completed";
})(EventStatus || (exports.EventStatus = EventStatus = {}));
var BookingStatus;
(function (BookingStatus) {
    BookingStatus["PENDING"] = "pending";
    BookingStatus["CONFIRMED"] = "confirmed";
    BookingStatus["CANCELLED"] = "cancelled";
})(BookingStatus || (exports.BookingStatus = BookingStatus = {}));
var ClientStatus;
(function (ClientStatus) {
    ClientStatus["CONTACTED_BY_PHONE"] = "contacted_by_phone";
    ClientStatus["WALKTHROUGH_COMPLETED"] = "walkthrough_completed";
    ClientStatus["BOOKED"] = "booked";
    ClientStatus["DEPOSIT_PAID"] = "deposit_paid";
    ClientStatus["COMPLETED"] = "completed";
    ClientStatus["CANCELLED"] = "cancelled";
})(ClientStatus || (exports.ClientStatus = ClientStatus = {}));
var EventType;
(function (EventType) {
    EventType["WEDDING_RECEPTION"] = "wedding_reception";
    EventType["BIRTHDAY_PARTY"] = "birthday_party";
    EventType["RETIREMENT"] = "retirement";
    EventType["ANNIVERSARY"] = "anniversary";
    EventType["BABY_SHOWER"] = "baby_shower";
    EventType["CORPORATE_EVENT"] = "corporate_event";
    EventType["FUNDRAISER_GALA"] = "fundraiser_gala";
    EventType["CONCERT_SHOW"] = "concert_show";
    EventType["CONFERENCE_MEETING"] = "conference_meeting";
    EventType["WORKSHOP"] = "workshop";
    EventType["QUINCEANERA"] = "quinceanera";
    EventType["SWEET_16"] = "sweet_16";
    EventType["PROM_FORMAL"] = "prom_formal";
    EventType["FAMILY_REUNION"] = "family_reunion";
    EventType["MEMORIAL_SERVICE"] = "memorial_service";
    EventType["PRODUCT_LAUNCH"] = "product_launch";
    EventType["HOLIDAY_PARTY"] = "holiday_party";
    EventType["ENGAGEMENT_PARTY"] = "engagement_party";
    EventType["GRADUATION_PARTY"] = "graduation_party";
})(EventType || (exports.EventType = EventType = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["PAID"] = "paid";
    PaymentStatus["REFUNDED"] = "refunded";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var ContractStatus;
(function (ContractStatus) {
    ContractStatus["DRAFT"] = "draft";
    ContractStatus["SENT"] = "sent";
    ContractStatus["SIGNED"] = "signed";
    ContractStatus["CANCELLED"] = "cancelled";
})(ContractStatus || (exports.ContractStatus = ContractStatus = {}));
var InsuranceStatus;
(function (InsuranceStatus) {
    InsuranceStatus["NOT_REQUIRED"] = "not_required";
    InsuranceStatus["REQUESTED"] = "requested";
    InsuranceStatus["RECEIVED"] = "received";
    InsuranceStatus["VERIFIED"] = "verified";
    InsuranceStatus["EXPIRED"] = "expired";
})(InsuranceStatus || (exports.InsuranceStatus = InsuranceStatus = {}));
var ItemType;
(function (ItemType) {
    ItemType["SETUP"] = "setup";
    ItemType["CATERING"] = "catering";
    ItemType["ENTERTAINMENT"] = "entertainment";
})(ItemType || (exports.ItemType = ItemType = {}));
var InvoiceStatus;
(function (InvoiceStatus) {
    InvoiceStatus["DRAFT"] = "draft";
    InvoiceStatus["SENT"] = "sent";
    InvoiceStatus["PARTIAL"] = "partial";
    InvoiceStatus["PAID"] = "paid";
    InvoiceStatus["OVERDUE"] = "overdue";
    InvoiceStatus["CANCELLED"] = "cancelled";
})(InvoiceStatus || (exports.InvoiceStatus = InvoiceStatus = {}));
var ServiceItemCategory;
(function (ServiceItemCategory) {
    ServiceItemCategory["FACILITY_RENTAL"] = "facility_rental";
    ServiceItemCategory["SECURITY_DEPOSIT"] = "security_deposit";
    ServiceItemCategory["SOUND_SYSTEM"] = "sound_system";
    ServiceItemCategory["AV_EQUIPMENT"] = "av_equipment";
    ServiceItemCategory["PLANNING_SERVICES"] = "planning_services";
    ServiceItemCategory["ADDITIONAL_TIME"] = "additional_time";
    ServiceItemCategory["HOSTING_SERVICES"] = "hosting_services";
    ServiceItemCategory["CATERING"] = "catering";
    ServiceItemCategory["BAR_SERVICES"] = "bar_services";
    ServiceItemCategory["SECURITY_SERVICES"] = "security_services";
    ServiceItemCategory["DECORATIONS"] = "decorations";
    ServiceItemCategory["SALES_TAX"] = "sales_tax";
    ServiceItemCategory["ITEMS"] = "items";
    ServiceItemCategory["MISC"] = "misc";
})(ServiceItemCategory || (exports.ServiceItemCategory = ServiceItemCategory = {}));
var DiscountType;
(function (DiscountType) {
    DiscountType["NONE"] = "none";
    DiscountType["PERCENTAGE"] = "percentage";
    DiscountType["FIXED"] = "fixed";
})(DiscountType || (exports.DiscountType = DiscountType = {}));
// Estimate
var EstimateStatus;
(function (EstimateStatus) {
    EstimateStatus["DRAFT"] = "draft";
    EstimateStatus["SENT"] = "sent";
    EstimateStatus["APPROVED"] = "approved";
    EstimateStatus["REJECTED"] = "rejected";
    EstimateStatus["EXPIRED"] = "expired";
    EstimateStatus["CONVERTED"] = "converted";
})(EstimateStatus || (exports.EstimateStatus = EstimateStatus = {}));
// Notification Types
var NotificationType;
(function (NotificationType) {
    NotificationType["EVENT_UPCOMING"] = "event_upcoming";
    NotificationType["EVENT_TODAY"] = "event_today";
    NotificationType["NEW_CLIENT"] = "new_client";
    NotificationType["NEW_BOOKING"] = "new_booking";
    NotificationType["PAYMENT_RECEIVED"] = "payment_received";
    NotificationType["PAYMENT_OVERDUE"] = "payment_overdue";
    NotificationType["CONTRACT_SIGNED"] = "contract_signed";
    NotificationType["CONTRACT_SENT"] = "contract_sent";
    NotificationType["MESSAGE_RECEIVED"] = "message_received";
    NotificationType["INVOICE_OVERDUE"] = "invoice_overdue";
    NotificationType["GUEST_LIST_UPDATE"] = "guest_list_update";
    NotificationType["SYSTEM"] = "system";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
