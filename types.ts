export interface Player {
  id: string;
  name: string;
  score: number;
  pendingEffect: number; // Points to be added/subtracted next turn
}

export interface GameState {
  stage: 'setup' | 'playing' | 'ended';
  currentQuestionIndex: number;
  currentPlayerIndex: number;
  log: LogEntry[];
  isCardModalOpen: boolean;
  cardModalType: 'correct' | 'incorrect' | null;
}

export interface LogEntry {
  id: string;
  time: string;
  message: string;
}

export interface LuckyCard {
  id: string;
  val: number;
  text: string;
  type: 'now' | 'next'; // Apply immediately or next turn
}

export interface Question {
  id: string;
  content: string;
}