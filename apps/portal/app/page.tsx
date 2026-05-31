import type { Metadata } from "next";
import { HomeClient } from "@/app/home-client";

export const metadata: Metadata = {
  title: "Home - OpenCare Portal",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function HomePage() {
  return <HomeClient />;
}
