import { createSection } from './section.js';
export const projects = createSection({ kind: 'project', table: 'projects', ftable: 'project_files', fk: 'project_id', bucket: 'project-files', root: '#projects-root', label: 'Project' });
