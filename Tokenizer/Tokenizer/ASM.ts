import { TreeNode } from "./TreeNode";
import { error } from "util";
let asmCode: string[] = [];
let stringPool: Map<string, string> = new Map();

let labelCounter = 0;

class VarInfo {
    type: VarType;
    location: string;  //asm label
    //also the line number, if you want
    constructor(t: VarType, location: string) {
        this.location = location;
        this.type = t;
    }
}
class SymbolTable {
    table: Map<string, VarInfo>;
    constructor() {
        this.table = new Map();
    }
    get(name: string) {
        if (!this.table.has(name))
            throw new Error("Does not exist");
        return this.table.get(name);
    }
    set(name: string, v: VarInfo) {
        if (this.table.has(name))
            throw new Error("Redeclaration");
        this.table.set(name, v);
    }
    has(name: string) {
        return this.table.has(name);
    }
}

let symtable = new SymbolTable();

function emit(instr: string) {
    asmCode.push(instr);
}
enum VarType {
    INTEGER,
    FLOAT,
    STRING
}
function programNodeCode(n: TreeNode) {
    //program -> braceblock
    if (n.sym != "program")
        ICE();
    varDeclListNodeCode(n.children[0])
    braceblockNodeCode(n.children[1]);
}
function braceblockNodeCode(n: TreeNode) {
    //braceblock -> LBR stmts RBR
    stmtsNodeCode(n.children[1]);
}
function stmtsNodeCode(n: TreeNode) {
    //stmts -> stmt stmts | lambda
    if (n.children.length == 0)
        return;
    stmtNodeCode(n.children[0]);
    stmtsNodeCode(n.children[1]);
}
function stmtNodeCode(n: TreeNode) {
    //stmt -> cond | loop | return-stmt SEMI
    let c = n.children[0];
    switch (c.sym) {
        case "cond":
            condNodeCode(c); break;
        case "loop":
            loopNodeCode(c); break;
        case "returnStmt":
            returnstmtNodeCode(c); break;
        case "assign":
            assignNodeCode(c); break;
        default:
            ICE();
    }
}
function condNodeCode(n: TreeNode) {
    //cond -> IF LP expr RP braceblock |
    //  IF LP expr RP braceblock ELSE braceblock

    if (n.children.length === 5) {
        //no 'else'
        exprNodeCode(n.children[2]);    //leaves result in rax
        emit("pop rax"); 
        emit("cmp rax, 0");
        var endifLabel = label();
        emit(`je ${endifLabel}`);
        braceblockNodeCode(n.children[4]);
        emit(`${endifLabel}:`);
    } else {
        exprNodeCode(n.children[2]); 
        emit("pop rax"); 
        emit("cmp rax, 0");
        var endifLabel = label();
        emit(`je ${endifLabel}`);
        braceblockNodeCode(n.children[4]);
        var endelseLabel = label();
        emit(`jmp ${endelseLabel}`);
        emit(`${endifLabel}:`);
        braceblockNodeCode(n.children[6]);
        emit(`${endelseLabel}:`);
    }
}
function loopNodeCode(n: TreeNode) {
    //loop : WHILE LP expr RP braceblock;
    var start = label();
    var end = label();
    emit(`${start}:`);
    exprNodeCode(n.children[2]);
    emit("pop rax"); 
    emit("cmp rax, 0");
    emit(`je ${end}`);
    braceblockNodeCode(n.children[4]);
    emit(`jmp ${start}`);
    emit(`${end}:`);
}
function label() {
    let s = "lbl" + labelCounter;
    labelCounter++;
    return s;
}
function factorNodeCode(n: TreeNode): VarType {
    //factor -> NUM | LP expr RP
    let child = n.children[0];
    console.log(n);
    switch (child.sym) {
        case "NUM":
            let v = parseInt(child.token.lexeme, 10);
            emit(`push qword ${v}`)
            return VarType.INTEGER;
        case "LP":
            if (n.children.length === 3)
                return exprNodeCode(n.children[1]);
            else if (n.children.length === 4) {
                let f = n.children[1].token.lexeme;
                let factorType = factorNodeCode(n.children[3]);
                if (f === "int" && factorType === VarType.FLOAT) {
                    emit("movq xmm0, [rsp]")
                    emit("add rsp, 8");
                    emit("roundsd xmm0, xmm0, 0xb");
                    emit("cvtsd2si rax, xmm0");
                    emit("push rax");
                    return VarType.INTEGER;
                }
                else if (f === "double" && factorType === VarType.INTEGER) {
                    emit("pop rax");
                    emit("cvtsi2sd xmm0, rax");
                    emit("sub rsp, 8");
                    emit("movq [rsp], xmm0");

                    return VarType.FLOAT;

                }
                else {
                    return factorType;
                }
            }
        case "FPNUM":
            let f = parseFloat(child.token.lexeme).toString();
            if (!f.includes("."))
                f += ".0";
            emit(`mov rax, __float64__(${f})`);
            emit("push rax");
            return VarType.FLOAT;
        case "ID":
            let table = symtable.get(child.token.lexeme);
            emit(`push qword [${table.location}]`);
            return table.type;
        case "STRINGCONST":
            let strConst = stringconstantNodeCode(child);
            emit(`push qword ${strConst}`);
            return VarType.STRING;
        default:
            ICE();
    }
}
function exprNodeCode(n: TreeNode): VarType {
    return orexpNodeCode(n.children[0]);
}
function orexpNodeCode(n: TreeNode): VarType {
    //orexp -> orexp OR andexp | andexp
    if (n.children.length === 1) {
        return andexpNodeCode(n.children[0]);
    } 
    else {
        let lbl = label();
        let orexpType = orexpNodeCode(n.children[0]);
        convertStackTopToZeroOrOneInteger(orexpType);
        emit("cmp qword [rsp], 0");
        emit(`jne ${lbl}`);
        emit("add rsp,8");      //discard left result (0)
        let andexpType = andexpNodeCode(n.children[2]);
        convertStackTopToZeroOrOneInteger(andexpType);
        emit(`${lbl}:`);
        return VarType.INTEGER; 
    }
}

