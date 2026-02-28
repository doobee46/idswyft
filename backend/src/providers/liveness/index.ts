import { LivenessProvider } from '../types.js';
import { HeuristicProvider } from './HeuristicProvider.js';

export function createLivenessProvider(): LivenessProvider {
  const name = process.env.LIVENESS_PROVIDER ?? 'heuristic';

  switch (name) {
    case 'heuristic':
    default:
      return new HeuristicProvider();
  }
}

export { HeuristicProvider } from './HeuristicProvider.js';
