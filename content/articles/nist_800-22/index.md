---
title: "Panoramica dei Test Statistici NIST 800-22"
weight: 15
date: 2026-04-23
summary: "Una guida generalizzata per testare i generatori di numeri casuali (RNG)"
tags: ["RNG", "QRNG", "NIST", "Sicurezza"]
authors: ["QubiTO Cryptography Group"]
slug: "nist-800-22-rng-testing"
translationKey: "nist-800-22-rng-testing"
---

##  Introduzione

La generazione di numeri casuali è un passaggio critico in molte attività e
applicazioni legate alla sicurezza, come la crittografia, la sicurezza di rete e altre
applicazioni di cybersecurity. La generazione quantistica di numeri casuali è un metodo
in cui una sorgente quantistica viene utilizzata per la generazione di una sequenza casuale
di numeri o bit.

La sequenza di numeri o bit generata dall'RNG è comunemente utilizzata
come chiave per metodi crittografici. L'output di un generatore deve essere imprevedibile per garantire la sicurezza; tutti gli elementi della sequenza devono essere generati indipendentemente tra loro, e la distribuzione di 0 e 1 deve essere approssimativamente uguale entro una certa tolleranza.

La pubblicazione speciale NIST 800-22 fornisce una guida per testare
bias, correlazioni e pattern negli RNG. Fornisce 15 test statistici
per verificare gli output del generatore rispetto a standard statistici.
Tuttavia, non testa la qualità, la sicurezza e la casualità del
generatore. Supporre che un generatore non sia adatto all'uso basandosi solo
su un test statistico è un bias che deve essere preso in considerazione.
Allo stesso modo, assumere che un generatore sia adatto
all'applicazione se i test statistici hanno successo è
conseguentemente un errore. Devono essere eseguiti ulteriori test
al fine di garantire che il generatore sia adatto all'applicazione
per cui è destinato, nello stesso spirito in cui gli schemi crittografici dovrebbero
essere testati in ambienti reali al fine di verificare e garantire la sicurezza.

###  Una Panoramica Generale della Generazione di Numeri Casuali

Come specificato in precedenza, un generatore di numeri casuali è una macchina, un programma,
o un sistema che genera una sequenza casuale di numeri e bit. Le loro
applicazioni sono più evidenti negli schemi crittografici al fine di
cifrare lo schema utilizzando la sequenza generata dal generatore come
chiave. Un generatore di buona qualità deve essere composto da elementi statistici,
parti indipendenti all'interno della sequenza, essere imprevedibile, e deve utilizzare
sorgenti non deterministiche insieme a una funzione di elaborazione al fine di
generare una sequenza casuale. L'uso di sorgenti non deterministiche è
particolarmente importante, poiché le sorgenti deterministiche possono essere ingegnerizzate al contrario
al fine di acquisire la sequenza, il che comprometterebbe la sicurezza in un sistema.
Il test statistico che verrà delineato è utile al fine di verificare
se la sequenza generata è statisticamente casuale. Questo è di particolare interesse, poiché
un sistema che appare fisicamente casuale quando testato
statisticamente può in realtà essere non casuale.

### Generazione Pseudo-Casuale di Numeri

Quando la generazione di una lunga sequenza può risultare particolarmente dispendiosa in termini di tempo,
l'uso di un generatore di numeri pseudo-casuali può essere
preferibile. Un generatore di numeri pseudo-casuali (PRNG) è un tipo di
generatore che utilizza una piccola sequenza generata da un RNG come input,
che viene chiamata "seed", e genera una o più sequenze pseudocasuali
utilizzando trasformazioni del seed. La pubblicazione NIST afferma che
i PRNG possono apparire più casuali statisticamente rispetto agli RNG; a causa delle trasformazioni
applicate al seed, di solito introducono ulteriore casualità nell'output
del PRNG e forniscono migliori proprietà statistiche. Tuttavia,
sono ancora deterministici e non veramente casuali; tuttavia, possono
essere più veloci e più adatti per applicazioni che richiedono una lunga
sequenza, poiché la trasformazione del seed può richiedere meno tempo rispetto
alla generazione della lunghezza di sequenza desiderata direttamente dall'RNG stesso.

###  Generazione Quantistica di Numeri Casuali

