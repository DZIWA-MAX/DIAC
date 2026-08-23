import type { Metadata } from "next";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "NuvemX — Seus arquivos. Sua nuvem. Sua liberdade.",
  description:
    "NuvemX é uma plataforma de armazenamento em nuvem simples, rápida e segura para pessoas e pequenas empresas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <LocaleProvider>
          <ToastProvider>{children}</ToastProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
