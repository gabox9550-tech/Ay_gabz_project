// =============================================
// dbSupabase.js — Rewritten to use Supabase REST API (HTTPS)
// This completely bypasses the PostgreSQL wire protocol / pooler
// =============================================
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ SUPABASE_URL o SUPABASE_ANON_KEY no están definidas');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper: throw on Supabase errors
function check({ data, error }) {
    if (error) throw new Error(error.message);
    return data;
}

let initialized = false;
export async function connectDB() {
    if (!initialized) {
        console.log('✅ --- Supabase REST API client initialized ---');
        console.log('    URL:', supabaseUrl);
        initialized = true;
    }
    return supabase;
}

// =============================================
// dbOps — All database operations via REST API
// =============================================
export const dbOps = {

    // ─── AUTH ────────────────────────────────
    createUsuario: async (nombre, apellido, email, hash, salt, rol, cliente_id = null) => {
        const data = check(await supabase.from('usuarios')
            .insert({ nombre, apellido, email, password_hash: hash, salt, rol, cliente_id })
            .select('id')
            .single());
        return data; // { id: N }
    },

    getUsuarioByEmail: async (email) => {
        const { data, error } = await supabase.from('usuarios')
            .select('*')
            .eq('email', email)
            .maybeSingle();
        if (error) throw new Error(error.message);
        return data; // row or null
    },

    updateUsuario: async (id, nombre, apellido, email, hash = null, salt = null) => {
        const update = { nombre, apellido, email };
        if (hash && salt) { update.password_hash = hash; update.salt = salt; }
        check(await supabase.from('usuarios').update(update).eq('id', id));
    },

    deleteUsuario: async (id) => {
        check(await supabase.from('usuarios').delete().eq('id', id));
    },

    // ─── CLIENTES ────────────────────────────
    addCliente: async (data) => {
        const { nombre, apellido, telefono, direccion, email, rfc, tipo_cliente } = data;
        const result = check(await supabase.from('clientes')
            .insert({ nombre, apellido, telefono, direccion, email, rfc, tipo_cliente })
            .select('id')
            .single());
        return { lastID: result.id };
    },

    getClientes: async () => {
        const data = check(await supabase.from('clientes')
            .select('*')
            .order('nombre', { ascending: true }));
        return data.map(c => ({ ...c, nombre_completo: `${c.nombre} ${c.apellido}` }));
    },

    getClienteById: async (id) => {
        const { data, error } = await supabase.from('clientes')
            .select('*').eq('id', id).maybeSingle();
        if (error) throw new Error(error.message);
        return data;
    },

    updateCliente: async (id, nombre, apellido, telefono, direccion) => {
        check(await supabase.from('clientes')
            .update({ nombre, apellido, telefono: telefono || '', direccion: direccion || '' })
            .eq('id', id));
    },

    updateClienteTipo: async (id, tipo_cliente) => {
        check(await supabase.from('clientes').update({ tipo_cliente }).eq('id', id));
    },

    deleteClienteById: async (id) => {
        check(await supabase.from('clientes').delete().eq('id', id));
    },

    // ─── PRODUCTOS ───────────────────────────
    addProducto: async (nombre, desc, precio, stock, imgs, cat, sku, specs) => {
        check(await supabase.from('productos').insert({
            nombre, descripcion: desc, precio, stock,
            imagenes_json: imgs, categoria: cat || 'Industrial',
            sku: sku || '', especificaciones: specs || ''
        }));
    },

    getProductos: async () => {
        return check(await supabase.from('productos').select('*').order('nombre'));
    },

    getProductoById: async (id) => {
        const { data, error } = await supabase.from('productos')
            .select('*').eq('id', id).maybeSingle();
        if (error) throw new Error(error.message);
        return data;
    },

    updateProducto: async (id, nombre, desc, precio, stock, imgs, cat, sku, specs) => {
        check(await supabase.from('productos').update({
            nombre, descripcion: desc, precio, stock,
            imagenes_json: imgs, categoria: cat || 'Industrial',
            sku: sku || '', especificaciones: specs || ''
        }).eq('id', id));
    },

    deleteProducto: async (id) => {
        check(await supabase.from('productos').delete().eq('id', id));
    },

    // ─── VENTAS (usa RPC para transacciones) ─
    addVenta: async (cliente_id, producto_id, cantidad, total) => {
        const { data, error } = await supabase.rpc('add_venta', {
            p_cid: cliente_id, p_pid: producto_id, p_qty: cantidad, p_total: total
        });
        if (error) throw new Error(error.message);
        return data; // { ventaId: N }
    },

    getVentas: async () => {
        const data = check(await supabase.from('ventas')
            .select('*, clientes(nombre, apellido), productos(nombre)')
            .order('fecha_venta', { ascending: false }));
        return data.map(v => ({
            ...v,
            cliente_nombre: v.clientes ? `${v.clientes.nombre} ${v.clientes.apellido}` : '',
            producto_nombre: v.productos?.nombre || ''
        }));
    },

    getVentasByCliente: async (cliente_id) => {
        const data = check(await supabase.from('ventas')
            .select('*, productos(nombre)')
            .eq('cliente_id', cliente_id)
            .order('fecha_venta', { ascending: false }));
        return data.map(v => ({ ...v, producto_nombre: v.productos?.nombre || '' }));
    },

    // ─── STATS (usa RPC) ─────────────────────
    getStats: async () => {
        const { data, error } = await supabase.rpc('get_stats');
        if (error) throw new Error(error.message);
        return data;
    },

    // ─── SUCURSALES ──────────────────────────
    getSucursales: async () => {
        return check(await supabase.from('sucursales').select('*').order('id'));
    },

    addSucursal: async (direccion) => {
        check(await supabase.from('sucursales').insert({ direccion }));
    },

    deleteSucursal: async (id) => {
        check(await supabase.from('sucursales').delete().eq('id', id));
    },

    // ─── TÉCNICOS ────────────────────────────
    createTecnico: async (nombre_completo, telefono, numero_id, rfc, tipo_instalador, usuario_id) => {
        const data = check(await supabase.from('tecnicos')
            .insert({ nombre_completo, telefono, numero_id, rfc: rfc || '', tipo_instalador, usuario_id })
            .select('id')
            .single());
        return { tecnicoId: data.id };
    },

    getTecnicos: async () => {
        return check(await supabase.from('tecnicos')
            .select('*').eq('activo', true).order('nombre_completo'));
    },

    getTecnicoByUsuarioId: async (usuario_id) => {
        const { data, error } = await supabase.from('tecnicos')
            .select('*').eq('usuario_id', usuario_id).maybeSingle();
        if (error) throw new Error(error.message);
        return data;
    },

    // ─── INSTALACIONES ───────────────────────
    createInstalacion: async (info) => {
        const { venta_id, cliente_id, tecnico_id, producto_nombre, direccion, fecha_instalacion, hora_instalacion } = info;
        const data = check(await supabase.from('instalaciones')
            .insert({ venta_id, cliente_id, tecnico_id, producto_nombre, direccion, fecha_instalacion, hora_instalacion })
            .select('id')
            .single());
        return { instalacionId: data.id };
    },

    getInstalaciones: async () => {
        const data = check(await supabase.from('instalaciones')
            .select('*, tecnicos(nombre_completo, tipo_instalador), clientes(nombre, apellido, telefono)')
            .order('fecha_instalacion', { ascending: false }));
        return data.map(i => ({
            ...i,
            tecnico_nombre: i.tecnicos?.nombre_completo || '',
            tipo_instalador: i.tecnicos?.tipo_instalador || '',
            cliente_nombre: i.clientes ? `${i.clientes.nombre} ${i.clientes.apellido}` : '',
            cliente_telefono: i.clientes?.telefono || ''
        }));
    },

    getInstalacionesByTecnico: async (tecnico_id) => {
        const data = check(await supabase.from('instalaciones')
            .select('*, clientes(nombre, apellido, telefono, direccion)')
            .eq('tecnico_id', tecnico_id)
            .order('fecha_instalacion').order('hora_instalacion'));
        return data.map(i => ({
            ...i,
            cliente_nombre: i.clientes ? `${i.clientes.nombre} ${i.clientes.apellido}` : '',
            cliente_telefono: i.clientes?.telefono || '',
            cliente_direccion: i.clientes?.direccion || ''
        }));
    },

    getInstalacionesByCliente: async (cliente_id) => {
        const data = check(await supabase.from('instalaciones')
            .select('*, tecnicos(nombre_completo, telefono, usuario_id)')
            .eq('cliente_id', cliente_id)
            .order('fecha_instalacion'));
        return data.map(i => ({
            ...i,
            tecnico_nombre: i.tecnicos?.nombre_completo || '',
            tecnico_telefono: i.tecnicos?.telefono || '',
            tecnico_usuario_id: i.tecnicos?.usuario_id || null
        }));
    },

    updateEstadoInstalacion: async (id, estado, notas = null) => {
        const update = { estado };
        if (notas !== null) update.notas = notas;
        check(await supabase.from('instalaciones').update(update).eq('id', id));
    },

    reprogramarInstalacion: async (id, fecha_instalacion, hora_instalacion) => {
        check(await supabase.from('instalaciones')
            .update({ fecha_instalacion, hora_instalacion, estado: 'Reprogramada' })
            .eq('id', id));
    },

    asignarTecnico: async (id, tecnico_id) => {
        check(await supabase.from('instalaciones').update({ tecnico_id }).eq('id', id));
    },

    getHorariosOcupados: async (fecha) => {
        return check(await supabase.from('instalaciones')
            .select('hora_instalacion, tecnico_id')
            .eq('fecha_instalacion', fecha)
            .neq('estado', 'Cancelada'));
    },

    getTecnicosDisponiblesPorFechaHora: async (fecha, hora, tipo) => {
        const { data, error } = await supabase.rpc('get_tecnicos_disponibles', {
            p_fecha: fecha, p_hora: hora, p_tipo: tipo
        });
        if (error) throw new Error(error.message);
        return data || [];
    },

    getTecnicosConDisponibilidadHoy: async () => {
        const { data, error } = await supabase.rpc('get_tecnicos_con_disponibilidad');
        if (error) throw new Error(error.message);
        return data || [];
    },

    getStatsInstalaciones: async () => {
        const counts = await Promise.all([
            supabase.from('instalaciones').select('id', { count: 'exact', head: true }).eq('estado', 'Pendiente'),
            supabase.from('instalaciones').select('id', { count: 'exact', head: true }).eq('estado', 'Realizada'),
            supabase.from('instalaciones').select('id', { count: 'exact', head: true }).eq('estado', 'Cancelada'),
            supabase.from('instalaciones').select('id', { count: 'exact', head: true }).eq('estado', 'Reprogramada')
        ]);
        return {
            pendientes: counts[0].count || 0,
            realizadas: counts[1].count || 0,
            canceladas: counts[2].count || 0,
            reprogramadas: counts[3].count || 0
        };
    },

    // ─── DIRECCIONES DEL CLIENTE ─────────────
    addDireccion: async (cliente_id, direccion, etiqueta, es_predeterminada) => {
        if (es_predeterminada) {
            await supabase.from('direcciones_cliente')
                .update({ es_predeterminada: false }).eq('cliente_id', cliente_id);
        }
        const data = check(await supabase.from('direcciones_cliente')
            .insert({ cliente_id, direccion, etiqueta: etiqueta || 'Casa', es_predeterminada: !!es_predeterminada })
            .select('id').single());
        if (es_predeterminada) {
            await supabase.from('clientes').update({ direccion }).eq('id', cliente_id);
        }
        return { id: data.id };
    },

    getDireccionesByCliente: async (cliente_id) => {
        return check(await supabase.from('direcciones_cliente')
            .select('*').eq('cliente_id', cliente_id)
            .order('es_predeterminada', { ascending: false })
            .order('fecha_creacion', { ascending: false }));
    },

    setDireccionPredeterminada: async (id, cliente_id) => {
        await supabase.from('direcciones_cliente')
            .update({ es_predeterminada: false }).eq('cliente_id', cliente_id);
        await supabase.from('direcciones_cliente')
            .update({ es_predeterminada: true }).eq('id', id);
        const { data } = await supabase.from('direcciones_cliente')
            .select('direccion').eq('id', id).single();
        if (data) {
            await supabase.from('clientes').update({ direccion: data.direccion }).eq('id', cliente_id);
        }
    },

    deleteDireccion: async (id) => {
        check(await supabase.from('direcciones_cliente').delete().eq('id', id));
    },

    updateDireccion: async (id, direccion, etiqueta) => {
        check(await supabase.from('direcciones_cliente')
            .update({ direccion, etiqueta }).eq('id', id));
    },

    // ─── NOTIFICACIONES ──────────────────────
    createNotificacion: async (info) => {
        const { tipo, instalacion_id, emisor_id, receptor_id, mensaje, nueva_fecha, nueva_hora } = info;
        const data = check(await supabase.from('notificaciones')
            .insert({ tipo, instalacion_id, emisor_id, receptor_id, mensaje, nueva_fecha: nueva_fecha || null, nueva_hora: nueva_hora || null })
            .select('id').single());
        return { id: data.id };
    },

    getNotificacionesByUsuario: async (usuario_id) => {
        const { data, error } = await supabase.rpc('get_notificaciones_by_usuario', { p_uid: usuario_id });
        if (error) throw new Error(error.message);
        return data || [];
    },

    getNotificacionesPendientesByUsuario: async (usuario_id) => {
        const { count, error } = await supabase.from('notificaciones')
            .select('id', { count: 'exact', head: true })
            .eq('receptor_id', usuario_id)
            .eq('estado', 'Pendiente')
            .eq('leida', false);
        if (error) throw new Error(error.message);
        return count || 0;
    },

    updateNotificacion: async (id, estado) => {
        check(await supabase.from('notificaciones')
            .update({ estado, leida: true }).eq('id', id));
    },

    limpiarNotificacionesPendientes: async (instalacion_id, notificacion_id_ignorada) => {
        check(await supabase.from('notificaciones')
            .update({ estado: 'Atendida', leida: true })
            .eq('instalacion_id', instalacion_id)
            .neq('id', notificacion_id_ignorada)
            .eq('estado', 'Pendiente')
            .in('tipo', ['nueva_instalacion', 'reasignacion', 'solicitud_reprogramacion']));
    },

    marcarNotificacionLeida: async (id) => {
        check(await supabase.from('notificaciones').update({ leida: true }).eq('id', id));
    },

    getInstalacionById: async (id) => {
        const { data, error } = await supabase.from('instalaciones')
            .select('*, tecnicos(usuario_id)')
            .eq('id', id).maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) return null;
        return { ...data, tecnico_usuario_id: data.tecnicos?.usuario_id || null };
    },

    reasignarTecnico: async (instalacion_id, tecnico_id) => {
        check(await supabase.from('instalaciones')
            .update({ tecnico_id }).eq('id', instalacion_id));
    },

    // ─── CANCELACIÓN DE VENTAS ───────────────
    getVentaById: async (id) => {
        const { data, error } = await supabase.from('ventas')
            .select('*, productos(nombre)')
            .eq('id', id).maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) return null;
        return { ...data, producto_nombre: data.productos?.nombre || '' };
    },

    cancelarVenta: async (venta_id) => {
        const { data, error } = await supabase.rpc('cancelar_venta', { p_vid: venta_id });
        if (error) throw new Error(error.message);
        return data;
    },

    // ─── CHATS ───────────────────────────────
    createChat: async (tipo, instalacion_id, usuario1_id, usuario2_id) => {
        const data = check(await supabase.from('chats')
            .insert({ tipo, instalacion_id: instalacion_id || null, usuario1_id, usuario2_id })
            .select('id').single());
        return { id: data.id };
    },

    getChatByParticipantes: async (usuario1_id, usuario2_id, instalacion_id = null) => {
        let query = supabase.from('chats').select('*')
            .or(`and(usuario1_id.eq.${usuario1_id},usuario2_id.eq.${usuario2_id}),and(usuario1_id.eq.${usuario2_id},usuario2_id.eq.${usuario1_id})`);
        if (instalacion_id) {
            query = query.eq('instalacion_id', instalacion_id);
        } else {
            query = query.is('instalacion_id', null);
        }
        const { data, error } = await query.maybeSingle();
        if (error) throw new Error(error.message);
        return data;
    },

    getChatsByUsuario: async (usuario_id) => {
        const { data, error } = await supabase.rpc('get_chats_by_usuario', { p_uid: usuario_id });
        if (error) throw new Error(error.message);
        return data || [];
    },

    getChatById: async (id) => {
        const { data: chat, error } = await supabase.from('chats')
            .select('*').eq('id', id).maybeSingle();
        if (error) throw new Error(error.message);
        if (!chat) return null;

        const [u1Res, u2Res] = await Promise.all([
            supabase.from('usuarios').select('nombre, apellido, rol').eq('id', chat.usuario1_id).single(),
            supabase.from('usuarios').select('nombre, apellido, rol').eq('id', chat.usuario2_id).single()
        ]);

        let inst = null;
        if (chat.instalacion_id) {
            const { data: iData } = await supabase.from('instalaciones')
                .select('producto_nombre, estado, fecha_instalacion')
                .eq('id', chat.instalacion_id).single();
            inst = iData;
        }

        return {
            ...chat,
            nombre_u1: u1Res.data ? `${u1Res.data.nombre} ${u1Res.data.apellido}` : '',
            rol_u1: u1Res.data?.rol || '',
            nombre_u2: u2Res.data ? `${u2Res.data.nombre} ${u2Res.data.apellido}` : '',
            rol_u2: u2Res.data?.rol || '',
            inst_producto: inst?.producto_nombre || null,
            inst_estado: inst?.estado || null,
            inst_fecha: inst?.fecha_instalacion || null
        };
    },

    getMensajesByChat: async (chat_id) => {
        const data = check(await supabase.from('mensajes')
            .select('*')
            .eq('chat_id', chat_id)
            .order('fecha_creacion'));
        // Get sender names
        const emisorIds = [...new Set(data.map(m => m.emisor_id))];
        let userMap = {};
        if (emisorIds.length > 0) {
            const { data: usuarios } = await supabase.from('usuarios')
                .select('id, nombre, apellido, rol')
                .in('id', emisorIds);
            (usuarios || []).forEach(u => { userMap[u.id] = u; });
        }
        return data.map(m => {
            const u = userMap[m.emisor_id];
            return {
                ...m,
                emisor_nombre: u ? `${u.nombre} ${u.apellido}` : '',
                emisor_rol: u?.rol || ''
            };
        });
    },

    addMensaje: async (chat_id, emisor_id, contenido) => {
        const data = check(await supabase.from('mensajes')
            .insert({ chat_id, emisor_id, contenido })
            .select('id').single());
        await supabase.from('chats')
            .update({ ultimo_mensaje: new Date().toISOString() })
            .eq('id', chat_id);
        return { id: data.id };
    },

    updateEstadoChat: async (chat_id, usuario_id, estado) => {
        const { data: chat } = await supabase.from('chats')
            .select('usuario1_id, usuario2_id').eq('id', chat_id).single();
        if (!chat) throw new Error('Chat no encontrado');
        const field = chat.usuario1_id === usuario_id ? 'estado_u1' : 'estado_u2';
        check(await supabase.from('chats').update({ [field]: estado }).eq('id', chat_id));
    },

    marcarMensajesLeidos: async (chat_id, usuario_id) => {
        check(await supabase.from('mensajes')
            .update({ leido: true })
            .eq('chat_id', chat_id)
            .neq('emisor_id', usuario_id)
            .eq('leido', false));
    },

    getUnreadChatCount: async (usuario_id) => {
        const { data, error } = await supabase.rpc('get_unread_chat_count', { p_uid: usuario_id });
        if (error) throw new Error(error.message);
        return data || 0;
    },

    // ─── INSTALACIONES VENCIDAS ──────────────
    getInstalacionesVencidas: async () => {
        const { data, error } = await supabase.rpc('get_instalaciones_vencidas');
        if (error) throw new Error(error.message);
        return data || [];
    },

    getInstalacionesVencidasByTecnico: async (tecnico_id) => {
        const { data, error } = await supabase.rpc('get_instalaciones_vencidas_by_tecnico', { p_tid: tecnico_id });
        if (error) throw new Error(error.message);
        return data || [];
    },

    getAdminUsuarios: async () => {
        return check(await supabase.from('usuarios').select('id').eq('rol', 'Admin'));
    },

    canTecnicoDeleteChat: async (chat_id) => {
        const { data } = await supabase.from('chats')
            .select('instalacion_id, instalaciones(estado)')
            .eq('id', chat_id).maybeSingle();
        if (!data) return false;
        if (!data.instalacion_id) return true;
        return data.instalaciones?.estado === 'Realizada';
    }
};