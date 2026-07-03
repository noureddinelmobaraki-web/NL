async function run() {
  const text = encodeURIComponent('تجربة طويلة لمعرفة هل سيسمح بترجمة نص طويل بدون مشاكل وهل سيستمر في العمل. هذا النص مخصص لاختبار خدمة الترجمة عبر الإنترنت.');
  const url = `https://api.mymemory.translated.net/get?q=${text}&langpair=ar|en&de=test${Date.now()}@example.com`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    console.log(json.responseData.translatedText);
  } catch (err) {
    console.error(err);
  }
}
run();
