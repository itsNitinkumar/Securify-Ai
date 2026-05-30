import type { ReportTemplateKey } from './registry';

export interface SectionConfig {
  enabled: boolean;
  label: string;
}

export interface ProjectFieldConfig {
  applicationDetails: SectionConfig;
  userRoles: SectionConfig;
  outOfScopeEndpoints: SectionConfig;
  domains: SectionConfig;
}

export const projectTemplateFieldConfig: Record<ReportTemplateKey, ProjectFieldConfig> = {
  securify: {
    applicationDetails: { enabled: true, label: 'Application Details' },
    userRoles: { enabled: true, label: 'User Roles' },
    outOfScopeEndpoints: { enabled: true, label: 'Out of Scope Endpoints' },
    domains: { enabled: false, label: 'Domains' },
  },
  blueally: {
    applicationDetails: { enabled: false, label: 'Application Details' },
    userRoles: { enabled: false, label: 'User Roles' },
    outOfScopeEndpoints: { enabled: false, label: 'Out of Scope Endpoints' },
    domains: { enabled: true, label: 'Domains' },
  },
  dast: {
    applicationDetails: { enabled: true, label: 'Application Details' },
    userRoles: { enabled: true, label: 'User Roles' },
    outOfScopeEndpoints: { enabled: true, label: 'Out of Scope Endpoints' },
    domains: { enabled: false, label: 'Domains' },
  },
  unknown: {
    applicationDetails: { enabled: true, label: 'Application Details' },
    userRoles: { enabled: true, label: 'User Roles' },
    outOfScopeEndpoints: { enabled: true, label: 'Out of Scope Endpoints' },
    domains: { enabled: false, label: 'Domains' },
  },
};
