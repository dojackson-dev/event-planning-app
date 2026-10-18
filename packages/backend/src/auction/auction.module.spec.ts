import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { MailModule } from '../mail/mail.module';
import { PromoterTeamModule } from '../promoter-team/promoter-team.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { StripeModule } from '../stripe/stripe.module';
import { AuctionModule } from './auction.module';
import { AUCTION_ORDER_CHARGER } from './auction-ports';

// Guards the cross-slice DI wiring (charger token, bidder guard, Stripe -> payments direction).
describe('AuctionModule wiring', () => {
  const saved = { ...process.env };
  beforeAll(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
    process.env.AUCTION_SESSION_SECRET = 'x'.repeat(48);
  });
  afterAll(() => {
    process.env = saved;
  });

  it('resolves every provider and exposes the order charger globally', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        SupabaseModule,
        MailModule,
        PromoterTeamModule,
        StripeModule,
        AuctionModule,
      ],
    }).compile();

    const charger = moduleRef.get(AUCTION_ORDER_CHARGER, { strict: false });
    expect(typeof charger.chargeOrderNow).toBe('function');
    await moduleRef.close();
  });
});
