---
title: "Correzione degli Errori Quantistici"
weight: 13
draft: false
date: 2025-04-17
showDescription: true
showSummary: true
description: "Correzione degli Errori Quantistici description"
summary: "Utilizzando tecniche come i codici di ripetizione e il codice di Shor a 9 qubit, la correzione degli errori quantistici consente un calcolo quantistico affidabile proteggendo i qubit da errori di bit-flip, phase-flip e errori arbitrari."
tags: ["QEC", "Qiskit"]
# series: ["Introduzione alla Correzione degli Errori Quantistici-IT"]
# series_order: 1
showAuthor: true
showCategory: true
authors: ["Quantino 1","Quantino 2"]
categories: ["Correzione degli Errori Quantistici"]
slug: "correzione-errori-quantistici"
translationKey: "correcting-quantum-errors"
---

La correzione degli errori quantistici è un quadro critico per superare la fragilità intrinseca dell'informazione quantistica, suscettibile alla decoerenza e alle inesattezze operative. Questo articolo esplora tecniche fondamentali per proteggere gli stati quantistici dagli errori, partendo dai codici di ripetizione classici e dalla loro estensione ai sistemi quantistici. Discutiamo i processi di codifica e decodifica per i qubit, concentrandoci sul rilevamento e la correzione degli errori di bit-flip e phase-flip utilizzando codici di ripetizione modificati.

Al centro di questo lavoro c'è l'analisi del codice di Shor a 9 qubit, che integra sia la correzione degli errori di bit-flip che di phase-flip. Dimostriamo come i gate CNOT (controlled-NOT) facilitino il rilevamento e la correzione degli errori, permettendo robustezza contro errori simultanei di bit-flip e phase-flip, nonché contro il rumore casuale. Inoltre, stabiliamo il principio della discretizzazione degli errori, mostrando come errori arbitrari sui qubit possano essere ridotti a un insieme finito di operazioni correggibili. Generalizzando questi concetti, forniamo una base per la correzione degli errori quantistici scalabile, essenziale per un calcolo quantistico affidabile su larga scala.

# Codici di Ripetizione Classici
Il rumore è una sfida fondamentale nei sistemi di elaborazione dell'informazione. Molti sistemi classici riescono a evitare completamente il rumore, mentre altri devono utilizzare codici di correzione degli errori per proteggersi dagli effetti del rumore. L'idea chiave è la ridondanza: codificando i messaggi con informazioni aggiuntive, gli errori possono essere rilevati e corretti anche se parte dei dati è corrotta. I codici di ripetizione sono esempi estremamente basilari di codici di correzione degli errori.

## Procedure di Codifica e Decodifica

L'idea centrale è proteggere un bit dagli errori ripetendolo più volte. Consideriamo il codice di ripetizione a 3 bit, dove un singolo bit è codificato come tre bit identici. $$0 \mapsto 000$$ $$1 \mapsto 111$$ In assenza di errori, il bit originale può essere decodificato trivialmente. Tuttavia, anche se un bit si inverte, il valore originale può ancora essere recuperato mediante voto a maggioranza: il decodificatore restituisce il valore che appare più frequentemente. $$abc \mapsto maggioranza(a,b,c)$$ Questo corregge gli errori a singolo bit in modo affidabile.

Naturalmente, se 2 o 3 bit della codifica si invertono, la decodifica non funzionerà correttamente e verrà recuperato il bit sbagliato, ma se al massimo 1 dei 3 bit si inverte, la decodifica sarà corretta. Questo mostra un concetto centrale nella correzione degli errori: il compromesso tra ridondanza e robustezza.

## Analisi degli Errori nei Canali Binari Simmetrici

Come esempio, supponiamo di voler comunicare un singolo bit a un ipotetico ricevitore attraverso un canale rumoroso classico. L'effetto del rumore nel canale è quello di invertire un bit trasmesso con probabilità $p$, mentre con probabilità $1-p$ il bit è trasmesso correttamente. Un tale canale è noto come *canale binario simmetrico*, che inverte ogni bit inviato in modo indipendente.

In questo contesto, se scegliamo di non utilizzare alcun codice di correzione degli errori e inviamo semplicemente il bit attraverso il canale, il ricevitore riceverà il bit sbagliato con probabilità $p$.

D'altra parte, se prima utilizziamo il codice di ripetizione a 3 bit per codificare il bit e poi inviamo ciascuno dei tre bit risultanti attraverso il canale, ognuno di essi si invertirà indipendentemente con probabilità $p$. Il ricevitore decodificherà correttamente solo se al massimo un bit si inverte durante la comunicazione. Quindi la probabilità di un errore dopo la decodifica corrisponde alla probabilità che due o tutti e tre i bit si invertano durante la trasmissione. La probabilità totale di un errore è quindi $$3p^2(1-p)+p^3 = 3p^2-2p^3.$$

![Errore Binario
Simmetrico](binary-symmetric-error.png)
Come si può vedere nella figura, quando la probabilità di errore $p$ è inferiore a $1/2$, il codice di ripetizione riduce efficacemente la possibilità che il ricevitore ottenga un bit errato. Al contrario, se $p$ supera $1/2$, il codice amplifica la probabilità di errori di decodifica piuttosto che correggerli.

