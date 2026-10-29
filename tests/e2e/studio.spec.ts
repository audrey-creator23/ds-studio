import { test, expect, type Page } from '@playwright/test';

const token = (page: Page, key: string) =>
  page.getByLabel(key, { exact: true });
const save = (page: Page) =>
  page.getByRole('button', { name: /^Enregistrer/ }).click();

test('boucle centrale : brouillon en direct, diff, validation, recharge, annulation sélective', async ({
  page,
}) => {
  await page.goto('/index.html?vue=design&mode=tokens');
  await expect(
    page.getByRole('heading', { name: 'Design', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Figma non connecté', { exact: true }),
  ).toBeVisible();
  const mobile = page.frameLocator('iframe');
  const book = mobile.getByRole('button', {
    name: 'Réserver une place',
    exact: true,
  });
  await expect(book).toHaveCSS('background-color', 'rgb(49, 84, 196)');
  await token(page, 'color.brand').fill('#8A3B20');
  // Aperçu immédiat du brouillon, rien sur disque.
  await expect(book).toHaveCSS('background-color', 'rgb(138, 59, 32)');
  expect(
    (await (await page.request.get('/api/state')).json()).tokens['color.brand']
      .$value,
  ).toBe('#3154C4');
  await page.getByRole('button', { name: 'Enregistré' }).click();
  await expect(book).toHaveCSS('background-color', 'rgb(49, 84, 196)');
  await page.getByRole('button', { name: /^Brouillon/ }).click();
  await save(page);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('#3154C4');
  await expect(dialog).toContainText('#8A3B20');
  await dialog.getByRole('button', { name: 'Ne pas appliquer' }).click();
  await save(page);
  await dialog.getByRole('button', { name: 'Valider et enregistrer' }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Enregistré' }).click();
  await expect(book).toHaveCSS('background-color', 'rgb(138, 59, 32)');
  await expect(
    mobile.getByRole('button', { name: 'Découvrir', exact: true }),
  ).toHaveCSS('background-color', 'rgb(138, 59, 32)');
  await page.reload();
  await expect(book).toHaveCSS('background-color', 'rgb(138, 59, 32)');
  await token(page, 'space.md').fill('22');
  await save(page);
  await dialog.getByRole('button', { name: 'Valider et enregistrer' }).click();
  await page.getByRole('button', { name: /Historique/ }).click();
  await page
    .getByRole('button', { name: 'Annuler la révision 1', exact: true })
    .click();
  await dialog.getByRole('button', { name: 'Valider et enregistrer' }).click();
  await expect(book).toHaveCSS('background-color', 'rgb(49, 84, 196)');
  await expect(book).toHaveCSS('padding-left', '22px');
  await page.screenshot({ path: 'test-results/studio.png', fullPage: true });
});

test('simulateur : appareils, largeur personnalisée, glisser, interactions', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.goto('/index.html?vue=design&mode=tokens');
  const frame = page.frameLocator('iframe');
  const iframe = page.locator('iframe');
  for (const [device, width] of [
    ['compact', 320],
    ['iphone', 393],
    ['ipad', 820],
    ['desktop', 1280],
  ] as const) {
    await page
      .getByRole('combobox', { name: 'Appareil', exact: true })
      .selectOption(device);
    await expect(iframe).toHaveAttribute('width', String(width));
    await expect
      .poll(() =>
        iframe.evaluate((f: HTMLIFrameElement) => f.contentWindow?.innerWidth),
      )
      .toBe(width);
    expect(
      await frame
        .locator('body')
        .evaluate((el) => el.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const columns = await frame
      .locator('.scenario-grid')
      .evaluate(
        (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length,
      );
    expect(columns).toBe(width >= 700 ? 2 : 1);
  }
  await page.getByLabel('Largeur', { exact: true }).fill('430');
  await expect(iframe).toHaveAttribute('width', '430');
  await expect(page.getByText('430 × 800 px')).toBeVisible();
  const handle = page.getByRole('slider', { name: 'Largeur de l’aperçu' });
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + box.height / 2, { steps: 4 });
  await page.mouse.up();
  expect(Number(await iframe.getAttribute('width'))).toBeGreaterThan(430);
  await handle.focus();
  await page.keyboard.press('ArrowLeft');
  await page
    .getByRole('combobox', { name: 'Appareil', exact: true })
    .selectOption('iphone');
  await frame
    .getByRole('button', { name: 'Réserver une place', exact: true })
    .click();
  await expect(
    frame.getByRole('button', { name: 'Réservation confirmée ✓' }),
  ).toBeVisible();
  await frame.getByRole('button', { name: 'Favoris', exact: true }).click();
  await expect(
    frame.getByText('Vos ateliers favoris apparaîtront ici.'),
  ).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Écran', exact: true })
    .selectOption('form');
  await frame.getByLabel('Votre prénom').fill('Camille');
  await frame.getByLabel('Adresse e-mail').fill('camille@example.com');
  await frame.getByRole('checkbox').check();
  await frame.getByRole('button', { name: 'S’inscrire', exact: true }).click();
  await expect(frame.getByText(/Merci ! Démonstration locale/)).toBeVisible();
  await page.setViewportSize({ width: 700, height: 900 });
  expect(
    await page
      .locator('body')
      .evaluate((el) => el.scrollWidth <= window.innerWidth),
  ).toBe(true);
});

test('composants : variante, taille et états réels dans l’aperçu', async ({
  page,
}) => {
  await page.goto('/index.html?vue=design&mode=tokens');
  await page
    .getByRole('combobox', { name: 'Composant', exact: true })
    .selectOption('button');
  await page
    .getByRole('combobox', { name: 'Variante', exact: true })
    .selectOption('danger');
  await page.getByLabel('LG', { exact: true }).check();
  await page.getByLabel('Texte', { exact: true }).fill('Supprimer');
  await expect(
    page.getByRole('combobox', { name: 'Écran', exact: true }),
  ).toHaveValue('components');
  const frame = page.frameLocator('iframe');
  await expect(frame.locator('.ds-sheet figure')).toHaveCount(4);
  await expect(
    frame.locator('.ds-button.danger.lg', { hasText: 'Supprimer' }),
  ).toHaveCount(4);
  await expect(frame.locator('.ds-button.is-disabled')).toBeDisabled();
  await page
    .getByRole('combobox', { name: 'Composant', exact: true })
    .selectOption('field');
  await expect(frame.locator('.ds-field input.is-error')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await page.reload();
  await expect(
    page.getByRole('combobox', { name: 'Composant', exact: true }),
  ).toHaveValue('field');
});

test('entrée couleur invalide sans mutation et clavier du diff', async ({
  page,
}) => {
  await page.goto('/index.html?vue=design&mode=tokens');
  await token(page, 'color.brand').fill('red');
  await expect(page.getByRole('alert').first()).toContainText(
    'Couleur attendue',
  );
  await expect(
    page.getByRole('button', { name: /^Enregistrer/ }),
  ).toBeDisabled();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await token(page, 'color.brand').fill('#123456');
  await save(page);
  await expect(
    page.getByRole('button', { name: 'Ne pas appliquer' }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('export navigateur, import valide avec diff, fichier invalide sans écriture', async ({
  page,
}) => {
  await page.goto('/index.html?vue=design&mode=tokens');
  await expect(
    page.getByRole('heading', { name: 'Tokens', exact: true }),
  ).toBeVisible();
  const before = await (await page.request.get('/api/state')).json();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter les tokens' }).click();
  const file = await download;
  const { readFile } = await import('node:fs/promises');
  const exported = JSON.parse(await readFile((await file.path())!, 'utf8'));
  expect(exported).toEqual(before.tokens);
  exported['color.success'].$value = '#125533';
  await page.locator('input[type=file]').setInputFiles({
    name: 'palette.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(exported)),
  });
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('color.success');
  expect((await (await page.request.get('/api/state')).json()).revision).toBe(
    before.revision,
  );
  await dialog.getByRole('button', { name: 'Valider et enregistrer' }).click();
  await expect(dialog).not.toBeVisible();
  const after = await (await page.request.get('/api/state')).json();
  expect(after.tokens['color.success'].$value).toBe('#125533');
  await page.locator('input[type=file]').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{bad'),
  });
  await expect(page.getByRole('alert')).toBeVisible();
  expect((await (await page.request.get('/api/state')).json()).revision).toBe(
    after.revision,
  );
});

test('contraste du brouillon immédiat sans modifier les composants enregistrés', async ({
  page,
}) => {
  await page.goto('/index.html?vue=design&mode=tokens');
  await token(page, 'color.brand').fill('#FFFFFF');
  await expect(page.getByText('Contraste marque / texte')).toContainText(
    '1.00:1',
  );
  await expect(page.getByText('Contraste marque / texte')).toContainText(
    'Contraste à améliorer',
  );
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const current = await (await page.request.get('/api/state')).json();
  expect(current.tokens['color.brand'].$value).not.toBe('#FFFFFF');
  await page.getByRole('button', { name: 'Rétablir color.brand' }).click();
});

test('brief privé et Codex conservés sur la page Assistant', async ({
  page,
}) => {
  await page.goto('/index.html?vue=assistant');
  await page.getByText('Mon PFE · brief privé', { exact: true }).click();
  await page
    .getByLabel('Nom du PFE', { exact: true })
    .fill('Mon atelier accessible');
  await page
    .getByLabel('Public concerné', { exact: true })
    .fill('Étudiants en mobilité');
  await page
    .getByLabel('Objectif et critères de réussite', { exact: true })
    .fill('Réserver en moins de trois étapes');
  await page.getByRole('button', { name: 'Enregistrer le brief' }).click();
  await expect(page.getByText('Brief enregistré sur ce poste.')).toBeVisible();
  await page.reload();
  await page.getByText('Mon PFE · brief privé', { exact: true }).click();
  await expect(page.getByLabel('Nom du PFE', { exact: true })).toHaveValue(
    'Mon atelier accessible',
  );
  await page.locator('summary', { hasText: 'Codex' }).click();
  await expect(
    page.getByRole('combobox', { name: 'Mode de travail' }),
  ).toHaveValue('manual');
  await page.goto('/index.html?vue=design');
  await expect(page.getByText('Mode de travail')).toHaveCount(0);
});

test('recherche, brouillon récupéré après recharge, annuler et rétablir', async ({
  page,
}) => {
  await page.goto('/index.html?vue=design&mode=tokens');
  const before = await (await page.request.get('/api/state')).json();
  await page.getByLabel('Rechercher un token').fill('space');
  await expect(page.locator('.token-row')).toHaveCount(3);
  await token(page, 'space.lg').fill('31');
  await expect(
    page.getByText('modification(s) non enregistrée(s)', { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(token(page, 'space.lg')).toHaveValue('31');
  await expect(
    page.getByText('Brouillon récupéré', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Annuler', exact: true }).isVisible();
  await page.getByRole('button', { name: 'Rétablir space.lg' }).click();
  await expect(token(page, 'space.lg')).toHaveValue(
    String(before.tokens['space.lg'].$value),
  );
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(token(page, 'space.lg')).toHaveValue('31');
  await page.getByRole('button', { name: 'Rétablir', exact: true }).click();
  await expect(token(page, 'space.lg')).toHaveValue(
    String(before.tokens['space.lg'].$value),
  );
  expect((await (await page.request.get('/api/state')).json()).revision).toBe(
    before.revision,
  );
});

test('conflit multi-onglets visible dans le diff, aucune perte de données', async ({
  page,
  context,
}) => {
  await page.goto('/index.html?vue=design&mode=tokens');
  await token(page, 'color.brand').fill('#223355');
  await save(page);
  const other = await context.newPage();
  await other.goto('/index.html?vue=design&mode=tokens');
  await token(other, 'color.brand').fill('#664422');
  await save(other);
  await other.getByRole('button', { name: 'Valider et enregistrer' }).click();
  await expect(other.getByRole('dialog')).not.toBeVisible();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('alert')).toContainText('Une autre validation');
  await expect(
    dialog.getByRole('button', { name: 'Valider et enregistrer' }),
  ).toBeDisabled();
  await dialog.getByRole('button', { name: 'Ne pas appliquer' }).click();
  expect(
    (await (await page.request.get('/api/state')).json()).tokens['color.brand']
      .$value,
  ).toBe('#664422');
  await other.close();
});

test('capacité de session périmée simulée sans rejeu ambigu', async ({
  page,
}) => {
  await page.goto('/index.html?vue=design&mode=tokens');
  await page.getByRole('heading', { name: 'Tokens', exact: true }).waitFor();
  const boot = await (await page.request.get('/api/bootstrap')).json();
  // Un seul refus certain avant mutation, comme une capacité périmée après restart.
  let requests = 0;
  await page.route('**/api/proposals', async (route) => {
    requests++;
    if (requests === 1)
      return route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Validation de session manquante. Rechargez la page.',
        }),
      });
    expect(route.request().headers()['x-ds-studio']).toBe(boot.csrf);
    return route.continue();
  });
  await token(page, 'color.focus').fill('#776622');
  await save(page);
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(requests).toBe(2);
  await page.keyboard.press('Escape');
});

test('clavier, mobile 375 px et absence de stockage navigateur', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Stockage refusé');
    };
    Storage.prototype.getItem = () => {
      throw new DOMException('Stockage refusé');
    };
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/index.html?vue=design');
  // Le lien d'évitement ouvre l'onglet Tokens depuis la composition.
  await page.getByRole('heading', { name: 'Claude', exact: true }).waitFor();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Aller aux tokens' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Tokens', exact: true }),
  ).toBeFocused();
  await token(page, 'color.brand').fill('#114477');
  await save(page);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  expect(
    await page.locator('body').evaluate((el) => el.scrollWidth <= innerWidth),
  ).toBe(true);
});

test('brief : page Bento sur un écran, toggles fermés, statuts persistants', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/index.html');
  await expect(page.getByRole('img', { name: 'DS-Studio' })).toHaveText('🌋');
  const tab = page.getByRole('button', { name: 'Brief du projet' });
  await tab.click();
  await expect(
    page.getByRole('heading', { name: 'Brief du projet', exact: true }),
  ).toBeFocused();
  await expect(page.locator('.workshop')).toBeHidden();
  await expect(page.locator('.timeline li')).toHaveCount(6);
  await expect(page.locator('.card-toggle[open]')).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
  await page.getByText('Voir les 9 tâches').click();
  const select = page.getByRole('combobox', {
    name: 'Statut : Recherche utilisateurs',
  });
  await expect(select).toHaveValue('todo');
  await select.selectOption('validated');
  await expect(page.getByText('Validé par le prof · 1')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Brief du projet' }).click();
  await expect(page.locator('.card-toggle[open]')).toHaveCount(0);
  await expect(page.getByText('Validé par le prof · 1')).toBeVisible();
  await page.getByRole('button', { name: 'Design', exact: true }).click();
  await expect(page.locator('.workshop')).toBeVisible();
  // La page Design s'ouvre sur la composition.
  await expect(
    page.getByRole('heading', { name: 'Claude', exact: true }),
  ).toBeVisible();
});

test('brief : mobile 375 px sans débordement horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/index.html');
  await page.getByRole('button', { name: 'Brief du projet' }).click();
  await expect(page.locator('.brief-tasks')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('dashboard volcan : page secondaire, activité datée, frise et accès', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/index.html');
  await page.getByRole('button', { name: 'Dashboard Volcan' }).click();
  await expect(
    page.getByRole('heading', { name: 'Dashboard Volcan' }),
  ).toBeFocused();
  await expect(page.locator('.workshop')).toBeHidden();
  await expect(
    page.getByRole('img', { name: /Volcan, intensité/ }),
  ).toBeVisible();
  await expect(page.locator('.volcano-track li')).toHaveCount(6);
  await page.getByRole('button', { name: /12 mars · Fin du DS/ }).click();
  await expect(
    page.getByRole('img', { name: 'Volcan, intensité 100 % : Éruption' }),
  ).toBeVisible();
  // Rendu réaliste WebGL par défaut, version légère SVG au choix, mémorisée.
  const stage = page.locator('.volcano-stage');
  await expect(stage).toHaveAttribute('data-render', 'webgl');
  await expect(stage.locator('canvas')).toHaveCount(1);
  await page.getByText('Léger', { exact: true }).click();
  await expect(stage).toHaveAttribute('data-render', 'svg');
  await expect(page.locator('.vl-fountain')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.volcano-stage')).toHaveAttribute(
    'data-render',
    'svg',
  );
  await page.getByText('Réaliste', { exact: true }).click();
  await page.getByRole('button', { name: /12 mars · Fin du DS/ }).click();
  await page.getByRole('button', { name: 'Revenir à aujourd’hui' }).click();
  await page
    .getByRole('button', { name: 'Brief du projet', exact: true })
    .first()
    .click();
  await expect(
    page.getByRole('heading', { name: 'Brief du projet', exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole('button', { name: 'Dashboard Volcan' }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('contexte & assistant : page Bento, sources en lecture seule, saisie multiligne', async ({
  page,
}) => {
  await page.goto('/index.html');
  await page.getByRole('button', { name: 'Contexte & Assistant' }).click();
  await expect(
    page.getByRole('heading', { name: 'Contexte & Assistant' }),
  ).toBeFocused();
  await expect(page.locator('.workshop')).toBeHidden();
  await expect(page.locator('.assistant-sources li')).toHaveCount(6);
  await page.locator('summary', { hasText: 'Contexte' }).click();
  await expect(page.getByText('Brief, planning et checklist')).toBeVisible();
  const model = page.getByRole('combobox', { name: 'Modèle' });
  await expect(model.locator('option')).toHaveCount(3);
  await model.selectOption('claude-sonnet-5-5');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Modèle' })).toHaveValue(
    'claude-sonnet-5-5',
  );
  await page
    .getByRole('combobox', { name: 'Modèle' })
    .selectOption('claude-opus-5-5');
  // Saisie en bas de la carte, chat jusqu'au bas de l'écran.
  const chat = (await page.locator('.assistant-chat').boundingBox())!;
  const form = (await page.locator('.chat-form').boundingBox())!;
  expect(chat.y + chat.height).toBeGreaterThan(
    page.viewportSize()!.height - 40,
  );
  expect(form.y + form.height).toBeLessThanOrEqual(chat.y + chat.height);
  await expect(page.getByLabel('Votre message')).toBeVisible();
  await page.locator('summary', { hasText: 'Connexion' }).click();
  await expect(page.getByText(/Clé conservée côté serveur/)).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('harmonisation : avancement réel indépendant de l’intensité, tablette sans débordement', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/index.html');
  await page.getByRole('button', { name: 'Dashboard Volcan' }).click();
  const kpi = page.locator('.page-kpis dd');
  await expect(page.locator('.page-kpis dt')).toHaveText(
    'Avancement du projet',
  );
  await expect(kpi).toHaveText(/^\d+ %$/);
  const progress = await kpi.textContent();
  await page.getByRole('button', { name: /12 mars · Fin du DS/ }).click();
  await expect(
    page.getByText('Intensité · Éruption', { exact: false }),
  ).toBeVisible();
  await expect(kpi).toHaveText(progress!);
  await expect(page.locator('.card-emoji').first()).toHaveCSS(
    'font-size',
    '18px',
  );
  for (const [width, height] of [
    [1024, 768],
    [768, 1024],
  ]) {
    await page.setViewportSize({ width, height });
    for (const name of [
      'Contexte & Assistant',
      'Brief du projet',
      'Dashboard Volcan',
    ]) {
      await page.getByRole('button', { name }).first().click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
});

test('bento masonry : ouvrir des détails n’étire jamais les cartes voisines', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/index.html');
  await page.getByRole('button', { name: 'Brief du projet' }).click();
  const card = (title: string) =>
    page.locator('.masonry > .card').filter({
      has: page.locator('.card-title', { hasText: new RegExp(`${title}$`) }),
    });
  const height = async (title: string) =>
    (await card(title).boundingBox())!.height;
  const before = {
    objectifs: await height('Objectifs'),
    cibles: await height('Cibles'),
    support: await height('Support'),
  };
  await card('Sujet et problématique').getByText('Détails').click();
  await card('Fonctionnalités').getByText('Détails').click();
  await page.getByText('Voir les 9 tâches').click();
  await expect(card('Sujet et problématique')).toContainText('anxiété');
  await page.waitForTimeout(300);
  expect(await height('Objectifs')).toBe(before.objectifs);
  expect(await height('Cibles')).toBe(before.cibles);
  expect(await height('Support')).toBe(before.support);
  // Pas de trou : chaque carte suit la précédente de la même colonne à un écart près.
  const boxes = await page.locator('.masonry > .card').evaluateAll((cards) =>
    cards.map((c) => {
      const r = c.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    }),
  );
  for (const b of boxes) {
    const above = boxes.filter(
      (o) => o.bottom <= b.top && o.left < b.right - 1 && o.right > b.left + 1,
    );
    if (above.length) {
      const gap = b.top - Math.max(...above.map((o) => o.bottom));
      expect(gap).toBeLessThan(24);
    }
  }
});

test('accueil : page par défaut, CTA Notion, aucune donnée en double, navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/index.html');
  await expect(page).toHaveURL(/vue=accueil/);
  await expect(
    page.getByRole('heading', { name: 'Tableau de bord' }),
  ).toBeVisible();
  await expect(page.locator('.workshop')).toBeHidden();
  for (const name of ['Ouvrir le brief du prof', 'Accéder à mon Notion']) {
    const link = page.getByRole('link', { name });
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('href', /^https:\/\/app\.notion\.com\//);
  }
  const text = await page.locator('.home-page').innerText();
  const progress = await page.locator('.card-figure').first().innerText();
  expect(text.split(progress).length - 1).toBe(1);
  expect(text.match(/J-\d+/g)).toHaveLength(1);
  expect(text.match(/jours/g)).toHaveLength(1);
  await expect(page.locator('.card-toggle[open]')).toHaveCount(0);
  await page.getByText('Voir les 6 jalons').click();
  await expect(page.locator('.home-page .card-list li')).not.toHaveCount(0);
  await page.getByRole('button', { name: /Brief Planning/ }).click();
  await expect(page).toHaveURL(/vue=brief/);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Brief du projet', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Accueil' }).click();
  await page.getByRole('button', { name: /Design Tokens/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Design', exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole('button', { name: 'Accueil' }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

const pageFrame = (page: Page) =>
  page.frameLocator('iframe[title="Aperçu de la page"]');

test('composition : bibliothèque, sélection dans l’aperçu, inspecteur, ordre, annuler, enregistrer', async ({
  page,
}) => {
  await page.goto('/index.html?vue=design');
  const frame = pageFrame(page);
  const title = frame.getByRole('heading', {
    name: 'De petites idées. De vrais liens.',
  });
  await expect(title).toBeVisible();
  // Bibliothèque : recherche puis ajout dans la section ciblée.
  await page.getByLabel('Rechercher un composant').fill('badge');
  await expect(
    page.getByRole('button', { name: 'Ajouter Bouton' }),
  ).toHaveCount(0);
  await page
    .getByRole('combobox', { name: 'Variante Badge', exact: true })
    .selectOption('success');
  await page
    .getByRole('button', { name: 'Ajouter Badge', exact: true })
    .click();
  await page.getByRole('tab', { name: 'Structure', exact: true }).click();
  await page.getByLabel('Texte', { exact: true }).fill('Nouveau');
  const badge = frame.locator('.ds-badge.success', { hasText: 'Nouveau' });
  await expect(badge).toBeVisible();
  // Sélection dans l'aperçu → propriétés du titre.
  await title.click();
  await expect(page.getByLabel('Propriétés : Titre')).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Variante', exact: true })
    .selectOption('section');
  await expect(
    frame.getByRole('heading', { level: 2, name: /De petites idées/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(
    frame.getByRole('heading', { level: 1, name: /De petites idées/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Rétablir', exact: true }).click();
  await expect(
    frame.getByRole('heading', { level: 2, name: /De petites idées/ }),
  ).toBeVisible();
  // Réorganisation : le badge remonte en tête de la section Ateliers.
  await page.getByRole('button', { name: /Badge · Nouveau/ }).click();
  await page.getByRole('button', { name: '↑ Avant' }).click();
  await page.getByRole('button', { name: '↑ Avant' }).click();
  const order = () =>
    frame
      .locator('section[aria-label="Ateliers"] .cmp-item')
      .evaluateAll((els) => els.map((e) => e.textContent?.slice(0, 7)));
  await expect.poll(order).toEqual(['Nouveau', 'ATELIER', 'ATELIER']);
  // Grille responsive : 3 colonnes en desktop, 1 colonne sur iPhone.
  await page.getByRole('button', { name: /^Ateliers/ }).click();
  await page
    .getByRole('combobox', { name: 'Colonnes', exact: true })
    .selectOption('3');
  const columns = () =>
    frame
      .locator('section[aria-label="Ateliers"] .cmp-section-body')
      .evaluate(
        (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length,
      );
  await expect.poll(columns).toBe(1);
  await page
    .getByRole('combobox', { name: 'Appareil', exact: true })
    .selectOption('desktop');
  await expect.poll(columns).toBe(3);
  // Mode interaction : les composants réagissent au lieu d'être sélectionnés.
  await page.getByRole('button', { name: 'Interaction', exact: true }).click();
  await frame.getByRole('button', { name: 'Favoris', exact: true }).click();
  await expect(
    frame.getByText('Vos ateliers favoris apparaîtront ici.'),
  ).toBeVisible();
  // Validation : page enregistrée à part, tokens inchangés.
  await page.getByLabel('Nom', { exact: true }).fill('Accueil test');
  await page.getByRole('button', { name: 'Enregistrer la page' }).click();
  await expect(
    page.getByText('Page « Accueil test » enregistrée'),
  ).toBeVisible();
  await expect(page.getByText(/· enregistrée$/)).toBeVisible();
  const api = await (await page.request.get('/api/compositions')).json();
  expect(api.compositions.map((c: { name: string }) => c.name)).toContain(
    'Accueil test',
  );
  const before = (await (await page.request.get('/api/state')).json()).revision;
  await page.reload();
  await expect(
    frame.locator('.ds-badge.success', { hasText: 'Nouveau' }),
  ).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Page' })).toContainText(
    'Accueil test',
  );
  expect((await (await page.request.get('/api/state')).json()).revision).toBe(
    before,
  );
});

test('composition : Claude propose, l’aperçu montre, l’utilisatrice valide', async ({
  page,
}) => {
  const revision = async () =>
    (await (await page.request.get('/api/state')).json()).revision;
  const before = await revision();
  await page.goto('/index.html?vue=design');
  const frame = pageFrame(page);
  await page.getByRole('button', { name: /grande card à gauche/ }).click();
  await page.getByRole('button', { name: 'Composer', exact: true }).click();
  const proposal = page.getByRole('region', { name: 'Proposition de Claude' });
  await expect(proposal).toContainText('Ajout : Carte atelier');
  await expect(frame.getByText('Première idée')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Proposition' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Enregistrer la page' }),
  ).toBeDisabled();
  await proposal.getByRole('button', { name: 'Refuser' }).click();
  await expect(frame.getByText('Première idée')).toHaveCount(0);
  await page
    .getByLabel('Décrire la page à Claude')
    .fill('Place une grande card à gauche, trois petites à droite.');
  await page.getByLabel('Décrire la page à Claude').press('Enter');
  await proposal
    .getByRole('button', { name: 'Appliquer au brouillon' })
    .click();
  await expect(frame.getByText('Première idée')).toBeVisible();
  // Grande carte à gauche sur 3 lignes, petites cartes empilées à droite.
  await page
    .getByRole('combobox', { name: 'Appareil', exact: true })
    .selectOption('desktop');
  const box = (text: string) =>
    frame.locator('.cmp-item', { hasText: text }).first().boundingBox();
  await expect
    .poll(
      async () =>
        (await box('Troisième idée'))!.x > (await box('Faire moins'))!.x,
    )
    .toBe(true);
  const big = (await frame.locator('[data-id="grande"]').boundingBox())!;
  const third = (await box('Troisième idée'))!;
  expect(third.y).toBeGreaterThan(big.y);
  expect(third.y).toBeLessThan(big.y + big.height);
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(frame.getByText('Première idée')).toHaveCount(0);
  // Question seulement si une information essentielle manque.
  await page.getByLabel('Décrire la page à Claude').fill('Fais une page');
  await page.getByRole('button', { name: 'Composer', exact: true }).click();
  await expect(page.getByText('Quel est l’objectif principal')).toBeVisible();
  await expect(proposal).toHaveCount(0);
  expect(await revision()).toBe(before);
});

test('bulle Claude : toutes les pages, contexte, clavier, glisser, position mémorisée', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/index.html?vue=volcan');
  const bubble = page.getByRole('button', { name: 'Ouvrir le chat Claude' });
  await expect(bubble).toBeVisible();
  await bubble.click();
  const panel = page.getByRole('dialog', { name: 'Chat Claude' });
  await expect(panel).toContainText('Contexte : Dashboard Volcan');
  // Le contexte suit la page ; la conversation reste la même.
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Brief du projet' })
    .click();
  await expect(panel).toContainText('Contexte : Brief du projet');
  await panel.getByRole('button', { name: 'Fermer le chat Claude' }).click();
  await expect(panel).toHaveCount(0);
  await expect(bubble).toBeFocused();
  await bubble.press('Enter');
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: 'Plein écran' }).focus();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(bubble).toBeFocused();
  // Clavier : déplacement borné à l'écran.
  const before = await bubble.boundingBox();
  for (let i = 0; i < 40; i++) await page.keyboard.press('Shift+ArrowLeft');
  const left = (await bubble.boundingBox())!;
  expect(left.x).toBeLessThan(before!.x);
  expect(left.x).toBeGreaterThanOrEqual(12);
  // Glisser ne l'ouvre pas.
  await page.mouse.move(left.x + 20, left.y + 20);
  await page.mouse.down();
  await page.mouse.move(left.x + 220, left.y - 200, { steps: 6 });
  await page.mouse.up();
  await expect(panel).toHaveCount(0);
  const moved = (await bubble.boundingBox())!;
  await page.reload();
  const kept = (await page
    .getByRole('button', { name: 'Ouvrir le chat Claude' })
    .boundingBox())!;
  expect(Math.abs(kept.x - moved.x)).toBeLessThan(2);
  expect(Math.abs(kept.y - moved.y)).toBeLessThan(2);
  // « Plein écran » ouvre la page Assistant.
  await page.getByRole('button', { name: 'Ouvrir le chat Claude' }).click();
  await panel.getByRole('button', { name: 'Plein écran' }).click();
  await expect(
    page.getByRole('heading', { name: 'Contexte & Assistant' }),
  ).toBeVisible();
});

test('v3 : dashboard, accès rapide, frise temporelle, thème', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(
    page.getByText('Récapitulatif des échéances du projet de fin d’études'),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveClass(/dark/);
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeLessThanOrEqual(900);
  // Rendus : 5 grands rendus, jamais /9 ; prochain rendu non fait.
  const kpi = page.locator('.kpis .card').first();
  await expect(kpi).toContainText('Rendus restants');
  await expect(kpi).toContainText('/ 5');
  await expect(kpi).not.toContainText('/ 9');
  await expect(page.locator('.kpis .card').nth(1)).toContainText(
    'Prochain rendu',
  );
  // Prochain rendu au 28/10/2026 : Note de cadrage (ancienne tâche cochée
  // ≠ rendu effectué), J-16 en date locale, même juste après minuit.
  await page.clock.setFixedTime(new Date(2026, 9, 28, 0, 30));
  await page.reload();
  const nextKpi = page.locator('.kpis .card').nth(1);
  await expect(nextKpi).toContainText('J-16');
  await expect(nextKpi).toContainText('Note de cadrage · 13/11/2026');
  await page.clock.setFixedTime(new Date(2026, 10, 20, 10));
  await page.reload();
  await expect(nextKpi).toContainText('J+7');
  await expect(nextKpi).toContainText('en retard');
  // Remis (« Fait ») mais pas validé : toujours le prochain rendu, échéance
  // passée distinguée d'un retard.
  await page.goto('/?vue=brief');
  await page.getByRole('button', { name: 'Actualiser ma progression' }).click();
  await page
    .getByRole('combobox', { name: 'Statut : Présentation' })
    .selectOption('done');
  await page.getByRole('button', { name: 'Fermer' }).click();
  await page.goto('/');
  await expect(nextKpi).toContainText('Note de cadrage · 13/11/2026');
  await expect(nextKpi).toContainText('remis, en attente de validation');
  await page.clock.setFixedTime(new Date(2026, 9, 28, 10));
  await page.reload();
  await expect(nextKpi).toContainText('J-16');
  await expect(nextKpi).not.toContainText('attente');
  await expect(
    page.getByRole('button', { name: 'Voir la liste des tâches' }),
  ).toHaveCount(0);
  // Frise : Passé / À venir ; le KPI vient avant.
  await expect(page.locator('.timeline .badge').first()).toHaveText('Passé');
  const fin = page.getByRole('button', { name: /^Fin du DS/ });
  await fin.click();
  await expect(
    page.getByRole('img', { name: 'Volcan, intensité 100 % : Éruption' }),
  ).toBeVisible();
  await fin.click();
  await expect(
    page.getByText('Le volcan illustre le temps restant'),
  ).toBeVisible();
  // Accès rapide : 4 tuiles 2 × 2, teintes distinctes, vraies routes.
  await expect(
    page.getByText('Retrouvez vos espaces de travail en un clic.'),
  ).toBeVisible();
  const tiles = page
    .getByRole('list', { name: 'Espaces de travail' })
    .getByRole('link');
  await expect(tiles).toHaveCount(4);
  const info = await tiles.evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return {
        text: e.textContent,
        href: e.getAttribute('href'),
        bg: getComputedStyle(e).backgroundColor,
        x: Math.round(r.left),
        y: Math.round(r.top),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    }),
  );
  expect(info.map((t) => t.href)).toEqual([
    '?vue=design',
    '?vue=brief',
    '?vue=schemas',
    '?vue=notes',
  ]);
  expect(info[0].text).toContain('Créer mes interfaces');
  expect(new Set(info.map((t) => t.bg)).size).toBe(4);
  expect(new Set(info.map((t) => t.x)).size).toBe(2);
  expect(new Set(info.map((t) => t.y)).size).toBe(2);
  expect(new Set(info.map((t) => t.w)).size).toBe(1);
  expect(new Set(info.map((t) => t.h)).size).toBe(1);
  await expect(page.locator('.rendus')).toHaveCount(0);
  // Volcan : remplit la carte Activité.
  const stage = await page.locator('.activity .stage').boundingBox();
  expect(stage!.height).toBeGreaterThanOrEqual(220);
  await tiles.nth(1).click();
  await expect(page).toHaveURL(/vue=brief/);
  await expect(
    page.getByRole('heading', { name: 'Étapes du PFE', level: 1 }),
  ).toBeVisible();
  // Accès ciblé à une étape (ancre) : défilement jusqu'à elle, fermée.
  await page.goto('/?vue=brief#etape-problematique');
  const step = page.locator('#etape-problematique');
  await expect(step).toBeInViewport();
  await expect(page.locator('.step-detail')).toHaveCount(0);
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
  // Accès par le menu : toujours en haut, sans l'ancre ni l'ancien scroll.
  const nav = page.locator('.sidebar nav');
  await nav.getByText('Dashboard').click();
  await nav.getByText('Étapes du PFE').click();
  await expect(page).not.toHaveURL(/#etape/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.evaluate(() => scrollTo(0, 800));
  await nav.getByText('Mes notes').click();
  await nav.getByText('Étapes du PFE').click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  // États actifs centralisés : fond noir, texte blanc.
  const active = nav.locator('[aria-current="page"]');
  await expect(active).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await expect(active).toHaveCSS('color', 'rgb(255, 255, 255)');
  // Menu : pictos, pas de « Contexte & Assistant » ; bulle Claude.
  await page.goto('/');
  await expect(page.locator('.sidebar')).not.toContainText('Contexte');
  await page.getByRole('button', { name: 'Ouvrir le chat Claude' }).click();
  await expect(page.getByRole('dialog', { name: 'Chat Claude' })).toContainText(
    'Contexte : Dashboard',
  );
  await page
    .getByRole('button', { name: 'Fermer le chat', exact: true })
    .click();
  // Thème : icônes soleil / lune, mémorisé.
  await page.getByRole('button', { name: 'Clair' }).click();
  await page.reload();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.goto('/index.html');
  await expect(
    page.getByRole('heading', { name: 'Tableau de bord' }),
  ).toBeVisible();
});

test('v3 : étapes du PFE, statuts, checklist, sauvegarde, frise jusqu’en bas', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?vue=brief');
  await expect(
    page.getByRole('heading', { name: 'Étapes du PFE', level: 1 }),
  ).toBeVisible();
  for (const name of ['Accéder au brief', 'Accéder à mon fichier de rédaction'])
    await expect(page.getByRole('link', { name })).toHaveAttribute(
      'target',
      '_blank',
    );
  await expect(page.locator('.page-header .lead')).toHaveText(
    'Retrouvez les étapes de votre PFE, suivez votre progression et actualisez l’état d’avancement de vos tâches.',
  );
  // Toutes les étapes fermées à l'arrivée.
  await expect(page.locator('.steps > li')).toHaveCount(10);
  await expect(page.locator('.step-detail')).toHaveCount(0);
  // Checklist : un statut par étape, % recalculé (fait ou validé).
  const summary = page.locator('.checklist-card');
  await page.getByRole('button', { name: 'Actualiser ma progression' }).click();
  const detail = page.getByRole('dialog', { name: /Ma progression/ });
  await expect(detail.getByRole('combobox')).toHaveCount(10);
  const pres = detail.getByRole('combobox', { name: 'Statut : Présentation' });
  for (const t of ['À faire', 'En cours', 'À retravailler', 'Fait', 'Validé'])
    await expect(pres.locator('option', { hasText: t })).toHaveCount(1);
  for (const s of await detail.getByRole('combobox').all())
    await s.selectOption('todo');
  await expect(summary.locator('.stat')).toHaveText('0 %');
  await pres.selectOption('validated');
  await expect(summary.locator('.stat')).toHaveText('10 %');
  await detail
    .getByRole('combobox', { name: 'Statut : Objectifs' })
    .selectOption('done');
  await expect(summary.locator('.stat')).toHaveText('20 %');
  await detail
    .getByRole('combobox', { name: 'Statut : Objectifs' })
    .selectOption('doing');
  await expect(summary.locator('.stat')).toHaveText('10 %');
  await detail.getByRole('button', { name: 'Fermer' }).click();
  // Badge « Validé » vert, « À retravailler » rouge.
  const first = page.locator('.step').first();
  await expect(first.locator('.status-badge')).toHaveAttribute(
    'data-status',
    'validated',
  );
  // Détail : sections renommées ; « Masquer » sans changement, sinon
  // « Sauvegarder et masquer » qui enregistre avant de fermer.
  const step = page.locator('.step', { hasText: 'Objectifs' });
  await expect(step.getByRole('combobox')).toHaveCount(0);
  await step.getByRole('button', { name: 'Voir le détail' }).click();
  for (const h of ['Attendus du brief', 'Mes pistes', 'Échéancier', 'Suivi'])
    await expect(step.getByRole('heading', { name: h })).toBeVisible();
  await expect(step.getByRole('button', { name: 'Masquer' })).toBeVisible();
  await step
    .getByRole('combobox', { name: 'Statut de l’étape : Objectifs' })
    .selectOption('rework');
  await step.getByRole('button', { name: 'Sauvegarder et masquer' }).click();
  await expect(step.locator('.step-detail')).toHaveCount(0);
  await expect(step.locator('.status-badge')).toHaveText('À retravailler');
  // Pistes éditables et persistantes.
  await step.getByRole('button', { name: 'Voir le détail' }).click();
  await step.getByRole('button', { name: 'Modifier mes pistes' }).click();
  await step
    .getByRole('textbox', { name: 'Mes pistes, une par ligne' })
    .fill('Piste A\nPiste B');
  await step.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(step.locator('.step-detail')).toContainText('Piste B');
  await page.reload();
  const again = page.locator('.step', { hasText: 'Objectifs' });
  await expect(again.locator('.status-badge')).toHaveText('À retravailler');
  await again.getByRole('button', { name: 'Voir le détail' }).click();
  await expect(again.locator('.step-detail')).toContainText('Piste A');
  // Frise verticale remplie jusqu'au bas du parcours.
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.querySelector('.steps')!).getPropertyValue(
          '--progress',
        ),
      ),
    )
    .toBe('1');
});

test('v3 : espace Design, DnD imbriqué, Auto Layout, appareils, exports', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?vue=design');
  await expect(
    page.getByRole('heading', { name: 'Mon espace Design' }),
  ).toBeVisible();
  // Onglets : un seul contenu à la fois, Bibliothèque par défaut.
  const tabs = page.getByRole('tablist', { name: 'Outils du studio' });
  await expect(tabs.getByRole('tab')).toHaveCount(3);
  for (const name of ['Claude', 'Bibliothèque', 'Calques'])
    await expect(tabs.getByRole('tab', { name })).toBeVisible();
  // Bibliothèque : état vide sans filtre ; chips principales, union stricte,
  // tags retirables ; la recherche atteint les composants de niche.
  const library = page.locator('.library');
  await expect(library.locator('.library-empty')).toBeVisible();
  await expect(library.locator('iframe')).toHaveCount(0);
  await expect(library.getByRole('button', { name: 'Planning' })).toHaveCount(
    0,
  );
  const count = page.locator('.library .muted.small');
  await page.getByRole('button', { name: 'Bouton', exact: true }).click();
  await page.getByRole('button', { name: 'Badge', exact: true }).click();
  await expect(count).toContainText('2 composants');
  await page.getByRole('button', { name: 'Retirer le filtre Badge' }).click();
  await expect(count).toContainText('1 composant');
  await expect(
    page.getByRole('button', { name: 'Effacer les filtres' }),
  ).toHaveCount(0);
  const gallery = page.frameLocator(
    'iframe[title="Galerie des composants du DS"]',
  );
  await expect(gallery.locator('.cmp-pick').first()).toBeVisible();
  await page.getByRole('button', { name: 'Retirer le filtre Bouton' }).click();
  await expect(library.locator('.library-empty')).toBeVisible();
  await page
    .getByRole('searchbox', { name: 'Rechercher un composant' })
    .fill('planning');
  await expect(count).toContainText('1 composant');
  await page
    .getByRole('searchbox', { name: 'Rechercher un composant' })
    .fill('');
  // Barre d'outils : pas de champ nom, pas de boutons annuler / rétablir.
  await expect(
    page.getByRole('textbox', { name: 'Nom de l’écran' }),
  ).toHaveCount(0);
  await expect(
    page.locator('.preview-bar').getByRole('button', { name: 'Annuler' }),
  ).toHaveCount(0);
  await expect(tabs.getByRole('tab', { name: 'Bibliothèque' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
  // Écran initial vide.
  const frame = page.frameLocator('iframe[title="Aperçu de l’écran"]');
  await expect(frame.locator('.cmp-section')).toHaveCount(1);
  await expect(frame.locator('.cmp-item')).toHaveCount(0);
  // Dépôt réel dans l'écran : événements de glisser-déposer de l'iframe.
  const drop = (target: string, data: Record<string, string>) =>
    frame
      .locator(target)
      .first()
      .evaluate((el, data) => {
        const dt = new DataTransfer();
        for (const [k, v] of Object.entries(data)) dt.setData(k, v);
        const r = el.getBoundingClientRect();
        const at = { clientX: r.left + 4, clientY: r.bottom - 2 };
        el.dispatchEvent(
          new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            dataTransfer: dt,
            ...at,
          }),
        );
        el.dispatchEvent(
          new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            dataTransfer: dt,
            ...at,
          }),
        );
      }, data);
  const block = (kind: string, variant: string) => ({
    'application/x-ds-block': JSON.stringify({ kind, variant }),
  });
  // Composant → écran.
  await drop('.cmp-section > .cmp-section-body', block('button', 'primary'));
  await expect(frame.locator('.cmp-item')).toHaveCount(1);
  // Conteneur → écran, puis composant → conteneur (imbrication).
  await drop('.cmp-section > .cmp-section-body', block('group', 'row'));
  await expect(frame.locator('.cmp-group')).toHaveCount(1);
  await drop('.cmp-group > .cmp-section-body', block('badge', 'neutral'));
  await expect(frame.locator('.cmp-group .cmp-item')).toHaveCount(1);
  await drop('.cmp-group > .cmp-section-body', block('badge', 'brand'));
  await expect(frame.locator('.cmp-group .cmp-item')).toHaveCount(2);
  // Calques synchronisés.
  await tabs.getByRole('tab', { name: 'Calques' }).click();
  await expect(page.locator('.tree-group > ol .tree-line')).toHaveCount(2);
  // Renommer un calque (crayon), nom enregistré avec l'écran.
  await page.getByRole('button', { name: 'Renommer Conteneur' }).click();
  await page.getByRole('textbox', { name: 'Renommer Conteneur' }).fill('Tags');
  await page.keyboard.press('Enter');
  await expect(page.locator('.tree-group > .tree-line .tree-name')).toHaveText(
    'Tags',
  );
  // Réordonner dans l'écran : le second badge passe devant.
  const second = await frame
    .locator('.cmp-group .cmp-item')
    .nth(1)
    .getAttribute('data-id');
  await drop('.cmp-group .cmp-item', { 'application/x-ds-move': second! });
  await expect(frame.locator('.cmp-group .cmp-item').first()).toHaveAttribute(
    'data-id',
    second!,
  );
  // Auto Layout : justification et padding appliqués immédiatement.
  // Sélection du conteneur depuis les calques (synchronisée avec l'écran).
  await page.locator('.tree-group > .tree-line .tree-pick').click();
  await expect(frame.locator('.cmp-group.is-selected')).toHaveCount(1);
  const bar = page.getByRole('complementary', { name: /Propriétés/ });
  await bar.getByRole('button', { name: 'Justification' }).click();
  await page
    .getByRole('dialog', { name: 'Justification' })
    .getByRole('button', { name: 'Centre' })
    .click();
  await expect(frame.locator('.cmp-group > .cmp-section-body')).toHaveCSS(
    'justify-content',
    'center',
  );
  await bar.getByRole('button', { name: 'Marge intérieure (padding)' }).click();
  await page
    .getByRole('dialog', { name: 'Marge intérieure (padding)' })
    .getByRole('button', { name: 'L' })
    .click();
  await expect(frame.locator('.cmp-group')).not.toHaveCSS('padding', '0px');
  // Annuler / rétablir au clavier (⌘Z / ⇧⌘Z).
  await page.getByRole('heading', { name: 'Mon espace Design' }).click();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(frame.locator('.cmp-group')).toHaveCSS('padding', '0px');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(frame.locator('.cmp-group')).not.toHaveCSS('padding', '0px');
  // Grouper / dégrouper une sélection multiple (⌘/Ctrl + clic).
  await drop('.cmp-section > .cmp-section-body', block('text', 'body'));
  await expect(frame.locator('.cmp-item')).toHaveCount(5);
  const lines = page.locator('.tree-section > ol > .tree-node > .tree-line');
  await lines.first().locator('.tree-pick').click();
  await lines
    .last()
    .locator('.tree-pick')
    .click({ modifiers: ['ControlOrMeta'] });
  await page.getByRole('button', { name: 'Grouper' }).click();
  await expect(frame.locator('.cmp-group')).toHaveCount(2);
  await page.getByRole('button', { name: 'Dégrouper' }).click();
  await expect(frame.locator('.cmp-group')).toHaveCount(1);
  await expect(frame.locator('.cmp-item')).toHaveCount(5);
  // Alignement : bloc d'une pile (horizontal seul), blocs d'une rangée
  // (sélection multiple, une seule étape d'annulation), re-clic = retrait.
  const align = page.getByRole('group', { name: 'Alignement' });
  await lines.first().locator('.tree-pick').click();
  await expect(align.getByRole('button')).toHaveCount(6);
  await expect(
    align.getByRole('button', { name: 'Aligner en bas' }),
  ).toBeDisabled();
  await align.getByRole('button', { name: 'Centrer horizontalement' }).click();
  const first = frame
    .locator('.cmp-section > .cmp-section-body > .cmp-item')
    .first();
  await expect(first).toHaveCSS('align-self', 'center');
  await expect(
    align.getByRole('button', { name: 'Centrer horizontalement' }),
  ).toHaveAttribute('aria-pressed', 'true');
  const badges = page.locator('.tree-group > ol .tree-line .tree-pick');
  await badges.first().click();
  await badges.last().click({ modifiers: ['Shift'] });
  await align.getByRole('button', { name: 'Aligner en bas' }).click();
  const inGroup = frame.locator('.cmp-group > .cmp-section-body > .cmp-item');
  await expect(inGroup.first()).toHaveCSS('align-self', 'flex-end');
  await expect(inGroup.last()).toHaveCSS('align-self', 'flex-end');
  await page.getByRole('heading', { name: 'Mon espace Design' }).click();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(inGroup.first()).not.toHaveAttribute('data-ay', 'end');
  await expect(inGroup.last()).not.toHaveAttribute('data-ay', 'end');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(inGroup.last()).toHaveAttribute('data-ay', 'end');
  await lines.first().locator('.tree-pick').click();
  await align.getByRole('button', { name: 'Centrer horizontalement' }).click();
  await expect(first).not.toHaveAttribute('data-ax', 'center');
  // Changement d'appareil sans perte, rotation, Screen sans cadre.
  await page
    .getByRole('group', { name: 'Appareil' })
    .getByRole('button', { name: 'iPad' })
    .click();
  // Noms seuls sous les appareils ; l'actif en noir (état centralisé).
  await expect(page.locator('.devices')).not.toContainText('×');
  await expect(
    page.getByRole('group', { name: 'Appareil' }).getByRole('button', {
      name: 'iPad',
    }),
  ).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  const shot = page.locator('iframe[title="Aperçu de l’écran"]');
  const ratio = () =>
    shot.evaluate(
      (el) =>
        (el as HTMLElement).offsetWidth / (el as HTMLElement).offsetHeight,
    );
  await expect.poll(ratio).toBeLessThan(1);
  await expect(frame.locator('.cmp-item')).toHaveCount(5);
  await page.getByRole('button', { name: 'Pivoter' }).click();
  await expect.poll(ratio).toBeGreaterThan(1);
  await page
    .getByRole('group', { name: 'Appareil' })
    .getByRole('button', { name: 'MacBook' })
    .click();
  await expect.poll(ratio).toBeGreaterThan(1);
  await page
    .getByRole('group', { name: 'Appareil' })
    .getByRole('button', { name: 'Screen' })
    .click();
  await expect(page.locator('.device--screen')).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Redimensionner l’écran/ }),
  ).toBeVisible();
  await page
    .getByRole('group', { name: 'Appareil' })
    .getByRole('button', { name: 'iPhone' })
    .click();
  await expect(page.locator('.device--mobile .island')).toBeVisible();
  await expect(frame.locator('.cmp-item')).toHaveCount(5);
  // Exports réels depuis « Exporter » ; formats visibles après le nom.
  await page.getByRole('button', { name: 'Exporter', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Exporter un écran' });
  await expect(dialog.getByRole('button', { name: 'Exporter' })).toBeDisabled();
  await expect(dialog.getByRole('radio')).toHaveCount(0);
  await dialog.getByRole('textbox', { name: 'Nom de l’écran' }).fill('Accueil');
  await expect(dialog.getByRole('radio', { name: /Figma/ })).toBeEnabled();
  await dialog.getByRole('radio', { name: 'Composant React/TSX' }).check();
  let download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Exporter' }).click();
  expect((await download).suggestedFilename()).toBe('accueil.tsx');
  await dialog.getByRole('radio', { name: 'Image PNG' }).check();
  download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Exporter' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
  await expect(dialog.getByRole('status')).toContainText('téléchargé');
  await dialog.getByRole('button', { name: 'Fermer' }).click();
  // Onglets d'écrans : nom affiché, nouvel écran vide, retour sans perte.
  const screens = page.getByRole('tablist', { name: 'Écrans' });
  await expect(
    screens.getByRole('tab', { name: 'Accueil', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await screens.getByRole('button', { name: 'Nouvel écran' }).click();
  await expect(frame.locator('.cmp-item')).toHaveCount(0);
  await screens.getByRole('tab', { name: 'Accueil', exact: true }).click();
  await expect(frame.locator('.cmp-item')).toHaveCount(5);
  // Versions : modifications récentes, restauration.
  await page.getByRole('button', { name: 'Versions' }).click();
  const versions = page.getByRole('dialog', {
    name: '10 dernières modifications',
  });
  await expect(versions).toBeVisible();
  await versions.getByRole('button', { name: 'Fermer' }).click();
  // Persistance : l'écran et le nom du calque survivent au rechargement.
  await page.reload();
  await expect(frame.locator('.cmp-item')).toHaveCount(5);
  await tabs.getByRole('tab', { name: 'Calques' }).click();
  await expect(page.locator('.tree-group > .tree-line .tree-name')).toHaveText(
    'Tags',
  );
  // IA → proposition → validation (composeur simulé côté serveur).
  await tabs.getByRole('tab', { name: 'Claude' }).click();
  await expect(page.getByRole('heading', { name: 'Claude' })).toHaveCount(0);
  await expect(
    page.getByRole('textbox', { name: 'Message à Claude' }),
  ).toHaveAttribute('placeholder', 'Décrivez…');
  await page
    .getByRole('textbox', { name: 'Message à Claude' })
    .fill('Place une grande card à gauche, trois petites à droite');
  await page.getByRole('button', { name: 'Envoyer' }).click();
  await expect(page.getByRole('region', { name: 'Proposition' })).toBeVisible();
  await page.getByRole('button', { name: 'Appliquer' }).click();
  await expect(
    frame.locator('.cmp-item').filter({ hasText: 'Faire moins' }).first(),
  ).toBeVisible();
});

test('v3 : mes schémas, menu crayon, export, ajout, import', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?vue=schemas');
  await expect(
    page.getByRole('heading', { name: 'Mes schémas' }),
  ).toBeVisible();
  const tabs = page.getByRole('tablist', { name: 'Types de schémas' });
  await expect(tabs.getByRole('tab')).toHaveCount(7);
  await expect(tabs.getByRole('tab').first()).toHaveText('Benchmark');
  // Onglet vide : aperçu illustratif étiqueté « Exemple fictif ».
  await expect(page.getByText('Exemple fictif')).toBeVisible();
  // Export réel de l'exemple (PNG).
  let download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
  // Crayon : menu d'édition ; partir de zéro, éléments éditables.
  const pencil = page.getByRole('button', { name: 'Modifier le schéma' });
  await pencil.click();
  await page.getByRole('menuitem', { name: 'Partir de zéro' }).click();
  await expect(
    page.getByRole('textbox', { name: 'Texte de l’élément' }),
  ).toHaveCount(3);
  await pencil.click();
  await page.getByRole('menuitem', { name: 'Ajouter un élément' }).click();
  await expect(
    page.getByRole('textbox', { name: 'Texte de l’élément' }),
  ).toHaveCount(4);
  await page
    .getByRole('textbox', { name: 'Texte de l’élément' })
    .first()
    .fill('Concurrent A');
  // Ajouter un schéma : type puis Partir de zéro → nouvel onglet.
  await page.getByRole('button', { name: 'Ajouter un schéma' }).click();
  const add = page.getByRole('dialog', { name: 'Ajouter un schéma' });
  await add.getByRole('combobox').selectOption('Storyboard');
  await add.getByRole('button', { name: 'Partir de zéro' }).click();
  await expect(tabs.getByRole('tab', { name: 'Storyboard' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  // Import par lien : refusé hors services connus ; Figma intégré.
  await tabs.getByRole('tab', { name: 'Personas' }).click();
  await page.getByRole('button', { name: 'Importer', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: /Importer/ });
  await dialog.getByRole('textbox').fill('https://example.com/x');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Lien non reconnu');
  const board =
    'https://www.figma.com/board/AbCdEfGhIjKlMnOp/Personas?node-id=0-1';
  await dialog.getByRole('textbox').fill(board);
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('.schema-view iframe')).toHaveAttribute(
    'src',
    'https://embed.figma.com/board/AbCdEfGhIjKlMnOp/Personas?node-id=0-1&embed-host=ds-studio',
  );
  // Export d'un lien : raccourci .url.
  download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.url$/);
  // Fichier local : type validé, aperçu réel.
  await tabs.getByRole('tab', { name: 'Mind maps' }).click();
  await page.getByRole('button', { name: 'Importer', exact: true }).click();
  dialog = page.getByRole('dialog', { name: /Importer/ });
  await dialog.getByRole('button', { name: 'Depuis mon ordinateur' }).click();
  await dialog.locator('input[type=file]').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('x'),
  });
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog.getByRole('alert')).toContainText(
    'Format non pris en charge',
  );
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  await dialog.locator('input[type=file]').setInputFiles({
    name: 'map.png',
    mimeType: 'image/png',
    buffer: png,
  });
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('.schema-img')).toBeVisible();
  // Persistance après rechargement (fichier, tableau, onglet ajouté).
  await page.reload();
  await tabs.getByRole('tab', { name: 'Mind maps' }).click();
  await expect(page.locator('.schema-img')).toBeVisible();
  await tabs.getByRole('tab', { name: 'Benchmark' }).click();
  await expect(page.locator('.schema-view')).toContainText('Concurrent A');
  await expect(tabs.getByRole('tab', { name: 'Storyboard' })).toBeVisible();
});

test('v3 : mes notes, épinglées, persistantes, rappel', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.locator('.sidebar').getByText('Mes notes').click();
  await expect(page.getByRole('heading', { name: 'Mes notes' })).toBeVisible();
  await page.getByRole('button', { name: 'Nouvelle note' }).click();
  const note = page.getByRole('textbox', { name: 'Texte de la note' });
  const card = page.locator('.note');
  await note.fill('Relire la note de cadrage');
  // Valider : enregistrée, lecture seule, fond plein de la teinte.
  await card.getByRole('button', { name: 'Valider' }).click();
  await expect(note).toHaveCount(0);
  await expect(card).toContainText('Relire la note de cadrage');
  await expect(card).toHaveCSS('background-color', 'rgb(250, 188, 60)');
  await page.reload();
  await expect(card).toContainText('Relire la note de cadrage');
  await expect(note).toHaveCount(0);
  // Lecture : aucun bouton hors survol/focus ; actions superposées sans
  // décaler le contenu.
  const tools = card.getByRole('toolbar', { name: 'Actions de la note' });
  await page.mouse.move(0, 0);
  await expect(tools).toHaveCSS('opacity', '0');
  const text = card.locator('.note-read');
  const y = (await text.boundingBox())!.y;
  await card.hover();
  await expect(tools).toHaveCSS('opacity', '1');
  expect((await text.boundingBox())!.y).toBe(y);
  // Rééditer : texte et couleur, enregistrés seulement au nouveau Valider.
  await tools.getByRole('button', { name: 'Modifier la note' }).click();
  await note.fill('Relire la note de cadrage v2');
  await card.getByRole('button', { name: 'Couleur 9' }).click();
  await card.getByRole('button', { name: 'Valider' }).click();
  await expect(note).toHaveCount(0);
  await expect(card).toHaveCSS('background-color', 'rgb(245, 85, 54)');
  await page.reload();
  await expect(card).toContainText('v2');
  // Épingler au clavier : focus sur la note → actions accessibles.
  await card.focus();
  await expect(tools).toHaveCSS('opacity', '1');
  await tools.getByRole('button', { name: 'Désépingler' }).click();
  await expect(card).not.toHaveAttribute('data-pinned', /.*/);
  // Rappel programmé (affiché en lecture, informatif), puis annulé.
  await card.hover();
  await tools.getByRole('button', { name: 'Programmer un rappel' }).click();
  const at = new Date(Date.now() + 3_600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  await page
    .getByRole('textbox', { name: 'Date et heure du rappel' })
    .fill(
      `${at.getFullYear()}-${p(at.getMonth() + 1)}-${p(at.getDate())}T${p(at.getHours())}:${p(at.getMinutes())}`,
    );
  await card.getByRole('button', { name: 'Programmer' }).click();
  await card.getByRole('button', { name: 'Valider' }).click();
  await expect(card.locator('.note-when')).toContainText('Rappel le');
  await card.hover();
  await tools.getByRole('button', { name: 'Annuler le rappel' }).click();
  await expect(card.locator('.note-when')).toHaveCount(0);
  // Suppression.
  page.once('dialog', (d) => void d.accept());
  await card.hover();
  await tools.getByRole('button', { name: 'Supprimer la note' }).click();
  await expect(page.getByText('Aucune note.')).toBeVisible();
});

test('v3 : couleur de fond et audit de contraste WCAG', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?vue=design');
  const frame = page.frameLocator('iframe[title="Aperçu de l’écran"]');
  await expect(frame.locator('.cmp-section')).toHaveCount(1);
  await frame
    .locator('.cmp-section > .cmp-section-body')
    .first()
    .evaluate((el) => {
      const dt = new DataTransfer();
      dt.setData(
        'application/x-ds-block',
        JSON.stringify({ kind: 'text', variant: 'body' }),
      );
      const r = el.getBoundingClientRect();
      for (const type of ['dragover', 'drop'])
        el.dispatchEvent(
          new DragEvent(type, {
            bubbles: true,
            cancelable: true,
            dataTransfer: dt,
            clientX: r.left + 4,
            clientY: r.bottom - 2,
          }),
        );
    });
  await expect(frame.locator('.cmp-item')).toHaveCount(1);
  const pageBg = frame.locator('.cmp-page');
  // Sans sélection : fond de l'écran. Aperçu en direct, Annuler rétablit.
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Couleur de fond' }).click();
  let dialog = page.getByRole('dialog', { name: /Couleur de fond · écran/ });
  await dialog.getByRole('textbox', { name: 'HEX' }).fill('#333333');
  await expect(pageBg).toHaveCSS('background-color', 'rgb(51, 51, 51)');
  await dialog.getByRole('button', { name: 'Annuler' }).click();
  await expect(pageBg).not.toHaveCSS('background-color', 'rgb(51, 51, 51)');
  // Valider : enregistré, une étape d'annulation, transparence acceptée.
  await page.getByRole('button', { name: 'Couleur de fond' }).click();
  dialog = page.getByRole('dialog', { name: /Couleur de fond/ });
  await dialog.getByRole('textbox', { name: 'HEX' }).fill('#333333');
  await dialog.getByRole('button', { name: 'Valider' }).click();
  await expect(pageBg).toHaveCSS('background-color', 'rgb(51, 51, 51)');
  await page.getByRole('heading', { name: 'Mon espace Design' }).click();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(pageBg).not.toHaveCSS('background-color', 'rgb(51, 51, 51)');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(pageBg).toHaveCSS('background-color', 'rgb(51, 51, 51)');
  // Audit : texte sombre sur fond sombre signalé, contour sans changer le
  // style ; popover ratio actuel / requis ; correction proposée, appliquée
  // seulement sur demande.
  await page.getByRole('button', { name: 'Audit de contraste' }).click();
  await expect(page.locator('.studio-status')).toContainText('non conforme');
  const flagged = frame.locator('[data-contrast="fail"]').first();
  await expect(flagged).toHaveCSS('outline-style', 'solid');
  await flagged.click();
  const pop = page.getByRole('dialog', { name: 'Contraste insuffisant' });
  await expect(pop).toContainText('requis 4,50:1');
  await pop.getByRole('button', { name: 'Corriger' }).click();
  await expect(pop).toContainText('Après');
  await expect(pageBg).toHaveCSS('background-color', 'rgb(51, 51, 51)');
  await pop.getByRole('button', { name: 'Appliquer' }).click();
  await expect(pageBg).not.toHaveCSS('background-color', 'rgb(51, 51, 51)');
  await expect(page.locator('.studio-status')).toContainText('aucun écart');
  // Désactivé : plus aucun contour.
  await page.getByRole('button', { name: 'Audit de contraste' }).click();
  await expect(frame.locator('[data-contrast]')).toHaveCount(0);
  // Export Figma : scène mesurée envoyée au serveur, lue par le plugin
  // (origine « null ») avec le code d'appairage ; refusée sans.
  await page.getByRole('button', { name: 'Exporter', exact: true }).click();
  const save = page.getByRole('dialog', { name: 'Exporter un écran' });
  await save.getByRole('textbox', { name: 'Nom de l’écran' }).fill('Contraste');
  await save.getByRole('radio', { name: /Figma/ }).check();
  // Plugin fermé : Figma Desktop est demandé (figma://) ; s'il ne s'ouvre
  // pas, repli explicite vers le navigateur. Jamais de succès simulé.
  const sent = page.waitForResponse(
    (r) => r.url().endsWith('/api/figma/scene') && r.ok(),
  );
  await save.getByRole('button', { name: 'Exporter' }).click();
  const code = (await (await sent).json()).pairing as string;
  const live = save.locator('.figma-live');
  // Plugin jamais configuré : code d'appairage montré une seule fois.
  await expect(live).toContainText(`saisissez le code ${code}`);
  await expect(live).toContainText('Figma Desktop ne s’est pas ouvert');
  await expect(
    live.getByRole('button', { name: 'Ouvrir dans le navigateur' }),
  ).toBeVisible();
  await expect(live).not.toContainText('calques');
  const url = '/api/figma/scene';
  const denied = await page.request.get(url, {
    headers: { Origin: 'null', 'X-DS-Figma': 'AAAA-BBBB-CCCC' },
  });
  expect(denied.status()).toBe(401);
  const res = await page.request.get(url, {
    headers: { Origin: 'null', 'X-DS-Figma': code },
  });
  expect(res.status()).toBe(200);
  expect(res.headers()['access-control-allow-origin']).toBe('null');
  const scene = await res.json();
  expect(scene.root.w).toBeGreaterThan(300);
  expect(scene.root.layout.mode).toBe('VERTICAL');
  expect(scene.root.fill).toBeTruthy();
  const flat = JSON.stringify(scene.root);
  expect(flat).toContain('"type":"TEXT"');
  expect(flat).toContain('"kind":"text"');
  expect(
    scene.tokens.some((t: { name: string }) => t.name === 'color/brand'),
  ).toBe(true);
  // Autre origine : toujours refusée.
  const foreign = await page.request.get(url, {
    headers: { Origin: 'https://example.com', 'X-DS-Figma': code },
  });
  expect(foreign.status()).toBe(403);
  // Adresse du manifeste Figma (« localhost ») : admise pour cette seule
  // route, avec origine null et code ; refusée ailleurs.
  const local = 'http://localhost:4318';
  const viaLocalhost = await page.request.get(`${local}${url}`, {
    headers: { Origin: 'null', 'X-DS-Figma': code },
  });
  expect(viaLocalhost.status()).toBe(200);
  const otherRoute = await page.request.get(`${local}/api/state`, {
    headers: { Origin: 'null' },
  });
  expect(otherRoute.status()).toBe(403);
  // Statut réel : plugin connecté qui rend compte.
  const meta = await page.request.get(`${local}/api/figma/scene/meta`, {
    headers: { Origin: 'null', 'X-DS-Figma': code },
  });
  expect((await meta.json()).screenId).toBe(scene.screenId);
  const told = await page.request.post(`${local}/api/figma/status`, {
    headers: {
      Origin: 'null',
      'X-DS-Figma': code,
      'Content-Type': 'application/json',
    },
    data: {
      state: 'imported',
      screenId: scene.screenId,
      message: '12 calques',
    },
  });
  expect(told.status()).toBe(200);
  await expect(live).toContainText('Import confirmé');
  await expect(live).not.toContainText('12 calques');
});

test('v3 : onglets d’écrans, couleurs de repère et suppression', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?vue=design');
  const screens = page.getByRole('tablist', { name: 'Écrans' });
  const tabs = screens.getByRole('tab');
  const before = await tabs.count();
  await screens.getByRole('button', { name: 'Nouvel écran' }).click();
  await screens.getByRole('button', { name: 'Nouvel écran' }).click();
  await expect(tabs).toHaveCount(before + 2);
  // Repère : point coloré distinct par écran, onglet actif noir/blanc.
  const dots = () =>
    screens
      .locator('.screen-dot')
      .evaluateAll((els) =>
        els.map((e) => getComputedStyle(e).backgroundColor),
      );
  const colors = await dots();
  // Cycle de 5 teintes : autant de couleurs distinctes que d'écrans (≤ 5).
  expect(new Set(colors).size).toBe(Math.min(colors.length, 5));
  await expect(tabs.last()).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  // Croix : invisible au repos, visible au survol, sans décalage.
  const middle = screens.locator('.screen-tab').nth(-2);
  const close = middle.locator('.screen-close');
  await page.mouse.move(0, 0);
  await page.getByRole('heading', { name: 'Mon espace Design' }).click();
  await expect(close).toHaveCSS('opacity', '0');
  const width = (await middle.boundingBox())!.width;
  await middle.hover();
  await expect(close).toHaveCSS('opacity', '1');
  expect((await middle.boundingBox())!.width).toBe(width);
  await expect(close).toHaveAttribute('title', 'Supprimer l’écran');
  // Annuler : rien ne change ; confirmer : écran supprimé, voisin ouvert.
  page.once('dialog', (d) => void d.dismiss());
  await close.click();
  await expect(tabs).toHaveCount(before + 2);
  page.once('dialog', (d) => void d.accept());
  await close.click();
  await expect(tabs).toHaveCount(before + 1);
  // L'écran ouvert (non supprimé) reste sélectionné.
  await expect(tabs.last()).toHaveAttribute('aria-selected', 'true');
  // Clavier : Suppr sur l'onglet actif, puis voisin sélectionné.
  await tabs.last().focus();
  page.once('dialog', (d) => void d.accept());
  await page.keyboard.press('Delete');
  await expect(tabs).toHaveCount(before);
  await expect(screens.locator('[aria-selected="true"]')).toHaveCount(1);
  // Persistance après rechargement, couleurs conservées.
  const kept = await dots();
  await page.reload();
  await expect(tabs).toHaveCount(before);
  expect(await dots()).toEqual(kept);
  // Dernier écran : jamais supprimable.
  if (before === 1)
    await expect(screens.locator('.screen-close')).toHaveCount(0);
});

test('v3 : calques, cases de sélection multiple et actions groupées', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?vue=design');
  await page
    .getByRole('tablist', { name: 'Écrans' })
    .getByRole('button', { name: 'Nouvel écran' })
    .click();
  const frame = page.frameLocator('iframe[title="Aperçu de l’écran"]');
  // Nouvel écran réellement ouvert (enregistrement du précédent terminé).
  const tabs = page.getByRole('tablist', { name: 'Écrans' }).getByRole('tab');
  await expect(tabs.last()).toHaveAttribute('aria-selected', 'true');
  await expect(frame.locator('.cmp-item')).toHaveCount(0);
  await expect(frame.locator('.cmp-section')).toHaveCount(1);
  for (let n = 0; n < 4; n++)
    await frame
      .locator('.cmp-section > .cmp-section-body')
      .first()
      .evaluate((el) => {
        const dt = new DataTransfer();
        dt.setData(
          'application/x-ds-block',
          JSON.stringify({ kind: 'text', variant: 'body' }),
        );
        const r = el.getBoundingClientRect();
        for (const type of ['dragover', 'drop'])
          el.dispatchEvent(
            new DragEvent(type, {
              bubbles: true,
              cancelable: true,
              dataTransfer: dt,
              clientX: r.left + 4,
              clientY: r.bottom - 2,
            }),
          );
      });
  const items = frame.locator('.cmp-section > .cmp-section-body > .cmp-item');
  await expect(items).toHaveCount(4);
  await page
    .getByRole('tablist', { name: 'Outils du studio' })
    .getByRole('tab', { name: 'Calques' })
    .click();
  const rows = page.locator('.tree-section > ol > .tree-node > .tree-line');
  const box = (i: number) => rows.nth(i).getByRole('checkbox');
  const name = (i: number) => rows.nth(i).locator('.tree-pick');
  // Clic sur le nom : sélection simple ; case : ajout sans changer le reste.
  await name(0).click();
  await expect(box(0)).toHaveAttribute('aria-checked', 'true');
  await box(2).click();
  await expect(box(0)).toHaveAttribute('aria-checked', 'true');
  await expect(box(2)).toHaveAttribute('aria-checked', 'true');
  await expect(frame.locator('.cmp-item.is-selected')).toHaveCount(2);
  await expect(
    page.getByRole('complementary', { name: 'Propriétés : 2 éléments' }),
  ).toBeVisible();
  // Case décochée au clavier (Espace) ; ⌘/Ctrl + clic = ajout ; Maj = plage.
  await box(2).focus();
  await page.keyboard.press('Space');
  await expect(box(2)).toHaveAttribute('aria-checked', 'false');
  await name(1).click({ modifiers: ['ControlOrMeta'] });
  await expect(box(1)).toHaveAttribute('aria-checked', 'true');
  await name(0).click();
  await name(3).click({ modifiers: ['Shift'] });
  for (const i of [0, 1, 2, 3])
    await expect(box(i)).toHaveAttribute('aria-checked', 'true');
  // Actions groupées : dupliquer, supprimer (confirmation), une étape ⌘Z.
  const bar = page.getByRole('complementary', {
    name: 'Propriétés : 4 éléments',
  });
  await bar.getByRole('button', { name: 'Dupliquer la sélection' }).click();
  await expect(items).toHaveCount(8);
  await page.getByRole('heading', { name: 'Mon espace Design' }).click();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(items).toHaveCount(4);
  await name(0).click();
  await name(1).click({ modifiers: ['Shift'] });
  page.once('dialog', (d) => void d.dismiss());
  await page.getByRole('button', { name: 'Supprimer la sélection' }).click();
  await expect(items).toHaveCount(4);
  page.once('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: 'Supprimer la sélection' }).click();
  await expect(items).toHaveCount(2);
  await page.getByRole('heading', { name: 'Mon espace Design' }).click();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(items).toHaveCount(4);
  // Échap : plus aucune case cochée.
  await name(0).click();
  await page.getByRole('heading', { name: 'Mon espace Design' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.tree-check[aria-checked="true"]')).toHaveCount(0);
});

test('v3 : export image en thème clair, PNG sans fond, aperçu inchangé', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?vue=design');
  const preview = page.locator('iframe[title="Aperçu de l’écran"]');
  const frame = page.frameLocator('iframe[title="Aperçu de l’écran"]');
  await expect(frame.locator('.cmp-section')).toHaveCount(1);
  // Composants imbriqués dans la section : bouton et carte.
  for (const block of [
    { kind: 'button', variant: 'primary' },
    { kind: 'card', variant: 'standard' },
  ])
    await frame
      .locator('.cmp-section > .cmp-section-body')
      .first()
      .evaluate((el, block) => {
        const dt = new DataTransfer();
        dt.setData('application/x-ds-block', JSON.stringify(block));
        const r = el.getBoundingClientRect();
        for (const type of ['dragover', 'drop'])
          el.dispatchEvent(
            new DragEvent(type, {
              bubbles: true,
              cancelable: true,
              dataTransfer: dt,
              clientX: r.left + 4,
              clientY: r.bottom - 2,
            }),
          );
      }, block);
  await expect(frame.locator('.cmp-item')).toHaveCount(2);
  // Aperçu de travail en sombre : l'export doit rester en clair.
  await expect(frame.locator('body')).toHaveClass(/preview-dark/);
  const width = await preview.evaluate((el) => (el as HTMLElement).clientWidth);
  // Décodage réel du fichier : taille, pixel du coin (fond de l'écran),
  // part de pixels opaques (composants conservés).
  const inspect = async (file: string, type: string) => {
    const { readFile } = await import('node:fs/promises');
    const src = `data:${type};base64,${(await readFile(file)).toString('base64')}`;
    return page.evaluate(async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let opaque = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] === 255) opaque++;
      return {
        w: img.width,
        corner: [...d.slice(0, 4)],
        opaque: opaque / (d.length / 4),
      };
    }, src);
  };
  await page.getByRole('button', { name: 'Exporter', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Exporter un écran' });
  await dialog.getByRole('textbox', { name: 'Nom de l’écran' }).fill('Accueil');
  const check = dialog.getByRole('checkbox', {
    name: 'Sans fond (transparent)',
  });
  await dialog.getByRole('radio', { name: 'Image PNG' }).check();
  await expect(check).not.toBeChecked();
  const exportAs = async (type: string) => {
    const download = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Exporter' }).click();
    return inspect((await (await download).path())!, type);
  };
  // PNG opaque : fond clair, dimensions exactes (×2).
  let r = await exportAs('image/png');
  expect(r.w).toBe(width * 2);
  expect(r.corner[3]).toBe(255);
  expect(Math.min(...r.corner.slice(0, 3))).toBeGreaterThan(200);
  // PNG sans fond : coin transparent, composants opaques conservés.
  await check.check();
  r = await exportAs('image/png');
  expect(r.corner[3]).toBe(0);
  expect(r.opaque).toBeGreaterThan(0.01);
  // JPEG : option masquée et réinitialisée, fond clair opaque.
  await dialog.getByRole('radio', { name: 'Image JPEG' }).check();
  await expect(check).toHaveCount(0);
  r = await exportAs('image/jpeg');
  expect(Math.min(...r.corner.slice(0, 3))).toBeGreaterThan(200);
  await dialog.getByRole('radio', { name: 'Image PNG' }).check();
  await expect(check).not.toBeChecked();
  // Aperçu visible jamais modifié, copie de rendu retirée.
  await expect(frame.locator('body')).toHaveClass(/preview-dark/);
  await expect(page.locator('iframe')).toHaveCount(
    await page.locator('iframe[title]').count(),
  );
});

test('v3 : barre d’aperçu, icônes seules et « Actualiser Figma »', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?vue=design');
  const bar = page.locator('.preview-bar');
  const refresh = bar.getByRole('button', { name: 'Actualiser Figma' });
  const rotate = bar.getByRole('button', { name: /Pivoter/ });
  const versions = bar.getByRole('button', { name: /Versions/ });
  const save = bar.getByRole('button', { name: 'Exporter' });
  // Icônes seules, carrés identiques ; Enregistrer tout à droite, une ligne.
  for (const b of [refresh, rotate, versions]) {
    await expect(b).toHaveText('');
    await expect(b).toHaveAttribute('title', /.+/);
    const box = (await b.boundingBox())!;
    expect([box.width, box.height]).toEqual([32, 32]);
  }
  await expect(bar.locator('> *').last()).toHaveText('Exporter');
  const y = async (l: typeof save) => {
    const b = (await l.boundingBox())!;
    return b.y + b.height / 2;
  };
  expect(await y(save)).toBe(await y(versions));
  expect(await y(save)).toBe(
    await y(bar.getByRole('button', { name: 'iPad' })),
  );
  expect(await bar.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await versions.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', {
    name: '10 dernières modifications',
  });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Fermer' }).click();
  // Actualiser : écran envoyé en mise à jour explicite, succès seulement
  // après le compte rendu du plugin.
  // Réponse acceptée (le client rejoue seul après validation de session).
  const sent = page.waitForResponse(
    (r) => r.url().endsWith('/api/figma/scene') && r.ok(),
  );
  await refresh.click();
  const { pairing } = await (await sent).json();
  const status = page.locator('.studio-status');
  await expect(status).not.toContainText('Importé');
  await expect(
    bar.getByRole('button', { name: /Synchronisation Figma/ }),
  ).toHaveAttribute('aria-busy', 'true');
  const scene = await (
    await page.request.get('/api/figma/scene', {
      headers: { Origin: 'null', 'X-DS-Figma': pairing },
    })
  ).json();
  expect(scene.update).toBe(true);
  await page.request.post('/api/figma/status', {
    headers: {
      Origin: 'null',
      'X-DS-Figma': pairing,
      'Content-Type': 'application/json',
    },
    data: { state: 'imported', screenId: scene.screenId, message: '3 calques' },
  });
  await expect(status).toContainText('Import confirmé');
  await expect(
    bar.getByRole('button', { name: 'Figma synchronisé' }),
  ).toBeVisible();
});

