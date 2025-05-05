---
title: "Quantum Error Correction"  
weight: 13  
draft: false  
date: 2025-04-17
hideFeatureImage: true
showDescription: true
description: "Quantum Error Correction"  
summary: "Using techniques like repetition codes and the 9-qubit Shor code, quantum error correction enables reliable quantum computing by protecting qubits from bit-flip errors, phase-flip errors, and arbitrary errors."  
tags: ["QEC", "Qiskit"]  # Translated from "etichette"
# series: ["Introduction to Quantum Error Correction-EN"]  
# series_order: 1  
showAuthor: true  
showCategory: true  
authors: ["Quantino 1", "Quantino 2"]  # Translated from "autori"  
categories: ["Quantum Error Correction"]  # Translated from "categorie"  
slug: "quantum-error-correction"  
translationKey: "correcting-quantum-errors"  
---
Quantum error correction is a critical framework for overcoming the inherent fragility of quantum information, which is susceptible to decoherence and operational inaccuracies. This paper explores fundamental techniques for protecting quantum states from errors, beginning with classical repetition codes and their extension to quantum systems. We discuss the encoding and decoding processes for qubits, focusing on the detection and correction of bit-flip and phase-flip errors using modified repetition codes.

Central to this work is the analysis of the 9-qubit Shor code, which integrates both bit-flip and phase-flip error correction. We demonstrate how controlled-NOT (CNOT) gates facilitate error detection and correction, enabling robustness against simultaneous bit- and phase-flip errors as well as random noise. Furthermore, we establish the principle of error discretization, showing how arbitrary qubit errors can be reduced to a finite set of correctable operations. By generalizing these concepts, we provide a foundation for scalable quantum error correction, essential for reliable large-scale quantum computation.

# Classical Repetition Codes
Noise is a fundamental challenge in information processing systems. Many
classical systems are able to avoid noise completely, while others must
make use of error-correcting codes to protect against the effects of
noise. The key idea is redundancy: by encoding messages with extra
information, errors can be detected and corrected even if part of the
data is corrupted. Repetition codes are extremely basic examples of
error correcting codes.

## Encoding and Decoding Procedures

The core idea is to protect a bit against errors by repeating it
multiple times. Consider the 3-bit repetition code, where a single bit
is encoded as three identical bits. $$0 \mapsto 000$$ $$1 \mapsto 111$$
In the absence of errors, the original bit can be trivially decoded.
However, even if one bit flips, the original value can still be
recovered by majority voting: the decoder outputs whichever value
appears more frequently. $$abc \mapsto majority(a,b,c)$$ This corrects
single-bit errors reliably.

Of course, if 2 or 3 bits of the encoding flip, then the decoding won't
work properly and the wrong bit will be recovered, but if at most 1 of
the 3 bits flip, the decoding will be correct. This shows a central
concept in error correction: the trade-off between redundancy and
robustness.

## Error Analysis in Binary Symmetric Channels

As an example, suppose we wish to communicate a single bit to a
hypothetical receiver through a classical noisy channel. The effect of
the noise in the channel is to flip a transmitted bit with probability
$p$, while with probability $1-p$ the bit is transmitted correctly. Such
a channel is known as a *binary symmetric channel*, it flips each bit
sent through it independently.

In this context, if we choose not to use any error correcting code and
simply send whatever bit through the channel, the receiver will receive
the wrong bit with probability $p$.

On the other hand, if we first use the 3-bit repetition code to encode
the bit and then send each of the resulting three bits through the
channel, each one of them will flip indipendently with probability $p$.
The receiver will decode correctly only if at most one bit flips during
the communication. So the probability of an error after the decoding
corresponds to the probability that either two or each of the three bits
flip during transmission. The total probability of an error is therefore
$$3p^2(1-p)+p^3 = 3p^2-2p^3.$$

![Binary Symmetric
Error](binary-symmetric-error.png)
As can be seen in the figure, when the error probability $p$ is less
than $1/2$, the repetition code effectively reduces the chance of the
receiver obtaining an incorrect bit. Conversely, if $p$ exceeds $1/2$,
the code amplifies the likelihood of decoding errors rather than
correcting them.

# Quantum Repetition Codes for Qubits

## Encoding Quantum States

