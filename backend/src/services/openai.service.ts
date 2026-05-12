// import OpenAI from 'openai';
// import { config } from '../config/env';

// const openai = new OpenAI({
//   apiKey: config.openai.apiKey,
// });

// const SYSTEM_PROMPT = `You are SecurifyAI, an AI-assisted penetration testing finding generation engine.
// Your purpose is to convert technical security evidence into structured, professional vulnerability findings and assist in querying stored findings.

// STRICT RULES:
// - Always return ONLY valid JSON (no explanations, no markdown, no extra text)
// - Never include sensitive data such as passwords, API keys, tokens, or internal IP addresses
// - If sensitive data is detected, replace it with "[REDACTED]"
// - Do NOT assign or change severity unless explicitly provided by the user
// - Do not hallucinate missing technical details
// - If evidence is insufficient, explicitly state "Insufficient evidence provided"
// - Follow professional cybersecurity reporting standards (OWASP-style tone)

// ROLE AWARENESS:
// - Analyst: can generate and edit findings
// - Reviewer: can review and comment but not generate findings
// - Manager: can approve findings and generate reports
// - Client: can only view final reports (no internal data)

// OUTPUT RULES:
// - Output must strictly follow the requested JSON schema
// - No additional fields
// - No missing required fields`;

// interface GenerateFindingInput {
//   evidence: string;
//   severity: string;
//   role: string;
// }

// interface FindingOutput {
//   title: string;
//   severity: string;
//   description: string;
//   affected_target: string;
//   likelihood: string;
//   impact: string;
//   steps_to_reproduce: string[];
//   proof_of_concept: string;
//   remediation: string;
//   references: string[];
// }

// class OpenAIService {
//   static async generateFinding(input: GenerateFindingInput): Promise<FindingOutput> {
//     try {
//       const userPrompt = `TASK:
// Convert the provided penetration testing evidence into a structured vulnerability finding.

// INPUT:
// Evidence:
// ${input.evidence}

// Severity (provided by tester):
// ${input.severity}

// User Role:
// ${input.role}

// OUTPUT FORMAT (STRICT JSON):
// {
//   "title": "",
//   "severity": "",
//   "description": "",
//   "affected_target": "",
//   "likelihood": "",
//   "impact": "",
//   "steps_to_reproduce": [],
//   "proof_of_concept": "",
//   "remediation": "",
//   "references": []
// }

// INSTRUCTIONS:
// - Use the severity exactly as provided
// - Generate a clear and professional vulnerability title
// - Description must explain the issue clearly in a professional tone
// - Affected target should identify endpoint, IP, or system if present
// - Likelihood should estimate probability of exploitation
// - Impact should describe business and technical impact
// - Steps to reproduce must be clear, step-by-step, and actionable
// - Proof of concept must explain what was done and the result
// - Remediation must provide actionable fixes
// - References should include relevant standards (e.g., OWASP, CWE) if applicable
// - Do NOT assume missing details
// - If evidence is incomplete, mention limitations explicitly`;

//       const response = await openai.chat.completions.create({
//         model: 'gpt-4o-mini',
//         messages: [
//           { role: 'system', content: SYSTEM_PROMPT },
//           { role: 'user', content: userPrompt },
//         ],
//         temperature: 0.3,
//         response_format: { type: 'json_object' },
//       });

//       const content = response.choices[0].message.content;
//       if (!content) {
//         throw new Error('No response from OpenAI');
//       }

//       return JSON.parse(content);
//     } catch (error: any) {
//       console.error('❌ OpenAI API Error:', error.message);
      
//       // Fallback: Generate a basic finding using template
//       console.log('⚠️  Using fallback template-based finding generation');
//       return this.generateFallbackFinding(input);
//     }
//   }

//   // Fallback method when OpenAI is unavailable
//   private static generateFallbackFinding(input: GenerateFindingInput): FindingOutput {
//     const evidence = input.evidence;
//     const severity = input.severity;

