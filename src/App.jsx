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
   - result: "" si aún no hay resultado. Admite dos formatos:
       · Marcador exacto: "2-0", "1-1", "0-3"…  ► recomendado: permite calcular
         la diferencia de goles en la clasificación de grupos.
       · Solo signo: "1" gana local, "X" empate, "2" gana visitante.
   - kickoffSpain: hora de inicio en España, formato "AAAA-MM-DDTHH:mm:ss+02:00".
     Si lo dejas vacío, ese partido no aparecerá en la cuenta atrás del bloque principal.
   Los valores escritos aquí tienen prioridad sobre los resultados guardados desde el panel admin.
   ------------------------------------------------------------------------ */
const MATCH_CONTROL = {
  // ——— Jornada del jueves, 11 de junio ———
  A0: { kickoffSpain: "2026-06-11T21:00:00+02:00", result: "2-0" }, // México - Sudáfrica
  A1: { kickoffSpain: "2026-06-12T04:00:00+02:00", result: "2-1" }, // Corea del Sur - República Checa
  // ——— Jornada del viernes, 12 de junio ———
  B0: { kickoffSpain: "2026-06-12T21:00:00+02:00", result: "1-1" }, // Canadá - Bosnia y Herzeg.
  D0: { kickoffSpain: "2026-06-13T03:00:00+02:00", result: "4-1" }, // Estados Unidos - Paraguay
  // ——— Jornada del sábado, 13 de junio ———
  B1: { kickoffSpain: "2026-06-13T21:00:00+02:00", result: "1-1" }, // Catar - Suiza
  C0: { kickoffSpain: "2026-06-14T00:00:00+02:00", result: "1-1" }, // Brasil - Marruecos
  C1: { kickoffSpain: "2026-06-14T03:00:00+02:00", result: "0-1" }, // Haití - Escocia
  D1: { kickoffSpain: "2026-06-14T06:00:00+02:00", result: "2-0" }, // Australia - Turquía
  // ——— Jornada del domingo, 14 de junio ———
  E0: { kickoffSpain: "2026-06-14T19:00:00+02:00", result: "7-1" }, // Alemania - Curazao
  F0: { kickoffSpain: "2026-06-14T22:00:00+02:00", result: "2-2" }, // Países Bajos - Japón
  E1: { kickoffSpain: "2026-06-15T01:00:00+02:00", result: "1-0" }, // Costa de Marfil - Ecuador
  F1: { kickoffSpain: "2026-06-15T04:00:00+02:00", result: "5-1" }, // Suecia - Túnez
  // ——— Jornada del lunes, 15 de junio ———
  H0: { kickoffSpain: "2026-06-15T18:00:00+02:00", result: "0-0" }, // España - Cabo Verde
  G0: { kickoffSpain: "2026-06-15T21:00:00+02:00", result: "1-1" }, // Bélgica - Egipto
  H1: { kickoffSpain: "2026-06-16T00:00:00+02:00", result: "1-1" }, // Arabia Saudí - Uruguay
  G1: { kickoffSpain: "2026-06-16T03:00:00+02:00", result: "2-2" }, // Irán - Nueva Zelanda
  // ——— Jornada del martes, 16 de junio ———
  I0: { kickoffSpain: "2026-06-16T21:00:00+02:00", result: "3-1" }, // Francia - Senegal
  I1: { kickoffSpain: "2026-06-17T00:00:00+02:00", result: "1-4" }, // Irak - Noruega
  J1: { kickoffSpain: "2026-06-17T03:00:00+02:00", result: "3-1" }, // Austria - Jordania
  J0: { kickoffSpain: "2026-06-17T03:00:00+02:00", result: "3-0" }, // Argentina - Argelia
  // ——— Jornada del miércoles, 17 de junio ———
  K0: { kickoffSpain: "2026-06-17T19:00:00+02:00", result: "1-1" }, // Portugal - RD del Congo
  L0: { kickoffSpain: "2026-06-17T22:00:00+02:00", result: "4-2" }, // Inglaterra - Croacia
  L1: { kickoffSpain: "2026-06-18T01:00:00+02:00", result: "1-0" }, // Ghana - Panamá
  K1: { kickoffSpain: "2026-06-18T04:00:00+02:00", result: "1-3" }, // Uzbekistán - Colombia
  // ——— Jornada del jueves, 18 de junio ———
  A2: { kickoffSpain: "2026-06-18T18:00:00+02:00", result: "1-1" }, // República Checa - Sudáfrica
  B2: { kickoffSpain: "2026-06-18T21:00:00+02:00", result: "4-1" }, // Suiza - Bosnia y Herzeg.
  B3: { kickoffSpain: "2026-06-19T00:00:00+02:00", result: "6-0" }, // Canadá - Catar
  A3: { kickoffSpain: "2026-06-19T03:00:00+02:00", result: "1-0" }, // México - Corea del Sur
  // ——— Jornada del viernes, 19 de junio ———
  D2: { kickoffSpain: "2026-06-19T21:00:00+02:00", result: "2-0" }, // Estados Unidos - Australia
  C2: { kickoffSpain: "2026-06-20T00:00:00+02:00", result: "0-1" }, // Escocia - Marruecos
  // ——— Jornada del sábado, 20 de junio ———
  C3: { kickoffSpain: "2026-06-20T19:00:00+02:00", result: "3-0" }, // Brasil - Haití
  D3: { kickoffSpain: "2026-06-20T22:00:00+02:00", result: "0-1" }, // Turquía - Paraguay
  F2: { kickoffSpain: "2026-06-20T19:00:00+02:00", result: "5-1" }, // Países Bajos - Suecia
  E2: { kickoffSpain: "2026-06-20T22:00:00+02:00", result: "2-1" }, // Alemania - Costa de Marfil
  // ——— Jornada del domingo, 21 de junio ———
  E3: { kickoffSpain: "2026-06-21T18:00:00+02:00", result: "0-0" }, // Ecuador - Curazao
  F3: { kickoffSpain: "2026-06-21T21:00:00+02:00", result: "0-4" }, // Túnez - Japón
  H2: { kickoffSpain: "2026-06-21T18:00:00+02:00", result: "4-0" }, // España - Arabia Saudí
  G2: { kickoffSpain: "2026-06-21T21:00:00+02:00", result: "0-0" }, // Bélgica - Irán
  H3: { kickoffSpain: "2026-06-22T00:00:00+02:00", result: "2-2" }, // Uruguay - Cabo Verde
  G3: { kickoffSpain: "2026-06-22T03:00:00+02:00", result: "1-3" }, // Nueva Zelanda - Egipto
  // ——— Jornada del lunes, 22 de junio ———
  J2: { kickoffSpain: "2026-06-22T19:00:00+02:00", result: "" }, // Argentina - Austria
  I2: { kickoffSpain: "2026-06-22T21:00:00+02:00", result: "" }, // Francia - Irak
  I3: { kickoffSpain: "2026-06-23T00:00:00+02:00", result: "" }, // Noruega - Senegal
  J3: { kickoffSpain: "2026-06-23T03:00:00+02:00", result: "" }, // Jordania - Argelia
  // ——— Jornada del martes, 23 de junio ———
  K2: { kickoffSpain: "2026-06-23T17:00:00+02:00", result: "" }, // Portugal - Uzbekistán
  L2: { kickoffSpain: "2026-06-23T20:00:00+02:00", result: "" }, // Inglaterra - Ghana
  L3: { kickoffSpain: "2026-06-23T23:00:00+02:00", result: "" }, // Panamá - Croacia
  K3: { kickoffSpain: "2026-06-24T02:00:00+02:00", result: "" }, // Colombia - RD del Congo
  // ——— Jornada del miércoles, 24 de junio ———
  B4: { kickoffSpain: "2026-06-24T19:00:00+02:00", result: "" }, // Suiza - Canadá
  B5: { kickoffSpain: "2026-06-24T19:00:00+02:00", result: "" }, // Bosnia y Herzeg. - Catar
  C4: { kickoffSpain: "2026-06-24T22:00:00+02:00", result: "" }, // Escocia - Brasil
  C5: { kickoffSpain: "2026-06-24T22:00:00+02:00", result: "" }, // Marruecos - Haití
  A4: { kickoffSpain: "2026-06-25T01:00:00+02:00", result: "" }, // República Checa - México
  A5: { kickoffSpain: "2026-06-25T01:00:00+02:00", result: "" }, // Sudáfrica - Corea del Sur
  // ——— Jornada del jueves, 25 de junio ———
  E4: { kickoffSpain: "2026-06-25T20:00:00+02:00", result: "" }, // Curazao - Costa de Marfil
  E5: { kickoffSpain: "2026-06-25T20:00:00+02:00", result: "" }, // Ecuador - Alemania
  F4: { kickoffSpain: "2026-06-25T23:00:00+02:00", result: "" }, // Japón - Suecia
  F5: { kickoffSpain: "2026-06-25T23:00:00+02:00", result: "" }, // Túnez - Países Bajos
  D4: { kickoffSpain: "2026-06-26T02:00:00+02:00", result: "" }, // Turquía - Estados Unidos
  D5: { kickoffSpain: "2026-06-26T02:00:00+02:00", result: "" }, // Paraguay - Australia
  // ——— Jornada del viernes, 26 de junio ———
  I4: { kickoffSpain: "2026-06-26T19:00:00+02:00", result: "" }, // Noruega - Francia
  I5: { kickoffSpain: "2026-06-26T19:00:00+02:00", result: "" }, // Senegal - Irak
  H4: { kickoffSpain: "2026-06-27T00:00:00+02:00", result: "" }, // Cabo Verde - Arabia Saudí
  H5: { kickoffSpain: "2026-06-27T00:00:00+02:00", result: "" }, // Uruguay - España
  G4: { kickoffSpain: "2026-06-27T03:00:00+02:00", result: "" }, // Egipto - Irán
  G5: { kickoffSpain: "2026-06-27T03:00:00+02:00", result: "" }, // Nueva Zelanda - Bélgica
  // ——— Jornada del sábado, 27 de junio ———
  L4: { kickoffSpain: "2026-06-27T21:00:00+02:00", result: "" }, // Panamá - Inglaterra
  L5: { kickoffSpain: "2026-06-27T21:00:00+02:00", result: "" }, // Croacia - Ghana
  K4: { kickoffSpain: "2026-06-27T23:30:00+02:00", result: "" }, // Colombia - Portugal
  K5: { kickoffSpain: "2026-06-27T23:30:00+02:00", result: "" }, // RD del Congo - Uzbekistán
  J4: { kickoffSpain: "2026-06-28T02:00:00+02:00", result: "" }, // Argelia - Austria
  J5: { kickoffSpain: "2026-06-28T02:00:00+02:00", result: "" }, // Jordania - Argentina
};

const FINAL_RESULTS = {
  champion: "", // Código de selección campeona, por ejemplo: "ESP"
  scorer: "",   // Nombre exacto del máximo goleador, por ejemplo: "Kylian Mbappé"
};
const MATCH_DURATION_MS = 2 * 60 * 60 * 1000; // 2 h: durante ese margen el hero mostrará "En juego".

/* Acepta "1"/"X"/"2" o un marcador "h-a" (también "h:a"). Devuelve el signo
   y, si hay marcador, los goles (para mostrar el resultado y la dif. de goles). */
