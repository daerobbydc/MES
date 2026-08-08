import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/utils';
import {
  parseFile,
  validateProducts,
  validateCustomers,
  validateSuppliers,
  validateInventory,
  validateBOM,
  validateUsers,
  bulkInsertProducts,
  bulkInsertCustomers,
  bulkInsertSuppliers,
  bulkInsertInventory,
  bulkInsertBOM,
  bulkInsertUsers,
} from '@/services/import';

const VALID_TYPES = ['products', 'customers', 'suppliers', 'inventory', 'bom', 'users'];

const validators: Record<string, (rows: any[]) => any> = {
  products: validateProducts,
  customers: validateCustomers,
  suppliers: validateSuppliers,
  inventory: validateInventory,
  bom: validateBOM,
  users: validateUsers,
};

const inserters: Record<string, (rows: any[]) => Promise<any>> = {
  products: bulkInsertProducts,
  customers: bulkInsertCustomers,
  suppliers: bulkInsertSuppliers,
  inventory: bulkInsertInventory,
  bom: bulkInsertBOM,
  users: bulkInsertUsers,
};

export async function POST(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    await requireAuth();

    const type = params.type.toLowerCase();
    if (!VALID_TYPES.includes(type)) {
      return errorResponse(`Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`, 400);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return errorResponse('No file provided', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { headers, rows, sheetName } = parseFile(buffer, file.name);

    if (rows.length === 0) {
      return errorResponse('File is empty or has no data rows', 400);
    }

    const validate = validators[type];
    const { valid, errors } = validate(rows);

    const confirm = request.nextUrl.searchParams.get('confirm') === 'true';

    if (confirm && valid.length > 0) {
      const insert = inserters[type];
      const result = await insert(valid);

      return successResponse({
        type,
        sheetName,
        headers,
        preview: valid.slice(0, 10),
        totalRows: rows.length,
        validCount: valid.length,
        errorCount: errors.length,
        errors,
        inserted: result.inserted,
        skipped: result.skipped,
        insertErrors: result.errors,
        imported: true,
      });
    }

    return successResponse({
      type,
      sheetName,
      headers,
      preview: valid.slice(0, 10),
      totalRows: rows.length,
      validCount: valid.length,
      errorCount: errors.length,
      errors,
      imported: false,
    });
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (err.message === 'Forbidden') {
      return errorResponse('Forbidden', 403);
    }
    return errorResponse(err.message || 'Import failed', 500);
  }
}
