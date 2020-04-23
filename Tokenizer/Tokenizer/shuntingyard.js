"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TreeNode_1 = require("./TreeNode");
const Tokenizer_1 = require("./Tokenizer");
const Grammar_1 = require("./Grammar");
let operandStack = [];
let operatorStack = [];
let g = 'POWOP -> [*][*]\n' +
    'MULOP -> [*/]\n' +
    'BITNOT -> [~]\n' +
    'ADDOP -> [-+]\n' +
    'ASSIGNOP -> =(?!=)\n' +
    'NUM -> -?\\d+\n' +
    'SEMI -> [;]\n' +
    'IF -> \\bif\\b\n' +
    'ELSE -> \\belse\\b\n' +
    'LP -> [(]\n' +
    'RP -> [)]\n' +
    'COMMA -> [,]\n' +
    'ID -> [A-Za-z_]\\w*\n\n' +
    'S -> stmt\n' +
    'stmt -> cond | sum assign SEMI\n' +
    'cond -> IF LP expr RP stmt | IF LP expr RP stmt ELSE stmt\n' +
    'assign -> ID ASSIGNOP expr\n' +
    'sum -> sum ADDOP product | product\n' +
    'product -> product MULOP pow | pow\n' +
    'pow -> factor POWOP pow | factor\n' +
    'expr -> expr ADDOP term | term\n' +
    'term -> term MULOP factor | factor\n' +
    'factor -> LP expr RP | NUM\n';
let gram = new Grammar_1.Grammar(g);
let operators = {
    "func-call": 5,
    "POWOP": 4,
    "BITNOT": 3,
    "NEGATE": 3,
    "MULOP": 2,
    "ADDOP": 1,
    "COMMA": 0
};
let associativity = {
    "NEGATE": "right",
    "POWOP": "right",
    "func-call": "left",
    "MULOP": "left",
    "ADDOP": "left",
    "COMMA": "left"
};
let arity = {
    "POWOP": 2,
    "MULOP": 2,
    "ADDOP": 2,
    "RP": 2,
    "LP": 2,
    "func-call": 2,
    "COMMA": 2,
    "NEGATE": 1
};
function doOperation() {
    let c1 = operandStack.pop();
    let opNode = operatorStack.pop();
    if (arity[opNode.sym] == 2) {
        let c2 = operandStack.pop();
        opNode.children.push(c2);
    }
    else if (opNode.sym == "func-call") {
        arity["func-call"] = 2;
    }
    opNode.children.push(c1);
    operandStack.push(opNode);
}
function parse(str) {
    operatorStack = [];
    operandStack = [];
    let tokenizer = new Tokenizer_1.Tokenizer(gram);
    tokenizer.setInput(str);
    while (true) {
        let t = tokenizer.next();
        let sym = t.sym;
        //console.log("here");
        if (sym == "$") {
            break;
        }
        if (t.lexeme == "-") {
            let p = tokenizer.previous();
            if (p == undefined || p.sym == "LP" || operators[p.sym] != undefined) {
                sym = "NEGATE";
            }
        }
        if (sym == "LP") {
            let prev = tokenizer.previous();
            if (prev != undefined && prev.sym == "ID") {
                let peak = tokenizer.peek();
                if (peak != undefined && peak.sym == "RP") {
                    arity["func-call"] = 1;
                    operatorStack.push(new TreeNode_1.TreeNode("func-call", undefined));
                    tokenizer.next();
                    doOperation();
                    continue;
                }
                arity["func-call"] = 2;
                operatorStack.push(new TreeNode_1.TreeNode("func-call", undefined));
            }
            operatorStack.push(new TreeNode_1.TreeNode(sym, t));
        }
        else if (arity[sym] == 1 && associativity[sym] == "right") {
            operatorStack.push(new TreeNode_1.TreeNode(sym, t));
        }
        else if (sym == "NUM" || sym == "ID") {
            operandStack.push(new TreeNode_1.TreeNode(sym, t));
        }
        else if (sym == "RP") {
            while (true) {
                let o = operatorStack[operatorStack.length - 1];
                if (o != undefined && o.sym == "LP") {
                    operatorStack.pop();
                    break;
                }
                else if (o == undefined) {
                    break;
                }
                else
                    doOperation();
            }
        }
        else {
            let assoc = associativity[sym];
            //console.log("here1")
            while (true) {
                if (operatorStack.length == 0)
                    break;
                let A = operatorStack[operatorStack.length - 1].sym;
                if (operators[A] >= operators[sym] && assoc == "left")
                    doOperation();
                else if (operators[A] > operators[sym] && assoc == "right")
                    doOperation();
                else
                    break;
            }
            operatorStack.push(new TreeNode_1.TreeNode(sym, t));
        }
    }
    while (operatorStack.length != 0) {
        doOperation();
    }
    return operandStack[0];
}
exports.parse = parse;
//# sourceMappingURL=shuntingyard.js.map