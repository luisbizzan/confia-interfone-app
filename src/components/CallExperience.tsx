import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme/theme';
import type { CallRecord } from '../types/domain';
import { Card } from './Card';
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
      <View style={styles.endAction}>
        <PrimaryButton label="Encerrar chamada" tone="danger" onPress={onEnd} />
      </View>
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
      <Card>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <View style={styles.avatar}>
            <Text style={styles.avatarMark}>C</Text>
          </View>
          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.meta}>{meta}</Text>
          <View style={styles.pulse}>
            <View style={styles.pulseDot} />
            <Text style={styles.pulseText}>{pulseLabel}</Text>
          </View>
        </View>
        {children}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 520,
  },
  hero: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
  },
  eyebrow: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#d8f4ef',
    borderColor: '#b7e6df',
    borderRadius: 999,
    borderWidth: 1,
    height: 112,
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
    width: 112,
  },
  avatarMark: {
    color: theme.colors.primaryDark,
    fontSize: 46,
    fontWeight: '900',
  },
  headline: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '900',
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 360,
    textAlign: 'center',
  },
  pulse: {
    alignItems: 'center',
    backgroundColor: '#ecfeff',
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
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
  },
  actionStack: {
    gap: theme.spacing.md,
  },
  endAction: {
    marginTop: theme.spacing.md,
  },
});
