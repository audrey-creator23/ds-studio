import { useState } from 'react';
import { LocateFixed, MapPin, Search } from 'lucide-react';
import { request } from '../../client/api.js';
import { Button } from '../ui.js';
import { writeHome } from './Logement.js';

// « Où êtes-vous en Martinique ? » : géolocalisation avec permission du
// navigateur (précision exigée, adresse retrouvée par la BAN, enregistrée
// seulement avec accord) ou saisie d'adresse. Partagé Carte / app PFE.
// Précision minimale d'une géolocalisation pour la retenir (mètres).
export const MAX_ACCURACY = 300;

export default function Locate({ onManual }: { onManual: () => void }) {
  const [state, setState] = useState<'idle' | 'asking' | 'found' | 'error'>(
    'idle',
  );
  const [message, setMessage] = useState('');
  const [found, setFound] = useState<{
    label: string;
    city: string;
    citycode: string;
    lat: number;
    lon: number;
    accuracy: number;
  }>();
  function locate() {
    if (!('geolocation' in navigator)) {
      setState('error');
      return setMessage(
        'Géolocalisation indisponible sur cet appareil : saisissez votre adresse.',
      );
    }
    setState('asking');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        if (coords.accuracy > MAX_ACCURACY) {
          setState('error');
          return setMessage(
            `Position trop imprécise (± ${Math.round(coords.accuracy)} m) : saisissez votre adresse.`,
          );
        }
        try {
          const r = await request<{
            label: string;
            city: string;
            citycode: string;
          }>('carte/reverse', {
            lat: coords.latitude,
            lon: coords.longitude,
          });
          setFound({
            ...r,
            lat: coords.latitude,
            lon: coords.longitude,
            accuracy: Math.round(coords.accuracy),
          });
          setState('found');
        } catch (e) {
          setState('error');
          setMessage(`${(e as Error).message} Saisissez votre adresse.`);
        }
      },
      (e) => {
        setState('error');
        setMessage(
          e.code === e.PERMISSION_DENIED
            ? 'Accès à la position refusé : saisissez votre adresse.'
            : 'Position introuvable : saisissez votre adresse.',
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }
  if (state === 'found' && found)
    return (
      <div className="locate" role="group" aria-label="Position trouvée">
        <p>
          <MapPin size={14} aria-hidden="true" /> <b>{found.label}</b>
          <small className="carte-stamp"> (± {found.accuracy} m)</small>
        </p>
        <p className="small muted">
          Enregistrer cette position sur cet appareil uniquement ?
        </p>
        <div className="row">
          <Button
            size="sm"
            onClick={() =>
              writeHome({
                label: found.label,
                city: found.city,
                citycode: found.citycode,
                lat: found.lat,
                lon: found.lon,
                savedAt: new Date().toISOString(),
              })
            }
          >
            Enregistrer
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setState('idle')}>
            Annuler
          </Button>
        </div>
      </div>
    );
  return (
    <div
      className="locate"
      role="group"
      aria-label="Où êtes-vous en Martinique ?"
    >
      <h3>Où êtes-vous en Martinique ?</h3>
      <p className="small muted">
        Pour voir les risques près de chez vous. Votre position reste sur cet
        appareil ; seule la recherche d’adresse passe par la Base Adresse
        Nationale (service public).
      </p>
      <div className="locate-actions">
        <Button size="sm" onClick={locate} disabled={state === 'asking'}>
          <LocateFixed size={14} aria-hidden="true" />{' '}
          {state === 'asking' ? 'Localisation…' : 'Me géolocaliser'}
        </Button>
        <Button variant="outline" size="sm" onClick={onManual}>
          <Search size={14} aria-hidden="true" /> Saisir une adresse
        </Button>
      </div>
      {state === 'error' && (
        <p className="alert-text" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
