import { modal, toast } from './ui.js';
import { readText } from './code-viewer.js';
const ext = n => n.split('.').pop().toLowerCase();
export const canPreview = files => files.some(f => ['html', 'htm'].includes(ext(f.file_name)));
// Uploaded code runs in a sandboxed iframe WITHOUT allow-same-origin: it cannot reach this site, its storage, or the Supabase session.
export async function openPreview(bucket, files) {
  const html = files.find(f => /^index\.html?$/i.test(f.file_name)) || files.find(f => ['html', 'htm'].includes(ext(f.file_name)));
  if (!html) return toast('No HTML file to preview.', 'err');
  try {
    let doc = await readText(bucket, html.storage_path);
    const byName = n => files.find(f => f.file_name === n.split('/').pop().split('?')[0]);
    const inline = async (re, wrap) => { for (const m of [...doc.matchAll(re)]) { const f = byName(m[1]); if (f) { const c = await readText(bucket, f.storage_path); doc = doc.replace(m[0], () => wrap(c)); } } };
    await inline(/<link[^>]*href=["']([^"']+\.css)["'][^>]*>/gi, c => `<style>${c.replace(/<\/style/gi, '<\\/style')}</style>`);
    await inline(/<script[^>]*src=["']([^"']+\.js)["'][^>]*>\s*<\/script>/gi, c => `<script>${c.replace(/<\/script/gi, '<\\/script')}<\/script>`);
    const m = modal(`<h3>Preview: ${html.file_name}</h3><p class="muted">Running in an isolated sandbox.</p><iframe class="pv" sandbox="allow-scripts allow-forms allow-modals"></iframe>`, true);
    m.querySelector('iframe').srcdoc = doc;
  } catch (e) { toast('Preview failed: ' + e.message, 'err'); }
}
