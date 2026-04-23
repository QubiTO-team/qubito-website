---
title: "Presentazione dei test statistici NIST 800-22 "
weight: 15
date: 2026-04-23
summary: "Una guida al test statistici dei generatori di numeri causali (RNG) e generatori di numeri casuali quantistici (QRNG)."
tags: ["RNG", "QRNG", "NIST", "Security", "Quantum"]
authors: ["QubiTO Cryptography Group"]
slug: "nist-800-22-rng-testing"
translationKey: "nist-800-22-rng-testing"
---

## Introduzione

La generazione di numeri casuali è un passaggio critico in molti compiti legati alla sicurezza. applicazioni come la crittografia, la sicurezza di rete e altre applicazioni di sicurezza informatica. La generazione di numeri casuali quantistici è un metodo. in cui una fonte quantistica viene utilizzata per la generazione di una sequenza casuale di numeri o bit.

La sequenza di numeri casuali o bit generata dall'RNG è comunemente utilizzata. come chiave per i metodi crittografici. L'output di un generatore deve essere imprevedibile al fine di garantire la sicurezza, tutti gli elementi della sequenza devono essere generati indipendentemente l'uno dall'altro e la distribuzione di 0 e 1 deve essere approssimativamente uguale entro la tolleranza.

La NIST Special Publication 800-22 fornisce una guida per testare la distorsione, le correlazioni e i modelli negli RNG. Fornisce 15 test statistici. per testare gli output del generatore rispetto agli standard statistici. Tuttavia, non testa la qualità, la sicurezza e la casualità del generatore. Assumere che un generatore non sia adatto all'uso solo utilizzando un test statistico è una distorsione che dovrebbe essere presa in considerazione. Allo stesso modo, assumere che un generatore sia idoneo per l'applicazione se i test statistici hanno successo è anche di conseguenza, un errore. Test aggiuntivi in circostanze reali devono essere eseguiti al fine di garantire che il generatore sia idoneo per l'applicazione per la quale è destinato nello stesso spirito in cui i sistemi crittografici dovrebbero essere testati in ambienti reali al fine di testare e garantire la sicurezza.

### Una panoramica generale della generazione di numeri casuali

Come specificato prima, un generatore di numeri casuali è una macchina o un programma. o un sistema che genera una sequenza casuale di numeri e bit. Le loro applicazioni sono più importanti negli schemi crittografici al fine di crittografare lo schema utilizzando la sequenza generata dal generatore come chiave. Un generatore di buona qualità deve consistere di elementi statistici. parti indipendenti all'interno della sequenza, essere imprevedibile e deve utilizzare fonti non deterministiche insieme a una funzione di elaborazione al fine di generare una sequenza casuale. L'uso di fonti non deterministiche è particolarmente importante poiché le fonti deterministiche possono essere sottoposte a reverse engineering al fine di acquisire la sequenza, il che comporterebbe il compromesso della sicurezza in un sistema. Il test statistico da descrivere è utile al fine di testare se la sequenza generata è statisticamente casuale. Questo è di particolare interesse poiché un sistema che fisicamente sembra essere casuale quando testato statisticamente potrebbe in realtà essere non casuale.

### Generazione di numeri pseudo casuali

Quando la generazione di una sequenza lunga può essere particolarmente dispendiosa in termini di tempo. l'uso di un generatore di numeri pseudo casuali potrebbe essere preferibile. Un generatore di numeri pseudo casuali (PRNG) è un tipo di generatore che utilizza una piccola sequenza generata da un RNG come input che viene chiamata "seed" e genera una o più sequenze pseudocasuali utilizzando trasformazioni del seed. La pubblicazione NIST afferma che. i PRNG possono sembrare più statisticamente casuali dei RNG, a causa delle trasformazioni applicate al seed, di solito introduce casualità aggiuntiva all'output del PRNG e fornisce migliori proprietà statistiche. Tuttavia, rimangono deterministici e non veramente casuali, tuttavia, possono essere più veloci e più adatti per applicazioni che richiedono una sequenza lunga, poiché la trasformazione del seed casuale può richiedere meno tempo rispetto alla generazione della lunghezza di sequenza desiderata dall'RNG stesso.

### Generazione di numeri casuali quantistici

