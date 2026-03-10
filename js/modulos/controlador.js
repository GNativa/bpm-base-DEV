// Controlador
/*
    Responsável por inicializar o formulário e prover funcionalidades genéricas.
 */

class Controlador {
    #validador;
    #etapa = null;
    #colecao;
    formulario;
    #inicializado = false; // Indica se o formulário foi inicializado
    static #accessToken = null; // Access token da plataforma
    workflowCockpit;

    constructor(validador, colecao, formulario) {
        // Variáveis para uso na geração e validação do formulário.
        this.#validador = validador;
        this.#colecao = colecao;
        this.formulario = formulario;

        // Interface da API do workflow (BPM) que lida com a inicialização, salvamento de dados e erros do formulário.
        // Função "_rollback" não implementada até o momento
        this.workflowCockpit = workflowCockpit({
            init: (data, info) => {
                this._init(data, info);
            },
            onSubmit: async (data, info) => {
                return await this._saveData(data, info);
            },
            onError: () => {
                this._rollback();
            },
        });
    }

    // _init(data: ?, info: ?): void
    /*
        Inicialização do formulário através da API do workflow.
        Também será responsável por carregar as fontes de dados
        com o uso do token do usuário.
     */
    _init(data, info) {
        this.inicializar();
        const { initialVariables } = data["loadContext"];
        console.log(initialVariables);
        const mapa = new Map();

        for (const prop in initialVariables) {
            mapa.set(prop, initialVariables[prop]);
        }

        console.log("Carregando dados do fluxo: ", mapa);
        this.formulario.carregarDadosFluxo(mapa);

        info["getUserData"]()
            .then(function (user) {
                /*
                {
                    "id": "",
                    "username": "",
                    "subject": "",
                    "fullname": "",
                    "email": "",
                    "tenantName": "",
                    "tenantLocale": "pt-BR",
                    "locale": "pt-BR"
                }
                 */
            })
            .then(function () {
                return info["getPlatformData"]();
            })
            .then((dados) => {
                this.#accessToken = dados["token"]["access_token"];
                return info["getInfoFromProcessVariables"]();
                //return carregarFontes(dados);
            })
            /*
            .then(function () {
                return info["getInfoFromProcessVariables"]();
            })
             */
            .then((data) => {
                if (!info["isRequestNew"]() && Array.isArray(data)) {
                    const mapa = new Map();

                    for (let i = 0; i < data.length; i++) {
                        mapa.set(data[i].key, data[i].value || "");
                    }

                    this.formulario.carregarDadosFormulario(mapa);

                    // Disparar eventos dos campos para ativar validações
                    this.#notificarCampos();
                }
            })
            .catch(function (error) {
                const mensagem = `Houve um erro ao inicializar o formulário: ${error}. `
                    + `Por gentileza, abra a solicitação novamente para prosseguir.`;
                Mensagem.exibir("Erro na inicialização do formulário",
                    mensagem,
                    "erro");
                throw error;
            });
    }

    // _saveData(data: ?, info: ?): Promise<{}>
    /*
        Valida o formulário e salva os dados na API do Workflow.
     */
    async _saveData(data, info) {
        this.#validarFormulario();

        let dados = await this.formulario.salvarDados();

        return {
            formData: dados,
        };
    }

    _rollback() {
        // A implementar.
    }

    // inicializar(): void
    /*
        Inicializa o formulário, podendo ser através da API workflow do Senior X ou localmente.
     */
    inicializar() {
        if (this.#inicializado) {
            return;
        }

        this.#configurarElementosFixos();

        this.formulario.gerar();
        this.formulario.configurarEventos();
        this.formulario.definirEstadoInicial();

        // this.listarCampos();
        this.#configurarPlugins();
        this.#configurarAnimacoes();
        this.#configurarEtapa();
        this.#aplicarValidacoes();
        this.#inicializado = true;
    }

