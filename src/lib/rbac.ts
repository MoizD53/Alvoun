export type AppRole = 'FOUNDER' | 'OWNER' | 'DIRECTOR' | 'ACCOUNTANT' | 'ADMIN' | 'SALESMAN' | 'PRODUCTION';

export interface RolePermissions {
  canViewExecutiveCockpit: boolean;
  canViewFinancials: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
  canManageTerritory: boolean;
  canManageCustomers: boolean;
  canRecordPayments: boolean;
  canPerformFieldSales: boolean;
  canExportData: boolean;
  canManageBackups: boolean;
}

export const ROLE_PERMISSIONS: Record<AppRole, RolePermissions> = {
  FOUNDER: {
    canViewExecutiveCockpit: true,
    canViewFinancials: true,
    canViewReports: true,
    canManageUsers: true,
    canManageTerritory: true,
    canManageCustomers: true,
    canRecordPayments: true,
    canPerformFieldSales: true,
    canExportData: true,
    canManageBackups: true,
  },
  OWNER: {
    canViewExecutiveCockpit: true,
    canViewFinancials: true,
    canViewReports: true,
    canManageUsers: true,
    canManageTerritory: true,
    canManageCustomers: true,
    canRecordPayments: true,
    canPerformFieldSales: true,
    canExportData: true,
    canManageBackups: true,
  },
  DIRECTOR: {
    canViewExecutiveCockpit: true,
    canViewFinancials: true,
    canViewReports: true,
    canManageUsers: false,
    canManageTerritory: true,
    canManageCustomers: true,
    canRecordPayments: true,
    canPerformFieldSales: false,
    canExportData: true,
    canManageBackups: true,
  },
  ADMIN: {
    canViewExecutiveCockpit: true,
    canViewFinancials: true,
    canViewReports: true,
    canManageUsers: true,
    canManageTerritory: true,
    canManageCustomers: true,
    canRecordPayments: true,
    canPerformFieldSales: false,
    canExportData: true,
    canManageBackups: true,
  },
  ACCOUNTANT: {
    canViewExecutiveCockpit: false,
    canViewFinancials: true,
    canViewReports: true,
    canManageUsers: false,
    canManageTerritory: false,
    canManageCustomers: true,
    canRecordPayments: true,
    canPerformFieldSales: false,
    canExportData: true,
    canManageBackups: false,
  },
  SALESMAN: {
    canViewExecutiveCockpit: false,
    canViewFinancials: false,
    canViewReports: false,
    canManageUsers: false,
    canManageTerritory: false,
    canManageCustomers: false,
    canRecordPayments: true,
    canPerformFieldSales: true,
    canExportData: false,
    canManageBackups: false,
  },
  PRODUCTION: {
    canViewExecutiveCockpit: false,
    canViewFinancials: false,
    canViewReports: true,
    canManageUsers: false,
    canManageTerritory: false,
    canManageCustomers: false,
    canRecordPayments: false,
    canPerformFieldSales: false,
    canExportData: false,
    canManageBackups: false,
  },
};

export function hasPermission(role: string | undefined | null, permission: keyof RolePermissions): boolean {
  if (!role) return false;
  const normalized = (role.toUpperCase() as AppRole);
  const permissions = ROLE_PERMISSIONS[normalized];
  if (!permissions) return false;
  return !!permissions[permission];
}

export function isExecutiveRole(role: string | undefined | null): boolean {
  if (!role) return false;
  const normalized = role.toUpperCase();
  return ['FOUNDER', 'OWNER', 'DIRECTOR', 'ADMIN'].includes(normalized);
}

export function isFinancialRole(role: string | undefined | null): boolean {
  if (!role) return false;
  const normalized = role.toUpperCase();
  return ['FOUNDER', 'OWNER', 'DIRECTOR', 'ADMIN', 'ACCOUNTANT'].includes(normalized);
}
