import { useState } from 'react';
import { t } from '../i18n/t';
import type { Gender } from '../types';
import { BigButton } from '../components/primitives/BigButton';

interface Props {
  onDone: (name: string, gender: Gender) => void;
}

/** Collects the child's name + gender (Hebrew forms + greeting). Ported from
 *  mia-math, routed through i18n. */
export function ChildSetup({ onDone }: Props) {
  const [name, setName]     = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const g = { gender: gender ?? 'f' };
  const ready = name.trim().length > 0 && gender !== null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 fade-in" dir="rtl">
      <div className="bg-white card-shadow rounded-4xl p-8 max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">👋</div>
          <h2 className="text-2xl font-bold text-brand-navy mb-2">{t('childsetup.title', g)}</h2>
          <p className="text-gray-500 text-base">{t('childsetup.name_q', g)}</p>
        </div>

        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t('childsetup.name_placeholder', g)}
          maxLength={20}
          className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-lg text-right
            outline-none focus:border-brand-purple transition-colors mb-6"
          autoFocus
        />

        <p className="text-gray-500 text-base text-center mb-3">{t('childsetup.gender_q', g)}</p>
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setGender('f')}
            className="flex-1 py-3 rounded-2xl text-lg font-bold border-2 transition-all"
            style={{
              borderColor: gender === 'f' ? '#C4A7E7' : '#E5E7EB',
              background:  gender === 'f' ? '#F3EEFF' : 'white',
              color:       gender === 'f' ? '#7C3AED' : '#6B7280',
            }}
          >
            {t('childsetup.girl', { gender: 'f' })}
          </button>
          <button
            onClick={() => setGender('m')}
            className="flex-1 py-3 rounded-2xl text-lg font-bold border-2 transition-all"
            style={{
              borderColor: gender === 'm' ? '#8FC0E8' : '#E5E7EB',
              background:  gender === 'm' ? '#EFF6FF' : 'white',
              color:       gender === 'm' ? '#1D4ED8' : '#6B7280',
            }}
          >
            {t('childsetup.boy', { gender: 'm' })}
          </button>
        </div>

        <div className="flex justify-center">
          <BigButton onClick={() => ready && onDone(name.trim(), gender!)} color="#C4A7E7" disabled={!ready}>
            {t('childsetup.cta', g)}
          </BigButton>
        </div>
      </div>
    </div>
  );
}
