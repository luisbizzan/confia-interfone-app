import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { supabase } from './supabase';
import type { AuthenticatedUser } from '../types/domain';

export type MessageTarget =
  | {
      label: string;
      originUnitId?: string | null;
      targetType: 'PORTARIA';
      targetUnitId?: null;
    }
  | {
      label: string;
      originUnitId?: string | null;
      targetType: 'UNIT';
      targetUnitId: string;
    };

export type MessageAttachment = {
  bucket_id: string;
  expires_at: string;
  file_name: string;
  id: string;
  mime_type: string;
  object_path: string;
  signedUrl?: string | null;
  size_bytes: number;
};

export type MessageItem = {
  attachments: MessageAttachment[];
  body: string | null;
  created_at: string;
  id: string;
  sender_role: 'PORTARIA' | 'MORADOR';
  sender_unit_id: string | null;
  sender_unit_label: string | null;
  sender_user_id: string;
  thread_id: string;
};

export type MessageThread = {
  condominium_id: string;
  created_at: string;
  id: string;
  last_message: MessageItem | null;
  thread_type: 'PORTARIA_UNIT' | 'UNIT_UNIT';
  unit_a_id: string;
  unit_a_label: string;
  unit_b_id: string | null;
  unit_b_label: string | null;
  unread_count: number;
  updated_at: string;
};

export type UploadedAttachment = {
  file_name: string;
  mime_type: string;
  object_path: string;
  preview_uri?: string;
  size_bytes: number;
};

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

export async function getOrCreateMessageThread(target: MessageTarget) {
  if (!supabase) {
    throw new Error('Supabase nao configurado.');
  }

  const { data, error } = await supabase.rpc('get_or_create_message_thread', {
    p_origin_unit_id: target.originUnitId ?? null,
    p_target_type: target.targetType,
    p_target_unit_id: target.targetType === 'UNIT' ? target.targetUnitId : null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as MessageThread;
}

export async function listMyMessageThreads() {
  if (!supabase) {
    throw new Error('Supabase nao configurado.');
  }

  const { data, error } = await supabase.rpc('list_my_message_threads');

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MessageThread[];
}

export async function getThreadMessages(threadId: string) {
  if (!supabase) {
    throw new Error('Supabase nao configurado.');
  }

  const { data, error } = await supabase.rpc('get_thread_messages', {
    p_limit: 50,
    p_thread_id: threadId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const messages = (data ?? []) as MessageItem[];
  return Promise.all(
    messages.map(async (message) => ({
      ...message,
      attachments: await Promise.all(message.attachments.map((attachment) => createAttachmentPreview(attachment))),
    })),
  );
}

export async function pickAndUploadMessageImage(user: AuthenticatedUser) {
  if (!supabase) {
    throw new Error('Supabase nao configurado.');
  }

  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      throw new Error('Permissao para acessar fotos nao concedida.');
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: false,
    mediaTypes: ['images'],
    quality: 0.8,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  const fileName = sanitizeFileName(asset.fileName ?? `foto-${Date.now()}.jpg`);
  const mimeType = asset.mimeType ?? guessMimeType(fileName);
  const fileInfo = await FileSystem.getInfoAsync(asset.uri);
  const sizeBytes = asset.fileSize ?? (fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0);

  if (sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new Error('Anexo maior que 10MB.');
  }

  const base64 = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: 'base64',
  });
  const bytes = base64ToUint8Array(base64);
  const realSizeBytes = sizeBytes > 0 ? sizeBytes : bytes.byteLength;

  if (realSizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new Error('Anexo maior que 10MB.');
  }

  if (realSizeBytes <= 0) {
    throw new Error('Nao foi possivel ler o tamanho do anexo.');
  }

  const objectPath = `${user.condominiumId}/${user.id}/${Date.now()}-${fileName}`;
  const { error } = await supabase.storage.from('message-attachments').upload(objectPath, bytes.buffer, {
    contentType: mimeType,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    file_name: fileName,
    mime_type: mimeType,
    object_path: objectPath,
    preview_uri: asset.uri,
    size_bytes: realSizeBytes,
  } satisfies UploadedAttachment;
}

export async function sendMessage(threadId: string, body: string, attachments: UploadedAttachment[]) {
  if (!supabase) {
    throw new Error('Supabase nao configurado.');
  }

  const { data, error } = await supabase.rpc('send_message', {
    p_attachments: attachments.map(({ file_name, mime_type, object_path, size_bytes }) => ({
      file_name,
      mime_type,
      object_path,
      size_bytes,
    })),
    p_body: body,
    p_thread_id: threadId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const message = await resolveSentMessage(threadId, data);
  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token;

  const { error: notificationError } = await supabase.functions.invoke('send-message-notification', {
    body: { message_id: message.id, thread_id: threadId },
    headers: accessToken
      ? {
          Authorization: `Bearer ${accessToken}`,
        }
      : undefined,
  });

  if (notificationError) {
    console.warn('Mensagem enviada, mas a notificacao falhou.', notificationError.message);
  }

  return message;
}

export async function deleteUploadedAttachments(attachments: UploadedAttachment[]) {
  if (!supabase || attachments.length === 0) {
    return;
  }

  await supabase.storage.from('message-attachments').remove(attachments.map((attachment) => attachment.object_path));
}

async function createAttachmentPreview(attachment: MessageAttachment): Promise<MessageAttachment> {
  if (!supabase) {
    return attachment;
  }

  const { data } = await supabase.storage.from(attachment.bucket_id).createSignedUrl(attachment.object_path, 60 * 60);
  return { ...attachment, signedUrl: data?.signedUrl ?? null };
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function guessMimeType(fileName: string) {
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.png')) {
    return 'image/png';
  }

  if (lower.endsWith('.webp')) {
    return 'image/webp';
  }

  return 'image/jpeg';
}

function normalizeMessage(data: unknown) {
  const message = Array.isArray(data) ? data[0] : data;

  if (isUuid(message)) {
    return { id: message } as MessageItem;
  }

  if (!message || typeof message !== 'object' || !('id' in message) || typeof message.id !== 'string') {
    throw new Error('Backend retornou mensagem sem identificador.');
  }

  return message as MessageItem;
}

function isUuid(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

async function resolveSentMessage(threadId: string, data: unknown) {
  try {
    return normalizeMessage(data);
  } catch {
    const session = await supabase?.auth.getSession();
    const userId = session?.data.session?.user.id;
    const messages = await getThreadMessages(threadId);
    const lastMine = [...messages].reverse().find((message) => !userId || message.sender_user_id === userId);

    if (lastMine) {
      return lastMine;
    }

    throw new Error('Backend retornou mensagem sem identificador.');
  }
}

function base64ToUint8Array(base64: string) {
  const binary = globalThis.atob ? globalThis.atob(base64) : decodeBase64(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function decodeBase64(base64: string) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let buffer = 0;
  let bits = 0;

  for (const char of base64.replace(/\s/g, '')) {
    if (char === '=') {
      break;
    }

    const value = chars.indexOf(char);

    if (value < 0) {
      continue;
    }

    buffer = (buffer << 6) | value;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  return output;
}
