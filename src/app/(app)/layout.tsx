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
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="font-bold">AgileCampus</span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <span className="mr-3 text-sm text-gray-500">{session.user.name}</span>
          <button className="text-sm underline">退出</button>
        </form>
      </header>
      <div className="p-6">{children}</div>
    </div>
  );
}
