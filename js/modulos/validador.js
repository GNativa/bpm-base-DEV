class Validacao {
    static #proximoId = 1;
    /** @returns Array<Campo> */
    camposMonitorados;
    /** @returns Array<Campo> */
    camposConsistidos;
    /** @returns Array<Campo> */
    camposObrigatorios;
    /** @returns Array<Campo> */
    camposOcultos;
    /** @returns Array<Campo> */
    camposDesabilitados;
    /** @returns Array<Campo> */
    camposExibidos;
    /** @returns Array<Campo> */
    camposHabilitados;
    /** @type boolean */
    afetaVariasLinhas;

    /**
     * @param ativa {(function(ContextoValidacao): boolean)|undefined}
     * @param feedback {?string}
     * @param camposMonitorados {(?function: Array)|undefined}
     * @param camposConsistidos {(?function: Array)|undefined}
     * @param camposObrigatorios {(?function: Array)|undefined}
     * @param camposOcultos {(?function: Array)|undefined}
     * @param camposDesabilitados {(?function: Array)|undefined}
     * @param camposExibidos {(?function: Array)|undefined}
     * @param camposHabilitados {(?function: Array)|undefined}
     * @param afetaVariasLinhas {?boolean|undefined}
     */
    constructor(ativa,
        feedback, camposMonitorados, camposConsistidos, camposObrigatorios, camposOcultos,
        camposDesabilitados, camposExibidos, camposHabilitados, afetaVariasLinhas = false
    ) {
        this.id = Validacao.#proximoId;
        Validacao.#proximoId++;
        this.ativa = ativa;
        this.feedback = feedback;
        this.camposMonitorados = Utilitario.criarGetterDeArray(camposMonitorados);
        this.camposConsistidos = Utilitario.criarGetterDeArray(camposConsistidos);
        this.camposObrigatorios = Utilitario.criarGetterDeArray(camposObrigatorios);
        this.camposOcultos = Utilitario.criarGetterDeArray(camposOcultos);
        this.camposDesabilitados = Utilitario.criarGetterDeArray(camposDesabilitados);
        this.camposExibidos = Utilitario.criarGetterDeArray(camposExibidos);
        this.camposHabilitados = Utilitario.criarGetterDeArray(camposHabilitados);
        this.afetaVariasLinhas = afetaVariasLinhas ?? false;
    }
}

class Validador {
    /** @type Array<Validacao> */
    #validacoes;
    /** @type Array<Campo> */
    #camposJaConfigurados = [];
    /** @type ?Array<Campo> */
    #camposObrigatorios = null;
    /** @type ?Array<Campo> */
    #camposBloqueados = null;
    /** @type ?Array<Campo> */
    #camposOcultos = null;

    constructor(validacoes = []) {
        this.#validacoes = validacoes;
        this.#camposObrigatorios = null;
        this.#camposBloqueados = null;
        this.#camposOcultos = null;
    }

    adicionarValidacao(validacao) {
        this.#validacoes.push(validacao);
    }

    definirValidacoes(validacoes) {
        this.#validacoes = validacoes;
    }

    validarCampos() {
        $(".campo")
            .trigger("change")
            .filter("[required]:visible")
            .filter(":not([disabled])")
            .filter(function () {
                return (this.type === "checkbox" && !this.checked) || (this.type !== "checkbox" && this.value === "");
            })
            // .addClass("invalido")
            .trigger("change")
            .trigger("blur.obrigatorio");
    }

    validarCamposObrigatorios() {
        $("[required]:visible").trigger("blur.obrigatorio");
    }

    formularioValido() {
        return $(".invalido:visible").length === 0 && $(".nao-preenchido:visible").length === 0;
    }

