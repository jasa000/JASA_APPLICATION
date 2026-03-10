
"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-provider";
import { useRouter } from "next/navigation";
import { getOrderSettings, updateOrderSettings } from "@/lib/data";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, PlusCircle, Trash2, InfinityIcon, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { v4 as uuidv4 } from 'uuid';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const deliveryRuleSchema = z.object({
  id: z.string(),
  from: z.coerce.number().min(0, "Must be non-negative."),
  to: z.coerce.number().min(0, "Must be non-negative.").nullable(),
  charge: z.coerce.number().min(0, "Must be non-negative."),
}).refine(data => data.to === null || data.from < data.to, {
    message: "'From' must be less than 'To'.",
    path: ["from"],
});

const settingsSchema = z.object({
  itemDeliveryRules: z.array(deliveryRuleSchema).refine(
    (rules) => {
      const sortedRules = [...rules].sort((a, b) => a.from - b.from);
      for (let i = 0; i < sortedRules.length - 1; i++) {
        const currentRuleEnd = sortedRules[i].to;
        const nextRuleStart = sortedRules[i + 1].from;
        if (currentRuleEnd === null || currentRuleEnd >= nextRuleStart) {
          return false; // Overlap detected
        }
      }
      return true;
    },
    { message: "Rule ranges cannot overlap. Please ensure 'To' of one rule is less than 'From' of the next." }
  ),
  xeroxDeliveryRules: z.array(deliveryRuleSchema).refine(
    (rules) => {
      const sortedRules = [...rules].sort((a, b) => a.from - b.from);
      for (let i = 0; i < sortedRules.length - 1; i++) {
        const currentRuleEnd = sortedRules[i].to;
        const nextRuleStart = sortedRules[i + 1].from;
        if (currentRuleEnd === null || currentRuleEnd >= nextRuleStart) {
          return false; // Overlap detected
        }
      }
      return true;
    },
    { message: "Rule ranges cannot overlap. Please ensure 'To' of one rule is less than 'From' of the next." }
  ),
});

const RuleSummary = ({ rules }: { rules: z.infer<typeof deliveryRuleSchema>[] }) => {
    const sortedRules = [...rules].sort((a, b) => a.from - b.from);

    if (sortedRules.length === 0) {
        return <p className="text-sm text-muted-foreground">No rules configured.</p>;
    }

    return (
        <Card className="bg-muted/50 mt-4">
            <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-base">Rule Summary</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                    {sortedRules.map((rule, index) => (
                        <li key={index}>
                            <span className="font-semibold">
                                {rule.to === null ? `₹${rule.from} and above` : `₹${rule.from} - ₹${rule.to}`}
                            </span>: <span className="text-primary font-bold">₹{rule.charge}</span> charge
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
};


export default function OrderSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      itemDeliveryRules: [],
      xeroxDeliveryRules: [],
    },
  });
  
  const watchedItemRules = form.watch("itemDeliveryRules");
  const watchedXeroxRules = form.watch("xeroxDeliveryRules");

  const { fields: itemFields, append: appendItemRule, remove: removeItemRule } = useFieldArray({
    control: form.control,
    name: "itemDeliveryRules",
  });

  const { fields: xeroxFields, append: appendXeroxRule, remove: removeXeroxRule } = useFieldArray({
    control: form.control,
    name: "xeroxDeliveryRules",
  });

  useEffect(() => {
    if (!authLoading) {
      if (!user || !user.roles.includes("admin")) {
        toast({ variant: "destructive", title: "Access Denied", description: "You do not have permission to view this page." });
        router.push("/");
      } else {
        fetchSettings();
      }
    }
  }, [user, authLoading, router, toast]);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const settings = await getOrderSettings();
      form.reset({
        itemDeliveryRules: (settings.itemDeliveryRules || []).map(rule => ({ ...rule, id: rule.id || uuidv4() })),
        xeroxDeliveryRules: (settings.xeroxDeliveryRules || []).map(rule => ({ ...rule, id: rule.id || uuidv4() })),
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: `Failed to fetch settings: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (values: z.infer<typeof settingsSchema>) => {
    setIsSubmitting(true);
    try {
      await updateOrderSettings(values);
      toast({ title: "Settings Saved", description: "Your order settings have been updated successfully." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Save Failed", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const renderGlobalError = (error: any) => {
    if (error?.root?.message) {
        return (
          <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Configuration Error</AlertTitle>
              <AlertDescription>{error.root.message}</AlertDescription>
          </Alert>
        )
    }
    return null;
  }

  const renderRuleInputs = (
    fields: any[], 
    append: (rule: any) => void, 
    remove: (index: number) => void, 
    namePrefix: "itemDeliveryRules" | "xeroxDeliveryRules"
  ) => (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div key={field.id} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2 p-2 border rounded-md bg-background">
          <FormField
            control={form.control}
            name={`${namePrefix}.${index}.from`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">From (₹)</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`${namePrefix}.${index}.to`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">To (₹)</FormLabel>
                <FormControl>
                    <div className="relative">
                        <Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? null : e.target.value)} placeholder="or empty for ∞" />
                         {field.value === null && <InfinityIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
                    </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`${namePrefix}.${index}.charge`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Charge (₹)</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => append({ id: uuidv4(), from: 0, to: null, charge: 0 })}>
        <PlusCircle className="mr-2 h-4 w-4" /> Add Rule
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="mt-2 h-4 w-1/2" />
        <Card className="mt-8">
            <CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader>
            <CardContent className="space-y-8">
                <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full mt-4" />
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-headline text-3xl font-bold tracking-tight lg:text-4xl">Order Settings</h1>
      <p className="mt-2 text-muted-foreground">Manage delivery charges with a tiered rule system. Rules are applied from top-to-bottom and must not have overlapping ranges.</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="mt-8 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Item Delivery Charges</CardTitle>
              <CardDescription>Set rules for Stationary, Books, and Electronic Kits.</CardDescription>
            </CardHeader>
            <CardContent>
              {renderRuleInputs(itemFields, appendItemRule, removeItemRule, "itemDeliveryRules")}
              {renderGlobalError(form.formState.errors.itemDeliveryRules)}
              <RuleSummary rules={watchedItemRules} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Xerox Delivery Charges</CardTitle>
              <CardDescription>Set rules specifically for Xerox & Printing services.</CardDescription>
            </CardHeader>
            <CardContent>
              {renderRuleInputs(xeroxFields, appendXeroxRule, removeXeroxRule, "xeroxDeliveryRules")}
              {renderGlobalError(form.formState.errors.xeroxDeliveryRules)}
              <RuleSummary rules={watchedXeroxRules} />
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Settings
          </Button>
        </form>
      </Form>
    </div>
  );
}
