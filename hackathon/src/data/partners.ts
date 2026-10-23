import type { L10n } from '../i18n';

// Logos live in public/logos/. width/height = the image's real pixel size (avoids layout jumps).
// `wide`: wordmark logos that look too big at the normal height.
export type Partner = {
  name: string; url: string; logo: string; width: number; height: number;
  label: L10n; description?: L10n; wide?: boolean;
};

export const mainPartner: Partner = {
  name: 'IQM Quantum Computers', url: 'https://meetiqm.com', logo: 'logos/iqm.png', width: 720, height: 255,
  label: { en: 'Main partner', it: 'Main partner' },
  description: { en: 'Quantum computers for research and industry', it: "Computer quantistici per la ricerca e l'industria" },
};

export const partners: Partner[] = [
  { name: 'Politecnico di Torino', url: 'https://www.polito.it', logo: 'logos/polito.png', width: 720, height: 316,
    label: { en: 'Host', it: 'Ospitato da' } },
  { name: 'Fondazione LINKS', url: 'https://linksfoundation.com', logo: 'logos/links.png', width: 274, height: 124,
    label: 'Partner' },
  { name: 'QCentroid', url: 'https://qcentroid.xyz', logo: 'logos/qcentroid.png', width: 617, height: 102,
    label: 'Partner', wide: true },
];

/** Put the PDF in public/ and set the file name here to show the "Partnership kit" button. */
export const partnershipKit: string | null = null; // e.g. 'partnership-kit.pdf'
