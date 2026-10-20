// Validates every data/<slug>.json against data/schema.json and checks that its media exists.
import { loadClients, DataError } from './lib/clients.mjs';

try {
  const clients = loadClients();
  for (const { data } of clients) console.log(`✓ ${data.client.slug}${data.placeholder ? '  (placeholder)' : ''}`);
} catch (e) {
  if (!(e instanceof DataError)) throw e;
  console.error(`✗ ${e.message}`);
  process.exit(1);
}
