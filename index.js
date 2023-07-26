const ID_TIERLIST = "dc7d0566-1058-4444-b5c4-4386b6cb77bc";
const ID_HENRICOLA = "cb95e42a60fb4ac6a1b42daa9fd4c832";
const ID_COLUNA_ESQUERDA = "937e2804-92ff-4994-b820-9e7130487fb6";
const ID_COLUNA_DIREITA = "f7ad9de2-c931-4c57-8205-042bc557cc39";

const NUM_ELEMENTOS_COLUNA = 8;

const Tipo = {
	SemData: "Sem data",
	Filmes: "Formato de filmes",
	Albuns: "Formato de albuns",
    TedTalks: "Formato TedTalks",
    Shows: "Formato Shows",
}

const Categoria = [
    "Animes",
    "Séries",
    "Animações",
    "Jogos - Videogame",
    "Jogos - Tabuleiro",
    "Mangas e HQ\’s",
    "Livros",
    "Ted Talks",
    "Filmes - Longas",
    "Filmes - Curtas",
    "Comédia",
    "Documentários",
    "Álbuns",
    "Reality Shows",
    "RPG\’s",
    "Shows",
]

const dictTipos = {
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
    "Teste": Tipo.SemData,
}

let elementosGerais = [];

const dotenv = require('dotenv').config();
const { Client } = require('@notionhq/client');
const e = require('express');

// Init Client
const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function printar() {
    await Busca(ID_COLUNA_DIREITA);
    await printar2(ID_COLUNA_DIREITA);

    await Busca(ID_COLUNA_ESQUERDA);
    printar2(ID_COLUNA_ESQUERDA);
}

async function Busca(idColuna) {
    let aux = await consultarFilhosPagina(idColuna, undefined);

    for(let i = 0; i < aux.results.length; i++) {
        await SepararElementosAPI(i, aux);
    }

    return aux;
}

async function printar2(idColuna) {
    let auxColuna = await consultarFilhosPagina(idColuna, undefined);

    for(let i = 0; i < auxColuna.results.length; i++){
        let comeco = 0;
        let primeiraInteracao = true;

        elementosGerais[i].elementos.sort(MeuSort);

        do {
            if(primeiraInteracao) {
                auxElemento = await consultarFilhosPagina(auxColuna.results[i].id, undefined);
                primeiraInteracao = false;
            }
            else {
                auxElemento = await consultarFilhosPagina(auxColuna.results[i].id, auxElemento.next_cursor);
            }

            let limitador = (elementosGerais[i].elementos.length - comeco > 100) ? 100 : auxElemento.results.length;

            console.log(`Começo: ${comeco} - Limitador: ${limitador}`);
            
            let controlador = 0;

            for (let j = comeco; j < limitador + comeco; j++){
                let stringFormatada = criarString(elementosGerais[i].elementos[j], elementosGerais[i].NomeDaCategoria);
                await updateCategoria(auxElemento.results[controlador].id, stringFormatada);
                controlador++;
            }
            comeco += 100;
        } while (auxElemento.next_cursor != null)
        console.log("=======================================");
    }
}

async function consultarFilhosPagina(IdPagina, IdProxPágina) {
    return await notion.blocks.children.list({
        block_id: IdPagina,
        page_size: 100,
        start_cursor: IdProxPágina,
    });
}

async function SepararElementosAPI(index, objCFP) {
    let primeiraInteracao = true;
    let aux;

    let ObjElemento = {
        NomeDaCategoria: null,
        elementos: []
    }

    let IdCategoria = objCFP.results[index].id;

    ObjElemento.NomeDaCategoria = await SelecionandoNomeCategoria(objCFP, index);

    // Coloca todos os elementos da coleção numerada em um objeto
    do {
        if(primeiraInteracao) {
            aux = await consultarFilhosPagina(IdCategoria, undefined);
            primeiraInteracao = false;
        }
        else {
            aux = await consultarFilhosPagina(IdCategoria, aux.next_cursor);
        }

        for (let i = 0; i < aux.results.length; i++) {
            if(aux.results[i].hasOwnProperty('numbered_list_item')) {
                SepararElementos(aux.results[i].numbered_list_item.rich_text[0].plain_text, dictTipos[ObjElemento.NomeDaCategoria], ObjElemento);
            }
        }
    } while (aux.next_cursor != null)

    elementosGerais.push(ObjElemento);
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
    }
    return novoTxt;
}

