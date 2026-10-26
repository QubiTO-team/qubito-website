export const languages = {
  it: 'Italiano',
  en: 'English',
} as const;

export type Lang = keyof typeof languages;

export const defaultLang: Lang = 'it';

const it = {
  'site.description':
    'QubiTO è il team studentesco di quantum computing del Politecnico di Torino: ricerca, divulgazione e hackathon internazionali.',

  'home.claim': 'Qubit + Torino',

  'cta.readArticles': 'Leggi gli articoli',
  'cta.allArticles': 'Tutti gli articoli',
  'cta.allActivities': 'Tutte le attività',
  'cta.emailUs': 'Scrivi a {email}',

  'a11y.skipToContent': 'Salta al contenuto',

  'nav.label': 'Navigazione principale',
  'nav.homeLabel': 'QubiTO, pagina iniziale',
  'nav.articles': 'Articoli',
  'nav.activities': 'Attività',
  'nav.team': 'Chi siamo',
  'nav.joinUs': 'Unisciti a noi',
  'nav.contacts': 'Contatti',
  'nav.hackathon': 'Hackathon',
  'nav.openMenu': 'Menu',
  'nav.closeMenu': 'Chiudi',

  'lang.label': 'Lingua del sito',

  'footer.navLabel': 'Pagine del sito',
  'footer.socialLabel': 'QubiTO sui social',
  'footer.writeUs': 'Scrivici',
  'footer.politoLabel': 'Politecnico di Torino',
  'footer.copyright': '© {year} QubiTO. Tutti i diritti riservati.',
  'footer.credits': 'Sito curato dalla Divisione Divulgazione di QubiTO.',
  'footer.backToTop': 'Torna su',
  'footer.privacy': 'Privacy',

  'notFound.title': 'Pagina non trovata',
  'notFound.lead': 'Decoerenza: questo stato non è sopravvissuto alla misura.',
  'notFound.body':
    "La pagina che cerchi non esiste o è stata spostata. Controlla l'indirizzo oppure riparti da qui.",
  'notFound.home': 'Torna alla home',

  'article.published': 'Pubblicato',
  'article.author': 'Autore',
  'article.authors': 'Autori',
  'article.readingTime': 'Lettura',
  'article.minutes': '{minutes} min',
  'article.tags': 'Argomenti',
  'article.toc': 'In questo articolo',
  'article.figure': 'Fig.',
  'article.older': 'Articolo precedente',
  'article.newer': 'Articolo successivo',
  'article.moreArticles': 'Altri articoli',

  'articles.intro':
    'Scritti dai gruppi di progetto del team: correzione degli errori quantistici, hardware, crittografia e programmazione dei computer quantistici.',
  'articles.description':
    'Gli articoli di QubiTO, il team studentesco di quantum computing del Politecnico di Torino.',
  'articles.feed': 'Feed RSS degli articoli',

  'activities.intro':
    'Hackathon internazionali, eventi e seminari che organizziamo al Politecnico, e le occasioni in cui raccontiamo il quantum computing a chi lo incontra per la prima volta.',
  'activities.description':
    'Le attività di QubiTO, il team studentesco di quantum computing del Politecnico di Torino: hackathon, eventi e divulgazione.',
  'activities.upcoming': 'In programma',

  'activity.date': 'Quando',
  'activity.location': 'Dove',
  'activity.result': 'Risultato',
  'activity.photos': 'Foto',
  'activity.openPhoto': 'Ingrandisci la foto {number} di {total}',
  'activity.closePhoto': 'Chiudi la foto',
  'activity.older': 'Attività precedente',
  'activity.newer': 'Attività successiva',
  'activity.moreActivities': 'Altre attività',

  'team.joinTitle': 'Vuoi far parte del team?',

  'contacts.follow': 'Seguici',
  'contacts.followText':
    'Rimani aggiornato sui nostri ultimi progetti ed eventi seguendoci sui social.',
  'contacts.partners': 'I nostri partner',
  'contacts.mainPartner': 'Partner principale',

  'joinUs.closed':
    'Al momento le candidature sono chiuse. Seguici sui social per sapere quando riapriranno.',

  'form.label': 'Modulo di candidatura',
  'form.requiredNote': 'I campi con * sono obbligatori.',
  'form.name': 'Nome e cognome',
  'form.idNumber': 'Matricola',
  'form.email': 'Email istituzionale',
  'form.phone': 'Numero di telefono (per comunicarti il colloquio)',
  'form.major': 'Corso di studi',
  'form.yearsComplete': 'Secondo te, in quanti anni finirai gli studi?',
  'form.year': 'A che anno sei?',
  'form.year1b': '1° anno di laurea triennale',
  'form.year2b': '2° anno di laurea triennale',
  'form.year3b': '3° anno di laurea triennale',
  'form.year1m': '1° anno di laurea magistrale',
  'form.year2m': '2° anno di laurea magistrale',
  'form.english': 'Come valuti il tuo inglese parlato?',
  'form.scale5': '1 = per niente, 5 = benissimo',
  'form.scale10': '1 = per niente, 10 = moltissimo',
  'form.otherTeam': 'Fai già parte di un altro team studentesco?',
  'form.yesMany': 'Sì, più di uno',
  'form.yesOne': 'Sì, uno',
  'form.yes': 'Sì',
  'form.no': 'No',
  'form.socialRole': 'Ti candidi per il ruolo di social media manager?',
  'form.technical': 'Competenze tecniche',
  'form.rf': "Quanto conosci l'ingegneria delle radiofrequenze?",
  'form.fpga': 'Quanto conosci le FPGA?',
  'form.python': 'Quanto sai programmare, soprattutto in Python?',
  'form.quantum': 'Quanto conosci la meccanica quantistica?',
  'form.qiskit': 'Conosci Qiskit?',
  'form.qiskitNo': 'Il verso dello scoiattolo?',
  'form.qiskitLittle': "Un po'",
  'form.qiskitYes': 'Certo!',
  'form.studiedQc': 'Hai mai studiato quantum computing?',
  'form.studiedCourse': 'Sì, in un corso (università o altro ente)',
  'form.studiedSelf': 'Sì, da solo',
  'form.web': 'Quanto conosci lo sviluppo web (HTML, CSS, JavaScript, framework)?',
  'form.otherSkills':
    'Vuoi segnalarci altre competenze utili nel team? (per esempio hackathon a cui hai partecipato)',
  'form.social': 'Ruolo social',
  'form.design':
    'Usi programmi di grafica o di montaggio (per esempio Canva, Photoshop, Illustrator, Premiere Pro, Figma, CapCut)? Elencali e indica il tuo livello.',
  'form.socialSkills':
    'Vuoi segnalarci altre competenze utili per il ruolo social? (per esempio scrittura, fotografia, montaggio video, gestione di pagine)',
  'form.privacyCheck': 'Ho letto come vengono usati i miei dati',
  'form.privacyPage': 'Informativa sulla privacy',
  'form.submit': 'Invia la candidatura',
  'form.sending': 'Invio in corso…',
  'form.sent':
    'Candidatura inviata! Grazie per il tuo interesse in QubiTO: ti contatteremo presto.',
  'form.error':
    'Non è stato possibile inviare la candidatura. Riprova tra poco o scrivici a {email}.',

  'linktree.title': 'Link',
  'linktree.description': 'I link di QubiTO: pagine del sito, contatti e social.',
} as const;

