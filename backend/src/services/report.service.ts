import { Document, Packer, Paragraph, HeadingLevel, AlignmentType } from 'docx';
import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { format as formatDate } from 'date-fns';
import ReportModel, { ReportTemplate } from '../models/report.model';
import ProjectModel from '../models/project.model';
import FindingModel from '../models/finding.model';
import ApiError from '../utils/ApiError';

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

class ReportService {
  private static reportsDir = path.join(__dirname, '../../reports');
  private static templatePath = path.join(__dirname, '../templates/report-template.html');

  // Ensure reports directory exists
  static async ensureReportsDir() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  // Load HTML template
  private static loadTemplate(): string {
    return fs.readFileSync(this.templatePath, 'utf-8');
  }

  // Generate HTML content from data
  private static generateHTMLContent(data: ReportData): string {
    const { findings, metadata } = data;

    // COVER PAGE - Exact match to template
    const coverPage = `
    <div class="page cover-page">
        <div class="cover-frame">
            <div class="cover-dark-section">
                <div class="circuit-lines">
                    <div class="circuit-line"></div>
                    <div class="circuit-line"></div>
                    <div class="circuit-line"></div>
                </div>
                <div class="cover-logo-container">
                    <img src="https://securifyai.co/wp-content/uploads/2024/09/securify-logo-light.png" alt="SECURIFY" class="cover-logo-img" />
                </div>
            </div>
            <div class="cover-white-section">
                <div class="cover-title">SecurifyAI</div>
                <div class="cover-subtitle">Developer Plan for Report Template</div>
                <div class="cover-date">${metadata.generatedDate}</div>
                <svg class="cover-key" viewBox="0 0 100 100">
                    <circle cx="25" cy="25" r="18"/>
                    <circle cx="25" cy="25" r="8" fill="white"/>
                    <rect x="35" y="20" width="50" height="10" rx="2"/>
                    <rect x="50" y="35" width="8" height="10"/>
                    <rect x="65" y="35" width="8" height="10"/>
                </svg>
            </div>
        </div>
    </div>`;

    const pages: string[] = [];

    // FINDINGS PAGES
    findings.forEach((finding, index) => {
      const pageNum = index + 2;

      pages.push(`
    <div class="page">
        <div class="header">
            <img src="https://securifyai.co/wp-content/uploads/2024/09/securify-logo-light.png" alt="Securify" />
            <div class="header-circle"></div>
        </div>
        <div class="content">
            <h2>${index + 1}. ${this.escapeHtml(finding.title)}</h2>
            <span class="severity severity-${finding.severity.toLowerCase()}">${finding.severity}</span>
            
            ${finding.description ? `
            <div class="section">
                <h3>Description</h3>
                <p>${this.escapeHtml(finding.description)}</p>
            </div>
            ` : ''}
            
            ${finding.affected_target ? `
            <div class="section">
                <h3>Affected Asset</h3>
                <p><code>${this.escapeHtml(finding.affected_target)}</code></p>
            </div>
            ` : ''}
            
            ${finding.impact ? `
            <div class="section">
                <h3>Impact</h3>
                <p>${this.escapeHtml(finding.impact)}</p>
            </div>
            ` : ''}
            
            ${finding.likelihood ? `
            <div class="section">
                <h3>Likelihood</h3>
                <p>${this.escapeHtml(finding.likelihood)}</p>
            </div>
            ` : ''}
            
            ${finding.steps_to_reproduce && finding.steps_to_reproduce.length > 0 ? `
            <div class="section">
                <h3>Steps to Reproduce</h3>
                <ol>
                    ${finding.steps_to_reproduce.map((step: string) =>
        `<li>${this.escapeHtml(step)}</li>`
      ).join('')}
                </ol>
            </div>
            ` : ''}
            
            ${finding.proof_of_concept ? `
            <div class="section">
                <h3>Proof of Concept</h3>
                <pre>${this.escapeHtml(finding.proof_of_concept)}</pre>
            </div>
            ` : ''}
            
            ${finding.remediation ? `
            <div class="section">
                <h3>Remediation</h3>
                <p>${this.escapeHtml(finding.remediation)}</p>
            </div>
            ` : ''}
        </div>
        <div class="footer">
            <div class="footer-dot"></div>
            <div class="footer-page">${pageNum}</div>
        </div>
    </div>`);
    });

    // FINAL PAGE
    const finalPageNum = findings.length + 2;
    pages.push(`
    <div class="page">
        <div class="header">
            <img src="https://securifyai.co/wp-content/uploads/2024/09/securify-logo-light.png" alt="Securify" />
            <div class="header-circle"></div>
        </div>
        <div class="content">
            <h3>References</h3>
            <ul>
                <li>OWASP Testing Guide</li>
                <li>NIST SP 800-115</li>
                <li>CWE/SANS Top 25</li>
            </ul>
            
            <div style="margin-top: 100px; text-align: center; color: #666;">
                <p style="font-size: 11pt; font-weight: 600;">© ${new Date().getFullYear()} SecurifyAI</p>
                <p style="font-size: 9pt; margin-top: 5px;">Report Version ${metadata.reportVersion}</p>
                <p style="margin-top: 10px; font-size: 9pt; color: #999;">
                    Generated by SecurifyAI's AI-Assisted Penetration Testing Platform
                </p>
            </div>
        </div>
        <div class="footer">
            <div class="footer-dot"></div>
            <div class="footer-page">${finalPageNum}</div>
        </div>
    </div>`);

    return coverPage + pages.join('');
  }

