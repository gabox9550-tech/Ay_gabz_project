import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../data.db');

const db = new Database(dbPath);

async function reset() {
  console.log('--- RESET PROFESIONAL AY GABZ ---');
  console.log('Iniciando limpieza total de la base de datos...');
  
  db.exec('PRAGMA foreign_keys = OFF;');
  
  db.exec(`
    DROP TABLE IF EXISTS ventas;
    DROP TABLE IF EXISTS productos;
    DROP TABLE IF EXISTS usuarios;
    DROP TABLE IF EXISTS clientes;
  `);
  
  db.exec('PRAGMA foreign_keys = ON;');
  
  console.log('✅ Base de datos purgada. Lista para reestructuración de identidad.');
}

reset();
