# 路上觀察任務板

實體踏查課程用的即時任務發布、拍照回傳、線上成果展覽。首發場域：松山機場。

## 技術

Next.js App Router、TypeScript、Tailwind、Supabase（Postgres + Storage + Realtime）。

## 本機啟動

1. 在 [Supabase](https://supabase.com) 開一個專案。
2. 到 SQL Editor 依序執行 `supabase/migrations/001_init.sql`、`002_student_identity.sql`。
3. 複製環境變數並填入：

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=
```

4. 安裝並啟動：

```bash
npm install
npm run dev
```

5. 打開 `/admin`，用管理密碼登入，按「匯入松山機場示範場次」。

## 路徑

| 端 | 路徑 |
|---|---|
| 學生 | `/e/[slug]` |
| 老師 | `/admin` |
| 展覽 | `/show/[slug]` |

學生填組別 `01`、學號和姓名進入，沒有註冊系統。
