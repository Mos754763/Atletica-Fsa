"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

type Person = { name: string; role: string; image: string };
type ManagementCarouselProps = { people: Person[] };
type CardPosition = "active" | "previous" | "next" | "hidden";

function getCardPosition(index: number, activeIndex: number, total: number): CardPosition {
  const distance = (index - activeIndex + total) % total;
  if (distance === 0) return "active";
  if (distance === 1) return "next";
  if (distance === total - 1) return "previous";
  return "hidden";
}

export function ManagementCarousel({ people }: ManagementCarouselProps) {
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setPaused] = useState(false);
  const active = people[activeIndex];

  const move = (direction: 1 | -1) => setActiveIndex((current) => (current + direction + people.length) % people.length);
  const select = (index: number) => setActiveIndex(index);

  useEffect(() => {
    if (reducedMotion || isPaused || people.length < 2) return;
    const timer = window.setInterval(() => move(1), 5600);
    return () => window.clearInterval(timer);
  }, [activeIndex, isPaused, people.length, reducedMotion]);

  if (!active) return null;

  return (
    <section className="people-carousel" aria-roledescription="carrossel" aria-label="Gestão 2026 da ATLETICA FSA" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <button type="button" className="people-carousel__arrow people-carousel__arrow--previous" onClick={() => move(-1)} aria-controls="gestao-carousel-viewport" aria-label="Ver integrante anterior"><ChevronLeft size={23} /></button>
      <div id="gestao-carousel-viewport" className={`people-carousel__viewport${reducedMotion ? " people-carousel__viewport--reduced" : ""}`} tabIndex={0} onKeyDown={(event) => { if (event.key === "ArrowLeft") move(-1); if (event.key === "ArrowRight") move(1); }}>
        <p className="people-carousel__status" aria-live="polite">Exibindo {active.name}, {active.role}. Integrante {activeIndex + 1} de {people.length}.</p>
        <div className="people-carousel__track">
          {people.map((person, index) => {
            const position = getCardPosition(index, activeIndex, people.length);
            const isActive = position === "active";

            return (
              <article key={person.name} className={`people-carousel__slide people-carousel__slide--${position}`} aria-hidden={!isActive} aria-current={isActive ? "true" : undefined} data-position={position} style={isActive ? { opacity: 1, visibility: "visible" } : undefined}>
                <div className="people-carousel__photo"><img src={person.image} alt={isActive ? `${person.name}, ${person.role}, na gestão 2026 da ATLETICA FSA` : ""} loading="lazy" decoding="async" /></div>
                <div className="people-carousel__copy"><p>GESTÃO 2026 · {String(index + 1).padStart(2, "0")}/{String(people.length).padStart(2, "0")}</p><h3>{person.name}</h3><span>{person.role}</span></div>
                <span className="people-carousel__brand-mark" aria-hidden="true">FSA</span>
              </article>
            );
          })}
        </div>
      </div>
      <button type="button" className="people-carousel__arrow people-carousel__arrow--next" onClick={() => move(1)} aria-controls="gestao-carousel-viewport" aria-label="Ver próximo integrante"><ChevronRight size={23} /></button>
      <div className="people-carousel__controls"><div role="tablist" aria-label="Selecionar integrante">{people.map((person, index) => <button key={person.name} type="button" role="tab" aria-label={`Ver ${person.name}`} aria-selected={index === activeIndex} className={index === activeIndex ? "is-active" : ""} onClick={() => select(index)} />)}</div></div>
    </section>
  );
}
