"use client";

import { useActionState } from "react";
import { initialTemplateImportState } from "./import-action-state";
import { importTemplateAction } from "./import-actions";

export function TemplateImportForm() {
  const [state, action, pending] = useActionState(importTemplateAction, initialTemplateImportState);
  return (
    <form action={action} className="templateImportForm">
      <div className="templateImportFields">
        <label>
          Discovery manifest
          <input accept="application/json,.json" name="discovery" required type="file" />
          <small>matrouh.template.json</small>
        </label>
        <label>
          Generated manifest
          <input accept="application/json,.json" name="manifest" required type="file" />
          <small>generated/matrouh.template.manifest.json</small>
        </label>
        <label>
          Compiled entry
          <input accept="text/javascript,.js,.mjs" name="entry" required type="file" />
          <small>dist/index.js (ES module)</small>
        </label>
      </div>
      <label className="templateTrustCheck">
        <input name="trusted" required type="checkbox" value="yes" />
        <span>
          I trust this template author and understand that the compiled template runs server-side.
        </span>
      </label>
      {state.message && (
        <p aria-live="polite" className={`formNotice formNotice--${state.status}`}>
          {state.message}
        </p>
      )}
      <button disabled={pending} type="submit">
        {pending ? "Validating artifact…" : "Import template"}
      </button>
    </form>
  );
}
