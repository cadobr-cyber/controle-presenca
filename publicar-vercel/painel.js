import { addDoc, collection, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import { signInAnonymously } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { auth, db } from "./firebase-config.js";

const COLECAO = "hev_presenca_publica";
const lista = document.getElementById("listaMedicos");
const pesquisa = document.getElementById("pesquisa");
const statusSync = document.getElementById("statusSync");
const toast = document.getElementById("toast");
const formCadastro = document.getElementById("formCadastro");
const nomeCadastro = document.getElementById("nomeCadastro");
const mostrarInativos = document.getElementById("mostrarInativos");
const listaCadastro = document.getElementById("listaCadastro");
let medicos = [];

function avisar(texto, tipo = "sucesso") {
    toast.textContent = texto;
    toast.classList.toggle("erro", tipo === "erro");
    toast.classList.add("visivel");
    setTimeout(() => toast.classList.remove("visivel"), 2500);
}

function ativo(medico) { return medico.ativo !== false; }

function ordenarAtivos() {
    return medicos.filter(ativo)
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }))
        .map((medico, indice) => ({ ...medico, ordem: indice + 1 }));
}

function atualizarResumo() {
    const ativos = ordenarAtivos();
    const presentes = ativos.filter((medico) => medico.presente).length;
    document.getElementById("total").textContent = ativos.length;
    document.getElementById("presentes").textContent = presentes;
    document.getElementById("ausentes").textContent = ativos.length - presentes;
}

function mostrarMedicos() {
    const termo = pesquisa.value.trim().toLocaleLowerCase("pt-BR");
    const filtrados = ordenarAtivos().filter((medico) =>
        medico.nome.toLocaleLowerCase("pt-BR").includes(termo) || String(medico.ordem).includes(termo));
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
                await updateDoc(medico.ref, { presente: !medico.presente, horario: medico.presente ? null : new Date() });
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

function editarNome(medico) {
    const novoNome = window.prompt("Digite o nome correto do médico:", medico.nome);
    if (novoNome === null) return;
    const nome = novoNome.trim().replace(/\s+/g, " ");
    if (!nome) { avisar("O nome não pode ficar vazio.", "erro"); return; }
    statusSync.textContent = "Salvando...";
    updateDoc(medico.ref, { nome }).then(() => avisar("Nome atualizado.")).catch((erro) => {
        console.error(erro); statusSync.textContent = "Erro de sincronização"; avisar("Não foi possível atualizar o nome.", "erro");
    });
}

function alternarAtivo(medico) {
    const estaAtivo = ativo(medico);
    if (!window.confirm(`Deseja ${estaAtivo ? "inativar" : "reativar"} ${medico.nome}?`)) return;
    statusSync.textContent = "Salvando...";
    updateDoc(medico.ref, { ativo: !estaAtivo }).then(() => avisar(estaAtivo ? "Médico inativado." : "Médico reativado.")).catch((erro) => {
        console.error(erro); statusSync.textContent = "Erro de sincronização"; avisar("Não foi possível alterar o cadastro.", "erro");
    });
}

function mostrarCadastro() {
    const cadastros = [...medicos].filter((medico) => mostrarInativos.checked || ativo(medico))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
    listaCadastro.replaceChildren();
    cadastros.forEach((medico) => {
        const item = document.createElement("div");
        item.className = `cadastro-item${ativo(medico) ? "" : " inativo"}`;
        const nome = document.createElement("span");
        nome.textContent = medico.nome;
        const acoes = document.createElement("div");
        acoes.className = "acoes-cadastro";
        const editar = document.createElement("button");
        editar.type = "button"; editar.textContent = "Editar"; editar.addEventListener("click", () => editarNome(medico));
        const ativar = document.createElement("button");
        ativar.type = "button"; ativar.className = ativo(medico) ? "btn-inativar" : "btn-reativar";
        ativar.textContent = ativo(medico) ? "Inativar" : "Reativar"; ativar.addEventListener("click", () => alternarAtivo(medico));
        acoes.append(editar, ativar); item.append(nome, acoes); listaCadastro.appendChild(item);
    });
}

async function iniciarPainel() {
    await signInAnonymously(auth);
    onSnapshot(collection(db, COLECAO), (snapshot) => {
        medicos = snapshot.docs.map((registro) => {
            const dados = registro.data();
            return {
                ref: registro.ref,
                numero: Number(dados.numero) || Number(registro.id.split("_").pop()),
                nome: String(dados.nome || "").trim(),
                ativo: dados.ativo !== false,
                presente: dados.presente === true,
                horario: dados.horario?.toDate?.()?.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) || null
            };
        }).filter((medico) => medico.nome);
        statusSync.textContent = "Sincronizado";
        mostrarMedicos(); mostrarCadastro(); atualizarResumo();
    }, (erro) => {
        console.error(erro); statusSync.textContent = "Sem conexão";
        lista.textContent = `Não foi possível sincronizar (${erro.code || "erro de autorização"}).`;
    });
}

