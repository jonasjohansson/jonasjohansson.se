const url = location.href;
const id = url ? url.split("?")[1] : location.search.slice(1);

if (id) {
  switch (id) {
    case "vrsci":
      location.href = "https://jonasjohansson.github.io/virtualdancer/ar";
      break;
    case "vrscifest":
      location.href = "https://jonasjohansson.github.io/virtualdancer/ar";
      break;
    case "vrscifestbeckmans":
      location.href = "https://jonasjohansson.se/";
      break;
    case "1":
      alert(
        "The following experience uses the Instagram app, and requires that it is installed. Functionality and experience may vary depending on your device."
      );
      location.href = "https://www.instagram.com/ar/246383379934365/";
      break;
    case "2":
      location.href = "https://aavistus.glitch.me/";
      break;
    case "3":
      location.href = "https://markuskyrkan.glitch.me/";
      break;
    case "4":
      alert(
        "Information till dig som vill titta på Augmented Reality-textilierna i Markuskyrkan. Du skickas snart till Instagram, där du klickar på smiley-symbolen och väljer en av de tre effekterna: SKREA, HIDE eller UNNA. Varje effekt är kopplad till en textil. För att effekten ska fungera behöver ditt Instagram samt telefon vara uppdaterad, och du behöver ställa dig så att hela tyget syns i kameran. Kram, Jonas Johansson."
      );
      location.href = "https://instagram.com/jnsjohansson/";
      break;
    case "5":
      location.href = "https://www.instagram.com/ar/386247699446530/";
      break;
    case "6":
      location.href = "https://www.instagram.com/ar/660719167804465/";
      break;
    default:
      location.href = location.origin;
      break;
  }
}