  // Escape HTML special characters
  private static escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  // Generate Report
  static async generateReport(
    projectId: number,
    templateId: number | null,
    userId: number,
    format: 'docx' | 'pdf' = 'docx'
  ): Promise<{ reportId: number; filePath: string }> {
    await this.ensureReportsDir();

    // Get project data
    const project = await ProjectModel.findById(projectId);
    if (!project) {
      throw new ApiError(404, 'Project not found');
    }

    // Get findings
    const findings = await FindingModel.findAll({ project_id: projectId, status: 'approved' });

    // Get template
    let template: ReportTemplate | null;
    if (templateId) {
      template = await ReportModel.getTemplateById(templateId);
    } else {
      template = await ReportModel.getDefaultTemplate();
    }

    if (!template) {
      throw new ApiError(404, 'Report template not found');
    }

    // Prepare report data
    const reportData: ReportData = {
      project,
      findings,
      template,
      metadata: {
        generatedBy: 'SecurifyAI',
        generatedDate: formatDate(new Date(), 'MMMM dd, yyyy'),
        reportVersion: '1.0',
      },
    };

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

  // Generate DOCX Report
  private static async generateDOCX(data: ReportData): Promise<string> {
    const { project, findings, metadata } = data;

    // Create document sections
    const sections: Paragraph[] = [];

    // Title Page
    sections.push(
      new Paragraph({
        text: 'PENETRATION TESTING REPORT',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: project.name,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: `Client: ${project.client_name || 'N/A'}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: `Report Date: ${metadata.generatedDate}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: `Generated by: ${metadata.generatedBy}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    // Executive Summary
    sections.push(
      new Paragraph({
        text: 'Executive Summary',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        text: `This report presents the findings from the penetration testing assessment conducted on ${project.name}. `,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: `Total Findings: ${findings.length}`,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: `Critical: ${findings.filter(f => f.severity === 'Critical').length}`,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: `High: ${findings.filter(f => f.severity === 'High').length}`,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: `Medium: ${findings.filter(f => f.severity === 'Medium').length}`,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: `Low: ${findings.filter(f => f.severity === 'Low').length}`,
        spacing: { after: 200 },
      })
    );

    // Methodology
    sections.push(
      new Paragraph({
        text: 'Methodology',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        text: 'The penetration testing was conducted using industry-standard methodologies including:',
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: '• OWASP Testing Guide',
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: '• NIST SP 800-115',
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: '• Manual testing and automated scanning',
        spacing: { after: 200 },
      })
    );

    // Findings
    sections.push(
      new Paragraph({
        text: 'Detailed Findings',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    // Add each finding
    findings.forEach((finding, index) => {
      sections.push(
        new Paragraph({
          text: `${index + 1}. ${finding.title}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
        }),
        new Paragraph({
          text: `Severity: ${finding.severity}`,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: `Affected Target: ${finding.affected_target || 'N/A'}`,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: 'Description:',
          spacing: { before: 100, after: 50 },
        }),
        new Paragraph({
          text: finding.description || 'No description provided',
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: 'Likelihood:',
          spacing: { before: 100, after: 50 },
        }),
        new Paragraph({
          text: finding.likelihood || 'Not assessed',
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: 'Impact:',
          spacing: { before: 100, after: 50 },
        }),
        new Paragraph({
          text: finding.impact || 'Not assessed',
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: 'Remediation:',
          spacing: { before: 100, after: 50 },
        }),
        new Paragraph({
          text: finding.remediation || 'No remediation provided',
          spacing: { after: 200 },
        })
      );

      // Add steps to reproduce if available
      if (finding.steps_to_reproduce && finding.steps_to_reproduce.length > 0) {
        sections.push(
          new Paragraph({
            text: 'Steps to Reproduce:',
            spacing: { before: 100, after: 50 },
          })
        );
        finding.steps_to_reproduce.forEach((step: string, stepIndex: number) => {
          sections.push(
            new Paragraph({
              text: `${stepIndex + 1}. ${step}`,
              spacing: { after: 50 },
            })
          );
        });
      }
    });

