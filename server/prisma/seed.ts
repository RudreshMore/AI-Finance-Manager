import { PrismaClient, CategoryType } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food', icon: 'Utensils', color: '#f97316', type: CategoryType.EXPENSE },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#ec4899', type: CategoryType.EXPENSE },
  { name: 'Travel', icon: 'Plane', color: '#06b6d4', type: CategoryType.EXPENSE },
  { name: 'Bills', icon: 'Receipt', color: '#eab308', type: CategoryType.EXPENSE },
  { name: 'Rent', icon: 'Home', color: '#8b5cf6', type: CategoryType.EXPENSE },
  { name: 'Entertainment', icon: 'Film', color: '#a855f7', type: CategoryType.EXPENSE },
  { name: 'Healthcare', icon: 'HeartPulse', color: '#ef4444', type: CategoryType.EXPENSE },
  { name: 'Education', icon: 'GraduationCap', color: '#3b82f6', type: CategoryType.EXPENSE },
  { name: 'Other', icon: 'HelpCircle', color: '#64748b', type: CategoryType.EXPENSE },
];

const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', icon: 'Briefcase', color: '#10b981', type: CategoryType.INCOME },
  { name: 'Freelance', icon: 'Laptop', color: '#14b8a6', type: CategoryType.INCOME },
  { name: 'Business', icon: 'TrendingUp', color: '#22c55e', type: CategoryType.INCOME },
  { name: 'Other', icon: 'PlusCircle', color: '#64748b', type: CategoryType.INCOME },
];

export async function seedCategories() {
  console.log('🌱 Seeding default system categories...');

  const allDefaults = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];

  for (const cat of allDefaults) {
    const existing = await prisma.category.findFirst({
      where: {
        userId: null,
        name: cat.name,
        type: cat.type,
      },
    });

    if (!existing) {
      await prisma.category.create({
        data: {
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          type: cat.type,
          isSystem: true,
          userId: null,
        },
      });
    }
  }

  console.log('✅ Default system categories seeded successfully.');
}

async function main() {
  await seedCategories();
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
