import { EcommerceStoreDashboard } from "@/app/ecommerce/stores/[storeId]/page";

export const dynamic = "force-dynamic";

export default function ClientEcommerceStorePage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ storeId: string }>;
  readonly searchParams: Promise<{ claimLink?: string }>;
}) {
  return <EcommerceStoreDashboard clientView params={params} searchParams={searchParams} />;
}
