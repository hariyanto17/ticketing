-- ============================================================================
-- SQL CLEANUP & SEEDER: ROLE STANDARDIZATION (NO DUPLICATES)
-- Database: PostgreSQL (ticketing)
-- Role Standar: Admin, Cashier, Gate Validator, Projectionist
-- Menghilangkan duplikasi seperti PROJECTIONIST / Projectionist, dll.
-- ============================================================================

DO $$
DECLARE
    v_admin_id VARCHAR;
    v_cashier_id VARCHAR;
    v_gate_id VARCHAR;
    v_proj_id VARCHAR;
BEGIN
    -- 1. Pastikan Role Utama (Canonical Roles) Tersedia
    -- 1.1 Admin
    SELECT id INTO v_admin_id FROM "Role" WHERE name IN ('Admin', 'ADMINISTRATOR') ORDER BY CASE WHEN name = 'Admin' THEN 1 ELSE 2 END LIMIT 1;
    IF v_admin_id IS NULL THEN
        v_admin_id := gen_random_uuid()::text;
        INSERT INTO "Role" (id, name, description, status)
        VALUES (v_admin_id, 'Admin', 'Administrator role', 'ACTIVE');
    ELSE
        UPDATE "Role" SET name = 'Admin', description = 'Administrator role', status = 'ACTIVE' WHERE id = v_admin_id;
    END IF;

    -- 1.2 Cashier
    SELECT id INTO v_cashier_id FROM "Role" WHERE name IN ('Cashier', 'CASHIER') ORDER BY CASE WHEN name = 'Cashier' THEN 1 ELSE 2 END LIMIT 1;
    IF v_cashier_id IS NULL THEN
        v_cashier_id := gen_random_uuid()::text;
        INSERT INTO "Role" (id, name, description, status)
        VALUES (v_cashier_id, 'Cashier', 'Cashier role', 'ACTIVE');
    ELSE
        UPDATE "Role" SET name = 'Cashier', description = 'Cashier role', status = 'ACTIVE' WHERE id = v_cashier_id;
    END IF;

    -- 1.3 Gate Validator
    SELECT id INTO v_gate_id FROM "Role" WHERE name IN ('Gate Validator', 'GATE_VALIDATOR') ORDER BY CASE WHEN name = 'Gate Validator' THEN 1 ELSE 2 END LIMIT 1;
    IF v_gate_id IS NULL THEN
        v_gate_id := gen_random_uuid()::text;
        INSERT INTO "Role" (id, name, description, status)
        VALUES (v_gate_id, 'Gate Validator', 'Gate Validator & Ticket Kiosk Operator', 'ACTIVE');
    ELSE
        UPDATE "Role" SET name = 'Gate Validator', description = 'Gate Validator & Ticket Kiosk Operator', status = 'ACTIVE' WHERE id = v_gate_id;
    END IF;

    -- 1.4 Projectionist
    SELECT id INTO v_proj_id FROM "Role" WHERE name IN ('Projectionist', 'PROJECTIONIST') ORDER BY CASE WHEN name = 'Projectionist' THEN 1 ELSE 2 END LIMIT 1;
    IF v_proj_id IS NULL THEN
        v_proj_id := gen_random_uuid()::text;
        INSERT INTO "Role" (id, name, description, status)
        VALUES (v_proj_id, 'Projectionist', 'Projectionist role (Dashboard, Studios, Movies, Schedules)', 'ACTIVE');
    ELSE
        UPDATE "Role" SET name = 'Projectionist', description = 'Projectionist role (Dashboard, Studios, Movies, Schedules)', status = 'ACTIVE' WHERE id = v_proj_id;
    END IF;

    -- 2. Bersihkan referensi RolePermission jika ada
    DELETE FROM "RolePermission" WHERE "roleId" NOT IN (v_admin_id, v_cashier_id, v_gate_id, v_proj_id);

    -- 3. Migrasikan Seluruh Pengguna ke ID Role Standar yang Baru / Bersih
    -- Migrasi user dengan role ADMINISTRATOR -> Admin
    UPDATE "User" SET "roleId" = v_admin_id 
    WHERE "roleId" IN (SELECT id FROM "Role" WHERE name = 'ADMINISTRATOR' AND id <> v_admin_id);

    -- Migrasi user dengan role CASHIER -> Cashier
    UPDATE "User" SET "roleId" = v_cashier_id 
    WHERE "roleId" IN (SELECT id FROM "Role" WHERE name = 'CASHIER' AND id <> v_cashier_id);

    -- Migrasi user dengan role GATE_VALIDATOR -> Gate Validator
    UPDATE "User" SET "roleId" = v_gate_id 
    WHERE "roleId" IN (SELECT id FROM "Role" WHERE name = 'GATE_VALIDATOR' AND id <> v_gate_id);

    -- Migrasi user dengan role PROJECTIONIST -> Projectionist
    UPDATE "User" SET "roleId" = v_proj_id 
    WHERE "roleId" IN (SELECT id FROM "Role" WHERE name = 'PROJECTIONIST' AND id <> v_proj_id);

    -- 4. Hapus Role Duplikat dari Tabel Role
    DELETE FROM "Role" WHERE id NOT IN (v_admin_id, v_cashier_id, v_gate_id, v_proj_id);

    RAISE NOTICE '✅ Sukses normalisasi data Role: Hanya 4 role tunggal aktif tanpa duplikasi (Admin, Cashier, Gate Validator, Projectionist)!';
END $$;
