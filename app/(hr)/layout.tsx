import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { HRNavbar } from '@/app/components/HRNavbar';

export default async function HRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login?redirect=' + encodeURIComponent('/dashboard'));
  }
  if (user.role !== 'hr' && user.role !== 'admin') {
    redirect('/my-dashboard');
  }
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <HRNavbar />
      {children}
    </div>
  );
}
