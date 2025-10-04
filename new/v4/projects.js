// projects.js — images + optional per-project sound sample

const snd = (n) => new URL(`sounds/${n}.wav`, document.baseURI).href;

// Cache busting version - update this when images change
export const IMAGE_VERSION = "v2";

// Helper function to get random year (single year per project)
const getRandomYear = () => {
  const years = [2020, 2021, 2022, 2023, 2024, 2025];
  return years[Math.floor(Math.random() * years.length)];
};

// Helper function to get random tags
const getRandomTags = () => {
  const allTags = ["Light", "Installation", "Education", "AV", "Mixed Reality", "Stage"];
  const numTags = Math.floor(Math.random() * 3) + 1; // 1-3 tags
  return allTags.sort(() => 0.5 - Math.random()).slice(0, numTags);
};

export const projects = [
  {
    title: "Course Designer at Svenska Tecknare",
    images: ["images/Course-designer-at-Svenska-Tecknare.jpg"],
    sound: snd(40),
    year: getRandomYear(),
    tags: getRandomTags(),
  },
  {
    title: "Crack at Nowhere",
    images: ["images/Crack-at-Nowhere-1.jpg", "images/Crack-at-Nowhere-2.jpg"],
    sound: snd(41),
    year: getRandomYear(),
    tags: getRandomTags(),
  },
  {
    title: "Danny Saucedo",
    images: ["images/Danny-Saucedo-1.jpg", "images/Danny-Saucedo-2.jpg", "images/Danny-Saucedo-3.jpg"],
    sound: snd(43),
    year: getRandomYear(),
    tags: getRandomTags(),
  },
  {
    title: "Dendrolux at Into the Woods",
    images: ["images/Dendrolux-at-Into-the-Woods-1.jpg", "images/Dendrolux-at-Into-the-Woods-2.jpg"],
    sound: snd(46),
    year: getRandomYear(),
    tags: getRandomTags(),
  },
  {
    title: "Dendrolux at Tjoloholms Slott",
    images: [
      "images/Dendrolux-at-Tjoloholms-Slott-1.jpg",
      "images/Dendrolux-at-Tjoloholms-Slott-2.jpg",
      "images/Dendrolux-at-Tjoloholms-Slott-3.jpg",
      "images/Dendrolux-at-Tjoloholms-Slott-4.jpg",
      "images/Dendrolux-at-Tjoloholms-Slott-5.jpg",
      "images/Dendrolux-at-Tjoloholms-Slott-6.jpg",
      "images/Dendrolux-at-Tjoloholms-Slott-7.jpg",
    ],
    sound: snd(48),
    year: getRandomYear(),
    tags: getRandomTags(),
  },
  {
    title: "Eastern City Portal",
    images: [
      "images/Eastern-City-Portal-1.jpg",
      "images/Eastern-City-Portal-2.jpg",
      "images/Eastern-City-Portal-3.jpg",
      "images/Eastern-City-Portal-4.jpg",
      "images/Eastern-City-Portal-5.jpg",
      "images/Eastern-City-Portal-6.jpg",
      "images/Eastern-City-Portal-7.jpg",
      "images/Eastern-City-Portal-8.jpg",
      "images/Eastern-City-Portal-9.jpg",
      "images/Eastern-City-Portal-10.jpg",
    ],
    sound: snd(55),
    year: getRandomYear(),
    tags: getRandomTags(),
  },
  {
    title: "Embed at Hobo Hotel",
    images: ["images/Embed-at-Hobo-Hotel.jpg"],
    sound: snd(65),
    year: getRandomYear(),
    tags: getRandomTags(),
  },
  {
    title: "Emerging Sensation",
    images: ["images/Emerging-Sensation-1.jpg", "images/Emerging-Sensation-2.jpg", "images/Emerging-Sensation-3.jpg"],
    sound: snd(66),
    year: getRandomYear(),
    tags: getRandomTags(),
  },
  {
    title: "Firestarter at Nowhere",
    images: [
      "images/Firestarter-at-Nowhere-1.jpg",
      "images/Firestarter-at-Nowhere-2.jpg",
      "images/Firestarter-at-Nowhere-3.jpg",
      "images/Firestarter-at-Nowhere-4.jpg",
      "images/Firestarter-at-Nowhere-5.jpg",
      "images/Firestarter-at-Nowhere-6.jpg",
      "images/Firestarter-at-Nowhere-7.jpg",
      "images/Firestarter-at-Nowhere-8.jpg",
      "images/Firestarter-at-Nowhere-9.jpg",
      "images/Firestarter-at-Nowhere-10.jpg",
    ],
    sound: snd(69),
    year: getRandomYear(),
    tags: getRandomTags(),
  },
  {
    title: "Harpa Light Organ at Sonar Reykjavik",
    images: ["images/Harpa-Light-Organ-at-Sonar-Reykjavik.jpg"],
    sound: snd(79),
    year: getRandomYear(),
    tags: getRandomTags(),
  },
  {
    title: "Harpa Touch at Sonar Reykjavik",
    images: ["images/Harpa-Touch-at-Sonar-Reykjavik.jpg"],
    sound: snd(80),
    year: getRandomYear(),
    tags: getRandomTags(),
  },
  {
    title: "Haven at Icehotel",
    images: ["images/Haven-at-Icehotel.jpg"],
    sound: snd(81),
    year: getRandomYear(),
    tags: getRandomTags(),
  },
  {
    title: "Heroes at Nobel Week Lights",
    images: ["images/Heroes-at-Nobel-Week-Lights-1.jpg", "images/Heroes-at-Nobel-Week-Lights-2.jpg"],
    sound: snd(82),
    year: getRandomYear(),
    tags: getRandomTags(),
  },
  {
    title: "Jag ar Gud at Kulturhuset Stadsteatern",
    images: [
      "images/Jag-ar-Gud-at-Kulturhuset-Stadsteatern-1.jpg",
      "images/Jag-ar-Gud-at-Kulturhuset-Stadsteatern-2.jpg",
      "images/Jag-ar-Gud-at-Kulturhuset-Stadsteatern-3.jpg",
      "images/Jag-ar-Gud-at-Kulturhuset-Stadsteatern-4.jpg",
      "images/Jag-ar-Gud-at-Kulturhuset-Stadsteatern-5.jpg",
      "images/Jag-ar-Gud-at-Kulturhuset-Stadsteatern-6.jpg",
      "images/Jag-ar-Gud-at-Kulturhuset-Stadsteatern-7.jpg",
      "images/Jag-ar-Gud-at-Kulturhuset-Stadsteatern-8.jpg",
      "images/Jag-ar-Gud-at-Kulturhuset-Stadsteatern-9.jpg",
      "images/Jag-ar-Gud-at-Kulturhuset-Stadsteatern-10.jpg",
    ],
    sound: snd(84),
    year: getRandomYear(),
    tags: getRandomTags(),
  },
  {
    title: "Lights for Ukraine",
    images: ["images/Lights-for-Ukraine-1.jpg", "images/Lights-for-Ukraine-2.jpg"],
    sound: snd(46),
    year: getRandomYear(),
    tags: getRandomTags(),
  },
  {
    title: "Lyra",
    images: ["images/Lyra.jpg"],
    sound: snd(48),
    year: getRandomYear(),
    tags: getRandomTags(),
  },
  {
    title: "Myriad at Reaktorhallen R1",
    images: [
      "images/Myriad-at-Reaktorhallen-R1-1.jpg",
      "images/Myriad-at-Reaktorhallen-R1-2.jpg",
      "images/Myriad-at-Reaktorhallen-R1-3.jpg",
    ],
    sound: snd(49),
    year: getRandomYear(),
    tags: getRandomTags(),
  },
  {
    title: "Mystery on the Icehotel Express at Icehotel",
    images: ["images/Mystery-on-the-Icehotel-Express-at-Icehotel.jpg"],
    sound: snd(52),
    year: getRandomYear(),
    tags: getRandomTags(),
  },
  {
    title: "People in Orbit",
    images: ["images/People-in-Orbit-1.jpg", "images/People-in-Orbit-2.jpg"],
    sound: snd(53),
    year: getRandomYear(),
    tags: getRandomTags(),
  },
  {
    title: "Retrospectives at Nowhere",
    images: ["images/Retrospectives-at-Nowhere.jpg"],
    sound: snd(55),
    year: getRandomYear(),
    tags: getRandomTags(),
  },
  {
    title: "Sala Hjartslag at Sala kommun",
    images: ["images/Sala-Hjartslag-at-Sala-kommun.jpg"],
    sound: snd(56),
    year: getRandomYear(),
    tags: getRandomTags(),
  },
  {
    title: "TinyMassive at Sonar Reykjavik",
    images: ["images/TinyMassive-at-Sonar-Reykjavik.jpg"],
    sound: snd(57),
    year: getRandomYear(),
    tags: getRandomTags(),
  },
  {
    title: "Transcend",
    images: ["images/Transcend.jpg"],
    sound: snd(58),
    year: getRandomYear(),
    tags: getRandomTags(),
  },
  {
    title: "Tufting Ex Machina",
    images: [
      "images/Tufting-Ex-Machina-1.jpg",
      "images/Tufting-Ex-Machina-2.jpg",
      "images/Tufting-Ex-Machina-3.jpg",
      "images/Tufting-Ex-Machina-4.jpg",
      "images/Tufting-Ex-Machina-5.jpg",
      "images/Tufting-Ex-Machina-6.jpg",
      "images/Tufting-Ex-Machina-7.jpg",
      "images/Tufting-Ex-Machina-8.jpg",
      "images/Tufting-Ex-Machina-9.jpg",
    ],
    sound: snd(59),
    year: getRandomYear(),
    tags: getRandomTags(),
  },
  {
    title: "Vista",
    images: ["images/Vista-1.jpg", "images/Vista-2.jpg", "images/Vista-3.jpg", "images/Vista-4.jpg"],
    sound: snd(68),
    year: getRandomYear(),
    tags: getRandomTags(),
  },
];
