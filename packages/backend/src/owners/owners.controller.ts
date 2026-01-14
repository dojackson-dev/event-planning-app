import { Controller, Post, Body, Headers, BadRequestException } from '@nestjs/common'
import { OwnersService } from './owners.service'
import { SupabaseService } from '../supabase/supabase.service'

@Controller('owners')
export class OwnersController {
  constructor(
    private readonly ownersService: OwnersService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Post('onboarding')
  async saveOnboarding(
    @Body() dto: any,
    @Headers('authorization') authorization: string,
  ) {
    if (!authorization) {
      throw new BadRequestException('No authorization header')
    }

    const token = authorization.replace('Bearer ', '')

    try {
      const supabase = this.supabaseService.setAuthContext(token)
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        throw new BadRequestException('Invalid token')
      }

      const ownerData = {
        user_id: user.id,
        first_name: dto.firstName,
        last_name: dto.lastName,
        company_name: dto.companyName,
        company_email: dto.companyEmail,
        company_phone: dto.companyPhone,
        company_address: dto.companyAddress,
        company_city: dto.companyCity,
        company_state: dto.companyState,
        company_zip: dto.companyZip,
        business_type: dto.businessType,
        number_of_facilities: dto.facilities?.length || 1,
        facilities_data: JSON.stringify(dto.facilities || []),
        status: 'pending_payment',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error: saveError } = await supabase
        .from('owner_profiles')
        .upsert([ownerData], { onConflict: 'user_id' })
        .select()
        .single()

      if (saveError) {
        throw new BadRequestException(saveError.message)
      }

      return {
        success: true,
        message: 'Owner details saved successfully',
        data,
      }
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Failed to save onboarding data')
    }
  }

  @Post('activate')
  async activateAccount(
    @Body() dto: { userId: string; demoMode: boolean; paymentStatus: string },
    @Headers('authorization') authorization: string,
  ) {
    if (!authorization) {
      throw new BadRequestException('No authorization header')
    }

    const token = authorization.replace('Bearer ', '')

    try {
      const supabase = this.supabaseService.setAuthContext(token)

      const { error: updateError } = await supabase
        .from('owner_profiles')
        .update({
          status: dto.demoMode ? 'demo_active' : 'active',
          payment_status: dto.paymentStatus,
          activated_at: new Date().toISOString(),
        })
        .eq('user_id', dto.userId)

      if (updateError) {
        throw new BadRequestException(updateError.message)
      }

      return {
        success: true,
        message: `Account activated in ${dto.demoMode ? 'demo' : 'paid'} mode`,
        demoMode: dto.demoMode,
      }
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Failed to activate account')
    }
  }

  @Post('check-status')
  async checkStatus(
    @Headers('authorization') authorization: string,
  ) {
    if (!authorization) {
      throw new BadRequestException('No authorization header')
    }

    const token = authorization.replace('Bearer ', '')

    try {
      const supabase = this.supabaseService.setAuthContext(token)
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        throw new BadRequestException('Invalid token')
      }

      const { data, error: fetchError } = await supabase
        .from('owner_profiles')
        .select('status, payment_status')
        .eq('user_id', user.id)
        .single()

      if (fetchError) {
        return { hasProfile: false, status: null }
      }

      return {
        hasProfile: true,
        status: data?.status,
        paymentStatus: data?.payment_status,
      }
    } catch (error: any) {
      return { hasProfile: false, error: error.message }
    }
  }
}
