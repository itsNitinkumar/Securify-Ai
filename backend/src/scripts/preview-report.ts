import * as fs from 'fs';
import * as path from 'path';
import ReportService from '../services/report.service';

const asInt = (v: any, name: string): number => {
  const n = Number.parseInt(String(v ?? ''), 10);
  if (!Number.isFinite(n)) {
    throw new Error(`Missing/invalid ${name}`);
  }
  return n;
};

async function main() {
  const projectId = asInt(process.env.PROJECT_ID, 'PROJECT_ID');
  const templateId = process.env.TEMPLATE_ID ? asInt(process.env.TEMPLATE_ID, 'TEMPLATE_ID') : null;
  const format = (process.env.FORMAT || 'pdf') as 'pdf' | 'docx';
  const findingIds = process.env.FINDING_IDS
    ? String(process.env.FINDING_IDS)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => Number.parseInt(s, 10))
        .filter((n) => Number.isFinite(n))
    : undefined;

  const outDir = path.join(__dirname, '../../reports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const preview = await ReportService.previewReport(projectId, templateId, format, findingIds);
  const fileName = `preview_p${projectId}_t${templateId ?? 'default'}_${Date.now()}.${format}`;
  const outPath = path.join(outDir, fileName);
  fs.writeFileSync(outPath, preview.buffer);

  console.log(outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
