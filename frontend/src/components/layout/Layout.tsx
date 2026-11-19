import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import Header from './Header';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export default function Layout() {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative selection:bg-teal-600 selection:text-white transition-colors duration-200">
      {!isMobile && <Sidebar />}
      <div className="flex flex-col flex-1 overflow-hidden relative z-10">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>
      {isMobile && <MobileNav />}
    </div>
  );
}
