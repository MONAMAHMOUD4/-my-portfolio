import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
export const configured = !SUPABASE_URL.includes('YOUR-');
export const sb = createClient(configured ? SUPABASE_URL : 'https://placeholder.supabase.co', configured ? SUPABASE_ANON_KEY : 'placeholder');
export const pub = (bucket, path) => sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
