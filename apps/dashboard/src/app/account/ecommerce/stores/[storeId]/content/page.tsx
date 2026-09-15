import { EcommerceContentEditor } from "@/app/ecommerce/stores/[storeId]/content/page";
export const dynamic = "force-dynamic";
export default function AccountEcommerceContentPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeId: string }>;
  searchParams: Promise<{ locale?: string }>;
}) {
  return <EcommerceContentEditor clientView params={params} searchParams={searchParams} />;
}
