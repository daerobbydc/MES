import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { errorResponse } from '@/lib/utils';
import { generateTemplate } from '@/services/import';

const VALID_TYPES = ['products', 'customers', 'suppliers', 'inventory', 'bom', 'users'];

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    await requireAuth();

    const type = params.type.toLowerCase();
    if (!VALID_TYPES.includes(type)) {
      return errorResponse(`Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`, 400);
    }

    const buffer = generateTemplate(type);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${type}_template.xlsx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return errorResponse(err.message || 'Template generation failed', 500);
  }
}
