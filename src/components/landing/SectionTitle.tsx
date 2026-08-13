type SectionTitleProps = {
  eyebrow: string;
  title: string;
  copy?: string;
  inverted?: boolean;
};

export function SectionTitle({ eyebrow, title, copy, inverted = false }: SectionTitleProps) {
  return (
    <header className={`section-title ${inverted ? "section-title--inverted" : ""}`}>
      <p>{eyebrow}</p>
      <h2>{title}</h2>
      {copy && <span>{copy}</span>}
    </header>
  );
}
