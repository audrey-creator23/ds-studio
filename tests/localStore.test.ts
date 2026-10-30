import assert from 'node:assert/strict';
import test from 'node:test';
import { readSaved, writeSaved } from '../app/v3/localStore.js';

test('stockage refusé : copie de session, édition et suppression conservées', (t) => {
  const oldStorage = Object.getOwnPropertyDescriptor(
    globalThis,
    'localStorage',
  );
  const oldDispatch = Object.getOwnPropertyDescriptor(
    globalThis,
    'dispatchEvent',
  );
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem() {
        throw new Error('Refusé');
      },
      setItem() {
        throw new Error('Quota');
      },
      removeItem() {
        throw new Error('Refusé');
      },
    },
  });
  Object.defineProperty(globalThis, 'dispatchEvent', {
    configurable: true,
    value: () => true,
  });
  t.after(() => {
    if (oldStorage)
      Object.defineProperty(globalThis, 'localStorage', oldStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
    if (oldDispatch)
      Object.defineProperty(globalThis, 'dispatchEvent', oldDispatch);
    else Reflect.deleteProperty(globalThis, 'dispatchEvent');
  });
  const key = 'test-lieux-session';
  writeSaved(key, [{ name: 'Lieu privé' }]);
  assert.deepEqual(readSaved(key, []), [{ name: 'Lieu privé' }]);
  writeSaved(key, [{ name: 'Nom modifié' }]);
  assert.deepEqual(readSaved(key, []), [{ name: 'Nom modifié' }]);
  writeSaved(key, null);
  assert.equal(readSaved(key, []), null);
});
