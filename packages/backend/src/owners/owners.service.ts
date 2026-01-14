import { Injectable } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'

@Injectable()
export class OwnersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getOwnerProfile(userId: string) {
    const supabase = this.supabaseService.getAdminClient()

    const { data, error } = await supabase
      .from('owner_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      return null
    }

    return data
  }

  async updateOwnerProfile(userId: string, updates: any) {
    const supabase = this.supabaseService.getAdminClient()

    const { data, error } = await supabase
      .from('owner_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data
  }
}
