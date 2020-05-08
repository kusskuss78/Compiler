import { NodeType } from "./Node"
import { error } from "util";
export class Grammar {
    terminals: [string, RegExp][] = [];
    nonTerminals: [string, string][] = [];
    nullable: Set<string> = new Set();
    First: Map<string, Set<string>> = new Map();
    Follow: Map<string, Set<string>> = new Map();
    constructor(Gram: string) {
        let s: Set<string> = new Set();
        var input = Gram.split("\n");
        let terms: string[] = [];
        let nonTerms: string[] = [];
        let isTerm: boolean = true;
        input.forEach(e => {
            if (e.length != 0) {
                if (isTerm) {
                    terms.push(e);
                }
                else {
                    nonTerms.push(e);
                }
            }
            else {
                isTerm = false;
            }
        })
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
                new RegExp(ID[1])
            }
            catch {
                throw new Error("Invalid regular expression")
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

            //console.log(this.nonTerminals);
            const found: number = this.nonTerminals.findIndex(e => e[0] === ID[0])
            if (found !== -1) {
                var nonterm = this.nonTerminals[found];
                this.nonTerminals[found][1] = nonterm + ' | ' + ID[1];

            }

            else if (!s.has(ID[0]))
                s.add(ID[0]);
            //console.log(s);
            this.nonTerminals[i] = [ID[0], ID[1]];
        }

        let used: Set<string> = new Set();
        let start: NodeType = new NodeType("expr");
        this.dfs(start, used);
        if (s !== undefined) {
            s.forEach(def => {
                if (!used.has(def)) { }
                //throw new Error(def + " was defined but is not used");

            });
        }
        if (used != undefined) {
            used.forEach(v => {
                if (v !== '' && !s.has(v)) { }
                //throw new Error(v + " is used but is not defined");
            })
        }
        this.getNullable();
        this.getFirst();
        //let bar: Set<string> = new Set();
    }
    getFirst() {
        //console.log(this.nonTerminals);

        let boo = false;
        let num = 0;
        
        this.terminals.forEach(t => {
            this.First.set(t[0], new Set<string>().add(t[0]));
        });
        //console.log(this.First);
        while (true) {
            boo = false;
            this.nonTerminals.forEach(n => {
                let productions = n[1].split("|");
                productions.forEach(pro => {
                    let l = pro.replace("lambda", " ");
                    let p = l.trim().split(" ");
                    for (let i = 0; i < p.length; i++) {
                        let v = p[i];
                        let tmp = new Set<string>();
                        let tmp2 = new Set<string>();
                        if (this.First.get(n[0]) !== undefined) {
                            tmp = this.First.get(n[0]);
                        }
                        if (this.First.get(v) !== undefined) {
                            tmp2 = this.First.get(v)
                        }
                        tmp2.forEach(tmp.add, tmp);
                        let old = this.First.size;
                        this.First.set(n[0], tmp);
                        if (this.First.size !== old) {
                            boo = true;
                        }
                        if (!this.nullable.has(v)) {
                            break;
                        }
                    }
                });
            });
            if (!boo) {
                num++;
                if (num > this.nonTerminals.length + this.terminals.length) {
                    break;
                }
            }
        }
        return this.First;
    }
    getFollow() {
        this.Follow.set(this.nonTerminals[0][0], new Set<string>("$"));
        let bool = false;
        let num = 0;
        while (true) {
            bool = false;
            this.nonTerminals.forEach(n => {
                let productions = n[1].split("|");
                productions.forEach(pro => {
                    //let l = pro.replace("lambda", " ");
                    let p = pro.trim().split(" ");
                    for (let i = 0; i < p.length; i++) {
                        let v = p[i];
                        let f = this.nonTerminals.find(e => e[0] === v);
                        if (f !== undefined) {
                            let old = this.Follow.size;
                            let bool2 = false;

                            for (let j = i + 1; j < p.length; j++) {
                                let k = p[j];
                                let tmp = new Set<string>();
                                let tmp2 = new Set<string>();
                                if (this.Follow.get(v) !== undefined) {
                                    tmp = this.Follow.get(v);
                                }
                                if (this.First.get(k) !== undefined) {
                                    tmp2 = this.First.get(k)
                                }
                                tmp2.forEach(tmp.add, tmp);
                                this.Follow.set(v, tmp);
                                if (!this.nullable.has(k)) {
                                    bool2 = true;
                                    break;
                                }

                            }
                            if (!bool2) {
                                let tmp = new Set<string>();
                                let tmp2 = new Set<string>();
                                if (this.Follow.get(n[0]) !== undefined) {
                                    tmp = this.Follow.get(n[0]);
                                }
                                if (this.Follow.get(v) !== undefined) {
                                    tmp2 = this.Follow.get(v)
                                }
                                tmp.forEach(tmp2.add, tmp2);
                                this.Follow.set(v, tmp2);
                                bool2 = false;
                            }
                            if (this.Follow.size !== old) {
                                bool = true;
                            }
                        }

                    }
                });
            });
            if (!bool) {
                num++;
                if (num > this.nonTerminals.length + this.terminals.length) {
                    break;
                }
            }
        }
        return this.Follow;
    }
    getNullable() {
        //console.log(this.terminals);
        this.nullable = new Set();
        let bool;
        //console.log(this.nonTerminals);
        while (true) {
            bool = true;
            this.nonTerminals.forEach(e => {
                //console.log(e);
                if (!this.nullable.has(e[0])) {
                    let productions = e[1].split("|");
                    //console.log(productions);
                    productions.forEach(p => {
                        let pro = p.trim().split(" ");

                        if (pro.every(s => this.nullable.has(s) || s == "lambda")) {
                            this.nullable.add(e[0]);
                            bool = false;
                        }

                    })
                }
            });
            if (bool)
                break;
        }
        //console.log(this.nullable);
        return this.nullable;
    }
    
    dfs(node: NodeType, used: Set<string>) {
        used.add(node.label);
        const found = this.nonTerminals.find(nt => nt[0] === node.label);
        if (found !== undefined) {
            let str = found[1];
            str = str.replace('|', '');
            str = str.replace(',', ' ');
            str.split(new RegExp('\\b')).forEach(t => {
                let tmp = t.trim();
                if (tmp !== '') {
                    let newNode: NodeType = new NodeType(tmp);
                    node.n.push(newNode);
                }
            });
        }
        if (node.n !== undefined) {
            node.n.forEach((t: NodeType) => {
                if (!used.has(t.label)) {
                    this.dfs(t, used);
                }
            });
        }
    }

}




