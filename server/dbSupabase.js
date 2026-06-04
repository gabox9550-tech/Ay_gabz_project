import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

let pool;

export async function connectDB() {
    try {
        if (!pool) {
            console.log('Intentando conectar a PostgreSQL (Supabase)...');
            console.log('DATABASE_URL definida:', !!connectionString);
            
            // Parse DATABASE_URL manually to avoid pg library URL parsing bugs
            // with dotted usernames like postgres.projectref
            const dbUrl = new URL(connectionString);
            const poolConfig = {
                user: decodeURIComponent(dbUrl.username),
                password: decodeURIComponent(dbUrl.password),
                host: dbUrl.hostname,
                port: parseInt(dbUrl.port) || 6543,
                database: dbUrl.pathname.slice(1) || 'postgres',
                ssl: { rejectUnauthorized: false }
            };
            console.log('Conectando a host:', poolConfig.host, 'puerto:', poolConfig.port, 'user:', poolConfig.user);
            
            pool = new Pool(poolConfig);
            await pool.query('SELECT 1');
            console.log('✅ --- Conectado a PostgreSQL (Supabase) ---');
            await initializeSchema();
            console.log('✅ --- Esquema de base de datos inicializado ---');
            
            const origQuery = pool.query.bind(pool);
            pool.query = async (text, params) => {
                let pgSql = text;
                pgSql = pgSql.replace(/TOP 1 (.*?) FROM/i, '$1 FROM');
                if (text.match(/TOP 1/i)) pgSql += ' LIMIT 1';
                pgSql = pgSql.replace(/TOP 5 (.*?) FROM/i, '$1 FROM');
                if (text.match(/TOP 5/i)) pgSql += ' LIMIT 5';
                pgSql = pgSql.replace(/\+\s*' '\s*\+/g, "|| ' ' ||");
                pgSql = pgSql.replace(/CAST\(GETDATE\(\) AS DATE\)/gi, 'CURRENT_DATE');
                const res = await origQuery(pgSql, params);
                return { recordset: res.rows };
            };
        }
        return pool;
    } catch (err) {
        pool = null;
        console.error('❌ Error de conexión a PostgreSQL:', err.message);
        throw err;
    }
}

async function initializeSchema() {
    

    // Clientes
    await pool.query(`
        CREATE TABLE IF NOT EXISTS clientes (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            apellido VARCHAR(100) NOT NULL,
            telefono VARCHAR(20) NOT NULL,
            direccion TEXT NOT NULL,
            email VARCHAR(255) UNIQUE,
            rfc VARCHAR(50),
            tipo_cliente VARCHAR(50) DEFAULT 'Residencial'
        )
    `);

    // Productos
    await pool.query(`
        CREATE TABLE IF NOT EXISTS productos (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(255) NOT NULL,
            descripcion TEXT,
            precio DECIMAL(18,2) NOT NULL,
            stock INT NOT NULL DEFAULT 0,
            categoria VARCHAR(100) DEFAULT 'Industrial',
            sku VARCHAR(100),
            especificaciones TEXT,
            imagenes_json TEXT
        )
    `);

    // Usuarios
    await pool.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            apellido VARCHAR(100) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            rol VARCHAR(50) DEFAULT 'Cliente',
            cliente_id INT,
            FOREIGN KEY(cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
        )
    `);

    // Ventas
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ventas (
            id SERIAL PRIMARY KEY,
            cliente_id INT NOT NULL,
            producto_id INT NOT NULL,
            cantidad INT NOT NULL,
            total DECIMAL(18,2) NOT NULL,
            fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
            FOREIGN KEY(producto_id) REFERENCES productos(id) ON DELETE CASCADE
        )
    `);

    // Sucursales
    await pool.query(`
        CREATE TABLE IF NOT EXISTS sucursales (
            id SERIAL PRIMARY KEY,
            direccion TEXT NOT NULL
        )
    `);

    // --- NUEVAS TABLAS: Técnicos e Instalaciones ---

    // Técnicos Instaladores
    await pool.query(`
        CREATE TABLE IF NOT EXISTS tecnicos (
            id SERIAL PRIMARY KEY,
            nombre_completo VARCHAR(200) NOT NULL,
            telefono VARCHAR(20) NOT NULL,
            numero_id VARCHAR(50) UNIQUE NOT NULL,
            rfc VARCHAR(50),
            tipo_instalador VARCHAR(50) NOT NULL DEFAULT 'Residencial',
            usuario_id INT,
            activo BOOLEAN DEFAULT true,
            FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
        )
    `);

    // Instalaciones
    await pool.query(`
        CREATE TABLE IF NOT EXISTS instalaciones (
            id SERIAL PRIMARY KEY,
            venta_id INT,
            cliente_id INT,
            tecnico_id INT,
            producto_nombre VARCHAR(255),
            direccion TEXT,
            fecha_instalacion DATE NOT NULL,
            hora_instalacion VARCHAR(10) NOT NULL,
            estado VARCHAR(50) DEFAULT 'Pendiente',
            notas TEXT,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(venta_id) REFERENCES ventas(id) ON DELETE NO ACTION,
            FOREIGN KEY(cliente_id) REFERENCES clientes(id) ON DELETE NO ACTION,
            FOREIGN KEY(tecnico_id) REFERENCES tecnicos(id) ON DELETE NO ACTION
        )
    `);

    // Direcciones del cliente (múltiples)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS direcciones_cliente (
            id SERIAL PRIMARY KEY,
            cliente_id INT NOT NULL,
            direccion TEXT NOT NULL,
            etiqueta VARCHAR(100) DEFAULT 'Casa',
            es_predeterminada BOOLEAN DEFAULT false,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
        )
    `);

    // Notificaciones (solicitudes de cambio)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS notificaciones (
            id SERIAL PRIMARY KEY,
            tipo VARCHAR(50) NOT NULL,
            instalacion_id INT,
            emisor_id INT,
            receptor_id INT,
            mensaje TEXT,
            nueva_fecha DATE,
            nueva_hora VARCHAR(10),
            estado VARCHAR(50) DEFAULT 'Pendiente',
            leida BOOLEAN DEFAULT false,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(instalacion_id) REFERENCES instalaciones(id) ON DELETE NO ACTION
        )
    `);

    // Chats (conversaciones entre usuarios)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS chats (
            id SERIAL PRIMARY KEY,
            tipo VARCHAR(50) NOT NULL,
            instalacion_id INT,
            usuario1_id INT NOT NULL,
            usuario2_id INT NOT NULL,
            estado_u1 VARCHAR(50) DEFAULT 'activo',
            estado_u2 VARCHAR(50) DEFAULT 'activo',
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ultimo_mensaje TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(instalacion_id) REFERENCES instalaciones(id) ON DELETE NO ACTION,
            FOREIGN KEY(usuario1_id) REFERENCES usuarios(id) ON DELETE NO ACTION,
            FOREIGN KEY(usuario2_id) REFERENCES usuarios(id) ON DELETE NO ACTION
        )
    `);

    // Mensajes (mensajes individuales en cada chat)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS mensajes (
            id SERIAL PRIMARY KEY,
            chat_id INT NOT NULL,
            emisor_id INT NOT NULL,
            contenido TEXT NOT NULL,
            leido BOOLEAN DEFAULT false,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE,
            FOREIGN KEY(emisor_id) REFERENCES usuarios(id) ON DELETE NO ACTION
        )
    `);

    // Agregar columna estado a ventas si no existe
    await pool.query(`
        ALTER TABLE ventas ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'Completada';
    `);
}


