"use strict";
exports.__esModule = true;
var Grammar = /** @class */ (function () {
    function Grammar(Gram) {
        var s = new Set();
        var input = Gram.split("\n");
        for (var i = 0; i < input.length; i++) {
            if (input[i] != '') {
                if (!input[i].includes(" -> "))
                    throw new Error("No Identifiers");
                var ID = input[i].split(" -> ");
                if (s.has(ID[0]))
                    throw new Error("Already has that variable");
                s.add(ID[0]);
                try {
                    new RegExp(ID[1]);
                }
                catch (e) {
                    throw new Error("Invalid regular expression");
                }
            }
        }
    }
    return Grammar;
}());
exports.Grammar = Grammar;
