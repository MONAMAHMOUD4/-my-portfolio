import { sb } from './supabase.js';
import { modal, esc, toast } from './ui.js';
const LANG = { js:'javascript', html:'markup', htm:'markup', xml:'markup', svg:'markup', css:'css', py:'python', java:'java', cpp:'cpp', c:'c', h:'c', hpp:'cpp', sql:'sql', php:'php', json:'json', ts:'typescript', md:'markdown' };
const TEXT = new Set([...Object.keys(LANG), 'txt', 'csv', 'jsx', 'tsx']);
const ext = n => n.split('.').pop().toLowerCase();
export const hasCode = files => files.some(f => TEXT.has(ext(f.file_name)));
export async function readText(bucket, path) {
  const { data, error } = await sb.storage.from(bucket).download(path);
  if (error) throw error; return data.text();
}
export async function openCode(bucket, files, title = 'Code') {
  const list = files.filter(f => TEXT.has(ext(f.file_name)));
  if (!list.length) return toast('No text-based source files to display.', 'err');
  const m = modal(`<h3>${esc(title)}</h3><div class="tabs">${list.map((f, i) => `<button class="tab" data-i="${i}">${esc(f.file_name)}</button>`).join('')}</div><div class="codebar"><span id="cn"></span><button class="btn small" id="cp">Copy code</button></div><div class="code"><pre class="line-numbers"><code id="cc">Loading…</code></pre></div>`, true);
  const cache = {}; let cur = 0;
  async function show(i) {
    cur = i; m.querySelectorAll('.tab').forEach((t, k) => t.classList.toggle('on', k === i));
    const f = list[i], code = m.querySelector('#cc'), l = LANG[ext(f.file_name)] || 'none';
    m.querySelector('#cn').textContent = f.file_name;
    try { cache[i] ??= await readText(bucket, f.storage_path); } catch (e) { code.textContent = 'Could not load file: ' + e.message; return; }
    code.parentElement.className = 'line-numbers language-' + l; code.className = 'language-' + l; code.textContent = cache[i];
    window.Prism?.highlightElement(code);
  }
  m.querySelector('.tabs').onclick = e => { const t = e.target.closest('.tab'); if (t) show(+t.dataset.i); };
  m.querySelector('#cp').onclick = async () => { await navigator.clipboard.writeText(cache[cur] ?? ''); toast('Code copied'); };
  show(0);
}
