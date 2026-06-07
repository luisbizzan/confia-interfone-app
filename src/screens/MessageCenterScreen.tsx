import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import {
  deleteUploadedAttachments,
  getOrCreateMessageThread,
  getThreadMessages,
  listMyMessageThreads,
  pickAndUploadMessageImage,
  sendMessage,
  type MessageItem,
  type MessageTarget,
  type MessageThread,
  type UploadedAttachment,
} from '../services/messages';
import { theme } from '../theme/theme';
import type { AuthenticatedUser } from '../types/domain';

type MessageCenterScreenProps = {
  initialTarget: MessageTarget | null;
  onClearTarget: () => void;
  user: AuthenticatedUser;
};

const MESSAGE_REFRESH_INTERVAL_MS = 5000;

export function MessageCenterScreen({ initialTarget, onClearTarget, user }: MessageCenterScreenProps) {
  const composerInputRef = useRef<TextInput | null>(null);
  const messagesListRef = useRef<FlatList<MessageItem> | null>(null);
  const [activeThread, setActiveThread] = useState<MessageThread | null>(null);
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [composer, setComposer] = useState('');
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<{ fileName: string; uri: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const targetLabel = useMemo(() => initialTarget?.label ?? activeThreadLabel(activeThread, user), [activeThread, initialTarget, user]);

  useEffect(() => {
    let mounted = true;

    async function openInitialTarget() {
      if (!initialTarget) {
        await refreshThreads(mounted, setThreads, setFeedback, setIsLoading);
        return;
      }

      try {
        setIsLoading(true);
        const thread = await getOrCreateMessageThread(initialTarget);

        if (!mounted) {
          return;
        }

        setActiveThread(thread);
        setMessages(await getThreadMessages(thread.id));
      } catch (error) {
        if (mounted) {
          setFeedback(`Nao foi possivel abrir a conversa: ${error instanceof Error ? error.message : 'Tente novamente.'}`);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void openInitialTarget();

    return () => {
      mounted = false;
    };
  }, [initialTarget]);

  useEffect(() => {
    if (!activeThread) {
      return undefined;
    }

    let mounted = true;
    const intervalId = setInterval(() => {
      getThreadMessages(activeThread.id)
        .then((nextMessages) => {
          if (mounted) {
            setMessages((current) => (areMessagesEquivalent(current, nextMessages) ? current : nextMessages));
          }
        })
        .catch(() => {
          // Silent refresh cannot disturb the conversation.
        });
    }, MESSAGE_REFRESH_INTERVAL_MS);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [activeThread]);

  useEffect(() => {
    if (!activeThread) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      messagesListRef.current?.scrollToEnd({ animated: false });
      composerInputRef.current?.focus();
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [activeThread]);

  if (!activeThread && !initialTarget) {
    return (
      <View style={styles.screen}>
        <View>
          <Text style={styles.eyebrow}>Mensagens</Text>
          <Text style={styles.title}>Conversas</Text>
          <Text style={styles.description}>Acompanhe mensagens entre portaria e unidades do condominio.</Text>
        </View>
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
        {isLoading ? <ActivityIndicator color={theme.colors.primary} /> : null}
        <View style={styles.list}>
          {threads.length === 0 && !isLoading ? (
            <Card>
              <Text style={styles.itemMeta}>Nenhuma conversa iniciada ainda. Use o botao de mensagem ao lado de uma chamada.</Text>
            </Card>
          ) : null}
          {threads.map((thread) => (
            <TouchableOpacity key={thread.id} accessibilityRole="button" onPress={() => openThread(thread, setActiveThread, setMessages, setFeedback)}>
              <Card>
                <View style={styles.threadRow}>
                  <View style={styles.flex}>
                    <Text style={styles.itemTitle}>{activeThreadLabel(thread, user)}</Text>
                    <Text style={styles.itemMeta}>{thread.last_message?.body ?? 'Conversa iniciada'}</Text>
                  </View>
                  {thread.unread_count > 0 ? <Text style={styles.unreadBadge}>{thread.unread_count}</Text> : null}
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.chatScreen}>
      <View style={styles.chatHeader}>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.backButton}
          onPress={() => {
            setActiveThread(null);
            setMessages([]);
            onClearTarget();
          }}
        >
          <MaterialIcons color={theme.colors.primary} name="arrow-back" size={22} />
        </TouchableOpacity>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>Mensagens</Text>
          <Text style={styles.chatTitle}>{targetLabel}</Text>
        </View>
      </View>

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      {isLoading ? <ActivityIndicator color={theme.colors.primary} /> : null}

      <FlatList
        ref={messagesListRef}
        contentContainerStyle={[styles.messages, messages.length === 0 && styles.messagesEmpty]}
        data={messages}
        keyExtractor={(message) => message.id}
        keyboardShouldPersistTaps="handled"
        style={styles.messagesScroller}
        ListEmptyComponent={
          !isLoading ? (
            <Card>
              <Text style={styles.itemMeta}>Envie a primeira mensagem desta conversa.</Text>
            </Card>
          ) : null
        }
        renderItem={({ item: message }) => {
          const mine = message.sender_user_id === user.id;

          return (
            <View key={message.id} style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
              <Text style={[styles.bubbleSender, mine ? styles.bubbleTextMine : styles.bubbleTextOther]}>
                {mine ? 'Voce' : message.sender_role === 'PORTARIA' ? 'Portaria' : message.sender_unit_label ?? 'Morador'}
              </Text>
              {message.body ? <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : styles.bubbleTextOther]}>{message.body}</Text> : null}
              {message.attachments.map((attachment) =>
                attachment.mime_type.startsWith('image/') && attachment.signedUrl ? (
                  <TouchableOpacity
                    key={attachment.id}
                    accessibilityLabel={`Abrir imagem ${attachment.file_name}`}
                    accessibilityRole="button"
                    onPress={() => setImagePreview({ fileName: attachment.file_name, uri: attachment.signedUrl as string })}
                  >
                    <Image source={{ uri: attachment.signedUrl }} resizeMode="cover" style={styles.attachmentImage} />
                  </TouchableOpacity>
                ) : (
                  <Text key={attachment.id} style={[styles.attachmentText, mine ? styles.bubbleTextMine : styles.bubbleTextOther]}>
                    Anexo: {attachment.file_name}
                  </Text>
                ),
              )}
              <Text style={[styles.time, mine ? styles.bubbleTextMine : styles.bubbleTextOther]}>{formatTime(message.created_at)}</Text>
            </View>
          );
        }}
        onContentSizeChange={() => messagesListRef.current?.scrollToEnd({ animated: false })}
        onLayout={() => messagesListRef.current?.scrollToEnd({ animated: false })}
      />

      {attachments.length > 0 ? (
        <View style={styles.pendingAttachments}>
          <Text style={styles.pendingAttachmentTitle}>Anexo selecionado</Text>
          {attachments.map((attachment) => (
            <View key={attachment.object_path} style={styles.pendingAttachmentRow}>
              {attachment.preview_uri ? <Image source={{ uri: attachment.preview_uri }} style={styles.pendingAttachmentImage} /> : null}
              <View style={styles.flex}>
                <Text style={styles.pendingAttachmentText}>{attachment.file_name}</Text>
                <Text style={styles.pendingAttachmentHint}>Legenda opcional. Toque em enviar para mandar so a imagem.</Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={isSending}
                style={styles.removeAttachmentButton}
                onPress={() => handleRemoveAttachment(attachment, setAttachments, setFeedback)}
              >
                <MaterialIcons color={theme.colors.muted} name="close" size={20} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.composer}>
        <TouchableOpacity
          accessibilityRole="button"
          disabled={isSending || !activeThread}
          style={styles.attachButton}
          onPress={() => handlePickAttachment(user, setAttachments, setFeedback)}
        >
          <MaterialIcons color={theme.colors.primary} name="attach-file" size={24} />
        </TouchableOpacity>
        <TextInput
          ref={composerInputRef}
          editable={!isSending}
          multiline
          placeholder={attachments.length > 0 ? 'Adicione uma legenda...' : 'Escreva uma mensagem'}
          placeholderTextColor={theme.colors.muted}
          style={styles.input}
          value={composer}
          onChangeText={setComposer}
        />
        <TouchableOpacity
          accessibilityRole="button"
          disabled={isSending || !activeThread || (!composer.trim() && attachments.length === 0)}
          style={[styles.sendButton, (isSending || (!composer.trim() && attachments.length === 0)) && styles.sendButtonDisabled]}
          onPress={() =>
            activeThread
              ? handleSendMessage(activeThread, composer, attachments, setComposer, setAttachments, setMessages, setFeedback, setIsSending)
              : undefined
          }
        >
          {isSending ? <ActivityIndicator color="#ffffff" size="small" /> : <MaterialIcons color="#ffffff" name="send" size={22} />}
        </TouchableOpacity>
      </View>

      <Modal animationType="fade" transparent visible={Boolean(imagePreview)} onRequestClose={() => setImagePreview(null)}>
        <View style={styles.previewOverlay}>
          <TouchableOpacity accessibilityRole="button" style={styles.previewClose} onPress={() => setImagePreview(null)}>
            <MaterialIcons color="#ffffff" name="close" size={28} />
          </TouchableOpacity>
          {imagePreview ? (
            <>
              <Image source={{ uri: imagePreview.uri }} resizeMode="contain" style={styles.previewImage} />
              <Text style={styles.previewTitle}>{imagePreview.fileName}</Text>
            </>
          ) : null}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

async function refreshThreads(
  mounted: boolean,
  setThreads: (threads: MessageThread[]) => void,
  setFeedback: (message: string | null) => void,
  setIsLoading: (value: boolean) => void,
) {
  try {
    setIsLoading(true);
    const nextThreads = await listMyMessageThreads();

    if (mounted) {
      setThreads(nextThreads);
    }
  } catch (error) {
    if (mounted) {
      setFeedback(`Nao foi possivel carregar conversas: ${error instanceof Error ? error.message : 'Tente novamente.'}`);
    }
  } finally {
    if (mounted) {
      setIsLoading(false);
    }
  }
}

async function openThread(
  thread: MessageThread,
  setActiveThread: (thread: MessageThread | null) => void,
  setMessages: (messages: MessageItem[]) => void,
  setFeedback: (message: string | null) => void,
) {
  try {
    setActiveThread(thread);
    setMessages(await getThreadMessages(thread.id));
  } catch (error) {
    setFeedback(`Nao foi possivel abrir a conversa: ${error instanceof Error ? error.message : 'Tente novamente.'}`);
  }
}

async function handlePickAttachment(
  user: AuthenticatedUser,
  setAttachments: (update: (current: UploadedAttachment[]) => UploadedAttachment[]) => void,
  setFeedback: (message: string | null) => void,
) {
  try {
    const attachment = await pickAndUploadMessageImage(user);

    if (attachment) {
      setAttachments((current) => [...current, attachment].slice(0, 3));
      setFeedback('Anexo pronto. Escreva uma legenda opcional ou envie agora.');
    }
  } catch (error) {
    setFeedback(`Nao foi possivel anexar imagem: ${error instanceof Error ? error.message : 'Tente novamente.'}`);
  }
}

async function handleRemoveAttachment(
  attachment: UploadedAttachment,
  setAttachments: (update: (current: UploadedAttachment[]) => UploadedAttachment[]) => void,
  setFeedback: (message: string | null) => void,
) {
  await deleteUploadedAttachments([attachment]);
  setAttachments((current) => current.filter((item) => item.object_path !== attachment.object_path));
  setFeedback(null);
}

async function handleSendMessage(
  thread: MessageThread,
  composer: string,
  attachments: UploadedAttachment[],
  setComposer: (value: string) => void,
  setAttachments: (attachments: UploadedAttachment[]) => void,
  setMessages: (messages: MessageItem[]) => void,
  setFeedback: (message: string | null) => void,
  setIsSending: (value: boolean) => void,
) {
  try {
    setIsSending(true);
    const sentBody = composer.trim();
    const sentAttachments = attachments;
    setComposer('');
    setAttachments([]);
    await sendMessage(thread.id, sentBody, sentAttachments);
    setComposer('');
    setAttachments([]);
    setMessages(await getThreadMessages(thread.id));
    setFeedback(null);
  } catch (error) {
    await deleteUploadedAttachments(attachments);
    setAttachments([]);
    setComposer(composer);
    setFeedback(`Nao foi possivel enviar: ${error instanceof Error ? error.message : 'Tente novamente.'}`);
  } finally {
    setIsSending(false);
  }
}

function activeThreadLabel(thread: MessageThread | null, user: AuthenticatedUser) {
  if (!thread) {
    return 'Nova conversa';
  }

  if (thread.thread_type === 'PORTARIA_UNIT') {
    return user.profile === 'gatehouse' ? thread.unit_a_label : 'Portaria';
  }

  return thread.unit_a_label === thread.unit_b_label ? 'Unidade' : [thread.unit_a_label, thread.unit_b_label].filter(Boolean).join(' e ');
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function areMessagesEquivalent(current: MessageItem[], next: MessageItem[]) {
  if (current.length !== next.length) {
    return false;
  }

  return current.every((currentMessage, index) => {
    const nextMessage = next[index];

    if (!nextMessage) {
      return false;
    }

    return messageSignature(currentMessage) === messageSignature(nextMessage);
  });
}

function messageSignature(message: MessageItem) {
  return [
    message.id,
    message.body ?? '',
    message.created_at,
    message.sender_user_id,
    ...message.attachments.map((attachment) =>
      [attachment.id, attachment.file_name, attachment.mime_type, attachment.object_path, attachment.size_bytes].join(':'),
    ),
  ].join('|');
}

const styles = StyleSheet.create({
  screen: {
    gap: theme.spacing.lg,
  },
  chatScreen: {
    flex: 1,
  },
  eyebrow: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '900',
    marginTop: theme.spacing.xs,
  },
  chatTitle: {
    color: theme.colors.text,
    fontSize: 23,
    fontWeight: '900',
    marginTop: theme.spacing.xs,
  },
  description: {
    color: theme.colors.muted,
    fontSize: 16,
    lineHeight: 23,
    marginTop: theme.spacing.sm,
  },
  list: {
    gap: theme.spacing.md,
  },
  threadRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  flex: {
    flex: 1,
  },
  itemTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  itemMeta: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: theme.spacing.xs,
  },
  unreadBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    minWidth: 26,
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    textAlign: 'center',
  },
  chatHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#eef5ff',
    borderRadius: 999,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  messages: {
    flexGrow: 1,
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
    paddingTop: theme.spacing.xs,
  },
  messagesEmpty: {
    justifyContent: 'center',
  },
  messagesScroller: {
    flex: 1,
  },
  bubble: {
    borderRadius: theme.radius.md,
    maxWidth: '86%',
    padding: theme.spacing.md,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  bubbleSender: {
    fontSize: 12,
    fontWeight: '900',
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextMine: {
    color: '#ffffff',
  },
  bubbleTextOther: {
    color: theme.colors.text,
  },
  attachmentImage: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    height: 160,
    marginTop: theme.spacing.sm,
    width: 220,
  },
  attachmentText: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: theme.spacing.sm,
  },
  time: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: theme.spacing.sm,
    opacity: 0.8,
    textAlign: 'right',
  },
  pendingAttachments: {
    backgroundColor: '#eef5ff',
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  pendingAttachmentTitle: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  pendingAttachmentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  pendingAttachmentImage: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    height: 54,
    width: 54,
  },
  pendingAttachmentText: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
  },
  pendingAttachmentHint: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  removeAttachmentButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  composer: {
    alignItems: 'flex-end',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: Platform.OS === 'android' ? theme.spacing.xs : 0,
    padding: theme.spacing.sm,
  },
  attachButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  input: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 15,
    maxHeight: 110,
    minHeight: 42,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.muted,
  },
  feedback: {
    color: theme.colors.primaryDark,
    fontSize: 14,
    fontWeight: '800',
  },
  previewClose: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 999,
    height: 48,
    justifyContent: 'center',
    position: 'absolute',
    right: theme.spacing.lg,
    top: theme.spacing.xl,
    width: 48,
    zIndex: 2,
  },
  previewImage: {
    height: '82%',
    width: '100%',
  },
  previewOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.94)',
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  previewTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    marginTop: theme.spacing.md,
    opacity: 0.85,
    textAlign: 'center',
  },
});