La generazione di numeri casuali quantistici (QRNG) è un processo in cui un' fonte quantistica non deterministica viene utilizzata per generare una sequenza casuale. Questo particolare metodo di generazione fornisce le proprietà dell'imprevedibilità fondamentale e una fonte di entropia eccellente per la generazione di seed poiché gli effetti e gli stati quantistici sono intrinsecamente imprevedibili come indicato nella fisica quantistica. Questo fornisce un livello aggiuntivo di casualità aggiunto ai seed generati. Questi seed possono essere generati con un computer quantistico (QC). Tuttavia, poiché i QC attualmente non sono tolleranti ai difetti, possono fornire errori negli output che forniscono, che secondo la tolleranza specificata, potrebbe causare il fallimento dei test statistici, poiché i test statistici vengono eseguiti sull'output del QC, non sulla fonte quantistica intrinseca al suo interno, questi errori nell'output del QC possono essere mitigati attraverso algoritmi di correzione quantistica e altri metodi.

## Lo scopo dei test statistici riguardanti le variazioni statistiche dell'RNG

L'applicazione generale e l'uso dei test statistici riguardanti le caratteristiche statistiche degli output del generatore sono di analizzare la qualità degli output generati. Le seguenti descrizioni descrivono ciò che ogni test valuta.

**Test di frequenza (Monobit):** Lo scopo di questo test è vedere la distribuzione di uno e zero in tutta la sequenza di bit generata. Lo stesso numero di zeri e uno sarebbe previsto da un generatore. Questo è perfettamente casuale, data una sequenza sufficientemente lunga. Le frazioni della comparsa per ciascuna dovrebbero essere vicine a ½. Tutti i test successivi sono condizionati dal fatto che hanno superato questo primo test basilare.

**Test di frequenza all'interno di un blocco:** Similmente al test Monobit, questo il test valuta la distribuzione di uno e zero nei blocchi M-bit. Idealmente, la distribuzione di uno e zero sarebbe M/2. Se la dimensione del blocco M=1, il test degenera nel test Monobit.

**Test di esecuzione:** Questo test valuta le esecuzioni nel test, che è la sequenza più lunga di uno o zero continui. Un'esecuzione di lunghezza *k* consiste in esattamente *k* bit identici ed è limitata prima e dopo con un bit del valore opposto. Una sequenza casuale avrebbe esecuzioni di uno e zero, ma lo scopo principale del test è la valutazione della velocità di oscillazione tra zero e uno troppo veloce o troppo lenta, il che in entrambi i casi produrrebbe distorsione.

**Test per l'esecuzione più lunga di uno in un blocco:** Questo test valuta l'esecuzione più lunga di uno all'interno di blocchi M-bit. Lo scopo di questo test è determinare se la lunghezza dell'esecuzione più lunga di uno all'interno della sequenza testata è coerente con la lunghezza dell'esecuzione più lunga di uno. Che ci si aspetterebbe in una sequenza casuale. Intuitivamente, l'irregolarità nell'esecuzione più lunga di uno indicherebbe anche un'irregolarità nella lunghezza dell'esecuzione più lunga di zero. Questo risulta in solo un test singolare è necessario.

**Test di rango della matrice binaria:** L'attenzione del test è il rango di sottomatrici disgiunte dell'intera sequenza. Lo scopo di questo test è verificare la dipendenza lineare tra sottostringhe di lunghezza fissa della sequenza originale.

**Test della trasformata discreta di Fourier (spettrale):** Questo test si concentra sulle altezze dei picchi nella trasformata discreta di Fourier della sequenza. Il test rileva i guasti periodici nella sequenza, che mostrerebbero una differenza dall'assunzione di casualità. L'intenzione è rilevare se il numero di picchi che superano la soglia del 95% è significativamente diverso dal 5%.

**Test di corrispondenza di modelli non sovrapposti:** L'attenzione di questo test è il numero di occorrenze di stringhe di destinazione pre-specificate. Questo test è un rilevatore per i generatori che producono un modello aperiodico sopra il Tolleranza data. Per questo test e per il test di corrispondenza di modelli sovrapposti della sezione 2.8, viene utilizzata una finestra *m*-bit per cercare uno specifico modello m-bit. Se il modello *non* viene trovato, la finestra scorre di un bit. posizione. Se il modello viene trovato, la finestra viene ripristinata al bit dopo il modello trovato, e la ricerca riprende.

**Test di corrispondenza di modelli sovrapposti:** Il test di corrispondenza di modelli sovrapposti testa il numero di apparizioni di stringhe di destinazione pre-specificate. Questo test insieme al test di corrispondenza di modelli non sovrapposti utilizza una finestra m-bit per cercare il modello m-bit dato. Se il modello non viene trovato, la finestra scorre di una posizione di bit. Quando il modello viene trovato, la finestra scorre di un solo bit prima di riprendere la ricerca.

