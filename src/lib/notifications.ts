/**
 * Local push notifications for quote expiry reminders.
 * Uses expo-notifications to schedule alerts 7d, 3d, 1d before expiry.
 */

import * as Notifications from 'expo-notifications';
import { logger } from './logger';

const TAG = 'Notifications';

// Configure how notifications are presented when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Schedule expiry reminders for a quote.
 * Creates notifications 7d, 3d and 1d before validUntil.
 */
export async function scheduleQuoteExpiryNotifications(
  quoteId: string,
  quoteNumber: string,
  validUntil: string,
): Promise<void> {
  const expiryDate = new Date(validUntil + 'T12:00:00');
  const now = new Date();

  const alerts = [
    { days: 7, label: '7 dias' },
    { days: 3, label: '3 dias' },
    { days: 1, label: 'amanha' },
  ];

  for (const alert of alerts) {
    const triggerDate = new Date(expiryDate);
    triggerDate.setDate(triggerDate.getDate() - alert.days);
    triggerDate.setHours(9, 0, 0, 0); // 9 AM

    if (triggerDate <= now) continue; // Skip past dates

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Orcamento vence em ${alert.label}`,
          body: `${quoteNumber} vence em ${expiryDate.toLocaleDateString('pt-BR')}. Acompanhe o status.`,
          data: { quoteId, type: 'quote_expiry' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
        identifier: `quote-${quoteId}-${alert.days}d`,
      });
      logger.info(TAG, `Scheduled ${alert.days}d reminder for ${quoteNumber}`);
    } catch (e) {
      logger.warn(TAG, `Failed to schedule notification for ${quoteNumber}`, e);
    }
  }
}

/**
 * Cancel all scheduled notifications for a specific quote.
 */
export async function cancelQuoteNotifications(quoteId: string): Promise<void> {
  const identifiers = [
    `quote-${quoteId}-7d`,
    `quote-${quoteId}-3d`,
    `quote-${quoteId}-1d`,
  ];
  for (const id of identifiers) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // Notification may not exist
    }
  }
}

/**
 * Reschedule all quote expiry notifications.
 * Called on app boot after auth to ensure reminders are up to date.
 */
export async function rescheduleAllQuoteNotifications(
  quotes: Array<{ id: string; quote_number: string; valid_until: string; status: string }>,
): Promise<void> {
  try {
    // Cancel all existing scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Only schedule for non-terminal quotes
    const active = quotes.filter(q =>
      q.status !== 'APPROVED' && q.status !== 'REJECTED' && q.status !== 'EXPIRED',
    );

    for (const q of active) {
      await scheduleQuoteExpiryNotifications(q.id, q.quote_number, q.valid_until);
    }

    logger.info(TAG, `Rescheduled notifications for ${active.length} active quotes`);
  } catch (e) {
    logger.warn(TAG, 'Failed to reschedule notifications', e);
  }
}

/**
 * Get all delivered notifications from the notification center.
 */
export async function getDeliveredNotifications() {
  try {
    return await Notifications.getPresentedNotificationsAsync();
  } catch {
    return [];
  }
}
