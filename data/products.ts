/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { WardrobeItem } from "../types";

export interface Product extends WardrobeItem {
    price: number;
    salePrice?: number;
    brand: string;
    affiliateLink: string;
    urls?: string[]; // Array for multiple product images
}

export const mockProducts: Product[] = [
    {
        id: 'prod_jacquemus_tee',
        name: 'Le t-shirt Pingo',
        brand: 'JACQUEMUS',
        price: 210,
        url: 'https://images.unsplash.com/photo-1622445284322-abf73934885c?auto=format&fit=crop&w=800&q=80',
        urls: [
            'https://images.unsplash.com/photo-1622445284322-abf73934885c?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1622445284322-abf73934885c?auto=format&fit=crop&w=800&q=80&mode=back',
            'https://images.unsplash.com/photo-1622445284322-abf73934885c?auto=format&fit=crop&w=800&q=80&mode=detail',
        ],
        affiliateLink: '#',
    },
    {
        id: 'prod_undercover_tee',
        name: 'Graphic Print T-Shirt',
        brand: 'UNDERCOVER',
        price: 130,
        url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=800&q=80',
        urls: [
            'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=800&q=80',
        ],
        affiliateLink: '#',
    },
    {
        id: 'prod_givenchy_sweatshirt',
        name: 'Embroidered Sweatshirt',
        brand: 'Givenchy',
        price: 980,
        salePrice: 638,
        url: 'https://images.unsplash.com/photo-1611312449412-6cefac5dc2b9?auto=format&fit=crop&w=800&q=80',
        urls: [
            'https://images.unsplash.com/photo-1611312449412-6cefac5dc2b9?auto=format&fit=crop&w=800&q=80',
        ],
        affiliateLink: '#',
    },
    {
        id: 'prod_eckhaus_latta_jeans',
        name: 'Wide-Leg Jeans',
        brand: 'Eckhaus Latta',
        price: 450,
        url: 'https://images.unsplash.com/photo-1604176354204-9268737828e4?auto=format&fit=crop&w=800&q=80',
        urls: [
            'https://images.unsplash.com/photo-1604176354204-9268737828e4?auto=format&fit=crop&w=800&q=80',
        ],
        affiliateLink: '#',
    },
    {
        id: 'prod_nike_af1',
        name: 'Air Force 1 \'07',
        brand: 'Nike',
        price: 150,
        url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80',
        urls: [
            'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80',
        ],
        affiliateLink: '#',
    },
    {
        id: 'prod_apc_denim',
        name: 'Classic Denim Jacket',
        brand: 'A.P.C.',
        price: 290,
        url: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&w=800&q=80',
        urls: [
            'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&w=800&q=80',
        ],
        affiliateLink: '#',
    },
    {
        id: 'prod_stone_island_hoodie',
        name: 'Garment-Dyed Hoodie',
        brand: 'Stone Island',
        price: 350,
        url: 'https://images.unsplash.com/photo-1611312449402-44b2d2f2a5ac?auto=format&fit=crop&w=800&q=80',
        urls: [ 'https://images.unsplash.com/photo-1611312449402-44b2d2f2a5ac?auto=format&fit=crop&w=800&q=80' ],
        affiliateLink: '#',
    },
    {
        id: 'prod_carhartt_cargo',
        name: 'Aviation Pant',
        brand: 'Carhartt WIP',
        price: 140,
        url: 'https://images.unsplash.com/photo-1605518216938-7c31b7b1435f?auto=format&fit=crop&w=800&q=80',
        urls: [ 'https://images.unsplash.com/photo-1605518216938-7c31b7b1435f?auto=format&fit=crop&w=800&q=80' ],
        affiliateLink: '#',
    },
    {
        id: 'prod_acne_bomber',
        name: 'Satin Bomber Jacket',
        brand: 'Acne Studios',
        price: 550,
        url: 'https://images.unsplash.com/photo-1591047139829-d919b5ca4d57?auto=format&fit=crop&w=800&q=80',
        urls: [ 'https://images.unsplash.com/photo-1591047139829-d919b5ca4d57?auto=format&fit=crop&w=800&q=80' ],
        affiliateLink: '#',
    },
    {
        id: 'prod_new_balance_sneakers',
        name: '990v5 Sneaker',
        brand: 'New Balance',
        price: 185,
        url: 'https://images.unsplash.com/photo-1608667508764-33cf0726b13a?auto=format&fit=crop&w=800&q=80',
        urls: [ 'https://images.unsplash.com/photo-1608667508764-33cf0726b13a?auto=format&fit=crop&w=800&q=80' ],
        affiliateLink: '#',
    }
];