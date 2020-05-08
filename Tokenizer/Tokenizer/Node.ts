import { Token } from "./Token"
export class NodeType {
    label: string;
    token: Token;
    n: NodeType[];
    constructor(L: string, token: Token) {
        this.label = L;
        this.token = token;
        this.n = [];
    }
}