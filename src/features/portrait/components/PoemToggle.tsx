import { memo } from 'react';

type Props = { checked: boolean; onChange: (next: boolean) => void };

/**
 * Uiverse.io switch by vinodjangid07, scoped.
 * The original uses the id #checkboxInput as a styling hook. Ids must be
 * unique per document, so it is rewritten as a class here; every visual value
 * (80x40, rgb(199,199,199), the conic-gradient, rgb(153,197,151), .3s) is
 * unchanged.
 */
export const PoemToggle = memo(function PoemToggle({ checked, onChange }: Props) {
  return (
    <div className="nl-poem-toggle">
      <input
        id="nl-poem-toggle-input"
        className="nl-poem-toggle__input"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label="تشغيل القصيدة"
      />
      <label className="nl-poem-toggle__track" htmlFor="nl-poem-toggle-input" />
    </div>
  );
});
