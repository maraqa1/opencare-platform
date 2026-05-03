import Link from "next/link";

export function SignalChip({
  label,
  value,
  tone = "neutral",
  href,
}: {
  label: string;
  value: string;
  tone?: "positive" | "warning" | "critical" | "neutral";
  href?: string;
}) {
  const content = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
    </>
  );

  if (href) {
    return (
      <Link className={`signal-chip ${tone}`} href={href}>
        {content}
      </Link>
    );
  }

  return <span className={`signal-chip ${tone}`}>{content}</span>;
}
