-- =============================================
-- AY GABZ - Setup completo para Supabase
-- Pega todo este contenido en el SQL Editor de Supabase y dale Run
-- =============================================

-- TABLAS
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    direccion TEXT NOT NULL,
    email VARCHAR(255) UNIQUE,
    rfc VARCHAR(50),
    tipo_cliente VARCHAR(50) DEFAULT 'Residencial'
);

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
);

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    rol VARCHAR(50) DEFAULT 'Cliente',
    cliente_id INT REFERENCES clientes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ventas (
    id SERIAL PRIMARY KEY,
    cliente_id INT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    producto_id INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    cantidad INT NOT NULL,
    total DECIMAL(18,2) NOT NULL,
    fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(50) DEFAULT 'Completada'
);

CREATE TABLE IF NOT EXISTS sucursales (
    id SERIAL PRIMARY KEY,
    direccion TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tecnicos (
    id SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(200) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    numero_id VARCHAR(50) UNIQUE NOT NULL,
    rfc VARCHAR(50),
    tipo_instalador VARCHAR(50) NOT NULL DEFAULT 'Residencial',
    usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    activo BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS instalaciones (
    id SERIAL PRIMARY KEY,
    venta_id INT REFERENCES ventas(id) ON DELETE NO ACTION,
    cliente_id INT REFERENCES clientes(id) ON DELETE NO ACTION,
    tecnico_id INT REFERENCES tecnicos(id) ON DELETE NO ACTION,
    producto_nombre VARCHAR(255),
    direccion TEXT,
    fecha_instalacion DATE NOT NULL,
    hora_instalacion VARCHAR(10) NOT NULL,
    estado VARCHAR(50) DEFAULT 'Pendiente',
    notas TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS direcciones_cliente (
    id SERIAL PRIMARY KEY,
    cliente_id INT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    direccion TEXT NOT NULL,
    etiqueta VARCHAR(100) DEFAULT 'Casa',
    es_predeterminada BOOLEAN DEFAULT false,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notificaciones (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    instalacion_id INT REFERENCES instalaciones(id) ON DELETE NO ACTION,
    emisor_id INT,
    receptor_id INT,
    mensaje TEXT,
    nueva_fecha DATE,
    nueva_hora VARCHAR(10),
    estado VARCHAR(50) DEFAULT 'Pendiente',
    leida BOOLEAN DEFAULT false,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chats (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    instalacion_id INT REFERENCES instalaciones(id) ON DELETE NO ACTION,
    usuario1_id INT NOT NULL REFERENCES usuarios(id) ON DELETE NO ACTION,
    usuario2_id INT NOT NULL REFERENCES usuarios(id) ON DELETE NO ACTION,
    estado_u1 VARCHAR(50) DEFAULT 'activo',
    estado_u2 VARCHAR(50) DEFAULT 'activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_mensaje TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mensajes (
    id SERIAL PRIMARY KEY,
    chat_id INT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    emisor_id INT NOT NULL REFERENCES usuarios(id) ON DELETE NO ACTION,
    contenido TEXT NOT NULL,
    leido BOOLEAN DEFAULT false,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- FUNCIONES RPC (para consultas complejas)
-- =============================================

CREATE OR REPLACE FUNCTION add_venta(p_cid int, p_pid int, p_qty int, p_total decimal)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_stock int; v_id int;
BEGIN
    SELECT stock INTO v_stock FROM productos WHERE id = p_pid;
    IF v_stock IS NULL OR v_stock < p_qty THEN RAISE EXCEPTION 'Stock insuficiente'; END IF;
    INSERT INTO ventas (cliente_id, producto_id, cantidad, total) VALUES (p_cid, p_pid, p_qty, p_total) RETURNING id INTO v_id;
    UPDATE productos SET stock = stock - p_qty WHERE id = p_pid;
    RETURN json_build_object('ventaId', v_id);
END; $$;

CREATE OR REPLACE FUNCTION cancelar_venta(p_vid int)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v ventas%ROWTYPE;
BEGIN
    SELECT * INTO v FROM ventas WHERE id = p_vid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Venta no encontrada'; END IF;
    IF v.estado = 'Cancelada' THEN RAISE EXCEPTION 'La venta ya fue cancelada'; END IF;
    UPDATE ventas SET estado = 'Cancelada' WHERE id = p_vid;
    UPDATE productos SET stock = stock + v.cantidad WHERE id = v.producto_id;
    UPDATE instalaciones SET estado = 'Cancelada', notas = 'Cancelada por devolucion' WHERE venta_id = p_vid AND estado NOT IN ('Realizada','Cancelada');
    RETURN json_build_object('success', true, 'cantidad_devuelta', v.cantidad, 'total_devuelto', v.total);
END; $$;

CREATE OR REPLACE FUNCTION get_stats()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN json_build_object(
        'totalVentas', COALESCE((SELECT SUM(total) FROM ventas),0),
        'numVentas', (SELECT COUNT(*) FROM ventas),
        'numClientes', (SELECT COUNT(*) FROM clientes),
        'topProducto', COALESCE((SELECT p.nombre FROM ventas v JOIN productos p ON v.producto_id=p.id GROUP BY p.nombre ORDER BY COUNT(v.id) DESC LIMIT 1),'N/A'),
        'ventasRecientes', COALESCE((SELECT json_agg(t) FROM (SELECT v.total, v.fecha_venta, c.nombre||' '||c.apellido as cliente FROM ventas v JOIN clientes c ON v.cliente_id=c.id ORDER BY v.fecha_venta DESC LIMIT 5) t),'[]'::json)
    );
END; $$;

CREATE OR REPLACE FUNCTION get_tecnicos_disponibles(p_fecha date, p_hora text, p_tipo text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN COALESCE((SELECT json_agg(row_to_json(t)) FROM (
        SELECT t.* FROM tecnicos t WHERE t.activo=true AND t.tipo_instalador=p_tipo
        AND t.id NOT IN (SELECT i.tecnico_id FROM instalaciones i WHERE i.fecha_instalacion=p_fecha AND i.hora_instalacion=p_hora AND i.estado NOT IN ('Cancelada') AND i.tecnico_id IS NOT NULL)
    ) t),'[]'::json);
END; $$;

CREATE OR REPLACE FUNCTION get_tecnicos_con_disponibilidad()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN COALESCE((SELECT json_agg(row_to_json(t)) FROM (
        SELECT t.*, (SELECT COUNT(*) FROM instalaciones i WHERE i.tecnico_id=t.id AND i.fecha_instalacion=CURRENT_DATE AND i.estado NOT IN ('Cancelada','Realizada'))::int as instalaciones_hoy
        FROM tecnicos t WHERE t.activo=true ORDER BY t.nombre_completo
    ) t),'[]'::json);
END; $$;

CREATE OR REPLACE FUNCTION get_chats_by_usuario(p_uid int)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN COALESCE((SELECT json_agg(row_to_json(t)) FROM (
        SELECT c.*, u1.nombre||' '||u1.apellido as nombre_u1, u1.rol as rol_u1, u2.nombre||' '||u2.apellido as nombre_u2, u2.rol as rol_u2,
            CASE WHEN c.usuario1_id=p_uid THEN c.estado_u1 ELSE c.estado_u2 END as mi_estado,
            (SELECT contenido FROM mensajes WHERE chat_id=c.id ORDER BY fecha_creacion DESC LIMIT 1) as ultimo_msg,
            (SELECT COUNT(*) FROM mensajes WHERE chat_id=c.id AND emisor_id!=p_uid AND leido=false)::int as no_leidos,
            i.producto_nombre as inst_producto, i.estado as inst_estado
        FROM chats c JOIN usuarios u1 ON c.usuario1_id=u1.id JOIN usuarios u2 ON c.usuario2_id=u2.id LEFT JOIN instalaciones i ON c.instalacion_id=i.id
        WHERE c.usuario1_id=p_uid OR c.usuario2_id=p_uid ORDER BY c.ultimo_mensaje DESC
    ) t),'[]'::json);
END; $$;

CREATE OR REPLACE FUNCTION get_unread_chat_count(p_uid int)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE cnt int;
BEGIN
    SELECT COUNT(DISTINCT m.chat_id) INTO cnt FROM mensajes m JOIN chats c ON m.chat_id=c.id
    WHERE m.emisor_id!=p_uid AND m.leido=false AND (c.usuario1_id=p_uid OR c.usuario2_id=p_uid)
    AND CASE WHEN c.usuario1_id=p_uid THEN c.estado_u1 ELSE c.estado_u2 END != 'eliminado';
    RETURN COALESCE(cnt,0);
END; $$;

CREATE OR REPLACE FUNCTION get_notificaciones_by_usuario(p_uid int)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN COALESCE((SELECT json_agg(row_to_json(t)) FROM (
        SELECT n.*, i.producto_nombre, i.fecha_instalacion as fecha_actual, i.hora_instalacion as hora_actual, u.nombre||' '||u.apellido as emisor_nombre
        FROM notificaciones n LEFT JOIN instalaciones i ON n.instalacion_id=i.id LEFT JOIN usuarios u ON n.emisor_id=u.id
        WHERE n.receptor_id=p_uid ORDER BY n.fecha_creacion DESC
    ) t),'[]'::json);
END; $$;

CREATE OR REPLACE FUNCTION get_instalaciones_vencidas()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN COALESCE((SELECT json_agg(row_to_json(t)) FROM (
        SELECT i.*, t.nombre_completo as tecnico_nombre, t.usuario_id as tecnico_usuario_id, c.nombre||' '||c.apellido as cliente_nombre
        FROM instalaciones i LEFT JOIN tecnicos t ON i.tecnico_id=t.id LEFT JOIN clientes c ON i.cliente_id=c.id
        WHERE i.estado IN ('Pendiente','Reprogramada') AND i.fecha_instalacion < CURRENT_DATE AND i.tecnico_id IS NOT NULL
    ) t),'[]'::json);
END; $$;

CREATE OR REPLACE FUNCTION get_instalaciones_vencidas_by_tecnico(p_tid int)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN COALESCE((SELECT json_agg(row_to_json(t)) FROM (
        SELECT i.*, c.nombre||' '||c.apellido as cliente_nombre
        FROM instalaciones i LEFT JOIN clientes c ON i.cliente_id=c.id
        WHERE i.estado IN ('Pendiente','Reprogramada') AND i.fecha_instalacion < CURRENT_DATE AND i.tecnico_id=p_tid
    ) t),'[]'::json);
END; $$;

-- =============================================
-- PERMISOS (permitir acceso con anon key)
-- =============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
