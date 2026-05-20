import type { ReportTemplate } from '../models/report.model';

export type ReportTemplateKey = 'securify' | 'blueally' | 'unknown';

export interface TemplateRenderer {
  key: ReportTemplateKey;
  matches: (template: ReportTemplate) => boolean;
  generateDocxBuffer: (args: { templatePath: string; data: any }) => Promise<Buffer>;
}
