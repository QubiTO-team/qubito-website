import type { L10n } from '../i18n';

// Tentative schedule (source: utils/timeschedule.jpg). `big` = highlighted milestone on the wire.
export type Item = { time: string; title: L10n; note?: L10n; big?: boolean };
export type Day = { ket: string; title: L10n; items: Item[] };

export const schedule: Day[] = [
  {
    ket: '|11.12⟩',
    title: { en: 'Company talks', it: 'Talk delle aziende' },
    items: [
      {
        time: '13:00 – 19:00', big: true,
        title: { en: 'Company talks', it: 'Talk delle aziende' },
        note: {
          en: 'Partner companies present their work and the problems behind the challenges',
          it: 'Le aziende partner presentano il loro lavoro e i problemi dietro le sfide',
        },
      },
      { time: '21:00', title: { en: 'Dinner at Comala', it: 'Cena al Comala' } },
    ],
  },
  {
    ket: '|12.12⟩',
    title: { en: 'Hacking starts', it: "Inizia l'hacking" },
    items: [
      { time: '11:00', title: { en: 'Challenges presented', it: 'Presentazione delle sfide' } },
      { time: '12:00', big: true, title: { en: 'Coding begins', it: 'Inizio coding' }, note: { en: '24 hours on the clock', it: 'Partono le 24 ore' } },
      { time: '13:00', title: { en: 'Lunch', it: 'Pranzo' } },
      { time: '14:00 – 20:00', title: { en: 'Hacking', it: 'Hacking' } },
      { time: '20:00', title: { en: 'Dinner', it: 'Cena' } },
      { time: '21:00 →', title: { en: 'Hacking through the night', it: 'Hacking per tutta la notte' } },
    ],
  },
  {
    ket: '|13.12⟩',
    title: { en: 'Solutions and awards', it: 'Soluzioni e premiazione' },
    items: [
      { time: '09:00', title: { en: 'Breakfast', it: 'Colazione' } },
      { time: '12:00', big: true, title: { en: 'Coding ends, lunch', it: 'Fine coding, pranzo' } },
      { time: '13:00', title: { en: 'Solutions presented', it: 'Presentazione delle soluzioni' } },
      { time: '14:00', title: { en: 'Semi-finalists announced', it: 'Annuncio dei semifinalisti' } },
      { time: '15:00', title: { en: 'Finalists announced', it: 'Annuncio dei finalisti' } },
      { time: '16:00', title: { en: 'Awards, networking and coffee', it: 'Premiazione, networking e caffè' } },
    ],
  },
];
