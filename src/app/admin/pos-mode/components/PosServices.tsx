'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardFooter, CardContent } from '@/components/ui/card';
import { ArrowRight, Store, Printer, Smartphone, Wrench, ArrowRightLeft, Receipt } from 'lucide-react';
import Link from 'next/link';

const services = [
  { name: 'Store', href: '/admin/store', icon: Store, description: 'Browse and sell inventory products.' },
  { name: 'Cash IO', href: '/admin/cashio/new', icon: ArrowRightLeft, description: 'Handle cash in/out transactions.' },
  { name: 'Printing', href: '/admin/printing', icon: Printer, description: 'Add custom printing jobs to the order.' },
  { name: 'E-loading', href: '/admin/e-loading', icon: Smartphone, description: 'Process e-loading for various networks.' },
  { name: 'Other Services', href: '/admin/other-services', icon: Wrench, description: 'Add miscellaneous services to the order.' },
  { name: 'Expenses', href: '/admin/expenses/new', icon: Receipt, description: 'Record a business expense (not for order).' }
];

export default function PosServices() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">POS Mode</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <Link href={service.href} key={service.name} className="block">
            <Card className="hover:shadow-lg hover:border-primary transition-all h-full flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <service.icon className="h-8 w-8 text-primary" />
                  <CardTitle>{service.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <CardDescription>{service.description}</CardDescription>
              </CardContent>
              <CardFooter>
                 <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
