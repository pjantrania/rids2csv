var azure = require("azure-storage"),
    http = require("http");
var parser = require("./parser");

var blobSvc = azure.createBlobService();
blobSvc.createContainerIfNotExists('csvs', (error, result, response) => {
    if (error) {
        throw new Error("Could not create blob container ");
    }
});


var getCsv = (date, outStream) => {
    if (!date) {
        return false;
    }

    blobSvc.doesBlobExist('csvs', date, (error, blobResult, blobResponse) => {
        if (!error) {
            if (blobResult.exists) {
                blobSvc.getBlobToStream('csvs', date, outStream,
                    (error, getResult, getResponse) => {
                        if (!error) {
                            outStream.end();
                        }
                    });
            }
            else {
                var blobStream = blobSvc.createWriteStreamToBlockBlob('csvs', date, null);
                var parsedDataStream = parser.getStream();

                parsedDataStream.pipe(outStream, { end: false });
                parsedDataStream.pipe(blobStream, { end: false });

                var requestUrl = process.env.REQUEST_URL + "&fdate=" + date;
                http.get(requestUrl,
                    (res) => {
                        res.on("data", (d) => {
                            parser.parse(d.toString());
                        });
                        res.on("end", () => {
                            parser.endParse();
                            blobStream.end();
                            outStream.end();
                        });
                    });
            }

        }
    });
};

exports.getCsv = getCsv;