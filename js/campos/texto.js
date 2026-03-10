class CampoTexto extends CampoEntrada {
    constructor(id, rotulo, largura, dica, fonte, campoFonte, campoResultante, limitarValores, filtrarValorLimpo,
                altura, email, tratarConsulta) {
        super(id, rotulo, largura, dica, null, fonte, campoFonte);
        this.tag = altura ? "textarea" : "input";              // Tag do elemento HTML
        this.campoResultante = campoResultante ?? true;        // Indica se o campo é resultante ou mestre
        this.limitarValores = limitarValores ?? true;          // Limitar valores aos da fonte de dados ou permitir qualquer valor
        this.filtrarValorLimpo = filtrarValorLimpo ?? false;   // Considerar valor sem ou com máscara para filtrar
        this.tratarConsulta = tratarConsulta ?? function() {}; // Função para tratamento especial de consultas
        this.valorAnterior = "";                               // Valor do campo no momento da última consulta realizada
        this.menuDropdown = null;                              // Lista de opções sugeridas em campos-mestre
        this.pesquisarNovamente = true;                        // Controle de pesquisas para não realizar pesquisas redundantes ao filtrar algo

        if (altura) {
            this.altura = `${altura}lh`;
            this.tipo = null;
        }
        else {
            this.altura = null;

            if (email) {
                this.tipo = "email";
            }
            else {
                this.tipo = "texto";
            }
        }

        this.mascaraPadrao = "";
        this.opcoesMascara = {
            clearIfNotMatch: true
        };

        this.inicializar();
    }

    // configurarMascara(mascara: string, opcoes: {}): void
    /*
        Configura a máscara do campo e suas opções.
     */
    configurarMascara(mascara, opcoes) {
        this.opcoesMascara = opcoes ?? this.opcoesMascara;
        this.campo.mask(mascara, opcoes ?? this.opcoesMascara);
        return this;
    }

    configurarBusca(botao) {
        botao.on("click", async () => {
            if (this.val() === this.valorAnterior) {
                return;
            }

            this.iniciarCarregamento();

            const parametros = {
                campo: this,
                aceitarValorVazio: false,
                naSelecao: (registro) => {
                    this.fonte.atualizarRegistro(registro);
                    this.valorAnterior = registro[this.campoFonte];
                    this.pesquisarNovamente = false;
                    this.finalizarCarregamento(false);
                },
                noFechamento: () => {
                    this.valorAnterior = this.val();
                    this.finalizarCarregamento(true);
                }
            };

            const busca = TelaFactory.obterTela(Constantes.telas.busca, parametros);
            await busca.abrir();
        });
    }

    configurarDetalhes() {
        const campo = this.campo;

        if (this.fonte !== null) {
            // Guardar referência à fonte de dados do campo em HTML
            this.campo.attr(Constantes.campos.atributos.fonte, this.fonte.id);
        }

        // Configurar pesquisa na fonte caso o campo seja um "campo mestre"
        if (!this.campoResultante && (this.fonte !== null && this.campoFonte !== null)) {
            this.configurarPesquisa();
        }

        if (this.altura !== null) {
            campo.css("height", this.altura);
        }
    }

    configurarPesquisa() {
        // Criar dropdown e adicionar classe ao div superior para comportá-lo
        this.campo.addClass("dropdown-toggle");
        this.menuDropdown = $(`<ul class="dropdown-menu w-100"></ul>`);
        this.filhoColuna.addClass("dropdown");
        this.filhoColuna.append(this.menuDropdown);

        // Função para preencher os campos relacionados
        // e limpá-los quando esse campo for apagado
        const callback = async (event) => {
            if (event.target.value === "") {
                const camposFonte = $(`[${Constantes.campos.atributos.fonte}=${this.fonte.id}]`);
                camposFonte.val("").trigger("input").trigger("change");
                return;
            }

            // Não realizar carregamento quando o valor do campo for igual ao anterior
            // ou o botão de busca for clicado

            if (event.target.value === this.valorAnterior
                || event.relatedTarget?.id === `${Constantes.campos.prefixoIdBotaoPesquisa}${this.id}`) {
                return;
            }

            this.iniciarCarregamento();

            try {
                if (this.pesquisarNovamente) {
                    // TODO: Obter token de forma melhor estruturada e injetar dependência do consultor na fonte
                    this.fonte.definirDados(
                        await Consultor.carregarFonte(
                            this.fonte,
                            null // Controlador.obterToken()
                        )
                    );
                    // this.fonte.definirDados(Constantes.fontes.dadosTeste);
                    this.pesquisarNovamente = false;
                }

                const dados = this.fonte.dados;

                if (dados.length === 0) {
                    this.finalizarCarregamento(true);
                    this.pesquisarNovamente = true;
                    return;
                }

                let valor;

                if (this.filtrarValorLimpo) {
                    valor = this.valorLimpo;
                }
                else {
                    valor = this.val();
                }

                // Filtrar dados com base no que foi digitado no campo
                // (somente se a fonte não for tratada pelo Senior X mesmo)

                let dadosFiltrados;

                if (this.fonte.tipo === Constantes.fontes.tipos.tabela) {
                    dadosFiltrados = dados;
                }
                else {
                    dadosFiltrados = Utilitario.filtrarDados(dados, valor, dados[0], this.campoFonte);
                }

                if (dadosFiltrados.length === 1) {
                    this.fonte.atualizarRegistro(dadosFiltrados[0]);
                    this.finalizarCarregamento();
                    this.pesquisarNovamente = true;
                    this.tratarConsulta(dadosFiltrados);
                }
                else if (dadosFiltrados.length > 0) {
                    this.configurarDropdown(dadosFiltrados);
                    this.tratarConsulta(dadosFiltrados);
                }
                else {
                    if (this.limitarValores) {
                        this.fonte.atualizarRegistro(null);
                    }

                    this.falharCarregamento();
                    this.pesquisarNovamente = false;
                }

                this.valorAnterior = event.target.value;
            }
            catch (e) {
                if (e instanceof ExcecaoMensagem) {
                    Mensagem.exibir(e.titulo, e.message, e.tipoMensagem);
                }
                else {
                    Mensagem.exibir("Erro ao carregar dados",
                        `Houve um erro ao carregar os dados da fonte "${this.fonte.nome}" (ID "${this.fonte.id}") `
                        + `para o campo "${this.rotulo}" (ID "${this.id}"): ${e}`,
                        "erro");
                }

                this.falharCarregamento();
            }
        }

        this.campo.on("blur", callback);

        let divExterna = $(`<div class="input-group"></div>`);
        this.filhoColuna.wrap(divExterna);

        const botao = $(`<button id="${Constantes.campos.prefixoIdBotaoPesquisa}${this.id}" type="button" title="Buscar" class="btn botao"></button>`);
        this.configurarBusca(botao);
        const buscar = $(`<i class="bi bi-search fs-4"></i>`);
        botao.append(buscar);
        this.filhoColuna.after(botao);
    }

    configurarDropdown(dadosFiltrados) {
        let quantidadeLinhas;

        if (dadosFiltrados.length < Constantes.fontes.linhasPreSelecao) {
            quantidadeLinhas = dadosFiltrados.length;
        }
        else {
            quantidadeLinhas = Constantes.fontes.linhasPreSelecao;
        }

        this.menuDropdown.empty();

        for (let i = 0; i < quantidadeLinhas; i++) {
            const itemDropdown = $(`<li class="dropdown-item"><a href="#" class="dropdown-item"></a></li>`);
            itemDropdown.attr(Constantes.gerais.atributos.sequencia, i);
            itemDropdown.text(dadosFiltrados[i][this.campoFonte]);
            itemDropdown.on("click", () => {
                this.fonte.atualizarRegistro(
                    dadosFiltrados[itemDropdown.attr(Constantes.gerais.atributos.sequencia)]
                );
                this.finalizarCarregamento();
                this.pesquisarNovamente = true;
                bootstrap.Dropdown.getOrCreateInstance(this.campo).toggle();

                /*
                setTimeout(() => {
                    this.campo.attr("data-bs-toggle", null);
                }, 1000);

                 */
            });

            this.menuDropdown.append(itemDropdown);
        }

        bootstrap.Dropdown.getOrCreateInstance(this.campo).toggle();
    }
}