import { t } from '../i18n/t';
import type { Gender } from '../types';
import { BigButton } from '../components/primitives/BigButton';
import { MATH_APP_URL } from '../constants/pause';

interface Props {
  gender:   Gender;
  onParent: () => void;
}

/**
 * Shown instead of the whole app while READING_PAUSED is true.
 *
 * Written for Mia to read, not for Dima: a nine-year-old who opens her reading
 * app and finds it gone will assume she broke it or that it was taken away from
 * her. So it says plainly that her stars are safe, that this is temporary, and
 * where to go in the meantime — rather than an error, a blank screen, or
 * silence.
 */
export function Paused({ gender, onParent }: Props) {
  const g = { gender };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center fade-in" dir="rtl">
      <div className="bg-white card-shadow rounded-4xl p-8 max-w-md w-full">
        <div className="text-6xl mb-4">🌙</div>
        <h1 className="text-3xl font-bold text-brand-navy mb-3">{t('paused.title', g)}</h1>
        <p className="text-lg text-gray-600 leading-relaxed mb-6">{t('paused.body', g)}</p>

        <BigButton
          onClick={() => { window.location.href = MATH_APP_URL; }}
          color="#7DD3B0"
          className="w-full"
        >
          {t('paused.cta', g)}
        </BigButton>
      </div>

      <button onClick={onParent} className="mt-6 text-sm text-gray-400 underline">
        {t('home.parent', g)}
      </button>
    </div>
  );
}
