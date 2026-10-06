import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinSight Analytics",
  description: "Transforme planilhas financeiras em dashboards interativos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
