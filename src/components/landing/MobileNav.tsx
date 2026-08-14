"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="mobile-nav">
      <button className="nav-menu" type="button" onClick={() => setOpen((current) => !current)} aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} aria-controls="fsa-mobile-menu">
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
      {open && (
        <div id="fsa-mobile-menu" className="mobile-nav__panel">
          <a href="#setores" onClick={close}>Setores</a>
          <a href="#gestao" onClick={close}>Gestão</a>
          <a href="#loja" onClick={close}>Loja</a>
          <a href="#eventos" onClick={close}>Eventos</a>
          <Link href="/erp" onClick={close}>Acessar ERP</Link>
          <Link href="/login" onClick={close}>Entrar na FSA</Link>
        </div>
      )}
    </div>
  );
}
