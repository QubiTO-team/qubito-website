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
title: "Contacts"
translationKey: "contacts-page"
showTableOfContents: false
showPagination: false
---

# Get in Touch with Us!

{{< lead >}}
We welcome collaboration opportunities and are eager to explore potential partnerships. If you’re interested in partnering with us or have any inquiries, please feel free to reach out. 
{{< /lead >}}


<div style="text-align: center;">
{{< button href="mailto:qubito@polito.it" target="_self" >}}
Send us an email!
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



# Our partners
<style>
.partner-image{
    max-height: 8rem;
    width: 25%; 
    margin-left: auto;
    margin-right: auto;"
}
</style>

<h2 style="text-align: center">Main partner</h2>

{{< figure
    src="polito_logo_blu.png"
    alt="Logo PoliTo"
    class="h-auto dark:hidden nozoom partner-image"
>}}
{{< figure
    src="polito_logo_white.png"
    alt="Logo PoliTo"
    class="h-auto hidden dark:flex nozoom partner-image"
>}}


## Follow Us

{{< lead >}}
Stay updated on our latest projects and events by following us on social media!
{{< /lead >}}

+ [Instagram {{<icon "instagram" >}}](https://www.instagram.com/qubitoteam_polito/)
+ [Linkedin {{<icon "linkedin" >}}](https://www.linkedin.com/company/qubito-student-team-politecnico-di-torino/)


## We Appreciate Your Support!

{{< lead >}}
Whether you have questions, suggestions, or just want to say hello, your input means the world to us. Thank you for being a part of our journey!
{{< /lead >}}