// Run with: npm exec --yes --package=firebase-tools@15.34.2 -- node scripts/grant-content-reviewer.mjs --email reviewer@example.com [--apply]
// Uses the CLI's normal authenticated client; never prints or exports credentials.
import { existsSync } from "node:fs";
import { delimiter, resolve } from "node:path";
import { createRequire } from "node:module";
import { isDeepStrictEqual } from "node:util";
import { REVIEWER_PROJECT, reviewerClaimUpdate } from "./lib/reviewer-claim.mjs";

try {
  const emailFlag = process.argv.indexOf("--email");
  const email = emailFlag >= 0 ? process.argv[emailFlag + 1] : undefined;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Specify the exact verified Google account with --email.");
  const packagePath = (process.env.PATH || "")
    .split(delimiter)
    .map((directory) => resolve(directory, "..", "firebase-tools", "package.json"))
    .find((candidate) => existsSync(candidate));
  if (!packagePath) throw new Error("Run this script through npm exec with firebase-tools@15.34.2.");
  const require = createRequire(packagePath);
  if (require(packagePath).version !== "15.34.2") throw new Error("Use the pinned Firebase CLI 15.34.2.");
  const { getProjectDefaultAccount, setActiveAccount } = require("./lib/auth");
  const { requireAuth } = require("./lib/requireAuth");
  const { Client } = require("./lib/apiv2");
  const options = { project: REVIEWER_PROJECT, projectRoot: process.cwd(), nonInteractive: true };
  const account = getProjectDefaultAccount(process.cwd());
  if (account) setActiveAccount(options, account);
  await requireAuth(options);
  const client = new Client({ urlPrefix: "https://identitytoolkit.googleapis.com", apiVersion: "v1" });
  const privateLog = { skipLog: { body: true, resBody: true } };
  const lookup = async () => {
    const response = await client.post(`/projects/${REVIEWER_PROJECT}/accounts:lookup`, { email: [email] }, privateLog);
    if (response.body.users?.length !== 1) throw new Error("The target Google account must sign in to the app first.");
    return response.body.users[0];
  };
  const target = await lookup();
  const update = reviewerClaimUpdate(target, email);
  if (!process.argv.includes("--apply")) {
    console.log(
      `Verified ${email} (${target.localId}) in ${REVIEWER_PROJECT}. Planned capability: contentReviewer=true only. Use --apply to grant it.`,
    );
  } else {
    await client.post(`/projects/${REVIEWER_PROJECT}/accounts:update`, update, privateLog);
    const confirmed = await lookup();
    if (
      confirmed.localId !== target.localId ||
      !isDeepStrictEqual(JSON.parse(confirmed.customAttributes || "{}"), JSON.parse(update.customAttributes))
    )
      throw new Error("The server did not confirm the expected claims; inspect the target account.");
    console.log(
      `Confirmed contentReviewer=true for ${email} (${target.localId}). No Firestore permissions or learning records were changed.`,
    );
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Could not provision the content reviewer.");
  process.exitCode = 1;
}
