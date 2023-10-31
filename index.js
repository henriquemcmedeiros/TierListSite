const ID_TIERLIST = "b0964a9a-f888-4ba1-be7f-e36d201f009c";

// ===== Conexão NOTIION API =====
const dotenv = require('dotenv').config();
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// ===== LEITOR DE INPUT TERMINAL =====
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

const Tipo = {
	SemData: "Sem data",
	Filmes: "Formato de Filmes",
	Albuns: "Formato de Albuns",
    TedTalks: "Formato TedTalks",
    Shows: "Formato Shows",
    Livros: "Formato Livros",
}

const dictTipos = {
    "Animes": Tipo.SemData,
    "Séries": Tipo.SemData,
    "Animações": Tipo.Filmes,
    "Jogos - Videogame": Tipo.SemData,
    "Jogos - Tabuleiro": Tipo.SemData,
    "Mangas e HQ\’s": Tipo.Livros,
    "Livros": Tipo.Livros,
    "Ted Talks": Tipo.TedTalks,
    "Filmes - Longas": Tipo.Filmes,
    "Filmes - Curtas": Tipo.Filmes,
    "Comédia": Tipo.Filmes,
    "Documentários": Tipo.Filmes,
    "Álbuns": Tipo.Albuns,
    "Reality Shows": Tipo.SemData,
    "RPG\’s": Tipo.SemData,
    "Shows": Tipo.Shows,
}

let ObjContador = {
    Filmes: 0,
    Albuns: 0,
    Series: 0,
    Livros: 0,
    Jogos: 0,
    Shows: 0,
    TedTalks: 0,
}

let arrElemid = [];

let ObjPrincipal = [];

let Colunas = {};
let Categorias = {};
let Elementos = {};

let idInicialCategoria = 0

async function mainGeral(NomeCategoria = "", input = ""){
    Colunas = await consultarFilhosPagina(ID_TIERLIST, undefined);

    for(let i = 0; i < Colunas.results.length; i++) {
        Categorias = await consultarFilhosPagina(Colunas.results[i].id, undefined);
        arrElemid = [];
        idInicialCategoria = 0;
        let primeiraInteracaoColocar = true;

        for(let j = 0; j < Categorias.results.length; j++) {
            let primeiraInteracao = true;

            let ObjCategoria = {
                NomeDaCategoria: null,
                NumElementos: null,
                elementos: []
            }

            ObjCategoria.NomeDaCategoria = Categorias.results[j].heading_2.rich_text[0].plain_text;

            if (input !== "" && NomeCategoria === ObjCategoria.NomeDaCategoria && primeiraInteracaoColocar) {
                await ColocarItem(Categorias.results[j].id, input);
                primeiraInteracaoColocar = false;
            }
            if (!primeiraInteracaoColocar || input === "") {
                do {
                    if(primeiraInteracao) {
                        Elementos = await consultarFilhosPagina(Categorias.results[j].id, undefined);
                        primeiraInteracao = false;
                    }
                    else {
                        Elementos = await consultarFilhosPagina(Categorias.results[j].id, Elementos.next_cursor);
                    }
            
                    for (let k = 0; k < Elementos.results.length; k++) {
                        if(Elementos.results[k].hasOwnProperty('numbered_list_item')) {
                            elemento = SepararElementos(Elementos.results[k].numbered_list_item.rich_text[0].plain_text, dictTipos[ObjCategoria.NomeDaCategoria], ObjCategoria);
                            arrElemid.push(Elementos.results[k].id)
                        }
                    }
                } while (Elementos.next_cursor != null)
    
                ObjCategoria.elementos.sort(MeuSort);
                
                let controleInicial = 0
                let indexElemColocado = await acharIndexElemColocado(ObjCategoria, input)
                
                if(indexElemColocado != -1) {
                    controleInicial = indexElemColocado
                }

                console.log(`Posição: ${controleInicial + 1} de ${arrElemid.length} elementos`)

                for (let k = controleInicial; k < arrElemid.length; k++) {
                    let stringFormatada = criarString(ObjCategoria.elementos[k], ObjCategoria.NomeDaCategoria);
                    //console.log(`k: ${k} - idInicialCategoria: ${idInicialCategoria}`);
                    let fezUpdate = await updateCategoria(arrElemid[idInicialCategoria + k], stringFormatada);
                    if(!fezUpdate) {
                        k--;
                    }
                }
                idInicialCategoria += arrElemid.length;
    
                console.log("=========================");
                primeiraInteracaoColocar = true;
            }
            ObjPrincipal.push(ObjCategoria);
        }
    }
}

