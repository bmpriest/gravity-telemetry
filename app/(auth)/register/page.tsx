import { notFound } from "next/navigation";
import RegisterForm from "./RegisterForm";

// Read the runtime env on the server. NEXT_PUBLIC_* would be inlined at build
// time, which doesn't work when the env is set by docker-compose at boot.
export const dynamic = "force-dynamic";

export default function RegisterPage() {
  if (process.env.ALLOW_PUBLIC_REGISTRATION !== "true") {
    notFound();
  }
  return <RegisterForm />;
}
