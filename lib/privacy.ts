export const DEFAULT_PRIVACY_NOTICE_VERSION = 'draft-v1';

export function privacyNoticeVersion(): string {
  return process.env.PRIVACY_NOTICE_VERSION?.trim() || DEFAULT_PRIVACY_NOTICE_VERSION;
}
