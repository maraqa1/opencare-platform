import { DataDictionary } from "@/components/DataDictionary";

export function DictionaryView({
  useCase,
  recordSpecBaseHref,
}: {
  useCase: string;
  recordSpecBaseHref?: string;
}) {
  return <DataDictionary useCase={useCase} recordSpecBaseHref={recordSpecBaseHref} />;
}
