interface Finding {
    id: number;
    title: string;
    severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
    description?: string;
    affected_target?: string;
    impact?: any;
    likelihood?: any;
    steps_to_reproduce?: string[] | string;
    recommendation?: string[] | string;
    proof_of_concept?: string;
    remediation?: string;
    references?: any[];
    finding_references?: any[];
}

interface Project {
    id: number;
    name: string;
    client_name?: string;
    description?: string;
}

export class ReportGeneratorService {
    private static escapeHtml(text: string): string {
        if (!text) return '';
        const map: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
        };
        return String(text).replace(/[&<>"']/g, (m) => map[m]);
    }

    private static extractValue(value: any): string {
        if (!value) return 'N/A';
        if (typeof value === 'string') return value;

        // Handle JSONB object with detail field
        if (typeof value === 'object') {
            // Try to extract detail first
            if (value.detail && typeof value.detail === 'string') {
                return value.detail;
            }
            // Try severity + detail combination
            if (value.severity && value.detail) {
                return `${value.severity} - ${value.detail}`;
            }
            // Just severity
            if (value.severity) {
                return value.severity;
            }
            // Fallback to JSON string
            return JSON.stringify(value);
        }

        return String(value);
    }

    private static severityClass(severity: string): string {
        switch (severity) {
            case 'Critical':
                return 'risk-critical';
            case 'High':
                return 'risk-high';
            case 'Medium':
                return 'risk-medium';
            case 'Low':
                return 'risk-low';
            default:
                return 'risk-informational';
        }
    }

    private static severityTextClass(severity: string): string {
        switch (severity) {
            case 'Critical':
            case 'High':
                return 'risk-text-high';
            case 'Medium':
                return 'risk-text-medium';
            case 'Low':
                return 'risk-text-low';
            default:
                return 'risk-text-informational';
        }
    }

    private static toParagraphs(text?: string): string {
        if (!text) return '';

        return String(text)
            .split(/\n+/)
            .map((part) => part.trim())
            .filter(Boolean)
            .map((part) => `<p>${this.escapeHtml(part)}</p>`)
            .join('');
    }

    private static normalizeSteps(steps?: any[] | string): Array<{stepNumber: number; description: string; imageKey?: string; caption?: string}> {
        console.log('🔍 normalizeSteps input:', {
            steps,
            type: typeof steps,
            isArray: Array.isArray(steps),
            firstItem: Array.isArray(steps) && steps.length > 0 ? steps[0] : null,
            firstItemType: Array.isArray(steps) && steps.length > 0 ? typeof steps[0] : null
        });
        
        if (!steps) return [];
        
        // New format: array of objects with stepNumber, description, imageKey, caption
        if (Array.isArray(steps) && steps.length > 0 && typeof steps[0] === 'object' && steps[0] !== null && 'stepNumber' in steps[0]) {
            const normalized = steps.map((step) => ({
                stepNumber: step.stepNumber || 0,
                description: String(step.description || '').trim(),
                imageKey: step.imageKey || step.image, // Support both imageKey (new) and image (legacy)
                caption: step.caption
            })).filter(s => s.description);
            
            console.log('✅ Normalized steps (new format):', normalized);
            return normalized;
        }
        
        // Legacy format: array of strings
        if (Array.isArray(steps)) {
            const normalized = steps.map((step, index) => ({
                stepNumber: index + 1,
                description: String(step).trim(),
            })).filter(s => s.description);
            
            console.log('✅ Normalized steps (legacy format):', normalized);
            return normalized;
        }

        // Legacy format: string with newlines
        const normalized = String(steps)
            .split(/\n+/)
            .map((step, index) => ({
                stepNumber: index + 1,
                description: step.replace(/^\d+[.)]\s*/, '').trim(),
            }))
            .filter(s => s.description);
            
        console.log('✅ Normalized steps (string format):', normalized);
        return normalized;
    }

    private static normalizeReferences(references?: any[]): string[] {
        if (!Array.isArray(references)) return [];

        return references
            .map((ref) => {
                if (typeof ref === 'string') return ref.trim();
                if (ref?.url) return String(ref.url).trim();
                if (ref?.title) return String(ref.title).trim();
                return '';
            })
            .filter(Boolean);
    }

    private static normalizeRecommendations(recommendation?: string[] | string, remediation?: string): string[] {
        if (Array.isArray(recommendation)) {
            return recommendation.map((item) => String(item).trim()).filter(Boolean);
        }

        if (typeof recommendation === 'string' && recommendation.trim()) {
            return recommendation
                .split(/\n+/)
                .map((item) => item.trim())
                .filter(Boolean);
        }

        if (remediation?.trim()) {
            return remediation
                .split(/\n+/)
                .map((item) => item.trim())
                .filter(Boolean);
        }

        return [];
    }

    private static sortFindings(findings: Finding[]): Finding[] {
        const order: Record<string, number> = {
            Critical: 0,
            High: 1,
            Medium: 2,
            Low: 3,
            Informational: 4,
        };

        return [...findings].sort((a, b) => {
            const severityDiff = (order[a.severity] ?? 99) - (order[b.severity] ?? 99);
            if (severityDiff !== 0) return severityDiff;
            return a.title.localeCompare(b.title);
        });
    }

    private static pageFooter(pageNumber: number): string {
        return `
        <div class="page-footer">
            <div class="footer-bar-wrap">
                <div class="footer-bar"></div>
                <div class="footer-dot"></div>
            </div>
            <div class="page-number">Page (${pageNumber})</div>
        </div>`;
    }

