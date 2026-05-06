import {
  AlignmentType,
  HighlightColor,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  PageNumber,
  Packer,
  PageBreak,
  Paragraph,
  SimpleField,
  SectionType,
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
  private static defaultTemplateFile = 'professional-report-template.html';
  private static execFileAsync = promisify(execFile);

  private static brand = {
    green: '40D31D',
    greenDark: '39B829',
    text: '121212',
    gray: '6B6B6B',
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

  // Load HTML template (selected template -> file; fallback -> default)
  private static loadTemplate(template: ReportTemplate): string {
    const normalized = this.normalizeTemplateData(template);

    const templateFileRaw = (normalized as any)?.template_data?.template_file;
    const templateFile = typeof templateFileRaw === 'string' && templateFileRaw.trim()
      ? path.basename(templateFileRaw.trim())
      : this.defaultTemplateFile;

    const selectedPath = path.join(this.templatesDir, templateFile);
    if (fs.existsSync(selectedPath)) {
      return fs.readFileSync(selectedPath, 'utf-8');
    }

    const defaultPath = path.join(this.templatesDir, this.defaultTemplateFile);
    if (fs.existsSync(defaultPath)) {
      return fs.readFileSync(defaultPath, 'utf-8');
    }

    // Last-resort fallback
    const fallbackPath = path.join(this.templatesDir, 'comprehensive-report-template.html');
    return fs.readFileSync(fallbackPath, 'utf-8');
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
    let html = this.loadTemplate(data.template);

    html = html
      .replace(/{{CLIENT_NAME}}/g, project.client_name || 'N/A')
      .replace(/{{PROJECT_NAME}}/g, project.name)
      .replace(/{{DATE}}/g, metadata.generatedDate);

    const findingsMarkup = ReportGeneratorService.generateHTML(project, findings) as unknown;
    const findingsHTML = typeof findingsMarkup === 'string'
      ? findingsMarkup
      : String((findingsMarkup as { FINDINGS_SECTION?: string })?.FINDINGS_SECTION || '');

    html = html.replace('{{FINDINGS_SECTION}}', findingsHTML);

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
            const clean = $(li).text().replace(/\s+/g, ' ').trim();
            if (!clean) continue;
            blocks.push(
              new Paragraph({
                bullet: { level: 0 },
                spacing: { after: 70 },
                children: [new TextRun({ text: clean, color: this.brand.text, size: 22 })],
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

      const docxBuffer = await this.generateDOCXBuffer(data);
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

    let buffer: Buffer;
    try {
      buffer = await this.generatePDFFromDOCXBuffer(reportData);
    } catch (error) {
      console.warn('⚠️ Falling back to HTML PDF generation:', error);
      const html = this.renderReportHTML(reportData);
      buffer = await this.generatePDFBuffer(html);
    }
    return {
      buffer,
      contentType: 'application/pdf',
      fileName: `${safeProjectName}_preview.pdf`,
    };
  }

  // Generate PDF Report using Puppeteer
  private static async generatePDF(data: ReportData): Promise<string> {
    const { project } = data;

    // Generate file
    const fileName = `${project.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
    const filePath = path.join(this.reportsDir, fileName);

    console.log('📄 Generating professional PDF report at:', filePath);

    try {
      let buffer: Buffer;
      try {
        buffer = await this.generatePDFFromDOCXBuffer(data);
      } catch (error) {
        console.warn('⚠️ Falling back to HTML PDF generation:', error);
        const html = this.renderReportHTML(data);
        buffer = await this.generatePDFBuffer(html);
      }
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
    const subtitle = 'Web Application & API Penetration Test Report';

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
                  children: [new TextRun({ text: client, bold: true, color: this.brand.greenDark, size: 44 })],
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
      steps_to_reproduce: asLines(f.steps_to_reproduce),
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
    };
  }

  private static severityFill(severity: string): string {
    const s = String(severity || '').toLowerCase();
    if (s === 'critical') return 'C00000';
    if (s === 'high') return 'FF0000';
    if (s === 'medium') return 'F4B183';
    if (s === 'low') return '70AD47';
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
    const documentXml = zip.file('word/document.xml')?.asText();
    if (!documentXml) {
      throw new ApiError(500, 'DOCX template is missing word/document.xml');
    }

    const $ = cheerio.load(documentXml, { xmlMode: true, decodeEntities: false });

    const body = $('w\\:body').first();
    const bodyChildren = () => body.children().toArray().filter((el: any) => ['w:p', 'w:tbl'].includes(el.tagName));
    const paraText = (el: any): string => $(el).find('w\\:t').toArray().map((n: any) => $(n).text()).join('').trim();
    const escapeXmlText = (text: string): string => String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const setParaText = (el: any, text: string) => {
      const runs = $(el).find('w\\:t').toArray();
      if (!runs.length) return;
      $(runs[0]).replaceWith(`<w:t xml:space="preserve">${escapeXmlText(text)}</w:t>`);
      for (let i = 1; i < runs.length; i++) $(runs[i]).text('');
    };
    const setParagraphSegments = (
      scope: any,
      paragraphEl: any,
      segments: Array<{ text: string; bold?: boolean; color?: string; underline?: string }>,
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
          if (segment.color) {
            rPrParts.push(`<w:color w:val="${segment.color}"/>`);
          }
          if (segment.underline) {
            rPrParts.push(`<w:u w:val="${segment.underline}"/>`);
          }
          const rPrXml = rPrParts.length ? `<w:rPr>${rPrParts.join('')}</w:rPr>` : '';
          return `<w:r>${rPrXml}<w:t xml:space="preserve">${escapeXmlText(segment.text)}</w:t></w:r>`;
        })
        .join('');

      p.append(segmentXml);
    };
    const cloneNode = (el: any) => cheerio.load($.xml(el), { xmlMode: true, decodeEntities: false }).root().children().first();
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

    body.find('w\\:p').each((_: number, p: any) => {
      const text = paraText(p);
      if (!text) return;
      if (text.includes('Client Name')) {
        setParaText(p, text.replace(/Client Name/g, data.project.client_name || 'N/A'));
      }
      if (text.includes('The assessment was conducted between Start Date and End Date.')) {
        const custom = (data.template.scope_text || text) as string;
        setParaText(p, custom.replace(/Client Name/g, data.project.client_name || 'N/A'));
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
      if (txt === 'Assessment Limitation') {
        ensurePageBreakBefore(p);
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
        body: 'The conclusions and recommendations in this report represent the opinions of Securify. Determinations of appropriate corrective action(s) are the responsibility of the entity receiving the report. This report and any other materials furnished by Securify in connection with this engagement are confidential and may not be duplicated, modified, or otherwise reproduced and distributed without the express prior written consent of Securify or Client Name.',
      },
      introduction: {
        body: 'As part of an ongoing security program, {{CLIENT_NAME}} identified the need to conduct an application security assessment of its Web application & APIs.\n\nThis report presents the agreed scope, methodology, risk measurement model, summarized findings, and detailed technical observations for the selected assessment window.',
        fields: {
          list_title: 'The following lists the objectives of this assessment:',
          closing_title: 'This report includes the following parameters and results of the assessment:',
        },
        items: [
          'Determine the overall security posture of the application',
          'Provide a list of key findings and recommendations for remediation',
          'Document the assessment scope, risk evaluation, and final outcomes',
          'Support remediation planning with actionable technical detail',
        ],
      },
      approach: {
        body: 'Securify performed a Runtime Application Vulnerability Assessment of the client environment using a combination of manual testing, guided analysis, and targeted verification of identified attack paths.\n\nTesting focused on authentication, authorization, business logic, session management, input handling, information disclosure, and transport-layer protections.\n\nWhere appropriate, the assessment also included abuse-case validation, access-control bypass attempts, forced browsing, parameter tampering, and endpoint enumeration.',
      },
      runtime_assessment: {
        body: 'The runtime assessment focused on security behavior observable in the live application and API flows, including authentication, authorization, input handling, business logic, sensitive data exposure, and common attack-surface weaknesses.\n\nThe engagement emphasized practical exploitability and realistic attacker behavior rather than purely theoretical weaknesses.',
        items: [
          'Information Gathering - The application was reviewed as an anonymous, authenticated, and privileged user to understand differences in access and behavior.',
          'Authentication Testing - Authentication mechanisms were evaluated to determine the strength of login controls, password policies, and account recovery processes.',
          'Authorization Testing - Tests were conducted to identify weaknesses in access control, including attempts to access other users\' data or privileged functionality.',
          'Session Management - Session handling was assessed to ensure secure creation, storage, and invalidation of session tokens.',
          'Input Validation Attacks - User-controlled input fields were tested with malformed and malicious data to identify injection flaws and logic bypasses.',
          'Business Logic Testing - The application workflows were reviewed to identify opportunities to misuse or bypass intended processes.',
        ],
      },
      assessment_limitation: {
        body: 'This assessment was performed within the agreed timebox and only against systems explicitly included in scope. Absence of identified vulnerabilities should not be interpreted as a guarantee that no issues remain. Security posture can change over time as the application, infrastructure, integrations, and threat landscape evolve.',
      },
      findings_recommendation: {
        body: 'The sections below summarize the observed risks and provide the measurement criteria used to classify findings across the engagement. Each finding is evaluated using the same impact and likelihood model so remediation can be prioritized consistently.',
      },
      risk_classification: {
        body: 'Risk is determined by evaluating the combined effect of impact and likelihood for each issue identified during testing. The matrix below is used as the standard model for determining overall severity.',
        fields: {
          matrix_title: 'Risk Matrix',
          matrix_subtitle: 'Impact x Likelihood',
        },
      },
      overall_risk: {
        body: 'The following graph illustrates how Impact x Likelihood scores translate to overall Low, Medium, and High-risk ratings:',
        items: [
          'Low Impact + Low Likelihood = Low Risk',
          'High Impact + High Likelihood = Critical Risk',
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
      .replace(/\{\{PROJECT_NAME\}\}/g, String(data.project.name || 'N/A'))
      .replace(/\{\{DATE\}\}/g, String(data.metadata.generatedDate || ''));
    const sectionTitle = (key: string, fallback: string) => {
      const raw = getSection(key)?.title;
      return typeof raw === 'string' && raw.trim() ? resolvePlaceholders(raw.trim()) : fallback;
    };
    const sectionBody = (key: string, fallback = '') => {
      const section = getSection(key);
      const parts: string[] = [];
      const body = typeof section?.body === 'string' && section.body.trim() ? section.body.trim() : fallback;
      if (body) parts.push(body);

      if (typeof section?.fields?.list_title === 'string' && section.fields.list_title.trim()) {
        parts.push(section.fields.list_title.trim());
      }

      if (Array.isArray(section?.items) && section.items.length) {
        parts.push(...section.items.map((item: any) => `- ${String(item || '').trim()}`).filter((item: string) => item !== '-'));
      }

      if (typeof section?.fields?.closing_title === 'string' && section.fields.closing_title.trim()) {
        parts.push(section.fields.closing_title.trim());
      }

      return resolvePlaceholders(parts.filter(Boolean).join('\n\n'));
    };
    const splitBodyParagraphs = (text: string): string[] => String(text || '')
      .split(/\n{2,}/)
      .map((part) => part.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    const replaceSectionParagraphBlock = (headingText: string, stopHeadings: string[], replacementText: string) => {
      const parts = splitBodyParagraphs(replacementText);
      if (!parts.length) return;

      const children = bodyChildren();
      const startIdx = children.findIndex((el: any) => paraText(el) === headingText);
      if (startIdx === -1) return;

      let endIdx = children.findIndex((el: any, idx: number) => idx > startIdx && stopHeadings.includes(paraText(el)));
      if (endIdx === -1) endIdx = children.length;

      const range = children.slice(startIdx + 1, endIdx);
      const paragraphsInRange = range.filter((el: any) => el.tagName === 'w:p');
      const templateParagraph = paragraphsInRange.find((p: any) => paraText(p)) || paragraphsInRange[0];
      if (!templateParagraph) return;

      const insertBeforeNode = range.find((el: any) => el.tagName !== 'w:p') || children[endIdx];
      paragraphsInRange.forEach((p: any) => $(p).remove());

      const insertNode = insertBeforeNode || null;
      parts.forEach((part) => {
        const paragraph = cloneNode(templateParagraph);
        const isListLike = part.startsWith('- ');
        const finalText = isListLike ? part.replace(/^-\s*/, '') : part;
        if (isListLike) {
          const emDashIndex = finalText.indexOf(' — ');
          const hyphenIndex = finalText.indexOf(' - ');
          const colonIndex = finalText.indexOf(': ');
          const splitIndex = emDashIndex !== -1 ? emDashIndex : hyphenIndex !== -1 ? hyphenIndex : colonIndex;
          const separator = emDashIndex !== -1 ? ' — ' : hyphenIndex !== -1 ? ' - ' : colonIndex !== -1 ? ': ' : '';

          if (splitIndex !== -1 && separator) {
            const lead = finalText.slice(0, splitIndex + (separator === ': ' ? 1 : 0));
            const tail = finalText.slice(splitIndex + separator.length);
            setParagraphSegments($, paragraph.get(0), [
              { text: '• ', color: '4CC51F' },
              { text: lead, bold: true, color: '000000' },
              { text: separator === ': ' ? ' ' : separator, color: '000000' },
              { text: tail, color: '000000' },
            ]);
          } else {
            setParagraphSegments($, paragraph.get(0), [
              { text: '• ', color: '4CC51F' },
              { text: finalText, color: '000000' },
            ]);
          }
        } else {
          setParaText(paragraph.get(0), finalText);
        }
        if (insertNode) {
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
    replaceSectionParagraphBlock('Assessment Limitation', ['Findings and Recommendation'], sectionBody('assessment_limitation', ''));
    replaceSectionParagraphBlock('Risk Classification', ['Measurement of Impact'], sectionBody('risk_classification', ''));
    replaceSectionParagraphBlock('Measurement of Impact', ['Measurement of Likelihood'], sectionBody('measurement_impact', ''));
    replaceSectionParagraphBlock('Measurement of Likelihood', ['Overall Risk'], sectionBody('measurement_likelihood', ''));
    replaceSectionParagraphBlock('Overall Risk', ['Zero-risk Issues'], sectionBody('overall_risk', ''));
    replaceSectionParagraphBlock('Zero-risk Issues', ['Vulnerabilities'], sectionBody('zero_risk_issues', ''));
    replaceSectionParagraphBlock('Summary', ['Detailed Vulnerabilities'], sectionBody('summary', ''));
    replaceSectionParagraphBlock('Appendix A', [], sectionBody('appendix_a', normalizedTemplate.appendix_text || ''));

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

    const applications = Array.isArray(getSection('scope')?.application_rows) && getSection('scope').application_rows.length
      ? getSection('scope').application_rows
      : Array.isArray(normalizedTemplate.scope_applications) && normalizedTemplate.scope_applications.length
        ? normalizedTemplate.scope_applications
      : [
          { name: 'Application Name 1', url: 'http://test.com' },
          { name: 'Application Name 2', url: 'http://admin.test.com' },
        ];
    const userRoles = Array.isArray(getSection('scope')?.user_role_rows) && getSection('scope').user_role_rows.length
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
      setTableHeader(tables[1], ['Role', 'Description']);
      setTableRows(tables[1], userRoles.map((r: any) => [String(r.role || ''), String(r.description || r.username || '')]));
    }
    if (tables[2]) {
      setTableHeader(tables[2], ['Tool Name', 'Description']);
      setTableRows(tables[2], tools.map((r: any) => [String(r.name || ''), String(r.description || '')]));
    }
    if (tables[0]) applySimpleTableTheme(tables[0]);
    if (tables[1]) applySimpleTableTheme(tables[1]);
    if (tables[2]) applySimpleTableTheme(tables[2]);

    const matrixRows = Array.isArray(getSection('risk_classification')?.matrix_rows) && getSection('risk_classification').matrix_rows.length
      ? getSection('risk_classification').matrix_rows
      : [
          { low: 'Medium', medium: 'High', high: 'Critical' },
          { low: 'Low', medium: 'Medium', high: 'High' },
          { low: 'Low', medium: 'Low', high: 'Medium' },
        ];
    const riskFillForValue = (value: string) => {
      const normalized = String(value || '').toLowerCase();
      if (normalized === 'critical') return { fill: 'D61F1F', text: 'FFFFFF' };
      if (normalized === 'high') return { fill: 'F28C28', text: 'FFFFFF' };
      if (normalized === 'medium') return { fill: 'F2C94C', text: '111111' };
      return { fill: '2F80ED', text: 'FFFFFF' };
    };
    if (tables[0]) {
      const childrenForMatrix = bodyChildren();
      const measurementImpactHeading = childrenForMatrix.find((el: any) => paraText(el) === sectionTitle('zero_risk_issues', 'Zero-risk Issues'));
      if (measurementImpactHeading) {
        const matrixTable = cloneNode(tables[0]);
        const existingRows = matrixTable.find('> w\\:tr').toArray();
        const rowTemplate = existingRows[1] || existingRows[0];
        existingRows.forEach((row: any) => matrixTable.find(`> w\\:tr`).eq(0).remove());

        matrixRows.forEach((matrixRow: any) => {
          const row = cloneNode(rowTemplate);
          while (row.find('w\\:tc').toArray().length < 3) {
            const currentCells = row.find('w\\:tc').toArray();
            const cloneCell = cloneNode(currentCells[currentCells.length - 1]);
            row.append($.xml(cloneCell));
          }
          const cells = row.find('w\\:tc').toArray();
          const values = [matrixRow.low, matrixRow.medium, matrixRow.high].map((value: any) => String(value || ''));
          values.forEach((value, idx) => {
            if (!cells[idx]) return;
            setParaText(cells[idx], value);
            const fill = riskFillForValue(value);
            ensureShading(cells[idx], fill.fill);
            ensureTextColor(cells[idx], fill.text);
          });
          matrixTable.append($.xml(row));
        });

        $(measurementImpactHeading).before($.xml(matrixTable));
      }
    }

    console.log(`📊 Processing ${data.findings.length} findings for DOCX report`);
    const findingsSummary = data.findings.map((f: any) => ({
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
          return true;
        });

        const cleanPrototype = stripFigureArtifacts(prototype);
        const findingBlocks = data.findings.length ? data.findings : [];
        console.log(`🔍 Replacing ${detailNodes.length} hardcoded finding nodes with ${findingBlocks.length} real findings`);

        const toLines = (v: any): string[] => {
          if (!v) return [];
          if (Array.isArray(v)) return v.filter(Boolean).map((x: any) => String(x));
          return String(v).split(/\n+/).map((x) => x.trim()).filter(Boolean);
        };

        for (let i = 0; i < findingBlocks.length; i++) {
          const finding = findingBlocks[i] as any;
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
            console.log(`   - Replaced "${oldTitle}" with "${sectionParaText(titlePara)}"`);
          }
          if (riskPara) {
            sectionSetParaText(riskPara, `Risk: ${String(finding.severity || '')}`);
            clearRunFormatting(sectionDoc, riskPara, { bold: true, color: riskTextColor });
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
          if (urlLabel && affected) appendSectionParagraph(impactLikelihoodHeading || impactLabel || backPara || titlePara, neutralParagraphTemplate, affected, { color: '000000' });

          // Extract impact - handle both object and string formats
          let impactText = '';
          if (finding.impact) {
            if (typeof finding.impact === 'object' && finding.impact.detail) {
              impactText = String(finding.impact.detail);
            } else if (typeof finding.impact === 'string') {
              impactText = finding.impact;
            }
          }
          console.log(`   - Impact text extracted: "${impactText}"`);
          if (impactLabel && impactText) {
            appendSectionParagraph(likelihoodLabel || backPara || titlePara, neutralParagraphTemplate, impactText, { color: '000000' });
          }
          
          // Extract likelihood - handle both object and string formats
          let likelihoodText = '';
          if (finding.likelihood) {
            if (typeof finding.likelihood === 'object' && finding.likelihood.detail) {
              likelihoodText = String(finding.likelihood.detail);
            } else if (typeof finding.likelihood === 'string') {
              likelihoodText = finding.likelihood;
            }
          }
          console.log(`   - Likelihood text extracted: "${likelihoodText}"`);
          if (likelihoodLabel && likelihoodText) {
            appendSectionParagraph(stepsLabel || backPara || titlePara, neutralParagraphTemplate, likelihoodText, { color: '000000' });
          }

          const stepTemplate = neutralParagraphTemplate;
          const recTemplate = paras.find((p: any) => {
            const txt = sectionParaText(p);
            return txt.length > 15 && !txt.endsWith(':') && !txt.startsWith('Step') && !txt.startsWith('Risk:') && txt !== sectionParaText(titlePara);
          }) || neutralParagraphTemplate;
          const refTemplate = paras.find((p: any) => {
            const txt = sectionParaText(p);
            return txt.includes('http') || txt.includes('www');
          }) || bodyTextTemplate;

          const steps = toLines(finding.steps_to_reproduce);
          console.log(`   - Inserting ${steps.length} steps`);
          for (let si = 0; si < steps.length; si++) {
            console.log(`     Step ${si + 1}: "${steps[si].substring(0, 50)}..."`);
            appendSectionSplitParagraph(recLabel || backPara || titlePara, stepTemplate, `Step ${si + 1}:`, steps[si], { color: '000000' });
          }

          const recs = toLines(finding.recommendation);
          console.log(`   - Inserting ${recs.length} recommendations`);
          for (let ri = 0; ri < recs.length; ri++) {
            const cleaned = stripMarkdownEmphasis(recs[ri]);
            const colonIndex = cleaned.indexOf(':');
            if (colonIndex !== -1) {
              appendSectionSplitParagraph(
                refLabel || backPara || titlePara,
                recTemplate,
                cleaned.slice(0, colonIndex + 1),
                cleaned.slice(colonIndex + 1).trim(),
                { color: '000000' }
              );
            } else {
              appendSectionParagraph(refLabel || backPara || titlePara, recTemplate, cleaned, { color: '000000', bold: true });
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
