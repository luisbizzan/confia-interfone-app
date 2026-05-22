import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { reportAppError } from '../services/error-reporting';
import { theme } from '../theme/theme';
import { PrimaryButton } from './PrimaryButton';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  errorId: number;
  hasError: boolean;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    errorId: 0,
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void reportAppError(error, {
      componentStack: info.componentStack,
      source: 'react-error-boundary',
    });
  }

  render() {
    if (this.state.hasError) {
      return <AppErrorFallback onReset={() => this.setState((state) => ({ errorId: state.errorId + 1, hasError: false }))} />;
    }

    return <View key={this.state.errorId} style={styles.fill}>{this.props.children}</View>;
  }
}

function AppErrorFallback({ onReset }: { onReset: () => void }) {
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Erro reportado</Text>
        <Text style={styles.title}>Tivemos um problema</Text>
        <Text style={styles.description}>
          O erro foi enviado para o time tecnico com as informacoes necessarias para investigacao.
        </Text>
        <PrimaryButton label="Tentar novamente" onPress={onReset} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  screen: {
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    maxWidth: 460,
    padding: theme.spacing.xl,
    width: '100%',
  },
  eyebrow: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  description: {
    color: theme.colors.muted,
    fontSize: 16,
    lineHeight: 23,
  },
});
