import type { Child, Profile } from '@/core/types';

export type ZamApplicationProps = { docId: string; profile: Profile; child?: Child | null };

// Na urządzeniu mobilnym szczegóły zachowują odnośnik do oryginalnego PDF-u ZUS.
export function ZamApplication(_props: ZamApplicationProps) {
  return null;
}