async function updateCategoria(idCategoria, stringFormatada) {
    await notion.blocks.update({
        "block_id": idCategoria,
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
    console.log(stringFormatada);
}

async function SelecionandoNomeCategoria(objCFP, index) {
    return objCFP.results[index].heading_2.rich_text[0].plain_text;
}

function SepararElementos(string, tipo, ObjElemento) {
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

function MeuSort(a, b) {
    if(a.hasOwnProperty('Nota')) {
        if (a.Nota > b.Nota)
            return -1;
        if (a.Nota < b.Nota)
            return 1;
        return 0;
    } else if(a.hasOwnProperty('Porcentagem')) {
        if (a.Porcentagem > b.Porcentagem)
            return -1;
        if (a.Porcentagem < b.Porcentagem)
            return 1;
        return 0;
    }
    
}
/*async function creteDatabase(parentId, DatabaseName) {
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
};*/

/*async function consultarPagina(IdPagina) {
    return await notion.blocks.retrieve({
        block_id: IdPagina,
    });
}*/

/*async function ColocarItem(IdCategoria, stringProcessada) {
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
}*/

/*async function printarID(idColuna, categoriaNome, stringProcessada) {
    let aux = await consultarFilhosPagina(idColuna, undefined);

    for (let i = 0; i < aux.results.length; i++) {
        //console.log(`Categoria atual: ${aux.results[i].heading_2.rich_text[0].plain_text} - Categoria para adicionar: ${categoriaNome}`);
        if(aux.results[i].heading_2.rich_text[0].plain_text === categoriaNome) {
            await ColocarItem(aux.results[i].id, stringProcessada);
            break;
        }
    }
}*/

/*async function ChecarTipo(idColuna, index) {
    let aux = await consultarFilhosPagina(idColuna, undefined);

    return aux.results[index].heading_2.rich_text[0].plain_text;
}*/

/*async function criarStringVariosElementos(objArquivo, tipo) {
    let novoTxt = "";

    if (tipo === Tipo.SemData) {
        for(let i = 0; i < Object.keys(objArquivo).length; i++) {
            novoTxt += `${objArquivo[i].Nome} - ${objArquivo[i].Nota}/10\n`;
        }
    } else if (tipo === Tipo.Filmes) {
        for(let i = 0; i < Object.keys(objArquivo).length; i++) {
            if (objArquivo[i].Ano != null) {
                novoTxt += `${objArquivo[i].Nome} (${objArquivo[i].Ano}) - ${objArquivo[i].Nota}/10\n`;
            }
            else {
                novoTxt += `${objArquivo[i].Nome} - ${objArquivo[i].Nota}/10\n`;
            }
        }
    } else if (tipo === Tipo.Albuns) {
        for(let i = 0; i < Object.keys(objArquivo).length; i++) {
            let nomeArtista = "";
            for (let j = 0; j < objArquivo[i].NomeArtista.length; j++) {
                nomeArtista += objArquivo[i].NomeArtista[j];
                if (!(j === objArquivo[i].NomeArtista.length - 1)) {
                    nomeArtista += ", "
                }
            }
            novoTxt += `${objArquivo[i].Nome} - ${nomeArtista} - ${objArquivo[i].Mes}/${objArquivo[i].Ano} - ${objArquivo[i].MusicaBoa}/${objArquivo[i].Musicas} - ${objArquivo[i].Porcentagem}%`;
        }
    }
    return novoTxt;
}*/

/*async function printar2a(aux, comeco) {
    for (let i = comeco; i < elementosGerais.length; i++) {
        let primeiraInteracao = true;
        let aux3 = {};

        elementosGerais[i].elementos.sort(MeuSort);
        //console.log(elementosGerais[i].elementos);

        for (let j = 0; j < elementosGerais[i].elementos.length; j++){
            let a = criarString(elementosGerais[i].elementos[j], elementosGerais[i].NomeDaCategoria);
            console.log(a);
        }
        console.log("=======================================");
    }
    console.log("=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=");
}*/

/*async function aFuncao(idColuna){
    let aux = await consultarFilhosPagina(idColuna, undefined);

    for(let i = 0; i < aux.results.length; i++) {
        console.log(aux.results[i].id);
    }

    //console.log(aux);
}*/




// ===== MAIN =====
printar();
//aFuncao(ID_COLUNA_DIREITA);

//printarID(ID_COLUNA_ESQUERDA, "Ted Talks", "TedTesteKauan - Henrique Marques - 10/10");
