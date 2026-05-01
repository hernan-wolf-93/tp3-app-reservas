CREATE TABLE clientes (
    id_cliente SERIAL PRIMARY KEY, 
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    dni VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL 
);

CREATE TABLE habitaciones (
    id_habitacion SERIAL PRIMARY KEY,
    tipo VARCHAR(100) NOT NULL CHECK (tipo IN ('simple', 'doble', 'matrimonial', 'presidencial')),
    precio_noche NUMERIC (10,2) NOT NULL, 
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('disponible', 'ocupada', 'mantenimiento'))
);

CREATE TABLE reservas (
    id_reserva SERIAL PRIMARY KEY,
    id_cliente INT REFERENCES clientes(id_cliente),
    id_habitacion INT REFERENCES habitaciones(id_habitacion),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('confirmada', 'cancelada', 'finalizada')),
    CHECK (fecha_fin > fecha_inicio)
);

CREATE TABLE pagos (
    id_pago SERIAL PRIMARY KEY,
    id_reserva INT NOT NULL REFERENCES reservas(id_reserva),
    id_habitacion INT NOT NULL REFERENCES habitaciones(id_habitacion), 
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('efectivo', 'tarjeta_debito', 'tarjeta_credito')),
    monto NUMERIC (10,2) NOT NULL,
    fecha DATE DEFAULT CURRENT_DATE
);


--CREACION de procedimiento almacenado
 CREATE OR REPLACE FUNCTION crear_reserva(
    p_id_cliente INT,
    p_id_habitacion INT,
    p_fecha_inicio DATE,
    p_fecha_fin DATE
)
RETURNS VOID AS $$
DECLARE
    conflicto INT;
BEGIN
    -- 1. Verificar superposición de fechas
    SELECT COUNT(*) INTO conflicto
    FROM reservas
    WHERE id_habitacion = p_id_habitacion
    AND estado = 'confirmada'
    AND (
        fecha_inicio < p_fecha_fin
        AND fecha_fin > p_fecha_inicio
    );

    -- 2. Si hay conflicto, lanzar error
    IF conflicto > 0 THEN
        RAISE EXCEPTION 'La habitación no está disponible en esas fechas';
    END IF;

    -- 3. Insertar reserva
    INSERT INTO reservas (
        id_cliente,
        id_habitacion,
        fecha_inicio,
        fecha_fin,
        estado
    )
    VALUES (
        p_id_cliente,
        p_id_habitacion,
        p_fecha_inicio,
        p_fecha_fin,
        'confirmada'
    );

    -- 4. Actualizar el estado de la habitación a 'ocupada'
    UPDATE habitaciones
    SET estado = 'ocupada'
    WHERE id_habitacion = p_id_habitacion;

END;
$$ LANGUAGE plpgsql;


--FUNCION TRIGGER
CREATE OR REPLACE FUNCTION actualizar_estado_habitacion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado IN ('cancelada', 'finalizada') 
       AND OLD.estado != NEW.estado THEN

        UPDATE habitaciones
        SET estado = 'disponible'
        WHERE id_habitacion = NEW.id_habitacion;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trigger_actualizar_habitacion
AFTER UPDATE ON reservas
FOR EACH ROW
EXECUTE FUNCTION actualizar_estado_habitacion();


--INGRESO DATOS
INSERT INTO clientes (nombre, apellido, dni, password_hash)
VALUES ('Juan', 'Perez', '12345678', 'techo');

INSERT INTO clientes (nombre, apellido, dni, password_hash)
VALUES ('Hernan', 'Lobo', '37501386', 'casa');

INSERT INTO clientes (nombre, apellido, dni, password_hash)
VALUES ('Agustina', 'Andrada', '87654321', 'perro');

INSERT INTO habitaciones (tipo, precio_noche, estado)
VALUES ('simple', 10000, 'disponible');

INSERT INTO habitaciones (tipo, precio_noche, estado)
VALUES ('doble', 15000, 'disponible');

INSERT INTO habitaciones (tipo, precio_noche, estado)
VALUES ('matrimonial', 20000, 'disponible');


--PROBAR PROCEDIMIENTO
SELECT crear_reserva(1, 1, '2026-05-10', '2026-05-15');

--PROBAR CONFLICTO
SELECT crear_reserva(1, 1, '2026-05-12', '2026-05-18');

--PROBAR EL TRIGGER
UPDATE reservas
SET estado = 'cancelada'
WHERE id_reserva = 1;

SELECT * FROM habitaciones;

TRUNCATE TABLE habitaciones RESTART IDENTITY CASCADE;

SELECT * 
FROM clientes

SELECT nombre, apellido, dni 
FROM clientes 
WHERE id_cliente = 1

SELECT * 
FROM reservas

DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

SELECT dni, password_hash FROM clientes;