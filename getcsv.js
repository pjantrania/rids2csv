var azure = require("azure-storage"),
    http = require("http"),
    strftime = require("strftime"),
    MemoryStream = require("memorystream");
var parser = require("./parser");

var blobSvc = azure.createBlobService();
blobSvc.createContainerIfNotExists('csvs', (error, result, response) => {
    if (error) {
        throw new Error("Could not create blob container ");
    }
});


var getCsv = (startDate, endDate, outStream) => {
    if (!startDate || !endDate) {
        return false;
    }

    if (startDate > endDate) {
        outStream.end();
        return true;
    }

    var prevDate = new Date(endDate).setDate(new Date(endDate).getDate());
    var prevDateString = strftime("%Y-%m-%d", new Date(prevDate));
    blobSvc.doesBlobExist('csvs', endDate, (error, blobResult, blobResponse) => {
        if (!error) {
            if (blobResult.exists) {
                var tempStream = new MemoryStream();
                tempStream.pipe(outStream, {end: false});
                blobSvc.getBlobToStream('csvs', endDate, tempStream,
                    (error, getResult, getResponse) => {
                        if (!error) {
                            outStream.write("\n");
                            getCsv(startDate, prevDateString, outStream);
                        }
                    });
            }
            else {
                var blobStream = blobSvc.createWriteStreamToBlockBlob('csvs', endDate, null);
                var parsedDataStream = parser.getStream();
                parsedDataStream.pipe(blobStream, { end: false });
                
                var requestUrl = process.env.REQUEST_URL + "&fdate=" + endDate;
                setTimeout(() => {
                    http.get(requestUrl,
                        (res) => {
                            res.on("data", (d) => {
                                parser.parse(d.toString());
                            });
                            res.on("end", () => {
                                parser.endParse();
                                blobStream.end();
                                getCsv(startDate, endDate, outStream);
                            });
                        })
                }, 500);
            }
        }
    });
};

exports.getCsv = getCsv;