formCadastro.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const nome = nomeCadastro.value.trim().replace(/\s+/g, " ");
    if (!nome) return;
    const maiorNumero = medicos.reduce((maior, medico) => Math.max(maior, medico.numero || 0), 0);
    statusSync.textContent = "Salvando...";
    try {
        await addDoc(collection(db, COLECAO), { numero: maiorNumero + 1, nome, ativo: true, presente: false, horario: null });
        nomeCadastro.value = ""; avisar("Médico adicionado.");
    } catch (erro) {
        console.error(erro); statusSync.textContent = "Erro de sincronização"; avisar("Não foi possível adicionar o médico.", "erro");
    }
});

pesquisa.addEventListener("input", mostrarMedicos);
mostrarInativos.addEventListener("change", mostrarCadastro);

document.getElementById("exportarExcel").addEventListener("click", () => {
    if (!window.XLSX) { alert("A biblioteca do Excel ainda não foi carregada. Verifique a conexão."); return; }
    const ativos = ordenarAtivos();
    const linhas = ativos.map((medico) => ({ Nº: medico.ordem, Nome: medico.nome, Situação: medico.presente ? "Presente" : "Ausente", Chegada: medico.horario || "" }));
    const livro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(livro, XLSX.utils.json_to_sheet(linhas), "Presenças");
    XLSX.utils.book_append_sheet(livro, XLSX.utils.json_to_sheet([{ "Gerado em": new Date().toLocaleString("pt-BR"), Total: ativos.length, Presentes: ativos.filter((m) => m.presente).length, Ausentes: ativos.filter((m) => !m.presente).length }]), "Resumo");
    XLSX.writeFile(livro, "controle-presenca-hev.xlsx");
});

document.getElementById("gerarPdf").addEventListener("click", () => {
    const ativos = ordenarAtivos();
    const janela = window.open("", "_blank");
    if (!janela) { alert("Permita a abertura de pop-ups para gerar o PDF."); return; }
    const linhas = ativos.map((medico) => `<tr><td>${medico.ordem}</td><td>${medico.nome}</td><td>${medico.presente ? "Presente" : "Ausente"}</td><td>${medico.horario || ""}</td></tr>`).join("");
    janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Controle de Presença HEV</title><style>body{font-family:Arial;color:#182b49;padding:24px}h1{font-size:22px}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #ddd;padding:7px;text-align:left;font-size:12px}th{background:#edf2f7}</style></head><body><h1>Controle de Presença HEV</h1><p>Gerado em: ${new Date().toLocaleString("pt-BR")}</p><p>Total: ${ativos.length} | Presentes: ${ativos.filter((m) => m.presente).length} | Ausentes: ${ativos.filter((m) => !m.presente).length}</p><table><thead><tr><th>Nº</th><th>Nome</th><th>Situação</th><th>Chegada</th></tr></thead><tbody>${linhas}</tbody></table></body></html>`);
    janela.document.close(); janela.focus(); janela.print();
});

iniciarPainel().catch((erro) => { console.error(erro); lista.textContent = "Não foi possível iniciar a sincronização."; });