    private static renderSummaryPage(findings: Finding[]): string {
        const rows = findings.length
            ? findings.map((finding) => `
                <tr>
                    <td style="font-weight: 700;">${this.escapeHtml(finding.title)}</td>
                    <td class="risk-cell ${this.severityClass(finding.severity)}">${this.escapeHtml(finding.severity)}</td>
                </tr>`).join('')
            : `
                <tr>
                    <td>No approved findings available</td>
                    <td class="risk-cell risk-informational">Informational</td>
                </tr>`;

        return `
    <div class="page">
        <div class="brand-header">
            <img src="https://securifyai.co/wp-content/uploads/2024/09/securify-logo-light.png" alt="Securify logo">
            <div class="brand-line"></div>
        </div>
        <h1 class="page-title">Vulnerabilities</h1>
        <div class="title-rule"></div>
        <h2 class="section-heading">Summary</h2>
        <p>Below is a summary of the vulnerabilities discovered during the assessment, ranked in order of risk as determined:</p>
        <table class="report-table summary-table">
            <thead>
                <tr>
                    <th>Vulnerability</th>
                    <th style="width: 126px; text-align: center;">Risk</th>
                </tr>
            </thead>
            <tbody>${rows}
            </tbody>
        </table>
        <div class="summary-spacer"></div>
        <h2 class="section-heading">Detailed Vulnerabilities</h2>
        ${this.pageFooter(11)}
    </div>`;
    }

    private static renderFindingPage(finding: Finding, pageNumber: number): string {
        const severityTextClass = this.severityTextClass(finding.severity);
        const steps = this.normalizeSteps(finding.steps_to_reproduce);
        const references = this.normalizeReferences(finding.references || finding.finding_references);
        const recommendations = this.normalizeRecommendations(finding.recommendation, finding.remediation);
        const affectedTarget = finding.affected_target ? String(finding.affected_target).trim() : 'N/A';

        // Debug logging
        console.log('🔍 Finding data for report:', {
            id: finding.id,
            title: finding.title,
            impact: finding.impact,
            likelihood: finding.likelihood,
            steps_count: steps.length,
            references_count: references.length,
            recommendations_count: recommendations.length
        });

        const impact = this.extractValue(finding.impact);
        const likelihood = this.extractValue(finding.likelihood);

        const stepsHtml = steps.length
            ? steps.map((step) => {
                let html = `<p class="finding-step"><strong>Step ${step.stepNumber}:</strong> ${this.escapeHtml(step.description)}</p>`;
                if (step.imageKey) {
                    html += `<div class="step-image-container"><img src="${this.escapeHtml(step.imageKey)}" alt="Step ${step.stepNumber}" class="step-image" />`;
                    if (step.caption) {
                        html += `<p class="step-caption"><em>${this.escapeHtml(step.caption)}</em></p>`;
                    }
                    html += `</div>`;
                }
                return html;
            }).join('')
            : '<p class="finding-step">No steps to reproduce were provided.</p>';

        const referencesHtml = references.length
            ? `<ul class="references-list">${references.map((ref) => `<li><a href="${this.escapeHtml(ref)}">${this.escapeHtml(ref)}</a></li>`).join('')}</ul>`
            : '<p>No references provided.</p>';

        const remediationHtml = recommendations.length
            ? `<ul class="green-list">${recommendations.map((item) => `<li>${this.escapeHtml(item)}</li>`).join('')}</ul>`
            : '<p>No recommendations provided.</p>';

        const proofHtml = finding.proof_of_concept
            ? `
            <h3 class="label-title">Proof of Concept:</h3>
            <p>${this.escapeHtml(finding.proof_of_concept)}</p>`
            : '';

        return `
    <div class="page finding-page">
        <div class="brand-header">
            <img src="https://securifyai.co/wp-content/uploads/2024/09/securify-logo-light.png" alt="Securify logo">
            <div class="brand-line"></div>
        </div>
        <h2 class="finding-title">${this.escapeHtml(finding.title)}</h2>
        <p class="risk-line">Risk: <span class="${severityTextClass}">${this.escapeHtml(finding.severity)}</span></p>

        <h3 class="label-title">Description:</h3>
        ${this.toParagraphs(finding.description) || '<p>No description provided.</p>'}

        <h3 class="label-title">Affected URL:</h3>
        <ul class="url-list"><li>${affectedTarget.startsWith('http') ? `<a href="${this.escapeHtml(affectedTarget)}">${this.escapeHtml(affectedTarget)}</a>` : this.escapeHtml(affectedTarget)}</li></ul>

        <h3 class="label-title">Impact and Likelihood:</h3>
        <ul class="green-list">
            <li>Impact: ${this.escapeHtml(impact)}</li>
            <li>Likelihood: ${this.escapeHtml(likelihood)}</li>
        </ul>

        <h3 class="label-title">Steps to Reproduce:</h3>
        ${stepsHtml}
        ${proofHtml}

        <div class="recommendation-block mt-24">
            <h3 class="label-title">Recommendations:</h3>
            ${remediationHtml}
        </div>

        <div class="references-block mt-24">
            <h3 class="label-title">References:</h3>
            ${referencesHtml}
        </div>

        <p class="back-link"><a href="#">Back to summary</a></p>
        ${this.pageFooter(pageNumber)}
    </div>`;
    }

    static generateHTML(_project: Project, findings: Finding[]): string {
        const sortedFindings = this.sortFindings(findings);
        const summaryPage = this.renderSummaryPage(sortedFindings);
        const findingPages = sortedFindings
            .map((finding, index) => this.renderFindingPage(finding, 12 + index))
            .join('');

        return `${summaryPage}${findingPages}`;
    }
}
