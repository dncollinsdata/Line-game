import { Puzzle } from '../engine/types';
import packJson from '../levels/pack.json';

export interface LevelDefinition extends Puzzle {
  id: number;
  seed: number;
  difficulty: number;
}

interface LevelPack {
  version: number;
  levels: LevelDefinition[];
}

const pack = packJson as LevelPack;

export const LEVELS: LevelDefinition[] = pack.levels;

export function getLevel(id: number): LevelDefinition | undefined {
  return LEVELS.find((level) => level.id === id);
}