## Detecting and Correcting Bit-Flip Errors

## Handling Phase-Flip Errors

## Modified Repetition Code for Phase-Flip Mitigation

# The 9-Qubit Shor Code

## Code Structure and Encoding

## Error Propagation and CNOT Gate Operations

## Correction of Bit-Flip Errors

## Correction of Phase-Flip Errors

## Simultaneous Bit- and Phase-Flip Error Correction

## Robustness Against Random Errors

# Error Discretization in Quantum Systems

The 9-qubit Shor code corrects arbitrary quantum errors---not just $X$
or $Z$ errors---by leveraging its ability to correct $X$ and $Z$ errors
separately. This works because any possible single-qubit error can be
decomposed into a combination of $X$, $Z$, or both (a property known as
the *discretization of errors*). Since the code detects and corrects $X$
and $Z$ errors independently, it inherently handles all other errors as
well. Thus, no additional mechanisms are needed: correcting $X$ and $Z$
suffices to protect against arbitrary quantum noise. First we focus on
Unitary Errors.

## Modeling Unitary Qubit Errors

The 9-qubit Shor code can correct *any* single-qubit unitary error, even
those that are not close to the identity (e.g., small rotations or
arbitrary unitary operations). While it may seem challenging to correct
infinitely many possible errors, the key insight is that any
single-qubit unitary $U$ can be decomposed into a linear combination of
Pauli operators: $$U = \alpha I + \beta X + \gamma Y + \delta Z$$ where
$Y = iXZ$.

When an error $U_k$ occurs on the $k$-th qubit, the corrupted state
becomes a superposition of the original state and states with $X_k$,
$Z_k$, or $X_kZ_k$ errors. During error detection, the syndrome
measurements probabilistically collapse this superposition into one of
the Pauli error cases (or no error), with probabilities $|\alpha|^2$,
$|\beta|^2$, $|\gamma|^2$, and $|\delta|^2$. The syndrome reveals which
error occurred, allowing its correction. Remarkably, this process works
even for tiny errors, as the syndrome measurements discretize the error
into a Pauli operation, which the code is designed to fix. After
correction, the system returns to the original encoded state,
effectively removing the entropy introduced by the error. This
demonstrates the *discretization of errors*: arbitrary unitary errors
are reduced to correctable Pauli errors through syndrome measurement.

The 9-qubit Shor code corrects arbitrary unitary errors through error
discretization. For multi-qubit errors, we formally represent operations
using tensor products with identity matrices. Using Qiskit's qubit
numbering $(Q_8,Q_7,...,Q_0)$, single-qubit operations extend to the
9-qubit space as:

$$\begin{aligned}
X_0 &= I^{\otimes 8} \otimes X = I\otimes I\otimes I\otimes I\otimes I\otimes I\otimes I\otimes I\otimes X\\
Z_4 &= I^{\otimes 4} \otimes Z \otimes I^{\otimes 4}=I\otimes I\otimes I\otimes I\otimes Z \otimes I\otimes I\otimes I\otimes I \\
U_7 &= I \otimes U \otimes I^{\otimes 7} =I\otimes U\otimes I\otimes I\otimes I\otimes I\otimes I\otimes I\otimes I
\end{aligned}$$

where $I^{\otimes n}$ denotes an $n$-fold tensor product of identity
matrices. An arbitrary unitary error $U_k$ on qubit $k$ decomposes into
Pauli operators as:
$$U_k = \alpha I^{\otimes 9} + \beta X_k + \gamma Y_k + \delta Z_k$$

with $X_k$, $Z_k$ defined similarly to (1), and $Y_k = iX_kZ_k$. For
multiple errors, the formalism extends naturally:
$$U_{j,k} = (I^{\otimes (8-j)} \otimes U_j \otimes I^{\otimes j}) \cdot (I^{\otimes (8-k)} \otimes U_k \otimes I^{\otimes k})$$

The syndrome measurement projects these continuous errors onto discrete
Pauli operators. For example, a two-qubit error $U_{2,5}$ would collapse
to one of $I$, $X_2$, $Z_5$, $X_2Z_5$, etc., with probabilities
determined by the decomposition coefficients. The tensor product
structure ensures correct identification of affected qubits through the
syndrome pattern. $$\xi \otimes |\psi\rangle\langle\psi|$$

