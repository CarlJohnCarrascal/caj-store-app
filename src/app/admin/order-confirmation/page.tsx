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
            Thank you for your order. We've received it and will start processing it right away.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-6">
            You will receive an email confirmation shortly with your order details.
          </p>
          <Button asChild>
            <Link href="/admin/store">Continue Shopping</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
