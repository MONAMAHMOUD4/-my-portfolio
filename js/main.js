import { sb, configured } from './supabase.js';
import { isAdmin, logout } from './auth.js';
import { SKILLS, ADMIN_EMAIL } from './config.js';
import { $, toast } from './ui.js';
import { assignments } from './assignments.js';
import { projects } from './projects.js';

const pages = ['home', 'assignments', 'projects', 'contact'];
function route() {
  const h = pages.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home';
  pages.forEach(p => { $('#' + p).hidden = p !== h; document.querySelector(`nav a[href="#${p}"]`)?.classList.toggle('on', p === h); });
  $('nav').classList.remove('open'); scrollTo(0, 0);
}
async function stats() {
  const n = t => sb.from(t).select('*', { count: 'exact', head: true });
  const r = await Promise.all([n('assignments'), n('projects'), n('assignment_files'), n('project_files')]);
  if (r.some(x => x.error)) return;
  $('#s-a').textContent = r[0].count; $('#s-p').textContent = r[1].count; $('#s-f').textContent = r[2].count + r[3].count;
}
async function init() {
  $('#skills').innerHTML = SKILLS.map(s => `<span class="skill">${s}</span>`).join('');
  $('#menu').onclick = () => $('nav').classList.toggle('open');
  $('#copy').onclick = async () => { await navigator.clipboard.writeText(ADMIN_EMAIL); toast('Email copied'); };
  addEventListener('hashchange', route); route();
  if (!configured) { $('#setup').hidden = false; return; }
  const admin = await isAdmin();
  $('#auth').innerHTML = admin ? '<a href="dashboard.html">Dashboard</a><button id="lo">Logout</button>' : '<a href="login.html">Admin</a>';
  if (admin) $('#lo').onclick = logout;
  await Promise.all([stats(), assignments.load(), projects.load()]);
  document.addEventListener('content-changed', stats);
  const q = new URLSearchParams(location.search).get('new');
  if (admin && q === 'assignment') { location.hash = 'assignments'; assignments.add(); }
  if (admin && q === 'project') { location.hash = 'projects'; projects.add(); }
}
init();
