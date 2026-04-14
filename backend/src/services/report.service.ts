import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import pool from '../config/database';
import { reportsDir } from '../config/multer';
import TemplateModel, { ReportTemplate } from '../models/template.model';

interface ReportData {
  project: any;
  findings: any[];
  template?: ReportTemplate;
}

class ReportService {
  // Replace template variables
  static replaceVariables(text: string, data: any): string {
    if (!text) return '';
    
    return text
      .replace(/\{\{project_name\}\}/g, data.project?.name || 'N/A')
      .replace(/\{\{client_name\}\}/g, data.project?.client_name || 'N/A')
      .replace(/\{\{date\}\}/g, new Date().toLocaleDateString())
      .replace(/\{\{total_findings\}\}/g, data.findings?.length || 0)
      .replace(/\{\{critical_count\}\}/g, data.findings?.filter((f: any) => f.severity === 'Critical').length || 0)
      .replace(/\{\{high_count\}\}/g, data.findings?.filter((f: any) => f.severity === 'High').length || 0)
      .replace(/\{\{medium_count\}\}/g, data.findings?.filter((f: any) => f.severity === 'Medium').length || 0)
      .replace(/\{\{low_count\}\}/g, data.findings?.filter((f: any) => f.severity === 'Low').length || 0)
      .replace(/\{\{company_name\}\}/g, data.template?.company_name || 'SecurifyAI');
  }