export type UiKey = keyof typeof it;

const en: Record<UiKey, string> = {
  'site.description':
    'QubiTO is the quantum computing student team of Politecnico di Torino: research, outreach and international hackathons.',

  'home.claim': 'Qubit + Torino',

  'cta.readArticles': 'Read the articles',
  'cta.allArticles': 'All articles',
  'cta.allActivities': 'All activities',
  'cta.emailUs': 'Write to {email}',

  'a11y.skipToContent': 'Skip to content',

  'nav.label': 'Main navigation',
  'nav.homeLabel': 'QubiTO home page',
  'nav.articles': 'Articles',
  'nav.activities': 'Activities',
  'nav.team': 'About us',
  'nav.joinUs': 'Join us',
  'nav.contacts': 'Contacts',
  'nav.hackathon': 'Hackathon',
  'nav.openMenu': 'Menu',
  'nav.closeMenu': 'Close',

  'lang.label': 'Site language',

  'footer.navLabel': 'Site pages',
  'footer.socialLabel': 'QubiTO on social media',
  'footer.writeUs': 'Write to us',
  'footer.politoLabel': 'Politecnico di Torino',
  'footer.copyright': '© {year} QubiTO. All rights reserved.',
  'footer.credits': "Site maintained by QubiTO's Outreach Division.",
  'footer.backToTop': 'Back to top',
  'footer.privacy': 'Privacy',

  'notFound.title': 'Page not found',
  'notFound.lead': 'Decoherence: this state did not survive the measurement.',
  'notFound.body':
    'The page you are looking for does not exist or has moved. Check the address or start again from here.',
  'notFound.home': 'Back to the home page',

  'article.published': 'Published',
  'article.author': 'Author',
  'article.authors': 'Authors',
  'article.readingTime': 'Reading time',
  'article.minutes': '{minutes} min',
  'article.tags': 'Topics',
  'article.toc': 'In this article',
  'article.figure': 'Fig.',
  'article.older': 'Previous article',
  'article.newer': 'Next article',
  'article.moreArticles': 'More articles',

  'articles.intro':
    "Written by the team's project groups: quantum error correction, hardware, cryptography and programming quantum computers.",
  'articles.description':
    'Articles by QubiTO, the quantum computing student team of Politecnico di Torino.',
  'articles.feed': 'Articles RSS feed',

  'activities.intro':
    'International hackathons, events and seminars we organise at the Politecnico, and the occasions where we explain quantum computing to people who meet it for the first time.',
  'activities.description':
    'Activities of QubiTO, the quantum computing student team of Politecnico di Torino: hackathons, events and outreach.',
  'activities.upcoming': 'Upcoming',

  'activity.date': 'When',
  'activity.location': 'Where',
  'activity.result': 'Result',
  'activity.photos': 'Photos',
  'activity.openPhoto': 'Enlarge photo {number} of {total}',
  'activity.closePhoto': 'Close the photo',
  'activity.older': 'Previous activity',
  'activity.newer': 'Next activity',
  'activity.moreActivities': 'More activities',

  'team.joinTitle': 'Want to be part of our team?',

  'contacts.follow': 'Follow us',
  'contacts.followText':
    'Stay updated on our latest projects and events by following us on social media.',
  'contacts.partners': 'Our partners',
  'contacts.mainPartner': 'Main partner',

  'joinUs.closed':
    'Applications are closed at the moment. Follow us on social media to know when they reopen.',

  'form.label': 'Application form',
  'form.requiredNote': 'Fields marked with * are required.',
  'form.name': 'Name and surname',
  'form.idNumber': 'Student ID number (matricola)',
  'form.email': 'Institutional email address',
  'form.phone': 'Phone number (for interview communications)',
  'form.major': 'Degree programme',
  'form.yearsComplete': 'In your opinion, in how many years will you complete your studies?',
  'form.year': 'Which year are you in?',
  'form.year1b': "1st year of bachelor's",
  'form.year2b': "2nd year of bachelor's",
  'form.year3b': "3rd year of bachelor's",
  'form.year1m': "1st year of master's",
  'form.year2m': "2nd year of master's",
  'form.english': 'How would you rate your spoken English?',
  'form.scale5': '1 = not at all, 5 = very well',
  'form.scale10': '1 = not at all, 10 = a lot',
  'form.otherTeam': 'Are you currently part of another student team?',
  'form.yesMany': 'Yes, more than one',
  'form.yesOne': 'Yes, one',
  'form.yes': 'Yes',
  'form.no': 'No',
  'form.socialRole': 'Are you applying for the social media manager role?',
  'form.technical': 'Technical skills',
  'form.rf': 'How much do you know about radio frequency engineering?',
  'form.fpga': 'How much do you know about FPGAs?',
  'form.python': 'How well can you code, especially in Python?',
  'form.quantum': 'How much do you know about quantum mechanics?',
  'form.qiskit': 'Do you know Qiskit?',
  'form.qiskitNo': 'The squirrel sound?',
  'form.qiskitLittle': 'A little bit',
  'form.qiskitYes': 'For sure!',
  'form.studiedQc': 'Have you ever studied quantum computing?',
  'form.studiedCourse': 'Yes, in a course (university or other institution)',
  'form.studiedSelf': 'Yes, on my own',
  'form.web': 'How much do you know about web development (HTML, CSS, JavaScript, frameworks)?',
  'form.otherSkills':
    'Would you like to tell us about other skills useful in the team? (for example hackathons you took part in)',
  'form.social': 'Social media role',
  'form.design':
    'Do you use any design or editing software (for example Canva, Photoshop, Illustrator, Premiere Pro, Figma, CapCut)? List them and describe your level.',
  'form.socialSkills':
    'Would you like to tell us about other skills useful for the social media role? (for example copywriting, photography, video editing, managing pages)',
  'form.privacyCheck': 'I have read how my data is used',
  'form.privacyPage': 'Privacy notice',
  'form.submit': 'Send the application',
  'form.sending': 'Sending…',
  'form.sent': 'Application sent! Thank you for your interest in QubiTO: we will contact you soon.',
  'form.error': 'The application could not be sent. Try again shortly or write to us at {email}.',

  'linktree.title': 'Links',
  'linktree.description': "QubiTO's links: pages of the site, contacts and social media.",
};

export const ui: Record<Lang, Record<UiKey, string>> = { it, en };
