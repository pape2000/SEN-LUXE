// SEN LUXE — envoi réel des notifications internes (e-mail via Resend, WhatsApp via l'API officielle WhatsApp Business Cloud).
// NON DÉPLOYÉE par défaut. Secrets requis (Supabase › Edge Functions › Secrets), jamais dans le navigateur :
//   RESEND_API_KEY, NOTIFY_FROM (ex. "SEN LUXE <commandes@votre-domaine.com>"),
//   WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_TEMPLATE (modèle approuvé par Meta, 1 variable de corps)
// Authentification : jeton de session administrateur validé par la RPC senluxe_admin_session_info.
// Sans secrets, la fonction répond honnêtement "non configuré" : aucun faux succès.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, apikey, content-type", "content-type": "application/json" };
const J = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: cors });
const EMAIL = /^[^\s@<>"]{1,64}@[^\s@<>"]{1,190}\.[a-z]{2,}$/i, PHONE = /^\+[1-9][0-9]{7,14}$/;
const seen = new Map<string, number>(); // anti-doublon (même clé en moins de 10 min)
async function withRetry<T>(fn: () => Promise<T>, n = 3): Promise<T> { let e: unknown; for (let i = 0; i < n; i++) { try { return await fn(); } catch (x) { e = x; await new Promise(r => setTimeout(r, 400 * (i + 1))); } } throw e; }
serve(async (req) => {
  if (req.method === "OPTIONS") return J({});
  let b: any; try { b = await req.json(); } catch { return J({ ok: false, error: "Requête invalide" }, 400); }
  const url = Deno.env.get("SUPABASE_URL")!, key = Deno.env.get("SUPABASE_ANON_KEY")!;
  const chk = await fetch(url + "/rest/v1/rpc/senluxe_admin_session_info", { method: "POST", headers: { apikey: key, "content-type": "application/json" }, body: JSON.stringify({ p_token: String(b.token || "") }) });
  if (!chk.ok) return J({ ok: false, error: "Session administrateur invalide" }, 401);
  const channel = b.channel, to = String(b.to || ""), text = String(b.text || "Test SEN LUXE : la notification fonctionne.").slice(0, 900);
  const dk = channel + "|" + to + "|" + (b.dedupe || ""); if (b.dedupe && (seen.get(dk) || 0) > Date.now() - 6e5) return J({ ok: true, skipped: "doublon" });
  try {
    if (channel === "email") {
      const k = Deno.env.get("RESEND_API_KEY"), from = Deno.env.get("NOTIFY_FROM");
      if (!k || !from) return J({ ok: false, code: "not_configured", error: "E-mail non configuré : secrets RESEND_API_KEY et NOTIFY_FROM manquants." }, 501);
      if (!EMAIL.test(to)) return J({ ok: false, error: "Adresse invalide" }, 400);
      await withRetry(async () => { const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: "Bearer " + k, "content-type": "application/json" }, body: JSON.stringify({ from, to: [to], subject: String(b.subject || "SEN LUXE — notification").slice(0, 120), text }) }); if (!r.ok) throw new Error("Resend " + r.status); });
    } else if (channel === "whatsapp") {
      const t = Deno.env.get("WHATSAPP_TOKEN"), id = Deno.env.get("WHATSAPP_PHONE_ID"), tpl = Deno.env.get("WHATSAPP_TEMPLATE");
      if (!t || !id || !tpl) return J({ ok: false, code: "not_configured", error: "WhatsApp non configuré : WHATSAPP_TOKEN, WHATSAPP_PHONE_ID et WHATSAPP_TEMPLATE manquants (API WhatsApp Business officielle)." }, 501);
      if (!PHONE.test(to)) return J({ ok: false, error: "Numéro invalide (format international +221…)" }, 400);
      await withRetry(async () => { const r = await fetch("https://graph.facebook.com/v20.0/" + id + "/messages", { method: "POST", headers: { authorization: "Bearer " + t, "content-type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to: to.slice(1), type: "template", template: { name: tpl, language: { code: "fr" }, components: [{ type: "body", parameters: [{ type: "text", text: text.slice(0, 500) }] }] } }) }); if (!r.ok) throw new Error("WhatsApp " + r.status); });
    } else return J({ ok: false, error: "Canal inconnu" }, 400);
    if (b.dedupe) seen.set(dk, Date.now());
    return J({ ok: true });
  } catch (e) { return J({ ok: false, error: String((e as Error).message || e) }, 502); }
});