function andexpNodeCode(n: TreeNode): VarType {
    //andexp : andexp AND notexp | notexp;
    if (n.children.length === 1) {
        return notexpNodeCode(n.children[0]);
    }
    else {
        let lbl = label();
        let andexpType = andexpNodeCode(n.children[0]);
        convertStackTopToZeroOrOneInteger(andexpType);
        emit("cmp qword [rsp], 0");
        emit(`je ${lbl}`);
        emit("add rsp,8");
        let notexpType = notexpNodeCode(n.children[2]);
        convertStackTopToZeroOrOneInteger(notexpType);
        emit(`${lbl}:`);
        return VarType.INTEGER;
    }
}

function notexpNodeCode(n: TreeNode): VarType {
    //notexp :  NOT notexp | rel;
    if (n.children.length === 1)
        return relNodeCode(n.children[0]);
    else {
        let lbl = label();
        let lbl2 = label();
        let notexpType = notexpNodeCode(n.children[1]);
        convertStackTopToZeroOrOneInteger(notexpType);
        emit("cmp qword [rsp], 0");
        emit(`je ${lbl}`);
        emit("pop rax");
        emit("push 0");
        emit(`jmp ${lbl2}`);
        emit(`${lbl}:`);
        emit("pop rax");
        emit("push 1");
        emit(`${lbl2}:`);
        return VarType.INTEGER;
    }
}

function sumNodeCode(n: TreeNode): VarType {
    //sum -> sum PLUS term | sum MINUS term | term
    if (n.children.length === 1)
        return termNodeCode(n.children[0]);
    else {
        let sumType = sumNodeCode(n.children[0]);
        let termType = termNodeCode(n.children[2]);
        if (sumType !== termType)
            throw new Error("sumNodeCode");
        if (sumType === VarType.STRING || termType === VarType.STRING)
            throw new Error("Can't add or subtract strings");
        let str: string;
        if (sumType === VarType.FLOAT) {
            if (n.children[1].sym === "PLUS")
                str = "addsd";
            else if (n.children[1].sym === "MINUS")
                str = "subsd";
            emit("movq xmm1,[rsp]");
            emit("add rsp, 8");
            emit("movq xmm0, [rsp]");
            emit("add rsp, 8");
            emit(str + " xmm0, xmm1");
            emit("sub rsp, 8");
            emit("movq [rsp], xmm0");
        }
        else if (sumType === VarType.INTEGER) {
            if (n.children[1].sym === "PLUS")
                str = "add";
            else if (n.children[1].sym === "MINUS")
                str = "sub";
            emit("pop rbx");    //second operand
            emit("pop rax");    //first operand
            emit(str + " rax, rbx");
            emit("push rax");

        }
        return sumType;
    }
}


