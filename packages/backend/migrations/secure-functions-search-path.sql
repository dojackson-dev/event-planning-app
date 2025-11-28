-- Migration: Secure functions with immutable search_path
-- Run this in Supabase SQL Editor
-- This fixes the "Function has a role mutable search_path" security issue

-- Fix handle_new_user function
ALTER FUNCTION public.handle_new_user() SET search_path = '';

-- Fix update_security_updated_at function
ALTER FUNCTION public.update_security_updated_at() SET search_path = '';

-- Fix update_guest_lists_updated_at function
ALTER FUNCTION public.update_guest_lists_updated_at() SET search_path = '';

-- Fix update_guests_updated_at function
ALTER FUNCTION public.update_guests_updated_at() SET search_path = '';

-- Fix update_intake_forms_updated_at function
ALTER FUNCTION public.update_intake_forms_updated_at() SET search_path = '';

-- Fix update_message_templates_updated_at function
ALTER FUNCTION public.update_message_templates_updated_at() SET search_path = '';

-- Fix update_updated_at_column function
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';

-- Fix update_website_configs_updated_at function
ALTER FUNCTION public.update_website_configs_updated_at() SET search_path = '';

-- Verify the changes
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  CASE 
    WHEN prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security_type,
  proconfig as config_settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'handle_new_user',
    'update_security_updated_at',
    'update_guest_lists_updated_at',
    'update_guests_updated_at',
    'update_intake_forms_updated_at',
    'update_message_templates_updated_at',
    'update_updated_at_column',
    'update_website_configs_updated_at'
  )
ORDER BY p.proname;
