import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "./supabaseClient";

/* =========================================================================
   PORRA MUNDIAL 2026 · v2
   - Banderas como imágenes (insignias circulares, estilo emoji)
   - Iconografía propia en SVG (balón, bota, trofeo, banderines, patrón)
   - Perfiles con contraseña (acceso futuro para editar)
   - Bloqueo automático 1 h antes del partido inaugural
   - Panel de organizador: resultados + editar pronósticos de cualquiera
   - Sondeo visible: % de 1·X·2 y perfiles que han votado cada opción
   ========================================================================= */

/* =========================================================================
   ★★★  PERSONALIZAR IMÁGENES (LOGO E ICONOS)  ★★★
   Para cambiar el logo del header o cualquier icono por una imagen propia,
   pon aquí la URL (debe ser pública, terminada en .png/.jpg/.svg/.webp).
   Si dejas el valor en null, se usa el dibujo SVG original que ya trae la app.
   --------------------------------------------------------------------------
   Ejemplo:  LOGO_URL: "https://i.imgur.com/tuLogo.png"
   ========================================================================= */
const IMAGES = {
  // Logo que aparece en el header (arriba a la izquierda) y en la pantalla de inicio.
  LOGO_URL: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/2026_FIFA_World_Cup_emblem.svg/1920px-2026_FIFA_World_Cup_emblem.svg.png",
  // Imagen de fondo del bloque "El Mundial está al caer" (la cabecera grande).
  // Pon una URL pública (.jpg/.png/.webp). Se le aplica una capa oscura automática
  // para que el texto blanco de encima se siga leyendo. Si lo dejas en null, se usa
  // el fondo cobalto con destellos de color original.
  HERO_BG_URL: "https://i.ytimg.com/vi/HmpzUm5j4OE/hq720.jpg",
  // Iconos de las pestañas / secciones. Cámbialos por URLs si quieres imágenes propias.
  ICON_BALL_URL: null,    // icono "Grupos"
  ICON_TROPHY_URL: null,  // icono "Apuestas" y "Clasificación" (trofeo / campeón)
  ICON_BOOT_URL: null,    // icono del máximo goleador (bota)
  ICON_POLL_URL: null,    // icono "Sondeo"
  ICON_RANK_URL: null,    // icono "Clasificación" (medalla)
  ICON_RULES_URL: null,   // icono "Reglas"
};

/* Para cambiar la BANDERA/ESCUDO de una selección por una imagen propia, pon su URL.
   Útil para selecciones cuyo escudo de federación es más conocido que su bandera.
   Lo que dejes en null seguirá usando la bandera automática de flagcdn.com.
   Ejemplo:  ESP: "https://misitio.com/escudo-rfef.png"
   (La imagen se recorta en círculo, así que van bien logos cuadrados o circulares.) */
const FLAG_OVERRIDES = {
  // — Selecciones cuyo escudo suele ser más icónico que la bandera —
  ESP: "https://upload.wikimedia.org/wikipedia/commons/4/44/Logo_RFEF_Espa%C3%B1a.png",  // España (RFEF)
  BRA: "https://upload.wikimedia.org/wikipedia/commons/b/b9/Confedera%C3%A7%C3%A3o_Brasileira_de_Futebol_logo_%28variant%29.png",  // Brasil (CBF)
  ENG: "https://logodownload.org/wp-content/uploads/2022/07/england-national-team-logo-1.png",  // Inglaterra (Three Lions)
  GER: "https://images.vexels.com/media/users/3/152460/isolated/preview/825e80bac186d247dd9332f1440d20df-logotipo-del-equipo-de-futbol-de-alemania.png?w=360",  // Alemania (DFB)
  ARG: "https://images.seeklogo.com/logo-png/0/1/afa-logo-png_seeklogo-4069.png",  // Argentina (AFA)
  FRA: "https://upload.wikimedia.org/wikipedia/it/2/2d/Logo_FFF_%282018%29.png",  // Francia (FFF)
  NED: "https://logodownload.org/wp-content/uploads/2022/07/holanda-netherlands-football-team-logo.png",  // Países Bajos (KNVB)
  MEX: "https://logodownload.org/wp-content/uploads/2021/10/fmf-seleccion-de-mexico-logo-5.png",  // México (FMF)
  BEL: "https://logodownload.org/wp-content/uploads/2022/09/belgian-national-team-logo-1.png",
  JPN: "https://logodownload.org/wp-content/uploads/2022/08/japan-national-football-team-logo.png",
  GHA: "https://logodownload.org/wp-content/uploads/2022/12/ghana-national-football-team-logo.png",
  CAN: "https://logodownload.org/wp-content/uploads/2021/10/canada-soccer-team-logo.png",
  SEN: "https://logodownload.org/wp-content/uploads/2022/07/fsf-senegal-national-football-team-logo.png",
  COL: "https://logodownload.org/wp-content/uploads/2021/09/fcf-seleccion-de-f%C3%BAtbol-de-colombia-logo.png",
  CRO: "https://logodownload.org/wp-content/uploads/2022/11/croatia-national-football-team-logo.png",
  PAR: "https://logodownload.org/wp-content/uploads/2021/09/apf-seleccion-de-futbol-de-paraguay-logo.png",
  JOR: "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fwww.worldatlas.com%2Fupload%2F92%2Fe2%2Fed%2Fjo-flag.jpg",

  // Añade cualquier otra con su código de 3 letras, p. ej.:  BEL: "https://...",
};


/* ----------------------------- DATOS OFICIALES ---------------------------- */
const TEAMS = {
  MEX:{name:"México",flag:"mx"}, RSA:{name:"Sudáfrica",flag:"za"}, KOR:{name:"Corea del Sur",flag:"kr"}, CZE:{name:"República Checa",flag:"cz"},
  CAN:{name:"Canadá",flag:"ca"}, SUI:{name:"Suiza",flag:"ch"}, QAT:{name:"Catar",flag:"qa"}, BIH:{name:"Bosnia y Herzeg.",flag:"ba"},
  BRA:{name:"Brasil",flag:"br"}, MAR:{name:"Marruecos",flag:"ma"}, SCO:{name:"Escocia",flag:"gb-sct"}, HAI:{name:"Haití",flag:"ht"},
  USA:{name:"Estados Unidos",flag:"us"}, AUS:{name:"Australia",flag:"au"}, PAR:{name:"Paraguay",flag:"py"}, TUR:{name:"Turquía",flag:"tr"},
  GER:{name:"Alemania",flag:"de"}, ECU:{name:"Ecuador",flag:"ec"}, CIV:{name:"Costa de Marfil",flag:"ci"}, CUW:{name:"Curazao",flag:"cw"},
  NED:{name:"Países Bajos",flag:"nl"}, JPN:{name:"Japón",flag:"jp"}, TUN:{name:"Túnez",flag:"tn"}, SWE:{name:"Suecia",flag:"se"},
  BEL:{name:"Bélgica",flag:"be"}, IRN:{name:"Irán",flag:"ir"}, EGY:{name:"Egipto",flag:"eg"}, NZL:{name:"Nueva Zelanda",flag:"nz"},
  ESP:{name:"España",flag:"es"}, URU:{name:"Uruguay",flag:"uy"}, KSA:{name:"Arabia Saudí",flag:"sa"}, CPV:{name:"Cabo Verde",flag:"cv"},
  FRA:{name:"Francia",flag:"fr"}, SEN:{name:"Senegal",flag:"sn"}, NOR:{name:"Noruega",flag:"no"}, IRQ:{name:"Irak",flag:"iq"},
  ARG:{name:"Argentina",flag:"ar"}, AUT:{name:"Austria",flag:"at"}, ALG:{name:"Argelia",flag:"dz"}, JOR:{name:"Jordania",flag:"jo"},
  POR:{name:"Portugal",flag:"pt"}, COL:{name:"Colombia",flag:"co"}, UZB:{name:"Uzbekistán",flag:"uz"}, COD:{name:"RD del Congo",flag:"cd"},
  ENG:{name:"Inglaterra",flag:"gb-eng"}, CRO:{name:"Croacia",flag:"hr"}, PAN:{name:"Panamá",flag:"pa"}, GHA:{name:"Ghana",flag:"gh"},
};

const GROUPS = {
  A:["MEX","RSA","KOR","CZE"], B:["CAN","SUI","QAT","BIH"], C:["BRA","MAR","SCO","HAI"],
  D:["USA","AUS","PAR","TUR"], E:["GER","ECU","CIV","CUW"], F:["NED","JPN","TUN","SWE"],
  G:["BEL","IRN","EGY","NZL"], H:["ESP","URU","KSA","CPV"], I:["FRA","SEN","NOR","IRQ"],
  J:["ARG","AUT","ALG","JOR"], K:["POR","COL","UZB","COD"], L:["ENG","CRO","PAN","GHA"],
};

// Fixture OFICIAL del Mundial 2026 (calendario FIFA). Local primero. IDs estables.
const GROUP_MATCHES = [
  { id:"A0", group:"A", matchday:1, home:"MEX", away:"RSA" }, { id:"A1", group:"A", matchday:1, home:"KOR", away:"CZE" },
  { id:"A2", group:"A", matchday:2, home:"CZE", away:"RSA" }, { id:"A3", group:"A", matchday:2, home:"MEX", away:"KOR" },
  { id:"A4", group:"A", matchday:3, home:"CZE", away:"MEX" }, { id:"A5", group:"A", matchday:3, home:"RSA", away:"KOR" },
  { id:"B0", group:"B", matchday:1, home:"CAN", away:"BIH" }, { id:"B1", group:"B", matchday:1, home:"QAT", away:"SUI" },
  { id:"B2", group:"B", matchday:2, home:"SUI", away:"BIH" }, { id:"B3", group:"B", matchday:2, home:"CAN", away:"QAT" },
  { id:"B4", group:"B", matchday:3, home:"SUI", away:"CAN" }, { id:"B5", group:"B", matchday:3, home:"BIH", away:"QAT" },
  { id:"C0", group:"C", matchday:1, home:"BRA", away:"MAR" }, { id:"C1", group:"C", matchday:1, home:"HAI", away:"SCO" },
  { id:"C2", group:"C", matchday:2, home:"SCO", away:"MAR" }, { id:"C3", group:"C", matchday:2, home:"BRA", away:"HAI" },
  { id:"C4", group:"C", matchday:3, home:"SCO", away:"BRA" }, { id:"C5", group:"C", matchday:3, home:"MAR", away:"HAI" },
  { id:"D0", group:"D", matchday:1, home:"USA", away:"PAR" }, { id:"D1", group:"D", matchday:1, home:"AUS", away:"TUR" },
  { id:"D2", group:"D", matchday:2, home:"USA", away:"AUS" }, { id:"D3", group:"D", matchday:2, home:"TUR", away:"PAR" },
  { id:"D4", group:"D", matchday:3, home:"TUR", away:"USA" }, { id:"D5", group:"D", matchday:3, home:"PAR", away:"AUS" },
  { id:"E0", group:"E", matchday:1, home:"GER", away:"CUW" }, { id:"E1", group:"E", matchday:1, home:"CIV", away:"ECU" },
  { id:"E2", group:"E", matchday:2, home:"GER", away:"CIV" }, { id:"E3", group:"E", matchday:2, home:"ECU", away:"CUW" },
  { id:"E4", group:"E", matchday:3, home:"CUW", away:"CIV" }, { id:"E5", group:"E", matchday:3, home:"ECU", away:"GER" },
  { id:"F0", group:"F", matchday:1, home:"NED", away:"JPN" }, { id:"F1", group:"F", matchday:1, home:"SWE", away:"TUN" },
  { id:"F2", group:"F", matchday:2, home:"NED", away:"SWE" }, { id:"F3", group:"F", matchday:2, home:"TUN", away:"JPN" },
  { id:"F4", group:"F", matchday:3, home:"JPN", away:"SWE" }, { id:"F5", group:"F", matchday:3, home:"TUN", away:"NED" },
  { id:"G0", group:"G", matchday:1, home:"BEL", away:"EGY" }, { id:"G1", group:"G", matchday:1, home:"IRN", away:"NZL" },
  { id:"G2", group:"G", matchday:2, home:"BEL", away:"IRN" }, { id:"G3", group:"G", matchday:2, home:"NZL", away:"EGY" },
  { id:"G4", group:"G", matchday:3, home:"EGY", away:"IRN" }, { id:"G5", group:"G", matchday:3, home:"NZL", away:"BEL" },
  { id:"H0", group:"H", matchday:1, home:"ESP", away:"CPV" }, { id:"H1", group:"H", matchday:1, home:"KSA", away:"URU" },
  { id:"H2", group:"H", matchday:2, home:"ESP", away:"KSA" }, { id:"H3", group:"H", matchday:2, home:"URU", away:"CPV" },
  { id:"H4", group:"H", matchday:3, home:"CPV", away:"KSA" }, { id:"H5", group:"H", matchday:3, home:"URU", away:"ESP" },
  { id:"I0", group:"I", matchday:1, home:"FRA", away:"SEN" }, { id:"I1", group:"I", matchday:1, home:"IRQ", away:"NOR" },
  { id:"I2", group:"I", matchday:2, home:"FRA", away:"IRQ" }, { id:"I3", group:"I", matchday:2, home:"NOR", away:"SEN" },
  { id:"I4", group:"I", matchday:3, home:"NOR", away:"FRA" }, { id:"I5", group:"I", matchday:3, home:"SEN", away:"IRQ" },
  { id:"J0", group:"J", matchday:1, home:"ARG", away:"ALG" }, { id:"J1", group:"J", matchday:1, home:"AUT", away:"JOR" },
  { id:"J2", group:"J", matchday:2, home:"ARG", away:"AUT" }, { id:"J3", group:"J", matchday:2, home:"JOR", away:"ALG" },
  { id:"J4", group:"J", matchday:3, home:"ALG", away:"AUT" }, { id:"J5", group:"J", matchday:3, home:"JOR", away:"ARG" },
  { id:"K0", group:"K", matchday:1, home:"POR", away:"COD" }, { id:"K1", group:"K", matchday:1, home:"UZB", away:"COL" },
  { id:"K2", group:"K", matchday:2, home:"POR", away:"UZB" }, { id:"K3", group:"K", matchday:2, home:"COL", away:"COD" },
  { id:"K4", group:"K", matchday:3, home:"COL", away:"POR" }, { id:"K5", group:"K", matchday:3, home:"COD", away:"UZB" },
  { id:"L0", group:"L", matchday:1, home:"ENG", away:"CRO" }, { id:"L1", group:"L", matchday:1, home:"GHA", away:"PAN" },
  { id:"L2", group:"L", matchday:2, home:"ENG", away:"GHA" }, { id:"L3", group:"L", matchday:2, home:"PAN", away:"CRO" },
  { id:"L4", group:"L", matchday:3, home:"PAN", away:"ENG" }, { id:"L5", group:"L", matchday:3, home:"CRO", away:"GHA" },
];

