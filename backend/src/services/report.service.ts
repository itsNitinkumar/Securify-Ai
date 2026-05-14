import {
  AlignmentType,
  HighlightColor,
  BorderStyle,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  PageNumber,
  PageBreak,
  Paragraph,
  SimpleField,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { format as formatDate } from 'date-fns';
import ReportModel, { ReportTemplate } from '../models/report.model';
import ProjectModel from '../models/project.model';
import FindingModel from '../models/finding.model';
import ApiError from '../utils/ApiError';
import { ReportGeneratorService } from './report-generator.service';

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
  private static templatesDir = path.join(__dirname, '../templates');
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

    const approvedFindings = await FindingModel.findAll({ project_id: projectId, status: 'approved' });
    const findings = Array.isArray(findingIds) && findingIds.length > 0
      ? approvedFindings.filter((finding) => findingIds.includes(finding.id))
      : approvedFindings;

    if (Array.isArray(findingIds) && findingIds.length > 0 && findings.length === 0) {
      throw new ApiError(400, 'No approved findings matched the selected findings');
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
      findings,
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

    // Ensure a scope paragraph and tables exist across all templates so dynamic
    // replacements work even if an older template file lacks them.
    {
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

    // If templates contain the scope paragraph and tables, update them using project metadata.
    // (This runs after findings injection because some templates may insert scope before findings.)
    {
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
      html = html.replace(/(risk-?matrix\.png)/g, (m) => riskSrc);
    }

    return html;
  }

  private static async htmlToDocChildren(html: string): Promise<Array<Paragraph | Table>> {
    // Converts our report HTML pages into editable DOCX blocks.
    // Requires: `npm i cheerio` in backend.
    let cheerio: any;
    try {
      const mod: any = await import('cheerio');
      cheerio = mod?.default ?? mod;
    } catch {
      throw new ApiError(
        500,
        'DOCX generation requires HTML parsing dependency. Please install: `cd backend && npm i cheerio`'
      );
    }

    const $ = cheerio.load(html);

    const blocks: Array<Paragraph | Table> = [];

    const pushParagraph = (children: TextRun[], opts?: { heading?: any; alignment?: any; spacing?: any }) => {
      blocks.push(
        new Paragraph({
          heading: opts?.heading,
          alignment: opts?.alignment,
          spacing: opts?.spacing,
          children,
        })
      );
    };

    const textRunsFromNode = (node: any, style?: { bold?: boolean; italics?: boolean; color?: string; size?: number; highlight?: any }): TextRun[] => {
      if (!node) return [];
      const runs: TextRun[] = [];
      const type = node.type;

      if (type === 'text') {
        const t = String(node.data || '');
        if (t) {
          runs.push(new TextRun({
            text: t,
            bold: style?.bold,
            italics: style?.italics,
            color: style?.color || this.brand.text,
            size: style?.size || 22,
            highlight: style?.highlight,
          }));
        }
        return runs;
      }

      if (type === 'tag') {
        const name = String(node.name || '').toLowerCase();
        if (name === 'br') {
          runs.push(new TextRun({ text: '', break: 1 } as any));
          return runs;
        }

        const nextStyle = {
          bold: style?.bold || name === 'strong' || name === 'b',
          italics: style?.italics || name === 'em' || name === 'i',
          color: style?.color,
          size: style?.size,
          highlight: style?.highlight,
        };

        // For anchors, keep visible text; also append URL if text differs.
        if (name === 'a') {
          const href = node.attribs?.href ? String(node.attribs.href) : '';
          const linkText = $(node).text();
          runs.push(...textRunsFromChildren(node, nextStyle));
          if (href && href.trim() && href.trim() !== linkText.trim()) {
            runs.push(new TextRun({ text: ` (${href.trim()})`, color: this.brand.gray, size: 20 }));
          }
          return runs;
        }

        // Highlight span: keep text but add bold to stand out.
        if (name === 'span' && typeof node.attribs?.class === 'string' && node.attribs.class.includes('highlight-yellow')) {
          runs.push(...textRunsFromChildren(node, { ...nextStyle, bold: true, highlight: HighlightColor.YELLOW }));
          return runs;
        }

        runs.push(...textRunsFromChildren(node, nextStyle));
        return runs;
      }

      return runs;
    };

    const textRunsFromChildren = (node: any, style?: { bold?: boolean; italics?: boolean; color?: string; size?: number; highlight?: any }): TextRun[] => {
      const runs: TextRun[] = [];
      const children = Array.isArray(node.children) ? node.children : [];
      for (const child of children) {
        runs.push(...textRunsFromNode(child, style));
      }
      return runs;
    };

    const paragraphFromEl = (el: any, opts?: { heading?: any; alignment?: any; spacing?: any; color?: string; size?: number; bold?: boolean; italics?: boolean }) => {
      const runs = textRunsFromChildren(el, {
        color: opts?.color,
        size: opts?.size,
        bold: opts?.bold,
        italics: opts?.italics,
      });
      const clean = $(el).text().replace(/\s+/g, ' ').trim();
      if (!clean) return;
      pushParagraph(runs, { ...opts, spacing: opts?.spacing ?? { after: 90 } });
    };

    const tableFromEl = (tableEl: any) => {
      const rows: TableRow[] = [];
      const $table = $(tableEl);

      const countColumns = (tr: any): number => {
        const cells = $(tr).children('th,td').toArray();
        return cells.reduce((total: number, cell: any) => {
          const colspanRaw = $(cell).attr('colspan');
          const colspan = colspanRaw ? parseInt(colspanRaw, 10) : 1;
          return total + (Number.isFinite(colspan) && colspan > 0 ? colspan : 1);
        }, 0);
      };

      const pushRow = (cells: TableCell[]) => {
        rows.push(new TableRow({ children: cells }));
      };

      const allRows = [
        ...$table.find('thead tr').toArray(),
        ...$table.find('tbody tr').toArray(),
        ...$table.children('tr').toArray(),
      ];
      const maxColumns = allRows.reduce((max, tr) => Math.max(max, countColumns(tr)), 0) || 1;
      const tableWidthTwips = 10000;
      const cellWidthTwips = Math.max(900, Math.floor(tableWidthTwips / maxColumns));
      const columnWidths = Array.from({ length: maxColumns }, () => cellWidthTwips);

      const handleTr = (tr: any, isHeader: boolean) => {
        const cells: TableCell[] = [];
        const tds = $(tr).children('th,td').toArray();
        for (const td of tds) {
          const colspanRaw = $(td).attr('colspan');
          const colspan = colspanRaw ? parseInt(colspanRaw, 10) : 1;
          const span = Number.isFinite(colspan) && colspan > 1 ? colspan : 1;
          const txt = $(td).text().replace(/\s+/g, ' ').trim();
          const cellOpts: any = {
            width: { size: cellWidthTwips * span, type: WidthType.DXA },
            shading: isHeader ? { fill: this.brand.green, type: ShadingType.CLEAR, color: 'auto' } : undefined,
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'E5F3DE' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5F3DE' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'E5F3DE' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'E5F3DE' },
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: txt,
                    bold: isHeader,
                    color: isHeader ? 'FFFFFF' : this.brand.text,
                    size: 22,
                  }),
                ],
              }),
            ],
          };
          if (span > 1) {
            cellOpts.columnSpan = colspan;
          }
          cells.push(new TableCell(cellOpts));
        }
        if (cells.length) pushRow(cells);
      };

      const theadRows = $table.find('thead tr').toArray();
      for (const tr of theadRows) handleTr(tr, true);

      const tbodyRows = $table.find('tbody tr').toArray();
      if (tbodyRows.length) {
        for (const tr of tbodyRows) handleTr(tr, false);
      } else {
        // Some templates omit tbody
        const directRows = $table.children('tr').toArray();
        for (const tr of directRows) handleTr(tr, false);
      }

      if (!rows.length) return;
      blocks.push(
        new Table({
          width: { size: tableWidthTwips, type: WidthType.DXA },
          layout: TableLayoutType.FIXED,
          columnWidths,
          rows,
        })
      );
      blocks.push(new Paragraph({ spacing: { after: 120 } }));
    };

    const matrixFromEl = (wrapEl: any) => {
      const cells = $(wrapEl).find('.matrix-grid .matrix-cell').toArray();
      if (cells.length !== 9) {
        return;
      }

      const fillForCell = (cellEl: any) => {
        const cls = String($(cellEl).attr('class') || '');
        if (cls.includes('risk-critical')) return 'D61F1F';
        if (cls.includes('risk-high')) return 'F28C28';
        if (cls.includes('risk-medium')) return 'F2C94C';
        if (cls.includes('risk-low')) return '2F80ED';
        return '6B6B6B';
      };

      const rows: TableRow[] = [];
      for (let r = 0; r < 3; r++) {
        const rowCells: TableCell[] = [];
        for (let c = 0; c < 3; c++) {
          const i = r * 3 + c;
          const txt = $(cells[i]).text().replace(/\s+/g, ' ').trim();
          const fill = fillForCell(cells[i]);
          rowCells.push(
            this.docTableCell(txt, 3000, false, true, {
              align: AlignmentType.CENTER,
              fill,
              textColor: fill === 'F2C94C' ? '111111' : 'FFFFFF',
            })
          );
        }
        rows.push(new TableRow({ children: rowCells }));
      }

      blocks.push(this.docLabel('Risk Matrix', HeadingLevel.HEADING_2));
      blocks.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: 'Impact x Likelihood', color: this.brand.gray, size: 20 })],
        })
      );
      blocks.push(
        new Table({
          width: { size: 3000, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          rows,
        })
      );
      blocks.push(new Paragraph({ spacing: { after: 120 } }));
    };

    const shouldSkipEl = (el: any): boolean => {
      const cls = String($(el).attr('class') || '');
      const name = String(el.name || '').toLowerCase();
      if (name === 'div' && (cls.includes('brand-header') || cls.includes('page-footer') || cls.includes('footer-bar-wrap'))) return true;
      if (name === 'img') return true;
      return false;
    };

    const pages = $('.page').toArray();
    for (const page of pages) {
      const cls = String($(page).attr('class') || '');
      // We generate cover ourselves.
      if (cls.includes('cover-page')) continue;

      const pageText = $(page).text().replace(/\s+/g, ' ').trim().toLowerCase();
      if ($(page).find('.toc-table').length > 0 || pageText.startsWith('table of contents')) {
        pushParagraph(
          [new TextRun({ text: 'Table of Contents', bold: true, color: this.brand.greenDark, size: 40 })],
          { heading: HeadingLevel.HEADING_1, spacing: { after: 120 } }
        );
        blocks.push(
          new Paragraph({
            spacing: { before: 120, after: 120 },
            children: [new SimpleField('TOC \\o "1-3" \\h \\z \\u')],
          })
        );
        blocks.push(new Paragraph({ children: [new PageBreak()] }));
        continue;
      }

      const processElement = (el: any) => {
        if (!el) return;
        if (shouldSkipEl(el)) return;

        const tag = String(el.name || '').toLowerCase();

        if (tag === 'div') {
          const divCls = String($(el).attr('class') || '');
          if (divCls.includes('matrix-wrap')) {
            matrixFromEl(el);
            return;
          }

          // Traverse other divs (including TOC blocks).
          const children = $(el).children().toArray();
          for (const child of children) processElement(child);
          return;
        }

        if (tag === 'table') {
          tableFromEl(el);
          return;
        }

        if (tag === 'h1') {
          paragraphFromEl(el, {
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 90 },
            color: this.brand.greenDark,
            size: 38,
            bold: true,
          });
          blocks.push(
            new Paragraph({
              border: {
                bottom: { color: '8FC46B', style: BorderStyle.SINGLE, size: 4 },
              },
              spacing: { after: 120 },
            })
          );
          return;
        }

        if (tag === 'h2') {
          paragraphFromEl(el, {
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 220, after: 80 },
            color: this.brand.greenDark,
            size: 30,
            bold: true,
          });
          return;
        }

        if (tag === 'h3') {
          paragraphFromEl(el, {
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 160, after: 60 },
            color: this.brand.text,
            size: 24,
            bold: true,
          });
          return;
        }

        if (tag === 'p') {
          const cls = String($(el).attr('class') || '');
          if (cls.includes('lead-italic')) {
            paragraphFromEl(el, { italics: true, color: this.brand.gray });
          } else {
            paragraphFromEl(el);
          }
          return;
        }

        if (tag === 'ul') {
          const items = $(el).children('li').toArray();
          for (const li of items) {
            // Extract runs from the <li>, preserving b/i tags, color, size
            const runs = textRunsFromChildren(li, { color: this.brand.text, size: 22 });
            // Render using Word's bullet point with correct color/indent
            blocks.push(
              new Paragraph({
                bullet: {
                  level: 0,
                  bulletChar: '•',
                  color: this.brand.green,
                },
                spacing: { after: 70 },
                children: runs,
              })
            );
          }
          blocks.push(new Paragraph({ spacing: { after: 90 } }));
        }
      };

      const children = $(page).children().toArray();
      for (const el of children) {
        processElement(el);
      }

      blocks.push(new Paragraph({ children: [new PageBreak()] }));
    }

    // Trim trailing page break
    while (blocks.length) {
      const last = blocks[blocks.length - 1] as any;
      const isPageBreakPara = last?.options?.children?.some?.((c: any) => c?.options?.break === 1);
      if (isPageBreakPara) {
        blocks.pop();
        continue;
      }
      break;
    }

    return blocks;
  }

  private static async generatePDFBuffer(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

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

      // PDF conversion via LibreOffice can ignore paragraph-level run formatting on some template-derived
      // headings (notably around TOC/major sections). Patch those headings in a PDF-only copy so the
      // DOCX output remains unchanged.
      docxBuffer = this.patchDocxHeadingsForLibreOfficePdf(docxBuffer);
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


  private static async fetchLogoBuffer(): Promise<Buffer | null> {
    // Avoid relying on global fetch typings/runtime; use built-in https.
    const httpsMod: any = await import('https');
    const https: any = httpsMod?.default ?? httpsMod;
    const maxRedirects = 4;

    const get = async (url: string, redirectsLeft: number): Promise<Buffer> => {
      return await new Promise((resolve, reject) => {
        const req = https.request(url, { method: 'GET' }, (res: any) => {
          const status = res.statusCode || 0;
          const location = res.headers.location;

          if (status >= 300 && status < 400 && location) {
            if (redirectsLeft <= 0) {
              reject(new Error('Too many redirects'));
              return;
            }
            res.resume();
            const nextUrl = new URL(location, url).toString();
            void get(nextUrl, redirectsLeft - 1).then(resolve, reject);
            return;
          }

          if (status < 200 || status >= 300) {
            reject(new Error(`HTTP ${status}`));
            return;
          }

          const chunks: Buffer[] = [];
          res.on('data', (chunk: any) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        });
        req.on('error', reject);
        req.end();
      });
    };

    try {
      return await get(this.brand.logoUrl, maxRedirects);
    } catch {
      return null;
    }
  }

  private static buildDocHeader(logoBuffer: Buffer | null): Header {
    // Approximate the PDF brand header: logo + green pill line + green dot.
    const logo = logoBuffer
      ? new ImageRun({ type: 'png', data: logoBuffer, transformation: { width: 140, height: 28 } })
      : new TextRun({ text: 'SECURIFY', bold: true, color: this.brand.greenDark, size: 28 });

    const pill = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          height: { value: 300, rule: 'exact' },
          children: [
            new TableCell({
              width: { size: 2100, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              borders: { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
              children: [new Paragraph({ spacing: { after: 0 }, children: [logo] })],
            }),
            new TableCell({
              verticalAlign: VerticalAlign.CENTER,
              shading: { fill: this.brand.green, type: ShadingType.CLEAR, color: 'auto' },
              borders: { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
              children: [new Paragraph({ children: [new TextRun({ text: '' })] })],
            }),
            new TableCell({
              width: { size: 180, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              shading: { fill: this.brand.green, type: ShadingType.CLEAR, color: 'auto' },
              borders: { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
              children: [new Paragraph({ children: [new TextRun({ text: '' })] })],
            }),
          ],
        }),
      ],
    });

    return new Header({
      children: [
        pill,
        new Paragraph({ spacing: { after: 40 } }),
      ],
    });
  }

  private static buildDocFooter(): Footer {
    // Approximate the PDF footer: green bar + dot + "Page (n)".
    // We can't know total pages at generation time with docx; keep it dynamic.
    const bar = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          height: { value: 300, rule: 'exact' },
          children: [
            new TableCell({
              verticalAlign: VerticalAlign.CENTER,
              shading: { fill: this.brand.green, type: ShadingType.CLEAR, color: 'auto' },
              borders: { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
              children: [new Paragraph({ children: [new TextRun({ text: '' })] })],
            }),
            new TableCell({
              width: { size: 180, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              shading: { fill: this.brand.green, type: ShadingType.CLEAR, color: 'auto' },
              borders: { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
              children: [new Paragraph({ children: [new TextRun({ text: '' })] })],
            }),
          ],
        }),
      ],
    });

    return new Footer({
      children: [
        bar,
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: 40 },
          children: [
            new TextRun({ text: 'Page (', color: this.brand.text, size: 22 }),
            new SimpleField(PageNumber.CURRENT),
            new TextRun({ text: ')', color: this.brand.text, size: 22 }),
          ],
        }),
      ],
    });
  }

  private static coverPage(project: any, metadata: { generatedDate: string }, logoBuffer: Buffer | null): Array<Paragraph | Table> {
    // Cover design: top green stripe + green side bars + dark hero panel + centered logo and metadata.
    // Implemented with tables for predictable layout.
    const logo = logoBuffer
      ? new ImageRun({ type: 'png', data: logoBuffer, transformation: { width: 360, height: 72 } })
      : new TextRun({ text: 'SECURIFY', bold: true, color: this.brand.greenDark, size: 64 });

    const client = (project.client_name || 'Client Name') as string;

    // Requirement: use project name as report title.
    // Keep client name as the prominent line below the hero.
    const subtitle = String(project.name || 'Penetration Test Report');

    const hero = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { fill: '3B3B3B', type: ShadingType.CLEAR, color: 'auto' },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 16, color: 'F2F2F2' },
                bottom: { style: BorderStyle.SINGLE, size: 16, color: 'F2F2F2' },
                left: { style: BorderStyle.SINGLE, size: 16, color: 'F2F2F2' },
                right: { style: BorderStyle.SINGLE, size: 16, color: 'F2F2F2' },
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 520, after: 520 },
                  children: [
                    logoBuffer
                      ? new ImageRun({ type: 'png', data: logoBuffer, transformation: { width: 460, height: 92 } })
                      : logo,
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    const frame = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 3,
              shading: { fill: this.brand.green, type: ShadingType.CLEAR, color: 'auto' },
              borders: { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
              children: [new Paragraph('')],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 540, type: WidthType.DXA },
              shading: { fill: this.brand.green, type: ShadingType.CLEAR, color: 'auto' },
              verticalAlign: VerticalAlign.CENTER,
              borders: { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
              children: [new Paragraph('')],
            }),
            new TableCell({
              verticalAlign: VerticalAlign.CENTER,
              borders: { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
              children: [
                new Paragraph({ spacing: { before: 360 }, children: [new TextRun({ text: '', size: 1 })] }),
                hero,
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 520, after: 120 },
                  children: [new TextRun({ text: client, bold: false, color: this.brand.greenDark, size: 44 })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 80 },
                  children: [new TextRun({ text: subtitle, bold: true, color: this.brand.text, size: 28 })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 420 },
                  children: [new TextRun({ text: metadata.generatedDate, color: '8E7F2B', size: 24 })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 360 },
                  children: [new TextRun({ text: '8', bold: true, color: this.brand.green, size: 120 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 540, type: WidthType.DXA },
              shading: { fill: this.brand.green, type: ShadingType.CLEAR, color: 'auto' },
              verticalAlign: VerticalAlign.CENTER,
              borders: { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
              children: [new Paragraph('')],
            }),
          ],
        }),
      ],
    });

    return [frame];
  }

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

  private static async renderStyledDocxTemplateBuffer(templatePath: string, data: ReportData): Promise<Buffer> {
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

    replaceAllParagraphText('Client Name', data.project.client_name || 'N/A');
    replaceAllParagraphText('November 26, 2025', data.metadata.generatedDate);

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

    replaceSectionParagraphBlock('Confidentiality and Distribution Restrictions', ['Table of Contents'], sectionBody('confidentiality', normalizedTemplate.confidentiality_text || ''));
    replaceSectionParagraphBlock('Introduction', ['Approach'], sectionBody('introduction', normalizedTemplate.introduction_text || ''));

    replaceSectionParagraphBlock('Approach', ['Runtime Application Vulnerability Assessment'], sectionBody('approach', normalizedTemplate.approach_text || ''));
    replaceSectionParagraphBlock('Runtime Application Vulnerability Assessment', ['Scope'], sectionBody('runtime_assessment', ''));
    replaceSectionParagraphBlock('Scope', ['Assessment Limitation'], sectionBody('scope', normalizedTemplate.scope_text || ''));

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

    replaceSectionParagraphBlock('Assessment Limitation', ['Findings and Recommendation'], sectionBody('assessment_limitation', ''));
    replaceSectionParagraphBlock('Risk Classification', ['Measurement of Impact'], sectionBody('risk_classification', ''));
    replaceSectionParagraphBlock('Measurement of Impact', ['Measurement of Likelihood'], sectionBody('measurement_impact', ''));
    replaceSectionParagraphBlock('Measurement of Likelihood', ['Overall Risk'], sectionBody('measurement_likelihood', ''));

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

    replaceSectionParagraphBlock('Summary', ['Detailed Vulnerabilities'], sectionBody('summary', ''));
    replaceSectionParagraphBlock('Appendix A', [], sectionBody('appendix_a', normalizedTemplate.appendix_text || ''));

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

    // Insert standalone heading paragraphs before each scope table
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

    // Insert out-of-scope content after tables but before Assessment Limitation
    {
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

    const matrixRows = Array.isArray(getSection('risk_classification')?.matrix_rows) && getSection('risk_classification').matrix_rows.length
      ? getSection('risk_classification').matrix_rows
      : [
        { low: 'Medium', medium: 'High', high: 'Critical' },
        { low: 'Low', medium: 'Medium', high: 'High' },
        { low: 'Low', medium: 'Low', high: 'Medium' },
      ];
    const riskFillForValue = (value: string) => {
      const normalized = String(value || '').toLowerCase();
      if (normalized === 'critical') return { fill: 'C00000', text: 'FFFFFF' };
      if (normalized === 'high') return { fill: 'FF0000', text: 'FFFFFF' };
      if (normalized === 'medium') return { fill: 'FFC000', text: '000000' };
      return { fill: '00B050', text: 'FFFFFF' };
    };
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
        const mimeType = isJpeg ? 'image/jpeg' : 'image/png';
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
          try { sharpPkg = require('sharp'); } catch {}
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
    }));

    if (tables[5]) {
      const tbl = tables[5];
      const rows = $(tbl).find('> w\\:tr').toArray();
      if (rows.length >= 1) {
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
          if (cells[1]) {
            setParaText(cells[1], item.severity);
            row.find('w\\:tc').eq(1).find('w\\:shd').attr('w:fill', this.severityFill(item.severity));
          }
          $(tbl).append($.xml(row));
        }
      }
      applySimpleTableTheme(tbl, { preserveSecondColumnSeverity: true });

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

        // 85% / 15% split (5000 = 100%)
        $(tbl).find('> w\\:tr').each((_: number, tr: any) => {
          const tcs = $(tr).find('> w\\:tc').toArray();
          if (tcs[0]) setTcPct(tcs[0], '4250');
          if (tcs[1]) setTcPct(tcs[1], '750');
        });
      }
    }

    if (tables[3]) applySimpleTableTheme(tables[3]);
    if (tables[4]) applySimpleTableTheme(tables[4]);
    if (tables[6]) applySimpleTableTheme(tables[6], { headerFill: '4CC51F', bodyFill: 'E4F4DE' });

    const children = bodyChildren();
    const detailedIdx = children.findIndex((el: any) => paraText(el) === 'Detailed Vulnerabilities');
    const appendixIdx = children.findIndex((el: any) => paraText(el) === 'Appendix A');
    if (detailedIdx !== -1 && appendixIdx !== -1 && appendixIdx > detailedIdx) {
      const detailNodes = children.slice(detailedIdx + 1, appendixIdx);
      const firstBackIdx = detailNodes.findIndex((el: any) => paraText(el) === 'Back to summary');
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
           // Each detailed vulnerability starts on a new page, except the first one
           // (so the first finding begins immediately after the "Detailed Vulnerabilities" heading).
           if (i > 0) {
             $(children[appendixIdx]).before($.xml(makePageBreakPara()));
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
            sectionDoc(beforeNode).before(sectionDoc.xml(p));
          };

          const appendSectionSplitParagraph = (
            beforeNode: any,
            sourceNode: any,
            lead: string,
            tail: string,
            opts?: { color?: string; underline?: string }
          ) => {
            const p = cloneSectionNode(sourceNode);
            setParagraphSegments(sectionDoc, p.get(0), [
              { text: lead, bold: true, color: opts?.color || '000000' },
              { text: tail ? ` ${tail}` : '', color: opts?.color || '000000', underline: opts?.underline },
            ]);
            sectionDoc(beforeNode).before(sectionDoc.xml(p));
          };

          const paras = sectionRoot.children('w\\:p').toArray();
          const paraByText = (label: string) => paras.find((p: any) => sectionParaText(p) === label);

          // Find the title paragraph - it's the first substantial paragraph that's not a label
          // We need to find it BEFORE any label paragraphs
          let titlePara = null;
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
          const urlLabel = paraByText('Affected URL:');
          const impactLikelihoodHeading = paraByText('Impact and Likelihood:');
          const impactLabel = paraByText('Impact:');
          const likelihoodLabel = paraByText('Likelihood:');
          const stepsLabel = paraByText('Steps to Reproduce:');
          const recLabel = paraByText('Recommendations:');
          const refLabel = paraByText('References:');
          const backPara = paraByText('Back to summary');

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
          if (riskPara) {
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
            if (txt === 'Impact and Likelihood:') { currentImpact = currentLikelihood = false; currentDesc = currentUrl = currentSteps = currentRecs = currentRefs = false; continue; }
            if (txt === 'Impact:') { currentImpact = true; currentUrl = false; currentLikelihood = false; currentDesc = currentSteps = currentRecs = currentRefs = false; continue; }
            if (txt === 'Likelihood:') { currentLikelihood = true; currentUrl = false; currentImpact = false; currentDesc = currentSteps = currentRecs = currentRefs = false; continue; }
            if (txt === 'Steps to Reproduce:') { currentSteps = true; currentUrl = false; currentDesc = currentRecs = currentRefs = currentImpact = currentLikelihood = false; continue; }
            if (txt === 'Recommendations:') { currentRecs = true; currentUrl = false; currentDesc = currentSteps = currentRefs = currentImpact = currentLikelihood = false; continue; }
            if (txt === 'References:' || txt === ' References:') { currentRefs = true; currentUrl = false; currentDesc = currentSteps = currentRecs = currentImpact = currentLikelihood = false; continue; }
            if (txt === 'Back to summary') { currentUrl = false; currentDesc = currentSteps = currentRecs = currentRefs = currentImpact = currentLikelihood = false; continue; }
            if (currentDesc || currentUrl || currentSteps || currentRecs || currentRefs || currentImpact || currentLikelihood) removeParas.add(p);
          }
          Array.from(removeParas).forEach((p: any) => sectionDoc(p).remove());

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

          const normalizeSteps = (steps: any): Array<{stepNumber: number; description: string; imageKey?: string; caption?: string}> => {
            if (!steps) return [];
            if (Array.isArray(steps) && steps.length > 0 && typeof steps[0] === 'object' && steps[0] !== null && 'description' in steps[0]) {
              return steps.map((step, idx) => ({
                stepNumber: step.stepNumber || idx + 1,
                description: String(step.description || '').trim(),
                imageKey: step.imageKey || step.image, // Support both imageKey (new) and image (legacy)
                caption: step.caption
              })).filter(s => s.description);
            }
            if (Array.isArray(steps)) {
              return steps.map((step, idx) => ({
                stepNumber: idx + 1,
                description: String(step).trim(),
              })).filter(s => s.description);
            }
            return String(steps).split(/\n+/).map((step, idx) => ({
              stepNumber: idx + 1,
              description: step.replace(/^\d+[.)]\s*/, '').trim(),
            })).filter(s => s.description);
          };

          const steps = normalizeSteps(finding.steps_to_reproduce);
          console.log(`   - Inserting ${steps.length} steps`);
          for (let si = 0; si < steps.length; si++) {
            const step = steps[si];
            console.log(`     Step ${step.stepNumber}: "${step.description.substring(0, 50)}..."`);
            appendSectionSplitParagraph(recLabel || backPara || titlePara, stepTemplate, `Step ${step.stepNumber}:`, step.description, { color: '000000' });
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

          const recs = toLines(finding.recommendation);
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
          const refsArray = finding.references || finding.finding_references || [];
          const refs = toLines(refsArray);
          console.log(`   - Inserting ${refs.length} references`);
          for (let ri = 0; ri < refs.length; ri++) {
            appendSectionParagraph(backPara || titlePara, refTemplate, refs[ri], { color: '1155CC', underline: 'single' });
          }

          if (backPara) sectionDoc(backPara).remove();

          sectionRoot.children().toArray().forEach((node: any) => {
            $(children[appendixIdx]).before(sectionDoc.xml(node));
          });
        }
      }
    }

    zip.file('word/document.xml', $.xml());
    return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  }


  private static async generateDOCXBuffer(data: ReportData): Promise<Buffer> {
    const templatePath = this.resolveDocxTemplatePath(data.template);
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

    const buffer = await this.generateDOCXBuffer(data);
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
