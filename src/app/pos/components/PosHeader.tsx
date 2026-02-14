'use client';
import { useState, useEffect } from 'react';
import { Search, ChevronDown, User, LayoutDashboard } from 'lucide-react';
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

export function PosHeader() {
  const [time, setTime] = useState('');
  const { user, signOut } = useAuth();

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
      <div className="text-2xl font-bold">
        LOGO
      </div>
      <div className="w-full max-w-lg relative">
        <Input placeholder="Search..." className="pl-10 h-11 bg-input" />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex items-center gap-4">
        <span className="font-medium text-lg">{time}</span>
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
