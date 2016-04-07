var http = require("http"),
    urlparse = require("url"),
    azure = require("azure-storage");

var parser = require("./parser");

var port = process.env.PORT || 8080;
var blobSvc = azure.createBlobService();
blobSvc.createContainerIfNotExists('csvs', (error, result, response) => {
    if (error) {
        throw new Error("Could not create blob container ");
    }
});

http.createServer(
    function(request, response) {
        var qs = urlparse.parse(request.url, true).query;
        var date;
        if (qs) {
            date = qs.date;
        }
        var headers = ["Date", "Incident Number", "Unit", "Location", "Call Type", "Call Received", "Call Dispatch",
            "Unit Enroute", "Staged Near Scene", "Arrived On Scene", "Left Scene", "Arrived Hosp", "In Service"];

        var requestUrl = process.env.REQUEST_URL;
        if (date) {
            requestUrl += "&fdate=" + date;
        }

        response.writeHead(200, { "Content-type": "text/plain" });
        response.write(headers.join(",") + "\n");
        blobSvc.doesBlobExist('csvs', date || 'empty', (error, blobResult, blobResponse) => {
            if (!error) {
                if (blobResult.exists && date) {
                    blobSvc.getBlobToStream('csvs', date, response, (error, getResult, getResponse) => {
                        if (!error) {
                            response.end();
                        }
                    });
                }
                else {
                    var blobStream;
                    if (date) {
                        blobStream = blobSvc.createWriteStreamToBlockBlob('csvs', date, null);
                    }
                    var parsedDataStream = parser.getStream();
                    parsedDataStream.pipe(response, { end: false });
                    if (blobStream) {
                        parsedDataStream.pipe(blobStream, { end: false });
                    }

                    http.get(requestUrl,
                        (res) => {
                            res.on("data", (d) => {
                                parser.parse(d.toString());

                            });
                            res.on("end", () => {
                                parser.endParse();
                                if (blobStream) {
                                    blobStream.end();
                                }
                                response.end();
                            });
                        });
                }
            }
        });
    }).listen(port);

