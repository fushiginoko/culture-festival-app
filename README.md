<!-- File: README.md -->
<div align="center">

<a id="top"></a>

# TOOT

**Take Out Of Twelve**

The Local-First mobile ordering platform engineered for high-density events.

[![Version](https://img.shields.io/badge/version-v1.0.0%20(Golden%20Master)-000000?style=flat-square)](#)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Rust](https://img.shields.io/badge/Rust-1.96-000000?style=flat-square&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-v2-24C8DB?style=flat-square&logo=tauri&logoColor=white)](https://v2.tauri.app/)
[![SQLite](https://img.shields.io/badge/SQLite-local--first-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Supabase](https://img.shields.io/badge/Supabase-sync-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)

</div>

> [!NOTE]
> **日本語のドキュメントはこちら / Japanese documentation is available below** → [日本語ドキュメントへ移動 / Jump to Japanese](#japanese)

---

<a id="english"></a>

## English Documentation

### Table of Contents

- [Overview](#overview)
- [Core Architecture & Innovations](#core-architecture--innovations)
- [System Architecture](#system-architecture)
- [Tech Stack & Tooling](#tech-stack--tooling)
- [Quick Start](#quick-start)
- [Legal & Governance](#legal--governance)
- [Roadmap](#roadmap)
- [Team & License](#team--license)

---

### Overview

TOOT is an event-native mobile ordering platform built for school festivals, open-air markets, and music events — environments where conventional retail infrastructure fails by design.

#### The Problem

General-purpose mobile ordering and self-checkout SaaS products assume stable connectivity, account-based customers, and elastic back-of-house capacity. Large-scale events violate all three assumptions:

| Failure Mode | Root Cause | Consequence |
| --- | --- | --- |
| **Register downtime** | Thousands of devices saturating shared cellular and Wi-Fi bands | Cloud-dependent POS stalls; the counter halts |
| **Checkout abandonment** | Mandatory sign-up, names, phone numbers, email addresses | Friction at the moment of purchase; lost orders |
| **Queues and food waste** | Orders accepted without regard to kitchen throughput | Unbounded backlogs, cold food, discarded inventory |

#### The TOOT Approach

TOOT resolves these failure modes through three mutually reinforcing principles:

1. **Local-First** — The store runs on a local SQLite database. The network is an optimization, not a dependency.
2. **Zero-PII** — No accounts, no personal data. An order is identified solely by a short, human-readable code.
3. **Parallel Kitchen Capacity Planning** — Order intake is bounded by a throughput model derived from physical cooking capacity, guaranteeing completion within each time slot.

---

### Core Architecture & Innovations

#### 1. O(1) Zero-Collision ID Generation (Crockford's Base32)

Each order receives a 6-character code encoded in [Crockford's Base32](https://www.crockford.com/base32.html), an alphabet that excludes the visually ambiguous characters `I`, `L`, `O`, and `U` — optimized for verbal and visual verification at the counter.

- **Keyspace:** $32^6 = 1{,}073{,}741{,}824$ (≈ 1.07 billion) combinations.
- **Scoped matching:** Codes are resolved against a 15-minute time slot, not the global order history. Uniqueness is required only within `(slot_id, order_code)`.
- **Collision bound:** With at most $n = 5$ orders per slot, the birthday bound yields

$$
P_{\text{collision}} \approx \frac{n(n-1)}{2 \cdot 32^6} = \frac{10}{1{,}073{,}741{,}824} \approx 9.3 \times 10^{-9}
$$

  — below one in one hundred million.

- **No read-before-write:** Codes are generated from a cryptographically secure random source with **zero duplicate-check `SELECT` queries**. Issuance is a single `INSERT` in $O(1)$, keeping throughput flat under peak load. A composite unique constraint acts as a safety net; the statistically negligible conflict case is handled by an optimistic retry.

#### 2. Local-First & Fault Tolerance

- The store desktop application treats **local SQLite as the source of truth** for all counter operations.
- Pickup redemption continues with **zero added latency and full availability** under complete network loss, including physical Wi-Fi disconnection.
- State changes are journaled to a local outbox. Upon reconnection, TOOT **asynchronously reconciles with Supabase**, converging to an eventually consistent state without operator intervention.

#### 3. Ultra-Lightweight Desktop Engine

Built on Tauri v2 and Rust 1.96, the store engine is designed for low-power edge hardware such as school-issued laptops.

| Metric | Result |
| --- | --- |
| Memory footprint (Rust core) | **4.4 MB** |
| CPU utilization (idle / standby) | **~0%** |
| Target hardware | Edge devices at **6 W TDP** |
| Operating profile | Full-day operation on battery power |

> Figures measured on reference hardware. Results may vary by environment.

The engine ships with two operating modes:

- **Pickup Counter Mode** — Indexed lookup on `(slot_id, order_code)` for instantaneous redemption.
- **Kitchen Display System (KDS) Mode** — Automatically aggregates all items ordered within each 15-minute slot into batch-cooking instructions. Unclaimed items from an expired slot are **automatically re-allocated to the earliest subsequent orders**, eliminating waste by design.

#### 4. Parallel Kitchen Capacity Planning

Order intake is derived backward from the concurrent capacity of each cooking station (griddles, fryers, etc.), rather than from demand.

- **Slot capacity:** 5 customers per 15-minute slot.
- **Per-customer limit:** 3 items.
- **Worst-case load:** $5 \times 3 = 15$ items per slot.

Given parallel capacity $C$ (items per batch) and batch cycle time $t_{\text{batch}}$, the worst-case completion time satisfies

$$
T_{\text{worst}} = \left\lceil \frac{N_{\text{slot}} \cdot q_{\max}}{C} \right\rceil \cdot t_{\text{batch}} \le 15\ \text{min}
$$

Parameters are calibrated per station, providing a **mathematical guarantee that every order in a slot is completed within that slot**, even under worst-case demand.

#### 5. Privacy by Design (Zero-PII)

- No account creation or authentication is required from customers.
- TOOT **never requests or stores** personally identifiable information — including names, phone numbers, and email addresses.
- The attack surface for personal data breaches is structurally eliminated, not merely mitigated.

---

### System Architecture

~~~text
+---------------------------+                        +------------------------------+
|   Customer Web Client     |   HTTPS (when online)  |     Supabase (Cloud Sync)    |
|   React 19 + TypeScript   | ---------------------> |  PostgreSQL  (orders, slots) |
|                           |  INSERT order          |  Row Level Security (RLS)    |
|  - Slot selection         |  {slot_id, code, items}|  Realtime channel            |
|  - O(1) Base32 code gen   |                        |                              |
|  - Zero-PII (no account)  | <--------------------- |                              |
+---------------------------+   slot availability    +--------------+---------------+
                                                                    |
                                                  Realtime push /   |   ^  Outbox flush
                                                  pull on reconnect |   |  (async, on reconnect)
                                                                    v   |
                                                     +------------------+-------------+
                                                     |   Store Desktop (Tauri v2)     |
                                                     |   Rust 1.96 core               |
                                                     |                                |
                                                     |   +------------------------+   |
                                                     |   | SQLite (source of      |   |
                                                     |   | truth) + outbox queue  |   |
                                                     |   +-----------+------------+   |
                                                     |               |                |
                                                     |       +-------+-------+        |
                                                     |       |               |        |
                                                     |  [Pickup Counter] [Kitchen KDS]|
                                                     |   indexed lookup  slot batch   |
                                                     |   redemption      aggregation  |
                                                     |                   auto-slide   |
                                                     +--------------------------------+

 Offline path: Counter redemption reads/writes SQLite only -> zero latency, full availability.
 Recovery path: Outbox is replayed to Supabase -> eventual consistency.
~~~

---

### Tech Stack & Tooling

| Layer | Technology |
| --- | --- |
| **Client** | React 19, TypeScript, Vite, Bauhaus-inspired minimal CSS |
| **Desktop** | Tauri v2, Rust 1.96, SQLite via `rusqlite` |
| **Cloud Sync** | Supabase — PostgreSQL, Realtime, Row Level Security |
| **Tooling** | Oxlint (TypeScript / JavaScript), Cargo Clippy (Rust) |

---

### Quick Start

#### Prerequisites

- Node.js 20 LTS or later
- Rust 1.96 (`rustup`)
- [Tauri v2 system prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS
- A Supabase project (for cloud synchronization)

#### 1. Clone the Repository

~~~bash
git clone https://github.com/<your-org>/toot.git
cd toot
npm install
~~~

#### 2. Customer Web Client

Create your local environment file from the template:

~~~bash
cp .env.example .env
~~~

Populate `.env` with your Supabase credentials:

~~~dotenv
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
~~~

Start the development server:

~~~bash
npm run dev
~~~

> [!WARNING]
> **Never commit real credentials.** `.env` is excluded via `.gitignore`; only `.env.example` (with placeholder values) belongs in version control. The `service_role` key must never be exposed to the client or committed to the repository. Data access is enforced server-side through Row Level Security.

#### 3. Store Desktop Application

Run in development mode:

~~~bash
npm run tauri dev
~~~

Build a production installer:

~~~bash
npm run tauri build
~~~

For Windows, pre-built installers are distributed via GitHub Releases:

~~~text
toot_1.0.0_x64-setup.exe
~~~

#### 4. Lint & Static Analysis

~~~bash
npx oxlint
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
~~~

---

### Legal & Governance

| Document | Scope |
| --- | --- |
| [`public/terms.html`](./public/terms.html) | **Terms of Service.** Limitation-of-liability clauses are drafted as partial exemptions in consideration of Article 8 of Japan's Consumer Contract Act. Consent is obtained via an **action-wrap** model: submitting an order constitutes acceptance of the terms. |
| [`public/privacy.html`](./public/privacy.html) | **Privacy Policy.** A formal Zero-PII declaration: TOOT does not collect, process, or retain personally identifiable information. |

---

### Roadmap

- [ ] **Atomic reservation via PostgreSQL RPC** — Move slot reservation into a stored procedure `reserve_order()` executed as a single transaction, eliminating race conditions on slot capacity under extreme concurrent load.

~~~sql
-- Conceptual sketch
CREATE OR REPLACE FUNCTION reserve_order(p_slot_id uuid, p_code text, p_items jsonb)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE slots
     SET reserved = reserved + 1
   WHERE id = p_slot_id
     AND reserved < capacity;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO orders (slot_id, order_code, items)
  VALUES (p_slot_id, p_code, p_items);

  RETURN true;
END;
$$;
~~~

---

### Team & License

Developed by **Team MONO Rail**.

Released under the [MIT License](./LICENSE).

<p align="right"><a href="#top">Back to top ↑</a></p>

---
---

<a id="japanese"></a>

## 日本語ドキュメント

### 目次

- [概要](#jp-overview)
- [コアアーキテクチャと技術的革新](#jp-architecture)
- [システム構成図](#jp-diagram)
- [技術スタックとツール](#jp-stack)
- [クイックスタート](#jp-quickstart)
- [法務・ガバナンス](#jp-legal)
- [ロードマップ](#jp-roadmap)
- [チームとライセンス](#jp-license)

---

<a id="jp-overview"></a>

### 概要

TOOT は、学校文化祭・屋外マーケット・音楽フェスなど、一般的な店舗インフラが構造的に機能しなくなる環境のために設計された、イベント特化型のモバイルオーダープラットフォームです。

#### 課題

汎用のモバイルオーダーやセルフレジ SaaS は、「安定した通信」「アカウントを持つ顧客」「伸縮可能な厨房能力」を前提としています。大規模イベントは、この三つの前提をすべて覆します。

| 破綻モード | 根本原因 | 帰結 |
| --- | --- | --- |
| **レジダウン** | 数千台の端末による携帯回線・Wi-Fi 帯域の飽和 | クラウド依存の POS が停止し、窓口業務が止まる |
| **購入離脱** | 会員登録、氏名・電話番号・メールアドレスの入力要求 | 購入直前の摩擦による注文の取りこぼし |
| **大行列と食品ロス** | 厨房の処理能力を考慮しない無制限の注文受付 | 滞留の拡大、品質低下、大量の廃棄 |

#### TOOT の解法

TOOT は、相互に補完し合う三つの原則によってこれらの破綻を解消します。

1. **Local-First** — 店舗はローカルの SQLite 上で動作します。ネットワークは依存先ではなく、最適化の手段に過ぎません。
2. **Zero-PII** — アカウントも個人情報も不要です。注文は短く判読しやすいコードのみで識別されます。
3. **並行調理逆算数理モデル** — 物理的な調理能力から導出したスループットモデルで注文受付を制限し、各時間枠内での調理完了を保証します。

---

<a id="jp-architecture"></a>

### コアアーキテクチャと技術的革新

#### 1. O(1) 衝突ゼロ ID 生成（Crockford's Base32）

各注文には、[Crockford's Base32](https://www.crockford.com/base32.html) でエンコードされた 6 桁のコードが付与されます。この文字体系は視覚的に紛らわしい `I`・`L`・`O`・`U` を除外しており、窓口での口頭・目視確認に最適化されています。

- **符号空間:** $32^6 = 1{,}073{,}741{,}824$ 通り（約 10.7 億通り）
- **スコープ限定照合:** コードは全注文履歴ではなく、15 分のタイムスロット内でのみ照合されます。一意性が求められるのは `(slot_id, order_code)` の組のみです。
- **衝突確率の上界:** 1 スロットあたりの注文数を最大 $n = 5$ とすると、誕生日問題の近似により

$$
P_{\text{collision}} \approx \frac{n(n-1)}{2 \cdot 32^6} = \frac{10}{1{,}073{,}741{,}824} \approx 9.3 \times 10^{-9}
$$

  となり、同一枠内の衝突確率は約 1 億分の 1 以下に抑えられます。

- **書き込み前読み取りの撤廃:** コードは暗号論的に安全な乱数源から生成され、**重複確認のための `SELECT` クエリを 100% 撤廃**しています。発行は単一の `INSERT` による $O(1)$ 操作であり、ピーク時でもスループットは低下しません。複合一意制約をセーフティネットとして配置し、統計的に無視できる衝突ケースは楽観的リトライで処理します。

#### 2. Local-First と耐障害性

- 店舗側デスクトップアプリは、窓口業務のすべてにおいて**ローカル SQLite を唯一の正（Source of Truth）**として扱います。
- Wi-Fi の物理切断を含む完全なオフライン環境下でも、受取消し込みは**追加遅延ゼロ・可用性 100%** で継続します。
- 状態変更はローカルのアウトボックスに記録され、通信復旧時に **Supabase と自動的に非同期同期**されます。オペレーターの介入なしに結果整合性へ収束します。

#### 3. 超軽量デスクトップエンジン

Tauri v2 と Rust 1.96 で構築された店舗エンジンは、学校配布端末などの低電力エッジハードウェアでの稼働を前提に設計されています。

| 指標 | 結果 |
| --- | --- |
| メモリフットプリント（Rust コア） | **4.4 MB** |
| CPU 使用率（アイドル／待機時） | **約 0%** |
| 想定ハードウェア | **TDP 6W** 級のエッジ端末 |
| 稼働プロファイル | バッテリー駆動による終日運用 |

> 数値はリファレンス環境での実測値です。環境により異なる場合があります。

エンジンは二つの動作モードを備えています。

- **受取窓口モード** — `(slot_id, order_code)` に対するインデックス照合による即時消し込み。
- **厨房 KDS（Kitchen Display System）モード** — 15 分枠内の全注文品目を自動合算し、まとめ調理の指示として表示します。時間切れで未受取となった在庫は、**直近の後続注文へ自動的にスライド転用**され、廃棄ゼロを設計レベルで実現します。

#### 4. 並行調理逆算モデルによる数理的調理保証

注文受付の上限は、需要ではなく、鉄板・フライヤー等の各調理ステーションの同時並行処理能力から逆算して決定されます。

- **スロット定員:** 15 分あたり 5 人
- **1 人あたり上限:** 3 個
- **最悪時負荷:** 1 スロットあたり $5 \times 3 = 15$ 個

並行処理能力を $C$（1 バッチあたりの個数）、1 バッチの調理時間を $t_{\text{batch}}$ とすると、最悪条件下の完了時間は次式を満たします。

$$
T_{\text{worst}} = \left\lceil \frac{N_{\text{slot}} \cdot q_{\max}}{C} \right\rceil \cdot t_{\text{batch}} \le 15\ \text{min}
$$

各パラメータはステーションごとに校正され、最悪の需要条件下でも**スロット内の全注文がそのスロット内で 100% 調理完了する**ことを数理的に保証します。

#### 5. プライバシー・バイ・デザイン（Zero-PII）

- 顧客にアカウント作成や認証を一切求めません。
- 氏名・電話番号・メールアドレスを含む**個人識別情報を一切要求・保持しません**。
- 個人情報漏えいのリスクは「低減」ではなく、構造的に「消滅」しています。

---

<a id="jp-diagram"></a>

### システム構成図

~~~text
+---------------------------+                        +------------------------------+
|   Customer Web Client     |   HTTPS (when online)  |     Supabase (Cloud Sync)    |
|   React 19 + TypeScript   | ---------------------> |  PostgreSQL  (orders, slots) |
|                           |  INSERT order          |  Row Level Security (RLS)    |
|  - Slot selection         |  {slot_id, code, items}|  Realtime channel            |
|  - O(1) Base32 code gen   |                        |                              |
|  - Zero-PII (no account)  | <--------------------- |                              |
+---------------------------+   slot availability    +--------------+---------------+
                                                                    |
                                                  Realtime push /   |   ^  Outbox flush
                                                  pull on reconnect |   |  (async, on reconnect)
                                                                    v   |
                                                     +------------------+-------------+
                                                     |   Store Desktop (Tauri v2)     |
                                                     |   Rust 1.96 core               |
                                                     |                                |
                                                     |   +------------------------+   |
                                                     |   | SQLite (source of      |   |
                                                     |   | truth) + outbox queue  |   |
                                                     |   +-----------+------------+   |
                                                     |               |                |
                                                     |       +-------+-------+        |
                                                     |       |               |        |
                                                     |  [Pickup Counter] [Kitchen KDS]|
                                                     |   indexed lookup  slot batch   |
                                                     |   redemption      aggregation  |
                                                     |                   auto-slide   |
                                                     +--------------------------------+
~~~

- **オフライン経路:** 窓口の消し込みは SQLite のみで完結し、遅延ゼロ・可用性 100% を維持します。
- **復旧経路:** アウトボックスが Supabase へ再送され、結果整合性へ収束します。

---

<a id="jp-stack"></a>

### 技術スタックとツール

| レイヤー | 技術 |
| --- | --- |
| **クライアント** | React 19、TypeScript、Vite、バウハウス様式に着想を得たミニマル CSS |
| **デスクトップ** | Tauri v2、Rust 1.96、SQLite（`rusqlite`） |
| **クラウド同期** | Supabase（PostgreSQL、Realtime、Row Level Security） |
| **ツール** | Oxlint（TypeScript / JavaScript）、Cargo Clippy（Rust） |

---

<a id="jp-quickstart"></a>

### クイックスタート

#### 前提条件

- Node.js 20 LTS 以降
- Rust 1.96（`rustup` で導入）
- 各 OS 向けの [Tauri v2 前提環境](https://v2.tauri.app/start/prerequisites/)
- Supabase プロジェクト（クラウド同期用）

#### 1. リポジトリの取得

~~~bash
git clone https://github.com/<your-org>/toot.git
cd toot
npm install
~~~

#### 2. 客側 Web クライアント

テンプレートからローカル環境変数ファイルを作成します。

~~~bash
cp .env.example .env
~~~

`.env` に Supabase の接続情報を設定します。

~~~dotenv
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
~~~

開発サーバーを起動します。

~~~bash
npm run dev
~~~

> [!WARNING]
> **実際の認証情報は絶対にコミットしないでください。** `.env` は `.gitignore` によって除外されており、バージョン管理に含めるのはプレースホルダー値のみを記載した `.env.example` だけです。`service_role` キーはクライアントに露出させず、リポジトリにも含めないでください。データアクセスの制御は Row Level Security によりサーバー側で強制されます。

#### 3. 店舗デスクトップアプリ

開発モードで起動します。

~~~bash
npm run tauri dev
~~~

本番用インストーラーをビルドします。

~~~bash
npm run tauri build
~~~

Windows 向けのビルド済みインストーラーは GitHub Releases で配布しています。

~~~text
toot_1.0.0_x64-setup.exe
~~~

#### 4. Lint・静的解析

~~~bash
npx oxlint
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
~~~

---

<a id="jp-legal"></a>

### 法務・ガバナンス

| ドキュメント | 内容 |
| --- | --- |
| [`public/terms.html`](./public/terms.html) | **利用規約。** 免責条項は、消費者契約法第 8 条に配慮し、全部免責ではなく一部免責として設計しています。同意取得には **Action-wrap 方式**を採用し、注文の送信をもって規約への同意とみなします。 |
| [`public/privacy.html`](./public/privacy.html) | **プライバシーポリシー。** Zero-PII 宣言として、TOOT が個人識別情報を一切収集・処理・保持しないことを明示しています。 |

---

<a id="jp-roadmap"></a>

### ロードマップ

- [ ] **PostgreSQL RPC による原子的予約処理** — スロット予約処理を単一トランザクションで実行されるストアドプロシージャ `reserve_order()` に移行し、超大規模同時アクセス時のスロット定員に関する競合状態（Race Condition）を完全に排除します。

~~~sql
-- 概念スケッチ
CREATE OR REPLACE FUNCTION reserve_order(p_slot_id uuid, p_code text, p_items jsonb)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE slots
     SET reserved = reserved + 1
   WHERE id = p_slot_id
     AND reserved < capacity;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO orders (slot_id, order_code, items)
  VALUES (p_slot_id, p_code, p_items);

  RETURN true;
END;
$$;
~~~

---

<a id="jp-license"></a>

### チームとライセンス

開発: **Team MONO Rail**

本ソフトウェアは [MIT License](./LICENSE) のもとで公開されています。

<p align="right"><a href="#top">ページ先頭へ戻る ↑</a></p>