La generazione quantistica di numeri casuali (QRNG) è un processo in cui una
sorgente quantistica non deterministica viene utilizzata per generare una sequenza casuale.
Questo particolare metodo di generazione fornisce le proprietà di
imprevedibilità fondamentale e una fonte di entropia che è ben adatta
per la generazione di seed, poiché gli effetti e gli stati quantistici sono intrinsecamente
imprevedibili, come delineato nella fisica quantistica. Questo fornisce un livello più elevato di casualità aggiunta ai seed generati. Questi seed possono essere generati con un computer quantistico (QC). Tuttavia, poiché i QC attualmente non sono tolleranti agli errori,
possono fornire errori negli output che producono, che,
secondo la tolleranza specificata, possono causare il fallimento dei test statistici,
poiché i test statistici vengono eseguiti sull'output del QC, non sulla
sorgente quantistica intrinseca al suo interno. Questi errori nell'output del QC possono
essere mitigati tramite algoritmi di correzione quantistica e altri metodi.

##  Lo Scopo dei Test Statistici riguardanti le Variazioni Statistiche degli RNG

L'applicazione generale e l'uso dei test statistici riguardanti le
caratteristiche statistiche degli output del generatore è quello di
analizzare la qualità degli output generati. Le seguenti descrizioni
delineano ciò che ciascun test valuta.

**Frequency (Monobit) Test:** Lo scopo di questo test è osservare la
distribuzione di uno e zero lungo tutta la sequenza di bit generata.
La stessa quantità di zero e uno sarebbe attesa da un generatore che è perfettamente casuale, data una sequenza sufficientemente lunga. Le frazioni di apparizione per ciascuno dovrebbero essere vicine a ½. Tutti i test successivi sono condizionati all'aver superato questo primo test di base.

**Frequency Test within a Block:** Analogamente al test Monobit, questo
test valuta la distribuzione di uno e zero in blocchi di *M* bit. Idealmente, la distribuzione di uno e zero sarebbe *M*/2. Se la dimensione del blocco
*M=1*, il test degenera nel test Monobit.

**Runs Test:** Questo test valuta le runs nella sequenza, che rappresentano la
sequenza più lunga di uno o zero continui. Una run di lunghezza *k*
consiste esattamente in *k* bit identici ed è delimitata prima e dopo
da un bit di valore opposto. Una sequenza casuale presenterebbe run di
uno e zero, ma lo scopo principale del test è la valutazione della
velocità di oscillazione tra zero e uno, che se troppo veloce o troppo lenta,
in entrambi i casi produrrebbe bias.

**Test for the Longest Run of Ones in a Block:** Questo test valuta la
run più lunga di uno all'interno di blocchi di *M* bit. Lo scopo di questo test è
determinare se la lunghezza della run più lunga di uno all'interno della sequenza testata è coerente con la lunghezza della run più lunga di uno che sarebbe attesa in una sequenza casuale. Intuitivamente,
l'irregolarità nella run più lunga di uno indicherebbe anche un'irregolarità nella lunghezza della run più lunga di zero. Questo comporta che sia necessario un solo test.

**Binary Matrix Rank Test:** Il focus del test è il rango di
sotto-matrici disgiunte dell'intera sequenza. Lo scopo di questo test è verificare la dipendenza lineare tra sottostringhe di lunghezza fissa della sequenza originale.

**Discrete Fourier Transform (Spectral) Test:** Questo test si concentra sulle
altezze dei picchi nella Trasformata Discreta di Fourier della sequenza. Il
test rileva fallimenti periodici nella sequenza, che mostrerebbero una
deviazione dall'assunzione di casualità. L'intenzione è
rilevare se il numero di picchi che superano la soglia del 95% è
significativamente diverso dal 5%.

**Non-overlapping Template Matching Test:** Il focus di questo test è
il numero di occorrenze di stringhe target predefinite. Questo test è
un rilevatore per generatori che producono un pattern aperiodico al di sopra della
tolleranza data. Per questo test e per il test Overlapping Template Matching
della Sezione 2.8 all'interno della suite, una finestra di *m* bit viene utilizzata per cercare uno specifico
pattern di *m* bit. Se il pattern non viene trovato, la finestra si sposta di un bit. Se il pattern viene trovato, la finestra viene reimpostata al bit successivo al pattern trovato, e la ricerca riprende.

**Overlapping Template Matching Test:** Il test Overlapping Template Matching
verifica il numero di apparizioni di stringhe target predefinite. Questo
test, insieme al Non-overlapping Template Matching test, utilizza una
finestra di *m* bit per cercare il pattern di *m* bit dato. Se il pattern non viene
trovato, la finestra si sposta di un bit. Quando il pattern viene trovato,
la finestra si sposta di un solo bit prima di riprendere la ricerca.

**Maurer's "Universal Statistical" Test:** Il focus di questo test è il
numero di bit tra pattern corrispondenti (una misura che è correlata alla lunghezza di una sequenza compressa). Il test verifica la capacità di compressione della sequenza senza perdita di informazione. Una sequenza
che può essere compressa significativamente deve essere considerata non casuale.

