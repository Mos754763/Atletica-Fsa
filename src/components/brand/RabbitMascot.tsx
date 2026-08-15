"use client";

import { useState } from "react";

type RabbitMascotProps = { className?: string; compact?: boolean };
const mascotAssetUrl = "/manus-storage/fsa-mascot-alpha_2021fade.png";

export function RabbitMascot({ className = "", compact = false }: RabbitMascotProps) {
  const [imageUnavailable, setImageUnavailable] = useState(false);
  return <div className={`rabbit-mascot rabbit-mascot--asset ${compact ? "rabbit-mascot--compact" : ""} ${className}`}>
    {imageUnavailable ? <span className="rabbit-mascot__fallback" role="img" aria-label="Coelho mascote da ATLETICA FSA com tapa-olho e uniforme FSA"><i className="rabbit-mascot__fallback-ear rabbit-mascot__fallback-ear--left" /><i className="rabbit-mascot__fallback-ear rabbit-mascot__fallback-ear--right" /><i className="rabbit-mascot__fallback-face" /><i className="rabbit-mascot__fallback-patch" /><b>FSA</b></span> : <img className="rabbit-mascot__generated" src={mascotAssetUrl} alt="Coelho mascote da ATLETICA FSA, com tapa-olho e uniforme FSA" onError={() => setImageUnavailable(true)} />}
    {!compact && <span className="rabbit-mascot__tag">NÓS SOMOS FSA</span>}
  </div>;
}
