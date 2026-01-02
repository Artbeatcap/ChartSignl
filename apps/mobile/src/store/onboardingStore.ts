import { create } from 'zustand';
import type {
  OnboardingAnswers,
  TradingStyle,
  InstrumentType,
  PainPoint,
  TradingGoal,
} from '@chartsignl/core';

interface OnboardingState {
  answers: OnboardingAnswers;
  currentStep: number;
  totalSteps: number;
  
  // Actions
  setTradingStyle: (style: TradingStyle) => void;
  toggleInstrument: (instrument: InstrumentType) => void;
  togglePainPoint: (painPoint: PainPoint) => void;
  toggleGoal: (goal: TradingGoal) => void;
  setCommitment: (commitment: string) => void;
  setDisplayName: (name: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  reset: () => void;
}

const initialAnswers: OnboardingAnswers = {
  tradingStyle: null,
  instruments: [],
  painPoints: [],
  goals: [],
  commitment: '',
  displayName: '',
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  answers: initialAnswers,
  currentStep: 0,
  totalSteps: 6, // Welcome, Style, Instruments, PainPoints, Goals, Commitment

  setTradingStyle: (style) =>
    set((state) => ({
      answers: { ...state.answers, tradingStyle: style },
    })),

  toggleInstrument: (instrument) =>
    set((state) => {
      const instruments = state.answers.instruments.includes(instrument)
        ? state.answers.instruments.filter((i) => i !== instrument)
        : [...state.answers.instruments, instrument];
      return { answers: { ...state.answers, instruments } };
    }),

  togglePainPoint: (painPoint) =>
    set((state) => {
      const painPoints = state.answers.painPoints.includes(painPoint)
        ? state.answers.painPoints.filter((p) => p !== painPoint)
        : [...state.answers.painPoints, painPoint];
      return { answers: { ...state.answers, painPoints } };
    }),

  toggleGoal: (goal) =>
    set((state) => {
      const goals = state.answers.goals.includes(goal)
        ? state.answers.goals.filter((g) => g !== goal)
        : [...state.answers.goals, goal];
      return { answers: { ...state.answers, goals } };
    }),

  setCommitment: (commitment) =>
    set((state) => ({
      answers: { ...state.answers, commitment },
    })),

  setDisplayName: (displayName) =>
    set((state) => ({
      answers: { ...state.answers, displayName },
    })),

  nextStep: () =>
    set((state) => ({
      currentStep: Math.min(state.currentStep + 1, state.totalSteps - 1),
    })),

  prevStep: () =>
    set((state) => ({
      currentStep: Math.max(state.currentStep - 1, 0),
    })),

  goToStep: (step) =>
    set((state) => ({
      currentStep: Math.max(0, Math.min(step, state.totalSteps - 1)),
    })),

  reset: () =>
    set({
      answers: initialAnswers,
      currentStep: 0,
    }),
}));
