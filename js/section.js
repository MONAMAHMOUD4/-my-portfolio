import { sb, pub } from './supabase.js';
import { isAdmin } from './auth.js';
import { $, esc, toast, modal, confirmBox, fmtDate, fmtSize } from './ui.js';
import { dropzone, uploadAll, removeObjects, download } from './uploads.js';
import { openCode, hasCode } from './code-viewer.js';
import { openPreview, canPreview } from './preview.js';

// Shared CRUD UI for Assignments and Projects. cfg: {kind,table,ftable,fk,bucket,root,label}
export function createSection(cfg) {
  const P = cfg.kind === 'project', root = $(cfg.root);
  let rows = [], cats = [], admin = false; const f = { q: '', cat: '', course: '', sort: 'desc' };

  async function load() {
    admin = await isAdmin();
    const [r, c] = await Promise.all([
      sb.from(cfg.table).select(`*,files:${cfg.ftable}(*)`).order('created_at', { ascending: false }),
      sb.from('categories').select('name').order('name')]);
    if (r.error) { root.innerHTML = `<p class="empty">Could not load data: ${esc(r.error.message)}</p>`; return; }
    rows = r.data; cats = (c.data || []).map(x => x.name); render();
  }
  const view = () => rows.filter(x => x.title.toLowerCase().includes(f.q.toLowerCase()) && (!f.cat || x.category === f.cat) && (!f.course || x.course === f.course))
    .sort((a, b) => (f.sort === 'asc' ? 1 : -1) * (new Date(a.created_at) - new Date(b.created_at)));
  const opts = (arr, sel, all) => (all ? `<option value="">${all}</option>` : '') + arr.map(v => `<option ${v === sel ? 'selected' : ''}>${esc(v)}</option>`).join('');

  function render() {
    const courses = [...new Set(rows.map(x => x.course).filter(Boolean))];
    root.innerHTML = `<div class="toolbar"><input id="q" type="search" placeholder="Search by title" value="${esc(f.q)}">
      <select id="fc">${opts(cats, f.cat, 'All categories')}</select>
      ${P ? '' : `<select id="fs">${opts(courses, f.course, 'All subjects')}</select>`}
      <select id="so"><option value="desc">Newest first</option><option value="asc" ${f.sort === 'asc' ? 'selected' : ''}>Oldest first</option></select>
      ${admin ? `<button class="btn" id="add">Add ${cfg.label}</button>` : ''}</div><div class="grid" id="g"></div>`;
    $('#q', root).oninput = e => { f.q = e.target.value; grid(); };
    $('#fc', root).onchange = e => { f.cat = e.target.value; grid(); };
    if (!P) $('#fs', root).onchange = e => { f.course = e.target.value; grid(); };
    $('#so', root).onchange = e => { f.sort = e.target.value; grid(); };
    if (admin) $('#add', root).onclick = () => form();
    grid();
  }
  function grid() {
    const g = $('#g', root), list = view();
    if (!list.length) { g.innerHTML = `<p class="empty">${rows.length ? 'Nothing matches your search.' : `No ${cfg.label.toLowerCase()}s yet.${admin ? ' Use “Add ' + cfg.label + '” to create the first one.' : ' Check back soon.'}`}</p>`; return; }
    g.innerHTML = list.map(x => `<article class="card" data-id="${x.id}">
      ${P ? `<div class="thumb">${x.thumbnail_path ? `<img src="${esc(pub('project-images', x.thumbnail_path))}" alt="" loading="lazy">` : '<span>No image</span>'}</div>` : ''}
      <div class="body"><h3>${esc(x.title)}</h3><p class="desc">${esc(x.description)}</p>
      <div class="tags"><span class="tag">${esc(x.category)}</span>${P ? (x.technologies || []).map(t => `<span class="tag soft">${esc(t)}</span>`).join('') : `<span class="tag soft">${esc(x.course)}</span>`}</div>
      <small class="muted">${fmtDate(x.created_at)} · ${x.files.length} file${x.files.length === 1 ? '' : 's'}</small>
      <div class="actions"><button data-a="view">${P ? 'View Project' : 'View Details'}</button>
      ${hasCode(x.files) ? '<button data-a="code">View Code</button>' : ''}${canPreview(x.files) ? '<button data-a="prev">Preview Website</button>' : ''}
      ${P && x.live_demo_url ? `<a href="${esc(x.live_demo_url)}" target="_blank" rel="noopener noreferrer">Live Demo</a>` : ''}${P && x.github_url ? `<a href="${esc(x.github_url)}" target="_blank" rel="noopener noreferrer">GitHub</a>` : ''}
      ${x.files.length ? '<button data-a="dl">Download</button>' : ''}
      ${admin ? '<button data-a="edit">Edit</button><button class="del" data-a="del">Delete</button>' : ''}</div></div></article>`).join('');
  }
  root.addEventListener('click', async e => {
    const b = e.target.closest('button[data-a]'); if (!b) return;
    const x = rows.find(r => r.id === b.closest('.card').dataset.id), a = b.dataset.a;
    if (a === 'view') details(x); else if (a === 'code') openCode(cfg.bucket, x.files, x.title);
    else if (a === 'prev') openPreview(cfg.bucket, x.files);
    else if (a === 'dl') for (const fl of x.files) await download(cfg.bucket, fl.storage_path, fl.file_name);
    else if (a === 'edit') form(x); else if (a === 'del') remove(x);
  });

  function details(x) {
    const links = (P ? [x.github_url, x.live_demo_url] : x.external_links || []).filter(Boolean);
    const m = modal(`${P && x.thumbnail_path ? `<img class="hero-img" src="${esc(pub('project-images', x.thumbnail_path))}" alt="">` : ''}<h3>${esc(x.title)}</h3>
      <div class="tags"><span class="tag">${esc(x.category)}</span>${(P ? x.technologies || [] : [x.course]).map(t => `<span class="tag soft">${esc(t)}</span>`).join('')}</div>
      <p class="pre">${esc(x.description)}</p><small class="muted">Added ${fmtDate(x.created_at)}</small>
      ${links.length ? `<h4>Links</h4><ul>${links.map(l => `<li><a href="${esc(l)}" target="_blank" rel="noopener noreferrer">${esc(l)}</a></li>`).join('')}</ul>` : ''}
      <h4>Files</h4>${x.files.length ? `<ul class="flist">${x.files.map((fl, i) => `<li><span class="ico">📄</span><span>${esc(fl.file_name)}</span><small>${fmtSize(fl.file_size)}</small><button data-i="${i}">Download</button></li>`).join('')}</ul>` : '<p class="muted">No files attached.</p>'}`, true);
    m.querySelectorAll('.flist button').forEach(bt => bt.onclick = () => download(cfg.bucket, x.files[bt.dataset.i].storage_path, x.files[bt.dataset.i].file_name));
  }

  async function remove(x) {
    if (!await confirmBox(`Delete “${x.title}” and all its files? This cannot be undone.`)) return;
    try {
      await removeObjects(cfg.bucket, x.files.map(z => z.storage_path));
      if (P && x.thumbnail_path) await removeObjects('project-images', [x.thumbnail_path]);
      const { error } = await sb.from(cfg.table).delete().eq('id', x.id); if (error) throw error;
      toast(cfg.label + ' deleted'); await refresh();
    } catch (e) { toast(e.message, 'err'); }
  }
  const refresh = async () => { await load(); document.dispatchEvent(new Event('content-changed')); };
  const url = v => { try { return !v || /^https?:$/.test(new URL(v).protocol); } catch { return false; } };

  function form(x) {
    const edit = !!x, removed = new Set(), replaced = new Map();
    const m = modal(`<h3>${edit ? 'Edit' : 'Add'} ${cfg.label}</h3><form id="fm" novalidate>
      <label>Title<input name="title" required maxlength="150" value="${esc(x?.title)}"></label>
      <label>Description<textarea name="description" rows="3" required>${esc(x?.description)}</textarea></label>
      ${P ? '' : `<label>Course / subject<input name="course" required maxlength="100" value="${esc(x?.course)}"></label>`}
      <div class="two"><label>Category<select name="category">${opts(cats, x?.category)}</select></label><label>…or new category<input name="newcat" maxlength="40" placeholder="e.g. Data Science"></label></div>
      ${P ? `<label>Technologies (comma separated)<input name="tech" value="${esc((x?.technologies || []).join(', '))}"></label>
        <div class="two"><label>GitHub URL<input name="github" type="url" value="${esc(x?.github_url)}"></label><label>Live demo URL<input name="demo" type="url" value="${esc(x?.live_demo_url)}"></label></div>
        <label>Thumbnail image<input name="thumb" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"></label>`
      : `<label>External links (one per line)<textarea name="links" rows="2">${esc((x?.external_links || []).join('\n'))}</textarea></label>`}
      ${edit && x.files.length ? `<h4>Current files</h4><ul class="flist" id="cur">${x.files.map(fl => `<li data-id="${fl.id}"><span class="ico">📄</span><span class="nm">${esc(fl.file_name)}</span><small>${fmtSize(fl.file_size)}</small><label class="link">Replace<input type="file" hidden></label><button type="button" class="rm">Remove</button></li>`).join('')}</ul>` : ''}
      <h4>${edit ? 'Add more files' : 'Files'}</h4><div id="dz"></div>
      <progress id="pg" max="1" value="0" hidden></progress>
      <p class="err" id="er"></p><div class="row end"><button type="button" class="btn ghost" id="cn">Cancel</button><button class="btn" id="sv">Save</button></div></form>`, true);
    const dz = dropzone($('#dz', m)), fm = $('#fm', m);
    $('#cn', m).onclick = m.close;
    m.querySelector('#cur')?.addEventListener('click', e => {
      const li = e.target.closest('li'), id = li?.dataset.id; if (!id) return;
      if (e.target.classList.contains('rm')) { removed.has(id) ? removed.delete(id) : removed.add(id); li.classList.toggle('gone', removed.has(id)); e.target.textContent = removed.has(id) ? 'Undo' : 'Remove'; }
    });
    m.querySelectorAll('#cur input[type=file]').forEach(inp => inp.onchange = () => { const li = inp.closest('li'); replaced.set(li.dataset.id, inp.files[0]); li.querySelector('.nm').textContent = '→ ' + inp.files[0].name; });
    fm.onsubmit = async ev => {
      ev.preventDefault(); const d = new FormData(fm), er = $('#er', m); er.textContent = '';
      const title = d.get('title').trim(), description = d.get('description').trim(), newcat = d.get('newcat').trim(), category = newcat || d.get('category');
      if (!title || !description) return er.textContent = 'Title and description are required.';
      if (!category) return er.textContent = 'Choose or enter a category.';
      if (!P && !d.get('course').trim()) return er.textContent = 'Course / subject is required.';
      if (P && (!url(d.get('github')) || !url(d.get('demo')))) return er.textContent = 'URLs must start with http:// or https://';
      const row = { title, description, category };
      if (P) { row.technologies = d.get('tech').split(',').map(s => s.trim()).filter(Boolean); row.github_url = d.get('github').trim() || null; row.live_demo_url = d.get('demo').trim() || null; }
      else { row.course = d.get('course').trim(); row.external_links = d.get('links').split('\n').map(s => s.trim()).filter(Boolean); }
      if (!P && row.external_links.some(l => !url(l))) return er.textContent = 'Each link must start with http:// or https://';
      const sv = $('#sv', m), pg = $('#pg', m); sv.disabled = true; sv.textContent = 'Saving…'; pg.hidden = false;
      const todo = dz.files.length + replaced.size; let uploaded = [], thumb = null, id = x?.id, created = false;
      const prog = (n) => pg.value = todo ? n / todo : 1;
      try {
        if (newcat && !cats.includes(newcat)) { const { error } = await sb.from('categories').insert({ name: newcat }); if (error && error.code !== '23505') throw error; }
        const tf = d.get('thumb'); if (P && tf?.size) [thumb] = await uploadAll('project-images', 'thumbs', [tf]);
        if (P && thumb) row.thumbnail_path = thumb.storage_path;
        if (edit) { const { error } = await sb.from(cfg.table).update(row).eq('id', id); if (error) throw error; }
        else { const { data, error } = await sb.from(cfg.table).insert(row).select().single(); if (error) throw error; id = data.id; created = true; }
        uploaded = await uploadAll(cfg.bucket, id, dz.files, prog);
        if (uploaded.length) { const { error } = await sb.from(cfg.ftable).insert(uploaded.map(u => ({ ...u, [cfg.fk]: id }))); if (error) throw error; }
        for (const [fid, file] of replaced) {
          const old = x.files.find(z => z.id === fid); if (removed.has(fid)) continue;
          const [n] = await uploadAll(cfg.bucket, id, [file]);
          const { error } = await sb.from(cfg.ftable).update(n).eq('id', fid); if (error) { await removeObjects(cfg.bucket, [n.storage_path]); throw error; }
          await removeObjects(cfg.bucket, [old.storage_path]); prog(dz.files.length + 1);
        }
        const gone = x?.files.filter(z => removed.has(z.id)) || [];
        if (gone.length) { const { error } = await sb.from(cfg.ftable).delete().in('id', gone.map(z => z.id)); if (error) throw error; await removeObjects(cfg.bucket, gone.map(z => z.storage_path)); }
        if (P && thumb && x?.thumbnail_path) await removeObjects('project-images', [x.thumbnail_path]);
        toast(cfg.label + ' saved'); m.close(); await refresh();
      } catch (e) {
        if (created) { await removeObjects(cfg.bucket, uploaded.map(u => u.storage_path)); await sb.from(cfg.table).delete().eq('id', id); }
        if (thumb && !edit) await removeObjects('project-images', [thumb.storage_path]);
        er.textContent = e.message; toast('Save failed: ' + e.message, 'err'); sv.disabled = false; sv.textContent = 'Save'; pg.hidden = true;
      }
    };
  }
  return { load, add: () => form() };
}
