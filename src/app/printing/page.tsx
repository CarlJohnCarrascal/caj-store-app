'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/lib/types';
import { DollarSign, Hash, Ruler, ScanLine } from 'lucide-react';

const printingServices = [
  "Xerox",
  "Scan",
  "Print",
  "T-shirt Sublimation",
  "T-shirt DTF",
  "Mug Printing",
  "Laminating",
  "Sticker",
  "Photo Printing",
  "Document Binding",
];

export default function PrintingPage() {
  const { addToCart } = useCart();
  const { toast } = useToast();

  const [service, setService] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [size, setSize] = useState('');
  const [price, setPrice] = useState('');

  const handleAddToCart = () => {
    if (!service || !quantity || !price) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select a service, and enter a quantity and price.',
      });
      return;
    }

    const priceValue = parseFloat(price);
    const quantityValue = parseInt(quantity, 10);

    if (isNaN(priceValue) || priceValue <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Price',
        description: 'Please enter a valid price.',
      });
      return;
    }

    if (isNaN(quantityValue) || quantityValue <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Quantity',
        description: 'Please enter a valid quantity.',
      });
      return;
    }

    const customProduct: Product = {
      id: `print-${service.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
      name: `Printing: ${service}`,
      price: priceValue,
      description: `Quantity: ${quantityValue}${size ? `, Size: ${size}` : ''}`,
      group: 'Services',
      show: false,
      category: 'Printing',
      stock: 999,
      material: 'N/A',
      dimensions: size || 'N/A',
      image: 'https://placehold.co/600x600.png',
      unit: 'each',
    };

    addToCart(customProduct);

    setService('');
    setQuantity('1');
    setSize('');
    setPrice('');

    toast({
        title: 'Service Added to Cart',
        description: `${service} has been added to your cart.`,
    });
  };

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ScanLine className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="mt-4">Printing Services</CardTitle>
          <CardDescription>
            Configure your printing job and add it to the cart.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="service-type">Service Type</Label>
              <Select value={service} onValueChange={setService}>
                <SelectTrigger id="service-type">
                  <SelectValue placeholder="Select a printing service" />
                </SelectTrigger>
                <SelectContent>
                  {printingServices.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="quantity" 
                    type="number" 
                    placeholder="e.g. 100" 
                    value={quantity} 
                    onChange={(e) => setQuantity(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Size (Optional)</Label>
                <div className="relative">
                  <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="size" 
                    placeholder="e.g. A4, Large" 
                    value={size} 
                    onChange={(e) => setSize(e.target.value)} 
                    className="pl-9"
                  />
                </div>
              </div>
               <div className="space-y-2">
                <Label htmlFor="price">Total Price</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="price" 
                    type="number" 
                    placeholder="e.g. 50.00" 
                    value={price} 
                    onChange={(e) => setPrice(e.target.value)} 
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleAddToCart} className="w-full" size="lg">
              Add to Cart
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