  // Generate DOCX report
  static async generateDOCX(reportData: ReportData, filename: string): Promise<string> {
    const { project, findings, template } = reportData;

    // Use template if provided, otherwise use default
    const reportTemplate = template || await TemplateModel.getDefault();
    const enabledSections = reportTemplate?.sections.filter(s => s.enabled) || [];

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: 'Penetration Testing Report',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // Project Info
          new Paragraph({
            text: `Project: ${project.name}`,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: `Client: ${project.client_name || 'N/A'}`,
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: `Date: ${new Date().toLocaleDateString()}`,
            spacing: { after: 400 },
          }),

          // Executive Summary
          new Paragraph({
            text: 'Executive Summary',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: `This report contains ${findings.length} security findings identified during the penetration testing engagement.`,
            spacing: { after: 400 },
          }),

          // Findings Summary
          new Paragraph({
            text: 'Findings Summary',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          ...this.generateFindingsSummary(findings),

          // Detailed Findings
          new Paragraph({
            text: 'Detailed Findings',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            pageBreakBefore: true,
          }),
          ...this.generateDetailedFindings(findings),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const filePath = path.join(reportsDir, filename);
    fs.writeFileSync(filePath, buffer);

    return filePath;
  }

  // Generate PDF report
  static async generatePDF(reportData: ReportData, filename: string): Promise<string> {
    const { project, findings } = reportData;
    const filePath = path.join(reportsDir, filename);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Title
      doc.fontSize(24).text('Penetration Testing Report', { align: 'center' });
      doc.moveDown(2);

      // Project Info
      doc.fontSize(16).text(`Project: ${project.name}`);
      doc.fontSize(12).text(`Client: ${project.client_name || 'N/A'}`);
      doc.text(`Date: ${new Date().toLocaleDateString()}`);
      doc.moveDown(2);

      // Executive Summary
      doc.fontSize(16).text('Executive Summary');
      doc.fontSize(12).text(
        `This report contains ${findings.length} security findings identified during the penetration testing engagement.`
      );
      doc.moveDown(2);

      // Findings Summary
      doc.fontSize(16).text('Findings Summary');
      doc.moveDown();

      const severityCounts = this.countBySeverity(findings);
      doc.fontSize(12);
      doc.text(`Critical: ${severityCounts.Critical || 0}`);
      doc.text(`High: ${severityCounts.High || 0}`);
      doc.text(`Medium: ${severityCounts.Medium || 0}`);
      doc.text(`Low: ${severityCounts.Low || 0}`);
      doc.text(`Informational: ${severityCounts.Informational || 0}`);
      doc.moveDown(2);

      // Detailed Findings
      doc.addPage();
      doc.fontSize(16).text('Detailed Findings');
      doc.moveDown();

      findings.forEach((finding, index) => {
        if (index > 0) doc.addPage();

        doc.fontSize(14).text(`${index + 1}. ${finding.title}`);
        doc.moveDown();

        doc.fontSize(12).text(`Severity: ${finding.severity}`, { continued: false });
        doc.text(`Status: ${finding.status}`);
        doc.moveDown();

        if (finding.description) {
          doc.fontSize(12).text('Description:', { underline: true });
          doc.fontSize(10).text(finding.description);
          doc.moveDown();
        }

        if (finding.affected_target) {
          doc.fontSize(12).text('Affected Target:', { underline: true });
          doc.fontSize(10).text(finding.affected_target);
          doc.moveDown();
        }

        if (finding.impact) {
          doc.fontSize(12).text('Impact:', { underline: true });
          doc.fontSize(10).text(finding.impact);
          doc.moveDown();
        }

        if (finding.remediation) {
          doc.fontSize(12).text('Remediation:', { underline: true });
          doc.fontSize(10).text(finding.remediation);
          doc.moveDown();
        }
      });

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  // Helper: Generate findings summary for DOCX
  private static generateFindingsSummary(findings: any[]): Paragraph[] {
    const severityCounts = this.countBySeverity(findings);

    return [
      new Paragraph({
        text: `Critical: ${severityCounts.Critical || 0}`,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: `High: ${severityCounts.High || 0}`,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: `Medium: ${severityCounts.Medium || 0}`,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: `Low: ${severityCounts.Low || 0}`,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: `Informational: ${severityCounts.Informational || 0}`,
        spacing: { after: 400 },
      }),
    ];
  }

  // Helper: Generate detailed findings for DOCX
  private static generateDetailedFindings(findings: any[]): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    findings.forEach((finding, index) => {
      // Finding title
      paragraphs.push(
        new Paragraph({
          text: `${index + 1}. ${finding.title}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
          pageBreakBefore: index > 0,
        })
      );

      // Severity and Status
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Severity: ', bold: true }),
            new TextRun(finding.severity),
            new TextRun({ text: ' | Status: ', bold: true }),
            new TextRun(finding.status),
          ],
          spacing: { after: 200 },
        })
      );

      // Description
      if (finding.description) {
        paragraphs.push(
          new Paragraph({
            text: 'Description',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            text: finding.description,
            spacing: { after: 200 },
          })
        );
      }

      // Affected Target
      if (finding.affected_target) {
        paragraphs.push(
          new Paragraph({
            text: 'Affected Target',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            text: finding.affected_target,
            spacing: { after: 200 },
          })
        );
      }

      // Impact
      if (finding.impact) {
        paragraphs.push(
          new Paragraph({
            text: 'Impact',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            text: finding.impact,
            spacing: { after: 200 },
          })
        );
      }

      // Remediation
      if (finding.remediation) {
        paragraphs.push(
          new Paragraph({
            text: 'Remediation',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            text: finding.remediation,
            spacing: { after: 200 },
          })
        );
      }
    });

    return paragraphs;
  }

  // Helper: Count findings by severity
  private static countBySeverity(findings: any[]): Record<string, number> {
    return findings.reduce((acc, finding) => {
      acc[finding.severity] = (acc[finding.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  // Save report metadata to database
  static async saveReportMetadata(data: {
    project_id: number;
    report_name: string;
    file_path: string;
    file_type: string;
    generated_by: number;
  }): Promise<any> {
    const result = await pool.query(
      `INSERT INTO generated_reports (project_id, report_name, file_path, file_type, generated_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.project_id, data.report_name, data.file_path, data.file_type, data.generated_by]
    );
    return result.rows[0];
  }

  // Get reports for a project
  static async getProjectReports(projectId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT gr.*, u.name as generated_by_name
       FROM generated_reports gr
       LEFT JOIN users u ON gr.generated_by = u.id
       WHERE gr.project_id = $1
       ORDER BY gr.created_at DESC`,
      [projectId]
    );
    return result.rows;
  }
}

export default ReportService;