class PgRequest {
    constructor(clientOrPool) {
        this.client = clientOrPool;
        this.params = [];
        this.paramNames = [];
    }
    input(name, type, value) {
        if (value === undefined) value = null;
        this.paramNames.push(name);
        this.params.push(value);
        return this;
    }
    async query(sqlString) {
        let pgSql = sqlString;
        this.paramNames.forEach((name, index) => {
            const regex = new RegExp('@' + name + '\\b', 'g');
            pgSql = pgSql.replace(regex, '$' + (index + 1));
        });
        
        if (pgSql.includes('OUTPUT INSERTED.id')) {
             pgSql = pgSql.replace(/\s*OUTPUT INSERTED\.id\s*/g, ' ');
             pgSql += ' RETURNING id';
        }
        pgSql = pgSql.replace(/TOP 1 (.*?) FROM/i, '$1 FROM');
        if (pgSql.match(/ORDER BY.*DESC$/i) && sqlString.match(/TOP 1/i)) {
             pgSql += ' LIMIT 1';
        } else if (sqlString.match(/TOP 1/i)) {
             pgSql += ' LIMIT 1';
        } else if (sqlString.match(/TOP 5/i)) {
             pgSql = pgSql.replace(/TOP 5 (.*?) FROM/i, '$1 FROM');
             pgSql += ' LIMIT 5';
        }
        pgSql = pgSql.replace(/ISNULL\(([^,]+),\s*([^)]+)\)/gi, 'COALESCE($1, $2)');
        pgSql = pgSql.replace(/CAST\(GETDATE\(\) AS DATE\)/gi, 'CURRENT_DATE');
        pgSql = pgSql.replace(/\+\s*' '\s*\+/g, "|| ' ' ||");
        
        this.params = this.params.map(p => (p === 0 && typeof p === 'number') ? false : (p === 1 && typeof p === 'number') ? true : p);

        const res = await this.client.query(pgSql, this.params);
        return { recordset: res.rows };
    }
}

const originalConnect = connectDB;
connectDB = async () => {
    const p = await originalConnect();
    if (p && !p.request) {
        p.request = () => new PgRequest(p);
    }
    return p;
};

