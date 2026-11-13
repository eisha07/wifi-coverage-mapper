const BUILDINGS = [
  { id: "gate", name: "Main Gate" },
  { id: "seecs", name: "SEECS" },
  { id: "nbs", name: "NBS" },
  { id: "library", name: "Central Library" },
  { id: "smme", name: "SMME" },
  { id: "sada", name: "SADA" },
  { id: "cafe", name: "Concordia Café" },
  { id: "hostels", name: "Hostels" },
  { id: "sports", name: "Sports Complex" }
];

const ISSUE_TYPES = {
  "no-signal": { label: "No signal", weight: 50 },
  drops: { label: "Keeps disconnecting", weight: 35 },
  slow: { label: "Very slow", weight: 25 },
  login: { label: "Login portal fails", weight: 20 }
};

const DEVICES = {
  laptop: "Laptop",
  phone: "Phone",
  tablet: "Tablet",
  other: "Other"
};

const SAMPLE_REPORTS = [
  {
    id: "r-101",
    building: "seecs",
    floor: 2,
    spot: "Lab 3",
    type: "drops",
    bars: 1,
    speed: 2.4,
    hoursAgo: 3,
    device: "laptop",
    note: "Drops every 5–10 minutes during lab sessions when the room is full.",
    reporter: "ayesha.k@seecs.edu.pk",
    status: "open",
    confirms: 4
  },
  {
    id: "r-102",
    building: "seecs",
    floor: 0,
    spot: "Main foyer",
    type: "slow",
    bars: 3,
    speed: 4.1,
    hoursAgo: 20,
    device: "phone",
    note: "Full-ish bars but pages crawl around lunch time.",
    reporter: "hamza.r@seecs.edu.pk",
    status: "open",
    confirms: 1
  },
  {
    id: "r-103",
    building: "library",
    floor: 1,
    spot: "Quiet study hall",
    type: "no-signal",
    bars: 0,
    speed: 0,
    hoursAgo: 6,
    device: "laptop",
    note: "Back corner near the windows has no network at all.",
    reporter: "sana.m@nust.edu.pk",
    status: "open",
    confirms: 6
  },
  {
    id: "r-104",
    building: "hostels",
    floor: 3,
    spot: "Room 312 corridor",
    type: "drops",
    bars: 1,
    speed: 1.2,
    hoursAgo: 30,
    device: "phone",
    note: "Disconnects every night after 11 pm, reconnects in the morning.",
    reporter: "bilal.a@seecs.edu.pk",
    status: "open",
    confirms: 3
  },
  {
    id: "r-105",
    building: "cafe",
    floor: 0,
    spot: "Outdoor seating",
    type: "slow",
    bars: 2,
    speed: 3.5,
    hoursAgo: 50,
    device: "phone",
    note: "Video calls freeze. Indoor tables are fine.",
    reporter: "zainab.h@nbs.nust.edu.pk",
    status: "open",
    confirms: 0
  },
  {
    id: "r-106",
    building: "nbs",
    floor: 1,
    spot: "Seminar hall",
    type: "login",
    bars: 4,
    speed: 0.5,
    hoursAgo: 12,
    device: "laptop",
    note: "Captive portal page never loads, so I can't sign in.",
    reporter: "usman.t@nbs.nust.edu.pk",
    status: "open",
    confirms: 2
  },
  {
    id: "r-107",
    building: "smme",
    floor: 2,
    spot: "Workshop B",
    type: "no-signal",
    bars: 0,
    speed: 0,
    hoursAgo: 72,
    device: "tablet",
    note: "Access point was unplugged. IT fixed it the next day.",
    reporter: "maryam.f@smme.nust.edu.pk",
    status: "resolved",
    confirms: 1
  },
  {
    id: "r-108",
    building: "sports",
    floor: 0,
    spot: "Gym entrance",
    type: "slow",
    bars: 1,
    speed: 6.8,
    hoursAgo: 9,
    device: "phone",
    note: "",
    reporter: "ali.n@seecs.edu.pk",
    status: "open",
    confirms: 0
  },
  {
    id: "r-109",
    building: "seecs",
    floor: 3,
    spot: "Faculty block",
    type: "login",
    bars: 3,
    speed: 12,
    hoursAgo: 100,
    device: "laptop",
    note: "Portal rejected valid passwords for a day. Resolved after reset.",
    reporter: "dr.imran@seecs.edu.pk",
    status: "resolved",
    confirms: 2
  },
  {
    id: "r-110",
    building: "sada",
    floor: 1,
    spot: "Studio 2",
    type: "drops",
    bars: 2,
    speed: 8.5,
    hoursAgo: 15,
    device: "tablet",
    note: "Uploads of large design files fail halfway.",
    reporter: "hira.s@sada.nust.edu.pk",
    status: "open",
    confirms: 1
  }
];
