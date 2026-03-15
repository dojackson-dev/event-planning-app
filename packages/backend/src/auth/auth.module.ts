import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { DevAuthController } from './dev-auth.controller';
import { AuthFlowService } from './auth-flow.service';
import { AuthFlowController } from './auth-flow.controller';
import { SubscriptionGuard, RoleGuard } from './guards/subscription.guard';
import { SupabaseModule } from '../supabase/supabase.module';
import { StripeModule } from '../stripe/stripe.module';
import { SmsModule } from '../sms/sms.module';
import { TrialModule } from '../trial/trial.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [SupabaseModule, StripeModule, SmsModule, TrialModule, MessagingModule],
  controllers: [AuthController, DevAuthController, AuthFlowController],
  providers: [AuthService, AuthFlowService, SubscriptionGuard, RoleGuard],
  exports: [AuthService, AuthFlowService, SubscriptionGuard, RoleGuard],
})
export class AuthModule {}
