import * as XLSX from 'xlsx';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

// ─── File Parsing ──────────────────────────────────────────────────────────────

export function parseFile(buffer: Buffer, filename: string) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (jsonData.length === 0) {
    return { headers: [], rows: [], sheetName };
  }

  const headers = Object.keys(jsonData[0] as object);
  return { headers, rows: jsonData, sheetName };
}

// ─── Validation ────────────────────────────────────────────────────────────────

interface ValidationResult {
  valid: any[];
  errors: { row: number; message: string }[];
}

const PRODUCT_TYPES = ['RAW_MATERIAL', 'FINISHED_GOOD', 'WORK_IN_PROGRESS', 'PACKAGING', 'CONSUMABLE'];
const USER_ROLES = ['ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR', 'QUALITY_INSPECTOR', 'WAREHOUSE', 'PURCHASER', 'SALES', 'ACCOUNTANT'];

function requireField(row: any, field: string, rowNum: number, errors: { row: number; message: string }[]): boolean {
  if (!row[field] || String(row[field]).trim() === '') {
    errors.push({ row: rowNum, message: `${field} is required` });
    return false;
  }
  return true;
}

function parseNumber(val: any, field: string, rowNum: number, errors: { row: number; message: string }[]): number | null {
  if (val === '' || val === null || val === undefined) return 0;
  const num = Number(val);
  if (isNaN(num)) {
    errors.push({ row: rowNum, message: `${field} must be a number` });
    return null;
  }
  return num;
}

export function validateProducts(rows: any[]): ValidationResult {
  const valid: any[] = [];
  const errors: { row: number; message: string }[] = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // +2 for 1-indexed + header row
    const rowErrors: string[] = [];

    if (!requireField(row, 'Code', rowNum, errors)) return;
    if (!requireField(row, 'Name', rowNum, errors)) return;

    if (row['Type'] && !PRODUCT_TYPES.includes(row['Type'])) {
      errors.push({ row: rowNum, message: `Type must be one of: ${PRODUCT_TYPES.join(', ')}` });
      return;
    }

    const minStock = parseNumber(row['MinStock'], 'MinStock', rowNum, errors);
    const maxStock = parseNumber(row['MaxStock'], 'MaxStock', rowNum, errors);
    const reorderPoint = parseNumber(row['ReorderPoint'], 'ReorderPoint', rowNum, errors);
    const defaultCost = parseNumber(row['DefaultCost'], 'DefaultCost', rowNum, errors);

    if (minStock === null || maxStock === null || reorderPoint === null || defaultCost === null) return;

    valid.push({
      sku: String(row['Code']).trim(),
      name: String(row['Name']).trim(),
      category: row['Category'] ? String(row['Category']).trim() : null,
      type: row['Type'] || 'FINISHED_GOOD',
      unit: row['Unit'] ? String(row['Unit']).trim() : 'PCS',
      minStock,
      maxStock,
      reorderPoint,
      standardCost: defaultCost,
    });
  });

  return { valid, errors };
}

export function validateCustomers(rows: any[]): ValidationResult {
  const valid: any[] = [];
  const errors: { row: number; message: string }[] = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;

    if (!requireField(row, 'Code', rowNum, errors)) return;
    if (!requireField(row, 'Name', rowNum, errors)) return;

    const creditLimit = parseNumber(row['CreditLimit'], 'CreditLimit', rowNum, errors);
    const paymentTerms = parseNumber(row['PaymentTerms'], 'PaymentTerms', rowNum, errors);
    if (creditLimit === null || paymentTerms === null) return;

    valid.push({
      code: String(row['Code']).trim(),
      name: String(row['Name']).trim(),
      contact: row['Contact'] ? String(row['Contact']).trim() : null,
      phone: row['Phone'] ? String(row['Phone']).trim() : null,
      email: row['Email'] ? String(row['Email']).trim() : null,
      address: row['Address'] ? String(row['Address']).trim() : null,
      city: row['City'] ? String(row['City']).trim() : null,
      country: row['Country'] ? String(row['Country']).trim() : null,
      taxNumber: row['TaxNumber'] ? String(row['TaxNumber']).trim() : null,
      creditLimit,
      paymentTerms: Math.round(paymentTerms),
    });
  });

  return { valid, errors };
}

export function validateSuppliers(rows: any[]): ValidationResult {
  const valid: any[] = [];
  const errors: { row: number; message: string }[] = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;

    if (!requireField(row, 'Code', rowNum, errors)) return;
    if (!requireField(row, 'Name', rowNum, errors)) return;

    const paymentTerms = parseNumber(row['PaymentTerms'], 'PaymentTerms', rowNum, errors);
    if (paymentTerms === null) return;

    valid.push({
      code: String(row['Code']).trim(),
      name: String(row['Name']).trim(),
      contact: row['Contact'] ? String(row['Contact']).trim() : null,
      phone: row['Phone'] ? String(row['Phone']).trim() : null,
      email: row['Email'] ? String(row['Email']).trim() : null,
      address: row['Address'] ? String(row['Address']).trim() : null,
      taxNumber: row['TaxNumber'] ? String(row['TaxNumber']).trim() : null,
      paymentTerms: Math.round(paymentTerms),
    });
  });

  return { valid, errors };
}