/* --------------------- RESULTADOS Y HORARIOS EDITABLES -------------------
   Edita SOLO esta sección durante el torneo.
   - result: "" si aún no hay resultado; "1" gana local, "X" empate, "2" gana visitante.
   - kickoffSpain: hora de inicio en España, formato "AAAA-MM-DDTHH:mm:ss+02:00".
     Si lo dejas vacío, ese partido no aparecerá en la cuenta atrás del bloque principal.
   Los valores escritos aquí tienen prioridad sobre los resultados guardados desde el panel admin.
   ------------------------------------------------------------------------ */
const MATCH_CONTROL = {
  A0: { kickoffSpain: "2026-06-11T21:00:00+02:00", result: "1" }, // México - Sudáfrica
  A1: { kickoffSpain: "2026-06-12T04:00:00+02:00", result: "1" }, // Corea del Sur - República Checa
  A2: { kickoffSpain: "2026-06-18T18:00:00+02:00", result: "" }, // República Checa - Sudáfrica
  A3: { kickoffSpain: "2026-06-19T03:00:00+02:00", result: "" }, // México - Corea del Sur
  A4: { kickoffSpain: "2026-06-25T03:00:00+02:00", result: "" }, // República Checa - México
  A5: { kickoffSpain: "2026-06-25T03:00:00+02:00", result: "" }, // Sudáfrica - Corea del Sur
  B0: { kickoffSpain: "2026-06-12T21:00:00+02:00", result: "" }, // Canadá - Bosnia y Herzeg.
  B1: { kickoffSpain: "2026-06-13T21:00:00+02:00", result: "" }, // Catar - Suiza
  B2: { kickoffSpain: "2026-06-18T21:00:00+02:00", result: "" }, // Suiza - Bosnia y Herzeg.
  B3: { kickoffSpain: "2026-06-19T00:00:00+02:00", result: "" }, // Canadá - Catar
  B4: { kickoffSpain: "2026-06-24T21:00:00+02:00", result: "" }, // Suiza - Canadá
  B5: { kickoffSpain: "2026-06-24T21:00:00+02:00", result: "" }, // Bosnia y Herzeg. - Catar
  C0: { kickoffSpain: "2026-06-14T00:00:00+02:00", result: "" }, // Brasil - Marruecos
  C1: { kickoffSpain: "2026-06-14T03:00:00+02:00", result: "" }, // Haití - Escocia
  C2: { kickoffSpain: "2026-06-20T00:00:00+02:00", result: "" }, // Escocia - Marruecos
  C3: { kickoffSpain: "2026-06-20T03:00:00+02:00", result: "" }, // Brasil - Haití
  C4: { kickoffSpain: "2026-06-25T00:00:00+02:00", result: "" }, // Escocia - Brasil
  C5: { kickoffSpain: "2026-06-25T00:00:00+02:00", result: "" }, // Marruecos - Haití
  D0: { kickoffSpain: "2026-06-13T03:00:00+02:00", result: "" }, // Estados Unidos - Paraguay
  D1: { kickoffSpain: "2026-06-13T06:00:00+02:00", result: "" }, // Australia - Turquía
  D2: { kickoffSpain: "2026-06-19T21:00:00+02:00", result: "" }, // Estados Unidos - Australia
  D3: { kickoffSpain: "2026-06-19T06:00:00+02:00", result: "" }, // Turquía - Paraguay
  D4: { kickoffSpain: "2026-06-26T04:00:00+02:00", result: "" }, // Turquía - Estados Unidos
  D5: { kickoffSpain: "2026-06-26T04:00:00+02:00", result: "" }, // Paraguay - Australia
  E0: { kickoffSpain: "2026-06-14T19:00:00+02:00", result: "" }, // Alemania - Curazao
  E1: { kickoffSpain: "2026-06-15T01:00:00+02:00", result: "" }, // Costa de Marfil - Ecuador
  E2: { kickoffSpain: "2026-06-20T22:00:00+02:00", result: "" }, // Alemania - Costa de Marfil
  E3: { kickoffSpain: "2026-06-21T04:00:00+02:00", result: "" }, // Ecuador - Curazao
  E4: { kickoffSpain: "2026-06-25T22:00:00+02:00", result: "" }, // Curazao - Costa de Marfil
  E5: { kickoffSpain: "2026-06-25T22:00:00+02:00", result: "" }, // Ecuador - Alemania
  F0: { kickoffSpain: "2026-06-14T22:00:00+02:00", result: "" }, // Países Bajos - Japón
  F1: { kickoffSpain: "2026-06-15T04:00:00+02:00", result: "" }, // Suecia - Túnez
  F2: { kickoffSpain: "2026-06-20T19:00:00+02:00", result: "" }, // Países Bajos - Suecia
  F3: { kickoffSpain: "2026-06-20T06:00:00+02:00", result: "" }, // Túnez - Japón
  F4: { kickoffSpain: "2026-06-26T01:00:00+02:00", result: "" }, // Japón - Suecia
  F5: { kickoffSpain: "2026-06-26T01:00:00+02:00", result: "" }, // Túnez - Países Bajos
  G0: { kickoffSpain: "2026-06-15T21:00:00+02:00", result: "" }, // Bélgica - Egipto
  G1: { kickoffSpain: "2026-06-16T03:00:00+02:00", result: "" }, // Irán - Nueva Zelanda
  G2: { kickoffSpain: "2026-06-21T21:00:00+02:00", result: "" }, // Bélgica - Irán
  G3: { kickoffSpain: "2026-06-22T03:00:00+02:00", result: "" }, // Nueva Zelanda - Egipto
  G4: { kickoffSpain: "2026-06-27T05:00:00+02:00", result: "" }, // Egipto - Irán
  G5: { kickoffSpain: "2026-06-27T05:00:00+02:00", result: "" }, // Nueva Zelanda - Bélgica
  H0: { kickoffSpain: "2026-06-15T18:00:00+02:00", result: "" }, // España - Cabo Verde
  H1: { kickoffSpain: "2026-06-16T00:00:00+02:00", result: "" }, // Arabia Saudí - Uruguay
  H2: { kickoffSpain: "2026-06-21T18:00:00+02:00", result: "" }, // España - Arabia Saudí
  H3: { kickoffSpain: "2026-06-22T00:00:00+02:00", result: "" }, // Uruguay - Cabo Verde
  H4: { kickoffSpain: "2026-06-27T02:00:00+02:00", result: "" }, // Cabo Verde - Arabia Saudí
  H5: { kickoffSpain: "2026-06-27T02:00:00+02:00", result: "" }, // Uruguay - España
  I0: { kickoffSpain: "2026-06-16T21:00:00+02:00", result: "" }, // Francia - Senegal
  I1: { kickoffSpain: "2026-06-17T00:00:00+02:00", result: "" }, // Irak - Noruega
  I2: { kickoffSpain: "2026-06-22T23:00:00+02:00", result: "" }, // Francia - Irak
  I3: { kickoffSpain: "2026-06-23T02:00:00+02:00", result: "" }, // Noruega - Senegal
  I4: { kickoffSpain: "2026-06-26T21:00:00+02:00", result: "" }, // Noruega - Francia
  I5: { kickoffSpain: "2026-06-26T21:00:00+02:00", result: "" }, // Senegal - Irak
  J0: { kickoffSpain: "2026-06-17T03:00:00+02:00", result: "" }, // Argentina - Argelia
  J1: { kickoffSpain: "2026-06-16T06:00:00+02:00", result: "" }, // Austria - Jordania
  J2: { kickoffSpain: "2026-06-22T19:00:00+02:00", result: "" }, // Argentina - Austria
  J3: { kickoffSpain: "2026-06-23T05:00:00+02:00", result: "" }, // Jordania - Argelia
  J4: { kickoffSpain: "2026-06-28T04:00:00+02:00", result: "" }, // Argelia - Austria
  J5: { kickoffSpain: "2026-06-28T04:00:00+02:00", result: "" }, // Jordania - Argentina
  K0: { kickoffSpain: "2026-06-17T19:00:00+02:00", result: "" }, // Portugal - RD del Congo
  K1: { kickoffSpain: "2026-06-18T04:00:00+02:00", result: "" }, // Uzbekistán - Colombia
  K2: { kickoffSpain: "2026-06-23T19:00:00+02:00", result: "" }, // Portugal - Uzbekistán
  K3: { kickoffSpain: "2026-06-24T04:00:00+02:00", result: "" }, // Colombia - RD del Congo
  K4: { kickoffSpain: "2026-06-28T01:30:00+02:00", result: "" }, // Colombia - Portugal
  K5: { kickoffSpain: "2026-06-28T01:30:00+02:00", result: "" }, // RD del Congo - Uzbekistán
  L0: { kickoffSpain: "2026-06-17T22:00:00+02:00", result: "" }, // Inglaterra - Croacia
  L1: { kickoffSpain: "2026-06-18T01:00:00+02:00", result: "" }, // Ghana - Panamá
  L2: { kickoffSpain: "2026-06-23T22:00:00+02:00", result: "" }, // Inglaterra - Ghana
  L3: { kickoffSpain: "2026-06-24T01:00:00+02:00", result: "" }, // Panamá - Croacia
  L4: { kickoffSpain: "2026-06-27T23:00:00+02:00", result: "" }, // Panamá - Inglaterra
  L5: { kickoffSpain: "2026-06-27T23:00:00+02:00", result: "" }, // Croacia - Ghana
};

const FINAL_RESULTS = {
  champion: "", // Código de selección campeona, por ejemplo: "ESP"
  scorer: "",   // Nombre exacto del máximo goleador, por ejemplo: "Kylian Mbappé"
};
const MATCH_DURATION_MS = 2 * 60 * 60 * 1000; // 2 h: durante ese margen el hero mostrará "En juego".

function cleanMatchResult(value) {
  const v = String(value || "").trim().toUpperCase();
  return ["1", "X", "2"].includes(v) ? v : undefined;
}
function buildCodeResults() {
  const groups = {};
  Object.entries(MATCH_CONTROL).forEach(([id, cfg]) => {
    const result = cleanMatchResult(cfg?.result);
    if (result) groups[id] = result;
  });
  return {
    groups,
    champion: FINAL_RESULTS.champion || "",
    scorer: FINAL_RESULTS.scorer || "",
  };
}
function mergeOfficialResults(stored = {}) {
  const code = buildCodeResults();
  return {
    ...(stored || {}),
    groups: { ...((stored || {}).groups || {}), ...code.groups },
    champion: code.champion || stored?.champion || "",
    scorer: code.scorer || stored?.scorer || "",
  };
}
function getKickoffMs(matchId) {
  const raw = MATCH_CONTROL?.[matchId]?.kickoffSpain;
  if (!raw) return null;
  const ts = Date.parse(raw);
  return Number.isNaN(ts) ? null : ts;
}
function fmtSpainKickoff(ts) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid", weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(ts));
}
function getCurrentMatchInfo(now, results) {
  const rows = GROUP_MATCHES
    .map((match) => ({ match, kickoffMs: getKickoffMs(match.id) }))
    .filter((row) => row.kickoffMs != null)
    .sort((a, b) => a.kickoffMs - b.kickoffMs);
  const hasResult = (id) => !!results?.groups?.[id];

  const liveRows = rows.filter((row) => !hasResult(row.match.id) && now >= row.kickoffMs && now < row.kickoffMs + MATCH_DURATION_MS);
  if (liveRows.length) {
    return { rows: liveRows, kickoffMs: liveRows[0].kickoffMs, status: "live" };
  }

  const next = rows.find((row) => !hasResult(row.match.id) && row.kickoffMs > now);
  if (!next) return null;

  const nextRows = rows.filter((row) => !hasResult(row.match.id) && row.kickoffMs === next.kickoffMs);
  return { rows: nextRows, kickoffMs: next.kickoffMs, status: "upcoming" };
}

// Selecciones ordenadas alfabéticamente por nombre (para el selector de campeón)
const TEAMS_ALPHA = Object.keys(TEAMS).sort((a,b)=>TEAMS[a].name.localeCompare(TEAMS[b].name,"es"));

