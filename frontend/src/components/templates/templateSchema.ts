export interface TemplateRow {
  [key: string]: string;
}

export interface TemplateSectionContent {
  title: string;
  body?: string;
  items?: string[];
  rows?: TemplateRow[];
  matrix_rows?: TemplateRow[];
  appendix_entries?: TemplateRow[];
  application_rows?: TemplateRow[];
  user_role_rows?: TemplateRow[];
  tool_rows?: TemplateRow[];
  dynamic?: boolean;
  fields?: Record<string, string>;
}

export interface ReportTemplateContent {
  company_name: string;
  logo_path: string;
  primary_color: string;
  secondary_color: string;
  cover_subtitle: string;
  sections: {
    table_of_contents: TemplateSectionContent;
    confidentiality: TemplateSectionContent;
    introduction: TemplateSectionContent;
    approach: TemplateSectionContent;
    runtime_assessment: TemplateSectionContent;
    scope: TemplateSectionContent;
    assessment_limitation: TemplateSectionContent;
    findings_recommendation: TemplateSectionContent;
    risk_classification: TemplateSectionContent;
    measurement_impact: TemplateSectionContent;
    measurement_likelihood: TemplateSectionContent;
    overall_risk: TemplateSectionContent;
    zero_risk_issues: TemplateSectionContent;
    vulnerabilities: TemplateSectionContent;
    summary: TemplateSectionContent;
    detailed_vulnerabilities: TemplateSectionContent;
    appendix_a: TemplateSectionContent;
  };
}

