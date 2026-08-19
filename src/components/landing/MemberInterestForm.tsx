"use client";

import { useActionState } from "react";
import { Send, ShieldCheck } from "lucide-react";
import { initialMemberInterestState, submitMemberInterest } from "@/app/member-interest-actions";

const interestOptions = ["Esportes", "Eventos", "Marketing", "Sociais", "Suprimentos", "Bateria"];

export function MemberInterestForm() {
  const [state, formAction, isPending] = useActionState(submitMemberInterest, initialMemberInterestState);

  return <form className="membership-form" action={formAction} noValidate>
    <div className="membership-form__honey" aria-hidden="true"><label>Empresa<input name="company" tabIndex={-1} autoComplete="off" /></label></div>
    <label>Nome completo<input name="fullName" required autoComplete="name" placeholder="Como a gestão deve te chamar?" /></label>
    <label>E-mail<input name="email" type="email" required autoComplete="email" placeholder="voce@exemplo.com" /></label>
    <label>WhatsApp <small>opcional</small><input name="whatsapp" inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000" /></label>
    <label>Curso <small>opcional</small><input name="course" autoComplete="organization-title" placeholder="Ex.: Administração" /></label>
    <label>Período <small>opcional</small><input name="semester" placeholder="Ex.: 3º período" /></label>
    <fieldset><legend>Onde você quer somar? <small>até 4 opções</small></legend><div className="membership-form__interests">{interestOptions.map((interest) => <label key={interest}><input type="checkbox" name="interests" value={interest} /> <span>{interest}</span></label>)}</div></fieldset>
    <label className="membership-form__message">Conta para a gente <small>opcional</small><textarea name="message" maxLength={700} placeholder="Experiências, ideias ou o que te move a participar." /></label>
    <label className="membership-form__consent"><input name="consent" type="checkbox" required /> <span>Autorizo a ATLETICA FSA a usar estes dados exclusivamente para responder ao meu interesse de participação.</span></label>
    <button type="submit" disabled={isPending}>{isPending ? "Enviando cadastro..." : <><Send size={16} /> Quero participar</>}</button>
    {state.status !== "idle" && <p className={`membership-form__notice membership-form__notice--${state.status}`} role="status">{state.status === "success" && <ShieldCheck size={16} />}{state.message}</p>}
  </form>;
}
