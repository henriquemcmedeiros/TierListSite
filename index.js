const ID_TIERLIST = "68d17b6b-ae27-499e-8ba9-8ea42e7f0931";

// ===== Conexão NOTIION API =====
const dotenv = require('dotenv').config();
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const Tipo = {
	SemData: "Sem data",
	Filmes: "Formato de filmes",
	Albuns: "Formato de albuns",
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
                console.log(controleInicial)

                for (let k = controleInicial; k < ObjCategoria.NumElementos; k++) {
                    let stringFormatada = criarString(ObjCategoria.elementos[k], ObjCategoria.NomeDaCategoria);
                    //console.log(`k: ${k} - idInicialCategoria: ${idInicialCategoria}`);
                    let fezUpdate = await updateCategoria(arrElemid[idInicialCategoria + k], stringFormatada);
                    if(!fezUpdate) {
                        k--;
                    }
                }
                idInicialCategoria += ObjCategoria.NumElementos;
    
                console.log("=========================");
                primeiraInteracaoColocar = true;
            }
            ObjPrincipal.push(ObjCategoria);
        }
    }
    contadorElementosCategoria();
}

async function acharIndexElemColocado(ObjCategoria, input) {
    for (let i = 0; i < ObjCategoria.elementos.length; i++) {
        inputNome = input.split(" - ");
        if (ObjCategoria.elementos[i].Nome === inputNome[0]) {
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
        // X&Y - Coldplay - 06/2005 - 13/13 - 100%
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
    console.log(ObjContador);
}

async function contadorElementosCategoria(){
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
    contadorElementosCategoriaAgrupado();
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
    console.log(response);
}

//mainGeral();

//mainGeral("Animações", "Liga da Justiça: Ponto de Ignição (2013) - 6,7");
//mainGeral("Filmes - Longas", "TesteFilmes - 8/10");
//mainGeral("Álbuns", "SUPER - Jão - 8/2023 - 12/14 - 85.71%");
//mainGeral("Filmes - Longas", "TesteFilmes - 0/10");

//mainGeral("Animações", "Teste (2023) - 10.0");
//mainGeral("Reality Shows", "Teste (2023) - 10.0");

//contadorElementosCategoria();

/*consultarFilhosPagina(ID_TIERLIST).then((a) => {
    console.log(a);
});*/