test('v3 : « Ajuster » montre l’écran entier, sans défilement, centré', async ({
  page,
}) => {
  const devicesGroup = page.getByRole('group', { name: 'Appareil' });
  // Appareil entier (cadre et socle compris) visible et centré, aucun
  // défilement dans la scène ni sur la page.
  const fits = () =>
    page.evaluate(() => {
      const stage = document.querySelector('.device-stage')!;
      const s = stage.getBoundingClientRect();
      const d = document
        .querySelector('.device-scaler')!
        .getBoundingClientRect();
      const doc = document.documentElement;
      return (
        stage.scrollWidth <= stage.clientWidth &&
        stage.scrollHeight <= stage.clientHeight &&
        doc.scrollWidth <= doc.clientWidth &&
        d.left >= s.left + 15 &&
        d.right <= s.right - 15 &&
        d.top >= s.top + 15 &&
        d.bottom <= s.bottom - 15 &&
        Math.abs(d.left - s.left - (s.right - d.right)) <= 2 &&
        Math.abs(d.top - s.top - (s.bottom - d.bottom)) <= 2
      );
    });
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [1024, 700],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/?vue=design');
    for (const name of ['iPhone', 'iPad', 'MacBook', 'Screen']) {
      await devicesGroup.getByRole('button', { name }).click();
      await expect.poll(fits, { message: `${name} ${width}` }).toBe(true);
      if (name !== 'MacBook') {
        await page.getByRole('button', { name: /Pivoter/ }).click();
        await expect.poll(fits, { message: `${name} pivoté` }).toBe(true);
        await page.getByRole('button', { name: /Pivoter/ }).click();
      }
    }
  }
  // Recalcul au redimensionnement de la fenêtre.
  await page.setViewportSize({ width: 1300, height: 760 });
  await expect.poll(fits).toBe(true);
  // Zoom manuel 100 % : défilement possible, bord gauche atteignable, page
  // sans débordement horizontal.
  await devicesGroup.getByRole('button', { name: 'MacBook' }).click();
  await page.getByRole('combobox', { name: 'Zoom' }).selectOption('1');
  const manual = await page.evaluate(() => {
    const stage = document.querySelector('.device-stage')!;
    const d = document.querySelector('.device-scaler')!.getBoundingClientRect();
    const doc = document.documentElement;
    return {
      scrolls: stage.scrollWidth > stage.clientWidth,
      leftVisible: d.left >= stage.getBoundingClientRect().left,
      page: doc.scrollWidth <= doc.clientWidth,
    };
  });
  expect(manual).toEqual({ scrolls: true, leftVisible: true, page: true });
  await page.getByRole('combobox', { name: 'Zoom' }).selectOption('fit');
  await expect.poll(fits).toBe(true);
});

