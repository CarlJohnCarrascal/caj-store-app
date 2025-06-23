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
import { Smartphone, Trash2, Plus, Minus, FileText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const eloadingServices = [
  "SimCard Load",
  "TV Load",
  "Other",
];

export default function EloadingPage() {
  const { cartItems, addToCart, removeFromCart, updateQuantity } = useCart();
  const { toast } = useToast();

  const [service, setService] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [fee, setFee] = useState('');

  const eloadingCartItems = cartItems.filter(item => item.category === 'E-loading');

  const handleAddToCart = () => {
    if (!service || !description || !cost || !fee) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please fill in all fields to add the service to the order.',
      });
      return;
    }

    const costValue = parseFloat(cost);
    const feeValue = parseFloat(fee);

    if (isNaN(costValue) || costValue < 0) {
      toast({ variant: 'destructive', title: 'Invalid Cost', description: 'Please enter a valid cost.' });
      return;
    }
    if (isNaN(feeValue) || feeValue < 0) {
      toast({ variant: 'destructive', title: 'Invalid Fee', description: 'Please enter a valid fee.' });
      return;
    }

    const finalPrice = costValue + feeValue;

    const eloadingProduct: Product = {
      id: `eloading-${service.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
      name: `E-loading: ${service}`,
      price: finalPrice,
      description: `${description} (Cost: ₱${costValue.toFixed(2)}, Fee: ₱${feeValue.toFixed(2)})`,
      group: 'Services',
      show: false,
      category: 'E-loading',
      stock: 999,
      material: 'N/A',
      dimensions: 'N/A',
      image: 'https://placehold.co/600x600.png',
      unit: 'each',
    };

    addToCart(eloadingProduct, 1);

    setService('');
    setDescription('');
    setCost('');
    setFee('');

    toast({
        title: 'Service Added to Order',
        description: `${service} for ${description} has been added to your order.`,
    });
  };

  return (
    <div className="space-y-8">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="mt-4">E-loading Service</CardTitle>
          <CardDescription>
            Configure the e-loading transaction and add it to the order.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="service-type">Service Type</Label>
              <Select value={service} onValueChange={setService}>
                <SelectTrigger id="service-type">
                  <SelectValue placeholder="Select a loading service" />
                </SelectTrigger>
                <SelectContent>
                  {eloadingServices.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Phone #, Account #, etc.)</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="description" 
                  placeholder="e.g. 09123456789" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="pl-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost">Cost</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₱</span>
                  <Input 
                    id="cost" 
                    type="number" 
                    placeholder="e.g. 100.00" 
                    value={cost} 
                    onChange={(e) => setCost(e.target.value)} 
                    className="pl-7"
                  />
                </div>
              </div>
               <div className="space-y-2">
                <Label htmlFor="fee">Fee</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₱</span>
                  <Input 
                    id="fee" 
                    type="number" 
                    placeholder="e.g. 2.00" 
                    value={fee} 
                    onChange={(e) => setFee(e.target.value)} 
                    className="pl-7"
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleAddToCart} className="w-full" size="lg">
              Add to Order
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {eloadingCartItems.length > 0 && (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Added E-loading Transactions</CardTitle>
                <CardDescription>
                    These items have been added to your order. You can manage them here.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Service</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Price (Cost+Fee)</TableHead>
                            <TableHead className="text-center">Quantity</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {eloadingCartItems.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name.replace('E-loading: ', '')}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{item.description}</TableCell>
                                <TableCell className="text-right">₱{item.price.toFixed(2)}</TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                        >
                                            <Minus className="h-4 w-4" />
                                        </Button>
                                        <Input
                                            type="number"
                                            value={item.quantity}
                                            min="1"
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value, 10);
                                                updateQuantity(item.id, isNaN(val) || val < 1 ? 1 : val)
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
                                                    This will remove the item from your order.
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
