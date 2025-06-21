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
import { Hash, Ruler, ScanLine, Trash2, Plus, Minus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

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
  const { cartItems, addToCart, removeFromCart, updateQuantity } = useCart();
  const { toast } = useToast();

  const [service, setService] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [size, setSize] = useState('');
  const [pricePerItem, setPricePerItem] = useState('');

  const printingCartItems = cartItems.filter(item => item.category === 'Printing');

  const handleAddToCart = () => {
    if (!service || !quantity || !pricePerItem) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select a service, and enter a quantity and price per item.',
      });
      return;
    }

    const priceValue = parseFloat(pricePerItem);
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
      id: `print-${service.replace(/\s+/g, '-').toLowerCase()}-${size || 'na'}-${Date.now()}`,
      name: `Printing: ${service}`,
      price: priceValue,
      description: size ? `Size: ${size}` : '',
      group: 'Services',
      show: false,
      category: 'Printing',
      stock: 999,
      material: 'N/A',
      dimensions: size || 'N/A',
      image: 'https://placehold.co/600x600.png',
      unit: 'each',
    };

    addToCart(customProduct, quantityValue);

    setService('');
    setQuantity('1');
    setSize('');
    setPricePerItem('');

    toast({
        title: 'Service Added to Cart',
        description: `${quantityValue} x ${service} has been added to your cart.`,
    });
  };

  return (
    <div className="space-y-8">
      <Card className="w-full max-w-2xl mx-auto">
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
                <Label htmlFor="price">Price per Item</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₱</span>
                  <Input 
                    id="price" 
                    type="number" 
                    placeholder="e.g. 5.00" 
                    value={pricePerItem} 
                    onChange={(e) => setPricePerItem(e.target.value)} 
                    className="pl-7"
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
      
      {printingCartItems.length > 0 && (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Added Printing Jobs</CardTitle>
                <CardDescription>
                    These items have been added to your cart. You can manage them here or in the cart.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Service</TableHead>
                            <TableHead>Size</TableHead>
                            <TableHead className="text-center">Quantity</TableHead>
                            <TableHead className="text-right">Price/Item</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {printingCartItems.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name.replace('Printing: ', '')}</TableCell>
                                <TableCell>{item.dimensions === 'N/A' ? '-' : item.dimensions}</TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                        >
                                            <Minus className="h-4 w-4" />
                                        </Button>
                                        <Input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value, 10);
                                                updateQuantity(item.id, isNaN(val) || val < 0 ? 0 : val)
                                            }}
                                            className="h-8 w-16 text-center"
                                        />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">₱{item.price.toFixed(2)}</TableCell>
                                <TableCell className="text-right">₱{(item.price * item.quantity).toFixed(2)}</TableCell>
                                <TableCell className="text-right">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will remove the item from your cart.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="bg-destructive hover:bg-destructive/90"
                                                >
                                                    Remove
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