test('v3 : card Preview, padding de la card gauche, icône Pivoter, chat déplaçable', async ({
  page,
}) => {
  const layout = () =>
    page.evaluate(() => {
      const el = (s: string) => document.querySelector(s)!;
      const box = (s: string) => el(s).getBoundingClientRect();
      const css = (s: string) => getComputedStyle(el(s));
      const card = box('.preview-card');
      const left = css('.side-panel');
      const right = css('.preview-card');
      const sides = (c: CSSStyleDeclaration) =>
        [c.paddingTop, c.paddingRight, c.paddingBottom, c.paddingLeft].join();
      const inset = parseFloat(right.paddingTop) + 1;
      const doc = document.documentElement;
      return {
        samePadding: sides(left) === sides(right),
        sameGap: left.rowGap === right.rowGap,
        uniform: new Set(sides(right).split(',')).size === 1,
        // Barre en haut, onglets en bas, au padding exact.
        top: Math.round(box('.preview-bar').top - card.top - inset),
        bottom: Math.round(card.bottom - box('.screens').bottom - inset),
        ordered:
          box('.preview-bar').bottom <= box('.preview-area').top &&
          box('.preview-area').bottom <= box('.screens').top,
        outside: !el('.bubble').closest('.preview-card'),
        overflow: doc.scrollWidth > doc.clientWidth,
      };
    });
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [1200, 700],
    [768, 1024],
    [375, 800],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/?vue=design');
    await page.locator('.preview-bar').waitFor();
    expect(await layout(), `${width}`).toEqual({
      samePadding: true,
      sameGap: true,
      uniform: true,
      top: 0,
      bottom: 0,
      ordered: true,
      outside: true,
      overflow: false,
    });
  }
  // Pivoter : silhouette de l'appareil actif, orientée comme l'aperçu.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?vue=design');
  const rotate = page.getByRole('button', { name: 'Pivoter', exact: true });
  const icon = rotate.locator('svg');
  for (const [name, id] of [
    ['iPhone', 'mobile'],
    ['iPad', 'tablet'],
    ['MacBook', 'laptop'],
    ['Screen', 'screen'],
  ]) {
    await page
      .getByRole('group', { name: 'Appareil' })
      .getByRole('button', { name })
      .click();
    await expect(icon).toHaveAttribute('data-device', id);
    await expect(rotate).toHaveText('');
    if (id === 'laptop') {
      await expect(rotate).toBeDisabled();
      continue;
    }
    await expect(icon).not.toHaveAttribute('data-turned', 'true');
    await rotate.click();
    await expect(icon).toHaveAttribute('data-turned', 'true');
    await rotate.click();
  }
  // Chat : flottant, en bas à droite par défaut ; glisser ne l'ouvre pas,
  // la position est mémorisée ; clic et clavier l'ouvrent / le déplacent.
  const bubble = page.getByRole('button', { name: 'Ouvrir le chat Claude' });
  let b = (await bubble.boundingBox())!;
  expect([1440 - b.x - b.width, 900 - b.y - b.height]).toEqual([20, 20]);
  await page.mouse.move(b.x + 24, b.y + 24);
  await page.mouse.down();
  await page.mouse.move(b.x - 200, b.y - 300, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByRole('dialog', { name: 'Chat Claude' })).toHaveCount(
    0,
  );
  b = (await bubble.boundingBox())!;
  expect([Math.round(b.x), Math.round(b.y)]).toEqual([1148, 508]);
  await page.reload();
  b = (await bubble.boundingBox())!;
  expect([Math.round(b.x), Math.round(b.y)]).toEqual([1148, 508]);
  await bubble.focus();
  await page.keyboard.press('Alt+ArrowLeft');
  await expect.poll(async () => (await bubble.boundingBox())!.x).toBe(1132);
  await bubble.click();
  const dialog = page.getByRole('dialog', { name: 'Chat Claude' });
  await expect(dialog).toBeVisible();
  // Fenêtre ancrée au bouton, entièrement visible.
  const d = (await dialog.boundingBox())!;
  expect(d.y).toBeGreaterThanOrEqual(0);
  expect(d.y + d.height).toBeLessThanOrEqual(508 - 11);
});

