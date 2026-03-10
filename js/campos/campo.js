// Campo({id: string, rotulo: string, largura: integer, dica: string, fonte: Fonte, campoFonte: string})
/*
    - Representação abstrata de um campo no formulário.
 */
class Campo {
    #validacoes = [];
    #quebra = null;
    #quebrar = false;

    constructor(id, rotulo, largura, dica, tag, tipo, fonte, campoFonte) {
        this.id = id;                            // Atributo "id" do elemento HTML
        this.idAgrupado = id;                  // ID agrupado do campo para identificação em listas de objeto
        this.rotulo = rotulo;                    // Atributo "title" do elemento HTML
        this.largura = largura;                  // Largura do campo (respeitando classes .col-*)
        this.dica = dica ?? null;                // Dica para explicação do campo
        this.fonte = fonte ?? null;              // Fonte de dados relacionada
        this.campoFonte = campoFonte ?? null;    // Nome do campo da fonte de dados ao qual este corresponde
        this.campoMestre = null;                 // Campo mestre deste campo

        if (this.fonte != null) {
            this.fonte.inscreverCampo(this);
        }

        this.tag = tag;                          // Tag do elemento HTML
        this.tipo = tipo;                        // Atributo "type" do elemento HTML, caso seja um input
        this.classes = ["campo"];                // Classes CSS do campo

        this.listaDeObjetos = null;
        this.linhaLista = null;

        this.obrigatorio = false;                // Indica se o campo é obrigatório
        this.visivel = true;                     // Indica se o campo está visível
        this.editavel = true;                    // Indica se o campo pode ser editado
        this.valido = true;                      // Indica se o campo é válido

        this.obrigatoriedadeSobrescrita = false; // Indica se a obrigatoriedade do campo só pode ser definida pela etapa
        this.visibilidadeSobrescrita = false;    // Indica se a visibilidade do campo só pode ser definida pela etapa
        this.edicaoSobrescrita = false;          // Indica se do campo só pode ser editado pela etapa

        this.consistenciaAtiva = null;           // Consistência ativa no campo
        this.feedback = null;                    // Elemento div que exibe uma mensagem abaixo do campo nos casos de validações.

        this.coluna = $("<div></div>");          // Elemento div com classes .col-*
        this.campo = null;                       // Elemento jQuery correspondente ao campo
        this.label = null;                       // Elemento label contendo a descrição do campo
    }

    inicializar() {
        this.configurarElementos();
        this.definirVisibilidade(true);
        this.definirEdicao(true);
    }

    // configurarElementos(): void
    /*
        Configura os parâmetros e comportamentos do HTML envolvendo o campo e o adiciona à página.
     */
    configurarElementos() {
        const id = this.id;
        const rotulo = this.rotulo;
        const largura = this.largura;
        const dica = this.dica;
        const coluna = this.coluna;
        const fonte = this.fonte;

        const classeColuna = largura >= 1 && largura <= 12 ? `col-${largura}` : "col";
        coluna.addClass(classeColuna);

        const tag = this.tag;
        const tipo = this.tipo;

        this.campo = $(`<${tag} id="${id}" name="${id}" placeholder="${rotulo}" title="${rotulo}"></${tag}>`);
        this.label = $("<label></label>");

        this.campo.attr("data-id", id);

        if (dica !== null) {
            const icone = $(`
                <i class="bi bi-info-circle-fill me-2 pe-auto informativo" data-bs-toggle="tooltip"
                   data-bs-placement="top" data-bs-title="${dica}"></i>
            `);
            this.label.append(icone);
        }

        if (tipo !== null) {
            this.campo.attr("type", `${tipo}`);
        }

        if (fonte !== null) {
            this.campo.attr(Constantes.campos.atributos.fonte, `${fonte.id}`);
            this.campo.attr(Constantes.campos.atributos.campoFonte, `${this.campoFonte}`);
        }

        this.configurarCampo();

        this.feedback = $(`<div class="feedback"></div>`);
        this.feedback.addClass("feedback");
        this.coluna.append(this.feedback);
        this.feedback.hide();

        for (const classe of this.classes) {
            this.campo.addClass(classe);
        }

        this.campo.on("change", function() {
            const elemento = $(this);

            if (elemento.val() === "") {
                elemento.attr("title", `${rotulo}`);
                return;
            }

            if (elemento.attr("type") === "checkbox") {
                elemento.attr("title", `${rotulo}: ${elemento.prop("checked") ? "Sim" : "Não"}`);
            }
            else {
                elemento.attr("title", `${rotulo}: ${elemento.val()}`);
            }
        });
    }

    alterarRotulo(novo) {
        this.label.text(novo);
    }

    adicionarValidacao(validacao) {
        this.#validacoes.push(validacao);
    }

    obterValidacoes() {
        return this.#validacoes;
    }

    configurarCampo() {
        // A ser implementado pelas classes filhas
    }

    // adicionarEvento(evento: string, funcao: function(): void): void
    /*
        Configura a máscara e opções de máscara do campo.
     */
    adicionarEvento(evento = "", funcao = (e) => {}) {
        this.campo.on(evento, funcao);
        return this;
    }

    removerEvento(evento = "") {
        this.campo.off(evento);
        return this;
    }

    definirCampoMestre(campo = new Campo()) {
        this.campoMestre = campo;
    }

    definirConsistenciaAtiva(validacao = new Validacao()) {
        this.consistenciaAtiva = validacao;
    }

