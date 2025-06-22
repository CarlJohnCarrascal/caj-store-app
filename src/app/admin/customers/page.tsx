import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Customers</h1>
      </div>
       <Card>
        <CardHeader>
          <Users className="h-8 w-8 text-muted-foreground" />
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            This page for managing your customers is currently under construction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>You will soon be able to add, edit, and view your customer list here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