**Linear Complexity Test:** Il focus di questo test è la lunghezza di un
registro a scorrimento con retroazione lineare (LFSR), che trova la formula più breve possibile per rigenerare la sequenza. Il test valuta la complessità
della sequenza, poiché una sequenza che non è sufficientemente complessa potrebbe non essere considerata casuale. LFSR più lunghi implicano casualità, mentre quelli più corti implicano non casualità, poiché se la sequenza è veramente casuale, la formula più breve sarà quasi lunga quanto la sequenza stessa, mentre formule più corte possono essere prevedibili. Questo specifico test è indicato come il più dispendioso in termini di tempo nella suite NIST, il che dovrebbe essere preso in considerazione.

**Serial Test:** Il focus di questo test è la frequenza di tutti i possibili
pattern sovrapposti di *m* bit lungo l'intera sequenza. 2^*m* pattern sovrapposti di *m* bit
approssimativamente uguali sono attesi in una sequenza casuale, cosa che il test in questione valuta. Le sequenze casuali
sono uniformi; ogni pattern di *m* bit ha la stessa probabilità di apparire come
ogni altro pattern di *m* bit. Quando m=1, il test Serial è equivalente al
Frequency Test.

**Approximate Entropy Test:** Analogamente al test Serial, il focus di
questo test è la frequenza di tutti i possibili pattern sovrapposti di *m* bit
lungo l'intera sequenza. Il test confronta la frequenza di
blocchi sovrapposti di due lunghezze adiacenti/consecutive (*m* e *m+1*) con il
risultato atteso di una sequenza casuale.

**Cumulative Sums (Cusum) Test:** Il focus di questo test è la massima
escursione (da zero) del random walk definito dalla somma cumulativa
delle cifre aggiustate (*-1*, *+1*) nella sequenza. Il test determina se
la somma cumulativa della sequenza parziale che si verifica nella sequenza testata è troppo grande o troppo piccola rispetto al comportamento atteso della somma cumulativa per sequenze casuali. La somma cumulativa può essere considerata
come un random walk. Per sequenze casuali, l'escursione del random walk
dovrebbe essere vicina a zero, mentre, in certi tipi di sequenze non casuali,
l'escursione da zero sarà grande.

**Random Excursions Test:** Il focus di questo test è il numero di
cicli che hanno esattamente *K* visite in un random walk della somma cumulativa. Il
random walk della somma cumulativa è derivato dalle somme parziali dopo che la sequenza (0,1)
è stata trasformata nella corrispondente sequenza (*-1, +1*). Un ciclo di
un random walk consiste in una sequenza di passi di lunghezza unitaria presi a caso che inizia e ritorna all'origine. Lo scopo di questo test
è determinare se il numero di visite a un particolare stato all'interno di un
ciclo devia da ciò che ci si aspetterebbe per una sequenza casuale. Questo
test è in realtà una serie di otto test (e conclusioni), un test e
conclusione per ciascuno degli stati: *-4, -3, -2, -1* e *+1, +2, +3, +4*.

**Random Excursions Variant Test:** Il focus di questo test è il numero totale
di volte che un particolare stato viene visitato (cioè si verifica) in un
random walk della somma cumulativa. Lo scopo di questo test è rilevare
deviazioni dal numero atteso di visite a vari stati nel
random walk. Questo test è in realtà una serie di diciotto test (e
conclusioni), un test e conclusione per ciascuno degli stati: *-9, -8,
..., -1* e *+1, +2, ..., +9*.

### Strategia di Test e Implementazione dei Risultati Statistici:

Il test e l'implementazione dei dati statistici possono essere effettuati
secondo la seguente pipeline.

1\. Selezione di un generatore: Un generatore basato su software o hardware può essere
implementato; il generatore deve produrre una sequenza binaria di lunghezza n
composta da 0 e 1.

2\. Generazione di una sequenza binaria: Per una sequenza fissata di lunghezza n, il
generatore preselezionato costruisce un insieme di m sequenze binarie, salvando i
risultati in un file.

3\. Esecuzione della Suite Statistica: Invocare la NIST Statistical Test
Suite utilizzando il file generato che contiene la sequenza binaria. Selezionare
i test statistici e i parametri di input rilevanti da testare.

4\. Esame dei P-value: Un file di output verrà generato dalla suite di test e conterrà un elenco di P-value per ciascun test statistico eseguito. In base a questo elenco
di P-value, può essere effettuata un'analisi della qualità del generatore.

