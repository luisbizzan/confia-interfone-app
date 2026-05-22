import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
      <PrimaryButton
        disabled={isLoading}
        label={isLoading ? 'Preparando audio...' : joinInfo ? 'Token de audio pronto' : 'Preparar audio'}
        testID={joinInfo ? 'voice-ready' : 'voice-prepare'}
        tone={joinInfo ? 'neutral' : 'primary'}
        onPress={handlePrepareAudio}
      />
      <Text style={styles.hint}>
        {joinInfo
          ? 'Token LiveKit emitido. O audio real conecta no development build Android/iOS.'
          : 'No navegador validamos o token e o fluxo. O audio real usa o build mobile.'}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
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
});
