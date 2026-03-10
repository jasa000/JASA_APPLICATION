
import { getShops } from "@/lib/shops";
import type { Shop } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Store } from "lucide-react";
import Link from "next/link";
import AdminDashboardClient from "./AdminDashboardClient";

export const dynamic = 'force-dynamic';

async function getShopData() {
    try {
        const allShops = await getShops();
        const serializableShops = allShops.map(shop => ({
            ...shop,
            createdAt: shop.createdAt.toDate().toISOString(),
        }));
        return { shops: serializableShops, error: null };
    } catch (error: any) {
        return { shops: [], error: `Failed to fetch shops: ${error.message}` };
    }
}

export default async function AdminDashboardPage() {
  const { shops, error } = await getShopData();

  return (
    <AdminDashboardClient initialShops={shops} error={error}>
        <div className="container mx-auto px-4 py-8">
            <h1 className="font-headline text-3xl font-bold tracking-tight lg:text-4xl">
                Admin Dashboard
            </h1>
            <p className="mt-2 text-muted-foreground">
                Select a shop to view its detailed performance and analytics.
            </p>

            <div className="mt-8">
                {shops.length === 0 ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>No Shops Found</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">No shops have been created yet.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {shops.map((shop) => (
                            <Card key={shop.id} className="flex flex-col">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Store className="h-5 w-5" /> {shop.name}
                                    </CardTitle>
                                    <CardDescription>{shop.address}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className="text-sm text-muted-foreground">
                                       Date Added: {shop.createdAt ? new Date(shop.createdAt).toLocaleDateString() : 'N/A'}
                                    </p>
                                </CardContent>
                                <CardFooter>
                                    <Button asChild className="w-full bg-blue-600 text-white hover:bg-blue-700">
                                        <Link href={`/admin/shops/${shop.id}`}>
                                            View
                                            <ChevronRight className="h-4 w-4 ml-2" />
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </AdminDashboardClient>
  );
}

    