export function validateInventory(rows: any[]): ValidationResult {
  const valid: any[] = [];
  const errors: { row: number; message: string }[] = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;

    if (!requireField(row, 'ProductCode', rowNum, errors)) return;

    const quantity = parseNumber(row['Quantity'], 'Quantity', rowNum, errors);
    const unitCost = parseNumber(row['UnitCost'], 'UnitCost', rowNum, errors);
    if (quantity === null || unitCost === null) return;

    valid.push({
      materialCode: String(row['ProductCode']).trim(),
      name: row['Name'] ? String(row['Name']).trim() : String(row['ProductCode']).trim(),
      quantity,
      lotNumber: row['LotNumber'] ? String(row['LotNumber']).trim() : null,
      expiryDate: row['ExpiryDate'] ? String(row['ExpiryDate']).trim() : null,
      unitCost,
    });
  });

  return { valid, errors };
}

export function validateBOM(rows: any[]): ValidationResult {
  const valid: any[] = [];
  const errors: { row: number; message: string }[] = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;

    if (!requireField(row, 'ParentCode', rowNum, errors)) return;
    if (!requireField(row, 'ChildCode', rowNum, errors)) return;

    const quantity = parseNumber(row['Quantity'], 'Quantity', rowNum, errors);
    const scrapRate = parseNumber(row['ScrapRate'], 'ScrapRate', rowNum, errors);
    if (quantity === null || scrapRate === null) return;

    valid.push({
      parentCode: String(row['ParentCode']).trim(),
      childCode: String(row['ChildCode']).trim(),
      quantity,
      unit: row['Unit'] ? String(row['Unit']).trim() : 'PCS',
      scrapRate,
    });
  });

  return { valid, errors };
}

export function validateUsers(rows: any[]): ValidationResult {
  const valid: any[] = [];
  const errors: { row: number; message: string }[] = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;

    if (!requireField(row, 'Name', rowNum, errors)) return;
    if (!requireField(row, 'Email', rowNum, errors)) return;
    if (!requireField(row, 'Password', rowNum, errors)) return;
    if (!requireField(row, 'Role', rowNum, errors)) return;

    if (row['Role'] && !USER_ROLES.includes(row['Role'])) {
      errors.push({ row: rowNum, message: `Role must be one of: ${USER_ROLES.join(', ')}` });
      return;
    }

    valid.push({
      name: String(row['Name']).trim(),
      email: String(row['Email']).trim(),
      password: String(row['Password']).trim(),
      role: row['Role'] || 'OPERATOR',
      department: row['Department'] ? String(row['Department']).trim() : null,
    });
  });

  return { valid, errors };
}

// ─── Bulk Insert ───────────────────────────────────────────────────────────────

interface InsertResult {
  inserted: number;
  skipped: number;
  errors: string[];
}

export async function bulkInsertProducts(rows: any[]): Promise<InsertResult> {
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const existing = await db.product.findUnique({ where: { sku: row.sku } });
      if (existing) {
        skipped++;
        continue;
      }

      await db.product.create({
        data: {
          sku: row.sku,
          name: row.name,
          category: row.category,
          type: row.type,
          unit: row.unit,
          standardCost: row.standardCost,
          isActive: true,
        },
      });
      inserted++;
    } catch (err: any) {
      errors.push(`Row ${row.sku}: ${err.message}`);
    }
  }

  return { inserted, skipped, errors };
}

export async function bulkInsertCustomers(rows: any[]): Promise<InsertResult> {
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const existing = await db.customer.findUnique({ where: { code: row.code } });
      if (existing) {
        skipped++;
        continue;
      }

      await db.customer.create({
        data: {
          code: row.code,
          name: row.name,
          contact: row.contact,
          phone: row.phone,
          email: row.email,
          address: row.address,
          city: row.city,
          country: row.country,
          taxNumber: row.taxNumber,
          creditLimit: row.creditLimit,
          paymentTerms: row.paymentTerms,
          isActive: true,
        },
      });
      inserted++;
    } catch (err: any) {
      errors.push(`Row ${row.code}: ${err.message}`);
    }
  }

  return { inserted, skipped, errors };
}

export async function bulkInsertSuppliers(rows: any[]): Promise<InsertResult> {
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const existing = await db.supplier.findUnique({ where: { code: row.code } });
      if (existing) {
        skipped++;
        continue;
      }

      await db.supplier.create({
        data: {
          code: row.code,
          name: row.name,
          contact: row.contact,
          phone: row.phone,
          email: row.email,
          address: row.address,
          taxNumber: row.taxNumber,
          paymentTerms: row.paymentTerms,
          isActive: true,
        },
      });
      inserted++;
    } catch (err: any) {
      errors.push(`Row ${row.code}: ${err.message}`);
    }
  }

  return { inserted, skipped, errors };
}

