import * as vscode from 'vscode';
import * as fs from 'fs';
import { CtrlTokenizer, Token, TokensInLine } from './CtrlTokenizer';

const varTypes: string[] = [
    'blob'
    , 'bool'
    , 'void'
    , 'anytype'
    , 'mixed'
    , 'char'
    , 'double'
    , 'file'
    , 'float'
    , 'int'
    , 'uint'
    , 'long'
    , 'ulong'
    , 'string'
    , 'time'
    , 'unsigned'
    , 'dyn_blob'
    , 'dyn_bool'
    , 'dyn_char'
    , 'dyn_errClass'
    , 'short'
    , 'signed'
    , 'nullptr'
    , 'vector'
    , 'mapping'
    , 'dyn_mapping'
    , 'dyn_int'
    , 'dyn_uint'
    , 'dyn_long'
    , 'dyn_ulong'
    , 'dyn_float'
    , 'dyn_time'
    , 'dyn_string'
    , 'dyn_anytype'
    , 'dyn_dyn_anytype'
    , 'dyn_dyn_mapping'
    , 'dyn_dyn_int'
    , 'dyn_dyn_uint'
    , 'dyn_dyn_long'
    , 'dyn_dyn_ulong'
    , 'dyn_dyn_float'
    , 'dyn_dyn_time'
    , 'dyn_dyn_string'
    , 'dyn_dyn_bool'
    , 'dyn_dyn_char'
    , 'void'
];

export class CtrlSymbols {
    private userVarTypes: string[] = [];
    private symbols: vscode.DocumentSymbol[] = [];
    private nodes: Array<vscode.DocumentSymbol[]> = [this.symbols];
    private tokens: TokensInLine[];
    constructor(document: vscode.TextDocument | string) {
        const tokenizer = new CtrlTokenizer(document);
        this.tokens = tokenizer.getTokens();
    }

    public getAllMembers() {

    }

    public getNewTypesData() {
        for (let i = 0; i < this.tokens.length; i++) {
            for (let j = 0; j < this.tokens[i].tokens.length; j++) {
                if (this.tokens[i].tokens.length == j) continue;
                const token = this.tokens[i].tokens[j];
                let docSymbol: undefined | vscode.DocumentSymbol = undefined;
                switch (token.symbol) {
                    case 'class':
                        const classNameToken = this.tokens[i].tokens[j + 1];
                        docSymbol = new vscode.DocumentSymbol(classNameToken.symbol, 'class', vscode.SymbolKind.Class, this.createRange(i, j), classNameToken.range);
                        break;
                    case 'struct':
                        const structNameToken = this.tokens[i].tokens[j + 1];
                        docSymbol = new vscode.DocumentSymbol(structNameToken.symbol, 'struct', vscode.SymbolKind.Struct, this.createRange(i, j), structNameToken.range);
                        break;
                    case 'enum':
                        const enumNameToken = this.tokens[i].tokens[j + 1];
                        let endClassPos = this.getRangeContext(i, j);
                        if (endClassPos == undefined) break;
                        docSymbol = new vscode.DocumentSymbol(enumNameToken.symbol, 'enum', vscode.SymbolKind.Enum, this.createRange(i, j), enumNameToken.range);
                        break;

                    default:
                        break;
                }
                if (docSymbol != undefined) {
                    this.symbols.push(docSymbol);
                }
            }
        }
        return this.symbols;
    }

