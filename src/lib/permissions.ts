/**
 * @module permissions
 * Solicita permissões de câmera e notificações ao usuário.
 * Chamado uma vez após o login, quando a sessão é confirmada.
 *
 * Nota: expo-notifications push tokens não funcionam no Expo Go (SDK 53+).
 * Usamos importação dinâmica para evitar o crash do DevicePushTokenAutoRegistration.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { logger } from './logger';

const TAG = 'permissions';

/** true quando rodando dentro do Expo Go (não em dev build ou produção) */
const isExpoGo = Constants.appOwnership === 'expo';

/**
 * Solicita permissão de câmera (expo-image-picker).
 * Silencioso — não exibe erro se negado.
 */
export async function requestCameraPermission(): Promise<void> {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    logger.info(TAG, `Câmera: ${status}`);
  } catch (e) {
    logger.warn(TAG, 'Erro ao solicitar permissão de câmera', e);
  }
}

/**
 * Solicita permissão de notificações.
 * No Expo Go, apenas solicita a permissão do SO (sem push token).
 * Em dev build / produção, também obtém o Expo Push Token.
 */
export async function requestNotificationPermission(): Promise<void> {
  try {
    // Importação dinâmica evita o side-effect de DevicePushTokenAutoRegistration no Expo Go
    const Notifications = await import('expo-notifications');

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'InovaCalc',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#042C53',
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    logger.info(TAG, `Notificações: ${finalStatus}`);

    // Push token só funciona em dev build / produção (não no Expo Go)
    if (finalStatus === 'granted' && !isExpoGo) {
      const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
      const token = tokenData?.data ?? null;
      if (token) logger.info(TAG, `Push token: ${token}`);
    }
  } catch (e) {
    logger.warn(TAG, 'Erro ao solicitar permissão de notificações', e);
  }
}

/** Solicita câmera + notificações de uma vez. */
export async function requestAppPermissions(): Promise<void> {
  await Promise.all([
    requestCameraPermission(),
    requestNotificationPermission(),
  ]);
}
