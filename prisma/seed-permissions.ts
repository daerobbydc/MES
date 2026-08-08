import { seedPermissions } from "../src/services/rbac";

async function main() {
  console.log("Seeding permissions...");
  await seedPermissions();
  console.log("Done! Permissions seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