function termNodeCode(n: TreeNode): VarType {
    //term :  term MULOP neg | neg;
    if (n.children.length === 1)
        return negNodeCode(n.children[0]);
    else {
        let termType = termNodeCode(n.children[0])
        let negType = negNodeCode(n.children[2]);
        if (termType !== negType) {
            throw new Error("not same type");
        }
        if (termType === VarType.INTEGER) {
            emit("pop rbx");    //second operand
            emit("pop rax");
        }
        else if (termType === VarType.FLOAT) {
            emit("movq xmm1, [rsp]");
            emit("add rsp, 8");
            emit("movq xmm0, [rsp]");
            emit("add rsp, 8");
        }
        console.log(n.children[1].token.lexeme);
        switch (n.children[1].token.lexeme) {
            case "*":
                if (termType === VarType.INTEGER) {
                    emit("imul rbx");
                    emit("push rax");
                    return VarType.INTEGER;
                }
                else if (termType === VarType.FLOAT) {
                    emit("mulsd xmm0, xmm1");
                    emit("sub rsp, 8");
                    emit("movq [rsp], xmm0");
                    return VarType.FLOAT;
                }
            case "/":
                if (termType === VarType.INTEGER) {
                    emit("mov qword rdx,0");
                    emit("idiv rbx");
                    emit("push rax");
                    return VarType.INTEGER;
                }
                else if (termType === VarType.FLOAT) {
                    emit("divsd xmm0, xmm1");
                    emit("sub rsp, 8");
                    emit("movq [rsp], xmm0");
                    return VarType.FLOAT;
                }
            case "%":
                if (termType === VarType.INTEGER) {
                    emit("mov qword rdx,0");
                    emit("idiv rbx");
                    emit("push rdx");
                    return VarType.INTEGER;
                }
            default:
                ICE();

        }
        
        
    }
}

