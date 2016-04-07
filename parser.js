var htmlparser = require("htmlparser2"),
    MemoryStream = require("memorystream");

var outStream = new MemoryStream();
var previousColor = null;
var inTable = false;
var inCell = false;
var parser = new htmlparser.Parser({
    onopentag: (name, attribs) => {
        if (name === "table" && attribs.bgcolor === "#101010") {
            inTable = true;
        }
        else if (name === "td" && (attribs.bgcolor === "#202060" || attribs.bgcolor === "#404080") && inTable) {
            if (!inCell) {
                inCell = true;
            }

            if (previousColor === null) {
                previousColor = attribs.bgcolor;
            }

            if (previousColor !== null && previousColor !== attribs.bgcolor) {
                outStream.write("\n");
                previousColor = attribs.bgcolor;
            }

        }
        else if (inTable && name === "tr" && attribs.bgcolor === "#000000") {
            inTable = false;
        }
    },
    ontext: (text) => {
        if (inTable && inCell && text.trim() !== "--:--:--") {
            outStream.write(text.trim());
        }
    },
    onclosetag: (name) => {
        if (name === "td" && inCell && inTable) {
            outStream.write(",");
            inCell == false;
        }
    }
}, { decodeEntities: true });

var getStream = () => { return outStream };
var parse = (data) => { parser.write(data) };
var endParse = () => {
    parser.end();
    outStream.end();
}

exports.getStream = getStream;
exports.parse = parse;
exports.endParse = endParse;