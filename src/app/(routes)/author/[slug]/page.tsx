import PersonProfilePage from "@/app/components/person-profile/PersonProfilePage";

export default function AuthorProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <PersonProfilePage profileRole="author" params={params} />;
}
