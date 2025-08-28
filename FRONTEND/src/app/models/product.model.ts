export interface Product {
_id: string;
name: string;
price: number;
tag: 'new'|'best'|'sale'|'drop';
images: string[]; // hasta 5
}