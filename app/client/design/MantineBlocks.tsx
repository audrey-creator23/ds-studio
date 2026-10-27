import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  NativeSelect,
  Progress,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import type { Item } from '../../shared/composition.js';

// Blocs « Kit shadcn · Mantine » : composants Mantine configurés comme ceux
// du kit Figma (variantes, tailles, géométrie). Les variantes outline,
// secondary, ghost, destructive et link sont résolues par le thème.
const sizes = { sm: 'sm', md: 'md', lg: 'lg' } as const;

export function MantineBlock({ item }: { item: Item }) {
  switch (item.kind) {
    case 'mButton':
      return (
        <Button
          variant={item.variant === 'default' ? 'filled' : item.variant}
          size={sizes[item.size]}
        >
          {item.text || 'Bouton'}
        </Button>
      );
    case 'mBadge':
      return (
        <Badge
          variant={item.variant === 'default' ? 'filled' : item.variant}
          tt="none"
          fw={500}
        >
          {item.text || 'Badge'}
        </Badge>
      );
    case 'mAlert':
      return (
        <Alert
          className="kit-alert"
          variant={item.variant === 'destructive' ? 'destructive' : 'outline'}
          title={item.variant === 'destructive' ? 'Erreur' : 'Information'}
        >
          {item.text}
        </Alert>
      );
    case 'mProgress':
      return (
        <Stack gap={6}>
          <Group justify="space-between">
            <Text size="sm" fw={500}>
              {item.text || 'Progression'}
            </Text>
            <Text size="sm" c="dimmed">
              64 %
            </Text>
          </Group>
          <Progress
            value={64}
            size="sm"
            color={item.variant === 'accent' ? 'blue.5' : 'neutral.2'}
            aria-label={item.text || 'Progression'}
          />
        </Stack>
      );
    case 'mInput': {
      const label = item.text || 'Libellé';
      if (item.variant === 'select')
        return (
          <NativeSelect
            label={label}
            description="Choisissez une option."
            data={['Céramique', 'Couture', 'Jardin partagé']}
          />
        );
      if (item.variant === 'textarea')
        return (
          <Textarea label={label} placeholder="Votre message…" minRows={3} />
        );
      return (
        <TextInput
          label={label}
          description="Visible par les participants."
          placeholder="Saisir…"
        />
      );
    }
    case 'mTabs': {
      const labels = (item.text || 'Onglet 1, Onglet 2')
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 5);
      return (
        <Tabs
          defaultValue="0"
          className={item.variant === 'line' ? undefined : 'kit-tabs'}
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
    case 'mCard': {
      const pad = item.variant === 'sm' ? 16 : 24;
      return (
        <Card padding={0} className="kit-card" style={{ gap: pad }}>
          <Stack gap={4} px={pad} pt={pad}>
            <Text fw={600} size="md">
              {item.text || 'Titre'}
            </Text>
            <Text size="sm" c="dimmed">
              Samedi · 10 h · 8 places
            </Text>
          </Stack>
          <Text size="sm" px={pad}>
            Initiation au tournage, terre et émaux fournis.
          </Text>
          <Group px={pad} pb={pad} gap={8}>
            <Button size="md">Réserver</Button>
            <Button size="md" variant="outline">
              Détails
            </Button>
          </Group>
        </Card>
      );
    }
    case 'mBubble':
      return (
        <div
          className={`kit-bubble is-${item.variant}`}
          data-align={item.variant === 'primary' ? 'end' : 'start'}
        >
          {item.text || 'Message'}
        </div>
      );
    default:
      return null;
  }
}
