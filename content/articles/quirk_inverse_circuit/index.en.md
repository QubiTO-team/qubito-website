---
title: "Inverse Circuits with Quirk"
weight: 14
date: 2025-08-31
summary: "."
tags: ["Quantum Circuits", "Quirk"]
authors: ["Edoardo Frulla", "Antoniopio Sansevrino"]
slug: "inverse-circuits-quirk"  
translationKey: "inverse-circuits-quirk"
---

## Understand Quirk

[Quirk](https://algassert.com/quirk) is a useful online and open source tool to tinker with quantum circuits.
We as a team found it really useful in the past to use it to get a glimpse of the probabilistic results of the measurements of given unitary evolutions.
Most importantly, this simulator is open-source on [GitHub](https://github.com/Strilanc/Quirk), allowing everyone to run it on different pieces of softwares. That's useful considering that online the simulation is limited to 16 qubits, while running locally that block can be overridden with the help of powerful computational units as GPUs.

## Our goal
In this article we want to show how to tackle an interesting challenge using Quirk: how, given two input circuit, are we able to detect if their combination is the identity? This is a type of problem our team stumbled upon during the ETH hackaton. In particular the problem here was to find equivalent expression of different circuits. To do this we used the simulator to find non-trivial (meaning that we didn't have to simply invert the order of the input circuit) expression ofthe inverse of the beginning circuit. 

## An example
To understand the problem better, let's say we want to find an equivalent of this [circuit](#cz):

![circuit](images/cz.png "CZ circuit|cz" )

Our goal was to find equivalent expressions for our circuit. If we think a bit, we can understand that we have this equivalent [circuit](#chxh):

![circuit](images/chxh.png "CHXH circuit|chxh" )

Remember, to check if they are the same it is not sufficient to check the output shown, since it is showing the result only for a given input state. 
Our circuit represents a unitary transformation, that in a finite dimensional situation, like the one we are working with, means simply that our circuit is linked biunivocally with a square complex matrix.

## A bit of maths
To check if two differently shown circuits are the same, meaning they transform each input state in the same way, we need to check if the two matrices are the equal. 

Since each unitary matrix necessarily has an inverse, we can check the condition 
$$
A = B
$$
if we check that
$$
AB^{-1} = I .
$$

But how we can do this if we are working with a graphical simulator like Quirk?


## How-to
In [this example](https://algassert.com/quirk#circuit=%7B%22cols%22%3A%5B%5B%22H%22%2C%22H%22%5D%2C%5B%22%E2%80%A2%22%2C1%2C%22X%22%5D%2C%5B1%2C%22%E2%80%A2%22%2C1%2C%22X%22%5D%5D%7D)
we can see a piece of hte 
