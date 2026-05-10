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
    out_of_scope: TemplateSectionContent;
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
      body: 'The conclusions and recommendations in this report represent the opinions of Securify.\n\nDeterminations of appropriate corrective action(s) are the responsibility of the entity receiving the report.\n\nThis report and/or any other materials furnished by Securify in connection with this engagement is confidential and may not be duplicated, modified, or otherwise reproduced and distributed without the express prior written consent of Securify or {{CLIENT_NAME}}. Because this work may contain copyrighted images or other material, permission from the copyright holder may also be necessary if you wish to reproduce.',
    },
    introduction: {
      title: 'Introduction',
      body: 'As part of an ongoing security program, **{{CLIENT_NAME}}** identified the need to conduct an application security assessment of its Web application & APIs.\n\nThis report presents the agreed scope, methodology, risk measurement model, summarized findings, and detailed technical observations for the selected assessment window.',
      fields: {
        list_title: '_The following lists the objectives of this assessment:_',
        closing_title: '_This report includes the following parameters and results of the assessment:_',
      },
items: [
          'Determine the overall security posture of the application',
          'Provide a list of key findings and recommendations for remediation',
          'Document the assessment scope, risk evaluation, and final outcomes',
          'Support remediation planning with actionable technical detail',
        ],
closing_items: [
          "Securify's approach to the assessment",
          'Assessment scope',
          'Key findings listed with their qualitative risk assessment',
          'Detailed recommendations for each finding',
          'A remediation plan',
        ],
    },
    approach: {
      title: 'Approach',
      body: 'Securify performed a Runtime Application Vulnerability Assessment of the {{CLIENT_NAME}}\'s web application, associated APIs, and all components defined within the assessment scope.\n\nThe assessment was conducted using industry-accepted methodologies, primarily based on the OWASP Web Security Testing Guide (WSTG) and OWASP ASVS, and involved both manual testing and automated analysis.',
    },
    runtime_assessment: {
      title: 'Runtime Application Vulnerability Assessment',
      body: 'The Runtime Application Vulnerability Assessment involved detecting security vulnerabilities through detailed examination and testing of the application in a runtime environment. This assessment emulates an attack by a skilled adversary in a controlled setting and allows {{CLIENT_NAME}} to ascertain the kinds of vulnerabilities that may be realistically exploited. A Runtime Application Vulnerability Assessment includes the following phases:',
      items: [
        '**Information Gathering** – The application was reviewed as an anonymous, authenticated, and privileged user to understand differences in access and behavior. Technologies, frameworks, APIs, and third-party integrations were also identified to support targeted testing.',
        '**Authentication Testing** – Authentication mechanisms were evaluated to determine the strength of login controls, password policies, and account recovery processes. Protections against brute-force attempts and session takeover scenarios were also reviewed to ensure users are securely authenticated.',
        '**Authorization Testing** – Tests were conducted to identify weaknesses in access control, including attempts to access other users\' data or privileged functionality.',
        '**Session Management** – Session handling was assessed to ensure secure creation, storage, and invalidation of session tokens.',
        '**Input Validation Attacks** – User-controlled input fields were tested with malformed and malicious data to identify injection flaws and logic bypasses. This included attempts to exploit unexpected behavior, access unprotected functionality, or inject vulnerabilities such as XSS, SQL Injection, and Command Injection.',
        '**Business Logic Testing** – The application workflows were reviewed to identify opportunities to misuse or bypass intended processes. This included testing for logic errors, insufficient validation, and scenarios where typical constraints could be circumvented.',
      ],
    },
    scope: {
      title: 'Scope',
      body: 'The assessment was conducted between Start Date and End Date. The re-assessment was conducted between Start Date and End Date. Testing was performed remotely.\n\nThe scope of the assessment was limited to the environments and targets below:',
      fields: {
        application_details_title: 'Application Details',
        user_roles_title: 'User Roles (Web application & API)',
        tools_title: 'Tools',
        out_of_scope_title: 'The following components and tests were out of scope for this review:',
      },
      rows: [],
    },
    assessment_limitation: {
      title: 'Assessment Limitation',
      body: 'The ever-changing technology landscape and the increasing sophistication of attacks against networked systems are reasons why no entity can truthfully claim to identify all security issues or guarantee the lifetime security of an organization\'s network and applications. Note that this point-in-time assessment was based on a best-effort basis. It was also performed only in the environment provided by {{CLIENT_NAME}}. Thus, changes to the environment may impact the applicability of the results provided herein.\n\nSecurify cannot guarantee 100% coverage for any security assessment.',
    },
    findings_recommendation: {
      title: 'Findings and Recommendation',
      body: 'The sections below summarize the observed risks and provide the measurement criteria used to classify findings across the engagement.\n\nEach finding is evaluated using the same impact and likelihood model so remediation can be prioritized consistently.',
    },
    risk_classification: {
      title: 'Risk Classification',
      body: 'The remainder of this report describes the vulnerabilities that Securify identified as part of the assessment, their impact, and recommendations for resolving the vulnerabilities. To assist in determining the risk posed by these vulnerabilities, Securify leverages the OWASP Application Security Risk Rating Methodology. The observations have been categorized based on technical Impact and Likelihood, explained below. These impact and likelihood scores may be further modified by {{CLIENT_NAME}} based on the business criticality of the target.',
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
      body: 'Impact is an estimation of the potential damage via a successful exploit of a vulnerability. We\'ll use the following factors to help qualitatively determine the impact of a vulnerability.',
      items: [
        'Low Impact: When most/all factors indicate limited consequences (e.g., non-sensitive data, no ability to alter/delete key data, and low victim count).',
        'Medium Impact: When about half of the factors suggest higher damage and half point to limited effects.',
        'High Impact: When most/all factors highlight significant damage (e.g., sensitive data loss, wide data corruption, and a large number of victims).',
      ],
    },
    measurement_likelihood: {
      title: 'Measurement of Likelihood',
      body: 'Likelihood is a qualitative estimation of the probability of an attacker exploiting the vulnerability in question. In order to determine the likelihood of exploitation, we can consider the following factors:',
      items: [
        'Low Likelihood: Most/all factors suggest significant barriers to exploitation (e.g., complex skillset, limited attackers, high cost, or complex delivery).',
        'Medium Likelihood: About half the factors indicate ease of exploitation, while the other half show barriers.',
        'High Likelihood: Most/all factors point to easy and accessible exploitation (e.g., basic skills, low cost, and simple attack mechanisms).',
      ],
    },
    overall_risk: {
      title: 'Overall Risk',
      body: 'The following graph illustrates how Impact x Likelihood scores translate to overall Low, Medium, and High-risk ratings:\n\nOverall risk is derived from the intersection of impact and likelihood and is used to prioritize remediation efforts. Findings with the highest combined rating should be addressed first, especially where exploitability and business consequence are both significant.',
      items: [
        'Low Impact + Low Likelihood = Low Risk',
        'High Impact + High Likelihood = Critical Risk',
      ],
    },
    out_of_scope: {
      title: 'Out of Scope',
      fields: {
        title: 'The following components and tests were out of scope for this review:',
      },
      items: [
        'Any applications and infrastructure external to the {{CLIENT_NAME}}\'s Web Application & API.',
        'In cases where the {{CLIENT_NAME}}\'s Web Application & API had inbound and/or outbound interfaces with:',
        'Another application, the interfaces, and communications were considered in scope.',
        'All other external elements were excluded.',
        'Supporting policies, procedures, and processes.',
        'Social Engineering.',
        'Software Development Life Cycle.',
      ],
    },
    zero_risk_issues: {
      title: 'Zero-risk Issues',
      body: 'There are cases where a particular issue doesn\'t have direct security impact or likelihood of exploitation. These could be issues related to documentation or semantics that are suggested based on the security assessors\' technical and industry experience. Such issues shall be reported with an Informational risk rating.',
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
      out_of_scope: { ...fallback.sections.out_of_scope, ...(sections.out_of_scope || {}) },
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
      template_file: template.template_data?.template_file || '',
      docx_template_file: template.template_data?.docx_template_file || '',
    },
  };
};