5\. Assegnazione della classificazione Pass o Fail ai test: Per un livello
di significatività fissato, ci si aspetta che una certa percentuale dei P-value
indichi fallimento. Per esempio, se il livello di significatività scelto è
0.01 ($\alpha$ = 0.01), allora l'1% delle sequenze è atteso fallire. Una sequenza supera con successo il
test statistico quando il P-value è maggiore del livello di
significatività scelto e fallisce altrimenti. Per ciascun test statistico, la proporzione di sequenze che superano il test viene calcolata e analizzata di conseguenza.
Un'analisi più approfondita dovrebbe essere eseguita utilizzando metodi statistici aggiuntivi e
procedure.

###  Interpretazione dei Risultati Empirici Ottenuti dopo il Test:

Sono disponibili tre scenari da considerare dopo che il test è stato
completato e i risultati dalla suite statistica sono stati
registrati.

Case 1: L'analisi dei *P-value* mostra una deviazione dalla
casualità.

Case 2: L'analisi indica chiaramente una deviazione dalla casualità.

Case 3: L'analisi è inconcludente.

L'interpretazione dei risultati empirici può essere effettuata in diversi modi.
Il NIST ha adottato i seguenti:

\(1\) l'esame della proporzione di sequenze che superano un
test statistico, e

\(2\) la distribuzione dei *P-value* per verificare l'uniformità.

Se uno dei due approcci fallisce, ulteriori esperimenti numerici
dovrebbero essere condotti su diversi campioni del generatore per
determinare se il fenomeno era un'anomalia statistica o una chiara
evidenza di non casualità.

### Proporzione di Sequenze che Superano un Test

Dati i risultati empirici di un test, la proporzione di test che
sono considerati superati o falliti è determinata tenendo in
considerazione l'intervallo di confidenza scelto e calcolato secondo la
formula:

$$\hat{p} \pm 3 \sqrt{\frac{\hat{p}(1 - \hat{p})}{m}}$$

Dove $\hat{p} = 1 - \alpha$.

L'intervallo di proporzioni accettabili è determinato utilizzando l'intervallo
di confidenza definito sopra.

Se la proporzione cade al di fuori di questo intervallo, allora c'è evidenza
che i dati non sono casuali. Anche altri valori di deviazione standard possono essere
utilizzati.

**Distribuzione Uniforme dei *P-value:* **

***La distribuzione dei P-value viene esaminata per garantire l'uniformità.***
L'uniformità può anche essere determinata tramite l'applicazione di un test $$\chi^2$$ e la determinazione di un *P-value* corrispondente al
test di bontà dell'adattamento (Goodness-of-Fit) sulla distribuzione dei *P-value* ottenuti per un test statistico arbitrario.

$$\chi^2 = \sum_{i=1}^{10} \frac{(F_i - S/10)^2}{S/10}$$

**Cause comuni di errore:**

**Un test statistico programmato in modo errato:** Poiché il codice per ciascun test
è stato creato per un particolare tipo di problema, essi includono la selezione
di parametri da impostare per i test. Tuttavia, questo non significa che il programma sia facile da creare.

**Un test statistico sottosviluppato (immaturo):** Esistono casi
in cui la teoria della probabilità o della complessità non è sufficientemente sviluppata
per analizzare rigorosamente un test statistico. Poiché molti
test statistici si basano su approssimazioni asintotiche, un lavoro dettagliato dovrebbe essere svolto per determinare quanto sia buona
un'approssimazione.

**Routine matematiche scadenti per il calcolo dei P-value:** Software matematico di qualità
deve essere utilizzato per garantire buone approssimazioni ogni volta che
possibile. In particolare, la funzione gamma incompleta è più difficile
da approssimare per valori elevati della costante *a*. Alla fine,
le formule dei *P-value* produrranno valori errati a causa delle difficoltà
derivanti dalle approssimazioni numeriche. La pubblicazione NIST include anche
valori raccomandati per i parametri.

**Scelte errate dei parametri di input:** In condizioni reali,
un test statistico non fornirà risultati affidabili per tutti i parametri di input apparentemente validi. I vincoli sui test sono definiti caso per caso; pertanto, i test statistici sono sensibili ai parametri di input. Spesso devono essere fatte considerazioni riguardo ai parametri degli esperimenti numerici, vale a dire: lunghezza della sequenza, dimensione del campione,
dimensione del blocco e template.

## Conclusione

La suite NIST fornisce preziose informazioni lato utente insieme ai modelli matematici utilizzati per eseguire ciascun test, ma
non è uno standard completo per verificare la qualità di un RNG in condizioni reali.
Devono essere eseguiti test aggiuntivi sugli output del generatore, e i problemi che emergono a causa della natura del generatore devono essere considerati e risolti prima dell'uso in applicazioni reali. 
Tuttavia, è una buona guida per testare alcune qualità statistiche dell'RNG che viene analizzato.