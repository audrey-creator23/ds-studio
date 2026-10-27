import {
  Alert,
  Badge,
  Button,
  NativeSelect,
  Progress,
  Stack,
  Tabs,
  Text,
  TextInput,
} from '@mantine/core';
import type { Item } from '../../shared/composition.js';

// Rendu des blocs « Interface Mantine » : les composants du thème studio,
// configurés par variante. Les couleurs viennent des rôles du thème.
const roleColor: Record<string, string> = {
  primary: 'ember',
  info: 'ember',
  accent: 'tangerine',
  warning: 'sunflower',
  danger: 'tomato',
};

export function MantineBlock({ item }: { item: Item }) {
  switch (item.kind) {
    case 'mButton': {
      const variant =
        item.variant === 'accent' || item.variant === 'danger'
          ? 'filled'
          : item.variant;
      const color =
        item.variant === 'accent'
          ? 'tangerine'
          : item.variant === 'danger'
            ? 'tomato.7'
            : 'ember';
      return (
        <Button variant={variant} color={color} size={item.size}>
          {item.text || 'Bouton'}
        </Button>
      );
    }
    case 'mBadge':
      return (
        <Badge
          variant={item.variant === 'primary' ? 'filled' : 'light'}
          color={roleColor[item.variant]}
          size={item.size}
        >
          {item.text || 'Badge'}
        </Badge>
      );
    case 'mAlert':
      return (
        <Alert
          variant="light"
          color={roleColor[item.variant]}
          title={
            item.variant === 'danger'
              ? 'Erreur'
              : item.variant === 'warning'
                ? 'Attention'
                : 'Information'
          }
        >
          {item.text}
        </Alert>
      );
    case 'mProgress':
      return (
        <Stack gap={4}>
          <Text size="sm" fw={500}>
            {item.text || 'Progression'} · 64 %
          </Text>
          <Progress
            value={64}
            color={roleColor[item.variant]}
            aria-label={item.text || 'Progression'}
          />
        </Stack>
      );
    case 'mInput':
      return item.variant === 'select' ? (
        <NativeSelect
          label={item.text || 'Choix'}
          data={['Céramique', 'Couture', 'Jardin partagé']}
        />
      ) : (
        <TextInput label={item.text || 'Libellé'} placeholder="Saisir…" />
      );
    case 'mTabs': {
      const labels = (item.text || 'Onglet 1, Onglet 2')
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 5);
      return (
        <Tabs
          defaultValue="0"
          variant={item.variant === 'pills' ? 'pills' : 'default'}
        >
          <Tabs.List>
            {labels.map((l, i) => (
              <Tabs.Tab key={l + i} value={String(i)}>
                {l}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>
      );
    }
    default:
      return null;
  }
}
