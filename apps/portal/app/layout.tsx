import type { ReactNode } from "react";
import type { Metadata } from "next";

import { NavigationShell } from "@/components/navigation-shell";
import { buildNavigation } from "@/config/navigation";

import "./globals.css";

export const metadata: Metadata = {
  title: "OpenCare Portal",
  description: "Customer and admin portal for bed occupancy intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const navigation = buildNavigation("admin");

  return (
    <html lang="en">
      <body>
        <NavigationShell navigation={navigation}>
          {children}
        </NavigationShell>
      </body>
    </html>
  );
}
