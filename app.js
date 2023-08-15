//import { mainEspecifica } from '.';
import { mainGeral } from './index.js';

const express = require('express');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.send('hello, world!');
});

app.post('/', function(req, res) {
    mainGeral();
})

app.listen(3000, () => {
    console.log('our app is running locally...');
});