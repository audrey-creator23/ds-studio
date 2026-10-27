import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import App, { Preview } from './App.js';
import { resolver, theme } from './theme.js';
import './styles.css';
const preview = new URLSearchParams(location.search).get('preview') === '1';
if (preview) document.body.classList.add('preview-body');
createRoot(document.getElementById('root')!).render(
  <MantineProvider
    theme={theme}
    cssVariablesResolver={resolver}
    forceColorScheme="light"
  >
    {preview ? <Preview /> : <App />}
  </MantineProvider>,
);
