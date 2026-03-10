
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-provider';
import { useRouter } from 'next/navigation';
import { getQueries, deleteQuery } from '@/lib/data';
import { getAllUsers } from '@/lib/users';
import type { Query, UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { MessagesSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function QueriesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [queries, setQueries] = useState<Query[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingQuery, setDeletingQuery] = useState<Query | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user || !user.roles.includes('admin')) {
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'You do not have permission to view this page.',
        });
        router.push('/');
      } else {
        fetchData();
      }
    }
  }, [user, authLoading, router, toast]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [fetchedQueries, fetchedUsers] = await Promise.all([
          getQueries(),
          getAllUsers(),
      ]);
      setQueries(fetchedQueries);
      setUsers(fetchedUsers);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to fetch data: ${error.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingQuery) return;
    setIsDeleting(true);
    try {
      await deleteQuery(deletingQuery.id);
      toast({ title: 'Query Deleted', description: 'The message has been removed.' });
      fetchData(); // Refresh data
      setDeletingQuery(null);
    } catch (error: any) {
       toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: error.message,
      });
    } finally {
        setIsDeleting(false);
    }
  };

  const usersMap = new Map(users.map(u => [u.uid, u]));

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-headline text-3xl font-bold tracking-tight lg:text-4xl">
          Queries & Feedback
        </h1>
        <p className="mt-2 text-muted-foreground">
          Messages submitted by users through the website footer.
        </p>

        <div className="mt-8 space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))
          ) : queries.length === 0 ? (
            <Card className="text-center py-16">
              <CardHeader>
                <MessagesSquare className="mx-auto h-16 w-16 text-muted-foreground" />
                <CardTitle className="mt-4">No Queries Yet</CardTitle>
                <CardDescription>
                  When users submit feedback, it will appear here.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            queries.map((query) => {
              const queryUser = usersMap.get(query.userId);
              return (
                <Card key={query.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-lg">{query.userName}</CardTitle>
                            <CardDescription>
                                Profile ID: {queryUser?.shortId || 'N/A'} | Mobile: {query.userMobile || 'N/A'}
                            </CardDescription>
                        </div>
                        <div className='flex items-center gap-2'>
                          <p className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(query.createdAt.toDate(), 'PPP p')}
                          </p>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this query. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => setDeletingQuery(query)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{query.message}</p>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
      
      <AlertDialog open={!!deletingQuery} onOpenChange={(open) => {if (!open) setDeletingQuery(null)}}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                <AlertDialogDescription>Are you sure you want to delete this query?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
