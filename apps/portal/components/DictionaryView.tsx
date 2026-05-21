import { DataDictionary } from "@/components/DataDictionary";

export function DictionaryView({
  managementMode = false,
  useCase,
  recordSpecBaseHref,
}: {
  managementMode?: boolean;
  useCase: string;
  recordSpecBaseHref?: string;
}) {
  return <DataDictionary managementMode={managementMode} useCase={useCase} recordSpecBaseHref={recordSpecBaseHref} />;
}
