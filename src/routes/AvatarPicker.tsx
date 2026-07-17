import { t } from '../i18n/t';
import type { AvatarId, Gender } from '../types';
import { AVATARS } from '../constants/avatars';

interface Props {
  gender: Gender;
  onPick: (id: AvatarId) => void;
}

export function AvatarPicker({ gender, onPick }: Props) {
  const g = { gender };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center fade-in">
      <h2 className="text-3xl font-bold text-brand-navy mb-2">{t('avatar.title', g)}</h2>
      <p className="text-lg text-gray-600 mb-8">{t('avatar.subtitle', g)}</p>
      <div className="grid grid-cols-3 gap-4 w-full max-w-md">
        {AVATARS.map(a => (
          <button
            key={a.id}
            onClick={() => onPick(a.id)}
            className="bg-white card-shadow rounded-3xl p-5 flex flex-col items-center gap-2
              hover:scale-[1.04] active:scale-[0.97] transition-all"
            style={{ borderBottom: `4px solid ${a.color}` }}
          >
            <span className="text-5xl">{a.emoji}</span>
            <span className="text-sm font-bold text-brand-navy">
              {t(a.nameKey as Parameters<typeof t>[0], g)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
