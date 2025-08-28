// scripts/seed.js
require('dotenv').config();
const { connectDB } = require('../src/db');
const Product = require('../src/models/Product');

const FRONT = (process.env.FRONT_URL || 'http://localhost:4200').replace(/\/$/, '');
const img = p => `${FRONT}/${p.replace(/^\/?/, '')}`; // absolutiza: assets/img/...http://.../assets/img/...

const DATA = [
  {
    name: "Bye K1tty Tee — Vulgar",
    price: 24.9,
    tag: "new",
    images: [img("assets/img/SP.VUL.png"), img("assets/img/BK.Vulgar.png")],
    // slug: "tee-vulgar"
  },
  {
    name: "Bye K1tty Tee — South",
    price: 24.9,
    tag: "best",
    images: [img("assets/img/SP.SP.png"), img("assets/img/BK.South.png")],
    // slug: "tee-south"
  },
  {
    name: "Bye K1tty Tee — Wh*gga",
    price: 24.9,
    tag: "new",
    images: [img("assets/img/SP.Wi.png"), img("assets/img/BK.whigga.png")],
    // slug: "tee-whigga"
  },
  {
    name: "Bye K1tty Tee — Core Black",
    price: 24.9,
    tag: "new",
    images: [img("assets/img/SP.PS.png"), img("assets/img/BK.Psuck.png")],
    // slug: "tee-core-black"
  },
  {
    name: "Bye K1tty Cap — Vulgar Black",
    price: 19.9,
    tag: "new",
    images: [img("assets/img/BK.Gorra.png")],
    // slug: "cap-vulgar-black"
  }
];

(async () => {
  try {
    await connectDB();
    await Product.deleteMany({});
    await Product.insertMany(DATA);
    console.log(`Products seeded: ${DATA.length}`);
    process.exit(0);
  } catch (e) {
    console.error('Seed FAIL:', e.message);
    process.exit(1);
  }
})();
