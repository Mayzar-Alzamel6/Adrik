import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with Adrik Omrak initial constitution and logs...");

  // Upsert initial demo user
  const user = await prisma.user.upsert({
    where: { email: "user@adrik-omrak.local" },
    update: {},
    create: {
      email: "user@adrik-omrak.local",
      name: "المستخدم المبادر",
    },
  });

  // Seed 5 Core Values
  const coreValues = [
    {
      title: "الأمان والاستقرار المالي والمهني",
      definition: "بناء أرضية صلبة ومصادر دخل ومهارات قابلة للتداول دون خوف من الغد.",
      dailyAction: "ساعتان من العمل غير المنقطع على تنمية المهارة الأساسية.",
      redLine: "التسويف المقنع أو الاستهلاك المالي الاندفاعي.",
      order: 1,
    },
    {
      title: "النمو والإتقان المهني",
      definition: "أن أكون رقماً صعباً وذا جودة رفيعة لا يمكن تجاهلها في تخصصي.",
      dailyAction: "كتلة تعلم عميق يومياً (الألمانية B1 أو هندسة البرمجيات).",
      redLine: "السطحية والمرور العابر على المعارف دون تطبيق عملي.",
      order: 2,
    },
    {
      title: "الاعتماد على الذات والاستقلالية",
      definition: "القدرة على توجيه دفتي بوعي دون انتظار ظروف مثالية.",
      dailyAction: "حل مشكلة معقدة أو البدء دون مساعدة عند مراودة التسويف.",
      redLine: "إلقاء اللوم على البيئة والتحول لوضعية الضحية.",
      order: 3,
    },
    {
      title: "الانضباط والتركيز الفائق",
      definition: "تقديم ما يجب فعله على ما أشتهي فعله في اللحظة الراهنة.",
      dailyAction: "جلسة تركيز 90 دقيقة خالية تماماً من الهاتف والتشتت.",
      redLine: "التجاوب مع النزوات اللحظية أثناء العمل العميق.",
      order: 4,
    },
    {
      title: "الصمود والمثابرة (دوامة التعافي)",
      definition: "الاستئناف الفوري بعد أي كبوة؛ فالعبرة بالدوامة لا بالبداية المثالية.",
      dailyAction: "إتمام دقيقة كايزن واحدة حتى في أسوأ الأيام ومحاسبة النفس دون جلد للذات.",
      redLine: "الاستسلام لمتلازمة 'خربت خربت' بعد تفويت مهمة واحدة.",
      order: 5,
    },
  ];

  for (const cv of coreValues) {
    await prisma.coreValue.create({
      data: {
        userId: user.id,
        ...cv,
      },
    });
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
