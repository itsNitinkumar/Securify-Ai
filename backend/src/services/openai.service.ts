import OpenAI from 'openai';
import { config } from '../config/env';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

const SYSTEM_PROMPT = `You are SecurifyAI, an AI-assisted penetration testing finding generation engine.
Your purpose is to convert technical security evidence into structured, professional vulnerability findings and assist in querying stored findings.

STRICT RULES:
- Always return ONLY valid JSON (no explanations, no markdown, no extra text)
- Never include sensitive data such as passwords, API keys, tokens, or internal IP addresses
- If sensitive data is detected, replace it with "[REDACTED]"
- Do NOT assign or change severity unless explicitly provided by the user
- Do not hallucinate missing technical details
- If evidence is insufficient, explicitly state "Insufficient evidence provided"
- Follow professional cybersecurity reporting standards (OWASP-style tone)

ROLE AWARENESS:
- Analyst: can generate and edit findings
- Reviewer: can review and comment but not generate findings
- Manager: can approve findings and generate reports
- Client: can only view final reports (no internal data)

OUTPUT RULES:
- Output must strictly follow the requested JSON schema
- No additional fields
- No missing required fields`;

interface GenerateFindingInput {
  evidence: string;
  severity: string;
  role: string;
}

interface FindingOutput {
  title: string;
  severity: string;
  description: string;
  affected_target: string;
  likelihood: string;
  impact: string;
  steps_to_reproduce: string[];
  proof_of_concept: string;
  remediation: string;
  references: string[];
}

class OpenAIService {
  static async generateFinding(input: GenerateFindingInput): Promise<FindingOutput> {
    try {
      const userPrompt = `TASK:
Convert the provided penetration testing evidence into a structured vulnerability finding.

INPUT:
Evidence:
${input.evidence}

Severity (provided by tester):
${input.severity}

User Role:
${input.role}

OUTPUT FORMAT (STRICT JSON):
{
  "title": "",
  "severity": "",
  "description": "",
  "affected_target": "",
  "likelihood": "",
  "impact": "",
  "steps_to_reproduce": [],
  "proof_of_concept": "",
  "remediation": "",
  "references": []
}

INSTRUCTIONS:
- Use the severity exactly as provided
- Generate a clear and professional vulnerability title
- Description must explain the issue clearly in a professional tone
- Affected target should identify endpoint, IP, or system if present
- Likelihood should estimate probability of exploitation
- Impact should describe business and technical impact
- Steps to reproduce must be clear, step-by-step, and actionable
- Proof of concept must explain what was done and the result
- Remediation must provide actionable fixes
- References should include relevant standards (e.g., OWASP, CWE) if applicable
- Do NOT assume missing details
- If evidence is incomplete, mention limitations explicitly`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      return JSON.parse(content);
    } catch (error: any) {
      console.error('❌ OpenAI API Error:', error.message);
      
      // Fallback: Generate a basic finding using template
      console.log('⚠️  Using fallback template-based finding generation');
      return this.generateFallbackFinding(input);
    }
  }

