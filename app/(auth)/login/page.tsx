import LoginForm from "./LoginForm";

// Read runtime env on the server (NEXT_PUBLIC_* would be inlined at build).
export const dynamic = "force-dynamic";

export default function LoginPage() {
  const allowRegistration = process.env.ALLOW_PUBLIC_REGISTRATION === "true";
  return <LoginForm allowRegistration={allowRegistration} />;
}