//     // Extract key information from evidence
//     const hasSQL = /sql|injection|query/i.test(evidence);
//     const hasXSS = /xss|cross.?site|script/i.test(evidence);
//     const hasAuth = /auth|login|password|session/i.test(evidence);
//     const hasRCE = /rce|remote.*exec|command.*injection/i.test(evidence);

//     let title = 'Security Vulnerability Identified';
//     let description = `A ${severity.toLowerCase()} severity security vulnerability has been identified during penetration testing.\n\nEvidence:\n${evidence}`;
//     let remediation = 'Implement security best practices and conduct a thorough security review.';
//     let references = ['OWASP Top 10 2021', 'CWE - Common Weakness Enumeration'];

//     // Customize based on vulnerability type
//     if (hasSQL) {
//       title = 'SQL Injection Vulnerability';
//       description = `A SQL injection vulnerability has been identified. ${evidence}`;
//       remediation = '1. Use parameterized queries or prepared statements\n2. Implement input validation and sanitization\n3. Apply principle of least privilege for database accounts\n4. Use ORM frameworks with built-in protection\n5. Conduct regular security code reviews';
//       references = ['OWASP Top 10 - A03:2021 Injection', 'CWE-89: SQL Injection', 'OWASP SQL Injection Prevention Cheat Sheet'];
//     } else if (hasXSS) {
//       title = 'Cross-Site Scripting (XSS) Vulnerability';
//       description = `A cross-site scripting vulnerability has been identified. ${evidence}`;
//       remediation = '1. Implement proper output encoding\n2. Use Content Security Policy (CSP)\n3. Validate and sanitize all user inputs\n4. Use modern frameworks with built-in XSS protection\n5. Apply context-aware encoding';
//       references = ['OWASP Top 10 - A03:2021 Injection', 'CWE-79: Cross-site Scripting', 'OWASP XSS Prevention Cheat Sheet'];
//     } else if (hasAuth) {
//       title = 'Authentication/Authorization Vulnerability';
//       description = `An authentication or authorization vulnerability has been identified. ${evidence}`;
//       remediation = '1. Implement strong authentication mechanisms\n2. Use secure session management\n3. Apply proper access controls\n4. Implement multi-factor authentication\n5. Regular security audits of authentication logic';
//       references = ['OWASP Top 10 - A07:2021 Identification and Authentication Failures', 'CWE-287: Improper Authentication'];
//     } else if (hasRCE) {
//       title = 'Remote Code Execution Vulnerability';
//       description = `A remote code execution vulnerability has been identified. ${evidence}`;
//       remediation = '1. Validate and sanitize all user inputs\n2. Avoid using dangerous functions\n3. Implement proper input validation\n4. Use sandboxing and containerization\n5. Apply principle of least privilege';
//       references = ['OWASP Top 10 - A03:2021 Injection', 'CWE-78: OS Command Injection', 'CWE-94: Code Injection'];
//     }

//     return {
//       title,
//       severity,
//       description,
//       affected_target: 'See evidence for details',
//       likelihood: severity === 'Critical' || severity === 'High' ? 'High' : 'Medium',
//       impact: `${severity} impact - Could lead to unauthorized access, data breach, or system compromise.`,
//       steps_to_reproduce: [
//         'Review the provided evidence',
//         'Attempt to reproduce the vulnerability in a controlled environment',
//         'Document the exact steps and payloads used',
//         'Verify the impact and scope of the vulnerability'
//       ],
//       proof_of_concept: evidence,
//       remediation,
//       references,
//     };
//   }

//   static async regenerateSection(
//     sectionName: string,
//     existingFinding: any
//   ): Promise<{ [key: string]: any }> {
//     const userPrompt = `TASK:
// Regenerate ONLY the specified section of the vulnerability finding.

// SECTION TO REGENERATE:
// ${sectionName}

// EXISTING FINDING:
// ${JSON.stringify(existingFinding, null, 2)}

// OUTPUT FORMAT (STRICT JSON):
// {
//   "${sectionName}": ""
// }