where

$$\begin{aligned}
\xi &= |\alpha|^2 |I \text{ syndrome}\rangle\langle I \text{ syndrome}| \\
      &+ |\beta|^2 |X_k \text{ syndrome}\rangle\langle X_k \text{ syndrome}| \\
      &+ |\gamma|^2 |X_k Z_k \text{ syndrome}\rangle\langle X_k Z_k \text{ syndrome}| \\
      &+ |\delta|^2 |Z_k \text{ syndrome}\rangle\langle Z_k \text{ syndrome}|.
\end{aligned}$$

## General Arbitrary Qubit Errors

We now examine arbitrary (not necessarily unitary) errors on qubits.
Specifically, we model the error using a general quantum channel $\Phi$,
which could represent various noise processes---such as dephasing,
depolarization, reset operations, or even unconventional, less-studied
channels.

To analyze $\Phi$, we first express it in terms of Kraus operators:

$$\Phi(\sigma) = \sum_j A_j \sigma A_j^\dagger,$$

where each $A_j$ is a $2 \times 2$ matrix. Since the Pauli matrices form
a basis for such operators, we expand each $A_j$ as:

$$A_j = \alpha_j I + \beta_j X + \gamma_j Y + \delta_j Z.$$

This decomposition allows us to rewrite the action of $\Phi$ on a target
qubit $k$ in terms of Pauli errors:

$$\begin{aligned}
\Phi_k \big( |\psi\rangle\langle\psi| \big) &= \sum_j \big( \alpha_j I_k + \beta_j X_k + \gamma_j Y_k + \delta_j Z_k \big) |\psi\rangle\langle\psi| \big( \alpha_j I_k + \beta_j X_k + \gamma_j Y_k + \delta_j Z_k \big)^\dagger.
\end{aligned}$$

In essence, we have reformulated the Kraus operators as linear
combinations of Pauli terms.

Upon measuring the error syndrome and applying the appropriate
correction, the resulting state resembles the unitary error case, albeit
with a more complex mixture:

$$\xi \otimes |\psi\rangle\langle\psi|,$$

where $\xi$ now incorporates contributions from all Kraus terms:

$$\begin{aligned}
\xi = \sum_j \Big( |\alpha_j|^2 |I \text{ syndrome}\rangle\langle I \text{ syndrome}|
\quad + |\beta_j|^2 |X_k \text{ syndrome}\rangle\langle X_k \text{ syndrome}|
\quad + |\gamma_j|^2 |X_k Z_k \text{ syndrome}\rangle\langle X_k Z_k \text{ syndrome}|
\quad + |\delta_j|^2 |Z_k \text{ syndrome}\rangle\langle Z_k \text{ syndrome}| \Big).
\end{aligned}$$

While the explicit derivation involves more terms, the underlying
principle remains identical to the unitary scenario: syndrome extraction
and correction project the error into distinguishable Pauli components.

## Extensions and Generalizations

The discretization of errors naturally extends to more general quantum
error-correcting codes, including those capable of detecting and
correcting errors across multiple qubits. In such scenarios, multi-qubit
errors can be represented as tensor products of Pauli matrices:
$$E = \bigotimes_{k=1}^n P_k \quad \text{where} \quad P_k \in \{I, X, Y, Z\},$$
and distinct syndromes identify corresponding Pauli corrections that may
need to be applied to multiple qubits simultaneously, rather than just a
single qubit.

Through syndrome measurement, errors are effectively projected onto a
discrete set of possibilities characterized by these Pauli tensor
products. By applying the appropriate corrections, we can recover the
original encoded state. The randomness introduced during this process is
confined to the syndrome qubits, which are subsequently either discarded
or reset. This mechanism effectively removes the generated randomness
from the system containing the encoded information, preserving the
integrity of the quantum computation.

The fundamental principle remains consistent with the single-qubit case:
error correction proceeds by

1.  Identifying error syndromes through measurement,

2.  Determining the corresponding Pauli corrections, and

3.  Isolating the randomness in ancillary qubits that are then removed
    from the system.

This approach maintains the essential features of quantum error
correction while scaling to more complex, multi-qubit error patterns.
