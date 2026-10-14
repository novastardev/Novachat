export type Role = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  attachments?: string[];
  /** True while the assistant reply is still pending. */
  thinking?: boolean;
  /** Type the reply out when it first appears (set for live replies, not for history). */
  animate?: boolean;
  /** Set when the reply failed to arrive, so the UI can show an error state. */
  error?: boolean;
  /** Reasoning/thinking content from novastack-1.0-thinking, shown collapsed above the reply. */
  reasoning?: string;
  /** Which model produced this reply (standard or Think harder), so Regenerate can reuse it. */
  thinkHarder?: boolean;
  /** User's like/dislike choice for this reply, if any. */
  rating?: 'up' | 'down';
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

export type AttachmentKind = 'photo' | 'video' | 'file';

export interface Attachment {
  id: string;
  file: File;
  kind: AttachmentKind;
  /** Object URL for photo and video previews. */
  previewUrl?: string;
}
