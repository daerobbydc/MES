import { db } from "@/lib/db";

export interface Permission {
  id: string;
  module: string;
  action: string;
  description: string | null;
}

const DEFAULT_PERMISSIONS: { module: string; action: string; description: string }[] = [
  { module: "dashboard", action: "view", description: "View dashboard" },
  { module: "production", action: "view", description: "View production orders" },
  { module: "production", action: "create", description: "Create production orders" },
  { module: "production", action: "edit", description: "Edit production orders" },
  { module: "production", action: "delete", description: "Delete production orders" },
  { module: "inventory", action: "view", description: "View inventory" },
  { module: "inventory", action: "create", description: "Create inventory items" },
  { module: "inventory", action: "edit", description: "Edit inventory items" },
  { module: "inventory", action: "delete", description: "Delete inventory items" },
  { module: "purchasing", action: "view", description: "View purchase orders" },
  { module: "purchasing", action: "create", description: "Create purchase orders" },
  { module: "purchasing", action: "edit", description: "Edit purchase orders" },
  { module: "purchasing", action: "approve", description: "Approve purchase orders" },
  { module: "sales", action: "view", description: "View sales orders" },
  { module: "sales", action: "create", description: "Create sales orders" },
  { module: "sales", action: "edit", description: "Edit sales orders" },
  { module: "quality", action: "view", description: "View quality inspections" },
  { module: "quality", action: "create", description: "Create quality inspections" },
  { module: "quality", action: "edit", description: "Edit quality inspections" },
  { module: "warehouse", action: "view", description: "View warehouse operations" },
  { module: "warehouse", action: "create", description: "Create warehouse operations" },
  { module: "warehouse", action: "edit", description: "Edit warehouse operations" },
  { module: "accounting", action: "view", description: "View accounting" },
  { module: "accounting", action: "create", description: "Create journal entries" },
  { module: "accounting", action: "approve", description: "Approve accounting entries" },
  { module: "planning", action: "view", description: "View production plans" },
  { module: "planning", action: "create", description: "Create production plans" },
  { module: "planning", action: "edit", description: "Edit production plans" },
  { module: "machine", action: "view", description: "View machines" },
  { module: "machine", action: "edit", description: "Edit machine data" },
  { module: "machine", action: "maintain", description: "Manage machine maintenance" },
  { module: "users", action: "view", description: "View users" },
  { module: "users", action: "create", description: "Create users" },
  { module: "users", action: "edit", description: "Edit users" },
  { module: "users", action: "delete", description: "Delete users" },
  { module: "roles", action: "view", description: "View roles and permissions" },
  { module: "roles", action: "manage", description: "Manage role permissions" },
  { module: "audit", action: "view", description: "View audit logs" },
  { module: "approval", action: "view", description: "View approval requests" },
  { module: "approval", action: "approve", description: "Approve or reject requests" },
];

const ROLE_DEFAULTS: Record<string, string[]> = {
  ADMIN: DEFAULT_PERMISSIONS.map((p) => `${p.module}:${p.action}`),
  MANAGER: [
    "dashboard:view",
    "production:view", "production:create", "production:edit",
    "inventory:view", "inventory:create", "inventory:edit",
    "purchasing:view", "purchasing:create", "purchasing:edit", "purchasing:approve",
    "sales:view", "sales:create", "sales:edit",
    "quality:view", "quality:create", "quality:edit",
    "warehouse:view", "warehouse:create", "warehouse:edit",
    "accounting:view", "accounting:create",
    "planning:view", "planning:create", "planning:edit",
    "machine:view", "machine:edit", "machine:maintain",
    "users:view", "users:create", "users:edit",
    "roles:view",
    "audit:view",
    "approval:view", "approval:approve",
  ],
  SUPERVISOR: [
    "dashboard:view",
    "production:view", "production:create", "production:edit",
    "inventory:view", "inventory:create", "inventory:edit",
    "quality:view", "quality:create", "quality:edit",
    "warehouse:view", "warehouse:create",
    "machine:view", "machine:edit", "machine:maintain",
    "planning:view",
    "audit:view",
    "approval:view",
  ],
  OPERATOR: [
    "dashboard:view",
    "production:view",
    "inventory:view",
    "quality:view",
    "machine:view",
  ],
  QUALITY_INSPECTOR: [
    "dashboard:view",
    "production:view",
    "quality:view", "quality:create", "quality:edit",
    "inventory:view",
  ],
  WAREHOUSE: [
    "dashboard:view",
    "inventory:view", "inventory:create", "inventory:edit",
    "warehouse:view", "warehouse:create", "warehouse:edit",
    "purchasing:view",
  ],
  PURCHASER: [
    "dashboard:view",
    "purchasing:view", "purchasing:create", "purchasing:edit",
    "inventory:view",
    "sales:view",
  ],
  SALES: [
    "dashboard:view",
    "sales:view", "sales:create", "sales:edit",
    "inventory:view",
    "production:view",
  ],
  ACCOUNTANT: [
    "dashboard:view",
    "accounting:view", "accounting:create", "accounting:approve",
    "purchasing:view",
    "sales:view",
    "audit:view",
  ],
};

export function checkPermission(role: string, module: string, action: string): boolean {
  const perms = ROLE_DEFAULTS[role];
  if (!perms) return false;
  return perms.includes(`${module}:${action}`);
}

export async function getRolePermissions(role: string): Promise<Permission[]> {
  const rolePerms = await db.rolePermission.findMany({
    where: { role: role as any },
    include: { permission: true },
  });
  return rolePerms.map((rp) => rp.permission);
}

export async function seedPermissions(): Promise<void> {
  for (const def of DEFAULT_PERMISSIONS) {
    await db.permission.upsert({
      where: { module_action: { module: def.module, action: def.action } },
      update: { description: def.description },
      create: { module: def.module, action: def.action, description: def.description },
    });
  }

  const allPerms = await db.permission.findMany();

  for (const [role, permKeys] of Object.entries(ROLE_DEFAULTS)) {
    for (const key of permKeys) {
      const [module, action] = key.split(":");
      const perm = allPerms.find((p) => p.module === module && p.action === action);
      if (perm) {
        await db.rolePermission.upsert({
          where: { role_permissionId: { role: role as any, permissionId: perm.id } },
          update: {},
          create: { role: role as any, permissionId: perm.id },
        });
      }
    }
  }
}