// INSTRUCTIONS:
// - Only modify the requested section
// - Keep consistency with the rest of the finding
// - Maintain professional cybersecurity language
// - Do not modify any other fields`;

//     const response = await openai.chat.completions.create({
//       model: 'gpt-4o-mini',
//       messages: [
//         { role: 'system', content: SYSTEM_PROMPT },
//         { role: 'user', content: userPrompt },
//       ],
//       temperature: 0.3,
//       response_format: { type: 'json_object' },
//     });

//     const content = response.choices[0].message.content;
//     if (!content) {
//       throw new Error('No response from OpenAI');
//     }

//     return JSON.parse(content);
//   }

//   static async naturalLanguageQuery(
//     userQuery: string,
//     role: string,
//     userId: number
//   ): Promise<any> {
//     const userPrompt = `TASK:
// Convert the natural language query into structured filters for retrieving findings.

// DATABASE:
// Table: findings
// Columns:
// - id
// - title
// - severity
// - project_name
// - created_at
// - approved_by
// - created_by
// - tags

// USER ROLE:
// ${role}

// USER ID:
// ${userId}

// QUERY:
// "${userQuery}"

// OUTPUT FORMAT (STRICT JSON):
// {
//   "filters": {
//     "severity": "",
//     "project_name": "",
//     "date_range": "",
//     "tags": "",
//     "approved_by": "",
//     "created_by": ""
//   },
//   "aggregation": "",
//   "group_by": ""
// }

// INSTRUCTIONS:
// - Extract intent from the query
// - Map values only to available columns
// - Leave fields empty if not applicable
// - date_range can be: "last_week", "last_month", "last_year"
// - aggregation can be: "count", "none"
// - group_by must be a valid column name

// ACCESS CONTROL RULES:
// - If role is "client", restrict results to their own project only
// - If role is "analyst", restrict results to findings created by them
// - If role is "manager", allow full access
// - Do NOT generate SQL
// - Do NOT include explanations`;

//     const response = await openai.chat.completions.create({
//       model: 'gpt-4o-mini',
//       messages: [
//         { role: 'system', content: SYSTEM_PROMPT },
//         { role: 'user', content: userPrompt },
//       ],
//       temperature: 0.3,
//       response_format: { type: 'json_object' },
//     });

//     const content = response.choices[0].message.content;
//     if (!content) {
//       throw new Error('No response from OpenAI');
//     }

//     return JSON.parse(content);
//   }
// }

// export default OpenAIService;
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env';

// Initialize the Gemini client
const genAI = new GoogleGenerativeAI(config.gemini.apikey);

