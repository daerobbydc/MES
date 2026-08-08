<div align="center">

# 🏭 MES PRO — Enterprise Manufacturing Execution System

<p align="center">
  <b>Sistem Eksekusi Manufaktur & Telemetri Pabrik Pintar berbasis IoT, AI Copilot, dan Analitik Real-Time</b>
</p>

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.21-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?style=for-the-badge&logo=postgresql)](https://supabase.com/)
[![Vercel Ready](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com/)

---

</div>

## 📌 Ringkasan Sistem

**MES PRO** adalah platform *Manufacturing Execution System* (MES) kelas industri generasi baru yang dirancang untuk menjembatani perencanaan ERP (*Enterprise Resource Planning*) dengan lantai produksi (*Shop Floor*). Sistem ini mengintegrasikan pemantauan mesin berbasis **IoT Sensor Telemetry**, analisis prediktif berbasis **AI Copilot**, pelacakan material (*Traceability*), hingga manajemen perawatan mesin (*Preventive Maintenance*).

Ditunjang oleh arsitektur keamanan tingkat lanjut seperti **2-Step Verification (2FA)**, **Role-Based Access Control (RBAC)**, **Rate Limiting**, dan **Full Audit Log**.

---

## ✨ Fitur-Fitur Utama

### 1. ⚙️ Manufaktur & Operasional Produksi
- **Production Orders & Scheduling:** Kelola pesanan produksi (*Work Orders*), alokasi lini, dan jadwal produksi real-time dengan tampilan **Gantt Chart Interactive**.
- **OEE (Overall Equipment Effectiveness) Calculator:** Monitoring indikator ketersediaan (*Availability*), performa (*Performance*), dan kualitas (*Quality*) secara otomatis.
- **Shop Floor Kiosk & Andon Alarms:** Antarmuka layar sentuh untuk operator lantai produksi guna mencatat log hasil kerja, downtime, serta memicu sinyal darurat Andon.

### 2. 📡 IoT Telemetry & Simulator Sensor Live
- **Real-Time Machine Telemetry:** Streaming data sensor mesin (suhu, getaran, kecepatan RPM, konsumsi energi, dan status operasi).
- **Interactive IoT Live Simulator:** Simulator sensor interaktif untuk pengujian kondisi normal, *overheat*, atau sinyal anomali secara real-time.
- **Andon Alarm System:** Pemicu dan respon cepat saat terjadi kegagalan mesin atau kondisi kritis pada lini produksi.

### 3. 🛠️ Preventive Maintenance & Jadwal Perawatan
- **Kalender Perawatan (Gantt Calendar):** Visualisasi jadwal perawatan mesin berkala (harian, mingguan, bulanan).
- **Work Order Maintenance:** Penugasan teknisi, estimasi waktu henti (*planned downtime*), dan daftar periksa (*checklist*) suku cadang.
- **Maintenance Scorecards:** Pelaporan histori kerusakan (*MTBF / MTTR metrics*).

### 4. 📦 Manajemen Stok, BOM & Traceability
- **Bill of Materials (BOM):** Struktur formula produk multi-level dengan perhitungan kebutuhan bahan baku.
- **Genealogi & Traceability:** Pelacakan penuh bahan baku dari *supplier* hingga produk jadi melalui nomor Lot/Batch dan Serial Number.
- **Warehouse & Inventory Movement:** Manajemen transfer antar lokasi, penyesuaian stok, serta *picking & receiving*.

### 5. 🔍 Quality Control & NCR
- **Inspeksi Kualitas (QC Inspection):** Form pemeriksaan *First-Piece Inspection*, *In-Process QC*, dan *Final Inspection*.
- **Non-Conformance Reports (NCR):** Pencatatan produk cacat, analisis akar masalah (*Root Cause Analysis*), dan penanganan produk *rework/scrap*.

### 6. 🤖 AI Production Copilot
- **Analisis Prediktif:** Asisten cerdas berbasis AI yang menganalisis telemetri pabrik untuk memprediksi risiko *downtime* dan hambatan produksi (*bottlenecks*).
- **Rekomendasi Operasional:** Memberikan masukan otomatis untuk optimasi kapasitas lini dan jadwal kerja.

### 7. ⏱️ Manajemen Shift & Tenaga Kerja
- **Definisi Shift & Check-In/Check-Out:** Pelacakan kehadiran operator lini produksi per shift.
- **Scorecard Kinerja:** Evaluasi efisiensi operasional per shift dan per lini.

### 8. 📊 Akuntansi Manufaktur & Costing
- **Product Costing Analysis:** Perhitungan biaya bahan baku (*Direct Materials*), tenaga kerja (*Labor*), dan *Overhead*.
- **Jurnal & Laporan Keuangan:** Pencatatan otomatis transaksi produksi ke jurnal akuntansi dan neraca saldo.

### 9. 🔒 Keamanan & Manajemen Pengguna
- **2-Step Verification (2FA):** Otentikasi dua langkah dengan kode OTP 6-digit yang terenkripsi dan terlindungi *rate limiting*.
- **Role-Based Access Control (RBAC):** 5 Tingkat Hak Akses (`ADMIN`, `SUPERVISOR`, `PLANNER`, `QUALITY_INSPECTOR`, `OPERATOR`).
- **Audit Trail & Logging:** Pencatatan komprehensif setiap perubahan data dan aktivitas pengguna demi kepatuhan industri.
- **Inactivity Timeout Guard:** Sesi otomatis kadaluwarsa setelah durasi inaktif untuk mencegah akses tidak sah.

---

## 🔒 Arsitektur Keamanan

```
[ Client Browser ] 
        │ (HTTPS + HttpOnly SameSite=Strict Cookie)
        ▼
[ Next.js Middleware ] ──► [ Security Headers (CSP, HSTS, X-Frame-Options DENY) ]
        │
        ├─► [ Rate Limiter (Brute Force Protection) ]
        ├─► [ JWT Token Validation ]
        └─► [ RBAC Authorization Guard ]
                │
                ▼
      [ PostgreSQL / Supabase Database ]
```

---

## 🛠️ Tech Stack

| Kategori | Teknologi |
| --- | --- |
| **Framework** | Next.js 14 (App Router) |
| **Bahasa** | TypeScript |
| **Database & ORM** | PostgreSQL + Prisma ORM |
| **Styling & UI** | Tailwind CSS + Lucide Icons + Recharts |
| **Typography** | Plus Jakarta Sans |
| **Autentikasi** | JWT (Jose) + bcryptjs + Custom 2FA Engine |
| **Realtime Telemetry** | Socket.IO Client / Telemetry Polling Engine |
| **Cloud Hosting** | Vercel (Frontend/Backend API) + Supabase (Database) |

---

## 🚀 Panduan Jalankan Lokal

### 1. Prasyarat
- Node.js `v18.0.0` atau versi lebih baru
- Database PostgreSQL (Lokal/Laragon/Docker atau Supabase Remote)

### 2. Kloning Repository & Install Dependensi
```bash
git clone https://github.com/daerobbydc/MES.git
cd MES
npm install
```

### 3. Konfigurasi Variabel Lingkungan (`.env`)
Buat file `.env` di direktori utama:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mes_db?schema=public"
JWT_SECRET="ganti-dengan-string-acak-panjang-64-karakter"
JWT_EXPIRES_IN="8h"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
ALLOW_DEV_BYPASS="true"
```

### 4. Migrasi Database & Seed Data
```bash
# Generate Prisma Client & Push Tabel ke Database
npx prisma db push

# (Opsional) Isi Data Demo Awal
npx prisma db seed
```

### 5. Jalankan Server Pengembang
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## ☁️ Panduan Deploy ke Vercel + Supabase

### 1. Buat Database di Supabase
- Daftarkan akun di [Supabase.com](https://supabase.com).
- Buat proyek baru dan salin **Connection String (Transaction Mode & Direct Mode)**.
- Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### 2. Push Schema ke Supabase
```bash
npx prisma db push
```

### 3. Deploy ke Vercel
- Hubungkan repositori GitHub `daerobbydc/MES` ke **Vercel**.
- Tambahkan Environment Variables di Vercel Dashboard:
  - `DATABASE_URL` = *(String Koneksi Supabase Port 6543)*
  - `DIRECT_URL` = *(String Koneksi Supabase Port 5432)*
  - `JWT_SECRET` = *(Secret key rahasia)*
  - `NODE_ENV` = `production`
  - `ALLOW_DEV_BYPASS` = `false`
- Klik **Deploy**!

---

## 👥 Pengguna Demo bawaan (`seed`)

| Email | Password | Role |
| --- | --- | --- |
| `admin@mes.com` | `admin123` | `ADMIN` (Superuser) |
| `supervisor@mes.com` | `supervisor123` | `SUPERVISOR` |
| `planner@mes.com` | `planner123` | `PLANNER` |
| `quality@mes.com` | `quality123` | `QUALITY_INSPECTOR` |
| `operator@mes.com` | `operator123` | `OPERATOR` |

---

## 📝 Lisensi

Proyek ini dikembangkan di bawah lisensi **MIT License**.

<div align="center">
  <sub>Dikembangkan dengan 💙 untuk Industri Manufaktur Modern</sub>
</div>