**Test statistico universale di Maurer:** L'attenzione di questo test è il numero di bit tra modelli corrispondenti (una misura correlata alla lunghezza di una sequenza compressa. Il test controlla la compressione. capacità della sequenza senza perdita di informazioni. Una sequenza che può essere compressa significativamente è da considerarsi non casuale.

**Test di complessità lineare:** L'attenzione di questo test è la lunghezza di un registro di scorrimento retroazionato lineare (LFSR). Il test valuta la complessità. della sequenza poiché una sequenza non sufficientemente complessa potrebbe non essere considerata casuale. Gli LFSR più lunghi implicano casualità, mentre quelli più corti no. implicano non casualità.

**Test seriale:** L'attenzione di questo test è la frequenza di tutti i possibili modelli *m*-bit sovrapposti in tutta la sequenza. 2\^m modelli m-bit sovrapposti approssimativamente uguali è quanto previsto da una sequenza casuale, che il test in questione valuta. Le sequenze casuali sono uniformi, ogni modello *m*-bit ha la stessa possibilità di apparire di ogni altro modello *m*-bit. Quando m=1, il test seriale è lo stesso del test di frequenza.

**Test di entropia approssimativa:** Simile al test seriale, l'attenzione di questo test è la frequenza di tutti i possibili modelli m-bit sovrapposti. in tutta la sequenza. Il test confronta la frequenza di blocchi sovrapposti di due lunghezze adiacenti/consecutive (m e m+1) con il risultato previsto di una sequenza casuale.

**Test di somme cumulative (Cusum):** L'attenzione di questo test è l'escursione massima (da zero) della passeggiata casuale definita dalla somma cumulativa di cifre regolate (-1, +1) nella sequenza. Il test determina se la somma cumulativa della sequenza parziale che si verifica nella sequenza testata è troppo grande o piccola rispetto al comportamento previsto della somma cumulativa per sequenze casuali. La somma cumulativa può essere presa. come una passeggiata casuale. Per sequenze casuali, l'escursione della passeggiata casuale dovrebbe essere vicina a zero, mentre per alcuni tipi di sequenze non casuali, l'escursione di questa passeggiata casuale da zero sarà grande.

**Test di escursioni casuali:** L'attenzione di questo test è il numero di cicli con esattamente *K* visite in una passeggiata casuale di somma cumulativa. La passeggiata casuale di somma cumulativa è derivata dalle somme parziali dopo che la sequenza (0,1) viene trasferita alla sequenza (-1, +1) appropriata. Un ciclo di una passeggiata casuale consiste in una sequenza di passi di lunghezza unitaria presi a caso che inizia e ritorna all'origine. Lo scopo di questo test è determinare se il numero di visite a uno stato particolare all'interno di un ciclo si discosta da ciò che ci si aspetterebbe per una sequenza casuale. Questo test è in realtà una serie di otto test (e conclusioni), un test e una conclusione per ciascuno degli stati: -4, -3, -2, -1, e +1, +2, +3, +4.

**Test di variante di escursioni casuali:** L'attenzione di questo test è il numero totale di volte in cui uno stato particolare viene visitato (cioè, si verifica) in una passeggiata casuale di somma cumulativa. Lo scopo di questo test è rilevare deviazioni dal numero previsto di visite a vari stati nella passeggiata casuale. Questo test è in realtà una serie di diciotto test (e conclusioni), un test e una conclusione per ciascuno degli stati: -9, -8, ..., -1 e +1, +2, ..., +9.

### Strategia di test e implementazione dei risultati statistici:

Il testing e l'implementazione dei dati statistici potrebbe essere fatto secondo la seguente pipeline.

1\. Selezione di un generatore: Un generatore basato su software o hardware potrebbe essere implementato, il generatore deve produrre una sequenza binaria di lunghezza n di 0 e 1.

2\. Generazione di una sequenza binaria: Per una sequenza fissa di lunghezza n, il generatore preselezionato, costruisci un insieme di m sequenze binarie, salvando i risultati in un file.

3\. Esecuzione della suite di test statistici: Richiamare la suite di test statistici NIST utilizzando il file generato che contiene la sequenza binaria. Selezionare i test statistici e i parametri di input pertinenti da testare.

