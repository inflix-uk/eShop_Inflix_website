import PersonProfilePage from "@/app/components/person-profile/PersonProfilePage";

export default function ReviewerProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <PersonProfilePage profileRole="reviewer" params={params} />;
}
