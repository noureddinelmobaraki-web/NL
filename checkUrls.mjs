import https from 'https';

const checkUrl = (url) => new Promise((resolve) => {
  https.request(url, { method: 'HEAD' }, res => {
    resolve({ url, status: res.statusCode });
  }).on('error', () => {
    resolve({ url, status: 'ERROR' });
  }).end();
});

async function main() {
  const urls = [
    'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/Transition_phone.mp4',
    'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/Transition_mobile.mp4',
    'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/Transition_mobile_web.webm',
    'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/Transition_web.mp4'
  ];
  for (const url of urls) {
    const res = await checkUrl(url);
    console.log(res.url.split('/').pop(), res.status);
  }
}
main();