    /**
     * Filtrar campos que pertencem à mesma linha de uma lista de objetos
     * que a do campo base; retornar a lista como está caso o campo não pertença a uma lista de objetos
     *
     * @param campoBase {Campo}
     * @param campos {Campo[]}
     * @returns {Campo[]}
     */
    filtrarCamposDaMesmaLinha(campoBase, campos) {
        if (campoBase.listaDeObjetos == null) {
            return campos;
        }

        return campos.filter(function(elemento) {
            return elemento.linhaLista === null ||
                   (elemento.listaDeObjetos === campoBase.listaDeObjetos
                && elemento.linhaLista === campoBase.linhaLista);
        });
    }

    /**
     * Executar uma função de configuração para uma determinada validação com base
     * em um campo monitorado e em campos que devem se tornar obrigatórios, serem exibidos, ocultos, etc.,
     * conforme a validação
     *
     * @param validacao {Validacao}
     * @param campoMonitorado {Campo}
     * @param obterCampos {function: Campo[]}
     * @param ativar {function(Campo, boolean): void}
     */
    #vincularEvento(validacao, campoMonitorado, obterCampos, ativar) {
        const campos = obterCampos().flat();

        if (campos.length === 0) {
            return;
        }

        if (!validacao.afetaVariasLinhas
         && this.filtrarCamposDaMesmaLinha(campoMonitorado, campos).length === 0) {
            return;
        }

