export interface TemplateRow {
  [key: string]: string;
}

export interface TemplateTable {
  id: string;
  title?: string;
  headers: string[];
  rows: string[][];
}

export interface TemplateSectionContent {
  title: string;
  body?: string;
  rich_body?: any;
  items?: string[];
  rows?: TemplateRow[];
  matrix_rows?: TemplateRow[];
  appendix_entries?: TemplateRow[];
  application_rows?: TemplateRow[];
  user_role_rows?: TemplateRow[];
  tool_rows?: TemplateRow[];
  tables?: TemplateTable[];
  dynamic?: boolean;
  fields?: Record<string, string>;
  level?: number;
}

export interface ReportTemplateContent {
  company_name: string;
  logo_path: string;
  primary_color: string;
  secondary_color: string;
  cover_subtitle: string;
  sections: Record<string, TemplateSectionContent>;
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

const blueAllySections = (): Record<string, TemplateSectionContent> => ({
  executive_summary: {
    title: 'Executive Summary',
    body: `{{COMPANY_NAME}} conducted a penetration test of the {{CLIENT_NAME}} web application and its APIs to identify security weaknesses. The goal of this assessment is aimed at minimizing risks to data, systems, and company.

The {{COMPANY_NAME}} team assessed the application's functionality, security controls, and potential vulnerabilities. Common weaknesses listed in the OWASP Top 10 and security best practices outlined in the OWASP Application Security Verification Standard (ASVS) were used as a baseline for evaluation.

Vulnerabilities identified were categorized as follows:
- Critical: 1
- High: 1
- Medium: 1
- Low: 4`,
  },
  introduction: {
    title: 'Introduction',
    body: `**Background**

As part of an ongoing security program, {{CLIENT_NAME}} identified the need to conduct an application security assessment and penetration test of its web application.

This report includes the following:
- {{COMPANY_NAME}}'s approach to the assessment
- Assessment scope
- Key findings are listed with their qualitative risk assessment
- Detailed recommendations for each finding
- A remediation plan`,
  },
  approach: {
    title: 'Approach',
    body: `{{COMPANY_NAME}} performed a Runtime Web Application Vulnerability Assessment of the {{CLIENT_NAME}} web application components that were defined in the scope.

**Web Application Assessment & Penetration Test**
- Identify the possible security vulnerabilities and test the possibility of exploitation in the Web application infrastructure.
- Assess the security vulnerabilities present in the Web application infrastructure concerning industry standard methodologies like OSSTMM (Open-Source Security Testing Methodology Manual) and OWASP (Open Web Application Security Project).
- Suggest best practices for remediation.

**Runtime Application Vulnerability Assessment**
The Runtime Application Vulnerability Assessment involves detecting security vulnerabilities through detailed examination and testing of the application in a runtime environment. This assessment emulates an attack by a skilled adversary in a controlled setting. The following activities were carried out during the assessment:
- **Information Gathering** \u2014 Gain a better understanding of the application by browsing the website as an anonymous visitor, a typical user, and then as a privileged user (where applicable).
- **Attacking Authorization** \u2014 Attempt to gain access to data belonging to other users of the system, resources, or functionalities belonging to privileged users.
- **Session Management** \u2014 Attempt to exploit session management vulnerabilities and manipulate client state.
- **Input Validation Attacks** \u2014 Attempt to inject invalid, malformed, or unexpected input to trigger unexpected behavior or exceptions in the application or related libraries.

**This assessment report contains:**
- Technical details of the vulnerabilities discovered, with substantiation of the exploits.
- The risk mitigation recommendations that need to be implemented to ensure that the systems are secure from the risks stemming from the discovered vulnerabilities.`,
  },
  scope: {
    title: 'Scope',
    body: `The assessment was conducted between Start Date and End Date. Testing was performed remotely.

The objective of the re-test was to assess the effectiveness of {{CLIENT_NAME}}'s efforts to remediate the issues identified during the original penetration test.

The following domains were considered within the scope of this assessment.

The scope for this security assessment included, but was not limited to, the following tests:
- Identification of running services
- Vulnerability Assessment
- Penetration Testing of Web Application
- Identification of vulnerable or outdated components and software in use`,
  },
  tools_used: {
    title: 'Tools Used',
    level: 2,
    body:
      'The following open-source tools were used during this vulnerability assessment exercise:',
    items: [
      'Nmap',
      'SSLScan',
      'Burp Professional Pro',
      'SQLMap',
      'Postman',
      'Caido',
    ],
  },
  assessment_limitation: {
    title: 'Assessment Limitation',
    level: 2,
    body: `The ever-changing technology landscape and the increasing sophistication of attacks against web applications are reasons no entity can truthfully claim to identify all security issues nor guarantee the lifetime security of an organization's network and applications. Note that this point-in-time assessment was based on a best-effort basis. It was also performed only in the environment provided by {{CLIENT_NAME}}. Thus, changes to the environment may impact the applicability of the results provided herein.

{{COMPANY_NAME}} cannot guarantee 100% coverage for any security assessment.`,
  },
  findings_and_recommendations: {
    title: 'Findings and Recommendations',
    body: `The sections below summarize the observed risks and provide the measurement criteria used to classify findings across the engagement.

Each finding is evaluated using the same impact and likelihood model so remediation can be prioritized consistently.`,
  },
  risk_classification: {
    title: 'Risk Classification',
    level: 2,
    body: `The remainder of this report describes the vulnerabilities that {{COMPANY_NAME}} identified as part of the assessment, their impact, and recommendations for resolving the vulnerabilities. To help determine the risk posed by these vulnerabilities, {{COMPANY_NAME}} leverages the OWASP Application Security Risk Rating Methodology. The observations have been categorized based on technical Impact and Likelihood, explained below. These impact and likelihood scores may be further modified by {{CLIENT_NAME}} based on the business criticality of the target.`,
  },
  measurement_of_impact: {
    title: 'Measurement of Impact',
    level: 2,
    body: `The impact is an estimation of the damage potential of a successful exploit of a vulnerability. We'll use the following factors to help qualitatively determine the impact of a vulnerability.

There is no science to determine the impact of using the above factors. If most/all of the factors are pointing to a lower impact, we can evaluate it as Low. If the factors pointing to lower impact are balanced by those indicating higher impact, we can evaluate it as Medium. If most/all of the factors point to higher impact, we can evaluate it as High.`,
  },
  measurement_of_likelihood: {
    title: 'Measurement of Likelihood',
    level: 2,
    body: `Likelihood is a qualitative estimation of the probability of an adversary exploiting the vulnerability in question. To determine the likelihood of an exploit, we can consider the following factors:

There is no science to determine the likelihood using the above factors. If most/all of the factors are pointing to a lower likelihood, we can evaluate it as Low. If the factors pointing to lower likelihood are balanced by those indicating higher likelihood, we can evaluate it as Medium. If most/all of the factors point to higher likelihood, we can evaluate it as High.`,
  },
  overall_risk: {
    title: 'Overall Risk',
    level: 2,
    body:
      'The following graph illustrates how Impact x Likelihood scores translate to overall Low, Medium, and High-risk ratings.',
  },
  zero_risk_issues: {
    title: 'Zero-Risk Issues',
    level: 2,
    body:
      'There are cases where a particular issue doesn\'t have a direct security impact or likelihood of exploitation. These could be issues related to documentation or semantics that are suggested based on the security assessors\' technical and industry experience. Such issues shall be reported with an Informational risk rating.',
  },
  vulnerabilities: {
    title: 'Vulnerabilities',
    body:
      'Below is a summary of the vulnerabilities discovered during the assessment, ranked in order of risk.',
  },
  web_application_findings: {
    title: 'Web Application Findings',
    level: 2,
    body: '',
  },
  detailed_vulnerabilities: {
    title: 'Detailed Vulnerabilities',
    body: '',
    dynamic: true,
  },
  appendix_a: {
    title: 'Appendix A: Penetration Test Scope',
    body: '',
  },
});

const dastSections = (): Record<string, TemplateSectionContent> => ({
  scope: {
    title: 'Scope',
    body:
      'The assessment was conducted between Start Date and End Date. Testing was performed remotely.\n\n' +
      'The scope of the assessment was limited to the environments and targets below.',
  },
  assessment_limitation: {
    title: 'Assessment Limitation',
    level: 2,
    body: `The ever-changing technology landscape and the increasing sophistication of attacks against networked systems are reasons why no entity can truthfully claim to identify all security issues or guarantee the lifetime security of an organization's network and applications. Note that this point-in-time assessment was based on a best-effort basis. It was also performed only in the environment provided by {{CLIENT_NAME}}. Thus, changes to the environment may impact the applicability of the results provided herein.

Securify cannot guarantee 100% coverage for any security assessment.`,
  },
  summary: {
    title: 'Summary',
    dynamic: true,
    body:
      'Below is a summary of the vulnerabilities discovered during the assessment, ranked in order of risk as determined.',
  },
  detailed_vulnerabilities: {
    title: 'Detailed Vulnerabilities',
    dynamic: true,
    body: '',
  },
  true_positive: {
    title: 'True Positive',
    dynamic: true,
    body: '',
  },
  false_positive: {
    title: 'False Positive',
    dynamic: true,
    body: '',
  },
});

const securifySections = (): Record<string, TemplateSectionContent> => ({
  confidentiality: {
    title: 'Confidentiality and Distribution Restrictions',
    body: `The conclusions and recommendations in this report represent the opinions of Securify. Determinations of appropriate corrective action(s) are the responsibility of the entity receiving the report.

This report and/or any other materials furnished by Securify in connection with this engagement is confidential and may not be duplicated, modified or otherwise reproduced and distributed without the express prior written consent of Securify or {{CLIENT_NAME}}.`,
  },
  introduction: {
    title: 'Introduction',
    body:
      'As part of an ongoing security program, {{CLIENT_NAME}} identified the need to conduct an application security assessment of its Web application & APIs.',
    fields: {
      list_title: 'The following lists the objectives of this assessment:',
      closing_title: 'This report includes the following parameters and results of the assessment:',
    },
    items: [
      'Determine the overall security posture of the application',
      'Provide a list of key findings and recommendations for remediation',
      'Securify\'s approach to the assessment',
      'Assessment scope',
      'Key findings listed with their qualitative risk assessment',
      'Detailed recommendations for each finding',
      'A remediation plan',
    ],
  },
  approach: {
    title: 'Approach',
    body: `Securify performed a Runtime Application Vulnerability Assessment of the {{CLIENT_NAME}}'s web application, associated APIs, and all components defined within the assessment scope.

The assessment was conducted using industry-accepted methodologies, primarily based on the OWASP Web Security Testing Guide (WSTG) and OWASP ASVS, and involved both manual testing and automated analysis.`,
  },
  runtime_assessment: {
    title: 'Runtime Application Vulnerability Assessment',
    body:
      'The Runtime Application Vulnerability Assessment involved detecting security vulnerabilities through detailed examination and testing of the application in a runtime environment. This assessment emulates an attack by a skilled adversary in a controlled setting and allows {{CLIENT_NAME}} to ascertain the kinds of vulnerabilities that may be realistically exploited. A Runtime Application Vulnerability Assessment includes the following phases:',
    items: [
      'Information Gathering \u2014 The application was reviewed as an anonymous, authenticated, and privileged user to understand differences in access and behavior. Technologies, frameworks, APIs, and third-party services in use were identified and analyzed for known weaknesses.',
      'Authentication Testing \u2014 Authentication mechanisms were evaluated to determine the strength of login controls, password policies, and account recovery processes. Protections against brute-force attacks, credential stuffing, and session fixation were assessed.',
      'Authorization Testing \u2014 Tests were conducted to identify weaknesses in access control, including attempts to access other users\' data or privileged functionality.',
      'Session Management \u2014 Session handling was assessed to ensure secure creation, storage, and invalidation of session tokens.',
      'Input Validation Attacks \u2014 User-controlled input fields were tested with malformed and malicious data to identify injection flaws and logic bypasses. This included attempts to trigger unexpected behavior, disclose internal data, or execute unauthorized actions.',
      'Business Logic Testing \u2014 The application\'s workflows were reviewed to identify opportunities to misuse or bypass intended processes. This included testing for logic errors, insufficient validation, and privilege manipulation.',
    ],
  },
  scope: {
    title: 'Scope',
    body: `The assessment was conducted between Start Date and End Date. The re-assessment was conducted between Start Date and End Date. Testing was performed remotely.

The scope of the assessment was limited to the environments and targets below.`,
    fields: {
      application_details_title: 'Application Details',
      user_roles_title: 'User Roles (Web application & API)',
      tools_title: 'Tools',
    },
    items: [
      'Any applications and infrastructure external to the {{CLIENT_NAME}}\'s Web Application & API.',
      'In cases where the {{CLIENT_NAME}}\'s Web Application & API had inbound and/or outbound interfaces with another application, the interfaces, and communications were considered in scope. All other external elements were excluded.',
      'Supporting policies, procedures, and processes.',
      'Social Engineering.',
      'Software Development Life Cycle.',
    ],
  },
  assessment_limitation: {
    title: 'Assessment Limitation',
    body: `The ever-changing technology landscape and the increasing sophistication of attacks against networked systems are reasons why no entity can truthfully claim to identify all security issues or guarantee the lifetime security of an organization's network and applications. Note that this point-in-time assessment was based on a best-effort basis. It was also performed only in the environment provided by {{CLIENT_NAME}}. Thus, changes to the environment may impact the applicability of the results provided herein.

Securify cannot guarantee 100% coverage for any security assessment.`,
  },
  findings_recommendation: {
    title: 'Findings and Recommendation',
    body: `The sections below summarize the observed risks and provide the measurement criteria used to classify findings across the engagement.

Each finding is evaluated using the same impact and likelihood model so remediation can be prioritized consistently.`,
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
    body: `Impact is an estimation of the potential damage via a successful exploit of a vulnerability. We'll use the following factors to help qualitatively determine the impact of a vulnerability.

Low Impact: When most/all factors indicate limited consequences (e.g., non-sensitive data, no ability to alter/delete key data, and low victim count).
Medium Impact: When about half of the factors suggest higher damage and half point to limited effects.
High Impact: When most/all factors highlight significant damage (e.g., sensitive data loss, wide data corruption, and a large number of victims).`,
  },
  measurement_likelihood: {
    title: 'Measurement of Likelihood',
    body: `Likelihood is a qualitative estimation of the probability of an attacker exploiting the vulnerability in question. In order to determine the likelihood of exploitation, we can consider the following factors:

Low Likelihood: Most/all factors suggest significant barriers to exploitation (e.g., complex skillset, limited attackers, high cost, or complex delivery).
Medium Likelihood: About half the factors indicate ease of exploitation, while the other half show barriers.
High Likelihood: Most/all factors point to easy and accessible exploitation (e.g., basic skills, low cost, and simple attack mechanisms).`,
  },
  overall_risk: {
    title: 'Overall Risk',
    body: `The following graph illustrates how Impact x Likelihood scores translate to overall Low, Medium, and High-risk ratings:

Low Impact + Low Likelihood = Low Risk
High Impact + High Likelihood = Critical Risk`,
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
    body: '',
  },
});

export const defaultTemplateContent = (templateKey?: string): ReportTemplateContent => {
  const key = String(templateKey || '').toLowerCase();
  let sections: Record<string, TemplateSectionContent>;
  if (key === 'blueally') {
    sections = blueAllySections();
  } else if (key === 'dast') {
    sections = dastSections();
  } else {
    sections = securifySections();
  }
  return {
    company_name: 'SecurifyAI',
    logo_path: 'https://securifyai.co/wp-content/uploads/2024/09/securify-logo-light.png',
    primary_color: '#00d639',
    secondary_color: '#11d414',
    cover_subtitle: 'Web Application & API Penetration Test Report',
    sections,
  };
};

const mergeRows = (existing: any, fallback: TemplateRow[]): TemplateRow[] => {
  if (!Array.isArray(existing) || existing.length === 0) return fallback;
  return existing.map((row) => ({ ...row }));
};

const mergeSectionWithDefaults = (fallback: TemplateSectionContent, stored: any): TemplateSectionContent => {
  if (!stored) return { ...fallback };
  const merged: TemplateSectionContent = { ...fallback, ...stored };
  if (stored.rich_body !== undefined) merged.rich_body = stored.rich_body;
  if (stored.tables !== undefined) merged.tables = stored.tables;
  if (stored.body !== undefined) merged.body = stored.body;
  if (stored.title !== undefined) merged.title = stored.title;
  if (stored.items !== undefined) merged.items = stored.items;
  if (stored.dynamic !== undefined) merged.dynamic = stored.dynamic;
  if (stored.level !== undefined) merged.level = stored.level;
  if (stored.fields !== undefined) merged.fields = { ...fallback.fields, ...stored.fields };
  return merged;
};

export const buildTemplateContent = (template?: ReportTemplateRecord | null): ReportTemplateContent => {
  const templateKey = String((template as any)?.template_data?.key || '').toLowerCase();
  const templateName = String(template?.name || '').toLowerCase();
  const isProfessionalTemplate = templateKey === 'securify'
    || templateKey === 'unknown'
    || templateName.includes('securify')
    || templateName.includes('professional');
  const isDastTemplate = templateKey === 'dast'
    || templateName.includes('dast')
    || templateName.includes('dynamic analysis');
  const fallback = defaultTemplateContent(templateKey);
  const raw = template?.template_data && typeof template.template_data === 'object'
    ? template.template_data
    : {};

  const sections = raw.sections || {};

  const mergedSections: Record<string, TemplateSectionContent> = {};
  for (const [key, fb] of Object.entries(fallback.sections)) {
    mergedSections[key] = mergeSectionWithDefaults(fb, sections[key]);
  }
  for (const [key, stored] of Object.entries(sections)) {
    if (isProfessionalTemplate && (key === 'table_of_contents' || key === 'out_of_scope')) {
      continue;
    }
    if (isDastTemplate && ['table_of_contents', 'application_details', 'user_roles', 'tools', 'vulnerabilities'].includes(key)) {
      continue;
    }
    if (!mergedSections[key]) {
      mergedSections[key] = stored as TemplateSectionContent;
    }
  }

  if (isProfessionalTemplate) {
    const scope = mergedSections.scope;
    if (scope?.fields && 'out_of_scope_title' in scope.fields) {
      const { out_of_scope_title, ...rest } = scope.fields as Record<string, string>;
      mergedSections.scope = { ...scope, fields: rest };
    }
  }

  if (isDastTemplate) {
    delete mergedSections.table_of_contents;
    delete mergedSections.application_details;
    delete mergedSections.user_roles;
    delete mergedSections.tools;
    delete mergedSections.vulnerabilities;
  }

  return {
    company_name: raw.company_name || fallback.company_name,
    logo_path: template?.logo_path || raw.logo_path || fallback.logo_path,
    primary_color: raw.primary_color || fallback.primary_color,
    secondary_color: raw.secondary_color || fallback.secondary_color,
    cover_subtitle: raw.cover_subtitle || fallback.cover_subtitle,
    sections: mergedSections,
  };
};

const extractPlainText = (richBody: any): string => {
  if (!richBody) return '';
  if (typeof richBody === 'string') return richBody;
  try {
    const walk = (node: any): string => {
      if (!node) return '';
      if (node.type === 'text') return node.text || '';
      if (node.type === 'paragraph' || node.type === 'heading') {
        return (node.content || []).map(walk).join('');
      }
      if (node.type === 'bulletListItem' || node.type === 'numberedListItem' || node.type === 'listItem') {
        const text = (node.content || []).map(walk).join('');
        return `- ${text}`;
      }
      if (node.type === 'table') {
        const cells: string[] = [];
        for (const row of node.content || []) {
          for (const cell of row.content || []) {
            cells.push((cell.content || []).map(walk).join(''));
          }
        }
        return cells.join(' | ');
      }
      if (Array.isArray(node)) return node.map(walk).join('\n');
      if (Array.isArray(node.content)) return node.content.map(walk).join('\n');
      return '';
    };
    return walk(richBody).trim();
  } catch {
    return '';
  }
};

export const buildTemplatePayload = (template: ReportTemplateRecord, content: ReportTemplateContent) => {
  const templateName = String(template?.name || '').toLowerCase();
  const isProfessionalTemplate = String((template as any)?.template_data?.key || '').toLowerCase() === 'securify'
    || templateName.includes('securify')
    || templateName.includes('professional');
  const isDastTemplate = String((template as any)?.template_data?.key || '').toLowerCase() === 'dast'
    || templateName.includes('dast')
    || templateName.includes('dynamic analysis');
  const composeSectionBody = (section: TemplateSectionContent) => {
    if (section.rich_body) return extractPlainText(section.rich_body);
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

  const syncSections: Record<string, any> = {};
  for (const [key, section] of Object.entries(content.sections)) {
    if (isProfessionalTemplate && (key === 'table_of_contents' || key === 'out_of_scope')) {
      continue;
    }
    if (isDastTemplate && ['table_of_contents', 'application_details', 'user_roles', 'tools', 'vulnerabilities'].includes(key)) {
      continue;
    }
    const synced: any = { ...section };
    if (synced.rich_body && !synced.dynamic) {
      synced.body = extractPlainText(synced.rich_body);
    }
    syncSections[key] = synced;
  }

  const scopeSection = content.sections.scope || {};

  return {
    name: template.name,
    description: template.description || '',
    logo_path: content.logo_path,
    is_default: Boolean(template.is_default),
    confidentiality_text: composeSectionBody(content.sections.confidentiality || { title: '' }),
    introduction_text: composeSectionBody(content.sections.introduction || { title: '' }),
    approach_text: composeSectionBody(content.sections.approach || { title: '' }),
    scope_text: scopeSection.body || '',
    scope_applications: mergeRows((scopeSection as any).application_rows, []),
    scope_user_roles: mergeRows((scopeSection as any).user_role_rows, []),
    scope_tools: mergeRows((scopeSection as any).tool_rows, []),
    appendix_text: composeSectionBody(content.sections.appendix_a || { title: '' }),
    template_data: {
      ...template.template_data,
      company_name: content.company_name,
      logo_path: content.logo_path,
      primary_color: content.primary_color,
      secondary_color: content.secondary_color,
      cover_subtitle: content.cover_subtitle,
      sections: syncSections,
      template_file: template.template_data?.template_file || 'professional-report-template.html',
      docx_template_file: template.template_data?.docx_template_file || 'professional-report-template.docx',
    },
  };
};
