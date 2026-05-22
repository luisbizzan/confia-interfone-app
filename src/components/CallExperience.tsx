import type { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme/theme';
import type { CallRecord } from '../types/domain';
import { PrimaryButton } from './PrimaryButton';
import { VoiceJoinPanel } from './VoiceJoinPanel';

type IncomingCallExperienceProps = {
  callerLabel: string;
  onAnswer: () => void;
  onRefresh: () => void;
  startedAt: string;
  targetLabel: string;
};

type OutgoingCallExperienceProps = {
  call: CallRecord;
  onCancel: () => void;
  onRefresh: () => void;
};

type ActiveCallExperienceProps = {
  call: CallRecord;
  onEnd: () => void;
};

export function IncomingCallExperience({
  callerLabel,
  onAnswer,
  onRefresh,
  startedAt,
  targetLabel,
}: IncomingCallExperienceProps) {
  return (
    <CallStage
      eyebrow="Chamada recebida"
      headline={callerLabel}
      meta={`${targetLabel} esta sendo chamada desde ${startedAt}.`}
      pulseLabel="Tocando agora"
    >
      <View style={styles.actionStack}>
        <PrimaryButton label="Atender" onPress={onAnswer} />
        <PrimaryButton label="Atualizar" tone="neutral" onPress={onRefresh} />
      </View>
    </CallStage>
  );
}

export function OutgoingCallExperience({ call, onCancel, onRefresh }: OutgoingCallExperienceProps) {
  return (
    <CallStage
      eyebrow="Chamando"
      headline={call.toLabel}
      meta={`${call.fromLabel} iniciou a chamada em ${call.startedAt}.`}
      pulseLabel="Aguardando atendimento"
    >
      <View style={styles.actionStack}>
        <PrimaryButton label="Cancelar chamada" tone="danger" onPress={onCancel} />
        <PrimaryButton label="Atualizar estado" tone="neutral" onPress={onRefresh} />
      </View>
    </CallStage>
  );
}

export function ActiveCallExperience({ call, onEnd }: ActiveCallExperienceProps) {
  return (
    <CallStage
      eyebrow="Em chamada"
      headline={call.toLabel}
      meta={`${call.fromLabel} conectado desde ${call.startedAt}.`}
      pulseLabel="Audio seguro"
    >
      <VoiceJoinPanel autoConnect callId={call.id} />
      <PrimaryButton label="Encerrar chamada" tone="danger" onPress={onEnd} />
    </CallStage>
  );
}

function CallStage({
  children,
  eyebrow,
  headline,
  meta,
  pulseLabel,
}: {
  children: ReactNode;
  eyebrow: string;
  headline: string;
  meta: string;
  pulseLabel: string;
}) {
  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <View style={styles.avatar}>
          <MaterialIcons color="#ffffff" name="phone-in-talk" size={48} />
        </View>
        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.meta}>{meta}</Text>
        <View style={styles.pulse}>
          <View style={styles.pulseDot} />
          <Text style={styles.pulseText}>{pulseLabel}</Text>
        </View>
      </View>
      <View style={styles.controls}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#063b3c',
    borderRadius: theme.radius.lg,
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 620,
    overflow: 'hidden',
    padding: theme.spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.xxl,
  },
  eyebrow: {
    color: '#baf5ec',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#12857b',
    borderColor: '#4ecdc0',
    borderRadius: 999,
    borderWidth: 1,
    height: 128,
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
    width: 128,
  },
  headline: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '900',
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
  meta: {
    color: '#d9f4f1',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 360,
    textAlign: 'center',
  },
  pulse: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  pulseDot: {
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
    height: 9,
    width: 9,
  },
  pulseText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  actionStack: {
    gap: theme.spacing.md,
  },
  controls: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
});
