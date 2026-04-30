import TopBar from "@/app/topbar/page";
import Nav from "@/app/components/navbar/Nav";
import Link from "next/link";
import ProfileBlocksRenderer from "./ProfileBlocksRenderer";

type Props = {
  params: Promise<{ role: string; slug: string }>;
};

function toSlug(value: string): string {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function getProfileByRoleAndSlug(role: string, slug: string) {
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  if (!apiBase) return null;

  try {
    const limit = 200;
    const maxPages = 30;
    const allMatches: Array<{
      name: string;
      designation: string;
      bio: string;
      image: string;
      blocks: any[];
    }> = [];

    for (let page = 1; page <= maxPages; page++) {
      const response = await fetch(
        `${apiBase}/newblog/get/all/blog/posts?limit=${limit}&page=${page}`,
        { next: { revalidate: 60 } }
      );
      if (!response.ok) break;

      const payload = await response.json();
      const posts = Array.isArray(payload?.data) ? payload.data : [];
      if (posts.length === 0) break;

      for (const post of posts) {
        const person = role === "reviewer" ? post?.reviewer : post?.author;
        if (!person || typeof person !== "object") continue;
        const name = String(person?.name || person?.fullName || "");
        if (name && toSlug(name) === slug) {
          allMatches.push({
            name,
            designation: String(person?.designation || ""),
            bio: String(person?.bio || person?.description || ""),
            image: String(person?.image || person?.profileImage || ""),
            blocks: Array.isArray(person?.blocks) ? person.blocks : [],
          });
        }
      }

      const totalPages = Number(payload?.pagination?.pages || 0);
      if (totalPages > 0 && page >= totalPages) break;
      if (posts.length < limit) break;
    }

    if (allMatches.length === 0) return null;

    // Prefer profile variant with richer data.
    const withBlocks = allMatches.find(
      (entry) => Array.isArray(entry.blocks) && entry.blocks.length > 0
    );
    if (withBlocks) return withBlocks;
    const withBio = allMatches.find((entry) => entry.bio && entry.bio.trim().length > 0);
    if (withBio) return withBio;
    return allMatches[0];
  } catch (error) {
    console.error("Failed to fetch profile data:", error);
  }

  return null;
}

function getFullImageUrl(imagePath?: string): string {
  if (!imagePath) return "";
  const trimmed = String(imagePath).trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  const normalized = trimmed.replace(/^\/?uploads\//, "");
  return `${apiBase}/uploads/${normalized}`;
}

export default async function PersonProfilePage({ params }: Props) {
  const { role, slug } = await params;
  const profile = await getProfileByRoleAndSlug(role, slug);

  const fallbackName = slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  const name = profile?.name || fallbackName || "Profile";
  const designation = profile?.designation || "Designation";
  const bio = profile?.bio || "Bio is not available.";
  const profileImage = getFullImageUrl(profile?.image);
  const profileBlocks = Array.isArray(profile?.blocks) ? profile.blocks : [];
  const roleLabel = role === "reviewer" ? "Reviewer" : "Author";

  return (
    <>
      <TopBar />
      <Nav />

      <main className="min-h-screen  py-14">
        <div className="max-w-7xl mx-auto px-4">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-600">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="hover:text-primary transition-colors">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <span>Profiles</span>
              </li>
              <li aria-hidden="true">/</li>
              <li className="capitalize">{roleLabel}</li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-900 font-medium capitalize">{name}</li>
            </ol>
          </nav>

          {/* Profile Card */}
          <div className=" p-8 sm:p-10">

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">

              {/* Avatar */}
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={name}
                  className="w-24 h-24 rounded-2xl border border-gray-200 object-cover shadow-sm"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-gray-200 flex items-center justify-center text-indigo-700 text-2xl font-bold shadow-sm">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Identity */}
              <div className="text-center sm:text-left">
                <p className="text-xs uppercase tracking-widest text-gray-400">
                  {roleLabel}
                </p>

                <h1 className="text-2xl sm:text-3xl capitalize font-semibold text-gray-900 mt-1">
                  {name}
                </h1>

                <p className="text-base text-gray-500 capitalize mt-1">
                  {designation}
                </p>

                <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-600">
                  Verified {roleLabel}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="my-8 border-t border-gray-100" />

            {/* Bio Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 tracking-wide uppercase">
                About
              </h2>

              <p className="text-gray-700 text-base leading-8 whitespace-pre-line">
                {bio}
              </p>
            </div>

            {/* Content row blocks */}
            {profileBlocks.length > 0 ? (
              <div className="mt-10 pt-8 border-t border-gray-100">
                <ProfileBlocksRenderer blocks={profileBlocks} />
              </div>
            ) : null}

          </div>

        </div>
      </main>
    </>
  );
}