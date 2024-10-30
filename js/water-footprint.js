function water() {
    var water = 0, selectedTime;
    // Ducha
    var ducha = document.getElementById("p11").checked ? 200 : 120;
    selectedTime = document.querySelector('input[name="p2"]:checked').value;
    ducha += (ducha * selectedTime); // Una semana
    selectedTime = document.querySelector('input[name="p3"]:checked').value;
    ducha = (ducha * selectedTime) * 52; // Una semana | Un año
    water += ducha;
    // Lavado de Manos
    selectedTime = document.querySelector('input[name="p4"]:checked').value;
    var lavado = (12 * selectedTime) * (8) * (7) * (52); // Una vez | Un dia | Una semana | Un año
    water += lavado;
    // Necesidades Basicas
    var inodoro = document.getElementById("p51").checked ? 8 : 4;
    selectedTime = document.querySelector('input[name="p6"]:checked').value;
    inodoro = (inodoro * selectedTime) * (7) * (52); // Un dia | Una semana | Un año
    water += inodoro;
    // Lavado de Ropa
    var lavaRopa = document.getElementById("p71").checked ? 80 : 130;
    selectedTime = document.querySelector('input[name="p8"]:checked').value;
    lavaRopa = (lavaRopa * selectedTime) * (52); // Una semana | Un año
    water += lavaRopa;
    // Lavado de Trastes
    var lavaTrastes = document.getElementById("p71").checked ? 20 : 40;
    lavaTrastes = (lavaTrastes * 3) * (7) * (52); // Un dia | Una semana | Un año
    water += lavaTrastes;
    // Preparar Comida
    selectedTime = document.querySelector('input[name="p10"]:checked').value;
    var comida = (5 * selectedTime) * (52); // Una semana | Un año
    water += comida;
    // Riego Jardin
    selectedTime = document.querySelector('input[name="p11"]:checked').value;
    var jardin = (50 * selectedTime) * (52); // Una semana | Un año
    water += jardin;
    // Lavado Automovil
    selectedTime = document.querySelector('input[name="p12"]:checked').value;
    var auto = (150 * selectedTime) * (52); // Una semana | Un año
    water += auto;
    // Piscina
    var piscina = document.getElementById("p131").checked ? 150000 : 0;
    water += piscina;
    // Consumo Carne Res
    selectedTime = document.querySelector('input[name="p14"]:checked').value;
    var res = (15400 * selectedTime) * (12); // Un mes | Un año
    water += res;
    // Consumo Carne Ternera
    selectedTime = document.querySelector('input[name="p15"]:checked').value;
    var ternera = (8700 * selectedTime) * (12); // Un mes | Un año
    water += ternera;
    // Consumo Carne Cerdo
    selectedTime = document.querySelector('input[name="p16"]:checked').value;
    var cerdo = (6000 * selectedTime) * (12); // Un mes | Un año
    water += cerdo;
    // Consumo Carne Pollo
    selectedTime = document.querySelector('input[name="p17"]:checked').value;
    var pollo = (4300 * selectedTime) * (12); // Un mes | Un año
    water += pollo;
    // Consumo de Frutas y Verduras
    var papa = document.getElementById("p181").value * 25;
    var manzana = document.getElementById("p182").value * 70;
    var jitomate = document.getElementById("p183").value * 13;
    var naranja = document.getElementById("p184").value * 50;
    var platano = document.getElementById("p185").value * 160;
    var lechuga = document.getElementById("p186").value * 240;
    var verduras = (papa + manzana + jitomate + naranja + platano + lechuga) * 12; // Un mes | Un año
    water += verduras;
    // Consumo de Bebidas
    var refresco = document.getElementById("p191").value * 70;
    var cerveza = document.getElementById("p192").value * 75;
    var leche = document.getElementById("p193").value * 200;
    var te = document.getElementById("p194").value * 35;
    var vino = document.getElementById("p195").value * 120;
    var jugoManzana = document.getElementById("p196").value * 190;
    var jugoNaranja = document.getElementById("p197").value * 170;
    var cafe = document.getElementById("p198").value * 140;
    var bebidas = (refresco + cerveza + leche + te + vino + jugoManzana + jugoNaranja + cafe) * (12); // Un mes | Un año
    water += bebidas;
    // Consumo de Alimentos Variados
    var hamburguesa = document.getElementById("p201").value * 2400;
    var papas = document.getElementById("p202").value * 185;
    var chocolate = document.getElementById("p203").value * 2400;
    var azucar = document.getElementById("p204").value * 1500;
    var mantequilla = document.getElementById("p205").value * 5550;
    var queso = document.getElementById("p206").value * 940;
    var pan = document.getElementById("p207").value * 40;
    var huevo = document.getElementById("p208").value * 135;
    var arroz = document.getElementById("p209").value * 1670;
    var alimentos = (hamburguesa + papas + chocolate + azucar + mantequilla + queso + pan + huevo + arroz) * (12); // Un mes | Un año
    water += alimentos;
    // Prendas
    var playera = document.getElementById("p211").value * 2700;
    var pantalon = document.getElementById("p212").value * 11000;
    var zapatos = document.getElementById("p212").value * 8000;
    var prendas = (playera + pantalon + zapatos) * (12); // Un mes | Un año
    water += prendas;
    // Otros
    var hoja = document.getElementById("p221").value * 10;
    var libreta = document.getElementById("p222").value * 100;
    var libro = document.getElementById("p223").value * 300;
    var otros = (hoja + libreta + libro) * (12); // Un mes | Un año
    water += otros;
    alert("Tu Huella Hídrica en un año es de " + water + " Litros");
    var inputElement = document.getElementById('lhuella');
    inputElement.value = water + " Litros";
}