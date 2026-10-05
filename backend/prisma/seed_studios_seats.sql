-- ============================================================================
-- SQL SEEDER / RESTORE SCRIPT: STUDIO 1, 2, 3, 4 DENGAN 176 KURSI MASING-MASING
-- Database: PostgreSQL (ticketing)
-- Total Kursi: 4 Studio x 176 Kursi = 704 Kursi
-- Layout Baris: A s/d K (11 baris), 16 kursi per baris
-- ============================================================================

DO $$
DECLARE
    v_branch_id VARCHAR;
    v_studio_1_id VARCHAR;
    v_studio_2_id VARCHAR;
    v_studio_3_id VARCHAR;
    v_studio_4_id VARCHAR;
    r_letter TEXT;
    c_idx INT;
    c_col INT;
    s1_cols INT[] := ARRAY[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17, 18];
    s2_cols INT[] := ARRAY[1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
    s3_cols INT[] := ARRAY[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17];
    s4_cols INT[] := ARRAY[1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
    row_list TEXT[] := ARRAY['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
BEGIN
    -- 1. Ambil atau Buat Branch Utama
    SELECT id INTO v_branch_id FROM "Branch" WHERE code IN ('PLANET', 'MAIN', 'BONE') LIMIT 1;
    IF v_branch_id IS NULL THEN
        SELECT id INTO v_branch_id FROM "Branch" ORDER BY "createdAt" ASC LIMIT 1;
    END IF;
    IF v_branch_id IS NULL THEN
        v_branch_id := gen_random_uuid()::text;
        INSERT INTO "Branch" (id, name, code, address, city, province, phone, email, timezone, status, "createdAt", "updatedAt")
        VALUES (v_branch_id, 'Planet Cinema', 'PLANET', 'Jl. Veteran No. 1', 'Bone', 'Sulawesi Selatan', '+62811000001', 'info@planetcinema.co.id', 'Asia/Makassar', 'ACTIVE', NOW(), NOW());
    END IF;

    -- 2. Upsert Studio 1 (18 Kolom Auditorium, Aisle di 11-12)
    SELECT id INTO v_studio_1_id FROM "Studio" WHERE code = 'S1';
    IF v_studio_1_id IS NULL THEN
        v_studio_1_id := gen_random_uuid()::text;
        INSERT INTO "Studio" (id, "branchId", name, code, capacity, "layoutRows", "layoutColumns", type, status)
        VALUES (v_studio_1_id, v_branch_id, 'Studio 1', 'S1', 176, 11, 18, 'REGULAR', 'ACTIVE');
    ELSE
        UPDATE "Studio" SET name = 'Studio 1', "branchId" = v_branch_id, capacity = 176, "layoutRows" = 11, "layoutColumns" = 18, type = 'REGULAR', status = 'ACTIVE' WHERE id = v_studio_1_id;
    END IF;

    -- 3. Upsert Studio 2 (17 Kolom Auditorium, Aisle di 7)
    SELECT id INTO v_studio_2_id FROM "Studio" WHERE code = 'S2';
    IF v_studio_2_id IS NULL THEN
        v_studio_2_id := gen_random_uuid()::text;
        INSERT INTO "Studio" (id, "branchId", name, code, capacity, "layoutRows", "layoutColumns", type, status)
        VALUES (v_studio_2_id, v_branch_id, 'Studio 2', 'S2', 176, 11, 17, 'REGULAR', 'ACTIVE');
    ELSE
        UPDATE "Studio" SET name = 'Studio 2', "branchId" = v_branch_id, capacity = 176, "layoutRows" = 11, "layoutColumns" = 17, type = 'REGULAR', status = 'ACTIVE' WHERE id = v_studio_2_id;
    END IF;

    -- 4. Upsert Studio 3 (17 Kolom Auditorium, Aisle di 11)
    SELECT id INTO v_studio_3_id FROM "Studio" WHERE code = 'S3';
    IF v_studio_3_id IS NULL THEN
        v_studio_3_id := gen_random_uuid()::text;
        INSERT INTO "Studio" (id, "branchId", name, code, capacity, "layoutRows", "layoutColumns", type, status)
        VALUES (v_studio_3_id, v_branch_id, 'Studio 3', 'S3', 176, 11, 17, 'REGULAR', 'ACTIVE');
    ELSE
        UPDATE "Studio" SET name = 'Studio 3', "branchId" = v_branch_id, capacity = 176, "layoutRows" = 11, "layoutColumns" = 17, type = 'REGULAR', status = 'ACTIVE' WHERE id = v_studio_3_id;
    END IF;

    -- 5. Upsert Studio 4 (17 Kolom Auditorium, Aisle di 7)
    SELECT id INTO v_studio_4_id FROM "Studio" WHERE code = 'S4';
    IF v_studio_4_id IS NULL THEN
        v_studio_4_id := gen_random_uuid()::text;
        INSERT INTO "Studio" (id, "branchId", name, code, capacity, "layoutRows", "layoutColumns", type, status)
        VALUES (v_studio_4_id, v_branch_id, 'Studio 4', 'S4', 176, 11, 17, 'REGULAR', 'ACTIVE');
    ELSE
        UPDATE "Studio" SET name = 'Studio 4', "branchId" = v_branch_id, capacity = 176, "layoutRows" = 11, "layoutColumns" = 17, type = 'REGULAR', status = 'ACTIVE' WHERE id = v_studio_4_id;
    END IF;

    -- 6. Generate Kursi untuk Setiap Studio (A-K x 16 Kursi = 176 Kursi)
    FOREACH r_letter IN ARRAY row_list LOOP
        FOR c_idx IN 1..16 LOOP
            -- Studio 1
            c_col := s1_cols[c_idx];
            IF EXISTS (SELECT 1 FROM "Seat" WHERE "studioId" = v_studio_1_id AND row = r_letter AND "seatNumber" = c_idx) THEN
                UPDATE "Seat" SET "column" = c_col, "seatLabel" = (r_letter || c_idx::text), "seatType" = 'REGULAR', status = 'ACTIVE'
                WHERE "studioId" = v_studio_1_id AND row = r_letter AND "seatNumber" = c_idx;
            ELSE
                INSERT INTO "Seat" (id, "studioId", row, "column", "seatNumber", "seatLabel", "seatType", status)
                VALUES (gen_random_uuid()::text, v_studio_1_id, r_letter, c_col, c_idx, (r_letter || c_idx::text), 'REGULAR', 'ACTIVE');
            END IF;

            -- Studio 2
            c_col := s2_cols[c_idx];
            IF EXISTS (SELECT 1 FROM "Seat" WHERE "studioId" = v_studio_2_id AND row = r_letter AND "seatNumber" = c_idx) THEN
                UPDATE "Seat" SET "column" = c_col, "seatLabel" = (r_letter || c_idx::text), "seatType" = 'REGULAR', status = 'ACTIVE'
                WHERE "studioId" = v_studio_2_id AND row = r_letter AND "seatNumber" = c_idx;
            ELSE
                INSERT INTO "Seat" (id, "studioId", row, "column", "seatNumber", "seatLabel", "seatType", status)
                VALUES (gen_random_uuid()::text, v_studio_2_id, r_letter, c_col, c_idx, (r_letter || c_idx::text), 'REGULAR', 'ACTIVE');
            END IF;

            -- Studio 3
            c_col := s3_cols[c_idx];
            IF EXISTS (SELECT 1 FROM "Seat" WHERE "studioId" = v_studio_3_id AND row = r_letter AND "seatNumber" = c_idx) THEN
                UPDATE "Seat" SET "column" = c_col, "seatLabel" = (r_letter || c_idx::text), "seatType" = 'REGULAR', status = 'ACTIVE'
                WHERE "studioId" = v_studio_3_id AND row = r_letter AND "seatNumber" = c_idx;
            ELSE
                INSERT INTO "Seat" (id, "studioId", row, "column", "seatNumber", "seatLabel", "seatType", status)
                VALUES (gen_random_uuid()::text, v_studio_3_id, r_letter, c_col, c_idx, (r_letter || c_idx::text), 'REGULAR', 'ACTIVE');
            END IF;

            -- Studio 4
            c_col := s4_cols[c_idx];
            IF EXISTS (SELECT 1 FROM "Seat" WHERE "studioId" = v_studio_4_id AND row = r_letter AND "seatNumber" = c_idx) THEN
                UPDATE "Seat" SET "column" = c_col, "seatLabel" = (r_letter || c_idx::text), "seatType" = 'REGULAR', status = 'ACTIVE'
                WHERE "studioId" = v_studio_4_id AND row = r_letter AND "seatNumber" = c_idx;
            ELSE
                INSERT INTO "Seat" (id, "studioId", row, "column", "seatNumber", "seatLabel", "seatType", status)
                VALUES (gen_random_uuid()::text, v_studio_4_id, r_letter, c_col, c_idx, (r_letter || c_idx::text), 'REGULAR', 'ACTIVE');
            END IF;
        END LOOP;
    END LOOP;

    RAISE NOTICE '✅ Sukses seeding Studio 1, 2, 3, 4 masing-masing 176 kursi (Total 704 kursi)!';
END $$;
