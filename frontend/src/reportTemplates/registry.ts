import type { Template } from '@/api/templateApi';

export type ReportTemplateKey = 'securify' | 'blueally' | 'unknown';

export const templateKeyFromTemplate = (t: Template | null | undefined): ReportTemplateKey => {
  const name = String(t?.name || '').toLowerCase();
  if (!name) return 'unknown';
  if (name.includes('blueally')) return 'blueally';
  // Default to the legacy/Securify experience to avoid breaking existing projects.
  return 'securify';
};

export const templateKeyFromProject = (project: { template_name?: string } | null | undefined): ReportTemplateKey => {
  const name = String(project?.template_name || '').toLowerCase();
  if (!name) return 'unknown';
  if (name.includes('blueally')) return 'blueally';
  return 'securify';
};
