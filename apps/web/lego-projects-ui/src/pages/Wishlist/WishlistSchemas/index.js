import { z } from 'zod';
export const LegoCategoryEnum = z.enum([
    'Star Wars',
    'City',
    'Castle',
    'Technic',
    'Friends',
    'Harry Potter',
    'Super Heroes',
    'Creator',
    'Ninjago',
    'Speed Champions',
    'Disney',
    'Minecraft',
    'Ideas',
    'Architecture',
    'Other',
]);
export const WishlistItemSchema = z.object({
    title: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    productLink: z.string().url().optional(),
    imageUrl: z.string().url().optional(),
    // Allow either a predefined category or a custom string
    category: z.union([LegoCategoryEnum, z.string().min(1).max(50)]),
    sortOrder: z.number().int().min(0),
});