export interface ReportTemplateRecord {
  id?: number;
  name: string;
  description?: string;
  template_data?: any;
  logo_path?: string;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const defaultTemplateContent = (): ReportTemplateContent => ({
  company_name: 'SecurifyAI',
  logo_path: 'https://securifyai.co/wp-content/uploads/2024/09/securify-logo-light.png',
  primary_color: '#00d639',
  secondary_color: '#11d414',
  cover_subtitle: 'Web Application & API Penetration Test Report',
  sections: {
    table_of_contents: {
      title: 'Table of Contents',
      items: [
        'Introduction',
        'Approach',
        'Runtime Application Vulnerability Assessment',
        'Scope',
        'Application Details',
        'User Roles (Web application & API)',
        'Tools',
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
      ],
    },
    confidentiality: {
      title: 'Confidentiality and Distribution Restrictions',
      body: 'The conclusions and recommendations in this report represent the opinions of Securify. Determinations of appropriate corrective action(s) are the responsibility of the entity receiving the report. This report and any other materials furnished by Securify in connection with this engagement are confidential and may not be duplicated, modified, or otherwise reproduced and distributed without the express prior written consent of Securify or Client Name.',
    },
    introduction: {
      title: 'Introduction',
      body: 'As part of an ongoing security program, {{CLIENT_NAME}} identified the need to conduct an application security assessment of its Web application & APIs.\n\nThis report presents the agreed scope, methodology, risk measurement model, summarized findings, and detailed technical observations for the selected assessment window.',
      items: [
        'Determine the overall security posture of the application',
        'Provide a list of key findings and recommendations for remediation',
        'Document the assessment scope, risk evaluation, and final outcomes',
        'Support remediation planning with actionable technical detail',
      ],
      fields: {
        list_title: 'The following lists the objectives of this assessment:',
        closing_title: 'This report includes the following parameters and results of the assessment:',
      },
    },
    approach: {
      title: 'Approach',
      body: 'Securify performed a Runtime Application Vulnerability Assessment of the client environment using a combination of manual testing, guided analysis, and targeted verification of identified attack paths.\n\nTesting focused on authentication, authorization, business logic, session management, input handling, information disclosure, and transport-layer protections.\n\nWhere appropriate, the assessment also included abuse-case validation, access-control bypass attempts, forced browsing, parameter tampering, and endpoint enumeration.',
    },
    runtime_assessment: {
      title: 'Runtime Application Vulnerability Assessment',
      body: 'The runtime assessment focused on security behavior observable in the live application and API flows, including authentication, authorization, input handling, business logic, sensitive data exposure, and common attack-surface weaknesses.\n\nThe engagement emphasized practical exploitability and realistic attacker behavior rather than purely theoretical weaknesses.',
    },
    scope: {
      title: 'Scope',
      body: 'The assessment was conducted between Start Date and End Date. The scope of the assessment was limited to the environments and targets below:',
      fields: {
        application_details_title: 'Application Details',
        user_roles_title: 'User Roles (Web application & API)',
        tools_title: 'Tools',
      },
      rows: [],
    },
    assessment_limitation: {
      title: 'Assessment Limitation',
      body: 'This assessment was performed within the agreed timebox and only against systems explicitly included in scope. Absence of identified vulnerabilities should not be interpreted as a guarantee that no issues remain.',
    },
    findings_recommendation: {
      title: 'Findings and Recommendation',
      body: 'The sections below summarize the observed risks and provide the measurement criteria used to classify findings across the engagement.\n\nEach finding is evaluated using the same impact and likelihood model so remediation can be prioritized consistently.',
    },
    risk_classification: {
      title: 'Risk Classification',
      body: 'Risk is determined by evaluating the combined effect of impact and likelihood for each issue identified during testing.\n\nThe matrix below is used as the standard model for determining overall severity.',
      fields: {
        matrix_title: 'Risk Matrix',
        matrix_subtitle: 'Impact x Likelihood',
      },
      matrix_rows: [
        { low: 'Medium', medium: 'High', high: 'Critical' },
        { low: 'Low', medium: 'Medium', high: 'High' },
        { low: 'Low', medium: 'Low', high: 'Medium' },
      ],
    },
    measurement_impact: {
      title: 'Measurement of Impact',
      body: 'Impact reflects the potential business, technical, operational, and data-related consequences if a vulnerability is successfully exploited.',
      items: [
        'Critical Impact: Severe compromise of confidentiality, integrity, or availability with material business or operational consequence.',
        'High Impact: Significant unauthorized access, data exposure, or business-process abuse affecting sensitive functions or users.',
        'Medium Impact: Meaningful security weakness with constrained scope, partial exposure, or limited operational effect.',
        'Low Impact: Minor weakness with limited practical consequence or low-value exposure.',
      ],
    },
    measurement_likelihood: {
      title: 'Measurement of Likelihood',
      body: 'Likelihood reflects how feasible exploitation is in practice, considering attacker capability, required access, and environmental constraints.',
      items: [
        'High Likelihood: Exploitation is straightforward and requires limited skill, access, or environmental dependency.',
        'Medium Likelihood: Exploitation is feasible but requires some knowledge, sequencing, or favorable conditions.',
        'Low Likelihood: Exploitation requires significant effort, elevated preconditions, or specialized capability.',
      ],
    },
    overall_risk: {
      title: 'Overall Risk',
      body: 'Overall risk is derived from the intersection of impact and likelihood and is used to prioritize remediation efforts. Findings with the highest combined rating should be addressed first, especially where exploitability and business consequence are both significant.',
      items: [
        'Low Impact + Low Likelihood = Low Risk',
        'High Impact + High Likelihood = Critical Risk',
      ],
    },
    zero_risk_issues: {
      title: 'Zero-risk Issues',
      body: 'Items categorized as zero-risk or informational are included where useful for context but should not be treated as exploitable vulnerabilities. These entries may still be valuable for hardening, visibility, or long-term security maturity planning.',
    },
    vulnerabilities: {
      title: 'Vulnerabilities',
      body: 'Below is a summary of the vulnerabilities discovered during the assessment, ranked in order of risk as determined.',
    },
    summary: {
      title: 'Summary',
      body: 'Below is a summary of the vulnerabilities discovered during the assessment, ranked in order of risk as determined.',
    },
    detailed_vulnerabilities: {
      title: 'Detailed Vulnerabilities',
      body: 'This section is populated automatically from the selected approved findings at report generation time.',
      dynamic: true,
    },
    appendix_a: {
      title: 'Appendix A',
      body: 'The appendix content below is static template material and will be rendered into reports that use this template.',
      appendix_entries: [
        {
          title: 'Appendix A - Authentication Verification Requirements',
          body: 'Verify that user-set passwords are at least 12 characters in length. Verify that passwords 64 characters or longer are permitted. Verify that passwords can contain spaces and that truncation is not performed.',
        },
        {
          title: 'Appendix B - Session Management Verification Requirements',
          body: 'Verify that session identifiers are invalidated at logout and after expiration. Verify that session handling prevents fixation, replay, and improper reuse across authentication state changes.',
        },
        {
          title: 'Appendix C - Access Control Verification Requirements',
          body: 'Verify that authorization is enforced server-side at both function and object level. Verify that direct object references, forced browsing, and parameter tampering do not expose unauthorized actions or data.',
        },
        {
          title: 'Appendix D - Input Validation and Encoding Requirements',
          body: 'Verify that trusted and untrusted inputs are validated according to expected type, format, and length. Verify that output encoding and parser protections mitigate injection and cross-site scripting risks.',
        },
        {
          title: 'Appendix E - Transport and Configuration Requirements',
          body: 'Verify that TLS configuration is current, insecure protocols are disabled, and sensitive headers are not exposed. Verify that debug features, unnecessary services, and insecure defaults are disabled in production.',
        },
      ],
    },
  },
});

const mergeRows = (existing: any, fallback: TemplateRow[]): TemplateRow[] => {
  if (!Array.isArray(existing) || existing.length === 0) return fallback;
  return existing.map((row) => ({ ...row }));
};

export const buildTemplateContent = (template?: ReportTemplateRecord | null): ReportTemplateContent => {
  const fallback = defaultTemplateContent();
  const raw = template?.template_data && typeof template.template_data === 'object'
    ? template.template_data
    : {};

  const scopeApplications = raw.scope_applications || template?.template_data?.scope_applications || [
    { name: 'Application Name 1', url: 'http://test.com' },
    { name: 'Application Name 2', url: 'http://admin.test.com' },
  ];
  const scopeUserRoles = raw.scope_user_roles || template?.template_data?.scope_user_roles || [
    { role: 'Customer', description: 'Authenticated customer user' },
    { role: 'Admin', description: 'Privileged administrative user' },
  ];
  const scopeTools = raw.scope_tools || template?.template_data?.scope_tools || [
    { name: 'Burp Suite Professional', description: 'Primary proxy and web security testing suite' },
    { name: 'Nmap', description: 'Host and service discovery' },
    { name: 'cURL', description: 'Command-line HTTP request validation' },
  ];

  const sections = raw.sections || {};
  return {
    company_name: raw.company_name || fallback.company_name,
    logo_path: template?.logo_path || raw.logo_path || fallback.logo_path,
    primary_color: raw.primary_color || fallback.primary_color,
    secondary_color: raw.secondary_color || fallback.secondary_color,
    cover_subtitle: raw.cover_subtitle || fallback.cover_subtitle,
    sections: {
      ...fallback.sections,
      ...sections,
      table_of_contents: { ...fallback.sections.table_of_contents, ...(sections.table_of_contents || {}) },
      confidentiality: { ...fallback.sections.confidentiality, ...(sections.confidentiality || {}), body: sections.confidentiality?.body || raw.confidentiality_text || fallback.sections.confidentiality.body },
      introduction: { ...fallback.sections.introduction, ...(sections.introduction || {}), body: sections.introduction?.body || raw.introduction_text || fallback.sections.introduction.body },
      approach: { ...fallback.sections.approach, ...(sections.approach || {}), body: sections.approach?.body || raw.approach_text || fallback.sections.approach.body },
      runtime_assessment: { ...fallback.sections.runtime_assessment, ...(sections.runtime_assessment || {}) },
      scope: {
        ...fallback.sections.scope,
        ...(sections.scope || {}),
        body: sections.scope?.body || raw.scope_text || fallback.sections.scope.body,
        fields: { ...fallback.sections.scope.fields, ...(sections.scope?.fields || {}) },
        application_rows: mergeRows(sections.scope?.application_rows || raw.scope_applications, scopeApplications),
        user_role_rows: mergeRows(sections.scope?.user_role_rows || raw.scope_user_roles, scopeUserRoles),
        tool_rows: mergeRows(sections.scope?.tool_rows || raw.scope_tools, scopeTools),
      },
      assessment_limitation: { ...fallback.sections.assessment_limitation, ...(sections.assessment_limitation || {}) },
      findings_recommendation: { ...fallback.sections.findings_recommendation, ...(sections.findings_recommendation || {}) },
      risk_classification: { ...fallback.sections.risk_classification, ...(sections.risk_classification || {}) },
      measurement_impact: { ...fallback.sections.measurement_impact, ...(sections.measurement_impact || {}) },
      measurement_likelihood: { ...fallback.sections.measurement_likelihood, ...(sections.measurement_likelihood || {}) },
      overall_risk: { ...fallback.sections.overall_risk, ...(sections.overall_risk || {}) },
      zero_risk_issues: { ...fallback.sections.zero_risk_issues, ...(sections.zero_risk_issues || {}) },
      vulnerabilities: { ...fallback.sections.vulnerabilities, ...(sections.vulnerabilities || {}) },
      summary: { ...fallback.sections.summary, ...(sections.summary || {}) },
      detailed_vulnerabilities: { ...fallback.sections.detailed_vulnerabilities, ...(sections.detailed_vulnerabilities || {}) },
      appendix_a: {
        ...fallback.sections.appendix_a,
        ...(sections.appendix_a || {}),
        body: sections.appendix_a?.body || raw.appendix_text || fallback.sections.appendix_a.body,
        appendix_entries: mergeRows(sections.appendix_a?.appendix_entries, fallback.sections.appendix_a.appendix_entries || []),
      },
    },
  };
};

export const buildTemplatePayload = (template: ReportTemplateRecord, content: ReportTemplateContent) => {
  const composeSectionBody = (section: TemplateSectionContent) => {
    const parts: string[] = [];
    if (section.body) parts.push(section.body);
    if (section.fields?.list_title && Array.isArray(section.items) && section.items.length) {
      parts.push(section.fields.list_title);
    }
    if (Array.isArray(section.items) && section.items.length) {
      parts.push(...section.items.map((item) => `- ${item}`));
    }
    if (section.fields?.closing_title) {
      parts.push(section.fields.closing_title);
    }
    return parts.filter(Boolean).join('\n\n');
  };

  const appendixText = [
    content.sections.appendix_a.body || '',
    ...((content.sections.appendix_a.appendix_entries || []).map((entry) => `${entry.title || ''}\n${entry.body || ''}`.trim())),
  ].filter(Boolean).join('\n\n');

  return {
    name: template.name,
    description: template.description || '',
    logo_path: content.logo_path,
    is_default: Boolean(template.is_default),
    confidentiality_text: composeSectionBody(content.sections.confidentiality),
    introduction_text: composeSectionBody(content.sections.introduction),
    approach_text: composeSectionBody(content.sections.approach),
    scope_text: content.sections.scope.body || '',
    scope_applications: mergeRows(content.sections.scope.fields ? (content.sections.scope as any).application_rows : null, []),
    scope_user_roles: mergeRows(content.sections.scope.fields ? (content.sections.scope as any).user_role_rows : null, []),
    scope_tools: mergeRows(content.sections.scope.fields ? (content.sections.scope as any).tool_rows : null, []),
    appendix_text: appendixText,
    template_data: {
      ...template.template_data,
      company_name: content.company_name,
      logo_path: content.logo_path,
      primary_color: content.primary_color,
      secondary_color: content.secondary_color,
      cover_subtitle: content.cover_subtitle,
      scope_applications: mergeRows((content.sections.scope as any).application_rows, []),
      scope_user_roles: mergeRows((content.sections.scope as any).user_role_rows, []),
      scope_tools: mergeRows((content.sections.scope as any).tool_rows, []),
      sections: content.sections,
      template_file: template.template_data?.template_file || 'professional-report-template.html',
      docx_template_file: template.template_data?.docx_template_file || 'professional-report-template.docx',
    },
  };
};
