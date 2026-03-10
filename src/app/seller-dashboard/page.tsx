
import { getShops } from "@/lib/shops";
import type { Shop } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderKanban, Store } from "lucide-react";
import Link from "next/link";
import SellerDashboardClient from "./SellerDashboardClient";

export const dynamic = 'force-dynamic';

async function getShopData() {
    try {
        const allShops = await getShops();
        // Serialize the createdAt field to prevent Next.js hydration errors
        const serializableShops = allShops.map(shop => ({
            ...shop,
            createdAt: shop.createdAt.toDate().toISOString(),
        }));
        return { shops: serializableShops, error: null };
    } catch (error: any) {
        return { shops: [], error: `Could not load your shops: ${error.message}` };
    }
}

export default async function SellerDashboardPage() {
  const { shops, error } = await getShopData();

  return (
    <SellerDashboardClient allShops={shops} error={error}>
        <div className="container mx-auto px-4 py-8">
            <h1 className="font-headline text-3xl font-bold tracking-tight lg:text-4xl">
                Seller Dashboard
            </h1>
            <p className="mt-2 text-muted-foreground">
                Welcome. Here are the shops you manage.
            </p>
        </div>
    </SellerDashboardClient>
  );
}
