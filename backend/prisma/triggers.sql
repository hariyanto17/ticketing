-- Realtime PostgreSQL triggers for kasir-ticket

-- 1. ShowtimeSeat Notification Function & Trigger
CREATE OR REPLACE FUNCTION notify_showtime_seat_event()
RETURNS trigger AS $$
DECLARE
  payload json;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    payload = json_build_object(
      'action', TG_OP,
      'table', TG_TABLE_NAME,
      'data', row_to_json(OLD)
    );
  ELSE
    payload = json_build_object(
      'action', TG_OP,
      'table', TG_TABLE_NAME,
      'data', row_to_json(NEW)
    );
  END IF;
  
  PERFORM pg_notify('showtime_seat_event', payload::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_showtime_seat_notify ON "ShowtimeSeat";
CREATE TRIGGER trigger_showtime_seat_notify
AFTER INSERT OR UPDATE OR DELETE ON "ShowtimeSeat"
FOR EACH ROW
EXECUTE FUNCTION notify_showtime_seat_event();

-- 2. Order Notification Function & Trigger
CREATE OR REPLACE FUNCTION notify_order_event()
RETURNS trigger AS $$
DECLARE
  payload json;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    payload = json_build_object(
      'action', TG_OP,
      'table', TG_TABLE_NAME,
      'data', row_to_json(OLD)
    );
  ELSE
    payload = json_build_object(
      'action', TG_OP,
      'table', TG_TABLE_NAME,
      'data', row_to_json(NEW)
    );
  END IF;
  
  PERFORM pg_notify('order_event', payload::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_order_notify ON "Order";
CREATE TRIGGER trigger_order_notify
AFTER INSERT OR UPDATE OR DELETE ON "Order"
FOR EACH ROW
EXECUTE FUNCTION notify_order_event();

-- 3. Payment Notification Function & Trigger
CREATE OR REPLACE FUNCTION notify_payment_event()
RETURNS trigger AS $$
DECLARE
  payload json;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    payload = json_build_object(
      'action', TG_OP,
      'table', TG_TABLE_NAME,
      'data', row_to_json(OLD)
    );
  ELSE
    payload = json_build_object(
      'action', TG_OP,
      'table', TG_TABLE_NAME,
      'data', row_to_json(NEW)
    );
  END IF;
  
  PERFORM pg_notify('payment_event', payload::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_payment_notify ON "Payment";
CREATE TRIGGER trigger_payment_notify
AFTER INSERT OR UPDATE OR DELETE ON "Payment"
FOR EACH ROW
EXECUTE FUNCTION notify_payment_event();

-- 4. Showtime Notification Function & Trigger
CREATE OR REPLACE FUNCTION notify_showtime_event()
RETURNS trigger AS $$
DECLARE
  payload json;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    payload = json_build_object(
      'action', TG_OP,
      'table', TG_TABLE_NAME,
      'data', row_to_json(OLD)
    );
  ELSE
    payload = json_build_object(
      'action', TG_OP,
      'table', TG_TABLE_NAME,
      'data', row_to_json(NEW)
    );
  END IF;
  
  PERFORM pg_notify('showtime_event', payload::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_showtime_notify ON "Showtime";
CREATE TRIGGER trigger_showtime_notify
AFTER INSERT OR UPDATE OR DELETE ON "Showtime"
FOR EACH ROW
EXECUTE FUNCTION notify_showtime_event();