// Carte : API externes simulées (tests hors ligne et déterministes).
async function mockCarte(
  page: Page,
  opts: { seismes?: number; cyclones?: number } = {},
) {
  const now = Date.now();
  const events = [
    {
      id: 'a',
      time: new Date(now - 5 * 86400000).toISOString(),
      mag: 4.5,
      depth: 54,
      place: '56 km ENE of Sainte-Marie, Martinique',
      url: 'u',
      lat: 14.85,
      lon: -61.05,
    },
    {
      id: 'b',
      time: new Date(now - 400 * 86400000).toISOString(),
      mag: 3.1,
      depth: 140,
      place: 'Martinique',
      url: 'u',
      lat: 14.7,
      lon: -61.2,
    },
  ];
  const stamp = { fetchedAt: new Date(now).toISOString(), stale: false };
  await page.route('**/api/carte/situation**', (r) =>
    r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        checkedAt: new Date().toISOString(),
        seismes: opts.seismes
          ? { ok: false, error: 'Source indisponible (HTTP 503).' }
          : {
              ok: true,
              data: {
                source: 'USGS',
                url: 'https://earthquake.usgs.gov/',
                ...stamp,
                events,
              },
            },
        cyclones: opts.cyclones
          ? { ok: false, error: 'Source indisponible (HTTP 503).' }
          : {
              ok: true,
              data: {
                source: 'NHC',
                url: 'https://www.nhc.noaa.gov/',
                ...stamp,
                storms: [],
              },
            },
        tsunami: {
          ok: true,
          data: {
            source: 'NOAA',
            url: 'https://www.tsunami.gov/',
            ...stamp,
            messages: [],
          },
        },
      }),
    }),
  );
  await page.route('**/api/carte/reverse', (r) =>
    r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        source: 'BAN',
        label: '71 Rue Victor Hugo 97200 Fort-de-France',
        city: 'Fort-de-France',
        citycode: '97209',
        distanceM: 4,
      }),
    }),
  );
  await page.route('**/api/carte/commune?**', (r) =>
    r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        source: 'Géorisques',
        url: 'https://www.georisques.gouv.fr/',
        fetchedAt: new Date(now).toISOString(),
        stale: false,
        commune: 'FORT-DE-FRANCE',
        risques: ['Inondation', 'Séisme', 'Eruption volcanique'],
        zoneSismique: '5 - FORTE',
        catnat: [
          { date: '18/09/2017', risque: 'Inondations et/ou Coulées de Boue' },
        ],
      }),
    }),
  );
  await page.route('**/api/carte/geocode', (r) =>
    r.fulfill(
      /xyz/.test(r.request().postData() ?? '')
        ? {
            contentType: 'application/json',
            body: JSON.stringify({ source: 'BAN', results: [] }),
          }
        : {
            contentType: 'application/json',
            body: JSON.stringify({
              source: 'Base Adresse Nationale',
              results: [
                {
                  label: 'Rue Victor Hugo 97200 Fort-de-France',
                  city: 'Fort-de-France',
                  citycode: '97209',
                  lat: 14.604343,
                  lon: -61.07106,
                  score: 0.81,
                  precision: 'street',
                },
              ],
            }),
          },
    ),
  );
}

