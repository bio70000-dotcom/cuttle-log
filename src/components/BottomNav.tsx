import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  FileText,
  Map,
  BarChart3,
  MoreHorizontal,
  Users,
  Trophy,
  Calendar,
  Settings,
  Settings2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet'

const mainTabs = [
  { path: '/', icon: Home, label: '홈' },
  { path: '/log', icon: FileText, label: '로그' },
  { path: '/map', icon: Map, label: '지도' },
  { path: '/analytics', icon: BarChart3, label: '분석' },
]

const moreMenuItems = [
  { path: '/community', icon: Users, label: '커뮤니티' },
  { path: '/leaderboard', icon: Trophy, label: '랭킹' },
  { path: '/calendar', icon: Calendar, label: '캘린더' },
  { path: '/settings', icon: Settings, label: '설정' },
  { path: '/presets', icon: Settings2, label: '프리셋' },
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const [sheetOpen, setSheetOpen] = useState(false)

  // Hide on shared trip pages
  if (location.pathname.startsWith('/shared/')) return null

  const isMoreActive = moreMenuItems.some((item) => location.pathname === item.path)

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
        <div className="flex justify-around">
          {mainTabs.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon

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
            )
          })}

          {/* More button */}
          <button
            onClick={() => setSheetOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center py-2 px-3 min-w-0 flex-1 transition-colors',
              isMoreActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <MoreHorizontal className="w-5 h-5 mb-1" />
            <span className="text-xs">더보기</span>
          </button>
        </div>
      </nav>

      {/* More menu sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="pb-8">
          <SheetHeader className="text-left mb-4">
            <SheetTitle>더보기</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-4 gap-3">
            {moreMenuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path

              return (
                <SheetClose asChild key={item.path}>
                  <button
                    onClick={() => navigate(item.path)}
                    className={cn(
                      'flex flex-col items-center justify-center py-3 rounded-xl transition-colors gap-1.5',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted/50 text-foreground hover:bg-muted'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                </SheetClose>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
