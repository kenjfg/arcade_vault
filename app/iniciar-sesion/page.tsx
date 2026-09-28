"use client";

import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { useAuth } from "@/lib/auth-context";

export default function AuthPage() {
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = (name: string) => {
    login({ name });
    router.push("/juegos");
  };

  const handleGuest = () => {
    login(null);
    router.push("/juegos");
  };

  return (
    <div className="av-auth-wrap fade-in">
      <AuthForm onLogin={handleLogin} onGuest={handleGuest} />
    </div>
  );
}
