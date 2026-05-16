/**
 * @module device
 * Identifica e registra o dispositivo físico do usuário no Supabase.
 *
 * Fluxo:
 *  1. Na primeira execução, gera um UUID único e persiste no AsyncStorage.
 *  2. No login bem-sucedido, faz UPSERT em user_devices com info do aparelho.
 *  3. Em acessos seguintes (mesmo offline), o device_id já está no AsyncStorage.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { supabase } from './supabase';
import { logger } from './logger';

const TAG = 'device';
const DEVICE_ID_KEY = 'inovacalc-device-id-v1';

/** Gera UUID v4 simples (não depende de crypto nativo). */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Retorna o ID persistente do dispositivo.
 * Cria um novo UUID na primeira chamada e armazena no AsyncStorage.
 */
export async function getDeviceId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;

    const newId = generateUUID();
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
    logger.info(TAG, `Novo device_id gerado: ${newId}`);
    return newId;
  } catch (e) {
    // Fallback: gera um ID temporário (não persistido) se AsyncStorage falhar
    logger.warn(TAG, 'Erro ao ler/gravar device_id no AsyncStorage', e);
    return generateUUID();
  }
}

/**
 * Registra ou atualiza o dispositivo na tabela user_devices do Supabase.
 * Deve ser chamado logo após o login bem-sucedido, quando há internet.
 *
 * Usa UPSERT — se o dispositivo já estiver registrado, atualiza last_seen_at
 * e info do app. Se for a primeira vez, cria o registro.
 */
export async function registerDevice(userId: string): Promise<void> {
  try {
    const deviceId = await getDeviceId();

    const appVersion =
      Application.nativeApplicationVersion ?? 'unknown';

    const payload = {
      user_id:     userId,
      device_id:   deviceId,
      device_name: Device.deviceName ?? null,
      brand:       Device.brand ?? null,
      model_name:  Device.modelName ?? null,
      os_name:     Platform.OS,
      os_version:  String(Device.osVersion ?? ''),
      app_version: appVersion,
      last_seen_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('user_devices')
      .upsert(payload, {
        onConflict: 'user_id,device_id',
        ignoreDuplicates: false,
      });

    if (error) {
      logger.warn(TAG, 'Erro ao registrar dispositivo', error.message);
    } else {
      logger.info(TAG, `Dispositivo registrado: ${Device.modelName ?? deviceId}`);
    }
  } catch (e) {
    // Não bloqueia o login se falhar
    logger.warn(TAG, 'Falha ao registrar dispositivo (silenciado)', e);
  }
}
