---
title: 'Quantum Cryptanalysis of CBC-MAC: Evaluating a Chosen-Plaintext Forgery on NISQ Hardware'
description: "We turn a known quantum attack on CBC-MAC, based on Simon's algorithm, into a pipeline that runs end to end, and test it on a simulator and on IQM's Sirius quantum computer. Today's hardware noise stops it beyond 2 bit blocks, but the weakness remains."
date: 2026-10-28
authors:
  - Kevin Intelisano
  - Stefano Cusinello
  - Selen Caliskan
tags:
  - Cryptography
slug: quantum-cryptanalysis-cbc-mac
---

## Abstract

The Cipher Block Chaining Message Authentication Code (CBC-MAC) is a technique for constructing a MAC built upon a block cipher. Whilst it is proven secure against classical adversaries under fixed-length configurations, the advent of quantum computing severely threatens these guarantees. Building upon theoretical frameworks that exploit Simon's algorithm for chosen prefix forgeries, this study translates abstract quantum cryptanalysis into a functional, end-to-end executable pipeline. More specifically, our implementation leverages Simon's algorithm within a quantum Chosen Plaintext Attack (qCPA) model, artificially enabling the extraction of intermediate MAC values without requiring variable-length queries.

We evaluate this forgery pipeline across both idealised quantum simulators (Qiskit Aer) and physical QPUs (IQM Sirius). Whilst simulated environments perfectly validate the mathematical exploit, our physical hardware executions reveal a strict operational boundary. We demonstrate that the environmental noise and gate synthesis overhead inherent to Noisy Intermediate-Scale Quantum (NISQ) architectures effectively neutralise the attack for configurations exceeding a 2 bit block size. Ultimately, this work proves that whilst physical hardware noise currently shields cryptography from deep quantum circuits, the underlying vulnerability of CBC-MAC remains a critical threat that must be addressed before the advent of fault-tolerant quantum computers.

## 1. Introduction

### 1.1 CBC-MAC: Classical foundations and known vulnerabilities

CBC-MAC is a well-established technique for constructing a message authentication code (MAC) from a block cipher. In a communication between two parties, it ensures that:

- the message was sent by an entity holding the shared secret key (**authentication**);
- the message has not been altered during transmission (**integrity**).

The principle is straightforward: take a message, divide it into blocks, and process each block iteratively with a block cipher (e.g., AES) in CBC mode, with the initialisation vector (IV) set to zero. The final ciphertext block is then used as the MAC tag.

![Three message blocks m1, m2 and m3. Each one is combined with XOR with the output of the previous step (with IV = 0 for the first) and goes through the block cipher F_k with the key k; the output of the last block is the tag t.](./images/cbc-mac.png "Graphical representation of the CBC-MAC construction.|cbc-mac")

This mechanism ensures authentication because the internal function $F_k$ is applied using the shared secret key $k$, and it guarantees integrity because the final encrypted block $t$ serves as a digest to detect potential tampering.

It is well documented that CBC-MAC is vulnerable in the classical setting when **variable-length messages** are permitted. Assume an adversary has intercepted the following:

- $t$, the tag corresponding to a specific message $M$;
- $t'$, the tag corresponding to another specific message $M'$.

With only this information, it is possible to forge a new message $M''$ with a valid tag $t''$, entirely without knowledge of the secret key.

![Message M of three blocks M1, M2, M3 with tag t; message M′ of three blocks M′1, M′2, M′3 with tag t′; forged message M″ made of M1, M2, M3, then M′1 XOR t, M′2, M′3, whose tag is t′.](./images/length-extension.png "Classical length-extension attack against an improperly implemented CBC-MAC.|length-extension")

The standard classical countermeasure is to strictly enforce fixed-length messages when deploying CBC-MAC. This prevents the computation of $M''$, as its length would otherwise exceed that of both $M$ and $M'$.

**Note:** it is important to clarify that our implementation assumes the use of fixed-length messages. The forgery attack we describe is infeasible classically and is strictly a quantum vulnerability.

### 1.2 qCPA: The attack model

The attack described and implemented in this project is framed within the quantum Chosen-Plaintext Attack (qCPA) model. In this scenario, an adversary is granted access to an oracle that implements CBC-MAC. Crucially, **the adversary may query the oracle not only using classical inputs but also using quantum superpositions of messages**. In practice, this allows the submission of any superposition of messages to the oracle to yield a corresponding superposition of CBC-MAC tags.

