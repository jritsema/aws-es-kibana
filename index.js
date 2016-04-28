var AWS = require('aws-sdk');
var http = require('http');
var httpProxy = require('http-proxy');
var express = require('express');
var bodyParser = require('body-parser');
var stream = require('stream');
var figlet = require('figlet');

var ENDPOINT = process.env.ES_ENDPOINT;

// Try to infer the region if it is not provided as an argument.
var REGION = undefined;
if (!REGION) {
    var m = ENDPOINT.match(/\.([^.]+)\.es\.amazonaws\.com\.?$/);
    if (m) {
        REGION = m[1];
    } else {
        console.error('region cannot be parsed from endpoint address, etiher the endpoint must end ' +
            'in .<region>.es.amazonaws.com or --region should be provided as an argument');
        process.exit(1);
    }
}

var TARGET = ENDPOINT;
if (!TARGET.match(/^https?:\/\//)) {
    TARGET = 'https://' + TARGET;
}

var BIND_ADDRESS = 'localhost';
var PORT = 9200;

AWS.CredentialProviderChain.defaultProviders = [
  function () { return new AWS.EnvironmentCredentials('AWS'); },
]

var chain = new AWS.CredentialProviderChain();
var creds;
chain.resolve(function(err, resolved) {
    if (err) throw err;
    else creds = resolved;
    console.log(creds);
});

function getcreds(req, res, next) {
    return creds.get(function(err) {
        if (err) return next(err);
        else return next();
    });
}
var proxy = httpProxy.createProxyServer({
    target: TARGET,
    changeOrigin: true,
    secure: true
});

var app = express();
app.use(bodyParser.raw({
    type: '*/*'
}));
app.use(getcreds);
app.use(function(req, res) {
    var bufferStream;
    if (Buffer.isBuffer(req.body)) {
        var bufferStream = new stream.PassThrough();
        bufferStream.end(req.body);
    }
    proxy.web(req, res, {
        buffer: bufferStream
    });
});

proxy.on('proxyReq', function(proxyReq, req, res, options) {
    var endpoint = new AWS.Endpoint(ENDPOINT);
    var request = new AWS.HttpRequest(endpoint);
    request.method = proxyReq.method;
    request.path = proxyReq.path;
    request.region = REGION;
    if (Buffer.isBuffer(req.body)) request.body = req.body;
    if (!request.headers) request.headers = {};
    request.headers['presigned-expires'] = false;
    request.headers['Host'] = ENDPOINT;

    var signer = new AWS.Signers.V4(request, 'es');
    signer.addAuthorization(creds, new Date());

    proxyReq.setHeader('Host', request.headers['Host']);
    proxyReq.setHeader('X-Amz-Date', request.headers['X-Amz-Date']);
    proxyReq.setHeader('Authorization', request.headers['Authorization']);
    if (request.headers['x-amz-security-token']) proxyReq.setHeader('x-amz-security-token', request.headers['x-amz-security-token']);
});

//http.createServer(app).listen(PORT, BIND_ADDRESS);
http.createServer(app).listen(PORT);

console.log(figlet.textSync('AWS ES Proxy!', {
    font: 'Speed',
    horizontalLayout: 'default',
    verticalLayout: 'default'
}));

console.log('AWS ES cluster available at http://' + BIND_ADDRESS + ':' + PORT);
console.log('Kibana available at http://' + BIND_ADDRESS + ':' + PORT + '/_plugin/kibana/');
