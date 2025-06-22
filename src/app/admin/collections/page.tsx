
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CollectionsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Manage Collections</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            This page is under construction. You will soon be able to manage your collections here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>This feature will allow you to track and manage payment collections from customers.</p>
        </CardContent>
      </Card>
    </div>
  );
}