The objective of the attack is to intercept a valid message $M$ alongside its tag $t$, and subsequently tamper with it by constructing a forged message $M_f$ with a valid tag $t_f$.

**A key constraint is that the adversary cannot simply query the oracle on $M_f$ to obtain $t_f$ directly, as this would trivialise the forgery.** Instead, the attack relies on deriving $t_f$ indirectly by exploiting the oracle's response to carefully chosen, distinct messages in superposition.

#### 1.2.1 Analysis of the Quantum Speedup

To understand the severity of this threat, it is vital to distinguish between two primary paradigms of quantum cryptanalysis:

1. **Grover's algorithm: offline brute force.** When cryptographers evaluate the quantum threat against block ciphers like AES, they traditionally model an offline attack using Grover's algorithm.
   - **Setup:** an adversary intercepts a single classical plaintext-ciphertext pair.
   - **Offline execution:** the adversary constructs a quantum circuit of the cryptographic algorithm on their own local hardware. Using Grover's algorithm, they search the key space in superposition to find the key that matches the known plaintext to the known ciphertext.
   - **Limitations:** because this is a brute-force search against an unstructured mathematical space without requiring further interaction with the target, the adversary is bound to a quadratic speedup ($\mathcal{O}(\sqrt{N})$). Consequently, simply doubling the classical key size effectively mitigates this threat.
2. **Simon's algorithm: online qCPA threat.** By contrast, Simon's algorithm does not brute-force a key space: it identifies hidden structural patterns (periodicities) within a function, offering an exponential speedup.
   - **Setup:** the adversary does not know the secret key and therefore cannot simulate the MAC locally. Instead, they require access to query the live target device containing the hardcoded key.
   - **Online execution:** the adversary sends a quantum superposition of different messages directly into the target device, which returns a corresponding superposition of MAC tags. By analysing these returning quantum states, Simon's algorithm unravels the hidden internal collisions of the CBC-MAC structure.

#### 1.2.2 Realistic Deployment Environments

A common critique of the qCPA model is the assumption that an attacker cannot easily feed quantum states into a live cryptographic device. Whilst this is true for standard classical servers, this threat model becomes profoundly relevant in two specific, forward-looking scenarios:

- **White-box cryptography (our case study):** in modern digital rights management (DRM) or mobile payment systems, software is often deployed with a hardcoded, symmetric secret key protected by obfuscation: this is a practice known as white-box cryptography. An attacker can extract this obfuscated classical code and, through a non-trivial procedure, translate it into a local quantum circuit. We explicitly acknowledge that if an adversary has sufficiently reverse-engineered a white-box implementation to achieve this, they likely already possess easier classical avenues to compromise it. However, our qCPA implementation demonstrates a fundamental, unpatchable mathematical vulnerability that bypasses classical countermeasures entirely.
- **Native quantum networks:** the long term realisation of the qCPA threat lies in the advent of the quantum internet, where devices such as quantum routers or smart cards will natively transmit and process qubits. To ensure secure routing, these devices will likely rely on symmetric cryptography embedded at the hardware level. Because the hardware is explicitly designed to receive quantum states, an adversary connected to the network can naturally transmit a superposition of messages directly into the device's symmetric authentication module. The device, operating exactly as designed, processes the superposition, inadvertently exposing its internal periodicities to Simon's algorithm without requiring any reverse-engineering from the attacker.

### 1.3 Objective and Related Work

The primary objective of this project is to bridge the divide between theoretical quantum cryptanalysis and practical software engineering.

Specifically, we translate the mathematical proofs established by Santoli and Schaffner [1] into a functional quantum circuit. We evaluate this implementation not only on a quantum simulator but also on physical IQM quantum hardware. This empirical evaluation aims to map the boundaries between the theoretical results obtainable with logical qubits and the practical constraints imposed by hardware noise in contemporary quantum devices.

In addition to the foundational framework provided by Santoli and Schaffner, our programmatic realisation draws upon quantum cryptanalytic techniques pioneered by Kuwakado and Morii [2]. Furthermore, essential context regarding general quantum computation is derived from the work of Nielsen and Chuang [3].

## 2. Theoretical Framework: The Mathematics

### 2.1 Description of the Scenario