    #notificarCampos() {
        // Disparar eventos dos campos para ativar validações
        for (const campo of this.#colecao.obterTodosCampos()) {
            campo.notificar();
        }
    }

    // listarCampos(): void
    /*
        Obtém os IDs dos campos na variável campos{} e os lista no console.
     */
    #listarCampos() {
        const ids = [];

        for (const campo of this.#colecao.obterTodosCampos()) {
            ids.push(`"${campo.id}"`);
        }

        console.log(ids.join(", "));
    }

    // carregarFontes(dadosPlataforma: {}): void
    /*
        Carrega as fontes de dados definidas na classe Formulario usando o token de acesso do Senior X.
        TODO: carregar sob demanda
     */
    async #carregarFontes(dadosPlataforma) {
        const token = dadosPlataforma["token"]["access_token"];
        const fontes = this.formulario.obterFontes();

        for (const nomeFonte in Formulario.fontes) {
            const fonte = Formulario.fontes[nomeFonte];

            fonte.definirDados(await Consultor.carregarFonte(fonte, token));

            /* TODO: Trocar isso para variar conforme o tipo do campo ou algo assim
            for (const campo of fonte.camposCorrespondentes) {
                Formulario.campos[campo].adicionarOpcoes(fonte.obterOpcoes());
            }
             */
        }
    }

    /*
    atualizarCamposFonte(idFonte, registro) {
        if (!idFonte) {
            const msg = "O ID da fonte para atualização dos campos fonte não pode ser nulo.";
            Mensagem.exibir("Configurações inválidas", msg, "erro");
            throw new Error(msg);
        }

        const campos = this.#colecao.obterCampos();

        const camposAssociados = campos.filter((campo = new Campo()) => {
            return campo.fonte?.id === idFonte;
        });

        if (registro) {
            camposAssociados.forEach((campo) => {
                campo.notificar();
                campo.val(registro[campo.campoFonte]);
            });
        }
        else {
            camposAssociados.forEach((campo) => campo.val(""));
        }
    }
     */

    // configurarPlugins(): void
    /*
        Configura plugins que necessitam de inicialização na página.
     */
    #configurarPlugins() {
    }

    #configurarAnimacoes() {
        /*
        for (const campo of Formulario.campos) {
            if (campo.campoMestre) {

            }
        }
         */
    }

    // #validarFormulario(): void
    /*
        Valida o formulário e exibe uma mensagem conforme o resultado da validação.
        Caso o formulário esteja inválido, um erro é lançado para impedir que a plataforma prossiga
        com o envio dos dados.
     */
    #validarFormulario() {
        this.formulario.finalizar();
        this.#validador.validarCampos();

        const titulo = "Validação";
        let mensagem = "Dados validados com sucesso.";

        if (!this.#validador.formularioValido()) {
            mensagem = "Dados inválidos. Preencha todos os campos obrigatórios e verifique as informações inseridas "
                + "no formulário para prosseguir.";
            Mensagem.exibir(titulo, mensagem, "aviso");
            throw new Error(mensagem);
        }

        Mensagem.exibir(titulo, mensagem, "sucesso");
    }

    // configurarEtapa(): void
    /*
        Configura as etapas do processo com base nos parâmetros da URL, usando como sufixo "?etapa=nomeDaEtapa&".
        Ex.: https://gnativa.github.io/bpm-clientes-fornecedores/?etapa=solicitacao&
        O "&" ao final é adicionado para considerar os parâmetros inseridos na URL pelo próprio Senior X.
     */
    #configurarEtapa() {
        this.#etapa = Utilitario.obterEtapa();
        this.#validador.configurarValidacoesFixas(this.#etapa, this.#colecao, 0);
    }

    // configurarElementosFixos(): void
    /*
        Configura opções diversas de elementos fixos, como o botão de enviar utilizado para testes de validação
        do formulário.
     */
    #configurarElementosFixos() {
        const personalizacao = this.formulario.obterPersonalizacao();

        $("#tituloFormulario").text(personalizacao.titulo);
        $("#botaoEnviar").on("click", () => {
            this.#validarFormulario();
        });

        // Configurar esquema de cores com base nas preferências do usuário
        // Temporariamente desabilitado, pois o Senior X fica sempre em modo claro
        /*
        const mql = window.matchMedia("(prefers-color-scheme: dark)");
        const eventoMediaQueryList = (e) => {
            if (e.matches) {
                $("body").attr("data-bs-theme", "dark");
                console.log("DARK");
            }
            else {
                $("body").attr("data-bs-theme", "light");
                console.log("LIGHT");
            }
        };

        eventoMediaQueryList(mql);
        mql.addEventListener("change", eventoMediaQueryList);
         */
    }

    // aplicarValidacoes(validacoes: array<Validacao>): void
    /*
        Define a lista de validações do validador e as configura.
     */
    #aplicarValidacoes() {
        if (this.#etapa === null) {
            return;
        }

        const validacoes = this.formulario.obterValidacoes();

        for (const validacao of validacoes) {
            this.#validador.adicionarValidacao(validacao);
        }

        this.#validador.configurarValidacoes(false);
    }

    static obterToken() {
        return this.#accessToken;
    }
}