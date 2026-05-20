import type { ReportTemplate } from '../models/report.model';
import type { ReportTemplateKey, TemplateRenderer } from './types';
import { BlueAllyRenderer } from './blueally/blueally.renderer';

export const getTemplateKey = (template: ReportTemplate): ReportTemplateKey => {
  const rawKey = (template as any)?.template_data?.key;
  const key = typeof rawKey === 'string' ? rawKey.trim().toLowerCase() : '';
  if (key === 'blueally') return 'blueally';
  if (key === 'securify') return 'securify';

  const name = String((template as any)?.name || '').toLowerCase();
  if (name.includes('blueally')) return 'blueally';
  if (name.includes('securify')) return 'securify';

  return 'unknown';
};

const renderers: TemplateRenderer[] = [BlueAllyRenderer];

export const getRendererForTemplate = (template: ReportTemplate): TemplateRenderer | null => {
  for (const r of renderers) {
    try {
      if (r.matches(template)) return r;
    } catch {
      // Ignore renderer match failures.
    }
  }
  return null;
};