async function acharIndexElemColocado(ObjCategoria, input) {
    input = input.split(" - ");
    inputNome = input[0].replace(/\d{4}|\(|\)|1 a \d{2}/g, "").trim()
    for (let i = 0; i < ObjCategoria.elementos.length; i++) {
        let elementoAtualCategoria = ObjCategoria.elementos[i].Nome.replace(/\(|\)|1 a \d{2}/g, "").trim();
        if (elementoAtualCategoria === inputNome) {
            return i;
        }
    }
    return -1; 
}

async function consultarFilhosPagina(IdPagina, IdProxPágina) {
    return await notion.blocks.children.list({
        block_id: IdPagina,
        page_size: 100,
        start_cursor: IdProxPágina,
    });
}

function SepararElementos(string, tipo, ObjCategoria) {
    let elemento = {}
    let item = string.split(" - ");
    if (tipo === Tipo.SemData || tipo === Tipo.Filmes || tipo === Tipo.Livros) {
        if (tipo === Tipo.SemData) {
            elemento.Nome = item[0];
        }
        else if(tipo === Tipo.Filmes) {
            let nomeAnoFilme = item[0].replace(/\(|\)/gi, "");
            let ano = nomeAnoFilme.substring(nomeAnoFilme.length - 4);
            if (!ano.match(/[0-9]+/g)) {
                ano = null;
            }
            let nome = nomeAnoFilme.replace(ano, "").trim();
            elemento.Nome = nome;
            elemento.Ano = ano;
        } 
        else if (tipo === Tipo.Livros) {
            let encontrouAgrupamento = false;
            elemento.Nome = "";
            elemento.Agrupamento = "";
            for (let i = 0; i < item[0].length; i++) {
                if (item[0][i] !== "(" && !encontrouAgrupamento) {
                    elemento.Nome += item[0][i];
                }
                else if(item[0][i] === "(") {
                    encontrouAgrupamento = true;
                }
                else if (encontrouAgrupamento && item[0][i] !== ")"){
                    elemento.Agrupamento += item[0][i];
                }
            }
        }
        // Lógica de alocação de nota padrão
        let nota = "";
        
        for (let i = 0; i < 4; i++) {
            if (item[1]) {
                if(item[1][i] == "/") {
                    break;
                }
                nota += item[1][i];
            }
        }
        elemento.Nota = parseFloat(nota.replace(",", "."));
    }
    else if (tipo == Tipo.Albuns) {
        // Exemplo - X&Y - Coldplay - 06/2005 - 13/13 - 100%
        elemento.Nome = item[0];
        elemento.NomeArtista = [];
        let artistas = item[1].split(", ");
        for (let artista of artistas) {
            elemento.NomeArtista.push(artista);
        }
        let mes = "";
        let ano = "";
        // Lógica data por mês/ano
        let ehMes = true;
        for (let i = 0; i < 7; i++) {
            if(item[2][i] != "/" && ehMes) {
                mes +=  item[2][i]
            }
            else if (item[2][i] == "/") {
                ehMes = false;
            }
            else if(!ehMes) {
                ano += item[2][i];
            }
        }
        elemento.Mes = parseInt(mes);
        elemento.Ano = parseInt(ano);
        let numMusicasBoas = "";
        let numMusicas = "";
        // Lógica para número de músicas e quantidade de músicas boas
        let ehMusicaBoa = true;
        for (let i = 0; i < 5; i++) {
            if(item[3][i] != "/" && ehMusicaBoa) {
                numMusicasBoas +=  item[3][i]
            }
            else if (item[3][i] == "/") {
                ehMusicaBoa = false;
            }
            else if(!ehMes) {
                numMusicas += item[3][i];
            }
            elemento.MusicaBoa = parseInt(numMusicasBoas);
            elemento.Musicas = parseInt(numMusicas);
            elemento.Porcentagem = parseFloat(((elemento.MusicaBoa / elemento.Musicas) * 100).toFixed(2));
        }
    }
    else if(tipo === Tipo.TedTalks) {
        elemento.Nome = item[0];
        elemento.Palestrante = item[1];
        
        let nota = "";
        
        for (let i = 0; i < 4; i++) {
            if (item[1]) {
                if(item[2][i] == "/") {
                    break;
                }
                nota += item[2][i];
            }
        }
        elemento.Nota = parseFloat(nota.replace(",", "."));
    }
    else if (tipo === Tipo.Shows) {
        elemento.Nome = item[0];
        elemento.Data = item[1];
    }

    ObjCategoria.elementos.push(elemento);
    return elemento;
}

