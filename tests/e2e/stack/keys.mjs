import crypto from "node:crypto";
const secret = process.argv[2];
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const sign = (p) => { const h = b64({ alg: "HS256", typ: "JWT" }); const b = b64(p); return `${h}.${b}.${crypto.createHmac("sha256", secret).update(`${h}.${b}`).digest("base64url")}`; };
const exp = Math.floor(Date.now() / 1000) + 3600 * 24 * 30;
console.log(`ANON=${sign({ role: "anon", iss: "supabase", exp })}`);
console.log(`SERVICE=${sign({ role: "service_role", iss: "supabase", exp })}`);
