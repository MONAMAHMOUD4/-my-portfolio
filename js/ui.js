export const $ = (s, r = document) => r.querySelector(s);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
export const fmtSize = b => b < 1024 ? b + ' B' : b < 1048576 ? (b/1024).toFixed(1) + ' KB' : (b/1048576).toFixed(1) + ' MB';
export const fmtDate = d => new Date(d).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
export function toast(msg, type = 'ok') {
  let box = $('#toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.append(box); }
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg; box.append(t);
  setTimeout(() => t.remove(), 4500);
}
export function modal(html, wide = false) {
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true"><button class="x" aria-label="Close">&times;</button>${html}</div>`;
  o.close = () => o.remove();
  o.querySelector('.x').onclick = o.close; o.addEventListener('mousedown', e => { if (e.target === o) o.close(); });
  document.body.append(o); return o;
}
export const confirmBox = msg => new Promise(res => {
  const m = modal(`<h3>Please confirm</h3><p>${esc(msg)}</p><div class="row end"><button class="btn ghost" id="n">Cancel</button><button class="btn danger" id="y">Delete</button></div>`);
  m.querySelector('#n').onclick = m.querySelector('.x').onclick = () => { m.close(); res(false); };
  m.querySelector('#y').onclick = () => { m.close(); res(true); };
});