function MeuSort(a, b) {
    if(a.hasOwnProperty('Nota')) {
        if (a.Nota > b.Nota)
            return -1;
        if (a.Nota < b.Nota)
            return 1;
        return 0;
    } else if(a.hasOwnProperty('Porcentagem')) {
        // Ordena por Porcentagem -> Núm Músicas -> Ano -> Mês -> Quantidade de Artistas
        if (a.Porcentagem > b.Porcentagem)
            return -1;
        else if (a.Porcentagem < b.Porcentagem)
            return 1;
        else if (a.Musicas > b.Musicas)
            return -1;
        else if (a.Musicas < b.Musicas)
            return 1;
        else if (a.Ano > b.Ano)
            return 1;
        else if (a.Ano < b.Ano)
            return -1;
        else if (a.Mes > b.Mes)
            return 1;
        else if (a.Mes < b.Mes)
            return -1;
        else if (parseInt(a.NomeArtista.length) > parseInt(b.NomeArtista.length))
            return 1;
        else if (parseInt(a.NomeArtista.length) < parseInt(b.NomeArtista.length))
            return -1;
        return 0;
    }
    
}

function criarString(objArquivo, tipo) {
    let novoTxt = "";

    tipo = dictTipos[tipo];

    if (tipo === Tipo.SemData) {
        novoTxt += `${objArquivo.Nome} - ${objArquivo.Nota}/10`;
    } else if (tipo === Tipo.Filmes) {
        if (objArquivo.Ano != null) {
            novoTxt += `${objArquivo.Nome} (${objArquivo.Ano}) - ${objArquivo.Nota}/10`;
        }
        else {
            novoTxt += `${objArquivo.Nome} - ${objArquivo.Nota}/10`;
        }
    } else if (tipo === Tipo.Albuns) {
        let nomeArtista = "";
        for (let j = 0; j < objArquivo.NomeArtista.length; j++) {
            nomeArtista += objArquivo.NomeArtista[j];
            if (!(j === objArquivo.NomeArtista.length - 1)) {
                nomeArtista += ", "
            }
        }
        novoTxt += `${objArquivo.Nome} - ${nomeArtista} - ${objArquivo.Mes}/${objArquivo.Ano} - ${objArquivo.MusicaBoa}/${objArquivo.Musicas} - ${objArquivo.Porcentagem}%`;
    } else if (tipo === Tipo.Shows) {
        novoTxt += `${objArquivo.Nome} - ${objArquivo.Data}`
    } else if (tipo === Tipo.TedTalks) {
        novoTxt += `${objArquivo.Nome} - ${objArquivo.Palestrante} - ${objArquivo.Nota}/10`;
    } else if (tipo === Tipo.Livros) {
        if (objArquivo.Agrupamento !== "") {
            novoTxt += `${objArquivo.Nome}(${objArquivo.Agrupamento}) - ${objArquivo.Nota}/10`;
        }
        else {
            novoTxt += `${objArquivo.Nome} - ${objArquivo.Nota}/10`;
        }
    }
    return novoTxt;
}

