import { auth } from "./firebase-config.js";

import { signInAnonymously } from
    "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

async function testarFirebase() {
    try {
        const resultado = await signInAnonymously(auth);

        console.log("Firebase conectado!");
        console.log("UID:", resultado.user.uid);
    } catch (erro) {
        console.error("Erro ao conectar:", erro);
    }
}

testarFirebase();