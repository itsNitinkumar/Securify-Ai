// Unused imports - commented out since methods using them are disabled
// import {
//   AlignmentType,
//   HighlightColor,
//   BorderStyle,
//   Footer,
//   Header,
//   HeadingLevel,
//   ImageRun,
//   PageNumber,
//   PageBreak,
//   Paragraph,
//   SimpleField,
//   ShadingType,
//   Table,
//   TableCell,
//   TableLayoutType,
//   TableRow,
//   TextRun,
//   VerticalAlign,
//   WidthType,
// } from 'docx';
// import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { format as formatDate } from 'date-fns';
import ReportModel, { ReportTemplate } from '../models/report.model';
import ProjectModel from '../models/project.model';
import FindingModel from '../models/finding.model';
import EvidenceModel from '../models/evidence.model';
import ApiError from '../utils/ApiError';
import { ReportGeneratorService } from './report-generator.service';
import { getRendererForTemplate, getTemplateKey } from '../report-templates/registry';

interface ReportData {
  project: any;
  findings: any[];
  template: ReportTemplate;
  metadata: {
    generatedBy: string;
    generatedDate: string;
    reportVersion: string;
  };
}

interface PreviewResult {
  buffer: Buffer;
  contentType: string;
  fileName: string;
}

class ReportService {
  private static reportsDir = path.join(__dirname, '../../reports');
  // When running from TS (src/) __dirname points to src/services; when running from build (dist/)
  // it points to dist/services. Use process.cwd() so both modes resolve to backend/src/templates.
  private static templatesDir = path.join(process.cwd(), 'src', 'templates');
  private static execFileAsync = promisify(execFile);

  private static brand = {
    green: '40D31D',
    greenDark: '39B829',
    text: '121212',
    // Use requested italic subheader color: 60% gray
    gray: '666666',
    logoUrl: 'https://securifyai.co/wp-content/uploads/2024/09/securify-logo-light.png',
  };

  // Helper method to extract string value from JSONB objects
  // Note: kept empty utility placeholder removed to avoid lint errors.

  // Ensure reports directory exists
  static async ensureReportsDir() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  private static normalizeTemplateData(template: ReportTemplate): ReportTemplate {
    const raw = (template as any)?.template_data;
    if (raw && typeof raw === 'string') {
      try {
        (template as any).template_data = JSON.parse(raw);
      } catch {
        // Leave as-is; callers should handle missing fields.
      }
    }
    return template;
  }

  // Load HTML template from template_data configuration
  private static loadTemplate(template: ReportTemplate): string {
    const normalized = this.normalizeTemplateData(template);

    const templateFileRaw = (normalized as any)?.template_data?.template_file;
    if (!templateFileRaw || typeof templateFileRaw !== 'string' || !templateFileRaw.trim()) {
      throw new ApiError(400, 'Template file not specified in template configuration');
    }

    const templateFile = path.basename(templateFileRaw.trim());
    const selectedPath = path.join(this.templatesDir, templateFile);

    if (!fs.existsSync(selectedPath)) {
      throw new ApiError(404, `Template file not found: ${templateFile}`);
    }

    return fs.readFileSync(selectedPath, 'utf-8');
  }

  private static async buildReportData(
    projectId: number,
    templateId: number | null,
    findingIds?: number[]
  ): Promise<ReportData> {
    const project = await ProjectModel.findById(projectId);
    if (!project) {
      throw new ApiError(404, 'Project not found');
    }

    const hasExplicitIds = Array.isArray(findingIds) && findingIds.length > 0;
    const approvedFindings = await FindingModel.findAll({ project_id: projectId, status: 'approved' });
    const findings = hasExplicitIds
      ? (await FindingModel.findAll({ project_id: projectId })).filter((f: any) => findingIds!.includes(f.id))
      : approvedFindings;

    // Enrich findings with evidence attachments so templates can render screenshots
    // even when they are uploaded via EvidenceUploader (separate from steps_to_reproduce).
    const enrichedFindings = await Promise.all(
      findings.map(async (f: any) => {
        try {
          const evidence = await EvidenceModel.findByFindingId(f.id);
          return { ...f, evidence };
        } catch {
          return { ...f, evidence: [] };
        }
      })
    );

    if (Array.isArray(findingIds) && findingIds.length > 0 && findings.length === 0) {
      throw new ApiError(400, 'No findings matched the selected finding IDs');
    }

    let template: ReportTemplate | null;
    if (templateId) {
      template = await ReportModel.getTemplateById(templateId);
    } else if (project.template_id) {
      // Use project's associated template
      template = await ReportModel.getTemplateById(project.template_id);
    } else {
      template = await ReportModel.getDefaultTemplate();
    }

    if (!template) {
      throw new ApiError(404, 'Report template not found');
    }

    template = this.normalizeTemplateData(template);

    return {
      project,
      findings: enrichedFindings,
      template,
      metadata: {
        generatedBy: 'SecurifyAI',
        generatedDate: formatDate(new Date(), 'MMMM dd, yyyy'),
        reportVersion: '1.0',
      },
    };
  }

