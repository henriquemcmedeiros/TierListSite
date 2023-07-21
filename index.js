const ID_TIERLIST = "dc7d0566-1058-4444-b5c4-4386b6cb77bc";
const ID_HENRICOLA = "cb95e42a60fb4ac6a1b42daa9fd4c832";

const Tipo = {
	SemData: "Sem data",
	Filmes: "Data no formato de filmes",
	Albuns: "Data no formato de albuns",
}

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
};

async function consultarPagina(IdPagina) {
    const response = await notion.blocks.retrieve({
        block_id: IdPagina,
    });
    console.log(response);
}

async function SepararElementosTxt(arquivo, tipo) {
    let elementos = [];

    await fetch(`${arquivo}.txt`)
    .then(response => response.text())
    .then(text => {
        const linha = text.split("\n");

        for (let coluna of linha) {
            let elemento = {}
            let item = coluna.split(" - ");

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
                
                for (let i = 0; i < 6; i++) {
                    if(item[1][i] == "/") {
                        break;
                    }
                    nota += item[1][i];
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

            elementos.push(elemento);
        }
    })
    .catch (() =>{
        console("A leitura do arquivo NÃO foi feita");
    });
    return elementos;
}

consultarPagina(ID_HENRICOLA);