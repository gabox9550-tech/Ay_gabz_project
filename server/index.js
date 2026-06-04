import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Dual DB architecture
import { dbOps as dbOpsLocal, connectDB as connectDBLocal } from './db.js';
import { dbOps as dbOpsSupabase, connectDB as connectDBSupabase } from './dbSupabase.js';

const USE_SUPABASE = process.env.USE_SUPABASE === 'true';
const dbOps = USE_SUPABASE ? dbOpsSupabase : dbOpsLocal;
const connectDB = USE_SUPABASE ? connectDBSupabase : connectDBLocal;

// Supabase Storage client
let supabaseClient = null;
if (USE_SUPABASE) {
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const supabaseKey = (process.env.SUPABASE_ANON_KEY || '').trim();
  supabaseClient = createClient(supabaseUrl, supabaseKey);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize connection pool
connectDB();

// Security and Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

// Multer Storage Configuration
const storage = USE_SUPABASE 
  ? multer.memoryStorage() 
  : multer.diskStorage({
      destination: 'uploads/',
      filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
    });
const upload = multer({ storage });

// Validation Schemas
const ClienteSchema = z.object({
  nombre: z.string().min(2),
  apellido: z.string().min(2),
  telefono: z.string().regex(/^\d{1,10}$/, "Debe ser numérico de hasta 10 dígitos"),
  direccion: z.string().min(0),
  email: z.string().email(),
  rfc: z.string().optional(),
  tipo_cliente: z.string().default('Residencial')
});

const ProductoSchema = z.object({
  nombre: z.string().min(2),
  descripcion: z.string().optional(),
  precio: z.coerce.number().positive(),
  stock: z.coerce.number().int().min(0),
  categoria: z.string().min(2).default('Industrial'),
  sku: z.string().optional(),
  especificaciones: z.string().optional(),
  imagenes_json: z.string().optional()
});

const VentaSchema = z.object({
  cliente_id: z.coerce.number().int(),
  producto_id: z.coerce.number().int(),
  cantidad: z.coerce.number().int().positive()
});

// Help functions for security
const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt };
};

const verifyPassword = (password, salt, hash) => {
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
};

// --- API ROUTES (ASYNC REFACTOR) ---

