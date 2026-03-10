class TelaDeBusca extends Tela {
    constructor(parametros) {
        super(Constantes.telas.busca, parametros);
        this.aceitarValorVazio =
            parametros.aceitarValorVazio ?? true;         // Indica se a busca aceita valores vazios no campo base
        this.callbackSelecionado = parametros.naSelecao   // Função para chamar na seleção da linha
            ?? ((registro) => {});
        this.callbackFechamento = parametros.noFechamento // Função para chamar no fechamento sem seleção
            ?? (() => {});
        this.fonte = parametros.campo?.fonte ?? null;     // Fonte de dados correspondente à tela
        this.titulo = this.fonte.nome;                    // Título da tela baseado no nome da fonte
        this.campoPesquisar = null;                       // Campo de pesquisa
        this.linhaSelecionada = -1;                       // Índice da linha selecionada na tabela
        this.preparada = false;                           // Indica se a tela já foi preparada ou não
        this.pesquisavel = false;                         // Indica se uma pesquisa pode ser feita ou não
        this.dadosFiltrados = [];                         // Dados filtrados da fonte de dados
    }

    prepararInterface() {
        if (this.container) {
            this.container.find(".secao-superior").append($(`
                <div class="row">
                    <div class="col-12">
                        <div class="form-floating">
                            <input type="text" id="${this.id}-pesquisar" name="${this.id}-pesquisar" class="form-control" placeholder="Pesquisar"
                                style="color: var(--bs-body-color);">
                            <label for="${this.id}-pesquisar" style="color: var(--bs-body-color);">
                                <i class="bi bi-info-circle-fill me-2 pe-auto informativo" data-bs-toggle="tooltip"
                                   data-bs-placement="top" data-bs-title="Digite e pressione Enter para pesquisar."></i>Pesquisar
                            </label>
                        </div>
                    </div>
                </div>
            `));

            this.campoPesquisar = $(`#${this.id}-pesquisar`);

            this.container.find(".fundo").append($(`
                <div class="row">
                    <div class="col">
                        <div class="tabela">
                            <table class="table table-striped table-hover">
                                <thead>
                                    <tr></tr>
                                </thead>
                                <tbody class="table-group-divider">
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `));
        }

        this.campoPesquisar.on("keydown", async (event) => {
            if (this.campoPesquisar.val() === "" || (this.pesquisavel && event.key === "Enter")) {
                this.filtrarDados();
            }
        });
    }

    async abrir() {
        super.abrir();

        this.linhaSelecionada = -1;
        this.pesquisavel = false;

        if (!this.preparada) {
            this.prepararInterface();
            this.preparada = true;
        }

        await this.pesquisar();
    }

    async carregarDados() {
        if (!this.fonte) {
            return;
        }

        // TODO: Obter token de forma melhor estruturada
        const token = Controlador.obterToken();

        try {
            let dados;

            if (!this.aceitarValorVazio && this.parametros.campo?.val() === "") {
                Mensagem.exibir(
                    "Consulta inválida",
                    "Digite um valor no campo principal antes de abrir a tela de busca.",
                    "aviso"
                );

                dados = [];
                this.dadosFiltrados = dados;
                return;
            }

            dados = await Consultor.carregarFonte(this.fonte, token);
            this.fonte.tratarRetorno(dados);
            this.fonte.definirDados(dados);
            this.dadosFiltrados = this.fonte.dados;
        }
        catch (e) {
            if (e instanceof ExcecaoMensagem) {
                Mensagem.exibir(e.titulo, e.message, e.tipoMensagem);
            }
            else {
                Mensagem.exibir("Erro ao carregar dados",
                    `Houve um erro ao carregar os dados da fonte "${this.fonte.nome}" `
                    + `para a tela de busca: ${e}`,
                    "erro");
            }

            this.dadosFiltrados = [];
            this.falharPesquisa();
        }
        finally {
            this.renderizarTabela();
        }
    }

    filtrarDados() {
        const termo = this.campoPesquisar.val();
        this.dadosFiltrados = Utilitario.filtrarDados(this.dadosFiltrados, termo, this.fonte.descricoes)
        this.renderizarTabela();
    }

    renderizarTabela() {
        this.limparLinhas();
        const descricoes = this.fonte.descricoes;
        const cabecalho = this.container.find("thead tr");
        const corpo = this.container.find("tbody");

        if (this.dadosFiltrados.length === 0) {
            cabecalho.append(`<th scope="col" style="text-align: center">Vazio</th>`);
            corpo.append(`<tr><td style="text-align: center">Nenhum registro encontrado.</td></tr>`);
            return;
        }

        for (const chave in descricoes) {
            cabecalho.append($(`<th scope="col">${descricoes[chave]}</th>`));
        }

        for (let i = 0; i < this.dadosFiltrados.length; i++) {
            const linha = $(`<tr></tr>`);

            for (const propriedade in descricoes) {
                const coluna = $(`<td></td>`);
                coluna.text(this.dadosFiltrados[i][propriedade]);
                linha.append(coluna);
            }

            corpo.append(linha);

            linha.on("click", () => {
                this.selecionarItem(i);
            });
        }
    }

    selecionarItem(linha) {
        this.linhaSelecionada = linha;

        this.fechar();
        this.callbackSelecionado(this.dadosFiltrados[linha]);
    }

    async pesquisar() {
        this.iniciarPesquisa();
        await this.carregarDados();
        this.finalizarPesquisa();
    }

    limparLinhas() {
        const cabecalho = this.container.find("thead tr");
        cabecalho.text("");
        const corpo = this.container.find("tbody");
        corpo.text("");
    }

    fechar() {
        super.fechar();

        if (this.linhaSelecionada === -1) {
            this.callbackFechamento();
        }
    }

    iniciarPesquisa() {
        this.pesquisavel = false;
        this.campoPesquisar.removeClass("carregado");
        this.campoPesquisar.addClass("carregando");
    }

    finalizarPesquisa() {
        this.pesquisavel = true;
        this.campoPesquisar.removeClass("carregando");
        this.campoPesquisar.addClass("carregado");
    }

    falharPesquisa() {
        this.campoPesquisar.removeClass("carregando");
        this.campoPesquisar.addClass("carregado-falha");

        setTimeout(() => {
            this.campoPesquisar.removeClass("carregado-falha");
        }, 1000);
    }
}