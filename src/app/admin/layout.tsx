import { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { verifyToken, hashToken } from '@/lib/auth';
import { sql } from '@/lib/db';

interface AdminLayoutProps {
  children: ReactNode;
}

async function requireAdminAccess() {
  if (process.env.NODE_ENV === 'production' && process.env.ADMIN_UI_ENABLED !== 'true') {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('bonzai_auth')?.value;
  if (!token) {
    redirect('/dashboard');
  }

  try {
    const payload = verifyToken(token);

    const tokenHash = hashToken(token);
    const sessionResult = await sql`
      SELECT 1
      FROM sessions
      WHERE token_hash = ${tokenHash} AND expires_at > CURRENT_TIMESTAMP
      LIMIT 1
    `;
    if (!sessionResult[0]) {
      redirect('/dashboard');
    }

    const userResult = await sql`
      SELECT is_admin
      FROM users
      WHERE id = ${payload.userId}
      LIMIT 1
    ` as Array<{ is_admin: boolean }>;

    if (!userResult[0]?.is_admin) {
      redirect('/dashboard');
    }
  } catch {
    redirect('/dashboard');
  }
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  await requireAdminAccess();
  return <>{children}</>;
}
