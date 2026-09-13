"use client";

import { useState } from "react";

export interface WhatsAppContactProperties {
  readonly availability: string;
  readonly buttonLabel: string;
  readonly greeting: string;
  readonly phone: string;
  readonly prompt: string;
}

export function WhatsAppContact({
  availability,
  buttonLabel,
  greeting,
  phone,
  prompt,
}: WhatsAppContactProperties) {
  const [open, setOpen] = useState(false);
  const number = normalizeWhatsAppNumber(phone);
  if (!number) return null;

  const whatsappUrl = `https://wa.me/${number}?text=${encodeURIComponent(prompt)}`;

  return (
    <aside className="clinicWhatsApp" data-open={open ? "true" : "false"}>
      <div className="clinicWhatsAppCard" id="website-whatsapp-contact" role="status">
        <div className="clinicWhatsAppCardHead">
          <span className="clinicWhatsAppPresence" aria-hidden />
          <div>
            <strong>{greeting}</strong>
            <small>{availability}</small>
          </div>
        </div>
        <p>{prompt}</p>
        <a href={whatsappUrl} rel="noreferrer" target="_blank">
          <WhatsAppIcon />
          <span>{buttonLabel}</span>
          <span aria-hidden>↗</span>
        </a>
      </div>
      <button
        aria-controls="website-whatsapp-contact"
        aria-expanded={open}
        aria-label={buttonLabel}
        className="clinicWhatsAppToggle"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {open ? <span aria-hidden>×</span> : <WhatsAppIcon />}
      </button>
    </aside>
  );
}

function normalizeWhatsAppNumber(value: string): string | null {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

function WhatsAppIcon() {
  return (
    <svg aria-hidden viewBox="0 0 32 32">
      <path d="M16 3.1A12.7 12.7 0 0 0 5.2 22.5L3.5 28.8l6.5-1.7A12.7 12.7 0 1 0 16 3.1Zm0 2.3a10.4 10.4 0 1 1-5.3 19.3l-.5-.3-3.4.9.9-3.3-.3-.5A10.4 10.4 0 0 1 16 5.4Zm-5.2 4.7c-.3 0-.6.1-.8.4-.3.4-1.1 1.1-1.1 2.8s1.2 3.2 1.4 3.4c.2.2 2.4 3.7 5.8 5.1 2.9 1.1 3.5.9 4.1.8.6-.1 2.1-.9 2.4-1.7.3-.8.3-1.5.2-1.7-.1-.2-.4-.3-.8-.5l-2.4-1.1c-.3-.1-.6-.2-.8.2l-1.1 1.4c-.2.2-.4.3-.8.1a8.6 8.6 0 0 1-2.6-1.6 9.7 9.7 0 0 1-1.8-2.3c-.2-.4 0-.6.1-.8l.6-.7.4-.6c.1-.2 0-.5 0-.7l-1.1-2.5c-.3-.7-.6-.6-.9-.6h-.8Z" />
    </svg>
  );
}
