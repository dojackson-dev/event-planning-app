"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = exports.getSupabase = void 0;
require("react-native-url-polyfill/auto");
var async_storage_1 = require("@react-native-async-storage/async-storage");
var supabase_js_1 = require("@supabase/supabase-js");
var supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
var supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
var supabaseInstance = null;
var getSupabase = function () {
    if (!supabaseInstance) {
        supabaseInstance = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
            auth: {
                storage: async_storage_1.default,
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false,
            },
        });
    }
    return supabaseInstance;
};
exports.getSupabase = getSupabase;
exports.supabase = (0, exports.getSupabase)();
