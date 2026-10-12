import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { normalizeKey, normalizeSupabaseUrl } from "@/lib/supabase/normalize";

/** Refresca la sesión de Supabase y protege el portal de administración real. */
export async function middleware(request: NextRequest) {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = normalizeKey(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !key) return NextResponse.next(); // modo demo: sin Supabase

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const PROTECTED = ["/admin/admision", "/admin/accesos", "/admin/journey", "/admin/contenido", "/admin/talento", "/admin/profesor", "/admin/lab", "/mi-journey", "/mentor", "/cliente", "/inicio"];
  const protectedPath = PROTECTED.some((p) => request.nextUrl.pathname.startsWith(p));
  if (protectedPath && !user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  matcher: [
    "/admin/admision/:path*", "/admin/accesos/:path*", "/admin/journey/:path*", "/admin/contenido/:path*", "/admin/talento/:path*", "/admin/profesor/:path*", "/admin/lab/:path*",
    "/mi-journey/:path*", "/mentor/:path*", "/cliente/:path*", "/inicio", "/auth/:path*", "/login",
  ],
};
