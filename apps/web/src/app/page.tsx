import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

const PORTAL_HOME: Record<string, string> = {
  ADMIN: '/admin',
  BROKER: '/broker',
  MACHINERY_COMPANY: '/machinery-company',
};

export default function Home() {
  const session = getSession();
  redirect(session ? PORTAL_HOME[session.role] : '/login');
}
