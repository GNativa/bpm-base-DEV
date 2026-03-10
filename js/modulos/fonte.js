class Fonte {
    constructor(id, nome, campoChave, campoValor, tipo, descricoes, realizarConsulta,
                obterFiltros, obterValorPesquisa, urlBase, parametros,
                tratarRetorno, formatarDados) {
        this.id = id;                         // Código de identificação da fonte no formulário
        this.nome = nome;                     // Nome de exibição e consulta nas APIs da plataforma
        this.campoChave = campoChave ?? "";   // Campo a ser utilizado em elementos select como chave
        this.campoValor = campoValor ?? "";   // Campo a ser utilizado em elementos select como chave
        this.dados = [];                      // Lista de registros obtidos por consulta
        this.tipo = tipo;                     // Tipo da fonte de dados com relação à origem dos dados (API, tabela, etc.)
        this.descricoes = descricoes ?? {};   // Correspondência dos nomes dos campos às suas descrições
        this.realizarConsulta = realizarConsulta ??
            function() {
                return true;
            };
        this.obterFiltros = obterFiltros ?? (() => []);         // Lista de filtros a serem aplicados na consulta das APIs da plataforma
        this.urlBase = urlBase ?? "";         // URL base para consulta por API
        this.parametros = parametros ??       // Parâmetros para consulta por API
            new ParametrosConsulta();
        this.tratarRetorno = tratarRetorno ?? // Função para tratar do retorno da fonte do tipo API de imediato
            function(retorno, parametrosAdicionais) {
            };
        this.formatarDados = formatarDados ?? // Função para formatar os dados da fonte do tipo API após o tratamento do retorno
            function(dados, parametrosAdicionais) {
                return dados;
            };

        this.registroAtual = null;
        this.camposInscritos = new Set();
        this.obterValorPesquisa = obterValorPesquisa ?? (() => null);
    }

    inscreverCampo(campo) {
        this.camposInscritos.add(campo);
    }

    atualizarRegistro(registro) {
        this.registroAtual = registro;
        this.notificarCampos();
    }

    notificarCampos() {
        this.camposInscritos.forEach((campo) => {
            if (campo.campoFonte) {
                campo.val(this.registroAtual?.[campo.campoFonte] ?? "");
                campo.notificar();
            }
        });
    }

    definirDados(dados) {
        this.tratarRetorno(dados);
        this.dados = this.formatarDados(dados);
    }

    obterOpcoes() {
        const opcoes = [];
        const chave = this.campoChave;
        const valor = this.campoValor;

        for (const obj of this.dados) {
            const opcao = new OpcaoLista(obj[chave], `${obj[chave]} - ${obj[valor]}`);
            opcoes.push(opcao);
        }

        return opcoes;
    }
}