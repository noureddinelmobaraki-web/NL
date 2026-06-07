import https from 'https';

const urls = [
  'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/opening_web_12fps.webm',
  'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/opening_phone_web_12fps.webm',
  'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/Transition_web.webm',
  'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/Transition_phone_web.webm',
  'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/Transition%20phone_web.webm',
  'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/opening_final.mp4',
  'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/opening_phone.webm'
];

urls.forEach(url => {
  https.request(url, { method: 'HEAD' }, res => {
    console.log(url.split('/').pop(), ':', res.statusCode);
  }).on('error', e => console.error(e)).end();
});
