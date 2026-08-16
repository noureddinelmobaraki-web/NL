async function run() {
  const text = encodeURIComponent('مرحباً بك في تطبيقي');
  const url = `https://api.mymemory.translated.net/get?q=${text}&langpair=ar|en`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    console.log(json.responseData.translatedText);
  } catch (err) {
    console.error(err);
  }
}
run();
