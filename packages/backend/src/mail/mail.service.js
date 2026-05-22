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
exports.MailService = void 0;
var common_1 = require("@nestjs/common");
var nodemailer = require("nodemailer");
var resend_1 = require("resend");
var MailService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var MailService = _classThis = /** @class */ (function () {
        function MailService_1() {
            // Configure email transporter
            // In development, you can use a service like Ethereal Email for testing
            // In production, use a real SMTP service (Gmail, SendGrid, AWS SES, etc.)
            var port = parseInt(process.env.SMTP_PORT || '587');
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.ethereal.email',
                port: port,
                secure: port === 465, // true for SSL (465), false for STARTTLS (587)
                auth: {
                    user: process.env.SMTP_USER || '',
                    pass: process.env.SMTP_PASS || '',
                },
            });
        }
        MailService_1.prototype.sendContractNotification = function (contract, client, owner) {
            return __awaiter(this, void 0, void 0, function () {
                var contractUrl, mailOptions, info, error_1;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _d.trys.push([0, 2, , 3]);
                            contractUrl = "".concat(process.env.FRONTEND_URL || 'https://dovenuesuite.com', "/dashboard/contracts/").concat(contract.id);
                            mailOptions = {
                                from: "\"".concat(owner.firstName, " ").concat(owner.lastName, "\" <").concat(process.env.SMTP_FROM || 'noreply@dovenue.com', ">"),
                                to: client.email,
                                subject: "New Contract Ready for Signature - ".concat(contract.title),
                                html: "\n          <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n            <h2 style=\"color: #333;\">Contract Ready for Your Signature</h2>\n            \n            <p>Hello ".concat(client.firstName, ",</p>\n            \n            <p>").concat(owner.firstName, " ").concat(owner.lastName, " has sent you a contract to review and sign.</p>\n            \n            <div style=\"background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;\">\n              <h3 style=\"margin-top: 0; color: #555;\">Contract Details</h3>\n              <p><strong>Contract Number:</strong> ").concat(contract.contractNumber, "</p>\n              <p><strong>Title:</strong> ").concat(contract.title, "</p>\n              ").concat(contract.description ? "<p><strong>Description:</strong> ".concat(contract.description, "</p>") : '', "\n              <p><strong>Created:</strong> ").concat(new Date(contract.createdAt).toLocaleDateString(), "</p>\n            </div>\n            \n            ").concat(((_a = contract.booking) === null || _a === void 0 ? void 0 : _a.event) ? "\n              <div style=\"background-color: #e8f4f8; padding: 20px; margin: 20px 0; border-radius: 8px;\">\n                <h3 style=\"margin-top: 0; color: #555;\">Event Information</h3>\n                <p><strong>Event:</strong> ".concat(contract.booking.event.name, "</p>\n                ").concat(contract.booking.event.date ? "<p><strong>Date:</strong> ".concat(new Date(contract.booking.event.date).toLocaleDateString(), "</p>") : '', "\n                ").concat(contract.booking.event.startTime && contract.booking.event.endTime ? "<p><strong>Time:</strong> ".concat(contract.booking.event.startTime, " - ").concat(contract.booking.event.endTime, "</p>") : '', "\n                ").concat(contract.booking.event.venue ? "<p><strong>Venue:</strong> ".concat(contract.booking.event.venue, "</p>") : '', "\n              </div>\n            ") : '', "\n            \n            <p>Please review the contract and provide your electronic signature to proceed.</p>\n            \n            <div style=\"text-align: center; margin: 30px 0;\">\n              <a href=\"").concat(contractUrl, "\" \n                 style=\"background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;\">\n                View & Sign Contract\n              </a>\n            </div>\n            \n            <p style=\"color: #666; font-size: 14px;\">\n              If you have any questions about this contract, please contact ").concat(owner.firstName, " ").concat(owner.lastName, ".\n            </p>\n            \n            <hr style=\"border: none; border-top: 1px solid #ddd; margin: 30px 0;\">\n            \n            <p style=\"color: #999; font-size: 12px; text-align: center;\">\n              This is an automated email from DoVenueSuite. Please do not reply to this email.\n            </p>\n          </div>\n        "),
                                text: "\n          Contract Ready for Your Signature\n          \n          Hello ".concat(client.firstName, ",\n          \n          ").concat(owner.firstName, " ").concat(owner.lastName, " has sent you a contract to review and sign.\n          \n          Contract Details:\n          - Contract Number: ").concat(contract.contractNumber, "\n          - Title: ").concat(contract.title, "\n          ").concat(contract.description ? "- Description: ".concat(contract.description) : '', "\n          - Created: ").concat(new Date(contract.createdAt).toLocaleDateString(), "\n          \n          ").concat(((_b = contract.booking) === null || _b === void 0 ? void 0 : _b.event) ? "\n          Event Information:\n          - Event: ".concat(contract.booking.event.name, "\n          ").concat(contract.booking.event.date ? "- Date: ".concat(new Date(contract.booking.event.date).toLocaleDateString()) : '', "\n          ").concat(contract.booking.event.startTime && contract.booking.event.endTime ? "- Time: ".concat(contract.booking.event.startTime, " - ").concat(contract.booking.event.endTime) : '', "\n          ").concat(contract.booking.event.venue ? "- Venue: ".concat(contract.booking.event.venue) : '', "\n          ") : '', "\n          \n          Please review the contract and provide your electronic signature to proceed.\n          \n          View and sign the contract here: ").concat(contractUrl, "\n          \n          If you have any questions about this contract, please contact ").concat(owner.firstName, " ").concat(owner.lastName, ".\n        "),
                            };
                            return [4 /*yield*/, this.transporter.sendMail(mailOptions)];
                        case 1:
                            info = _d.sent();
                            console.log('Contract notification sent:', info.messageId);
                            // In development with Ethereal Email, log the preview URL
                            if (process.env.NODE_ENV !== 'production' && ((_c = process.env.SMTP_HOST) === null || _c === void 0 ? void 0 : _c.includes('ethereal'))) {
                                console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
                            }
                            return [3 /*break*/, 3];
                        case 2:
                            error_1 = _d.sent();
                            console.error('Failed to send contract notification email:', error_1);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Send a client intake-form invitation email.
         * The link directs the client to the invite page where they confirm their event via SMS OTP.
         */
        MailService_1.prototype.sendClientInvitation = function (params) {
            return __awaiter(this, void 0, void 0, function () {
                var frontendUrl, inviteUrl, formattedDate, mailOptions, info, nodemailer_1, error_2;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 4, , 5]);
                            frontendUrl = process.env.FRONTEND_URL || 'https://dovenuesuite.com';
                            inviteUrl = "".concat(frontendUrl, "/invite?token=").concat(params.inviteToken);
                            formattedDate = params.eventDate
                                ? new Date(params.eventDate + 'T12:00:00').toLocaleDateString('en-US', {
                                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                                })
                                : 'TBD';
                            mailOptions = {
                                from: "\"DoVenue Suites\" <".concat(process.env.SMTP_FROM || 'noreply@dovenue.com', ">"),
                                to: params.clientEmail,
                                subject: "You're Invited \u2013 Confirm Your Event at DoVenue Suites",
                                html: "\n          <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 32px 16px;\">\n            <div style=\"background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08);\">\n              <div style=\"background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 32px 32px 24px; text-align: center;\">\n                <h1 style=\"color: white; margin: 0; font-size: 26px; font-weight: 700;\">DoVenue Suites</h1>\n                <p style=\"color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;\">Client Portal Invitation</p>\n              </div>\n\n              <div style=\"padding: 32px;\">\n                <p style=\"color: #374151; font-size: 16px; margin-bottom: 8px;\">Hello <strong>".concat(params.clientName, "</strong>,</p>\n                <p style=\"color: #374151; font-size: 15px; line-height: 1.6;\">\n                  ").concat(params.ownerName ? "<strong>".concat(params.ownerName, "</strong> has") : 'Your event planner has', " submitted your event details and is requesting your confirmation.\n                  Please review the information below and confirm your event.\n                </p>\n\n                <div style=\"background: #f0f4ff; border-left: 4px solid #2563eb; border-radius: 8px; padding: 20px 24px; margin: 24px 0;\">\n                  <h3 style=\"margin: 0 0 12px; color: #1e3a5f; font-size: 16px;\">Event Details</h3>\n                  <table style=\"width: 100%; border-collapse: collapse; font-size: 14px; color: #374151;\">\n                    <tr><td style=\"padding: 4px 0; color: #6b7280; width: 110px;\">Event Type</td><td style=\"padding: 4px 0; font-weight: 600;\">").concat(params.eventType, "</td></tr>\n                    <tr><td style=\"padding: 4px 0; color: #6b7280;\">Date</td><td style=\"padding: 4px 0; font-weight: 600;\">").concat(formattedDate, "</td></tr>\n                    ").concat(params.eventTime ? "<tr><td style=\"padding: 4px 0; color: #6b7280;\">Time</td><td style=\"padding: 4px 0; font-weight: 600;\">".concat(params.eventTime, "</td></tr>") : '', "\n                    ").concat(params.guestCount ? "<tr><td style=\"padding: 4px 0; color: #6b7280;\">Guests</td><td style=\"padding: 4px 0; font-weight: 600;\">".concat(params.guestCount, "</td></tr>") : '', "\n                  </table>\n                </div>\n\n                <p style=\"color: #374151; font-size: 14px; line-height: 1.6;\">\n                  Click the button below to confirm your event. You will be asked to verify your identity via a text message sent to your phone number on file.\n                </p>\n\n                <div style=\"text-align: center; margin: 32px 0;\">\n                  <a href=\"").concat(inviteUrl, "\"\n                     style=\"display: inline-block; background: #2563eb; color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; letter-spacing: 0.3px;\">\n                    Confirm My Event\n                  </a>\n                </div>\n\n                <p style=\"color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;\">\n                  If you did not expect this email, please disregard it. This link is unique to you.\n                </p>\n              </div>\n            </div>\n          </div>\n        "),
                                text: "Hello ".concat(params.clientName, ",\n\nYou have been invited to confirm your event at DoVenue Suites.\n\nEvent: ").concat(params.eventType, "\nDate: ").concat(formattedDate).concat(params.eventTime ? "\nTime: ".concat(params.eventTime) : '', "\n\nConfirm here: ").concat(inviteUrl, "\n\nDoVenue Suites"),
                            };
                            return [4 /*yield*/, this.transporter.sendMail(mailOptions)];
                        case 1:
                            info = _b.sent();
                            console.log('Client invitation sent:', info.messageId);
                            if (!(process.env.NODE_ENV !== 'production' && ((_a = process.env.SMTP_HOST) === null || _a === void 0 ? void 0 : _a.includes('ethereal')))) return [3 /*break*/, 3];
                            return [4 /*yield*/, Promise.resolve().then(function () { return require('nodemailer'); })];
                        case 2:
                            nodemailer_1 = _b.sent();
                            console.log('[DEV] Invite email preview URL:', nodemailer_1.getTestMessageUrl(info));
                            _b.label = 3;
                        case 3: return [3 /*break*/, 5];
                        case 4:
                            error_2 = _b.sent();
                            console.error('Failed to send client invitation email:', error_2);
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        MailService_1.prototype.sendInvoiceCreated = function (params) {
            return __awaiter(this, void 0, void 0, function () {
                var formattedAmount, formattedDue, mailOptions, info, error_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            formattedAmount = "$".concat(Number(params.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                            formattedDue = new Date(params.dueDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
                            mailOptions = {
                                from: "\"DoVenue Suites\" <".concat(process.env.SMTP_FROM || 'noreply@dovenue.com', ">"),
                                to: params.clientEmail,
                                subject: "Invoice ".concat(params.invoiceNumber, " is Ready \u2013 View & Pay Online"),
                                html: "\n          <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 32px 16px;\">\n            <div style=\"background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08);\">\n              <div style=\"background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 32px 32px 24px; text-align: center;\">\n                <h1 style=\"color: white; margin: 0; font-size: 26px; font-weight: 700;\">DoVenue Suites</h1>\n                <p style=\"color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;\">Invoice Ready</p>\n              </div>\n              <div style=\"padding: 32px;\">\n                <p style=\"color: #374151; font-size: 16px; margin-bottom: 8px;\">Hi <strong>".concat(params.clientName, "</strong>,</p>\n                <p style=\"color: #374151; font-size: 15px; line-height: 1.6;\">Your invoice is ready. Please review the details below and make your payment at your earliest convenience.</p>\n\n                <div style=\"background: #f0f4ff; border-left: 4px solid #2563eb; border-radius: 8px; padding: 20px 24px; margin: 24px 0;\">\n                  <table style=\"width: 100%; border-collapse: collapse; font-size: 14px; color: #374151;\">\n                    <tr><td style=\"padding: 6px 0; color: #6b7280; width: 130px;\">Invoice #</td><td style=\"padding: 6px 0; font-weight: 600;\">").concat(params.invoiceNumber, "</td></tr>\n                    <tr><td style=\"padding: 6px 0; color: #6b7280;\">Amount Due</td><td style=\"padding: 6px 0; font-weight: 700; font-size: 18px; color: #2563eb;\">").concat(formattedAmount, "</td></tr>\n                    <tr><td style=\"padding: 6px 0; color: #6b7280;\">Due Date</td><td style=\"padding: 6px 0; font-weight: 600;\">").concat(formattedDue, "</td></tr>\n                  </table>\n                </div>\n\n                <div style=\"text-align: center; margin: 32px 0;\">\n                  <a href=\"").concat(params.invoiceUrl, "\"\n                     style=\"display: inline-block; background: #2563eb; color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; letter-spacing: 0.3px;\">\n                    View &amp; Pay Invoice\n                  </a>\n                </div>\n\n                <p style=\"color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;\">If you did not expect this invoice, please contact us directly.</p>\n              </div>\n            </div>\n          </div>\n        "),
                                text: "Hi ".concat(params.clientName, ",\n\nYour invoice ").concat(params.invoiceNumber, " for ").concat(formattedAmount, " is ready.\nDue: ").concat(formattedDue, "\n\nView and pay here: ").concat(params.invoiceUrl, "\n\nDoVenue Suites"),
                            };
                            return [4 /*yield*/, this.transporter.sendMail(mailOptions)];
                        case 1:
                            info = _a.sent();
                            console.log('Invoice created notification sent:', info.messageId);
                            return [3 /*break*/, 3];
                        case 2:
                            error_3 = _a.sent();
                            console.error('Failed to send invoice created email:', error_3);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        MailService_1.prototype.sendContractSignedNotification = function (contract, client, owner) {
            return __awaiter(this, void 0, void 0, function () {
                var contractUrl, mailOptions, info, error_4;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            contractUrl = "".concat(process.env.FRONTEND_URL || 'https://dovenuesuite.com', "/dashboard/contracts/").concat(contract.id);
                            mailOptions = {
                                from: "\"DoVenueSuite\" <".concat(process.env.SMTP_FROM || 'noreply@dovenue.com', ">"),
                                to: owner.email,
                                subject: "Contract Signed - ".concat(contract.title),
                                html: "\n          <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n            <h2 style=\"color: #333;\">Contract Has Been Signed</h2>\n            \n            <p>Hello ".concat(owner.firstName, ",</p>\n            \n            <p>").concat(client.firstName, " ").concat(client.lastName, " has signed the contract \"").concat(contract.title, "\".</p>\n            \n            <div style=\"background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;\">\n              <h3 style=\"margin-top: 0; color: #555;\">Contract Details</h3>\n              <p><strong>Contract Number:</strong> ").concat(contract.contractNumber, "</p>\n              <p><strong>Title:</strong> ").concat(contract.title, "</p>\n              <p><strong>Client:</strong> ").concat(client.firstName, " ").concat(client.lastName, "</p>\n              <p><strong>Signed Date:</strong> ").concat(new Date(contract.signedDate || new Date()).toLocaleString(), "</p>\n              ").concat(contract.signerName ? "<p><strong>Signed By:</strong> ".concat(contract.signerName, "</p>") : '', "\n            </div>\n            \n            <div style=\"text-align: center; margin: 30px 0;\">\n              <a href=\"").concat(contractUrl, "\" \n                 style=\"background-color: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;\">\n                View Contract\n              </a>\n            </div>\n            \n            <hr style=\"border: none; border-top: 1px solid #ddd; margin: 30px 0;\">\n            \n            <p style=\"color: #999; font-size: 12px; text-align: center;\">\n              This is an automated email from DoVenueSuite. Please do not reply to this email.\n            </p>\n          </div>\n        "),
                            };
                            return [4 /*yield*/, this.transporter.sendMail(mailOptions)];
                        case 1:
                            info = _a.sent();
                            console.log('Contract signed notification sent:', info.messageId);
                            return [3 /*break*/, 3];
                        case 2:
                            error_4 = _a.sent();
                            console.error('Failed to send contract signed notification email:', error_4);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Send a contract-ready-for-signature email using Resend.
         * Called whenever an owner marks a contract as "sent" to the client.
         */
        MailService_1.prototype.sendContractWithResend = function (params) {
            return __awaiter(this, void 0, void 0, function () {
                var resend, formattedDate, eventBlock, html, error_5;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!process.env.RESEND_API_KEY) {
                                console.warn('[MailService] RESEND_API_KEY not set — skipping Resend contract email');
                                return [2 /*return*/];
                            }
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            resend = new resend_1.Resend(process.env.RESEND_API_KEY);
                            formattedDate = params.eventDate
                                ? new Date(params.eventDate + 'T12:00:00').toLocaleDateString('en-US', {
                                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                                })
                                : null;
                            eventBlock = (params.eventName || formattedDate || params.eventVenue)
                                ? "\n          <div style=\"background:#e8f4f8;border-left:4px solid #2563eb;border-radius:8px;padding:20px 24px;margin:20px 0;\">\n            <h3 style=\"margin:0 0 12px;color:#1e3a5f;font-size:15px;\">Event Information</h3>\n            <table style=\"width:100%;border-collapse:collapse;font-size:14px;color:#374151;\">\n              ".concat(params.eventName ? "<tr><td style=\"padding:4px 0;color:#6b7280;width:80px;\">Event</td><td style=\"padding:4px 0;font-weight:600;\">".concat(params.eventName, "</td></tr>") : '', "\n              ").concat(formattedDate ? "<tr><td style=\"padding:4px 0;color:#6b7280;\">Date</td><td style=\"padding:4px 0;font-weight:600;\">".concat(formattedDate, "</td></tr>") : '', "\n              ").concat(params.eventVenue ? "<tr><td style=\"padding:4px 0;color:#6b7280;\">Venue</td><td style=\"padding:4px 0;font-weight:600;\">".concat(params.eventVenue, "</td></tr>") : '', "\n            </table>\n          </div>")
                                : '';
                            html = "\n        <div style=\"font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:32px 16px;\">\n          <div style=\"background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);\">\n            <div style=\"background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:32px;text-align:center;\">\n              <h1 style=\"color:white;margin:0;font-size:24px;font-weight:700;\">DoVenue Suites</h1>\n              <p style=\"color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;\">Contract Ready for Your Signature</p>\n            </div>\n            <div style=\"padding:32px;\">\n              <p style=\"color:#374151;font-size:16px;margin:0 0 8px;\">Hello <strong>".concat(params.clientName, "</strong>,</p>\n              <p style=\"color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px;\">\n                <strong>").concat(params.ownerName, "</strong> has sent you a contract to review and sign.\n              </p>\n              <div style=\"background:#f0f4ff;border-left:4px solid #2563eb;border-radius:8px;padding:20px 24px;margin:0 0 20px;\">\n                <h3 style=\"margin:0 0 12px;color:#1e3a5f;font-size:15px;\">Contract Details</h3>\n                <table style=\"width:100%;border-collapse:collapse;font-size:14px;color:#374151;\">\n                  <tr><td style=\"padding:4px 0;color:#6b7280;width:140px;\">Contract Number</td><td style=\"padding:4px 0;font-weight:600;\">").concat(params.contractNumber, "</td></tr>\n                  <tr><td style=\"padding:4px 0;color:#6b7280;\">Title</td><td style=\"padding:4px 0;font-weight:600;\">").concat(params.contractTitle, "</td></tr>\n                  ").concat(params.contractDescription ? "<tr><td style=\"padding:4px 0;color:#6b7280;\">Description</td><td style=\"padding:4px 0;\">".concat(params.contractDescription, "</td></tr>") : '', "\n                </table>\n              </div>\n              ").concat(eventBlock, "\n              <p style=\"color:#374151;font-size:14px;line-height:1.6;\">\n                Please review the contract carefully and provide your electronic signature to proceed.\n              </p>\n              <div style=\"text-align:center;margin:28px 0;\">\n                <a href=\"").concat(params.contractUrl, "\"\n                   style=\"display:inline-block;background:#2563eb;color:white;padding:14px 40px;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;letter-spacing:0.3px;\">\n                  View &amp; Sign Contract\n                </a>\n              </div>\n              <p style=\"color:#6b7280;font-size:13px;\">\n                If you have any questions, please contact ").concat(params.ownerName, ".\n              </p>\n              <hr style=\"border:none;border-top:1px solid #e5e7eb;margin:24px 0;\">\n              <p style=\"color:#9ca3af;font-size:12px;text-align:center;margin:0;\">\n                This is an automated message from DoVenue Suites. Please do not reply to this email.\n              </p>\n            </div>\n          </div>\n        </div>\n      ");
                            return [4 /*yield*/, resend.emails.send({
                                    from: "DoVenue Suites <noreply@dovenue.com>",
                                    to: params.clientEmail,
                                    subject: "Contract Ready for Signature \u2013 ".concat(params.contractNumber),
                                    html: html,
                                })];
                        case 2:
                            _a.sent();
                            console.log('[MailService] Resend contract email sent to', params.clientEmail);
                            return [3 /*break*/, 4];
                        case 3:
                            error_5 = _a.sent();
                            console.error('[MailService] Resend contract email failed:', error_5);
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        /** Send a team associate invitation email */
        MailService_1.prototype.sendTeamInvitation = function (params) {
            return __awaiter(this, void 0, void 0, function () {
                var mailOptions, error_6;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            mailOptions = {
                                from: "\"DoVenueSuite\" <".concat(process.env.SMTP_FROM || 'noreply@dovenue.com', ">"),
                                to: params.toEmail,
                                subject: "You've been invited to join ".concat(params.businessName, " on DoVenueSuite"),
                                html: "\n          <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">\n            <h2 style=\"color: #333;\">You're Invited!</h2>\n            <p>".concat(params.ownerName, " has invited you to join <strong>").concat(params.businessName, "</strong> as an associate on DoVenueSuite.</p>\n            <p>As an associate, you'll be able to view events, clients, calendars, and more.</p>\n            <div style=\"text-align: center; margin: 30px 0;\">\n              <a href=\"").concat(params.inviteUrl, "\"\n                 style=\"background-color: #6366f1; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 16px;\">\n                Accept Invitation\n              </a>\n            </div>\n            <p style=\"color: #666; font-size: 14px;\">This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.</p>\n            <hr style=\"border: none; border-top: 1px solid #ddd; margin: 30px 0;\">\n            <p style=\"color: #999; font-size: 12px; text-align: center;\">DoVenueSuite \u2013 Venue Management Made Simple</p>\n          </div>\n        "),
                            };
                            return [4 /*yield*/, this.transporter.sendMail(mailOptions)];
                        case 1:
                            _a.sent();
                            console.log('[MailService] Team invite sent to', params.toEmail);
                            return [3 /*break*/, 3];
                        case 2:
                            error_6 = _a.sent();
                            console.error('[MailService] Team invite email failed:', error_6);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        MailService_1.prototype.sendReminderEmail = function (params) {
            return __awaiter(this, void 0, void 0, function () {
                var htmlBody, mailOptions, error_7;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            htmlBody = params.body.replace(/\n/g, '<br>');
                            mailOptions = {
                                from: "\"DoVenueSuite\" <".concat(process.env.SMTP_FROM || 'noreply@dovenue.com', ">"),
                                to: params.toEmail,
                                subject: params.subject,
                                html: "\n        <div style=\"font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937;\">\n          <p>Hi ".concat(params.toName, ",</p>\n          <p>").concat(htmlBody, "</p>\n          <p style=\"margin-top:32px;color:#6b7280;font-size:13px;\">\u2014 The DoVenueSuite Team</p>\n        </div>\n      "),
                            };
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.transporter.sendMail(mailOptions)];
                        case 2:
                            _a.sent();
                            console.log('[MailService] Reminder sent to', params.toEmail, '—', params.subject);
                            return [3 /*break*/, 4];
                        case 3:
                            error_7 = _a.sent();
                            console.error('[MailService] Reminder email failed:', error_7);
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Sends a confirmation email to a customer who just purchased event tickets.
         * Triggered from the Stripe webhook after `checkout.session.completed`.
         */
        MailService_1.prototype.sendTicketConfirmation = function (params) {
            return __awaiter(this, void 0, void 0, function () {
                var frontendUrl, eventUrl, formattedDate, isFree, amountStr, fromName, mailOptions, info, error_8;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            frontendUrl = process.env.FRONTEND_URL || 'https://dovenuesuite.com';
                            eventUrl = "".concat(frontendUrl, "/events/").concat(params.eventId);
                            formattedDate = params.eventDate
                                ? new Date(params.eventDate + (params.eventDate.includes('T') ? '' : 'T12:00:00'))
                                    .toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                                : 'TBD';
                            isFree = params.amountTotal === 0;
                            amountStr = isFree ? 'Free' : "$".concat(params.amountTotal.toFixed(2));
                            fromName = params.promoterName ? "".concat(params.promoterName, " via DoVenue") : 'DoVenue Tickets';
                            mailOptions = {
                                from: "\"".concat(fromName, "\" <").concat(process.env.SMTP_FROM || 'noreply@dovenue.com', ">"),
                                to: params.toEmail,
                                subject: "Your tickets to ".concat(params.eventTitle, " are confirmed"),
                                html: "\n          <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 32px 16px;\">\n            <div style=\"background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08);\">\n              <div style=\"background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 32px; text-align: center;\">\n                <h1 style=\"color: white; margin: 0; font-size: 26px; font-weight: 700;\">You're going!</h1>\n                <p style=\"color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 15px;\">Your tickets are confirmed</p>\n              </div>\n              <div style=\"padding: 32px;\">\n                <h2 style=\"margin: 0 0 16px; color: #1f2937; font-size: 20px;\">".concat(params.eventTitle, "</h2>\n                <div style=\"background: #f5f3ff; border-left: 4px solid #7c3aed; border-radius: 8px; padding: 20px 24px; margin: 0 0 24px;\">\n                  <table style=\"width: 100%; border-collapse: collapse; font-size: 14px; color: #374151;\">\n                    <tr><td style=\"padding: 4px 0; color: #6b7280; width: 110px;\">Date</td><td style=\"padding: 4px 0; font-weight: 600;\">").concat(formattedDate, "</td></tr>\n                    ").concat(params.eventTime ? "<tr><td style=\"padding: 4px 0; color: #6b7280;\">Time</td><td style=\"padding: 4px 0; font-weight: 600;\">".concat(params.eventTime, "</td></tr>") : '', "\n                    ").concat(params.venueName ? "<tr><td style=\"padding: 4px 0; color: #6b7280;\">Venue</td><td style=\"padding: 4px 0; font-weight: 600;\">".concat(params.venueName, "</td></tr>") : '', "\n                    <tr><td style=\"padding: 4px 0; color: #6b7280;\">Ticket</td><td style=\"padding: 4px 0; font-weight: 600;\">").concat(params.tierName, "</td></tr>\n                    <tr><td style=\"padding: 4px 0; color: #6b7280;\">Quantity</td><td style=\"padding: 4px 0; font-weight: 600;\">").concat(params.quantity, "</td></tr>\n                    <tr><td style=\"padding: 4px 0; color: #6b7280;\">Total</td><td style=\"padding: 4px 0; font-weight: 700;\">").concat(amountStr, "</td></tr>\n                  </table>\n                </div>\n                <p style=\"color: #374151; font-size: 14px; line-height: 1.6;\">\n                  Save this email \u2014 you'll need it for entry. Show this confirmation (and a photo ID) at the door.\n                </p>\n                <div style=\"text-align: center; margin: 28px 0;\">\n                  <a href=\"").concat(eventUrl, "\"\n                     style=\"display: inline-block; background: #7c3aed; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;\">\n                    View Event Details\n                  </a>\n                </div>\n                <p style=\"color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;\">\n                  Questions? Reply to this email").concat(params.promoterName ? " and ".concat(params.promoterName, " will get back to you.") : '.', "\n                </p>\n              </div>\n            </div>\n          </div>\n        "),
                                text: "Your tickets are confirmed!\n\n".concat(params.eventTitle, "\nDate: ").concat(formattedDate).concat(params.eventTime ? "\nTime: ".concat(params.eventTime) : '').concat(params.venueName ? "\nVenue: ".concat(params.venueName) : '', "\nTicket: ").concat(params.tierName, "\nQuantity: ").concat(params.quantity, "\nTotal: ").concat(amountStr, "\n\nSave this email \u2014 you'll need it for entry.\n\nView event: ").concat(eventUrl),
                            };
                            return [4 /*yield*/, this.transporter.sendMail(mailOptions)];
                        case 1:
                            info = _a.sent();
                            console.log('[MailService] Ticket confirmation sent to', params.toEmail, '—', info.messageId);
                            return [3 /*break*/, 3];
                        case 2:
                            error_8 = _a.sent();
                            console.error('[MailService] Ticket confirmation email failed:', error_8);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        MailService_1.prototype.sendNewLeadNotification = function (params) {
            return __awaiter(this, void 0, void 0, function () {
                var ownerEmail, clientName, eventType, eventDate, clientEmail, clientPhone, budget, guestCount, dashboardUrl, row, html, resend, err_new_lead;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            ownerEmail = params.ownerEmail, clientName = params.clientName, eventType = params.eventType, eventDate = params.eventDate, clientEmail = params.clientEmail, clientPhone = params.clientPhone, budget = params.budget, guestCount = params.guestCount;
                            dashboardUrl = (process.env.FRONTEND_URL || 'https://eventecos.com') + '/dashboard/clients';
                            row = function (label, value) {
                                return value ? "<tr><td style=\"color:#6b7280;font-size:13px;padding:6px 0;width:130px;\">" + label + "</td><td style=\"color:#111827;font-size:13px;padding:6px 0;font-weight:600;\">" + value + "</td></tr>" : '';
                            };
                            html = "<!DOCTYPE html><html><body style=\"margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;\"><div style=\"max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);\"><div style=\"background:linear-gradient(135deg,#7c3aed 0%,#a855f7 100%);padding:32px;text-align:center;\"><h1 style=\"color:white;margin:0;font-size:24px;\">New Lead Submitted</h1><p style=\"color:rgba(255,255,255,.8);margin:8px 0 0;\">Someone just filled out your intake form</p></div><div style=\"padding:32px;\"><p style=\"color:#374151;font-size:15px;margin:0 0 20px;line-height:1.5;\">Great news! <strong>" + clientName + "</strong> has submitted an inquiry through your intake form.</p><table style=\"width:100%;border-collapse:collapse;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;padding:12px 0;margin-bottom:24px;\">" + row('Client Name', clientName) + row('Email', clientEmail) + row('Phone', clientPhone) + row('Event Type', eventType) + row('Event Date', eventDate) + row('Guest Count', guestCount ? String(guestCount) : null) + row('Budget', budget) + "</table><a href=\"" + dashboardUrl + "\" style=\"display:inline-block;background:#7c3aed;color:white;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;\">View in Dashboard \u2192</a><p style=\"color:#9ca3af;font-size:12px;margin:24px 0 0;border-top:1px solid #f3f4f6;padding-top:16px;\">Sent by EventEcos</p></div></div></body></html>";
                            if (!process.env.RESEND_API_KEY) {
                                console.warn('[MailService] RESEND_API_KEY not set — skipping new lead email');
                                return [2 /*return*/];
                            }
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            resend = new resend_1.Resend(process.env.RESEND_API_KEY);
                            return [4 /*yield*/, resend.emails.send({
                                    from: "EventEcos <" + (process.env.RESEND_FROM || 'noreply@eventecos.com') + ">",
                                    to: ownerEmail,
                                    subject: "New Lead: " + clientName + " \u2014 " + eventType + " on " + eventDate,
                                    html: html,
                                })];
                        case 2:
                            _a.sent();
                            console.log('[MailService] New lead notification sent to', ownerEmail);
                            return [3 /*break*/, 4];
                        case 3:
                            err_new_lead = _a.sent();
                            console.error('[MailService] New lead notification failed:', err_new_lead);
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        return MailService_1;
    }());
    __setFunctionName(_classThis, "MailService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        MailService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return MailService = _classThis;
}();
exports.MailService = MailService;
