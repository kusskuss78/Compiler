"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Node_1 = require("./Node");
class Grammar {
    constructor(Gram) {
        this.terminals = [];
        this.nonTerminals = [];
        let s = new Set();
        var input = Gram.split("\n\n");
        let terms = input[0].split("\n");
        let nonTerms = input[1].split("\n");
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
        for (var i = 0; i < terms.length; i++) {
            if (terms[i].length == 0) {
                continue;
            }
            else if (!terms[i].includes(" -> ")) {
                throw new Error("No Identifiers");
            }
            var ID = terms[i].split(" -> ");
            if (s.has(ID[0])) {
                //console.log(ID[0]);
                throw new Error("Already has that variable");
            }
            else if (ID[0] == "")
                throw new Error("Empty ID");
            if (s.has(ID[1])) {
                throw new Error("Regex already created");
            }
            else if (ID[1] == "")
                throw new Error("Empty Regex");
            try {
                new RegExp(ID[1]);
            }
            catch (_a) {
                throw new Error("Invalid regular expression");
            }
            if (!s.has(ID[0]))
                s.add(ID[0]);
            this.terminals[i] = [ID[0], RegExp(ID[1])];
        }
        for (var i = 0; i < nonTerms.length; i++) {
            if (nonTerms[i].length == 0) {
                continue;
            }
            else if (!nonTerms[i].includes(" -> ")) {
                throw new Error("No junction");
            }
            var ID = nonTerms[i].split(" -> ");
            if (ID[0] == "")
                throw new Error("Empty ID");
            else if (ID[1] == "")
                throw new Error("Empty nonterminal");
            const found = this.nonTerminals.findIndex(e => e[0] === ID[0]);
            if (found !== -1) {
                var nonterm = this.nonTerminals[found];
                this.nonTerminals[found][1] = nonterm + ' | ' + ID[1];
            }
            else if (!s.has(ID[0]))
                s.add(ID[0]);
            console.log(s);
            this.nonTerminals[i] = [ID[0], ID[1]];
        }
        let used = new Set();
        let start = new Node_1.NodeType("expr");
        this.dfs(start, used);
        if (s !== undefined) {
            s.forEach(def => {
                if (!used.has(def)) { }
                //throw new Error(def + " was defined but is not used");
            });
        }
        if (used != undefined) {
            used.forEach(v => {
                if (v !== '' && !s.has(v))
                    throw new Error(v + " is used but is not defined");
            });
        }
        //let bar: Set<string> = new Set();
    }
    dfs(node, used) {
        used.add(node.label);
        const found = this.nonTerminals.find(nt => nt[0] === node.label);
        if (found !== undefined) {
            let str = found[1];
            str = str.replace('|', '');
            str = str.replace(',', ' ');
            str.split(new RegExp('\\b')).forEach(t => {
                let tmp = t.trim();
                if (tmp !== '') {
                    let newNode = new Node_1.NodeType(tmp);
                    node.n.push(newNode);
                }
            });
        }
        if (node.n !== undefined) {
            node.n.forEach((t) => {
                if (!used.has(t.label)) {
                    this.dfs(t, used);
                }
            });
        }
    }
}
exports.Grammar = Grammar;
//# sourceMappingURL=Grammar.js.map