test('v3 : carte, vous êtes ici, vigilance, 7 tags, animation, en savoir plus', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const urls: string[] = [];
  page.on('request', (r) => urls.push(r.url()));
  await mockCarte(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?vue=carte');
  await expect(page.locator('.carte-view')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30000 },
  );
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollHeight <= innerHeight &&
        document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  // Océan plein cadre.
  const shot = await page.locator('.carte-stage').screenshot();
  const px = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    return [
      [img.width - 14, img.height - 14],
      [img.width - 14, img.height / 2],
      [14, img.height / 2],
    ].map(([x, y]) => [...ctx.getImageData(x, y, 1, 1).data]);
  }, shot.toString('base64'));
  for (const [r, , b] of px) expect(b).toBeGreaterThan(r);
  // Sans localisation : onboarding ; niveau global jamais inventé.
  await expect(
    page.getByRole('group', { name: 'Où êtes-vous en Martinique ?' }),
  ).toBeVisible();
  const vig = page.getByRole('region', { name: 'Niveau de vigilance actuel' });
  await expect(vig.locator('.vig-global')).toContainText(
    'Vigilance non disponible',
  );
  await expect(vig.locator('.vig-global')).toContainText(
    'Ce n’est pas un niveau vert',
  );
  await expect(
    vig
      .getByRole('group', { name: 'Risques : afficher sur la carte' })
      .getByRole('button'),
  ).toHaveCount(7);
  const tag = (n: string) =>
    vig.getByRole('button', { name: `${n} : vigilance non disponible` });
  for (const n of [
    'Séisme',
    'Volcanisme',
    'Tsunami',
    'Cyclone',
    'Fortes pluies',
    'Brume de sable',
    'Sargasses',
  ])
    await expect(tag(n)).toBeVisible();
  await expect(
    page.getByRole('group', { name: /Vigilance officielle/ }),
  ).toHaveCount(0);
  // Horloge de Martinique, vérification, décompte ; refresh manuel.
  await expect(page.locator('.proches-clock')).toContainText(
    'heure de Martinique',
  );
  await expect(vig.locator('[role="status"]')).toContainText(
    /prochaine dans (59:\d\d|60:00)/,
  );
  const forced = page.waitForRequest((r) =>
    r.url().includes('/api/carte/situation?force=1'),
  );
  await page.getByRole('button', { name: 'Actualiser les données' }).click();
  await forced;
  // Hors ligne : échec explicite, données précédentes datées.
  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Actualiser les données' }).click();
  await expect(vig.locator('[role="status"]')).toContainText(
    'Échec de la vérification (Hors ligne) : données du',
  );
  await page.context().setOffline(false);
  // Adresse invalide puis valide.
  await page.getByRole('button', { name: 'Saisir une adresse' }).click();
  const address = page.getByRole('textbox', { name: 'Adresse en Martinique' });
  await expect(address).toBeDisabled();
  await page.getByRole('checkbox', { name: /J’accepte/ }).check();
  await address.fill('xyz introuvable');
  await expect(page.getByRole('alert')).toContainText(
    'Aucune adresse trouvée en Martinique',
  );
  await address.fill('rue Victor Hugo Fort-de-France');
  await page.getByRole('button', { name: /Rue Victor Hugo 97200/ }).click();
  const here = page.getByRole('region', { name: 'Vous êtes ici' });
  await expect(here).toContainText('Rue Victor Hugo 97200 Fort-de-France');
  await expect(page.locator('.carte-pin--home')).toBeVisible();
  expect(urls.some((u) => /victor|hugo/i.test(u))).toBe(false);
  await here
    .getByRole('button', { name: 'Recentrer sur mon logement' })
    .click();
  // Sous-card grise distincte du panneau.
  expect(
    await page.evaluate(() => {
      const bg = (s: string) =>
        getComputedStyle(document.querySelector(s)!).backgroundColor;
      return (
        bg('.here') !== bg('.carte-panel') && bg('.here') !== 'rgba(0, 0, 0, 0)'
      );
    }),
  ).toBe(true);
  // Tag : noir et blanc, animation et couche, un seul ; fiche ; retour.
  await tag('Tsunami').click();
  await expect(tag('Tsunami')).toHaveAttribute('aria-pressed', 'true');
  await expect(tag('Tsunami')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await expect(
    page.getByRole('group', { name: 'Légende : Tsunami' }),
  ).toContainText('illustration du phénomène');
  const sel = vig.locator('.vig-selected');
  await expect(sel).toContainText(
    'Aucun message récent des centres d’alerte NOAA',
  );
  await expect(sel).toContainText('d’altitude');
  await vig.getByRole('button', { name: 'En savoir plus' }).click();
  const detail = vig.locator('.proches-detail');
  for (const t of [
    'Vigilance officielle',
    'Proximité de votre logement',
    'Observations récentes',
    'Consignes',
    'Sources et horodatage',
  ])
    await expect(detail).toContainText(t);
  await expect(
    detail.getByRole('link', { name: /tsunami.gov/ }),
  ).toHaveAttribute('href', 'https://www.tsunami.gov/');
  await tag('Séisme').click();
  await expect(vig.locator('[aria-pressed="true"]')).toHaveCount(1);
  await expect(
    page.getByRole('group', { name: 'Légende : Tsunami' }),
  ).toHaveCount(0);
  await vig.getByRole('button', { name: 'En savoir plus' }).click();
  await expect(detail).toContainText('M 4.5');
  await expect(detail).toContainText('Évolution datée (10 ans)');
  await expect(sel).toContainText('Dernier épicentre à');
  await page.getByRole('button', { name: 'Vue d’ensemble' }).click();
  await expect(vig.locator('[aria-pressed="true"]')).toHaveCount(0);
  await tag('Volcanisme').click();
  await expect(sel).toContainText('Sommet de la montagne Pelée à');
  // Légende pédagogique : dans Comprendre les risques.
  await page.getByRole('button', { name: /Comprendre les alertes/ }).click();
  const levels = page.getByRole('region', {
    name: 'Comprendre les niveaux de vigilance',
  });
  for (const t of [
    'Pas de vigilance particulière',
    'Soyez attentif',
    'Soyez très vigilant',
    'Vigilance absolue',
    'Confinement (cyclone)',
    'Non disponible',
    'profondeur du foyer',
  ])
    await expect(levels).toContainText(t);
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/?vue=carte');
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBe(375);
  expect(errors).toEqual([]);
});

