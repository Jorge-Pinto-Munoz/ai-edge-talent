import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { normalizeKey, normalizeSupabaseUrl } from "@/lib/supabase/normalize";

/** Refresca la sesión de Supabase y protege el portal de administración real. */
export async function middleware(request: NextRequest) {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = normalizeKey(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !key) return NextResponse.next(); // modo demo: sin Supabase

  // Con base de datos real, las pantallas del modo demo (datos ficticios) no deben quedar públicas.
  const legacy = legacyTarget(request.nextUrl.pathname);
  if (legacy) {
    const to = request.nextUrl.clone();
    to.pathname = legacy;
    to.search = legacy === "/postular/registro" ? "?wave=wave-3" : "";
    return NextResponse.redirect(to);
  }

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

  const PROTECTED = ["/admin/admision", "/admin/accesos", "/admin/journey", "/admin/contenido", "/admin/talento", "/admin/profesor", "/admin/lab", "/admin/vista", "/admin/soporte", "/admin/pulsos", "/mi-journey", "/mentor", "/cliente", "/inicio"];
  const protectedPath = PROTECTED.some((p) => request.nextUrl.pathname.startsWith(p));
  if (protectedPath && !user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return response;
}

/** Rutas del modo demo y su equivalente real. */
const LEGACY: [RegExp, string][] = [
  [/^\/kiber(\/|$)/, "/mi-journey"],
  [/^\/client(\/|$)/, "/cliente"],
  [/^\/delivery\/(waves|onboarding)(\/|$)/, "/admin"],
  [/^\/admin\/waves(\/|$)/, "/admin"],
  [/^\/apply(\/|$)/, "/postular/registro"],
];
function legacyTarget(path: string): string | null {
  return LEGACY.find(([re]) => re.test(path))?.[1] ?? null;
}

export const config = {
  matcher: [
    "/admin/admision/:path*", "/admin/accesos/:path*", "/admin/journey/:path*", "/admin/contenido/:path*", "/admin/talento/:path*", "/admin/profesor/:path*", "/admin/lab/:path*", "/admin/vista/:path*", "/admin/soporte/:path*",
    "/mi-journey/:path*", "/mentor/:path*",
    "/kiber/:path*", "/client/:path*", "/delivery/waves/:path*", "/delivery/onboarding", "/admin/waves/:path*", "/apply/:path*", "/cliente/:path*", "/inicio", "/auth/:path*", "/login",
  ],
};
