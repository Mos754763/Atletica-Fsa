"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

type Person = { name: string; role: string; image: string };
type ManagementCarouselProps = { people: Person[] };

export function ManagementCarousel({ people }: ManagementCarouselProps) {
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setPaused] = useState(false);
  const active = people[activeIndex];

  const move = (direction: 1 | -1) => setActiveIndex((current) => (current + direction + people.length) % people.length);

  useEffect(() => {
    if (reducedMotion || isPaused || people.length < 2) return;
    const timer = window.setInterval(() => move(1), 5600);
    return () => window.clearInterval(timer);
  }, [activeIndex, isPaused, people.length, reducedMotion]);

  if (!active) return null;

  return (
    <section className="people-carousel" aria-roledescription="carrossel" aria-label="Gestão 2026 da ATLETICA FSA" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="people-carousel__viewport" tabIndex={0} onKeyDown={(event) => { if (event.key === "ArrowLeft") move(-1); if (event.key === "ArrowRight") move(1); }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.article key={active.name} className="people-carousel__slide" initial={reducedMotion ? false : { opacity: 0, y: 20, rotate: -1.5 }} animate={{ opacity: 1, y: 0, rotate: 0 }} exit={reducedMotion ? undefined : { opacity: 0, y: -14, rotate: 1.5 }} transition={{ duration: 0.46, ease: [0.23, 1, 0.32, 1] }}>
            <div className="people-carousel__photo"><img src={active.image} alt={`${active.name}, ${active.role}, na gestão 2026 da ATLETICA FSA`} /></div>
            <div className="people-carousel__copy"><p>GESTÃO 2026 · {String(activeIndex + 1).padStart(2, "0")}/{String(people.length).padStart(2, "0")}</p><h3>{active.name}</h3><span>{active.role}</span></div>
          </motion.article>
        </AnimatePresence>
      </div>
      <div className="people-carousel__controls"><button type="button" onClick={() => move(-1)} aria-label="Ver integrante anterior"><ChevronLeft size={20} /></button><div role="tablist" aria-label="Selecionar integrante">{people.map((person, index) => <button key={person.name} type="button" role="tab" aria-label={`Ver ${person.name}`} aria-selected={index === activeIndex} className={index === activeIndex ? "is-active" : ""} onClick={() => setActiveIndex(index)} />)}</div><button type="button" onClick={() => move(1)} aria-label="Ver próximo integrante"><ChevronRight size={20} /></button></div>
    </section>
  );
}