export async function bulkInsertInventory(rows: any[]): Promise<InsertResult> {
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const existing = await db.inventoryItem.findUnique({ where: { materialCode: row.materialCode } });
      if (existing) {
        skipped++;
        continue;
      }

      await db.inventoryItem.create({
        data: {
          materialCode: row.materialCode,
          name: row.name,
          currentStock: row.quantity,
          unitCost: row.unitCost,
          isActive: true,
        },
      });
      inserted++;
    } catch (err: any) {
      errors.push(`Row ${row.materialCode}: ${err.message}`);
    }
  }

  return { inserted, skipped, errors };
}

export async function bulkInsertBOM(rows: any[]): Promise<InsertResult> {
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Group by parent code to create one BOM per parent
  const grouped = new Map<string, any[]>();
  for (const row of rows) {
    if (!grouped.has(row.parentCode)) {
      grouped.set(row.parentCode, []);
    }
    grouped.get(row.parentCode)!.push(row);
  }

  for (const [parentCode, items] of grouped) {
    try {
      const product = await db.product.findUnique({ where: { sku: parentCode } });
      if (!product) {
        errors.push(`Parent product ${parentCode} not found`);
        continue;
      }

      // Check if BOM already exists
      const existingBOM = await db.bOM.findFirst({
        where: { productId: product.id, isDefault: true },
      });

      if (existingBOM) {
        skipped++;
        continue;
      }

      const bom = await db.bOM.create({
        data: {
          productId: product.id,
          version: '1.0',
          isDefault: true,
          isActive: true,
        },
      });

      for (const item of items) {
        const material = await db.product.findUnique({ where: { sku: item.childCode } });
        if (!material) {
          errors.push(`Material ${item.childCode} not found for BOM of ${parentCode}`);
          continue;
        }

        await db.bOMItem.create({
          data: {
            bomId: bom.id,
            materialCode: item.childCode,
            materialName: material.name,
            quantity: item.quantity,
            unit: item.unit,
            wastagePercent: item.scrapRate,
          },
        });
      }
      inserted++;
    } catch (err: any) {
      errors.push(`Row ${parentCode}: ${err.message}`);
    }
  }

  return { inserted, skipped, errors };
}

export async function bulkInsertUsers(rows: any[]): Promise<InsertResult> {
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const existing = await db.user.findUnique({ where: { email: row.email } });
      if (existing) {
        skipped++;
        continue;
      }

      const hashedPassword = await hashPassword(row.password);

      await db.user.create({
        data: {
          name: row.name,
          email: row.email,
          password: hashedPassword,
          role: row.role,
          department: row.department,
          isActive: true,
        },
      });
      inserted++;
    } catch (err: any) {
      errors.push(`Row ${row.email}: ${err.message}`);
    }
  }

  return { inserted, skipped, errors };
}

// ─── Template Generator ────────────────────────────────────────────────────────

const TEMPLATES: Record<string, { headers: string[]; sample: string[][] }> = {
  products: {
    headers: ['Code', 'Name', 'Category', 'Type', 'Unit', 'MinStock', 'MaxStock', 'ReorderPoint', 'DefaultCost'],
    sample: [['RM-001', 'Steel Sheet', 'Raw Material', 'RAW_MATERIAL', 'KG', '100', '5000', '200', '15.50']],
  },
  customers: {
    headers: ['Code', 'Name', 'Contact', 'Phone', 'Email', 'Address', 'City', 'Country', 'TaxNumber', 'CreditLimit', 'PaymentTerms'],
    sample: [['CUST-001', 'Acme Corp', 'John Doe', '+1234567890', 'john@acme.com', '123 Main St', 'New York', 'USA', 'TAX123', '50000', '30']],
  },
  suppliers: {
    headers: ['Code', 'Name', 'Contact', 'Phone', 'Email', 'Address', 'TaxNumber', 'PaymentTerms'],
    sample: [['SUP-001', 'MetalCo', 'Jane Smith', '+0987654321', 'jane@metalco.com', '456 Industrial Ave', 'TAX456', '45']],
  },
  inventory: {
    headers: ['ProductCode', 'LocationCode', 'Quantity', 'LotNumber', 'ExpiryDate', 'UnitCost'],
    sample: [['RM-001', 'WH-01', '500', 'LOT-2026-001', '2027-01-15', '15.50']],
  },
  bom: {
    headers: ['ParentCode', 'ChildCode', 'Quantity', 'Unit', 'ScrapRate'],
    sample: [['FG-001', 'RM-001', '2.5', 'KG', '5'], ['FG-001', 'RM-002', '1.0', 'PCS', '2']],
  },
  users: {
    headers: ['Name', 'Email', 'Password', 'Role', 'Department'],
    sample: [['John Doe', 'john@company.com', 'TempPass123!', 'OPERATOR', 'Production']],
  },
};

export function generateTemplate(type: string): Buffer {
  const template = TEMPLATES[type];
  if (!template) {
    throw new Error(`Unknown template type: ${type}`);
  }

  const ws = XLSX.utils.aoa_to_sheet([template.headers, ...template.sample]);

  // Auto-size columns
  const colWidths = template.headers.map((h) => ({
    wch: Math.max(h.length + 2, 16),
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
