/*
    - Seção: agrupamento de campos que pode possuir um título ou não, servindo como quebra de linha quando
    gerada sem um título.
 */

class Secao {
    constructor(id = "", titulo, campos, colecao) {
        this.id = id;
        this.titulo = titulo;
        this.possuiTitulo = titulo !== undefined && titulo !== null;
        this.gerada = false;
        this.elemento = $();
        this.divSecao = $("<div></div>");
        this.campos = campos ?? [];
        this.colecao = colecao;
    }

    configurarTitulo(elementoSecao = $("")) {
        const linhaTitulo = $(`<div class="row linha-titulo"></div>`);
        const colunaTitulo = $(`<div class="col coluna-titulo"></div>`);
        const tituloSecao = $(`<div class="titulo-g"></div>`);
        tituloSecao.text(this.titulo);

        const hr = $(`<hr class="hr-titulo border-0">`);
        linhaTitulo.append(colunaTitulo);
        colunaTitulo.append(tituloSecao);
        elementoSecao.append(linhaTitulo);
        elementoSecao.append(hr);
    }

    lancarErroDeCampoDuplicado(id) {
        throw `Já existe um elemento no formulário com o ID "${id}". Por gentileza, use um ID diferente.`;
    }

    adicionarLinha() {
        this.criarLinha();
        this.salvarCampos();
        Utilitario.configurarTooltips();
    }

    criarLinha() {
        const linhaCampos = $(`<div class="row g-3 pb-3 linha-secao"></div>`);

        for (const campo of this.campos) {
            if (document.getElementById(campo.id) !== null) {
                this.lancarErroDeCampoDuplicado(campo.id);
            }

            linhaCampos.append(campo.coluna);
            this.divSecao.append(linhaCampos);
        }
    }

    salvarCampos() {
        this.colecao.salvarCampos(this.campos);
    }

    configurarSecao() {
        const secao = this.divSecao;
        const id = this.id;
        const possuiTitulo = this.possuiTitulo;

        secao.attr("id", id);
        secao.addClass("secao mb-4");

        if (possuiTitulo) {
            this.configurarTitulo(secao);
        }

        this.adicionarLinha();
        const elemento = $(secao);
        $("#containerFormulario").append(elemento);

        this.elemento = elemento;
        this.gerada = true;
    }

    gerar() {
        const gerada = this.gerada;
        const secao = this.divSecao;

        if (gerada) {
            return null;
        }

        this.configurarSecao();
        Utilitario.configurarTooltips();
        return this;
    }

    definirVisibilidade(visivel = true) {
        this.visivel = visivel;

        if (this.visivel) {
            this.elemento.show();
        }
        else {
            this.elemento.hide();
        }

        return this;
    }

    adicionarCampo(campo = new Campo()) {
        this.campos.push(campo);
    }
}