    private createRange(i: number, j: number) {
        let endClassPos = this.getRangeContext(i, j);
        if (endClassPos == undefined) return new vscode.Range(new vscode.Position(i, j), new vscode.Position(i, j));
        return new vscode.Range(new vscode.Position(this.tokens[i].tokens[j].range.end.line, this.tokens[i].tokens[j].range.end.character), endClassPos);
    }
    public getPublicSymbols() {
        let startObject = false;
        let countScopes = 0;
        for (let i = 0; i < this.tokens.length; i++) {
            for (let j = 0; j < this.tokens[i].tokens.length; j++) {
                const token = this.tokens[i].tokens[j];
                if (token.symbol == 'class') {
                    if (this.tokens[i].tokens.length == j) continue;
                    const classNameToken = this.tokens[i].tokens[j + 1];
                    const docSymbol = new vscode.DocumentSymbol(classNameToken.symbol, 'class', vscode.SymbolKind.Class, classNameToken.range, classNameToken.range);
                    this.nodes[this.nodes.length - 1].push(docSymbol);
                    startObject = true;
                    this.nodes.push(docSymbol.children);
                }
                else if (token.symbol == '{') {
                    countScopes++;
                }
                else if (token.symbol == '}') {
                    countScopes--;
                    if (startObject && countScopes == 0) {
                        startObject = false;
                        this.nodes.pop();
                    }
                }
                else if (token.symbol == 'public') {
                    if (this.tokens[i].tokens.length == j) continue;
                    if (this.tokens[i].tokens[j + 1].symbol == 'static') {
                        if (this.tokens[i].tokens.length > j + 2) {
                            if (this.tokens[i].tokens[j + 2].symbol == 'const') { // может быть только поле
                                if (this.tokens[i].tokens.length > j + 3) {
                                    const varType = this.getVariableType(i, j + 3);
                                    if (varType.varType != '') {
                                        j = varType.endPosition + 1;
                                        console.log(this.getRangeContext(i, j));
                                        const endClassPos = this.getRangeContext(i, j);
                                        if (endClassPos == undefined) break;
                                        const symbolRange = new vscode.Range(new vscode.Position(i, j), endClassPos);
                                        const docSymbol = new vscode.DocumentSymbol(this.tokens[i].tokens[j].symbol, varType.varType, vscode.SymbolKind.Constant, symbolRange, this.tokens[i].tokens[j].range);
                                        this.nodes[this.nodes.length - 1].push(docSymbol);
                                    }
                                }
                                else {
                                    break;
                                }
                            }
                            else {
                                const varType = this.getVariableType(i, j + 2);
                                if (varType.varType != '') {
                                    j = varType.endPosition + 1;
                                    if (this.tokens[i].tokens.length > j + 1 && this.tokens[i].tokens[j + 1].symbol == '(') { //метод
                                        const docSymbol = new vscode.DocumentSymbol(this.tokens[i].tokens[j].symbol, varType.varType, vscode.SymbolKind.Method, this.tokens[i].tokens[j].range, this.tokens[i].tokens[j].range);
                                        this.nodes[this.nodes.length - 1].push(docSymbol);

                                    }
                                    else {
                                        const docSymbol = new vscode.DocumentSymbol(this.tokens[i].tokens[j].symbol, varType.varType, vscode.SymbolKind.Field, this.tokens[i].tokens[j].range, this.tokens[i].tokens[j].range);
                                        this.nodes[this.nodes.length - 1].push(docSymbol);
                                    }
                                }
                                else {
                                    break;
                                }
                            }
                        }
                        else {
                            break;
                        }
                    }
                    else {
                        const varType = this.getVariableType(i, j + 1);
                        if (varType.varType != '') {
                            j = varType.endPosition + 1;
                            if (this.tokens[i].tokens.length > j + 1 && this.tokens[i].tokens[j + 1].symbol == '(') { //метод
                                const docSymbol = new vscode.DocumentSymbol(this.tokens[i].tokens[j].symbol, varType.varType, vscode.SymbolKind.Method, this.tokens[i].tokens[j].range, this.tokens[i].tokens[j].range);
                                this.nodes[this.nodes.length - 1].push(docSymbol);

                            }
                            else {
                                const docSymbol = new vscode.DocumentSymbol(this.tokens[i].tokens[j].symbol, varType.varType, vscode.SymbolKind.Field, this.tokens[i].tokens[j].range, this.tokens[i].tokens[j].range);
                                this.nodes[this.nodes.length - 1].push(docSymbol);
                            }
                        }
                        else {
                            break;
                        }
                    }
                }
            }
        }
        return this.symbols;
    }

    private getVariableType(i: number, j: number) {
        if (this.tokens[i].tokens[j].symbol == 'vector') {
            if (this.tokens[i].tokens.length > j + 3 && this.tokens[i].tokens[j + 1].symbol == '<') {
                const answer = this.checkSharedPtrVar(i, j + 2);
                if (answer.varType != '') {
                    return {
                        endPosition: j + 6,
                        varType: 'vector< ' + answer.varType + ' >'
                    };
                }
                else if (
                    (varTypes.indexOf(this.tokens[i].tokens[j + 2].symbol) > -1 || this.userVarTypes.indexOf(this.tokens[i].tokens[j + 2].symbol) > -1)
                    && this.tokens[i].tokens[j + 3].symbol == '>'
                ) {
                    return {
                        endPosition: j + 3,
                        varType: 'vector< ' + this.tokens[i].tokens[j + 2].symbol + ' >'
                    };
                }
            }
        }
        else if (this.tokens[i].tokens[j].symbol == 'shared_ptr') {
            return this.checkSharedPtrVar(i, j);
        }
        else if (varTypes.indexOf(this.tokens[i].tokens[j].symbol) > -1 || this.userVarTypes.indexOf(this.tokens[i].tokens[j].symbol) > -1) {
            return {
                endPosition: j,
                varType: this.tokens[i].tokens[j].symbol
            };
        }
        return {
            endPosition: -1,
            varType: ''
        };
    }

    private checkSharedPtrVar(i: number, j: number) {
        if (this.tokens[i].tokens[j].symbol == 'shared_ptr') {
            if (this.tokens[i].tokens.length > j + 3) {
                if (this.tokens[i].tokens[j + 1].symbol == '<'
                    && (varTypes.indexOf(this.tokens[i].tokens[j + 2].symbol) > -1 || this.userVarTypes.indexOf(this.tokens[i].tokens[j + 2].symbol) > -1)
                    && this.tokens[i].tokens[j + 3].symbol == '>'
                ) {
                    return {
                        endPosition: j + 3,
                        varType: 'shared_ptr<' + this.tokens[i].tokens[j + 2].symbol + '>'
                    };
                }
            }
        }
        return {
            endPosition: -1,
            varType: ''
        };
    }

    private getRangeContext(i: number, j: number) {
        const startLine = i;
        let countScope = 0;
        let startObject = false;
        for (i; i < this.tokens.length; i++) {
            if (startLine != i) {
                j = 0;
            }
            for (j; j < this.tokens[i].tokens.length; j++) {
                if (this.tokens[i].tokens[j].symbol == '{') {
                    countScope++;
                    startObject = true;
                }
                else if (this.tokens[i].tokens[j].symbol == '}') {
                    countScope--;
                    if (startObject && countScope == 0) {
                        startObject = false;
                        return new vscode.Position(this.tokens[i].tokens[j].range.end.line, this.tokens[i].tokens[j].range.end.character);
                    }
                }
            }
        }
        return undefined;
    }
}