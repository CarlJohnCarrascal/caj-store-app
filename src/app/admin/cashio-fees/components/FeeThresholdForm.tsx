'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { FeeThreshold } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { addFeeThresholdAction, updateFeeThresholdAction } from '@/lib/actions';
import { useTransition } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  from: z.coerce.number().min(0, 'Must be a positive number'),
  to: z.coerce.number().min(0, 'Must be a positive number'),
  fee: z.coerce.number().min(0, 'Fee must be a positive number'),
  type: z.enum(['fixed', 'per_thousand_flat']),
  notes: z.string().optional(),
}).refine(data => data.to >= data.from, {
  message: "'To' value must be greater than or equal to 'From' value.",
  path: ["to"],
});

type FormValues = z.infer<typeof formSchema>;

interface FeeThresholdFormProps {
  threshold?: FeeThreshold;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function FeeThresholdForm({ threshold, onSuccess, onCancel }: FeeThresholdFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: threshold || {
      from: 0,
      to: 0,
      fee: 0,
      type: 'fixed',
      notes: '',
    },
  });

  const onSubmit = (data: FormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }
    startTransition(async () => {
      try {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          formData.append(key, String(value));
        });

        formData.append('userId', user.uid);
        formData.append('userName', user.displayName || user.email!);

        if (threshold) {
          await updateFeeThresholdAction(threshold.id, formData);
          toast({ title: 'Success', description: 'Fee threshold updated successfully.' });
        } else {
          await addFeeThresholdAction(formData);
          toast({ title: 'Success', description: 'Fee threshold added successfully.' });
        }
        
        if (onSuccess) {
            onSuccess();
        } else {
            router.push('/admin/cashio-fees');
            router.refresh();
        }
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Something went wrong.' });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
        <div className="grid md:grid-cols-2 gap-6">
          <FormField control={form.control} name="from" render={({ field }) => (
            <FormItem>
              <FormLabel>Amount From (₱)</FormLabel>
              <FormControl><Input type="number" step="1" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="to" render={({ field }) => (
            <FormItem>
              <FormLabel>Amount To (₱)</FormLabel>
              <FormControl><Input type="number" step="1" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
             <FormField control={form.control} name="fee" render={({ field }) => (
                <FormItem>
                    <FormLabel>Fee (₱)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Calculation Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="fixed">Fixed Fee</SelectItem>
                        <SelectItem value="per_thousand_flat">Per 1000 of Amount</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>
        <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem>
            <FormLabel>Notes (Optional)</FormLabel>
            <FormControl><Textarea placeholder="Add any relevant notes here..." {...field} /></FormControl>
            <FormMessage />
            </FormItem>
        )} />

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (threshold ? 'Saving...' : 'Adding...') : (threshold ? 'Save Changes' : 'Add Threshold')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
