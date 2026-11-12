const dialogue = {
  fa: [
    "بله، شهاب دیده شد، تا نابودی تمدن انسان‌ها و زمین حدود ۱۰ دقیقه فرصت داریم.",
    "امیدوارم کسی که به این سایت سر می‌زنه، داستان زمین رو خوب بشناسه؛ شاید روزی بتونم باهاش درباره‌اش صحبت کنم.",
  ],
  en: [
    "Yes, I've spotted the meteor. We have about ten minutes before it destroys Earth and human civilization.",
    "I hope whoever visits this site gets to know Earth's story. Maybe someday I'll get to talk with them about it.",
  ],
  ar: [
    "نعم، رصدتُ الشهاب. أمامنا نحو عشر دقائق قبل أن يدمّر الأرض والحضارة البشرية.",
    "أتمنى أن يتعرّف زوّار هذا الموقع على قصة الأرض. لعلّي أتحدّث معهم عنها يومًا ما.",
  ],
  fr: [
    "Oui, j’ai repéré le météore. Il nous reste environ dix minutes avant qu’il ne détruise la Terre et la civilisation humaine.",
    "J’espère que les visiteurs de ce site découvriront l’histoire de la Terre. Peut-être qu’un jour, je pourrai en parler avec eux.",
  ],
  ru: [
    "Да, я вижу метеор. У нас около десяти минут до того, как он уничтожит Землю и человеческую цивилизацию.",
    "Надеюсь, гости этого сайта узнают историю Земли. Может быть, однажды я смогу поговорить с ними об этом.",
  ],
  tr: [
    "Evet, göktaşını gördüm. Dünya'yı ve insan uygarlığını yok etmesine yaklaşık on dakika kaldı.",
    "Umarım bu siteyi ziyaret edenler Dünya'nın hikâyesini öğrenir. Belki bir gün onlarla bu konuda konuşabilirim.",
  ],
};

export function homeSpeech(language) {
  return (dialogue[language] || dialogue.en).map((line) => Array.from(line));
}
