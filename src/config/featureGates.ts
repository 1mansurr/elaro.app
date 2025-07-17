// src/config/featureGates.ts

export type PlanType = 'origin' | 'oddity';

type FeatureGates = {
  [feature: string]: {
    origin: boolean;
    oddity: boolean;
  };
};

export const featureGates: FeatureGates = {
  unlimitedStudySessions: {
    origin: false,
    oddity: true,
  },
  fullAIGuideAccess: {
    origin: false,
    oddity: true,
  },
  spacedRepetitionDay14_180: {
    origin: false,
    oddity: true,
  },
  copyLearningStylePrompts: {
    origin: false,
    oddity: true,
  },
  taskEventLimit14: {
    origin: true,
    oddity: false,
  },
  premiumToolsBanner: {
    origin: false,
    oddity: true,
  },
  accessToUpgradeFlow: {
    origin: true,
    oddity: false,
  },
}; 