async function updateCategoria(idElemento, stringFormatada) {
    try {
        let response = await notion.blocks.update({
            "block_id": idElemento,
            "numbered_list_item": {
                "rich_text": [
                    {
                        "text": {
                            "content": stringFormatada,
                        },
                    }
                ]
            }
        });

        if (response.status) {
            throw "Erro ao dar Update";
        }
        else {
            console.log(stringFormatada);
            return true;
        }
    } catch (error) {
        console.error(error);
        return false;
    }
}

async function contadorElementosCategoriaAgrupado() {
    for (let i = 0; i < ObjPrincipal.length; i++) {
        let nomeCategoria = ObjPrincipal[i].NomeDaCategoria;
        if (nomeCategoria === "Jogos - Videogame" || nomeCategoria === "Jogos - Tabuleiro") {
            ObjContador.Jogos += ObjPrincipal[i].NumElementos;
        }
        else if (nomeCategoria === "Shows") {
            ObjContador.Shows += ObjPrincipal[i].NumElementos;
        }
        else if (nomeCategoria === "Ted Talks") {
            ObjContador.TedTalks += ObjPrincipal[i].NumElementos;
        }
        else if (nomeCategoria === "Álbuns") {
            ObjContador.Albuns += ObjPrincipal[i].NumElementos;
        }
        else if (nomeCategoria === "Livros" || nomeCategoria === "Mangas e HQ\’s") {
            for (let l = 0; l < ObjPrincipal[i].elementos.length; l++) {
                if (ObjPrincipal[i].elementos[l].Agrupamento === "") {
                    ObjContador.Livros++
                }
                else {
                    let aux = ObjPrincipal[i].elementos[l].Agrupamento.split(" ");

                    ObjContador.Livros += parseInt(aux[aux.length - 1]);
                }
            }
        }
        else if (nomeCategoria === "Filmes - Longas" || nomeCategoria === "Filmes - Curtas" || nomeCategoria === "Animações" || nomeCategoria === "Comédia" || nomeCategoria === "Documentários") {
            if(nomeCategoria === "Filmes - Longas" || nomeCategoria === "Filmes - Curtas") {
                ObjContador.Filmes += ObjPrincipal[i].NumElementos;
            }
            else {
                for (let j = 0; j < ObjPrincipal[i].elementos.length; j++) {
                    if (ObjPrincipal[i].elementos[j].Ano != null) {
                        ObjContador.Filmes++;
                    }
                    else {
                        ObjContador.Series++;
                    }
                }
            }
        }
        else if (nomeCategoria === "Animes" || nomeCategoria === "Séries" || nomeCategoria === "Animações" || nomeCategoria === "Comédia" || nomeCategoria === "Documentários" || nomeCategoria === "Reality Shows" || nomeCategoria === "RPG\’s") {
            if(nomeCategoria === "Animes" || nomeCategoria === "Séries" || nomeCategoria === "Reality Shows" || nomeCategoria === "RPG\’s") {
                ObjContador.Series += ObjPrincipal[i].NumElementos;
            }
            else {
                console.log(ObjPrincipal[i].elementos);
                for (let j = 0; j < ObjPrincipal[i].elementos.length; j++) {
                    if (ObjPrincipal[i].elementos[j].Ano == null) {
                        ObjContador.Series++;
                    }
                    else {
                        ObjContador.Filmes++;
                    }
                }
            }
        }
    }

    console.log("=============");
    for (const chave in ObjContador) {
        if (ObjContador.hasOwnProperty(chave)) {
          console.log(`${chave}: ${ObjContador[chave]}`);
        }
    }
    console.log("=============");
}