// Authentication
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, nombre, apellido, rol, tipo_cliente, rfc, telefono, numero_id, tipo_instalador } = req.body;
    const existing = await dbOps.getUsuarioByEmail(email);
    if (existing) return res.status(400).json({ error: 'El email ya está registrado' });

    let cliente_id = null;

    if (rol === 'Cliente') {
      if (!telefono || !/^\d{1,10}$/.test(telefono)) return res.status(400).json({ error: 'Teléfono de hasta 10 números requerido' });
      const c = await dbOps.addCliente({ nombre, apellido, email, telefono, direccion: '', tipo_cliente: tipo_cliente || 'Residencial', rfc });
      cliente_id = c.lastID;
    }

    const { hash, salt } = hashPassword(password);
    const userResult = await dbOps.createUsuario(nombre, apellido, email, hash, salt, rol, cliente_id);

    // If Tecnico role, create tecnico record
    if (rol === 'Tecnico') {
      if (!numero_id) return res.status(400).json({ error: 'Número de ID requerido para técnicos' });
      if (!tipo_instalador) return res.status(400).json({ error: 'Tipo de instalador requerido' });
      const nombre_completo = `${nombre} ${apellido}`.trim();
      await dbOps.createTecnico(nombre_completo, telefono || '', numero_id, rfc || '', tipo_instalador, userResult.id);
    }

    res.status(201).json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await dbOps.getUsuarioByEmail(email);
    if (!user || !verifyPassword(password, user.salt, user.password_hash)) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const { password_hash, salt, ...userData } = user;
    if (userData.cliente_id) {
        const cliente = await dbOps.getClienteById(userData.cliente_id);
        if (cliente) {
            userData.telefono = cliente.telefono;
            userData.direccion = cliente.direccion;
            userData.tipo_cliente = cliente.tipo_cliente;
        }
    }
    // If Tecnico, attach tecnico data
    if (userData.rol === 'Tecnico') {
        const tecnico = await dbOps.getTecnicoByUsuarioId(userData.id);
        if (tecnico) {
            userData.tecnico_id = tecnico.id;
            userData.tipo_instalador = tecnico.tipo_instalador;
            userData.numero_id_tecnico = tecnico.numero_id;
        }
    }
    res.json(userData);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/auth/profile', async (req, res) => {
  try {
    const { id, cliente_id, nombre, apellido, email, password, telefono, direccion, tipo_cliente } = req.body;
    
    let hash = null, salt = null;
    if (password && password.trim() !== '') {
        const creds = hashPassword(password);
        hash = creds.hash; salt = creds.salt;
    }
    
    await dbOps.updateUsuario(id, nombre, apellido, email, hash, salt);
    if (cliente_id) {
        await dbOps.updateCliente(cliente_id, nombre, apellido, telefono, direccion);
        if (tipo_cliente) {
            await dbOps.updateClienteTipo(cliente_id, tipo_cliente);
        }
    }
    res.json({ success: true, nombre, apellido, email, telefono, direccion, tipo_cliente });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Account Deletion (self-service for both clients and admins)
app.delete('/api/auth/account/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { cliente_id } = req.body;

    // Delete the user record first
    await dbOps.deleteUsuario(userId);

    // If user had a linked client record, delete it too
    if (cliente_id) {
      await dbOps.deleteClienteById(cliente_id);
    }

    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Sucursales
app.get('/api/sucursales', async (req, res) => res.json(await dbOps.getSucursales()));
app.post('/api/sucursales', async (req, res) => {
  try {
    await dbOps.addSucursal(req.body.direccion);
    res.status(201).json({success: true});
  } catch(e) { res.status(400).json({error: e.message}); }
});
app.delete('/api/sucursales/:id', async (req, res) => {
  try {
    await dbOps.deleteSucursal(req.params.id);
    res.json({success: true});
  } catch(e) { res.status(500).json({error: e.message}); }
});

// Files
app.post('/api/upload', upload.array('files'), async (req, res) => {
  try {
    if (USE_SUPABASE) {
      const urls = [];
      for (const file of req.files) {
        const filename = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
        const { data, error } = await supabaseClient.storage
          .from('imagenes')
          .upload(filename, file.buffer, { contentType: file.mimetype });
        if (error) throw error;
        const publicUrl = supabaseClient.storage.from('imagenes').getPublicUrl(filename).data.publicUrl;
        urls.push(publicUrl);
      }
      res.json({ urls });
    } else {
      const urls = req.files.map(f => `/uploads/${f.filename}`);
      res.json({ urls });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Core API
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await dbOps.getStats();
        const instStats = await dbOps.getStatsInstalaciones();
        res.json({ ...stats, instalaciones: instStats });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/clientes', async (req, res) => res.json(await dbOps.getClientes()));
app.get('/api/clientes/:id', async (req, res) => res.json(await dbOps.getClienteById(req.params.id)));

// Update client type
app.put('/api/clientes/:id/tipo', async (req, res) => {
    try {
        await dbOps.updateClienteTipo(req.params.id, req.body.tipo_cliente);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Productos
app.get('/api/productos', async (req, res) => res.json(await dbOps.getProductos()));
app.get('/api/productos/:id', async (req, res) => res.json(await dbOps.getProductoById(req.params.id)));
app.post('/api/productos', async (req, res) => {
  try {
    const v = ProductoSchema.parse(req.body);
    await dbOps.addProducto(v.nombre, v.descripcion, v.precio, v.stock, v.imagenes_json || '[]', v.categoria, v.sku, v.especificaciones);
    res.status(201).json({ success: true });
  } catch (error) { res.status(400).json({ error: error.errors || error.message }); }
});
app.put('/api/productos/:id', async (req, res) => {
  try {
    const v = ProductoSchema.parse(req.body);
    await dbOps.updateProducto(req.params.id, v.nombre, v.descripcion, v.precio, v.stock, v.imagenes_json || '[]', v.categoria, v.sku, v.especificaciones);
    res.json({ success: true });
  } catch (error) { res.status(400).json({ error: error.errors || error.message }); }
});
app.delete('/api/productos/:id', async (req, res) => { 
    try {
        await dbOps.deleteProducto(req.params.id); 
        res.json({ success: true }); 
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Ventas
app.get('/api/ventas', async (req, res) => res.json(await dbOps.getVentas()));
app.get('/api/ventas/cliente/:id', async (req, res) => res.json(await dbOps.getVentasByCliente(req.params.id)));
app.post('/api/ventas', async (req, res) => {
  try {
    const items = z.array(VentaSchema).parse(req.body);
    const ventaIds = [];
    for (const item of items) {
      const prod = await dbOps.getProductoById(item.producto_id);
      const total = prod.precio * item.cantidad;
      const result = await dbOps.addVenta(item.cliente_id, item.producto_id, item.cantidad, total);
      ventaIds.push({ ventaId: result.ventaId, productoNombre: prod.nombre });
    }
    res.json({ success: true, ventaIds });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --- TÉCNICOS ---
app.get('/api/tecnicos', async (req, res) => {
    try {
        res.json(await dbOps.getTecnicos());
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/tecnicos/disponibles', async (req, res) => {
    try {
        res.json(await dbOps.getTecnicosConDisponibilidadHoy());
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- INSTALACIONES ---
app.get('/api/instalaciones', async (req, res) => {
    try {
        res.json(await dbOps.getInstalaciones());
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/instalaciones/tecnico/:id', async (req, res) => {
    try {
        res.json(await dbOps.getInstalacionesByTecnico(req.params.id));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/instalaciones/cliente/:id', async (req, res) => {
    try {
        res.json(await dbOps.getInstalacionesByCliente(req.params.id));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/instalaciones', async (req, res) => {
    try {
        const { venta_id, cliente_id, producto_nombre, direccion, fecha_instalacion, hora_instalacion, tipo_cliente } = req.body;
        
        // Find available technicians
        const tipoTecnico = tipo_cliente === 'Industrial' ? 'Industrial' : 'Residencial';
        let disponibles = await dbOps.getTecnicosDisponiblesPorFechaHora(fecha_instalacion, hora_instalacion, tipoTecnico);
        
        if (disponibles.length === 0) {
            // Try the other type as fallback
            disponibles = await dbOps.getTecnicosDisponiblesPorFechaHora(fecha_instalacion, hora_instalacion, tipoTecnico === 'Residencial' ? 'Industrial' : 'Residencial');
        }

        // 1. Create the installation with NO technician assigned (tecnico_id = null)
        const result = await dbOps.createInstalacion({
            venta_id, cliente_id, tecnico_id: null, producto_nombre,
            direccion, fecha_instalacion, hora_instalacion
        });

        // 2. Notify all available technicians
        if (disponibles.length > 0) {
            for (const tec of disponibles) {
                if (tec.usuario_id) {
                    await dbOps.createNotificacion({
                        tipo: 'nueva_instalacion',
                        instalacion_id: result.instalacionId,
                        emisor_id: null, // System generated
                        receptor_id: tec.usuario_id,
                        mensaje: `¡Nueva solicitud de instalación! Producto: ${producto_nombre}. Fecha: ${fecha_instalacion} a las ${hora_instalacion}. ¿Deseas tomarla?`,
                        nueva_fecha: fecha_instalacion,
                        nueva_hora: hora_instalacion
                    });
                }
            }
        }

        res.status(201).json({ success: true, instalacionId: result.instalacionId, notificados: disponibles.length });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/instalaciones/:id/estado', async (req, res) => {
    try {
        const { estado, notas } = req.body;
        await dbOps.updateEstadoInstalacion(req.params.id, estado, notas);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/instalaciones/:id/reprogramar', async (req, res) => {
    try {
        const { fecha_instalacion, hora_instalacion } = req.body;
        await dbOps.reprogramarInstalacion(req.params.id, fecha_instalacion, hora_instalacion);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/instalaciones/disponibilidad', async (req, res) => {
    try {
        const { fecha, tipo } = req.query;
        const horarios = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
        const ocupados = await dbOps.getHorariosOcupados(fecha);
        
        // Count all technicians of the requested type
        const tecnicos = await dbOps.getTecnicos();
        const tipoTecnico = tipo === 'Industrial' ? 'Industrial' : 'Residencial';
        const totalTecnicosTipo = tecnicos.filter(t => t.tipo_instalador === tipoTecnico).length;
        const totalTecnicosAll = tecnicos.length;

        const disponibilidad = horarios.map(h => {
            const ocupadosEnHora = ocupados.filter(o => o.hora_instalacion === h).length;
            const totalRef = totalTecnicosTipo > 0 ? totalTecnicosTipo : totalTecnicosAll;
            return {
                hora: h,
                disponible: ocupadosEnHora < totalRef,
                ocupados: ocupadosEnHora,
                total: totalRef
            };
        });

        res.json(disponibilidad);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- DIRECCIONES DEL CLIENTE ---
app.get('/api/direcciones/:clienteId', async (req, res) => {
    try {
        res.json(await dbOps.getDireccionesByCliente(req.params.clienteId));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/direcciones', async (req, res) => {
    try {
        const { cliente_id, direccion, etiqueta, es_predeterminada } = req.body;
        const result = await dbOps.addDireccion(cliente_id, direccion, etiqueta, es_predeterminada);
        res.status(201).json({ success: true, id: result.id });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/direcciones/:id/predeterminada', async (req, res) => {
    try {
        await dbOps.setDireccionPredeterminada(req.params.id, req.body.cliente_id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/direcciones/:id', async (req, res) => {
    try {
        await dbOps.updateDireccion(req.params.id, req.body.direccion, req.body.etiqueta);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/direcciones/:id', async (req, res) => {
    try {
        await dbOps.deleteDireccion(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- CLIENT RESCHEDULE / CANCEL ---
app.post('/api/instalaciones/:id/solicitar-cambio', async (req, res) => {
    try {
        const { nueva_fecha, nueva_hora, emisor_id } = req.body;
        const instalacion = await dbOps.getInstalacionById(req.params.id);
        if (!instalacion) return res.status(404).json({ error: 'Instalación no encontrada' });

        const receptor_id = instalacion.tecnico_usuario_id;
        if (!receptor_id) return res.status(400).json({ error: 'No hay técnico asignado' });

        await dbOps.createNotificacion({
            tipo: 'solicitud_reprogramacion',
            instalacion_id: parseInt(req.params.id),
            emisor_id,
            receptor_id,
            mensaje: `Solicitud de cambio de fecha: ${nueva_fecha} a las ${nueva_hora}`,
            nueva_fecha,
            nueva_hora
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/instalaciones/:id/cancelar-cliente', async (req, res) => {
    try {
        await dbOps.updateEstadoInstalacion(req.params.id, 'Cancelada', 'Cancelada por el cliente');
        // Notify technician
        const instalacion = await dbOps.getInstalacionById(req.params.id);
        if (instalacion && instalacion.tecnico_usuario_id) {
            await dbOps.createNotificacion({
                tipo: 'cancelacion',
                instalacion_id: parseInt(req.params.id),
                emisor_id: req.body.emisor_id,
                receptor_id: instalacion.tecnico_usuario_id,
                mensaje: 'El cliente ha cancelado esta instalación'
            });
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- NOTIFICACIONES ---
app.get('/api/notificaciones/:usuarioId', async (req, res) => {
    try {
        res.json(await dbOps.getNotificacionesByUsuario(req.params.usuarioId));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/notificaciones/:usuarioId/count', async (req, res) => {
    try {
        const count = await dbOps.getNotificacionesPendientesByUsuario(req.params.usuarioId);
        res.json({ count });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/notificaciones/:id/responder', async (req, res) => {
    try {
        const { estado, instalacion_id, nueva_fecha, nueva_hora, tipo, tecnico_usuario_id, tecnico_id } = req.body;
        
        const inst = await dbOps.getInstalacionById(instalacion_id);
        if (!inst) return res.status(404).json({ error: 'Instalación no encontrada' });

        if (estado === 'Aceptada') {
            // RACE CONDITION CHECK
            if ((tipo === 'nueva_instalacion' || tipo === 'reasignacion') && inst.tecnico_id !== null) {
                await dbOps.updateNotificacion(req.params.id, 'Atendida');
                return res.json({ success: false, error: 'already_taken', message: 'La instalación ya fue tomada por otro técnico.' });
            }

            await dbOps.updateNotificacion(req.params.id, estado);
            
            // Assign technician and optionally reschedule
            if (tecnico_id) {
                await dbOps.asignarTecnico(instalacion_id, tecnico_id);
            }
            if (nueva_fecha && nueva_hora) {
                await dbOps.reprogramarInstalacion(instalacion_id, nueva_fecha, nueva_hora);
            } else if (tipo === 'nueva_instalacion') {
                await dbOps.updateEstadoInstalacion(instalacion_id, 'Pendiente');
            }

            // Clear other pending notifications for this installation
            await dbOps.limpiarNotificacionesPendientes(instalacion_id, req.params.id);

            // Notify client if it was a reschedule/reassignment
            if (tipo === 'solicitud_reprogramacion' || tipo === 'reasignacion') {
                const cliente = await dbOps.getClienteById(inst.cliente_id);
                if (cliente) {
                    const clienteUser = await dbOps.getUsuarioByEmail(cliente.email);
                    if (clienteUser) {
                        await dbOps.createNotificacion({
                            tipo: 'respuesta_tecnico',
                            instalacion_id,
                            emisor_id: tecnico_usuario_id,
                            receptor_id: clienteUser.id,
                            mensaje: `✅ Tu solicitud de cambio fue aceptada. Nueva fecha: ${nueva_fecha || inst.fecha_instalacion} a las ${nueva_hora || inst.hora_instalacion}`
                        });
                    }
                }
            }
            res.json({ success: true, resultado: 'aceptada' });

        } else if (estado === 'Rechazada') {
            await dbOps.updateNotificacion(req.params.id, estado);

            if (tipo === 'nueva_instalacion') {
                return res.json({ success: true, resultado: 'rechazada' });
            }

            // Try to find another available technician
            const tecnicos = await dbOps.getTecnicos();
            const tipoTec = tecnicos.find(t => t.id === inst?.tecnico_id)?.tipo_instalador || 'Residencial';
            const disponibles = await dbOps.getTecnicosDisponiblesPorFechaHora(nueva_fecha, nueva_hora, tipoTec);
            const otrosTec = disponibles.filter(t => t.id !== inst?.tecnico_id);

            if (otrosTec.length > 0) {
                for (const tec of otrosTec) {
                   if (tec.usuario_id) {
                       await dbOps.createNotificacion({
                           tipo: 'reasignacion',
                           instalacion_id,
                           emisor_id: tecnico_usuario_id,
                           receptor_id: tec.usuario_id,
                           mensaje: `Un cliente solicita instalación el ${nueva_fecha} a las ${nueva_hora}. ¿Puedes atenderlo?`,
                           nueva_fecha,
                           nueva_hora
                       });
                   }
                }
                // Unassign current technician to allow others to take it
                await dbOps.asignarTecnico(instalacion_id, null);
                res.json({ success: true, resultado: 'reasignado', notificados: otrosTec.length });
            } else {
                // No technicians available
                const cliente = await dbOps.getClienteById(inst.cliente_id);
                if (cliente) {
                    const clienteUser = await dbOps.getUsuarioByEmail(cliente.email);
                    if (clienteUser) {
                        await dbOps.createNotificacion({
                            tipo: 'respuesta_tecnico',
                            instalacion_id,
                            emisor_id: tecnico_usuario_id,
                            receptor_id: clienteUser.id,
                            mensaje: `❌ No hay técnicos disponibles para el ${nueva_fecha} a las ${nueva_hora}. Por favor elige otra fecha o cancela la instalación.`,
                            nueva_fecha,
                            nueva_hora
                        });
                    }
                }
                res.json({ success: true, resultado: 'sin_disponibilidad' });
            }
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/notificaciones/:id/leida', async (req, res) => {
    try {
        await dbOps.marcarNotificacionLeida(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- CANCELACIÓN DE VENTAS ---
app.post('/api/ventas/:id/cancelar', async (req, res) => {
    try {
        const result = await dbOps.cancelarVenta(parseInt(req.params.id));
        // Notify technician if there was an installation
        const venta = await dbOps.getVentaById(parseInt(req.params.id));
        res.json({ success: true, ...result });
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- CHATS ---
app.get('/api/chats/:usuarioId', async (req, res) => {
    try {
        const chats = await dbOps.getChatsByUsuario(parseInt(req.params.usuarioId));
        res.json(chats);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/chats/detail/:chatId', async (req, res) => {
    try {
        const chat = await dbOps.getChatById(parseInt(req.params.chatId));
        if (!chat) return res.status(404).json({ error: 'Chat no encontrado' });
        res.json(chat);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/chats/:chatId/mensajes', async (req, res) => {
    try {
        const mensajes = await dbOps.getMensajesByChat(parseInt(req.params.chatId));
        res.json(mensajes);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/chats', async (req, res) => {
    try {
        const { tipo, instalacion_id, usuario1_id, usuario2_id } = req.body;
        // Check if chat already exists
        const existing = await dbOps.getChatByParticipantes(usuario1_id, usuario2_id, instalacion_id || null);
        if (existing) {
            // Reactivate if was deleted
            if (existing.estado_u1 === 'eliminado' || existing.estado_u2 === 'eliminado') {
                const field = existing.usuario1_id === usuario1_id ? 'estado_u1' : 'estado_u2';
                await dbOps.updateEstadoChat(existing.id, usuario1_id, 'activo');
            }
            return res.json({ id: existing.id, existing: true });
        }
        const result = await dbOps.createChat(tipo, instalacion_id || null, usuario1_id, usuario2_id);
        res.status(201).json({ id: result.id });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/chats/:chatId/mensajes', async (req, res) => {
    try {
        const { emisor_id, contenido } = req.body;
        const result = await dbOps.addMensaje(parseInt(req.params.chatId), emisor_id, contenido);
        res.status(201).json({ id: result.id });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/chats/:chatId/estado', async (req, res) => {
    try {
        const { usuario_id, estado } = req.body;
        // If technician wants to delete, check if installation is complete
        if (estado === 'eliminado') {
            const chat = await dbOps.getChatById(parseInt(req.params.chatId));
            if (chat) {
                const isU1 = chat.usuario1_id === usuario_id;
                const myRole = isU1 ? chat.rol_u1 : chat.rol_u2;
                if (myRole === 'Tecnico') {
                    const canDelete = await dbOps.canTecnicoDeleteChat(parseInt(req.params.chatId));
                    if (!canDelete) {
                        return res.status(400).json({ error: 'No puedes eliminar este chat hasta que la instalación sea completada.' });
                    }
                }
            }
        }
        await dbOps.updateEstadoChat(parseInt(req.params.chatId), usuario_id, estado);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/chats/:chatId/leer', async (req, res) => {
    try {
        await dbOps.marcarMensajesLeidos(parseInt(req.params.chatId), req.body.usuario_id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/chats/unread/:usuarioId', async (req, res) => {
    try {
        const count = await dbOps.getUnreadChatCount(parseInt(req.params.usuarioId));
        res.json({ count });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- INSTALACIONES VENCIDAS ---
app.get('/api/instalaciones/vencidas', async (req, res) => {
    try {
        res.json(await dbOps.getInstalacionesVencidas());
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/instalaciones/vencidas/tecnico/:tecnicoId', async (req, res) => {
    try {
        res.json(await dbOps.getInstalacionesVencidasByTecnico(parseInt(req.params.tecnicoId)));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/instalaciones/:id/explicacion', async (req, res) => {
    try {
        const { tecnico_usuario_id, motivo } = req.body;
        // Get all admins
        const admins = await dbOps.getAdminUsuarios();
        for (const admin of admins) {
            // Create or get chat
            let chat = await dbOps.getChatByParticipantes(tecnico_usuario_id, admin.id, parseInt(req.params.id));
            if (!chat) {
                const result = await dbOps.createChat('tecnico_admin', parseInt(req.params.id), tecnico_usuario_id, admin.id);
                chat = { id: result.id };
            }
            // Send the explanation as a message
            await dbOps.addMensaje(chat.id, tecnico_usuario_id, motivo);
            // Also create a notification for the admin
            await dbOps.createNotificacion({
                tipo: 'explicacion_tecnico',
                instalacion_id: parseInt(req.params.id),
                emisor_id: tecnico_usuario_id,
                receptor_id: admin.id,
                mensaje: `⚠️ Explicación del técnico sobre instalación no realizada: ${motivo}`
            });
        }
        // Mark installation with note
        await dbOps.updateEstadoInstalacion(parseInt(req.params.id), 'No Realizada', `Motivo: ${motivo}`);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/usuarios', async (req, res) => {
    try {
        res.json(await dbOps.getAdminUsuarios());
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../dist/index.html')));

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => console.log(`AY GABZ SQL Suite Server running on port ${PORT}`));
}

export default app;
