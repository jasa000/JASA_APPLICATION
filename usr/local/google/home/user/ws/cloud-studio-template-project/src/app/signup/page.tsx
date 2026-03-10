
"use client";

import AuthForm from "@/components/auth-form";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/profile-setup');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <AuthForm defaultTab="signup" onSuccess={handleSuccess} />
    </div>
  );
}
