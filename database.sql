-- ============================================================
-- CREACIÓN DE TABLAS
-- El orden importa: primero las tablas independientes (sin FK),
-- luego las que referencian a otras.
-- ============================================================

-- Tabla base: no depende de ninguna otra
CREATE TABLE clientes (
    id_cliente SERIAL PRIMARY KEY,       -- SERIAL: autoincremental, no hace falta mandarlo en el INSERT
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    dni VARCHAR(20) NOT NULL UNIQUE,     -- UNIQUE: PostgreSQL rechaza DNIs duplicados automáticamente
    password_hash VARCHAR(255) NOT NULL  -- Se guarda el hash de bcrypt, nunca la contraseña en texto plano
);

-- Tabla base: no depende de ninguna otra
CREATE TABLE habitaciones (
    id_habitacion SERIAL PRIMARY KEY,
    -- CHECK a nivel columna: PostgreSQL rechaza cualquier valor fuera de esta lista
    tipo VARCHAR(100) NOT NULL CHECK (tipo IN ('simple', 'doble', 'matrimonial', 'presidencial')),
    precio_noche NUMERIC(10,2) NOT NULL, -- NUMERIC(10,2): hasta 10 dígitos, 2 decimales (ideal para dinero)
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('disponible', 'ocupada', 'mantenimiento'))
);

-- Tabla dependiente: referencia a clientes y habitaciones mediante FK
CREATE TABLE reservas (
    id_reserva SERIAL PRIMARY KEY,
    id_cliente INT REFERENCES clientes(id_cliente),         -- FK: si se borra el cliente, PostgreSQL lanza error
    id_habitacion INT REFERENCES habitaciones(id_habitacion),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('confirmada', 'cancelada', 'finalizada')),
    CHECK (fecha_fin > fecha_inicio) -- CHECK a nivel tabla: valida relación entre dos columnas
);

-- Tabla dependiente: referencia a reservas y habitaciones
CREATE TABLE pagos (
    id_pago SERIAL PRIMARY KEY,
    id_reserva INT NOT NULL REFERENCES reservas(id_reserva),
    id_habitacion INT NOT NULL REFERENCES habitaciones(id_habitacion),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('efectivo', 'tarjeta_debito', 'tarjeta_credito')),
    monto NUMERIC(10,2) NOT NULL,
    fecha DATE DEFAULT CURRENT_DATE -- Si no se manda fecha, PostgreSQL usa la fecha del servidor
);


-- ============================================================
-- PROCEDIMIENTO ALMACENADO: crear_reserva()
-- Lógica de negocio que vive en la BD, no en el backend.
-- Se llama desde el controlador con: SELECT crear_reserva($1,$2,$3,$4)
-- dentro de una transacción BEGIN/COMMIT para garantizar atomicidad.
-- ============================================================
CREATE OR REPLACE FUNCTION crear_reserva(
    p_id_cliente INT,
    p_id_habitacion INT,
    p_fecha_inicio DATE,
    p_fecha_fin DATE
)
RETURNS VOID AS $$  -- VOID: no devuelve datos, solo ejecuta acciones
DECLARE
    conflicto INT; -- Variable local para guardar el resultado del COUNT
BEGIN
    -- 1. Detectar superposición de fechas con reservas confirmadas existentes.
    --    La lógica (fecha_inicio < p_fecha_fin AND fecha_fin > p_fecha_inicio)
    --    cubre todos los casos de solapamiento posibles entre dos rangos de fechas.
    SELECT COUNT(*) INTO conflicto
    FROM reservas
    WHERE id_habitacion = p_id_habitacion
    AND estado = 'confirmada'
    AND (
        fecha_inicio < p_fecha_fin
        AND fecha_fin > p_fecha_inicio
    );

    -- 2. Si hay al menos una reserva que se superpone, lanzamos excepción.
    --    RAISE EXCEPTION corta la ejecución y hace ROLLBACK de la transacción en el backend.
    IF conflicto > 0 THEN
        RAISE EXCEPTION 'La habitación no está disponible en esas fechas';
    END IF;

    -- 3. Si no hay conflicto, insertamos la reserva con estado 'confirmada'
    INSERT INTO reservas (id_cliente, id_habitacion, fecha_inicio, fecha_fin, estado)
    VALUES (p_id_cliente, p_id_habitacion, p_fecha_inicio, p_fecha_fin, 'confirmada');

    -- 4. Marcamos la habitación como ocupada para que no aparezca disponible
    UPDATE habitaciones
    SET estado = 'ocupada'
    WHERE id_habitacion = p_id_habitacion;

