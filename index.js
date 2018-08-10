var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var app = express();
var path = require("path");
var bodyParser = require('body-parser');
var json2csv = require('nice-json2csv');



app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/test', function (req, res) {

  url = 'http://www.zonaprop.com.ar/departamento-alquiler-caballito-belgrano-palermo-villa-urquiza-barrio-norte-colegiales-las-canitas-recoleta-villa-crespo-mas-45-m2-cubiertos-publicado-hace-menos-de-1-semana-8000-11500-pesos-menos-3000-expensas-orden-publicado-descendente.html';

  request(url, function (error, response, html) {
    if (!error) {
      var $ = cheerio.load(html);

      var titulo, barrio, precio, expensas, mts, ambientes;
      var deptos = [];

      $('.aviso-desktop').filter(function () {
        var aviso = $(this);
        var json = {
          titulo: aviso.find('.aviso-data-title').children().text(),
          barrio: aviso.find('.aviso-data-location').children().text(),
          precio: aviso.find('.aviso-data-price-value').text(),
          expensas: aviso.find('.aviso-data-expensas-value').text(),
          features: aviso.find('.aviso-data-features-value').text(),
        };
        console.log("JSON: ", json);
        deptos.push(json);
        // title = data.children().first().text();

        // release = data.children().last().children().text();

        // json.title = title;
        // json.release = release;
      })
      console.log(deptos);
    }
  })
});
app.post('/argen', function (req, res) {
  console.log("Req: ", req.body);

  var urls = req.body['urls'].split('\n');
  Promise.all(urls.map((u) => getDepartamentoInfo(u)))
    .then((deptos) => {
      console.log(deptos);
      var csv = json2csv.convert(deptos);
      res.attachment('deptos.csv');
      res.send(new Buffer(csv));
    });
  // console.log("Deptos: ", deptos);

})


const getDepartamentoInfo = (url) => {
  return new Promise(function (resolve, reject) {
    request(url, function (error, response, html) {
      if (error) return reject(err);
      var $ = cheerio.load(html);

      var titulo, barrio, precio, expensas, mts, ambientes;
      var deptos = [];
      var json = {
        titulo: '',
        barrio: '',
        precio: '',
        expensas: '',
        mts: '',
        link: url
      };
      $('.details').filter(function () {
        var aviso = $(this);
        console.log("Precio: ", aviso.find('div.price').text());
        json.titulo = aviso.find('h2.address').children().text();
        json.barrio = aviso.find('h2.title-description').children().text().replace('Departamento en alquiler en ', '').replace(' - Capital Federal', '');
        json.precio = aviso.find('.price').text();
      });
      $('.instalations').filter(function () {
        var fields = $(this).find('.fields');
        // console.log("Fields: ", fields.text());
        var expensas;
        fields.children().each(function (i, f) {
          // console.log("Field: ", f);
          if ($(f).find('.field').text() === 'expensas') expensas = $(f).find('.value').text();
        });
        json.expensas = expensas;
      })
      $('.basic').filter(function () {
        var fields = $(this).find('.fields');
        // console.log("Fields: ", fields.text());
        var precio;
        fields.children().each(function (i, f) {
          // console.log("Field: ", f);
          if ($(f).find('.field').text() === 'precio') precio = $(f).find('.value').text();
        });
        json.precio = precio;
      })
      $('.area').filter(function () {
        var fields = $(this).find('.fields');
        // console.log("Fields: ", fields.text());
        var mts;
        fields.children().each(function (i, f) {
          // console.log("Field: ", f);
          if ($(f).find('.field').text() === 'sup. cubierta') mts = $(f).find('.value').text();
        });
        json.mts = mts;
      })
      Object.keys(json).forEach(function (key) {
        console.log(typeof json[key], "|");
        if (json[key]) json[key] = json[key].toString().replace(/(\r\n|\n|\r)/gm, "").trim();
      })
      console.log(json);
      try {
        json.sumaPrecios = Number(json.precio.replace('$ ', '').replace('.', '')) + Number(json.expensas.replace('$ ', '').replace('.', ''));
      } catch(err) {
        console.error(err);
        json.sumaPrecios = '-';
      }
      resolve(json)
    })
  });
}

app.listen('8081');
console.log('Magic happens on port 8081');
exports = module.exports = app;