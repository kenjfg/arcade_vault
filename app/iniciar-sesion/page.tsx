import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: PageProps<"/iniciar-sesion">) {
  const { error } = await searchParams;

  return (
    <div className="av-auth-wrap fade-in">
      <LoginForm linkError={error === "enlace"} />
    </div>
  );
}