# Codici di Ripetizione Quantistici per Qubit

## Codifica degli Stati Quantistici

## Rilevamento e Correzione degli Errori di Bit-Flip

## Gestione degli Errori di Phase-Flip

## Codice di Ripetizione Modificato per la Mitigazione degli Errori di Phase-Flip

# Il Codice di Shor a 9 Qubit

## Struttura del Codice e Codifica

## Propagazione degli Errori e Operazioni con i Gate CNOT

## Correzione degli Errori di Bit-Flip

## Correzione degli Errori di Phase-Flip

## Correzione Simultanea di Errori di Bit-Flip e Phase-Flip

## Robustezza contro Errori Casuali

# Discretizzazione degli Errori nei Sistemi Quantistici

Il codice di Shor a 9 qubit corregge errori quantistici arbitrari—non solo errori $X$ o $Z$—sfruttando la sua capacità di correggere separatamente gli errori $X$ e $Z$. Questo funziona perché qualsiasi possibile errore su un singolo qubit può essere scomposto in una combinazione di $X$, $Z$ o entrambi (una proprietà nota come *discretizzazione degli errori*). Poiché il codice rileva e corregge gli errori $X$ e $Z$ indipendentemente, gestisce implicitamente anche tutti gli altri errori. Pertanto, non sono necessari meccanismi aggiuntivi: correggere $X$ e $Z$ è sufficiente per proteggersi da qualsiasi rumore quantistico arbitrario. Prima ci concentriamo sugli Errori Unitari.

## Modellazione degli Errori Unitari sui Qubit

Il codice di Shor a 9 qubit può correggere *qualsiasi* errore unitario su un singolo qubit, anche quelli che non sono vicini all'identità (ad esempio, rotazioni piccole o operazioni unitarie arbitrarie). Sebbene possa sembrare difficile correggere un numero infinito di possibili errori, l'idea chiave è che qualsiasi operatore unitario $U$ su un singolo qubit può essere scomposto in una combinazione lineare di operatori di Pauli: $$U = \alpha I + \beta X + \gamma Y + \delta Z$$ dove $Y = iXZ$.

Quando si verifica un errore $U_k$ sul $k$-esimo qubit, lo stato corrotto diventa una sovrapposizione dello stato originale e di stati con errori $X_k$, $Z_k$ o $X_kZ_k$. Durante il rilevamento degli errori, le misurazioni della sindrome collassano probabilisticamente questa sovrapposizione in uno dei casi di errore di Pauli (o nessun errore), con probabilità $|\alpha|^2$, $|\beta|^2$, $|\gamma|^2$ e $|\delta|^2$. La sindrome rivale quale errore si è verificato, permettendone la correzione. Sorprendentemente, questo processo funziona anche per errori molto piccoli, poiché le misurazioni della sindrome discretizzano l'errore in un'operazione di Pauli, che il codice è progettato per correggere. Dopo la correzione, il sistema ritorna allo stato codificato originale, rimuovendo efficacemente l'entropia introdotta dall'errore. Questo dimostra la *discretizzazione degli errori*: errori unitari arbitrari sono ridotti a errori di Pauli correggibili attraverso la misurazione della sindrome.

Il codice di Shor a 9 qubit corregge errori unitari arbitrari attraverso la discretizzazione degli errori. Per errori su più qubit, rappresentiamo formalmente le operazioni utilizzando prodotti tensoriali con matrici identità. Utilizzando la numerazione dei qubit di Qiskit $(Q_8,Q_7,...,Q_0)$, le operazioni su singolo qubit si estendono allo spazio a 9 qubit come:

$$\begin{aligned}
X_0 &= I^{\otimes 8} \otimes X = I\otimes I\otimes I\otimes I\otimes I\otimes I\otimes I\otimes I\otimes X\\
Z_4 &= I^{\otimes 4} \otimes Z \otimes I^{\otimes 4}=I\otimes I\otimes I\otimes I\otimes Z \otimes I\otimes I\otimes I\otimes I \\
U_7 &= I \otimes U \otimes I^{\otimes 7} =I\otimes U\otimes I\otimes I\otimes I\otimes I\otimes I\otimes I\otimes I
\end{aligned}$$

dove $I^{\otimes n}$ denota un prodotto tensoriale $n$-fold di matrici identità. Un errore unitario arbitrario $U_k$ sul qubit $k$ si scompone in operatori di Pauli come:
$$U_k = \alpha I^{\otimes 9} + \beta X_k + \gamma Y_k + \delta Z_k$$

con $X_k$, $Z_k$ definiti in modo simile a (1), e $Y_k = iX_kZ_k$. Per errori multipli, il formalismo si estende naturalmente:
$$U_{j,k} = (I^{\otimes (8-j)} \otimes U_j \otimes I^{\otimes j}) \cdot (I^{\otimes (8-k)} \otimes U_k \otimes I^{\otimes k})$$

