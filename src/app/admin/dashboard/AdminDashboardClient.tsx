
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import type { Shop } from "@/lib/types";

type SerializableShop = Omit<Shop, 'createdAt'> & {
    createdAt: string; 
};

type AdminDashboardClientProps = {
    children: React.ReactNode;
    initialShops: SerializableShop[];
    error: string | null;
}

export default function AdminDashboardClient({ children, initialShops, error }: AdminDashboardClientProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading) {
      if (!user || !user.roles.includes("admin")) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You do not have permission to view this page.",
        });
        router.push("/");
      }
    }
    if (error) {
         toast({
            variant: "destructive",
            title: "Error",
            description: error,
        });
    }
  }, [user, authLoading, router, toast, error]);

  if (authLoading) {
      return (
          <div className="container mx-auto px-4 py-8">
              <h1 className="font-headline text-3xl font-bold tracking-tight lg:text-4xl">
                  Admin Dashboard
              </h1>
              <p className="mt-2 text-muted-foreground">
                  Verifying permissions...
              </p>
          </div>
      )
  }

  return <>{children}</>;
}
