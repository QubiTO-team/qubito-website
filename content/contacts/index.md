---
type: "page"
list: false  # Disabilita il layout a lista
layout: single  # Forza il layout a pagina singola
showDate: false
showDateUpdated: false
showWordCount: false
showViews: false
showLikes: false
showReadingTime: false
showHeadingAnchors: false
showZenMode: false
title: "Contatti"
translationKey: "contacts-page"
showTableOfContents: false
showPagination: false
---


# Mettiti in Contatto con Noi!
{{< lead >}}
Se desideri supportarci nella nostra missione o unirti a noi nel nostro percorso, non esitare a contattarci. Siamo sempre grati per l'aiuto e il sostegno della nostra comunità.
{{< /lead >}}



<div style="text-align: center;">
{{< button href="mailto:qubito@polito.it" target="_self" >}}
Scrivici!
{{< /button >}} 


<html> 
<script>
  document.addEventListener("DOMContentLoaded", function () {
    // Initialize TypeIt for the overview subtitle
    new TypeIt(".email-field", {
      speed: 200,
      startDelay: 2000,
      lifeLike: true,
      breakLines: false,
      waitUntilVisible: true,
      loop: false,
      cursor: true,
      afterComplete: function (instance) {
        // instance.destroy();
      },
    })
      .type("qubito@polito.it", { delay: 700 })
      .go();
  });
</script>
    <br>
    <a
    href="mailto:qubito@polito.it"
    class="email-field"
    style= "
        font-size: 2rem;
        color: var(--color-neutral-200)    
    "></a>
</html>

</div>


# I nostri partner

<h2 style="text-align: center">Partner principale</h2>

<a href="https://www.polito.it/" target="_blank" rel="noopener">
        <img src="./polito_logo_blu.png"
            alt="Politecnico Logo"
            class="h-auto dark:hidden nozoom"
            style="
                max-height: 8rem;
                width: 25%; 
                margin-left: auto;
                margin-right: auto;"
        />
        <img src="./polito_logo_white.png" 
            alt="Politecnico Logo" 
            class="h-auto hidden dark:flex nozoom"dark:flex
            style="
                max-height: 8rem;
                width: 25%; 
                margin-left: auto;
                margin-right: auto;"
        />
      </a>

# Seguici

{{< lead >}}
Rimani aggiornato sui nostri ultimi progetti ed eventi seguendoci sui social media!
{{< /lead >}}

+ [Instagram {{<icon "instagram" >}}](https://www.instagram.com/qubitoteam_polito/)
+ [Linkedin {{<icon "linkedin" >}}](https://www.linkedin.com/company/qubito-student-team-politecnico-di-torino/)

## Il tuo aiuto è molto importante per noi!

{{< lead >}}
Che tu abbia domande, suggerimenti o semplicemente voglia salutarci, il tuo contributo è prezioso per noi. Grazie per essere con noi in questa avventura!
{{< /lead >}}