test.describe('v3 : carte, géolocalisation', () => {
  test.use({
    permissions: ['geolocation'],
    geolocation: { latitude: 14.6043, longitude: -61.0711, accuracy: 20 },
  });
  test('autorisée et précise : position proposée puis enregistrée', async ({
    page,
  }) => {
    await mockCarte(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?vue=carte');
    await page.getByRole('button', { name: 'Me géolocaliser' }).click();
    const found = page.getByRole('group', { name: 'Position trouvée' });
    await expect(found).toContainText('71 Rue Victor Hugo');
    await expect(found).toContainText('± 20 m');
    expect(
      await page.evaluate(() => localStorage.getItem('ds-v3-logement')),
    ).toBeNull();
    await found.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(
      page.getByRole('region', { name: 'Vous êtes ici' }),
    ).toContainText('71 Rue Victor Hugo');
  });
});
test.describe('v3 : carte, géolocalisation imprécise', () => {
  test.use({
    permissions: ['geolocation'],
    geolocation: { latitude: 14.6043, longitude: -61.0711, accuracy: 900 },
  });
  test('précision insuffisante : saisie manuelle proposée', async ({
    page,
  }) => {
    await mockCarte(page);
    await page.goto('/?vue=carte');
    await page.getByRole('button', { name: 'Me géolocaliser' }).click();
    await expect(page.getByRole('alert')).toContainText(
      'trop imprécise (± 900 m)',
    );
  });
});
test('v3 : carte, géolocalisation refusée et actualisation toutes les 60 min', async ({
  page,
}) => {
  await mockCarte(page, { cyclones: 503 });
  await page.clock.install();
  let calls = 0;
  page.on(
    'request',
    (r) => r.url().includes('/api/carte/situation') && calls++,
  );
  await page.goto('/?vue=carte');
  const vig = page.getByRole('region', { name: 'Niveau de vigilance actuel' });
  await vig
    .getByRole('button', { name: 'Cyclone : vigilance non disponible' })
    .click();
  await expect(vig.locator('.vig-selected')).toContainText(
    'Données indisponibles (Source indisponible (HTTP 503).)',
  );
  await page.context().clearPermissions();
  await page.getByRole('button', { name: 'Me géolocaliser' }).click();
  await expect(page.getByRole('alert')).toContainText(/refusé|introuvable/);
  const before = calls;
  await page.clock.fastForward('01:00:05');
  await expect.poll(() => calls).toBeGreaterThan(before);
});

test('v3 : prévention, 7 simulations, logement privé synchronisé, trousse', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && /THREE|WebGL|shader/i.test(m.text()))
      errors.push(m.text());
  });
  const urls: string[] = [];
  page.on('request', (r) => urls.push(r.url()));
  await mockCarte(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?vue=prevention&onglet=comprendre');
  await expect(page.locator('.carte-view')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30000 },
  );
  const h = await page.evaluate(() => {
    const c = (
      window as unknown as {
        __carte: { heightAt: (a: number, b: number) => number };
      }
    ).__carte;
    return [
      c.heightAt(14.8094, -61.1653),
      c.heightAt(14.58, -61.08),
      c.heightAt(14.6, -61.3),
    ];
  });
  expect(h[0]).toBeGreaterThan(1200);
  expect(h[1]).toBeLessThan(0);
  expect(h[2]).toBeLessThan(-1500);
  const group = page.getByRole('group', { name: 'Simulation affichée' });
  await expect(group.getByRole('button')).toHaveCount(7);
  for (const name of [
    'Séisme',
    'Volcanisme',
    'Tsunami',
    'Cyclone',
    'Fortes pluies',
    'Brume de sable',
    'Sargasses',
  ]) {
    await group.getByRole('button', { name }).click();
    await expect(group.locator('[aria-pressed="true"]')).toHaveCount(1);
    await expect(
      page.getByRole('group', { name: `Légende : ${name}` }),
    ).toContainText('Niveaux simulés');
    await expect(
      page.getByText('Simulation pédagogique : ni prévision ni alerte'),
    ).toBeVisible();
  }
  await group.getByRole('button', { name: 'Brume de sable' }).click();
  await page.getByRole('slider', { name: /Densité de poussières/ }).fill('3');
  await expect(page.getByText('Densité de poussières : forte')).toBeVisible();
  // Volcan : scénario, survol et clic d'une zone simulée.
  await group.getByRole('button', { name: 'Volcanisme' }).click();
  await page.getByRole('button', { name: 'Projections' }).click();
  const pin = page.getByRole('button', { name: /Montagne Pelée/ });
  const b = (await pin.boundingBox())!;
  const x = b.x + b.width / 2 + 6;
  const y = b.y + b.height + 14;
  await page.mouse.move(x, y);
  await page.mouse.move(x + 1, y + 1);
  await expect(page.locator('.carte-hint')).toContainText('zone simulée');
  await page.mouse.click(x + 1, y + 1);
  await expect(
    page.getByRole('dialog', { name: /Volcanisme · zone simulée/ }),
  ).toContainText('Point choisi');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Voir la coupe/ }).click();
  await expect(page.getByRole('dialog', { name: /Coupe/ })).toContainText(
    '2 cm par an',
  );
  await page.keyboard.press('Escape');
  await group.getByRole('button', { name: 'Cyclone' }).click();
  await page.getByRole('slider', { name: /trajectoire fictive/ }).fill('60');
  await expect(page.getByText('Œil (trajectoire fictive)')).toBeVisible();
  // Mon logement : consentement, adresse jamais dans une URL.
  await page.getByRole('tab', { name: 'Mon logement' }).click();
  await page.getByRole('button', { name: 'Configurer mon logement' }).click();
  const address = page.getByRole('textbox', { name: 'Adresse en Martinique' });
  await expect(address).toBeDisabled();
  await page.getByRole('checkbox', { name: /J’accepte/ }).check();
  await address.fill('rue Victor Hugo Fort-de-France');
  await page.getByRole('button', { name: /Localiser/ }).click();
  await page.getByRole('button', { name: /Rue Victor Hugo 97200/ }).click();
  const facts = page.getByRole('region', { name: 'Mon logement' });
  await expect(facts).toContainText('Altitude');
  await expect(facts).toContainText('5 - FORTE');
  await expect(facts).toContainText('DICRIM');
  expect(urls.some((u) => /victor|hugo/i.test(u))).toBe(false);
  // Balise du logement : jamais ici, seulement sur la Carte.
  await expect(page.locator('.carte-pin--home')).toHaveCount(0);
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Supprimer mon logement' }).click();
  expect(
    await page.evaluate(() => localStorage.getItem('ds-v3-logement')),
  ).toBeNull();
  // Me préparer : quantités selon le foyer, progression gardée.
  await page.getByRole('tab', { name: 'Me préparer' }).click();
  await page.getByRole('spinbutton', { name: 'Adultes' }).fill('3');
  await expect(page.getByText(/Eau potable : 18 L/)).toBeVisible();
  await page.getByRole('checkbox', { name: /Radio à piles/ }).check();
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Me préparer' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(
    page.getByRole('checkbox', { name: /Radio à piles/ }),
  ).toBeChecked();
  expect(errors).toEqual([]);
});

