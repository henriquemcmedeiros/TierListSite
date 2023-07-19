const elementoP = document.createElement('td');
elementoP.innerHTML = 'Teste';

document.body.appendChild(elementoP);

// Notas sem data

// Enquanto a string não acabou
// Separa em cada item (\n)
// Separa em cada (" - ")
let itemLista = "".split(" - ");

let NomeItem = itemLista[0];
let Nota = parseInt(itemLista[1].substring(0, 2));

// Notas com data
itemLista = "".split(" - ");

NomeItem = itemLista[0];
Nota = parseInt(itemLista[1].substring(0, 2));