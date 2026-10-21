const JARI_BUMI_KM = 6371;

export function jarakKm(lat1, lng1, lat2, lng2) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * JARI_BUMI_KM * Math.asin(Math.sqrt(a));
}

/**
 * Entri terdekat yang punya koordinat. Ruang berstatus TUTUP tidak ikut,
 * dan pada jarak yang hampir sama (selisih < 1 km) ruang BUKA didahulukan dari PENUH.
 */
export function terdekat(entri, lat, lng, n = 5) {
  return entri
    .filter((e) => typeof e.lat === 'number' && typeof e.lng === 'number' && e.status !== 'TUTUP')
    .map((e) => ({ ...e, jarak_km: Math.round(jarakKm(lat, lng, e.lat, e.lng) * 10) / 10 }))
    .sort((a, b) => {
      const penalti = (e) => (e.status === 'PENUH' ? 1 : 0);
      return (a.jarak_km + penalti(a)) - (b.jarak_km + penalti(b));
    })
    .slice(0, n);
}