function negNodeCode(n: TreeNode): VarType {
    //neg :  MINUS neg | factor;
    if (n.children.length === 1)
        return factorNodeCode(n.children[0]);
    else {
        let negType = negNodeCode(n.children[1]);
        if (negType === VarType.INTEGER) {
            emit("pop rbx");
            emit("mov qword rax, 0");
            emit("sub rax, rbx");
            emit("push rax");
            return VarType.INTEGER;
        }
        else if (negType === VarType.FLOAT) {
            emit("movq xmm1, [rsp]");
            emit("xorps xmm0, xmm0");
            emit("subsd xmm0, xmm1");
            emit("movq [rsp], xmm0");
            return VarType.FLOAT;
        }
    }
}
function relNodeCode(n: TreeNode, ): VarType {
    if (n.children.length === 1)
        return sumNodeCode(n.children[0]);
    else {
        let sum1Type = sumNodeCode(n.children[0]);
        let sum2Type = sumNodeCode(n.children[2]);
        if (sum1Type !== sum2Type)
            throw new Error("relnodecode")
        emit("pop rax");    //second operand
        //first operand is on stack
        // now what?

        
        //first operand still on stack
        emit("cmp [rsp],rax");    //do the compare
        switch (n.children[1].token.lexeme) {
            case ">=": emit("setge al"); break;
            case "<=": emit("setle al"); break;
            case ">": emit("setg  al"); break;
            case "<": emit("setl  al"); break;
            case "==": emit("sete  al"); break;
            case "!=": emit("setne al"); break;
            default: ICE()
        }
        emit("movzx qword rax, al");   //move with zero extend
        emit("mov [rsp], rax");
        return VarType.INTEGER;
    }
}
function convertStackTopToZeroOrOneInteger(type: VarType) {
    if (type == VarType.INTEGER) {
        emit("cmp qword [rsp], 0");
        emit("setne al");
        emit("movzx rax, al");
        emit("mov [rsp], rax");
    }
    else if (type == VarType.FLOAT)
    {
        emit("xorpd xmm1,xmm1");
        emit("movq xmm0, [rsp]");
        emit("cmpneqsd xmm0, xmm1");
        emit("movq [rsp], xmm0");
        emit("and qword [rsp], 1")
    }
    else {
        throw new Error("convertStackTop");
    }
}
function returnstmtNodeCode(n: TreeNode) {
    //return-stmt -> RETURN expr
    let exprType = exprNodeCode(n.children[1]);
    if (exprType === VarType.FLOAT) {
        emit("movq xmm0, [rsp]");
        emit("add rsp, 8");
        emit("cvtsd2si rax, xmm0")
    }
    else {
        emit("pop rax");
    }
    emit("ret");
}
function assignNodeCode(n: TreeNode) {
    // assign -> ID EQ expr
    let t: VarType = exprNodeCode(n.children[2]);
    let vname = n.children[0].token.lexeme;
    if (symtable.get(vname).type !== t)
        throw new Error("Type mismatch");
    moveBytesFromStackToLocation(symtable.get(vname).location);
}
function moveBytesFromStackToLocation(loc: string) {
    emit("pop rax");
    emit(`mov [${loc}], rax`);
}
function varDeclNodeCode(n: TreeNode, type: VarType = undefined) {
    //varDecl : TYPE ID varDecl | CMA ID varDecl | ;
    
    if (n.children.length === 0)
        return;
    let sym = n.children[0].sym;
    if (sym === "TYPE") {
        let vname = n.children[1].token.lexeme;
        let vtype = typeNodeCode(n.children[0]);
        symtable.set(vname, new VarInfo(vtype, label()));
        varDeclNodeCode(n.children[2], vtype);
    }
    if (sym==="CMA") {
        let vname = n.children[1].token.lexeme;
        let vtype = type;
        symtable.set(vname, new VarInfo(vtype, label()));
        varDeclNodeCode(n.children[2],vtype);
    }
    
}
function varDeclListNodeCode(n: TreeNode) {
    //varDeclList : varDecl SEMI varDeclList | 
    if (n.children.length === 0)
        return;
    varDeclNodeCode(n.children[0]);
    varDeclListNodeCode(n.children[2]);
}
function typeNodeCode(n: TreeNode) {
    switch (n.token.lexeme) {
        case "int":
            return VarType.INTEGER;
        case "string":
            return VarType.STRING;
        case "double":
            return VarType.FLOAT;
    }
}
function stringconstantNodeCode(n: TreeNode) {
    let s = n.token.lexeme;
    s = s.substring(1, s.length - 1)
    if (!stringPool.has(s))
        stringPool.set(s, label());
    return stringPool.get(s);   //return the label
}
function outputSymbolTableInfo() {
    for (let vname of symtable.table.keys()) {
        let vinfo = symtable.get(vname);
        emit(`${vinfo.location}:`);
        emit("dq 0");
    }
}
function outputStringPoolInfo() {
    for (let key of stringPool.keys()) {
        let lbl = stringPool.get(key);
        emit(`${lbl}:`);
        for (let i = 0; i < key.length; ++i) {
            emit(`db ${key.charCodeAt(i)}`);
        }
        emit("db 0");   //null terminator
    }
}
function ICE() {
    throw new Error("Internal Compiler Error");
}
export function makeAsm(root: TreeNode) {
    asmCode = [];
    symtable = new SymbolTable();
    stringPool = new Map();
    labelCounter = 0;
    emit("default rel");
    emit("section .text");
    emit("global main");
    emit("main:");
    programNodeCode(root);
    emit("ret");
    emit("section .data");
    outputSymbolTableInfo();
    outputStringPoolInfo();
    return asmCode.join("\n");
}