const form = document.getElementById("formAcesso");
const mensagem = document.getElementById("mensagem");
const botao = document.getElementById("btnEntrar");

form.addEventListener("submit", (evento) => {
    evento.preventDefault();

    mensagem.textContent =
        "Tela pronta! A validação segura será configurada na próxima etapa.";

    botao.disabled = true;

    // Ainda não existe autorização para acessar
    // o painel ou consultar dados dos médicos.
});