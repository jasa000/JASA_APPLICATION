
"use client";

import AuthForm from "@/components/auth-form";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <AuthForm defaultTab="login" onSuccess={handleSuccess} />
    </div>
  );
}
