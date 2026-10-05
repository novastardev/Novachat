export type Role = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  attachments?: string[];
}

export interface ComposerOptions {
  thinkHarder: boolean;
  webSearch: boolean;
}

export interface SendPayload {
  text: string;
  options: ComposerOptions;
  attachments: File[];
}
