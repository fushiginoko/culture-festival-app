import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Supabaseの環境変数（VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY）が設定されていません。');
}

// これを他のファイルから呼んで使います
export const supabase = createClient(supabaseUrl, supabasePublishableKey);