    // Conclusion
    sections.push(
      new Paragraph({
        text: 'Conclusion',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        text: `The penetration testing assessment identified ${findings.length} security findings. `,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: 'It is recommended to address all critical and high severity findings immediately.',
        spacing: { after: 200 },
      })
    );

    // Create document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: sections,
        },
      ],
    });

    // Generate file
    const fileName = `${project.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.docx`;
    const filePath = path.join(this.reportsDir, fileName);

    console.log('📄 Generating DOCX report at:', filePath);
    console.log('📁 Reports directory:', this.reportsDir);

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(filePath, buffer);

    // Verify file was created
    if (fs.existsSync(filePath)) {
      console.log('✅ Report file created successfully:', filePath);
    } else {
      console.error('❌ Report file was not created!');
    }

    return filePath;
  }

  // Generate PDF Report using Puppeteer
  private static async generatePDF(data: ReportData): Promise<string> {
    const { project } = data;

    // Generate file
    const fileName = `${project.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
    const filePath = path.join(this.reportsDir, fileName);

    console.log('📄 Generating professional PDF report at:', filePath);

    try {
      // Load template and generate HTML
      const template = this.loadTemplate();
      const content = this.generateHTMLContent(data);
      const html = template.replace('{{CONTENT}}', content);

      // Launch Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate PDF
      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
        }
      });

      await browser.close();

      console.log('✅ Professional PDF report created successfully:', filePath);
      return filePath;
    } catch (error) {
      console.error('❌ Error generating PDF with Puppeteer:', error);
      throw new ApiError(500, 'Failed to generate PDF report');
    }
  }

  // Get Report File
  static async getReportFile(reportId: number): Promise<string> {
    const report = await ReportModel.getReportById(reportId);
    if (!report) {
      throw new ApiError(404, 'Report not found');
    }

    console.log('🔍 Looking for report file:', report.file_path);
    console.log('📂 File exists?', fs.existsSync(report.file_path));

    if (!report.file_path || !fs.existsSync(report.file_path)) {
      throw new ApiError(404, 'Report file not found');
    }

    return report.file_path;
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
