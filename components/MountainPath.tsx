import React from 'react';
import { Flag } from 'lucide-react';

interface MountainPathProps {
  totalStages: number;
  currentStage: number;
}

const MountainPath: React.FC<MountainPathProps> = ({ totalStages, currentStage }) => {
  return (
    <div className="relative w-full h-32 flex items-center justify-between px-6 select-none">
      {/* Background Path (Dashed dirt road) */}
      <div className="absolute top-1/2 left-8 right-8 h-0 border-t-4 border-dashed border-[#BCAAA4] transform -translate-y-1/2 -z-10 opacity-60"></div>
      
      {/* Progress Path (Green grass growing) */}
      <div 
        className="absolute top-1/2 left-8 h-2 bg-[#66BB6A] rounded-full transform -translate-y-1/2 transition-all duration-700 -z-10 shadow-[0_0_10px_#66BB6A]"
        style={{ width: `calc(${(currentStage / Math.max(totalStages - 1, 1)) * 100}% - 4rem)` }}
      ></div>

      {Array.from({ length: totalStages }).map((_, index) => {
        const isCompleted = index < currentStage;
        const isActive = index === currentStage;
        const isFuture = index > currentStage;

        return (
          <div key={index} className="relative group">
            <div 
              className={`
                w-12 h-12 rounded-full flex items-center justify-center font-hand font-bold text-xl transition-all duration-500 z-10 border-4
                ${isCompleted ? 'bg-[#C8E6C9] border-[#2E7D32] text-[#2E7D32]' : ''}
                ${isActive ? 'bg-[#FFF9C4] border-[#FBC02D] text-[#F57F17] scale-125 shadow-lg' : ''}
                ${isFuture ? 'bg-white border-[#D7CCC8] text-[#D7CCC8]' : ''}
              `}
            >
              {index + 1}
            </div>

            {/* Climber Icon on Active Node (Soot Sprite style) */}
            {isActive && (
              <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 animate-bounce z-20">
                <div className="text-4xl filter drop-shadow-md">🦊</div>
              </div>
            )}
            
            {/* Finish Flag */}
            {index === totalStages - 1 && (
                <div className={`absolute -bottom-10 left-1/2 transform -translate-x-1/2 ${isCompleted ? 'text-[#2E7D32]' : 'text-[#D7CCC8]'}`}>
                    <Flag size={24} fill="currentColor" strokeWidth={3} />
                </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MountainPath;