test('v3 : carte, source indisponible et repli sans WebGL', async ({
  page,
}) => {
  await mockCarte(page, { seismes: 503 });
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...rest: unknown[]
    ) {
      return /webgl/.test(type)
        ? null
        : (get as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof get;
  });
  await page.goto('/?vue=carte');
  await expect(
    page.getByText('La 3D (WebGL) n’est pas disponible'),
  ).toBeVisible({ timeout: 30000 });
  const vig = page.getByRole('region', { name: 'Niveau de vigilance actuel' });
  await vig
    .getByRole('button', { name: 'Séisme : vigilance non disponible' })
    .click();
  await expect(vig.locator('.vig-selected')).toContainText(
    'Données indisponibles',
  );
});

test('v3 : design, filtres neutres après ajout, onglets colorés, 2 thèmes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?vue=design');
  const tabs = page.getByRole('tablist', { name: 'Outils du studio' });
  await expect(tabs.getByRole('tab')).toHaveText([
    'Bibliothèque',
    'Calques',
    'Claude',
  ]);
  // Ajout réussi depuis la galerie : catégorie retirée, recherche gardée.
  await page
    .getByRole('tablist', { name: 'Écrans' })
    .getByRole('button', { name: 'Nouvel écran' })
    .click();
  const frame = page.frameLocator('iframe[title="Aperçu de l’écran"]');
  await expect(frame.locator('.cmp-item')).toHaveCount(0);
  const search = page.getByRole('searchbox', {
    name: 'Rechercher un composant',
  });
  await search.fill('b');
  await page.getByRole('button', { name: 'Bouton', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Retirer le filtre Bouton' }),
  ).toBeVisible();
  await page
    .frameLocator('iframe[title="Galerie des composants du DS"]')
    .locator('.cmp-pick')
    .first()
    .click();
  await expect(frame.locator('.cmp-item')).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: 'Retirer le filtre Bouton' }),
  ).toHaveCount(0);
  await expect(search).toHaveValue('b');
  // Couleur de catégorie : actif rempli de sa couleur (texte noir),
  // inactifs neutres sans liseré ; card teintée ; 2 thèmes.
  const panel = page.locator('.side-panel');
  const look = async (name: string) => {
    const tab = tabs.getByRole('tab', { name });
    await tab.click();
    await page.waitForTimeout(350);
    const other = tabs.getByRole('tab', { selected: false }).first();
    return {
      bg: await tab.evaluate((el) => getComputedStyle(el).backgroundColor),
      fg: await tab.evaluate((el) => getComputedStyle(el).color),
      line: await tab.evaluate((el) => getComputedStyle(el).boxShadow),
      idleIcon: await other
        .locator('svg')
        .evaluate((el) => getComputedStyle(el).color),
      idleText: await other.evaluate((el) => getComputedStyle(el).color),
      card: await panel.evaluate((el) => getComputedStyle(el).backgroundColor),
    };
  };
  for (const theme of ['Sombre', 'Clair']) {
    await page.getByRole('button', { name: theme }).click();
    const l = await look('Bibliothèque');
    const c = await look('Calques');
    const k = await look('Claude');
    expect([l.bg, c.bg, k.bg]).toEqual([
      'rgb(255, 119, 61)',
      'rgb(245, 85, 54)',
      'rgb(250, 188, 60)',
    ]);
    for (const t of [l, c, k]) {
      expect(t.fg).toBe('rgb(0, 0, 0)');
      expect(t.line).toBe('none');
      expect(t.idleIcon).toBe(t.idleText);
    }
    expect(new Set([l.card, c.card, k.card]).size).toBe(3);
  }
});

