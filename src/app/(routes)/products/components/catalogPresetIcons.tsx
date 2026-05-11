"use client";

import React from "react";

/**
 * Preset VariantAttribute icon IDs (admin ProductCentralVariantAttributes AVAILABLE_ICONS).
 * Stored in MongoDB as plain strings — must be resolved on the storefront (not HTML/URLs).
 */
const PRESET_ICON_IDS = new Set([
  "powerAdapter",
  "chargingCable",
  "protectionBundle",
  "treePlanted",
  "hdmiCable",
  "powerCableNew",
  "onexController",
  "twoxController",
  "freeSim",
  "screenProtector",
  "backCover",
]);

export function isCatalogPresetIconId(icon: string | null | undefined): boolean {
  if (!icon || typeof icon !== "string") return false;
  const t = icon.trim();
  if (!t) return false;
  if (t.includes("<") || t.includes(">") || t.includes("/") || /\s/.test(t)) {
    return false;
  }
  return PRESET_ICON_IDS.has(t);
}

function AdapterIcon() {
  return (
    <svg width="27" height="40" viewBox="0 0 27 40" fill="none" className="h-6 w-6">
      <path
        d="M7.25 26V38.5M19.75 5.16699H26M19.75 13.5H26"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.167 1H17.667C18.2194 1 18.7493 1.21946 19.1399 1.6101C19.5305 2.00073 19.75 2.53055 19.75 3.083V23.917C19.75 24.4694 19.5305 24.9993 19.1399 25.3899C18.7493 25.7805 18.2194 26 17.667 26H3.083C2.53055 26 2.00074 25.7805 1.6101 25.3899C1.21946 24.9993 1 24.4694 1 23.917V5.167C1 4.06184 1.43902 3.00195 2.22049 2.22049C3.00195 1.43902 4.06184 1 5.167 1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PowerCableIcon() {
  return (
    <svg width="55" height="41" viewBox="0 0 55 41" fill="none" className="h-6 w-6">
      <path d="M1.25 34.857H11.875V39.088H1.25V34.857Z" fill="currentColor" className="opacity-50" />
      <path d="M42 1.08398H52.625V5.31499H42V1.08398Z" fill="currentColor" className="opacity-40" />
      <path
        d="M12.0001 37.276H47.564C47.564 37.276 54 37.276 54 28.083C54 18.89 47.885 18.89 47.885 18.89H8.57705C8.57705 18.89 2.72705 18.89 2.72705 10.587C2.72705 2.28399 8.57705 3.23299 8.57705 3.23299H41.7961"
        stroke="currentColor"
        strokeWidth="2"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1.25 34.857H11.875V39.088H1.25V34.857ZM42 1.08398H52.625V5.31499H42V1.08398Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProtectionBundleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 31 32" fill="none" className="h-6 w-6">
      <path
        d="M29.44 6.30957L16.44 0.0995696C16.3044 0.0340373 16.1557 0 16.005 0C15.8544 0 15.7057 0.0340373 15.57 0.0995696L0.570006 7.33957C0.399834 7.42062 0.256033 7.54811 0.155183 7.70735C0.0543326 7.86659 0.000539634 8.05108 6.06551e-06 8.23957V24.7896C-0.000673562 24.9847 0.0557737 25.1758 0.162389 25.3393C0.269005 25.5028 0.421128 25.6315 0.600006 25.7096L13.6 31.8996C13.7357 31.9651 13.8844 31.9991 14.035 31.9991C14.1857 31.9991 14.3344 31.9651 14.47 31.8996L29.47 24.6596C29.6402 24.5785 29.784 24.451 29.8848 24.2918C29.9857 24.1326 30.0395 23.9481 30.04 23.7596V7.20957C30.0368 7.01781 29.9786 6.83102 29.8722 6.67144C29.7658 6.51187 29.6158 6.38626 29.44 6.30957ZM16.01 2.10957L26.94 7.32957L21.89 9.76957L11.22 4.41957L16.01 2.10957ZM14.01 13.5996L3.01001 8.36957L8.91001 5.51957L19.61 10.8696L14.01 13.5996ZM2.01001 10.0896L13.01 15.3596V29.4196L2.01001 24.1596V10.0896ZM15.01 29.4096V15.3196L28.01 9.02957V23.1296L15.01 29.4096Z"
        fill="currentColor"
      />
    </svg>
  );
}

function TreeIcon() {
  return (
    <svg width="27" height="28" viewBox="0 0 27 28" fill="none" className="h-6 w-6">
      <path
        d="M9.99999 28H6.99999V26H9.99999V13.566L6.48499 11.457L7.51499 9.74304L11.029 11.851C11.3245 12.0295 11.569 12.281 11.7391 12.5814C11.9092 12.8817 11.999 13.2209 12 13.566V26C12 26.5305 11.7893 27.0392 11.4142 27.4143C11.0391 27.7893 10.5304 28 9.99999 28Z"
        fill="currentColor"
      />
      <path
        d="M20 28H17C16.4696 28 15.9609 27.7893 15.5858 27.4142C15.2107 27.0391 15 26.5304 15 26V15H21C21.5587 15.0001 22.1113 14.8831 22.6221 14.6566C23.1328 14.4301 23.5905 14.0992 23.9656 13.685C24.3406 13.2709 24.6247 12.7827 24.7996 12.2521C24.9745 11.7214 25.0363 11.16 24.981 10.604C24.847 9.59251 24.345 8.66585 23.571 8.00103C22.7969 7.33622 21.8051 6.97985 20.785 7H19.202L19.025 6.221C18.452 3.696 16.031 2 13 2C11.8555 2.00375 10.7358 2.33367 9.77213 2.95109C8.80845 3.5685 8.04075 4.44783 7.559 5.486L7.25 6.153L6.387 6.039C6.25898 6.01764 6.12971 6.00461 6 6C4.93913 6 3.92172 6.42143 3.17157 7.17157C2.42143 7.92172 2 8.93913 2 10C2 11.0609 2.42143 12.0783 3.17157 12.8284C3.92172 13.5786 4.93913 14 6 14V16C4.4087 16 2.88258 15.3679 1.75736 14.2426C0.632141 13.1174 0 11.5913 0 10C0 8.4087 0.632141 6.88258 1.75736 5.75736C2.88258 4.63214 4.4087 4 6 4L6.079 4.001C6.78272 2.78775 7.79195 1.77998 9.00622 1.07802C10.2205 0.376059 11.5974 0.004385 13 0C16.679 0 19.692 1.978 20.752 5H20.785C22.3017 4.98308 23.7714 5.526 24.9129 6.52487C26.0544 7.52375 26.7875 8.90844 26.972 10.414C27.0538 11.2474 26.9602 12.0887 26.6973 12.8838C26.4344 13.6788 26.008 14.41 25.4455 15.0304C24.8829 15.6507 24.1968 16.1465 23.4312 16.4857C22.6656 16.8249 21.8374 17.0001 21 17H17V26H20V28Z"
        fill="currentColor"
      />
    </svg>
  );
}

const PRESET_IMAGES: Record<string, string> = {
  hdmiCable: "/catalog-preset-icons/hdmi-cable.png",
  powerCableNew: "/catalog-preset-icons/Pawer-cable.png",
  onexController: "/catalog-preset-icons/onexcontroller.png",
  twoxController: "/catalog-preset-icons/twoxcontroller.png",
  freeSim: "/catalog-preset-icons/sim.png",
  screenProtector: "/catalog-preset-icons/screenprotector.png",
  backCover: "/catalog-preset-icons/backcover.png",
};

export function renderPresetCatalogIcon(
  iconId: string,
  imgClassName: string,
  wrapperClassName: string
): React.ReactNode {
  const id = iconId.trim();
  const imgSrc = PRESET_IMAGES[id];
  if (imgSrc) {
    return (
      <img src={imgSrc} alt="" className={`${imgClassName} object-contain`} />
    );
  }

  let inner: React.ReactNode = null;
  switch (id) {
    case "powerAdapter":
      inner = <AdapterIcon />;
      break;
    case "chargingCable":
      inner = <PowerCableIcon />;
      break;
    case "protectionBundle":
      inner = <ProtectionBundleIcon />;
      break;
    case "treePlanted":
      inner = <TreeIcon />;
      break;
    default:
      return null;
  }

  return <span className={wrapperClassName}>{inner}</span>;
}