const SYSTEM_PROMPT = `You are SecurifyAI, a professional penetration testing finding generation engine used in VAPT engagements, bug bounty reporting, and security assessments.

Your task is to convert raw vulnerability evidence into structured, professional security findings suitable for client reports and vulnerability disclosure submissions.

You behave like a deterministic report generator, not a conversational assistant.

STRICT RULES:
1. Always return ONLY valid JSON.
2. Never include markdown, explanations, comments, or additional text.
3. Do NOT modify, infer, or change severity unless explicitly provided.
4. Do NOT hallucinate technical details not present in the evidence.
5. If a field cannot be confidently determined from the evidence, return "unknown".
6. Follow professional penetration testing report writing standards.
7. Maintain neutral and objective security language.
8. Do not include speculative attacks.
9. Output must match the JSON schema exactly.
10. Do not add or remove fields.

WRITING GUIDELINES:

Title:
- Concise vulnerability name
- Example: "Missing DMARC Record Allows Email Spoofing"

Description:
- Explain the vulnerability clearly
- Include how the issue occurs technically
- Avoid exaggeration

Affected Target:
- Extract host/domain/API endpoint if present in evidence
- If unclear return "unknown"

Likelihood:
- Provide a severity rating: "High", "Medium", or "Low"
- One paragraph explaining how feasible exploitation is
- Use technical reasoning

Impact:
- Provide a severity rating: "High", "Medium", or "Low"
- One paragraph explaining potential consequences
- Focus on security/business risk

Steps to Reproduce:
- Provide clear step-by-step exploitation process
- Each step must be an object with stepNumber, description, image (empty string), and caption (empty string)
- Steps will be numbered automatically
- Format: [{"stepNumber": 1, "description": "Log in to the portal", "image": "", "caption": ""}, ...]

Recommendation:
- Provide actionable remediation steps as an array of strings
- Each item should be a clear, concise recommendation
- Use bold text for category headers (e.g., "**Restrict Access:**")
- Include specific technical guidance
- Format: ["**Category:** Description", "**Another Category:** Description", "**Input Validation:** Description"]

References:
- Only well known security references if applicable
  - OWASP
  - RFC
  - Vendor documentation
- If none are clearly relevant return an empty array

OUTPUT FORMAT:
{
  "title": "string",
  "severity": "string",
  "description": "string",
  "affected_target": "string",
  "likelihood": {
    "severity": "High|Medium|Low",
    "detail": "string (one paragraph)"
  },
  "impact": {
    "severity": "High|Medium|Low",
    "detail": "string (one paragraph)"
  },
  "steps_to_reproduce": [
    {
      "stepNumber": 1,
      "description": "Log in to the portal",
      "image": "",
      "caption": ""
    },
    {
      "stepNumber": 2,
      "description": "Navigate to the endpoint",
      "image": "",
      "caption": ""
    }
  ],
  "recommendation": ["**Category:** description", "**Another Category:** description"],
  "references": ["url"]
}`;

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
  likelihood: {
    severity: string;
    detail: string;
  };
  impact: {
    severity: string;
    detail: string;
  };
  steps_to_reproduce: Array<{
    stepNumber: number;
    description: string;
    image: string;
    caption: string;
  }>;
  recommendation: string[];
  references: string[];
}

class GeminiService {
  // Helper to get the configured model with strict JSON and System Instructions
  private static getModel() {
    return genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });
  }

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
  "likelihood": {
    "severity": "High|Medium|Low",
    "detail": ""
  },
  "impact": {
    "severity": "High|Medium|Low",
    "detail": ""
  },
  "steps_to_reproduce": [
    {
      "stepNumber": 1,
      "description": "Step description here",
      "image": "",
      "caption": ""
    }
  ],
  "recommendation": [],
  "references": []
}

