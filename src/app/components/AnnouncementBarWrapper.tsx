"use client";

import dynamic from "next/dynamic";
import type { AnnouncementBannerPublic } from "@/app/services/announcementBannerService";

const AnnouncementBar = dynamic(
  () => import("@/app/components/AnnouncementBar"),
  {
    ssr: false,
    loading: () => null,
  }
);

type Props = {
  initial: AnnouncementBannerPublic;
};

export default function AnnouncementBarWrapper({ initial }: Props) {
  return <AnnouncementBar initial={initial} />;
}