  // Fallback method when OpenAI is unavailable
  private static generateFallbackFinding(input: GenerateFindingInput): FindingOutput {
    const evidence = input.evidence;
    const severity = input.severity;

    // Extract key information from evidence
    const hasSQL = /sql|injection|query/i.test(evidence);
    const hasXSS = /xss|cross.?site|script/i.test(evidence);
    const hasAuth = /auth|login|password|session/i.test(evidence);
    const hasRCE = /rce|remote.*exec|command.*injection/i.test(evidence);

    let title = 'Security Vulnerability Identified';
    let description = `A ${severity.toLowerCase()} severity security vulnerability has been identified during penetration testing.\n\nEvidence:\n${evidence}`;
    let remediation = 'Implement security best practices and conduct a thorough security review.';
    let references = ['OWASP Top 10 2021', 'CWE - Common Weakness Enumeration'];

    // Customize based on vulnerability type
    if (hasSQL) {
      title = 'SQL Injection Vulnerability';
      description = `A SQL injection vulnerability has been identified. ${evidence}`;
      remediation = '1. Use parameterized queries or prepared statements\n2. Implement input validation and sanitization\n3. Apply principle of least privilege for database accounts\n4. Use ORM frameworks with built-in protection\n5. Conduct regular security code reviews';
      references = ['OWASP Top 10 - A03:2021 Injection', 'CWE-89: SQL Injection', 'OWASP SQL Injection Prevention Cheat Sheet'];
    } else if (hasXSS) {
      title = 'Cross-Site Scripting (XSS) Vulnerability';
      description = `A cross-site scripting vulnerability has been identified. ${evidence}`;
      remediation = '1. Implement proper output encoding\n2. Use Content Security Policy (CSP)\n3. Validate and sanitize all user inputs\n4. Use modern frameworks with built-in XSS protection\n5. Apply context-aware encoding';
      references = ['OWASP Top 10 - A03:2021 Injection', 'CWE-79: Cross-site Scripting', 'OWASP XSS Prevention Cheat Sheet'];
    } else if (hasAuth) {
      title = 'Authentication/Authorization Vulnerability';
      description = `An authentication or authorization vulnerability has been identified. ${evidence}`;
      remediation = '1. Implement strong authentication mechanisms\n2. Use secure session management\n3. Apply proper access controls\n4. Implement multi-factor authentication\n5. Regular security audits of authentication logic';
      references = ['OWASP Top 10 - A07:2021 Identification and Authentication Failures', 'CWE-287: Improper Authentication'];
    } else if (hasRCE) {
      title = 'Remote Code Execution Vulnerability';
      description = `A remote code execution vulnerability has been identified. ${evidence}`;
      remediation = '1. Validate and sanitize all user inputs\n2. Avoid using dangerous functions\n3. Implement proper input validation\n4. Use sandboxing and containerization\n5. Apply principle of least privilege';
      references = ['OWASP Top 10 - A03:2021 Injection', 'CWE-78: OS Command Injection', 'CWE-94: Code Injection'];
    }

    return {
      title,
      severity,
      description,
      affected_target: 'See evidence for details',
      likelihood: severity === 'Critical' || severity === 'High' ? 'High' : 'Medium',
      impact: `${severity} impact - Could lead to unauthorized access, data breach, or system compromise.`,
      steps_to_reproduce: [
        'Review the provided evidence',
        'Attempt to reproduce the vulnerability in a controlled environment',
        'Document the exact steps and payloads used',
        'Verify the impact and scope of the vulnerability'
      ],
      proof_of_concept: evidence,
      remediation,
      references,
    };
  }

  static async regenerateSection(
    sectionName: string,
    existingFinding: any
  ): Promise<{ [key: string]: any }> {
    const userPrompt = `TASK:
Regenerate ONLY the specified section of the vulnerability finding.

SECTION TO REGENERATE:
${sectionName}

EXISTING FINDING:
${JSON.stringify(existingFinding, null, 2)}

OUTPUT FORMAT (STRICT JSON):
{
  "${sectionName}": ""
}

INSTRUCTIONS:
- Only modify the requested section
- Keep consistency with the rest of the finding
- Maintain professional cybersecurity language
- Do not modify any other fields`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(content);
  }

  static async naturalLanguageQuery(
    userQuery: string,
    role: string,
    userId: number
  ): Promise<any> {
    const userPrompt = `TASK:
Convert the natural language query into structured filters for retrieving findings.

DATABASE:
Table: findings
Columns:
- id
- title
- severity
- project_name
- created_at
- approved_by
- created_by
- tags

USER ROLE:
${role}

USER ID:
${userId}

QUERY:
"${userQuery}"

OUTPUT FORMAT (STRICT JSON):
{
  "filters": {
    "severity": "",
    "project_name": "",
    "date_range": "",
    "tags": "",
    "approved_by": "",
    "created_by": ""
  },
  "aggregation": "",
  "group_by": ""
}

INSTRUCTIONS:
- Extract intent from the query
- Map values only to available columns
- Leave fields empty if not applicable
- date_range can be: "last_week", "last_month", "last_year"
- aggregation can be: "count", "none"
- group_by must be a valid column name

ACCESS CONTROL RULES:
- If role is "client", restrict results to their own project only
- If role is "analyst", restrict results to findings created by them
- If role is "manager", allow full access
- Do NOT generate SQL
- Do NOT include explanations`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(content);
  }
}

export default OpenAIService;
