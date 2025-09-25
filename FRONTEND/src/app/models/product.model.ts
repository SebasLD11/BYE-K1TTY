export interface Product {
    _id: string;
    name: string;
    price: number;
    tag: 'new'|'best'|'sale'|'drop';
    images: string[]; // hasta 5
    sizes: string[];
    // 👇 NUEVO
    collectionTitle?: string; // fallback en UI si viene vacío
}