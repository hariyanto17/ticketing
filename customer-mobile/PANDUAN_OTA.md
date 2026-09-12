# 🚀 Panduan Lengkap: Pembuatan & Publikasi Rilis OTA (Over-The-Air) Planet Cinema

Dokumen ini berisi panduan langkah demi langkah bagi tim pengembang (*developer*) dan administrator untuk membuat serta mempublikasikan patch pembaruan **Over-The-Air (OTA)** pada aplikasi **`customer-mobile`** Planet Cinema tanpa harus merilis ulang file APK di Google Play Store.

---

## 📌 1. Kapan Menggunakan Rilis OTA?

| Jenis Perubahan | Metode Rilis | Perlu Rilis APK Baru? |
| :--- | :--- | :---: |
| Perbaikan bug tampilan UI, penyesuaian layout, atau warna tema | **OTA Update** | ❌ **Tidak** |
| Perubahan teks terjemahan (Bahasa Indonesia / Inggris) | **OTA Update** | ❌ **Tidak** |
| Pembaruan alur tiket, QR code, atau integrasi API backend | **OTA Update** | ❌ **Tidak** |
| Penambahan modul native Java/Kotlin baru (misal: SDK hardware baru) | **Rilis APK Baru** | ✅ **Ya** |

---

## 🛠️ 2. Prasyarat

Sebelum mempublikasikan pembaruan, pastikan:
1. Backend Express Planet Cinema sedang berjalan dan dapat diakses.
2. Anda memiliki token akses admin (*Bearer Token*) dari akun dengan role `Admin` / `Superadmin`.
3. Node.js dan dependensi `customer-mobile` terinstal dengan baik.

---

## 📋 3. Langkah Demi Langkah Rilis OTA

### Langkah 1: Lakukan Perubahan Kode
Lakukan modifikasi kode JavaScript/TypeScript pada folder `customer-mobile/src`. Uji kode terlebih dahulu:
```bash
cd customer-mobile
npm run typecheck
npm test
```

---

### Langkah 2: Buat Bundle JS OTA
Jalankan perintah build bundle OTA dengan menentukan nomor patch bundle baru:

```bash
# Format: bash scripts/build-ota.sh <NOMOR_BUNDLE>
npm run build:ota 2
```
> **Catatan:** Ganti angka `2` dengan nomor bundle berikutnya (misalnya: `3`, `4`, `5`, dst.).

**Hasil Output:**
File bundle akan otomatis tersimpan di folder `customer-mobile/build/ota/`:
- 📁 File: `customer-mobile/build/ota/index.android.v2.bundle`
- 🔑 Checksum SHA-256 (contoh: `d3b07384d113edec49eaa6238ad5ff00...`)

---

### Langkah 3: Salin File Bundle ke Server Backend
Salin file bundle yang dihasilkan ke direktori `uploads/bundles` pada backend Express:

```bash
# Salin ke backend
cp build/ota/index.android.v2.bundle ../backend/uploads/bundles/
```

---

### Langkah 4: Publikasikan Rilis ke Backend Express
Kirimkan permintaan API `POST /api/app-updates/publish` menggunakan **cURL** atau **Postman**:

#### Opsi A: Menggunakan cURL (Terminal)
```bash
curl -X POST http://localhost:8080/api/app-updates/publish \
  -H "Authorization: Bearer <TOKEN_ADMIN_ANDA>" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "android",
    "appVersion": "1.0.0",
    "bundleVersion": 2,
    "isMandatory": false,
    "bundleFileName": "index.android.v2.bundle",
    "bundleHash": "d3b07384d113edec49eaa6238ad5ff00...",
    "releaseNotes": "1. Pembaruan tampilan kursi studio.\n2. Peningkatan kecepatan pemindaian barcode kiosk."
  }'
```

#### Opsi B: Menggunakan Postman
- **Method:** `POST`
- **URL:** `https://api-ticket.168billiard.online/api/app-updates/publish`
- **Headers:**
  - `Authorization`: `Bearer <TOKEN_ADMIN>`
  - `Content-Type`: `application/json`
- **Body (Raw JSON):**
  ```json
  {
    "platform": "android",
    "appVersion": "1.0.0",
    "bundleVersion": 2,
    "isMandatory": false,
    "bundleFileName": "index.android.v2.bundle",
    "bundleHash": "d3b07384d113edec49eaa6238ad5ff00...",
    "releaseNotes": "Pembaruan sistem pemesanan tiket dan perbaikan bug."
  }
  ```

---

## 🎯 4. Parameter Konfigurasi Rilis

| Parameter | Tipe | Wajib? | Deskripsi |
| :--- | :--- | :---: | :--- |
| `platform` | `string` | **Ya** | `android` atau `ios`. |
| `appVersion` | `string` | **Ya** | Versi native APK target (contoh: `1.0.0`). |
| `bundleVersion` | `number` | **Ya** | Nomor urut rilis bundle OTA (contoh: `2`). |
| `isMandatory` | `boolean` | Opsional | Jika `true`, pengguna **wajib** memperbarui aplikasi sebelum menggunakannya. |
| `bundleFileName` | `string` | **Ya** | Nama file bundle di folder `backend/uploads/bundles/`. |
| `bundleHash` | `string` | Opsional | Hash SHA-256 untuk verifikasi integritas file download. |
| `releaseNotes` | `string` | Opsional | Pesan/catatan pembaruan yang tampil di layar HP pengguna. |
| `binaryDownloadUrl` | `string` | Opsional | Link download APK Play Store jika versi native berubah. |

---

## 📱 5. Apa yang Terjadi di Smartphone Pengguna?

1. Saat pengguna membuka aplikasi Planet Cinema, aplikasi akan otomatis memanggil `GET /api/app-updates/check`.
2. Jika ada versi bundle yang lebih baru (`latestBundleVersion > currentBundleVersion`):
   - Muncul modal dialog **"Pembaruan Baru Tersedia"** dengan catatan rilis.
3. Saat pengguna menekan tombol **"Perbarui Sekarang"**:
   - Aplikasi mengunduh file bundle dengan animasi progress bar (*misal: 2.1 MB / 4.2 MB - 50%*).
   - Setelah selesai, aplikasi memverifikasi keamanan file dan **otomatis memuat ulang (*instant reload*)** ke tampilan versi terbaru secara mulus tanpa menutup aplikasi.

---

## 🔄 6. Prosedur Rollback (Jika Terjadi Kendala)

Jika bundle baru mengalami error dan Anda ingin mengembalikan semua pengguna ke bundle versi sebelumnya:

1. Publikasikan kembali rilis dengan mengarahkan `bundleFileName` ke versi yang stabil sebelumnya (atau versi `1`).
2. Di sisi klien, pengguna dapat menghapus bundle OTA yang bermasalah melalui fungsi darurat `otaService.rollbackToDefault()`.

---

## 📞 7. Bantuan & Dukungan Teknis
Jika mengalami kendala saat build bundle atau integrasi API, hubungi tim Core Developer Planet Cinema.
