import type { CoordinatorConfig } from "./types.ts";

export interface CoordinatorPrompt {
  system: string;
  message: string;
  coordinator: CoordinatorConfig;
  signal: AbortSignal;
  onProgress?: (text: string) => void;
}

export interface CoordinatorSession {
  prompt(input: CoordinatorPrompt): Promise<string>;
}
