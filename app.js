const Tipo = {
	SemData: "sem data",
	Filmes: "Data no formato de filmes",
	Albuns: "Data no formato de albuns",
}

let elementos = [];

function SepararElementos(arquivo, tipo) {
    fetch(`${arquivo}.txt`)
    .then(response => response.text())
    .then(text => {
        const linha = text.split("\n");

        for (let coluna of linha) {
            let elemento = {}
            let item = coluna.split(" - ");

            if (tipo === Tipo.SemData) {
                elemento.Nome = item[0];
                elemento.Nota = item[1].substring(0, 3);
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

            let nota = "";

            for (let i = 0; i < 6; i++) {
                if(item[1][i] == "/") {
                    break;
                }
                nota += item[1][i];
            }

            elemento.Nota = nota;

            elementos.push(elemento);
            console.log(elemento);
        }
        console.log(elementos);
    });
}

//SepararElementos("animes", Tipo.SemData);
SepararElementos("animacoes", Tipo.Filmes);

// Notas sem data

// Enquanto a string não acabou
// Separa em cada item (\n)
// Separa em cada (" - ")
/*let itemLista = "".split(" - ");

let NomeItem = itemLista[0];
let Nota = parseInt(itemLista[1].substring(0, 2));

// Notas com data
itemLista = "".split(" - ");

NomeItem = itemLista[0];
Nota = parseInt(itemLista[1].substring(0, 2));*/