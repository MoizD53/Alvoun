export type AppRole = 
  | 'FOUNDER' 
  | 'OWNER' 
  | 'DIRECTOR' 
  | 'ACCOUNTANT' 
  | 'ADMIN' 
  | 'SALESMAN' 
  | 'PRODUCTION'
  | 'FOUNDER_CEO'
  | 'SYSTEM_ADMIN'
  | 'OPERATIONS_STAFF';

export type CanonicalRole = 
  | 'FOUNDER_CEO'       // Role 1: Founder & CEO / System Admin (Combined)
  | 'DIRECTOR'          // Role 2: Director (Business Oversight)
  | 'OPERATIONS_STAFF'  // Role 3: Accountant / Production Staff (Combined)
  | 'SALESMAN';         // Role 4: Salesman (Field Operations)

/**
 * Normalizes any legacy or variant role string to one of the final four canonical roles.
 */
export function normalizeRole(role?: string | null): CanonicalRole {
  if (!role) return 'SALESMAN';
  const r = role.toUpperCase().trim();
  if (['FOUNDER', 'OWNER', 'ADMIN', 'SYSTEM_ADMIN', 'CEO', 'FOUNDER_CEO'].includes(r)) {
    return 'FOUNDER_CEO';
  }
  if (r === 'DIRECTOR') {
    return 'DIRECTOR';
  }
  if (['ACCOUNTANT', 'PRODUCTION', 'ACCOUNTANT_PRODUCTION', 'OPERATIONS_STAFF', 'STAFF'].includes(r)) {
    return 'OPERATIONS_STAFF';
  }
  return 'SALESMAN';
}

/**
 * Returns human-readable display title for the 4 canonical roles.
 */
export function getRoleDisplayTitle(role?: string | null): string {
  const canonical = normalizeRole(role);
  switch (canonical) {
    case 'FOUNDER_CEO':
      return 'Founder & CEO / System Admin';
    case 'DIRECTOR':
      return 'Director';
    case 'OPERATIONS_STAFF':
      return 'Accountant / Production Staff';
    case 'SALESMAN':
      return 'Salesman';
  }
}

export interface RolePermissions {
  canViewExecutiveCockpit: boolean;
  canViewFinancials: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
  canManageTerritory: boolean;
  canManageCustomers: boolean;
  canConfigureCustomerRates: boolean;
  canRecordPayments: boolean;
  canPerformFieldSales: boolean;
  canExportData: boolean;
  canManageBackups: boolean;
  canManageProduction: boolean;
  canManageStock: boolean;
  canManageExpenses: boolean;
  canManagePayroll: boolean;
  canApproveFinancials: boolean;
}

export const CANONICAL_PERMISSIONS: Record<CanonicalRole, RolePermissions> = {
  // ROLE 1: FOUNDER & CEO / SYSTEM ADMIN
  // Full authorized business and technical access across all modules
  FOUNDER_CEO: {
    canViewExecutiveCockpit: true,
    canViewFinancials: true,
    canViewReports: true,
    canManageUsers: true,
    canManageTerritory: true,
    canManageCustomers: true,
    canConfigureCustomerRates: true,
    canRecordPayments: true,
    canPerformFieldSales: true,
    canExportData: true,
    canManageBackups: true,
    canManageProduction: true,
    canManageStock: true,
    canManageExpenses: true,
    canManagePayroll: true,
    canApproveFinancials: true,
  },

  // ROLE 2: DIRECTOR
  // Business oversight: executive dashboard, reports, performance summaries.
  // Restricted: user administration, technical settings, backup restore/deletion, financial approvals.
  DIRECTOR: {
    canViewExecutiveCockpit: true,
    canViewFinancials: true,
    canViewReports: true,
    canManageUsers: false,
    canManageTerritory: false,
    canManageCustomers: true, // view/inspect customers
    canConfigureCustomerRates: false,
    canRecordPayments: false,
    canPerformFieldSales: false,
    canExportData: true,
    canManageBackups: false,
    canManageProduction: false, // view only
    canManageStock: false,      // view only
    canManageExpenses: false,   // view only
    canManagePayroll: false,    // view only
    canApproveFinancials: false,
  },

  // ROLE 3: ACCOUNTANT / PRODUCTION STAFF
  // Combined accounting and production operations: vouchers, expenses, stock, production batches.
  // Restricted: unrestricted user management, technical settings, backup restoration, financial approvals.
  OPERATIONS_STAFF: {
    canViewExecutiveCockpit: false,
    canViewFinancials: true,
    canViewReports: true,
    canManageUsers: false,
    canManageTerritory: false,
    canManageCustomers: true, // customer ledgers & reconciliation
    canConfigureCustomerRates: false,
    canRecordPayments: true,  // payment vouchers & accounting receipts
    canPerformFieldSales: false,
    canExportData: true,      // authorized accounting & inventory exports
    canManageBackups: false,
    canManageProduction: true,// create and log production batches
    canManageStock: true,     // raw material & finished goods
    canManageExpenses: true,  // record and categorize expenses
    canManagePayroll: true,   // staff directory & attendance records
    canApproveFinancials: false,
  },

  // ROLE 4: SALESMAN
  // Field sales, route customers, visits, cash/UPI collection, work session limits.
  SALESMAN: {
    canViewExecutiveCockpit: false,
    canViewFinancials: false,
    canViewReports: false,
    canManageUsers: false,
    canManageTerritory: false,
    canManageCustomers: false,
    canConfigureCustomerRates: false,
    canRecordPayments: true,  // field collections
    canPerformFieldSales: true,
    canExportData: false,
    canManageBackups: false,
    canManageProduction: false,
    canManageStock: false,
    canManageExpenses: false,
    canManagePayroll: false,
    canApproveFinancials: false,
  },
};

/**
 * Centralized server-side permission check.
 * Denies access by default if permission is absent.
 */
export function hasPermission(
  role: string | undefined | null,
  permission: keyof RolePermissions
): boolean {
  if (!role) return false;
  const canonical = normalizeRole(role);
  const permissions = CANONICAL_PERMISSIONS[canonical];
  if (!permissions) return false;
  return Boolean(permissions[permission]);
}

/**
 * Backward compatibility helpers
 */
export function isExecutiveRole(role: string | undefined | null): boolean {
  const canonical = normalizeRole(role);
  return canonical === 'FOUNDER_CEO' || canonical === 'DIRECTOR';
}

export function isFinancialRole(role: string | undefined | null): boolean {
  const canonical = normalizeRole(role);
  return (
    canonical === 'FOUNDER_CEO' ||
    canonical === 'DIRECTOR' ||
    canonical === 'OPERATIONS_STAFF'
  );
}

export function isSystemAdminRole(role: string | undefined | null): boolean {
  const canonical = normalizeRole(role);
  return canonical === 'FOUNDER_CEO';
}
