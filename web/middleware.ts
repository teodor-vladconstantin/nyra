import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/components/shell/safe-next";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname, search } = request.nextUrl;

  if (!user && pathname.startsWith("/admin")) {
    // Păstrăm destinația ca după login să revină aici; safeNext o validează și la citire (login/page.tsx).
    const url = new URL("/login", request.url);
    const next = safeNext(pathname + search);
    if (next !== "/admin") url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }
  // Deja autentificat: /login nu are rost.
  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL(safeNext(request.nextUrl.searchParams.get("next")), request.url));
  }
  return response;
}

export const config = { matcher: ["/admin/:path*", "/login"] };
