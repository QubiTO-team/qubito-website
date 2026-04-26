---
title: "Introduction to Classical Cryptography"
weight: 14
date: 2025-03-23
summary: "This article explores the core principles of classical cryptography by analyzing the mechanics and brute-force vulnerabilities of Caesar and Substition ciphers. It further examines the One-Time Pad and discusses true randomness in achieving digital security."
tags: ["Cryptography", "OTP","Security"]
authors: ["QubiTO Cryptography Group"]
slug: "introduction-classical-cryptography"  
translationKey: "introduction-classical-cryptography"
---

Cryptography is a field that has evolved from a mystic practice used by military or government organizations, to a field that is connected with modern science in terms of digital security. Especially, examining classical ciphers, like the Caesar Cipher, reveals why the field required this rigorous transformation, particularly when the implementation of an attack is as simple as running a 26-step loop.

This article will briefly explain the core principles and importance of classical ciphers (specializing on the Caesar Cipher) and demonstrate the concepts provided by our student team that perform a brute-force attack.

## Cryptography in General

Classical cryptography was designated for securing a secret communication between two parties in the presence of a threat, possibly an eavesdropper. The codes that are designed for this purpose are called encryption schemes. In terms of operational foundation, these schemes are based on the private-key (or symmetric-key) setting, where a secret key ($k$), shared between both parties, exists.

The private-key process involves three core algorithms:
* **Key Generation (Gen):** A procedure for creating the shared key $k$. The set of all possible keys forms the key space ($K$).
* **Encryption (Enc):** The sender uses the shared key $k$ to "scramble" the plaintext ($m$) into an unreadable ciphertext ($c$): ($c = Enc(m)$).
* **Decryption (Dec):** The receiver uses the exact same key $k$ to "unscramble" the ciphertext and recover the original plaintext ($m = Dec(c)$).

### Kerckhoffs's Principle
Regarding whether the algorithms should be kept secret, Auguste Kerckhoff summarized what is now known as Kerckhoffs' Principle:

> "An encryption scheme should be designed to be secure even if an eavesdropper knows all the details of the scheme, so long as the attacker doesn't know the key being used. Security must rely solely on the secrecy of the key."

## Caesar's Cipher

One of the oldest known ciphers is the Caesar's Cipher (also known as Shift Cipher). It's based on "shifting" the alphabet a $k$ number places and therefore only needs an integer as a key. For example, we are able to shift our regular alphabet 3 places to the left:



Regular Alphabet *(Key = 0):*

| A | B | C | D | E | F | G | H | I | J | K | L | M |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| *N* | *O* | *P* | *Q* | *R* | *S* | *T* | *U* | *V* | *W* | *X* | *Y* | *Z* |
| 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 |

Shifted Alphabet *(Key = 3):*

| A | B | C | D | E | F | G | H | I | J | K | L | M |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
| *N* | *O* | *P* | *Q* | *R* | *S* | *T* | *U* | *V* | *W* | *X* | *Y* | *Z* |
| 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 0 | 1 | 2 |

Therefore our plaintext "HELLOWORLD" is encrypted into "EBIILTLOIA". Using the 26 letters of the English alphabet, one can only create up to 26 possible keys (from 0 to 25). This makes the Caesar's Cipher unsafe, as its encryption scheme is fixed and thus can be cracked effortlessly; even brute-forcing the solution only requires a $O(N)$ complex algorithm.

## Substitution Cipher

The substitution Cipher maps every symbol in a given set with a different one in the same set. This means that the key space used to encrypt the plaintext is $N!$ (where $N$ is 26 for the English alphabet). This renders a brute force attack computationally impossible.

*Example:*
* *Plaintext:* TELLHIMABOUTME
* *Ciphertext:* GDOOKVCXEFLGCD
* *Key (alphabet mapping):* XEUADNBKVMROCQFSYHWGLZIJPT

It is possible to attack this cipher method by comparing the number of occurrences of each letter in the ciphertext with the statistical frequencies of the English alphabet. Our code implements a better 'attack resistance', which takes advantage of the fact that the sum of the squares of the frequencies of the letters of the English alphabet is roughly equal to *0.065*.

## One Time Pad (OTP)

The one time pad is a perfectly secret encryption scheme (mathematically impossible to break). To ensure perfect secrecy, it requires:
* A pre-shared truly random key as long as the plaintext, used only once.
* Each bit/character of the plaintext combined with the corresponding bit in the key.
* The key and the message must be used exclusively together; no reuse of keys.
* Both communicating parties must keep the key absolutely secret.



### Min-Entropy and Security
If the key is generated poorly, the cipher becomes vulnerable. We use *min-entropy* to measure the uncertainty remaining if an attacker guesses the most likely value:

$$H_{\infty}(K) = -\log_2(\max P(K = k))$$

For example, if a generator returns key 00000000 with probability 0.5:
$$H_{\infty}(K) = -\log_2(0.5) = 1$$

Thus, even though the key space is 256, there is only *1 bit of effective security*. A regular computer is unable to provide acceptable key values as they are generated deterministically.

## Conclusion

The evolution of classical cryptography aims for secure communication centered on Kerckhoffs' Principle, which claims security must depend entirely on the secrecy of the key. 

* **Caesar’s Cipher:** Historically important but insecure due to its small key space (26 keys). 
* **Substitution Cipher:** Significantly improves security with a key space of $N!$ (26!).
* **One-Time Pad (OTP):** Provides theoretical perfection but can be impractical due to key management.

As a result, OTP provides theoretical perfection but can be impractical. A Quantum Computer is able to generate required key values non-deterministically and is thus able to solve the min-entropy problem in digital security.
