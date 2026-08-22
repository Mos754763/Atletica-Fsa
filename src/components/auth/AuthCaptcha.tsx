"use client";

import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      theme: "light" | "dark" | "auto";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": (errorCode?: string) => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const TURNSTILE_SCRIPT_ID = "cloudflare-turnstile-api";
const TURNSTILE_SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function getPublicTurnstileErrorCode(errorCode?: string) {
  return typeof errorCode === "string" && /^\d{6}$/.test(errorCode) ? errorCode : null;
}

function loadTurnstile() {
  if (typeof window === "undefined") return Promise.reject(new Error("Turnstile indisponível fora do navegador."));
  if (window.turnstile) return Promise.resolve(window.turnstile);

  return new Promise<TurnstileApi>((resolve, reject) => {
    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
    const script = existingScript ?? document.createElement("script");

    const onLoad = () => window.turnstile ? resolve(window.turnstile) : reject(new Error("API Turnstile não carregada."));
    const onError = () => reject(new Error("Não foi possível carregar a verificação de segurança."));

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });

    if (!existingScript) {
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = TURNSTILE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });
}

type AuthCaptchaProps = {
  onTokenChange: (token: string | null) => void;
  resetKey: number;
};

export function AuthCaptcha({ onTokenChange, resetKey }: AuthCaptchaProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let active = true;
    let turnstile: TurnstileApi | undefined;
    onTokenChange(null);
    setStatus("loading");
    setErrorCode(null);

    void loadTurnstile()
      .then((api) => {
        if (!active || !containerRef.current) return;
        turnstile = api;
        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: siteKey,
          theme: "auto",
          callback: (token) => {
            if (!active) return;
            onTokenChange(token);
            setStatus("ready");
            setErrorCode(null);
          },
          "expired-callback": () => {
            if (!active) return;
            onTokenChange(null);
            setStatus("error");
            setErrorCode(null);
          },
          "error-callback": (turnstileErrorCode) => {
            if (!active) return;
            onTokenChange(null);
            setStatus("error");
            setErrorCode(getPublicTurnstileErrorCode(turnstileErrorCode));
          },
        });
      })
      .catch(() => {
        if (!active) return;
        onTokenChange(null);
        setStatus("error");
        setErrorCode(null);
      });

    return () => {
      active = false;
      if (turnstile && widgetIdRef.current) turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [onTokenChange, siteKey]);

  useEffect(() => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      onTokenChange(null);
      setStatus("loading");
      setErrorCode(null);
    }
  }, [onTokenChange, resetKey]);

  if (!siteKey) return null;

  return (
    <section className="auth-captcha" aria-describedby="auth-captcha-help">
      <p id="auth-captcha-help" className="auth-captcha__label">Verificação de segurança</p>
      <div
        ref={containerRef}
        className="auth-captcha__widget"
        data-turnstile-error-code={errorCode ?? undefined}
      />
      <p className="auth-captcha__status" role="status" aria-live="polite">
        {status === "loading" && "Conclua a verificação para continuar."}
        {status === "ready" && "Verificação concluída."}
        {status === "error" && (
          errorCode
            ? `A verificação não pôde ser concluída. Código técnico: ${errorCode}. Tente novamente.`
            : "A verificação expirou ou não pôde ser concluída. Tente novamente."
        )}
      </p>
    </section>
  );
}