La misurazione della sindrome proietta questi errori continui su operatori di Pauli discreti. Ad esempio, un errore su due qubit $U_{2,5}$ collasserebbe in uno tra $I$, $X_2$, $Z_5$, $X_2Z_5$, ecc., con probabilità determinate dai coefficienti di scomposizione. La struttura del prodotto tensoriale garantisce l'identificazione corretta dei qubit interessati attraverso il pattern della sindrome. $$\xi \otimes |\psi\rangle\langle\psi|$$

dove

$$\begin{aligned}
\xi &= |\alpha|^2 |I \text{ syndrome}\rangle\langle I \text{ syndrome}| \\
      &+ |\beta|^2 |X_k \text{ syndrome}\rangle\langle X_k \text{ syndrome}| \\
      &+ |\gamma|^2 |X_k Z_k \text{ syndrome}\rangle\langle X_k Z_k \text{ syndrome}| \\
      &+ |\delta|^2 |Z_k \text{ syndrome}\rangle\langle Z_k \text{ syndrome}|.
\end{aligned}$$

## Errori Arbitrari Generali sui Qubit

Esaminiamo ora errori arbitrari (non necessariamente unitari) sui qubit. In particolare, modelliamo l'errore utilizzando un canale quantistico generale $\Phi$, che potrebbe rappresentare vari processi di rumore—come dephasing, depolarizzazione, operazioni di reset o persino canali meno studiati e non convenzionali.

Per analizzare $\Phi$, lo esprimiamo prima in termini di operatori di Kraus:

$$\Phi(\sigma) = \sum_j A_j \sigma A_j^\dagger,$$

dove ogni $A_j$ è una matrice $2 \times 2$. Poiché le matrici di Pauli formano una base per tali operatori, espandiamo ciascun $A_j$ come:

$$A_j = \alpha_j I + \beta_j X + \gamma_j Y + \delta_j Z.$$

Questa scomposizione ci permette di riscrivere l'azione di $\Phi$ su un qubit target $k$ in termini di errori di Pauli:

$$\begin{aligned}
\Phi_k \big( |\psi\rangle\langle\psi| \big) &= \sum_j \big( \alpha_j I_k + \beta_j X_k + \gamma_j Y_k + \delta_j Z_k \big) |\psi\rangle\langle\psi| \big( \alpha_j I_k + \beta_j X_k + \gamma_j Y_k + \delta_j Z_k \big)^\dagger.
\end{aligned}$$

In sostanza, abbiamo riformulato gli operatori di Kraus come combinazioni lineari di termini di Pauli.

Misurando la sindrome dell'errore e applicando la correzione appropriata, lo stato risultante assomiglia al caso dell'errore unitario, sebbene con una miscela più complessa:

$$\xi \otimes |\psi\rangle\langle\psi|,$$

dove $\xi$ ora incorpora contributi da tutti i termini di Kraus:

$$\begin{aligned}
\xi = \sum_j \Big( |\alpha_j|^2 |I \text{ syndrome}\rangle\langle I \text{ syndrome}|
\quad + |\beta_j|^2 |X_k \text{ syndrome}\rangle\langle X_k \text{ syndrome}|
\quad + |\gamma_j|^2 |X_k Z_k \text{ syndrome}\rangle\langle X_k Z_k \text{ syndrome}|
\quad + |\delta_j|^2 |Z_k \text{ syndrome}\rangle\langle Z_k \text{ syndrome}| \Big).
\end{aligned}$$

Sebbene la derivazione esplicita coinvolga più termini, il principio sottostante rimane identico allo scenario unitario: l'estrazione della sindrome e la correzione proiettano l'errore in componenti di Pauli distinguibili.

## Estensioni e Generalizzazioni

La discretizzazione degli errori si estende naturalmente a codici quantistici di correzione degli errori più generali, inclusi quelli in grado di rilevare e correggere errori su più qubit. In tali scenari, errori su più qubit possono essere rappresentati come prodotti tensoriali di matrici di Pauli:
$$E = \bigotimes_{k=1}^n P_k \quad \text{dove} \quad P_k \in \{I, X, Y, Z\},$$
e sindromi distinte identificano corrispondenti correzioni di Pauli che potrebbero dover essere applicate a più qubit simultaneamente, piuttosto che a un singolo qubit.

Attraverso la misurazione della sindrome, gli errori sono efficacemente proiettati su un insieme discreto di possibilità caratterizzate da questi prodotti tensoriali di Pauli. Applicando le opportune correzioni, possiamo recuperare lo stato codificato originale. La casualità introdotta durante questo processo è confinata ai qubit di sindrome, che successivamente vengono scartati o resettati. Questo meccanismo rimuove efficacemente la casualità generata dal sistema contenente l'informazione codificata, preservando l'integrità del calcolo quantistico.

Il principio fondamentale rimane coerente con il caso a singolo qubit: la correzione degli errori procede attraverso

1.  Identificazione delle sindromi degli errori mediante misurazione,

2.  Determinazione delle corrispondenti correzioni di Pauli, e

3.  Isolamento della casualità nei qubit ausiliari che vengono poi rimossi dal sistema.

Questo approccio mantiene le caratteristiche essenziali della correzione degli errori quantistici mentre si adatta a pattern di errori più complessi e su più qubit.