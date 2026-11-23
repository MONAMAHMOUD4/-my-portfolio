import { sb } from './supabase.js';
import { ADMIN_EMAIL } from './config.js';
export const getSession = async () => (await sb.auth.getSession()).data.session;
export const isAdmin = async () => { const s = await getSession(); return !!s && s.user.email === ADMIN_EMAIL; };
export const login = (email, password) => sb.auth.signInWithPassword({ email, password });
export const logout = async () => { await sb.auth.signOut(); location.href = 'index.html'; };
// UI hint only. Real protection is Row Level Security in database/schema.sql.