function parseMatchResult(value) {
  const v = String(value || "").trim().toUpperCase();
  if (["1", "X", "2"].includes(v)) return { sign: v, score: null };
  const m = v.match(/^(\d{1,2})\s*[-:]\s*(\d{1,2})$/);
  if (m) {
    const h = +m[1], a = +m[2];
    return { sign: h > a ? "1" : h < a ? "2" : "X", score: { h, a } };
  }
  return null;
}
function buildCodeResults() {
  const groups = {};
  const scores = {};
  Object.entries(MATCH_CONTROL).forEach(([id, cfg]) => {
    const parsed = parseMatchResult(cfg?.result);
    if (parsed) {
      groups[id] = parsed.sign;
      if (parsed.score) scores[id] = parsed.score;
    }
  });
  return {
    groups,
    scores,
    champion: FINAL_RESULTS.champion || "",
    scorer: FINAL_RESULTS.scorer || "",
  };
}
function mergeOfficialResults(stored = {}) {
  const code = buildCodeResults();
  return {
    ...(stored || {}),
    groups: { ...((stored || {}).groups || {}), ...code.groups },
    scores: { ...((stored || {}).scores || {}), ...code.scores },
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

/* ------------------ CLASIFICACIÓN DE GRUPOS + DIECISEISAVOS --------------
   Cuadro OFICIAL FIFA de dieciseisavos (Mundial 2026, partidos 73-88).
   Los huecos de terceros indican de qué grupos puede venir cada tercero.   */
const R32_BRACKET = [
  { id:"M73", n:73, home:{type:"runner", group:"A"}, away:{type:"runner", group:"B"} },
  { id:"M74", n:74, home:{type:"winner", group:"E"}, away:{type:"third", groups:["A","B","C","D","F"]} },
  { id:"M75", n:75, home:{type:"winner", group:"F"}, away:{type:"runner", group:"C"} },
  { id:"M76", n:76, home:{type:"winner", group:"C"}, away:{type:"runner", group:"F"} },
  { id:"M77", n:77, home:{type:"winner", group:"I"}, away:{type:"third", groups:["C","D","F","G","H"]} },
  { id:"M78", n:78, home:{type:"runner", group:"E"}, away:{type:"runner", group:"I"} },
  { id:"M79", n:79, home:{type:"winner", group:"A"}, away:{type:"third", groups:["C","E","F","H","I"]} },
  { id:"M80", n:80, home:{type:"winner", group:"L"}, away:{type:"third", groups:["E","H","I","J","K"]} },
  { id:"M81", n:81, home:{type:"winner", group:"D"}, away:{type:"third", groups:["B","E","F","I","J"]} },
  { id:"M82", n:82, home:{type:"winner", group:"G"}, away:{type:"third", groups:["A","E","H","I","J"]} },
  { id:"M83", n:83, home:{type:"runner", group:"K"}, away:{type:"runner", group:"L"} },
  { id:"M84", n:84, home:{type:"winner", group:"H"}, away:{type:"runner", group:"J"} },
  { id:"M85", n:85, home:{type:"winner", group:"B"}, away:{type:"third", groups:["E","F","G","I","J"]} },
  { id:"M86", n:86, home:{type:"winner", group:"J"}, away:{type:"runner", group:"H"} },
  { id:"M87", n:87, home:{type:"winner", group:"K"}, away:{type:"third", groups:["D","E","I","J","L"]} },
  { id:"M88", n:88, home:{type:"runner", group:"D"}, away:{type:"runner", group:"G"} },
];

/* Calcula la tabla de cada grupo a partir de los resultados (3-1-0 pts).
   Si el resultado tiene marcador ("2-0"), suma goles y ordena por puntos →
   diferencia de goles → goles a favor → victorias → enfrentamiento directo.
   El organizador puede corregir cualquier orden desde su panel (overrides). */
function computeGroupStandings(results, overrides) {
  const out = {};
  for (const g of Object.keys(GROUPS)) {
    const stats = {};
    GROUPS[g].forEach((c) => { stats[c] = { code: c, pj: 0, w: 0, d: 0, l: 0, pts: 0, gf: 0, ga: 0, gd: 0 }; });
    const matches = GROUP_MATCHES.filter((m) => m.group === g);
    matches.forEach((m) => {
      const r = results?.groups?.[m.id];
      if (!r) return;
      stats[m.home].pj++; stats[m.away].pj++;
      if (r === "1") { stats[m.home].w++; stats[m.home].pts += 3; stats[m.away].l++; }
      else if (r === "2") { stats[m.away].w++; stats[m.away].pts += 3; stats[m.home].l++; }
      else { stats[m.home].d++; stats[m.away].d++; stats[m.home].pts++; stats[m.away].pts++; }
      const sc = results?.scores?.[m.id];
      if (sc) {
        stats[m.home].gf += sc.h; stats[m.home].ga += sc.a;
        stats[m.away].gf += sc.a; stats[m.away].ga += sc.h;
      }
    });
    GROUPS[g].forEach((c) => { stats[c].gd = stats[c].gf - stats[c].ga; });
    const h2h = (a, b) => {
      const m = matches.find((x) => (x.home === a && x.away === b) || (x.home === b && x.away === a));
      const r = m ? results?.groups?.[m.id] : null;
      if (!r || r === "X") return 0;
      const winner = r === "1" ? m.home : m.away;
      return winner === a ? 1 : -1;
    };
    let order;
    const ov = overrides?.[g];
    if (Array.isArray(ov) && ov.length === 4 && ov.every((c) => GROUPS[g].includes(c)) && new Set(ov).size === 4) {
      order = ov;
    } else {
      order = [...GROUPS[g]].sort((a, b) =>
        stats[b].pts - stats[a].pts || stats[b].gd - stats[a].gd || stats[b].gf - stats[a].gf ||
        stats[b].w - stats[a].w || h2h(b, a) ||
        GROUPS[g].indexOf(a) - GROUPS[g].indexOf(b));
    }
    out[g] = { rows: order.map((c) => stats[c]), manual: Array.isArray(ov) && ov.length === 4 };
  }
  return out;
}

/* Ranking de terceros: pasan los 8 mejores (puntos → dif. goles → goles →
   victorias → letra de grupo). */
function rankThirds(standings) {
  return Object.keys(GROUPS)
    .map((g) => ({ group: g, ...standings[g].rows[2] }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || b.w - a.w || a.group.localeCompare(b.group));
}

/* Asigna cada tercero clasificado a su hueco del cuadro respetando los grupos
   permitidos en cada partido (emparejamiento por backtracking). */
function assignThirdsToSlots(qualifiedGroups) {
  const slots = R32_BRACKET.filter((m) => m.away.type === "third")
    .map((m) => ({ id: m.id, allowed: m.away.groups.filter((g) => qualifiedGroups.includes(g)) }))
    .sort((a, b) => a.allowed.length - b.allowed.length);
  const assign = {}; const used = new Set();
  const bt = (i) => {
    if (i === slots.length) return true;
    for (const g of slots[i].allowed) {
      if (used.has(g)) continue;
      used.add(g); assign[slots[i].id] = g;
      if (bt(i + 1)) return true;
      used.delete(g); delete assign[slots[i].id];
    }
    return false;
  };
  if (!bt(0)) {
    const pool = qualifiedGroups.filter((g) => !used.has(g));
    slots.forEach((s) => { if (!assign[s.id] && pool.length) assign[s.id] = pool.shift(); });
  }
  return assign;
}
const fmtGd = (gd) => (gd > 0 ? `+${gd}` : String(gd));
/* ===================== ELIMINATORIAS: CALENDARIO Y RESOLUCIÓN ============
   Cuadro completo (dieciseisavos → final) con horas oficiales en España.
   Cada partido se "abre" para votar cuando se conocen sus dos equipos y se
   cierra 24 h antes del inicio. Dieciseisavos: equipos desde la clasificación
   de grupos. Rondas siguientes: ganador/perdedor oficial del partido previo
   (results.knockout: { Mxx: {h,a} }). Cruces verificados con el fixture FIFA. */
const KO_CLOSE_MS = 24 * 60 * 60 * 1000; // se cierra 24 h antes del inicio
const KO_ROUNDS = { r32: "Dieciseisavos", r16: "Octavos", qf: "Cuartos", sf: "Semifinales", third: "3.er puesto", final: "Final" };
const KO_MATCHES = [
  // Dieciseisavos (orden cronológico). Equipos desde la clasificación de grupos.
  // Horarios oficiales (openfootball worldcup.json) convertidos a hora de España (CEST).
  { id:"M73",  round:"r32",   ko:"2026-06-28T21:00:00+02:00", home:{type:"runner",group:"A"}, away:{type:"runner",group:"B"} },
  { id:"M76",  round:"r32",   ko:"2026-06-29T19:00:00+02:00", home:{type:"winner",group:"C"}, away:{type:"runner",group:"F"} },
  { id:"M74",  round:"r32",   ko:"2026-06-29T22:30:00+02:00", home:{type:"winner",group:"E"}, away:{type:"third",groups:["A","B","C","D","F"]} },
  { id:"M75",  round:"r32",   ko:"2026-06-30T03:00:00+02:00", home:{type:"winner",group:"F"}, away:{type:"runner",group:"C"} },
  { id:"M78",  round:"r32",   ko:"2026-06-30T19:00:00+02:00", home:{type:"runner",group:"E"}, away:{type:"runner",group:"I"} },
  { id:"M77",  round:"r32",   ko:"2026-06-30T23:00:00+02:00", home:{type:"winner",group:"I"}, away:{type:"third",groups:["C","D","F","G","H"]} },
  { id:"M79",  round:"r32",   ko:"2026-07-01T03:00:00+02:00", home:{type:"winner",group:"A"}, away:{type:"third",groups:["C","E","F","H","I"]} },
  { id:"M80",  round:"r32",   ko:"2026-07-01T18:00:00+02:00", home:{type:"winner",group:"L"}, away:{type:"third",groups:["E","H","I","J","K"]} },
  { id:"M82",  round:"r32",   ko:"2026-07-01T22:00:00+02:00", home:{type:"winner",group:"G"}, away:{type:"third",groups:["A","E","H","I","J"]} },
  { id:"M81",  round:"r32",   ko:"2026-07-02T02:00:00+02:00", home:{type:"winner",group:"D"}, away:{type:"third",groups:["B","E","F","I","J"]} },
  { id:"M84",  round:"r32",   ko:"2026-07-02T21:00:00+02:00", home:{type:"winner",group:"H"}, away:{type:"runner",group:"J"} },
  { id:"M83",  round:"r32",   ko:"2026-07-03T01:00:00+02:00", home:{type:"runner",group:"K"}, away:{type:"runner",group:"L"} },
  { id:"M85",  round:"r32",   ko:"2026-07-03T05:00:00+02:00", home:{type:"winner",group:"B"}, away:{type:"third",groups:["E","F","G","I","J"]} },
  { id:"M88",  round:"r32",   ko:"2026-07-03T20:00:00+02:00", home:{type:"runner",group:"D"}, away:{type:"runner",group:"G"} },
  { id:"M86",  round:"r32",   ko:"2026-07-04T00:00:00+02:00", home:{type:"winner",group:"J"}, away:{type:"runner",group:"H"} },
  { id:"M87",  round:"r32",   ko:"2026-07-04T03:30:00+02:00", home:{type:"winner",group:"K"}, away:{type:"third",groups:["D","E","I","J","L"]} },
  // Octavos (ganadores de dieciseisavos) — local/visitante según el JSON oficial.
  { id:"M90",  round:"r16",   ko:"2026-07-04T19:00:00+02:00", home:{type:"wmatch",match:"M73"}, away:{type:"wmatch",match:"M75"} },
  { id:"M89",  round:"r16",   ko:"2026-07-04T23:00:00+02:00", home:{type:"wmatch",match:"M74"}, away:{type:"wmatch",match:"M77"} },
  { id:"M91",  round:"r16",   ko:"2026-07-05T22:00:00+02:00", home:{type:"wmatch",match:"M76"}, away:{type:"wmatch",match:"M78"} },
  { id:"M92",  round:"r16",   ko:"2026-07-06T02:00:00+02:00", home:{type:"wmatch",match:"M79"}, away:{type:"wmatch",match:"M80"} },
  { id:"M93",  round:"r16",   ko:"2026-07-06T21:00:00+02:00", home:{type:"wmatch",match:"M83"}, away:{type:"wmatch",match:"M84"} },
  { id:"M94",  round:"r16",   ko:"2026-07-07T02:00:00+02:00", home:{type:"wmatch",match:"M81"}, away:{type:"wmatch",match:"M82"} },
  { id:"M95",  round:"r16",   ko:"2026-07-07T18:00:00+02:00", home:{type:"wmatch",match:"M86"}, away:{type:"wmatch",match:"M88"} },
  { id:"M96",  round:"r16",   ko:"2026-07-07T22:00:00+02:00", home:{type:"wmatch",match:"M85"}, away:{type:"wmatch",match:"M87"} },
  // Cuartos
  { id:"M97",  round:"qf",    ko:"2026-07-09T22:00:00+02:00", home:{type:"wmatch",match:"M89"}, away:{type:"wmatch",match:"M90"} },
  { id:"M98",  round:"qf",    ko:"2026-07-10T21:00:00+02:00", home:{type:"wmatch",match:"M93"}, away:{type:"wmatch",match:"M94"} },
  { id:"M99",  round:"qf",    ko:"2026-07-11T23:00:00+02:00", home:{type:"wmatch",match:"M91"}, away:{type:"wmatch",match:"M92"} },
  { id:"M100", round:"qf",    ko:"2026-07-12T03:00:00+02:00", home:{type:"wmatch",match:"M95"}, away:{type:"wmatch",match:"M96"} },
  // Semifinales
  { id:"M101", round:"sf",    ko:"2026-07-14T21:00:00+02:00", home:{type:"wmatch",match:"M97"}, away:{type:"wmatch",match:"M98"} },
  { id:"M102", round:"sf",    ko:"2026-07-15T21:00:00+02:00", home:{type:"wmatch",match:"M99"}, away:{type:"wmatch",match:"M100"} },
  // Tercer puesto (perdedores de semifinales)
  { id:"M103", round:"third", ko:"2026-07-18T23:00:00+02:00", home:{type:"lmatch",match:"M101"}, away:{type:"lmatch",match:"M102"} },
  // Final
  { id:"M104", round:"final", ko:"2026-07-19T21:00:00+02:00", home:{type:"wmatch",match:"M101"}, away:{type:"wmatch",match:"M102"} },
];

const KO_BY_ID = Object.fromEntries(KO_MATCHES.map((m) => [m.id, m]));
function getKoKickoffMs(id) {
  const raw = KO_BY_ID[id]?.ko;
  const t = raw ? Date.parse(raw) : NaN;
  return Number.isNaN(t) ? null : t;
}

/* Resuelve los códigos de equipo (o null) de cada partido de eliminatoria. */
/* ¿Están jugados los 6 partidos de un grupo? ¿Y los de todos los grupos? */
function groupComplete(results, g) {
  return GROUP_MATCHES.filter((m) => m.group === g).every((m) => !!results?.groups?.[m.id]);
}
function allGroupsComplete(results) {
  return GROUP_MATCHES.every((m) => !!results?.groups?.[m.id]);
}

/* Resuelve los códigos de equipo (o null) de cada partido de eliminatoria.
   Con gate=true, un cruce solo se resuelve cuando sus equipos están CONFIRMADOS:
   - 1.º/2.º de un grupo: solo si ese grupo está cerrado (6/6 partidos jugados).
   - 3.º (mejores terceros): solo cuando TODOS los grupos están cerrados (el
     ranking de terceros es global). Mientras tanto devuelve null y el cruce
     ni aparece ni se puede votar. Con gate=false (cuadro de la pestaña Grupos)
     se muestran los cruces provisionales según la clasificación actual. */
function computeKnockoutTeams(results, standings, thirdAssign, gate = false) {
  const koRes = results?.knockout || {};
  const teams = {};
  const winLose = (mid, wantWinner) => {
    const t = teams[mid], r = koRes[mid];
    if (!t || !r || t.home == null || t.away == null) return null;
    if (typeof r.h !== "number" || typeof r.a !== "number") return null;
    let homeWins;
    if (r.w === "home" || r.w === "away") homeWins = r.w === "home"; // quién pasó (penaltis/prórroga)
    else if (r.h === r.a) return null;                               // empate a 90' sin desempate definido
    else homeWins = r.h > r.a;
    return (wantWinner ? homeWins : !homeWins) ? t.home : t.away;
  };
  const resolve = (slot, mid) => {
    if (!slot) return null;
    switch (slot.type) {
      case "winner": if (gate && !groupComplete(results, slot.group)) return null; return standings?.[slot.group]?.rows?.[0]?.code ?? null;
      case "runner": if (gate && !groupComplete(results, slot.group)) return null; return standings?.[slot.group]?.rows?.[1]?.code ?? null;
      case "third": { if (gate && !allGroupsComplete(results)) return null; const g = thirdAssign?.[mid]; return g ? (standings?.[g]?.rows?.[2]?.code ?? null) : null; }
      case "wmatch": return winLose(slot.match, true);
      case "lmatch": return winLose(slot.match, false);
      default: return null;
    }
  };
  for (const m of KO_MATCHES) {
    teams[m.id] = { home: resolve(m.home, m.id), away: resolve(m.away, m.id) };
  }
  return teams;
}

/* Estado de voto de un partido de eliminatoria. */
function koVoteState(matchId, teams, now) {
  const t = teams?.[matchId];
  const ko = getKoKickoffMs(matchId);
  const known = !!(t && t.home && t.away);
  const closeAt = ko != null ? ko - KO_CLOSE_MS : null;
  const open = known && closeAt != null && now < closeAt;       // se puede votar
  const revealed = closeAt != null && now >= closeAt;            // cerrado: se revela quién votó qué
  return { known, open, revealed, ko, closeAt };
}

/* Puntos por aciertos en eliminatorias (signo + bonus por marcador exacto). */
function computeKoScore(picks, results) {
  let pts = 0, scored = 0;
  const koRes = results?.knockout || {};
  for (const m of KO_MATCHES) {
    const r = koRes[m.id];
    if (!r || typeof r.h !== "number" || typeof r.a !== "number") continue;
    scored++;
    const p = picks?.knockout?.[m.id];
    if (!p || typeof p.h !== "number" || typeof p.a !== "number") continue;
    const rule = SCORING.knockout[m.round];
    if (!rule) continue;
    const rsign = r.h > r.a ? "1" : r.h < r.a ? "2" : "X";
    const psign = p.h > p.a ? "1" : p.h < p.a ? "2" : "X";
    if (psign === rsign) pts += rule.sign;
    if (p.h === r.h && p.a === r.a) pts += rule.exact;
  }
  return { pts, scored };
}



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
.flag{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;overflow:hidden;flex:0 0 auto;aspect-ratio:1/1;
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
.next-match-list{display:grid;gap:8px;margin:6px 0 8px;min-width:0;width:100%;max-width:520px}
.next-match-row{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:10px;min-width:0;width:100%;
  background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.20);border-radius:13px;padding:9px 12px;
  font-weight:700;font-size:16.5px;line-height:1.15}
.next-team{display:flex;align-items:center;gap:8px;min-width:0;max-width:100%}
.next-team.away{flex-direction:row-reverse;text-align:right}
.next-team .flag{flex:0 0 auto;
  box-shadow:0 2px 6px rgba(0,0,0,.35), inset 0 0 0 1.5px rgba(255,255,255,.95), 0 0 0 2px rgba(255,255,255,.4)}
.next-team-name{display:block;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.next-vs{color:rgba(255,255,255,.6);white-space:nowrap;flex:none;padding:0 2px;font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.next-kickoff{grid-column:1 / -1;color:rgba(255,255,255,.72);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}
/* Votantes por opción dentro del marcador del hero */
.hero-votes{grid-column:1 / -1;display:grid;grid-template-columns:1fr auto 1fr;align-items:start;gap:18px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.18)}
.hero-votes .hv-col{display:flex;flex-direction:column;align-items:flex-start;gap:3px;min-width:0}
.hero-votes .hv-col.mid{align-items:center}
.hero-votes .hv-col.mid.has{padding:0 14px;border-left:1px solid rgba(255,255,255,.18);border-right:1px solid rgba(255,255,255,.18)}
.hero-votes .hv-col.away{align-items:flex-end}
.hv-draw{font-size:9.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.65)}
.hero-voters{display:flex;flex-wrap:wrap;gap:3px;justify-content:inherit}
.hero-votes .hv-col.mid .hero-voters{justify-content:center}
.hero-votes .hv-col.away .hero-voters{justify-content:flex-end}
.hero-voter .av{width:22px;height:22px;font-size:12px;box-shadow:0 1px 3px rgba(0,0,0,.35),inset 0 0 0 1.5px rgba(255,255,255,.85)}

.banner{margin-top:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:var(--clay-soft);border:1px solid #C9D4FF;border-radius:14px;padding:12px 16px;font-size:14px}
.banner b{color:var(--clay-d)}
.banner.flat{background:var(--paper2);border-color:var(--line)}
.banner.locked{background:#F1E9DC;border-color:var(--line)}

.prog-track{height:9px;background:var(--line2);border-radius:99px;overflow:hidden}
.prog-fill{height:100%;background:linear-gradient(90deg,var(--clay),#E0876A);border-radius:99px;transition:width .4s ease}

/* puntuación flotante (pestaña Grupos) */
.float-score{position:fixed;right:16px;bottom:16px;z-index:35;display:flex;align-items:center;gap:10px;
  background:var(--card);border:1px solid var(--line);border-radius:999px;padding:7px 16px 7px 7px;
  box-shadow:0 8px 28px rgba(16,20,46,.22);animation:fsIn .35s ease}
.float-score .av{width:34px;height:34px;font-size:17px}
.fs-label{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink2);line-height:1.2}
.fs-pts{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:19px;line-height:1.15;font-variant-numeric:tabular-nums}
.fs-pts small{font-family:'Archivo',sans-serif;font-size:11px;font-weight:600;color:var(--ink2);margin-left:3px}
.fs-sep{width:1px;align-self:stretch;background:var(--line);margin:2px 1px}
@keyframes fsIn{from{transform:translateY(8px);opacity:0}to{transform:none;opacity:1}}
@media (prefers-reduced-motion: reduce){.float-score{animation:none}}

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
.poll{display:grid;grid-template-columns:28px 1fr 46px;align-items:center;gap:9px;margin-top:8px}
.poll .lab{font-weight:800;font-size:12.5px;width:28px;height:24px;border-radius:8px;display:grid;place-items:center;background:var(--line2);color:var(--ink2);transition:background .2s,color .2s}
.poll .bar{height:24px;background:var(--line2);border-radius:8px;overflow:hidden}
.poll .fill{height:100%;border-radius:8px;transition:width .5s;opacity:.5}
.poll.lead .fill{opacity:1}
.poll .pc{text-align:right;font-weight:700;font-size:13px;font-variant-numeric:tabular-nums;color:var(--ink2)}
.poll.lead .pc{color:var(--ink);font-weight:800}
.poll.zero{opacity:.45}
.poll-n{text-align:center;font-size:11.5px;color:var(--ink2);margin-top:10px}
.poll-voters{display:flex;flex-wrap:wrap;gap:4px;margin:5px 0 2px 37px}
.poll-voter{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--line2);background:var(--paper);border-radius:999px;padding:2px 8px 2px 3px;font-size:11.5px;font-weight:600;color:var(--ink)}
.poll-voter .av{width:18px;height:18px;font-size:10px}
.poll-voter .vmark{font-weight:800;margin-left:1px}
.poll-voter.correct{background:#E3F5EC;border-color:#A5DCC0;color:#0B7A43}
.poll-voter.correct .vmark{color:#0B7A43}
.poll-voter.wrong{background:#FBECE9;border-color:#EBC4BB;color:var(--clay-d);opacity:.92}
.poll-voter.wrong .vmark{color:var(--red)}
.poll.win-opt .bar{box-shadow:inset 0 0 0 2px var(--green)}
.poll.win-opt .pc{color:var(--green);font-weight:800}

/* Respuestas: cabeceras de día */
.day-h{display:flex;align-items:center;gap:10px;margin:24px 2px 10px}
.day-h .chip{background:var(--ink);color:var(--paper);border-radius:9px;padding:4px 11px;font-weight:700;font-family:'Space Grotesk',sans-serif;font-size:13px;text-transform:capitalize}
.day-h .sub{color:var(--ink2);font-size:12.5px}
.day-h .ln{flex:1;height:1px;background:var(--line)}

/* Admin: selector de quién ve la clasificación para compartir */
.viewer-toggle{font-size:12.5px;font-weight:700;border-radius:99px;padding:7px 13px;border:1px solid var(--line);color:var(--ink2);background:var(--paper2);white-space:nowrap}
.viewer-toggle.on{background:var(--clay-soft);border-color:var(--clay);color:var(--clay-d)}
.share-pre{margin:0;background:var(--paper2);border:1px solid var(--line);border-radius:12px;padding:14px 16px;font-size:13.5px;line-height:1.7;white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}

/* Eliminatorias: tablas de grupo y cuadro */
.stand-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px;margin-top:12px}
.stand-card{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.stand-card .sc-h{display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid var(--line2);font-weight:700;font-size:13.5px}
.stand-card .sc-h .badge{background:var(--ink);color:var(--paper);width:24px;height:24px;border-radius:7px;display:grid;place-items:center;font-weight:700;font-family:'Space Grotesk',sans-serif;font-size:13px}
.stand-row{display:flex;align-items:center;gap:8px;padding:6px 12px;font-size:13px;border-bottom:1px solid var(--line2)}
.stand-row:last-child{border-bottom:none}
.stand-row .pos{width:16px;text-align:center;font-weight:700;font-family:'Space Grotesk',sans-serif;color:var(--ink2)}
.stand-row.q1 .pos,.stand-row.q2 .pos{color:var(--green)}
.stand-row.q3 .pos{color:var(--gold)}
.stand-row .snm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.stand-row .spts{font-weight:700;font-variant-numeric:tabular-nums;font-family:'Space Grotesk',sans-serif}
.stand-row .sgd{color:var(--ink2);font-size:11.5px;font-variant-numeric:tabular-nums;width:28px;text-align:right}
.stand-row .spj{color:var(--ink2);font-size:11.5px;font-variant-numeric:tabular-nums;width:30px;text-align:right}
.manual-tag{margin-left:auto;font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;background:var(--clay-soft);color:var(--clay-d);border-radius:99px;padding:2px 8px}
.ko-match{padding:12px 14px;border-bottom:1px solid var(--line2)}
.ko-match:last-child{border-bottom:none}
.ko-n{font-size:10.5px;color:var(--ink2);font-weight:800;letter-spacing:.06em;text-transform:uppercase;margin-bottom:7px}
.ko-duel{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:9px}
.ko-side{display:flex;align-items:center;gap:8px;min-width:0}
.ko-side.away{flex-direction:row-reverse;text-align:right}
.ko-side .nm{font-weight:600;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ko-side .slot{display:block;font-size:10.5px;color:var(--ink2);font-weight:700;letter-spacing:.03em}
.ko-vs{color:var(--ink2);font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.ord-btns{display:flex;gap:4px;margin-left:auto}
.ord-btns button{width:30px;height:30px;border-radius:8px;border:1px solid var(--line);background:var(--paper2);font-size:13px;color:var(--ink2)}
.ord-btns button:hover:not(:disabled){border-color:var(--clay);color:var(--clay-d)}
.ord-btns button:disabled{opacity:.35;cursor:default}

/* Tabla de goleadores */
.scorer-row{display:flex;align-items:center;gap:9px;padding:9px 13px;border-bottom:1px solid var(--line2);flex-wrap:wrap}
.scorer-row:last-child{border-bottom:none}
.scorer-row .pos{width:18px;text-align:center;font-weight:700;font-family:'Space Grotesk',sans-serif;color:var(--ink2)}
.scorer-row.leader .pos{color:var(--gold)}
.scorer-row .snm{flex:1;min-width:90px;font-weight:600;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.scorer-row .sgoals{font-family:'Space Grotesk',sans-serif;font-weight:700;font-variant-numeric:tabular-nums;font-size:15px}
.scorer-row .sgoals small{font-family:'Archivo',sans-serif;font-size:11px;font-weight:600;color:var(--ink2)}
.scorer-backers{display:flex;flex-wrap:wrap;gap:4px;flex-basis:100%;margin-left:27px}
.scorer-missing{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:11px 13px;background:var(--paper2)}
.scorer-missing .lbl{font-size:11.5px;color:var(--ink2);font-weight:700;width:100%}

/* Eliminatorias: votación con steppers verticales y respuestas */
.ko-vote{padding:12px 14px}
.ko-vote-h{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.ko-round{font-weight:800;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:var(--clay-d);background:var(--clay-soft);border-radius:8px;padding:2px 9px}
.ko-when{font-size:12px;color:var(--ink2);font-weight:600}
/* local · marcador (steppers) · visitante */
.ko-duel-vote{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;padding:4px 0 2px}
.kv-team{display:flex;align-items:center;gap:8px;min-width:0}
.kv-team.away{flex-direction:row-reverse;text-align:right}
.kv-team .nm{font-weight:600;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kv-center{display:flex;align-items:center;gap:10px;flex:none}
.kv-stepper{display:flex;flex-direction:column;align-items:center;gap:6px}
.kv-num{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:26px;line-height:1;font-variant-numeric:tabular-nums;min-width:22px;text-align:center}
.kv-dash{font-weight:700;color:var(--ink2);font-size:18px}
.ko-pm{border:1.5px solid var(--line);background:var(--paper2);color:var(--clay-d);width:48px;height:30px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:800;line-height:1;padding:0;transition:transform .08s, background .15s, border-color .15s}
.ko-pm:hover:not(:disabled){border-color:var(--clay);background:var(--clay-soft)}
.ko-pm:active:not(:disabled){transform:scale(.92)}
.ko-pm:disabled{opacity:.4;cursor:default}
.ko-vote-foot{margin-top:9px;font-size:12px;color:var(--ink2);text-align:center}
.ko-vote-foot b{color:var(--ink)}
.ko-answer{padding:12px 14px}
.ko-answer-empty{font-size:12.5px;color:var(--ink2);padding:6px 0}
.kv-pred{margin-left:4px;font-variant-numeric:tabular-nums}
/* acierto exacto: dorado */
.poll-voter.exact{background:#FCF3D6;border-color:#E8C95B;color:#8A6D00}
.poll-voter.exact .vmark{color:#C79A00}
/* Móvil: tarjeta de voto de eliminatoria — equipos arriba, marcador grande debajo */
@media(max-width:560px){
  .ko-duel-vote{grid-template-columns:1fr 1fr;grid-template-areas:"home away" "center center";row-gap:14px;column-gap:8px}
  .kv-team{grid-area:home}
  .kv-team.away{grid-area:away}
  .kv-center{grid-area:center;justify-content:center;gap:16px}
  .ko-pm{width:64px;height:36px;font-size:22px;border-radius:13px}
  .kv-num{font-size:32px;min-width:28px}
  .kv-team .nm{font-size:13.5px}
}



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

  /* Puntuación flotante por encima de la barra inferior */
  .float-score{ right:12px; bottom:calc(72px + env(safe-area-inset-bottom)); }

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
  .next-match-row{ font-size:15px; gap:7px; max-width:100%; padding:8px 10px; }
  .next-team{ gap:6px; }

  /* Chips de votantes del sondeo con la sangría justa */
  .poll-voters{ margin-left:37px; }

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
        <p className="note" style={{ textAlign: "center", marginTop: 14 }}>Comparte este enlace con el grupo: todos compiten en la misma clasificación.</p>
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
function HeroCountdown({ now, timeLocked, results, profiles = [], allPicks = {} }) {
  const matchInfo = getCurrentMatchInfo(now, results);
  const bg = IMAGES.HERO_BG_URL;
  const matches = matchInfo?.rows || [];
  const many = matches.length > 1;
  const hasDifferentKickoffs = many && matches.some((row) => row.kickoffMs !== matchInfo.kickoffMs);
  const statusLabel = matchInfo?.status === "live"
    ? (many ? "Partidos en juego" : "Partido en juego")
    : (many ? "Próximos partidos" : "Próximo partido");
  const countdownText = matchInfo?.status === "live" ? "En juego" : (matchInfo ? fmtCountdown(matchInfo.kickoffMs - now) : "Sin horario");

  // Reparte los participantes según su pronóstico (1·X·2) para un partido.
  const votersByPick = (matchId) => {
    const out = { "1": [], "X": [], "2": [] };
    profiles.forEach((p) => {
      const v = allPicks?.[p.id]?.groups?.[matchId];
      if (v && out[v]) out[v].push(p);
    });
    return out;
  };
  const Chips = ({ list }) => (
    <span className="hero-voters">
      {list.map((p) => (
        <span className="hero-voter" key={p.id} title={p.name}>
          <span className="av" style={avatarStyle(p.color)}>{p.avatar}</span>
        </span>
      ))}
    </span>
  );

  return (
    <div className={`hero ${bg ? "has-bg" : ""}`}
      style={bg ? { backgroundImage: `url(${bg})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
      <Bunting />
      <div className="hero-body" style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <Crest s={72} />
        <div style={{ flex: 1, minWidth: 220, maxWidth: "100%" }}>
        <div className="countdown">
          {matches.length ? (
            <>
              <span style={{ color: "var(--lime)", display: "inline-flex", flex: "0 0 auto" }}><Ball s={22} /></span>
              <div style={{ flex: "1 1 0", minWidth: 0, maxWidth: "100%" }}>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.7)", fontWeight: 700 }}>{statusLabel}</div>
                <div className="next-match-list">
                  {matches.map(({ match, kickoffMs }) => {
                    const vb = votersByPick(match.id);
                    const anyVotes = vb["1"].length + vb["X"].length + vb["2"].length > 0;
                    return (
                    <div key={match.id} className="next-match-row">
                      <span className="next-team" title={TEAMS[match.home].name}>
                        <Flag code={match.home} size={26} />
                        <span className="next-team-name">{TEAMS[match.home].name}</span>
                      </span>

                      <span className="next-vs">vs</span>

                      <span className="next-team away" title={TEAMS[match.away].name}>
                        <Flag code={match.away} size={26} />
                        <span className="next-team-name">{TEAMS[match.away].name}</span>
                      </span>

                      {hasDifferentKickoffs && (
                        <span className="next-kickoff">{fmtSpainKickoff(kickoffMs)}</span>
                      )}

                      {anyVotes && (
                        <div className="hero-votes">
                          <span className="hv-col"><Chips list={vb["1"]} /></span>
                          <span className={`hv-col mid ${vb["X"].length > 0 ? "has" : ""}`}>
                            {vb["X"].length > 0 && <span className="hv-draw">empate</span>}
                            <Chips list={vb["X"]} />
                          </span>
                          <span className="hv-col away"><Chips list={vb["2"]} /></span>
                        </div>
                      )}
                    </div>
                    );
                  })}
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
function GroupsView({ picks, setPick, results, locked, embedded = false }) {
  const [g, setG] = useState("A");
  const groupMatches = GROUP_MATCHES.filter((m) => m.group === g);
  const done = GROUP_MATCHES.filter((m) => picks.groups?.[m.id]).length;
  const groupDone = (gl) => GROUP_MATCHES.filter((m) => m.group === gl && picks.groups?.[m.id]).length === 6;
  return (
    <div>
      {!embedded && (
        <div className="section-h"><div className="ttl"><span className="ic"><Ball /></span><h2>Fase de grupos</h2></div>
          <p>Marca <b>1</b> (gana el local), <b>X</b> (empate) o <b>2</b> (gana el visitante) en cada partido.</p></div>
      )}

      {locked && !embedded && <div className="banner locked">🔒 <b>Pronósticos cerrados.</b> Ya no se pueden modificar las selecciones.</div>}

      <div className="card" style={{ padding: "15px 16px", marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>
          <span>Tu progreso</span><span>{done} / {GROUP_MATCHES.length} partidos</span></div>
        <div className="prog-track"><div className="prog-fill" style={{ width: `${(done / GROUP_MATCHES.length) * 100}%` }} /></div>
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
              {res && <div className="result-tag">Resultado oficial: <b>{results?.scores?.[m.id] ? `${results.scores[m.id].h}-${results.scores[m.id].a} (${res})` : res}</b> · {sel ? (sel === res ? <b className="ok">+{SCORING.group} pts</b> : <b className="no">0 pts</b>) : "sin pronóstico"}</div>}
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

/* =============================== RESPUESTAS ============================= */
function pct(n, total) { return total ? Math.round((n / total) * 100) : 0; }
const VOTE_COL = { "1": "var(--blue)", "X": "var(--ink2)", "2": "var(--green)" };

/* Agrupación por día de juego. Un "día" va de las 06:00 (hora España) a las
   06:00 del día siguiente, así los partidos de madrugada cuentan con la
   jornada anterior. */
function answerDayKey(kickoffMs) {
  if (kickoffMs == null) return "9999-12-31";
  const shifted = new Date(kickoffMs - 6 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(shifted);
}
function answerDayLabel(key) {
  if (key === "9999-12-31") return "Sin horario";
  const d = new Date(`${key}T12:00:00`);
  return new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(d);
}

/* Bloque de votos de un partido: barras 1·X·2 + quién ha votado cada opción.
   Si se pasa `result` (signo oficial), marca la opción ganadora y distingue
   visualmente los perfiles que acertaron de los que fallaron. */
function MatchVotes({ m, voters, kickoffMs, result, score, phaseLabel }) {
  const concluded = !!result;
  let c = { "1": 0, "X": 0, "2": 0 }, tot = 0;
  const optionVoters = { "1": [], "X": [], "2": [] };
  voters.forEach(({ profile, picks }) => {
    const v = picks?.groups?.[m.id];
    if (v && optionVoters[v]) { c[v]++; tot++; optionVoters[v].push(profile); }
  });
  const max = Math.max(c["1"], c["X"], c["2"]);
  return (
    <div className="match">
      {phaseLabel ? (
        <div className="ko-vote-h" style={{ marginBottom: 8 }}>
          <span className="ko-round">{phaseLabel}</span>
          {kickoffMs != null && <span className="ko-when">{fmtSpainKickoff(kickoffMs)} · hora España</span>}
        </div>
      ) : (
        kickoffMs != null && <div className="match-md"><Ball s={13} /> {fmtSpainKickoff(kickoffMs)} · hora España</div>
      )}
      <div className="duel duel-poll">
        <div className="side"><Flag code={m.home} size={24} /><span className="nm">{TEAMS[m.home].name}</span></div>
        <span className="note" style={{ fontWeight: 700 }}>{concluded && score ? `${score.h} - ${score.a}` : "vs"}</span>
        <div className="side away"><Flag code={m.away} size={24} /><span className="nm">{TEAMS[m.away].name}</span></div>
      </div>
      {concluded && <div className="result-tag" style={{ marginTop: 0, marginBottom: 4 }}>Resultado oficial: <b>{score ? `${score.h}-${score.a} (${result})` : result}</b></div>}
      {["1", "X", "2"].map((o) => {
        const isWinner = concluded && o === result;
        const lead = !concluded && tot > 0 && c[o] === max && c[o] > 0;
        const zero = tot > 0 && c[o] === 0;
        return (
          <div key={o}>
            <div className={`poll ${lead ? "lead" : ""} ${isWinner ? "win-opt" : ""} ${zero && !isWinner ? "zero" : ""}`}>
              <span className="lab" style={(c[o] > 0 || isWinner) ? { background: VOTE_COL[o], color: "#fff" } : undefined}>{o}</span>
              <div className="bar"><div className="fill" style={{ width: `${pct(c[o], tot)}%`, background: VOTE_COL[o] }} /></div>
              <span className="pc">{isWinner ? "✓ " : ""}{pct(c[o], tot)}%</span>
            </div>
            {optionVoters[o].length > 0 && (
              <div className="poll-voters">
                {optionVoters[o].map((profile) => (
                  <span className={`poll-voter ${concluded ? (isWinner ? "correct" : "wrong") : ""}`} key={`${m.id}-${o}-${profile.id}`}>
                    <span className="av" style={avatarStyle(profile.color)}>{profile.avatar}</span>{profile.name}
                    {concluded && <span className="vmark">{isWinner ? "✓" : "✕"}</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div className="poll-n">{tot} voto{tot === 1 ? "" : "s"}{concluded ? ` · ${c[result] || 0} acert${(c[result] || 0) === 1 ? "ó" : "aron"}` : ""}</div>
    </div>
  );
}

/* Pestaña Respuestas:
   · Partidos: une fase de grupos y eliminatorias en una lista única, con dos
     sub-subpestañas — Próximos partidos (más próximo arriba) y Partidos
     concluidos (más reciente arriba). Cada partido lleva su etiqueta de fase.
   · Goleadores. */
function AnswersView({ profiles, allPicks, results, config, now, loading, onRefresh }) {
  const [view, setView] = useState("matches"); // matches | scorers
  const [sub, setSub] = useState("next");       // next | done
  const voters = profiles.map((profile) => ({ profile, picks: allPicks[profile.id] }));

  const standings = useMemo(() => computeGroupStandings(results, config?.standingsOverride), [results, config]);
  const thirds = useMemo(() => rankThirds(standings), [standings]);
  const thirdAssign = useMemo(() => assignThirdsToSlots(thirds.slice(0, 8).map((t) => t.group)), [thirds]);
  const koTeams = useMemo(() => computeKnockoutTeams(results, standings, thirdAssign, true), [results, standings, thirdAssign]);

  // Lista única de partidos (grupos + eliminatorias con equipos ya conocidos).
  const rows = useMemo(() => {
    const g = GROUP_MATCHES.map((m) => ({ kind: "group", id: m.id, m, ko: getKickoffMs(m.id), concluded: !!results?.groups?.[m.id] }));
    const k = KO_MATCHES
      .map((m) => ({ kind: "ko", id: m.id, m, ko: getKoKickoffMs(m.id), known: !!(koTeams[m.id]?.home && koTeams[m.id]?.away), concluded: !!results?.knockout?.[m.id] }))
      .filter((r) => r.known);
    return [...g, ...k];
  }, [results, koTeams]);

  const upcoming = useMemo(() => rows.filter((r) => !r.concluded).sort((a, b) => (a.ko ?? Infinity) - (b.ko ?? Infinity)), [rows]);
  const concluded = useMemo(() => rows.filter((r) => r.concluded).sort((a, b) => (b.ko ?? -Infinity) - (a.ko ?? -Infinity)), [rows]);
  const list = sub === "done" ? concluded : upcoming;

  const renderRow = (r) => r.kind === "group"
    ? (
      <div className="card" key={r.id}>
        <MatchVotes m={r.m} voters={voters} kickoffMs={r.ko} phaseLabel="Fase de grupos"
          result={results?.groups?.[r.id]} score={results?.scores?.[r.id]} />
      </div>
    )
    : <KoAnswerCard key={r.id} m={r.m} teams={koTeams} voters={voters} now={now} official={results?.knockout?.[r.id]} />;

  return (
    <div>
      <div className="section-h" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div><div className="ttl"><span className="ic"><Poll /></span><h2>Respuestas</h2></div>
          <p>Qué ha votado cada perfil, partido a partido.</p></div>
        <button className="btn ghost" style={{ padding: "8px 14px", fontSize: 13 }} onClick={onRefresh} disabled={loading}>{loading ? "…" : "↻"}</button>
      </div>

      <div className="seg" style={{ marginTop: 14 }}>
        <button className={view === "matches" ? "on" : ""} onClick={() => setView("matches")}>Partidos</button>
        <button className={view === "scorers" ? "on" : ""} onClick={() => setView("scorers")}>Goleadores</button>
      </div>

      {view === "scorers" ? (
        <>
          <div className="glabel" style={{ marginTop: 18 }}><span className="badge"><Boot s={17} /></span><h3>Goleadores</h3><span className="sp">Bota de Oro · ✓ acierta la apuesta</span></div>
          <ScorersTable results={results} profiles={profiles} allPicks={allPicks} limit={30} />
        </>
      ) : (
        <>
          <div className="seg" style={{ marginTop: 10 }}>
            <button className={sub === "next" ? "on" : ""} onClick={() => setSub("next")}>Próximos partidos</button>
            <button className={sub === "done" ? "on" : ""} onClick={() => setSub("done")}>Partidos concluidos</button>
          </div>
          <div className="banner flat">👥 {profiles.length} participante{profiles.length === 1 ? "" : "s"} · {list.length} partido{list.length === 1 ? "" : "s"}{sub === "next" ? " por jugar" : " con resultado"}.</div>
          {list.length === 0 ? (
            <div className="empty" style={{ marginTop: 12 }}>{sub === "next" ? "No hay partidos próximos." : "Aún no hay partidos con resultado."}</div>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {list.map(renderRow)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ============================ TABLA DE GOLEADORES =========================
   Se alimenta de results.scorers (lo rellena el cron desde openfootball:
   [{ name, code, goals }] ya ordenado de más a menos goles). Marca con ✓/✗
   qué perfiles acertaron su apuesta de Bota de Oro (campo picks.scorer),
   comparando el nombre apostado con los goleadores reales. */
function normName(s) {
  return (s || "").toString().trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
// ¿el nombre apostado coincide con algún goleador real? (match flexible por apellido)
function scorerMatches(pick, realName) {
  const p = normName(pick), r = normName(realName);
  if (!p || !r) return false;
  if (p === r) return true;
  // coincidencia por inclusión (p. ej. "Mbappé" dentro de "Kylian Mbappé")
  if (r.includes(p) || p.includes(r)) return true;
  // por último token (apellido)
  const pl = p.split(/\s+/).pop(), rl = r.split(/\s+/).pop();
  return pl && rl && pl === rl && pl.length >= 4;
}
function ScorersTable({ results, profiles, allPicks, compact = false, limit = 0 }) {
  const scorers = results?.scorers || [];
  // apuestas de Bota de Oro de cada perfil (las que tienen valor)
  const bets = (profiles || [])
    .map((p) => ({ profile: p, pick: (allPicks?.[p.id]?.scorer || "").trim() }))
    .filter((b) => b.pick);
  const topGoals = scorers.length ? scorers[0].goals : 0;
  const rows = limit > 0 ? scorers.slice(0, limit) : scorers;

  if (scorers.length === 0) {
    return <div className="empty" style={{ padding: compact ? 18 : 30 }}>Aún no hay goles registrados.</div>;
  }
  return (
    <div className="card">
      {rows.map((s, i) => {
        const leader = s.goals === topGoals;
        // perfiles que apostaron por este goleador
        const backers = bets.filter((b) => scorerMatches(b.pick, s.name));
        return (
          <div className={`scorer-row ${leader ? "leader" : ""}`} key={`${s.name}-${i}`}>
            <span className="pos">{i + 1}</span>
            {s.code && TEAMS[s.code] ? <Flag code={s.code} size={20} /> : <span style={{ width: 20 }} />}
            <span className="snm">{s.name}</span>
            <span className="sgoals">{s.goals}<small> {s.goals === 1 ? "gol" : "goles"}</small></span>
            {backers.length > 0 && (
              <span className="scorer-backers">
                {backers.map((b) => (
                  <span className="poll-voter correct" key={b.profile.id} title={`${b.profile.name} apostó por ${b.pick}`}>
                    <span className="av" style={avatarStyle(b.profile.color)}>{b.profile.avatar}</span>{b.profile.name}<span className="vmark">✓</span>
                  </span>
                ))}
              </span>
            )}
          </div>
        );
      })}
      {bets.length > 0 && (() => {
        // perfiles cuya apuesta NO está (todavía) entre los goleadores reales
        const missing = bets.filter((b) => !scorers.some((s) => scorerMatches(b.pick, s.name)));
        if (missing.length === 0) return null;
        return (
          <div className="scorer-missing">
            <span className="lbl">Apuestas que aún no han marcado:</span>
            {missing.map((b) => (
              <span className="poll-voter wrong" key={b.profile.id} title={`${b.profile.name} apostó por ${b.pick}`}>
                <span className="av" style={avatarStyle(b.profile.color)}>{b.profile.avatar}</span>{b.pick}<span className="vmark">✗</span>
              </span>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

/* ===================== ELIMINATORIAS: VOTACIÓN Y RESPUESTAS ============== */
// Stepper vertical de goles: botón triangular (+) arriba, número, botón cónico (−) abajo.
function KoStepV({ value, onDec, onInc, disabled }) {
  return (
    <div className="kv-stepper">
      <button type="button" className="ko-pm up" onClick={onInc} disabled={disabled || value >= 20} aria-label="Añadir gol">+</button>
      <span className="kv-num">{value}</span>
      <button type="button" className="ko-pm down" onClick={onDec} disabled={disabled || value <= 0} aria-label="Quitar gol">−</button>
    </div>
  );
}
// Tarjeta para votar (o, en admin, fijar) el marcador de un partido de eliminatoria.
// Local a la izquierda · marcador con steppers en el centro · visitante a la derecha.
function KoVoteCard({ m, teams, pick, onChange, now = null, disabled = false, adminTag = false }) {
  const t = teams[m.id];
  if (!t || !t.home || !t.away) return null;
  const h = pick?.h ?? 0, a = pick?.a ?? 0;
  const set = (nh, na) => onChange(m.id, { h: Math.max(0, Math.min(20, nh)), a: Math.max(0, Math.min(20, na)) });
  const st = now != null ? koVoteState(m.id, teams, now) : null;
  return (
    <div className="card ko-vote">
      <div className="ko-vote-h">
        <span className="ko-round">{KO_ROUNDS[m.round]}</span>
        <span className="ko-when">{fmtSpainKickoff(getKoKickoffMs(m.id))} · hora España</span>
      </div>
      <div className="ko-duel-vote">
        <div className="kv-team"><Flag code={t.home} size={28} /><span className="nm">{TEAMS[t.home].name}</span></div>
        <div className="kv-center">
          <KoStepV value={h} disabled={disabled} onDec={() => set(h - 1, a)} onInc={() => set(h + 1, a)} />
          <span className="kv-dash">-</span>
          <KoStepV value={a} disabled={disabled} onDec={() => set(h, a - 1)} onInc={() => set(h, a + 1)} />
        </div>
        <div className="kv-team away"><span className="nm">{TEAMS[t.away].name}</span><Flag code={t.away} size={28} /></div>
      </div>
      {adminTag ? (
        <div className="ko-vote-foot">Resultado oficial: <b>{h} - {a}</b></div>
      ) : st && st.closeAt != null && now < st.closeAt ? (
        <div className="ko-vote-foot">Tu pronóstico: <b>{h} - {a}</b> · se cierra en <b>{fmtCountdown(st.closeAt - now)}</b></div>
      ) : (
        <div className="ko-vote-foot">Tu pronóstico: <b>{h} - {a}</b></div>
      )}
    </div>
  );
}

// Tarjeta de respuestas de un cruce, con el formato de barras 1·X·2.
// Cada pronóstico se traduce a signo (1/X/2) según el marcador previsto.
// Anónimo hasta el cierre (24 h antes): solo barras, sin nombres ni marcadores.
// Tras el cierre: cada perfil aparece dentro de su barra con el resultado que puso.
// Con resultado oficial: ✕ a los que fallan el signo, ✓ verde a los que lo aciertan,
// y ✓✓ dorado (con su marcador) a los que clavan el resultado exacto.
function KoAnswerCard({ m, teams, voters, now, official }) {
  const t = teams[m.id];
  if (!t || !t.home || !t.away) return null;
  const st = koVoteState(m.id, teams, now);
  const sign = (p) => (p.h > p.a ? "1" : p.h < p.a ? "2" : "X");
  const preds = voters
    .map(({ profile, picks }) => ({ profile, p: picks?.knockout?.[m.id] }))
    .filter((x) => x.p && typeof x.p.h === "number" && typeof x.p.a === "number")
    .map((x) => ({ ...x, s: sign(x.p) }));
  const c = { "1": 0, "X": 0, "2": 0 };
  const byOpt = { "1": [], "X": [], "2": [] };
  preds.forEach((x) => { c[x.s]++; byOpt[x.s].push(x); });
  const tot = preds.length;
  const max = Math.max(c["1"], c["X"], c["2"]);
  const rsign = official ? sign(official) : null;
  const revealed = st.revealed;
  const isExact = (p) => official && p.h === official.h && p.a === official.a;

  return (
    <div className="card ko-answer">
      <div className="ko-vote-h">
        <span className="ko-round">{KO_ROUNDS[m.round]}</span>
        <span className="ko-when">
          {fmtSpainKickoff(st.ko)}
          {official ? ` · oficial ${official.h}-${official.a}`
            : revealed ? " · cerrado"
            : st.closeAt != null ? ` · se cierra en ${fmtCountdown(st.closeAt - now)}` : ""}
        </span>
      </div>
      <div className="duel duel-poll">
        <div className="side"><Flag code={t.home} size={24} /><span className="nm">{TEAMS[t.home].name}</span></div>
        <span className="note" style={{ fontWeight: 700 }}>{official ? `${official.h} - ${official.a}` : "vs"}</span>
        <div className="side away"><Flag code={t.away} size={24} /><span className="nm">{TEAMS[t.away].name}</span></div>
      </div>

      {tot === 0 ? (
        <div className="ko-answer-empty">Nadie ha pronosticado aún.</div>
      ) : ["1", "X", "2"].map((o) => {
        const isWinner = !!official && o === rsign;
        const lead = !official && tot > 0 && c[o] === max && c[o] > 0;
        const zero = tot > 0 && c[o] === 0;
        return (
          <div key={o}>
            <div className={`poll ${lead ? "lead" : ""} ${isWinner ? "win-opt" : ""} ${zero && !isWinner ? "zero" : ""}`}>
              <span className="lab" style={(c[o] > 0 || isWinner) ? { background: VOTE_COL[o], color: "#fff" } : undefined}>{o}</span>
              <div className="bar"><div className="fill" style={{ width: `${pct(c[o], tot)}%`, background: VOTE_COL[o] }} /></div>
              <span className="pc">{isWinner ? "✓ " : ""}{pct(c[o], tot)}%</span>
            </div>
            {revealed && byOpt[o].length > 0 && (
              <div className="poll-voters">
                {byOpt[o].map((x) => {
                  const exact = isExact(x.p);
                  const correct = !!official && o === rsign;
                  const cls = !official ? "" : (exact ? "exact" : correct ? "correct" : "wrong");
                  // Marcador visible: mientras está cerrado sin resultado (todos), o si es acierto exacto.
                  const showScore = !official || exact;
                  return (
                    <span className={`poll-voter ${cls}`} key={x.profile.id} title={x.profile.name}>
                      <span className="av" style={avatarStyle(x.profile.color)}>{x.profile.avatar}</span>{x.profile.name}
                      {showScore && <b className="kv-pred">{x.p.h}-{x.p.a}</b>}
                      {official && <span className="vmark">{exact ? "✓✓" : correct ? "✓" : "✕"}</span>}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="poll-n">
        {tot} pronóstico{tot === 1 ? "" : "s"}
        {!revealed && tot > 0 ? " · anónimos hasta el cierre" : ""}
        {official ? ` · ${c[rsign] || 0} acert${(c[rsign] || 0) === 1 ? "ó" : "aron"} el signo` : ""}
      </div>
    </div>
  );
}

/* ================================ PORRA ================================
   Pestaña principal: hero + dos sub-pestañas.
   · Eliminatorias (principal): votar cada cruce en cuanto se conocen sus dos
     equipos (steppers +/-), del más próximo al más lejano; desaparece 24 h
     antes del inicio.
   · Fase de grupos: histórico de lo votado en grupos + apuestas especiales. */
function PorraView({ picks, setPick, setChampion, setScorer, setKoPick, results, config, locked, now, timeLocked, profiles, allPicks }) {
  const [view, setView] = useState("ko"); // ko | groups
  const standings = useMemo(() => computeGroupStandings(results, config?.standingsOverride), [results, config]);
  const thirds = useMemo(() => rankThirds(standings), [standings]);
  const thirdAssign = useMemo(() => assignThirdsToSlots(thirds.slice(0, 8).map((t) => t.group)), [thirds]);
  const teams = useMemo(() => computeKnockoutTeams(results, standings, thirdAssign, true), [results, standings, thirdAssign]);

  const votable = useMemo(() => KO_MATCHES
    .map((m) => ({ m, st: koVoteState(m.id, teams, now) }))
    .filter((x) => x.st.known && x.st.open)
    .sort((x, y) => (x.st.ko ?? Infinity) - (y.st.ko ?? Infinity)), [teams, now]);

  return (
    <div>
      <HeroCountdown now={now} timeLocked={timeLocked} results={results} profiles={profiles} allPicks={allPicks} />
      <div className="section-h"><div className="ttl"><span className="ic"><Trophy /></span><h2>Porra</h2></div>
        <p>Vota los cruces de eliminatorias y repasa lo que apostaste en la fase de grupos.</p></div>

      <div className="seg">
        <button className={view === "ko" ? "on" : ""} onClick={() => setView("ko")}>Eliminatorias</button>
        <button className={view === "groups" ? "on" : ""} onClick={() => setView("groups")}>Fase de grupos</button>
      </div>

      {view === "ko" ? (
        <div style={{ marginTop: 6 }}>
          <div className="banner flat">⚽ Cada cruce se abre para votar en cuanto se conocen los dos equipos y se cierra <b>24 h antes</b> del inicio. Usa los botones + / − para poner tu marcador.</div>
          {votable.length === 0 ? (
            <div className="empty" style={{ marginTop: 12 }}>Todavía no hay eliminatorias abiertas. Aparecerán aquí en cuanto se confirmen los cruces (al cerrarse los grupos correspondientes).</div>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {votable.map(({ m }) => (
                <KoVoteCard key={m.id} m={m} teams={teams} pick={picks.knockout?.[m.id]} onChange={setKoPick} now={now} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 6 }}>
          <div className="banner flat">📒 Histórico: esto es lo que apostaste en la fase de grupos y en las apuestas especiales (ya cerradas).</div>
          <GroupsView picks={picks} setPick={setPick} results={results} locked={locked} embedded />
          <div className="glabel" style={{ marginTop: 22 }}><span className="badge"><Trophy s={17} /></span><h3>Tus apuestas especiales</h3></div>
          <div className="card" style={{ padding: 16 }}>
            <div className="lb-sub" style={{ fontSize: 13.5 }}>🏆 Campeón: <b style={{ color: "var(--ink)" }}>{picks.champion ? TEAMS[picks.champion]?.name : "Sin apuesta"}</b></div>
            <div className="lb-sub" style={{ fontSize: 13.5, marginTop: 6 }}>⚽ Máximo goleador: <b style={{ color: "var(--ink)" }}>{(picks.scorer || "").trim() || "Sin apuesta"}</b></div>
            {results?.champion && <div className="note" style={{ marginTop: 8 }}>Campeón oficial: <b>{TEAMS[results.champion]?.name}</b></div>}
            {results?.scorer && <div className="note" style={{ marginTop: 4 }}>Bota de Oro oficial: <b>{results.scorer}</b></div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================ ELIMINATORIAS ==============================
   Clasificación de cada grupo (por resultado y goles), ranking de terceros y
   dieciseisavos autopopulados según el cuadro oficial FIFA. Provisional hasta
   que termine la fase de grupos; el organizador puede corregir las tablas. */
const BracketIcon = ({ s = 22 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 5h4M4 11h4M8 5v6M8 8h4M4 19h4M4 13v6M16 8h4M16 16h4M20 8v8M12 8v4h4M12 16h4" />
  </svg>
);
function KnockoutView({ results, config, profiles, allPicks }) {
  const standings = useMemo(() => computeGroupStandings(results, config?.standingsOverride), [results, config]);
  const thirds = useMemo(() => rankThirds(standings), [standings]);
  const qualifiedThirds = thirds.slice(0, 8).map((t) => t.group);
  const thirdAssign = useMemo(() => assignThirdsToSlots(qualifiedThirds), [standings]);
  const playedCount = GROUP_MATCHES.filter((m) => results?.groups?.[m.id]).length;
  const complete = playedCount === GROUP_MATCHES.length;

  const slotTeam = (slot, matchId) => {
    if (slot.type === "winner") return { code: standings[slot.group].rows[0].code, label: `1.º grupo ${slot.group}` };
    if (slot.type === "runner") return { code: standings[slot.group].rows[1].code, label: `2.º grupo ${slot.group}` };
    const g = thirdAssign[matchId];
    return { code: g ? standings[g].rows[2].code : null, label: `3.º ${slot.groups.join("/")}` };
  };

  return (
    <div>
      <div className="section-h"><div className="ttl"><span className="ic"><BracketIcon /></span><h2>Grupos</h2></div>
        <p>Clasificación de los grupos en vivo y cuadro de cruces resultante. Se calcula con los resultados oficiales (puntos y diferencia de goles).</p></div>

      {!complete && (
        <div className="banner">⏳ <b>Provisional:</b> con {playedCount}/{GROUP_MATCHES.length} resultados. Los cruces se ajustarán con cada partido y se confirmarán al cerrar la fase de grupos.</div>
      )}
      <div className="banner flat">ℹ️ Tabla por puntos y diferencia de goles (cuando el resultado tiene marcador, p. ej. "2-0"). Si un desempate queda mal resuelto, puede corregirse a mano.</div>

      <div className="glabel" style={{ marginTop: 20 }}><span className="badge"><Rank s={17} /></span><h3>Clasificación de los grupos</h3></div>
      <div className="stand-grid">
        {Object.keys(GROUPS).map((g) => (
          <div className="stand-card" key={g}>
            <div className="sc-h"><span className="badge">{g}</span>Grupo {g}{standings[g].manual && <span className="manual-tag">editado</span>}</div>
            {standings[g].rows.map((r, i) => (
              <div className={`stand-row q${i + 1}`} key={r.code}>
                <span className="pos">{i + 1}</span>
                <Flag code={r.code} size={20} />
                <span className="snm">{TEAMS[r.code].name}</span>
                <span className="spts">{r.pts} pts</span>
                <span className="sgd" title="Diferencia de goles">{fmtGd(r.gd)}</span>
                <span className="spj">{r.pj} PJ</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="note" style={{ marginTop: 10 }}>Pasan 1.º y 2.º de cada grupo y los 8 mejores terceros.</p>

      <div className="glabel" style={{ marginTop: 24 }}><span className="badge">3.º</span><h3>Ranking de terceros</h3><span className="sp">pasan los 8 primeros</span></div>
      <div className="card">
        {thirds.map((t, i) => (
          <div className="stand-row" key={t.group} style={i === 7 ? { borderBottom: "2px dashed var(--line)" } : undefined}>
            <span className="pos" style={{ color: i < 8 ? "var(--green)" : "var(--ink2)" }}>{i + 1}</span>
            <Flag code={t.code} size={20} />
            <span className="snm">{TEAMS[t.code].name} <span style={{ color: "var(--ink2)", fontWeight: 500 }}>· grupo {t.group}</span></span>
            <span className="spts">{t.pts} pts</span>
            <span className="sgd" title="Diferencia de goles">{fmtGd(t.gd)}</span>
            <span className="spj">{t.pj} PJ</span>
          </div>
        ))}
      </div>

      <div className="glabel" style={{ marginTop: 24 }}><span className="badge"><BracketIcon s={17} /></span><h3>Dieciseisavos de final</h3><span className="sp">cuadro oficial FIFA</span></div>
      <div className="card">
        {R32_BRACKET.map((m) => {
          const home = slotTeam(m.home, m.id), away = slotTeam(m.away, m.id);
          return (
            <div className="ko-match" key={m.id}>
              <div className="ko-n">Partido {m.n}</div>
              <div className="ko-duel">
                <div className="ko-side">
                  {home.code && <Flag code={home.code} size={24} />}
                  <span style={{ minWidth: 0 }}>
                    <span className="nm">{home.code ? TEAMS[home.code].name : "Por decidir"}</span>
                    <span className="slot">{home.label}</span>
                  </span>
                </div>
                <span className="ko-vs">vs</span>
                <div className="ko-side away">
                  {away.code && <Flag code={away.code} size={24} />}
                  <span style={{ minWidth: 0 }}>
                    <span className="nm">{away.code ? TEAMS[away.code].name : "Por decidir"}</span>
                    <span className="slot">{away.label}</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="glabel" style={{ marginTop: 24 }}><span className="badge"><Boot s={17} /></span><h3>Tabla de goleadores</h3><span className="sp">Bota de Oro en vivo</span></div>
      <ScorersTable results={results} profiles={profiles} allPicks={allPicks} limit={30} />

      <div className="lock-badge" style={{ marginTop: 14 }}>🔒 La porra de dieciseisavos se abrirá aquí cuando se confirmen los cruces</div>
    </div>
  );
}

/* ============================= CLASIFICACIÓN ============================ */
function computeScore(picks, results) {
  if (!picks || !results) return { total: 0, group: 0, special: 0, ko: 0, scored: 0 };
  let group = 0, scored = 0, special = 0;
  for (const m of GROUP_MATCHES) { const r = results.groups?.[m.id]; if (!r) continue; scored++; if (picks.groups?.[m.id] === r) group += SCORING.group; }
  const koSc = computeKoScore(picks, results);
  if (results.champion && picks.champion === results.champion) special += SCORING.champion;
  if (results.scorer && picks.scorer && picks.scorer.trim().toLowerCase() === results.scorer.trim().toLowerCase()) special += SCORING.scorer;
  return { total: group + special + koSc.pts, group, special, ko: koSc.pts, scored };
}

/* Puestos compartidos en empates: con totales [2,2,1] hay dos 1.º y un 3.º. */
function withSharedRanks(rows) {
  let lastTotal = null, lastPos = 0;
  return rows.map((r, i) => {
    const pos = r.total === lastTotal ? lastPos : i + 1;
    lastTotal = r.total; lastPos = pos;
    return { ...r, pos };
  });
}

/* Texto plano de la clasificación para copiar y pegar en el grupo. */
function buildShareText(profiles, allPicks, results) {
  const rows = withSharedRanks(profiles
    .map((p) => ({ ...p, ...computeScore(allPicks[p.id], results) }))
    .sort((a, b) => b.total - a.total));
  const date = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());
  return `> Clasificación Mundial 2026\n> ${date}\n` +
    rows.map((r) => `${r.pos}.${r.avatar} ${r.name} - ${r.total} punto${r.total === 1 ? "" : "s"}`).join("\n");
}

/* Bloque reutilizable: muestra el texto y un botón para copiarlo al portapapeles. */
function ShareBlock({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch {}
      document.body.removeChild(ta);
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="card" style={{ padding: 16, marginTop: 4 }}>
      <pre className="share-pre">{text}</pre>
      <button className="btn" style={{ width: "100%", marginTop: 12 }} onClick={copy}>
        {copied ? "✓ Copiado al portapapeles" : "Copiar al portapapeles"}</button>
    </div>
  );
}
function Leaderboard({ profiles, allPicks, results, meId, onRefresh, loading, config, now, timeLocked }) {
  const rows = withSharedRanks(profiles.map((p) => {
    const sc = computeScore(allPicks[p.id], results);
    const made = allPicks[p.id] ? GROUP_MATCHES.filter((m) => allPicks[p.id].groups?.[m.id]).length : 0;
    return { ...p, ...sc, made };
  }).sort((a, b) => b.total - a.total || b.made - a.made));
  const scoredMatches = GROUP_MATCHES.filter((m) => results?.groups?.[m.id]).length;
  const remaining = (GROUP_MATCHES.length - scoredMatches) * SCORING.group + MAX_KO + (results?.champion ? 0 : SCORING.champion) + (results?.scorer ? 0 : SCORING.scorer);
  const canShare = (config?.shareViewers || []).includes(meId);
  return (
    <div>
      <HeroCountdown now={now} timeLocked={timeLocked} results={results} profiles={profiles} allPicks={allPicks} />
      <div className="section-h" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div><div className="ttl"><span className="ic"><Rank /></span><h2>Clasificación</h2></div>
          <p>{profiles.length} participante{profiles.length === 1 ? "" : "s"} · puntos en vivo</p></div>
        <button className="btn ghost" style={{ padding: "8px 14px", fontSize: 13 }} onClick={onRefresh} disabled={loading}>{loading ? "Actualizando…" : "↻ Actualizar"}</button>
      </div>
      <div className="banner">🔥 Quedan <b>{remaining} puntos</b> en juego de {MAX_TOTAL} totales —<span>&nbsp;hay remontada posible hasta la final.</span></div>
      <div className="card" style={{ marginTop: 14 }}>
        {rows.length === 0 ? <div className="empty">Aún no hay participantes.</div> :
          rows.map((r) => (
            <div className={`lb-row ${r.id === meId ? "me" : ""}`} key={r.id}>
              <div className="rank">{r.pos === 1 ? "🥇" : r.pos === 2 ? "🥈" : r.pos === 3 ? "🥉" : r.pos}</div>
              <div className="av" style={avatarStyle(r.color)}>{r.avatar}</div>
              <div style={{ minWidth: 0 }}>
                <div className="lb-name">{r.name}{r.id === meId ? " · tú" : ""}</div>
                <div className="lb-sub">{r.made}/{GROUP_MATCHES.length} pronósticos{r.scored > 0 ? ` · ${r.group} en grupos` : ""}{r.special > 0 ? ` · ${r.special} especiales` : ""}</div>
              </div>
              <div className="lb-pts"><b>{r.total}</b><span>puntos</span></div>
            </div>
          ))}
      </div>
      <p className="note" style={{ marginTop: 12 }}>Los puntos aparecen a medida que se publican los resultados oficiales.</p>
      {canShare && (
        <>
          <div className="glabel" style={{ marginTop: 24 }}><span className="badge">📋</span><h3>Clasificación para compartir</h3></div>
          <p className="note" style={{ marginBottom: 8 }}>Tienes acceso a este resumen. Cópialo y pégalo en el grupo.</p>
          <ShareBlock text={buildShareText(profiles, allPicks, results)} />
        </>
      )}
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
          <li>La selección se <b>bloquea automáticamente 1 h antes del partido inaugural</b>. Después solo puede tocarse en una urgencia.</li>
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

  const toggleViewer = (id) => {
    const cur = config?.shareViewers || [];
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    setConfig({ ...config, shareViewers: next });
  };

  // clasificación de grupos (con correcciones manuales del organizador)
  const adminStandings = useMemo(() => computeGroupStandings(results, config?.standingsOverride), [results, config]);
  const moveTeam = (g, i, dir) => {
    const order = adminStandings[g].rows.map((r) => r.code);
    const j = i + dir;
    if (j < 0 || j > 3) return;
    [order[i], order[j]] = [order[j], order[i]];
    setConfig({ ...config, standingsOverride: { ...(config?.standingsOverride || {}), [g]: order } });
  };
  const resetGroupOrder = (g) => {
    const ov = { ...(config?.standingsOverride || {}) };
    delete ov[g];
    setConfig({ ...config, standingsOverride: ov });
  };

  useEffect(() => { setDraft(results || { groups: {}, champion: "", scorer: "" }); }, [results]);
  useEffect(() => { setPDraft(targetId && allPicks[targetId] ? JSON.parse(JSON.stringify(allPicks[targetId])) : (targetId ? { groups: {}, champion: "", scorer: "" } : null)); }, [targetId, allPicks]);

  // Equipos de eliminatorias (para fijar resultados oficiales de los cruces)
  const adminThirds = useMemo(() => rankThirds(adminStandings), [adminStandings]);
  const adminThirdAssign = useMemo(() => assignThirdsToSlots(adminThirds.slice(0, 8).map((t) => t.group)), [adminThirds]);
  const adminKoTeams = useMemo(() => computeKnockoutTeams(results, adminStandings, adminThirdAssign, true), [results, adminStandings, adminThirdAssign]);
  const setKoResult = (id, val) => saveResults({ ...results, knockout: { ...(results?.knockout || {}), [id]: val } });

  return (
    <div>
      <div className="section-h"><div className="ttl"><span className="ic"><ShieldIcon /></span><h2>Panel del organizador</h2></div></div>
      <div className="seg">
        <button className={sub === "results" ? "on" : ""} onClick={() => setSub("results")}>Resultados</button>
        <button className={sub === "standings" ? "on" : ""} onClick={() => setSub("standings")}>Grupos</button>
        <button className={sub === "ko" ? "on" : ""} onClick={() => setSub("ko")}>Eliminatorias</button>
        <button className={sub === "share" ? "on" : ""} onClick={() => { setSub("share"); onRefresh(); }}>Compartir</button>
        <button className={sub === "players" ? "on" : ""} onClick={() => { setSub("players"); onRefresh(); }}>Editar jugador</button>
        <button className={sub === "accounts" ? "on" : ""} onClick={() => { setSub("accounts"); onRefresh(); }}>Cuentas</button>
        <button className={sub === "settings" ? "on" : ""} onClick={() => setSub("settings")}>Ajustes</button>
      </div>

      {sub === "ko" && (
        <div style={{ marginTop: 12 }}>
          <div className="banner flat" style={{ marginTop: 0 }}>🏟️ <b>Resultados de eliminatorias:</b> fija el marcador de cada cruce cuyos dos equipos ya se conozcan. El ganador avanza automáticamente a la siguiente ronda y se puntúan los pronósticos.</div>
          {(() => {
            const shown = KO_MATCHES.filter((m) => { const t = adminKoTeams[m.id]; return t && t.home && t.away; });
            if (shown.length === 0) return <div className="empty">Todavía no hay cruces definidos (faltan resultados de grupos).</div>;
            return (
              <div style={{ display: "grid", gap: 10 }}>
                {shown.map((m) => (
                  <KoVoteCard key={m.id} m={m} teams={adminKoTeams} pick={results?.knockout?.[m.id]} onChange={setKoResult} adminTag />
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {sub === "results" && (
        <div style={{ marginTop: 12 }}>
          <div className="banner flat" style={{ marginTop: 0 }}>⚡ <b>Autoguardado:</b> cada resultado que marques se aplica al instante a la clasificación de todos.</div>
          <p className="note" style={{ margin: "10px 0 8px" }}>Marca el resultado oficial (1·X·2) de cada partido, el campeón y el goleador. Abajo verás cómo queda la clasificación en tiempo real.</p>
          <PicksEditor value={draft} onChange={(d) => { setDraft(d); saveResults(d); }} />

          <div className="glabel" style={{ marginTop: 22 }}><span className="badge"><Trophy s={18} /></span><h3>Clasificación en vivo</h3>
            <span className="sp">{GROUP_MATCHES.filter((m) => draft.groups?.[m.id]).length}/{GROUP_MATCHES.length} resultados</span></div>
          <div className="card">
            {(() => {
              const rows = withSharedRanks(profiles.map((p) => ({ ...p, ...computeScore(allPicks[p.id], draft) }))
                .sort((a, b) => b.total - a.total));
              if (rows.length === 0) return <div className="empty">Aún no hay participantes.</div>;
              return rows.map((r) => (
                <div className="lb-row" key={r.id}>
                  <div className="rank">{r.pos === 1 ? "🥇" : r.pos === 2 ? "🥈" : r.pos === 3 ? "🥉" : r.pos}</div>
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

      {sub === "standings" && (
        <div style={{ marginTop: 12 }}>
          <div className="banner flat" style={{ marginTop: 0 }}>📊 <b>Clasificación de grupos:</b> se calcula sola con los resultados (3-1-0 puntos) y, si pones marcadores ("2-0"), también con la diferencia de goles. Si un desempate queda mal resuelto, corrígelo con las flechas: el orden manual manda sobre el automático y alimenta la pestaña Eliminatorias.</div>
          <div className="stand-grid">
            {Object.keys(GROUPS).map((g) => (
              <div className="stand-card" key={g}>
                <div className="sc-h">
                  <span className="badge">{g}</span>Grupo {g}
                  {adminStandings[g].manual && (
                    <button className="manual-tag" style={{ border: "none", cursor: "pointer" }} title="Volver al orden automático" onClick={() => resetGroupOrder(g)}>editado · restaurar</button>
                  )}
                </div>
                {adminStandings[g].rows.map((r, i) => (
                  <div className={`stand-row q${i + 1}`} key={r.code}>
                    <span className="pos">{i + 1}</span>
                    <Flag code={r.code} size={20} />
                    <span className="snm">{TEAMS[r.code].name}</span>
                    <span className="spts">{r.pts}</span>
                    <span className="sgd" title="Diferencia de goles">{fmtGd(r.gd)}</span>
                    <span className="ord-btns">
                      <button disabled={i === 0} onClick={() => moveTeam(g, i, -1)} title="Subir">↑</button>
                      <button disabled={i === 3} onClick={() => moveTeam(g, i, 1)} title="Bajar">↓</button>
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {sub === "share" && (
        <div style={{ marginTop: 12 }}>
          <div className="banner flat" style={{ marginTop: 0 }}>📋 <b>Clasificación para compartir:</b> copia el bloque y pégalo directamente en el grupo. Se genera con la fecha de hoy y los puntos en vivo.</div>
          {profiles.length === 0 ? <div className="empty">Aún no hay participantes. Pulsa ↻ o entra de nuevo para cargar los perfiles.</div> : (
            <>
              <ShareBlock text={buildShareText(profiles, allPicks, results)} />

              <div className="glabel" style={{ marginTop: 24 }}><span className="badge">👁️</span><h3>Quién puede verla</h3></div>
              <p className="note" style={{ marginBottom: 8 }}>Marca los perfiles que verán este mismo bloque (con su botón de copiar) al final de su pestaña Clasificación.</p>
              <div className="card">
                {profiles.map((p) => {
                  const on = (config?.shareViewers || []).includes(p.id);
                  return (
                    <div key={p.id} className="lb-row" style={{ cursor: "pointer" }} onClick={() => toggleViewer(p.id)}>
                      <div className="av" style={avatarStyle(p.color)}>{p.avatar}</div>
                      <div style={{ flex: 1, minWidth: 0 }}><div className="lb-name">{p.name}</div></div>
                      <span className={`viewer-toggle ${on ? "on" : ""}`}>{on ? "✓ Puede verla" : "Activar"}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
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
  ["specials", "Porra", Trophy],
  ["leaderboard", "Clasificación", Rank],
  ["answers", "Respuestas", Poll],
  ["knockout", "Grupos", BracketIcon],
  ["profile", "Perfil", UserIcon],
  ["rules", "Reglas", BookIcon],
];

export default function App() {
  const now = useNow();
  const [booting, setBooting] = useState(true);
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState("specials");
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
  useEffect(() => { if (tab === "leaderboard" || tab === "answers" || tab === "knockout" || tab === "specials") loadAll(); }, [tab, loadAll]);

  // Tiempo real: cuando el cron (Edge Function sync-scores) reescribe la fila de
  // resultados en Supabase, la app recibe el cambio y refresca clasificacion y
  // marcador del hero al instante, sin recargar. Requiere tener habilitado
  // Realtime para la tabla "kv" en Supabase (Database > Replication).
  useEffect(() => {
    const ch = supabase
      .channel("kv-results")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "kv", filter: `key=eq.${KEY.results}` },
        (payload) => {
          const val = payload.new?.value;
          if (val) setResults(mergeOfficialResults(val));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

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
  const setKoPick = (id, val) => persistPicks({ ...picks, knockout: { ...(picks.knockout || {}), [id]: val } });

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
    if (me && me.id === id) { await sdel(KEY.me); setMe(null); setTab("leaderboard"); }
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
              <button onClick={() => { setIsAdmin(false); setTab("leaderboard"); }}>salir</button>
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
            <button onClick={async () => { if (confirm("¿Salir de tu perfil? Podrás volver a entrar con tu contraseña.")) { await sdel(KEY.me); setMe(null); setTab("leaderboard"); } }}>salir</button>
          </div>
        </div>
        <div className="tabs">{TABS.map(([id, label, Icon]) => (
          <button key={id} className={`tab ${tab === id ? "on" : ""}`} onClick={() => setTab(id)}><Icon s={16} />{label}</button>))}
        </div>
      </div>
      <div className="wrap">
        {tab === "specials" && <PorraView picks={picks} setPick={setPick} setChampion={setChampion} setScorer={setScorer} setKoPick={setKoPick} results={results} config={config} locked={locked} now={now} timeLocked={timeLocked} profiles={profiles} allPicks={allPicks} />}
        {tab === "answers" && <AnswersView profiles={profiles} allPicks={allPicks} results={results} config={config} now={now} loading={busy} onRefresh={loadAll} />}
        {tab === "knockout" && <KnockoutView results={results} config={config} profiles={profiles} allPicks={allPicks} />}
        {tab === "leaderboard" && <Leaderboard profiles={profiles} allPicks={allPicks} results={results} meId={me.id} onRefresh={loadAll} loading={busy} config={config} now={now} timeLocked={timeLocked} />}
        {tab === "profile" && <ProfileEditor me={me} profiles={profiles} onSave={updateMyProfile} onChangePassword={changeMyPassword} />}
        {tab === "rules" && <Rules />}
      </div>
      {(() => {
        const score = computeScore(picks, results);
        const others = profiles.filter((p) => p.id !== me.id).map((p) => computeScore(allPicks[p.id], results).total);
        const pos = others.filter((t) => t > score.total).length + 1;
        const totalPlayers = profiles.length || 1;
        return (
          <div className="float-score"
            title={`${score.scored} partido${score.scored === 1 ? "" : "s"} corregido${score.scored === 1 ? "" : "s"} · grupos: ${score.group}${score.special ? ` · especiales: ${score.special}` : ""} · ${pos}.º de ${totalPlayers}`}>
            <div className="av" style={avatarStyle(me.color)}>{me.avatar}</div>
            <div>
              <div className="fs-label">Tus puntos</div>
              <div className="fs-pts">{score.total}<small>pts</small></div>
            </div>
            <div className="fs-sep" />
            <div>
              <div className="fs-label">Posición</div>
              <div className="fs-pts">{pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : ""}{pos}<small>.º</small></div>
            </div>
          </div>
        );
      })()}
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
