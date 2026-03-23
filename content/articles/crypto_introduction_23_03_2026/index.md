---
title: "Introduzione alla Crittografia Classica"
weight: 14
date: 2025-03-23
summary: "..."
tags: ["Crypto", "OTP"]
authors: ["QubiTO Cryptography Group"]
slug: "introduzione-crittografia-classica"  
translationKey: "introduction-classical-cryptography"
---

## Introduction
Cryptography is a field that has evolved from a mystical practice used by military or government organizations, to a field that is connected with modern science in terms of digital security. Especially, examining classical ciphers, like the Caesar's Cipher, reveals why the field required this rigorous transformation, particularly when the implementation of an attack is as simple as running a 26-step loop. 

This article will briefly explain the core principles and importance of classical ciphers (specializing on the Caesar's Cipher) and demonstrate the codes provided by our student team that perform a brute-force attack.

## Cryptography in General
Classical cryptography was designated for securing a secret communication between two parties in the presence of a threat, possibly an eavesdropper. The codes that are designed for this purpose are called encryption schemes. 

In terms of operational foundation, these schemes are based on the private-key (or symmetric-key) setting, where a secret key ($k$), shared between both parties, exists. The private-key process involves three core algorithms:

\begin{enumerate}
    \item \textbf{Key Generation (Gen):} A procedure for creating the shared key $k$. The set of all possible keys forms the key space ($K$).
    \item \textbf{Encryption (Enc):} The sender uses the shared key $k$ to "scramble" the plaintext ($m$) into an unreadable ciphertext ($c$) ($c=Enc(m)$).
    \item \textbf{Decryption (Dec):} The receiver uses the exact same key $k$ to "unscramble" the ciphertext and recover the original plaintext ($m=Dec(c)$).
\end{enumerate}

## Kerckhoffs's Principle
Regarding whether the algorithms should be kept secret, Auguste Kerckhoff summarized what is now known as Kerckhoffs' Principle: 
\begin{quote}
"An encryption scheme should be designed to be secure even if an eavesdropper knows all the details of the scheme, so long as the attacker doesn't know the key being used. Security must rely solely on the secrecy of the key." 
\end{quote}

## Caesar's Cipher
One of the oldest known ciphers is the Caesar's Cipher (also known as Shift Cipher). It's based on "shifting" the alphabet a $k$ number places and therefore only needs an integer as a key. For example, shifting the regular alphabet 3 places to the left results in the following mapping:

\begin{table}[h]
\centering
\begin{tabular}{|c|c|c|c|c|c|c|c|c|c|c|c|c|}
\hline
A & B & C & D & E & F & G & H & I & J & K & L & M \\ \hline
0 & 1 & 2 & 3 & 4 & 5 & 6 & 7 & 8 & 9 & 10 & 11 & 12 \\ \hline
N & O & P & Q & R & S & T & U & V & W & X & Y & Z \\ \hline
13 & 14 & 15 & 16 & 17 & 18 & 19 & 20 & 21 & 22 & 23 & 24 & 25 \\ \hline
\end{tabular}
\end{table}

shifted version is:
\begin{table}[h]
\centering
\begin{tabular}{|c|c|c|c|c|c|c|c|c|c|c|c|c|}
\hline
A & B & C & D & E & F & G & H & I & J & K & L & M \\ \hline
3 & 4 & 5 & 6 & 7 & 8 & 9 & 10 & 11 & 12 & 13 & 14 & 15 \\ \hline
N & O & P & Q & R & S & T & U & V & W & X & Y & Z \\ \hline
16 & 17 & 18 & 19 & 20 & 21 & 22 & 23 & 24 & 25 & 0 & 1 & 2 \\ \hline
\end{tabular}
\end{table}

Therefore, the plaintext \texttt{HELLOWORLD} is encrypted into \texttt{EBIILTLOIA}. With the 26 letters of the English alphabet, there are only 26 possible keys (0 to 25), making Caesar’s Cipher unsafe, as its encryption scheme is fixed and thus can be cracked effortlessly; even brute-forcing the solution (trying out all the possible keys) only requires a O(N) complex algorithm (as shown in the code).

## Substitution Cipher
The substitution Cipher maps every symbol in a given set (for example, the English alphabet) with a different one in the same set. This means that the key space used to encrypt the plaintext is $N!$ (where $N$ is the number of symbols in the set, 26 in our previous example). This renders a brute force attack computationally impossible.

Below, an example of a plaintext and its encrypted ciphertext:

\begin{center}
    \texttt{TELLHIMABOUTME} \\
    \texttt{GDOOKVCXEFLGCD} 
\end{center}

Which uses the following key (which maps to the alphabet, in order):

\begin{center}
    \texttt{XEUADNBKVMROCQFSYHWGLZIJPT} 
\end{center}

It is possible to attack this cipher method by comparing the number of occurrences of each letter in the ciphertext with the statistical frequencies of the letters of the English alphabet. While this will never map 1:1 unless the ciphertext is very long, it's still useful empirically.

The code implements a better 'attack resistance', which takes advantage of the fact that the sum of the squares of the frequencies of the letters of the English alphabet is roughly equal to 0.065. This in turn allows us to compare it with every possible shift in the cipher alphabet to determine the best fit.

## One Time Pad
The one time pad is a perfectly secret encryption scheme (mathematically impossible to break) that has the following properties in order to ensure perfect secrecy:
\begin{enumerate}
    \item A pre-shared key between the parties which is as long as the plaintext that has to be encrypted which can only be used once, the key must be truly random.
    \item Each bit/character of the plaintext is combined with the corresponding bit in the key to generate a ciphertext.
    \item The key and the message may only be used exclusively together. Different messages may not be encrypted with the same key and the same key may not be used in part or fully after being used once.
    \item Both communicating parties must keep the key absolutely secret.
\end{enumerate}

The properties listed above provide the requirements for an encryption scheme to be perfectly secure. However, perfect encryption may not be necessary for all applications as the one time pad may be impractical in certain situations. Most remarkably, as the key is as long as the plaintext and must be shared in advance, it may be more practical to keep the plaintext secret in the first place. Also, the length of the key makes it difficult in terms of practicality when sending very long messages.

For the truly random key to be generated, a truly random number generator is necessary, which is difficult with current computational methods. Moreover, a One-Time Pad Cipher could be made less secure if the key is generated poorly. For example, a generator that returns key \texttt{00000000} with probability 0.5 would render a ciphertext vulnerable to brute force. To compute this, we use the concept of \textbf{min-entropy}, which measures bits of uncertainty:

$$H_{\infty}(K) = -\log_2(\max P(K = k))$$ 

In our case, the probability of key \texttt{00000000} being returned is 0.5, so:

$$H_{\infty}(K) = -\log_2(0.5) = 1$$ 

Thus, even though the key space is 256, there's only 1 bit of effective security. A regular computer is unable to provide acceptable key values as they are generated deterministically.

\section{Conclusion}
The evolution of classical cryptography aims for secure communication, centered on Kerckhoffs' Principle, which claims security must depend entirely on the secrecy of the key rather than the algorithm. 

Ciphers can be summarized as:
\begin{itemize}
    \item \textbf{Caesar’s Cipher:} Historically important but inherently insecure due to its fixed scheme and small key space (26 keys).
    \item \textbf{Substitution Cipher:} Significantly improves security by mapping each symbol to another, resulting in a key space of $N!$ (26!).
    \item \textbf{One-Time Pad (OTP):} A perfectly secret scheme, mathematically impossible to break, requiring a truly random pre-shared key as long as the plaintext.
\end{itemize}

As a result, OTP provides theoretical perfection but can be impractical. A Quantum Computer is able to generate the required key values non-deterministically and is thus able to solve the min-entropy problem referenced in section 5.

\end{document}