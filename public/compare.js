const comparisonColors = [
  "#ffbf47",
  "#60c5ff",
  "#ef80b1",
  "#75d69c",
  "#ba99ff",
  "#ff9166",
  "#53dcd5",
  "#e4db66",
  "#a9bfff",
  "#eaaee4",
];
export function toggleComparison(selection, id, limit = 10) {
  if (selection.has(id)) {
    selection.delete(id);
    return true;
  }
  if (selection.size >= limit) return false;
  selection.set(
    id,
    comparisonColors.find((color) => ![...selection.values()].includes(color)),
  );
  return true;
}
export const compareCopy = {
  en: [
    "Compare sizes",
    "Select up to 10 countries on the map. Select again to remove.",
    "Largest first",
    "Clear",
    "Maximum 10 countries",
    "Area unavailable",
    "Source",
  ],
  fa: [
    "مقایسهٔ مساحت",
    "تا ۱۰ کشور را روی نقشه انتخاب کنید. انتخاب دوباره برای حذف.",
    "از بزرگ‌ترین به کوچک‌ترین",
    "پاک کردن",
    "حداکثر ۱۰ کشور",
    "مساحت موجود نیست",
    "منبع",
  ],
  ar: [
    "مقارنة المساحة",
    "اختر حتى 10 دول. اختر مجددًا للإزالة.",
    "الأكبر أولاً",
    "مسح",
    "الحد الأقصى 10 دول",
    "المساحة غير متاحة",
    "المصدر",
  ],
  tr: [
    "Alanları karşılaştır",
    "En fazla 10 ülke seçin. Kaldırmak için tekrar seçin.",
    "Büyükten küçüğe",
    "Temizle",
    "En fazla 10 ülke",
    "Alan bilinmiyor",
    "Kaynak",
  ],
  fr: [
    "Comparer les superficies",
    "Sélectionnez jusqu’à 10 pays. Resélectionnez pour retirer.",
    "Du plus grand au plus petit",
    "Effacer",
    "10 pays maximum",
    "Superficie inconnue",
    "Source",
  ],
  ru: [
    "Сравнить площади",
    "Выберите до 10 стран. Нажмите снова, чтобы убрать.",
    "От большей к меньшей",
    "Очистить",
    "Максимум 10 стран",
    "Площадь неизвестна",
    "Источник",
  ],
};
