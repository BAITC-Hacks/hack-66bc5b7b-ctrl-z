import {LocaleProvider} from './locale';
import type { Metadata } from "next";
import "./globals.css";
import "./product.css";
import "./redesign.css";
import "./features.css";
import "./storefront.css";

export const metadata: Metadata = {
  title: "Электрокомплект · Консультант",
  description: "Подбор электротехники по каталогу ekt.kz",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased"><LocaleProvider>{children}</LocaleProvider></body>
    </html>
  );
}
