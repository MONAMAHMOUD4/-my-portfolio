import { sb } from './supabase.js';
import { isAdmin, logout } from './auth.js';
import { $, esc, fmtDate, fmtSize, toast } from './ui.js';
(async () => {
  if (!await isAdmin()) { location.href = 'login.html'; return; }
  $('#lo').onclick = logout;
  const n = t => sb.from(t).select('*', { count: 'exact', head: true });
  const r = await Promise.all([n('assignments'), n('projects'), n('assignment_files'), n('project_files'),
    sb.from('assignment_files').select('file_name,file_size,created_at,assignments(title)').order('created_at', { ascending: false }).limit(8),
    sb.from('project_files').select('file_name,file_size,created_at,projects(title)').order('created_at', { ascending: false }).limit(8)]);
  const bad = r.find(x => x.error); if (bad) return toast(bad.error.message, 'err');
  $('#d-a').textContent = r[0].count; $('#d-p').textContent = r[1].count; $('#d-f').textContent = r[2].count + r[3].count;
  const recent = [...r[4].data.map(x => ({ ...x, parent: x.assignments?.title, kind: 'Assignment' })), ...r[5].data.map(x => ({ ...x, parent: x.projects?.title, kind: 'Project' }))]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8);
  $('#recent').innerHTML = recent.length ? recent.map(x => `<li><span>${esc(x.file_name)}</span><small>${x.kind}: ${esc(x.parent)} · ${fmtSize(x.file_size)} · ${fmtDate(x.created_at)}</small></li>`).join('') : '<li class="empty">No uploads yet. Use a quick upload button above.</li>';
})();