async function contadorElementosCategoria(estatistica = false){
    Colunas = await consultarFilhosPagina(ID_TIERLIST, undefined);

    for(let i = 0; i < Colunas.results.length; i++) {
        arrElemid = [];
        Categorias = await consultarFilhosPagina(Colunas.results[i].id, undefined);

        for(let j = 0; j < Categorias.results.length; j++) {
            let primeiraInteracao = true;

            let ObjCategoria = {
                NomeDaCategoria: null,
                NumElementos: null,
                elementos: []
            }

            ObjCategoria.NomeDaCategoria = Categorias.results[j].heading_2.rich_text[0].plain_text;

            do {
                if(primeiraInteracao) {
                    Elementos = await consultarFilhosPagina(Categorias.results[j].id, undefined);
                    primeiraInteracao = false;
                }
                else {
                    Elementos = await consultarFilhosPagina(Categorias.results[j].id, Elementos.next_cursor);
                }
        
                for (let k = 0; k < Elementos.results.length; k++) {
                    if(Elementos.results[k].hasOwnProperty('numbered_list_item')) {
                        elemento = SepararElementos(Elementos.results[k].numbered_list_item.rich_text[0].plain_text, dictTipos[ObjCategoria.NomeDaCategoria], ObjCategoria);
                        
                        arrElemid.push(Elementos.results[k].id)
                    }
                }
            } while (Elementos.next_cursor != null)

            ObjCategoria.NumElementos = ObjCategoria.elementos.length;

            ObjPrincipal.push(ObjCategoria);
        }
    }
    if (!estatistica) {
        contadorElementosCategoriaAgrupado();
    }
}

async function ColocarItem(IdCategoria, stringProcessada) {
    const response = await notion.blocks.children.append({
      block_id: IdCategoria,
      children: [
        {
          "numbered_list_item": {
            "rich_text": [
              {
                "text": {
                  "content": stringProcessada,
                }
              }
            ]
          }
        },
      ],
    });
    console.log((response.hasOwnProperty("object")) ? "=== Inserido com sucesso! ===" : response);
}

async function calcularEstatisticas() {
    await contadorElementosCategoria(true);

    for (let categoria of ObjPrincipal) {
        let nomeCategoria = categoria.NomeDaCategoria;
        
        if (nomeCategoria === "Álbuns") {
            let estatisticasGeraisAlbuns = {
                NumMusicasTotais: 0,
                NumMusicasBoasTotais: 0,
                PorcentagemMedia: null
            }
            let artistas = [];
            let artistasInseridos = []

            for(let album of categoria.elementos){
                for(let artistaItem of album.NomeArtista) {
                    let artista = {
                        NomeArtista: null,
                        NumAlbuns: 0,
                        NumMusicas: 0,
                        NumMusicasBoas: 0,
                        Porcentagem: null
                    }

                    if (!artistasInseridos.includes(artistaItem)) {

                        artista.NomeArtista = artistaItem;

                        artistas.push(artista);
                        artistasInseridos.push(artistaItem);
                    } else {
                        artista.NumAlbuns++;
                    }

                    for (let artista of artistas) {
                        if(artista.NomeArtista === artistaItem) {
                            artista.NumAlbuns++;
                            artista.NumMusicas += parseInt(album.Musicas);
                            artista.NumMusicasBoas += parseInt(album.MusicaBoa);
                            artista.Porcentagem = parseFloat(((artista.NumMusicasBoas / artista.NumMusicas) * 100).toFixed(2));
                            break;
                        }
                    }
                    estatisticasGeraisAlbuns.NumMusicasTotais += artista.NumMusicas;
                    estatisticasGeraisAlbuns.NumMusicasBoasTotais += artista.NumMusicasBoas;
                }
            }
            estatisticasGeraisAlbuns.PorcentagemMedia = parseFloat(((estatisticasGeraisAlbuns.NumMusicasBoasTotais / estatisticasGeraisAlbuns.NumMusicasTotais) * 100).toFixed(2));

            console.log(`Número de artistas: ${artistas.length}`)
            console.log(`Estatisticas Gerais: `);
            console.log(estatisticasGeraisAlbuns);
            console.log(artistas.sort(MeuSort));
        }


    }
}

