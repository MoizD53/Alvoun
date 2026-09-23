import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deactivateOldSalesmen() {
  console.log('Starting deactivation of old salesmen login access...');
  
  try {
    // Find salesmen profiles that look like seed/test accounts 
    // such as salesman@alvoun.com
    const oldProfiles = await prisma.profile.findMany({
      where: {
        role: 'SALESMAN',
        email: {
          contains: 'salesman@',
        },
        isActive: true,
      },
    });

    for (const profile of oldProfiles) {
      await prisma.profile.update({
        where: { id: profile.id },
        data: { isActive: false },
      });
      console.log(`Deactivated login access for: ${profile.email}`);
    }

    console.log(`Successfully processed ${oldProfiles.length} old salesman profiles.`);
  } catch (error) {
    console.error('Error during deactivation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deactivateOldSalesmen();
