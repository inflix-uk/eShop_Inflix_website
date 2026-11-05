/**
 * Courier tracking links — mirror of the backend map
 * (`eShop_Inflix_backend/src/utils/courierTracking.js`). The backend stores
 * `shippingDetails.trackingUrl` on every shipped order; this map is only the
 * fallback for orders shipped before that field existed.
 */

const COURIER_URLS: Record<string, string> = {
  royalmail: 'https://www.royalmail.com/track-your-item#/tracking-results/{n}',
  dhl: 'https://www.dhl.com/gb-en/home/tracking/tracking-express.html?submit=1&tracking-id={n}',
  dhlexpress: 'https://www.dhl.com/gb-en/home/tracking/tracking-express.html?submit=1&tracking-id={n}',
  dpd: 'https://track.dpd.co.uk/parcels/{n}',
  dpdlocal: 'https://track.dpdlocal.co.uk/parcels/{n}',
  ups: 'https://www.ups.com/track?loc=en_GB&tracknum={n}',
  fedex: 'https://www.fedex.com/fedextrack/?trknbr={n}',
  evri: 'https://www.evri.com/track/parcel/{n}/details',
  hermes: 'https://www.evri.com/track/parcel/{n}/details',
  parcelforce: 'https://www.parcelforce.com/track-trace?trackNumber={n}',
  yodel: 'https://www.yodel.co.uk/tracking/{n}',
};

interface TrackingFields {
  provider?: string;
  trackingNumber?: string;
  trackingUrl?: string;
}

export function getTrackingUrl(shipping?: TrackingFields | null): string {
  if (!shipping) return '';
  const stored = String(shipping.trackingUrl || '').trim();
  if (/^https?:\/\//i.test(stored)) return stored;
  const tn = String(shipping.trackingNumber || '').trim();
  const key = String(shipping.provider || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const template = COURIER_URLS[key];
  if (!tn || !template) return '';
  return template.split('{n}').join(encodeURIComponent(tn));
}
