import { sb } from './supabase.js';
import { esc, fmtSize, toast } from './ui.js';
const OK = new Set('html htm css js ts jsx tsx txt md pdf doc docx zip rar 7z png jpg jpeg gif webp svg json sql cpp c h hpp java py php xml csv'.split(' '));
export const MAX = 50 * 1024 * 1024; // Supabase free plan limit per file
export const ext = n => (n.includes('.') ? n.split('.').pop() : '').toLowerCase();
export const validate = f => !OK.has(ext(f.name)) ? `${f.name}: file type not supported` : f.size > MAX ? `${f.name}: larger than 50 MB` : f.size === 0 ? `${f.name}: file is empty` : null;
const safe = n => n.replace(/[^\w.\-]+/g, '_');

export function dropzone(el, { accept = '', multiple = true } = {}) {
  let files = [];
  el.classList.add('dropzone');
  el.innerHTML = `<p><b>Drag files here</b> or <label class="link">browse<input type="file" hidden ${multiple ? 'multiple' : ''} accept="${accept}"></label></p><ul class="flist"></ul>`;
  const input = el.querySelector('input'), ul = el.querySelector('ul');
  const draw = () => {
    ul.innerHTML = files.map((f, i) => `<li>${f.type.startsWith('image/') ? `<img src="${URL.createObjectURL(f)}" alt="">` : '<span class="ico">📄</span>'}<span>${esc(f.name)}</span><small>${fmtSize(f.size)}</small><button type="button" data-i="${i}" aria-label="Remove">&times;</button></li>`).join('');
  };
  const add = list => { for (const f of list) { const e = validate(f); if (e) toast(e, 'err'); else if (!multiple) files = [f]; else files.push(f); } draw(); };
  input.onchange = () => { add(input.files); input.value = ''; };
  ['dragover', 'dragenter'].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); el.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => el.addEventListener(ev, () => el.classList.remove('over')));
  el.addEventListener('drop', e => { e.preventDefault(); add(e.dataTransfer.files); });
  ul.onclick = e => { const b = e.target.closest('button'); if (b) { files.splice(+b.dataset.i, 1); draw(); } };
  return { get files() { return files; } };
}

// Uploads sequentially; if any file fails, everything uploaded in this call is removed again.
export async function uploadAll(bucket, prefix, files, onProgress = () => {}) {
  const done = [];
  try {
    for (let i = 0; i < files.length; i++) {
      const f = files[i], path = `${prefix}/${crypto.randomUUID().slice(0, 8)}-${safe(f.name)}`;
      const { error } = await sb.storage.from(bucket).upload(path, f, { contentType: f.type || 'application/octet-stream', upsert: false });
      if (error) throw new Error(`${f.name}: ${error.message}`);
      done.push({ file_name: f.name, file_type: ext(f.name) || f.type, file_size: f.size, storage_path: path });
      onProgress(i + 1, files.length);
    }
    return done;
  } catch (e) { await removeObjects(bucket, done.map(d => d.storage_path)); throw e; }
}
export const removeObjects = async (bucket, paths) => { if (paths.length) await sb.storage.from(bucket).remove(paths); };
export async function download(bucket, path, name) {
  const { data, error } = await sb.storage.from(bucket).download(path);
  if (error) return toast(error.message, 'err');
  const a = document.createElement('a'); a.href = URL.createObjectURL(data); a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
