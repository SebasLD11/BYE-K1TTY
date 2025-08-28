require('dotenv').config();
const { connectDB } = require('../src/db');
const Product = require('../src/models/Product');


const DATA = [
{
name: 'Bye K1tty Tee — Core Black', price: 29.9, tag: 'new',
images: [
'https://images.unsplash.com/photo-1520975922329-7f4ad6e0c3d4?q=80&w=1200&auto=format&fit=crop',
'https://images.unsplash.com/photo-1520975739744-41049d18b8d6?q=80&w=1200&auto=format&fit=crop',
'https://images.unsplash.com/photo-1520974735194-27f1200b1295?q=80&w=1200&auto=format&fit=crop',
'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=1200&auto=format&fit=crop',
'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop'
]
},
{
name: 'Hoodie — Storm Grey', price: 54.9, tag: 'best',
images: [
'https://images.unsplash.com/photo-1548883354-94bcfe321cce?q=80&w=1200&auto=format&fit=crop',
'https://images.unsplash.com/photo-1550952035-c69e3fd83f4e?q=80&w=1200&auto=format&fit=crop',
'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop',
'https://placehold.co/1200x1500/111111/FFD700?text=Hoodie%20Detail',
'https://placehold.co/1200x1500/0a0a0a/ffffff?text=Back%20View'
]
},
{
name: 'Cap — Golden Stitch', price: 19.0, tag: 'drop',
images: [
'https://images.unsplash.com/photo-1602810318383-e6956b6f6bb0?q=80&w=1200&auto=format&fit=crop',
'https://images.unsplash.com/photo-1483984271256-7c75656a17e1?q=80&w=1200&auto=format&fit=crop',
'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=1200&auto=format&fit=crop',
'https://placehold.co/1200x1500/000000/FFD700?text=Cap%20Close-up',
'https://placehold.co/1200x1500/0d0d0d/ffffff?text=Underbrim'
]
},
{
name: 'Denim — Dark Wash', price: 69.0, tag: 'sale',
images: [
'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop',
'https://images.unsplash.com/photo-1514996937319-344454492b37?q=80&w=1200&auto=format&fit=crop',
'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop',
'https://placehold.co/1200x1500/0b0b0b/FFD700?text=Denim%20Detail',
'https://placehold.co/1200x1500/0f0f0f/ffffff?text=Back%20Pocket'
]
}
];


(async () => {
await connectDB();
await Product.deleteMany({});
await Product.insertMany(DATA);
console.log('Products seeded');
process.exit(0);
})();