In this setting, we consider a communication scenario between two parties, Alice and Bob, who wish to exchange a message whilst ensuring authentication and integrity by means of CBC-MAC. A third party, Charlie, acts as an adversary in a Man-In-The-Middle (MITM) position. Charlie attempts to tamper with the message sent by Alice and forward it to Bob in such a way that Bob is unable to detect the modification.

![Three columns. Alice, the source: the shared secret key k goes into the generation of the CBC-MAC tag E_k, which gives the original (M, t). Charlie, the quantum man in the middle: interception and oracle (Q0, Q1, then H, CNOT and E_k), a snapshot goes to Simon's algorithm, whose string s goes to the synthesis of M_f = α1 ‖ z1 ‖ … ‖ zN. Bob, the destination: the forged (M_f, t_f) reaches the verification of (M′, t′) and the decision, accepted or rejected.](./images/mitm-attack.png "System view of the advanced quantum Man-In-The-Middle attack on CBC-MAC.|mitm-attack")

### 2.2 Simon's Algorithm (Quantum Processing)

Simon's algorithm is a quantum subroutine designed to solve Simon's problem. Formally, let

$$
f : \{0,1\}^n \to \{0,1\}^m, \quad m \geq n
$$

be a function with the following promise: there exists a secret string $s \in \{0,1\}^n$ such that for all distinct $x, y \in \{0,1\}^n$,

$$
f(x) = f(y) \quad \text{if and only if} \quad y = x \oplus s.
$$

The problem requires recovering the hidden string $s$, given access to an oracle implementing $f$.

Simon's algorithm solves this problem using only $\mathcal{O}(n)$ queries to the oracle, whereas the best-known classical algorithm requires at least $\mathcal{O}(2^{n/2})$ queries.

![Circuit with two registers of n qubits, both starting in |0⟩. The first goes through Hadamard gates, the oracle U_f together with the second register, Hadamard gates again and a measurement.](./images/simon-subroutine.png "Schematic representation of Simon's subroutine.|simon-subroutine")

**High-level procedure.** The algorithm proceeds in two main stages:

1. Run Simon's **quantum subroutine** approximately $n$ times to obtain a set of linearly independent bitstrings $y$ that are orthogonal to $s$ (i.e., $y \cdot s = 0$, where $\cdot$ denotes the bitwise inner product modulo 2).
2. Classically solve the resulting system of linear equations to recover the hidden string $s$.

**Quantum subroutine.** The quantum subroutine ([Figure 4](#simon-subroutine)) is traditionally described in five steps, but in our practical implementation, it is optimised to four. By relying on the Principle of Deferred Measurement, we omit the intermediate measurement of the output register, thereby reducing hardware noise and decoherence on the IQM device:

1. **Superposition:** apply Hadamard gates to all qubits in the input register, creating a uniform superposition over all $x \in \{0,1\}^n$.
2. **Oracle query:** query the oracle implementing the unitary operator $U_f$, which entangles the registers by mapping $\ket{x}\ket{0}$ to $\ket{x}\ket{f(x)}$.
3. **Interference:** apply Hadamard gates once more to the input register. Because the states $\ket{x}$ and $\ket{x \oplus s}$ are entangled with the identical output state $\ket{f(x)}$, they interfere directly. This destructive interference entirely eliminates states not orthogonal to $s$.
4. **Measurement:** measure the input register, yielding a random bitstring $y$ that perfectly satisfies $y \cdot s = 0$. The output register is traced out (ignored), as its measurement is mathematically unnecessary for the interference to occur.

### 2.3 The qCPA Forgery Attack (Quantum Synthesis)

Let us consider a message $M$ divided into $N$ blocks. Without loss of generality, we ignore padding techniques and assume that the message divides exactly into $N$ equal parts:

$$
M := M_1 \,\|\, M_2 \,\|\, \dots \,\|\, M_N.
$$

The steps of the quantum forgery attack are as follows:

1. **Fix a prefix $\alpha_1$:** select a prefix consisting of $P$ blocks from the original message $M$. This prefix remains entirely unchanged by our algorithm; only the remaining portion of the message is forged.
2. **Choose an arbitrary prefix $\alpha_0$:** select a distinct prefix $\alpha_0$ of the exact same block length as $\alpha_1$.
3. **Obtain a valid tag $t_f$:** query the classical oracle to obtain a valid tag for a message padded entirely with zero-blocks. If the total message length $N$ is odd, query:
   $$
   M_1 := \alpha_1 \,\|\, 0 \,\|\, \dots \,\|\, 0
   $$
   If the total message length $N$ is even, query:
   $$
   M_0 := \alpha_0 \,\|\, 0 \,\|\, \dots \,\|\, 0
   $$
4. **Compute the block replacements $z_j$:** utilising Simon's algorithm to extract the hidden periodicities, compute the forged blocks $z_j$ via the relation:
   $$
   z_j := \pi^j(\alpha_0) \oplus \pi^j(\alpha_1)
   $$
   for all remaining blocks $j \in \{P+1, \dots, N\}$, where $\pi^j$ denotes the block cipher permutation applied $j$ consecutive times.
5. **Synthesise the forged message:** replace each original block $M_j$ with the corresponding calculated block $z_j$.

The result is a fully forged message $M_f$:

$$
M_f := \alpha_1 \,\|\, z_1 \,\|\, z_2 \,\|\, \dots \,\|\, z_{N-P}
$$

paired perfectly with the valid tag $t_f$ obtained in Step 3.

**Note:** it is critical to emphasise that **Step 4 is the only part of the procedure that requires quantum computation**. All other steps will be executed on classical hardware.

## 3. Implementation and Circuit Design (The Code)

The complete source code is publicly available on both [GitHub](https://github.com/kevin-intelisano/nisq-cbc-mac-attack) and [Codeberg](https://codeberg.org/kevin-intelisano/nisq-cbc-mac-attack).

### 3.1 Software Architecture

This project was developed entirely in Python using Jupyter Notebooks and relies on the Qiskit framework for both quantum circuit construction and execution. Computations were performed in two distinct environments: local, noise-free simulations were executed using the Qiskit Aer simulator, whilst physical quantum experiments were deployed directly to the IQM Sirius hardware via API token authentication.

The codebase is organised into several distinct modules, each with a well-defined responsibility:

- `bitblock`: defines the fundamental data structure for representing fixed-length binary strings. These instances serve as the atomic units for messages, keys, and any other block of bits within the CBC-MAC computations. The class enforces correctness of data (restricting arrays to integers of 0 or 1 and maintaining a defined block size) and provides useful low-level operations such as bitwise XOR, block assignment (`equal`) or decimal conversion (`toDecimal`).
- `cipher_switch` (and oracle backends `cipher_TRNG`, `cipher_SDES`):
  - `cipher_switch`: acts as a dynamic cryptographic abstraction layer and oracle interface. It standardises the initialisation of the cipher state, the construction of the quantum oracle operators and the generation of the classical CBC-MAC tags, ensuring the program can cleanly swap between different encryption algorithms without altering the core attack logic.
  - `cipher_TRNG`: emulates a purely random, memory-based substitution cipher by generating a shuffled permutation table across the entire block space.
  - `cipher_SDES`: implements the classical Simplified Data Encryption Standard (S-DES) algorithm, restricting operations strictly to an 8 bit block size.
- `simon`: constitutes the quantum execution engine of the project. This module is responsible for dynamically assembling the quantum circuit required to apply Simon's algorithm against the oracle to uncover hidden periodicities. It maps message prefixes ($\alpha_0$ and $\alpha_1$) into quantum registers, interweaves the $U_\pi$ unitary gates to simulate the CBC-MAC process in superposition, and performs the necessary phase kickbacks and measurements. Furthermore, this library handles the execution environment switch, supporting both local noise-free simulation via Qiskit Aer and deployment on physical quantum processing units using the IQM hardware provider.
- `attack`: functions as the adversarial logic wrapper, orchestrating the quantum Chosen-Plaintext Attack (qCPA) whilst hiding the intricate quantum mechanics from the main execution thread. It builds the required input variables, generating a prefix copy ($\alpha_1$) and a bit-flipped prefix counterpart ($\alpha_0$) and extracting the specific forged tag from the classical oracle. It then iteratively invokes the `simon` module to compute the specific bitstrings ($z_j$) needed to sequentially forge the remaining blocks of the original message.
- `main`: the simulation driver that orchestrates the active Man-in-the-Middle (MitM) scenario. It establishes the global environmental parameters (described below) and simulates the three distinct actors: Alice (the source, generating a valid message and tag), Charlie (the adversary, intercepting the communication and leveraging the `attack` module to manipulate the payload), and Bob (the destination, receiving the tampered data and validating or rejecting the message).

### 3.2 Quantum Circuit Unravelling

From the outset, our design philosophy emphasised that key cryptographic parameters must be dynamically adjustable without requiring alterations to the underlying codebase. The `main` script exposes fine-grained control over the configuration through the following structural dictionaries and variables:

- `BLOCK_SIZE`, `MESSAGE_LENGTH`, `PREFIX_LENGTH`: these variables define the structural dimensions of the attack, controlling the bit-width of each block, the total number of blocks in the intercepted message, and the size of the static prefix.
- `CIPHER_OPTIONS`: dictates the target cipher (e.g., TRNG or SDES) alongside its specific algorithmic attributes.
- `SIMULATION_OPTIONS`: toggles the execution backend between local simulation and physical IQM hardware. It also manages execution variables such as the number of quantum `SHOTS`, the display of diagnostic graphs and performance metrics, the secure handling of the IQM authentication token and the URL endpoint.

To make the discussion concrete and reproducible, we define the exact parameters used in our code architecture. With these values, the reader can precisely replicate the circuit generation.

```python
# Message options
BLOCK_SIZE = 4      # >= 2
MESSAGE_LENGTH = 3  # >= 3
PREFIX_LENGTH = 1   # <= MESSAGE_LENGTH - 2

CIPHER_OPTIONS = {
    'NAME': 'TRNG',
    'FIXED_PI': True
}
SIMULATION_OPTIONS = {
    'SIMULATED': True,
    'SHOTS': 2048,
    'DETAILS': True,
    'PRIVATE_TOKEN': os.getenv('IQM_TOKEN'),
    'IQM_URL': 'https://resonance.iqm.tech/sirius'
}

message = [
    Block(BLOCK_SIZE, [0, 0, 0, 1]),
    Block(BLOCK_SIZE, [1, 0, 0, 0]),
    Block(BLOCK_SIZE, [0, 1, 0, 0])
]
```

Before examining the generated quantum circuits, it is necessary to clarify some fundamental premises regarding the circuit logic:

1. **Cipher and prefixes main role:** the output of the quantum forgery depends solely upon **the chosen cipher**, the original prefix $\boldsymbol{\alpha_1}$ (the first block of the message) and its quantum counterpart $\boldsymbol{\alpha_0}$ (which is simply $\alpha_1$ with its first bit negated). The exact content of all subsequent message blocks is entirely irrelevant to the mathematical extraction of the hidden string.
2. **Register notation:** we denote the aggregate quantum register comprising the wires $alpha_0, alpha_1, alpha_2, alpha_3$ simply as $\alpha$, and the input register comprising the wires $x_0, x_1, x_2, x_3$ simply as $x$.
3. **Bit ordering convention:** Qiskit maps the least significant bit (LSB) to the lowest qubit index (the top wire of the circuit diagram). For example, in [Figure 5](#forgery-circuit), initialising the $\alpha$ register with the binary string 0001 (where the LSB is 1) places a 1 on the top wire ($alpha_0$) and 0s on the wires below it. Reading from top to bottom, this appears as 1000.

The following example illustrates the quantum forging procedure. Specifically, it details the extraction of the forged block that replaces the original message block $[1, 0, 0, 0]$.

![Qiskit circuit on the wires x0 to x3, b and alpha0 to alpha3, with a classical register result of 5 bits. Before the first barrier: H on b, X on alpha0 and a CNOT from b to alpha3. Then H on x0 to x3, a U_TRNG block on the alpha wires, four CNOTs from x0 to x3 onto alpha0 to alpha3 and two more U_TRNG blocks. After the second barrier: H on x0 to x3 and on b, then the measurement of x0 to x3 and b into result.](./images/forgery-circuit.png "Vertical barriers visually divide the execution into three main stages.|forgery-circuit")

#### 3.2.1 First Stage: Initialisation of α₁ and α₀

The circuit begins (prior to the first barrier) by preparing the quantum registers $b$ and $\alpha$. The control qubit $b$ is placed into superposition via a Hadamard gate and is used to entangle the two distinct prefixes, $\alpha_1$ and $\alpha_0$. In [Figure 5](#forgery-circuit), this manifests as follows:

- $\alpha_1 = [0001]$, achieved by applying an X gate to the $alpha_0$ wire.
- $\alpha_0 = [1001]$, achieved by applying a CNOT gate controlled by $b$ targeting the $alpha_3$ wire (the MSB). This flips the target bit whenever $b = 1$, leaving it unchanged otherwise.

The effect of this procedure is that **the register $\boldsymbol{\alpha}$ now simultaneously contains both $\boldsymbol{\alpha_0}$ and $\boldsymbol{\alpha_1}$ in superposition**. This preparation step builds the foundational state required for the subsequent quantum oracle.

#### 3.2.2 Second Stage: Simon's Superposition and the CBC-MAC Unitary

Following the first barrier, Hadamard gates are applied to the $x$ register to create the uniform superposition required by Simon's algorithm. We then construct the unitary operator of the modified CBC-MAC function:

$$
\begin{aligned}
g_j &: \{0,1\}^{n+1} \to \{0,1\}^n, \\
b \,\|\, x &\mapsto \mathrm{CBC}^{\ell}_{\pi}\left(\alpha_b \,\|\, 0^{(j-1)n} \,\|\, x \,\|\, 0^{(\ell-j-1)n}\right) = \pi^{\ell-j}\left(\pi^j(\alpha_b) \oplus x\right).
\end{aligned}
$$

This mathematical structure is perfectly mirrored by the sequence of gates in the circuit. For this specific execution, we are extracting the block $z_1$ from a message of length $\ell = 3$, meaning $j = 1$.

- $\pi^j(\alpha_b)$: the circuit applies exactly one `U_TRNG` block to the $\alpha$ register.
- $\oplus\, x$: the input register $x$ is XORed into $\alpha$ via a sequence of CNOT gates.
- $\pi^{\ell-j}$: because $\ell - j = 2$, the circuit applies exactly two subsequent `U_TRNG` blocks to the $\alpha$ register.

This step is the key to extracting the promised periodicity, saving it into the phase of the combined input register ($b \,\|\, x$). **Classically, obtaining this structural information would require applying the CBC-MAC function for increasing message lengths, which inherently violates the secure fixed-length hypothesis of the protocol.**

#### 3.2.3 Third Stage: Interference and Final Measurement

Following the final barrier, the circuit concludes by applying Hadamard gates to the combined input register (comprising both $x$ and $b$). This operation induces destructive interference due to the presence of the hidden string $s$ encoded in the phase.

Only those bitstrings $y$ that are **orthogonal** to $s$ (i.e., satisfy $y \cdot s = 0$) survive this interference. Measuring the $x$ and $b$ wires into the classical `result` register yields a uniformly random bitstring orthogonal to $s$. By repeating this procedure multiple times, **it is possible to accumulate a system of independent linear equations that can be solved classically to recover the hidden string $s$**.

## 4. Evaluation

In this section, we evaluate the empirical performance of our quantum circuit pipeline by establishing a comparative baseline between an idealised simulation environment and a physical quantum processing unit.

For the empirical evaluations presented in this report, all experiments were executed using a fixed message length of 3 blocks. We systematically varied the block size across $\{2, 3, 4\}$ bits to isolate the exact relationship between cryptographic scaling, gate count, and hardware decoherence thresholds. As we already said in Section 3.2, the exact bit-content of subsequent trailing message blocks to the prefix is irrelevant and does not impact the output of the forgery. Thus, to reproduce our empirical results, the prefixes are defined as follows:

- 2 bit blocks: $\alpha_1 = [0, 1]$
- 3 bit blocks: $\alpha_1 = [0, 0, 1]$
- 4 bit blocks: $\alpha_1 = [0, 0, 0, 1]$

### 4.1 Theoretical Validation with Simulator

To verify the mathematical correctness of our modular circuit construction, initial benchmarks were performed using the **Qiskit Aer simulator**. Under these ideal, noise-free conditions, the circuit behaves exactly in accordance with Simon's theoretical promise, regardless of the underlying block size, message length, prefix length, or selected cipher.

![Two bar charts of counts. Each shows only 4 of the 8 possible bitstrings, with about 500 counts each.](./images/aer-2-bit.png "Qiskit Aer simulation results with 2 bit blocks.|aer-2-bit")

![Two bar charts of counts. Each shows only 8 of the 16 possible bitstrings, with about 250 counts each.](./images/aer-3-bit.png "Qiskit Aer simulation results with 3 bit blocks.|aer-3-bit")

![Two bar charts of counts. Each shows only 16 of the 32 possible bitstrings, with about 100 to 150 counts each.](./images/aer-4-bit.png "Qiskit Aer simulation results with 4 bit blocks.|aer-4-bit")

As illustrated in [Figures 6](#aer-2-bit), [7](#aer-3-bit) and [8](#aer-4-bit), for each configuration of bit blocks (yielding 8, 16, and 32 mathematically possible measurement outcomes in the combined input register, respectively), the output spectrum is strictly restricted to exactly half of the possible distinct bitstrings.

This result confirms that the phase kickback mechanisms successfully induce destructive interference, perfectly cancelling out any state components that fail to satisfy the orthogonality condition $y \cdot s = 0$.

Operationally, to recover the secret string $s$, one can formally solve the linear system of equations derived from these orthogonal outputs. Alternatively, given the pristine nature of the simulated data, one can heuristically identify the basis vectors directly from the frequency counts (specifically, those bitstrings with a Hamming weight of 2 where the most significant bit is 1). Applying a logical OR mask across these specific vectors efficiently and accurately yields the hidden block $z_j$ for that iteration.

### 4.2 Physical Execution (IQM Hardware)

When transferring the identical circuit layouts onto physical hardware via the **IQM Sirius** backend, the execution environment encounters a substantial noise barrier. As the primitive parameters scale, the physical architecture degrades rapidly due to gate synthesis overhead and environmental decoherence.

![Two bar charts of counts over all 8 bitstrings. Four of them still stand out clearly, with about 350 to 480 counts, against about 85 to 150 for the others.](./images/sirius-2-bit.png "IQM Sirius execution results with 2 bit blocks.|sirius-2-bit")

![Two bar charts of counts over all 16 bitstrings, all with similar counts between about 95 and 160.](./images/sirius-3-bit.png "IQM Sirius execution results with 3 bit blocks.|sirius-3-bit")

![Two bar charts of counts over all 32 bitstrings, all with similar counts between about 40 and 85.](./images/sirius-4-bit.png "IQM Sirius execution results with 4 bit blocks.|sirius-4-bit")

As shown in [Figures 10](#sirius-3-bit) and [11](#sirius-4-bit), increasing the block size causes the resulting histogram to lose its structure entirely, degrading into a uniform distribution where all mathematically possible bitstrings appear. Conversely, the 2 bit configuration ([Figure 9](#sirius-2-bit)) is the only execution that preserves a sufficient signal-to-noise ratio to reliably recover the hidden information, as the step between valid orthogonal strings and invalid noise artifacts remains distinct.

To understand this catastrophic failure at higher block sizes, we must examine the transpilation metrics detailed in Tables 1, 2, and 3.

| Metric/Gate | Abstract | Transpiled | Delta |
| --- | --: | --: | --: |
| Depth | 8 | 28 | +20 |
| Total size | 16 | 44 | +28 |
| CX | 3 | 0 | −3 |
| CZ | 0 | 7 | +7 |
| SWAP | 0 | 14 | +14 |
| H | 6 | 0 | −6 |
| X | 1 | 0 | −1 |
| R | 0 | 20 | +20 |
| $U_\pi$ | 3 | 0 | −3 |
| Barrier | 4 | 4 | +0 |
| Measure | 3 | 3 | +0 |

*Table 1: IQM Sirius transpilation metrics with 2 bit blocks.*

| Metric/Gate | Abstract | Transpiled | Delta |
| --- | --: | --: | --: |
| Depth | 8 | 182 | +174 |
| Total size | 20 | 269 | +249 |
| CX | 4 | 0 | −4 |
| CZ | 0 | 60 | +60 |
| SWAP | 0 | 102 | +102 |
| H | 8 | 0 | −8 |
| X | 1 | 0 | −1 |
| R | 0 | 103 | +103 |
| $U_\pi$ | 3 | 0 | −3 |
| Barrier | 4 | 4 | +0 |
| Measure | 4 | 4 | +0 |

*Table 2: IQM Sirius transpilation metrics with 3 bit blocks.*

| Metric/Gate | Abstract | Transpiled | Delta |
| --- | --: | --: | --: |
| Depth | 8 | 994 | +986 |
| Total size | 24 | 1427 | +1403 |
| CX | 5 | 0 | −5 |
| CZ | 0 | 303 | +303 |
| SWAP | 0 | 576 | +576 |
| H | 10 | 0 | −10 |
| X | 1 | 0 | −1 |
| R | 0 | 543 | +543 |
| $U_\pi$ | 3 | 0 | −3 |
| Barrier | 4 | 4 | +0 |
| Measure | 5 | 5 | +0 |

*Table 3: IQM Sirius transpilation metrics with 4 bit blocks.*

Comparing the empirical distributions with these transpilation metrics, we can observe precisely how the noise behaviour progressively invalidates the results. Due to the limited hardware topology, mapping the abstract unitary operators onto the physical qubits requires massive SWAP and routing overheads. Starting from a circuit depth of approximately 180 and a total gate size of nearly 270 (as seen in the 3 bit configuration), the accumulated physical noise becomes too high to extract valid information, effectively burying the mathematical signature of the hidden periodicity.

## 5. Conclusion

In this study, we bridged the divide between theoretical quantum cryptanalysis and physical hardware engineering by implementing an end-to-end quantum Chosen-Plaintext Attack (qCPA) forgery pipeline against a fixed-length CBC-MAC configuration.

Beyond its theoretical validation, this project holds significant didactic value: **it demystifies abstract quantum vulnerabilities by translating mathematical proofs into functional, executable code**. Our implementation demonstrates a highly irregular utilisation of Simon's subroutine. Rather than seeking a global hidden key, the attack artificially constructs a periodic structure, leveraging entanglement to "snapshot" the hidden value at a specific iteration of the CBC-MAC unitary operator. This approach successfully bypasses classical constraints, granting access to intermediate state values even when all messages are strictly fixed in length.

However, our empirical evaluations on physical IQM hardware underscore the current limitations of the NISQ era. The practical performance of this attack is severely bottlenecked by hardware noise and decoherence. Once a circuit scales to the threshold of approximately 100 operations, environmental noise and compilation overheads completely scramble the underlying state vector.

Whilst our physical baselines rely on reduced block ciphers to maintain tractability, the exponential explosion of SWAP and routing overheads observed even between 2 bit and 4 bit configurations strongly indicates that scaling this qCPA attack to production-grade ciphers (e.g., AES-128) is strictly impossible on current hardware. Such an endeavour would require gate depths orders of magnitude beyond current coherence times, further reinforcing our conclusion that fault-tolerant architectures are a fundamental prerequisite for this threat.

Despite these current physical limitations, the theoretical threat model remains profoundly relevant. As discussed in Section 1 regarding realistic deployment environments, these vulnerabilities are highly generalisable. **Any white-box cryptographic implementation could fall prey to this attack**, provided an adversary can extract the obfuscated mathematical function and compile it into a local quantum circuit. Furthermore, in the **native quantum networks** of the future, this attack vector becomes entirely seamless. Hardware explicitly designed to route and process quantum states will inadvertently process adversarial superpositions exactly as designed, passively exposing its internal periodicities to Simon's algorithm.

Cryptographic security historically relies on complex non-linearity to oppose classical attackers: a property that inadvertently creates deep, intricated, and so noisy quantum circuits. Currently, this hardware noise acts as a temporary shield against quantum exploits. However, we must not mistake this physical limitation for mathematical security.

As the industry transitions towards fault-tolerant quantum computers equipped with logical qubits, the physical barriers preventing these exponential vulnerabilities will dissolve. The vulnerability of CBC-MAC serves as a critical warning: the quantum designers and network architects of tomorrow must proceed with extreme caution.

**We must proactively anticipate and mitigate these fundamentally new threat models today, lest our foundational digital infrastructure be left completely defenseless in the post-quantum era.**

## References

1. Thomas Santoli and Christian Schaffner. Using Simon's algorithm to attack symmetric-key cryptographic primitives. *Quantum Information & Computation*, 17(1–2):9–12, 2017. [arXiv:1603.07856](https://arxiv.org/abs/1603.07856).
2. Hidenori Kuwakado and Masakatu Morii. Quantum distinguisher between the 3-round Feistel cipher and the random permutation. In *2010 IEEE International Symposium on Information Theory*, pages 2682–2685. IEEE, 2010.
3. Michael A. Nielsen and Isaac L. Chuang. *Quantum Computation and Quantum Information*. Cambridge University Press, 2000.
