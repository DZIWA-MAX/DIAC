import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/files",
  "/recent",
  "/favorites",
  "/shared",
  "/trash",
  "/vpn",
  "/settings",
  "/admin",
];

const ADMIN_PREFIXES = ["/admin"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAdminRoute = ADMIN_PREFIXES.some((p) => pathname.startsWith(p));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without credentials there is no way to establish who the caller is.
  // Throwing here would take down every route, including the public
  // landing page — so fail CLOSED on anything that needs a session and
  // let public pages render normally.
  if (!supabaseUrl || !supabaseAnonKey) {
    if (isProtected) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("reason", "config_error");
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // A transient Supabase/network failure must not 500 the whole site
  // either. Treating the caller as anonymous keeps this fail-closed: the
  // redirect below still guards every protected route.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    if (isProtected) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("reason", "session_unavailable");
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  if (isProtected && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    redirectUrl.searchParams.set("reason", "session_expired");
    return NextResponse.redirect(redirectUrl);
  }

  if (isAdminRoute && user) {
    // If the role lookup itself fails, deny rather than crash — an admin
    // page must never open just because the check errored.
    let profile: { role: string; status: string } | null = null;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("role,status")
        .eq("user_id", user.id)
        .single();
      profile = data;
    } catch {
      profile = null;
    }

    if (!profile || profile.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard?denied=1", request.url));
    }
    if (profile.status === "blocked") {
      return NextResponse.redirect(new URL("/login?reason=blocked", request.url));
    }
  }

  if ((pathname === "/login" || pathname === "/register") && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // api/share, api/vpn/config and api/vpn/nodes carry their own auth
    // (opaque token / node bearer secret) and are reached without a
    // session — a phone importing a VPN config is not logged in, and the
    // sync agent is a machine. Running the session middleware on them
    // only costs a wasted auth round-trip on every node poll.
    "/((?!_next/static|_next/image|favicon.ico|api/share|api/vpn/config|api/vpn/nodes|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
