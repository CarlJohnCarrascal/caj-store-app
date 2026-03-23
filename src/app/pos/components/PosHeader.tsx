
'use client';
import { useState, useEffect } from 'react';
import { Search, ChevronDown, User, LayoutDashboard, PanelLeftOpen, PanelLeftClose, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

interface PosHeaderProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function PosHeader({ isCollapsed, onToggleCollapse }: PosHeaderProps) {
  const [time, setTime] = useState('');
  const { theme, setTheme } = useTheme();
  const { user, signOut, activeStore } = useAuth();

  useEffect(() => {
    const updateClock = () => {
         setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="flex items-center justify-between px-6 h-20 border-b border-border flex-shrink-0">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
          {isCollapsed ? <PanelLeftOpen className="h-6 w-6" /> : <PanelLeftClose className="h-6 w-6" />}
        </Button>
        <div className="text-2xl font-bold">
          {activeStore?.name || 'POS Mode'}
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <span className="font-medium text-lg hidden sm:inline">{time}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <span>{user?.displayName || 'Admin'}</span>
              <User className="h-5 w-5" />
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => { e.preventDefault(); setTheme(theme === 'dark' ? 'light' : 'dark'); }} className="flex items-center gap-2 cursor-pointer">
              <Moon className="h-4 w-4 hidden dark:block" />
              <Sun className="h-4 w-4 dark:hidden" />
              <span className="hidden dark:block">Light mode</span>
              <span className="dark:hidden">Dark mode</span>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
                <Link href="/admin" className="flex items-center gap-2 cursor-pointer">
                    <LayoutDashboard className="h-4 w-4" /> Admin Dashboard
                </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={signOut}>Log Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