4\. Esame dei valori P: Un file di output sarà generato dalla suite di test e avrà un elenco di valori P per ogni test statistico eseguito. In base a questo elenco di valori P, può essere effettuata un'analisi della qualità del generatore.

5\. Assegnazione della designazione Pass o Fail ai test: Per un livello di significatività fisso, una certa percentuale dei valori P dovrebbe indicare il fallimento. Ad esempio, se il livello di significatività scelto è ritenuto pari a 0,01 (\(\alpha = 0.01\)) allora il 1% delle sequenze dovrebbe fallire. Una sequenza supera con successo il test statistico quando il valore P è maggiore del livello di significatività scelto e fallisce diversamente. Per ogni test statistico, la proporzione di sequenze che passano è calcolata e analizzata di conseguenza. Dovrebbe essere eseguita un'analisi più approfondita utilizzando metodi statistici aggiuntivi. procedure.

### Interpretazione dei risultati empirici ottenuti dopo il test:

Ci sono tre scenari disponibili da considerare dopo che il test è stato completato, e i risultati dalla suite statistica sono stati registrati.

Caso 1: L'analisi dei *valori P* mostra una deviazione dalla casualità.

Caso 2: L'analisi indica chiaramente una deviazione dalla casualità.

Caso 3: L'analisi è inconcludente.

L'interpretazione dei risultati empirici può essere fatta in diversi modi. Il NIST ha adottato quanto segue:

\(1\) l'esame della proporzione di sequenze che superano un test statistico e

\(2\) la distribuzione dei *valori P* per controllare l'uniformità.

Se uno degli approcci dati fallisce, dovrebbero essere condotti ulteriori esperimenti numerici su diversi campioni del generatore al fine di determinare se il fenomeno era un'anomalia statistica o una chiara evidenza di non casualità.

### Proporzione di sequenze che superano un test

Dati i risultati empirici da un test, la proporzione di test che sono ritenuti superati o falliti è determinata tenendo in considerazione l'intervallo di confidenza scelto e calcolato secondo la formula:

\[\hat{p} \pm 3 \sqrt{\frac{\hat{p}(1 - \hat{p})}{m}}\]

Dove \(\hat{p} = 1 - \alpha\).

L'intervallo di proporzioni accettabili è determinato utilizzando l'intervallo di confidenza definito sopra.

Se la proporzione cade al di fuori di questo intervallo, allora c'è evidenza che i dati non sono casuali. Potrebbero anche essere utilizzati altri valori di deviazione standard.

**Distribuzione uniforme dei *valori P:***

***La distribuzione dei valori P viene esaminata per assicurare uniformità.*** L'uniformità può anche essere determinata tramite l'applicazione di un test \(\chi^2\) e la determinazione di un *valore P* corrispondente al test di adattamento distribuzionale sulla bontà su i *valori P* ottenuti per un test statistico arbitrario.

\[\chi^2 = \sum_{i=1}^{10} \frac{(F_i - S/10)^2}{S/10}\]

**Raccomandazioni generali e linee guida per i test:**

**Un test statistico programmato erroneamente:** Poiché il codice per ogni test è stato creato per un particolare tipo di problema, presentano la selezione di parametri da effettuare per i test; tuttavia, questo non significa che il programma sia facile da creare.**

**Un test statistico sottosviluppato (immaturo):** Ci sono casi in cui** la teoria della probabilità o della complessità non si è sviluppata sufficientemente per poter analizzare rigorosamente un test statistico. Poiché molti test statistici si basano su approssimazioni asintotiche, dovrebbe essere effettuato un lavoro dettagliato al fine di poter determinare quanto buona sia un'approssimazione.

**Routine matematiche scadenti per il calcolo dei valori P:** Deve essere utilizzato software matematico di qualità per garantire eccellenti approssimazioni quando possibile. In particolare, la funzione gamma incompleta è più difficile. da approssimare per valori più grandi della costante *a*. Alla fine, le formule dei *valori P* produrranno valori falsi a causa di difficoltà derivanti da approssimazioni numeriche. La pubblicazione NIST include anche valori consigliati per i parametri.

**Scelte non corrette per i parametri di input:** In condizioni di vita reale,** un test statistico non fornirà risultati affidabili per tutti i parametri di input apparentemente validi. I vincoli imposti ai test vengono fatti su un test. su un test base, quindi i test statistici sono sensibili ai parametri di input. Le considerazioni devono spesso essere fatte riguardanti i parametri di input della sperimentazione numerica, vale a dire: lunghezza della sequenza, dimensione del campione, dimensione del blocco e modello.