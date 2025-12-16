import React, { useState } from 'react';
import { LuckyCard } from '../types';
import { Gift, AlertTriangle, Sparkles } from 'lucide-react';

interface LuckyCardModalProps {
  type: 'correct' | 'incorrect';
  onCardSelect: (card: LuckyCard) => void;
  isMuted: boolean;
}

const LuckyCardModal: React.FC<LuckyCardModalProps> = ({
  type,
  onCardSelect,
  isMuted
}) => {
  const [revealedIndex, setRevealedIndex] = useState<number | null>(null);

  const generatePool = (): LuckyCard[] => {
    const isCorrect = type === 'correct';
    const rawPool = isCorrect
      ? [
          { val: 5, text: '+5 Hạt dẻ', type: 'now' },
          { val: 10, text: '+10 Hạt dẻ', type: 'now' },
          { val: 20, text: '🌟 +20 Hạt dẻ', type: 'now' },
          { val: 5, text: '+5 Hạt dẻ (Lượt sau)', type: 'next' }
        ]
      : [
          { val: -5, text: '-5 Hạt dẻ', type: 'now' },
          { val: -10, text: '-10 Hạt dẻ', type: 'now' },
          { val: -20, text: '🌪️ -20 Hạt dẻ', type: 'now' },
          { val: -5, text: '-5 Hạt dẻ (Lượt sau)', type: 'next' }
        ];

    return rawPool
      .map((item, i) => ({
        ...item,
        id: `card-${i}`,
        type: item.type as 'now' | 'next'
      }))
      .sort(() => Math.random() - 0.5);
  };

  const [cards] = useState<LuckyCard[]>(generatePool());

  const playCardSound = () => {
    if (isMuted) return;
    try {
      // @ts-ignore
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const ctx = new AudioContext();
      const now = ctx.currentTime;

      [0, 0.1, 0.2].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800 + i * 200, now + delay);
        gain.gain.setValueAtTime(0.2, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.5);
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelect = (index: number) => {
    if (revealedIndex !== null) return;

    playCardSound();
    setRevealedIndex(index);

    setTimeout(() => {
      onCardSelect(cards[index]);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 bg-[#37474F]/95 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="text-center w-full max-w-6xl flex flex-col items-center min-h-[600px] justify-center">
        {/* TITLE */}
        <h2 className="text-4xl md:text-5xl font-hand font-bold mb-4 flex items-center gap-4 text-white drop-shadow-md animate-float">
          {type === 'correct' ? (
            <Gift size={48} className="text-[#FBC02D]" />
          ) : (
            <AlertTriangle size={48} className="text-[#FF7043]" />
          )}
          {type === 'correct'
            ? 'QUÀ TẶNG CỦA RỪNG XANH'
            : 'THỬ THÁCH BẤT NGỜ'}
        </h2>

        {/* CARD LIST */}
        <div className="w-full overflow-x-auto scrollbar-cute">
          <div className="flex flex-nowrap gap-6 w-max mx-auto items-start pt-32 pb-12 px-8">
            {cards.map((card, index) => {
              const isSelected = revealedIndex === index;
              const isOtherSelected =
                revealedIndex !== null && !isSelected;

              return (
                /* WRAPPER – FIX SIZE */
                <div
                  key={card.id}
                  onClick={() => handleSelect(index)}
                  className={`
                    w-48 h-72 flex-shrink-0 cursor-pointer
                    relative perspective-1000 overflow-visible
                    transition-opacity duration-300
                    ${isOtherSelected ? 'opacity-40 grayscale blur-[1px]' : ''}
                  `}
                >
                  {/* LIFT + SCALE */}
                  <div
                    className={`
                      w-full h-full
                      transition-transform duration-500
                      cubic-bezier(0.34, 1.56, 0.64, 1)
                      ${isSelected
                        ? 'scale-110 -translate-y-10'
                        : 'hover:-translate-y-4'}
                    `}
                  >
                    {/* FLIP */}
                    <div
                      className={`
                        flip-card-inner w-full h-full
                        ${isSelected ? 'is-flipped' : ''}
                      `}
                    >
                      {/* FRONT */}
                      <div className="flip-card-front bg-[#8D6E63] border-[6px] border-[#D7CCC8] flex flex-col items-center justify-center rounded-[24px] shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')]" />
                        <div className="w-20 h-20 rounded-full bg-[#EFEBE9] flex items-center justify-center mb-4 shadow-inner border-4 border-[#A1887F] z-10 group-hover:scale-110 transition-transform">
                          <span className="text-4xl font-black text-[#5D4037] font-hand">
                            {index + 1}
                          </span>
                        </div>
                        <div className="absolute bottom-6 font-hand font-bold text-[#D7CCC8] text-xl tracking-wider">
                          THẺ BÀI
                        </div>
                      </div>

                      {/* BACK */}
                      <div
                        className={`
                          flip-card-back bg-[#FFF3E0] flex flex-col items-center justify-center p-4 text-center
                          border-[6px] rounded-[24px]
                          shadow-[0_20px_50px_rgba(0,0,0,0.3)]
                          ${card.val > 0
                            ? 'border-[#C8E6C9]'
                            : 'border-[#FFCCBC]'}
                        `}
                      >
                        <div className="mb-4 animate-bounce">
                          {card.val > 0 ? (
                            <Sparkles
                              className="text-[#FBC02D]"
                              size={48}
                            />
                          ) : (
                            <div className="text-5xl">🌪️</div>
                          )}
                        </div>
                        <div
                          className={`
                            text-xl font-hand font-black leading-snug break-words
                            ${card.val > 0
                              ? 'text-[#388E3C]'
                              : 'text-[#D84315]'}
                          `}
                        >
                          {card.text}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-4 text-[#FFF9C4] font-hand font-bold text-2xl tracking-widest min-h-[2rem]">
          {revealedIndex === null
            ? '✨ Hãy chọn một lá bài ✨'
            : 'Đang mở quà...'}
        </div>
      </div>
    </div>
  );
};

export default LuckyCardModal;