// Candidatos a Bota de Oro ordenados por cuotas de casas de apuestas (FOX/NBC/RotoWire, may-2026).
// Solo jugadores de selecciones clasificadas. El tercer valor es la cuota americana de referencia.
const SCORERS = [
  ["Kylian Mbappé","FRA","+600"],["Harry Kane","ENG","+700"],["Lionel Messi","ARG","+1200"],
  ["Erling Haaland","NOR","+1400"],["Lamine Yamal","ESP","+1800"],["Mikel Oyarzabal","ESP","+1800"],
  ["Cristiano Ronaldo","POR","+2000"],["Vinícius Júnior","BRA","+2200"],["Lautaro Martínez","ARG","+2500"],
  ["Ousmane Dembélé","FRA","+2800"],["Romelu Lukaku","BEL","+3000"],["Raphinha","BRA","+3000"],
  ["Julián Álvarez","ARG","+3500"],["Richarlison","BRA","+3500"],["Álvaro Morata","ESP","+3500"],
  ["Cody Gakpo","NED","+4000"],["Ferran Torres","ESP","+4000"],["Bukayo Saka","ENG","+4000"],
  ["Memphis Depay","NED","+4000"],["Jude Bellingham","ENG","+5000"],["Florian Wirtz","GER","+5000"],
  ["Bruno Fernandes","POR","+5000"],["Mohamed Salah","EGY","+6600"],["Darwin Núñez","URU","+6600"],
  ["Son Heung-min","KOR","+8000"],["Christian Pulisic","USA","+8000"],["Rodrygo","BRA","+8000"],
];

/* ----------------------------- PUNTUACIÓN -------------------------------- */
const SCORING = {
  group: 1,
  knockout: {
    r32:{sign:2,exact:1,label:"Dieciseisavos",matches:16}, r16:{sign:4,exact:2,label:"Octavos",matches:8},
    qf:{sign:6,exact:3,label:"Cuartos",matches:4}, sf:{sign:8,exact:4,label:"Semifinales",matches:2},
    third:{sign:6,exact:3,label:"3.er puesto",matches:1}, final:{sign:12,exact:6,label:"Final",matches:1},
  },
  champion: 20, scorer: 15,
};
const MAX_GROUP = GROUP_MATCHES.length * SCORING.group;
const MAX_KO = Object.values(SCORING.knockout).reduce((s,r)=>s+r.matches*(r.sign+r.exact),0);
const MAX_SPECIAL = SCORING.champion + SCORING.scorer;
const MAX_TOTAL = MAX_GROUP + MAX_KO + MAX_SPECIAL;

/* ----------------------------- FECHAS / BLOQUEO -------------------------- */
// Inaugural: 11 jun 2026, 13:00 CDMX (UTC-6) = 19:00 UTC. Bloqueo 1 h antes.
const KICKOFF = Date.UTC(2026, 5, 11, 19, 0, 0);
//const LOCK_TIME = KICKOFF - 24 * 3600 * 1000; // 10 jun 19:00 UTC
const LOCK_TIME = KICKOFF - 1 * 3600 * 1000; // 11 jun 18:00 UTC
const ADMIN_PIN = "ildioni"; // PIN del organizador

/* ----------------------------- AVATARES ---------------------------------- */
const COLORS = ["#0B1F8F","#E8402E","#FF7A1A","#13A05B","#2FA0E0","#7A3FB5","#C6A700","#0F8A8A","#111111","#FFFFFF"];

// Devuelve estilo de avatar con texto legible según lo claro/oscuro del fondo.
function avatarStyle(bg, extra = {}) {
  const hex = (bg || "#0B1F8F").replace("#", "");
  const r = parseInt(hex.substr(0,2),16), g = parseInt(hex.substr(2,2),16), b = parseInt(hex.substr(4,2),16);
  const lum = (0.299*r + 0.587*g + 0.114*b) / 255; // luminancia 0..1
  const light = lum > 0.7;
  return {
    background: bg,
    color: light ? "#10142E" : "#fff",
    boxShadow: light ? "inset 0 0 0 1px rgba(16,20,46,.18)" : "none",
    ...extra,
  };
}

/* ----------------------------- STORAGE ----------------------------------- */
const KEY = {
  me:"porra26:me", profiles:"porra26:profiles", results:"porra26:results",
  config:"porra26:config", picks:(id)=>`porra26:picks:${id}`,
};
const LOCAL_KEYS = new Set([KEY.me]);
async function sget(k, sh) {
  if (LOCAL_KEYS.has(k)) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } }
  try {
    const { data, error } = await supabase.from("kv").select("value").eq("key", k).maybeSingle();
    if (error) { console.error(error); return null; }
    return data ? data.value : null;
  } catch (e) { console.error(e); return null; }
}
async function sset(k, v, sh) {
  if (LOCAL_KEYS.has(k)) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }
  try {
    const { error } = await supabase.from("kv").upsert({ key: k, value: v }, { onConflict: "key" });
    if (error) { console.error(error); return false; }
    return true;
  } catch (e) { console.error(e); return false; }
}
async function sdel(k) {
  if (LOCAL_KEYS.has(k)) { try { localStorage.removeItem(k); } catch {} return; }
  try { await supabase.from("kv").delete().eq("key", k); } catch (e) { console.error(e); }
}
async function hashPw(pw){
  const d=new TextEncoder().encode("porra26§"+pw);
  const b=await crypto.subtle.digest("SHA-256",d);
  return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
}

/* ----------------------------- ICONOS SVG -------------------------------- */
/* ► Cada icono usa su URL de IMAGES si está definida; si no, dibuja el SVG. */
const iconImg = (val, s) => {
  // Si el valor parece una URL/ruta de imagen, lo pinta como <img>; si no, como emoji/texto.
  const isUrl = typeof val === "string" && (/^https?:\/\//.test(val) || /\.(png|jpe?g|svg|webp|gif)$/i.test(val) || val.startsWith("/"));
  if (isUrl) {
    // Si IMAGES.ICONS_MONO está activado, se desatura la imagen para que combine
    // con el gris de los demás iconos. Funciona mejor con siluetas/iconos planos.
    const filter = IMAGES.ICONS_MONO ? "grayscale(1) opacity(.65)" : undefined;
    return <img src={val} alt="" width={s} height={s} style={{ objectFit: "contain", filter }} />;
  }
  // Emoji/texto: también puede atenuarse a gris con ICONS_MONO.
  const style = { fontSize: s * 0.95, lineHeight: 1 };
  if (IMAGES.ICONS_MONO) style.filter = "grayscale(1) opacity(.65)";
  return <span style={style}>{val}</span>;
};
const Ball = ({s=22}) => IMAGES.ICON_BALL_URL ? iconImg(IMAGES.ICON_BALL_URL, s) : (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
    {/* contorno del balón */}
    <circle cx="12" cy="12" r="9.3"/>
    {/* pentágono central negro (como el emoji ⚽) */}
    <path d="M12 7.4 L15.6 10 L14.2 14.3 L9.8 14.3 L8.4 10 Z" fill="currentColor" stroke="currentColor"/>
    {/* costuras: de cada vértice del pentágono hacia el borde */}
    <path d="M12 7.4 V3.1"/>
    <path d="M15.6 10 L19.4 8.1"/>
    <path d="M14.2 14.3 L16.9 18.6"/>
    <path d="M9.8 14.3 L7.1 18.6"/>
    <path d="M8.4 10 L4.6 8.1"/>
    {/* pequeños pentágonos parciales del borde (insinuados con trazos cortos) */}
    <path d="M3.4 12.2 Q5.4 12.9 6.2 14.8 M20.6 12.2 Q18.6 12.9 17.8 14.8 M9 3.6 Q10.4 5 12 5 Q13.6 5 15 3.6 M7.6 20.4 Q9.6 19.4 10.6 17.6 M16.4 20.4 Q14.4 19.4 13.4 17.6"/>
  </svg>
);
const Boot = ({s=22}) => IMAGES.ICON_BOOT_URL ? iconImg(IMAGES.ICON_BOOT_URL, s) : (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M4 7c0-.8.6-1.4 1.4-1.4H8c.6 0 1 .4 1.1 1l.5 4.1c.1.6.5 1 1.1 1.1l6.2.9c1.6.2 2.9 1.6 2.9 3.2v.7c0 .8-.6 1.4-1.4 1.4H5.4C4.6 19 4 18.4 4 17.6z"/>
    <path d="M4 16.4h16.3M7 19v1.5M11 19v1.5M15 19v1.5"/>
  </svg>
);
const Trophy = ({s=22}) => IMAGES.ICON_TROPHY_URL ? iconImg(IMAGES.ICON_TROPHY_URL, s) : (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
    <path d="M7 4h10v4a5 5 0 0 1-10 0z"/>
    <path d="M7 5H4.5v1.5A2.5 2.5 0 0 0 7 9M17 5h2.5v1.5A2.5 2.5 0 0 1 17 9"/>
    <path d="M12 13v3M9 20h6M9.5 20l.5-2.2c.1-.5.5-.8 1-.8h2c.5 0 .9.3 1 .8l.5 2.2"/>
  </svg>
);
const Rank = ({s=22}) => IMAGES.ICON_RANK_URL ? iconImg(IMAGES.ICON_RANK_URL, s) : (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
    {/* cinta en V que sostiene la medalla */}
    <path d="M8.5 3 L12 9.5 M15.5 3 L12 9.5"/>
    <path d="M6.7 3 H10.3 M13.7 3 H17.3"/>
    {/* disco de la medalla */}
    <circle cx="12" cy="15" r="5.8"/>
    {/* borde interior insinuado */}
    <circle cx="12" cy="15" r="3.9"/>
    {/* estrella central */}
    <path d="M12 12.4 l.72 1.5 1.63.22 -1.2 1.13 .3 1.62 -1.45-.8 -1.45.8 .3-1.62 -1.2-1.13 1.63-.22 Z" fill="currentColor" stroke="none"/>
  </svg>
);
const Poll = ({s=22}) => IMAGES.ICON_POLL_URL ? iconImg(IMAGES.ICON_POLL_URL, s) : (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <path d="M6 19V11M12 19V5M18 19v-6"/>
  </svg>
);
const ShieldIcon = ({s=22}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M12 3l7 2.5v5.5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V5.5z"/><path d="M9.5 12l1.8 1.8L15 9.8"/>
  </svg>
);
const BookIcon = ({s=22}) => IMAGES.ICON_RULES_URL ? iconImg(IMAGES.ICON_RULES_URL, s) : (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M5 4.5h10a2 2 0 0 1 2 2V20a1.5 1.5 0 0 0-1.5-1.5H5z"/><path d="M5 4.5v14M9 9h5M9 12h5"/>
  </svg>
);
// Banderines decorativos
const Bunting = () => (
  <svg viewBox="0 0 600 34" preserveAspectRatio="none" style={{ width:"100%", height:30, display:"block" }} aria-hidden>
    <path d="M0 4 Q300 18 600 4" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="1.5"/>
    {Array.from({length:14}).map((_,i)=>{
      const x = 14 + i*42, dip = Math.sin((x/600)*Math.PI)*12;
      const cols = ["#E8402E","#FF7A1A","#C6F23A","#13A05B","#2FA0E0","#0B1F8F"];
      return <polygon key={i} points={`${x},${5+dip} ${x+26},${5+dip} ${x+13},${24+dip}`} fill={cols[i%cols.length]} opacity="0.92"/>;
    })}
  </svg>
);

// Emblema ORIGINAL de la porra — inspirado en la estética 2026 (arcos concéntricos
// multicolor + tipografía rotunda), sin reproducir el emblema/trofeo oficiales de la FIFA.
// ► Para usar tu propio logo, pon una URL en IMAGES.LOGO_URL (arriba del archivo).
const Crest = ({ s=96 }) => {
  if (IMAGES.LOGO_URL) {
    return <img src={IMAGES.LOGO_URL} alt="Logo" width={s} height={s} style={{ objectFit: "contain", borderRadius: 8 }} />;
  }
  return (
  <svg width={s} height={s} viewBox="0 0 120 120" aria-hidden>
    <defs>
      <clipPath id="crestClip"><path d="M60 4 L108 18 V58 C108 88 87 108 60 116 C33 108 12 88 12 58 V18 Z"/></clipPath>
    </defs>
    <g clipPath="url(#crestClip)">
      {/* fondo de arcos concéntricos al estilo 2026 */}
      <rect x="0" y="0" width="120" height="120" fill="#0B1F8F"/>
      {[
        {r:60,c:"#E8402E"},{r:52,c:"#FF7A1A"},{r:44,c:"#C6F23A"},
        {r:36,c:"#13A05B"},{r:28,c:"#2FA0E0"},{r:20,c:"#0B1F8F"},
      ].map((a,i)=>(<circle key={i} cx="60" cy="62" r={a.r} fill={a.c}/>))}
      <circle cx="60" cy="62" r="14" fill="#FBF8F1"/>
      {/* balón estilizado en el centro */}
      <g transform="translate(60 62)">
        <path d="M0 -8 L7.6 -2.6 L4.7 6.4 L-4.7 6.4 L-7.6 -2.6 Z" fill="#0B1F8F"/>
      </g>
    </g>
    {/* marco del escudo */}
    <path d="M60 4 L108 18 V58 C108 88 87 108 60 116 C33 108 12 88 12 58 V18 Z" fill="none" stroke="#0B1F8F" strokeWidth="4"/>
    <path d="M60 4 L108 18 V58 C108 88 87 108 60 116 C33 108 12 88 12 58 V18 Z" fill="none" stroke="#FBF8F1" strokeWidth="1.5"/>
  </svg>
  );
};



/* ----------------------------- BANDERA ----------------------------------- */
/* ► Para usar un escudo/bandera propios de una selección, añade su URL en
   FLAG_OVERRIDES (arriba del archivo). Si no, usa la bandera de flagcdn.com. */
function Flag({ code, size=28 }) {
  const t = TEAMS[code];
  const [err, setErr] = useState(false);
  if (!t) return null;
  const src = FLAG_OVERRIDES[code] || `https://flagcdn.com/w160/${t.flag}.png`;
  return (
    <span className="flag" style={{ width:size, height:size }} title={t.name}>
      {err
        ? <span className="flag-fb" style={{ fontSize: size*0.34 }}>{code}</span>
        : <img src={src} alt={t.name} onError={()=>setErr(true)} loading="lazy" />}
    </span>
  );
}

/* ----------------------------- CUENTA ATRÁS ------------------------------ */
function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), intervalMs); return () => clearInterval(id); }, [intervalMs]);
  return now;
}
function fmtCountdown(ms) {
  if (ms <= 0) return "0";
  const d = Math.floor(ms/86400000), h = Math.floor(ms%86400000/3600000), m = Math.floor(ms%3600000/60000);
  return `${d}d ${h}h ${m}m`;
}

