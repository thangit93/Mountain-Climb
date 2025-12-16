import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Player, GameState, LogEntry, LuckyCard } from './types';
import MountainPath from './components/MountainPath';
import MathRenderer from './components/MathRenderer';
import LuckyCardModal from './components/LuckyCardModal';
import { generateQuestions } from './services/geminiService';
import { Trophy, Users, Play, RotateCcw, Plus, X, Sparkles, Star, Music, Save, Trash2, LogOut, SkipForward, Flag, LockOpen, Volume2, VolumeX, Timer, Clock, ArrowRight, CheckCircle, Leaf, Cloud, Feather } from 'lucide-react';

const INITIAL_QUESTIONS = [
  "Câu hỏi 1: $1 + 1$ bằng mấy?",
  "Câu hỏi 2: Giải phương trình $x^2 - 4 = 0$",
  "Câu hỏi 3: Thủ đô của Việt Nam là gì?",
  "Câu hỏi 4: Tính diện tích hình tròn bán kính $r=3$: $S = \\pi r^2$",
  "Câu hỏi 5: Ai là người đặt chân lên mặt trăng đầu tiên?"
];

const STORAGE_KEY = 'treasure_hunt_save_v1';

function App() {
  // Setup State
  const [inputName, setInputName] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [questionsText, setQuestionsText] = useState(INITIAL_QUESTIONS.join('\n'));
  const [topicInput, setTopicInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Timer State
  const [timeLimit, setTimeLimit] = useState<number>(30); // Default 30s
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerIntervalRef = useRef<number | null>(null);

  // UI State for revealing question
  const [isQuestionRevealed, setIsQuestionRevealed] = useState(false);
  const [processedPlayers, setProcessedPlayers] = useState<string[]>([]); 

  // Game State
  const [gameState, setGameState] = useState<GameState>({
    stage: 'setup',
    currentQuestionIndex: 0,
    currentPlayerIndex: 0, 
    log: [],
    isCardModalOpen: false,
    cardModalType: null,
  });

  const [turnMessage, setTurnMessage] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // --- AUDIO SYNTHESIS HELPER ---
  const playSynthSound = (type: 'correct' | 'wrong' | 'timeout') => {
    if (isMuted) return;

    try {
      // @ts-ignore
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const ctx = new AudioContext();
      const now = ctx.currentTime;
      ctx.resume();

      if (type === 'correct') {
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1200, now);
        osc1.frequency.exponentialRampToValueAtTime(2000, now + 0.1);
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.5);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1500, now + 0.15);
        gain2.gain.setValueAtTime(0.3, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.15);
        osc2.stop(now + 0.8);

      } else if (type === 'wrong') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle'; 
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.4); 
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'timeout') {
         const osc = ctx.createOscillator();
         const gain = ctx.createGain();
         osc.type = 'sine';
         osc.frequency.setValueAtTime(800, now);
         osc.frequency.exponentialRampToValueAtTime(100, now + 1.5);
         gain.gain.setValueAtTime(0.4, now);
         gain.gain.linearRampToValueAtTime(0, now + 1.5);
         osc.connect(gain);
         gain.connect(ctx.destination);
         osc.start(now);
         osc.stop(now + 1.5);
      }
    } catch (e) { console.error("Audio error", e); }
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  // --- PERSISTENCE ---
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.players) setPlayers(parsed.players);
        if (parsed.questionsText) setQuestionsText(parsed.questionsText);
        if (parsed.gameState) setGameState(parsed.gameState);
        if (parsed.isMuted !== undefined) setIsMuted(parsed.isMuted);
        if (parsed.timeLimit !== undefined) setTimeLimit(parsed.timeLimit);
        if (parsed.processedPlayers) setProcessedPlayers(parsed.processedPlayers);
      } catch (e) { console.error(e); }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const dataToSave = { players, questionsText, gameState, isMuted, timeLimit, processedPlayers };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [players, questionsText, gameState, isMuted, timeLimit, processedPlayers, isLoaded]);

  useEffect(() => {
    if (isLoaded && gameState.stage === 'playing' && players.length === 0) {
        setGameState(prev => ({ ...prev, stage: 'setup' }));
    }
  }, [isLoaded, gameState.stage, players.length]);

  const clearData = () => {
    if (window.confirm("Bạn muốn xóa hết nhật ký cũ chứ?")) {
      localStorage.removeItem(STORAGE_KEY);
      setPlayers([]);
      setQuestionsText(INITIAL_QUESTIONS.join('\n'));
      setTimeLimit(30);
      setProcessedPlayers([]);
      setGameState({
        stage: 'setup',
        currentQuestionIndex: 0,
        currentPlayerIndex: 0,
        log: [],
        isCardModalOpen: false,
        cardModalType: null,
      });
    }
  };

  // --- TIMER LOGIC ---
  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
        timerIntervalRef.current = window.setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
        setIsTimerRunning(false);
        playSynthSound('timeout');
    }
    return () => {
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
    };
  }, [isTimerRunning, timeLeft]);

  // --- GAME LOGIC ---
  const addPlayer = () => {
    if (!inputName.trim()) return;
    setPlayers([...players, {
      id: Date.now().toString(),
      name: inputName.trim(),
      score: 0,
      pendingEffect: 0
    }]);
    setInputName('');
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const handleGenerateQuestions = async () => {
    if (!topicInput.trim()) return;
    setIsGenerating(true);
    try {
      const generated = await generateQuestions(topicInput);
      setQuestionsText(generated.join('\n'));
      addLog("Tiên Rừng", `Đã mang về ${generated.length} câu đố về: ${topicInput}`);
    } catch (error) {
      alert("Tiên rừng đang bận, thử lại sau nhé!");
    } finally {
      setIsGenerating(false);
    }
  };

  const startGame = () => {
    if (players.length === 0) return alert("Cần ít nhất 1 nhà thám hiểm!");
    const qList = questionsText.split('\n').filter(line => line.trim() !== '');
    if (qList.length === 0) return alert("Cần ít nhất 1 câu đố!");

    setIsQuestionRevealed(false);
    setIsTimerRunning(false);
    setTimeLeft(timeLimit);
    setProcessedPlayers([]);

    setGameState({
      ...gameState,
      stage: 'playing',
      currentQuestionIndex: 0,
      currentPlayerIndex: 0,
      log: [{ id: 'init', time: new Date().toLocaleTimeString(), message: "Cuộc phiêu lưu bắt đầu!" }]
    });
    applyTurnEffectsGlobally();
  };

  const quitGame = () => {
    setIsTimerRunning(false);
    setGameState(prev => ({...prev, stage: 'setup'}));
  }

  const getQuestionsArray = useCallback(() => {
    return questionsText.split('\n').filter(line => line.trim() !== '');
  }, [questionsText]);

  const addLog = (actor: string, message: string) => {
    const entry: LogEntry = {
      id: Date.now().toString() + Math.random(),
      time: new Date().toLocaleTimeString('vi-VN', { hour12: false, hour: "numeric", minute: "numeric" }),
      message: `${actor}: ${message}`
    };
    setGameState(prev => ({ ...prev, log: [entry, ...prev.log] }));
  };

  const applyTurnEffectsGlobally = () => {
    let effectsLog: string[] = [];
    setPlayers(curr => curr.map(p => {
        if (p.pendingEffect !== 0) {
            effectsLog.push(`${p.name} ${p.pendingEffect > 0 ? '+' : ''}${p.pendingEffect}`);
            return { ...p, score: p.score + p.pendingEffect, pendingEffect: 0 };
        }
        return p;
    }));
    if (effectsLog.length > 0) {
        setTurnMessage(`✨ Phép thuật cũ: ${effectsLog.join(', ')}`);
        addLog("Tiên Rừng", `Áp dụng phép thuật: ${effectsLog.join(', ')}`);
    } else {
        setTurnMessage(null);
    }
  };

  const handleRevealQuestion = () => {
    setIsQuestionRevealed(true);
    setTimeLeft(timeLimit);
    setIsTimerRunning(true);
  };

  const handleJudge = (playerIndex: number, isCorrect: boolean) => {
    setIsTimerRunning(false);
    playSynthSound(isCorrect ? 'correct' : 'wrong');
    setGameState(prev => ({
      ...prev,
      currentPlayerIndex: playerIndex,
      isCardModalOpen: true,
      cardModalType: isCorrect ? 'correct' : 'incorrect'
    }));
  };

  const handleCardSelect = (card: LuckyCard) => {
    const currentPlayer = players[gameState.currentPlayerIndex];
    const isNow = card.type === 'now';
    setPlayers(curr => curr.map((p, idx) => {
      if (idx === gameState.currentPlayerIndex) {
        if (isNow) return { ...p, score: p.score + card.val };
        else return { ...p, pendingEffect: p.pendingEffect + card.val };
      }
      return p;
    }));
    setProcessedPlayers(prev => [...prev, currentPlayer.id]);
    addLog(currentPlayer.name, `[Câu ${gameState.currentQuestionIndex + 1}] Nhận được: ${card.text}`);
    setGameState(prev => ({ ...prev, isCardModalOpen: false, cardModalType: null }));
  };

  const moveToNextQuestion = () => {
    const questions = getQuestionsArray();
    const nextQuestionIndex = gameState.currentQuestionIndex + 1;
    setIsQuestionRevealed(false);
    setIsTimerRunning(false);
    setTimeLeft(timeLimit);
    setProcessedPlayers([]); 

    if (nextQuestionIndex >= questions.length) {
      setGameState(prev => ({ ...prev, stage: 'ended' }));
    } else {
      setGameState(prev => ({ ...prev, currentQuestionIndex: nextQuestionIndex }));
      applyTurnEffectsGlobally();
    }
  };
  
  const finishGameEarly = () => {
      setIsTimerRunning(false);
      setGameState(prev => ({ ...prev, stage: 'ended' }));
  };

  // --- RENDER ---
  const questions = getQuestionsArray();

  // --- ENDED STAGE ---
  if (gameState.stage === 'ended') {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-xl rounded-[40px] shadow-xl p-8 max-w-2xl w-full text-center border-4 border-white relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-4 bg-[#FFCCBC]"></div>
           <div className="flex justify-center mb-6">
              <div className="bg-[#FFF9C4] p-6 rounded-full shadow-inner animate-float">
                  <Trophy size={64} className="text-[#FBC02D]" />
              </div>
           </div>
           <h1 className="text-4xl font-hand font-bold text-[#8D6E63] mb-8">Cuộc Phiêu Lưu Kết Thúc</h1>
           
           <div className="space-y-4 mb-10">
             {sortedPlayers.map((p, index) => (
               <div key={p.id} className={`flex items-center justify-between p-4 rounded-3xl transition-transform hover:scale-105 ${index === 0 ? 'bg-[#FFF9C4] border-2 border-[#FBC02D]' : 'bg-white border-2 border-slate-100'}`}>
                  <div className="flex items-center gap-4">
                    <span className={`text-2xl font-black ${index === 0 ? 'text-[#FBC02D]' : 'text-slate-400'}`}>
                      {index === 0 ? '👑' : `#${index + 1}`}
                    </span>
                    <span className="text-xl font-bold text-slate-600 font-hand">{p.name}</span>
                  </div>
                  <span className="text-2xl font-black text-[#5D4037]">{p.score} <span className="text-sm font-normal">hạt dẻ</span></span>
               </div>
             ))}
           </div>

           <button 
            onClick={() => window.location.reload()}
            className="btn-ghibli w-full bg-[#81D4FA] text-white font-bold py-4 text-xl flex items-center justify-center gap-2"
           >
             <RotateCcw size={20} /> Hành Trình Mới
           </button>
        </div>
      </div>
    );
  }

  // --- PLAYING STAGE ---
  if (gameState.stage === 'playing') {
    const currentQuestion = questions[gameState.currentQuestionIndex];

    return (
      <div className="min-h-screen flex flex-col items-center pt-4 pb-12 px-4 relative">
        
        {/* Header */}
        <header className="w-full max-w-6xl flex justify-between items-center mb-6 bg-white/60 backdrop-blur-md px-6 py-3 rounded-full shadow-sm z-50 border border-white">
          <button onClick={quitGame} className="btn-ghibli text-slate-500 hover:text-red-400 p-2">
            <LogOut size={20} />
          </button>
          <h1 className="text-3xl font-hand font-bold text-[#5D4037] hidden sm:block flex items-center gap-2">
             <Leaf size={24} className="text-[#66BB6A]" /> Thung Lũng Kiến Thức
          </h1>
          <div className="flex gap-2">
              <button onClick={toggleMute} className={`btn-ghibli p-2 ${isMuted ? 'text-slate-400' : 'text-[#EC407A]'}`}>
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <button onClick={finishGameEarly} className="btn-ghibli flex items-center gap-2 bg-[#FFF9C4] text-[#FBC02D] px-4 py-2 text-sm font-bold">
                  <Flag size={18} /> Tổng kết
              </button>
              <button onClick={() => window.location.reload()} className="btn-ghibli text-slate-500 hover:text-[#29B6F6] p-2">
                <RotateCcw size={20} />
              </button>
          </div>
        </header>

        {/* Path */}
        <div className="w-full max-w-6xl mb-8 bg-white/70 backdrop-blur-sm rounded-[30px] p-6 shadow-sm border border-white">
           <MountainPath totalStages={questions.length} currentStage={gameState.currentQuestionIndex} />
        </div>

        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Scoreboard (Wooden Board Style) */}
          <div className="bg-[#D7CCC8] rounded-[30px] p-2 shadow-lg h-fit order-2 lg:order-1 relative">
             <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 bg-[#8D6E63] text-[#FFF9C4] px-4 py-1 rounded-full text-sm font-bold shadow-md z-10 border-2 border-[#5D4037]">
                BẢNG THÀNH TÍCH
             </div>
             <div className="bg-[#EFEBE9] rounded-[24px] p-4 pt-8 border-2 border-[#BCAAA4] border-dashed">
                <div className="space-y-3">
                    {players.map((p, idx) => (
                        <div key={p.id} className="flex justify-between items-center p-3 rounded-2xl bg-white/80 shadow-sm border border-[#D7CCC8]">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx===0 ? 'bg-[#FFF9C4] text-[#F9A825]' : 'bg-[#CFD8DC] text-slate-500'}`}>
                                    {idx + 1}
                                </div>
                                <div>
                                    <div className="font-bold text-[#5D4037] font-hand text-lg">{p.name}</div>
                                    {p.pendingEffect !== 0 && <div className="text-xs text-[#29B6F6] font-bold">Phép: {p.pendingEffect > 0 ? '+' : ''}{p.pendingEffect}</div>}
                                </div>
                            </div>
                            <div className="font-black text-xl text-[#66BB6A]">{p.score}</div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 pt-4 border-t-2 border-dashed border-[#BCAAA4]">
                    <h4 className="font-bold text-[#8D6E63] text-sm mb-2 flex items-center gap-2"><Feather size={14}/> Nhật Ký</h4>
                    <div className="h-40 overflow-y-auto scrollbar-cute text-sm text-slate-600 space-y-2 pr-2">
                    {gameState.log.map(entry => (
                        <div key={entry.id} className="bg-white/50 p-2 rounded-lg text-xs">
                        <span className="text-slate-400 font-bold block">{entry.time}</span> {entry.message}
                        </div>
                    ))}
                    </div>
                </div>
             </div>
          </div>

          {/* Center: Main Game Area (Canvas/Easel Style) */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <div className="bg-white rounded-[40px] shadow-xl border-4 border-white overflow-hidden relative min-h-[500px] flex flex-col">
                {/* Paper Texture Overlay */}
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]"></div>

                {/* Top Bar */}
                <div className="bg-[#B2EBF2] p-4 flex justify-between items-center relative z-10">
                    <span className="font-bold text-[#006064] font-hand text-xl">Câu đố {gameState.currentQuestionIndex + 1}/{questions.length}</span>
                    <div className={`
                        flex items-center gap-2 px-4 py-1 rounded-full font-black text-lg transition-all shadow-sm
                        ${timeLeft === 0 ? 'bg-[#FFCCBC] text-[#BF360C]' : 'bg-white/80 text-[#0097A7]'}
                    `}>
                        {timeLeft === 0 ? <Clock size={20} className="animate-spin" /> : <Timer size={20} />}
                        <span>{isQuestionRevealed ? `${timeLeft}s` : '--'}</span>
                    </div>
                </div>
                
                {/* Content Area */}
                <div className="flex-1 p-8 flex flex-col items-center justify-center text-center relative z-10">
                    {turnMessage && (
                        <div className="mb-6 bg-[#FFF9C4] text-[#F57F17] px-6 py-2 rounded-full font-bold animate-float flex items-center gap-2 shadow-sm border border-[#FFF59D]">
                            <Sparkles size={16} /> {turnMessage}
                        </div>
                    )}
                    
                    {!isQuestionRevealed ? (
                        <button 
                            onClick={handleRevealQuestion}
                            className="btn-ghibli bg-[#FFCCBC] hover:bg-[#FFAB91] text-[#D84315] font-black text-2xl py-6 px-12 shadow-lg flex items-center gap-4 group"
                        >
                            <LockOpen size={32} className="group-hover:rotate-12 transition-transform"/>
                            <span>MỞ CÂU ĐỐ</span>
                        </button>
                    ) : (
                        <div className="w-full">
                            {timeLeft === 0 && (
                                <div className="mb-4 text-[#FF7043] font-hand font-black text-3xl animate-bounce">
                                    HẾT GIỜ RỒI!
                                </div>
                            )}
                            <div className="prose prose-lg max-w-none animate-in fade-in duration-700">
                                <MathRenderer 
                                    content={currentQuestion || "Đang tải..."} 
                                    className="text-3xl md:text-4xl font-bold text-[#455A64] leading-relaxed font-hand"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Control (Evaluator) */}
                <div className="bg-[#F5F5F5] p-6 relative z-10 border-t border-slate-100">
                    {isQuestionRevealed ? (
                        <div className="space-y-4">
                            <h3 className="text-center text-slate-400 font-bold uppercase text-xs tracking-widest mb-4">Chấm điểm nhà thám hiểm</h3>
                            <div className="flex flex-wrap justify-center gap-3">
                                {players.map((p, idx) => {
                                    const isProcessed = processedPlayers.includes(p.id);
                                    return (
                                    <div key={p.id} className={`pl-4 pr-2 py-2 rounded-full shadow-sm border flex items-center gap-3 transition-all ${isProcessed ? 'bg-slate-100 border-slate-200 opacity-60' : 'bg-white border-slate-200'}`}>
                                        <div className="font-bold text-slate-600 font-hand text-lg truncate max-w-[100px]">
                                            {p.name}
                                        </div>
                                        {isProcessed ? (
                                            <div className="text-green-500 px-3"><CheckCircle size={18} /></div>
                                        ) : (
                                            <div className="flex gap-1">
                                                <button onClick={() => handleJudge(idx, true)} className="w-8 h-8 rounded-full bg-[#C8E6C9] hover:bg-[#A5D6A7] text-[#2E7D32] flex items-center justify-center transition-colors">
                                                    <CheckCircle size={16} />
                                                </button>
                                                <button onClick={() => handleJudge(idx, false)} className="w-8 h-8 rounded-full bg-[#FFCCBC] hover:bg-[#FFAB91] text-[#D84315] flex items-center justify-center transition-colors">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )})}
                            </div>
                            
                            <div className="pt-4 flex justify-center mt-2">
                                <button onClick={moveToNextQuestion} className="btn-ghibli bg-[#81D4FA] hover:bg-[#4FC3F7] text-white font-bold py-3 px-8 text-lg shadow-md flex items-center gap-2">
                                    Câu Tiếp Theo <ArrowRight size={20} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-slate-400 font-medium italic font-hand text-lg">
                            Chờ mở câu đố để bắt đầu...
                        </div>
                    )}
                </div>
            </div>
          </div>
        </div>

        {gameState.isCardModalOpen && gameState.cardModalType && (
          <LuckyCardModal type={gameState.cardModalType} onCardSelect={handleCardSelect} isMuted={isMuted} />
        )}
      </div>
    );
  }

  // --- SETUP STAGE ---
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="bg-white/80 backdrop-blur-xl rounded-[40px] shadow-2xl p-10 w-full max-w-4xl border border-white relative">
        {/* Decorative Elements */}
        <Cloud className="absolute -top-10 -left-10 text-white w-32 h-32 opacity-80" fill="currentColor" />
        <Cloud className="absolute top-20 -right-10 text-white w-24 h-24 opacity-60" fill="currentColor" />

        <button onClick={toggleMute} className={`absolute top-8 right-8 btn-ghibli p-3 ${isMuted ? 'bg-slate-200 text-slate-500' : 'bg-[#F8BBD0] text-white'}`}>
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>

        <div className="text-center mb-10">
            <h1 className="text-5xl md:text-6xl font-hand font-bold text-[#5D4037] mb-2 drop-shadow-sm">
            Nhật Ký Phiêu Lưu
            </h1>
            <p className="text-[#8D6E63] font-medium text-lg flex items-center justify-center gap-2">
                <Sparkles size={16} className="text-[#FBC02D]"/> Sẵn sàng chinh phục đỉnh núi tri thức?
            </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
           {/* Column 1: Players */}
           <div className="space-y-4">
              <div className="flex items-center gap-2 text-2xl font-bold font-hand text-[#00838F] mb-2 border-b-2 border-[#B2EBF2] pb-2">
                 <Users size={24} />
                 <h2>Đội Thám Hiểm</h2>
              </div>
              
              <div className="flex gap-3">
                 <input 
                    type="text" 
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                    placeholder="Tên người chơi..."
                    className="flex-1 bg-white border-2 border-[#E0F7FA] rounded-2xl px-5 py-3 font-bold text-slate-600 focus:outline-none focus:border-[#4DD0E1] transition-colors shadow-inner"
                 />
                 <button onClick={addPlayer} className="btn-ghibli bg-[#4DD0E1] text-white px-5 rounded-2xl font-bold">
                    <Plus size={24} />
                 </button>
              </div>

              <div className="bg-[#E0F7FA]/50 rounded-3xl p-4 min-h-[200px] max-h-[300px] overflow-y-auto scrollbar-cute border border-[#B2EBF2]">
                  {players.length === 0 && <div className="text-center text-slate-400 mt-10 italic font-hand text-xl">Chưa có ai cả...</div>}
                  <ul className="space-y-3">
                    {players.map((p, idx) => (
                      <li key={p.id} className="bg-white p-3 rounded-2xl shadow-sm flex justify-between items-center group">
                         <span className="font-bold text-slate-600 font-hand text-xl"><span className="text-[#4DD0E1] mr-2">#{idx + 1}</span> {p.name}</span>
                         <button onClick={() => removePlayer(p.id)} className="text-[#EF9A9A] hover:text-[#E57373] p-1 rounded-full hover:bg-[#FFEBEE] transition-colors">
                            <X size={20} />
                         </button>
                      </li>
                    ))}
                  </ul>
              </div>
           </div>

           {/* Column 2: Questions & Settings */}
           <div className="space-y-4">
              <div className="flex items-center gap-2 text-2xl font-bold font-hand text-[#AD1457] mb-2 border-b-2 border-[#F8BBD0] pb-2">
                 <Leaf size={24} />
                 <h2>Bản Đồ & Thử Thách</h2>
              </div>
              
              <div className="bg-[#FCE4EC] p-5 rounded-3xl border border-[#F8BBD0] grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[#EC407A] block mb-1 uppercase tracking-wider">Thời gian</label>
                    <div className="flex items-center bg-white rounded-xl px-3 py-2 shadow-sm">
                        <Clock size={16} className="text-[#EC407A] mr-2" />
                        <input 
                            type="number" min="5" max="300"
                            value={timeLimit}
                            onChange={(e) => setTimeLimit(parseInt(e.target.value) || 30)}
                            className="w-full font-bold text-slate-600 focus:outline-none text-sm bg-transparent"
                        />
                    </div>
                  </div>
                   <div>
                        <label className="text-xs font-bold text-[#7E57C2] block mb-1 uppercase tracking-wider">Nhờ Tiên Rừng (AI)</label>
                        <div className="flex gap-1">
                            <input 
                                type="text" value={topicInput}
                                onChange={(e) => setTopicInput(e.target.value)}
                                placeholder="Chủ đề..."
                                className="w-full bg-white rounded-xl px-2 py-2 text-sm focus:outline-none shadow-sm"
                            />
                            <button 
                                onClick={handleGenerateQuestions} disabled={isGenerating}
                                className="bg-[#9575CD] text-white px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap shadow-sm hover:bg-[#7E57C2] transition-colors"
                            >
                                {isGenerating ? '...' : 'Tạo'}
                            </button>
                        </div>
                   </div>
              </div>

              <textarea 
                 value={questionsText}
                 onChange={(e) => setQuestionsText(e.target.value)}
                 rows={5}
                 className="w-full bg-white border-2 border-[#E1BEE7] rounded-3xl px-5 py-4 focus:outline-none focus:border-[#CE93D8] font-hand text-lg text-slate-600 resize-none scrollbar-cute shadow-inner"
                 placeholder="Viết câu đố vào đây..."
              ></textarea>
              <div className="text-xs text-slate-400 flex justify-between px-2">
                 <span>Mẹo: Dùng $x^2$ cho Toán học</span>
                 <span>{questionsText.split('\n').filter(l => l.trim()).length} câu đố</span>
              </div>
           </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-12 flex justify-center gap-6">
            <button 
                onClick={clearData}
                className="btn-ghibli bg-[#CFD8DC] text-slate-600 px-6 py-4 text-lg font-bold flex items-center gap-2"
            >
                <Trash2 size={20} /> Xóa Hết
            </button>
            <button 
                onClick={startGame}
                className="btn-ghibli bg-[#66BB6A] text-white text-2xl px-12 py-4 font-black flex items-center gap-3 shadow-[0_10px_20px_rgba(102,187,106,0.4)]"
            >
                <Play size={28} fill="currentColor" /> BẮT ĐẦU
            </button>
        </div>
      </div>
    </div>
  );
}

export default App;