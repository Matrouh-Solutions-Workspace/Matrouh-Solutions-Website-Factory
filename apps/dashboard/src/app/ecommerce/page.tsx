import { redirect } from "next/navigation";

/** Legacy portfolio URL; store management and creation remain on their own routes. */
export default async function EcommercePage({
  searchParams,
}: {
  readonly searchParams: Promise<{ createError?: string }>;
}) {
  const { createError } = await searchParams;
  const error = createError ? `&createError=${encodeURIComponent(createError)}` : "";
  redirect(`/websites?type=commerce&create=commerce${error}`);
}
