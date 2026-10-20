import { Colors } from '@/lib/theme';

export const CONTRACT_STATUS: Record<string, { bg: string; fg: string; label: string }> = {
  draft: { bg: Colors.borderLight, fg: Colors.textSecondary, label: 'Draft' },
  sent: { bg: Colors.infoLight, fg: Colors.infoText, label: 'Sent' },
  signed: { bg: Colors.successLight, fg: Colors.successText, label: 'Signed' },
  cancelled: { bg: Colors.errorLight, fg: Colors.errorText, label: 'Cancelled' },
};