  private static renderReportHTML(data: ReportData, opts?: { inlineImages?: boolean }): string {
    const { project, findings, metadata } = data;

     const templateKey = getTemplateKey(data.template);

    // Debug: Log findings data
    console.log('📊 Report findings data:', {
      count: findings.length,
      firstFinding: findings[0] ? {
        id: findings[0].id,
        title: findings[0].title,
        steps_to_reproduce: findings[0].steps_to_reproduce,
        stepsType: typeof findings[0].steps_to_reproduce,
        stepsIsArray: Array.isArray(findings[0].steps_to_reproduce),
        firstStep: Array.isArray(findings[0].steps_to_reproduce) && findings[0].steps_to_reproduce.length > 0
          ? findings[0].steps_to_reproduce[0]
          : null
      } : null
    });

    let html = this.loadTemplate(data.template);

    html = html
      .replace(/{{CLIENT_NAME}}/g, project.client_name || 'N/A')
      .replace(/{{PROJECT_NAME}}/g, project.name || 'Penetration Test Report')
      .replace(/{{DATE}}/g, metadata.generatedDate);

    // Legacy Securify template expects these scope tables.
    if (templateKey === 'securify' || templateKey === 'unknown') {
      const scopeParagraph = '<p>The assessment was conducted between Start Date and End Date. The re-assessment was conducted between Start Date and End Date. Testing was performed remotely.</p>';
      const appDetailsBlock = `
        <h2>Application Details</h2>
        <table>
          <thead>
            <tr><th>Name</th><th>URL</th></tr>
          </thead>
          <tbody>
            <tr><td>Application Name 1</td><td>http://test.com</td></tr>
            <tr><td>Application Name 2</td><td>http://admin.test.com</td></tr>
          </tbody>
        </table>`;
      const userRolesBlock = `
        <h2>User Roles (Web application &amp; API)</h2>
        <table>
          <thead>
            <tr><th>Role</th><th>Username</th></tr>
          </thead>
          <tbody>
            <tr><td>Customer</td><td>user1</td></tr>
            <tr><td>Admin</td><td>admin1</td></tr>
          </tbody>
        </table>`;

      // Only patch when missing. We anchor to the findings placeholder since all templates have it.
      if (!html.includes('The assessment was conducted between Start Date and End Date')) {
        html = html.replace('{{FINDINGS_SECTION}}', `${scopeParagraph}${appDetailsBlock}${userRolesBlock}\n{{FINDINGS_SECTION}}`);
      }
    }

    const findingsMarkup = ReportGeneratorService.generateHTML(project, findings) as unknown;
    const findingsHTML = typeof findingsMarkup === 'string'
      ? findingsMarkup
      : String((findingsMarkup as { FINDINGS_SECTION?: string })?.FINDINGS_SECTION || '');

    html = html.replace('{{FINDINGS_SECTION}}', findingsHTML);

    // Update Securify scope dates/tables using project metadata.
    if (templateKey === 'securify' || templateKey === 'unknown') {
      const start = (project as any)?.start_date
        ? formatDate(new Date((project as any).start_date), 'MMMM dd, yyyy')
        : 'Start Date';
      const end = (project as any)?.end_date
        ? formatDate(new Date((project as any).end_date), 'MMMM dd, yyyy')
        : 'End Date';
      html = html.replace(/Start Date/g, start).replace(/End Date/g, end);

      const apps = Array.isArray((project as any)?.application_details) ? (project as any).application_details : null;
      if (apps && apps.length) {
        const rows = apps
          .map((r: any) => ({ name: String(r?.name || '').trim(), url: String(r?.url || '').trim() }))
          .filter((r: any) => r.name || r.url)
          .map((r: any) => `<tr><td>${r.name || 'N/A'}</td><td>${r.url || 'N/A'}</td></tr>`)
          .join('');
        if (rows) {
          html = html.replace(
            /(<h2[^>]*>\s*Application Details\s*<\/h2>[\s\S]*?<table[\s\S]*?<tbody>)[\s\S]*?(<\/tbody>[\s\S]*?<\/table>)/i,
            `$1${rows}$2`
          );
        }
      }

      const roles = Array.isArray((project as any)?.user_roles) ? (project as any).user_roles : null;
      if (roles && roles.length) {
        const rows = roles
          .map((r: any) => ({ role: String(r?.role || '').trim(), username: String(r?.username || '').trim() }))
          .filter((r: any) => r.role || r.username)
          .map((r: any) => `<tr><td>${r.role || 'N/A'}</td><td>${r.username || 'N/A'}</td></tr>`)
          .join('');
        if (rows) {
          html = html.replace(
            /(<h2[^>]*>\s*User Roles \(Web application[^<]*<\/h2>[\s\S]*?<table[\s\S]*?<tbody>)[\s\S]*?(<\/tbody>[\s\S]*?<\/table>)/i,
            `$1${rows}$2`
          );
        }
      }
    }

    if (opts?.inlineImages) {
      // html-to-docx will try to fetch http(s) images; avoid network dependency by
      // inlining a local logo if available, otherwise use a transparent pixel.
      const transparentPng =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X8Xc8AAAAASUVORK5CYII=';

      const toDataUri = (filePath: string): string | null => {
        try {
          if (!fs.existsSync(filePath)) return null;
          const ext = path.extname(filePath).toLowerCase();
          const mime = ext === '.png'
            ? 'image/png'
            : ext === '.jpg' || ext === '.jpeg'
              ? 'image/jpeg'
              : null;
          if (!mime) return null;
          const buf = fs.readFileSync(filePath);
          return `data:${mime};base64,${buf.toString('base64')}`;
        } catch {
          return null;
        }
      };

      const rawLogoPath = (data.template as any)?.logo_path;
      const logoPath = typeof rawLogoPath === 'string' && rawLogoPath.trim() ? rawLogoPath.trim() : '';

      // Try: template.logo_path (absolute or relative), then a conventional filename in templates dir.
      const candidates: string[] = [];
      if (logoPath) {
        if (path.isAbsolute(logoPath)) {
          candidates.push(logoPath);
        } else {
          candidates.push(path.join(this.templatesDir, logoPath));
          candidates.push(path.join(process.cwd(), logoPath));
        }
      }
      candidates.push(path.join(this.templatesDir, 'securify-logo-light.png'));

      let inlinedLogo: string | null = null;
      for (const c of candidates) {
        inlinedLogo = toDataUri(c);
        if (inlinedLogo) break;
      }
      const logoSrc = inlinedLogo || transparentPng;

      // Replace known hardcoded logo URL(s) in templates.
      html = html.replace(
        /https:\/\/securifyai\.co\/wp-content\/uploads\/2024\/09\/securify-logo-light\.png/g,
        logoSrc
      );

      // Optional placeholder if/when templates adopt it.
      html = html.replace(/{{LOGO_SRC}}/g, logoSrc);

      // Inline risk matrix image if available in public/templates
      const riskImageCandidates: string[] = [
        path.join(process.cwd(), 'public', 'images', 'risk-matrix.png'),
        path.join(process.cwd(), 'public', 'images', 'risk_matrix.png'),
        path.join(process.cwd(), 'public', 'images', 'riskmatrix.png'),
        // JPEG variants — user may have uploaded a JPEG
        path.join(process.cwd(), 'public', 'images', 'risk-matrix.jpeg'),
        path.join(process.cwd(), 'public', 'images', 'risk_matrix.jpeg'),
        path.join(process.cwd(), 'public', 'images', 'riskmatrix.jpeg'),
        path.join(process.cwd(), 'public', 'images', 'risk-matrix.jpg'),
        path.join(process.cwd(), 'public', 'images', 'risk_matrix.jpg'),
        path.join(process.cwd(), 'public', 'images', 'riskmatrix.jpg'),
        // Also check root public folder
        path.join(process.cwd(), 'public', 'risk-matrix.png'),
        path.join(process.cwd(), 'public', 'risk_matrix.png'),
        path.join(process.cwd(), 'public', 'riskmatrix.png'),
        path.join(process.cwd(), 'public', 'risk-matrix.jpeg'),
        path.join(process.cwd(), 'public', 'risk_matrix.jpeg'),
        path.join(process.cwd(), 'public', 'riskmatrix.jpeg'),
        path.join(process.cwd(), 'public', 'risk-matrix.jpg'),
        path.join(process.cwd(), 'public', 'risk_matrix.jpg'),
        path.join(process.cwd(), 'public', 'riskmatrix.jpg'),
        path.join(this.templatesDir, 'risk-matrix.png'),
      ];
      let inlinedRisk: string | null = null;
      for (const c of riskImageCandidates) {
        const dataUri = toDataUri(c);
        if (dataUri) { inlinedRisk = dataUri; break; }
      }
      const riskSrc = inlinedRisk || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X8Xc8AAAAASUVORK5CYII=';
      html = html.replace(/{{RISK_MATRIX_SRC}}/g, riskSrc);
      // Replace common risk-matrix image URLs if present
      html = html.replace(/(risk-?matrix\.png)/g, () => riskSrc);
    }

    return html;
  }

  // Unused method: generatePDFBuffer - commented out

  private static async generatePDFFromDOCXBuffer(data: ReportData): Promise<Buffer> {
    const sofficePath = '/usr/bin/soffice';
    if (!fs.existsSync(sofficePath)) {
      throw new ApiError(500, 'LibreOffice `soffice` is not installed on this machine.');
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'securify-docx-pdf-'));
    const inputPath = path.join(tempDir, 'report.docx');
    const outputPath = path.join(tempDir, 'report.pdf');

    try {
      // LibreOffice uses system fonts. If Roboto isn't installed, it will substitute (often Noto Sans),
      // which changes text metrics and can break pagination/cover layout.
      try {
        const { stdout } = await this.execFileAsync('fc-match', ['Roboto'], { timeout: 5000 });
        if (stdout && !stdout.toLowerCase().includes('roboto')) {
          console.warn(
            `⚠️ Font substitution likely during DOCX→PDF: fc-match Roboto resolved to: ${stdout.trim()}. ` +
            'Install Roboto fonts on the server/host to improve layout fidelity.'
          );
        }
      } catch {
        // Ignore font check failures (fc-match might not exist in minimal containers).
      }

      let docxBuffer = await this.generateDOCXBuffer(data);

      // BlueAlly uses a DOCX-first template. LibreOffice PDF export has two recurring issues:
      // 1) bullet glyph substitution (renders as oversized dots)
      // 2) cover background image pagination (splits cover across 2 pages)
      // Patch a PDF-only copy to keep DOCX output unchanged.
      const templateKey = getTemplateKey(data.template);
      console.log('[Report Service] Template key detected:', templateKey);
      if (templateKey === 'blueally') {
        console.log('[Report Service] Applying BlueAlly PDF patch...');
        docxBuffer = await this.patchBlueAllyDocxForLibreOfficePdf(docxBuffer);
      } else if (templateKey === 'dast') {
        console.log('[Report Service] Applying DAST PDF patch...');
        docxBuffer = await this.patchDastDocxForLibreOfficePdf(docxBuffer);
      } else {
        console.log('[Report Service] Not applying BlueAlly/DAST patch (template key is:', templateKey, ')');
      }

      // PDF conversion via LibreOffice can ignore paragraph-level run formatting on some template-derived
      // headings (notably around TOC/major sections). Patch those headings in a PDF-only copy so the
      // DOCX output remains unchanged.
      // Only apply this patch for the legacy Securify/HTML-derived templates. BlueAlly uses a purpose-built
      // DOCX and this patch can subtly disturb layout/list rendering in LibreOffice.
      if (templateKey === 'securify' || templateKey === 'unknown') {
        docxBuffer = this.patchDocxHeadingsForLibreOfficePdf(docxBuffer);
      }
      fs.writeFileSync(inputPath, docxBuffer);

       await this.execFileAsync(sofficePath, [
         '--headless',
         '--convert-to',
         'pdf:writer_pdf_Export',
         '--outdir',
         tempDir,
         inputPath,
       ], {
         timeout: 120000,
       });

      if (!fs.existsSync(outputPath)) {
        throw new ApiError(500, 'DOCX to PDF conversion failed: output PDF was not created');
      }

      if (templateKey === 'dast') {
        try {
          const actualTocPages = await this.buildDastActualTocPages(outputPath, data);
          if (actualTocPages.size > 0) {
            docxBuffer = this.patchDastTocPageNumbers(docxBuffer, actualTocPages, data);
            fs.writeFileSync(inputPath, docxBuffer);

            await this.execFileAsync(sofficePath, [
              '--headless',
              '--convert-to',
              'pdf:writer_pdf_Export',
              '--outdir',
              tempDir,
              inputPath,
            ], {
              timeout: 120000,
            });

            if (!fs.existsSync(outputPath)) {
              throw new ApiError(500, 'DOCX to PDF reconversion failed after TOC patch');
            }
          }
        } catch (e: any) {
          console.warn('[Report Service] DAST TOC pagination patch failed, keeping initial PDF:', e?.message || e);
        }
      }

      // BlueAlly: post-process PDF to fix LO cover pagination.
      if (templateKey === 'blueally') {
        try {
          const finalPdf = await this.postProcessBlueAllyPdf(outputPath, docxBuffer, tempDir, data);
           return finalPdf;
         } catch (e: any) {
           console.warn('[Report Service] BlueAlly PDF post-process failed, returning raw LO PDF:', e?.message || e);
           return fs.readFileSync(outputPath);
         }
       }

       return fs.readFileSync(outputPath);
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, `Failed to convert DOCX to PDF: ${error?.message || 'Unknown error'}`);
    } finally {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore temp cleanup failures.
      }
    }
  }

  private static normalizeDastTocText(text: string): string {
    return String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static cleanDastFindingTitle(title: string, isFP: boolean): string {
    let t = String(title || '').trim();
    if (isFP) t = t.replace(/\s*-\s*False\s*Positive\s*$/i, '');
    return t;
  }

  private static buildDastTocTitles(data: ReportData): string[] {
    const titles = [
      'Scope',
      'Application Details',
      'User Roles',
      'Tools',
      'Assessment Limitation',
      'Vulnerabilities',
      'Summary',
      'Detailed Vulnerabilities',
    ];

    const findings = Array.isArray(data.findings) ? data.findings : [];
    const tpFindings = findings.filter((f: any) => String(f.finding_type || '') !== 'false_positive');
    const fpFindings = findings.filter((f: any) => String(f.finding_type || '') === 'false_positive');

    if (tpFindings.length) titles.push('True Positive');
    for (const f of tpFindings) titles.push(this.cleanDastFindingTitle(f.title, false));
    if (fpFindings.length) titles.push('False Positive');
    for (const f of fpFindings) titles.push(this.cleanDastFindingTitle(f.title, true));

    return titles;
  }

  private static async extractPdfPageTexts(pdfPath: string): Promise<string[]> {
    const info = await this.execFileAsync('pdfinfo', [pdfPath], { timeout: 120000 });
    const pagesMatch = String(info.stdout || '').match(/Pages:\s+(\d+)/i);
    const pages = pagesMatch ? Number.parseInt(pagesMatch[1], 10) : 0;
    if (!pages || pages < 1) return [];

    const texts: string[] = [];
    for (let i = 1; i <= pages; i++) {
      const out = await this.execFileAsync('pdftotext', ['-f', String(i), '-l', String(i), '-layout', pdfPath, '-'], { timeout: 120000 });
      texts.push(String(out.stdout || ''));
    }
    return texts;
  }

  private static async buildDastActualTocPages(pdfPath: string, data: ReportData): Promise<Map<string, number>> {
    const pageTexts = await this.extractPdfPageTexts(pdfPath);
    const pages = new Map<string, number>();
    if (!pageTexts.length) return pages;

    const normalizedPageTexts = pageTexts.map((pageText) => this.normalizeDastTocText(pageText));
    const normalizedPageLines = pageTexts.map((pageText) =>
      String(pageText || '')
        .split(/\r?\n/)
        .map((line) => this.normalizeDastTocText(line))
        .filter(Boolean)
    );

    const findStandalonePage = (title: string, startPage = 3): number | null => {
      const needle = this.normalizeDastTocText(title);
      if (!needle) return null;
      for (let i = Math.max(startPage - 1, 0); i < normalizedPageTexts.length; i++) {
        if (normalizedPageTexts[i].includes(needle)) {
          return i + 1;
        }
      }
      return null;
    };

    const findExactLinePage = (title: string, startPage = 3): number | null => {
      const needle = this.normalizeDastTocText(title);
      if (!needle) return null;
      for (let i = Math.max(startPage - 1, 0); i < normalizedPageLines.length; i++) {
        if (normalizedPageLines[i].some((line) => line === needle)) {
          return i + 1;
        }
      }
      return null;
    };

    const titles = this.buildDastTocTitles(data);
    const detailedPage = findExactLinePage('Detailed Vulnerabilities', 3) ?? 5;
    const contentStartPage = detailedPage;
    const tpHeadingPage = findExactLinePage('True Positive', contentStartPage) ?? contentStartPage;
    const fpHeadingPage = findExactLinePage('False Positive', Math.max(contentStartPage, tpHeadingPage)) ?? pageTexts.length;

    // Static sections and section headings.
    for (const title of ['Scope', 'Application Details', 'User Roles', 'Tools', 'Assessment Limitation', 'Vulnerabilities', 'Summary', 'Detailed Vulnerabilities']) {
      const page = findStandalonePage(title);
      if (page) pages.set(title, page);
    }

    if (tpHeadingPage) pages.set('True Positive', tpHeadingPage);
    if (fpHeadingPage) pages.set('False Positive', fpHeadingPage);

    const findings = Array.isArray(data.findings) ? data.findings : [];
    const tpFindings = findings.filter((f: any) => String(f.finding_type || '') !== 'false_positive');
    const fpFindings = findings.filter((f: any) => String(f.finding_type || '') === 'false_positive');

    for (const finding of tpFindings) {
      const title = this.cleanDastFindingTitle(finding.title, false);
      const page = findStandalonePage(title, contentStartPage);
      if (page) pages.set(title, page);
    }

    for (const finding of fpFindings) {
      const title = this.cleanDastFindingTitle(finding.title, true);
      const page = findStandalonePage(title, Math.max(fpHeadingPage, contentStartPage));
      if (page) pages.set(title, page);
    }

    // Make sure TOC titles we know about remain in a deterministic order.
    for (const title of titles) {
      if (!pages.has(title)) {
        const page = findStandalonePage(title, contentStartPage);
        if (page) pages.set(title, page);
      }
    }

    return pages;
  }

  private static patchDastTocPageNumbers(docxBuffer: Buffer, pageMap: Map<string, number>, data: ReportData): Buffer {
    let PizZip: any;
    let cheerio: any;
    try {
      PizZip = require('pizzip');
      cheerio = require('cheerio');
    } catch {
      return docxBuffer;
    }

    try {
      const zip = new PizZip(docxBuffer);
      const documentPath = 'word/document.xml';
      const documentXml = zip.file(documentPath)?.asText() || '';
      if (!documentXml) return docxBuffer;

      const $ = cheerio.load(documentXml, { xmlMode: true });
      const tocSdt = $('w\\:body w\\:sdt').filter((_: number, el: any) => $(el).find('w\\:docPartGallery').length > 0).first();
      if (!tocSdt.length) return docxBuffer;

      const tocContent = tocSdt.find('w\\:sdtContent').first();
      const tocParas = tocContent.find('w\\:p').toArray();
      const titles = this.buildDastTocTitles(data);
      let searchIdx = 0;

      for (const title of titles) {
        const page = pageMap.get(title);
        if (!page) continue;
        const needle = this.normalizeDastTocText(title);
        let matchedIdx = -1;
        for (let i = searchIdx; i < tocParas.length; i++) {
          const paraText = $(tocParas[i]).find('w\\:t').toArray().map((n: any) => $(n).text()).join(' ');
          const normalized = this.normalizeDastTocText(paraText);
          if (normalized === needle || normalized.includes(needle)) {
            matchedIdx = i;
            break;
          }
        }
        if (matchedIdx === -1) continue;

        const tNodes = $(tocParas[matchedIdx]).find('w\\:t').toArray();
        if (tNodes.length > 0) {
          $(tNodes[tNodes.length - 1]).text(String(page));
        }
        searchIdx = matchedIdx + 1;
      }

      zip.file(documentPath, $.xml());
      return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    } catch {
      return docxBuffer;
    }
  }

  private static async postProcessBlueAllyPdf(
    loPdfPath: string,
    docxBuffer: Buffer,
    tempDir: string,
    data: ReportData
  ): Promise<Buffer> {
    // LibreOffice tends to split the cover background image onto an extra page.
    // Strategy:
    // 1) Create a synthetic 1-page cover PDF.
    // 2) Extract pages 3..end from LO output (TOC and onward).
    // 3) Concatenate: cover + (pages 3..end).
    const coverPdfPath = path.join(tempDir, 'blueally-cover.pdf');
    const restPdfPath = path.join(tempDir, 'blueally-rest.pdf');
    const mergedPdfPath = path.join(tempDir, 'blueally-merged.pdf');

    await this.createBlueAllyCoverPdf(docxBuffer, data, coverPdfPath);

    // Extract pages starting from 3 (page 2 is the cover background spill page).
    await this.execFileAsync('qpdf', ['--empty', '--pages', loPdfPath, '3-z', '--', restPdfPath], { timeout: 120000 });
    // Merge using qpdf (more robust than pdfunite for LO-generated PDFs).
    await this.execFileAsync('qpdf', ['--empty', '--pages', coverPdfPath, '1', restPdfPath, '1-z', '--', mergedPdfPath], { timeout: 120000 });

    return fs.readFileSync(mergedPdfPath);
  }

  private static async createBlueAllyCoverPdf(docxBuffer: Buffer, data: ReportData, outPath: string): Promise<void> {
    let PizZip: any;
    let PDFDocument: any;
    try {
      PizZip = require('pizzip');
      PDFDocument = require('pdfkit');
    } catch {
      // Best-effort: if deps missing, skip cover synthesis.
      throw new Error('Missing deps for BlueAlly cover synthesis');
    }

    const zip = new PizZip(docxBuffer);
    const bg = zip.file('word/media/image1.jpg')?.asNodeBuffer?.();
    const logo = zip.file('word/media/image27.png')?.asNodeBuffer?.();
    if (!bg || !logo) {
      throw new Error('Cover assets not found in DOCX (image1.jpg / image27.png)');
    }

    const { project } = data as any;
    const clientName = String(project?.client_name || project?.clientName || 'N/A');
    const startDate = project?.start_date ? formatDate(new Date(project.start_date), 'MMMM dd, yyyy') : null;
    const originalTest = startDate ? `Original Test: ${startDate}` : 'Original Test: N/A';

    const doc = new PDFDocument({ size: 'LETTER', margin: 0 });
    await new Promise<void>((resolve, reject) => {
      const stream = fs.createWriteStream(outPath);
      stream.on('error', reject);
      doc.on('error', reject);
      stream.on('finish', () => resolve());
      doc.pipe(stream);

      const pageW = 612;

      // Background image matches Letter aspect ratio; draw it full-bleed.
      doc.image(bg, 0, 0, { width: 612, height: 792 });

      // Top URL (white, top-right)
      doc.fillColor('#ffffff').fontSize(12).font('Times-Bold');
      doc.text('blueally.com', 48, 28, { width: pageW - 96, align: 'right' });

      // Logo (3-leaf flower). Reduce width and move lower so it sits on the white area
      // instead of overlapping the sky-blue curve. These values were tuned against
      // the provided screenshots.
      const logoW = 220; // smaller than before
      const logoX = (pageW - logoW) / 2;
      const logoY = 250; // push down slightly
      doc.image(logo, logoX, logoY, { width: logoW });

      // Middle texts
      doc.fillColor('#001278').font('Times-Bold').fontSize(24);
      doc.text('blueAlly', 0, 415, { width: pageW, align: 'center' });

      doc.fontSize(16);
      doc.text(`Prepared for: ${clientName}`, 0, 460, { width: pageW, align: 'center' });

      doc.font('Times-Roman').fontSize(16);
      doc.text(originalTest, 0, 505, { width: pageW, align: 'center' });

      doc.end();
    });
  }

  private static patchDocxHeadingsForLibreOfficePdf(docxBuffer: Buffer): Buffer {
    // Best-effort: if deps aren't present, don't fail report generation.
    let PizZip: any;
    let cheerio: any;
    try {
      PizZip = require('pizzip');
      cheerio = require('cheerio');
    } catch {
      return docxBuffer;
    }

    const targetHeadings = new Set([
      'Table of Contents',
      'Introduction',
      'Approach',
      'Scope',
      'Findings and Recommendation',
      'Vulnerabilities',
    ]);

    try {
      const zip = new PizZip(docxBuffer);
      const documentPath = 'word/document.xml';
      const documentFile = zip.file(documentPath);
      const documentXml = documentFile && typeof (documentFile as any).asText === 'function' ? (documentFile as any).asText() : '';
      if (!documentXml) return docxBuffer;

      const $ = cheerio.load(documentXml, { xmlMode: true });

      // Patch the expanded TOC field results (these often contain Arial runs, which
      // LibreOffice substitutes differently during PDF export). Limit changes strictly
      // to the TOC field's result range.
      {
        let inToc = false;
        let seenTocBegin = false;

        const setRunFontsToRoboto = (scope: any) => {
          $(scope)
            .find('w\\:r')
            .each((__: number, r: any) => {
              let rPr = $(r).children('w\\:rPr').first();
              if (!rPr.length) {
                $(r).prepend('<w:rPr/>');
                rPr = $(r).children('w\\:rPr').first();
              }
              let rFonts = rPr.children('w\\:rFonts').first();
              if (!rFonts.length) {
                rPr.prepend('<w:rFonts/>');
                rFonts = rPr.children('w\\:rFonts').first();
              }
              rFonts.attr('w:ascii', 'Roboto');
              rFonts.attr('w:hAnsi', 'Roboto');
              rFonts.attr('w:cs', 'Roboto');
              rFonts.attr('w:eastAsia', 'Roboto');
            });
        };

        // Walk paragraphs in order so we can track field state across paragraph boundaries.
        $('w\\:p').each((_: number, p: any) => {
          const pXml = $.xml(p);
          if (!seenTocBegin && /<w:instrText[^>]*>\s*TOC\b/i.test(pXml)) {
            seenTocBegin = true;
          }

          if (seenTocBegin) {
            if (pXml.includes('w:fldCharType="separate"')) {
              inToc = true;
              // Everything after the separate is field result.
            }
            if (inToc) {
              setRunFontsToRoboto(p);
            }
            if (inToc && pXml.includes('w:fldCharType="end"')) {
              // End of this TOC field.
              inToc = false;
              seenTocBegin = false;
            }
          }
        });
      }

      const paraText = (pEl: any): string => {
        const parts: string[] = [];
        $(pEl)
          .find('w\\:t')
          .each((_: number, t: any) => {
            const v = $(t).text();
            if (v) parts.push(v);
          });
        return parts.join('').replace(/\s+/g, ' ').trim();
      };

      const ensurePPrChild = (p: any, tag: string, attrs: Record<string, string>, prepend = false) => {
        let pPr = $(p).children('w\\:pPr').first();
        if (!pPr.length) {
          $(p).prepend('<w:pPr/>');
          pPr = $(p).children('w\\:pPr').first();
        }
        let node = pPr.children(`w\\:${tag}`).first();
        if (!node.length) {
          const attrStr = Object.entries(attrs)
            .map(([k, v]) => `${k}="${String(v)}"`)
            .join(' ');
          const xmlNode = `<w:${tag} ${attrStr}/>`;
          if (prepend) pPr.prepend(xmlNode);
          else pPr.append(xmlNode);
          node = pPr.children(`w\\:${tag}`).first();
        } else {
          for (const [k, v] of Object.entries(attrs)) node.attr(k, String(v));
        }
      };

      $('w\\:p').each((_: number, p: any) => {
        const txt = paraText(p);
        if (!targetHeadings.has(txt)) return;

        // Force the template's Heading1 style so LibreOffice keeps the same
        // visual heading treatment (Roboto + green text + green underline rule).
        // This is PDF-only; DOCX output remains unchanged.
        ensurePPrChild(p, 'pStyle', { 'w:val': 'Heading1' }, true);
        // Ensure it's treated as a top-level outline item.
        ensurePPrChild(p, 'outlineLvl', { 'w:val': '0' });

        // Force Roboto on runs within the paragraph.
        $(p)
          .find('w\\:r')
          .each((__: number, r: any) => {
            let rPr = $(r).children('w\\:rPr').first();
            if (!rPr.length) {
              $(r).prepend('<w:rPr/>');
              rPr = $(r).children('w\\:rPr').first();
            }

            // Ensure LibreOffice picks the same heavier headline face.
            let b = rPr.children('w\\:b').first();
            if (!b.length) rPr.prepend('<w:b w:val="1"/>');
            else b.attr('w:val', '1');
            let bCs = rPr.children('w\\:bCs').first();
            if (!bCs.length) rPr.prepend('<w:bCs w:val="1"/>');
            else bCs.attr('w:val', '1');

            let rFonts = rPr.children('w\\:rFonts').first();
            if (!rFonts.length) {
              rPr.prepend('<w:rFonts/>');
              rFonts = rPr.children('w\\:rFonts').first();
            }
            rFonts.attr('w:ascii', 'Roboto');
            rFonts.attr('w:hAnsi', 'Roboto');
            rFonts.attr('w:cs', 'Roboto');
            rFonts.attr('w:eastAsia', 'Roboto');
          });
      });

      zip.file(documentPath, $.xml());

      // LibreOffice may render TOC entries with fallback fonts if TOC* styles don't
      // explicitly set rFonts. Patch TOC styles in the PDF-only copy.
      const stylesPath = 'word/styles.xml';
      const stylesFile = zip.file(stylesPath);
      const stylesXml = stylesFile && typeof (stylesFile as any).asText === 'function' ? (stylesFile as any).asText() : '';
      if (stylesXml) {
        const $s = cheerio.load(stylesXml, { xmlMode: true });
        const tocStyleIds = new Set([
          'TOCHeading',
          'TOCH1',
          'TOCH1Char',
          'TOC1',
          'TOC1Char',
          'TOC2',
          'TOC3',
          'TOC4',
          'TOC5',
          'TOC6',
          'TOC7',
          'TOC8',
          'TOC9',
        ]);

        const ensureStyleFonts = (styleEl: any) => {
          let rPr = $s(styleEl).children('w\\:rPr').first();
          if (!rPr.length) {
            $s(styleEl).append('<w:rPr/>');
            rPr = $s(styleEl).children('w\\:rPr').first();
          }
          let rFonts = rPr.children('w\\:rFonts').first();
          if (!rFonts.length) {
            rPr.prepend('<w:rFonts/>');
            rFonts = rPr.children('w\\:rFonts').first();
          }
          rFonts.attr('w:ascii', 'Roboto');
          rFonts.attr('w:hAnsi', 'Roboto');
          rFonts.attr('w:cs', 'Roboto');
          rFonts.attr('w:eastAsia', 'Roboto');
        };

        $s('w\\:style').each((__: number, st: any) => {
          const id = String($s(st).attr('w:styleId') || '');
          if (!id) return;
          if (tocStyleIds.has(id)) ensureStyleFonts(st);
        });

        zip.file(stylesPath, $s.xml());
      }

      return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    } catch {
      return docxBuffer;
    }
  }

  private static async patchDastDocxForLibreOfficePdf(docxBuffer: Buffer): Promise<Buffer> {
    let PizZip: any;
    let cheerio: any;
    try {
      PizZip = require('pizzip');
      cheerio = require('cheerio');
    } catch {
      return docxBuffer;
    }

    try {
      const zip = new PizZip(docxBuffer);
      console.log('[DAST Patch] Starting patch for LibreOffice PDF conversion');

      // 1) Bullet list fix: LibreOffice incorrectly renders Word-native bullet glyphs
      // (● U+25CF) as oversized green dots. Convert bullet list paragraphs to use an
      // explicit "•" character with proper hanging indent.
      {
        const numberingPath = 'word/numbering.xml';
        const numberingXml = zip.file(numberingPath)?.asText() || '';
        const docPath = 'word/document.xml';
        const docXml = zip.file(docPath)?.asText() || '';
        if (numberingXml && docXml) {
          const $n = cheerio.load(numberingXml, { xmlMode: true });
          const $d = cheerio.load(docXml, { xmlMode: true });

          // Build numId -> abstractNumId mapping
          const numIdToAbstract = new Map<string, string>();
          $n('w\\:num').each((_: number, num: any) => {
            const numId = String($n(num).attr('w:numId') || '');
            const abs = String($n(num).find('w\\:abstractNumId').first().attr('w:val') || '');
            if (numId && abs) numIdToAbstract.set(numId, abs);
          });

          // Build abstractNumId -> (ilvl -> numFmt) mapping
          const absToLvlFmt = new Map<string, Map<string, string>>();
          $n('w\\:abstractNum').each((_: number, abs: any) => {
            const absId = String($n(abs).attr('w:abstractNumId') || '');
            if (!absId) return;
            const lvlMap = new Map<string, string>();
            $n(abs).find('w\\:lvl').each((__: number, lvl: any) => {
              const ilvl = String($n(lvl).attr('w:ilvl') || '');
              const fmt = String($n(lvl).find('w\\:numFmt').first().attr('w:val') || '');
              if (ilvl && fmt) lvlMap.set(ilvl, fmt);
            });
            absToLvlFmt.set(absId, lvlMap);
          });

          // Skip heading/TOC paragraphs
          const isHeadingOrTocPara = (p: any): boolean => {
            const pPr = $d(p).children('w\\:pPr').first();
            const pStyle = String(pPr.find('w\\:pStyle').first().attr('w:val') || '');
            if (/^Heading\d+$/.test(pStyle)) return true;
            if (/^TOC/i.test(pStyle)) return true;
            if ($d(p).find('w\\:instrText').toArray().some((t: any) => /\bTOC\b/i.test($d(t).text()))) return true;
            return false;
          };

          let bulletsConverted = 0;
          $d('w\\:p').each((_: number, p: any) => {
            const pPr = $d(p).children('w\\:pPr').first();
            if (!pPr.length) return;
            const numPr = pPr.children('w\\:numPr').first();
            if (!numPr.length) return;
            if (isHeadingOrTocPara(p)) return;

            const numId = String(numPr.find('w\\:numId').first().attr('w:val') || '');
            const ilvl = String(numPr.find('w\\:ilvl').first().attr('w:val') || '0');
            const absId = numIdToAbstract.get(numId);
            const fmt = absId ? absToLvlFmt.get(absId)?.get(ilvl) : undefined;
            // Only convert bullet lists (not numbered lists)
            if (fmt !== 'bullet') return;

            numPr.remove();

            let ind = pPr.children('w\\:ind').first();
            if (!ind.length) {
              pPr.append('<w:ind/>');
              ind = pPr.children('w\\:ind').first();
            }
            ind.attr('w:left', '720');
            ind.attr('w:hanging', '360');

            const bulletRun = '<w:r><w:rPr><w:color w:val="4EBc22"/></w:rPr><w:t xml:space="preserve">•\t</w:t></w:r>';
            const firstR = $d(p).children('w\\:r').first();
            if (firstR.length) {
              firstR.before(bulletRun);
            } else {
              const pPrNode = pPr.get(0);
              if (pPrNode) $d(pPrNode).after(bulletRun);
              else $d(p).prepend(bulletRun);
            }
            bulletsConverted++;
          });

          console.log(`[DAST Patch] Converted ${bulletsConverted} bullet list paragraph(s) to explicit bullets`);
          zip.file(docPath, $d.xml());
        } else {
          console.log('[DAST Patch] numbering.xml or document.xml missing; skipping bullet workaround');
        }
      }

      // 2) Table shading hardening: DAST template tables have white borders (color=ffffff)
      // that appear invisible in LibreOffice PDF export. Set proper visible borders
      // and ensure header rows have proper colored shading.
      {
        const docPath = 'word/document.xml';
        const docXml = zip.file(docPath)?.asText() || '';
        if (docXml) {
          const $ = cheerio.load(docXml, { xmlMode: true });
          let tablesPatched = 0;

          $('w\\:tbl').each((_: number, tbl: any) => {
            const rows = $(tbl).find('> w\\:tr').toArray();
            if (rows.length < 1) return;
            const headerTexts = $(rows[0]).find('> w\\:tc').toArray().map((tc: any) => $(tc).text().replace(/\s+/g, ' ').trim().toLowerCase());
            const isSummaryTable = headerTexts.includes('vulnerability') && headerTexts.includes('status') && headerTexts.includes('risk');

            // Set visible borders on the table (dark gray, single, 4pt)
            let tblPr = $(tbl).children('w\\:tblPr').first();
            if (!tblPr.length) {
              $(tbl).prepend('<w:tblPr/>');
              tblPr = $(tbl).children('w\\:tblPr').first();
            }
            // Remove any existing tblBorders
            tblPr.find('w\\:tblBorders').remove();

            // Add subtle borders so the PDF matches the softer DOCX table grid.
            const borderXml = [
              '<w:tblBorders>',
              '  <w:top w:val="single" w:sz="2" w:space="0" w:color="d9f6ce"/>',
              '  <w:bottom w:val="single" w:sz="2" w:space="0" w:color="d9f6ce"/>',
              '  <w:left w:val="single" w:sz="2" w:space="0" w:color="d9f6ce"/>',
              '  <w:right w:val="single" w:sz="2" w:space="0" w:color="d9f6ce"/>',
              '  <w:insideH w:val="single" w:sz="2" w:space="0" w:color="d9f6ce"/>',
              '  <w:insideV w:val="single" w:sz="2" w:space="0" w:color="d9f6ce"/>',
              '</w:tblBorders>',
            ].join('');
            tblPr.prepend(borderXml);

            // Force table width to 100% of page
            let tblW = tblPr.find('w\\:tblW').first();
            if (tblW.length) {
              tblW.attr('w:type', 'pct');
              tblW.attr('w:w', '5000');
            } else {
              tblPr.prepend('<w:tblW w:type="pct" w:w="5000"/>');
            }

            // Ensure header row has proper dark shading with white text
            $(rows[0]).find('> w\\:tc').each((__: number, tc: any) => {
              let tcPr = $(tc).children('w\\:tcPr').first();
              if (!tcPr.length) {
                $(tc).prepend('<w:tcPr/>');
                tcPr = $(tc).children('w\\:tcPr').first();
              }
              // Set header fill color (green, matching DOCX template)
              let shd = tcPr.children('w\\:shd').first();
              if (shd.length) {
                shd.attr('w:val', 'clear');
                shd.attr('w:color', 'auto');
                shd.attr('w:fill', '4EBc22');
              } else {
                tcPr.append('<w:shd w:val="clear" w:color="auto" w:fill="4EBc22"/>');
              }
              // White text on header
              $(tc).find('w\\:r').each((___: number, r: any) => {
                let rPr = $(r).children('w\\:rPr').first();
                if (!rPr.length) {
                  $(r).prepend('<w:rPr/>');
                  rPr = $(r).children('w\\:rPr').first();
                }
                let colorNode = rPr.children('w\\:color').first();
                if (!colorNode.length) {
                  rPr.append('<w:color w:val="FFFFFF"/>');
                } else {
                  colorNode.attr('w:val', 'FFFFFF');
                }
              });
            });

            // Body rows: alternating light green shading (matching DOCX template)
            for (let ri = 1; ri < rows.length; ri++) {
              const bodyFill = ri % 2 === 0 ? 'eafde3' : 'd9f6ce';
              $(rows[ri]).find('> w\\:tc').each((__: number, tc: any) => {
                let tcPr = $(tc).children('w\\:tcPr').first();
                if (!tcPr.length) {
                  $(tc).prepend('<w:tcPr/>');
                  tcPr = $(tc).children('w\\:tcPr').first();
                }
                let shd = tcPr.children('w\\:shd').first();
                if (shd.length) {
                  shd.attr('w:val', 'clear');
                  shd.attr('w:color', 'auto');
                  shd.attr('w:fill', bodyFill);
                } else {
                  tcPr.append(`<w:shd w:val="clear" w:color="auto" w:fill="${bodyFill}"/>`);
                }
                // Ensure body text is dark
                $(tc).find('w\\:r').each((___: number, r: any) => {
                  let rPr = $(r).children('w\\:rPr').first();
                  if (!rPr.length) {
                    $(r).prepend('<w:rPr/>');
                    rPr = $(r).children('w\\:rPr').first();
                  }
                  let colorNode = rPr.children('w\\:color').first();
                  if (!colorNode.length) {
                    rPr.append('<w:color w:val="121212"/>');
                  } else {
                    // Only force dark if it was white (stray template styling)
                    const cur = String(colorNode.attr('w:val') || '').toLowerCase();
                    if (cur === 'ffffff' || cur === 'fff') {
                      colorNode.attr('w:val', '121212');
                    }
                  }
                });
              });
            }

            if (isSummaryTable) {
              for (let ri = 1; ri < rows.length; ri++) {
                const tc = $(rows[ri]).find('> w\\:tc').eq(2);
                if (!tc.length) continue;
                const severity = tc.text().replace(/\s+/g, ' ').trim();
                if (!severity) continue;
                let tcPr = tc.children('w\\:tcPr').first();
                if (!tcPr.length) { tc.prepend('<w:tcPr/>'); tcPr = tc.children('w\\:tcPr').first(); }
                let shd = tcPr.children('w\\:shd').first();
                const fill = this.severityFill(severity);
                if (shd.length) {
                  shd.attr('w:val', 'clear');
                  shd.attr('w:color', 'auto');
                  shd.attr('w:fill', fill);
                } else {
                  tcPr.append(`<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>`);
                }
                tc.find('w\\:r').each((__: number, r: any) => {
                  let rPr = $(r).children('w\\:rPr').first();
                  if (!rPr.length) { $(r).prepend('<w:rPr/>'); rPr = $(r).children('w\\:rPr').first(); }
                  let colorNode = rPr.children('w\\:color').first();
                  if (!colorNode.length) rPr.append('<w:color w:val="FFFFFF"/>');
                  else colorNode.attr('w:val', 'FFFFFF');
                });
              }
            }
            tablesPatched++;
          });

          console.log(`[DAST Patch] Patched ${tablesPatched} table(s) with visible borders and shading`);
          zip.file(docPath, $.xml());
        } else {
          console.log('[DAST Patch] document.xml not found');
        }
      }

      const patched = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
      console.log('[DAST Patch] Patch complete');
      return patched;
    } catch (error) {
      console.error('[DAST Patch] Error during patching:', error);
      return docxBuffer;
    }
  }

  private static async patchBlueAllyDocxForLibreOfficePdf(docxBuffer: Buffer): Promise<Buffer> {
    let PizZip: any;
    let cheerio: any;
    let sharp: any;
    try {
      PizZip = require('pizzip');
      cheerio = require('cheerio');
      sharp = require('sharp');
    } catch {
      return docxBuffer;
    }

    try {
      const zip = new PizZip(docxBuffer);
      console.log('[BlueAlly Patch] Starting patch for LibreOffice PDF conversion');

      // 0) LibreOffice can drop bullet glyphs entirely for some Word-style bullet lists.
      // As a PDF-only workaround, convert *bullet* list paragraphs to plain paragraphs with an explicit "• ".
      // IMPORTANT: Do not touch numbered headings/TOC, otherwise headings like "1. Introduction" become bulleted.
      {
        const numberingPath = 'word/numbering.xml';
        const numberingXml = zip.file(numberingPath)?.asText() || '';
        const docPath = 'word/document.xml';
        const docXml = zip.file(docPath)?.asText() || '';
        if (numberingXml && docXml) {
          const $n = cheerio.load(numberingXml, { xmlMode: true });
          const $d = cheerio.load(docXml, { xmlMode: true });

          // Build a mapping: numId -> abstractNumId
          const numIdToAbstract = new Map<string, string>();
          $n('w\\:num').each((_: number, num: any) => {
            const numId = String($n(num).attr('w:numId') || $n(num).attr('numId') || '');
            const abs = String($n(num).find('w\\:abstractNumId').first().attr('w:val') || '');
            if (numId && abs) numIdToAbstract.set(numId, abs);
          });

          // Build a mapping: abstractNumId -> (ilvl -> numFmt)
          const absToLvlFmt = new Map<string, Map<string, string>>();
          $n('w\\:abstractNum').each((_: number, abs: any) => {
            const absId = String($n(abs).attr('w:abstractNumId') || $n(abs).attr('abstractNumId') || '');
            if (!absId) return;
            const lvlMap = new Map<string, string>();
            $n(abs)
              .find('w\\:lvl')
              .each((__: number, lvl: any) => {
                const ilvl = String($n(lvl).attr('w:ilvl') || $n(lvl).attr('ilvl') || '');
                const fmt = String($n(lvl).find('w\\:numFmt').first().attr('w:val') || '');
                if (ilvl && fmt) lvlMap.set(ilvl, fmt);
              });
            absToLvlFmt.set(absId, lvlMap);
          });

          const isHeadingOrTocPara = (p: any): boolean => {
            const pPr = $d(p).children('w\\:pPr').first();
            const pStyle = String(pPr.find('w\\:pStyle').first().attr('w:val') || '');
            if (/^Heading\d+$/.test(pStyle)) return true;
            if (/^TOC/.test(pStyle)) return true;
            // Field-based TOC entries.
            if ($d(p).find('w\\:instrText').toArray().some((t: any) => /\bTOC\b/i.test($d(t).text()))) return true;
            return false;
          };

          let bulletsConverted = 0;
          $d('w\\:p').each((_: number, p: any) => {
            const pPr = $d(p).children('w\\:pPr').first();
            if (!pPr.length) return;
            const numPr = pPr.children('w\\:numPr').first();
            if (!numPr.length) return;
            if (isHeadingOrTocPara(p)) return;

            const numId = String(numPr.find('w\\:numId').first().attr('w:val') || '');
            const ilvl = String(numPr.find('w\\:ilvl').first().attr('w:val') || '0');
            const absId = numIdToAbstract.get(numId);
            const fmt = absId ? absToLvlFmt.get(absId)?.get(ilvl) : undefined;
            if (fmt !== 'bullet') return;

            // Remove numbering so LO won't attempt list layout.
            numPr.remove();

            // Ensure wrapped lines align with the text (not under the bullet).
            // We emulate a standard hanging indent list: bullet at 0.25", text at 0.5".
            let ind = pPr.children('w\\:ind').first();
            if (!ind.length) {
              pPr.append('<w:ind/>');
              ind = pPr.children('w\\:ind').first();
            }
            ind.attr('w:left', '720');
            ind.attr('w:hanging', '360');

            // Use a tab after the bullet so the first line's text starts at the same position
            // as wrapped lines.
            const bulletRun = '<w:r><w:t xml:space="preserve">•\t</w:t></w:r>';

            // Insert explicit bullet run at the beginning.
            // Important: keep <w:pPr> first, otherwise some renderers reorder nodes strangely.
            const firstR = $d(p).children('w\\:r').first();
            if (firstR.length) {
              firstR.before(bulletRun);
            } else {
              const pPrNode = pPr.get(0);
              if (pPrNode) $d(pPrNode).after(bulletRun);
              else $d(p).prepend(bulletRun);
            }

            bulletsConverted++;
          });

          console.log(`[BlueAlly Patch] Converted ${bulletsConverted} bullet list paragraph(s) to explicit bullets`);
          zip.file(docPath, $d.xml());
        } else {
          console.log('[BlueAlly Patch] numbering.xml or document.xml missing; skipping bullet workaround');
        }
      }

      // Additionally: add explicit bullets to reference paragraphs in the PDF-only DOCX copy.
      // Reference paragraphs are those that come after a "Reference:" label and contain hyperlinks.
      // We add an explicit bullet run so the PDF shows "• link" instead of just "link".
      const docPath = 'word/document.xml';
      try {
        const $d2 = cheerio.load(zip.file(docPath)?.asText() || '', { xmlMode: true });
        let added = 0;

        const paraText = (pEl: any): string => {
          const parts: string[] = [];
          $d2(pEl)
            .find('w\\:t')
            .each((_: number, t: any) => {
              const v = $d2(t).text();
              if (v) parts.push(v);
            });
          return parts.join('').trim();
        };

        // Find "Reference:" label paragraphs and mark paragraphs after them as being in the reference section.
        let inReferenceSection = false;
        let referenceMarkEnd = false;
        $d2('w\\:p').each((_: number, p: any) => {
          const $p = $d2(p);
          const txt = paraText(p);

          // Detect end of reference section (typically "Back to Summary" or a new section heading).
          if (inReferenceSection && (txt === 'Back to Summary' || txt === 'Back to summary' || /^Back\s+to/i.test(txt) || /^Recommendation/i.test(txt))) {
            inReferenceSection = false;
            referenceMarkEnd = true;
            return;
          }

          // Detect start of reference section.
          if (/^Reference/i.test(txt) || txt === 'References:') {
            inReferenceSection = true;
            referenceMarkEnd = false;
            return;
          }

          // If we're in the reference section, add a bullet to this paragraph if it contains a hyperlink
          // and doesn't already have a bullet.
          if (inReferenceSection && !referenceMarkEnd) {
            // Skip if inside a table cell or already has numbering.
            if ($p.parents('w\\:tc').length) return;
            const pPr = $p.children('w\\:pPr').first();
            if (pPr.find('w\\:numPr').length) return;

            // If this paragraph contains a hyperlink, add a bullet.
            if ($p.find('w\\:hyperlink').length) {
              // Avoid double-inserting if already starts with a bullet.
              const firstTxt = $p.find('w\\:t').first().text() || '';
              if (/^\s*\u2022\s*/.test(firstTxt)) return;

              // Ensure pPr exists and set hanging indent for wrapped lines.
              if (!pPr.length) { $p.prepend('<w:pPr/>'); }
              const pPr2 = $p.children('w\\:pPr').first();
              pPr2.find('w\\:numPr').remove();
              pPr2.find('w\\:ind').remove();
              pPr2.append('<w:ind w:left="720" w:hanging="360"/>');

              const bulletRun = '<w:r><w:t xml:space="preserve">\u2022\t</w:t></w:r>';
              // Insert bullet before the first hyperlink.
              const firstHyper = $p.children('w\\:hyperlink').first();
              if (firstHyper.length) {
                firstHyper.before(bulletRun);
              } else {
                const firstR = $p.children('w\\:r').first();
                if (firstR.length) {
                  firstR.before(bulletRun);
                } else {
                  const pPrNode = pPr2.get(0);
                  if (pPrNode) $d2(pPrNode).after(bulletRun);
                  else $p.prepend(bulletRun);
                }
              }
              added++;
            }
          }
        });

        if (added) {
          console.log(`[BlueAlly Patch] Inserted explicit bullets for ${added} reference hyperlink(s)`);
          zip.file(docPath, $d2.xml());
        }
      } catch (err) {
        console.log('[BlueAlly Patch] Failed to insert explicit bullets for reference paragraphs:', (err as any)?.message || err);
      }

      // 1) Bullet rendering: do not patch numbering.xml.
      // The template's bullets render acceptably in LibreOffice PDF, and modifying numbering.xml
      // has caused bullets to disappear entirely in some environments.

      // 2) Cover background image: LibreOffice frequently paginates the cover background onto
      // a separate page during DOCX→PDF export. We handle the cover as a PDF post-process step
      // (replace the first 2 pages with a synthetic single-page cover) so keep DOCX patching minimal
      // here.
      const docXml = zip.file(docPath)?.asText() || '';
      if (docXml) {
        console.log('[BlueAlly Patch] Found document.xml, patching scope table shading for PDF fidelity...');
        const $ = cheerio.load(docXml, { xmlMode: true });
        // 2a) Scope table shading: ensure only the header row is blue, body rows unshaded.
        let scopeTablesPatched = 0;
        $('w\\:tbl').each((_: number, tbl: any) => {
          const $tbl = $(tbl);
          const firstCellText = $tbl.find('w\\:tr').first().find('w\\:tc').first().find('w\\:t').text();
          if (!String(firstCellText || '').toLowerCase().includes('domain')) return;

          const rows = $tbl.find('w\\:tr').toArray();
          if (rows.length < 2) return;

          const setCellFill = (tc: any, fill: string | null) => {
            let tcPr = $(tc).children('w\\:tcPr').first();
            if (!tcPr.length) {
              $(tc).prepend('<w:tcPr/>');
              tcPr = $(tc).children('w\\:tcPr').first();
            }
          const shd = tcPr.children('w\\:shd').first();
          if (fill) {
            if (shd.length) {
              shd.attr('w:val', 'clear');
              shd.attr('w:color', 'auto');
              shd.attr('w:fill', fill);
            } else {
              tcPr.append(`<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>`);
            }
          } else {
              // Remove shading entirely so default table background applies.
              if (shd.length) shd.remove();
            }
          };

          // Header row dark blue, remaining rows no fill.
          $(rows[0]).find('w\\:tc').toArray().forEach((tc: any) => setCellFill(tc, '002060'));
          for (let i = 1; i < rows.length; i++) {
            $(rows[i]).find('w\\:tc').toArray().forEach((tc: any) => setCellFill(tc, null));
          }

          scopeTablesPatched++;
        });

        console.log(`[BlueAlly Patch] Patched ${scopeTablesPatched} scope table(s)`);
        zip.file(docPath, $.xml());
      } else {
        console.log('[BlueAlly Patch] document.xml not found');
      }

      // 3) Header decorative line: LibreOffice strips wps:wsp shapes from headers during PDF export.
      // Convert the decorative shapes to raster images in a PDF-only DOCX copy.
      const header1Path = 'word/header1.xml';
      const header1RelsPath = 'word/_rels/header1.xml.rels';
      const header1Xml = zip.file(header1Path)?.asText() || '';
      const header1RelsXml = zip.file(header1RelsPath)?.asText() || '';
      if (header1Xml && header1RelsXml) {
        console.log('[BlueAlly Patch] Found header1.xml, patching decorative shapes for LO PDF...');

        const $h = cheerio.load(header1Xml, { xmlMode: true });
        const $hr = cheerio.load(header1RelsXml, { xmlMode: true });

        const nextRelId = (): string => {
          const ids = new Set<string>();
          $hr('Relationship').each((_: number, r: any) => {
            const id = String($hr(r).attr('Id') || '');
            if (id) ids.add(id);
          });
          let n = 1;
          while (ids.has(`rId${n}`)) n++;
          return `rId${n}`;
        };

        const addImageRel = (target: string): string => {
          const id = nextRelId();
          $hr('Relationships').first().append(
            `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${target}"/>`
          );
          return id;
        };

        const ensurePng = async (width: number, height: number, hex: string): Promise<Buffer> => {
          // sharp expects #RRGGBB.
          const rgb = String(hex).replace('#', '');
          return await sharp({
            create: {
              width,
              height,
              channels: 3,
              background: `#${rgb}`,
            },
          })
            .png()
            .toBuffer();
        };

        // Create raster assets.
        // Accent6 (orange) and Accent1 (blue) are the intended template colors.
        const orangeLine = await ensurePng(1200, 6, 'F28C28');
        const blueBar = await ensurePng(600, 16, '4472C4');

        const mediaLineName = `blueally-header-line-${Date.now()}.png`;
        const mediaBarName = `blueally-header-bar-${Date.now()}.png`;
        zip.file(`word/media/${mediaLineName}`, orangeLine);
        zip.file(`word/media/${mediaBarName}`, blueBar);

        const rIdLine = addImageRel(`media/${mediaLineName}`);
        const rIdBar = addImageRel(`media/${mediaBarName}`);

        // LibreOffice strips the wps:wsp shape (mc:Choice) during PDF export.
        // Force fallback rendering by replacing <mc:AlternateContent> with its <mc:Fallback> children.
        $h('mc\\:AlternateContent').each((_: number, ac: any) => {
          const fb = $h(ac).children('mc\\:Fallback').first();
          if (!fb.length) return;
          // Replace AlternateContent node with fallback content.
          $h(ac).replaceWith(fb.children());
        });

        // Now patch the fallback picture blips.
        let linePatched = 0;
        let barPatched = 0;

        $h('wp\\:anchor').each((_: number, a: any) => {
          const extent = $h(a).children('wp\\:extent').first();
          const cx = Number.parseInt(String(extent.attr('cx') || '0'), 10);
          const cy = Number.parseInt(String(extent.attr('cy') || '0'), 10);
          if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;

          const blip = $h(a).find('pic\\:blipFill a\\:blip').first();
          if (!blip.length) return;

          // Long thin line: cy ~ 25400
          if (cy <= 30000 && cx >= 5500000) {
            blip.attr('r:embed', rIdLine);
            linePatched++;
            return;
          }
          // Thick bar: cy ~ 64135
          if (cy >= 50000 && cy <= 90000 && cx >= 2000000 && cx <= 4000000) {
            blip.attr('r:embed', rIdBar);
            barPatched++;
          }
        });

        console.log(`[BlueAlly Patch] Header decorative raster: line=${linePatched}, bar=${barPatched}`);

        zip.file(header1Path, $h.xml());
        zip.file(header1RelsPath, $hr.xml());
      } else {
        console.log('[BlueAlly Patch] header1.xml or its rels not found');
      }

      const patched = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
      console.log('[BlueAlly Patch] Patch complete, returned patched buffer');
      return patched;
    } catch (error) {
      console.error('[BlueAlly Patch] Error during patching:', error);
      return docxBuffer;
    }
  }

  // Generate Report
  static async generateReport(
    projectId: number,
    templateId: number | null,
    userId: number,
    format: 'docx' | 'pdf' = 'docx',
    findingIds?: number[]
  ): Promise<{ reportId: number; filePath: string }> {
    await this.ensureReportsDir();
    const reportData = await this.buildReportData(projectId, templateId, findingIds);
    const { project, template } = reportData;

    // Generate report based on format
    let filePath: string;
    if (format === 'docx') {
      filePath = await this.generateDOCX(reportData);
    } else {
      filePath = await this.generatePDF(reportData);
    }

    // Save report record
    const reportName = `${project.name}_Report_${formatDate(new Date(), 'yyyyMMdd_HHmmss')}`;
    console.log('💾 Saving report with file_path:', filePath);
    console.log('📝 Format:', format);

    const report = await ReportModel.createReport({
      project_id: projectId,
      template_id: template.id,
      report_name: reportName,
      file_path: filePath,
      file_type: format,
      generated_by: userId,
    });

    console.log('✅ Report saved with ID:', report.id);
    console.log('📄 Saved file_path:', report.file_path);

    return {
      reportId: report.id,
      filePath,
    };
  }

  static async previewReport(
    projectId: number,
    templateId: number | null,
    format: 'docx' | 'pdf' = 'pdf',
    findingIds?: number[]
  ): Promise<PreviewResult> {
    const reportData = await this.buildReportData(projectId, templateId, findingIds);
    const safeProjectName = reportData.project.name.replace(/[^a-z0-9]/gi, '_');

    if (format === 'docx') {
      const buffer = await this.generateDOCXBuffer(reportData);
      return {
        buffer,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileName: `${safeProjectName}_preview.docx`,
      };
    }

    const buffer = await this.generatePDFFromDOCXBuffer(reportData);
    return {
      buffer,
      contentType: 'application/pdf',
      fileName: `${safeProjectName}_preview.pdf`,
    };
  }

  // Get HTML Preview - returns the raw HTML for preview
  static async getHTMLPreview(
    projectId: number,
    templateId: number | null,
    findingIds?: number[]
  ): Promise<string> {
    const reportData = await this.buildReportData(projectId, templateId, findingIds);
    return this.renderReportHTML(reportData);
  }

  // Generate PDF Report using Puppeteer
  private static async generatePDF(data: ReportData): Promise<string> {
    const { project } = data;

    // Generate file
    const fileName = `${project.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
    const filePath = path.join(this.reportsDir, fileName);

    console.log('📄 Generating professional PDF report at:', filePath);

    try {
      const buffer = await this.generatePDFFromDOCXBuffer(data);
      fs.writeFileSync(filePath, buffer);

      console.log('✅ Professional PDF report created successfully:', filePath);
      return filePath;
    } catch (error) {
      console.error('❌ Error generating PDF with Puppeteer:', error);
      throw new ApiError(500, 'Failed to generate PDF report');
    }
  }


  // Unused method: fetchLogoBuffer - commented out

  // Unused method: buildDocHeader - commented out

  // Unused method: buildDocFooter - commented out

  // Unused method: coverPage - commented out

  private static resolveDocxTemplatePath(template: ReportTemplate): string | null {
    const normalized = this.normalizeTemplateData(template);
    const raw = (normalized as any)?.template_data?.docx_template_file;
    const requested = typeof raw === 'string' && raw.trim() ? path.basename(raw.trim()) : null;

    const templateFileRaw = (normalized as any)?.template_data?.template_file;
    const derivedFromHtml = typeof templateFileRaw === 'string' && templateFileRaw.trim()
      ? path.basename(templateFileRaw.trim()).replace(/\.html$/i, '.docx')
      : null;

    const candidates = [requested, derivedFromHtml, 'professional-report-template.docx'].filter(Boolean) as string[];
    for (const name of candidates) {
      const p = path.join(this.templatesDir, name);
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  private static resolveLogoPath(template: ReportTemplate): string | null {
    const raw = (template as any)?.logo_path;
    const logoPath = typeof raw === 'string' && raw.trim() ? raw.trim() : '';

    const candidates: string[] = [];
    if (logoPath) {
      if (path.isAbsolute(logoPath)) {
        candidates.push(logoPath);
      } else {
        candidates.push(path.join(this.templatesDir, logoPath));
        candidates.push(path.join(process.cwd(), logoPath));
      }
    }

    candidates.push(path.join(this.templatesDir, 'securify-logo-light.png'));
    for (const p of candidates) {
      if (p && fs.existsSync(p)) return p;
    }
    return null;
  }

  private static buildDocxTemplateData(data: ReportData) {
    const { project, findings, metadata } = data;

    const asLines = (v: any): string => {
      if (!v) return '';
      if (Array.isArray(v)) return v.filter(Boolean).map(String).join('\n');
      return String(v);
    };

    const normalizeStepsForTemplate = (steps: any): string => {
      if (!steps) return '';
      if (Array.isArray(steps) && steps.length > 0 && typeof steps[0] === 'object' && steps[0] !== null && 'description' in steps[0]) {
        return steps.map((step: any, idx: number) => {
          let text = `Step ${step.stepNumber || idx + 1}: ${step.description || ''}`;
          if (step.caption) text += `\nCaption: ${step.caption}`;
          return text;
        }).join('\n\n');
      }
      if (Array.isArray(steps)) {
        return steps.map((step: any, idx: number) => `Step ${idx + 1}: ${String(step).trim()}`).join('\n');
      }
      return String(steps);
    };

    const findingsForTemplate = (findings || []).map((f: any, i: number) => ({
      index: i + 1,
      id: f.id,
      title: f.title,
      severity: f.severity,
      affected_target: f.affected_target || '',
      description: f.description || '',
      likelihood_severity: f.likelihood?.severity || '',
      likelihood_detail: f.likelihood?.detail || '',
      impact_severity: f.impact?.severity || '',
      impact_detail: f.impact?.detail || '',
      steps_to_reproduce: normalizeStepsForTemplate(f.steps_to_reproduce),
      steps_array: Array.isArray(f.steps_to_reproduce) ? f.steps_to_reproduce : [],
      recommendation: asLines(f.recommendation),
      references: asLines(f.references || f.finding_references),
      tags: asLines(f.tags),
    }));

    const severityCounts = findingsForTemplate.reduce(
      (acc: Record<string, number>, f: any) => {
        const key = String(f.severity || 'unknown').toLowerCase();
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      { critical: 0, high: 0, medium: 0, low: 0, informational: 0, info: 0, unknown: 0 }
    );

    const findingsBySeverity = {
      critical: findingsForTemplate.filter((f: any) => String(f.severity).toLowerCase() === 'critical'),
      high: findingsForTemplate.filter((f: any) => String(f.severity).toLowerCase() === 'high'),
      medium: findingsForTemplate.filter((f: any) => String(f.severity).toLowerCase() === 'medium'),
      low: findingsForTemplate.filter((f: any) => String(f.severity).toLowerCase() === 'low'),
      informational: findingsForTemplate.filter((f: any) => {
        const s = String(f.severity).toLowerCase();
        return s === 'informational' || s === 'info';
      }),
    };

    const findingsTable = findingsForTemplate.map((f: any) => ({
      index: f.index,
      title: f.title,
      severity: f.severity,
      affected_target: f.affected_target,
    }));

    // Static 3x3 matrix used for risk classification pages.
    const riskMatrix = {
      title: 'Risk Matrix',
      subtitle: 'Impact x Likelihood',
      rows: [
        [
          { label: 'Medium', class: 'risk-medium' },
          { label: 'High', class: 'risk-high' },
          { label: 'Critical', class: 'risk-critical' },
        ],
        [
          { label: 'Low', class: 'risk-low' },
          { label: 'Medium', class: 'risk-medium' },
          { label: 'High', class: 'risk-high' },
        ],
        [
          { label: 'Low', class: 'risk-low' },
          { label: 'Low', class: 'risk-low' },
          { label: 'Medium', class: 'risk-medium' }
        ],
      ],
    };

    const logoPath = this.resolveLogoPath(data.template);
    // Try to locate a risk matrix image in public/templates dir for use in DOCX/PDF
    const riskImageCandidates = [
      path.join(process.cwd(), 'public', 'images', 'risk-matrix.png'),
      path.join(process.cwd(), 'public', 'images', 'risk_matrix.png'),
      path.join(process.cwd(), 'public', 'images', 'riskmatrix.png'),
      // JPEG variants — user may have uploaded a JPEG
      path.join(process.cwd(), 'public', 'images', 'risk-matrix.jpeg'),
      path.join(process.cwd(), 'public', 'images', 'risk_matrix.jpeg'),
      path.join(process.cwd(), 'public', 'images', 'riskmatrix.jpeg'),
      path.join(process.cwd(), 'public', 'images', 'risk-matrix.jpg'),
      path.join(process.cwd(), 'public', 'images', 'risk_matrix.jpg'),
      path.join(process.cwd(), 'public', 'images', 'riskmatrix.jpg'),
      // Also check root public folder
      path.join(process.cwd(), 'public', 'risk-matrix.png'),
      path.join(process.cwd(), 'public', 'risk_matrix.png'),
      path.join(process.cwd(), 'public', 'riskmatrix.png'),
      path.join(process.cwd(), 'public', 'risk-matrix.jpeg'),
      path.join(process.cwd(), 'public', 'risk_matrix.jpeg'),
      path.join(process.cwd(), 'public', 'riskmatrix.jpeg'),
      path.join(process.cwd(), 'public', 'risk-matrix.jpg'),
      path.join(process.cwd(), 'public', 'risk_matrix.jpg'),
      path.join(process.cwd(), 'public', 'riskmatrix.jpg'),
      path.join(this.templatesDir, 'risk-matrix.png'),
    ];
    const riskMatrixImagePath = riskImageCandidates.find((p) => fs.existsSync(p)) || null;

    // Keep both flat keys and nested objects so the template can use either style.
    return {
      CLIENT_NAME: project.client_name || 'N/A',
      PROJECT_NAME: project.name || 'N/A',
      DATE: metadata.generatedDate,
      // For docxtemplater-image-module-free (tag: {%logo}) we pass a path when available.
      logo: logoPath,
      template: data.template,
      template_data: (data.template as any)?.template_data,
      project,
      metadata,
      findings: findingsForTemplate,
      findings_table: findingsTable,
      findings_count: findingsForTemplate.length,
      severity_counts: severityCounts,
      findings_by_severity: findingsBySeverity,
      risk_matrix: riskMatrix,
      risk_matrix_image: riskMatrixImagePath ? riskMatrixImagePath : '',
      risk_matrix_image_path: riskMatrixImagePath,
    };
  }

  private static severityFill(severity: string): string {
    const s = String(severity || '').toLowerCase();
    if (s === 'critical') return 'C00000';
    if (s === 'high') return 'FF0000';
    if (s === 'medium') return 'FFC000';
    if (s === 'low') return '00B050';
    return '8DB4E2';
  }

  static async renderStyledDocxTemplateBuffer(templatePath: string, data: ReportData): Promise<Buffer> {
    let PizZip: any;
    let cheerio: any;
    try {
      PizZip = require('pizzip');
      const mod: any = await import('cheerio');
      cheerio = mod?.default ?? mod;
    } catch {
      throw new ApiError(500, 'DOCX template rendering requires `pizzip` and `cheerio`.');
    }

    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    // Ensure the template defaults to Roboto (Google Docs otherwise falls back to Calibri).
    // This updates docDefaults and a few common named styles if present.
    {
      const stylesXml = zip.file('word/styles.xml')?.asText();
      if (stylesXml) {
        const $styles = cheerio.load(stylesXml, { xmlMode: true, decodeEntities: false });

        const setFontsOn = (node: any) => {
          const n = $styles(node);
          if (!n.length) return;
          let rFonts = n.find('w\\:rFonts').first();
          if (!rFonts.length) {
            n.prepend('<w:rFonts/>');
            rFonts = n.find('w\\:rFonts').first();
          }
          rFonts.attr('w:ascii', 'Roboto');
          rFonts.attr('w:hAnsi', 'Roboto');
          rFonts.attr('w:cs', 'Roboto');
          rFonts.attr('w:eastAsia', 'Roboto');
        };

        // doc defaults
        const docDefaults = $styles('w\\:docDefaults w\\:rPrDefault w\\:rPr').first();
        if (docDefaults.length) setFontsOn(docDefaults);

        // Common styles: Normal + headings
        ['Normal', 'Heading1', 'Heading2', 'Heading3'].forEach((styleId) => {
          const style = $styles(`w\\:style[w\\:styleId="${styleId}"]`).first();
          const rPr = style.find('w\\:rPr').first();
          if (rPr.length) setFontsOn(rPr);
        });

        zip.file('word/styles.xml', $styles.xml());
      }
    }
    const documentXml = zip.file('word/document.xml')?.asText();
    if (!documentXml) {
      throw new ApiError(500, 'DOCX template is missing word/document.xml');
    }

    const $ = cheerio.load(documentXml, { xmlMode: true, decodeEntities: false });

    const body = $('w\\:body').first();
    // Include w:sdt (content controls). Google Docs templates often wrap tables in <w:sdt>.
    // If we ignore these, section/table reordering logic can't see or move the table blocks.
    const bodyChildren = () => body.children().toArray().filter((el: any) => ['w:p', 'w:tbl', 'w:sdt'].includes(el.tagName));
    const paraText = (el: any): string => $(el).find('w\\:t').toArray().map((n: any) => $(n).text()).join('').trim();
    const escapeXmlText = (text: string): string => {
      // Decode existing common entities first (avoid double-encoding)
      let decoded = String(text)
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
      // Now encode as XML only if not already
      return decoded
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    };
    const setParaText = (el: any, text: string) => {
      const runNodes = $(el).find('w\\:r').toArray();
      const tNodes = $(el).find('w\\:t').toArray();
      if (!tNodes.length) return;

      const parts = String(text ?? '').split(/\n/);
      if (parts.length <= 1) {
        $(tNodes[0]).replaceWith(`<w:t xml:space="preserve">${escapeXmlText(String(text ?? ''))}</w:t>`);
        for (let i = 1; i < tNodes.length; i++) $(tNodes[i]).text('');
        return;
      }

      // Clear existing runs and rebuild with explicit line breaks.
      const p = $(el);
      p.find('w\\:r').remove();
      p.find('w\\:hyperlink').remove();

      // Reuse formatting from the first original run (if any).
      const rPrXml = runNodes.length ? ($(runNodes[0]).find('w\\:rPr').first().length ? $.xml($(runNodes[0]).find('w\\:rPr').first()) : '') : '';
      const makeRun = (innerXml: string) => `<w:r>${rPrXml}${innerXml}</w:r>`;
      const runsXml: string[] = [];
      parts.forEach((pText, idx) => {
        if (idx > 0) runsXml.push(makeRun('<w:br/>'));
        runsXml.push(makeRun(`<w:t xml:space="preserve">${escapeXmlText(pText)}</w:t>`));
      });
      p.append(runsXml.join(''));
    };
    const setParagraphSegments = (
      scope: any,
      paragraphEl: any,
      segments: Array<{ text: string; bold?: boolean; italic?: boolean; color?: string; underline?: string; size?: number }>,
    ) => {
      const p = scope(paragraphEl);
      p.children('w\\:r').remove();
      p.children('w\\:hyperlink').remove();

      const segmentXml = segments
        .filter((segment) => segment.text)
        .map((segment) => {
          const rPrParts: string[] = [];
          if (segment.bold) {
            rPrParts.push('<w:b w:val="1"/><w:bCs w:val="1"/>');
          }
          if (segment.italic) {
            rPrParts.push('<w:i w:val="1"/><w:iCs w:val="1"/>');
          }
          if (segment.color) {
            rPrParts.push(`<w:color w:val="${segment.color}"/>`);
          }
          if (segment.underline) {
            rPrParts.push(`<w:u w:val="${segment.underline}"/>`);
          }
          if (segment.size) {
            rPrParts.push(`<w:sz w:val="${segment.size}"/><w:szCs w:val="${segment.size}"/>`);
          }
          const rPrXml = rPrParts.length ? `<w:rPr>${rPrParts.join('')}</w:rPr>` : '';
          return `<w:r>${rPrXml}<w:t xml:space="preserve">${escapeXmlText(segment.text)}</w:t></w:r>`;
        })
        .join('');

      p.append(segmentXml);
    };
    const cloneNode = (el: any) => cheerio.load($.xml(el), { xmlMode: true, decodeEntities: false }).root().children().first();

    // Image handling for DOCX
    const imageMap: Map<string, { relId: string; relTarget: string }> = new Map();
    let imageCounter = 0;

    const addImageToZip = async (imagePath: string, findingId: number, stepIdx: number): Promise<string | null> => {
      try {
        const imageKey = `finding_${findingId}_step_${stepIdx}`;
        if (imageMap.has(imageKey)) {
          return imageMap.get(imageKey)!.relId;
        }

        let binaryData: Buffer;

        // Check if it's an S3 key (doesn't start with http:// or https:// or /images/)
        const isS3Key = !imagePath.startsWith('http://') && !imagePath.startsWith('https://') && !imagePath.startsWith('/images/') && !imagePath.startsWith('data:');

        if (isS3Key) {
          // It's an S3 key - generate signed URL and download
          console.log(`   ☁️  Downloading from S3: ${imagePath}`);
          const s3Service = require('./s3.service').default;
          const signedUrl = await s3Service.getSignedUrl(imagePath, 3600);
          console.log(`   🔗 Generated signed URL`);

          // Download image from S3
          const https = require('https');
          const http = require('http');
          const protocol = signedUrl.startsWith('https') ? https : http;

          binaryData = await new Promise<Buffer>((resolve, reject) => {
            protocol.get(signedUrl, (res: any) => {
              const chunks: Buffer[] = [];
              res.on('data', (chunk: Buffer) => chunks.push(chunk));
              res.on('end', () => resolve(Buffer.concat(chunks)));
              res.on('error', reject);
            }).on('error', reject);
          });

          console.log(`   📄 Downloaded ${binaryData.length} bytes from S3`);
        } else if (imagePath.startsWith('/images/')) {
          // Local file path
          const fullPath = path.join(process.cwd(), 'public', imagePath);
          console.log(`   📁 Reading image from: ${fullPath}`);
          if (!fs.existsSync(fullPath)) {
            console.log(`   ❌ Image file not found: ${fullPath}`);
            return null;
          }
          binaryData = fs.readFileSync(fullPath);
          console.log(`   📄 Read ${binaryData.length} bytes`);
        } else if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
          // Already a URL (signed URL) - download it
          console.log(`   🌐 Downloading from URL: ${imagePath.substring(0, 100)}...`);
          const https = require('https');
          const http = require('http');
          const protocol = imagePath.startsWith('https') ? https : http;

          binaryData = await new Promise<Buffer>((resolve, reject) => {
            protocol.get(imagePath, (res: any) => {
              const chunks: Buffer[] = [];
              res.on('data', (chunk: Buffer) => chunks.push(chunk));
              res.on('end', () => resolve(Buffer.concat(chunks)));
              res.on('error', reject);
            }).on('error', reject);
          });

          console.log(`   📄 Downloaded ${binaryData.length} bytes`);
        } else {
          // Handle base64 data
          const base64 = imagePath.includes('base64,') ? imagePath.split('base64,')[1] : imagePath;
          binaryData = Buffer.from(base64, 'base64');
        }

        // Determine image type and extension
        const mimeType = (() => {
          const firstBytes = binaryData[0];
          if (firstBytes === 0xFF) return 'image/jpeg';
          if (firstBytes === 0x89) return 'image/png';
          if (firstBytes === 0x47) return 'image/gif';
          if (firstBytes === 0x52) return 'image/webp';
          return 'image/jpeg';
        })();

        const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/gif' ? 'gif' : mimeType === 'image/webp' ? 'webp' : 'jpg';
        const mediaFileName = `image_${findingId}_${stepIdx}.${ext}`;
        const zipMediaPath = `word/media/${mediaFileName}`;
        const relTarget = `media/${mediaFileName}`;

        zip.file(zipMediaPath, binaryData);

        imageCounter++;
        const relId = `rId${1000 + imageCounter}`;
        imageMap.set(imageKey, { relId, relTarget });

        console.log(`   📷 Added image to zip: ${zipMediaPath} (${relId})`);
        return relId;
      } catch (err) {
        console.error(`   ❌ Failed to add image:`, err);
        return null;
      }
    };

    const getOrCreateRels = (): any => {
      const relsPath = 'word/_rels/document.xml.rels';
      let relsContent = zip.file(relsPath)?.asText();

      if (!relsContent) {
        relsContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;
      }

      return cheerio.load(relsContent, { xmlMode: true, decodeEntities: false });
    };

    const addImageRelationship = (relId: string, relTarget: string): void => {
      const $rels = getOrCreateRels();
      const existingRel = $rels(`Relationship[Target="${relTarget}"]`);
      if (!existingRel.length) {
        $rels('Relationships').append(`<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${relTarget}"/>`);
        zip.file('word/_rels/document.xml.rels', $rels.xml());
        console.log(`   🔗 Added relationship: ${relId} -> ${relTarget}`);
      } else {
        console.log(`   🔗 Relationship already exists: ${relId} -> ${relTarget}`);
      }
    };

    const createImageDrawing = (relId: string, widthEMU: number = 6200000, heightEMU: number = 3600000): string => {
      // Center the image and use a larger default size for report screenshots.
      return `<w:p>
        <w:pPr>
          <w:pStyle w:val="Normal"/>
          <w:jc w:val="center"/>
        </w:pPr>
        <w:r>
          <w:drawing>
            <wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
              <wp:extent cx="${widthEMU}" cy="${heightEMU}"/>
              <wp:docPr id="1" name="Picture ${relId}"/>
              <a:graphic>
                <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                    <pic:nvPicPr>
                      <pic:cNvPr id="1" name="image"/>
                      <pic:cNvPicPr/>
                    </pic:nvPicPr>
                    <pic:blipFill>
                      <a:blip r:embed="${relId}"/>
                      <a:stretch>
                        <a:fillRect/>
                      </a:stretch>
                    </pic:blipFill>
                    <pic:spPr>
                      <a:xfrm>
                        <a:off x="0" y="0"/>
                        <a:ext cx="${widthEMU}" cy="${heightEMU}"/>
                      </a:xfrm>
                      <a:prstGeom prst="rect">
                        <a:avLst/>
                      </a:prstGeom>
                    </pic:spPr>
                  </pic:pic>
                </a:graphicData>
              </a:graphic>
            </wp:inline>
          </w:drawing>
        </w:r>
      </w:p>`;
    };

    const clearRunFormatting = (scope: any, root: any, opts?: { bold?: boolean; color?: string; underline?: string }) => {
      scope(root).find('w\\:r').each((_: number, r: any) => {
        let rPr = scope(r).children('w\\:rPr').first();
        if (!rPr.length) {
          scope(r).prepend('<w:rPr/>');
          rPr = scope(r).children('w\\:rPr').first();
        }

        rPr.children('w\\:b').remove();
        rPr.children('w\\:bCs').remove();
        rPr.children('w\\:u').remove();
        rPr.children('w\\:color').remove();

        if (opts?.bold) {
          rPr.append('<w:b w:val="1"/><w:bCs w:val="1"/>');
        }
        if (opts?.underline) {
          rPr.append(`<w:u w:val="${opts.underline}"/>`);
        }
        if (opts?.color) {
          rPr.append(`<w:color w:val="${opts.color}"/>`);
        }
      });
    };
    const ensureShading = (cell: any, fill: string) => {
      let tcPr = $(cell).children('w\\:tcPr').first();
      if (!tcPr.length) {
        $(cell).prepend('<w:tcPr/>');
        tcPr = $(cell).children('w\\:tcPr').first();
      }
      let shd = tcPr.children('w\\:shd').first();
      if (!shd.length) {
        tcPr.append(`<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>`);
      } else {
        shd.attr('w:val', 'clear');
        shd.attr('w:color', 'auto');
        shd.attr('w:fill', fill);
      }
    };
    const ensureTextColor = (cell: any, color: string) => {
      $(cell).find('w\\:r').each((_: number, r: any) => {
        let rPr = $(r).children('w\\:rPr').first();
        if (!rPr.length) {
          $(r).prepend('<w:rPr/>');
          rPr = $(r).children('w\\:rPr').first();
        }
        let colorNode = rPr.children('w\\:color').first();
        if (!colorNode.length) {
          rPr.append(`<w:color w:val="${color}"/>`);
        } else {
          colorNode.attr('w:val', color);
        }
      });
    };
    const applySimpleTableTheme = (tbl: any, opts?: { headerFill?: string; bodyFill?: string; preserveSecondColumnSeverity?: boolean }) => {
      const headerFill = opts?.headerFill || '4CC51F';
      const bodyFill = opts?.bodyFill || 'E2F3DA';
      const rows = $(tbl).find('> w\\:tr').toArray();
      rows.forEach((row: any, rowIndex: number) => {
        const cells = $(row).find('> w\\:tc').toArray();
        cells.forEach((cell: any, cellIndex: number) => {
          if (rowIndex === 0) {
            ensureShading(cell, headerFill);
            ensureTextColor(cell, 'FFFFFF');
          } else if (!(opts?.preserveSecondColumnSeverity && cellIndex === 1)) {
            ensureShading(cell, bodyFill);
          }
        });
      });
    };

    const replaceAllParagraphText = (from: string, to: string) => {
      body.find('w\\:p').each((_: number, p: any) => {
        if (paraText(p) === from) setParaText(p, to);
      });
    };

    const templateKey = data.template ? getTemplateKey(data.template) : 'unknown';
    const isDast = templateKey === 'dast';

    if (!isDast) {
      replaceAllParagraphText('Client Name', data.project.client_name || 'N/A');
      replaceAllParagraphText('November 26, 2025', data.metadata.generatedDate);
    }

    // Extract start and end dates from project
    const startDate = (data.project as any)?.start_date
      ? formatDate(new Date((data.project as any).start_date), 'MMMM dd, yyyy')
      : 'Start Date';
    const endDate = (data.project as any)?.end_date
      ? formatDate(new Date((data.project as any).end_date), 'MMMM dd, yyyy')
      : 'End Date';

    body.find('w\\:p').each((_: number, p: any) => {
      const text = paraText(p);
      if (!text) return;
      if (text.includes('Client Name')) {
        setParaText(p, text.replace(/Client Name/g, data.project.client_name || 'N/A'));
        return;
      }
      // Robust cover-title replacement: match paragraphs containing both keywords
      // (exact match often fails when Word splits runs with different formatting).
      if (text.includes('Web Application') && text.includes('Penetration Test Report')) {
        setParaText(p, data.project.name || 'Penetration Test Report');
        return;
      }
      if (text.includes('The assessment was conducted between Start Date and End Date.')) {
        const replaced = text
          .replace(/Client Name/g, data.project.client_name || 'N/A')
          .replace(/Start Date/g, startDate)
          .replace(/End Date/g, endDate);
        setParaText(p, replaced);
        return;
      }
      // Also handle any other occurrences of Start Date and End Date
      if (text.includes('Start Date') || text.includes('End Date')) {
        const replaced = text
          .replace(/Start Date/g, startDate)
          .replace(/End Date/g, endDate);
        setParaText(p, replaced);
        return;
      }
      if (text === 'Page ( of  )' || text === 'Page ( of )') {
        return;
      }
    });

    const headingTexts = new Set([
      'Confidentiality and Distribution Restrictions',
      'Table of Contents',
      'Introduction',
      'Approach',
      'Runtime Application Vulnerability Assessment',
      'Scope',
      'Assessment Limitation',
      'Findings and Recommendation',
      'Risk Classification',
      'Measurement of Impact',
      'Measurement of Likelihood',
      'Overall Risk',
      'Zero-risk Issues',
      'Vulnerabilities',
      'Summary',
      'Detailed',
      'Detailed Vulnerabilities',
      'Appendix A',
    ]);

    const greenBorderColors = new Set(['4EBC22', '8FC46B', '4CC51F', '40D31D', '39B829']);

    // LibreOffice tends to collapse the cover page spacing, which can pull the
    // Confidentiality section up onto the cover page. Force a page break.
    const ensurePageBreakBefore = (pEl: any) => {
      const p = $(pEl);
      let pPr = p.children('w\\:pPr').first();
      if (!pPr.length) {
        p.prepend('<w:pPr/>');
        pPr = p.children('w\\:pPr').first();
      }
      let pbb = pPr.children('w\\:pageBreakBefore').first();
      if (!pbb.length) {
        // Prepend so it doesn't get pushed after other paragraph properties.
        pPr.prepend('<w:pageBreakBefore w:val="1"/>');
      } else {
        pbb.attr('w:val', '1');
      }
    };

    const ensureKeepNext = (pEl: any) => {
      const p = $(pEl);
      let pPr = p.children('w\\:pPr').first();
      if (!pPr.length) {
        p.prepend('<w:pPr/>');
        pPr = p.children('w\\:pPr').first();
      }
      let keepNext = pPr.children('w\\:keepNext').first();
      if (!keepNext.length) {
        pPr.append('<w:keepNext w:val="1"/>');
      } else {
        keepNext.attr('w:val', '1');
      }
    };

    const ensureSpacing = (pEl: any, spacing: { before?: number; after?: number }) => {
      const p = $(pEl);
      let pPr = p.children('w\\:pPr').first();
      if (!pPr.length) {
        p.prepend('<w:pPr/>');
        pPr = p.children('w\\:pPr').first();
      }
      let sp = pPr.children('w\\:spacing').first();
      if (!sp.length) {
        pPr.append('<w:spacing/>');
        sp = pPr.children('w\\:spacing').first();
      }
      if (typeof spacing.before === 'number') sp.attr('w:before', String(spacing.before));
      if (typeof spacing.after === 'number') sp.attr('w:after', String(spacing.after));
    };

    const removePageBreakBefore = (pEl: any) => {
      const pbb = $(pEl).find('w\\:pPr > w\\:pageBreakBefore').first();
      if (pbb.length) pbb.remove();
    };

    const paragraphStyle = (pEl: any): string => {
      return String($(pEl).find('w\\:pPr > w\\:pStyle').first().attr('w:val') || '').trim();
    };

    const removeGreenBottomBorderIfNotHeading = (pEl: any, txt: string) => {
      if (!txt) return;
      if (headingTexts.has(txt)) return;
      const bottom = $(pEl).find('w\\:pPr > w\\:pBdr > w\\:bottom').first();
      if (!bottom.length) return;
      const color = String(bottom.attr('w:color') || '').toLowerCase();
      const val = String(bottom.attr('w:val') || '').toLowerCase();
      if (color !== '4ebc22' || val !== 'single') return;
      bottom.remove();
      const pBdr = $(pEl).find('w\\:pPr > w\\:pBdr').first();
      if (pBdr.length && pBdr.children().length === 0) pBdr.remove();
    };

    const stripGreenBorders = (pEl: any, opts?: { onlyIfEmpty?: boolean; force?: boolean }) => {
      const txt = paraText(pEl);
      if (opts?.onlyIfEmpty && txt) return;

      const pBdr = $(pEl).find('w\\:pPr > w\\:pBdr').first();
      if (!pBdr.length) return;

      const edges = ['w\\:top', 'w\\:bottom', 'w\\:left', 'w\\:right', 'w\\:between'];
      let removed = false;
      for (const edge of edges) {
        const node = pBdr.children(edge).first();
        if (!node.length) continue;
        const color = String(node.attr('w:color') || '').replace('#', '').toUpperCase();
        if (opts?.force || greenBorderColors.has(color)) {
          node.remove();
          removed = true;
        }
      }

      if (removed && pBdr.children().length === 0) {
        pBdr.remove();
      }
    };

    const paragraphs = body.find('w\\:p').toArray();

    // 1) Force key major sections to start on their own pages.
    for (const p of paragraphs) {
      const txt = paraText(p);
      if (txt === 'Confidentiality and Distribution Restrictions') {
        ensurePageBreakBefore(p);
      }
      if (txt === 'Introduction') {
        ensurePageBreakBefore(p);
      }
      if (txt === 'Approach') {
        ensurePageBreakBefore(p);
      }
      if (txt === 'Scope') {
        ensurePageBreakBefore(p);
      }
      if (txt === 'Findings and Recommendation') {
        ensurePageBreakBefore(p);
      }
      if (txt === 'Overall Risk') {
        ensurePageBreakBefore(p);
      }
      if (txt === 'Assessment Limitation') {
        removePageBreakBefore(p);
      }
    }

    // 2) Avoid blank pages caused by pageBreakBefore on empty paragraphs.
    // (The template contains some empty paragraphs with pageBreakBefore=1; LO treats
    // them as standalone page breaks and can produce empty pages.)
    for (const p of paragraphs) {
      const txt = paraText(p);
      if (!txt) {
        const pbb = $(p).find('w\\:pPr > w\\:pageBreakBefore').first();
        if (pbb.length && String(pbb.attr('w:val') || '').trim() === '1') {
          removePageBreakBefore(p);
        }
      }
    }

    // The template also contains empty heading paragraphs before real headings
    // (notably before Scope). LibreOffice still gives them visible heading spacing,
    // which shows up as an extra green rule and can push the next table down.
    for (const p of paragraphs) {
      const txt = paraText(p);
      const style = paragraphStyle(p);
      if (!txt && /^Heading[1-6]$/i.test(style)) {
        $(p).remove();
      }
    }

    // 3) Remove unintended green bottom borders on body paragraphs (these show up as
    // extra green underlines in the PDF and can affect pagination).
    for (const p of paragraphs) {
      const txt = paraText(p);
      removeGreenBottomBorderIfNotHeading(p, txt);
    }

    // 3b) More general: strip green paragraph borders from any non-heading paragraph.
    // This catches other green border colors used by the template (and LibreOffice
    // sometimes detaches these borders onto the next page).
    for (const p of paragraphs) {
      const txt = paraText(p);
      if (!headingTexts.has(txt)) {
        stripGreenBorders(p);
      }
    }

    // 4) Remove green rule artifacts that are implemented as borders on empty paragraphs.
    // These tend to appear as stray green lines between sections (e.g. after TOC).
    for (const p of paragraphs) {
      stripGreenBorders(p, { onlyIfEmpty: true });
    }

    // 5) Users reported a stray green line after the TOC and before Scope.
    // Strip all borders on those heading paragraphs.
    for (const p of paragraphs) {
      const txt = paraText(p);
      if (txt === 'Table of Contents' || txt === 'Scope') {
        stripGreenBorders(p, { force: true });
      }
    }

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const text = paraText(p);
      const hasBorder = $(p).find('w\\:pPr > w\\:pBdr').length > 0;
      if (!hasBorder || text) continue;
      let prevText = '';
      for (let j = i - 1; j >= 0; j--) {
        prevText = paraText(paragraphs[j]);
        if (prevText) break;
      }
      if (!headingTexts.has(prevText)) {
        $(p).remove();
      }
    }

    // Remove placeholder yellow text highlighting from the uploaded sample template.
    body.find('w\\:highlight').remove();
    body.find('w\\:shd').each((_: number, shd: any) => {
      const fill = String($(shd).attr('w:fill') || '').toUpperCase();
      const color = String($(shd).attr('w:color') || '').toUpperCase();
      if (fill === 'FFFF00' || fill === 'FF0' || color === 'FFFF00') {
        $(shd).remove();
      }
    });

    // Cover page spacing: LibreOffice tends to tighten spacing.
    // Add space before the client name line on the cover page so it doesn't hug the hero panel.
    const clientName = String(data.project.client_name || 'N/A').trim();
    if (clientName) {
      const topChildren = bodyChildren();
      const maxScan = Math.min(80, topChildren.length);
      for (let i = 0; i < maxScan; i++) {
        const el: any = topChildren[i];
        if (!el || el.tagName !== 'w:p') continue;
        const txt = paraText(el);
        if (txt === clientName) {
          // 520 twips ~ 26pt.
          ensureSpacing(el, { before: 520 });
          break;
        }
      }
    }

    // Pagination hardening: prevent table rows from splitting across pages.
    // Also try to keep headings with the following table.
    {
      const allTables = body.find('w\\:tbl').toArray();
      for (const tbl of allTables) {
        $(tbl).find('w\\:tr').each((_: number, tr: any) => {
          let trPr = $(tr).children('w\\:trPr').first();
          if (!trPr.length) {
            $(tr).prepend('<w:trPr/>');
            trPr = $(tr).children('w\\:trPr').first();
          }
          let cs = trPr.children('w\\:cantSplit').first();
          if (!cs.length) {
            trPr.append('<w:cantSplit w:val="1"/>');
          } else {
            cs.attr('w:val', '1');
          }
        });

        // Try to keep small tables together by chaining rows via keepNext on their paragraphs.
        // This is a pragmatic best-effort for "do not split tables" requests.
        const directRows = $(tbl).find('> w\\:tr').toArray();
        if (directRows.length > 0 && directRows.length <= 15) {
          for (let ri = 0; ri < directRows.length - 1; ri++) {
            const tr: any = directRows[ri];
            $(tr)
              .find('w\\:tc')
              .each((_: number, tc: any) => {
                $(tc)
                  .find('w\\:p')
                  .each((__: number, pEl: any) => {
                    ensureKeepNext(pEl);
                  });
              });
          }
        }
      }

      const kids = bodyChildren();
      for (let i = 0; i < kids.length; i++) {
        const el: any = kids[i];
        if (!el || el.tagName !== 'w:tbl') continue;
        for (let j = i - 1; j >= 0; j--) {
          const prev: any = kids[j];
          if (!prev || prev.tagName !== 'w:p') continue;
          const t = paraText(prev);
          if (!t) continue;
          if (headingTexts.has(t) || t.endsWith(':')) {
            ensureKeepNext(prev);
          }
          break;
        }
      }
    }

    const normalizedTemplate = data.template as any;
    const templateData = normalizedTemplate?.template_data && typeof normalizedTemplate.template_data === 'object'
      ? normalizedTemplate.template_data
      : {};
    const defaultSectionConfig: Record<string, any> = {
      confidentiality: {
        body: 'The conclusions and recommendations in this report represent the opinions of SecurifyAI.\n\nDeterminations of appropriate corrective action(s) are the responsibility of the entity receiving the report.\n\nThis report and/or any other materials furnished by SecurifyAI in connection with this engagement is confidential and may not be duplicated, modified, or otherwise reproduced and distributed without the express prior written consent of SecurifyAI or {{CLIENT_NAME}}. Because this work may contain copyrighted images or other material, permission from the copyright holder may also be necessary if you wish to reproduce.',
      },
      introduction: {
        body: 'As part of an ongoing security program, {{CLIENT_NAME}} identified the need to conduct an application security assessment of its Web application & APIs.',
        items: [
          'Determine the overall security posture of the application',
          'Provide a list of key findings and recommendations for remediation',
        ],
        fields: {
          list_title: 'The following lists the objectives of this assessment:',
          closing_title: 'This report includes the following parameters and results of the assessment:',
        },
        closing_items: [
          'SecurifyAI\'s approach to the assessment',
          'Assessment scope',
          'Key findings listed with their qualitative risk assessment',
          'Detailed recommendations for each finding',
          'A remediation plan',
        ],
      },
      approach: {
        body: 'Securify performed a Runtime Application Vulnerability Assessment of the {{CLIENT_NAME}}\'s web application, associated APIs, and all components defined within the assessment scope.\n\nThe assessment was conducted using industry-accepted methodologies, primarily based on the OWASP Web Security Testing Guide (WSTG) and OWASP ASVS, and involved both manual testing and automated analysis.',
      },
      runtime_assessment: {
        body: 'The Runtime Application Vulnerability Assessment involved detecting security vulnerabilities through detailed examination and testing of the application in a runtime environment. This assessment emulates an attack by a skilled adversary in a controlled setting and allows {{CLIENT_NAME}} to ascertain the kinds of vulnerabilities that may be realistically exploited. A Runtime Application Vulnerability Assessment includes the following phases:',
        items: [
          '**Information Gathering** \u2013 The application was reviewed as an anonymous, authenticated, and privileged user to understand differences in access and behavior. Technologies, frameworks, APIs, and third-party integrations were also identified to support targeted testing.',
          '**Authentication Testing** \u2013 Authentication mechanisms were evaluated to determine the strength of login controls, password policies, and account recovery processes. Protections against brute-force attempts and session takeover scenarios were also reviewed to ensure users are securely authenticated.',
          '**Authorization Testing** \u2013 Tests were conducted to identify weaknesses in access control, including attempts to access other users\' data or privileged functionality.',
          '**Session Management** \u2013 Session handling was assessed to ensure secure creation, storage, and invalidation of session tokens.',
          '**Input Validation Attacks** \u2013 User-controlled input fields were tested with malformed and malicious data to identify injection flaws and logic bypasses. This included attempts to exploit unexpected behavior, access unprotected functionality, or inject vulnerabilities such as XSS, SQL Injection, and Command Injection.',
          '**Business Logic Testing** \u2013 The application workflows were reviewed to identify opportunities to misuse or bypass intended processes. This included testing for logic errors, insufficient validation, and scenarios where typical constraints could be circumvented.',
        ],
      },
      assessment_limitation: {
        body: 'The ever-changing technology landscape and the increasing sophistication of attacks against networked systems are reasons why no entity can truthfully claim to identify all security issues or guarantee the lifetime security of an organization\'s network and applications. Note that this point-in-time assessment was based on a best-effort basis. It was also performed only in the environment provided by {{CLIENT_NAME}}. Thus, changes to the environment may impact the applicability of the results provided herein.\n\nSecurifyAI cannot guarantee 100% coverage for any security assessment.',
      },
      findings_recommendation: {
        body: 'The sections below summarize the observed risks and provide the measurement criteria used to classify findings across the engagement. Each finding is evaluated using the same impact and likelihood model so remediation can be prioritized consistently.',
      },
      risk_classification: {
        body: 'The remainder of this report describes the vulnerabilities that Securify identified as part of the assessment, their impact, and recommendations for resolving the vulnerabilities. To assist in determining the risk posed by these vulnerabilities, Securify leverages the OWASP Application Security Risk Rating Methodology. The observations have been categorized based on technical Impact and Likelihood, explained below. These impact and likelihood scores may be further modified by {{CLIENT_NAME}} based on the business criticality of the target.',
        fields: {
          matrix_title: 'Risk Matrix',
          matrix_subtitle: 'Impact x Likelihood',
        },
      },
      measurement_impact: {
        body: 'Impact is an estimation of the potential damage via a successful exploit of a vulnerability. We\'ll use the following factors to help qualitatively determine the impact of a vulnerability.',
        items: [
          '**Low Impact**: When most/all factors indicate limited consequences (e.g., non-sensitive data, no ability to alter/delete key data, and low victim count).',
          '**Medium Impact**: When about half of the factors suggest higher damage and half point to limited effects.',
          '**High Impact**: When most/all factors highlight significant damage (e.g., sensitive data loss, wide data corruption, and a large number of victims).',
        ],
      },
      measurement_likelihood: {
        body: 'Likelihood is a qualitative estimation of the probability of an attacker exploiting the vulnerability in question. In order to determine the likelihood of exploitation, we can consider the following factors:',
        items: [
          '**Low Likelihood**: Most/all factors suggest significant barriers to exploitation (e.g., complex skillset, limited attackers, high cost, or complex delivery).',
          '**Medium Likelihood**: About half the factors indicate ease of exploitation, while the other half show barriers.',
          '**High Likelihood**: Most/all factors point to easy and accessible exploitation (e.g., basic skills, low cost, and simple attack mechanisms).',
        ],
      },
      overall_risk: {
        body: 'The following graph illustrates how Impact x Likelihood scores translate to overall Low, Medium, and High-risk ratings:',
        items: [
          'Low Impact + Low Likelihood = Low Risk',
          'High Impact + High Likelihood = Critical Risk',
        ],
      },
      out_of_scope: {
        body: 'The following components and tests were out of scope for this review:',
        items: [
          'Any applications and infrastructure external to the {{CLIENT_NAME}}\'s Web Application & API.',
          'In cases where the {{CLIENT_NAME}}\'s Web Application & API had inbound and/or outbound interfaces with:',
          'Another application, the interfaces, and communications were considered in scope.\nAll other external elements were excluded.',
          'Supporting policies, procedures, and processes.',
          'Social Engineering.',
          'Software Development Life Cycle.',
        ],
      },
    };
    const configuredSections = templateData?.sections && typeof templateData.sections === 'object'
      ? templateData.sections
      : {};
    const getSection = (key: string) => configuredSections?.[key] && typeof configuredSections[key] === 'object'
      ? { ...(defaultSectionConfig[key] || {}), ...configuredSections[key] }
      : (defaultSectionConfig[key] || {});
    const resolvePlaceholders = (value: string) => String(value || '')
      .replace(/\{\{CLIENT_NAME\}\}/g, String(data.project.client_name || 'N/A'))
      .replace(/Client Name/g, String(data.project.client_name || 'N/A'))
      .replace(/\{\{PROJECT_NAME\}\}/g, String(data.project.name || 'N/A'))
      .replace(/\{\{DATE\}\}/g, String(data.metadata.generatedDate || ''))
      .replace(/Start Date/g, startDate)
      .replace(/End Date/g, endDate);
    const sectionTitle = (key: string, fallback: string) => {
      const raw = getSection(key)?.title;
      return typeof raw === 'string' && raw.trim() ? resolvePlaceholders(raw.trim()) : fallback;
    };
    const sectionBody = (key: string, fallback = '') => {
      // For these specific sections, always use default items to ensure ** markers are preserved
      const useDefaultItems = ['runtime_assessment', 'measurement_impact', 'measurement_likelihood'].includes(key);
      const section = useDefaultItems ? (defaultSectionConfig[key] || {}) : getSection(key);
      const parts: string[] = [];
      const body = typeof section?.body === 'string' && section.body.trim() ? section.body.trim() : fallback;
      if (body) parts.push(body);

      // Add list_title (italic) if present
      if (typeof section?.fields?.list_title === 'string' && section.fields.list_title.trim()) {
        parts.push(`_italic:${section.fields.list_title.trim()}_`);
      }

      // Add items - handle old DB structure where items includes closing_items
      if (Array.isArray(section?.items) && section.items.length) {
        const closingItemsCount = Array.isArray(section?.closing_items) ? section.closing_items.length : 0;

        // If closing_items exists and items.length > closingItemsCount, assume old structure
        // and only use the first (items.length - closingItemsCount) items
        const numFirstList = closingItemsCount > 0 && section.items.length > closingItemsCount
          ? section.items.length - closingItemsCount
          : section.items.length;

        const itemsToUse = section.items.slice(0, numFirstList);

        if (key === 'runtime_assessment' || key === 'measurement_impact' || key === 'measurement_likelihood') {
          // Preserve ** markers for bold rendering
          parts.push(...itemsToUse.map((item: any) => {
            const text = String(item || '').trim();
            return text ? `- ${text}` : '';
          }).filter((item: string) => item !== '-'));
        } else {
          parts.push(...itemsToUse.map((item: any) => `- ${String(item || '').trim()}`).filter((item: string) => item !== '-'));
        }
      }

      // Add closing_title (italic) if present
      if (typeof section?.fields?.closing_title === 'string' && section.fields.closing_title.trim()) {
        parts.push(`_italic:${section.fields.closing_title.trim()}_`);
      }

      // Add closing items if present
      if (Array.isArray(section?.closing_items) && section.closing_items.length) {
        parts.push(...section.closing_items.map((item: any) => `- ${String(item || '').trim()}`).filter((item: string) => item !== '-'));
      }

      let out = resolvePlaceholders(parts.filter(Boolean).join('\n\n'));

      // Enforce brand naming in specific sections even if the template text was customized.
      if (key === 'confidentiality' || key === 'assessment_limitation' || key === 'risk_classification') {
        // Replace standalone "Securify" with "SecurifyAI" (avoid double-replacing existing SecurifyAI).
        out = out.replace(/\bSecurify\b(?!AI)/g, 'SecurifyAI');
      }

      return out;
    };
    const splitBodyParagraphs = (text: string): string[] => {
      const parts: string[] = [];
      const regex = /\n{2,}/;
      const segments = String(text || '').split(regex);
      for (const segment of segments) {
        const trimmed = segment.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
        if (trimmed) parts.push(trimmed);
      }
      return parts;
    };
    // Removed parseTextSegments - using inline logic in replaceSectionParagraphBlock


    const replaceSectionParagraphBlock = (headingText: string, stopHeadings: string[], replacementText: string) => {
      const parts = splitBodyParagraphs(replacementText);
      if (!parts.length) return;

      const children = bodyChildren();
      const startIdx = children.findIndex((el: any) => paraText(el) === headingText);
      if (startIdx === -1) return;

      let endIdx = children.findIndex((el: any, idx: number) => idx > startIdx && stopHeadings.includes(paraText(el)));
      if (endIdx === -1) endIdx = children.length;

      const range = children.slice(startIdx + 1, endIdx);
      const paragraphsInRange = range.filter((el: any) => {
        const t = String(el?.tagName || '');
        return t === 'w:p' || t.endsWith(':p');
      });
      const bulletParagraph = paragraphsInRange.find((p: any) => $(p).find('w\\:numPr').length > 0);
      const templateParagraph = paragraphsInRange.find((p: any) => paraText(p)) || paragraphsInRange[0];
      if (!templateParagraph) return;



      // Prefer inserting before the first table in the section (keeps tables after text).
      // Some DOCX templates can include non-paragraph wrappers; be explicit here.
      const insertBeforeNode = range.find((el: any) => {
        const t = String(el?.tagName || '');
        return t === 'w:tbl' || t.endsWith(':tbl');
      })
        || range.find((el: any) => {
          const t = String(el?.tagName || '');
          return !(t === 'w:p' || t.endsWith(':p'));
        })
        || children[endIdx];
      paragraphsInRange.forEach((p: any) => $(p).remove());

      const insertNode = insertBeforeNode || null;
      parts.forEach((part) => {
        const isListLike = part.startsWith('- ');
        let text = isListLike ? part.replace(/^-\s*/, '') : part;

        const paragraph = isListLike && bulletParagraph ? cloneNode(bulletParagraph) : cloneNode(templateParagraph);

        // Improve vertical spacing for narrative sections (closer to reference DOCX).
        if ((headingText === 'Introduction' || headingText === 'Assessment Limitation') && !isListLike) {
          let pPr = paragraph.find('w\\:pPr').first();
          if (!pPr.length) {
            paragraph.prepend('<w:pPr/>');
            pPr = paragraph.find('w\\:pPr').first();
          }
          // Ensure a bit of space after paragraphs.
          if (!pPr.find('w\\:spacing').length) {
            pPr.append('<w:spacing w:before="120" w:after="240"/>');
          }
        }

        // Keep Measurement sections compact so the table fits on the same page.
        if ((headingText === 'Measurement of Impact' || headingText === 'Measurement of Likelihood')) {
          let pPr = paragraph.find('w\\:pPr').first();
          if (!pPr.length) {
            paragraph.prepend('<w:pPr/>');
            pPr = paragraph.find('w\\:pPr').first();
          }
          // Reduce paragraph spacing.
          pPr.find('w\\:spacing').remove();
          pPr.append('<w:spacing w:before="0" w:after="80" w:line="240" w:lineRule="auto"/>');
        }

        // Check if this is an italic paragraph: _italic:text_ or _text_
        let isItalicPara = false;
        let displayText = text;

        // Try format: _italic:text_
        const italicMatch = text.match(/^_italic:(.*)_$/);
        if (italicMatch) {
          isItalicPara = true;
          displayText = italicMatch[1];
        } else if (text.startsWith('_') && text.endsWith('_')) {
          // Try format: _text_
          isItalicPara = true;
          displayText = text.slice(1, -1);
        }

        // Parse **bold** markers using split
        const segments: Array<{ text: string; bold: boolean; italic: boolean }> = [];
        const parts2 = displayText.split('**');

        for (let i = 0; i < parts2.length; i++) {
          if (!parts2[i]) continue;
          // Odd indices are bold (between ** pairs), even are normal
          const isBold = i % 2 === 1;
          segments.push({
            text: parts2[i],
            bold: isBold,
            italic: isItalicPara
          });
        }

        // If no ** markers found and it's a colon-separated list item, apply colon logic
        if (segments.length === 0 && isListLike) {
          const colonIndex = text.indexOf(': ');
          if (colonIndex !== -1) {
            segments.push(
              { text: text.slice(0, colonIndex + 1), bold: true, italic: false },
              { text: text.slice(colonIndex + 1).trim(), bold: false, italic: false }
            );
          }
        }

        // If still no segments, use the whole text
        if (segments.length === 0) {
          segments.push({ text: displayText, bold: false, italic: isItalicPara });
        }

        // Render segments
        setParagraphSegments($, paragraph.get(0), segments.map(s => ({
          text: s.text,
          bold: s.bold,
          color: isItalicPara ? '666666' : '000000'
        })));

        // Apply italic to all runs if needed
        if (isItalicPara) {
          $(paragraph.get(0)).find('w\\:r').each((_: number, r: any) => {
            let rPr = $(r).children('w\\:rPr').first();
            if (!rPr.length) { $(r).prepend('<w:rPr/>'); rPr = $(r).children('w\\:rPr').first(); }
            if (!rPr.children('w\\:i').length) { rPr.append('<w:i w:val="1"/><w:iCs w:val="1"/>'); }
          });
        }

        if (insertNode) {
          // Ensure we can still insert before a detached node by using XML string.
          $(insertNode).before($.xml(paragraph));
        } else {
          body.append($.xml(paragraph));
        }
      });
    };

    if (!isDast) {
      replaceSectionParagraphBlock('Confidentiality and Distribution Restrictions', ['Table of Contents'], sectionBody('confidentiality', normalizedTemplate.confidentiality_text || ''));
      replaceSectionParagraphBlock('Introduction', ['Approach'], sectionBody('introduction', normalizedTemplate.introduction_text || ''));

      replaceSectionParagraphBlock('Approach', ['Runtime Application Vulnerability Assessment'], sectionBody('approach', normalizedTemplate.approach_text || ''));
      replaceSectionParagraphBlock('Runtime Application Vulnerability Assessment', ['Scope'], sectionBody('runtime_assessment', ''));
      replaceSectionParagraphBlock('Scope', ['Assessment Limitation'], sectionBody('scope', normalizedTemplate.scope_text || ''));
    }

    // Add spacing after Scope tables
    {
      const scopeChildren = bodyChildren();
      const scopeIdx = scopeChildren.findIndex((el: any) => paraText(el) === 'Scope');
      const assessmentIdx = scopeChildren.findIndex((el: any) => paraText(el) === 'Assessment Limitation');
      if (scopeIdx !== -1 && assessmentIdx !== -1) {
        const scopeElements = scopeChildren.slice(scopeIdx + 1, assessmentIdx);
        scopeElements.forEach((el: any) => {
          if (el.tagName === 'w:tbl') {
            // Add spacing paragraph after each table
            const spacingPara = $('<w:p><w:pPr><w:spacing w:after="240"/></w:pPr></w:p>');
            $(el).after($.xml(spacingPara));
          }
        });
      }
    }

    if (!isDast) {
      replaceSectionParagraphBlock('Assessment Limitation', ['Findings and Recommendation'], sectionBody('assessment_limitation', ''));
      replaceSectionParagraphBlock('Risk Classification', ['Measurement of Impact'], sectionBody('risk_classification', ''));
      replaceSectionParagraphBlock('Measurement of Impact', ['Measurement of Likelihood'], sectionBody('measurement_impact', ''));
      replaceSectionParagraphBlock('Measurement of Likelihood', ['Overall Risk'], sectionBody('measurement_likelihood', ''));
    }

    // Put Measurement of Likelihood on a new page (matches reference layout).
    {
      const kids = bodyChildren();
      const likeIdx = kids.findIndex((el: any) => paraText(el) === 'Measurement of Likelihood');
      if (likeIdx !== -1) {
        const likeEl = kids[likeIdx];
        const pageBreakP = $('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
        $(likeEl).before($.xml(pageBreakP));
      }
    }

    // Measurement sections: force table to appear after inserted content.
    // Some templates place the table immediately after the heading; move it to just
    // before the next section heading, and keep paragraphs before it.
    {
      const forceTableAfterContent = (heading: string, nextHeading: string) => {
        const kids = bodyChildren();
        const startIdx = kids.findIndex((el: any) => paraText(el) === heading);
        const endIdx = kids.findIndex((el: any, idx: number) => idx > startIdx && paraText(el) === nextHeading);
        if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return;

        const range = kids.slice(startIdx + 1, endIdx);

        // In some templates the table is wrapped in a content control (<w:sdt>).
        // We must move the *container* node, not only a direct <w:tbl>.
        const isDirectTbl = (el: any) => {
          const t = String(el?.tagName || '');
          return t === 'w:tbl' || t.endsWith(':tbl');
        };
        const hasTblDescendant = (el: any) => {
          try {
            const scope = $(el);
            return scope.find('w\\:tbl').length > 0 || scope.find('tbl').length > 0;
          } catch {
            return false;
          }
        };

        const containerEl = range.find((el: any) => isDirectTbl(el) || hasTblDescendant(el));
        if (!containerEl) return;

        const containerXml = $.xml(containerEl);
        $(containerEl).remove();
        $(kids[endIdx]).before(containerXml);

        // Remove any empty paragraphs that would create big gaps before/after the moved table.
        const kids2 = bodyChildren();
        const start2 = kids2.findIndex((el: any) => paraText(el) === heading);
        const end2 = kids2.findIndex((el: any, idx: number) => idx > start2 && paraText(el) === nextHeading);
        if (start2 !== -1 && end2 !== -1 && end2 > start2) {
          const sectionNodes = kids2.slice(start2 + 1, end2);
          sectionNodes.forEach((el: any) => {
            const t = String(el?.tagName || '');
            const isPara = t === 'w:p' || t.endsWith(':p');
            if (isPara && !paraText(el)) {
              $(el).remove();
            }
          });
        }
      };

      forceTableAfterContent('Measurement of Impact', 'Measurement of Likelihood');
      forceTableAfterContent('Measurement of Likelihood', 'Overall Risk');
    }

    replaceSectionParagraphBlock('Overall Risk', ['Zero-risk Issues'], sectionBody('overall_risk', ''));

    // Make only "Low Impact + Low Likelihood" and "High Impact + High Likelihood" bold, not the risk level
    {
      const overallChildren = bodyChildren();
      const overallIdx = overallChildren.findIndex((el: any) => paraText(el) === 'Overall Risk');
      const zeroRiskIdx = overallChildren.findIndex((el: any) => paraText(el) === 'Zero-risk Issues');
      if (overallIdx !== -1 && zeroRiskIdx !== -1) {
        const overallParas = overallChildren.slice(overallIdx + 1, zeroRiskIdx).filter((el: any) => el.tagName === 'w:p');
        overallParas.forEach((p: any) => {
          const txt = paraText(p);
          if (txt.includes('Low Impact + Low Likelihood') && txt.includes('= Low Risk')) {
            // Bold only "Low Impact + Low Likelihood", not "Low Risk"
            setParagraphSegments($, p, [
              { text: 'Low Impact + Low Likelihood', bold: true, color: '000000' },
              { text: ' = Low Risk', bold: false, color: '000000' },
            ]);
          } else if (txt.includes('High Impact + High Likelihood') && txt.includes('= Critical Risk')) {
            // Bold only "High Impact + High Likelihood", not "Critical Risk"
            setParagraphSegments($, p, [
              { text: 'High Impact + High Likelihood', bold: true, color: '000000' },
              { text: ' = Critical Risk', bold: false, color: '000000' },
            ]);
          }
        });
      }
    }
    replaceSectionParagraphBlock('Zero-risk Issues', ['Vulnerabilities'], sectionBody('zero_risk_issues', ''));

    // Add page break before Vulnerabilities section
    {
      const children = bodyChildren();
      const vulnIdx = children.findIndex((el: any) => paraText(el) === 'Vulnerabilities');
      if (vulnIdx !== -1) {
        const vulnEl = children[vulnIdx];
        const pageBreakP = $('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
        $(vulnEl).before($.xml(pageBreakP));
      }
    }

    if (!isDast) {
      replaceSectionParagraphBlock('Summary', ['Detailed Vulnerabilities'], sectionBody('summary', ''));
      replaceSectionParagraphBlock('Appendix A', [], sectionBody('appendix_a', normalizedTemplate.appendix_text || ''));
    }

    // "Detailed Vulnerabilities" should start on a new page.
    {
      const kids = bodyChildren();
      const detailedIdx = kids.findIndex((el: any) => paraText(el) === 'Detailed Vulnerabilities');
      if (detailedIdx !== -1) {
        const detailedEl = kids[detailedIdx];
        const pageBreakP = $('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
        $(detailedEl).before($.xml(pageBreakP));
      }
    }

    if (!isDast) {
      replaceAllParagraphText('Table of Contents', sectionTitle('table_of_contents', 'Table of Contents'));
      replaceAllParagraphText('Confidentiality and Distribution Restrictions', sectionTitle('confidentiality', 'Confidentiality and Distribution Restrictions'));
      replaceAllParagraphText('Introduction', sectionTitle('introduction', 'Introduction'));
      replaceAllParagraphText('Approach', sectionTitle('approach', 'Approach'));
      replaceAllParagraphText('Runtime Application Vulnerability Assessment', sectionTitle('runtime_assessment', 'Runtime Application Vulnerability Assessment'));
      replaceAllParagraphText('Scope', sectionTitle('scope', 'Scope'));
      replaceAllParagraphText('Assessment Limitation', sectionTitle('assessment_limitation', 'Assessment Limitation'));
      replaceAllParagraphText('Findings and Recommendation', sectionTitle('findings_recommendation', 'Findings and Recommendation'));
      replaceAllParagraphText('Risk Classification', sectionTitle('risk_classification', 'Risk Classification'));
      replaceAllParagraphText('Measurement of Impact', sectionTitle('measurement_impact', 'Measurement of Impact'));
      replaceAllParagraphText('Measurement of Likelihood', sectionTitle('measurement_likelihood', 'Measurement of Likelihood'));
      replaceAllParagraphText('Overall Risk', sectionTitle('overall_risk', 'Overall Risk'));
      replaceAllParagraphText('Zero-risk Issues', sectionTitle('zero_risk_issues', 'Zero-risk Issues'));
      replaceAllParagraphText('Vulnerabilities', sectionTitle('vulnerabilities', 'Vulnerabilities'));
      replaceAllParagraphText('Summary', sectionTitle('summary', 'Summary'));
      replaceAllParagraphText('Detailed Vulnerabilities', sectionTitle('detailed_vulnerabilities', 'Detailed Vulnerabilities'));
      replaceAllParagraphText('Appendix A', sectionTitle('appendix_a', 'Appendix A'));
      replaceAllParagraphText('Application Details', String(getSection('scope')?.fields?.application_details_title || 'Application Details'));
      replaceAllParagraphText('User Roles (Web application & API)', String(getSection('scope')?.fields?.user_roles_title || 'User Roles (Web application & API)'));
      replaceAllParagraphText('Tools', String(getSection('scope')?.fields?.tools_title || 'Tools'));
    }

    // Second pass: replace any remaining literal placeholders in paragraphs inserted by section replacements.
    body.find('w\\:p').each((_: number, p: any) => {
      const text = paraText(p);
      if (!text) return;
      let replaced = text;
      let changed = false;
      if (text.includes('Client Name')) {
        replaced = replaced.replace(/Client Name/g, data.project.client_name || 'N/A');
        changed = true;
      }
      if (text.includes('Start Date')) {
        replaced = replaced.replace(/Start Date/g, startDate);
        changed = true;
      }
      if (text.includes('End Date')) {
        replaced = replaced.replace(/End Date/g, endDate);
        changed = true;
      }
      if (changed) {
        setParaText(p, replaced);
      }
    });

    const projectApplications = Array.isArray((data.project as any)?.application_details)
      ? (data.project as any).application_details
      : null;
    const projectUserRoles = Array.isArray((data.project as any)?.user_roles)
      ? (data.project as any).user_roles
      : null;

    const applications = projectApplications && projectApplications.length
      ? projectApplications
      : Array.isArray(getSection('scope')?.application_rows) && getSection('scope').application_rows.length
        ? getSection('scope').application_rows
        : Array.isArray(normalizedTemplate.scope_applications) && normalizedTemplate.scope_applications.length
          ? normalizedTemplate.scope_applications
          : [
            { name: 'Application Name 1', url: 'http://test.com' },
            { name: 'Application Name 2', url: 'http://admin.test.com' },
          ];
    const userRoles = projectUserRoles && projectUserRoles.length
      ? projectUserRoles
      : Array.isArray(getSection('scope')?.user_role_rows) && getSection('scope').user_role_rows.length
        ? getSection('scope').user_role_rows
        : Array.isArray(normalizedTemplate.scope_user_roles) && normalizedTemplate.scope_user_roles.length
          ? normalizedTemplate.scope_user_roles
          : [
            { role: 'Customer', username: 'user1', description: 'Authenticated customer user' },
            { role: 'Admin', username: 'admin1', description: 'Privileged administrative user' },
          ];
    const tools = Array.isArray(getSection('scope')?.tool_rows) && getSection('scope').tool_rows.length
      ? getSection('scope').tool_rows
      : Array.isArray(normalizedTemplate.scope_tools) && normalizedTemplate.scope_tools.length
        ? normalizedTemplate.scope_tools
        : [
          { name: 'Burp Professional Pro', description: 'An advanced proxy for testing web security.' },
          { name: 'OpenSSL', description: 'An open-source package to assess security in transit.' },
          { name: 'Nmap', description: 'A tool used to discover hosts and services on a network.' },
          { name: 'SQLMap', description: 'Python-based CLI tool that identifies SQL injection issues.' },
          { name: 'Acunetix Pro', description: 'An automated scanner to perform authenticated scans on the web app / APIs.' },
          { name: 'cURL Utility', description: 'Command line utility to perform HTTP/s requests.' },
        ];

    // Optional: Out Of Scope Endpoints table (injected between User Roles and Tools)
    const includeOutOfScopeEndpoints = Boolean(
      (data.project as any)?.include_out_of_scope_endpoints ?? (data.project as any)?.includeOutOfScopeEndpoints
    );
    const outOfScopeEndpointsRaw = (data.project as any)?.out_of_scope_endpoints || (data.project as any)?.outOfScopeEndpoints;
    const outOfScopeEndpoints = Array.isArray(outOfScopeEndpointsRaw)
      ? outOfScopeEndpointsRaw
        .map((r: any) => ({ name: String(r?.name || '').trim(), url: String(r?.url || '').trim() }))
        .filter((r: any) => r.name || r.url)
      : [];

    const tables = body.find('w\\:tbl').toArray();
    const setTableHeader = (tbl: any, values: string[]) => {
      const rows = $(tbl).find('> w\\:tr').toArray();
      if (!rows.length) return;
      const cells = $(rows[0]).find('> w\\:tc').toArray();
      values.forEach((value, idx) => {
        if (cells[idx]) setParaText(cells[idx], value);
      });
    };
    const setTableRows = (tbl: any, rowsData: Array<string[]>) => {
      const rows = $(tbl).find('> w\\:tr').toArray();
      if (rows.length < 2) return;
      const templateRow = rows[1];
      rows.slice(1).forEach((row: any) => $(row).remove());
      for (const values of rowsData) {
        const row = cloneNode(templateRow);
        const cells = row.find('w\\:tc').toArray();
        values.forEach((value, idx) => {
          if (cells[idx]) setParaText(cells[idx], value);
        });
        $(tbl).append($.xml(row));
      }
    };

    if (!isDast) {
      if (tables[0]) {
        setTableHeader(tables[0], ['Name', 'URL']);
        setTableRows(tables[0], applications.map((r: any) => [String(r.name || ''), String(r.url || '')]));
      }
      if (tables[1]) {
        setTableHeader(tables[1], ['Role', 'Username']);
        setTableRows(tables[1], userRoles.map((r: any) => [String(r.role || ''), String(r.username || r.description || '')]));
      }
      if (tables[2]) {
        setTableHeader(tables[2], ['Tool Name', 'Description']);
        setTableRows(tables[2], tools.map((r: any) => [String(r.name || ''), String(r.description || '')]));
      }
      if (tables[0]) applySimpleTableTheme(tables[0]);
      if (tables[1]) applySimpleTableTheme(tables[1]);
      if (tables[2]) applySimpleTableTheme(tables[2]);
    }

    // Inject Out Of Scope Endpoints table (optional) below User Roles and above Tools.
    // Keep this insertion-only and reuse existing table markup for consistent styling.
    if (!isDast && includeOutOfScopeEndpoints && outOfScopeEndpoints.length && tables[0] && tables[1] && tables[2]) {
      const toolsTbl = tables[2];

      // Clone the Application Details table (same two-column structure: Name/URL).
      const oosTbl = cloneNode(tables[0]);
      setTableHeader(oosTbl.get(0), ['Name', 'URL']);
      setTableRows(oosTbl.get(0), outOfScopeEndpoints.map((r: any) => [String(r.name || ''), String(r.url || '')]));
      applySimpleTableTheme(oosTbl.get(0));

      // Add a heading paragraph matching other scope table headings.
      const oosHeading = 'Out Of Scope Endpoints';
      const headingPara = $('<w:p/>');
      const pPr = $('<w:pPr/>');
      const spacing = $('<w:spacing/>');
      spacing.attr('w:before', '240');
      spacing.attr('w:after', '120');
      pPr.append(spacing);
      const rPr = $('<w:rPr/>');
      const bold = $('<w:b w:val="1"/><w:bCs w:val="1"/>');
      const color = $(`<w:color w:val="${this.brand.green || '00d639'}"/>`);
      const sz = $('<w:sz w:val="24"/><w:szCs w:val="24"/>');
      rPr.append(bold);
      rPr.append(color);
      rPr.append(sz);
      pPr.append(rPr);
      headingPara.append(pPr);
      const run = $('<w:r/>');
      run.append(rPr.clone());
      run.append(`<w:t xml:space="preserve">${escapeXmlText(oosHeading)}</w:t>`);
      headingPara.append(run);

      $(toolsTbl).before($.xml(headingPara));
      $(toolsTbl).before($.xml(oosTbl));
    }

    // Insert standalone heading paragraphs before each scope table
    if (!isDast) {
      const tableHeadings = [
        { tblIdx: 0, heading: String(getSection('scope')?.fields?.application_details_title || 'Application Details') },
        { tblIdx: 1, heading: String(getSection('scope')?.fields?.user_roles_title || 'User Roles (Web application & API)') },
        { tblIdx: 2, heading: String(getSection('scope')?.fields?.tools_title || 'Tools') },
      ];

      for (const { tblIdx, heading } of tableHeadings) {
        if (tables[tblIdx]) {
        const tbl = tables[tblIdx];
        const headingPara = $('<w:p/>');
        const pPr = $('<w:pPr/>');
        const spacing = $('<w:spacing/>');
        spacing.attr('w:before', '240');
        spacing.attr('w:after', '120');
        pPr.append(spacing);
        const rPr = $('<w:rPr/>');
        const bold = $('<w:b w:val="1"/><w:bCs w:val="1"/>');
        const color = $(`<w:color w:val="${this.brand.green || '00d639'}"/>`);
        const sz = $('<w:sz w:val="24"/><w:szCs w:val="24"/>');
        rPr.append(bold);
        rPr.append(color);
        rPr.append(sz);
        pPr.append(rPr);
        headingPara.append(pPr);
        const run = $('<w:r/>');
        run.append(rPr.clone());
        run.append(`<w:t xml:space="preserve">${escapeXmlText(heading)}</w:t>`);
        headingPara.append(run);
        $(tbl).before($.xml(headingPara));
      }
    }
    }

    // Insert out-of-scope content after tables but before Assessment Limitation
    if (!isDast) {
      const outOfScopeSection = getSection('out_of_scope');
      const oosBody = typeof outOfScopeSection?.body === 'string' ? resolvePlaceholders(outOfScopeSection.body) : '';
      const oosItems = Array.isArray(outOfScopeSection?.items) ? outOfScopeSection.items.map((item: any) => resolvePlaceholders(String(item || ''))) : [];

      if (oosBody || oosItems.length) {
        const allKids = bodyChildren();
        const assessmentLimitationIdx = allKids.findIndex((el: any) => paraText(el) === 'Assessment Limitation');
        if (assessmentLimitationIdx !== -1) {
          // Find a template paragraph with bullet formatting
          let bulletTemplateP = null;
          for (let i = 0; i < allKids.length; i++) {
            if (allKids[i].tagName === 'w:p' && $(allKids[i]).find('w\\:numPr').length > 0) {
              bulletTemplateP = allKids[i];
              break;
            }
          }

          // Fallback to any paragraph
          let templateP = bulletTemplateP;
          if (!templateP) {
            for (let i = assessmentLimitationIdx - 1; i >= 0; i--) {
              if (allKids[i].tagName === 'w:p' && paraText(allKids[i])) {
                templateP = allKids[i];
                break;
              }
            }
          }

          if (templateP) {
            const insertBefore = allKids[assessmentLimitationIdx];
            const emptyP = cloneNode(templateP);
            setParaText(emptyP.get(0), '');
            // Remove bullet formatting from empty paragraph
            emptyP.find('w\\:numPr').remove();
            $(insertBefore).before($.xml(emptyP));

            if (oosBody) {
              const bodyP = cloneNode(templateP);
              setParaText(bodyP.get(0), oosBody);
              // Remove bullet formatting and bold from body text
              bodyP.find('w\\:numPr').remove();
              clearRunFormatting($, bodyP.get(0), { color: '000000' });
              $(insertBefore).before($.xml(bodyP));
            }

            for (const item of oosItems) {
              const itemP = bulletTemplateP ? cloneNode(bulletTemplateP) : cloneNode(templateP);
              setParaText(itemP.get(0), item);
              // Enforce consistent bullet indentation (tab-like spacing after bullet).
              {
                let pPr = itemP.find('w\\:pPr').first();
                if (!pPr.length) {
                  itemP.prepend('<w:pPr/>');
                  pPr = itemP.find('w\\:pPr').first();
                }
                pPr.find('w\\:ind').remove();
                pPr.append('<w:ind w:left="900" w:hanging="360"/>');
              }
              // Ensure bullet formatting is present
              if (!itemP.find('w\\:numPr').length && bulletTemplateP) {
                const numPr = $(bulletTemplateP).find('w\\:numPr').first();
                if (numPr.length) {
                  let pPr = itemP.find('w\\:pPr').first();
                  if (!pPr.length) {
                    itemP.prepend('<w:pPr/>');
                    pPr = itemP.find('w\\:pPr').first();
                  }
                  pPr.append($.xml(numPr));
                }
              }
              $(insertBefore).before($.xml(itemP));
            }
          }
        }
      }
    }

    // const matrixRows = Array.isArray(getSection('risk_classification')?.matrix_rows) && getSection('risk_classification').matrix_rows.length
    //   ? getSection('risk_classification').matrix_rows
    //   : [
    //     { low: 'Medium', medium: 'High', high: 'Critical' },
    //     { low: 'Low', medium: 'Medium', high: 'High' },
    //     { low: 'Low', medium: 'Low', high: 'Medium' },
    //   ];

    // const riskFillForValue = (value: string) => {
    //   const normalized = String(value || '').toLowerCase();
    //   if (normalized === 'critical') return { fill: 'C00000', text: 'FFFFFF' };
    //   if (normalized === 'high') return { fill: 'FF0000', text: 'FFFFFF' };
    //   if (normalized === 'medium') return { fill: 'FFC000', text: '000000' };
    //   return { fill: '00B050', text: 'FFFFFF' };
    // };

    let riskMatrixImageEmbedded = false;
    const riskMatrixImageCandidates = [
      // Prefer a public asset if provided by the user
      path.join(process.cwd(), 'public', 'images', 'risk-matrix.png'),
      path.join(process.cwd(), 'public', 'images', 'risk_matrix.png'),
      path.join(process.cwd(), 'public', 'images', 'riskmatrix.png'),
      // JPEG variants — user may have uploaded a JPEG
      path.join(process.cwd(), 'public', 'images', 'risk-matrix.jpeg'),
      path.join(process.cwd(), 'public', 'images', 'risk_matrix.jpeg'),
      path.join(process.cwd(), 'public', 'images', 'riskmatrix.jpeg'),
      path.join(process.cwd(), 'public', 'images', 'risk-matrix.jpg'),
      path.join(process.cwd(), 'public', 'images', 'risk_matrix.jpg'),
      path.join(process.cwd(), 'public', 'images', 'riskmatrix.jpg'),
      // Also check root public folder
      path.join(process.cwd(), 'public', 'risk-matrix.png'),
      path.join(process.cwd(), 'public', 'risk_matrix.png'),
      path.join(process.cwd(), 'public', 'riskmatrix.png'),
      // JPEG variants — user may have uploaded a JPEG
      path.join(process.cwd(), 'public', 'risk-matrix.jpeg'),
      path.join(process.cwd(), 'public', 'risk_matrix.jpeg'),
      path.join(process.cwd(), 'public', 'riskmatrix.jpeg'),
      path.join(process.cwd(), 'public', 'risk-matrix.jpg'),
      path.join(process.cwd(), 'public', 'risk_matrix.jpg'),
      path.join(process.cwd(), 'public', 'riskmatrix.jpg'),
      path.join(this.templatesDir, 'risk-matrix.png'),
      path.join(this.templatesDir, 'risk_matrix.png'),
      path.join(this.templatesDir, 'riskmatrix.png'),
    ];
    const riskMatrixImagePath = riskMatrixImageCandidates.find((p) => {
      const exists = fs.existsSync(p);
      console.log(`[RiskMatrix] checking "${p}" => ${exists ? 'FOUND' : 'not found'}`);
      return exists;
    });
    if (riskMatrixImagePath) {
      console.log(`[RiskMatrix] Using image: ${riskMatrixImagePath}`);
      try {
        const imageBuffer = fs.readFileSync(riskMatrixImagePath);
        const imageName = path.basename(riskMatrixImagePath);
        const ext = imageName.toLowerCase().replace(/^.*\./, '').split('?')[0];
        const isJpeg = ['jpg', 'jpeg'].includes(ext);
        // const mimeType = isJpeg ? 'image/jpeg' : 'image/png';
        const relId = 'rIdRiskMatrixImage';
        const mediaPath = `word/media/${imageName}`;

        zip.file(mediaPath, imageBuffer, { binary: true });

        const contentTypesXml = zip.file('[Content_Types].xml')?.asText() || '';
        if (contentTypesXml && !contentTypesXml.includes(mediaPath)) {
          const ctEntry = isJpeg
            ? `<Override PartName="/${mediaPath}" ContentType="image/jpeg"/>`
            : `<Override PartName="/${mediaPath}" ContentType="image/png"/>`;
          zip.file('[Content_Types].xml', contentTypesXml.replace('</Types>', `${ctEntry}\n</Types>`));
        }

        const relsPath = 'word/_rels/document.xml.rels';
        const relsXml = zip.file(relsPath)?.asText() || '';
        if (relsXml && !relsXml.includes(relId)) {
          const relEntry = `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageName}"/>`;
          zip.file(relsPath, relsXml.replace('</Relationships>', `${relEntry}\n</Relationships>`));
        }

        const targetHeading = sectionTitle('zero_risk_issues', 'Zero-risk Issues');
        const headingEl = bodyChildren().find((el: any) => paraText(el) === targetHeading);
        if (headingEl) {
          // Determine image extent (cx/cy) in EMUs using the actual image pixel dimensions when possible
          let cxVal = 3810000;
          let cyVal = 2222500;
          try {
            // Try to measure image dimensions using sharp if available
            let sharpPkg: any = null;
            try { sharpPkg = require('sharp'); } catch { }
            if (sharpPkg) {
              const meta = await sharpPkg(imageBuffer).metadata();
              const w = Number(meta?.width || 0) || 0;
              const h = Number(meta?.height || 0) || 0;
              if (w > 0 && h > 0) {
                const EMU_PER_PX = 9525; // EMU per pixel at 96 DPI
                cxVal = Math.round(w * EMU_PER_PX);
                cyVal = Math.round(h * EMU_PER_PX);
              }
            }
          } catch (e) {
            // Fallback to previously used fixed size
          }

          const drawingXml = `<w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r>
              <w:drawing>
                <wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0">
                  <wp:extent cx="${cxVal}" cy="${cyVal}"/>
                  <wp:effectExtent l="0" t="0" r="0" b="0"/>
                  <wp:docPr id="999" name="Risk Matrix"/>
                  <wp:cNvGraphicFramePr>
                    <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
                  </wp:cNvGraphicFramePr>
                  <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                    <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                      <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                        <pic:nvPicPr>
                          <pic:cNvPr id="999" name="Risk Matrix"/>
                          <pic:cNvPicPr/>
                        </pic:nvPicPr>
                        <pic:blipFill>
                          <a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="${relId}"/>
                          <a:stretch><a:fillRect/></a:stretch>
                        </pic:blipFill>
                        <pic:spPr>
                          <a:xfrm>
                            <a:off x="0" y="0"/>
                            <a:ext cx="${cxVal}" cy="${cyVal}"/>
                          </a:xfrm>
                          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                        </pic:spPr>
                      </pic:pic>
                    </a:graphicData>
                  </a:graphic>
                </wp:inline>
              </w:drawing>
            </w:r>
          </w:p>`;
          $(headingEl).before(drawingXml);
          riskMatrixImageEmbedded = true;
        }
      } catch (e: any) {
        console.warn('⚠️ Failed to embed risk matrix image:', e?.message || e);
      }
    }

    // If we could not embed an image, remove any existing static matrix table placeholder
    // The report must use the provided image asset for the risk matrix; do not generate a textual 3x3 matrix.
    if (!riskMatrixImageEmbedded && tables[0]) {
      const childrenForMatrix = bodyChildren();
      const measurementImpactHeading = childrenForMatrix.find((el: any) => paraText(el) === sectionTitle('zero_risk_issues', 'Zero-risk Issues'));
      if (measurementImpactHeading) {
        // Remove the first following table (assumed to be the matrix placeholder)
        const nextEl = $(measurementImpactHeading).next();
        if (nextEl && nextEl.length && nextEl.get(0).tagName === 'w:tbl') {
          $(nextEl).remove();
          console.log('ℹ️ Removed fallback risk matrix table; no image was embedded.');
        }
      }
    }

    console.log(`📊 Processing ${data.findings.length} findings for DOCX report`);
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, informational: 4, info: 4, unknown: 5 };
    const sortBySeverity = (a: any, b: any) => {
      const sa = String(a.severity || '').toLowerCase();
      const sb = String(b.severity || '').toLowerCase();
      return (severityOrder[sa as keyof typeof severityOrder] ?? 5) - (severityOrder[sb as keyof typeof severityOrder] ?? 5);
    };
    const sortedFindings = [...data.findings].sort(sortBySeverity);
    const findingsSummary = sortedFindings.map((f: any) => ({
      title: String(f.title || ''),
      severity: String(f.severity || ''),
      retest_status: String((f as any).retest_status || ''),
      ticket_id: String((f as any).ticket_id || ''),
      finding_type: String((f as any).finding_type || 'true_positive'),
    }));

    const summaryTableIdx = isDast ? 3 : 5;
    if (tables[summaryTableIdx]) {
      const tbl = tables[summaryTableIdx];
      const rows = $(tbl).find('> w\\:tr').toArray();
      if (!isDast && rows.length >= 1) {
        rows.forEach((row: any) => {
          const cells = $(row).find('> w\\:tc').toArray();
          if (cells[3]) $(cells[3]).remove();
          if (cells[2]) $(cells[2]).remove();
        });
      }
      if (rows.length >= 2) {
        const templateRow = rows[1];
        rows.slice(1).forEach((row: any) => $(row).remove());
        for (const item of findingsSummary) {
          const row = cloneNode(templateRow);
          const cells = row.find('w\\:tc').toArray();
          if (cells[0]) setParaText(cells[0], item.title);
          if (isDast) {
            // DAST 3-column: Finding | Status | Risk
            if (cells[1]) {
              const status = item.finding_type === 'false_positive' ? 'False-Positive' : 'True-Positive';
              setParaText(cells[1], status);
            }
            if (cells[2]) {
              if (item.finding_type === 'false_positive') {
                setParaText(cells[2], 'N/A');
              } else {
                setParaText(cells[2], item.severity);
                row.find('w\\:tc').eq(2).find('w\\:shd').attr('w:fill', this.severityFill(item.severity));
              }
            }
          } else {
            // Non-DAST 2-column: Finding | Risk
            if (cells[1]) {
              setParaText(cells[1], item.severity);
              row.find('w\\:tc').eq(1).find('w\\:shd').attr('w:fill', this.severityFill(item.severity));
            }
          }
          $(tbl).append($.xml(row));
        }
      }
      applySimpleTableTheme(tbl, { preserveSecondColumnSeverity: !isDast });

      // Make the summary table full-width (match reference) with a narrow Risk column.
      {
        let tblPr = $(tbl).find('w\\:tblPr').first();
        if (!tblPr.length) {
          $(tbl).prepend('<w:tblPr/>');
          tblPr = $(tbl).find('w\\:tblPr').first();
        }

        // Table width = 100%
        let tblW = tblPr.find('w\\:tblW').first();
        if (!tblW.length) {
          tblPr.prepend('<w:tblW/>');
          tblW = tblPr.find('w\\:tblW').first();
        }
        tblW.attr('w:type', 'pct');
        tblW.attr('w:w', '5000');

        // No indent; align to page
        tblPr.find('w\\:tblInd').remove();

        const setTcPct = (tc: any, pct50: string) => {
          let tcPr = $(tc).find('w\\:tcPr').first();
          if (!tcPr.length) {
            $(tc).prepend('<w:tcPr/>');
            tcPr = $(tc).find('w\\:tcPr').first();
          }
          let tcW = tcPr.find('w\\:tcW').first();
          if (!tcW.length) {
            tcPr.prepend('<w:tcW/>');
            tcW = tcPr.find('w\\:tcW').first();
          }
          tcW.attr('w:type', 'pct');
          tcW.attr('w:w', pct50);
        };

        if (isDast) {
          // 60% / 20% / 20% split for Finding | Status | Risk
          $(tbl).find('> w\\:tr').each((_: number, tr: any) => {
            const tcs = $(tr).find('> w\\:tc').toArray();
            if (tcs[0]) setTcPct(tcs[0], '3000');
            if (tcs[1]) setTcPct(tcs[1], '1000');
            if (tcs[2]) setTcPct(tcs[2], '1000');
          });
        } else {
          // 85% / 15% split (5000 = 100%)
          $(tbl).find('> w\\:tr').each((_: number, tr: any) => {
            const tcs = $(tr).find('> w\\:tc').toArray();
            if (tcs[0]) setTcPct(tcs[0], '4250');
            if (tcs[1]) setTcPct(tcs[1], '750');
          });
        }
      }
    }

    if (!isDast) {
      if (tables[3]) applySimpleTableTheme(tables[3]);
      if (tables[4]) applySimpleTableTheme(tables[4]);
      if (tables[6]) applySimpleTableTheme(tables[6], { headerFill: '4CC51F', bodyFill: 'E4F4DE' });
    }

    const children = bodyChildren();
    const detailedIdx = isDast
      ? children.findIndex((el: any) => paraText(el) === 'Detailed' || paraText(el) === 'Detailed Vulnerabilities')
      : children.findIndex((el: any) => paraText(el) === 'Detailed Vulnerabilities');
    let appendixIdx = children.findIndex((el: any) => paraText(el) === 'Appendix A');
    if (appendixIdx === -1) appendixIdx = children.length; // fallback when no Appendix A (DAST)
    if (detailedIdx !== -1 && appendixIdx !== -1 && appendixIdx > detailedIdx) {
      const detailNodes = children.slice(detailedIdx + 1, appendixIdx);
      const firstBackIdx = detailNodes.findIndex((el: any) => paraText(el).toLowerCase() === 'back to summary');
      if (firstBackIdx !== -1) {
        const prototype = detailNodes.slice(0, firstBackIdx + 1);
        // Remove all existing hardcoded finding content before Appendix.
        detailNodes.forEach((el: any) => $(el).remove());

        const makePageBreakPara = () => $(
          '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
        );

        const stripFigureArtifacts = (nodes: any[]) => nodes.filter((el: any) => {
          const txt = paraText(el);
          if (txt.startsWith('Fig:')) return false;
          if ($(el).find('w\\:drawing').length > 0) return false;
          // Avoid carrying over a page break placeholder into the first finding.
          if ($(el).find('w\\:br[w\\:type="page"]').length > 0) return false;
          return true;
        });

        const cleanPrototype = stripFigureArtifacts(prototype);
        const findingBlocks = sortedFindings.length ? sortedFindings : [];
        console.log(`🔍 Replacing ${detailNodes.length} hardcoded finding nodes with ${findingBlocks.length} real findings`);

        const toLines = (v: any): string[] => {
          if (!v) return [];
          if (Array.isArray(v)) return v.filter(Boolean).map((x: any) => String(x));
          return String(v).split(/\n+/).map((x) => x.trim()).filter(Boolean);
        };

        for (let i = 0; i < findingBlocks.length; i++) {
          const finding = findingBlocks[i] as any;
          const isFP = finding.finding_type === 'false_positive';
          // Each detailed vulnerability starts on a new page, except the first one
          // (so the first finding begins immediately after the "Detailed Vulnerabilities" heading).
          const insertTarget = appendixIdx < children.length ? children[appendixIdx] : body.children('w\\:sectPr').first().get(0);
          if (i > 0) {
            $(insertTarget).before($.xml(makePageBreakPara()));
          }

          const sectionDoc = cheerio.load('<root/>', { xmlMode: true, decodeEntities: false });
          const sectionRoot = sectionDoc('root');
          for (const node of cleanPrototype) {
            sectionRoot.append($.xml(cloneNode(node)));
          }

          const sectionParaText = (el: any): string => sectionDoc(el)
            .find('w\\:t')
            .toArray()
            .map((n: any) => sectionDoc(n).text())
            .join('')
            .replace(/\s+/g, ' ')
            .trim();

          const sectionSetParaText = (el: any, text: string) => {
            const runs = sectionDoc(el).find('w\\:t').toArray();
            if (!runs.length) return;
            sectionDoc(runs[0]).replaceWith(`<w:t xml:space="preserve">${escapeXmlText(text)}</w:t>`);
            for (let ri = 1; ri < runs.length; ri++) sectionDoc(runs[ri]).text('');
          };

          const cloneSectionNode = (el: any) => cheerio
            .load(sectionDoc.xml(el), { xmlMode: true, decodeEntities: false })
            .root()
            .children()
            .first();

          const stripMarkdownEmphasis = (text: string): string => String(text)
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/__(.*?)__/g, '$1');

          const appendSectionParagraph = (
            beforeNode: any,
            sourceNode: any,
            text: string,
            opts?: { color?: string; bold?: boolean; underline?: string; cleanMarkdown?: boolean }
          ) => {
            const p = cloneSectionNode(sourceNode);
            const finalText = opts?.cleanMarkdown ? stripMarkdownEmphasis(text) : text;
            sectionSetParaText(p.get(0), finalText);
            clearRunFormatting(sectionDoc, p.get(0), {
              bold: opts?.bold,
              color: opts?.color,
              underline: opts?.underline,
            });
            // Ensure the inserted paragraph does not inherit numbering/bullets or hanging indents
            // from the source template which would render as a bullet in PDF exports.
            try {
              const $p = cheerio.load(sectionDoc.xml(p), { xmlMode: true, decodeEntities: false });
              let pPr = $p('w\\:pPr').first();
              if (!pPr.length) { $p('w\\:p').prepend('<w:pPr/>'); pPr = $p('w\\:pPr').first(); }
              pPr.find('w\\:numPr').remove();
              pPr.find('w\\:ind').remove();
              sectionDoc(beforeNode).before($p.root().children().first().toString());
            } catch (e) {
              // Fallback to original insertion if sanitization fails for any reason
              sectionDoc(beforeNode).before(sectionDoc.xml(p));
            }
          };

          const appendSectionSplitParagraph = (
            beforeNode: any,
            sourceNode: any,
            lead: string,
            tail: string,
            opts?: { color?: string; underline?: string; normalizeIndent?: boolean; spacing?: { before?: number; after?: number } }
          ) => {
            const p = cloneSectionNode(sourceNode);
            setParagraphSegments(sectionDoc, p.get(0), [
              { text: lead, bold: true, color: opts?.color || '000000' },
              { text: tail ? ` ${tail}` : '', color: opts?.color || '000000', underline: opts?.underline },
            ]);
            if (opts?.normalizeIndent) ensureNoRightIndent(p.get(0));
            if (opts?.spacing) ensureSectionParaSpacing(p.get(0), opts.spacing);
            sectionDoc(beforeNode).before(sectionDoc.xml(p));
          };

          const paras = sectionRoot.children('w\\:p').toArray();
          const paraByText = (label: string) => paras.find((p: any) => sectionParaText(p) === label);

          // Find the title paragraph - it's the first substantial paragraph that's not a label
          // We need to find it BEFORE any label paragraphs
          let titlePara: any = null;
          for (const p of paras) {
            const txt = sectionParaText(p);
            // Stop searching once we hit label paragraphs
            if (txt.endsWith(':') || txt.startsWith('Risk:') || txt === 'Back to summary') {
              break;
            }
            // First non-empty paragraph is the title
            if (txt.length > 0) {
              titlePara = p;
              break;
            }
          }
          if (!titlePara) titlePara = paras[0];

          const riskPara = paras.find((p: any) => sectionParaText(p).startsWith('Risk:'));
          const descLabel = paraByText('Description:');
          const urlLabel = paraByText('Affected URL:') || paraByText('Affected Target:');
          let impactLikelihoodHeading = paraByText('Impact and Likelihood:');
          if (!impactLikelihoodHeading) impactLikelihoodHeading = paraByText('Impact & Likelihood:');
          if (!impactLikelihoodHeading) impactLikelihoodHeading = paraByText('Impact &amp; Likelihood:');
          const impactLabel = paraByText('Impact:');
          const likelihoodLabel = paraByText('Likelihood:');
          const stepsLabel = paraByText('Steps to Reproduce:');
          const recLabel = paraByText('Recommendations:');
          const refLabel = paraByText('References:');
          const backPara = paras.find((p: any) => sectionParaText(p).toLowerCase() === 'back to summary');

          const ensureSectionParaSpacing = (p: any, spacing: { before?: number; after?: number }) => {
            if (!p) return;
            let pPr = sectionDoc(p).find('w\\:pPr').first();
            if (!pPr.length) {
              sectionDoc(p).prepend('<w:pPr/>');
              pPr = sectionDoc(p).find('w\\:pPr').first();
            }
            let sp = pPr.find('w\\:spacing').first();
            if (!sp.length) {
              pPr.append('<w:spacing/>');
              sp = pPr.find('w\\:spacing').first();
            }
            if (typeof spacing.before === 'number') sp.attr('w:before', String(spacing.before));
            if (typeof spacing.after === 'number') sp.attr('w:after', String(spacing.after));
          };

          // Some prototype paragraphs carry a right-indent (w:ind w:right) which produces
          // a visible extra gap in the generated DOCX/PDF for inserted step lines.
          const ensureNoRightIndent = (p: any) => {
            if (!p) return;
            let pPr = sectionDoc(p).find('w\\:pPr').first();
            if (!pPr.length) {
              sectionDoc(p).prepend('<w:pPr/>');
              pPr = sectionDoc(p).find('w\\:pPr').first();
            }
            const ind = pPr.find('w\\:ind').first();
            if (ind.length) {
              if (ind.attr('w:left') != null) ind.attr('w:left', '0');
              if (ind.attr('w:hanging') != null) ind.attr('w:hanging', '0');
              if (ind.attr('w:start') != null) ind.attr('w:start', '0');
              if (ind.attr('w:firstLine') != null) ind.attr('w:firstLine', '0');
              if (ind.attr('w:right') != null) ind.attr('w:right', '0');
              if (ind.attr('w:end') != null) ind.attr('w:end', '0');
            }
          };

          // Subheading spacing (matches reference tighter grouping).
          [descLabel, urlLabel, impactLikelihoodHeading, stepsLabel, recLabel, refLabel].forEach((p: any) => {
            ensureSectionParaSpacing(p, { before: 240, after: 120 });
          });

          console.log(`   - Found title para: "${titlePara ? sectionParaText(titlePara) : 'NONE'}"`);
          console.log(`   - Will replace with: "${String(finding.title || 'Untitled Finding')}"`);

          const riskTextColor = (() => {
            const severity = String(finding.severity || '').toLowerCase();
            if (severity === 'critical') return 'C00000';
            if (severity === 'high') return 'FF0000';
            if (severity === 'medium') return 'C59A00';
            if (severity === 'low') return '70AD47';
            return '2F80ED';
          })();

          if (titlePara) {
            const oldTitle = sectionParaText(titlePara);
            sectionSetParaText(titlePara, String(finding.title || 'Untitled Finding'));
            // Force the finding title to Heading 3 style (matches reference layout)
            {
              let pPr = sectionDoc(titlePara).find('w\\:pPr').first();
              if (!pPr.length) {
                sectionDoc(titlePara).prepend('<w:pPr/>');
                pPr = sectionDoc(titlePara).find('w\\:pPr').first();
              }
              let pStyle = pPr.find('w\\:pStyle').first();
              if (!pStyle.length) {
                pPr.prepend('<w:pStyle w:val="Heading3"/>');
              } else {
                pStyle.attr('w:val', 'Heading3');
              }

              // Help Google Docs map this to "Heading 3" in its outline.
              let outline = pPr.find('w\\:outlineLvl').first();
              if (!outline.length) {
                pPr.append('<w:outlineLvl w:val="2"/>');
              } else {
                outline.attr('w:val', '2');
              }

              // Also force Roboto on the title run(s).
              sectionDoc(titlePara).find('w\\:rPr').each((_: number, rPr: any) => {
                let rFonts = sectionDoc(rPr).find('w\\:rFonts').first();
                if (!rFonts.length) {
                  sectionDoc(rPr).prepend('<w:rFonts/>');
                  rFonts = sectionDoc(rPr).find('w\\:rFonts').first();
                }
                rFonts.attr('w:ascii', 'Roboto');
                rFonts.attr('w:hAnsi', 'Roboto');
                rFonts.attr('w:cs', 'Roboto');
                rFonts.attr('w:eastAsia', 'Roboto');
              });
            }
            console.log(`   - Replaced "${oldTitle}" with "${sectionParaText(titlePara)}"`);
          }
          if (riskPara && !isFP) {
            setParagraphSegments(sectionDoc, riskPara, [
              { text: 'Risk:', bold: true, color: '000000' },
              { text: ' ', color: '000000' },
              { text: String(finding.severity || ''), bold: true, color: riskTextColor },
            ]);
          }

          console.log(`📝 Processing finding: ${finding.title}`);
          console.log(`   - Description: ${finding.description ? 'YES' : 'NO'}`);
          console.log(`   - Impact: ${finding.impact?.detail ? 'YES' : 'NO'}`);
          console.log(`   - Likelihood: ${finding.likelihood?.detail ? 'YES' : 'NO'}`);
          console.log(`   - Steps: ${Array.isArray(finding.steps_to_reproduce) ? finding.steps_to_reproduce.length : 0}`);
          console.log(`   - Recommendations: ${Array.isArray(finding.recommendation) ? finding.recommendation.length : 0}`);
          console.log(`   - References: ${Array.isArray(finding.references || finding.finding_references) ? (finding.references || finding.finding_references).length : 0}`);

          let currentDesc = false;
          let currentUrl = false;
          let currentSteps = false;
          let currentRecs = false;
          let currentRefs = false;
          let currentImpact = false;
          let currentLikelihood = false;
          const removeParas = new Set<any>();
          for (const p of paras) {
            const txt = sectionParaText(p);
            if (txt === 'Description:') { currentDesc = true; currentUrl = currentSteps = currentRecs = currentRefs = currentImpact = currentLikelihood = false; continue; }
            if (txt === 'Affected URL:') { currentUrl = true; currentDesc = currentSteps = currentRecs = currentRefs = currentImpact = currentLikelihood = false; continue; }
            if (txt === 'Impact and Likelihood:' || txt === 'Impact & Likelihood:' || txt === 'Impact &amp; Likelihood:') { currentImpact = currentLikelihood = false; currentDesc = currentUrl = currentSteps = currentRecs = currentRefs = false; continue; }
            if (txt === 'Impact:') { currentImpact = true; currentUrl = false; currentLikelihood = false; currentDesc = currentSteps = currentRecs = currentRefs = false; continue; }
            if (txt === 'Likelihood:') { currentLikelihood = true; currentUrl = false; currentImpact = false; currentDesc = currentSteps = currentRecs = currentRefs = false; continue; }
            if (txt === 'Steps to Reproduce:') { currentSteps = true; currentUrl = false; currentDesc = currentRecs = currentRefs = currentImpact = currentLikelihood = false; continue; }
            if (txt === 'Recommendations:') { currentRecs = true; currentUrl = false; currentDesc = currentSteps = currentRefs = currentImpact = currentLikelihood = false; continue; }
            if (txt === 'References:' || txt === ' References:') { currentRefs = true; currentUrl = false; currentDesc = currentSteps = currentRecs = currentImpact = currentLikelihood = false; continue; }
            if (txt.toLowerCase() === 'back to summary') { currentUrl = false; currentDesc = currentSteps = currentRecs = currentRefs = currentImpact = currentLikelihood = false; continue; }
            if (currentDesc || currentUrl || currentSteps || currentRecs || currentRefs || currentImpact || currentLikelihood) removeParas.add(p);
          }
          Array.from(removeParas).forEach((p: any) => sectionDoc(p).remove());

          // For false positive findings, remove sections not applicable
          if (isFP) {
            if (impactLikelihoodHeading) sectionDoc(impactLikelihoodHeading).remove();
            if (stepsLabel) sectionDoc(stepsLabel).remove();
            if (recLabel) sectionDoc(recLabel).remove();
            if (refLabel) sectionDoc(refLabel).remove();
          }

          // Find a good template paragraph for body text (not a label, not empty)
          const bodyTextTemplate = paras.find((p: any) => {
            const txt = sectionParaText(p);
            return txt.length > 20 && !txt.endsWith(':') && !txt.startsWith('Step') && !txt.startsWith('Risk:');
          }) || titlePara;

          const neutralParagraphTemplate = riskPara || descLabel || bodyTextTemplate;

          if (descLabel) {
            const descText = String(finding.description || '');
            console.log(`   - Inserting description: "${descText.substring(0, 100)}..."`);
            appendSectionParagraph(urlLabel || backPara || titlePara, neutralParagraphTemplate, descText, { color: '000000' });
          }

          const affected = String(finding.affected_target || '').trim();
          console.log(`   - Affected target: "${affected}"`);
          if (urlLabel && affected) {
            // Find a bullet paragraph template from the document
            let bulletTemplate = null;
            for (const p of paras) {
              if (sectionDoc(p).find('w\\:numPr').length > 0) {
                bulletTemplate = p;
                break;
              }
            }

            // Check if it's a URL and format as hyperlink with green bullet point
            if (bulletTemplate) {
              const p = cloneSectionNode(bulletTemplate);

              // Ensure green bullet color
              let pPr = sectionDoc(p).find('w\\:pPr').first();
              if (!pPr.length) {
                sectionDoc(p).prepend('<w:pPr/>');
                pPr = sectionDoc(p).find('w\\:pPr').first();
              }

              // Add or update numPr for green bullet
              let numPr = pPr.find('w\\:numPr').first();
              if (!numPr.length) {
                pPr.append('<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>');
              }

              if (affected.startsWith('http://') || affected.startsWith('https://')) {
                setParagraphSegments(sectionDoc, p.get(0), [
                  { text: affected, color: '1155CC', underline: 'single' },
                ]);
              } else {
                setParagraphSegments(sectionDoc, p.get(0), [
                  { text: affected, color: '000000' },
                ]);
              }
              ensureSectionParaSpacing(p.get(0), { before: 0, after: 120 });
              sectionDoc(impactLikelihoodHeading || impactLabel || backPara || titlePara).before(sectionDoc.xml(p));
            } else {
              // Fallback: use green dot character
              if (affected.startsWith('http://') || affected.startsWith('https://')) {
                const p = cloneSectionNode(urlLabel);
                setParagraphSegments(sectionDoc, p.get(0), [
                  { text: '● ', color: '4CC51F', size: 32 },
                  { text: affected, color: '1155CC', underline: 'single' },
                ]);
                ensureSectionParaSpacing(p.get(0), { before: 0, after: 120 });
                sectionDoc(impactLikelihoodHeading || impactLabel || backPara || titlePara).before(sectionDoc.xml(p));
              } else {
                const p = cloneSectionNode(urlLabel);
                setParagraphSegments(sectionDoc, p.get(0), [
                  { text: '● ', color: '4CC51F', size: 32 },
                  { text: affected, color: '000000' },
                ]);
                ensureSectionParaSpacing(p.get(0), { before: 0, after: 120 });
                sectionDoc(impactLikelihoodHeading || impactLabel || backPara || titlePara).before(sectionDoc.xml(p));
              }
            }
          }

          // Insert Impact & Likelihood as bolded bullet lines, including severity.
          // Expected format (reference): "Impact: High – <detail>" and "Likelihood: Medium – <detail>"
          const findBulletTemplate = (): any => paras.find((p: any) => sectionDoc(p).find('w\\:numPr').length > 0) || neutralParagraphTemplate;
          const impactObj = typeof finding.impact === 'object' && finding.impact ? finding.impact : null;
          const impactSeverity = impactObj?.severity ? String(impactObj.severity).trim() : '';
          const impactDetail = impactObj?.detail ? String(impactObj.detail).trim() : (typeof finding.impact === 'string' ? String(finding.impact).trim() : '');

          const likelihoodObj = typeof finding.likelihood === 'object' && finding.likelihood ? finding.likelihood : null;
          const likelihoodSeverity = likelihoodObj?.severity ? String(likelihoodObj.severity).trim() : '';
          const likelihoodDetail = likelihoodObj?.detail ? String(likelihoodObj.detail).trim() : (typeof finding.likelihood === 'string' ? String(finding.likelihood).trim() : '');

          const bulletTpl = findBulletTemplate();
          const insertBefore = impactLabel || likelihoodLabel || stepsLabel || backPara || titlePara;

          if (insertBefore && impactDetail) {
            const p = cloneSectionNode(bulletTpl);
            setParagraphSegments(sectionDoc, p.get(0), [
              { text: 'Impact: ', bold: true, color: '000000' },
              ...(impactSeverity ? [{ text: `${impactSeverity} `, bold: true, color: '000000' }] : []),
              { text: '– ', color: '000000' },
              { text: impactDetail, color: '000000' },
            ] as any);
            ensureSectionParaSpacing(p.get(0), { before: 0, after: 80 });
            sectionDoc(insertBefore).before(sectionDoc.xml(p));
          }

          if (insertBefore && likelihoodDetail) {
            const p = cloneSectionNode(bulletTpl);
            setParagraphSegments(sectionDoc, p.get(0), [
              { text: 'Likelihood: ', bold: true, color: '000000' },
              ...(likelihoodSeverity ? [{ text: `${likelihoodSeverity} `, bold: true, color: '000000' }] : []),
              { text: '– ', color: '000000' },
              { text: likelihoodDetail, color: '000000' },
            ] as any);
            ensureSectionParaSpacing(p.get(0), { before: 0, after: 120 });
            sectionDoc(insertBefore).before(sectionDoc.xml(p));
          }

          // Remove the standalone "Impact:" / "Likelihood:" label paragraphs if present.
          if (impactLabel) sectionDoc(impactLabel).remove();
          if (likelihoodLabel) sectionDoc(likelihoodLabel).remove();

          const stepTemplate = neutralParagraphTemplate;
          const recTemplate = paras.find((p: any) => {
            const txt = sectionParaText(p);
            return txt.length > 15 && !txt.endsWith(':') && !txt.startsWith('Step') && !txt.startsWith('Risk:') && txt !== sectionParaText(titlePara);
          }) || neutralParagraphTemplate;
          const refTemplate = paras.find((p: any) => {
            const txt = sectionParaText(p);
            return txt.includes('http') || txt.includes('www');
          }) || bodyTextTemplate;

          const collapse = (s: string) => String(s).replace(/\s+/g, ' ').trim();
          const normalizeSteps = (steps: any): Array<{ stepNumber: number; description: string; imageKey?: string; caption?: string }> => {
            if (!steps) return [];
            if (Array.isArray(steps) && steps.length > 0 && typeof steps[0] === 'object' && steps[0] !== null && 'description' in steps[0]) {
              return steps.map((step, idx) => ({
                stepNumber: step.stepNumber || idx + 1,
                description: collapse(String(step.description || '')),
                imageKey: step.imageKey || step.image, // Support both imageKey (new) and image (legacy)
                caption: step.caption
              })).filter(s => s.description);
            }
            if (Array.isArray(steps)) {
              return steps.map((step, idx) => ({
                stepNumber: idx + 1,
                description: collapse(String(step)),
              })).filter(s => s.description);
            }
            return String(steps).split(/\n+/).map((step, idx) => ({
              stepNumber: idx + 1,
              description: collapse(step.replace(/^\d+[.)]\s*/, '')),
            })).filter(s => s.description);
          };

          if (isFP) {
            // Render evidence_items for false positive findings (image + caption only)
            const evidenceItems = (finding.evidence_items || []).filter((ei: any) => ei.imageKey);
            console.log(`   - Inserting ${evidenceItems.length} evidence items`);
            for (let ei = 0; ei < evidenceItems.length; ei++) {
              const item = evidenceItems[ei];
              if (item.imageKey && typeof item.imageKey === 'string') {
                const findingId = finding.id || 0;
                console.log(`       - Processing evidence image ${ei}: ${item.imageKey}`);
                const relId = await addImageToZip(item.imageKey, findingId, 1000 + ei);
                if (relId) {
                  const imageInfo = imageMap.get(`finding_${findingId}_step_${1000 + ei}`);
                  if (imageInfo) {
                    addImageRelationship(relId, imageInfo.relTarget);
                    const imageDrawing = createImageDrawing(relId);
                    const imgPara = cheerio.load(imageDrawing, { xmlMode: true, decodeEntities: false }).root().children().first();
                    sectionDoc(backPara || titlePara).before(sectionDoc.xml(imgPara));
                    console.log(`       ✅ Evidence image embedded successfully: ${imageInfo.relTarget} as ${relId}`);
                  } else {
                    console.log(`       ❌ Evidence image info not found in map`);
                  }
                } else {
                  console.log(`       ❌ Failed to embed evidence image`);
                }
              }
              if (item.caption) {
                const captionPara = cloneSectionNode(stepTemplate);
                ensureNoRightIndent(captionPara.get(0));
                const p = sectionDoc(captionPara.get(0));
                const existingPPr = p.children('w\\:pPr').first();
                if (existingPPr.length) {
                  existingPPr.append('<w:jc w:val="center"/>');
                } else {
                  p.prepend('<w:pPr><w:jc w:val="center"/></w:pPr>');
                }
                setParagraphSegments(sectionDoc, captionPara.get(0), [
                  { text: `Fig: ${item.caption}`, italic: true, color: '9ca3af' },
                ]);
                sectionDoc(backPara || titlePara).before(sectionDoc.xml(captionPara));
                console.log(`       - Evidence caption added (centered): ${item.caption}`);
              }
            }
          } else {
            const steps = normalizeSteps(finding.steps_to_reproduce);
            console.log(`   - Inserting ${steps.length} steps`);
            for (let si = 0; si < steps.length; si++) {
              const step = steps[si];
              console.log(`     Step ${step.stepNumber}: "${step.description.substring(0, 50)}..."`);
              appendSectionSplitParagraph(
                recLabel || backPara || titlePara,
                stepTemplate,
                `Step ${step.stepNumber}:`,
                step.description,
                { color: '000000', normalizeIndent: true, spacing: { before: 0, after: 120 } }
              );
              // Important ordering: we insert blocks BEFORE the anchor paragraph. Inserting in sequence means
              // later inserts appear closer to the anchor. To get: Step -> Image -> Caption, we must insert
              // Image first, then Caption.
              if (step.imageKey && typeof step.imageKey === 'string') {
                const findingId = finding.id || 0;
                console.log(`       - Processing image for step ${si}: ${step.imageKey}`);
                const relId = await addImageToZip(step.imageKey, findingId, si);
                if (relId) {
                  const imageInfo = imageMap.get(`finding_${findingId}_step_${si}`);
                  if (imageInfo) {
                    addImageRelationship(relId, imageInfo.relTarget);
                    const imageDrawing = createImageDrawing(relId);
                    const imgPara = cheerio.load(imageDrawing, { xmlMode: true, decodeEntities: false }).root().children().first();
                    sectionDoc(recLabel || backPara || titlePara).before(sectionDoc.xml(imgPara));

                    console.log(`       ✅ Image embedded successfully: ${imageInfo.relTarget} as ${relId}`);
                  } else {
                    console.log(`       ❌ Image info not found in map`);
                  }
                } else {
                  console.log(`       ❌ Failed to embed image`);
                }
              }
              if (step.caption) {
                const captionPara = cloneSectionNode(stepTemplate);
                ensureNoRightIndent(captionPara.get(0));
                // Add center alignment to caption
                const p = sectionDoc(captionPara.get(0));
                const existingPPr = p.children('w\\:pPr').first();
                if (existingPPr.length) {
                  existingPPr.append('<w:jc w:val="center"/>');
                } else {
                  p.prepend('<w:pPr><w:jc w:val="center"/></w:pPr>');
                }
                setParagraphSegments(sectionDoc, captionPara.get(0), [
                  { text: `Fig ${step.stepNumber}: ${step.caption}`, italic: true, color: '9ca3af' },
                ]);
                sectionDoc(recLabel || backPara || titlePara).before(sectionDoc.xml(captionPara));
                console.log(`       - Caption added (centered): ${step.caption}`);
              }
            }
          }

          const recs = isFP ? [] : toLines(finding.recommendation);
          console.log(`   - Inserting ${recs.length} recommendations`);

          // Find a bullet paragraph template from the document
          let bulletTemplate = null;
          for (const p of paras) {
            if (sectionDoc(p).find('w\\:numPr').length > 0) {
              bulletTemplate = p;
              break;
            }
          }

          for (let ri = 0; ri < recs.length; ri++) {
            const cleaned = stripMarkdownEmphasis(recs[ri]);
            const colonIndex = cleaned.indexOf(':');

            // Use bullet template if available, otherwise create custom bullet
            if (bulletTemplate) {
              const p = cloneSectionNode(bulletTemplate);

              // Ensure green bullet color
              let pPr = sectionDoc(p).find('w\\:pPr').first();
              if (!pPr.length) {
                sectionDoc(p).prepend('<w:pPr/>');
                pPr = sectionDoc(p).find('w\\:pPr').first();
              }

              // Add or update numPr for green bullet
              let numPr = pPr.find('w\\:numPr').first();
              if (!numPr.length) {
                pPr.append('<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>');
              }

              if (colonIndex !== -1) {
                setParagraphSegments(sectionDoc, p.get(0), [
                  { text: cleaned.slice(0, colonIndex + 1), bold: true, color: '000000' },
                  { text: ' ' + cleaned.slice(colonIndex + 1).trim(), color: '000000' },
                ]);
              } else {
                setParagraphSegments(sectionDoc, p.get(0), [
                  { text: cleaned, bold: true, color: '000000' },
                ]);
              }
              sectionDoc(refLabel || backPara || titlePara).before(sectionDoc.xml(p));
            } else {
              // Fallback: use green dot character
              const p = cloneSectionNode(recTemplate);
              if (colonIndex !== -1) {
                setParagraphSegments(sectionDoc, p.get(0), [
                  { text: '● ', color: '4CC51F', size: 32 },
                  { text: cleaned.slice(0, colonIndex + 1), bold: true, color: '000000' },
                  { text: ' ' + cleaned.slice(colonIndex + 1).trim(), color: '000000' },
                ]);
              } else {
                setParagraphSegments(sectionDoc, p.get(0), [
                  { text: '● ', color: '4CC51F', size: 32 },
                  { text: cleaned, bold: true, color: '000000' },
                ]);
              }
              sectionDoc(refLabel || backPara || titlePara).before(sectionDoc.xml(p));
            }
          }

          // Handle references - support both 'references' and 'finding_references' fields
          const refsArray = isFP ? [] : (finding.references || finding.finding_references || []);
          const refs = toLines(refsArray);
          console.log(`   - Inserting ${refs.length} references`);
          for (let ri = 0; ri < refs.length; ri++) {
            let refText = String(refs[ri] || '').trim();
            // If it's a URL-like reference that ends with a dot (common when authors paste
            // links inside sentences), remove the trailing dot so PDF shows no extraneous '.'
            if (/^(https?:\/\/|www\.)/i.test(refText) && refText.endsWith('.')) {
              refText = refText.replace(/\.+$/g, '');
            }
            appendSectionParagraph(backPara || titlePara, refTemplate, refText, { color: '1155CC', underline: 'single' });
          }

          if (backPara && templateKey !== 'dast') sectionDoc(backPara).remove();

          sectionRoot.children().toArray().forEach((node: any) => {
            $(insertTarget).before(sectionDoc.xml(node));
          });
        }
      }
    }

    zip.file('word/document.xml', $.xml());
    return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  }


  private static async generateDOCXBuffer(data: ReportData): Promise<Buffer> {
    const templatePath = this.resolveDocxTemplatePath(data.template);

    // Template-specific renderers (e.g. BlueAlly) override the default generation.
    if (templatePath) {
      const renderer = getRendererForTemplate(data.template);
      if (renderer) {
        return await renderer.generateDocxBuffer({ templatePath, data });
      }
    }
    if (templatePath) {
      let PizZip: any;
      let Docxtemplater: any;
      let ImageModule: any;
      try {
        PizZip = require('pizzip');
        Docxtemplater = require('docxtemplater');
        // Optional; only used if the template contains image tags.
        ImageModule = require('docxtemplater-image-module-free');
      } catch {
        throw new ApiError(
          500,
          'DOCX template rendering requires `docxtemplater` and `pizzip`. Please install them in `backend/`.'
        );
      }

      const content = fs.readFileSync(templatePath, 'binary');
      const zip = new PizZip(content);
      const documentXml = zip.file('word/document.xml')?.asText() || '';
      const hasTemplateTags = /\{[#/%]?[A-Za-z0-9_.-]+/.test(documentXml);
      if (!hasTemplateTags) {
        return await this.renderStyledDocxTemplateBuffer(templatePath, data);
      }

      const transparentPngB64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X8Xc8AAAAASUVORK5CYII=';
      const imageModule = ImageModule
        ? new ImageModule({
          getImage: (tagValue: any) => {
            if (!tagValue) return Buffer.from(transparentPngB64, 'base64');
            const v = String(tagValue);
            if (v.startsWith('data:image/') && v.includes('base64,')) {
              const b64 = v.split('base64,')[1] || '';
              return Buffer.from(b64, 'base64');
            }
            try {
              return fs.readFileSync(v);
            } catch {
              return Buffer.from(transparentPngB64, 'base64');
            }
          },
          getSize: () => [220, 44],
        })
        : null;

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        modules: imageModule ? [imageModule] : [],
      });

      try {
        doc.render(this.buildDocxTemplateData(data));
      } catch (err: any) {
        console.error('❌ DOCX template render error:', err);
        throw new ApiError(500, `Failed to render DOCX template: ${err?.message || 'Unknown error'}`);
      }

      return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    }

    // Fallback: HTML->DOCX conversion (kept until a real .docx template is added).
    // html-to-docx mistakenly calls `console.warning()` in some versions.
    // Shim it to `console.warn()` to avoid runtime crashes.
    if (typeof (console as any).warning !== 'function') {
      (console as any).warning = console.warn.bind(console);
    }
    const HTMLToDOCX = require('html-to-docx');
    const renderedHtml = this.renderReportHTML(data, { inlineImages: true });
    return await HTMLToDOCX(renderedHtml, undefined, {
      title: `${data.project.name} Report`,
      orientation: 'portrait',
      pageSize: {
        width: 11906,
        height: 16838,
      },
      margins: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        header: 0,
        footer: 0,
      },
      font: 'Aptos',
      fontSize: 23,
      table: {
        row: {
          cantSplit: true,
        },
      },
      decodeUnicode: true,
      pageNumber: false,
      header: false,
      footer: false,
    });
  }

  private static async generateDOCX(data: ReportData): Promise<string> {
    const { project } = data;
    const fileName = `${project.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.docx`;
    const filePath = path.join(this.reportsDir, fileName);
    console.log('📄 Generating DOCX report at:', filePath);

    let buffer = await this.generateDOCXBuffer(data);

    const templateKey = data.template ? getTemplateKey(data.template) : 'unknown';
    if (templateKey === 'dast') {
      const sofficePath = '/usr/bin/soffice';
      if (fs.existsSync(sofficePath)) {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'securify-dast-docx-'));
        const inputPath = path.join(tempDir, 'report.docx');
        const outputPath = path.join(tempDir, 'report.pdf');

        try {
          fs.writeFileSync(inputPath, buffer);
          await this.execFileAsync(sofficePath, [
            '--headless',
            '--convert-to',
            'pdf:writer_pdf_Export',
            '--outdir',
            tempDir,
            inputPath,
          ], { timeout: 120000 });

          if (fs.existsSync(outputPath)) {
            const actualTocPages = await this.buildDastActualTocPages(outputPath, data);
            if (actualTocPages.size > 0) {
              buffer = this.patchDastTocPageNumbers(buffer, actualTocPages, data);
            }
          }
        } catch (e) {
          console.warn('[Report Service] DOCX TOC pagination patch failed, keeping initial DOCX:', (e as any)?.message || e);
        } finally {
          try {
            fs.rmSync(tempDir, { recursive: true, force: true });
          } catch {
            // Ignore cleanup failures.
          }
        }
      }
    }

    fs.writeFileSync(filePath, buffer);
    return filePath;
  }

  // Get Report File
  static async getReportFile(reportId: number): Promise<string> {
    const report = await ReportModel.getReportById(reportId);
    if (!report) {
      throw new ApiError(404, 'Report not found');
    }

    console.log('🔍 Looking for report file:', report.file_path);
    console.log('📂 File exists?', report.file_path && fs.existsSync(report.file_path));

    if (!report.file_path || !fs.existsSync(report.file_path)) {
      throw new ApiError(404, 'Report file not found');
    }

    return report.file_path;
  }

  // Get Reports by Project
  static async getReportsByProject(projectId: number) {
    return await ReportModel.getReportsByProject(projectId);
  }

  // Delete Report
  static async deleteReport(reportId: number): Promise<void> {
    const report = await ReportModel.getReportById(reportId);
    if (!report) {
      throw new ApiError(404, 'Report not found');
    }

    // Delete file if exists
    if (report.file_path && fs.existsSync(report.file_path)) {
      fs.unlinkSync(report.file_path);
    }

    // Delete database record
    await ReportModel.deleteReport(reportId);
  }

  // Template Management
  static async createTemplate(data: {
    name: string;
    description?: string;
    template_data: any;
    logo_path?: string;
    is_default?: boolean;
    created_by: number;
  }) {
    return await ReportModel.createTemplate(data);
  }

  static async getAllTemplates() {
    return await ReportModel.getAllTemplates();
  }

  static async getTemplateById(id: number) {
    const template = await ReportModel.getTemplateById(id);
    if (!template) {
      throw new ApiError(404, 'Template not found');
    }
    return template;
  }

  static async updateTemplate(id: number, data: any) {
    return await ReportModel.updateTemplate(id, data);
  }

  static async deleteTemplate(id: number) {
    return await ReportModel.deleteTemplate(id);
  }
}

export default ReportService;
