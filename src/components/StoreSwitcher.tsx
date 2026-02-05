
'use client';

import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from './ui/button';
import { ChevronsUpDown, Store, PlusCircle } from 'lucide-react';
import Link from 'next/link';

interface StoreSwitcherProps {
  onStoreSwitch?: () => void;
}

export function StoreSwitcher({ onStoreSwitch }: StoreSwitcherProps) {
  const { activeStore, memberStores, switchStore } = useAuth();

  const handleSwitch = (storeId: string) => {
    switchStore(storeId);
    onStoreSwitch?.();
  };
  
  if(!activeStore && memberStores.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between max-w-[300px]">
          <span className="truncate">{activeStore ? activeStore.name : 'Select a store'}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[var(--radix-popover-trigger-width)]">
        <DropdownMenuLabel>Your Stores</DropdownMenuLabel>
        {memberStores.map((store) => (
          <DropdownMenuItem key={store.id} onSelect={() => handleSwitch(store.id)}>
            <Store className="mr-2 h-4 w-4" />
            {store.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/admin/stores">
            <PlusCircle className="mr-2 h-4 w-4" />
            Manage Stores
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
