"use client";

import { useState } from "react";
import { Icon } from "@/app/icons";

export function CopyClaimLink({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="claimLinkRow">
      <output className="claimLink" aria-label="رابط المطالبة المُنشأ">
        {value}
      </output>
      <button
        aria-label={copied ? "Claim link copied" : "Copy claim link"}
        className="iconButton claimLinkCopy"
        onClick={() => void copyLink()}
        title={copied ? "Copied" : "Copy link"}
        type="button"
      >
        <Icon name="copy" />
        <span className="srOnly">{copied ? "Copied" : "Copy link"}</span>
      </button>
    </div>
  );
}
