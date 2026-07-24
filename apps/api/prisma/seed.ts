import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
  {
    name: 'Mechanical Keyboard 75%',
    description: 'Hot-swappable mechanical keyboard with brown switches and PBT keycaps.',
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800',
    priceInCents: 32900000,
    stock: 14,
  },
  {
    name: 'Wireless Noise-Cancelling Headphones',
    description: 'Over-ear headphones with active noise cancellation and 30h battery life.',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
    priceInCents: 89900000,
    stock: 8,
  },
  {
    name: 'Smart Fitness Watch',
    description: 'Heart-rate, SpO2 and sleep tracking with a 7-day battery.',
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
    priceInCents: 45900000,
    stock: 20,
  },
  {
    name: 'Portable Espresso Maker',
    description: 'Manual pump espresso maker for travel, no electricity required.',
    imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=800',
    priceInCents: 18900000,
    stock: 25,
  },
  {
    name: '4K Action Camera',
    description: 'Waterproof action camera with image stabilization and a wide-angle lens.',
    imageUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800',
    priceInCents: 62900000,
    stock: 5,
  },
  {
    name: 'Ergonomic Office Chair',
    description: 'Adjustable lumbar support, breathable mesh back, 4D armrests.',
    imageUrl: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=800',
    priceInCents: 129900000,
    stock: 3,
  },
];

async function main() {
  console.log('Seeding products...');
  for (const product of products) {
    await prisma.product.create({ data: product });
  }
  console.log(`Seeded ${products.length} products.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
