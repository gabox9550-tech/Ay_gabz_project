import { dbOps } from './db.js';

console.log('--- PURGA FINAL: INICIANDO LIMPIEZA TOTAL ---');
try {
  dbOps.resetAll();
  console.log('✅ ÉXITO: Base de datos purgada. Tablas usuarios, clientes, productos y ventas están vacías.');
} catch (err) {
  console.error('❌ ERROR durante la purga:', err);
}
process.exit(0);
