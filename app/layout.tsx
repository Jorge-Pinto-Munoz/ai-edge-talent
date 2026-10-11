import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store/StoreProvider";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "AI Edge Talent · Kibernum",
  description: "AI Edge Talent — ciclo completo: preparación de Wave, postulación, compromiso, journey y cierre.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preload" href="/fonts/Gilroy-Regular.woff" as="font" type="font/woff" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/Gilroy-Bold.woff" as="font" type="font/woff" crossOrigin="anonymous" />
      </head>
      <body>
        <StoreProvider>
          <Header />
          <main>
            <div className="container">{children}</div>
          </main>
          <footer className="footer">
            <div className="container spread">
              <div className="row" style={{ gap: 16 }}>
                <img src="/brand/kibernum-blanco.svg" alt="Kibernum" />
                <span className="label">AI Edge Talent · AET Platform</span>
              </div>
              <span>Demo funcional: datos locales en este navegador. Imágenes ilustrativas, no participantes reales.</span>
            </div>
          </footer>
        </StoreProvider>
      </body>
    </html>
  );
}
