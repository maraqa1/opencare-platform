import { DataDictionary } from "@/components/DataDictionary";

export function DictionaryView({ useCase }: { useCase: string }) {
  return <DataDictionary useCase={useCase} />;
}
