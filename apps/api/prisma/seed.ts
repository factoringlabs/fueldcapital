import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Local-dev-only seed: one Admin, one approved Broker, one approved
 * Machinery Company with a credit limit configured, so the happy path can be
 * walked end to end with the x-dev-user-id header (see CognitoAuthGuard).
 */
async function main() {
  const broker = await prisma.broker.create({
    data: {
      legalName: 'Acme Fuel Distributors LLC',
      ein: '11-1111111',
      onboardingStatus: 'APPROVED',
    },
  });

  const machineryCompany = await prisma.machineryCompany.create({
    data: {
      legalName: 'Bedrock Construction Co',
      ein: '22-2222222',
      onboardingStatus: 'APPROVED',
    },
  });

  await prisma.machineryCompanyCreditLimit.create({
    data: {
      machineryCompanyId: machineryCompany.id,
      totalLimit: 100000,
      currentUsed: 0,
    },
  });

  const admin = await prisma.appUser.create({
    data: { cognitoSub: 'seed-admin', email: 'admin@fueledcapital.example', role: 'ADMIN' },
  });
  const brokerUser = await prisma.appUser.create({
    data: {
      cognitoSub: 'seed-broker',
      email: 'broker@acmefuel.example',
      role: 'BROKER',
      brokerId: broker.id,
    },
  });
  const mcUser = await prisma.appUser.create({
    data: {
      cognitoSub: 'seed-mc',
      email: 'ap@bedrockco.example',
      role: 'MACHINERY_COMPANY',
      machineryCompanyId: machineryCompany.id,
    },
  });

  console.log('Seeded. Use these with the x-dev-user-id header:');
  console.log({ adminUserId: admin.id, brokerUserId: brokerUser.id, mcUserId: mcUser.id });
  console.log({ brokerId: broker.id, machineryCompanyId: machineryCompany.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