END;
$$ LANGUAGE plpgsql; -- plpgsql: lenguaje procedural de PostgreSQL (permite IF, loops, variables, etc.)


-- ============================================================
-- TRIGGER: actualizar_estado_habitacion
-- Se dispara automáticamente DESPUÉS de cada UPDATE en reservas.
-- Su función es liberar la habitación cuando una reserva se
-- cancela o finaliza, sin que el backend tenga que hacerlo.
-- ============================================================
CREATE OR REPLACE FUNCTION actualizar_estado_habitacion()
RETURNS TRIGGER AS $$ -- TRIGGER: tipo especial de función que responde a eventos en la tabla
BEGIN
    -- NEW: fila con los valores nuevos (después del UPDATE)
    -- OLD: fila con los valores anteriores (antes del UPDATE)
    -- Solo actuamos si el estado cambió a 'cancelada' o 'finalizada'
    IF NEW.estado IN ('cancelada', 'finalizada') 
        AND OLD.estado != NEW.estado THEN -- Evita ejecutarse si el estado no cambió realmente

        UPDATE habitaciones
        SET estado = 'disponible'
        WHERE id_habitacion = NEW.id_habitacion;

    END IF;

    RETURN NEW; -- En triggers AFTER, RETURN NEW es obligatorio aunque no tenga efecto
END;
$$ LANGUAGE plpgsql;

-- Vinculamos la función al evento: se ejecuta una vez por cada fila modificada (FOR EACH ROW)
CREATE TRIGGER trigger_actualizar_habitacion
AFTER UPDATE ON reservas        -- Se dispara después de cualquier UPDATE en la tabla reservas
FOR EACH ROW                    -- Una ejecución por fila afectada (no una por sentencia)
EXECUTE FUNCTION actualizar_estado_habitacion();


-- ============================================================
-- DATOS DE PRUEBA
-- ADVERTENCIA: las contraseñas están en texto plano solo para
-- pruebas directas en la BD. El sistema real siempre registra
-- clientes a través de /api/auth/register que aplica bcrypt.
-- ============================================================
INSERT INTO clientes (nombre, apellido, dni, password_hash)
VALUES ('Juan', 'Perez', '12345678', 'techo1');

INSERT INTO clientes (nombre, apellido, dni, password_hash)
VALUES ('Leandro', 'Paredes', '55555555', 'casa2');

INSERT INTO clientes (nombre, apellido, dni, password_hash)
VALUES ('Agustina', 'Andrada', '87654321', 'perro3');

INSERT INTO habitaciones (tipo, precio_noche, estado)
VALUES ('simple', 10000, 'disponible');

INSERT INTO habitaciones (tipo, precio_noche, estado)
VALUES ('doble', 15000, 'disponible');

INSERT INTO habitaciones (tipo, precio_noche, estado)
VALUES ('matrimonial', 20000, 'disponible');


-- ============================================================
-- SCRIPTS DE PRUEBA (ejecutar manualmente para verificar)
-- ============================================================

-- Prueba normal: debería crear la reserva exitosamente
SELECT crear_reserva(1, 1, '2026-05-10', '2026-05-15');

-- Prueba de conflicto: fechas que se superponen con la reserva anterior → debe lanzar excepción
SELECT crear_reserva(1, 1, '2026-05-12', '2026-05-18');

-- Prueba del trigger: al cancelar, la habitación debería volver a 'disponible' automáticamente
UPDATE reservas
SET estado = 'cancelada'
WHERE id_reserva = 1;