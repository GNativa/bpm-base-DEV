class ContextoValidacao {
    /**
     * @type {Map<string, Campo>}
     */
    #campos = new Map();
    /**
     * @type {Map<string, Array<Campo>>}
     */
    #listas = new Map();

    /**
     * @param validacao {Validacao}
     * @param campoMonitorado {Campo}
     */
    constructor(validacao, campoMonitorado) {
        for (/** @type {Campo} */
            const monitorado of validacao.camposMonitorados().flat()
        ) {
            const id = monitorado.idAgrupado;

            if (validacao.afetaVariasLinhas) {
                if (!this.#listas.has(id)) {
                    this.#listas.set(id, []);
                }

                this.#listas.get(id).push(monitorado);
            }
            else if (monitorado.linhaLista === campoMonitorado.linhaLista) {
                this.#campos.set(id, monitorado);
            }
        }
    }

    obterCampo(id = "") {
        return this.#campos.get(id);
    }

    obterLista(id = "") {
        return this.#listas.get(id);
    }
}