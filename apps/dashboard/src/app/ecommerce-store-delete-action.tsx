"use client";

import { deleteEcommerceStoreAction } from "@/app/ecommerce/actions";
import { PendingSubmit } from "@/app/pending-submit";

export function EcommerceStoreDeleteAction({
  storeId,
  storeName,
  label,
  pendingLabel,
  confirmation,
}: {
  readonly storeId: string;
  readonly storeName: string;
  readonly label: string;
  readonly pendingLabel: string;
  readonly confirmation: string;
}) {
  return (
    <form
      action={deleteEcommerceStoreAction}
      className="commerceStoreDeleteForm"
      onSubmit={(event) => {
        if (!window.confirm(confirmation.replace("{name}", storeName))) event.preventDefault();
      }}
    >
      <input name="storeId" type="hidden" value={storeId} />
      <PendingSubmit className="dangerButton" pendingLabel={pendingLabel}>
        {label}
      </PendingSubmit>
    </form>
  );
}
