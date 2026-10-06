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

export type AttachmentKind = 'photo' | 'video' | 'file';

export interface Attachment {
  id: string;
  file: File;
  kind: AttachmentKind;
  /** Object URL for photo and video previews. */
  previewUrl?: string;
}
