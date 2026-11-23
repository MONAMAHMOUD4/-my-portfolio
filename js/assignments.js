import { createSection } from './section.js';
export const assignments = createSection({ kind: 'assignment', table: 'assignments', ftable: 'assignment_files', fk: 'assignment_id', bucket: 'assignment-files', root: '#assignments-root', label: 'Assignment' });
