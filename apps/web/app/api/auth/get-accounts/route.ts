import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accounts = await auth.api.listUserAccounts({
      headers: await headers(),
    });

    return Response.json(accounts);
  } catch (error) {
    console.error('Failed to get accounts:', error);
    return Response.json({ error: 'Failed to get accounts' }, { status: 500 });
  }
}