const sql = {
    Transaction: class {
        constructor(pool) {
            this.pool = pool;
            this.client = null;
        }
        async begin() {
            this.client = await this.pool.connect();
            await this.client.query('BEGIN');
        }
        async commit() {
            await this.client.query('COMMIT');
            this.client.release();
        }
        async rollback() {
            await this.client.query('ROLLBACK');
            this.client.release();
        }
    },
    Request: class extends PgRequest {
        constructor(txOrPool) {
            super(txOrPool.client || txOrPool);
        }
    },
    NVarChar: 'NVarChar',
    Int: 'Int',
    Decimal: () => 'Decimal',
    Bit: 'Bit',
    Date: 'Date'
};
export const dbOps = {
    // --- AUTH ---
    createUsuario: async (nombre, apellido, email, hash, salt, rol, cliente_id = null) => {
        const pool = await connectDB();
        const result = await pool.request()
            .input('nombre', sql.NVarChar, nombre)
            .input('apellido', sql.NVarChar, apellido)
            .input('email', sql.NVarChar, email)
            .input('hash', sql.NVarChar, hash)
            .input('salt', sql.NVarChar, salt)
            .input('rol', sql.NVarChar, rol)
            .input('cid', sql.Int, cliente_id)
            .query('INSERT INTO usuarios (nombre, apellido, email, password_hash, salt, rol, cliente_id) OUTPUT INSERTED.id VALUES (@nombre, @apellido, @email, @hash, @salt, @rol, @cid)');
        return result.recordset[0];
    },
    getUsuarioByEmail: async (email) => {
        const pool = await connectDB();
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM usuarios WHERE email = @email');
        return result.recordset[0];
    },
    updateUsuario: async (id, nombre, apellido, email, hash = null, salt = null) => {
        const pool = await connectDB();
        if (hash && salt) {
            return pool.request()
                .input('id', sql.Int, id)
                .input('nombre', sql.NVarChar, nombre)
                .input('apellido', sql.NVarChar, apellido)
                .input('email', sql.NVarChar, email)
                .input('hash', sql.NVarChar, hash)
                .input('salt', sql.NVarChar, salt)
                .query('UPDATE usuarios SET nombre = @nombre, apellido = @apellido, email = @email, password_hash = @hash, salt = @salt WHERE id = @id');
        }
        return pool.request()
            .input('id', sql.Int, id)
            .input('nombre', sql.NVarChar, nombre)
            .input('apellido', sql.NVarChar, apellido)
            .input('email', sql.NVarChar, email)
            .query('UPDATE usuarios SET nombre = @nombre, apellido = @apellido, email = @email WHERE id = @id');
    },
    deleteUsuario: async (id) => {
        const pool = await connectDB();
        return pool.request().input('id', sql.Int, id).query('DELETE FROM usuarios WHERE id = @id');
    },

    // --- CLIENTES ---
    addCliente: async (data) => {
        const pool = await connectDB();
        const { nombre, apellido, telefono, direccion, email, rfc, tipo_cliente } = data;
        const result = await pool.request()
            .input('n', sql.NVarChar, nombre)
            .input('a', sql.NVarChar, apellido)
            .input('t', sql.NVarChar, telefono)
            .input('d', sql.NVarChar, direccion)
            .input('e', sql.NVarChar, email)
            .input('r', sql.NVarChar, rfc)
            .input('tp', sql.NVarChar, tipo_cliente)
            .query('INSERT INTO clientes (nombre, apellido, telefono, direccion, email, rfc, tipo_cliente) OUTPUT INSERTED.id VALUES (@n, @a, @t, @d, @e, @r, @tp)');
        return { lastID: result.recordset[0].id };
    },
    getClientes: async () => {
        const pool = await connectDB();
        const result = await pool.query("SELECT *, (nombre + ' ' + apellido) as nombre_completo FROM clientes ORDER BY nombre ASC");
        return result.recordset;
    },
    getClienteById: async (id) => {
        const pool = await connectDB();
        const result = await pool.request().input('id', sql.Int, id).query('SELECT * FROM clientes WHERE id = @id');
        return result.recordset[0];
    },
    updateCliente: async (id, nombre, apellido, telefono, direccion) => {
        const pool = await connectDB();
        return pool.request()
            .input('id', sql.Int, id)
            .input('nombre', sql.NVarChar, nombre)
            .input('apellido', sql.NVarChar, apellido)
            .input('telefono', sql.NVarChar, telefono || '')
            .input('direccion', sql.NVarChar, direccion || '')
            .query('UPDATE clientes SET nombre = @nombre, apellido = @apellido, telefono = @telefono, direccion = @direccion WHERE id = @id');
    },
    updateClienteTipo: async (id, tipo_cliente) => {
        const pool = await connectDB();
        return pool.request()
            .input('id', sql.Int, id)
            .input('tp', sql.NVarChar, tipo_cliente)
            .query('UPDATE clientes SET tipo_cliente = @tp WHERE id = @id');
    },
    deleteClienteById: async (id) => {
        const pool = await connectDB();
        return pool.request().input('id', sql.Int, id).query('DELETE FROM clientes WHERE id = @id');
    },

    // --- PRODUCTOS ---
    addProducto: async (nombre, desc, precio, stock, imgs, cat, sku, specs) => {
        const pool = await connectDB();
        return pool.request()
            .input('n', sql.NVarChar, nombre)
            .input('d', sql.NVarChar, desc)
            .input('p', sql.Decimal(18, 2), precio)
            .input('s', sql.Int, stock)
            .input('i', sql.NVarChar, imgs)
            .input('c', sql.NVarChar, cat || 'Industrial')
            .input('sku', sql.NVarChar, sku || '')
            .input('sp', sql.NVarChar, specs || '')
            .query('INSERT INTO productos (nombre, descripcion, precio, stock, imagenes_json, categoria, sku, especificaciones) VALUES (@n, @d, @p, @s, @i, @c, @sku, @sp)');
    },
    getProductos: async () => {
        const pool = await connectDB();
        const result = await pool.query('SELECT * FROM productos ORDER BY nombre ASC');
        return result.recordset;
    },
    getProductoById: async (id) => {
        const pool = await connectDB();
        const result = await pool.request().input('id', sql.Int, id).query('SELECT * FROM productos WHERE id = @id');
        return result.recordset[0];
    },
    updateProducto: async (id, nombre, desc, precio, stock, imgs, cat, sku, specs) => {
        const pool = await connectDB();
        return pool.request()
            .input('id', sql.Int, id)
            .input('n', sql.NVarChar, nombre)
            .input('d', sql.NVarChar, desc)
            .input('p', sql.Decimal(18, 2), precio)
            .input('s', sql.Int, stock)
            .input('i', sql.NVarChar, imgs)
            .input('c', sql.NVarChar, cat || 'Industrial')
            .input('sku', sql.NVarChar, sku || '')
            .input('sp', sql.NVarChar, specs || '')
            .query('UPDATE productos SET nombre = @n, descripcion = @d, precio = @p, stock = @s, imagenes_json = @i, categoria = @c, sku = @sku, especificaciones = @sp WHERE id = @id');
    },
    deleteProducto: async (id) => {
        const pool = await connectDB();
        return pool.request().input('id', sql.Int, id).query('DELETE FROM productos WHERE id = @id');
    },

    // --- VENTAS (TRANSACTION) ---
    addVenta: async (cliente_id, producto_id, cantidad, total) => {
        const pool = await connectDB();
        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();
            const request = new sql.Request(transaction);

            // Check stock
            const prod = await request.input('pid', sql.Int, producto_id).query('SELECT stock FROM productos WHERE id = @pid');
            if (!prod.recordset[0] || prod.recordset[0].stock < cantidad) {
                throw new Error('Stock insuficiente');
            }

            // Insert Sale and return inserted ID
            const ventaResult = await new sql.Request(transaction)
                .input('cid', sql.Int, cliente_id)
                .input('pid', sql.Int, producto_id)
                .input('qty', sql.Int, cantidad)
                .input('tot', sql.Decimal(18, 2), total)
                .query('INSERT INTO ventas (cliente_id, producto_id, cantidad, total) OUTPUT INSERTED.id VALUES (@cid, @pid, @qty, @tot)');

            // Update Stock
            await new sql.Request(transaction)
                .input('pid', sql.Int, producto_id)
                .input('qty', sql.Int, cantidad)
                .query('UPDATE productos SET stock = stock - @qty WHERE id = @pid');

            await transaction.commit();
            return { ventaId: ventaResult.recordset[0].id };
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    },
    getVentas: async () => {
        const pool = await connectDB();
        const result = await pool.query(`
            SELECT v.*, (c.nombre + ' ' + c.apellido) as cliente_nombre, p.nombre as producto_nombre 
            FROM ventas v
            JOIN clientes c ON v.cliente_id = c.id
            JOIN productos p ON v.producto_id = p.id
            ORDER BY v.fecha_venta DESC
        `);
        return result.recordset;
    },
    getVentasByCliente: async (cliente_id) => {
        const pool = await connectDB();
        const result = await pool.request()
            .input('cid', sql.Int, cliente_id)
            .query(`
                SELECT v.*, p.nombre as producto_nombre 
                FROM ventas v
                JOIN productos p ON v.producto_id = p.id
                WHERE v.cliente_id = @cid
                ORDER BY v.fecha_venta DESC
            `);
        return result.recordset;
    },

    // --- STATS ---
    getStats: async () => {
        const pool = await connectDB();
        const totalV = await pool.query('SELECT SUM(total) as total FROM ventas');
        const numV = await pool.query('SELECT COUNT(*) as count FROM ventas');
        const numC = await pool.query('SELECT COUNT(*) as count FROM clientes');
        const topP = await pool.query(`
            SELECT TOP 1 p.nombre, COUNT(v.id) as freq 
            FROM ventas v 
            JOIN productos p ON v.producto_id = p.id 
            GROUP BY p.nombre 
            ORDER BY freq DESC
        `);
        const recientes = await pool.query(`
            SELECT TOP 5 v.total, v.fecha_venta, (c.nombre + ' ' + c.apellido) as cliente
            FROM ventas v
            JOIN clientes c ON v.cliente_id = c.id
            ORDER BY v.fecha_venta DESC
        `);

        return {
            totalVentas: totalV.recordset[0].total || 0,
            numVentas: numV.recordset[0].count,
            numClientes: numC.recordset[0].count,
            topProducto: topP.recordset[0] ? topP.recordset[0].nombre : 'N/A',
            ventasRecientes: recientes.recordset || []
        };
    },

    // --- SUCURSALES ---
    getSucursales: async () => {
        const pool = await connectDB();
        const result = await pool.query('SELECT * FROM sucursales ORDER BY id ASC');
        return result.recordset;
    },
    addSucursal: async (direccion) => {
        const pool = await connectDB();
        return pool.request()
            .input('dir', sql.NVarChar, direccion)
            .query('INSERT INTO sucursales (direccion) VALUES (@dir)');
    },
    deleteSucursal: async (id) => {
        const pool = await connectDB();
        return pool.request().input('id', sql.Int, id).query('DELETE FROM sucursales WHERE id = @id');
    },

    // --- TÉCNICOS INSTALADORES ---
    createTecnico: async (nombre_completo, telefono, numero_id, rfc, tipo_instalador, usuario_id) => {
        const pool = await connectDB();
        const result = await pool.request()
            .input('nc', sql.NVarChar, nombre_completo)
            .input('tel', sql.NVarChar, telefono)
            .input('nid', sql.NVarChar, numero_id)
            .input('rfc', sql.NVarChar, rfc || '')
            .input('ti', sql.NVarChar, tipo_instalador)
            .input('uid', sql.Int, usuario_id)
            .query('INSERT INTO tecnicos (nombre_completo, telefono, numero_id, rfc, tipo_instalador, usuario_id) OUTPUT INSERTED.id VALUES (@nc, @tel, @nid, @rfc, @ti, @uid)');
        return { tecnicoId: result.recordset[0].id };
    },
    getTecnicos: async () => {
        const pool = await connectDB();
        const result = await pool.query('SELECT * FROM tecnicos WHERE activo = true ORDER BY nombre_completo ASC');
        return result.recordset;
    },
    getTecnicoByUsuarioId: async (usuario_id) => {
        const pool = await connectDB();
        const result = await pool.request()
            .input('uid', sql.Int, usuario_id)
            .query('SELECT * FROM tecnicos WHERE usuario_id = @uid');
        return result.recordset[0];
    },

    // --- INSTALACIONES ---
    createInstalacion: async (data) => {
        const pool = await connectDB();
        const { venta_id, cliente_id, tecnico_id, producto_nombre, direccion, fecha_instalacion, hora_instalacion } = data;
        const result = await pool.request()
            .input('vid', sql.Int, venta_id)
            .input('cid', sql.Int, cliente_id)
            .input('tid', sql.Int, tecnico_id)
            .input('pn', sql.NVarChar, producto_nombre)
            .input('dir', sql.NVarChar, direccion)
            .input('fi', sql.Date, fecha_instalacion)
            .input('hi', sql.NVarChar, hora_instalacion)
            .query('INSERT INTO instalaciones (venta_id, cliente_id, tecnico_id, producto_nombre, direccion, fecha_instalacion, hora_instalacion) OUTPUT INSERTED.id VALUES (@vid, @cid, @tid, @pn, @dir, @fi, @hi)');
        return { instalacionId: result.recordset[0].id };
    },
    getInstalaciones: async () => {
        const pool = await connectDB();
        const result = await pool.query(`
            SELECT i.*, 
                   t.nombre_completo as tecnico_nombre, t.tipo_instalador,
                   (c.nombre + ' ' + c.apellido) as cliente_nombre, c.telefono as cliente_telefono
            FROM instalaciones i
            LEFT JOIN tecnicos t ON i.tecnico_id = t.id
            LEFT JOIN clientes c ON i.cliente_id = c.id
            ORDER BY i.fecha_instalacion DESC, i.hora_instalacion ASC
        `);
        return result.recordset;
    },
    getInstalacionesByTecnico: async (tecnico_id) => {
        const pool = await connectDB();
        const result = await pool.request()
            .input('tid', sql.Int, tecnico_id)
            .query(`
                SELECT i.*, 
                       (c.nombre + ' ' + c.apellido) as cliente_nombre, c.telefono as cliente_telefono, c.direccion as cliente_direccion
                FROM instalaciones i
                LEFT JOIN clientes c ON i.cliente_id = c.id
                WHERE i.tecnico_id = @tid
                ORDER BY i.fecha_instalacion ASC, i.hora_instalacion ASC
            `);
        return result.recordset;
    },
    getInstalacionesByCliente: async (cliente_id) => {
        const pool = await connectDB();
        const result = await pool.request()
            .input('cid', sql.Int, cliente_id)
            .query(`
                SELECT i.*, t.nombre_completo as tecnico_nombre, t.telefono as tecnico_telefono, t.usuario_id as tecnico_usuario_id
                FROM instalaciones i
                LEFT JOIN tecnicos t ON i.tecnico_id = t.id
                WHERE i.cliente_id = @cid
                ORDER BY i.fecha_instalacion ASC
            `);
        return result.recordset;
    },
    updateEstadoInstalacion: async (id, estado, notas = null) => {
        const pool = await connectDB();
        return pool.request()
            .input('id', sql.Int, id)
            .input('estado', sql.NVarChar, estado)
            .input('notas', sql.NVarChar, notas)
            .query('UPDATE instalaciones SET estado = @estado, notas = COALESCE($2, notas) WHERE id = @id');
    },
    reprogramarInstalacion: async (id, fecha_instalacion, hora_instalacion) => {
        const pool = await connectDB();
        return pool.request()
            .input('id', sql.Int, id)
            .input('fi', sql.Date, fecha_instalacion)
            .input('hi', sql.NVarChar, hora_instalacion)
            .query("UPDATE instalaciones SET fecha_instalacion = @fi, hora_instalacion = @hi, estado = 'Reprogramada' WHERE id = @id");
    },
    asignarTecnico: async (id, tecnico_id) => {
        const pool = await connectDB();
        return pool.request()
            .input('id', sql.Int, id)
            .input('tid', sql.Int, tecnico_id)
            .query('UPDATE instalaciones SET tecnico_id = @tid WHERE id = @id');
    },
    getHorariosOcupados: async (fecha) => {
        const pool = await connectDB();
        const result = await pool.request()
            .input('fecha', sql.Date, fecha)
            .query(`
                SELECT hora_instalacion, tecnico_id
                FROM instalaciones 
                WHERE fecha_instalacion = @fecha 
                AND estado NOT IN ('Cancelada')
            `);
        return result.recordset;
    },
    getTecnicosDisponiblesPorFechaHora: async (fecha, hora, tipo) => {
        const pool = await connectDB();
        const result = await pool.request()
            .input('fecha', sql.Date, fecha)
            .input('hora', sql.NVarChar, hora)
            .input('tipo', sql.NVarChar, tipo)
            .query(`
                SELECT t.* FROM tecnicos t
                WHERE t.activo = true 
                AND t.tipo_instalador = @tipo
                AND t.id NOT IN (
                    SELECT i.tecnico_id FROM instalaciones i
                    WHERE i.fecha_instalacion = @fecha 
                    AND i.hora_instalacion = @hora
                    AND i.estado NOT IN ('Cancelada')
                    AND i.tecnico_id IS NOT NULL
                )
            `);
        return result.recordset;
    },
    getTecnicosConDisponibilidadHoy: async () => {
        const pool = await connectDB();
        const result = await pool.query(`
            SELECT t.*,
                (SELECT COUNT(*) FROM instalaciones i 
                 WHERE i.tecnico_id = t.id 
                 AND i.fecha_instalacion = CAST(CURRENT_TIMESTAMP AS DATE) 
                 AND i.estado NOT IN ('Cancelada', 'Realizada')) as instalaciones_hoy
            FROM tecnicos t
            WHERE t.activo = true
            ORDER BY t.nombre_completo ASC
        `);
        return result.recordset;
    },
    getStatsInstalaciones: async () => {
        const pool = await connectDB();
        const pendientes = await pool.query("SELECT COUNT(*) as count FROM instalaciones WHERE estado = 'Pendiente'");
        const realizadas = await pool.query("SELECT COUNT(*) as count FROM instalaciones WHERE estado = 'Realizada'");
        const canceladas = await pool.query("SELECT COUNT(*) as count FROM instalaciones WHERE estado = 'Cancelada'");
        const reprogramadas = await pool.query("SELECT COUNT(*) as count FROM instalaciones WHERE estado = 'Reprogramada'");
        return {
            pendientes: pendientes.recordset[0].count,
            realizadas: realizadas.recordset[0].count,
            canceladas: canceladas.recordset[0].count,
            reprogramadas: reprogramadas.recordset[0].count
        };
    },

    // --- DIRECCIONES DEL CLIENTE ---
    addDireccion: async (cliente_id, direccion, etiqueta, es_predeterminada) => {
        const pool = await connectDB();
        if (es_predeterminada) {
            await pool.request().input('cid', sql.Int, cliente_id)
                .query('UPDATE direcciones_cliente SET es_predeterminada = false WHERE cliente_id = @cid');
        }
        const result = await pool.request()
            .input('cid', sql.Int, cliente_id)
            .input('dir', sql.NVarChar, direccion)
            .input('et', sql.NVarChar, etiqueta || 'Casa')
            .input('pred', sql.Bit, es_predeterminada ? 1 : 0)
            .query('INSERT INTO direcciones_cliente (cliente_id, direccion, etiqueta, es_predeterminada) OUTPUT INSERTED.id VALUES (@cid, @dir, @et, @pred)');
        // Also update clientes.direccion if default
        if (es_predeterminada) {
            await pool.request().input('cid', sql.Int, cliente_id).input('dir', sql.NVarChar, direccion)
                .query('UPDATE clientes SET direccion = @dir WHERE id = @cid');
        }
        return { id: result.recordset[0].id };
    },
    getDireccionesByCliente: async (cliente_id) => {
        const pool = await connectDB();
        const result = await pool.request().input('cid', sql.Int, cliente_id)
            .query('SELECT * FROM direcciones_cliente WHERE cliente_id = @cid ORDER BY es_predeterminada DESC, fecha_creacion DESC');
        return result.recordset;
    },
    setDireccionPredeterminada: async (id, cliente_id) => {
        const pool = await connectDB();
        await pool.request().input('cid', sql.Int, cliente_id)
            .query('UPDATE direcciones_cliente SET es_predeterminada = false WHERE cliente_id = @cid');
        await pool.request().input('id', sql.Int, id)
            .query('UPDATE direcciones_cliente SET es_predeterminada = true WHERE id = @id');
        // Sync to clientes table
        const dir = await pool.request().input('id', sql.Int, id).query('SELECT direccion FROM direcciones_cliente WHERE id = @id');
        if (dir.recordset[0]) {
            await pool.request().input('cid', sql.Int, cliente_id).input('dir', sql.NVarChar, dir.recordset[0].direccion)
                .query('UPDATE clientes SET direccion = @dir WHERE id = @cid');
        }
    },
    deleteDireccion: async (id) => {
        const pool = await connectDB();
        return pool.request().input('id', sql.Int, id).query('DELETE FROM direcciones_cliente WHERE id = @id');
    },
    updateDireccion: async (id, direccion, etiqueta) => {
        const pool = await connectDB();
        return pool.request()
            .input('id', sql.Int, id)
            .input('dir', sql.NVarChar, direccion)
            .input('et', sql.NVarChar, etiqueta)
            .query('UPDATE direcciones_cliente SET direccion = @dir, etiqueta = @et WHERE id = @id');
    },

    // --- NOTIFICACIONES ---
    createNotificacion: async (data) => {
        const pool = await connectDB();
        const { tipo, instalacion_id, emisor_id, receptor_id, mensaje, nueva_fecha, nueva_hora } = data;
        const result = await pool.request()
            .input('tipo', sql.NVarChar, tipo)
            .input('iid', sql.Int, instalacion_id)
            .input('eid', sql.Int, emisor_id)
            .input('rid', sql.Int, receptor_id)
            .input('msg', sql.NVarChar, mensaje)
            .input('nf', sql.Date, nueva_fecha || null)
            .input('nh', sql.NVarChar, nueva_hora || null)
            .query('INSERT INTO notificaciones (tipo, instalacion_id, emisor_id, receptor_id, mensaje, nueva_fecha, nueva_hora) OUTPUT INSERTED.id VALUES (@tipo, @iid, @eid, @rid, @msg, @nf, @nh)');
        return { id: result.recordset[0].id };
    },
    getNotificacionesByUsuario: async (usuario_id) => {
        const pool = await connectDB();
        const result = await pool.request().input('uid', sql.Int, usuario_id)
            .query(`
                SELECT n.*, i.producto_nombre, i.fecha_instalacion as fecha_actual, i.hora_instalacion as hora_actual,
                    u.nombre + ' ' + u.apellido as emisor_nombre
                FROM notificaciones n
                LEFT JOIN instalaciones i ON n.instalacion_id = i.id
                LEFT JOIN usuarios u ON n.emisor_id = u.id
                WHERE n.receptor_id = @uid
                ORDER BY n.fecha_creacion DESC
            `);
        return result.recordset;
    },
    getNotificacionesPendientesByUsuario: async (usuario_id) => {
        const pool = await connectDB();
        const result = await pool.request().input('uid', sql.Int, usuario_id)
            .query("SELECT COUNT(*) as count FROM notificaciones WHERE receptor_id = @uid AND estado = 'Pendiente' AND leida = 0");
        return result.recordset[0].count;
    },
    updateNotificacion: async (id, estado) => {
        const pool = await connectDB();
        return pool.request()
            .input('id', sql.Int, id)
            .input('estado', sql.NVarChar, estado)
            .query("UPDATE notificaciones SET estado = @estado, leida = true WHERE id = @id");
    },
    limpiarNotificacionesPendientes: async (instalacion_id, notificacion_id_ignorada) => {
        const pool = await connectDB();
        return pool.request()
            .input('iid', sql.Int, instalacion_id)
            .input('nid', sql.Int, notificacion_id_ignorada)
            .query("UPDATE notificaciones SET estado = 'Atendida', leida = true WHERE instalacion_id = @iid AND id != @nid AND estado = 'Pendiente' AND tipo IN ('nueva_instalacion', 'reasignacion', 'solicitud_reprogramacion')");
    },
    marcarNotificacionLeida: async (id) => {
        const pool = await connectDB();
        return pool.request().input('id', sql.Int, id).query('UPDATE notificaciones SET leida = true WHERE id = @id');
    },
    getInstalacionById: async (id) => {
        const pool = await connectDB();
        const result = await pool.request().input('id', sql.Int, id)
            .query('SELECT i.*, t.usuario_id as tecnico_usuario_id FROM instalaciones i LEFT JOIN tecnicos t ON i.tecnico_id = t.id WHERE i.id = @id');
        return result.recordset[0];
    },
    reasignarTecnico: async (instalacion_id, tecnico_id) => {
        const pool = await connectDB();
        return pool.request()
            .input('iid', sql.Int, instalacion_id)
            .input('tid', sql.Int, tecnico_id)
            .query('UPDATE instalaciones SET tecnico_id = @tid WHERE id = @iid');
    },

    // --- CANCELACIÓN DE VENTAS ---
    getVentaById: async (id) => {
        const pool = await connectDB();
        const result = await pool.request().input('id', sql.Int, id)
            .query('SELECT v.*, p.nombre as producto_nombre FROM ventas v JOIN productos p ON v.producto_id = p.id WHERE v.id = @id');
        return result.recordset[0];
    },
    cancelarVenta: async (venta_id) => {
        const pool = await connectDB();
        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();
            // Get venta details
            const venta = await new sql.Request(transaction).input('id', sql.Int, venta_id)
                .query('SELECT * FROM ventas WHERE id = @id');
            if (!venta.recordset[0]) throw new Error('Venta no encontrada');
            const v = venta.recordset[0];
            if (v.estado === 'Cancelada') throw new Error('La venta ya fue cancelada');
            // Mark as cancelled
            await new sql.Request(transaction).input('id', sql.Int, venta_id)
                .query("UPDATE ventas SET estado = 'Cancelada' WHERE id = @id");
            // Restore stock
            await new sql.Request(transaction)
                .input('pid', sql.Int, v.producto_id)
                .input('qty', sql.Int, v.cantidad)
                .query('UPDATE productos SET stock = stock + @qty WHERE id = @pid');
            // Cancel associated installations
            await new sql.Request(transaction).input('vid', sql.Int, venta_id)
                .query("UPDATE instalaciones SET estado = 'Cancelada', notas = 'Cancelada por devolución del pedido' WHERE venta_id = @vid AND estado NOT IN ('Realizada', 'Cancelada')");
            await transaction.commit();
            return { success: true, cantidad_devuelta: v.cantidad, total_devuelto: v.total };
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    },

    // --- CHATS ---
    createChat: async (tipo, instalacion_id, usuario1_id, usuario2_id) => {
        const pool = await connectDB();
        const result = await pool.request()
            .input('tipo', sql.NVarChar, tipo)
            .input('iid', sql.Int, instalacion_id || null)
            .input('u1', sql.Int, usuario1_id)
            .input('u2', sql.Int, usuario2_id)
            .query('INSERT INTO chats (tipo, instalacion_id, usuario1_id, usuario2_id) OUTPUT INSERTED.id VALUES (@tipo, @iid, @u1, @u2)');
        return { id: result.recordset[0].id };
    },
    getChatByParticipantes: async (usuario1_id, usuario2_id, instalacion_id = null) => {
        const pool = await connectDB();
        let query = `SELECT * FROM chats WHERE 
            ((usuario1_id = @u1 AND usuario2_id = @u2) OR (usuario1_id = @u2 AND usuario2_id = @u1))`;
        const req = pool.request().input('u1', sql.Int, usuario1_id).input('u2', sql.Int, usuario2_id);
        if (instalacion_id) {
            query += ' AND instalacion_id = @iid';
            req.input('iid', sql.Int, instalacion_id);
        } else {
            query += ' AND instalacion_id IS NULL';
        }
        const result = await req.query(query);
        return result.recordset[0];
    },
    getChatsByUsuario: async (usuario_id) => {
        const pool = await connectDB();
        const result = await pool.request().input('uid', sql.Int, usuario_id)
            .query(`
                SELECT c.*, 
                    u1.nombre + ' ' + u1.apellido as nombre_u1, u1.rol as rol_u1,
                    u2.nombre + ' ' + u2.apellido as nombre_u2, u2.rol as rol_u2,
                    CASE WHEN c.usuario1_id = @uid THEN c.estado_u1 ELSE c.estado_u2 END as mi_estado,
                    (SELECT TOP 1 contenido FROM mensajes WHERE chat_id = c.id ORDER BY fecha_creacion DESC) as ultimo_msg,
                    (SELECT COUNT(*) FROM mensajes WHERE chat_id = c.id AND emisor_id != @uid AND leido = 0) as no_leidos,
                    i.producto_nombre as inst_producto, i.estado as inst_estado
                FROM chats c
                JOIN usuarios u1 ON c.usuario1_id = u1.id
                JOIN usuarios u2 ON c.usuario2_id = u2.id
                LEFT JOIN instalaciones i ON c.instalacion_id = i.id
                WHERE (c.usuario1_id = @uid OR c.usuario2_id = @uid)
                ORDER BY c.ultimo_mensaje DESC
            `);
        return result.recordset;
    },
    getChatById: async (id) => {
        const pool = await connectDB();
        const result = await pool.request().input('id', sql.Int, id)
            .query(`
                SELECT c.*, 
                    u1.nombre + ' ' + u1.apellido as nombre_u1, u1.rol as rol_u1,
                    u2.nombre + ' ' + u2.apellido as nombre_u2, u2.rol as rol_u2,
                    i.producto_nombre as inst_producto, i.estado as inst_estado, i.fecha_instalacion as inst_fecha
                FROM chats c
                JOIN usuarios u1 ON c.usuario1_id = u1.id
                JOIN usuarios u2 ON c.usuario2_id = u2.id
                LEFT JOIN instalaciones i ON c.instalacion_id = i.id
                WHERE c.id = @id
            `);
        return result.recordset[0];
    },
    getMensajesByChat: async (chat_id) => {
        const pool = await connectDB();
        const result = await pool.request().input('cid', sql.Int, chat_id)
            .query(`
                SELECT m.*, u.nombre + ' ' + u.apellido as emisor_nombre, u.rol as emisor_rol
                FROM mensajes m
                JOIN usuarios u ON m.emisor_id = u.id
                WHERE m.chat_id = @cid
                ORDER BY m.fecha_creacion ASC
            `);
        return result.recordset;
    },
    addMensaje: async (chat_id, emisor_id, contenido) => {
        const pool = await connectDB();
        const result = await pool.request()
            .input('cid', sql.Int, chat_id)
            .input('eid', sql.Int, emisor_id)
            .input('cont', sql.NVarChar, contenido)
            .query('INSERT INTO mensajes (chat_id, emisor_id, contenido) OUTPUT INSERTED.id VALUES (@cid, @eid, @cont)');
        // Update ultimo_mensaje in chat
        await pool.request().input('cid', sql.Int, chat_id)
            .query('UPDATE chats SET ultimo_mensaje = CURRENT_TIMESTAMP WHERE id = @cid');
        return { id: result.recordset[0].id };
    },
    updateEstadoChat: async (chat_id, usuario_id, estado) => {
        const pool = await connectDB();
        // Determine if user is u1 or u2
        const chat = await pool.request().input('id', sql.Int, chat_id).query('SELECT * FROM chats WHERE id = @id');
        if (!chat.recordset[0]) throw new Error('Chat no encontrado');
        const c = chat.recordset[0];
        const field = c.usuario1_id === usuario_id ? 'estado_u1' : 'estado_u2';
        return pool.request()
            .input('id', sql.Int, chat_id)
            .input('estado', sql.NVarChar, estado)
            .query(`UPDATE chats SET ${field} = @estado WHERE id = @id`);
    },
    marcarMensajesLeidos: async (chat_id, usuario_id) => {
        const pool = await connectDB();
        return pool.request()
            .input('cid', sql.Int, chat_id)
            .input('uid', sql.Int, usuario_id)
            .query('UPDATE mensajes SET leido = true WHERE chat_id = @cid AND emisor_id != @uid AND leido = false');
    },
    getUnreadChatCount: async (usuario_id) => {
        const pool = await connectDB();
        const result = await pool.request().input('uid', sql.Int, usuario_id)
            .query(`
                SELECT COUNT(DISTINCT m.chat_id) as count FROM mensajes m
                JOIN chats c ON m.chat_id = c.id
                WHERE m.emisor_id != @uid AND m.leido = 0
                AND (c.usuario1_id = @uid OR c.usuario2_id = @uid)
                AND CASE WHEN c.usuario1_id = @uid THEN c.estado_u1 ELSE c.estado_u2 END != 'eliminado'
            `);
        return result.recordset[0].count;
    },

    // --- INSTALACIONES VENCIDAS ---
    getInstalacionesVencidas: async () => {
        const pool = await connectDB();
        const result = await pool.query(`
            SELECT i.*, 
                t.nombre_completo as tecnico_nombre, t.usuario_id as tecnico_usuario_id,
                (c.nombre + ' ' + c.apellido) as cliente_nombre
            FROM instalaciones i
            LEFT JOIN tecnicos t ON i.tecnico_id = t.id
            LEFT JOIN clientes c ON i.cliente_id = c.id
            WHERE i.estado IN ('Pendiente', 'Reprogramada')
            AND i.fecha_instalacion < CAST(CURRENT_TIMESTAMP AS DATE)
            AND i.tecnico_id IS NOT NULL
        `);
        return result.recordset;
    },
    getInstalacionesVencidasByTecnico: async (tecnico_id) => {
        const pool = await connectDB();
        const result = await pool.request().input('tid', sql.Int, tecnico_id)
            .query(`
                SELECT i.*, 
                    (c.nombre + ' ' + c.apellido) as cliente_nombre
                FROM instalaciones i
                LEFT JOIN clientes c ON i.cliente_id = c.id
                WHERE i.estado IN ('Pendiente', 'Reprogramada')
                AND i.fecha_instalacion < CAST(CURRENT_TIMESTAMP AS DATE)
                AND i.tecnico_id = @tid
            `);
        return result.recordset;
    },
    getAdminUsuarios: async () => {
        const pool = await connectDB();
        const result = await pool.query("SELECT id FROM usuarios WHERE rol = 'Admin'");
        return result.recordset;
    },
    canTecnicoDeleteChat: async (chat_id) => {
        const pool = await connectDB();
        const result = await pool.request().input('cid', sql.Int, chat_id)
            .query(`
                SELECT c.instalacion_id, i.estado as inst_estado
                FROM chats c
                LEFT JOIN instalaciones i ON c.instalacion_id = i.id
                WHERE c.id = @cid
            `);
        if (!result.recordset[0]) return false;
        const chat = result.recordset[0];
        if (!chat.instalacion_id) return true; // No installation linked
        return chat.inst_estado === 'Realizada';
    }
};