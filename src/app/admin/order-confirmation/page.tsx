import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function OrderConfirmationPage() {
  return (
    <div className="flex justify-center items-center py-12">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
            <CheckCircle className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="mt-4 text-2xl">Order Confirmed!</CardTitle>
          <CardDescription>
            The order has been processed successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            What would you like to do next?
          </p>
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
            <Button asChild>
              <Link href="/admin/store">New Store Order</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/printing">Printing Service</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/e-loading">E-Loading</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/cashio">Cash IO</Link>
            </Button>
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link href="/admin">Back to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
