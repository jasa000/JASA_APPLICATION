
"use client";

import AuthForm from "@/components/auth-form";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/');
  };

  return (
    <div className="flex min-h-screen items-start justify-center bg-background p-4 sm:items-center">
      <AuthForm defaultTab="signup" onSuccess={handleSuccess} />
    </div>
  );
}
