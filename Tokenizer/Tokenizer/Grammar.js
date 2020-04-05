"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Grammar {
    constructor(Gram) {
        this.terminals = [];
        let s = new Set();
        var input = Gram.split("\n");
        //this.terminals=[
        //    new Terminal ("WHITESPACE", new RegExp("\s+")),
        //    new Terminal ("COMMENT", new RegExp("/\*(.|\n)*?\*/")),
        //    new Terminal("STRING", new RegExp('"(\\" | [^ "]) * "')),
        //    new Terminal("NUM", new RegExp("-?\d+")),
        //    new Terminal( "ASSIGNOP", new RegExp("=(?!=)")),
        //    new Terminal( "EQUALITY" , new RegExp("==")),
        //    new Terminal( "BOOLNOT" , new RegExp("!(?!=)")),
        //    new Terminal( "NOTEQUAL", new RegExp("!=")),
        //    new Terminal( "POWOP" ,new RegExp("[*](?![*])")),
        //    new Terminal( "IF" ,new RegExp("\bif\b")),
        //    new Terminal( "ELSE" , new RegExp("\belese\b")),
        //    new Terminal( "ID" , new RegExp("[A-Za-z_]\w*"))
        //];
        for (var i = 0; i < input.length; i++) {
            if (input[i].length == 0) {
                continue;
            }
            else if (!input[i].includes(" -> ")) {
                throw new Error("No Identifiers");
            }
            var ID = input[i].split(" -> ");
            if (s.has(ID[0])) {
                throw new Error("Already has that variable");
            }
            else if (ID[0] == "")
                throw new Error("Empty ID");
            if (s.has(ID[1]))
                throw new Error("Regex already created");
            else if (ID[1] == "")
                throw new Error("Empty Regex");
            try {
                new RegExp(ID[1]);
            }
            catch (_a) {
                throw new Error("Invalid regular expression");
            }
            s.add(ID[0]);
            this.terminals[i] = [ID[0], RegExp(ID[1])];
        }
    }
}
exports.Grammar = Grammar;
//# sourceMappingURL=Grammar.js.map