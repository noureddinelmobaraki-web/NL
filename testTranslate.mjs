import { translate } from '@vitalets/google-translate-api';

async function run() {
  try {
    const res = await translate('مرحباً بك في تطبيقي', { to: 'en' });
    console.log(res.text);
  } catch (err) {
    console.error('Translation failed:', err.message);
  }
}
run();
