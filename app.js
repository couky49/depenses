"use strict";

const FICHIER = "data/utilisateurs.csv";
const CATEGORIES = ["Nourriture", "Transport", "Loisirs", "Logement", "Autre"];

let utilisateurs = {};   // identifiant en minuscules -> { login, secret }
let courant = null;      // identifiant de la personne connectée
let depenses = [];
let attente = -1;        // index de la dépense en attente de confirmation de suppression

const $ = (id) => document.getElementById(id);
const euro = (n) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

// ---------- Stockage local (protégé : peut échouer en navigation privée) ----------
function lire(cle) { try { return localStorage.getItem(cle); } catch { return null; } }
function ecrire(cle, valeur) {
  try {
    if (valeur === null) localStorage.removeItem(cle); else localStorage.setItem(cle, valeur);
  } catch { /* ignoré */ }
}

// ---------- Mots de passe ----------
// Le CSV contient sha256("login:motdepasse") en hexadécimal (login en minuscules).
// Un mot de passe en clair reste accepté pour faciliter les tests locaux.
async function sha256(texte) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texte));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}
async function motDePasseValide(user, mdp) {
  if (/^[0-9a-f]{64}$/i.test(user.secret)) {
    return (await sha256(user.login.toLowerCase() + ":" + mdp)) === user.secret.toLowerCase();
  }
  return user.secret === mdp;
}

async function chargerUtilisateurs() {
  const rep = await fetch(FICHIER, { cache: "no-store" });
  if (!rep.ok) throw new Error("HTTP " + rep.status);
  const texte = (await rep.text()).replace(/^\uFEFF/, "");
  const res = {};
  texte.split(/\r?\n/).forEach((ligne) => {
    const p = ligne.trim().split(/[;\t,]/);
    if (p.length < 2) return;
    const login = p[0].trim(), secret = p[1].trim();
    if (!login || !secret || login.toLowerCase() === "login") return; // saute l'en-tête
    res[login.toLowerCase()] = { login, secret };
  });
  utilisateurs = res;
}

// ---------- Dépenses (une liste par identifiant) ----------
const cleDepenses = () => "depenses:" + courant.toLowerCase();
function chargerDepenses() {
  try { depenses = JSON.parse(lire(cleDepenses())) || []; } catch { depenses = []; }
}
const sauver = () => ecrire(cleDepenses(), JSON.stringify(depenses));

function remplir(sel, liste) {
  liste.forEach((c) => sel.appendChild(new Option(c, c)));
}

function afficher() {
  const filtre = $("filtre").value, ul = $("liste");
  let total = 0, n = 0;
  ul.textContent = "";
  for (let i = depenses.length - 1; i >= 0; i--) {
    const d = depenses[i];
    if (filtre !== "Toutes" && d.categorie !== filtre) continue;
    n++; total += d.montant;

    const li = document.createElement("li");
    const info = document.createElement("div");
    const t = document.createElement("span"); t.className = "desc"; t.textContent = d.description || d.categorie;
    const dt = document.createElement("span"); dt.className = "date"; dt.textContent = d.date;
    const c = document.createElement("span"); c.className = "cat"; c.textContent = d.categorie;
    info.append(t, dt, c);

    const p = document.createElement("span"); p.className = "prix"; p.textContent = euro(d.montant);

    const b = document.createElement("button");
    b.type = "button";
    b.className = "suppr" + (attente === i ? " confirme" : "");
    b.textContent = attente === i ? "Supprimer ?" : "✕";
    b.setAttribute("aria-label", "Supprimer cette dépense");
    b.onclick = () => {
      if (attente === i) { depenses.splice(i, 1); attente = -1; sauver(); }
      else { attente = i; }
      afficher();
    };
    li.append(info, p, b);
    ul.appendChild(li);
  }
  $("vide").hidden = n > 0 || depenses.length === 0;
  $("total").textContent = euro(total);
  $("sous").textContent = depenses.length === 0
    ? "Ajoute ta première dépense ci-dessous."
    : n + (n > 1 ? " dépenses" : " dépense") + (filtre === "Toutes" ? " au total" : " en " + filtre);
}

// ---------- Vues ----------
function montrerAuth() {
  courant = null;
  depenses = [];
  $("vue-app").hidden = true;
  $("vue-auth").hidden = false;
}

function connecter(login) {
  courant = login;
  ecrire("session", login);
  chargerDepenses();
  attente = -1;
  $("qui").textContent = login;
  $("mdp").value = "";
  $("vue-auth").hidden = true;
  $("vue-app").hidden = false;
  afficher();
}

// ---------- Événements ----------
$("ajout-form").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const v = parseFloat($("montant").value.replace(",", "."));
  if (isNaN(v) || v <= 0) {
    $("erreur").textContent = "Entre un montant supérieur à 0, par exemple 12,50.";
    return;
  }
  $("erreur").textContent = "";
  depenses.push({
    montant: v,
    categorie: $("cat").value,
    description: $("desc").value.trim(),
    date: new Date().toLocaleDateString("sv-SE"),
  });
  sauver();
  $("montant").value = ""; $("desc").value = "";
  attente = -1;
  afficher();
});

$("filtre").addEventListener("change", () => { attente = -1; afficher(); });

$("auth-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const u = utilisateurs[$("login").value.trim().toLowerCase()];
  let ok = false;
  try { ok = !!u && await motDePasseValide(u, $("mdp").value); } catch { ok = false; }
  if (ok) { $("msg-auth").textContent = ""; connecter(u.login); }
  else { $("msg-auth").textContent = "Identifiant ou mot de passe incorrect."; }
});

$("btn-sortir").addEventListener("click", () => { ecrire("session", null); montrerAuth(); });

// ---------- Démarrage ----------
remplir($("cat"), CATEGORIES);
remplir($("filtre"), ["Toutes", ...CATEGORIES]);

chargerUtilisateurs().then(() => {
  const s = lire("session");
  const u = s ? utilisateurs[s.toLowerCase()] : null; // retiré du fichier => déconnecté
  if (u) connecter(u.login); else montrerAuth();
}).catch(() => {
  $("vue-auth").hidden = false;
  $("msg-auth").textContent = "Impossible de lire " + FICHIER + ". Ouvre le site depuis son adresse en ligne (ou un serveur local), pas en double-cliquant sur le fichier.";
});
