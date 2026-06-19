import { prisma } from '../src/client';

/**
 * Seed the job board with a small set of sample contracts so a fresh DB (and the
 * homepage) shows real, honest data instead of placeholders.
 *
 * Honesty rules (see docs/ir35-trust-model.md): we NEVER assert IR35 status.
 * These seed roles carry only the CLIENT's stated position
 * (CLIENT_INTENDS_OUTSIDE) or UNKNOWN — never "verified outside IR35".
 *
 * Idempotent: each row is keyed on a stable `sourceUrl` marker (seed://job/N),
 * which also honestly records that the row is seed-origin, so re-running the
 * seed updates rather than duplicates.
 */

type SeedJob = {
  marker: string;
  position: string;
  companyName: string;
  description: string;
  city: string;
  dayRate: number[];
  remote: boolean;
  contractLengthDays: number;
  keywords: string[];
};

const SEED_JOBS: SeedJob[] = [
  {
    marker: 'seed://job/1',
    position: 'Senior React Developer',
    companyName: 'Confidential client',
    description:
      'Experienced Senior React Developer needed for a 6-month contract on a greenfield project. Strong TypeScript and modern React. Outside IR35 per the client.',
    city: 'London, UK',
    dayRate: [500, 600],
    remote: true,
    contractLengthDays: 180,
    keywords: ['React', 'TypeScript', 'Next.js'],
  },
  {
    marker: 'seed://job/2',
    position: 'Project Manager',
    companyName: 'Confidential client',
    description:
      'Project Manager to oversee critical infrastructure projects across multiple sectors. Agile experience preferred. 12-month contract.',
    city: 'Birmingham, UK',
    dayRate: [450, 550],
    remote: false,
    contractLengthDays: 365,
    keywords: ['Agile', 'Delivery', 'Stakeholder management'],
  },
  {
    marker: 'seed://job/3',
    position: 'Digital Marketing Consultant',
    companyName: 'Confidential client',
    description:
      'Digital Marketing Consultant with a track record in online engagement and paid campaigns. Initial 9-month contract.',
    city: 'Remote, UK',
    dayRate: [400, 500],
    remote: true,
    contractLengthDays: 270,
    keywords: ['SEO', 'Paid media', 'Analytics'],
  },
  {
    marker: 'seed://job/4',
    position: 'Financial Analyst',
    companyName: 'Confidential client',
    description:
      'Financial Analyst to support new market ventures and investment opportunities. Strong financial modelling required. 6-month contract.',
    city: 'Leeds, UK',
    dayRate: [450, 550],
    remote: true,
    contractLengthDays: 180,
    keywords: ['Financial modelling', 'Excel', 'Forecasting'],
  },
  {
    marker: 'seed://job/5',
    position: 'UX/UI Designer',
    companyName: 'Confidential client',
    description:
      'UX/UI Designer to refine and implement design concepts across web and mobile. Figma proficiency necessary. 8-month contract.',
    city: 'Manchester, UK',
    dayRate: [420, 520],
    remote: false,
    contractLengthDays: 240,
    keywords: ['Figma', 'UX', 'Design systems'],
  },
  {
    marker: 'seed://job/6',
    position: 'HR Consultant',
    companyName: 'Confidential client',
    description:
      'HR Consultant to restructure the recruitment process and manage employee relations for a multinational. 10-month contract.',
    city: 'Edinburgh, UK',
    dayRate: [350, 450],
    remote: false,
    contractLengthDays: 300,
    keywords: ['Recruitment', 'Employee relations', 'HR strategy'],
  },
];

const main = async () => {
  for (const job of SEED_JOBS) {
    const data = {
      position: job.position,
      companyName: job.companyName,
      description: job.description,
      keywords: job.keywords,
      // location is a JSON column; we only have a display address for seed data.
      location: {
        address: job.city,
        placeId: '',
        coordinates: { lat: null, lng: null },
      },
      dayRate: job.dayRate,
      howToApply: 'Apply via the application email.',
      applicationEmail: 'apply@example.com',
      workMode: job.remote ? ('REMOTE' as const) : ('ON_SITE' as const),
      contractLength: job.contractLengthDays,
      // CLIENT's stated position — never our assertion.
      ir35Signal: 'CLIENT_INTENDS_OUTSIDE' as const,
      sourceUrl: job.marker,
    };

    // Idempotent upsert keyed on the seed marker. sourceUrl isn't unique in the
    // schema, so find-then-create/update by marker.
    const existing = await prisma.job.findFirst({
      where: { sourceUrl: job.marker },
      select: { id: true },
    });

    if (existing) {
      await prisma.job.update({ where: { id: existing.id }, data });
    } else {
      await prisma.job.create({ data });
    }
  }

  // biome-ignore lint/suspicious/noConsole: seed script reports progress to the terminal
  console.log(`Seeded ${SEED_JOBS.length} sample jobs.`);
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
