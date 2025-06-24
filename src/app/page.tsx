import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MoveRight } from 'lucide-react';
import Link from 'next/link';

export default function WelcomePage() {
  return (
    <div className="min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center">
            <Card className="w-full max-w-2xl shadow-2xl text-center">
                <CardHeader>
                <h1 className="text-5xl font-bold tracking-tighter">
                    Welcome to Caj-Store
                </h1>
                <CardDescription className="text-xl text-muted-foreground mt-4">
                    Your all-in-one solution for managing your products, store, and printing services.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <p className="mb-8">
                    Click the button below to access the main application dashboard where you can handle all your business needs.
                </p>
                <Button asChild size="lg">
                    <Link href="/admin">
                    Go to Dashboard <MoveRight className="ml-2 h-5 w-5" />
                    </Link>
                </Button>
                </CardContent>
            </Card>
        </main>
    </div>
  );
}