/* ----------------------------- ESTILOS ----------------------------------- */
function Styles() {
  return (
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Archivo+Black&family=Space+Grotesk:wght@500;600;700&display=swap');
.porra *{box-sizing:border-box}
.porra{
  /* Paleta inspirada en la identidad multicolor del Mundial 2026 */
  --cobalt:#0B1F8F;--cobalt-d:#081569;--red:#E8402E;--orange:#FF7A1A;
  --lime:#C6F23A;--green:#13A05B;--sky:#2FA0E0;--gold:#F2B705;
  --paper:#F2F4FB;--paper2:#FFFFFF;--card:#FFFFFF;--ink:#10142E;--ink2:#5B5F76;
  --line:#DEE2F2;--line2:#EBEEF8;
  /* aliases usados por componentes existentes */
  --clay:var(--cobalt);--clay-d:var(--cobalt-d);--clay-soft:#E6EBFF;--blue:var(--sky);
  font-family:'Archivo',system-ui,sans-serif;color:var(--ink);
  min-height:100vh;line-height:1.5;-webkit-font-smoothing:antialiased;position:relative;
  background-color:var(--paper);
  background-image:
    radial-gradient(circle at 8% -5%, rgba(232,64,46,.10), transparent 32%),
    radial-gradient(circle at 95% 4%, rgba(47,160,224,.12), transparent 34%),
    radial-gradient(circle at 50% 120%, rgba(19,160,91,.10), transparent 40%);
}
.porra h1,.porra h2,.porra h3,.porra .serif{font-family:'Space Grotesk','Archivo',sans-serif;letter-spacing:-.01em}
.porra button{font-family:inherit;cursor:pointer}
.wrap{max-width:880px;margin:0 auto;padding:0 18px 90px}

/* flag badge */
.flag{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;overflow:hidden;flex:none;
  background:#fff;box-shadow:0 1px 3px rgba(16,20,46,.18), inset 0 0 0 1.5px rgba(255,255,255,.9), 0 0 0 1px var(--line)}
.flag img{width:100%;height:100%;object-fit:cover}
.flag-fb{font-weight:800;color:var(--ink2);letter-spacing:-.02em;font-family:'Archivo'}

/* topbar */
.topbar{position:sticky;top:0;z-index:30;background:rgba(242,244,251,.9);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.topbar-in{max-width:880px;margin:0 auto;padding:13px 18px;display:flex;align-items:center;gap:14px}
.brand{display:flex;align-items:center;gap:11px}
.brand .cup{color:var(--clay)}
.brand h1{font-size:19px;font-weight:600;margin:0;letter-spacing:-.01em}
.brand small{color:var(--ink2);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;font-weight:700}
.me-chip{margin-left:auto;display:flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:5px 6px 5px 12px;font-weight:600;font-size:13.5px}
.me-chip button{border:none;background:none;color:var(--ink2);font-size:12px;padding:4px 8px;border-radius:999px}
.me-chip button:hover{background:var(--clay-soft);color:var(--clay-d)}
.av{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:15px;color:#fff;flex:none}
.tabs{display:flex;gap:2px;max-width:880px;margin:0 auto;padding:6px 12px 0;overflow-x:auto;position:relative}
.tabs::after{content:"";position:absolute;left:12px;right:12px;bottom:0;height:3px;border-radius:3px;
  background:linear-gradient(90deg,var(--red),var(--orange),var(--lime),var(--green),var(--sky));opacity:.35}
.tab{border:none;background:none;padding:9px 13px;border-radius:10px 10px 0 0;font-weight:600;font-size:14px;color:var(--ink2);white-space:nowrap;display:flex;align-items:center;gap:7px;position:relative;z-index:1}
.tab svg{opacity:.7}
.tab.on{color:var(--clay-d);background:var(--paper2);box-shadow:inset 0 -3px 0 0 var(--cobalt)}
.tab.on svg{opacity:1}
.tab:hover:not(.on){color:var(--ink)}

/* generic */
.card{background:var(--card);border:1px solid var(--line);border-radius:16px}
.section-h{margin:24px 0 4px}
.section-h .ttl{display:flex;align-items:center;gap:10px}
.section-h .ttl .ic{color:var(--clay);background:var(--clay-soft);border-radius:10px;width:36px;height:36px;display:grid;place-items:center;flex:none}
.section-h h2{font-size:23px;margin:0;font-weight:600;letter-spacing:-.015em}
.section-h p{margin:5px 0 0;color:var(--ink2);font-size:14px}

.hero{margin-top:16px;border:1px solid var(--line);border-radius:18px;overflow:hidden;background:var(--cobalt);color:#fff;position:relative}
.hero::after{content:"";position:absolute;inset:0;pointer-events:none;
  background:
    radial-gradient(circle at 88% 120%, rgba(232,64,46,.55), transparent 38%),
    radial-gradient(circle at 12% 130%, rgba(198,242,58,.4), transparent 40%);}
/* Cuando el hero usa una imagen de fondo (IMAGES.HERO_BG_URL): capa oscura para legibilidad */
.hero.has-bg::after{
  background:linear-gradient(180deg, rgba(8,18,70,.45) 0%, rgba(8,18,70,.78) 100%);}
.hero.has-bg .bunting{position:relative;z-index:1}
.hero-body{padding:8px 22px 20px;position:relative;z-index:1}
.hero h2{font-size:25px;margin:8px 0 2px;font-weight:700;letter-spacing:-.02em;color:#fff}
.hero p{margin:0;color:rgba(255,255,255,.78);font-size:14px}
.countdown{display:flex;align-items:center;gap:12px;flex-wrap:nowrap;margin-top:14px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);border-radius:13px;padding:11px 15px;backdrop-filter:blur(4px);max-width:100%;overflow:hidden}
.countdown .big{font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;color:var(--lime);font-variant-numeric:tabular-nums}
.countdown>div div:first-child{color:rgba(255,255,255,.7)!important}
.next-match-list{display:grid;gap:6px;margin:4px 0 3px;min-width:0;width:100%;max-width:520px}
.next-match-row{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:9px;min-width:0;width:100%;max-width:520px;font-weight:700;font-size:18px;line-height:1.15}
.next-team{display:flex;align-items:center;gap:7px;min-width:0;max-width:100%;overflow:hidden}
.next-team.away{justify-content:flex-start;text-align:left}
.next-team-name{display:block;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.next-vs{color:rgba(255,255,255,.65);white-space:nowrap;flex:none;padding:0 2px}
.next-kickoff{grid-column:1 / -1;color:rgba(255,255,255,.72);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.banner{margin-top:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:var(--clay-soft);border:1px solid #C9D4FF;border-radius:14px;padding:12px 16px;font-size:14px}
.banner b{color:var(--clay-d)}
.banner.flat{background:var(--paper2);border-color:var(--line)}
.banner.locked{background:#F1E9DC;border-color:var(--line)}

.prog-track{height:9px;background:var(--line2);border-radius:99px;overflow:hidden}
.prog-fill{height:100%;background:linear-gradient(90deg,var(--clay),#E0876A);border-radius:99px;transition:width .4s ease}

.gnav{display:flex;flex-wrap:wrap;gap:7px;margin:16px 0 4px}
.gbtn{width:42px;height:42px;border-radius:11px;border:1px solid var(--line);background:var(--card);font-weight:700;font-size:15px;color:var(--ink);position:relative}
.gbtn.on{background:var(--clay);border-color:var(--clay);color:#fff}
.gbtn .dot{position:absolute;top:-3px;right:-3px;width:13px;height:13px;border-radius:50%;background:var(--green);border:2px solid var(--paper)}
.gbtn.on .dot{border-color:var(--clay)}

.glabel{display:flex;align-items:center;gap:10px;margin:20px 2px 12px}
.glabel .badge{background:var(--ink);color:var(--paper);width:30px;height:30px;border-radius:9px;display:grid;place-items:center;font-weight:700;font-family:'Space Grotesk',sans-serif}
.glabel h3{margin:0;font-size:19px;font-weight:600}
.glabel .sp{margin-left:auto;color:var(--ink2);font-size:13px}

.gteams{display:flex;gap:8px;flex-wrap:wrap;margin:0 2px 14px}
.gteam{display:flex;align-items:center;gap:7px;background:var(--paper2);border:1px solid var(--line2);border-radius:10px;padding:5px 11px 5px 6px;font-size:13px;font-weight:600}

.match{padding:13px 14px;border-bottom:1px solid var(--line2)}
.match:last-child{border-bottom:none}
.match-md{font-size:11px;color:var(--ink2);font-weight:700;letter-spacing:.05em;text-transform:uppercase;margin-bottom:9px;display:flex;align-items:center;gap:6px}
.duel{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px}
.side{display:flex;align-items:center;gap:10px;min-width:0}
.side.away{flex-direction:row-reverse;text-align:right}
.side .nm{font-weight:600;font-size:14.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.picks{display:flex;gap:6px}
.pick{width:46px;height:40px;border-radius:11px;border:1.5px solid var(--line);background:var(--paper2);font-weight:700;font-size:15px;color:var(--ink2);transition:transform .08s,background .15s}
.pick:hover:not(:disabled){border-color:var(--clay);color:var(--clay-d)}
.pick.sel{background:var(--cobalt)!important;border-color:var(--cobalt);color:#fff!important;box-shadow:0 3px 10px rgba(11,31,143,.32)}
.pick.sel:hover{color:#fff!important}
.pick:active:not(:disabled){transform:scale(.94)}
.pick.win{box-shadow:inset 0 0 0 2px var(--green)}
.pick:disabled{opacity:.6;cursor:default}
.result-tag{text-align:center;font-size:11.5px;color:var(--ink2);margin-top:8px}
.result-tag b.ok{color:var(--green)} .result-tag b.no{color:var(--clay-d)}

/* poll bars */
.poll{display:grid;grid-template-columns:28px 1fr 46px;align-items:center;gap:9px;margin-top:7px}
.poll .lab{font-weight:700;text-align:center;color:var(--ink2)}
.poll .bar{height:22px;background:var(--line2);border-radius:7px;overflow:hidden}
.poll .fill{height:100%;border-radius:7px;transition:width .5s}
.poll .pc{text-align:right;font-weight:700;font-size:13px;font-variant-numeric:tabular-nums}
.poll-n{text-align:center;font-size:11.5px;color:var(--ink2);margin-top:6px}
.poll-voters{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 8px 37px}
.poll-voter{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--line2);background:var(--paper2);border-radius:999px;padding:3px 8px 3px 4px;font-size:12px;font-weight:600;color:var(--ink)}
.poll-voter .av{width:20px;height:20px;font-size:11px}
.poll-empty{font-size:12px;color:var(--ink2);font-style:italic}

.team-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.team-opt{display:flex;align-items:center;gap:9px;padding:9px 11px;border:1.5px solid var(--line);border-radius:12px;background:var(--card);font-weight:600;font-size:13.5px;text-align:left}
.team-opt:hover:not(:disabled){border-color:var(--clay)}
.team-opt.sel{border-color:var(--clay);background:var(--clay-soft);color:var(--clay-d)}
.team-opt:disabled{cursor:default}
select,input.txt{width:100%;padding:11px 13px;border:1.5px solid var(--line);border-radius:12px;background:var(--card);font-family:inherit;font-size:14.5px;color:var(--ink)}
select:focus,input.txt:focus{outline:none;border-color:var(--clay)}

.lb-row{display:flex;align-items:center;gap:13px;padding:13px 16px;border-bottom:1px solid var(--line2)}
.lb-row:last-child{border-bottom:none}
.lb-row.me{background:var(--clay-soft)}
.rank{width:30px;text-align:center;font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:19px;color:var(--ink2)}
.lb-name{font-weight:600;font-size:15px}
.lb-sub{font-size:12px;color:var(--ink2)}
.lb-pts{margin-left:auto;text-align:right}
.lb-pts b{font-family:'Space Grotesk',sans-serif;font-size:21px;font-weight:600}
.lb-pts span{display:block;font-size:11px;color:var(--ink2)}

.rtable{width:100%;border-collapse:collapse;font-size:14px}
.rtable th,.rtable td{padding:10px 12px;text-align:left;border-bottom:1px solid var(--line2)}
.rtable th{font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--ink2)}
.rtable td.n{text-align:center;font-weight:700;font-variant-numeric:tabular-nums}
.rtable tr.tot td{border-top:2px solid var(--line);font-weight:700}
.pill{display:inline-block;background:var(--clay-soft);color:var(--clay-d);font-weight:700;border-radius:8px;padding:2px 8px;font-size:13px}

.btn{border:none;background:var(--clay);color:#fff;font-weight:600;padding:12px 20px;border-radius:12px;font-size:15px}
.btn:hover{background:var(--clay-d)} .btn.ghost{background:var(--card);color:var(--ink);border:1.5px solid var(--line)}
.btn.ghost:hover{border-color:var(--clay);color:var(--clay-d)} .btn:disabled{opacity:.5;cursor:default}
.seg{display:flex;gap:4px;background:var(--paper2);border:1px solid var(--line);border-radius:12px;padding:4px;margin-top:14px}
.seg button{flex:1;border:none;background:none;padding:9px;border-radius:9px;font-weight:600;font-size:13.5px;color:var(--ink2)}
.seg button.on{background:var(--card);color:var(--clay-d);box-shadow:0 1px 3px rgba(0,0,0,.07)}

.onb{max-width:460px;margin:5vh auto 0;padding:0 18px}
.onb .card{padding:26px 24px}
.av-pick{display:flex;flex-wrap:wrap;gap:8px}
.av-preview{width:46px;height:46px;border-radius:12px;display:grid;place-items:center;font-size:24px;color:#fff;flex:none;box-shadow:0 2px 6px rgba(16,20,46,.18)}
.av-opt{width:42px;height:42px;border-radius:11px;border:1.5px solid var(--line);background:var(--paper2);font-size:20px;display:grid;place-items:center}
.av-opt.sel{border-color:var(--clay);background:var(--clay-soft)}
.col-pick{display:flex;gap:8px}
.col-opt{width:30px;height:30px;border-radius:50%;border:2px solid transparent}
.col-opt.sel{border-color:var(--ink)}
.label{font-weight:600;font-size:13px;margin:18px 0 7px;display:block}
.choose-row{display:flex;align-items:center;gap:11px;width:100%;padding:13px 14px;border:1.5px solid var(--line);border-radius:13px;background:var(--card);text-align:left;font-weight:600}
.choose-row:hover{border-color:var(--clay)}
.note{font-size:12.5px;color:var(--ink2)}
.empty{text-align:center;padding:40px 20px;color:var(--ink2)}
.loadwrap{display:grid;place-items:center;height:70vh;color:var(--ink2)}
.lock-badge{display:inline-flex;align-items:center;gap:6px;background:var(--line2);color:var(--ink2);font-size:12px;font-weight:700;padding:4px 10px;border-radius:99px}
.err{color:var(--clay-d);font-size:13px;font-weight:600;margin-top:8px}

/* ===================== OPTIMIZACIÓN MÓVIL ===================== */
/* Barra de navegación inferior fija (solo móvil) */
.bottomnav{display:none}
@media(max-width:680px){
  .porra{ min-height:100dvh; }
  .wrap{ padding:0 14px calc(78px + env(safe-area-inset-bottom)); }

  /* Evitar zoom automático de iOS al enfocar inputs: fuente >=16px */
  select, input.txt, .me-chip{ font-size:16px; }

  /* Cabecera más compacta */
  .topbar-in{ padding:11px 14px; gap:10px; }
  .brand h1{ font-size:16px; }
  .brand small{ font-size:9.5px; }
  .me-chip{ padding:5px 6px 5px 10px; font-size:13px; max-width:46vw; overflow:hidden; }
  .me-chip > :not(.av):not(button){ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

  /* Ocultar las pestañas superiores: usamos la barra inferior */
  .tabs{ display:none; }

  /* Barra inferior tipo app */
  .bottomnav{
    display:flex; position:fixed; left:0; right:0; bottom:0; z-index:40;
    background:rgba(255,255,255,.96); backdrop-filter:blur(12px);
    border-top:1px solid var(--line);
    padding:6px 6px calc(6px + env(safe-area-inset-bottom));
    justify-content:space-around;
  }
  .bottomnav button{
    border:none; background:none; flex:1; display:flex; flex-direction:column;
    align-items:center; gap:2px; padding:6px 1px; color:var(--ink2);
    font-size:9.5px; font-weight:600; border-radius:12px; min-height:50px;
  }
  .bottomnav button.on{ color:var(--cobalt); }
  .bottomnav button.on .bn-ic{ background:var(--clay-soft); }
  .bn-ic{ width:34px; height:28px; border-radius:9px; display:grid; place-items:center; transition:background .15s; }

  /* Toques más grandes: botones de pronóstico cómodos para el pulgar */
  /* Partido: equipo a la izquierda, botones en el centro, equipo a la derecha */
  .duel{ grid-template-columns:1fr auto 1fr; gap:7px; align-items:center; }
  .side{ justify-content:flex-start; gap:7px; min-width:0; }
  .side.away{ flex-direction:row-reverse; text-align:right; }
  .side .nm{ font-size:12.5px; line-height:1.2; }
  .picks{ gap:5px; }
  .pick{ width:40px; height:48px; font-size:17px; padding:0; }

  /* En el sondeo, el cruce local–vs–visitante se mantiene en fila */
  .duel-poll{ grid-template-columns:1fr auto 1fr; gap:8px; }
  .duel-poll .side{ order:0; }
  .duel-poll .side.away{ order:0; flex-direction:row-reverse; text-align:right; }
  .duel-poll .nm{ font-size:13px; }

  /* Insignias de grupo más tocables */
  .gbtn{ width:46px; height:46px; font-size:16px; }

  /* Selector de campeón: dos columnas claras */
  .team-grid{ grid-template-columns:1fr 1fr; gap:8px; }
  .team-opt{ padding:11px 10px; }

  /* Encabezados de sección un poco menores */
  .section-h h2{ font-size:21px; }
  .hero h2{ font-size:22px; }
  .countdown{ align-items:flex-start; }
  .countdown{ gap:10px; padding:11px 12px; }
  .next-match-list{ max-width:100%; }
  .next-match-row{ font-size:16px; gap:6px; max-width:100%; }
  .next-team{ gap:6px; }

  /* Botones de acción a lo ancho y cómodos */
  .btn{ padding:13px 18px; }

  /* Segmented control del organizador: permite scroll si no cabe */
  .seg{ overflow-x:auto; }
  .seg button{ white-space:nowrap; min-height:42px; }

  /* Filas de clasificación/sondeo con más aire */
  .lb-row{ padding:14px 14px; }
}

/* Pantallas muy estrechas */
@media(max-width:380px){
  .bottomnav button{ font-size:9.5px; }
  .bn-ic{ width:34px; }
  .team-grid{ grid-template-columns:1fr; }
  .pick{ width:34px; height:46px; font-size:16px; }
  .duel .side .nm{ font-size:11.5px; }
  .duel{ gap:5px; }
}
@media(max-width:340px){
  /* Plan B en pantallas diminutas: nombres encima, botones+banderas debajo */
  .duel{ grid-template-columns:1fr; gap:8px; justify-items:stretch; }
  .duel .side{ order:1; }
  .duel .side.away{ order:2; flex-direction:row; text-align:left; }
  .duel .picks{ order:3; justify-content:space-between; }
  .pick{ flex:1; width:auto; }
}
`}</style>
  );
}

/* =============================== ONBOARDING ============================== */
function Onboarding({ profiles, onCreate, onLogin, onAdmin }) {
  const [mode, setMode] = useState("choose"); // choose | create | login
  const [name, setName] = useState("");
  const [av, setAv] = useState("⚽");
  const [col, setCol] = useState(COLORS[0]);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");

  const Header = (
    <>
      <div className="hero" style={{ marginTop: 0 }}>
        <Bunting />
        <div className="hero-body" style={{ textAlign: "center" }}>
          <Crest s={92} />
          <h2 style={{ fontSize: 28, marginTop: 4 }}>Porra del Mundial 2026</h2>
          <p>Estados Unidos · México · Canadá</p>
        </div>
      </div>
    </>
  );

  if (mode === "choose") {
    return (
      <div className="onb">
        {Header}
        <div className="card" style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <button className="choose-row" onClick={() => setMode("create")}>
            <span className="av" style={{ background: "var(--clay)" }}>＋</span>
            <span>Crear un perfil nuevo<br /><span className="note">Únete a la porra con tu nombre y contraseña</span></span>
          </button>
          <button className="choose-row" onClick={() => setMode("login")} disabled={profiles.length === 0}>
            <span className="av" style={{ background: "var(--blue)" }}>↩</span>
            <span>Acceder a mi perfil<br /><span className="note">{profiles.length ? "Vuelve a entrar para editar tu selección" : "Aún no hay perfiles creados"}</span></span>
          </button>
          <button className="choose-row" onClick={() => setMode("admin")} style={{ borderStyle: "dashed" }}>
            <span className="av" style={{ background: "var(--ink)" }}>🛡️</span>
            <span>Entrar como organizador<br /><span className="note">Gestiona resultados, cuentas y selecciones (requiere PIN)</span></span>
          </button>
        </div>
        <p className="note" style={{ textAlign: "center", marginTop: 14 }}>Comparte este enlace con tu peña: todos compiten en la misma clasificación.</p>
      </div>
    );
  }

  if (mode === "admin") {
    return (
      <div className="onb">
        {Header}
        <div className="card" style={{ marginTop: 16 }}>
          <label className="label" style={{ marginTop: 0 }}>PIN del organizador</label>
          <input className="txt" type="password" inputMode="numeric" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} placeholder="••••"
            onKeyDown={(e) => { if (e.key === "Enter") { if (loginPw === ADMIN_PIN) { setErr(""); onAdmin(); } else setErr("PIN incorrecto."); } }} />
          {err && <div className="err">{err}</div>}
          <button className="btn" style={{ width: "100%", marginTop: 16 }} disabled={loginPw.length < 3}
            onClick={() => { if (loginPw === ADMIN_PIN) { setErr(""); onAdmin(); } else setErr("PIN incorrecto."); }}>
            Entrar al panel</button>
          <button className="btn ghost" style={{ width: "100%", marginTop: 8 }} onClick={() => { setErr(""); setLoginPw(""); setMode("choose"); }}>Volver</button>
        </div>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className="onb">
        {Header}
        <div className="card" style={{ marginTop: 16 }}>
          <label className="label" style={{ marginTop: 0 }}>Tu nombre</label>
          <input className="txt" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} placeholder="Cómo apareces en la clasificación" />
          <label className="label">Tu emoji de avatar</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="av-preview" style={{ background: col }}>{av || "🙂"}</div>
            <input
              className="txt" value={av} maxLength={4} style={{ flex: 1 }}
              onChange={(e) => setAv([...e.target.value].slice(0, 1).join(""))}
              placeholder="Pega o escribe un emoji (ej. 🦁, ⚽, 🔥)"
            />
          </div>
          <p className="note" style={{ marginTop: 6 }}>Usa el teclado de emojis de tu dispositivo y elige el que quieras.</p>
          <label className="label">Color</label>
          <div className="col-pick">{COLORS.map((c) => <button key={c} className={`col-opt ${col === c ? "sel" : ""}`} style={{ background: c }} onClick={() => setCol(c)} />)}</div>
          <label className="label">Contraseña</label>
          <input className="txt" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Para volver a entrar en el futuro" />
          <input className="txt" type="password" style={{ marginTop: 8 }} value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Repite la contraseña" />
          {err && <div className="err">{err}</div>}
          <button className="btn" style={{ width: "100%", marginTop: 20 }}
            onClick={async () => {
              if (!name.trim()) return setErr("Pon un nombre.");
              if (profiles.some((p) => p.name.toLowerCase() === name.trim().toLowerCase())) return setErr("Ya existe un perfil con ese nombre.");
              if (pw.length < 4) return setErr("La contraseña debe tener al menos 4 caracteres.");
              if (pw !== pw2) return setErr("Las contraseñas no coinciden.");
              setErr(""); await onCreate({ name: name.trim(), avatar: av || "🙂", color: col, pwHash: await hashPw(pw) });
            }}>Crear perfil y entrar</button>
          <button className="btn ghost" style={{ width: "100%", marginTop: 8 }} onClick={() => { setErr(""); setMode("choose"); }}>Volver</button>
        </div>
      </div>
    );
  }

  // login
  return (
    <div className="onb">
      {Header}
      <div className="card" style={{ marginTop: 16 }}>
        <label className="label" style={{ marginTop: 0 }}>Elige tu perfil</label>
        <select value={loginId} onChange={(e) => setLoginId(e.target.value)}>
          <option value="" disabled>Selecciona…</option>
          {profiles.map((p) => <option key={p.id} value={p.id}>{p.avatar} {p.name}</option>)}
        </select>
        <label className="label">Contraseña</label>
        <input className="txt" type="password" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} placeholder="Tu contraseña" />
        {err && <div className="err">{err}</div>}
        <button className="btn" style={{ width: "100%", marginTop: 20 }} disabled={!loginId || !loginPw}
          onClick={async () => {
            const prof = profiles.find((p) => p.id === loginId);
            if (!prof) return;
            const ok = prof.pwHash ? (await hashPw(loginPw)) === prof.pwHash : true;
            if (!ok) return setErr("Contraseña incorrecta.");
            setErr(""); onLogin(prof);
          }}>Entrar</button>
        <button className="btn ghost" style={{ width: "100%", marginTop: 8 }} onClick={() => { setErr(""); setMode("choose"); }}>Volver</button>
      </div>
    </div>
  );
}

/* ============================== HERO + COUNTDOWN ========================= */
function HeroCountdown({ now, timeLocked, results }) {
  const matchInfo = getCurrentMatchInfo(now, results);
  const bg = IMAGES.HERO_BG_URL;
  const matches = matchInfo?.rows || [];
  const many = matches.length > 1;
  const hasDifferentKickoffs = many && matches.some((row) => row.kickoffMs !== matchInfo.kickoffMs);
  const statusLabel = matchInfo?.status === "live"
    ? (many ? "Partidos en juego" : "Partido en juego")
    : (many ? "Próximos partidos" : "Próximo partido");
  const countdownText = matchInfo?.status === "live" ? "En juego" : (matchInfo ? fmtCountdown(matchInfo.kickoffMs - now) : "Sin horario");
  return (
    <div className={`hero ${bg ? "has-bg" : ""}`}
      style={bg ? { backgroundImage: `url(${bg})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
      <Bunting />
      <div className="hero-body" style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <Crest s={72} />
        <div style={{ flex: 1, minWidth: 220, maxWidth: "100%" }}>
        <h2>¡El Mundial ha comenzado!</h2>
        <p>11 de junio – 19 de julio · 48 selecciones · 12 grupos</p>
        <div className="countdown">
          {matches.length ? (
            <>
              <span style={{ color: "var(--lime)", display: "inline-flex", flex: "0 0 auto" }}><Ball s={22} /></span>
              <div style={{ flex: "1 1 0", minWidth: 0, maxWidth: "100%" }}>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.7)", fontWeight: 700 }}>{statusLabel}</div>
                <div className="next-match-list">
                  {matches.map(({ match, kickoffMs }) => (
                    <div key={match.id} className="next-match-row">
                      <span className="next-team" title={TEAMS[match.home].name}>
                        <Flag code={match.home} size={21} />
                        <span className="next-team-name">{TEAMS[match.home].name}</span>
                      </span>

                      <span className="next-vs">vs</span>

                      <span className="next-team away" title={TEAMS[match.away].name}>
                        <Flag code={match.away} size={21} />
                        <span className="next-team-name">{TEAMS[match.away].name}</span>
                      </span>

                      {hasDifferentKickoffs && (
                        <span className="next-kickoff">{fmtSpainKickoff(kickoffMs)}</span>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.78)", fontWeight: 600 }}>
                  Hora en España: {fmtSpainKickoff(matchInfo.kickoffMs)}
                </div>
                <div className="big">{countdownText}</div>
              </div>
            </>
          ) : (
            <>
              <span style={{ color: "var(--lime)", display: "inline-flex", flex: "0 0 auto" }}><Ball s={22} /></span>
              <div style={{ flex: "1 1 0", minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.7)", fontWeight: 700 }}>Próximo partido</div>
                <div className="big">Añade horario en MATCH_CONTROL</div>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.78)", fontWeight: 600 }}>{timeLocked ? "Pronósticos cerrados" : "Pronósticos abiertos hasta el cierre"}</div>
              </div>
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

/* ============================== FASE DE GRUPOS =========================== */
function GroupsView({ picks, setPick, results, locked, now, timeLocked }) {
  const [g, setG] = useState("A");
  const score = computeScore(picks, results);
  const groupMatches = GROUP_MATCHES.filter((m) => m.group === g);
  const done = GROUP_MATCHES.filter((m) => picks.groups?.[m.id]).length;
  const groupDone = (gl) => GROUP_MATCHES.filter((m) => m.group === gl && picks.groups?.[m.id]).length === 6;
  return (
    <div>
      <HeroCountdown now={now} timeLocked={timeLocked} results={results} />
      <div className="section-h"><div className="ttl"><span className="ic"><Ball /></span><h2>Fase de grupos</h2></div>
        <p>Marca <b>1</b> (gana el local), <b>X</b> (empate) o <b>2</b> (gana el visitante) en cada partido.</p></div>

      {locked && <div className="banner locked">🔒 <b>Pronósticos cerrados.</b> Ya no se pueden modificar las selecciones.</div>}

      <div className="card" style={{ padding: "15px 16px", marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>
          <span>Tu progreso</span><span>{done} / {GROUP_MATCHES.length} partidos</span></div>
        <div className="prog-track"><div className="prog-fill" style={{ width: `${(done / GROUP_MATCHES.length) * 100}%` }} /></div>
      </div>

      <div className="card" style={{ padding: "14px 16px", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12.5, color: "var(--ink2)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>Puntos acumulados</div>
          <div className="note">{score.scored} partido{score.scored === 1 ? "" : "s"} corregido{score.scored === 1 ? "" : "s"} · grupos: {score.group}{score.special ? ` · especiales: ${score.special}` : ""}</div>
        </div>
        <div className="lb-pts" style={{ marginLeft: 0 }}><b>{score.total}</b><span>puntos</span></div>
      </div>

      <div className="gnav">{Object.keys(GROUPS).map((gl) => (
        <button key={gl} className={`gbtn ${g === gl ? "on" : ""}`} onClick={() => setG(gl)}>{gl}{groupDone(gl) && <span className="dot" />}</button>))}
      </div>

      <div className="glabel"><span className="badge">{g}</span><h3>Grupo {g}</h3></div>
      <div className="gteams">{GROUPS[g].map((c) => <div className="gteam" key={c}><Flag code={c} size={24} /> {TEAMS[c].name}</div>)}</div>

      <div className="card">
        {groupMatches.map((m) => {
          const sel = picks.groups?.[m.id], res = results?.groups?.[m.id];
          return (
            <div className="match" key={m.id}>
              <div className="match-md"><Ball s={13} /> Jornada {m.matchday}</div>
              <div className="duel">
                <div className="side"><Flag code={m.home} /><span className="nm">{TEAMS[m.home].name}</span></div>
                <div className="picks">{["1", "X", "2"].map((o) => (
                  <button key={o} className={`pick ${sel === o ? "sel" : ""} ${res === o ? "win" : ""}`} disabled={locked} onClick={() => setPick(m.id, o)}>{o}</button>))}
                </div>
                <div className="side away"><Flag code={m.away} /><span className="nm">{TEAMS[m.away].name}</span></div>
              </div>
              {res && <div className="result-tag">Resultado oficial: <b>{res}</b> · {sel ? (sel === res ? <b className="ok">+{SCORING.group} pts</b> : <b className="no">0 pts</b>) : "sin pronóstico"}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =============================== APUESTAS =============================== */
function SpecialsView({ picks, setChampion, setScorer, results, locked }) {
  const allTeams = TEAMS_ALPHA;
  const isOther = picks.scorer != null && picks.scorer !== "" && !SCORERS.some(([n]) => n === picks.scorer);
  return (
    <div>
      <div className="section-h"><div className="ttl"><span className="ic"><Trophy /></span><h2>Apuestas especiales</h2></div>
        <p>Las que más deciden al final: <b>{SCORING.champion} pts</b> el campeón y <b>{SCORING.scorer} pts</b> el goleador.</p></div>

      {locked && <div className="banner locked">🔒 <b>Apuestas cerradas.</b></div>}

      <div className="glabel"><span className="badge"><Trophy s={18} /></span><h3>Campeón del Mundial</h3>
        {results?.champion && <span className="sp">Oficial: <b>{TEAMS[results.champion]?.name}</b></span>}</div>
      <div className="team-grid">{allTeams.map((c) => (
        <button key={c} className={`team-opt ${picks.champion === c ? "sel" : ""}`} disabled={locked} onClick={() => setChampion(c)}><Flag code={c} size={24} /> {TEAMS[c].name}</button>))}
      </div>

      <div className="glabel" style={{ marginTop: 28 }}><span className="badge"><Boot s={17} /></span><h3>Máximo goleador</h3></div>
      <div className="card" style={{ padding: 16 }}>
        <select value={isOther ? "__other" : (picks.scorer || "")} disabled={locked}
          onChange={(e) => setScorer(e.target.value === "__other" ? " " : e.target.value)}>
          <option value="" disabled>Elige un jugador…</option>
          {SCORERS.map(([n, t]) => <option key={n} value={n}>{n} · {TEAMS[t].name}</option>)}
          <option value="__other">Otro (escribir nombre)…</option>
        </select>
        {isOther && <input className="txt" style={{ marginTop: 10 }} placeholder="Nombre del goleador" value={picks.scorer?.trimStart?.() || ""} disabled={locked} onChange={(e) => setScorer(e.target.value)} />}
        {results?.scorer && <p className="note" style={{ marginTop: 12 }}>Bota de Oro oficial: <b>{results.scorer}</b></p>}
      </div>
    </div>
  );
}

/* =============================== SONDEO ================================= */
function pct(n, total) { return total ? Math.round((n / total) * 100) : 0; }
function PollView({ profiles, allPicks, loading, onRefresh }) {
  const [g, setG] = useState("A");
  const voters = profiles.map((profile) => ({ profile, picks: allPicks[profile.id] }));
  const groupMatches = GROUP_MATCHES.filter((m) => m.group === g);

  const champTally = useMemo(() => {
    const t = {}; let tot = 0;
    voters.forEach(({ picks }) => { if (picks?.champion) { t[picks.champion] = (t[picks.champion] || 0) + 1; tot++; } });
    return { rows: Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 8), tot };
  }, [allPicks, profiles]);
  const scorerTally = useMemo(() => {
    const t = {}; let tot = 0;
    voters.forEach(({ picks }) => { const s = picks?.scorer?.trim(); if (s) { t[s] = (t[s] || 0) + 1; tot++; } });
    return { rows: Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 8), tot };
  }, [allPicks, profiles]);

  const COL = { "1": "var(--blue)", "X": "var(--ink2)", "2": "var(--green)" };

  return (
    <div>
      <div className="section-h" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div><div className="ttl"><span className="ic"><Poll /></span><h2>Sondeo de la peña</h2></div>
          <p>Qué ha votado cada perfil en cada partido.</p></div>
        <button className="btn ghost" style={{ padding: "8px 14px", fontSize: 13 }} onClick={onRefresh} disabled={loading}>{loading ? "…" : "↻"}</button>
      </div>

      <div className="banner flat">👥 {profiles.length} participante{profiles.length === 1 ? "" : "s"} en la porra.</div>

      <div className="gnav">{Object.keys(GROUPS).map((gl) => <button key={gl} className={`gbtn ${g === gl ? "on" : ""}`} onClick={() => setG(gl)}>{gl}</button>)}</div>
      <div className="glabel"><span className="badge">{g}</span><h3>Grupo {g}</h3></div>

      <div className="card">
        {groupMatches.map((m) => {
          let c = { "1": 0, "X": 0, "2": 0 }, tot = 0;
          const optionVoters = { "1": [], "X": [], "2": [] };
          voters.forEach(({ profile, picks }) => {
            const v = picks?.groups?.[m.id];
            if (v && optionVoters[v]) { c[v]++; tot++; optionVoters[v].push(profile); }
          });
          return (
            <div className="match" key={m.id}>
              <div className="duel duel-poll">
                <div className="side"><Flag code={m.home} size={24} /><span className="nm">{TEAMS[m.home].name}</span></div>
                <span className="note" style={{ fontWeight: 700 }}>vs</span>
                <div className="side away"><Flag code={m.away} size={24} /><span className="nm">{TEAMS[m.away].name}</span></div>
              </div>
              {["1", "X", "2"].map((o) => (
                <div key={o}>
                  <div className="poll">
                    <span className="lab">{o}</span>
                    <div className="bar"><div className="fill" style={{ width: `${pct(c[o], tot)}%`, background: COL[o] }} /></div>
                    <span className="pc">{pct(c[o], tot)}%</span>
                  </div>
                  <div className="poll-voters">
                    {optionVoters[o].length ? optionVoters[o].map((profile) => (
                      <span className="poll-voter" key={`${m.id}-${o}-${profile.id}`}>
                        <span className="av" style={avatarStyle(profile.color)}>{profile.avatar}</span>{profile.name}
                      </span>
                    )) : <span className="poll-empty">Sin perfiles</span>}
                  </div>
                </div>
              ))}
              <div className="poll-n">{tot} voto{tot === 1 ? "" : "s"}</div>
            </div>
          );
        })}
      </div>

      <div className="glabel" style={{ marginTop: 26 }}><span className="badge"><Trophy s={18} /></span><h3>Favoritos al título</h3></div>
      <div className="card" style={{ padding: "14px 16px" }}>
        {champTally.rows.length === 0 ? <div className="empty" style={{ padding: 18 }}>Nadie ha votado aún.</div> :
          champTally.rows.map(([code, n]) => (
            <div className="poll" key={code} style={{ gridTemplateColumns: "150px 1fr 46px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 600, fontSize: 13 }}><Flag code={code} size={22} /> {TEAMS[code]?.name}</span>
              <div className="bar"><div className="fill" style={{ width: `${pct(n, champTally.tot)}%`, background: "var(--clay)" }} /></div>
              <span className="pc">{pct(n, champTally.tot)}%</span>
            </div>
          ))}
      </div>

      <div className="glabel" style={{ marginTop: 22 }}><span className="badge"><Boot s={17} /></span><h3>Favoritos a la Bota de Oro</h3></div>
      <div className="card" style={{ padding: "14px 16px" }}>
        {scorerTally.rows.length === 0 ? <div className="empty" style={{ padding: 18 }}>Nadie ha votado aún.</div> :
          scorerTally.rows.map(([name, n]) => (
            <div className="poll" key={name} style={{ gridTemplateColumns: "150px 1fr 46px" }}>
              <span style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
              <div className="bar"><div className="fill" style={{ width: `${pct(n, scorerTally.tot)}%`, background: "var(--gold)" }} /></div>
              <span className="pc">{pct(n, scorerTally.tot)}%</span>
            </div>
          ))}
      </div>
    </div>
  );
}

/* ============================= CLASIFICACIÓN ============================ */
function computeScore(picks, results) {
  if (!picks || !results) return { total: 0, group: 0, special: 0, scored: 0 };
  let group = 0, scored = 0, special = 0;
  for (const m of GROUP_MATCHES) { const r = results.groups?.[m.id]; if (!r) continue; scored++; if (picks.groups?.[m.id] === r) group += SCORING.group; }
  if (results.champion && picks.champion === results.champion) special += SCORING.champion;
  if (results.scorer && picks.scorer && picks.scorer.trim().toLowerCase() === results.scorer.trim().toLowerCase()) special += SCORING.scorer;
  return { total: group + special, group, special, scored };
}
function Leaderboard({ profiles, allPicks, results, meId, onRefresh, loading }) {
  const rows = profiles.map((p) => {
    const sc = computeScore(allPicks[p.id], results);
    const made = allPicks[p.id] ? GROUP_MATCHES.filter((m) => allPicks[p.id].groups?.[m.id]).length : 0;
    return { ...p, ...sc, made };
  }).sort((a, b) => b.total - a.total || b.made - a.made);
  const scoredMatches = GROUP_MATCHES.filter((m) => results?.groups?.[m.id]).length;
  const remaining = (GROUP_MATCHES.length - scoredMatches) * SCORING.group + MAX_KO + (results?.champion ? 0 : SCORING.champion) + (results?.scorer ? 0 : SCORING.scorer);
  return (
    <div>
      <div className="section-h" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div><div className="ttl"><span className="ic"><Rank /></span><h2>Clasificación</h2></div>
          <p>{profiles.length} participante{profiles.length === 1 ? "" : "s"} · puntos en vivo</p></div>
        <button className="btn ghost" style={{ padding: "8px 14px", fontSize: 13 }} onClick={onRefresh} disabled={loading}>{loading ? "Actualizando…" : "↻ Actualizar"}</button>
      </div>
      <div className="banner">🔥 Quedan <b>{remaining} puntos</b> en juego de {MAX_TOTAL} totales —<span>&nbsp;hay remontada posible hasta la final.</span></div>
      <div className="card" style={{ marginTop: 14 }}>
        {rows.length === 0 ? <div className="empty">Aún no hay participantes.</div> :
          rows.map((r, i) => (
            <div className={`lb-row ${r.id === meId ? "me" : ""}`} key={r.id}>
              <div className="rank">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</div>
              <div className="av" style={avatarStyle(r.color)}>{r.avatar}</div>
              <div style={{ minWidth: 0 }}>
                <div className="lb-name">{r.name}{r.id === meId ? " · tú" : ""}</div>
                <div className="lb-sub">{r.made}/{GROUP_MATCHES.length} pronósticos{r.scored > 0 ? ` · ${r.group} en grupos` : ""}{r.special > 0 ? ` · ${r.special} especiales` : ""}</div>
              </div>
              <div className="lb-pts"><b>{r.total}</b><span>puntos</span></div>
            </div>
          ))}
      </div>
      <p className="note" style={{ marginTop: 12 }}>Los puntos aparecen a medida que el organizador introduce los resultados oficiales.</p>
    </div>
  );
}

/* ================================ REGLAS ================================ */
function Rules() {
  const ko = SCORING.knockout;
  return (
    <div>
      <div className="section-h"><div className="ttl"><span className="ic"><BookIcon /></span><h2>Reglas y reparto de puntos</h2></div>
        <p>Empezar fuerte da ventaja, pero nunca sentencia: las rondas finales pesan mucho más.</p></div>
      <div className="card" style={{ padding: "6px 16px 14px", marginTop: 14 }}>
        <table className="rtable">
          <thead><tr><th>Fase</th><th style={{ textAlign: "center" }}>1·X·2</th><th style={{ textAlign: "center" }}>Bonus exacto</th><th style={{ textAlign: "center" }}>Total fase</th></tr></thead>
          <tbody>
            <tr><td>Fase de grupos · 72 partidos</td><td className="n">{SCORING.group}</td><td className="n">—</td><td className="n">{MAX_GROUP}</td></tr>
            {["r32", "r16", "qf", "sf", "third", "final"].map((k) => (
              <tr key={k}><td>{ko[k].label} · {ko[k].matches} {ko[k].matches === 1 ? "partido" : "partidos"}</td>
                <td className="n">{ko[k].sign}</td><td className="n">+{ko[k].exact}</td><td className="n">{ko[k].matches * (ko[k].sign + ko[k].exact)}</td></tr>))}
            <tr><td>🏆 Campeón del torneo</td><td className="n">—</td><td className="n">—</td><td className="n">{SCORING.champion}</td></tr>
            <tr><td>⚽ Máximo goleador</td><td className="n">—</td><td className="n">—</td><td className="n">{SCORING.scorer}</td></tr>
            <tr className="tot"><td>Total del torneo</td><td className="n">—</td><td className="n">—</td><td className="n">{MAX_TOTAL}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="card" style={{ padding: 18, marginTop: 16 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 17 }}>Cómo funciona</h3>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14.5 }}>
          <li><b>Fase de grupos:</b> solo aciertas 1·X·2 ({SCORING.group} pt por partido).</li>
          <li><b>Eliminatorias:</b> puntos por acertar el signo + un bonus por clavar el resultado exacto. El bonus nunca supera el <b>50%</b> de lo que da el signo, así que acertar el ganador siempre vale más que el marcador.</li>
          <li>Cada ronda escala: la final vale más que las semis, estas más que cuartos, y así sucesivamente.</li>
          <li>La fase de grupos solo vale el <span className="pill">{Math.round((MAX_GROUP / MAX_TOTAL) * 100)}%</span> del total; el <span className="pill">{Math.round(((MAX_TOTAL - MAX_GROUP) / MAX_TOTAL) * 100)}%</span> restante se decide después, así que siempre hay margen para remontar.</li>
          <li>La selección se <b>bloquea automáticamente 1 h antes del partido inaugural</b>. Después solo el organizador puede tocarla en una urgencia.</li>
        </ul>
        <div className="lock-badge" style={{ marginTop: 12 }}>🔒 La porra de eliminatorias se abrirá al cerrar la fase de grupos</div>
      </div>
    </div>
  );
}

/* ====================== EDITOR DE PRONÓSTICOS (admin) ==================== */
function PicksEditor({ value, onChange }) {
  const [g, setG] = useState("A");
  const matches = GROUP_MATCHES.filter((m) => m.group === g);
  const isOther = value.scorer != null && value.scorer !== "" && !SCORERS.some(([n]) => n === value.scorer);
  const setP = (id, o) => onChange({ ...value, groups: { ...value.groups, [id]: value.groups?.[id] === o ? undefined : o } });
  return (
    <div>
      <div className="gnav">{Object.keys(GROUPS).map((gl) => <button key={gl} className={`gbtn ${g === gl ? "on" : ""}`} onClick={() => setG(gl)}>{gl}</button>)}</div>
      <div className="card" style={{ marginTop: 8 }}>
        {matches.map((m) => (
          <div className="match" key={m.id}>
            <div className="duel">
              <div className="side"><Flag code={m.home} size={24} /><span className="nm">{TEAMS[m.home].name}</span></div>
              <div className="picks">{["1", "X", "2"].map((o) => <button key={o} className={`pick ${value.groups?.[m.id] === o ? "sel" : ""}`} onClick={() => setP(m.id, o)}>{o}</button>)}</div>
              <div className="side away"><Flag code={m.away} size={24} /><span className="nm">{TEAMS[m.away].name}</span></div>
            </div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 16, marginTop: 14 }}>
        <label className="label" style={{ marginTop: 0 }}>🏆 Campeón</label>
        <select value={value.champion || ""} onChange={(e) => onChange({ ...value, champion: e.target.value })}>
          <option value="">Sin elegir</option>{TEAMS_ALPHA.map((c) => <option key={c} value={c}>{TEAMS[c].name}</option>)}
        </select>
        <label className="label">⚽ Máximo goleador</label>
        <select value={isOther ? "__other" : (value.scorer || "")} onChange={(e) => onChange({ ...value, scorer: e.target.value === "__other" ? " " : e.target.value })}>
          <option value="">Sin elegir</option>{SCORERS.map(([n, t]) => <option key={n} value={n}>{n} · {TEAMS[t].name}</option>)}
          <option value="__other">Otro…</option>
        </select>
        {isOther && <input className="txt" style={{ marginTop: 10 }} value={value.scorer?.trimStart?.() || ""} onChange={(e) => onChange({ ...value, scorer: e.target.value })} placeholder="Nombre del goleador" />}
      </div>
    </div>
  );
}

/* ============================== ORGANIZADOR ============================= */
function AdminView({ config, setConfig, results, saveResults, locked, setLocked, timeLocked, profiles, allPicks, savePicksFor, resetPassword, deleteProfile, onRefresh }) {
  const [sub, setSub] = useState("results"); // results | players | accounts | settings
  const [draft, setDraft] = useState(results || { groups: {}, champion: "", scorer: "" });
  const [savedR, setSavedR] = useState(false);
  // edición de jugador
  const [targetId, setTargetId] = useState("");
  const [pDraft, setPDraft] = useState(null);
  const [savedP, setSavedP] = useState(false);
  // gestión de cuentas
  const [pwMsg, setPwMsg] = useState("");

  useEffect(() => { setDraft(results || { groups: {}, champion: "", scorer: "" }); }, [results]);
  useEffect(() => { setPDraft(targetId && allPicks[targetId] ? JSON.parse(JSON.stringify(allPicks[targetId])) : (targetId ? { groups: {}, champion: "", scorer: "" } : null)); }, [targetId, allPicks]);

  return (
    <div>
      <div className="section-h"><div className="ttl"><span className="ic"><ShieldIcon /></span><h2>Panel del organizador</h2></div></div>
      <div className="seg">
        <button className={sub === "results" ? "on" : ""} onClick={() => setSub("results")}>Resultados</button>
        <button className={sub === "players" ? "on" : ""} onClick={() => { setSub("players"); onRefresh(); }}>Editar jugador</button>
        <button className={sub === "accounts" ? "on" : ""} onClick={() => { setSub("accounts"); onRefresh(); }}>Cuentas</button>
        <button className={sub === "settings" ? "on" : ""} onClick={() => setSub("settings")}>Ajustes</button>
      </div>

      {sub === "results" && (
        <div style={{ marginTop: 12 }}>
          <div className="banner flat" style={{ marginTop: 0 }}>⚡ <b>Autoguardado:</b> cada resultado que marques se aplica al instante a la clasificación de todos.</div>
          <p className="note" style={{ margin: "10px 0 8px" }}>Marca el resultado oficial (1·X·2) de cada partido, el campeón y el goleador. Abajo verás cómo queda la clasificación en tiempo real.</p>
          <PicksEditor value={draft} onChange={(d) => { setDraft(d); saveResults(d); }} />

          <div className="glabel" style={{ marginTop: 22 }}><span className="badge"><Trophy s={18} /></span><h3>Clasificación en vivo</h3>
            <span className="sp">{GROUP_MATCHES.filter((m) => draft.groups?.[m.id]).length}/{GROUP_MATCHES.length} resultados</span></div>
          <div className="card">
            {(() => {
              const rows = profiles.map((p) => ({ ...p, ...computeScore(allPicks[p.id], draft) }))
                .sort((a, b) => b.total - a.total);
              if (rows.length === 0) return <div className="empty">Aún no hay participantes.</div>;
              return rows.map((r, i) => (
                <div className="lb-row" key={r.id}>
                  <div className="rank">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</div>
                  <div className="av" style={avatarStyle(r.color)}>{r.avatar}</div>
                  <div style={{ minWidth: 0 }}><div className="lb-name">{r.name}</div>
                    <div className="lb-sub">{r.group} grupos{r.special ? ` · ${r.special} especiales` : ""}</div></div>
                  <div className="lb-pts"><b>{r.total}</b><span>puntos</span></div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {sub === "players" && (
        <div style={{ marginTop: 12 }}>
          <div className="banner flat">🛟 <b>Modo urgencia:</b> edita la selección de cualquier participante (no afectado por el bloqueo horario).</div>
          <label className="label">Participante</label>
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            <option value="" disabled>Elige un jugador…</option>
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.avatar} {p.name}</option>)}
          </select>
          {pDraft && (
            <div style={{ marginTop: 6 }}>
              <PicksEditor value={pDraft} onChange={setPDraft} />
              <button className="btn" style={{ marginTop: 16 }} onClick={async () => { await savePicksFor(targetId, pDraft); setSavedP(true); setTimeout(() => setSavedP(false), 2000); }}>
                {savedP ? "✓ Guardado" : `Guardar selección de ${profiles.find((p) => p.id === targetId)?.name || ""}`}</button>
            </div>
          )}
        </div>
      )}

      {sub === "accounts" && (
        <div style={{ marginTop: 12 }}>
          <div className="banner flat">🔐 <b>Gestión de cuentas:</b> restablece contraseñas o elimina perfiles.</div>
          {profiles.length === 0 ? <div className="empty">Aún no hay perfiles.</div> : (
            <div className="card" style={{ marginTop: 4 }}>
              {profiles.map((p) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--line2)" }}>
                  <div className="av" style={avatarStyle(p.color)}>{p.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="lb-name">{p.name}</div>
                    <div className="lb-sub">{(allPicks[p.id] ? GROUP_MATCHES.filter((m) => allPicks[p.id].groups?.[m.id]).length : 0)}/{GROUP_MATCHES.length} pronósticos</div>
                  </div>
                  <button className="btn ghost" style={{ padding: "7px 11px", fontSize: 12.5 }}
                    onClick={async () => {
                      const np = prompt(`Nueva contraseña para ${p.name} (mín. 4 caracteres):`);
                      if (np == null) return;
                      if (np.length < 4) { alert("Demasiado corta."); return; }
                      await resetPassword(p.id, np);
                      setPwMsg(`Contraseña de ${p.name} restablecida.`); setTimeout(() => setPwMsg(""), 2500);
                    }}>Restablecer clave</button>
                  <button className="btn ghost" style={{ padding: "7px 11px", fontSize: 12.5, borderColor: "#E3B4A6", color: "var(--clay-d)" }}
                    onClick={async () => {
                      if (!confirm(`¿Eliminar el perfil de ${p.name}? Se borrarán también sus pronósticos. Esta acción no se puede deshacer.`)) return;
                      await deleteProfile(p.id);
                      if (targetId === p.id) setTargetId("");
                      setPwMsg(`Perfil de ${p.name} eliminado.`); setTimeout(() => setPwMsg(""), 2500);
                    }}>Borrar</button>
                </div>
              ))}
            </div>
          )}
          {pwMsg && <div className="banner" style={{ marginTop: 12 }}>✓ {pwMsg}</div>}
        </div>
      )}

      {sub === "settings" && (
        <div style={{ marginTop: 12 }}>
          <div className="banner flat" style={{ marginTop: 0 }}>
            <b>Bloqueo automático:</b> {timeLocked ? "activo (ya pasó la hora de cierre)." : "se activará 1 h antes del inaugural."}
          </div>
          <div className="banner flat">
            <b>Cierre manual:</b> {locked && !timeLocked ? "forzado a cerrado." : "abierto."}
            <button className="btn ghost" style={{ marginLeft: "auto", padding: "7px 12px", fontSize: 13 }} onClick={() => setLocked(!config?.locked)} disabled={timeLocked}>
              {config?.locked ? "Reabrir pronósticos" : "Cerrar pronósticos ahora"}</button>
          </div>
          <p className="note">El cierre manual permite adelantar el bloqueo. Una vez pasada la hora automática, los pronósticos quedan cerrados para todos salvo desde "Editar jugador".</p>
        </div>
      )}
    </div>
  );
}

/* ============================ EDITAR PERFIL ============================= */
const UserIcon = ({ s = 22 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <circle cx="12" cy="8" r="3.6" /><path d="M5 20c0-3.5 3.1-5.6 7-5.6s7 2.1 7 5.6" />
  </svg>
);

function ProfileEditor({ me, profiles, onSave, onChangePassword }) {
  const [name, setName] = useState(me.name);
  const [av, setAv] = useState(me.avatar);
  const [col, setCol] = useState(me.color);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  return (
    <div>
      <div className="section-h"><div className="ttl"><span className="ic"><UserIcon /></span><h2>Mi perfil</h2></div>
        <p>Cambia tu emoji, tu nombre y tu color. Se actualiza en toda la porra.</p></div>

      <div className="card" style={{ padding: 18, marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div className="av-preview" style={avatarStyle(col)}>{av || "🙂"}</div>
          <div style={{ flex: 1 }}>
            <label className="label" style={{ marginTop: 0 }}>Emoji de avatar</label>
            <input className="txt" value={av} maxLength={4}
              onChange={(e) => setAv([...e.target.value].slice(0, 1).join(""))}
              placeholder="Pega o escribe un emoji" />
          </div>
        </div>

        <label className="label">Nombre</label>
        <input className="txt" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />

        <label className="label">Color de fondo</label>
        <div className="col-pick">{COLORS.map((c) => (
          <button key={c} className={`col-opt ${col === c ? "sel" : ""}`} style={{ background: c }} onClick={() => setCol(c)} />
        ))}</div>

        {err && <div className="err">{err}</div>}
        {msg && <div className="banner" style={{ marginTop: 12 }}>✓ {msg}</div>}
        <button className="btn" style={{ width: "100%", marginTop: 18 }}
          onClick={async () => {
            if (!name.trim()) return setErr("Pon un nombre.");
            if (profiles.some((p) => p.id !== me.id && p.name.toLowerCase() === name.trim().toLowerCase()))
              return setErr("Ya existe otro perfil con ese nombre.");
            setErr(""); await onSave({ name: name.trim(), avatar: av || "🙂", color: col });
            setMsg("Perfil actualizado."); setTimeout(() => setMsg(""), 2500);
          }}>Guardar cambios</button>
      </div>

      <div className="card" style={{ padding: 18, marginTop: 16 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Cambiar contraseña</h3>
        <input className="txt" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Nueva contraseña" />
        <input className="txt" type="password" style={{ marginTop: 8 }} value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Repite la nueva contraseña" />
        {pwMsg && <div className="banner" style={{ marginTop: 12 }}>✓ {pwMsg}</div>}
        <button className="btn ghost" style={{ width: "100%", marginTop: 12 }}
          onClick={async () => {
            if (pw.length < 4) return alert("La contraseña debe tener al menos 4 caracteres.");
            if (pw !== pw2) return alert("Las contraseñas no coinciden.");
            await onChangePassword(pw); setPw(""); setPw2("");
            setPwMsg("Contraseña cambiada."); setTimeout(() => setPwMsg(""), 2500);
          }}>Actualizar contraseña</button>
      </div>
    </div>
  );
}

/* ================================= APP ================================== */
const TABS = [
  ["groups", "Grupos", Ball],
  ["specials", "Apuestas", Trophy],
  ["poll", "Sondeo", Poll],
  ["leaderboard", "Clasificación", Rank],
  ["profile", "Perfil", UserIcon],
  ["rules", "Reglas", BookIcon],
];

export default function App() {
  const now = useNow();
  const [booting, setBooting] = useState(true);
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState("groups");
  const [picks, setPicks] = useState({ groups: {}, champion: "", scorer: undefined });
  const [results, setResults] = useState(() => mergeOfficialResults({ groups: {} }));
  const [config, setConfigState] = useState({});
  const [profiles, setProfiles] = useState([]);
  const [allPicks, setAllPicks] = useState({});
  const [busy, setBusy] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const timeLocked = now >= LOCK_TIME;
  const locked = timeLocked || !!config?.locked;

  useEffect(() => {
    (async () => {
      const [m, res, cfg, profs] = await Promise.all([
        sget(KEY.me, false), sget(KEY.results, true), sget(KEY.config, true), sget(KEY.profiles, true),
      ]);
      setResults(mergeOfficialResults(res || { groups: {} }));
      if (cfg) setConfigState(cfg);
      if (profs) setProfiles(profs);
      if (m) { setMe(m); const mine = await sget(KEY.picks(m.id), true); if (mine) setPicks(mine); }
      setBooting(false);
    })();
  }, []);

  const loadAll = useCallback(async () => {
    setBusy(true);
    const profs = (await sget(KEY.profiles, true)) || [];
    setProfiles(profs);
    const entries = await Promise.all(profs.map(async (p) => [p.id, await sget(KEY.picks(p.id), true)]));
    setAllPicks(Object.fromEntries(entries));
    const res = await sget(KEY.results, true); setResults(mergeOfficialResults(res || { groups: {} }));
    setBusy(false);
  }, []);
  useEffect(() => { if (tab === "leaderboard" || tab === "poll") loadAll(); }, [tab, loadAll]);

  async function createProfile(data) {
    const profile = { id: (crypto.randomUUID?.() || String(Date.now()) + Math.random()), ...data };
    await sset(KEY.me, profile, false);
    const profs = (await sget(KEY.profiles, true)) || [];
    if (!profs.some((p) => p.id === profile.id)) await sset(KEY.profiles, [...profs, profile], true);
    await sset(KEY.picks(profile.id), { groups: {}, champion: "", scorer: undefined }, true);
    setProfiles((cur) => cur.some((p) => p.id === profile.id) ? cur : [...cur, profile]);
    setPicks({ groups: {}, champion: "", scorer: undefined });
    setMe(profile);
  }
  async function loginProfile(prof) {
    await sset(KEY.me, prof, false);
    const mine = await sget(KEY.picks(prof.id), true);
    setPicks(mine || { groups: {}, champion: "", scorer: undefined });
    setMe(prof);
  }

  const persistPicks = useCallback((next) => { setPicks(next); if (me) sset(KEY.picks(me.id), next, true); }, [me]);
  const setPick = (id, o) => persistPicks({ ...picks, groups: { ...picks.groups, [id]: picks.groups?.[id] === o ? undefined : o } });
  const setChampion = (c) => persistPicks({ ...picks, champion: picks.champion === c ? "" : c });
  const setScorer = (s) => persistPicks({ ...picks, scorer: s });

  const setConfig = async (c) => { setConfigState(c); await sset(KEY.config, c, true); };
  const setLocked = (v) => setConfig({ ...config, locked: v });
  const saveResults = async (r) => { setResults(mergeOfficialResults(r)); await sset(KEY.results, r, true); };
  const savePicksFor = async (id, p) => { await sset(KEY.picks(id), p, true); setAllPicks((cur) => ({ ...cur, [id]: p })); if (me && id === me.id) setPicks(p); };

  // Editar MI propio perfil (emoji, nombre, color)
  const updateMyProfile = async (changes) => {
    const profs = (await sget(KEY.profiles, true)) || [];
    const next = profs.map((p) => p.id === me.id ? { ...p, ...changes } : p);
    await sset(KEY.profiles, next, true);
    setProfiles(next);
    const upd = next.find((p) => p.id === me.id);
    setMe(upd); await sset(KEY.me, upd, false);
  };
  const changeMyPassword = async (newPw) => {
    const hash = await hashPw(newPw);
    await updateMyProfile({ pwHash: hash });
  };

  const resetPassword = async (id, newPw) => {
    const hash = await hashPw(newPw);
    const profs = (await sget(KEY.profiles, true)) || [];
    const next = profs.map((p) => p.id === id ? { ...p, pwHash: hash } : p);
    await sset(KEY.profiles, next, true);
    setProfiles(next);
    if (me && me.id === id) { const upd = next.find((p) => p.id === id); setMe(upd); await sset(KEY.me, upd, false); }
  };
  const deleteProfile = async (id) => {
    const profs = (await sget(KEY.profiles, true)) || [];
    const next = profs.filter((p) => p.id !== id);
    await sset(KEY.profiles, next, true);
    await sdel(KEY.picks(id));
    setProfiles(next);
    setAllPicks((cur) => { const c = { ...cur }; delete c[id]; return c; });
    if (me && me.id === id) { await sdel(KEY.me); setMe(null); setTab("groups"); }
  };

  if (booting) return (<div className="porra"><Styles /><div className="loadwrap">Cargando la porra…</div></div>);

  // Vista de ORGANIZADOR (acceso independiente desde la pantalla inicial)
  if (isAdmin) {
    return (
      <div className="porra">
        <Styles />
        <div className="topbar">
          <div className="topbar-in">
            <div className="brand"><span className="cup" style={{ display: "inline-flex" }}><Crest s={34} /></span>
              <div><h1>Panel del organizador</h1><small>Porra Mundial 2026</small></div></div>
            <div className="me-chip">
              <div className="av" style={{ background: "var(--ink)", width: 24, height: 24, fontSize: 13 }}>🛡️</div>Organizador
              <button onClick={() => { setIsAdmin(false); setTab("groups"); }}>salir</button>
            </div>
          </div>
        </div>
        <div className="wrap">
          <AdminView config={config} setConfig={setConfig} results={results} saveResults={saveResults} locked={locked} setLocked={setLocked} timeLocked={timeLocked} profiles={profiles} allPicks={allPicks} savePicksFor={savePicksFor} resetPassword={resetPassword} deleteProfile={deleteProfile} onRefresh={loadAll} />
        </div>
      </div>
    );
  }

  if (!me) return (<div className="porra"><Styles /><Onboarding profiles={profiles} onCreate={createProfile} onLogin={loginProfile} onAdmin={() => { setIsAdmin(true); loadAll(); }} /></div>);

  return (
    <div className="porra">
      <Styles />
      <div className="topbar">
        <div className="topbar-in">
          <div className="brand"><span className="cup" style={{ display: "inline-flex" }}><Crest s={34} /></span>
            <div><h1>Porra Mundial 2026</h1><small>EE. UU. · México · Canadá</small></div></div>
          <div className="me-chip">
            <div className="av" style={avatarStyle(me.color, { width: 24, height: 24, fontSize: 13 })}>{me.avatar}</div>{me.name}
            <button onClick={async () => { if (confirm("¿Salir de tu perfil? Podrás volver a entrar con tu contraseña.")) { await sdel(KEY.me); setMe(null); setTab("groups"); } }}>salir</button>
          </div>
        </div>
        <div className="tabs">{TABS.map(([id, label, Icon]) => (
          <button key={id} className={`tab ${tab === id ? "on" : ""}`} onClick={() => setTab(id)}><Icon s={16} />{label}</button>))}
        </div>
      </div>
      <div className="wrap">
        {tab === "groups" && <GroupsView picks={picks} setPick={setPick} results={results} locked={locked} now={now} timeLocked={timeLocked} />}
        {tab === "specials" && <SpecialsView picks={picks} setChampion={setChampion} setScorer={setScorer} results={results} locked={locked} />}
        {tab === "poll" && <PollView profiles={profiles} allPicks={allPicks} loading={busy} onRefresh={loadAll} />}
        {tab === "leaderboard" && <Leaderboard profiles={profiles} allPicks={allPicks} results={results} meId={me.id} onRefresh={loadAll} loading={busy} />}
        {tab === "profile" && <ProfileEditor me={me} profiles={profiles} onSave={updateMyProfile} onChangePassword={changeMyPassword} />}
        {tab === "rules" && <Rules />}
      </div>
      <nav className="bottomnav">
        {TABS.map(([id, label, Icon]) => (
          <button key={id} className={tab === id ? "on" : ""} onClick={() => { setTab(id); window.scrollTo({ top: 0 }); }}>
            <span className="bn-ic"><Icon s={20} /></span>{label}
          </button>
        ))}
      </nav>
    </div>
  );
}