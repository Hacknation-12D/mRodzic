/**
 * npm run content:validate
 * Waliduje content/seed/*.json tymi samymi schematami zod co aplikacja:
 * schematy, unikalne id, relatedDocumentId, URL-e, asOf (YYYY-MM), klucze faktów w regułach.
 */
import { formatIssues, validateContent } from '../src/core/content/validateContent';
import { readSeedFolder, SEED_DIR } from './lib/contentFiles';

function main() {
  const raw = readSeedFolder();
  const { issues, bundle } = validateContent(raw);

  console.log(`Walidacja treści: ${SEED_DIR}`);
  console.log(
    `  dokumenty: ${bundle.documents.length}, porady: ${bundle.tips.length}, todo: ${bundle.todos.length}, podpowiedzi: ${bundle.prompts.length}, wersja: ${bundle.version}`,
  );

  if (issues.length > 0) {
    console.error(`\n✗ Znaleziono ${issues.length} problem(ów):\n${formatIssues(issues)}\n`);
    process.exit(1);
  }
  console.log('✓ Treść poprawna.');
}

main();
