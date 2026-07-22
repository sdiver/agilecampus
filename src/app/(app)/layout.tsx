import Link from "next/link";
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
        <div className="flex items-center gap-6">
          <span className="font-display text-lg font-semibold text-ink">AgileCampus</span>
          <nav className="flex items-center gap-4">
            <Link href="/projects" className="text-sm text-ink-soft hover:text-primary">
              所有项目
            </Link>
            <Link href="/teams" className="text-sm text-ink-soft hover:text-primary">
              我的团队
            </Link>
          </nav>
        </div>
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
