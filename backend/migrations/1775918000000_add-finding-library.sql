-- Up Migration
-- Drop table if exists (in case of failed previous migration)
DROP TABLE IF EXISTS finding_library CASCADE;

-- Create finding library table
CREATE TABLE finding_library (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL CHECK (severity IN ('Critical', 'High', 'Medium', 'Low', 'Informational')),
  description TEXT NOT NULL,
  affected_component TEXT,
  likelihood TEXT NOT NULL,
  impact TEXT NOT NULL,
  steps_to_reproduce TEXT,
  remediation TEXT NOT NULL,
  reference_links TEXT[],
  owasp_category VARCHAR(100),
  cwe_id VARCHAR(50),
  cvss_score DECIMAL(3,1),
  is_public BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_finding_library_category ON finding_library(category);
CREATE INDEX idx_finding_library_severity ON finding_library(severity);
CREATE INDEX idx_finding_library_public ON finding_library(is_public);

-- Insert common vulnerability templates
INSERT INTO finding_library (title, category, severity, description, likelihood, impact, steps_to_reproduce, remediation, reference_links, owasp_category, cwe_id, cvss_score) VALUES
(
  'SQL Injection',
  'Injection',
  'Critical',
  'The application is vulnerable to SQL injection attacks. An attacker can manipulate SQL queries by injecting malicious SQL code through user input fields. This allows unauthorized access to the database, data exfiltration, modification, or deletion of data.',
  'High - SQL injection vulnerabilities are commonly found in web applications that do not properly sanitize user input before using it in SQL queries.',
  'High - Successful exploitation can lead to complete database compromise, unauthorized data access, data manipulation, authentication bypass, and potential server takeover.',
  '1. Identify input fields that interact with the database\n2. Inject SQL metacharacters (e.g., single quote '')\n3. Observe error messages or unexpected behavior\n4. Craft SQL injection payloads to extract data\n5. Use tools like SQLMap for automated exploitation',
  '1. Use parameterized queries (prepared statements) for all database operations\n2. Implement input validation and sanitization\n3. Apply principle of least privilege for database accounts\n4. Use ORM frameworks that handle SQL escaping\n5. Implement Web Application Firewall (WAF)\n6. Regular security testing and code reviews',
  ARRAY['https://owasp.org/www-community/attacks/SQL_Injection', 'https://cwe.mitre.org/data/definitions/89.html', 'https://portswigger.net/web-security/sql-injection'],
  'A03:2021 - Injection',
  'CWE-89',
  9.8
),
(
  'Cross-Site Scripting (XSS)',
  'Injection',
  'High',
  'The application is vulnerable to Cross-Site Scripting (XSS) attacks. Attackers can inject malicious JavaScript code that executes in the context of other users'' browsers. This can lead to session hijacking, credential theft, and unauthorized actions.',
  'High - XSS vulnerabilities are prevalent in web applications that display user-generated content without proper encoding.',
  'High - Successful exploitation can result in session hijacking, credential theft, malware distribution, website defacement, and unauthorized actions on behalf of victims.',
  '1. Identify input fields that reflect user input\n2. Inject XSS payloads (e.g., <script>alert(1)</script>)\n3. Observe if the script executes in the browser\n4. Test various XSS vectors and encoding techniques\n5. Verify impact by stealing cookies or performing actions',
  '1. Implement context-aware output encoding for all user input\n2. Use Content Security Policy (CSP) headers\n3. Sanitize HTML input using trusted libraries\n4. Set HttpOnly and Secure flags on cookies\n5. Implement input validation\n6. Use modern frameworks with built-in XSS protection',
  ARRAY['https://owasp.org/www-community/attacks/xss/', 'https://cwe.mitre.org/data/definitions/79.html', 'https://portswigger.net/web-security/cross-site-scripting'],
  'A03:2021 - Injection',
  'CWE-79',
  7.1
),
(
  'Broken Authentication',
  'Authentication',
  'Critical',
  'The application has weak authentication mechanisms that can be exploited to gain unauthorized access. This includes weak password policies, lack of multi-factor authentication, session fixation, or predictable session tokens.',
  'Medium - Authentication vulnerabilities require specific conditions but are actively targeted by attackers.',
  'Critical - Successful exploitation leads to complete account takeover, unauthorized access to sensitive data, and potential lateral movement within the system.',
  '1. Test password complexity requirements\n2. Attempt brute force attacks on login\n3. Test session management (fixation, hijacking)\n4. Check for account enumeration\n5. Test password reset functionality\n6. Verify MFA implementation',
  '1. Implement strong password policies (minimum 12 characters)\n2. Enable multi-factor authentication (MFA)\n3. Use secure session management\n4. Implement account lockout after failed attempts\n5. Use secure password reset mechanisms\n6. Implement rate limiting on authentication endpoints',
  ARRAY['https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/', 'https://cwe.mitre.org/data/definitions/287.html'],
  'A07:2021 - Identification and Authentication Failures',
  'CWE-287',
  8.1
),
(
  'Insecure Direct Object Reference (IDOR)',
  'Access Control',
  'High',
  'The application exposes direct references to internal objects (e.g., database keys, filenames) without proper authorization checks. Attackers can manipulate these references to access unauthorized data or functionality.',
  'High - IDOR vulnerabilities are common in applications that use predictable identifiers without authorization checks.',
  'High - Attackers can access, modify, or delete data belonging to other users, leading to data breaches and privacy violations.',
  '1. Identify endpoints with object references (IDs)\n2. Authenticate as a low-privilege user\n3. Capture requests containing object references\n4. Modify the object ID to access other users'' data\n5. Verify unauthorized access is granted',
  '1. Implement proper authorization checks for all object access\n2. Use indirect references (UUIDs instead of sequential IDs)\n3. Validate user permissions before granting access\n4. Implement access control lists (ACLs)\n5. Log and monitor access attempts',
  ARRAY['https://owasp.org/www-community/Broken_Access_Control', 'https://cwe.mitre.org/data/definitions/639.html', 'https://portswigger.net/web-security/access-control/idor'],
  'A01:2021 - Broken Access Control',
  'CWE-639',
  7.5
),
(
  'Cross-Site Request Forgery (CSRF)',
  'Access Control',
  'Medium',
  'The application does not properly validate the origin of requests, allowing attackers to trick authenticated users into performing unintended actions. This can lead to unauthorized state changes, data modification, or privilege escalation.',
  'Medium - CSRF attacks require user interaction but can be easily automated through phishing or malicious websites.',
  'Medium - Attackers can perform actions on behalf of authenticated users, including changing passwords, transferring funds, or modifying account settings.',
  '1. Identify state-changing operations (POST, PUT, DELETE)\n2. Check for CSRF tokens in requests\n3. Create a malicious HTML page with forged requests\n4. Trick an authenticated user to visit the page\n5. Verify if the action is executed',
  '1. Implement CSRF tokens for all state-changing operations\n2. Use SameSite cookie attribute\n3. Verify Origin and Referer headers\n4. Implement re-authentication for sensitive actions\n5. Use framework-provided CSRF protection',
  ARRAY['https://owasp.org/www-community/attacks/csrf', 'https://cwe.mitre.org/data/definitions/352.html', 'https://portswigger.net/web-security/csrf'],
  'A01:2021 - Broken Access Control',
  'CWE-352',
  6.5
),
(
  'Sensitive Data Exposure',
  'Data Protection',
  'High',
  'The application transmits or stores sensitive data without adequate protection. This includes unencrypted communications, weak encryption algorithms, or improper key management.',
  'Medium - Sensitive data exposure requires network access or database compromise but is a common target.',
  'High - Exposure of sensitive data can lead to identity theft, financial fraud, privacy violations, and regulatory non-compliance.',
  '1. Intercept network traffic using proxy tools\n2. Check if sensitive data is transmitted over HTTP\n3. Analyze encryption algorithms and key strength\n4. Test for sensitive data in logs or error messages\n5. Check database encryption at rest',
  '1. Use TLS 1.2+ for all data transmission\n2. Encrypt sensitive data at rest\n3. Implement proper key management\n4. Remove sensitive data from logs and error messages\n5. Use strong encryption algorithms (AES-256)\n6. Implement data classification and handling policies',
  ARRAY['https://owasp.org/Top10/A02_2021-Cryptographic_Failures/', 'https://cwe.mitre.org/data/definitions/311.html'],
  'A02:2021 - Cryptographic Failures',
  'CWE-311',
  7.4
),
(
  'XML External Entity (XXE) Injection',
  'Injection',
  'High',
  'The application parses XML input without disabling external entity processing. Attackers can exploit this to read local files, perform SSRF attacks, or cause denial of service.',
  'Medium - XXE vulnerabilities exist in applications that process XML input without proper configuration.',
  'High - Successful exploitation can lead to file disclosure, SSRF, denial of service, and potential remote code execution.',
  '1. Identify XML input processing endpoints\n2. Inject XXE payloads to read local files\n3. Test for SSRF by referencing external URLs\n4. Attempt to cause DoS with billion laughs attack\n5. Verify data exfiltration',
  '1. Disable external entity processing in XML parsers\n2. Use less complex data formats (JSON)\n3. Implement input validation\n4. Update XML processing libraries\n5. Use XML schemas for validation\n6. Implement least privilege for application accounts',
  ARRAY['https://owasp.org/www-community/vulnerabilities/XML_External_Entity_(XXE)_Processing', 'https://cwe.mitre.org/data/definitions/611.html', 'https://portswigger.net/web-security/xxe'],
  'A03:2021 - Injection',
  'CWE-611',
  8.2
),
(
  'Security Misconfiguration',
  'Configuration',
  'Medium',
  'The application or server is not properly configured, leaving it vulnerable to attacks. This includes default credentials, unnecessary services, verbose error messages, or missing security headers.',
  'High - Security misconfigurations are extremely common and easily exploitable.',
  'Medium - Impact varies but can include unauthorized access, information disclosure, and system compromise.',
  '1. Scan for default credentials\n2. Check for unnecessary services and ports\n3. Test for verbose error messages\n4. Verify security headers (CSP, HSTS, etc.)\n5. Check for directory listing\n6. Test for outdated software versions',
  '1. Implement secure configuration baselines\n2. Remove default accounts and credentials\n3. Disable unnecessary services and features\n4. Implement proper error handling\n5. Configure security headers\n6. Regular security audits and updates\n7. Use automated configuration management',
  ARRAY['https://owasp.org/Top10/A05_2021-Security_Misconfiguration/', 'https://cwe.mitre.org/data/definitions/16.html'],
  'A05:2021 - Security Misconfiguration',
  'CWE-16',
  6.5
),
(
  'Insecure Deserialization',
  'Injection',
  'Critical',
  'The application deserializes untrusted data without proper validation. Attackers can exploit this to execute arbitrary code, perform injection attacks, or cause denial of service.',
  'Low - Exploitation requires specific conditions and technical expertise.',
  'Critical - Successful exploitation can lead to remote code execution and complete system compromise.',
  '1. Identify deserialization endpoints\n2. Analyze serialization format (Java, Python, PHP)\n3. Craft malicious serialized objects\n4. Test for code execution or injection\n5. Verify impact',
  '1. Avoid deserializing untrusted data\n2. Implement integrity checks (HMAC)\n3. Use safe deserialization libraries\n4. Implement strict type constraints\n5. Run deserialization in low-privilege environments\n6. Monitor and log deserialization activities',
  ARRAY['https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/', 'https://cwe.mitre.org/data/definitions/502.html', 'https://portswigger.net/web-security/deserialization'],
  'A08:2021 - Software and Data Integrity Failures',
  'CWE-502',
  9.8
),
(
  'Using Components with Known Vulnerabilities',
  'Dependencies',
  'High',
  'The application uses third-party libraries, frameworks, or components with known security vulnerabilities. Attackers can exploit these vulnerabilities to compromise the application.',
  'High - Vulnerable components are actively scanned and exploited by attackers.',
  'High - Impact depends on the vulnerability but can range from information disclosure to remote code execution.',
  '1. Identify application dependencies\n2. Check versions against vulnerability databases\n3. Use automated scanning tools (npm audit, OWASP Dependency-Check)\n4. Test for known exploits\n5. Verify exploitability',
  '1. Maintain inventory of all components\n2. Regularly update dependencies\n3. Remove unused dependencies\n4. Use automated vulnerability scanning\n5. Subscribe to security advisories\n6. Implement Software Composition Analysis (SCA)\n7. Use dependency management tools',
  ARRAY['https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/', 'https://cwe.mitre.org/data/definitions/1035.html'],
  'A06:2021 - Vulnerable and Outdated Components',
  'CWE-1035',
  7.3
);

-- Down Migration
-- DROP TABLE IF EXISTS finding_library CASCADE;
