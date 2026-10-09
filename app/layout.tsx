import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store/StoreProvider";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "AET Platform",
  description: "AI Edge Talent — ciclo completo: preparación de Wave, postulación, compromiso, journey y cierre.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <StoreProvider>
          <Header />
          <main>
            <div className="container">{children}</div>
          </main>
          <footer className="footer">
            <div className="container spread">
              <span>AET Platform · AI Edge Talent · Kibernum</span>
              <span>Demo funcional: datos locales en este navegador. Sincronización operacional (Monday) pendiente.</span>
            </div>
          </footer>
        </StoreProvider>
      </body>
    </html>
  );
}
