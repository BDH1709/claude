/**
 * localStorage-laag voor alles wat persoonlijk en lokaal is: notities,
 * reflecties na gesprek/meeloopdag en de vergelijklijst. Er is geen
 * backend nodig — dit blijft op het apparaat/de Pi waar de app draait.
 */

const OPSLAG_PREFIX = "bas-vacatures:";
const KEY_NOTITIES = OPSLAG_PREFIX + "notities";
const KEY_REFLECTIES = OPSLAG_PREFIX + "reflecties";
const KEY_VERGELIJK = OPSLAG_PREFIX + "vergelijklijst";
const KEY_CHECKLIST = OPSLAG_PREFIX + "checklist";

function leesJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn("Kon opslag niet lezen voor", key, e);
    return fallback;
  }
}

function schrijfJson(key, waarde) {
  try {
    localStorage.setItem(key, JSON.stringify(waarde));
  } catch (e) {
    console.warn("Kon opslag niet schrijven voor", key, e);
  }
}

const Storage = {
  getNotities(vacatureId) {
    const alle = leesJson(KEY_NOTITIES, {});
    return alle[vacatureId] || [];
  },
  voegNotitieToe(vacatureId, tekst) {
    const alle = leesJson(KEY_NOTITIES, {});
    const lijst = alle[vacatureId] || [];
    lijst.push({ tekst, datum: new Date().toISOString() });
    alle[vacatureId] = lijst;
    schrijfJson(KEY_NOTITIES, alle);
    return lijst;
  },

  getReflectie(vacatureId) {
    const alle = leesJson(KEY_REFLECTIES, {});
    return alle[vacatureId] || null;
  },
  bewaarReflectie(vacatureId, reflectie) {
    const alle = leesJson(KEY_REFLECTIES, {});
    alle[vacatureId] = { ...reflectie, bijgewerkt: new Date().toISOString() };
    schrijfJson(KEY_REFLECTIES, alle);
    return alle[vacatureId];
  },

  getVergelijklijst() {
    return leesJson(KEY_VERGELIJK, []);
  },
  toggleVergelijk(vacatureId, maxAantal = 4) {
    let lijst = leesJson(KEY_VERGELIJK, []);
    if (lijst.includes(vacatureId)) {
      lijst = lijst.filter((id) => id !== vacatureId);
    } else if (lijst.length < maxAantal) {
      lijst.push(vacatureId);
    } else {
      return { lijst, vol: true };
    }
    schrijfJson(KEY_VERGELIJK, lijst);
    return { lijst, vol: false };
  },
  leegVergelijklijst() {
    schrijfJson(KEY_VERGELIJK, []);
    return [];
  },

  getChecklist(vacatureId) {
    const alle = leesJson(KEY_CHECKLIST, {});
    return alle[vacatureId] || {};
  },
  zetChecklistItem(vacatureId, itemKey, aangevinkt) {
    const alle = leesJson(KEY_CHECKLIST, {});
    alle[vacatureId] = { ...(alle[vacatureId] || {}), [itemKey]: aangevinkt };
    schrijfJson(KEY_CHECKLIST, alle);
    return alle[vacatureId];
  },
};
