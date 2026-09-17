import { adminOk, json, readDesk } from "../lib/store.js";

export async function onRequestGet({ request, env }) {
  if (!adminOk(request, env)) return json({ error: "unauthorized" }, 401);
  const desk = await readDesk(env, request);
  return json({ subscribers: desk.subscribers || [] });
}
