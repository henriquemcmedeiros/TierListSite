const Tipo = {
	SemData: "Sem data",
	Filmes: "Data no formato de filmes",
	Albuns: "Data no formato de albuns",
}

function SepararElementos(arquivo, tipo) {
    let elementos = [];

    fetch(`${arquivo}.txt`)
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
    });
    return elementos;
}

// let objAnimes = SepararElementos("animes", Tipo.SemData);
// let objAnimacoes = SepararElementos("animacoes", Tipo.Filmes);
//SepararElementos("albuns", Tipo.Albuns);
let objAlbuns = SepararElementos("albuns", Tipo.Albuns);
console.log(objAlbuns);