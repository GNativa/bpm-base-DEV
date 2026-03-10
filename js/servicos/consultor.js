class Consultor {
    static async carregarFonte(fonte, token) {
        if (!fonte.realizarConsulta()) {
            return;
        }

        if (fonte.tipo === Constantes.fontes.tipos.tabela) {
            if (!token) {
                throw new Error("Os dados não puderam ser carregados. Tente novamente mais tarde.");
            }

            let urlConsulta = "https://platform.senior.com.br/t/senior.com.br/bridge/1.0/rest/platform/ecm_form/actions/getResultSet";
            let corpo = {
                dataSource: `${fonte.nome}`,
                dataSourceField: `${fonte.campoChave}`,
                token: `${token}`,
                top: 50000,
                filters: fonte.obterFiltros() ?? [],
                searchingValue: fonte.obterValorPesquisa()
                // filters: [
                    // {
                    //   "logicalOperator": "AND",
                    //   "fieldName": "nomeCampoFonte",
                    //   "operator": "=",
                    //   "openingOrder": "(",
                    //   "closingOrder": ")",
                    //   "value": "'valor'"
                    // }
                // ]
            };

            let init = {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": `bearer ${token}`,
                },
                body: JSON.stringify(corpo),
            };

            let parametrosRequisicao = fonte.parametros.requisicao;
            let parametrosCorpo = fonte.parametros.corpo;

            for (const parametro in parametrosRequisicao) {
                init[parametro] = parametrosRequisicao[parametro];
            }

            for (const parametro in parametrosCorpo) {
                corpo[parametro] = parametrosCorpo[parametro];
            }

            let resposta = await fetch(urlConsulta, init);

            let json = await resposta.json();

            if (json["message"]) {
                throw Error("Não foi concedida a devida autorização para consultas de dados.");
            }

            if (json["errorCode"]) {
                let msg = json["message"];
                throw Error(msg);
            }

            return JSON.parse(json["data"].replace("\\", ""))["value"];
        }
        else if (fonte.tipo === Constantes.fontes.tipos.api) {
            if (!fonte.realizarConsulta()) {
                return [];
            }

            let urlConsulta = fonte.urlBase;
            const parametrosUrl = fonte.parametros.url;

            if (fonte.parametros.obterSufixoUrl !== null) {
                try {
                    urlConsulta += fonte.parametros.obterSufixoUrl();
                }
                catch (e) {
                    throw e;
                }
            }
            else {
                for (const parametro of parametrosUrl) {
                    urlConsulta += parametro;
                }
            }

            const init = {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
            };

            let parametrosRequisicao = fonte.parametros.requisicao;

            for (const parametro in parametrosRequisicao) {
                init[parametro] = parametrosRequisicao[parametro];
            }

            if (init.method !== "GET" && init.method !== "HEAD") {
                const corpo = fonte.parametros.corpo;
                let parametrosCorpo = fonte.parametros.corpo;

                for (const parametro in parametrosCorpo) {
                    corpo[parametro] = parametrosCorpo[parametro];
                }

                init.body = JSON.stringify(corpo);
            }

            const resposta = await fetch(urlConsulta, init);
            const json = await resposta.json();

            return [json];
        }

        return [];
    }
}