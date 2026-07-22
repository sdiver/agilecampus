import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-line bg-surface px-6 py-3">
        <span className="font-display text-lg font-semibold text-ink">AgileCampus</span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          className="flex items-center gap-3"
        >
          <span className="text-sm text-ink-soft">{session.user.name}</span>
          <button className="ac-btn-ghost">退出</button>
        </form>
      </header>
      <div className="p-6">{children}</div>
    </div>
  );
}