INSTRUCTIONS:
- Use the severity exactly as provided
- Generate a clear and professional vulnerability title
- Description must explain the issue clearly in a professional tone
- Affected target should identify endpoint, IP, or system if present
- Likelihood must include both severity rating (High/Medium/Low) and detailed explanation
- Impact must include both severity rating (High/Medium/Low) and detailed explanation
- Steps to reproduce: provide clear step objects with stepNumber, description, empty image, and empty caption
- Recommendation must be an array of actionable bullet points with bold category headers (e.g., "**Restrict Access:** Description")
- References should include relevant standards (e.g., OWASP, CWE) if applicable
- Do NOT assume missing details
- If evidence is incomplete, mention limitations explicitly`;

      const model = this.getModel();
      const result = await model.generateContent(userPrompt);
      const content = result.response.text();

      if (!content) {
        throw new Error('No response from Gemini');
      }

      return JSON.parse(content);
    } catch (error: any) {
      console.error('❌ Gemini API Error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      });
      
      // Fallback: Generate a basic finding using template
      console.log('⚠️  Using fallback template-based finding generation');
      return this.generateFallbackFinding(input);
    }
  }

  // Fallback method when Gemini is unavailable
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
    let recommendation = [
      '**Security Review:** Implement security best practices and conduct a thorough security review.',
      '**Code Analysis:** Review the affected code for security vulnerabilities.',
      '**Testing:** Perform comprehensive security testing.'
    ];
    let references = ['OWASP Top 10 2021', 'CWE - Common Weakness Enumeration'];

    // Customize based on vulnerability type
    if (hasSQL) {
      title = 'SQL Injection Vulnerability';
      description = `A SQL injection vulnerability has been identified. ${evidence}`;
      recommendation = [
        '**Use Parameterized Queries:** Implement parameterized queries or prepared statements',
        '**Input Validation:** Implement input validation and sanitization',
        '**Least Privilege:** Apply principle of least privilege for database accounts',
        '**ORM Frameworks:** Use ORM frameworks with built-in protection',
        '**Code Reviews:** Conduct regular security code reviews'
      ];
      references = ['OWASP Top 10 - A03:2021 Injection', 'CWE-89: SQL Injection', 'OWASP SQL Injection Prevention Cheat Sheet'];
    } else if (hasXSS) {
      title = 'Cross-Site Scripting (XSS) Vulnerability';
      description = `A cross-site scripting vulnerability has been identified. ${evidence}`;
      recommendation = [
        '**Output Encoding:** Implement proper output encoding',
        '**Content Security Policy:** Use Content Security Policy (CSP)',
        '**Input Validation:** Validate and sanitize all user inputs',
        '**Framework Protection:** Use modern frameworks with built-in XSS protection',
        '**Context-Aware Encoding:** Apply context-aware encoding'
      ];
      references = ['OWASP Top 10 - A03:2021 Injection', 'CWE-79: Cross-site Scripting', 'OWASP XSS Prevention Cheat Sheet'];
    } else if (hasAuth) {
      title = 'Authentication/Authorization Vulnerability';
      description = `An authentication or authorization vulnerability has been identified. ${evidence}`;
      recommendation = [
        '**Strong Authentication:** Implement strong authentication mechanisms',
        '**Session Management:** Use secure session management',
        '**Access Controls:** Apply proper access controls',
        '**Multi-Factor Authentication:** Implement multi-factor authentication',
        '**Security Audits:** Regular security audits of authentication logic'
      ];
      references = ['OWASP Top 10 - A07:2021 Identification and Authentication Failures', 'CWE-287: Improper Authentication'];
    } else if (hasRCE) {
      title = 'Remote Code Execution Vulnerability';
      description = `A remote code execution vulnerability has been identified. ${evidence}`;
      recommendation = [
        '**Input Validation:** Validate and sanitize all user inputs',
        '**Avoid Dangerous Functions:** Avoid using dangerous functions',
        '**Input Validation:** Implement proper input validation',
        '**Sandboxing:** Use sandboxing and containerization',
        '**Least Privilege:** Apply principle of least privilege'
      ];
      references = ['OWASP Top 10 - A03:2021 Injection', 'CWE-78: OS Command Injection', 'CWE-94: Code Injection'];
    }

    return {
      title,
      severity,
      description,
      affected_target: 'See evidence for details',
      likelihood: {
        severity: severity === 'Critical' || severity === 'High' ? 'High' : 'Medium',
        detail: 'The likelihood of exploitation depends on the specific vulnerability type and attack surface exposure. Further analysis is recommended.'
      },
      impact: {
        severity: severity === 'Critical' || severity === 'High' ? 'High' : 'Medium',
        detail: `${severity} impact - Could lead to unauthorized access, data breach, or system compromise.`
      },
      steps_to_reproduce: [
        { stepNumber: 1, description: 'Review the provided evidence', image: '', caption: '' },
        { stepNumber: 2, description: 'Attempt to reproduce the vulnerability in a controlled environment', image: '', caption: '' },
        { stepNumber: 3, description: 'Document the exact steps and payloads used', image: '', caption: '' },
        { stepNumber: 4, description: 'Verify the impact and scope of the vulnerability', image: '', caption: '' }
      ],
      recommendation,
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

    const model = this.getModel();
    const result = await model.generateContent(userPrompt);
    const content = result.response.text();

    if (!content) {
      throw new Error('No response from Gemini');
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

    const model = this.getModel();
    const result = await model.generateContent(userPrompt);
    const content = result.response.text();

    if (!content) {
      throw new Error('No response from Gemini');
    }

    return JSON.parse(content);
  }
}

// Export as default (can be imported as OpenAIService for backward compatibility)
export default GeminiService;