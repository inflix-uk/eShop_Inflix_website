import DynamicPageClient from "@/app/[slug]/DynamicPageClient";

export const dynamic = "force-dynamic";

export default async function DynamicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <DynamicPageClient slug={slug} />;
}
