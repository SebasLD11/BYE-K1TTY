const { Schema, model } = require('mongoose');

const ProductSchema = new Schema(
{
    name: { type: String, required: true },
    price: { type: Number, required: true }, // en EUR, por ejemplo 29.9
    tag: { type: String, enum: ['new', 'best', 'sale', 'drop'], default: 'new' },
    images: { type: [String], default: [] }, // hasta 5 imágenes
    sizes: { type: [String], default: []},
    // 👇 NUEVO: título de la colección a la que pertenece el producto
    collectionTitle: { type: String, default: 'Sin colección', index: true },
},
{ timestamps: true }
);

module.exports = model('Product', ProductSchema);