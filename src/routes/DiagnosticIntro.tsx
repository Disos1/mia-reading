import { t } from '../i18n/t';
import type { Gender } from '../types';
import { BigButton } from '../components/primitives/BigButton';

interface Props {
  gender:  Gender;
  name:    string;
  onStart: () => void;
}

export function DiagnosticIntro({ gender, name, onStart }: Props) {
  const g = { gender };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center fade-in">
      <div className="text-6xl mb-5">🔍</div>
      <h1 className="text-3xl font-bold text-brand-navy mb-3">
        {t('diag_intro.title', { ...g, name })}
      </h1>
      <p className="text-xl text-gray-600 mb-10 max-w-md leading-relaxed">
        {t('diag_intro.speech', g)}
      </p>
      <BigButton onClick={onStart} color="#8FC0E8">{t('diag_intro.cta', g)}</BigButton>
    </div>
  );
}
