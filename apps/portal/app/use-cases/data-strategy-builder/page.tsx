import type { Metadata } from "next";

import DataStrategyBuilderClient from "./strategy-builder-client";

export const metadata: Metadata = {
  title: "Data Strategy Builder - Yottalogica",
};

export default function DataStrategyBuilderPage() {
  return <DataStrategyBuilderClient />;
}
