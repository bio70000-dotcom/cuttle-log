import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, Map, Calendar, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: Home, label: '홈' },
  { path: '/log', icon: FileText, label: '로그' },
  { path: '/map', icon: Map, label: '지도' },
  { path: '/calendar', icon: Calendar, label: '캘린더' },
  { path: '/analytics', icon: BarChart3, label: '분석' },
  { path: '/settings', icon: Settings, label: '설정' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
      <div className="flex justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center py-2 px-3 min-w-0 flex-1 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
