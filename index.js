const ID_TIERLIST = "dc7d0566-1058-4444-b5c4-4386b6cb77bc";
const ID_HENRICOLA = "cb95e42a60fb4ac6a1b42daa9fd4c832";
const ID_COLUNA_ESQUERDA = "937e2804-92ff-4994-b820-9e7130487fb6";
const ID_COLUNA_DIREITA = "f7ad9de2-c931-4c57-8205-042bc557cc39";

const Tipo = {
	SemData: "Sem data",
	Filmes: "Formato de filmes",
	Albuns: "Formato de albuns",
    TedTalks: "Formato TedTalks",
    Shows: "Formato Shows",
}

let dictTipos = {
    "Animes": Tipo.SemData,
    "Séries": Tipo.SemData,
    "Animações": Tipo.Filmes,
    "Jogos - Videogame": Tipo.SemData,
    "Jogos - Tabuleiro": Tipo.SemData,
    "Mangas e HQ\’s": Tipo.SemData,
    "Livros": Tipo.SemData,
    "Ted Talks": Tipo.TedTalks,
    "Filmes - Longas": Tipo.Filmes,
    "Filmes - Curtas": Tipo.Filmes,
    "Comédia": Tipo.SemData,
    "Documentários": Tipo.SemData,
    "Álbuns": Tipo.Albuns,
    "Reality Shows": Tipo.SemData,
    "RPG\’s": Tipo.SemData,
    "Shows": Tipo.Shows,
}

let elementosGerais = [];

const dotenv = require('dotenv').config();
const { Client } = require('@notionhq/client');

// Init Client
const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function creteDatabase(parentId, DatabaseName) {
  const response = await notion.databases.create({
      parent: {
        type: "page_id",
        page_id: `${parentId}`,
      },
      title: [
        {
          type: "text",
          text: {
            content: `${DatabaseName}`,
            link: null,
          },
        },
      ],
        properties: {
            Nome: {
                title: {},
            },
            Nota: {
                number: {
                format: "percent",
            },
        }
        }
    });
  console.log(response);
  return response;
};

async function SepararElementos(string, tipo, ObjElemento) {
    let elemento = {}
    let item = string.split(" - ");
    if (tipo === Tipo.SemData || tipo === Tipo.Filmes) {
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
        elemento.Nota = nota;
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
        elemento.Mes = mes;
        elemento.Ano = ano;
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
            elemento.Porcentagem = ((elemento.MusicaBoa / elemento.Musicas) * 100).toFixed(2);
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
        elemento.Nota = nota;
    }
    else if (tipo === Tipo.Shows) {
        elemento.Nome = item[0];
        elemento.Data = item[1];
    }
    ObjElemento.elementos.push(elemento);
}

async function consultarPagina(IdPagina) {
    return await notion.blocks.retrieve({
        block_id: IdPagina,
    });
}

async function consultarFilhosPagina(IdPagina, IdProxPágina) {
    return await notion.blocks.children.list({
        block_id: IdPagina,
        page_size: 100,
        start_cursor: IdProxPágina,
    });
}

async function SepararElementosAPI(idColuna, index, objCFP) {
    let i = 0;
    let aux;

    let ObjElemento = {
        NomeDaColuna: null,
        elementos: []
    }

    let IdCategoria = objCFP.results[index].id;

    ObjElemento.NomeDaColuna = await SelecionandoNomeCategoria(objCFP, index);

    // Coloca todos os elementos da coleção numerada em um objeto
    do {
        if(i === 0) {
            aux = await consultarFilhosPagina(IdCategoria, undefined);
            i++;
        }
        else {
            aux = await consultarFilhosPagina(IdCategoria, aux.next_cursor);
        }

        for (let i = 0; i < aux.results.length; i++) {
            if(aux.results[i].hasOwnProperty('numbered_list_item')) {
                SepararElementos(aux.results[i].numbered_list_item.rich_text[0].plain_text, dictTipos[ObjElemento.NomeDaColuna], ObjElemento);
            }
        }
    } while (aux.next_cursor != null)

    elementosGerais.push(ObjElemento);
}

async function SelecionandoNomeCategoria(objCFP, index) {

    let aux = objCFP.results[index].heading_2.rich_text[0].plain_text;

    return aux;
}

async function printar(idColuna) {
    let aux = await consultarFilhosPagina(idColuna, undefined);

    for(let i = 0; i < aux.results.length; i++) {
        await SepararElementosAPI(idColuna, i, aux);
    }

    console.log(elementosGerais[4]);
}

printar(ID_COLUNA_DIREITA);