import { test, expect, type Page } from '@playwright/test';

const token = (page: Page, key: string) =>
  page.getByLabel(key, { exact: true });
const save = (page: Page) =>
  page.getByRole('button', { name: /^Enregistrer/ }).click();

test('boucle centrale : brouillon en direct, diff, validation, recharge, annulation sélective', async ({
  page,
}) => {
  await page.goto('/?vue=design&mode=tokens');
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
  await page.goto('/?vue=design&mode=tokens');
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
  await page.goto('/?vue=design&mode=tokens');
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
  await page.goto('/?vue=design&mode=tokens');
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
  await page.goto('/?vue=design&mode=tokens');
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
  await page.goto('/?vue=design&mode=tokens');
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
  await page.goto('/?vue=assistant');
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
  await page.goto('/?vue=design');
  await expect(page.getByText('Mode de travail')).toHaveCount(0);
});

test('recherche, brouillon récupéré après recharge, annuler et rétablir', async ({
  page,
}) => {
  await page.goto('/?vue=design&mode=tokens');
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
  await page.goto('/?vue=design&mode=tokens');
  await token(page, 'color.brand').fill('#223355');
  await save(page);
  const other = await context.newPage();
  await other.goto('/?vue=design&mode=tokens');
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
  await page.goto('/?vue=design&mode=tokens');
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
  await page.goto('/?vue=design');
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
  await page.goto('/');
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
  await page.goto('/');
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
  await page.goto('/');
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
  await page.goto('/');
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
  await page.goto('/');
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
  await page.goto('/');
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
  await page.goto('/');
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
  await page.goto('/?vue=design');
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
  await page.goto('/?vue=design');
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
  await page.goto('/?vue=volcan');
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

test('v3 : dashboard compact, frise, liste des tâches, thème, fiche PFE', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/v3');
  await expect(
    page.getByRole('heading', { name: 'Récapitulatif des échéances PFE' }),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveClass(/dark/);
  // Page desktop sans défilement.
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeLessThanOrEqual(900);
  // Frise : un jalon prévisualise sa date, un second clic revient à aujourd'hui.
  const fin = page.getByRole('button', { name: /^Fin du DS/ });
  await fin.click();
  await expect(
    page.getByRole('img', { name: 'Volcan, intensité 100 % : Éruption' }),
  ).toBeVisible();
  await fin.click();
  await expect(fin).toHaveAttribute('aria-pressed', 'false');
  // Liste réelle des tâches depuis la carte.
  await page.getByRole('button', { name: 'Voir la liste des tâches' }).click();
  await expect(page.getByRole('region', { name: 'Tâches' })).toContainText(
    'Recherche utilisateurs',
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', { name: 'Tâches' })).toHaveCount(0);
  // Thème clair mémorisé.
  await page.getByRole('button', { name: 'Clair' }).click();
  await page.reload();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  // Fiche PFE : résumé visible, détail à la demande, checklist modifiable.
  await page.locator('.sidebar a', { hasText: 'Brief projet' }).click();
  await expect(page.getByRole('heading', { name: 'Fiche PFE' })).toBeFocused();
  const objectifs = page.locator('.sheet-section', { hasText: 'Objectifs' });
  await objectifs.getByRole('button', { name: 'Voir le détail' }).click();
  await expect(objectifs).toContainText('Préparation progressive');
  await expect(
    page.getByRole('combobox', { name: /^Statut : Recherche utilisateurs/ }),
  ).toHaveCount(0);
  const checklist = page.locator('.sheet-section', { hasText: 'Checklist' });
  await checklist.getByRole('button', { name: 'Voir le détail' }).click();
  await expect(checklist.getByRole('combobox')).toHaveCount(9);
  // Autres pages annoncées mais désactivées ; la version actuelle reste là.
  await expect(
    page.locator('.sidebar a', { hasText: 'Accueil' }),
  ).toHaveAttribute('aria-disabled', 'true');
  await page.getByRole('link', { name: 'Version actuelle' }).click();
  await expect(
    page.getByRole('heading', { name: 'Tableau de bord' }),
  ).toBeVisible();
});
