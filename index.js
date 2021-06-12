"use strict";

const express = require("express");
const app = express();
const bodyParser = require('body-parser');
require('body-parser-xml')(bodyParser);
var request = require("request");
var crypto = require('crypto');
var jsdom = require('jsdom');
var http = require('http');
var parseString = require('xml2js').parseString;

app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.text());
app.use(bodyParser.xml());

let MerchantId = ""; //Magaza Kodu
let OkUrl = ""; //Basarili sonu� alinirsa, y�nledirelecek sayfa
let FailUrl = "";//Basarisiz sonu� alinirsa, y�nledirelecek sayfa
let UserName = ""; // Web Y�netim ekranalrindan olusturulan api roll� kullanici
let Password = "";// Web Y�netim ekranalrindan olusturulan api roll� kullanici sifresi
let CustomerId = "";//M�steri Numarasi


app.get("/", (req, res) => {
    res.send('ok');
});


app.post("/odemeOnay", (req, res) => {
    console.log(req.body['AuthenticationResponse']);

    xmlToJson(req.body['AuthenticationResponse'], function (err, result) {
        if (err) {
            throw err;
        }
        // log JSON string
        console.log(result['VPosTransactionResponseContract']);

        var data = {
            ResponseCode: result['VPosTransactionResponseContract']['ResponseCode'],
            ResponseMessage: result['VPosTransactionResponseContract']['ResponseMessage'],
            OrderId: result['VPosTransactionResponseContract']['OrderId'],
            MerchantOrderId: result['VPosTransactionResponseContract']['MerchantOrderId'][0],
            CustomerId: result['VPosTransactionResponseContract']['VPosMessage'][0]['CustomerId'],
            MD: result['VPosTransactionResponseContract']['MD'][0],
            Amount: result['VPosTransactionResponseContract']['VPosMessage'][0]['Amount'][0],
            HashData: result['VPosTransactionResponseContract']['HashData'],
        }

        let hashPass = crypto.createHash('sha1');
        hashPass.update(Password);
        let HashedPassword = hashPass.digest('base64')

        let s = MerchantId + data.MerchantOrderId + data.Amount + UserName + HashedPassword;
        let sha = crypto.createHash('sha1');
        sha.update(s);
        let HashResult = sha.digest('base64');

        let reqBody = "<KuveytTurkVPosMessage xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:xsd='http://www.w3.org/2001/XMLSchema'>"
            + "<APIVersion>1.0.0</APIVersion>"
            + "<HashData>" + HashResult + "</HashData>"
            + "<MerchantId>" + MerchantId + "</MerchantId>"
            + "<CustomerId>" + CustomerId + "</CustomerId>"
            + "<UserName>" + UserName + "</UserName>"
            + "<TransactionType>Sale</TransactionType>"
            + "<InstallmentCount>0</InstallmentCount>"
            + "<CurrencyCode>0949</CurrencyCode>"
            + "<Amount>" + data.Amount + "</Amount>"
            + "<MerchantOrderId>" + data.MerchantOrderId + "</MerchantOrderId>"
            + "<TransactionSecurity>3</TransactionSecurity>"
            + "<KuveytTurkVPosAdditionalData>"
            + "<AdditionalData>"
            + "<Key>MD</Key>"
            + "<Data>" + data.MD + "</Data>"    // Geri Dönüş ResponseMessage da yer alan MD değeri
            + "</AdditionalData>"
            + "</KuveytTurkVPosAdditionalData>"
            + "</KuveytTurkVPosMessage>";

        sendXmlRequest("https://boatest.kuveytturk.com.tr/boa.virtualpos.services/Home/ThreeDModelProvisionGate", reqBody, function (response) {
            xmlToJson(response.body, function (err, response) {
                res.send(response);
            })
        })
    });

    //console.log(replaced);

});

function xmlToJson(xmlStr, cb) {
    var replaced = xmlStr.replaceAll('%3c', '<').replaceAll('%3f', '?').replaceAll('%3d', '=')
        .replaceAll('%22', '"').replaceAll('%3e', '>').replaceAll('%2f', '/').replaceAll('%3a', ':')
        .replaceAll('%c4%b1', 'i').replaceAll('%c4%9f', 'g').replaceAll('+', ' ')

    parseString(replaced, (err, result) => {
        cb(err, result);
    });
}

app.post("/odeme", (req, res) => {
    let Name = req.body["CardHolderName"];
    let CardNumber = req.body["CardNumber"];
    let CardExpireDateMonth = req.body["CardExpireDateMonth"];
    let CardExpireDateYear = req.body["CardExpireDateYear"];
    let CardCVV2 = req.body["CardCVV2"];
    let MerchantOrderId = "01-eticaret";// Siparis Numarasi
    let Amount = req.body["Tutar"]; //Islem Tutari // �rnegin 1.00TL i�in 100 kati yani 100 yazilmali
    let CustomerId = "";//M�steri Numarasi
    let hashPass = crypto.createHash('sha1');
    hashPass.update(Password);
    let HashedPassword = hashPass.digest('base64')

    let s = MerchantId + MerchantOrderId + Amount + OkUrl + FailUrl + UserName + HashedPassword;
    let sha = crypto.createHash('sha1');
    sha.update(s);
    let HashData = sha.digest('base64');


    var data = '<KuveytTurkVPosMessage xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">'
        + '<APIVersion>1.0.0</APIVersion>'
        + '<OkUrl>' + OkUrl + '</OkUrl>'
        + '<FailUrl>' + FailUrl + '</FailUrl>'
        + '<HashData>' + HashData + '</HashData>'
        + '<MerchantId>' + MerchantId + '</MerchantId>'
        + '<CustomerId>' + CustomerId + '</CustomerId>'
        + '<UserName>' + UserName + '</UserName>'
        + '<CardNumber>' + CardNumber + '</CardNumber>'
        + '<CardExpireDateYear>' + CardExpireDateYear + '</CardExpireDateYear>'
        + '<CardExpireDateMonth>' + CardExpireDateMonth + '</CardExpireDateMonth>'
        + '<CardCVV2>' + CardCVV2 + '</CardCVV2>'
        + '<CardHolderName>' + Name + '</CardHolderName>'
        + '<CardType>MasterCard</CardType>'
        + '<BatchID>0</BatchID>'
        + '<TransactionType>Sale</TransactionType>'
        + '<InstallmentCount>0</InstallmentCount>'
        + '<Amount>' + Amount + '</Amount>'
        + '<DisplayAmount>' + Amount + '</DisplayAmount>'
        + '<CurrencyCode>0949</CurrencyCode>'
        + '<MerchantOrderId>' + MerchantOrderId + '</MerchantOrderId>'
        + '<TransactionSecurity>3</TransactionSecurity>'
        + '</KuveytTurkVPosMessage>';
    sendXmlRequest("https://boatest.kuveytturk.com.tr/boa.virtualpos.services/Home/ThreeDModelPayGate", data, function (response) {
        res.send(response.body)
    });
});


let sendXmlRequest = function (url, data, cb) {
    request.post({
            url: url,
            method: "POST",
            headers: {
                'Content-Type': 'application/xml',
            },
            body: data
        },
        function (error, response, body) {
            cb(response);
        });
}

app.listen(3000, () => {
    console.log(` running on port : 3000`);

});
