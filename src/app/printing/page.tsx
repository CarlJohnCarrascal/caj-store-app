import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, ScanLine, Palette } from "lucide-react";

export default function PrintingPage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Caj-Store Printing Services
        </h1>
        <p className="mt-4 text-xl text-muted-foreground">
          High-quality printing solutions for all your business needs.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <Card>
          <CardHeader className="items-center text-center">
            <div className="p-3 bg-primary/10 rounded-full inline-block">
              <Printer className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="mt-4">Business Cards</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              Make a lasting impression with our premium business cards, available in various finishes and paper stocks.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="items-center text-center">
            <div className="p-3 bg-primary/10 rounded-full inline-block">
               <ScanLine className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="mt-4">Banners & Posters</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              Go big and bold with vibrant, durable banners and posters for your events and promotions.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="items-center text-center">
            <div className="p-3 bg-primary/10 rounded-full inline-block">
                <Palette className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="mt-4">Flyers & Brochures</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              Spread the word with professionally designed and printed marketing materials that capture attention.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="text-center">
        <CardHeader>
          <CardTitle>Ready to Get Started?</CardTitle>
          <CardDescription>
            Contact us today for a custom quote or to discuss your project with our printing experts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button>Contact Us for a Quote</Button>
        </CardContent>
      </Card>
    </div>
  );
}
