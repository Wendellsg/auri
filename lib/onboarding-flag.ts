const globalForOnboarding = globalThis as unknown as {
  __auvpOnboarding?: {
    completed?: boolean;
  };
};

function getCache() {
  if (!globalForOnboarding.__auvpOnboarding) {
    globalForOnboarding.__auvpOnboarding = {};
  }
  return globalForOnboarding.__auvpOnboarding;
}

export function getCachedOnboardingCompleted() {
  return getCache().completed;
}

export function setCachedOnboardingCompleted(value: boolean) {
  getCache().completed = value;
}
