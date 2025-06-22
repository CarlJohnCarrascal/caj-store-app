import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Landmark } from 'lucide-react';

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Accounts</h1>
      </div>
      <Card>
        <CardHeader>
          <Landmark className="h-8 w-8 text-muted-foreground" />
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            This page for managing your business accounts is currently under construction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>You will soon be able to add, edit, and view your financial accounts here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
