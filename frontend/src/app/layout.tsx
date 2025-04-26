import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
});

// Metadata is now defined in metadata.ts
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Fonts und globale Stile werden jetzt über globals.css verwaltet */}
      </head>
      <body className={`${lexend.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
