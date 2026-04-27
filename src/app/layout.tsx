import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "bdh1709.com",
  description: "Personal dashboard and portfolio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-bg-primary text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
