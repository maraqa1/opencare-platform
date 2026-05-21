import type { ReactNode } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";

import { NavigationShell } from "@/components/navigation-shell";
import { buildNavigation } from "@/config/navigation";

import "./globals.css";

export const metadata: Metadata = {
  title: "OpenCare Portal",
  description: "Customer and admin portal for bed occupancy intelligence.",
};

async function getPathname() {
  const headerStore = await headers();
  return headerStore.get("x-pathname") ?? "/";
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const pathname = await getPathname();
  const navigation = await buildNavigation("admin");

  return (
    <html lang="en">
      <body>
        <NavigationShell pathname={pathname} navigation={navigation}>
          {children}
        </NavigationShell>
      </body>
    </html>
  );
}
