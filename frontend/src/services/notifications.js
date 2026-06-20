/**
 * MindCheck Frontend — Web Push Notifications Client Service.
 *
 * Wraps browser PushManager API and communicates with the FastAPI backend.
 * Fulfills RF-09.
 */

import { pushApi } from './api';

// Helper to convert base64 VAPID public key to Uint8Array for pushManager
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const pushNotifications = {
  /**
   * Check if push notifications are supported by the browser and service worker is active.
   */
  isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  },

  /**
   * Check the current browser notification permission status.
   * Returns: 'granted', 'denied', or 'default'
   */
  getPermissionStatus() {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  },

  /**
   * Get the active push subscription if one exists.
   */
  async getActiveSubscription() {
    if (!this.isSupported()) return null;
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  },

  /**
   * Subscribe the current browser to push notifications.
   * 1. Requests browser permission.
   * 2. Fetches VAPID public key from backend.
   * 3. Subscribes browser via PushManager.
   * 4. Sends subscription credentials to backend.
   */
  async subscribe() {
    if (!this.isSupported()) {
      throw new Error('Notificaciones push no soportadas en este navegador.');
    }

    // 1. Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Permiso de notificaciones denegado por el usuario.');
    }

    // 2. Get active service worker registration
    const registration = await navigator.serviceWorker.ready;

    // 3. Get VAPID public key from backend
    const { public_key: vapidPublicKey } = await pushApi.getVapidPublicKey();
    if (!vapidPublicKey) {
      throw new Error('Servidor no tiene configuradas las notificaciones push (VAPID).');
    }

    // 4. Subscribe with the push service
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    // 5. Send subscription info to backend
    // JSON.stringify(subscription) yields: { endpoint: '...', keys: { p256dh: '...', auth: '...' } }
    const subscriptionJSON = subscription.toJSON();
    await pushApi.subscribe(subscriptionJSON);

    return subscription;
  },

  /**
   * Unsubscribe the current browser from push notifications.
   * 1. Unsubscribes browser via PushManager.
   * 2. Notifies backend to delete subscription.
   */
  async unsubscribe() {
    if (!this.isSupported()) return false;

    const subscription = await this.getActiveSubscription();
    if (!subscription) return false;

    // 1. Unsubscribe from browser push manager
    await subscription.unsubscribe();

    // 2. Notify backend using the endpoint
    try {
      await pushApi.unsubscribe(subscription.endpoint);
    } catch (err) {
      // Log error but proceed (since browser-level unsubscribe completed)
      console.warn('Failed to delete subscription on backend:', err);
    }

    return true;
  }
};
