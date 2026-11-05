import React from "react";

export const EYE_LOADER_GLASS_MESSAGE =
  "<< سيت غيجمع لك سرفرات و يختار اسرع واحد... ولكن منقدرش نحبس الاعلانات حيت كيجيو من سيرفرات. داكشي لاش بغيتي تفرج مرتاح تفرج من Brave و لا خدم اي ADblock عندك... >>";

export function renderBidiIsolatedText(text: string): React.ReactNode {
  const parts = text.split(/([A-Za-z0-9_+-]+)/g);
  return parts.map((part, index) => {
    if (/^[A-Za-z0-9_+-]+$/.test(part) && /[A-Za-z]/.test(part)) {
      return (
        <bdi key={index} dir="ltr" className="nl-eye-loader-bdi">
          {part}
        </bdi>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export const EyeLoader: React.FC = () => {
  return (
    <div className="nl-eye-loader-wrap" aria-hidden="true">
      <div className="eye-lid">
        <div className="eye">
          <div className="cornea">
            <div className="white-pupil" />
          </div>
        </div>
      </div>

      <div className="nl-eye-loader-msg" dir="rtl">
        <p className="nl-eye-loader-msg__text" dir="rtl">
          {renderBidiIsolatedText(EYE_LOADER_GLASS_MESSAGE)}
        </p>
      </div>
    </div>
  );
};

export default EyeLoader;
