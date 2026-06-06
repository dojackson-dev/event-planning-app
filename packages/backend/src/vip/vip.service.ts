import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import Stripe from 'stripe';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import { MailService } from '../mail/mail.service';
import {
  CreateVipSectionDto,
  CreateVipPackageDto,
  UpdateVipPackageDto,
  CreateVipServiceItemDto,
  VipCheckoutDto,
  ScanVipDto,
  AssignConciergeDto,
  UpdateServiceOrderDto,
  CreateVipConciergeDto,
} from './dto/vip.dto';

const APP_FEE_RATE = 0.03;
const STRIPE_PCT   = 0.029;
const STRIPE_FIXED = 30;

function grossUp(cents: number): number {
  return Math.ceil((cents + STRIPE_FIXED) / (1 - STRIPE_PCT - APP_FEE_RATE));
}

@Injectable()
export class VipService {
  private readonly logger = new Logger(VipService.name);
  private readonly stripe: Stripe;
  private readonly frontendUrl: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly smsNotifications: SmsNotificationsService,
    private readonly mailService: MailService,
  ) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2024-04-10' as any,
    });
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  // ── helpers ──────────────────────────────────────────────────

  private async getPromoterAccount(userId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('promoter_accounts')
      .select('id, stripe_account_id, stripe_connect_status')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) throw new NotFoundException('Promoter account not found');
    return data;
  }

  private async assertEventOwner(userId: string, eventId: string) {
    const promoter = await this.getPromoterAccount(userId);
    const admin = this.supabaseService.getAdminClient();
    const { data } = await admin
      .from('public_events')
      .select('id')
      .eq('id', eventId)
      .eq('promoter_account_id', promoter.id)
      .maybeSingle();
    if (!data) throw new ForbiddenException('Event not found or access denied');
    return promoter;
  }

  // ── SECTIONS ─────────────────────────────────────────────────

  async createSection(userId: string, eventId: string, dto: CreateVipSectionDto) {
    await this.assertEventOwner(userId, eventId);
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('vip_sections')
      .insert({ public_event_id: eventId, ...dto })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async listSections(eventId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('vip_sections')
      .select('*')
      .eq('public_event_id', eventId)
      .order('display_order', { ascending: true });
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async deleteSection(userId: string, sectionId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data: section } = await admin
      .from('vip_sections')
      .select('public_event_id')
      .eq('id', sectionId)
      .maybeSingle();
    if (!section) throw new NotFoundException('Section not found');
    await this.assertEventOwner(userId, section.public_event_id);
    const { error } = await admin.from('vip_sections').delete().eq('id', sectionId);
    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  // ── VIP PACKAGES ─────────────────────────────────────────────

  async createPackage(userId: string, eventId: string, dto: CreateVipPackageDto) {
    await this.assertEventOwner(userId, eventId);
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('vip_packages')
      .insert({ public_event_id: eventId, ...dto })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async listPackages(eventId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('vip_packages')
      .select('*, vip_sections(name)')
      .eq('public_event_id', eventId)
      .neq('status', 'hidden')
      .order('price', { ascending: true });
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async updatePackage(userId: string, packageId: string, dto: UpdateVipPackageDto) {
    const admin = this.supabaseService.getAdminClient();
    const { data: pkg } = await admin
      .from('vip_packages')
      .select('public_event_id')
      .eq('id', packageId)
      .maybeSingle();
    if (!pkg) throw new NotFoundException('VIP package not found');
    await this.assertEventOwner(userId, pkg.public_event_id);
    const { data, error } = await admin
      .from('vip_packages')
      .update(dto)
      .eq('id', packageId)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async deletePackage(userId: string, packageId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data: pkg } = await admin
      .from('vip_packages')
      .select('public_event_id')
      .eq('id', packageId)
      .maybeSingle();
    if (!pkg) throw new NotFoundException('VIP package not found');
    await this.assertEventOwner(userId, pkg.public_event_id);
    const { error } = await admin.from('vip_packages').delete().eq('id', packageId);
    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  // ── SERVICE ITEMS ─────────────────────────────────────────────

  async createServiceItem(userId: string, eventId: string, dto: CreateVipServiceItemDto) {
    await this.assertEventOwner(userId, eventId);
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('vip_service_items')
      .insert({ public_event_id: eventId, ...dto })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async listServiceItems(eventId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('vip_service_items')
      .select('*')
      .eq('public_event_id', eventId)
      .eq('status', 'active')
      .order('category', { ascending: true });
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async deleteServiceItem(userId: string, itemId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data: item } = await admin
      .from('vip_service_items')
      .select('public_event_id')
      .eq('id', itemId)
      .maybeSingle();
    if (!item) throw new NotFoundException('Service item not found');
    await this.assertEventOwner(userId, item.public_event_id);
    const { error } = await admin.from('vip_service_items').delete().eq('id', itemId);
    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  // ── LAYOUT UPLOAD ─────────────────────────────────────────────

  async saveLayout(userId: string, eventId: string, fileUrl: string, fileType: string, description?: string) {
    await this.assertEventOwner(userId, eventId);
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('vip_layouts')
      .insert({ public_event_id: eventId, file_url: fileUrl, file_type: fileType, description })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getLayouts(eventId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('vip_layouts')
      .select('*')
      .eq('public_event_id', eventId)
      .order('created_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  // ── STRIPE CHECKOUT ───────────────────────────────────────────

  async createVipCheckout(eventId: string, packageId: string, dto: VipCheckoutDto) {
    const admin = this.supabaseService.getAdminClient();

    const { data: event } = await admin
      .from('public_events')
      .select('*, promoter_accounts(stripe_account_id, stripe_connect_status, company_name)')
      .eq('id', eventId)
      .eq('status', 'published')
      .maybeSingle();
    if (!event) throw new NotFoundException('Event not found or not published');

    const promoter = event.promoter_accounts;
    if (!promoter?.stripe_account_id || promoter.stripe_connect_status !== 'active') {
      throw new BadRequestException('Payments not enabled for this event');
    }

    const { data: pkg } = await admin
      .from('vip_packages')
      .select('*')
      .eq('id', packageId)
      .eq('public_event_id', eventId)
      .maybeSingle();
    if (!pkg) throw new NotFoundException('VIP package not found');
    if (pkg.status === 'sold_out') throw new BadRequestException('This VIP package is sold out');
    if (pkg.inventory_sold >= pkg.inventory) throw new BadRequestException('No availability remaining');

    // Build service item totals
    let serviceTotal = 0;
    const serviceLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    if (dto.service_items && dto.service_items.length > 0) {
      for (const si of dto.service_items) {
        const { data: item } = await admin
          .from('vip_service_items')
          .select('*')
          .eq('id', si.service_item_id)
          .eq('public_event_id', eventId)
          .maybeSingle();
        if (!item) throw new NotFoundException(`Service item not found: ${si.service_item_id}`);
        const itemCents = Math.round(Number(item.price) * 100) * si.quantity;
        serviceTotal += itemCents;
        serviceLineItems.push({
          price_data: {
            currency: 'usd',
            product_data: { name: item.name },
            unit_amount: Math.round(Number(item.price) * 100),
          },
          quantity: si.quantity,
        });
      }
    }

    const packageCents = Math.round(Number(pkg.price) * 100);
    const subtotal = packageCents + serviceTotal;
    const totalCharge = grossUp(subtotal);
    const serviceFee = totalCharge - subtotal;
    const appFeeAmount = Math.round(totalCharge * APP_FEE_RATE);

    const successUrl = dto.return_url
      ? `${dto.return_url}${dto.return_url.includes('?') ? '&' : '?'}vip_session={CHECKOUT_SESSION_ID}`
      : `${this.frontendUrl}/events/${eventId}?vip_paid=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = dto.return_url
      ? `${dto.return_url}${dto.return_url.includes('?') ? '&' : '?'}vip_canceled=true`
      : `${this.frontendUrl}/events/${eventId}?vip_canceled=true`;

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      ...(dto.buyer_email ? { customer_email: dto.buyer_email } : {}),
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${event.title} — ${pkg.name}`,
              description: pkg.description || `VIP Package · ${pkg.capacity} guests`,
            },
            unit_amount: packageCents,
          },
          quantity: 1,
        },
        ...serviceLineItems,
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Service fee', description: 'Platform & processing fee' },
            unit_amount: serviceFee,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: appFeeAmount,
        transfer_data: { destination: promoter.stripe_account_id },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        vip_package_id: packageId,
        public_event_id: eventId,
        buyer_email: dto.buyer_email,
        ...(dto.buyer_name ? { buyer_name: dto.buyer_name } : {}),
        ...(dto.buyer_phone ? { buyer_phone: dto.buyer_phone } : {}),
        service_items: dto.service_items ? JSON.stringify(dto.service_items) : '',
      },
    });

    return { url: session.url, sessionId: session.id };
  }

  // ── WEBHOOK: process VIP order after payment ──────────────────

  async processVipCheckoutComplete(sessionId: string) {
    const admin = this.supabaseService.getAdminClient();

    let session: Stripe.Checkout.Session;
    try {
      session = await this.stripe.checkout.sessions.retrieve(sessionId);
    } catch {
      return;
    }

    const { vip_package_id, public_event_id, buyer_email, buyer_name, buyer_phone, service_items } =
      session.metadata || {};
    if (!vip_package_id || !public_event_id) return;

    // Idempotency
    const { data: existing } = await admin
      .from('vip_orders')
      .select('id')
      .eq('stripe_checkout_session_id', sessionId)
      .limit(1);
    if (existing && existing.length > 0) return;

    const { data: pkg } = await admin
      .from('vip_packages')
      .select('included_tickets, inventory_sold, inventory, name')
      .eq('id', vip_package_id)
      .single();
    if (!pkg) return;

    // Create order
    const qrCode = crypto.randomUUID();
    const { data: order, error: orderError } = await admin
      .from('vip_orders')
      .insert({
        public_event_id,
        vip_package_id,
        buyer_email: buyer_email ?? session.customer_email ?? '',
        buyer_name: buyer_name ?? '',
        buyer_phone: buyer_phone ?? '',
        total_price: session.amount_total ? session.amount_total / 100 : 0,
        stripe_checkout_session_id: sessionId,
        payment_status: 'paid',
        qr_code: qrCode,
      })
      .select()
      .single();
    if (orderError || !order) {
      this.logger.error('Failed to create VIP order', orderError?.message);
      return;
    }

    // Create guest passes
    const passCount = pkg.included_tickets || 0;
    if (passCount > 0) {
      const passes = Array.from({ length: passCount }, () => ({
        vip_order_id: order.id,
        qr_code: crypto.randomUUID(),
      }));
      await admin.from('vip_guest_passes').insert(passes);
    }

    // Create service orders
    if (service_items) {
      try {
        const items: { service_item_id: string; quantity: number; special_request?: string }[] = JSON.parse(service_items);
        if (items.length > 0) {
          const serviceOrders = items.map(i => ({
            vip_order_id: order.id,
            service_item_id: i.service_item_id,
            quantity: i.quantity,
            ...(i.special_request ? { special_request: i.special_request } : {}),
          }));
          await admin.from('vip_service_orders').insert(serviceOrders);
        }
      } catch {
        // ignore parse error
      }
    }

    // Increment inventory_sold
    await admin
      .from('vip_packages')
      .update({
        inventory_sold: (pkg.inventory_sold ?? 0) + 1,
        ...(pkg.inventory_sold + 1 >= pkg.inventory ? { status: 'sold_out' } : {}),
      })
      .eq('id', vip_package_id);

    // ── Send email & SMS confirmation ──────────────────────────────────────
    const { data: event } = await admin
      .from('public_events')
      .select('title, event_date, start_time, venue_name, promoter_accounts(company_name, contact_name)')
      .eq('id', public_event_id)
      .single();

    const eventTitle = event?.title ?? 'Event';
    const eventDate = event?.event_date ?? '';
    const eventTime = event?.start_time ?? null;
    const venueName = event?.venue_name ?? null;
    const promoterName = (event?.promoter_accounts as any)?.company_name
      || (event?.promoter_accounts as any)?.contact_name
      || null;
    const finalEmail = order.buyer_email || (buyer_email ?? session.customer_email ?? '');
    const finalPhone = order.buyer_phone || (buyer_phone ?? '');
    const formattedDate = eventDate
      ? new Date(eventDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : 'TBD';

    if (finalEmail) {
      await this.mailService.sendVipConfirmation({
        toEmail: finalEmail,
        buyerName: order.buyer_name || null,
        eventTitle,
        eventDate,
        eventTime,
        venueName,
        packageName: pkg.name,
        totalAmount: order.total_price,
        qrCode: qrCode,
        orderId: order.id,
        eventId: public_event_id,
        promoterName,
      });
    }

    if (finalPhone) {
      await this.smsNotifications.vipPurchaseConfirmed(
        finalPhone,
        order.buyer_name || null,
        pkg.name,
        eventTitle,
        formattedDate,
        public_event_id,
      );
    }

    this.logger.log(`VIP order created: ${order.id} for event ${public_event_id}`);
  }

  // ── VIP ORDERS (promoter view) ────────────────────────────────

  async listOrders(userId: string, eventId: string) {
    await this.assertEventOwner(userId, eventId);
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('vip_orders')
      .select(`
        *,
        vip_packages(name, package_type, capacity, included_tickets, table_label),
        vip_guest_passes(id, guest_name, status, checked_in_at),
        vip_service_orders(id, quantity, status, special_request, vip_service_items(name, price))
      `)
      .eq('public_event_id', eventId)
      .order('created_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async getOrder(orderId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('vip_orders')
      .select(`
        *,
        vip_packages(name, package_type, capacity, included_tickets, table_label, section_id,
          vip_sections(name)),
        vip_guest_passes(id, guest_name, guest_email, qr_code, status, checked_in_at),
        vip_service_orders(id, quantity, status, assigned_to, notes, special_request, vip_service_items(name, price, category))
      `)
      .eq('id', orderId)
      .maybeSingle();
    if (error || !data) throw new NotFoundException('VIP order not found');
    return data;
  }

  async getOrderByQr(qrCode: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('vip_orders')
      .select(`
        *,
        vip_packages(name, package_type, capacity, included_tickets, table_label,
          vip_sections(name)),
        vip_guest_passes(id, guest_name, status, checked_in_at),
        vip_service_orders(id, quantity, status, special_request, vip_service_items(name, category))
      `)
      .eq('qr_code', qrCode)
      .maybeSingle();
    if (error || !data) throw new NotFoundException('VIP order not found');
    return data;
  }

  // ── CHECK-IN ──────────────────────────────────────────────────

  async scanVip(userId: string, eventId: string, dto: ScanVipDto) {
    await this.assertEventOwner(userId, eventId);
    const admin = this.supabaseService.getAdminClient();

    const { data: order } = await admin
      .from('vip_orders')
      .select('*, vip_packages(name, capacity, included_tickets, table_label), vip_guest_passes(id, status)')
      .eq('qr_code', dto.qr_code)
      .eq('public_event_id', eventId)
      .maybeSingle();

    if (!order) throw new NotFoundException('VIP QR code not found for this event');
    if (order.payment_status !== 'paid') throw new BadRequestException('VIP order not paid');

    const capacity = order.vip_packages?.capacity ?? 1;
    const alreadyIn = order.guests_checked_in ?? 0;

    let checkInResult: { success: boolean; guests_checked_in: number; total_capacity: number; message: string };

    if (dto.check_in_mode === 'full') {
      const newCount = capacity;
      await admin
        .from('vip_orders')
        .update({ check_in_status: 'checked_in', guests_checked_in: newCount })
        .eq('id', order.id);
      await admin
        .from('vip_guest_passes')
        .update({ status: 'used', checked_in_at: new Date().toISOString() })
        .eq('vip_order_id', order.id)
        .eq('status', 'valid');
      checkInResult = { success: true, guests_checked_in: newCount, total_capacity: capacity, message: `Full group checked in (${newCount})` };
    } else {
      if (alreadyIn >= capacity) {
        throw new BadRequestException(`All ${capacity} guests have already checked in`);
      }
      const newCount = alreadyIn + 1;
      const newStatus = newCount >= capacity ? 'checked_in' : 'partial';
      await admin
        .from('vip_orders')
        .update({ check_in_status: newStatus, guests_checked_in: newCount })
        .eq('id', order.id);
      const validPass = (order.vip_guest_passes as any[]).find((p: any) => p.status === 'valid');
      if (validPass) {
        await admin
          .from('vip_guest_passes')
          .update({ status: 'used', checked_in_at: new Date().toISOString() })
          .eq('id', validPass.id);
      }
      checkInResult = { success: true, guests_checked_in: newCount, total_capacity: capacity, message: `Guest checked in (${newCount} of ${capacity})` };
    }

    // Notify all concierges assigned to this event via SMS
    this.notifyConciergesOnArrival(eventId, order).catch(err =>
      this.logger.error('Concierge SMS notification failed', err),
    );

    return checkInResult;
  }

  private async notifyConciergesOnArrival(eventId: string, order: any) {
    const admin = this.supabaseService.getAdminClient();
    const { data: concierges } = await admin
      .from('vip_concierges')
      .select('name, phone, access_code')
      .eq('public_event_id', eventId);
    if (!concierges || concierges.length === 0) return;

    const guestName = order.buyer_name || 'Your VIP Guest';
    const pkgName   = order.vip_packages?.name || 'VIP Package';
    const tableInfo = order.vip_packages?.table_label ? ` · ${order.vip_packages.table_label}` : '';
    const party     = order.vip_packages?.capacity ? ` · Party of ${order.vip_packages.capacity}` : '';

    for (const concierge of concierges) {
      const portalUrl = `${this.frontendUrl}/vip/concierge/${concierge.access_code}`;
      const message = `🎉 VIP Arrival!\nGuest: ${guestName}\nPackage: ${pkgName}${tableInfo}${party}\nView details: ${portalUrl}`;
      await this.smsNotifications.send(concierge.phone, message);
    }
  }

  // ── CONCIERGE PHONE ACCESS ────────────────────────────────────

  private generateAccessCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  async createConcierge(userId: string, eventId: string, dto: CreateVipConciergeDto) {
    await this.assertEventOwner(userId, eventId);
    const admin = this.supabaseService.getAdminClient();
    let access_code!: string;
    // Ensure uniqueness
    for (let i = 0; i < 10; i++) {
      access_code = this.generateAccessCode();
      const { data: existing } = await admin
        .from('vip_concierges')
        .select('id')
        .eq('access_code', access_code)
        .maybeSingle();
      if (!existing) break;
    }
    const { data, error } = await admin
      .from('vip_concierges')
      .insert({ public_event_id: eventId, name: dto.name, phone: dto.phone, access_code })
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async listConcierges(userId: string, eventId: string) {
    await this.assertEventOwner(userId, eventId);
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('vip_concierges')
      .select('*')
      .eq('public_event_id', eventId)
      .order('created_at', { ascending: true });
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async deleteConcierge(userId: string, conciergeId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data: concierge } = await admin
      .from('vip_concierges')
      .select('public_event_id')
      .eq('id', conciergeId)
      .maybeSingle();
    if (!concierge) throw new NotFoundException('Concierge not found');
    await this.assertEventOwner(userId, concierge.public_event_id);
    const { error } = await admin.from('vip_concierges').delete().eq('id', conciergeId);
    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  async getConciergePortal(accessCode: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data: concierge, error } = await admin
      .from('vip_concierges')
      .select('id, name, public_event_id')
      .eq('access_code', accessCode)
      .maybeSingle();
    if (error || !concierge) throw new NotFoundException('Invalid access code');

    // Fetch event info and all VIP orders for the event
    const [eventRes, ordersRes] = await Promise.all([
      admin
        .from('public_events')
        .select('id, title, event_date, venue_name, city')
        .eq('id', concierge.public_event_id)
        .maybeSingle(),
      admin
        .from('vip_orders')
        .select(`
          id, buyer_name, buyer_email, buyer_phone, check_in_status, guests_checked_in, created_at,
          vip_packages(name, package_type, capacity, table_label, vip_sections(name)),
          vip_service_orders(quantity, status, special_request, vip_service_items(name))
        `)
        .eq('public_event_id', concierge.public_event_id)
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false }),
    ]);

    return {
      concierge: { id: concierge.id, name: concierge.name },
      event: eventRes.data,
      orders: ordersRes.data || [],
    };
  }

  // ── CONCIERGE ASSIGNMENT (legacy: user-account based) ─────────

  async assignConcierge(userId: string, orderId: string, dto: AssignConciergeDto) {
    const admin = this.supabaseService.getAdminClient();
    const { data: order } = await admin
      .from('vip_orders')
      .select('public_event_id')
      .eq('id', orderId)
      .maybeSingle();
    if (!order) throw new NotFoundException('VIP order not found');
    await this.assertEventOwner(userId, order.public_event_id);

    const { error } = await admin
      .from('vip_orders')
      .update({ concierge_user_id: dto.concierge_user_id })
      .eq('id', orderId);
    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  // ── SERVICE ORDER MANAGEMENT ──────────────────────────────────

  async updateServiceOrder(userId: string, serviceOrderId: string, dto: UpdateServiceOrderDto) {
    const admin = this.supabaseService.getAdminClient();
    const { data: so } = await admin
      .from('vip_service_orders')
      .select('vip_order_id, vip_orders(public_event_id)')
      .eq('id', serviceOrderId)
      .maybeSingle();
    if (!so) throw new NotFoundException('Service order not found');
    await this.assertEventOwner(userId, (so.vip_orders as any).public_event_id);

    const { data, error } = await admin
      .from('vip_service_orders')
      .update({
        status: dto.status,
        ...(dto.assigned_to ? { assigned_to: dto.assigned_to } : {}),
        ...(dto.notes ? { notes: dto.notes } : {}),
        ...(dto.status === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
      })
      .eq('id', serviceOrderId)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ── PUBLIC: get event VIP info (for buyer page) ───────────────

  async getPublicVipInfo(eventId: string) {
    const admin = this.supabaseService.getAdminClient();
    const [packagesRes, serviceItemsRes, layoutsRes] = await Promise.all([
      admin
        .from('vip_packages')
        .select('*, vip_sections(name)')
        .eq('public_event_id', eventId)
        .neq('status', 'hidden')
        .order('price', { ascending: true }),
      admin
        .from('vip_service_items')
        .select('id, name, category, price, requires_approval')
        .eq('public_event_id', eventId)
        .eq('status', 'active'),
      admin
        .from('vip_layouts')
        .select('id, file_url, file_type, description')
        .eq('public_event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);
    return {
      packages: packagesRes.data || [],
      service_items: serviceItemsRes.data || [],
      layout: layoutsRes.data?.[0] || null,
    };
  }

  // ── BUYER: get order by QR (public, for confirmation page) ───

  async getPublicOrderBySession(sessionId: string) {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('vip_orders')
      .select(`
        id, buyer_name, buyer_email, total_price, payment_status, check_in_status,
        qr_code, created_at,
        vip_packages(name, package_type, capacity, included_tickets, table_label, description,
          vip_sections(name)),
        vip_guest_passes(id, qr_code, status),
        vip_service_orders(quantity, status, vip_service_items(name, price))
      `)
      .eq('stripe_checkout_session_id', sessionId)
      .maybeSingle();
    if (error || !data) throw new NotFoundException('VIP order not found');
    return data;
  }
}