    definirFeedback(mensagem = "") {
        this.feedback.text(mensagem);
        return this;
    }

    mostrarFeedback(mostrar = false) {
        const feedback = this.feedback;

        if (mostrar) {
            feedback.show();
        }
        else {
            feedback.hide();
        }

        return this;
    }

    atribuirListaObjetos(listaDeObjetos) {
        this.listaDeObjetos = listaDeObjetos;
    }

    atribuirLinhaLista(linha = 0) {
        this.linhaLista = linha;
    }

    atribuirIdAgrupado(idAgrupado = "") {
        this.idAgrupado = idAgrupado;
    }

    get preenchido() {
        return this.valor() !== "";
    }

    limpar() {
        this.valor("");
    }

    sobrescreverObrigatoriedade(sobrescrever = false) {
        this.obrigatoriedadeSobrescrita = sobrescrever;
    }

    sobrescreverEdicao(sobrescrever = false) {
        this.edicaoSobrescrita = sobrescrever;
    }

    sobrescreverVisibilidade(sobrescrever = false) {
        this.visibilidadeSobrescrita = sobrescrever;
    }

    definirObrigatoriedade(obrigatorio = false) {
        if (this.obrigatoriedadeSobrescrita) {
            return this;
        }

        const campo = this.campo;
        this.obrigatorio = obrigatorio;
        campo.prop("aria-required", obrigatorio);
        campo.prop("required", obrigatorio);

        if (obrigatorio) {
            campo.on("blur.obrigatorio", configurar);
        }
        else {
            campo.off("blur.obrigatorio");
            campo.removeClass("nao-preenchido");
        }

        function configurar() {
            if (campo.val() === "" || (campo.prop("type") === "checkbox" && !campo.prop("checked"))) {
                campo.addClass("nao-preenchido");
            }
            else {
                campo.removeClass("nao-preenchido");
            }
        }

        return this;
    }

    definirVisibilidade(visivel = true) {
        if (this.visibilidadeSobrescrita) {
            return this;
        }

        this.visivel = visivel;

        if (this.visivel) {
            $(this.coluna).show();
            this.#quebra?.show();
        }
        else {
            $(this.coluna).hide();
            this.#quebra?.hide();
        }

        return this;
    }

    definirEdicao(editavel = true) {
        if (this.edicaoSobrescrita) {
            return this;
        }

        this.editavel = editavel;
        this.campo.prop("disabled", !this.editavel);

        if (this.fonte !== null) {
            $(`#${Constantes.campos.prefixoIdBotaoPesquisa}${this.id}`).prop("disabled", !this.editavel);
        }

        return this;
    }

    definirValidez(valido = true) {
        this.valido = valido;
        const campo = this.campo;

        campo.prop("aria-invalid", !valido);

        if (valido) {
            campo.removeClass("invalido");
        }
        else {
            campo.addClass("invalido");
        }
    }

    iniciarCarregamento() {
        const camposFonte = $(`[${Constantes.campos.atributos.fonte}=${this.fonte.id}]`);
        camposFonte.removeClass("carregado");
        this.campo.removeClass("carregado-falha");
        camposFonte.css("animation-delay", "0s");
        this.campo.addClass("carregando");
    }

    finalizarCarregamento(interromperAnimacao = false) {
        if (!this.fonte) {
            this.campo.removeClass("carregando");
            this.campo.removeClass("carregado");
            setTimeout(() => this.campo.addClass("carregado"), 0);
            return;
        }

        const camposFonte = $(`[${Constantes.campos.atributos.fonte}=${this.fonte.id}]`);
        const camposFonteVisiveis = camposFonte.filter(function () {
            return this.style.display !== "none"
        });

        for (let i = 0; i < camposFonteVisiveis.length; i++) {
            const tempo = ((i + 1) * 0.15);
            camposFonteVisiveis[i].style.animationDelay = `${tempo}s`;

            /*
            setTimeout(function () {
                camposFonteVisiveis[i].classList.remove("carregado");
            }, tempo * 10000);
             */
        }

        this.campo.removeClass("carregando");
        this.campo.removeClass("carregado");
        setTimeout(() => this.campo.addClass("carregado"), 0);

        if (!interromperAnimacao) {
            camposFonteVisiveis.addClass("carregado");
        }
    }

    falharCarregamento() {
        this.campo.removeClass("carregando");
        this.campo.addClass("carregado-falha");

        setTimeout(() => {
            this.campo.removeClass("carregado-falha");
        }, 1000);
    }

    obterElementoHtml() {
        return this.campo[0];
    }

    valor(valor) {
        return this.val(valor);
    }

    // TODO: alterar nome do método para "valor" e remover o método acima
    val(valor) {
        if (typeof valor === "undefined") {
            return this.campo.val();
        }

        return this.campo.val(valor).trigger("input").trigger("change");
    }

    propriedade(propriedade, valor) {
        return this.campo.prop(propriedade, valor);
    }

    get valorLimpo() {
        const valor = this.campo.cleanVal();

        if (typeof valor === "undefined") {
            return this.campo.val();
        }

        return valor;
    }

    on(evento = "", funcao = (e) => {}) {
        this.campo.on(evento, funcao);
        return this;
    }

    notificar() {
        this.campo.trigger("change");
    }

    comQuebra() {
        this.#quebrar = true;
        return this;
    }

    temQuebra() {
        return this.#quebrar;
    }

    salvarQuebra(quebra) {
        this.#quebra = quebra;
    }
}