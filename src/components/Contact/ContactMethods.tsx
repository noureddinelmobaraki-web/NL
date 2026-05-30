import { Mail, MessageCircle, Send } from 'lucide-react';

function maskValue(value: string): string {
  if (value.includes('@')) {
    // Email: show first 3 chars + *** + domain
    const [local, domain] = value.split('@');
    return `${local.slice(0, 3)}***@${domain}`;
  }
  if (value.startsWith('+')) {
    // Phone: show country code + first 3 + *** + last 2
    return `${value.slice(0, 6)}***${value.slice(-2)}`;
  }
  if (value.startsWith('@')) {
    // Username: show @first4***
    return `${value.slice(0, 5)}***`;
  }
  return value;
}

const CONTACT_METHODS = [
  {
    name: 'Gmail',
    value: 'noureddinelmobaraki@gmail.com',
    url: 'mailto:noureddinelmobaraki@gmail.com',
    icon: Mail,
    bg: 'linear-gradient(135deg, #EA4335 0%, #B31412 100%)',
  },
  {
    name: 'WhatsApp',
    value: '+212 612-806932',
    url: 'https://wa.me/212612806932',
    icon: MessageCircle,
    bg: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
  },
  {
    name: 'Telegram',
    value: '@noureddin_el_mobaraki',
    url: 'https://t.me/noureddin_el_mobaraki',
    icon: Send,
    bg: 'linear-gradient(135deg, #0088CC 0%, #005580 100%)',
  },
];

export const ContactMethods = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      {CONTACT_METHODS.map((method) => (
        <a
          key={method.name}
          href={method.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`${method.name}: ${method.value}`}
          className="manga-border group relative flex flex-col items-center justify-center p-4 border-[4px] border-[var(--ink-color)] overflow-hidden bg-[var(--paper-color)] transition-all duration-300 hover:scale-[1.03] active:scale-95 shadow-[6px_6px_0px_var(--manga-shadow-color)]"
        >
          <div
            className="absolute inset-0 z-0 opacity-20 transition-opacity group-hover:opacity-30"
            style={{ background: method.bg }}
          />
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className="p-2 bg-[var(--ink-color)] text-[var(--text-inverse)] rounded-full">
              <method.icon className="w-6 h-6" />
            </div>
            <span className="font-manga text-lg font-black text-[var(--ink-color)] uppercase">
              {method.name}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] truncate max-w-full text-center">
              {maskValue(method.value)}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
};