test('v3 : PFE, prototype iPhone, parcours, ressources hors ligne, plan', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await mockCarte(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?vue=prevention');
  await expect(
    page.getByRole('tab', { name: 'Prototype de l’application' }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.device--mobile .island')).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Ouvrir l’application seule/ }),
  ).toHaveAttribute('href', '/pfe/');
  const app = page.frameLocator('iframe[title="Aperçu de l’écran"]');
  // Lancement puis accueil : deux actions principales.
  await expect(
    app.getByRole('button', { name: /Je suis en danger/ }),
  ).toBeVisible({ timeout: 15000 });
  await expect(
    app.getByRole('button', { name: /Explorer les risques/ }),
  ).toBeVisible();
  // Urgence : numéros réels (téléphone), consignes, abris non inventés.
  await app.getByRole('button', { name: /Je suis en danger/ }).click();
  await expect(
    app.getByRole('link', { name: /Appeler les secours/ }),
  ).toHaveAttribute('href', 'tel:112');
  await app
    .getByRole('group', { name: 'Choisir la situation' })
    .getByRole('button', { name: 'Tsunami' })
    .click();
  await expect(app.locator('.d-q[data-open]')).toContainText(
    'Monter immédiatement',
  );
  await app.getByRole('button', { name: /Où me mettre à l’abri/ }).click();
  await expect(app.locator('.d-q[data-open]')).toContainText(
    'non publiés en données ouvertes',
  );
  await app.getByRole('button', { name: 'Menu' }).click();
  await app.getByRole('button', { name: 'Accueil' }).click();
  // Explorer : « Où êtes-vous ? » d'abord (aucune adresse), puis carte
  // plein écran, vigilance flottante, tiroir des 7 risques.
  await app.getByRole('button', { name: /Explorer les risques/ }).click();
  await expect(
    app.getByRole('button', { name: 'Me géolocaliser' }),
  ).toBeVisible();
  await app.getByRole('button', { name: 'Saisir une adresse' }).click();
  await app.getByRole('checkbox', { name: /J’accepte/ }).check();
  await app
    .getByRole('textbox', { name: 'Adresse en Martinique' })
    .fill('rue Victor Hugo Fort-de-France');
  await app.getByRole('button', { name: /Rue Victor Hugo 97200/ }).click();
  await expect(app.locator('.carte-view')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30000 },
  );
  await expect(
    app.getByRole('button', { name: /Vigilance actuelle : non disponible/ }),
  ).toBeVisible();
  await expect(app.locator('.carte-pin--home')).toBeVisible();
  const peek = app.getByRole('group', { name: 'Aperçu des 7 risques' });
  await expect(peek.getByRole('button')).toHaveCount(7);
  await peek
    .getByRole('button', { name: 'Volcanisme : vigilance non disponible' })
    .click();
  await expect(app.getByText('Illustration du phénomène')).toBeVisible();
  const vig = app.getByRole('region', { name: 'Niveau de vigilance actuel' });
  await expect(vig.locator('.vig-global')).toContainText(
    'Vigilance non disponible',
  );
  // Menu : rubriques avec icônes.
  await app.getByRole('button', { name: 'Menu' }).click();
  const menu = app.getByRole('navigation', { name: 'Menu' });
  await expect(menu.getByRole('button')).toHaveText([
    'Accueil',
    'Ma position',
    'Ressources hors ligne',
    'Mon plan d’urgence',
    'Comprendre les alertes',
    'Notifications',
    'Widgets & raccourcis',
  ]);
  await menu.getByRole('button', { name: 'Ressources hors ligne' }).click();
  // Téléchargements réels, tailles, consultation sans réseau.
  await expect(
    app.getByRole('checkbox', { name: /Points de rassemblement/ }),
  ).toBeDisabled();
  await app.getByRole('button', { name: 'Télécharger la sélection' }).click();
  await expect(app.getByText(/Téléchargé : .*(Ko|o)/).first()).toBeVisible();
  await expect(
    app.locator('.dl-list li').filter({ hasText: 'Carte de la Martinique' }),
  ).toContainText(/Téléchargé : \d/);
  await page.context().setOffline(true);
  await app.getByRole('button', { name: 'Contacts', exact: true }).click();
  await expect(
    app
      .getByRole('region', { name: 'Contenu hors ligne' })
      .or(app.locator('.m-offline')),
  ).toContainText('112');
  await page.context().setOffline(false);
  await app
    .getByRole('button', {
      name: 'Supprimer : Contacts d’urgence et autorités',
    })
    .click();
  await expect(
    app.locator('.dl-list li').filter({ hasText: 'Contacts d’urgence' }),
  ).not.toContainText('Téléchargé');
  // Plan d'urgence : message préparé dans la messagerie, gardé localement.
  await app.getByRole('button', { name: 'Menu' }).click();
  await app.getByRole('button', { name: 'Mon plan d’urgence' }).click();
  await app
    .getByRole('textbox', { name: 'Téléphone' })
    .fill('+596 696 00 00 00');
  await expect(
    app.getByRole('link', { name: /Je suis en vie/ }),
  ).toHaveAttribute('href', /^sms:\+596696000000/);
  await app.getByRole('button', { name: 'Suivant' }).click();
  await expect(
    app.getByRole('region', { name: 'Évacuation de mon secteur' }),
  ).toContainText('DICRIM');
  expect(
    await page.evaluate(() => localStorage.getItem('ds-v3-plan')),
  ).toContain('596');
  // Me préparer dans DS-Studio : mêmes deux sous-cards.
  await page.getByRole('tab', { name: 'Me préparer' }).click();
  await expect(
    page.getByRole('region', { name: 'Télécharger mes ressources d’urgence' }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Mon plan d’urgence' }),
  ).toContainText('Préparer le message « Je suis en vie »');
  expect(errors).toEqual([]);
});

test('v3 : design, iPhone et autres appareils, tester l’écran en vrai', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?vue=design');
  const group = page.getByRole('group', { name: 'Appareil' });
  await expect(group.getByRole('button')).toHaveText([
    'iPhone',
    'iPad',
    'MacBook',
    'Screen',
  ]);
  await expect(group.getByRole('button', { name: 'iPhone' })).toHaveAttribute(
    'title',
    /393 × 852 pt.*pas un émulateur natif/,
  );
  await page
    .getByRole('tablist', { name: 'Écrans' })
    .getByRole('button', { name: 'Nouvel écran' })
    .click();
  const frame = page.frameLocator('iframe[title="Aperçu de l’écran"]');
  await expect(
    page.getByRole('tablist', { name: 'Écrans' }).getByRole('tab').last(),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(frame.locator('.cmp-section')).toHaveCount(1);
  await expect(frame.locator('.cmp-item')).toHaveCount(0);
  await frame
    .locator('.cmp-section > .cmp-section-body')
    .first()
    .evaluate((el) => {
      const dt = new DataTransfer();
      dt.setData(
        'application/x-ds-block',
        JSON.stringify({ kind: 'field', variant: 'text' }),
      );
      const r = el.getBoundingClientRect();
      for (const type of ['dragover', 'drop'])
        el.dispatchEvent(
          new DragEvent(type, {
            bubbles: true,
            cancelable: true,
            dataTransfer: dt,
            clientX: r.left + 4,
            clientY: r.bottom - 2,
          }),
        );
    });
  await expect(frame.locator('.cmp-item')).toHaveCount(1);
  // Test réel : saisie dans le champ, sans sélection d'édition.
  const test = page.getByRole('button', { name: 'Tester l’écran' });
  await test.click();
  await expect(test).toHaveAttribute('aria-pressed', 'true');
  await expect(test).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await expect(page.locator('.studio-status')).toContainText('Test de l’écran');
  const input = frame.locator('.cmp-item input').first();
  await input.fill('Audrey');
  await expect(input).toHaveValue('Audrey');
  await expect(frame.locator('.is-selected')).toHaveCount(0);
  // Changer d'appareil : même écran, aucun contenu perdu.
  for (const name of ['iPad', 'MacBook', 'Screen', 'iPhone']) {
    await group.getByRole('button', { name }).click();
    await expect(frame.locator('.cmp-item')).toHaveCount(1);
  }
  await test.click();
  await expect(test).toHaveAttribute('aria-pressed', 'false');
  await frame.locator('.cmp-item').first().click();
  await expect(frame.locator('.is-selected')).toHaveCount(1);
});

test('v3 : PFE, je suis en danger, scénarios de crise', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Message tsunami NOAA récent pour la Caraïbe (simulé pour le test).
  await mockCarte(page);
  await page.route('**/api/carte/situation**', (r) =>
    r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        checkedAt: new Date().toISOString(),
        seismes: { ok: false, error: 'Source indisponible.' },
        cyclones: {
          ok: true,
          data: {
            source: 'NHC',
            url: 'u',
            fetchedAt: new Date().toISOString(),
            stale: false,
            storms: [],
          },
        },
        tsunami: {
          ok: true,
          data: {
            source: 'NOAA',
            url: 'u',
            fetchedAt: new Date().toISOString(),
            stale: false,
            messages: [
              {
                center: 'PTWC',
                title: 'Test',
                category: 'Information',
                updated: new Date().toISOString(),
                url: 'u',
              },
            ],
          },
        },
      }),
    }),
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // Petit écran, une main.
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/pfe/');
  // Accès urgence sans attendre le lancement.
  await page.getByRole('button', { name: /Je suis en danger/ }).click();
  // Risque détecté automatiquement, incertitude affichée.
  await expect(
    page.getByRole('button', { name: /Tsunami/ }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Situation', exact: true }),
  ).toContainText('Ce n’est pas une alerte officielle');
  await expect(page.locator('.d-q[data-open]')).toContainText(
    'Que faire maintenant ?',
  );
  // Secours et contact : deux actions distinctes, contact persistant.
  await expect(
    page.getByRole('link', { name: /Appeler les secours/ }),
  ).toHaveAttribute('href', 'tel:112');
  await expect(page.getByRole('link', { name: /114/ })).toHaveAttribute(
    'href',
    'sms:114',
  );
  const dock = page.locator('.d-dock');
  await dock
    .getByRole('button', { name: 'Ajouter un contact d’urgence' })
    .click();
  await dock.getByRole('textbox', { name: 'Nom du contact' }).fill('Maman');
  await dock
    .getByRole('textbox', { name: 'Téléphone du contact' })
    .fill('0696 00 00 00');
  await dock.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(
    dock.getByRole('link', { name: /Appeler mon contact d’urgence/ }),
  ).toHaveAttribute('href', 'tel:0696000000');
  // Évacuer : jamais d'ordre inventé.
  await page.getByRole('button', { name: /Dois-je évacuer/ }).click();
  await expect(page.locator('.d-q[data-open]')).toContainText(
    'Aucun ordre d’évacuation officiel n’est connu',
  );
  // Le contact reste visible en bas pendant le défilement.
  await page
    .locator('.danger-body')
    .evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect(
    dock.getByRole('link', { name: /Appeler mon contact/ }),
  ).toBeInViewport();
  // Prévenir mes proches hors ligne : prêt, non envoyé.
  await page.context().setOffline(true);
  const sms = page
    .getByRole('region', { name: 'Prévenir mes proches' })
    .getByRole('link', { name: 'Par SMS' });
  await expect(sms).toHaveAttribute('href', /^sms:0696000000/);
  await sms.evaluate((a) =>
    a.addEventListener('click', (e) => e.preventDefault()),
  );
  await sms.click();
  await expect(
    page.getByRole('region', { name: 'Prévenir mes proches' }),
  ).toContainText('non envoyé');
  await page.context().setOffline(false);
  // Situations particulières.
  await page.getByRole('button', { name: 'Je ne peux pas parler' }).click();
  await expect(page.locator('.d-q[data-open]')).toContainText('SMS au 114');
  // Interruption : choix gardés au rechargement.
  await page
    .getByRole('button', { name: /Tsunami/ })
    .first()
    .click();
  await page
    .getByRole('group', { name: 'Choisir la situation' })
    .getByRole('button', { name: 'Cyclone' })
    .click();
  await page.reload();
  await page.getByRole('button', { name: /Je suis en danger/ }).click();
  await expect(
    page.getByRole('button', { name: /Cyclone/ }).first(),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(360);
  // Grand écran : navigation latérale, pas de burger, contenu centré.
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(
    page
      .locator('.m-side')
      .getByRole('button', { name: 'Ressources hors ligne' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Menu' })).toBeHidden();
  expect(
    await page
      .locator('.danger-body')
      .evaluate((el) => el.getBoundingClientRect().width),
  ).toBeLessThanOrEqual(880);
  expect(errors).toEqual([]);
});

test('v3 : PFE, position, carte plein écran, tiroir, notifications, raccourcis', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await mockCarte(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 393, height: 852 });
  // Lien direct : rubrique ouverte sans attendre le lancement.
  await page.goto('/pfe/#shortcuts');
  await expect(
    page.getByRole('heading', { name: 'Widgets & raccourcis' }),
  ).toBeVisible();
  await expect(
    page.getByText(/Impossible depuis une application web/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Tester' }).first().click();
  await expect(
    page.getByRole('link', { name: /Appeler les secours/ }),
  ).toBeVisible();
  // Notifications : autorisation explicite, jamais d'alerte simulée.
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Notifications' }).click();
  await expect(page.getByText(/ne les remplace pas/)).toBeVisible();
  await expect(page.getByText(/pas de service push/)).toBeVisible();
  // Position : 3 choix, dernière adresse proposée une fois enregistrée.
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Ma position' }).click();
  await expect(
    page.getByRole('button', { name: 'Me géolocaliser' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Saisir une adresse' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Utiliser ma dernière adresse/ }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Saisir une adresse' }).click();
  await page.getByRole('checkbox', { name: /J’accepte/ }).check();
  await page
    .getByRole('textbox', { name: 'Adresse en Martinique' })
    .fill('rue Victor Hugo Fort-de-France');
  await page.getByRole('button', { name: /Rue Victor Hugo 97200/ }).click();
  await expect(page.locator('.carte-view')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30000 },
  );
  // Plein écran : carte sous les éléments flottants, tiroir réduit.
  const box = (s: string) => page.locator(s).boundingBox();
  expect((await box('.carte-stage'))!.height).toBeGreaterThan(780);
  await expect(page.locator('.m-explore')).toHaveAttribute(
    'data-sheet',
    'peek',
  );
  const handle = page.getByRole('button', { name: 'Agrandir le panneau' });
  await handle.focus();
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.m-explore')).toHaveAttribute(
    'data-sheet',
    'half',
  );
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.m-explore')).toHaveAttribute(
    'data-sheet',
    'full',
  );
  await expect(
    page.getByRole('region', { name: 'Niveau de vigilance actuel' }),
  ).toContainText('clé du portail API Météo-France');
  await page.getByRole('button', { name: 'Réduire le panneau' }).click();
  await expect(page.locator('.m-explore')).toHaveAttribute(
    'data-sheet',
    'peek',
  );
  // Vigilance flottante → détail complet.
  await page
    .getByRole('button', { name: /Vigilance actuelle : non disponible/ })
    .click();
  await expect(page.locator('.m-explore')).toHaveAttribute(
    'data-sheet',
    'full',
  );
  // Explorer à nouveau : pas de redemande de position.
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Accueil' }).click();
  await page.getByRole('button', { name: /Explorer les risques/ }).click();
  await expect(page.locator('.m-explore')).toBeVisible();
  // Dernière adresse : proposée, modifiable, utilisable.
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Ma position' }).click();
  await expect(
    page.getByRole('region', { name: 'Ma dernière adresse' }),
  ).toContainText('Rue Victor Hugo');
  await page
    .getByRole('button', { name: /Utiliser ma dernière adresse/ })
    .click();
  await expect(page.locator('.m-explore')).toBeVisible();
  expect(errors).toEqual([]);
});
