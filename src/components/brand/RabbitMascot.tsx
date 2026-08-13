type RabbitMascotProps = {
  className?: string;
  compact?: boolean;
};

const mascotAssetUrl = "/manus-storage/fsa-rabbit-mascot_eebaa958.png";

export function RabbitMascot({ className = "", compact = false }: RabbitMascotProps) {
  return (
    <div className={`rabbit-mascot rabbit-mascot--asset ${compact ? "rabbit-mascot--compact" : ""} ${className}`}>
      <img className="rabbit-mascot__generated" src={mascotAssetUrl} alt="Coelho mascote da ATLETICA FSA, com tapa-olho e uniforme FSA" />
      {!compact && <span className="rabbit-mascot__tag">NÓS SOMOS FSA</span>}
    </div>
  );
}
