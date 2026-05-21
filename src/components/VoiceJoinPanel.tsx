import { AudioSession, LiveKitRoom, useConnectionState, useRoomContext } from '@livekit/react-native';
import { ConnectionState } from 'livekit-client';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getLiveKitJoinInfo, type LiveKitJoinInfo } from '../services/livekit';
import { theme } from '../theme/theme';
import { PrimaryButton } from './PrimaryButton';

type VoiceJoinPanelProps = {
  callId: string;
};

export function VoiceJoinPanel({ callId }: VoiceJoinPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [joinInfo, setJoinInfo] = useState<LiveKitJoinInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePrepareAudio() {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getLiveKitJoinInfo(callId);
      setJoinInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel preparar o audio.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {joinInfo ? (
        <VoiceRoom joinInfo={joinInfo} onError={setError} />
      ) : (
        <>
          <PrimaryButton
            disabled={isLoading}
            label={isLoading ? 'Conectando audio...' : 'Entrar no audio'}
            testID="voice-prepare"
            onPress={handlePrepareAudio}
          />
          <Text style={styles.hint}>Entre no audio depois que a chamada for atendida.</Text>
        </>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function VoiceRoom({ joinInfo, onError }: { joinInfo: LiveKitJoinInfo; onError: (message: string | null) => void }) {
  useEffect(() => {
    AudioSession.startAudioSession().catch(() => {
      onError('Nao foi possivel iniciar a sessao de audio do dispositivo.');
    });

    return () => {
      AudioSession.stopAudioSession().catch(() => undefined);
    };
  }, [onError]);

  return (
    <View style={styles.room} testID="voice-ready">
      <LiveKitRoom
        audio
        connect
        serverUrl={joinInfo.serverUrl}
        token={joinInfo.token}
        video={false}
        onConnected={() => onError(null)}
        onError={(roomError) => onError(roomError.message || 'Falha ao conectar audio.')}
        onMediaDeviceFailure={() => onError('Microfone indisponivel para esta chamada.')}
      >
        <VoiceRoomControls roomName={joinInfo.roomName} onError={onError} />
      </LiveKitRoom>
    </View>
  );
}

function VoiceRoomControls({ roomName, onError }: { roomName: string; onError: (message: string | null) => void }) {
  const connectionState = useConnectionState();
  const room = useRoomContext();
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [isChangingMicrophone, setIsChangingMicrophone] = useState(false);

  async function handleToggleMicrophone() {
    setIsChangingMicrophone(true);

    try {
      const nextState = !microphoneEnabled;
      await room.localParticipant.setMicrophoneEnabled(nextState);
      setMicrophoneEnabled(nextState);
      onError(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Nao foi possivel alterar o microfone.');
    } finally {
      setIsChangingMicrophone(false);
    }
  }

  return (
    <View style={styles.roomControls}>
      <Text style={styles.success}>Audio {voiceConnectionLabel(connectionState)}</Text>
      <Text style={styles.hint}>Sala segura: {roomName}</Text>
      <PrimaryButton
        disabled={isChangingMicrophone || connectionState !== ConnectionState.Connected}
        label={microphoneEnabled ? 'Mutar microfone' : 'Ativar microfone'}
        testID="voice-microphone-toggle"
        tone="neutral"
        onPress={handleToggleMicrophone}
      />
    </View>
  );
}

function voiceConnectionLabel(connectionState: ConnectionState) {
  const labels: Record<ConnectionState, string> = {
    [ConnectionState.Connected]: 'conectado',
    [ConnectionState.Connecting]: 'conectando',
    [ConnectionState.Disconnected]: 'desconectado',
    [ConnectionState.Reconnecting]: 'reconectando',
    [ConnectionState.SignalReconnecting]: 'reconectando sinal',
  };

  return labels[connectionState];
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  error: {
    color: theme.colors.danger,
    fontWeight: '700',
  },
  hint: {
    color: theme.colors.muted,
  },
  room: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  roomControls: {
    gap: theme.spacing.sm,
  },
  success: {
    color: theme.colors.success,
    fontWeight: '700',
  },
});
