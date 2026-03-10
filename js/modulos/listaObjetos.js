class ListaObjetos extends Secao {
    #colecao;
    #validador;
    #factories = [];
    #filtros = [];
    #filtrada = false;
    #colunaBotoes = $(`<div class="col-4 d-flex justify-content-end"></div>`);
    #camposLista = new Map();
    #camposFiltro = [];
    #linhas = new Map();
    #permiteAdicionarLinhas;
    #permiteRemoverLinhas;

    constructor(id, titulo, colecao, validador, factories, filtros,
                permiteAdicionarLinhas = true, permiteRemoverLinhas = true) {
        super(id, titulo, null);
        this.#colecao = colecao;
        this.#validador = validador;
        this.#factories = factories ?? [];
        this.#filtros = filtros ?? [];
        this.#permiteAdicionarLinhas = permiteAdicionarLinhas;
        this.#permiteRemoverLinhas = permiteRemoverLinhas;
    }

    configurarSecao() {
        super.configurarSecao();
        this.#configurarFiltros();
    }

    exibirLinhas() {
        for (const linha of this.#linhas.values()) {
            linha.show();
        }

        this.#filtrada = false;
    }

    #compararComFiltro(campo, campoFiltro) {
        /*
        if (campo instanceof CampoLista && campoFiltro instanceof CampoLista) {
            const opcoesFiltro = campoFiltro.opcoes.filter((opcao) => opcao.selecionada);

            if (opcoesFiltro.length === 0) {
                return true;
            }

            const opcoesSelecionadas = campo.opcoes.filter((opcao) => opcao.selecionada);

            return opcoesSelecionadas.some((opcao) => opcoesFiltro.includes(opcao));
        }
         */

        if (campo.constructor === campoFiltro.constructor) {
            return campo.valor() === campoFiltro.valor();
        }

        if (campo instanceof CampoCheckbox && campoFiltro instanceof CampoLista) {
            const valorFiltro = campoFiltro.valor();

            if (valorFiltro === "") {
                return true;
            }

            return valorFiltro === "Sim" ? campo.valor() === true : campo.valor() === false;
        }

        return false;
    }

    #configurarFiltros() {
        let factories = this.#factories.filter((factory) => {
            return this.#filtros.indexOf(factory.idCampo) !== -1;
        });

        if (factories.length === 0) {
            return;
        }

        if (factories.length > 1) {
            // Ordenar factories conforme a ordem do filtro
            factories = factories.map((valor, indice) => {
                return factories.find((elemento) => {
                    return elemento.idCampo === this.#filtros[indice];
                });
            });
        }

        const hr = $(`<hr class="border-0">`);
        const linhaFiltros = $(`<div class="row g-3"></div>`);

        const primeiraLinha = this.#linhas.get(0);
        primeiraLinha.before(hr);
        hr.before(linhaFiltros);

        const linhaTituloFiltros = $(`<div class="row"></div>`);
        const colunaTituloFiltros = $(`<div class="col fst-italic fw-bold mb-2"></div>`);
        linhaTituloFiltros.append(colunaTituloFiltros);
        linhaFiltros.before(linhaTituloFiltros);

        colunaTituloFiltros.append(`
            Filtros
            <i class="bi bi-info-circle-fill ms-2 pe-auto informativo"
            data-bs-toggle="tooltip" data-bs-placement="top"
            data-bs-title="Digite algo abaixo e pressione Enter ou clique no primeiro botão ao lado para filtrar as linhas.">
            </i>
        `);

        Utilitario.configurarTooltips();

        const botaoFiltrar = $(`
            <button id="botaoFiltrar${this.id}" type="button" title="Filtrar" class="btn btn-sm botao ms-3">
                <i class="bi bi-funnel fs-5"></i>
            </button>
        `);

        const botaoLimparFiltro = $(`
            <button id="botaoLimparFiltro${this.id}" type="button" title="Limpar filtros" class="btn btn-sm botao ms-3">
                <i class="bi bi-eraser-fill fs-5"></i>
            </button>
        `);

        colunaTituloFiltros.append(botaoFiltrar);
        colunaTituloFiltros.append(botaoLimparFiltro);

        // this.#colunaBotoes.append(botaoFiltrar);
        // this.#colunaBotoes.append(botaoLimparFiltro);

        for (const factory of factories) {
            const idCampoFiltro = `${factory.idCampo}${Constantes.campos.atributos.filtroListaObjetos}`;

            // TODO: criar SELECT com múltiplas opções quando o campo a ser filtrado é um SELECT
            let campo = factory.construir(idCampoFiltro);

            if (campo instanceof CampoCheckbox) {
                campo = new CampoLista(
                    campo.id, campo.rotulo, campo.largura, campo.dica, campo.fonte, campo.campoFonte,
                );
                campo.adicionarOpcoes([
                    new OpcaoLista("Sim", "Sim"),
                    new OpcaoLista("Não", "Não"),
                ]);
            }
            else {
                campo.label.find("i").remove();
            }

            campo.atribuirIdAgrupado(factory.idCampo);
            linhaFiltros.append(campo.coluna);
            this.#camposFiltro.push(campo);

            campo.adicionarEvento("keyup", (evento) => {
                if (evento.key === "Enter") {
                    botaoFiltrar.click();
                }
            });
        }

        const filtroAtivoBotao = "filtro-ativo";
        const filtroAtivoIcone = "bi-funnel-fill";
        const filtroInativoIcone = "bi-funnel";

        botaoLimparFiltro.on("click", () => {
            if (!this.#filtrada) {
                return;
            }

            for (const campoFiltro of this.#camposFiltro) {
                campoFiltro.limpar();
            }

            botaoFiltrar.removeClass(filtroAtivoBotao);
            setTimeout(() => botaoFiltrar.addClass(filtroAtivoBotao), 0);
            botaoFiltrar.find("i").removeClass(filtroAtivoIcone).addClass(filtroInativoIcone);

            this.exibirLinhas();
        });

        botaoFiltrar.on("click", () => {
            if (this.#filtrada) {
                this.exibirLinhas();
            }

            if (!this.#camposFiltro.some((campo) => campo.preenchido)) {
                return;
            }

            botaoFiltrar.removeClass(filtroAtivoBotao);
            setTimeout(() => botaoFiltrar.addClass(filtroAtivoBotao), 0);
            botaoFiltrar.find("i").removeClass(filtroInativoIcone).addClass(filtroAtivoIcone);

            for (const indice of this.#camposLista.keys()) {
                const campos = this.#camposLista.get(indice);

                if (!campos) {
                    const mensagem = `O índice "${indice}" não existe na lista de objetos "${this.id}".`;
                    Mensagem.exibir("Índice inválido", mensagem, "erro");
                    throw new Error(mensagem);
                }

                const filtrosPreenchidos = this.#camposFiltro.filter((campo) => {
                    return campo.preenchido;
                });

                for (const campoFiltro of filtrosPreenchidos) {
                    const campoLinha = campos.find((campo) => campo.idAgrupado === campoFiltro.idAgrupado);

                    if (this.#compararComFiltro(campoLinha, campoFiltro)) {
                        continue;
                    }

                    const linha = this.#linhas.get(indice);

                    if (!linha) {
                        const mensagem = `A linha de índice "${indice}" não existe na lista de objetos "${this.id}".`;
                        Mensagem.exibir("Índice inválido", mensagem, "erro");
                        throw new Error(mensagem);
                    }

                    linha.hide();
                    campoFiltro.finalizarCarregamento();
                }
            }

            this.#filtrada = true;
        });
    }

    get tamanho() {
        return this.#camposLista.size;
    }

    obterLinha(indice) {
        return this.#camposLista.get(indice);
    }

    criarLinha() {
        const indice = this.obterIndiceUltimaLinha() + 1;

        const linhaItem = $(`
            <div ${Constantes.campos.atributos.linhaListaObjetos}${this.id}="${indice}"
                 class="row g-3 pb-3 linha-secao">
            </div>
        `);

        const botaoRemover = $(`
            <button type="button" title="Remover linha" id="removerLinhaSecao${this.id}${indice}" class="btn botao ms-3">
                <i class="bi bi-x fs-5"></i>
            </button>
        `);

        botaoRemover.on("click", () => {
            this.removerLinha(indice);
        });

        const hr = $("<hr>");

        if (indice === 0 || Utilitario.obterEtapa() === null) {
            botaoRemover.prop("disabled", true);
            hr.addClass("border-0");
        }
        else {
            hr.addClass("border-0");
            //linhaItem.addClass("mt-1");
        }

        if (this.#permiteRemoverLinhas) {
            const colunaBotaoRemover = $(`<div class="col-12 d-flex justify-content-end coluna-remover"></div>`);
            colunaBotaoRemover.append(botaoRemover);
            linhaItem.append(colunaBotaoRemover);
        }

        this.divSecao.append(linhaItem);

        const camposDaLinha = [];

        for (const factory of this.#factories) {
            const novoId = `${factory.idCampo}${indice}`;

            if (camposDaLinha.find((campo) => campo.id === novoId)
                || document.getElementById(novoId) !== null) {
                this.lancarErroDeCampoDuplicado(factory.idCampo);
            }

            const campo = factory.construir(novoId);
            campo.atribuirListaObjetos(this);
            campo.atribuirIdAgrupado(factory.idCampo);
            campo.atribuirLinhaLista(indice);

            linhaItem.append(campo.coluna);
            camposDaLinha.push(campo);

            this.adicionarQuebra(linhaItem, campo);
        }

        this.divSecao.append(linhaItem);
        linhaItem.before(hr);
        this.#linhas.set(indice, linhaItem);
        this.#camposLista.set(indice, camposDaLinha);
    }

    salvarCampos() {
        const campos = this.#camposLista.get(this.obterIndiceUltimaLinha());
        this.#colecao.salvarCampos(campos);

        if (this.obterIndiceUltimaLinha() > 0) {
            this.#validador.configurarValidacoesFixas(Utilitario.obterEtapa(), this.#colecao, this.obterIndiceUltimaLinha());
            this.#validador.configurarValidacoes(true);
        }
    }

    removerLinha(indice = 0) {
        $(`
            [${Constantes.campos.atributos.linhaListaObjetos}${this.id}="${indice}"],
            hr:has(+ [${Constantes.campos.atributos.linhaListaObjetos}${this.id}="${indice}"])
        `).remove();

        const lista = this.#camposLista.get(indice);
        this.#colecao.removerCampos(lista);
        this.#validador.removerCamposValidados(lista);
        this.#camposLista.delete(indice);

        this.#validador.configurarValidacoes(false);
    }

    obterIndiceUltimaLinha() {
        const chaves = this.#camposLista.keys().toArray();
        const indice = Math.max(...chaves);
        return indice === -Infinity ? -1 : indice;
    }

    configurarTitulo(elementoSecao = $("")) {
        // const colunaSuperior = $(`<div class="col-12"></div>`);
        const linhaTitulo = $(`<div class="row mt-3"></div>`);
        const colunaTitulo = $(`<div class="col"></div>`);
        const tituloSecao = $(`<div class="titulo-m"></div>`);
        tituloSecao.text(this.titulo);

        // colunaSuperior.append(linhaTitulo);
        linhaTitulo.append(colunaTitulo);

        if (this.#permiteAdicionarLinhas) {
            const botaoNovaLinha = $(`
                <button type="button" title="Nova linha" id="novaLinha${this.id}" class="btn botao ms-3">
                    <i class="bi bi-plus fs-5"></i>
                </button>
            `);

            if (Utilitario.obterEtapa() !== null) {
                botaoNovaLinha.on("click", () => {
                    this.adicionarLinha();
                });
            } else {
                botaoNovaLinha.prop("disabled", true);
            }

            this.#colunaBotoes.append(botaoNovaLinha);
        }

        linhaTitulo.append(this.#colunaBotoes);
        colunaTitulo.append(tituloSecao);
        // elementoSecao.append(colunaSuperior);
        elementoSecao.append(linhaTitulo);
        // elementoSecao.append(hr);
    }
}