---
title: "Introduzione alla Crittografia Classica"
weight: 14
date: 2026-03-23
summary: "Questo articolo esplora i principi fondamentali della crittografia classica analizzando i meccanismi e le vulnerabilità agli attacchi di forza bruta dei cifrari di Cesare e di sostituzione. Inoltre esamina il Cifrario di Vernam (One-Time Pad) e discute l'importanza della vera casualità nel raggiungimento della sicurezza digitale."
tags: ["Cryptography", "OTP","Security"]
authors: ["QubiTO Cryptography Group"]
slug: "introduction-classical-cryptography"  
translationKey: "introduction-classical-cryptography"
---
La crittografia è un campo che si è evoluto da una pratica mistica utilizzata da organizzazioni militari o governative, a un campo connesso con la scienza moderna in termini di sicurezza digitale. In particolare, l'esame dei cifrari classici, come il Cifrario di Cesare, rivela perché il campo ha richiesto questa trasformazione rigorosa, soprattutto quando l'implementazione di un attacco è semplice come eseguire un ciclo di 26 passaggi.

Questo articolo spiegherà brevemente i principi fondamentali e l'importanza dei cifrari classici (specializzandosi sul Cifrario di Cesare) e dimostrerà i concetti forniti dal nostro team di studenti che eseguono un attacco di forza bruta.

## Crittografia in generale

La crittografia classica è stata designata per proteggere una comunicazione segreta tra due parti in presenza di una minaccia, possibilmente un intercettatore. I codici progettati per questo scopo sono chiamati schemi di crittografia. In termini di fondamento operativo, questi schemi si basano sull'impostazione della chiave privata (o chiave simmetrica), dove esiste una chiave segreta (\(k\)), condivisa tra entrambe le parti.

Il processo a chiave privata comporta tre algoritmi fondamentali:
* **Generazione della chiave (Gen):** Una procedura per creare la chiave condivisa \(k\). L'insieme di tutte le possibili chiavi forma lo spazio delle chiavi (\(K\)).
* **Crittografia (Enc):** Il mittente utilizza la chiave condivisa \(k\) per "confondere" il testo in chiaro (\(m\)) in un testo cifrato illeggibile (\(c\)): (\(c = Enc(m)\)).
* **Decrittografia (Dec):** Il ricevente utilizza la stessa identica chiave \(k\) per "sconfondere" il testo cifrato e recuperare il testo in chiaro originale (\(m = Dec(c)\)).

### Principio di Kerckhoffs
Per quanto riguarda se gli algoritmi dovrebbero essere mantenuti segreti, Auguste Kerckhoff ha riassunto quello che è ora noto come Principio di Kerckhoffs:

> "Uno schema di crittografia dovrebbe essere progettato per essere sicuro anche se un intercettatore conosce tutti i dettagli dello schema, a condizione che l'attaccante non conosca la chiave utilizzata. La sicurezza deve dipendere unicamente dal segreto della chiave."

## Cifrario di Cesare

Uno dei cifrari più antichi conosciuti è il Cifrario di Cesare (noto anche come Cifrario di Shift). Si basa sullo "spostamento" dell'alfabeto di \(k\) posizioni e quindi richiede solo un numero intero come chiave. Ad esempio, siamo in grado di spostare il nostro alfabeto regolare di 3 posizioni a sinistra:

Alfabeto regolare *(Chiave = 0):*

| A | B | C | D | E | F | G | H | I | J | K | L | M |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| *N* | *O* | *P* | *Q* | *R* | *S* | *T* | *U* | *V* | *W* | *X* | *Y* | *Z* |
| 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 |

Alfabeto spostato *(Chiave = 3):*

| A | B | C | D | E | F | G | H | I | J | K | L | M |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
| *N* | *O* | *P* | *Q* | *R* | *S* | *T* | *U* | *V* | *W* | *X* | *Y* | *Z* |
| 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 0 | 1 | 2 |

Pertanto il nostro testo in chiaro "HELLOWORLD" viene crittografato in "EBIILTLOIA". Utilizzando le 26 lettere dell'alfabeto inglese, si possono creare solo fino a 26 possibili chiavi (da 0 a 25). Questo rende il Cifrario di Cesare non sicuro, poiché il suo schema di crittografia è fisso e quindi può essere violato senza sforzo; anche la forza bruta della soluzione richiede solo un algoritmo di complessità \(O(N)\).

## Cifrario di sostituzione

Il Cifrario di sostituzione mappa ogni simbolo in un determinato insieme con uno diverso nello stesso insieme. Ciò significa che lo spazio delle chiavi utilizzato per crittografare il testo in chiaro è \(N!\) (dove \(N\) è 26 per l'alfabeto inglese). Questo rende un attacco di forza bruta computazionalmente impossibile.

*Esempio:*
* *Testo in chiaro:* TELLHIMABOUTME
* *Testo cifrato:* GDOOKVCXEFLGCD
* *Chiave (mappatura alfabeto):* XEUADNBKVMROCQFSYHWGLZIJPT

È possibile attaccare questo metodo di cifrario confrontando il numero di occorrenze di ogni lettera nel testo cifrato con le frequenze statistiche dell'alfabeto inglese. Il nostro codice implementa una migliore "resistenza agli attacchi", che sfrutta il fatto che la somma dei quadrati delle frequenze delle lettere dell'alfabeto inglese è approssimativamente pari a *0,065*.

## One Time Pad (OTP)

Il one time pad è uno schema di crittografia perfettamente segreto (matematicamente impossibile da violare). Per garantire la segretezza perfetta, richiede:
* Una chiave veramente casuale pre-condivisa lunga quanto il testo in chiaro, utilizzata una sola volta.
* Ogni bit/carattere del testo in chiaro combinato con il bit corrispondente nella chiave.
* La chiave e il messaggio devono essere utilizzati esclusivamente insieme; nessun riutilizzo di chiavi.
* Entrambe le parti comunicanti devono mantenere la chiave assolutamente segreta.

### Min-Entropia e Sicurezza
Se la chiave viene generata male, il cifrario diventa vulnerabile. Utilizziamo la *min-entropia* per misurare l'incertezza rimanente se un attaccante indovina il valore più probabile:

\[H_{\infty}(K) = -\log_2(\max P(K = k))\]

Ad esempio, se un generatore restituisce la chiave 00000000 con probabilità 0,5:
\[H_{\infty}(K) = -\log_2(0,5) = 1\]

Pertanto, sebbene lo spazio delle chiavi sia 256, c'è solo *1 bit di sicurezza effettivo*. Un computer normale non è in grado di fornire valori di chiave accettabili poiché vengono generati deterministicamente.

## Conclusione

L'evoluzione della crittografia classica mira a una comunicazione sicura incentrata sul Principio di Kerckhoffs, che afferma che la sicurezza deve dipendere interamente dal segreto della chiave.

* **Cifrario di Cesare:** Storicamente importante ma non sicuro a causa del suo piccolo spazio di chiavi (26 chiavi).
* **Cifrario di sostituzione:** Migliora significativamente la sicurezza con uno spazio di chiavi di \(N!\) (26!).
* **One-Time Pad (OTP):** Fornisce una perfezione teorica ma può essere poco pratico a causa della gestione delle chiavi.

Di conseguenza, OTP fornisce una perfezione teorica ma può essere poco pratico. Un computer quantistico è in grado di generare i valori di chiave richiesti in modo non deterministico e quindi è in grado di risolvere il problema della min-entropia nella sicurezza digitale.