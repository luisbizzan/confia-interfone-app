import { MaterialIcons } from '@expo/vector-icons';
import { AndroidAudioTypePresets, AudioSession, LiveKitRoom, useConnectionState, useRoomContext } from '@livekit/react-native';
import { ConnectionState } from 'livekit-client';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getLiveKitJoinInfo, type LiveKitJoinInfo } from '../services/livekit';
import { theme } from '../theme/theme';
import { PrimaryButton } from './PrimaryButton';

type VoiceJoinPanelProps = {
  autoConnect?: boolean;
  callId: string;
};

export function VoiceJoinPanel({ autoConnect = false, callId }: VoiceJoinPanelProps) {
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

  useEffect(() => {
    if (autoConnect) {
      handlePrepareAudio();
    }
  }, [autoConnect, callId]);

  return (
    <View style={styles.container}>
      {joinInfo ? (
        <VoiceRoom joinInfo={joinInfo} onError={setError} />
      ) : (
        <>
          <PrimaryButton
            disabled={isLoading}
            label={isLoading ? 'Conectando audio...' : 'Conectar audio'}
            testID="voice-prepare"
            onPress={handlePrepareAudio}
          />
          <Text style={styles.hint}>
            {autoConnect ? 'Preparando o audio da ligacao.' : 'Entre no audio depois que a chamada for atendida.'}
          </Text>
        </>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function VoiceRoom({ joinInfo, onError }: { joinInfo: LiveKitJoinInfo; onError: (message: string | null) => void }) {
  useEffect(() => {
    AudioSession.configureAudio({
      android: {
        audioTypeOptions: AndroidAudioTypePresets.communication,
        preferredOutputList: ['earpiece', 'headset', 'bluetooth', 'speaker'],
      },
      ios: {
        defaultOutput: 'earpiece',
      },
    })
      .then(() => AudioSession.startAudioSession())
      .catch(() => {
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
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [isChangingOutput, setIsChangingOutput] = useState(false);

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

  async function handleToggleSpeaker() {
    setIsChangingOutput(true);

    try {
      const nextState = !speakerEnabled;
      await AudioSession.selectAudioOutput(nextState ? 'speaker' : 'earpiece');
      setSpeakerEnabled(nextState);
      onError(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Nao foi possivel alterar a saida de audio.');
    } finally {
      setIsChangingOutput(false);
    }
  }

  return (
    <View style={styles.roomControls}>
      <Text style={styles.connection}>Audio {voiceConnectionLabel(connectionState)}</Text>
      <View style={styles.controlRow}>
        <VoiceControlButton
          disabled={isChangingMicrophone || connectionState !== ConnectionState.Connected}
          icon={microphoneEnabled ? 'mic' : 'mic-off'}
          label={microphoneEnabled ? 'Silenciar' : 'Microfone'}
          testID="voice-microphone-toggle"
          onPress={handleToggleMicrophone}
        />
        <VoiceControlButton
          disabled={isChangingOutput || connectionState !== ConnectionState.Connected}
          icon={speakerEnabled ? 'volume-up' : 'hearing'}
          label={speakerEnabled ? 'Viva-voz' : 'Fone'}
          testID="voice-output-toggle"
          onPress={handleToggleSpeaker}
        />
      </View>
    </View>
  );
}

function VoiceControlButton({
  disabled,
  icon,
  label,
  onPress,
  testID,
}: {
  disabled: boolean;
  icon: 'hearing' | 'mic' | 'mic-off' | 'volume-up';
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled}
      style={[styles.voiceControl, disabled && styles.voiceControlDisabled]}
      testID={testID}
      onPress={onPress}
    >
      <MaterialIcons color="#ffffff" name={icon} size={26} />
      <Text style={styles.voiceControlLabel}>{label}</Text>
    </TouchableOpacity>
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
    gap: theme.spacing.sm,
  },
  roomControls: {
    gap: theme.spacing.sm,
  },
  connection: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'center',
  },
  voiceControl: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: theme.radius.md,
    flex: 1,
    gap: theme.spacing.xs,
    minHeight: 72,
    justifyContent: 'center',
  },
  voiceControlDisabled: {
    opacity: 0.45,
  },
  voiceControlLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
