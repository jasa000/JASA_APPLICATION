
"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRouter } from "next/navigation";
import { getAllUsers, updateUserProfile } from "@/lib/users";
import { type UserProfile, type UserRole, USER_ROLES } from "@/lib/types";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Search, UserCog, Copy, CheckCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Set the secret code to a static value
const SECRET_CODE = "JASA642531";

export default function ManageUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedUser, setSearchedUser] = useState<UserProfile | null>(null);
  const [newRoles, setNewRoles] = useState<UserRole[]>([]);
  const [canManageProducts, setCanManageProducts] = useState(false);
  const [secretCode, setSecretCode] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user || !user.roles.includes("admin")) {
        router.push("/");
      }
    }
  }, [user, authLoading, router]);
  
  const fetchUsers = async () => {
    setLoading(true);
    try {
        const allUsers = await getAllUsers();
        setUsers(allUsers);
    } catch(e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch users.' });
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.roles.includes("admin")) {
      fetchUsers();
    }
  }, [user]);

  const handleSearch = () => {
    if (!searchQuery) {
        setSearchedUser(null);
        return;
    }
    const foundUser = users.find(u => u.email.toLowerCase() === searchQuery.toLowerCase());
    if (foundUser) {
        setSearchedUser(foundUser);
        setNewRoles(foundUser.roles || ['user']);
        setCanManageProducts(foundUser.canManageProducts || false);
    } else {
        setSearchedUser(null);
        toast({
            variant: "destructive",
            title: "User Not Found",
            description: "No user found with that email address.",
        });
    }
  };

  const handleRoleChange = async () => {
    if (secretCode !== SECRET_CODE) {
      toast({
        variant: "destructive",
        title: "Invalid Secret Code",
        description: "The secret code you entered is incorrect.",
      });
      return;
    }
    
    if (!searchedUser) return;

    setIsUpdating(true);
    try {
      const updatedProfile: Partial<UserProfile> = {
        roles: newRoles,
        canManageProducts: newRoles.includes('employee') ? canManageProducts : false,
      };

      await updateUserProfile(searchedUser.uid, updatedProfile);
      toast({
        title: "User Updated",
        description: `${searchedUser.name}'s profile has been updated.`,
      });
      fetchUsers(); // Re-fetch users to show the change
      setSecretCode('');
      setSearchedUser(null);
      setSearchQuery('');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast({
      title: "Email Copied",
      description: `${email} has been copied to your clipboard.`,
    });
  };

  const renderUserTable = (role: UserRole) => {
    const filteredUsers = users
      .filter((u) => u.roles?.includes(role))
      .sort((a, b) => a.email.localeCompare(b.email));

    if (loading) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }
    
    if (filteredUsers.length === 0) {
      return <p>No users found with this role.</p>;
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Joined</TableHead>
            {role === 'employee' && <TableHead>Product Access</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.map((u) => (
            <TableRow key={u.uid}>
              <TableCell>{u.name}</TableCell>
              <TableCell className="flex items-center gap-2">
                {u.email}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleCopyEmail(u.email)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TableCell>
              <TableCell>{u.createdAt ? new Date(u.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</TableCell>
              {role === 'employee' && (
                <TableCell>
                  {u.canManageProducts && (
                     <div
                        className="h-4 w-4 rounded-full bg-green-500"
                        style={{ animation: 'blink-green 1.5s infinite' }}
                        title="This user can manage products"
                    />
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };
  
  if (authLoading || !user?.roles.includes('admin')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-headline text-3xl font-bold tracking-tight lg:text-4xl">
          Manage Users
        </h1>
        <p className="mt-4 text-muted-foreground">
          Loading...
        </p>
      </div>
    );
  }


  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-headline text-3xl font-bold tracking-tight lg:text-4xl">
          Manage Users
        </h1>
        <p className="mt-4 text-muted-foreground">
          Admin tools for managing user accounts.
        </p>

        <Card className="mt-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserCog /> Edit User Roles</CardTitle>
                <CardDescription>Search for a user by email to view and modify their roles.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2">
                    <Input 
                        type="email"
                        placeholder="user@example.com"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch}><Search className="mr-2 h-4 w-4"/> Search</Button>
                </div>

                {searchedUser && (
                    <div className="mt-6 rounded-lg border p-6">
                        <h3 className="text-lg font-semibold">Editing: {searchedUser.name} ({searchedUser.email})</h3>
                        <div className="grid gap-4 py-4">
                            <div>
                                <Label className="font-medium">Roles</Label>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                {USER_ROLES.map((role) => (
                                    <div key={role} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`role-${role}`}
                                        checked={newRoles.includes(role)}
                                        disabled={role === 'user'}
                                        onCheckedChange={(checked) => {
                                        const updatedRoles = checked
                                            ? [...newRoles, role]
                                            : newRoles.filter((r) => r !== role);
                                        setNewRoles(updatedRoles);
                                        }}
                                    />
                                    <Label htmlFor={`role-${role}`} className="font-normal capitalize">{role}</Label>
                                    </div>
                                ))}
                                </div>
                            </div>

                            {newRoles.includes('employee') && (
                              <div>
                                <Label className="font-medium">Manage Products Access</Label>
                                <RadioGroup
                                  value={canManageProducts ? "yes" : "no"}
                                  onValueChange={(value) => setCanManageProducts(value === "yes")}
                                  className="mt-2 flex gap-4"
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="yes" id="manage-yes" />
                                    <Label htmlFor="manage-yes">Yes</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="no" id="manage-no" />
                                    <Label htmlFor="manage-no">No</Label>
                                  </div>
                                </RadioGroup>
                              </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="secret-code">
                                    Admin Secret Code
                                </Label>
                                <Input
                                    id="secret-code"
                                    type="password"
                                    value={secretCode}
                                    onChange={(e) => setSecretCode(e.target.value)}
                                    placeholder="Enter code to confirm changes"
                                />
                            </div>
                        </div>
                         <div className="flex justify-end gap-2">
                            <Button type="button" variant="secondary" onClick={() => setSearchedUser(null)}>
                            Cancel
                            </Button>
                            <Button onClick={handleRoleChange} disabled={isUpdating}>
                            {isUpdating ? 'Updating...' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>

        <Tabs defaultValue="user" className="mt-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="user">User</TabsTrigger>
            <TabsTrigger value="seller">Seller</TabsTrigger>
            <TabsTrigger value="employee">Employee</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>
          <TabsContent value="user">
            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
                <CardDescription>
                  Manage all registered users with the 'user' role.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderUserTable("user")}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="seller">
            <Card>
              <CardHeader>
                <CardTitle>Sellers</CardTitle>
                <CardDescription>
                  Manage all registered users with the 'seller' role.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderUserTable("seller")}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="employee">
            <Card>
              <CardHeader>
                <CardTitle>Employees</CardTitle>
                <CardDescription>
                  Manage all registered users with the 'employee' role.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderUserTable("employee")}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="admin">
            <Card>
              <CardHeader>
                <CardTitle>Admin</CardTitle>
                <CardDescription>
                  Manage all registered users with the 'admin' role.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderUserTable("admin")}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
