import { collection, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import { signInAnonymously } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { auth, db } from "./firebase-config.js";

const lista = document.getElementById("listaMedicos");
const pesquisa = document.getElementById("pesquisa");
const statusSync = document.getElementById("statusSync");
const toast = document.getElementById("toast");
let medicos = [];

function avisar(texto, tipo = "sucesso") {
    toast.textContent = texto;
    toast.classList.remove("erro");
    if (tipo === "erro") toast.classList.add("erro");
    toast.classList.add("visivel");
    setTimeout(() => toast.classList.remove("visivel"), 2200);
}

function atualizarResumo() {
    const presentes = medicos.filter((medico) => medico.presente).length;
    document.getElementById("total").textContent = medicos.length;
    document.getElementById("presentes").textContent = presentes;
    document.getElementById("ausentes").textContent = medicos.length - presentes;
}

function mostrarMedicos() {
    const termo = pesquisa.value.trim().toLocaleLowerCase("pt-BR");
    const filtrados = medicos.filter((medico) =>
        medico.nome.toLocaleLowerCase("pt-BR").includes(termo) || String(medico.ordem).includes(termo)
    );
    lista.replaceChildren();

    if (!filtrados.length) {
        const mensagem = document.createElement("p");
        mensagem.textContent = "Nenhum médico encontrado.";
        lista.appendChild(mensagem);
        return;
    }

    filtrados.forEach((medico) => {
        const item = document.createElement("div");
        item.className = "medico";

        const info = document.createElement("div");
        info.className = "medico-info";

        const nome = document.createElement("h3");
        nome.textContent = `${medico.ordem}. ${medico.nome}`;
        info.appendChild(nome);

        if (medico.presente && medico.horario) {
            const horario = document.createElement("p");
            horario.className = "horario";
            horario.textContent = `Chegada: ${medico.horario}`;
            info.appendChild(horario);
        }

        const botao = document.createElement("button");
        botao.className = "btn-presenca";
        botao.classList.toggle("presente", medico.presente);
        botao.textContent = medico.presente ? "Presente ✓" : "Confirmar";
        botao.addEventListener("click", async () => {
            botao.disabled = true;
            statusSync.textContent = "Salvando...";
            try {
                await updateDoc(medico.ref, {
                    presente: !medico.presente,
                    horario: medico.presente ? null : new Date()
                });
                avisar(medico.presente ? "Presença desfeita." : "Presença registrada.", medico.presente ? "erro" : "sucesso");
            } catch (erro) {
                console.error(erro);
                statusSync.textContent = "Erro de sincronização";
                avisar("Não foi possível sincronizar.", "erro");
                botao.disabled = false;
            }
        });

        item.append(info, botao);
        lista.appendChild(item);
    });
}

async function iniciarPainel() {
    const resposta = await fetch("./nomes-publicos.json?v=3", { cache: "no-store" });
    if (!resposta.ok) throw new Error("Não foi possível carregar os nomes públicos.");
    const nomes = await resposta.json();
    await signInAnonymously(auth);

    onSnapshot(collection(db, "hev_presenca_publica"), (snapshot) => {
        const statusPorNumero = new Map(snapshot.docs.map((doc) => {
            const dados = doc.data();
            return [Number(doc.id.split("_").pop()), {
                ref: doc.ref,
                presente: dados.presente === true,
                horario: dados.horario?.toDate?.()?.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) || null
            }];
        }));

        medicos = nomes.map((item) => ({
            numero: item.numero,
            nome: item.nome,
            ...(statusPorNumero.get(item.numero) || { ref: null, presente: false, horario: null })
        }))
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }))
            .map((medico, indice) => ({ ...medico, ordem: indice + 1 }));
        statusSync.textContent = "Sincronizado";
        mostrarMedicos();
        atualizarResumo();
    }, (erro) => {
        console.error(erro);
        statusSync.textContent = "Sem conexão";
        lista.textContent = `Não foi possível sincronizar (${erro.code || "erro de autorização"}).`;
    });
}

pesquisa.addEventListener("input", mostrarMedicos);

document.getElementById("exportarExcel").addEventListener("click", () => {
    if (!window.XLSX) {
        alert("A biblioteca do Excel ainda não foi carregada. Verifique a conexão.");
        return;
    }
    const linhas = medicos.map((medico) => ({
        Nº: medico.ordem,
        Nome: medico.nome,
        Situação: medico.presente ? "Presente" : "Ausente",
        Chegada: medico.horario || ""
    }));
    const geradoEm = new Date().toLocaleString("pt-BR");
    const planilha = XLSX.utils.json_to_sheet(linhas);
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, planilha, "Presenças");
    XLSX.utils.book_append_sheet(livro, XLSX.utils.json_to_sheet([{
        "Gerado em": geradoEm,
        Total: medicos.length,
        Presentes: medicos.filter((m) => m.presente).length,
        Ausentes: medicos.filter((m) => !m.presente).length
    }]), "Resumo");
    XLSX.writeFile(livro, "controle-presenca-hev.xlsx");
});

document.getElementById("gerarPdf").addEventListener("click", () => {
    const janela = window.open("", "_blank");
    if (!janela) {
        alert("Permita a abertura de pop-ups para gerar o PDF.");
        return;
    }
    const linhas = medicos.map((medico) => `
        <tr><td>${medico.ordem}</td><td>${medico.nome}</td><td>${medico.presente ? "Presente" : "Ausente"}</td><td>${medico.horario || ""}</td></tr>`
    ).join("");
    janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Controle de Presença HEV</title><style>body{font-family:Arial;color:#182b49;padding:24px}h1{font-size:22px}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #ddd;padding:7px;text-align:left;font-size:12px}th{background:#edf2f7}</style></head><body><h1>Controle de Presença HEV</h1><p>Gerado em: ${new Date().toLocaleString("pt-BR")}</p><p>Total: ${medicos.length} | Presentes: ${medicos.filter((m) => m.presente).length} | Ausentes: ${medicos.filter((m) => !m.presente).length}</p><table><thead><tr><th>Nº</th><th>Nome</th><th>Situação</th><th>Chegada</th></tr></thead><tbody>${linhas}</tbody></table></body></html>`);
    janela.document.close();
    janela.focus();
    janela.print();
});

iniciarPainel().catch((erro) => {
    console.error(erro);
    lista.textContent = "Não foi possível iniciar a sincronização.";
});
