import { chromium } from "playwright";
import { mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";

const BASE = "http://localhost:3000";
const OUT = "recordings";
const VIEWPORT = { width: 1280, height: 800 };

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

/** 1シーンぶんのフレームを撮りながら操作する */
class Recorder {
  constructor(page, name) {
    this.page = page;
    this.name = name;
    this.frame = 0;
    this.dir = `${OUT}/${name}`;
    mkdirSync(this.dir, { recursive: true });
  }
  async shot(times = 1) {
    for (let i = 0; i < times; i++) {
      await this.page.screenshot({
        path: `${this.dir}/${String(this.frame++).padStart(4, "0")}.png`,
      });
      await this.page.waitForTimeout(60);
    }
  }
  /** 操作の前後に静止フレームを足して、GIF を見やすくする */
  async act(fn, { before = 6, after = 16 } = {}) {
    await this.shot(before);
    await fn();
    await this.shot(after);
  }
  encode(fps = 8) {
    const palette = `${this.dir}/palette.png`;
    execFileSync("ffmpeg", ["-y", "-i", `${this.dir}/%04d.png`,
      "-vf", "fps=" + fps + ",scale=900:-1:flags=lanczos,palettegen=stats_mode=diff", palette],
      { stdio: "ignore" });
    execFileSync("ffmpeg", ["-y", "-framerate", String(fps), "-i", `${this.dir}/%04d.png`, "-i", palette,
      "-lavfi", `fps=${fps},scale=900:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`,
      `${OUT}/${this.name}.gif`], { stdio: "ignore" });
    console.log(`  -> ${OUT}/${this.name}.gif (${this.frame} frames)`);
  }
}

const RUN = Date.now().toString(36).slice(-5);
const id = (scene, who) => `${who}-${scene}-${RUN}@example.com`;
const orgName = (scene) => `Acme ${scene}${RUN}`;

/** そのシーンで作られた invitation の id を取る */
function latestInvitation(email) {
  return execFileSync("sqlite3", ["demo.db",
    `select id from invitation where email='${email}' order by created_at desc limit 1;`])
    .toString().trim();
}

const browser = await chromium.launch();

async function newPage(ctx) {
  const page = await ctx.newPage();
  await page.setViewportSize(VIEWPORT);
  return page;
}

async function signUp(page, email) {
  await page.goto(BASE);
  await page.locator('input[type="password"]').first().waitFor();
  const emailInput = page.locator('section:has-text("1. サインイン") input').first();
  await emailInput.fill(email);
  await page.getByRole("button", { name: "サインアップ" }).click();
  await page.getByText("でログイン中").waitFor({ timeout: 15000 });
}

// ---- Scene 1: 組織作成で DB に 2 行入る ----
{
  console.log("scene 1: create organization");
  const ctx = await browser.newContext();
  const page = await newPage(ctx);
  const rec = new Recorder(page, "01-create-org");

  await signUp(page, id(1, "alice"));
  await page.locator('section:has-text("2. 組織を作る") input').first().fill(orgName(1));
  await page.waitForTimeout(1200);
  await rec.shot(14);

  await rec.act(async () => {
    await page.getByRole("button", { name: "createOrganization" }).click();
    await page.getByText("organization.create → OK").waitFor({ timeout: 15000 });
    await page.waitForTimeout(1400);
  }, { before: 4, after: 26 });

  rec.encode();
  await ctx.close();
}

// ---- Scene 2: 招待 → 承諾 ----
{
  console.log("scene 2: invite & accept");
  const ctxA = await browser.newContext();
  const alice = await newPage(ctxA);
  const rec = new Recorder(alice, "02-invite-accept");

  await signUp(alice, id(2, "alice"));
  await alice.locator('section:has-text("2. 組織を作る") input').first().fill(orgName(2));
  await alice.getByRole("button", { name: "createOrganization" }).click();
  await alice.getByText("organization.create → OK").waitFor({ timeout: 15000 });
  await alice.waitForTimeout(1200);
  await rec.shot(10);

  // 招待先アドレスは inviteMember を押す前に埋めておく
  const bobEmail = id(2, "bob");
  await alice.locator('section:has-text("3. メンバーを招待する") input').first().fill(bobEmail);

  // 招待を作る → invitation が pending で 1 行増える
  await rec.act(async () => {
    await alice.getByRole("button", { name: "inviteMember" }).click();
    await alice.getByText("inviteMember → OK").waitFor({ timeout: 15000 });
    await alice.waitForTimeout(1400);
  }, { before: 4, after: 24 });

  // Bob が別コンテキストで承諾する
  const ctxB = await browser.newContext();
  const bob = await newPage(ctxB);
  await signUp(bob, bobEmail);
  await bob.goto(`${BASE}/accept-invitation/${latestInvitation(bobEmail)}`);
  await bob.getByRole("button", { name: "acceptInvitation" }).click();
  await bob.getByText("承諾しました").waitFor({ timeout: 15000 });

  // Alice 側の画面に member が増えるのを撮る
  await alice.reload();
  await alice.waitForTimeout(1500);
  await rec.shot(26);

  rec.encode();
  await ctxA.close();
  await ctxB.close();
}

// ---- Scene 3: member ロールは組織を削除できない ----
{
  console.log("scene 3: permission denied");
  const ctxA = await browser.newContext();
  const alice = await newPage(ctxA);
  await signUp(alice, id(3, "alice"));
  await alice.locator('section:has-text("2. 組織を作る") input').first().fill(orgName(3));
  await alice.getByRole("button", { name: "createOrganization" }).click();
  await alice.getByText("organization.create → OK").waitFor({ timeout: 15000 });
  const bob3Email = id(3, "bob");
  await alice.locator('section:has-text("3. メンバーを招待する") input').first().fill(bob3Email);
  await alice.getByRole("button", { name: "inviteMember" }).click();
  await alice.getByText("inviteMember → OK").waitFor({ timeout: 15000 });

  const ctxB = await browser.newContext();
  const bob = await newPage(ctxB);
  const rec = new Recorder(bob, "03-permission");
  await signUp(bob, bob3Email);
  await bob.goto(`${BASE}/accept-invitation/${latestInvitation(bob3Email)}`);
  await bob.getByRole("button", { name: "acceptInvitation" }).click();
  await bob.getByText("承諾しました").waitFor({ timeout: 15000 });
  await bob.goto(BASE);
  // 承諾直後は activeOrganizationId が未設定のことも、既に入っていることもある。
  // setActive ボタンが出ているときだけ押す。
  const setActiveBtn = bob.getByRole("button", { name: "setActive" }).first();
  if (await setActiveBtn.isVisible().catch(() => false)) {
    await setActiveBtn.click();
  }
  await bob.getByText("active", { exact: true }).first().waitFor({ timeout: 15000 });
  await bob.waitForTimeout(1500);
  await rec.shot(12);

  await rec.act(async () => {
    await bob.getByRole("button", { name: "hasPermission" }).click();
    await bob.getByText("サーバ判定").waitFor({ timeout: 15000 });
    await bob.waitForTimeout(1200);
  }, { before: 4, after: 18 });

  await rec.act(async () => {
    await bob.getByRole("button", { name: "組織を削除" }).click();
    await bob.waitForTimeout(1600);
  }, { before: 4, after: 24 });

  rec.encode();
  await ctxA.close();
  await ctxB.close();
}

await browser.close();
console.log("done");
