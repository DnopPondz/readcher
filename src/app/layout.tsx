import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { connection } from "next/server";
import { messages } from "@/messages";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-sans",
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: messages.app.name,
  description: messages.app.description,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The CSP nonce is per request, so every page must render dynamically.
  await connection();

  return (
    <html lang="th" className={`${notoSansThai.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