        campoMonitorado.adicionarEvento("change", () => {
            let listaCampos;

            if (validacao.afetaVariasLinhas) {
                listaCampos = obterCampos();
            }
            else {
                listaCampos = this.filtrarCamposDaMesmaLinha(campoMonitorado, obterCampos());
            }

            const ativa = this.#ativarValidacao(validacao, campoMonitorado);

            for (const campo of listaCampos) {
                ativar(campo, ativa);
            }
        });
    }

    /** @param campo {Campo} */
    removerCampoValidado(campo) {
        this.#camposJaConfigurados = this.#camposJaConfigurados.filter((campoConfigurado) => {
            return campoConfigurado.id !== campo.id;
        });
    }

    /** @param campos {Campo[]} */
    removerCamposValidados(campos) {
        for (const campo of campos) {
            this.removerCampoValidado(campo);
        }
    }

    /**
     * @param validacao {Validacao}
     * @param campoMonitorado {Campo}
     * @returns {boolean}
     */
    #ativarValidacao(validacao, campoMonitorado) {
        const contexto = new ContextoValidacao(validacao, campoMonitorado);
        return validacao.ativa(contexto);
    }

    /*
    #ativarValidacao(
        validacao = new Validacao,
        campoMonitorado = new Campo,
    ) {
        const agrupador = {};

        for (const monitorado of validacao.camposMonitorados().flat()) {
            const id = monitorado.idAgrupado;

            if (validacao.afetaVariasLinhas) {
                if (!agrupador.hasOwnProperty(id)) {
                    agrupador[id] = [];
                }

                agrupador[id].push(monitorado);
            }
            else {
                agrupador[monitorado.idAgrupado] = monitorado;
            }
        }

        return validacao.ativa(agrupador);
    }
     */

    /**
     * @param validacao {Validacao}
     * @param campo {Campo}
     */
    configurarParaUmCampo(validacao, campo) {
        this.#vincularEvento(
            validacao,
            campo,
            validacao.camposConsistidos,
            (consistido, ativa) => {
                if (consistido["consistenciaAtiva"] !== null
                    && consistido["consistenciaAtiva"]["id"] !== validacao["id"]) {
                    return;
                }

                if (ativa && consistido["consistenciaAtiva"] === null) {
                    consistido.definirConsistenciaAtiva(validacao);
                }
                else if (!ativa
                    && consistido["consistenciaAtiva"] !== null
                    && consistido["consistenciaAtiva"]["id"] === validacao["id"]) {
                    consistido.definirConsistenciaAtiva(null);
                }

                consistido.definirValidez(!ativa);
                consistido.definirFeedback(validacao.feedback ?? "");
                consistido.mostrarFeedback(ativa);
            }
        );

        this.#vincularEvento(
            validacao,
            campo,
            validacao.camposObrigatorios,
            (obrigatorio, ativa) => {
                obrigatorio.definirObrigatoriedade(ativa);
            }
        );

        this.#vincularEvento(
            validacao,
            campo,
            validacao.camposOcultos,
            (oculto, ativa) => {
                oculto.definirVisibilidade(ativa);
            }
        );

        this.#vincularEvento(
            validacao,
            campo,
            validacao.camposDesabilitados,
            (desabilitado, ativa) => {
                desabilitado.definirEdicao(ativa);
            }
        );

        this.#vincularEvento(
            validacao,
            campo,
            validacao.camposExibidos,
            (exibido, ativa) => {
                exibido.definirVisibilidade(ativa);
            }
        );

        this.#vincularEvento(
            validacao,
            campo,
            validacao.camposHabilitados,
            (habilitado, ativa) => {
                habilitado.definirEdicao(ativa);
            }
        );

        campo.notificar();
    }

    /** @param verificarConfigurados {boolean} */
    configurarValidacoes(verificarConfigurados = false) {
        for (const validacao of this.#validacoes) {
            let camposMonitorados = validacao.camposMonitorados().flat();

            if (verificarConfigurados) {
                camposMonitorados = camposMonitorados.filter((campo) => {
                    return campo.obterValidacoes().indexOf(validacao) === -1;
                });
            }

            for (const campo of camposMonitorados) {
                this.configurarParaUmCampo(validacao, campo);
                campo.adicionarValidacao(validacao);
            }
        }
    }

    definirCamposObrigatorios(campos) {
        this.#camposObrigatorios = campos;
    }

    definirCamposBloqueados(campos) {
        this.#camposBloqueados = campos;
    }

    definirCamposOcultos(campos) {
        this.#camposOcultos = campos;
    }

    obterCamposObrigatorios() {
        return Object.freeze(this.#camposObrigatorios);
    }

    obterCamposBloqueados() {
        return Object.freeze(this.#camposBloqueados);
    }

    obterCamposOcultos() {
        return Object.freeze(this.#camposOcultos);
    }

    #obterCampo(colecao, idCampo, linha) {
        return colecao.obter(idCampo).find((campo) => {
            return campo.linhaLista === null || campo.linhaLista === linha;
        });
    }

    configurarValidacoesFixas(etapa, colecao, linha) {
        // Bloquear todos os campos caso o formulário seja acessado de modo avulso
        // Ex.: consulta da solicitação na Central de Tarefas
        if (etapa === null || !(this.obterCamposObrigatorios().hasOwnProperty(etapa))) {
            const campos = colecao.obterTodosCampos().filter((campo) => {
                return this.#camposJaConfigurados.indexOf(campo) === -1
                    && (campo.linhaLista === null || campo.linhaLista === linha);
            });

            for (const campo of campos) {
                campo.definirObrigatoriedade(false);
                campo.sobrescreverObrigatoriedade(true);
                campo.definirEdicao(false);
                campo.sobrescreverEdicao(true);

                this.#camposJaConfigurados.push(campo);
            }

            return;
        }

        for (const etapa in this.#camposObrigatorios) {
            for (const idCampo of this.#camposObrigatorios[etapa]) {
                const campo = this.#obterCampo(colecao, idCampo, linha);

                campo.definirObrigatoriedade(true);
            }
        }

        for (const etapa in this.#camposBloqueados) {
            for (const idCampo of this.#camposBloqueados[etapa]) {
                const campo = this.#obterCampo(colecao, idCampo, linha);

                campo.definirEdicao(false);
                campo.sobrescreverEdicao(true);
            }
        }

        for (const etapa in this.#camposOcultos) {
            for (const idCampo of this.#camposOcultos[etapa]) {
                const campo = this.#obterCampo(colecao, idCampo, linha);

                campo.definirVisibilidade(false);
                campo.sobrescreverVisibilidade(true);
            }
        }
    }
}