async function escolhaInserir() {
    console.log(
        "[1] Filmes - Longas \n[2] Animações \n[3] Animes \n[4] Comédia \n[5] Jogos - Tabuleiro \n[6] RPG’s \n[7] Filmes - Curtas \n[8] Reality Shows \n[9] Álbuns \n[10] Jogos - Videogame \n[11] Séries \n[12] Mangas e HQ’s \n[13] Documentários \n[14] Livros \n[15] Shows \n[16] Ted Talks"
    )

    readline.question('Escolha: \n', async escolha => {
        escolha = parseInt(escolha);

        switch (escolha) {
            case 1:
                return "Filmes - Longas"
            case 2:
                return "Animações"
            case 3:
                return "Animes"
            case 4:
                return "Comédia"
            case 5:
                return "Jogos - Tabuleiro"
            case 6:
                return "RPG’s"
            case 7:
                return "Filmes - Curtas"
            case 8:
                return "Reality Shows"
            case 9:
                return "Álbuns"
            case 10:
                return "Jogos - Videogame"
            case 11:
                return "Séries"
            case 12:
                return "Mangas e HQ’s"
            case 13:
                return "Documentários"
            case 14:
                return "Livros"
            case 15:
                return "Shows"
            case 16:
                return "Ted Talks"
            default:
                console.log("Você não escolheu uma opção válida");
                return 0;
        }
    });
}

async function formatacaoInserir(nomeCategoria) {
    console.log(nomeCategoria)
    if (nomeCategoria === "Filmes - Longas" || nomeCategoria === "Filmes - Curtas") {
        let nome = readline.question('Nome: ', nome => { return nome });
        let ano = readline.question('Ano: ', ano => { return parseInt(ano) });
        let nota = readline.question('Nota: ', nota => { return parseFloat(nota) });

        return `${nome} (${ano}) - ${nota}/10`
    }
}


async function menu () {
    console.log(
        "[1] Inserir valor \n[2] Contador de elementos \n[3] Estatisicas \n[4] SAIR"
    )

    readline.question('Escolha: \n', async escolha => {
        escolha = parseInt(escolha);

        switch (escolha) {
            case 1:
                let entrada = await escolhaInserir().then(tipo => {formatacaoInserir(tipo);});
                break;
            case 2:
                console.log("Fazendo o cálculo dos elementos...");
                await contadorElementosCategoria();
                readline.close();
                break;
            case 3:
                console.log("Fazendo o cálculo estatístico...");
                await calcularEstatisticas();
                readline.close();
                break;
            case 4:
                console.log("Saindo...")
                readline.close();
                break;
            default:
                console.log("Você não escolheu uma opção válida");
                readline.close();
                break;
        }
    });
}


menu();

/*consultarFilhosPagina("b0964a9a-f888-4ba1-be7f-e36d201f009c").then((a) => {
    console.log(a);
});*/

// ===== TESTES =====
//mainGeral("Animações", "Teste (2023) - 0/10")
//mainGeral("Animes", "Teste - 0/10")
//mainGeral("Comédia", "Teste (2023) - 0/10")
//mainGeral("Jogos - Tabuleiro", "Teste - 0/10")
//mainGeral("RPG’s", "Teste - 0/10")
//mainGeral("Filmes - Curtas", "Teste (2023) - 0/10")
//mainGeral("Reality Shows", "Teste - 0/10")
//mainGeral("Álbuns", "Teste - Teste - 8/2023 - 0/10 - 0%")
//mainGeral("Jogos - Videogame", "Teste - 0/10")
//mainGeral("Séries", "Teste - 0/10")
//mainGeral("Mangas e HQ’s", "Teste (1 a 12) - 0/10")
//mainGeral("Documentários", "Teste (2023) - 0/10")
//mainGeral("Livros", "Teste - 0/10")
//mainGeral("Shows", "Teste - 08/2023")
//mainGeral("Ted Talks", "Teste - Teste - 0/10")