import { t } from '../i18n/t';
import { BigButton } from '../components/primitives/BigButton';

interface Props {
  onStart: () => void;
}

export function Welcome({ onStart }: Props) {
  const g = { gender: 'f' as const };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center fade-in">
      <div className="text-7xl mb-6">📖</div>
      <h1 className="text-4xl font-bold text-brand-navy mb-3">{t('welcome.title', g)}</h1>
      <p className="text-xl text-gray-600 mb-10 max-w-sm">{t('welcome.subtitle', g)}</p>
      <BigButton onClick={onStart} color="#7DD3B0">{t('welcome.cta', g)}</BigButton>
    </div>
  );
}
