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
Siamo felici di accogliere proposte di collaborazione e siamo entusiasti di esplorare potenziali partnership. Se sei interessato a collaborare con noi o hai domande, non esitare a contattarci.
{{< /lead >}}



<div style="text-align: center;">
<div>
{{< button href="mailto:qubito@polito.it" target="_self" >}}
Scrivici!
{{< /button >}} 
</div>

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
<style>
.partner-image{
    max-height: 10rem;
    width: auto; 
    margin-left: auto;
    margin-right: auto;"
}
</style>


<h2 style="text-align: center">Partner principale</h2>

{{< figure
    src="polito_logo_blu.png"
    alt="Logo PoliTo"
    class="dark:hidden nozoom partner-image"
>}}
{{< figure
    src="polito_logo_white.png"
    alt="Logo PoliTo"
    class="hidden dark:flex nozoom partner-image"
>}}

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
