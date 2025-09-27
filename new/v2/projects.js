// projects.js — images + optional per-project sound sample

const snd = (n) => new URL(`sounds/${n}.wav`, document.baseURI).href;

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
  // A few examples with sounds up front
  { title: "Project 95", image: "images/00095.jpg", sound: snd(87), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 96", image: "images/00096.jpg", sound: snd(40), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 97", image: "images/00097.jpg", sound: snd(41), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 98", image: "images/00098.jpeg", sound: snd(42), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 99", image: "images/00099.jpg", sound: snd(43), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 100", image: "images/00100.jpg", sound: snd(44), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 101", image: "images/00101.jpg", sound: snd(45), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 102", image: "images/00102.jpg", sound: snd(46), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 103", image: "images/00103.jpeg", sound: snd(47), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 104", image: "images/00104.jpg", sound: snd(48), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 105", image: "images/00105.jpg", sound: snd(49), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 106", image: "images/00106.jpg", sound: snd(50), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 107", image: "images/00107.jpg", sound: snd(51), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 108", image: "images/00108.jpg", sound: snd(52), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 109", image: "images/00109.jpg", sound: snd(53), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 110", image: "images/00110.jpg", sound: snd(54), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 111", image: "images/00111.jpg", sound: snd(55), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 112", image: "images/00112.jpg", sound: snd(56), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 113", image: "images/00113.jpg", sound: snd(57), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 114", image: "images/00114.jpg", sound: snd(58), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 115", image: "images/00115.jpg", sound: snd(59), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 116", image: "images/00116.jpg", sound: snd(60), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 117", image: "images/00117.jpg", sound: snd(61), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 118", image: "images/00118.jpg", sound: snd(62), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 119", image: "images/00119.jpg", sound: snd(63), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 120", image: "images/00120.jpg", sound: snd(64), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 121", image: "images/00121.jpg", sound: snd(65), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 122", image: "images/00122.jpg", sound: snd(66), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 123", image: "images/00123.jpg", sound: snd(67), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 124", image: "images/00124.jpg", sound: snd(68), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 125", image: "images/00125.jpg", sound: snd(69), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 126", image: "images/00126.jpg", sound: snd(70), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 127", image: "images/00127.jpg", sound: snd(71), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 128", image: "images/00128.jpg", sound: snd(72), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 129", image: "images/00129.jpg", sound: snd(73), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 130", image: "images/00130.jpg", sound: snd(74), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 131", image: "images/00131.jpg", sound: snd(75), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 132", image: "images/00132.jpg", sound: snd(76), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 133", image: "images/00133.jpg", sound: snd(77), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 134", image: "images/00134.jpg", sound: snd(78), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 135", image: "images/00135.jpeg", sound: snd(79), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 136", image: "images/00136.jpg", sound: snd(80), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 137", image: "images/00137.jpg", sound: snd(81), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 138", image: "images/00138.jpg", sound: snd(82), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 139", image: "images/00139.jpg", sound: snd(83), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 140", image: "images/00140.jpg", sound: snd(84), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 141", image: "images/00141.jpg", sound: snd(85), year: getRandomYear(), tags: getRandomTags() },
  { title: "Project 142", image: "images/00142.jpg", sound: snd(86), year: getRandomYear(), tags: getRandomTags() },
];
